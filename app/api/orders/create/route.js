import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatShippingInfo } from '@/lib/shippingUtils'

// Service Role 클라이언트 생성 (RLS 우회)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * 주문 생성 API (Service Role)
 * - Kakao 사용자 (sessionStorage 인증)
 * - Supabase Auth 사용자 (auth.uid() 인증)
 * 모두 지원
 */
export async function POST(request) {
  try {
    const {
      orderData,
      userProfile,
      depositName,
      user // 클라이언트에서 getCurrentUser() 결과 전달
    } = await request.json()

    console.log('🚀 [Service Role API] 주문 생성 시작:', {
      userName: user?.name,
      orderType: orderData?.orderType,
      hasKakaoId: !!user?.kakao_id
    })

    // 1. 기본 유효성 검사
    if (!user || !orderData || !userProfile) {
      console.error('❌ 필수 파라미터 누락:', { user: !!user, orderData: !!orderData, userProfile: !!userProfile })
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다' },
        { status: 400 }
      )
    }

    // 주문 데이터 정규화
    const normalizedOrderData = {
      ...orderData,
      title: orderData.title || '상품명 미확인',
      price: orderData.price || orderData.totalPrice,
      totalPrice: orderData.totalPrice || orderData.price,
      quantity: orderData.quantity || 1
    }

    // 2. 장바구니 주문 병합: 기존 pending 주문 찾기
    let orderId = null
    let customerOrderNumber = null
    let existingOrder = null

    if (orderData.orderType === 'cart') {
      const orderTypePattern = user.kakao_id
        ? `cart:KAKAO:${user.kakao_id}`
        : 'cart'

      const { data: pendingOrders } = await supabaseAdmin
        .from('orders')
        .select('id, customer_order_number')
        .eq('status', 'pending')
        .like('order_type', `${orderTypePattern}%`)
        .order('created_at', { ascending: false })
        .limit(1)

      if (pendingOrders && pendingOrders.length > 0) {
        existingOrder = pendingOrders[0]
        orderId = existingOrder.id
        customerOrderNumber = existingOrder.customer_order_number
        console.log('✅ 기존 장바구니 주문 발견, 아이템 추가:', orderId)
      }
    }

    // 기존 주문 없으면 새로 생성
    if (!orderId) {
      orderId = crypto.randomUUID()
      customerOrderNumber = generateCustomerOrderNumber()
    }

    // 3. auth.users에 실제 사용자가 있는지 확인
    let validUserId = null
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profile) {
        validUserId = user.id
        console.log('✅ 프로필 확인으로 사용자 인정:', validUserId)
      }
    } catch (profileError) {
      console.log('ℹ️ 프로필 확인 실패, user_id null로 설정 (Kakao 사용자)')
    }

    // 4. 주문 생성 또는 업데이트
    let order

    if (existingOrder) {
      // 기존 주문의 total_amount 먼저 조회
      const { data: currentOrder } = await supabaseAdmin
        .from('orders')
        .select('total_amount')
        .eq('id', orderId)
        .single()

      const newTotalAmount = (currentOrder?.total_amount || 0) + orderData.totalPrice

      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          total_amount: newTotalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single()

      if (updateError) {
        console.error('❌ 주문 업데이트 오류:', updateError)
        throw updateError
      }
      order = updatedOrder
      console.log('✅ 주문 금액 업데이트:', order.total_amount)
    } else {
      // 새 주문 생성
      const orderData_final = {
        id: orderId,
        customer_order_number: customerOrderNumber,
        status: 'pending',
        order_type: user.kakao_id
          ? `${orderData.orderType || 'direct'}:KAKAO:${user.kakao_id}`
          : (orderData.orderType || 'direct'),
        total_amount: orderData.totalPrice,
        discount_amount: orderData.couponDiscount || 0,
        is_free_shipping: orderData.isFreeShipping || false  // ✅ 무료배송 플래그 저장
      }

      console.log('💾 DB INSERT orders:', {
        orderId,
        total_amount: orderData_final.total_amount,
        discount_amount: orderData_final.discount_amount,
        user_id: validUserId || 'null (Kakao)'
      })

      if (validUserId) {
        orderData_final.user_id = validUserId
      }

      const { data: newOrder, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert([orderData_final])
        .select()
        .single()

      if (orderError) {
        console.error('❌ 주문 생성 오류:', orderError)
        throw orderError
      }
      order = newOrder
    }

    // 5. 주문 아이템 생성
    const itemData = {
      order_id: orderId,
      product_id: normalizedOrderData.id,
      title: normalizedOrderData.title || '상품명 미확인',
      quantity: normalizedOrderData.quantity,
      price: normalizedOrderData.price,
      total: normalizedOrderData.totalPrice || (normalizedOrderData.price * normalizedOrderData.quantity),
      unit_price: normalizedOrderData.price,
      total_price: normalizedOrderData.totalPrice || (normalizedOrderData.price * normalizedOrderData.quantity),
      selected_options: normalizedOrderData.selectedOptions || {},
      variant_title: normalizedOrderData.variant || null,
      variant_id: normalizedOrderData.variantId || null,
      sku: normalizedOrderData.sku || null,
      product_snapshot: normalizedOrderData.productSnapshot || {}
    }

    const { error: itemError } = await supabaseAdmin
      .from('order_items')
      .insert([itemData])

    if (itemError) {
      console.error('❌ 주문 아이템 생성 오류:', itemError)
      throw itemError
    }

    // 6. 배송 정보 생성 (기존 주문이 없을 때만)
    if (!existingOrder) {
      const shippingData = {
        order_id: orderId,
        name: userProfile.name || user.name || user.nickname || '주문자',
        phone: userProfile.phone || user.phone || '연락처 미입력',
        address: userProfile.address || '배송지 미입력',
        detail_address: userProfile.detail_address || '',
        postal_code: userProfile.postal_code || null
      }

      const { error: shippingError } = await supabaseAdmin
        .from('order_shipping')
        .insert([shippingData])

      if (shippingError) {
        console.error('❌ 배송 정보 생성 오류:', shippingError)
        throw shippingError
      }
    }

    // 7. 결제 정보 생성 또는 업데이트
    if (!existingOrder) {
      // 새 주문: 결제 정보 생성
      // ✅ 무료배송 조건: is_free_shipping = true이면 배송비 0원
      const baseShippingFee = orderData.isFreeShipping ? 0 : 4000
      const shippingInfo = formatShippingInfo(baseShippingFee, userProfile.postal_code)
      const shippingFee = shippingInfo.totalShipping
      const totalAmount = normalizedOrderData.totalPrice + shippingFee

      console.log('📦 배송비 계산:', {
        isFreeShipping: orderData.isFreeShipping,
        baseShipping: shippingInfo.baseShipping,
        surcharge: shippingInfo.surcharge,
        region: shippingInfo.region,
        totalShipping: shippingFee,
        postalCode: userProfile.postal_code
      })

      const paymentData = {
        order_id: orderId,
        method: 'bank_transfer',
        amount: totalAmount,
        status: 'pending',
        depositor_name: depositName || userProfile.name || ''
      }

      const { error: paymentError } = await supabaseAdmin
        .from('order_payments')
        .insert([paymentData])

      if (paymentError) {
        console.error('❌ 결제 정보 생성 오류:', paymentError)
        throw paymentError
      }
    } else {
      // 기존 주문: 결제 금액 업데이트 (모든 아이템 합계 + 배송비)
      const { data: allItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('total, total_price')
        .eq('order_id', orderId)

      if (itemsError) {
        console.error('❌ order_items 조회 오류:', itemsError)
        throw itemsError
      }

      const itemsTotal = allItems.reduce((sum, item) => {
        return sum + (item.total_price || item.total || 0)
      }, 0)

      // ✅ 무료배송 조건: is_free_shipping = true이면 배송비 0원
      const baseShippingFee = orderData.isFreeShipping ? 0 : 4000
      const shippingInfo = formatShippingInfo(baseShippingFee, userProfile.postal_code)
      const shippingFee = shippingInfo.totalShipping
      const newPaymentAmount = itemsTotal + shippingFee

      console.log('💰 장바구니 주문 결제 금액 업데이트:', {
        isFreeShipping: orderData.isFreeShipping,
        itemsCount: allItems.length,
        itemsTotal,
        shippingFee,
        newPaymentAmount
      })

      const { error: paymentUpdateError } = await supabaseAdmin
        .from('order_payments')
        .update({
          amount: newPaymentAmount
        })
        .eq('order_id', orderId)

      if (paymentUpdateError) {
        console.error('❌ 결제 정보 업데이트 오류:', paymentUpdateError)
        throw paymentUpdateError
      }

      console.log('✅ 결제 금액 업데이트 완료:', newPaymentAmount)
    }

    // 8. 재고 차감 (Variant 기반)
    if (normalizedOrderData.variantId) {
      // Variant가 있는 경우 - Variant 재고 차감
      console.log('🔧 Variant 재고 차감 시작:', normalizedOrderData.variantId)

      try {
        const { data: result, error: inventoryError } = await supabaseAdmin.rpc(
          'update_variant_inventory',
          {
            p_variant_id: normalizedOrderData.variantId,
            p_quantity_change: -normalizedOrderData.quantity
          }
        )

        if (inventoryError) {
          console.error('❌ Variant 재고 차감 실패:', inventoryError)
          throw inventoryError
        }

        console.log(`✅ Variant 재고 차감 완료: ${normalizedOrderData.variantId} (-${normalizedOrderData.quantity}개)`)
      } catch (inventoryError) {
        console.error(`❌ Variant 재고 차감 실패:`, inventoryError)

        if (inventoryError.message && inventoryError.message.includes('Insufficient inventory')) {
          throw new Error('재고가 부족합니다')
        }
        throw new Error(`재고 차감 실패: ${inventoryError.message}`)
      }
    } else {
      // Variant가 없는 상품은 기존 방식으로 재고 차감
      console.log('⚠️ Variant 없음, 기존 재고 차감 방식 사용')

      const { data: product } = await supabaseAdmin
        .from('products')
        .select('inventory')
        .eq('id', normalizedOrderData.id)
        .single()

      if (product && product.inventory < normalizedOrderData.quantity) {
        throw new Error('재고가 부족합니다')
      }

      const { error: productUpdateError } = await supabaseAdmin
        .from('products')
        .update({
          inventory: product.inventory - normalizedOrderData.quantity
        })
        .eq('id', normalizedOrderData.id)

      if (productUpdateError) {
        console.error('❌ 상품 재고 차감 실패:', productUpdateError)
        throw productUpdateError
      }
    }

    console.log('✅ [Service Role API] 주문 생성 완료:', order.id)

    return NextResponse.json({
      success: true,
      order: { ...order, items: [normalizedOrderData] }
    })
  } catch (error) {
    console.error('❌ [Service Role API] 주문 생성 오류:', error)
    return NextResponse.json(
      {
        error: error.message || '주문 생성에 실패했습니다',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

// 단품 주문번호 생성 함수 (S + yyMMdd-XXXX 형식)
function generateCustomerOrderNumber() {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)  // 25
  const month = String(now.getMonth() + 1).padStart(2, '0')  // 10
  const day = String(now.getDate()).padStart(2, '0')  // 15
  const dateStr = `${year}${month}${day}`  // 251015
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()  // A1B2
  return `S${dateStr}-${randomStr}`  // S251015-A1B2
}
