import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용하여 RLS 우회
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

// 그룹 주문번호 생성: G + YYMMDD-NNNN (4자리 순번)
const generateGroupOrderNumber = (paymentGroupId) => {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')

  // payment_group_id가 있으면 그 ID의 타임스탬프에서 4자리 추출
  if (paymentGroupId) {
    const timestamp = paymentGroupId.split('-')[1] || ''
    const sequence = timestamp.slice(-4).padStart(4, '0')
    return `G${year}${month}${day}-${sequence}`
  }

  // payment_group_id가 없으면 랜덤 4자리
  const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `G${year}${month}${day}-${sequence}`
}

export async function POST(request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다' }, { status: 400 })
    }

    console.log('카카오 사용자 주문 조회:', userId)

    // 1. 해당 사용자의 프로필 정보 조회 (보안 검증용)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('name, nickname')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      console.error('사용자 프로필 조회 실패:', profileError)
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    console.log('🔍 카카오 사용자 정보 확인:', userProfile)

    // 2. 보안 강화된 주문 조회
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            title,
            thumbnail_url,
            price,
            description
          )
        ),
        order_shipping (*),
        order_payments (*)
      `)
      .or(`user_id.eq.${userId},user_id.is.null`) // user_id가 해당 사용자이거나 null인 경우
      .order('created_at', { ascending: false })

    if (error) {
      console.error('주문 조회 오류:', error)
      throw error
    }

    console.log('📊 1차 필터링된 주문 수:', data?.length || 0)

    // 3. 보안 필터링: order_type 필드 또는 배송지 이름으로 사용자 검증
    const secureFilteredData = data.filter(order => {
      if (order.user_id === userId) {
        return true // user_id가 일치하면 허용
      }

      // order_type 필드에 카카오 사용자 ID가 있는지 확인
      if (order.order_type && order.order_type.includes(`:KAKAO:${userId}`)) {
        return true // 카카오 사용자 ID가 일치하면 허용
      }

      // user_id가 null인 경우, 배송지 이름으로 추가 검증
      if (order.order_shipping && order.order_shipping.length > 0) {
        const shippingName = order.order_shipping[0].name
        const isOwner = shippingName === userProfile.name

        if (!isOwner) {
          console.log(`🚫 보안 필터링: 주문 ${order.id} 차단 (배송명: ${shippingName} ≠ 사용자명: ${userProfile.name}, order_type: ${order.order_type})`)
        }

        return isOwner
      }

      console.log(`🚫 보안 필터링: 주문 ${order.id} 차단 (배송 정보 없음, order_type: ${order.order_type})`)
      return false
    })

    console.log('📊 2차 보안 필터링된 주문 수:', secureFilteredData?.length || 0)

    // 최적 결제 방법 선택 함수 (0원이 아닌 금액 우선, 카드 > 기타 > bank_transfer 순서)
    const getBestPayment = (payments) => {
      if (!payments || payments.length === 0) return {}

      // 0원이 아닌 결제 정보만 필터링
      const nonZeroPayments = payments.filter(p => p.amount && p.amount > 0)

      // 0원이 아닌 결제가 있으면 그 중에서 선택
      const paymentsToCheck = nonZeroPayments.length > 0 ? nonZeroPayments : payments

      // depositor_name이 있는 결제를 우선 선택
      const paymentWithDepositor = paymentsToCheck.find(p => p.depositor_name)
      if (paymentWithDepositor) return paymentWithDepositor

      // 카드 결제가 있으면 우선 선택
      const cardPayment = paymentsToCheck.find(p => p.method === 'card')
      if (cardPayment) return cardPayment

      // bank_transfer가 아닌 다른 방법이 있으면 선택
      const nonBankPayment = paymentsToCheck.find(p => p.method !== 'bank_transfer')
      if (nonBankPayment) return nonBankPayment

      // 가장 최근 업데이트된 결제 방법 선택
      const sortedPayments = [...paymentsToCheck].sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at)
        const bTime = new Date(b.updated_at || b.created_at)
        return bTime - aTime
      })

      return sortedPayments[0] || {}
    }

    // 주문 데이터 형태 변환 (보안 필터링된 데이터 사용)
    const ordersWithItems = secureFilteredData.map(order => ({
      ...order,
      items: order.order_items.map(item => ({
        id: item.id, // order_items 테이블의 실제 id
        product_id: item.product_id, // 별도로 product_id도 포함
        title: item.products?.title || '상품명 없음',
        description: item.products?.description || '',
        thumbnail_url: item.products?.thumbnail_url || '/placeholder-product.png',
        price: item.products?.price || item.unit_price,
        quantity: item.quantity,
        totalPrice: item.total_price,
        selectedOptions: item.selected_options || {},
        unit_price: item.unit_price
      })),
      shipping: {
        name: order.shipping_name || order.order_shipping[0]?.name || '',
        phone: order.shipping_phone || order.order_shipping[0]?.phone || '',
        address: order.shipping_address || order.order_shipping[0]?.address || '',
        detail_address: order.shipping_detail_address || order.order_shipping[0]?.detail_address || ''
      },
      payment: {
        ...getBestPayment(order.order_payments),
        depositor_name: getBestPayment(order.order_payments).depositor_name || order.shipping_name || ''
      }
    }))

    console.log(`${ordersWithItems.length}개의 주문 조회 성공`)

    // payment_group_id로 주문 그룹화 (getOrders 함수와 동일한 로직)
    const groupedOrders = []
    const processedGroupIds = new Set()

    console.log('🔍 카카오 사용자 그룹화 시작 - 전체 주문:', ordersWithItems.length)

    for (const order of ordersWithItems) {
      // payment_group_id가 있고 아직 처리되지 않은 그룹인 경우
      if (order.payment_group_id && !processedGroupIds.has(order.payment_group_id)) {
        // 같은 group_id를 가진 모든 주문 찾기
        const groupOrders = ordersWithItems.filter(o => o.payment_group_id === order.payment_group_id)

        console.log('🔍 카카오 그룹 발견:', {
          groupId: order.payment_group_id,
          orderCount: groupOrders.length,
          orderIds: groupOrders.map(o => o.id)
        })

        if (groupOrders.length > 1) {
          // 여러 개 주문이 그룹화된 경우
          const groupOrder = {
            id: `GROUP-${order.payment_group_id}`,
            payment_group_id: order.payment_group_id,
            customer_order_number: generateGroupOrderNumber(order.payment_group_id),
            status: order.status,
            created_at: order.created_at,
            updated_at: order.updated_at,
            user_id: order.user_id,
            order_type: 'bulk_payment',
            total_amount: groupOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),

            // 모든 아이템 합치기
            items: groupOrders.flatMap(o => o.items),

            // 첫 번째 주문의 배송 정보 사용 (shipping_* 컬럼 우선)
            shipping: {
              name: order.shipping_name || order.order_shipping[0]?.name || '',
              phone: order.shipping_phone || order.order_shipping[0]?.phone || '',
              address: order.shipping_address || order.order_shipping[0]?.address || '',
              detail_address: order.shipping_detail_address || order.order_shipping[0]?.detail_address || ''
            },

            // 결제 정보는 총 금액으로 재계산 (아이템 가격 합계 + 배송비)
            payment: {
              ...getBestPayment(order.order_payments),
              amount: groupOrders.flatMap(o => o.items).reduce((sum, item) => sum + item.totalPrice, 0) + 4000,
              depositor_name: getBestPayment(order.order_payments).depositor_name || order.shipping_name || ''
            },

            // 그룹 정보 추가
            isGroup: true,
            groupOrderCount: groupOrders.length,
            originalOrderIds: groupOrders.map(o => o.id)
          }

          groupedOrders.push(groupOrder)
          processedGroupIds.add(order.payment_group_id)
        } else if (groupOrders.length === 1) {
          // 단일 주문이지만 payment_group_id가 있는 경우
          groupedOrders.push(order)
          processedGroupIds.add(order.payment_group_id)
        }
      }
      // payment_group_id가 없는 개별 주문
      else if (!order.payment_group_id) {
        groupedOrders.push(order)
      }
    }

    console.log('🔍 카카오 최종 그룹화 결과:', {
      totalOrders: groupedOrders.length,
      groupOrders: groupedOrders.filter(o => o.isGroup).length,
      regularOrders: groupedOrders.filter(o => !o.isGroup).length
    })

    return NextResponse.json({
      success: true,
      orders: groupedOrders
    })

  } catch (error) {
    console.error('카카오 사용자 주문 조회 실패:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '주문 조회에 실패했습니다',
        orders: []
      },
      { status: 500 }
    )
  }
}