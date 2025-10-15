import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

/**
 * 송장번호 단일 업데이트 API (Service Role)
 * - 관리자 전용
 * - order_shipping.tracking_number 업데이트
 * - 자동으로 orders.status = 'shipping' 변경
 * - shipped_at 타임스탬프 자동 기록
 */
export async function POST(request) {
  try {
    const { adminEmail, orderId, trackingNumber, trackingCompany } = await request.json()

    console.log('🚚 [송장번호 업데이트 API] 시작:', {
      adminEmail,
      orderId,
      trackingNumber,
      trackingCompany
    })

    // 1. 유효성 검사
    if (!adminEmail || !orderId || !trackingNumber) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다 (adminEmail, orderId, trackingNumber)' },
        { status: 400 }
      )
    }

    // 2. 관리자 인증
    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 송장번호 업데이트 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    const now = new Date().toISOString()

    // 3. order_shipping 테이블 업데이트 (RLS 우회)
    const shippingUpdate = {
      tracking_number: trackingNumber,
      shipped_at: now
    }

    // tracking_company는 선택적
    if (trackingCompany) {
      shippingUpdate.tracking_company = trackingCompany
    }

    const { error: shippingError } = await supabaseAdmin
      .from('order_shipping')
      .update(shippingUpdate)
      .eq('order_id', orderId)

    if (shippingError) {
      console.error('❌ order_shipping 업데이트 오류:', shippingError)
      throw shippingError
    }

    console.log('✅ order_shipping 업데이트 완료:', orderId)

    // 4. orders.status = 'shipping' 자동 변경
    const { error: orderError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'shipping',
        updated_at: now
      })
      .eq('id', orderId)

    if (orderError) {
      console.error('❌ orders 상태 업데이트 오류:', orderError)
      throw orderError
    }

    console.log('✅ orders.status = shipping 업데이트 완료:', orderId)

    return NextResponse.json({
      success: true,
      orderId,
      trackingNumber,
      trackingCompany: trackingCompany || null,
      message: '송장번호가 저장되고 발송 중으로 변경되었습니다'
    })
  } catch (error) {
    console.error('❌ [송장번호 업데이트 API] 에러:', error)
    return NextResponse.json(
      {
        error: error.message || '송장번호 업데이트에 실패했습니다',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
