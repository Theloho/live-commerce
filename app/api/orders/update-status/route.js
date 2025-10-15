import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
 * 주문 상태 업데이트 API (Service Role)
 * - 여러 주문의 상태를 일괄 업데이트
 * - 배송 정보, 결제 정보 업데이트
 * - 카카오 사용자 지원
 */
export async function POST(request) {
  try {
    const { orderIds, status, paymentData } = await request.json()

    console.log('🔵 [Service Role API] 주문 상태 업데이트 시작:', {
      orderIds,
      status,
      hasPaymentData: !!paymentData
    })

    // 1. 기본 유효성 검사
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { error: '상태가 필요합니다' },
        { status: 400 }
      )
    }

    // 2. payment_group_id 생성 (2개 이상 주문일 때)
    const paymentGroupId = orderIds.length > 1 ? `GROUP-${Date.now()}` : null
    if (paymentGroupId) {
      console.log('🏷️ 전체결제 처리 - 주문 개수:', orderIds.length, '그룹 ID:', paymentGroupId)
    }

    // 3. 각 주문 업데이트
    for (const orderId of orderIds) {
      const now = new Date().toISOString()

      // 3-1. orders 테이블 업데이트
      const updateData = {
        status,
        updated_at: now
      }

      // 상태별 타임스탬프
      if (status === 'verifying') updateData.verifying_at = now
      if (status === 'paid') updateData.paid_at = now
      if (status === 'delivered') updateData.delivered_at = now
      if (status === 'cancelled') updateData.cancelled_at = now

      // payment_group_id 추가
      if (paymentGroupId) {
        updateData.payment_group_id = paymentGroupId
      }

      // 쿠폰 할인 추가
      if (paymentData && paymentData.discountAmount !== undefined) {
        updateData.discount_amount = paymentData.discountAmount
      }

      const { error: orderError } = await supabaseAdmin
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

      if (orderError) {
        console.error('❌ orders 업데이트 오류:', orderError)
        throw orderError
      }

      console.log('✅ orders 업데이트 완료:', orderId)

      // 3-2. order_shipping 업데이트
      if (paymentData && paymentData.shippingData) {
        // ✅ 무료배송 플래그 조회
        const { data: orderForShipping } = await supabaseAdmin
          .from('orders')
          .select('is_free_shipping')
          .eq('id', orderId)
          .single()

        const shippingFee = orderForShipping?.is_free_shipping ? 0 : 4000

        const shippingData = paymentData.shippingData
        const shippingUpdate = {
          name: shippingData.shipping_name,
          phone: shippingData.shipping_phone,
          address: shippingData.shipping_address,
          detail_address: shippingData.shipping_detail_address || '',
          postal_code: shippingData.shipping_postal_code || null,
          shipping_fee: shippingFee  // ✅ 무료배송 조건 반영
        }

        // 먼저 기존 레코드 확인
        const { data: existingShipping } = await supabaseAdmin
          .from('order_shipping')
          .select('id')
          .eq('order_id', orderId)
          .single()

        let shippingError = null

        if (existingShipping) {
          // 있으면 UPDATE
          const { error } = await supabaseAdmin
            .from('order_shipping')
            .update(shippingUpdate)
            .eq('order_id', orderId)
          shippingError = error
        } else {
          // 없으면 INSERT
          const { error } = await supabaseAdmin
            .from('order_shipping')
            .insert({
              order_id: orderId,
              ...shippingUpdate
            })
          shippingError = error
        }

        if (shippingError) {
          console.error('❌ order_shipping 업데이트 오류:', shippingError)
          throw shippingError
        }

        console.log('✅ order_shipping 업데이트 완료:', orderId)
      }

      // 3-3. order_payments 업데이트
      if (paymentData) {
        // 주문 상세 조회 (금액 계산용)
        const { data: orderDetail, error: detailError } = await supabaseAdmin
          .from('orders')
          .select('id, is_free_shipping, order_items(*), order_shipping(postal_code)')
          .eq('id', orderId)
          .single()

        if (detailError) {
          console.error('❌ 주문 상세 조회 오류:', detailError)
          throw detailError
        }

        const items = orderDetail.order_items || []
        const postalCode = orderDetail.order_shipping?.[0]?.postal_code ||
                          orderDetail.order_shipping?.postal_code ||
                          paymentData.shippingData?.shipping_postal_code ||
                          'normal'

        // ✅ DB 저장된 무료배송 조건 사용
        const baseShippingFee = orderDetail.is_free_shipping ? 0 : 4000

        // OrderCalculations로 정확한 금액 계산
        const { default: OrderCalculations } = await import('@/lib/orderCalculations')
        const orderCalc = OrderCalculations.calculateFinalOrderAmount(items, {
          region: postalCode,
          coupon: paymentData.discountAmount > 0 ? {
            type: 'fixed_amount',
            value: paymentData.discountAmount
          } : null,
          paymentMethod: paymentData.method || 'bank_transfer',
          baseShippingFee: baseShippingFee  // ✅ 무료배송 플래그 전달
        })

        const finalAmount = orderCalc.finalAmount

        console.log('💰 결제 금액 계산:', {
          orderId,
          itemsTotal: orderCalc.itemsTotal,
          shippingFee: orderCalc.shippingFee,
          discountAmount: orderCalc.couponDiscount,
          finalAmount
        })

        // 결제 정보 업데이트
        const paymentUpdate = {
          method: paymentData.method || 'bank_transfer',
          amount: finalAmount,
          status: status,
          depositor_name: paymentData.depositorName || ''
        }

        if (paymentGroupId) {
          paymentUpdate.payment_group_id = paymentGroupId
        }

        // 먼저 기존 레코드 확인
        const { data: existingPayment } = await supabaseAdmin
          .from('order_payments')
          .select('id')
          .eq('order_id', orderId)
          .single()

        let paymentError = null

        if (existingPayment) {
          // 있으면 UPDATE
          const { error } = await supabaseAdmin
            .from('order_payments')
            .update(paymentUpdate)
            .eq('order_id', orderId)
          paymentError = error
        } else {
          // 없으면 INSERT
          const { error } = await supabaseAdmin
            .from('order_payments')
            .insert({
              order_id: orderId,
              ...paymentUpdate
            })
          paymentError = error
        }

        if (paymentError) {
          console.error('❌ order_payments 업데이트 오류:', paymentError)
          throw paymentError
        }

        console.log('✅ order_payments 업데이트 완료:', orderId, finalAmount)
      }

      // 3-4. 쿠폰 사용 처리
      if (paymentData && paymentData.selectedCoupon) {
        try {
          const { applyCouponUsage } = await import('@/lib/couponApi')
          const couponResult = await applyCouponUsage(
            paymentData.selectedCoupon.code,
            orderId,
            paymentData.discountAmount
          )

          if (couponResult) {
            console.log('✅ 쿠폰 사용 처리 완료:', paymentData.selectedCoupon.code)
          }
        } catch (couponError) {
          console.error('⚠️ 쿠폰 사용 처리 오류 (계속 진행):', couponError)
        }
      }
    }

    console.log('✅ [Service Role API] 모든 주문 상태 업데이트 완료:', orderIds.length, '개')

    return NextResponse.json({
      success: true,
      updatedCount: orderIds.length
    })
  } catch (error) {
    console.error('❌ [Service Role API] 주문 상태 업데이트 오류:', error)
    return NextResponse.json(
      {
        error: error.message || '주문 상태 업데이트에 실패했습니다',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
