import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

/**
 * 송장번호 대량 업데이트 API (Service Role)
 * - 관리자 전용
 * - Excel에서 파싱된 여러 송장번호를 일괄 처리
 * - 주문번호(customer_order_number) 기준 자동 매칭
 * - 매칭된 주문은 자동으로 status = 'shipping' 변경
 */
export async function POST(request) {
  try {
    const { adminEmail, trackingData } = await request.json()

    console.log('📤 [송장번호 대량 업데이트 API] 시작:', {
      adminEmail,
      trackingDataCount: trackingData?.length || 0
    })

    // 1. 유효성 검사
    if (!adminEmail) {
      return NextResponse.json(
        { error: 'adminEmail이 필요합니다' },
        { status: 400 }
      )
    }

    if (!trackingData || !Array.isArray(trackingData) || trackingData.length === 0) {
      return NextResponse.json(
        { error: 'trackingData 배열이 필요합니다' },
        { status: 400 }
      )
    }

    // 2. 관리자 인증
    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 대량 업데이트 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    // 3. 각 송장번호 처리
    const results = []
    let matchedCount = 0
    let failedCount = 0

    for (const item of trackingData) {
      try {
        const { customerOrderNumber, trackingNumber, trackingCompany } = item

        // 필수 필드 검사
        if (!customerOrderNumber || !trackingNumber) {
          results.push({
            customerOrderNumber: customerOrderNumber || 'UNKNOWN',
            status: 'error',
            error: '주문번호 또는 송장번호가 누락되었습니다'
          })
          failedCount++
          continue
        }

        console.log('🔍 주문 조회:', customerOrderNumber)

        // 3-1. customer_order_number로 주문 조회
        const { data: order, error: findError } = await supabaseAdmin
          .from('orders')
          .select('id, customer_order_number')
          .eq('customer_order_number', customerOrderNumber)
          .single()

        if (findError || !order) {
          console.log('❌ 주문 찾기 실패:', customerOrderNumber)
          results.push({
            customerOrderNumber,
            status: 'not_found',
            error: '주문을 찾을 수 없습니다'
          })
          failedCount++
          continue
        }

        console.log('✅ 주문 발견:', order.id)

        const now = new Date().toISOString()

        // 3-2. order_shipping 업데이트
        const shippingUpdate = {
          tracking_number: trackingNumber,
          shipped_at: now
        }

        if (trackingCompany) {
          shippingUpdate.tracking_company = trackingCompany
        }

        const { error: shippingError } = await supabaseAdmin
          .from('order_shipping')
          .update(shippingUpdate)
          .eq('order_id', order.id)

        if (shippingError) {
          console.error('❌ order_shipping 업데이트 오류:', shippingError)
          results.push({
            customerOrderNumber,
            orderId: order.id,
            status: 'error',
            error: `배송 정보 업데이트 실패: ${shippingError.message}`
          })
          failedCount++
          continue
        }

        // 3-3. orders.status = 'shipping' 자동 변경
        const { error: orderError } = await supabaseAdmin
          .from('orders')
          .update({
            status: 'shipping',
            updated_at: now
          })
          .eq('id', order.id)

        if (orderError) {
          console.error('❌ orders 상태 업데이트 오류:', orderError)
          results.push({
            customerOrderNumber,
            orderId: order.id,
            status: 'error',
            error: `주문 상태 변경 실패: ${orderError.message}`
          })
          failedCount++
          continue
        }

        // 3-4. 성공
        console.log('✅ 업데이트 성공:', customerOrderNumber, '→', trackingNumber)
        results.push({
          customerOrderNumber,
          orderId: order.id,
          trackingNumber,
          trackingCompany: trackingCompany || null,
          status: 'success'
        })
        matchedCount++
      } catch (error) {
        console.error('❌ 개별 처리 오류:', error)
        results.push({
          customerOrderNumber: item.customerOrderNumber || 'UNKNOWN',
          status: 'error',
          error: error.message
        })
        failedCount++
      }
    }

    console.log('✅ [송장번호 대량 업데이트 API] 완료:', {
      total: trackingData.length,
      matched: matchedCount,
      failed: failedCount
    })

    return NextResponse.json({
      success: true,
      matched: matchedCount,
      failed: failedCount,
      total: trackingData.length,
      results,
      message: `${matchedCount}개 주문의 송장번호가 저장되고 발송 중으로 변경되었습니다`
    })
  } catch (error) {
    console.error('❌ [송장번호 대량 업데이트 API] 에러:', error)
    return NextResponse.json(
      {
        error: error.message || '대량 업데이트에 실패했습니다',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
