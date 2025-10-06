/**
 * 관리자 전용 API: 쿠폰 배포
 *
 * POST /api/admin/coupons/distribute
 *
 * 목적: 관리자가 특정 사용자들에게 쿠폰을 안전하게 배포
 * 보안: 관리자 이메일 검증 + Service Role Key 사용
 *
 * 작성일: 2025-10-03
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

const isDevelopment = process.env.NODE_ENV === 'development'

export async function POST(request) {
  try {
    // 0. supabaseAdmin 클라이언트 확인
    if (!supabaseAdmin) {
      console.error('❌ supabaseAdmin 클라이언트가 초기화되지 않음')
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    // 1. 요청 바디 파싱
    const body = await request.json()
    const { couponId, userIds, adminEmail } = body

    if (isDevelopment) {
      console.log('📮 쿠폰 배포 API 호출:', {
        couponId,
        userIdsCount: userIds?.length,
        adminEmail
      })
    }

    // 2. 필수 파라미터 검증
    if (!couponId) {
      return NextResponse.json(
        { error: 'couponId가 필요합니다' },
        { status: 400 }
      )
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds 배열이 필요합니다' },
        { status: 400 }
      )
    }

    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 이메일이 필요합니다' },
        { status: 401 }
      )
    }

    // 3. 관리자 권한 확인
    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 쿠폰 배포 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 4. 쿠폰 존재 및 활성화 상태 확인
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from('coupons')
      .select('id, code, is_active')
      .eq('id', couponId)
      .single()

    if (couponError || !coupon) {
      console.error('❌ 쿠폰 조회 실패:', couponError)
      return NextResponse.json(
        { error: '쿠폰을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (!coupon.is_active) {
      return NextResponse.json(
        { error: '비활성화된 쿠폰입니다' },
        { status: 400 }
      )
    }

    // 5. 배포할 사용자 쿠폰 데이터 생성
    const userCoupons = userIds.map(userId => ({
      user_id: userId,
      coupon_id: couponId,
      issued_by: null, // 현재는 null, 향후 관리자 ID 저장 가능
      issued_at: new Date().toISOString()
    }))

    // 6. Service Role로 쿠폰 배포 (RLS 우회)
    // ✅ 중복 배포 허용: 같은 사용자에게 같은 쿠폰을 여러 번 줄 수 있음
    const { data, error } = await supabaseAdmin
      .from('user_coupons')
      .insert(userCoupons)
      .select()

    if (error) {
      console.error('❌ 쿠폰 배포 실패:', error)
      return NextResponse.json(
        { error: '쿠폰 배포에 실패했습니다', details: error.message },
        { status: 500 }
      )
    }

    // 7. 결과 반환
    const result = {
      success: true,
      distributedCount: data?.length || 0,
      requestedCount: userIds.length,
      couponCode: coupon.code,
      message: '쿠폰이 성공적으로 배포되었습니다 (중복 배포 가능)'
    }

    if (isDevelopment) {
      console.log('✅ 쿠폰 배포 완료:', result)
    }

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    console.error('❌ 쿠폰 배포 API 에러:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    )
  }
}
