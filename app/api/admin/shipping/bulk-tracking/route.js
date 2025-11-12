import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

/**
 * 송장번호 대량 업데이트 API (Service Role)
 * - 관리자 전용
 * - Excel에서 파싱된 여러 송장번호를 일괄 처리
 * - 주문번호(customer_order_number) 기준 자동 매칭
 * - 매칭된 주문은 자동으로 status = 'delivered' 변경 (송장 입력 = 발송 완료)
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

    // 3. 병렬 처리 함수 (배치 크기: 20개씩)
    const processItem = async (item) => {
      try {
        const { customerOrderNumber, trackingNumber, trackingCompany = 'hanjin' } = item

        // 필수 필드 검사
        if (!customerOrderNumber || !trackingNumber) {
          return [{
            customerOrderNumber: customerOrderNumber || 'UNKNOWN',
            status: 'error',
            error: '주문번호 또는 송장번호가 누락되었습니다'
          }]
        }

        // ⭐ 여러 개 주문번호 처리 (쉼표로 구분)
        const orderNumbers = String(customerOrderNumber)
          .split(',')
          .map(n => n.trim())
          .filter(n => n)  // 빈 문자열 제거

        console.log(`📋 처리할 주문번호 ${orderNumbers.length}개:`, orderNumbers)

        // ⭐ 송장번호 정규화 (앞뒤 공백 제거, 하이픈 제거) - 미리 계산
        const normalizedTrackingNumber = String(trackingNumber).trim().replace(/[\s-]/g, '')
        const now = new Date().toISOString()

        // 각 주문번호마다 처리
        const results = []
        for (const orderNum of orderNumbers) {
          try {
            // 주문번호 정규화 (앞뒤 공백 제거, 대문자 변환)
            const normalizedOrderNumber = orderNum.trim().toUpperCase()

            // 3-1. customer_order_number로 주문 조회 (대소문자 무시)
            const { data: order, error: findError } = await supabaseAdmin
              .from('orders')
              .select('id, customer_order_number')
              .ilike('customer_order_number', normalizedOrderNumber)
              .single()

            if (findError || !order) {
              console.warn(`❌ 주문 조회 실패: ${normalizedOrderNumber}`, {
                error: findError?.message,
                hint: findError?.hint,
                details: findError?.details
              })
              results.push({
                customerOrderNumber: orderNum,
                status: 'not_found',
                error: `주문을 찾을 수 없습니다 (${normalizedOrderNumber})`
              })
              continue
            }

            console.log(`✅ 주문 매칭 성공: ${normalizedOrderNumber} → ${order.id}`)

            // 3-2. order_shipping + orders 동시 업데이트 (병렬)
            const [shippingResult, orderResult] = await Promise.all([
              supabaseAdmin
                .from('order_shipping')
                .update({
                  tracking_number: normalizedTrackingNumber,
                  tracking_company: trackingCompany,
                  shipped_at: now
                })
                .eq('order_id', order.id),
              supabaseAdmin
                .from('orders')
                .update({
                  status: 'delivered',
                  delivered_at: now,
                  updated_at: now
                })
                .eq('id', order.id)
            ])

            console.log(`📦 송장번호 업데이트: ${normalizedTrackingNumber} (${trackingCompany})`)

            if (shippingResult.error) {
              console.error(`❌ 배송 정보 업데이트 실패: ${order.id}`, shippingResult.error)
              results.push({
                customerOrderNumber: orderNum,
                orderId: order.id,
                status: 'error',
                error: `배송 정보 업데이트 실패: ${shippingResult.error.message}`
              })
              continue
            }

            if (orderResult.error) {
              console.error(`❌ 주문 상태 변경 실패: ${order.id}`, orderResult.error)
              results.push({
                customerOrderNumber: orderNum,
                orderId: order.id,
                status: 'error',
                error: `주문 상태 변경 실패: ${orderResult.error.message}`
              })
              continue
            }

            // 3-3. 성공
            console.log(`🎉 완료: ${normalizedOrderNumber} → delivered`)
            results.push({
              customerOrderNumber: orderNum,
              orderId: order.id,
              trackingNumber: normalizedTrackingNumber,
              trackingCompany,
              status: 'success'
            })
          } catch (error) {
            results.push({
              customerOrderNumber: orderNum,
              status: 'error',
              error: error.message
            })
          }
        }

        return results
      } catch (error) {
        return [{
          customerOrderNumber: item.customerOrderNumber || 'UNKNOWN',
          status: 'error',
          error: error.message
        }]
      }
    }

    // 4. 배치 처리 (20개씩 병렬)
    const BATCH_SIZE = 20
    const results = []

    for (let i = 0; i < trackingData.length; i += BATCH_SIZE) {
      const batch = trackingData.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(batch.map(processItem))
      // ⭐ processItem이 배열을 반환하므로 flat 처리
      const flatResults = batchResults.flat()
      results.push(...flatResults)
      console.log(`✅ 배치 ${Math.floor(i / BATCH_SIZE) + 1} 완료: ${flatResults.length}개`)
    }

    // 5. 결과 집계
    const matchedCount = results.filter(r => r.status === 'success').length
    const failedCount = results.filter(r => r.status !== 'success').length

    console.log('✅ [송장번호 대량 업데이트 API] 완료:', {
      uploadedRows: trackingData.length,
      processedOrders: results.length,
      matched: matchedCount,
      failed: failedCount
    })

    return NextResponse.json({
      success: true,
      matched: matchedCount,
      failed: failedCount,
      uploadedRows: trackingData.length,
      processedOrders: results.length,
      results,
      message: `${matchedCount}개 주문의 송장번호가 저장되고 발송 완료로 변경되었습니다`
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
