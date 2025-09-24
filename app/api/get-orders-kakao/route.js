import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용하여 RLS 우회
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다' }, { status: 400 })
    }

    console.log('카카오 사용자 주문 조회:', userId)

    // 카카오 사용자 주문 조회 - 배송 정보의 이름으로 조회
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
      .is('user_id', null) // user_id가 null인 주문만
      .order('created_at', { ascending: false })

    if (error) {
      console.error('주문 조회 오류:', error)
      throw error
    }

    // 최적 결제 방법 선택 함수 (카드 > 기타 > bank_transfer 순서)
    const getBestPayment = (payments) => {
      if (!payments || payments.length === 0) return {}

      // 카드 결제가 있으면 우선 선택
      const cardPayment = payments.find(p => p.method === 'card')
      if (cardPayment) return cardPayment

      // bank_transfer가 아닌 다른 방법이 있으면 선택
      const nonBankPayment = payments.find(p => p.method !== 'bank_transfer')
      if (nonBankPayment) return nonBankPayment

      // 가장 최근 업데이트된 결제 방법 선택
      const sortedPayments = [...payments].sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at)
        const bTime = new Date(b.updated_at || b.created_at)
        return bTime - aTime
      })

      return sortedPayments[0] || {}
    }

    // 주문 데이터 형태 변환
    const ordersWithItems = data.map(order => ({
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
      shipping: order.order_shipping[0] || {},
      payment: getBestPayment(order.order_payments)
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
            customer_order_number: `GROUP-${order.payment_group_id.split('-')[1]}`,
            status: order.status,
            created_at: order.created_at,
            updated_at: order.updated_at,
            user_id: order.user_id,
            order_type: 'bulk_payment',
            total_amount: groupOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),

            // 모든 아이템 합치기
            items: groupOrders.flatMap(o => o.items),

            // 첫 번째 주문의 배송/결제 정보 사용
            shipping: order.shipping,
            payment: order.payment,

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