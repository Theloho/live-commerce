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
    console.log('🚀 쿠폰 배포 API 시작')

    // 0. supabaseAdmin 클라이언트 확인
    if (!supabaseAdmin) {
      console.error('❌ supabaseAdmin 클라이언트가 초기화되지 않음')
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }
    console.log('✅ Step 0: supabaseAdmin 클라이언트 확인 완료')

    // 1. 요청 바디 파싱
    const body = await request.json()
    const { couponId, userIds, adminEmail } = body

    console.log('📮 쿠폰 배포 API 호출:', {
      couponId,
      userIdsCount: userIds?.length,
      adminEmail
    })
    console.log('✅ Step 1: 요청 바디 파싱 완료')

    // 2. 필수 파라미터 검증
    if (!couponId) {
      console.error('❌ Step 2: couponId 누락')
      return NextResponse.json(
        { error: 'couponId가 필요합니다' },
        { status: 400 }
      )
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      console.error('❌ Step 2: userIds 누락 또는 비어있음')
      return NextResponse.json(
        { error: 'userIds 배열이 필요합니다' },
        { status: 400 }
      )
    }

    if (!adminEmail) {
      console.error('❌ Step 2: adminEmail 누락')
      return NextResponse.json(
        { error: '관리자 이메일이 필요합니다' },
        { status: 401 }
      )
    }
    console.log('✅ Step 2: 필수 파라미터 검증 완료')

    // 3. 관리자 권한 확인
    console.log('🔐 Step 3: 관리자 권한 확인 시작:', adminEmail)
    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 쿠폰 배포 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }
    console.log('✅ Step 3: 관리자 권한 확인 완료')

    // 4. 쿠폰 존재 및 활성화 상태 확인
    console.log('📋 Step 4: 쿠폰 조회 시작:', couponId)
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from('coupons')
      .select('id, code, is_active')
      .eq('id', couponId)
      .single()

    if (couponError || !coupon) {
      console.error('❌ Step 4: 쿠폰 조회 실패:', couponError)
      return NextResponse.json(
        { error: '쿠폰을 찾을 수 없습니다', details: couponError?.message },
        { status: 404 }
      )
    }

    if (!coupon.is_active) {
      console.error('❌ Step 4: 비활성화된 쿠폰:', coupon.code)
      return NextResponse.json(
        { error: '비활성화된 쿠폰입니다' },
        { status: 400 }
      )
    }
    console.log('✅ Step 4: 쿠폰 조회 완료:', coupon.code)

    // 5. 배포할 사용자 쿠폰 데이터 생성
    console.log(`📝 Step 5: 사용자 쿠폰 데이터 생성 시작 (${userIds.length}명)`)
    const userCoupons = userIds.map(userId => ({
      user_id: userId,
      coupon_id: couponId,
      issued_by: null, // 현재는 null, 향후 관리자 ID 저장 가능
      issued_at: new Date().toISOString()
    }))
    console.log('✅ Step 5: 사용자 쿠폰 데이터 생성 완료')

    // 6. Service Role로 쿠폰 배포 (RLS 우회)
    // ✅ 중복 배포 허용: 같은 사용자에게 같은 쿠폰을 여러 번 줄 수 있음
    console.log(`💾 Step 6: DB INSERT 시작 (${userCoupons.length}개 레코드)`)
    const { data, error } = await supabaseAdmin
      .from('user_coupons')
      .insert(userCoupons)
      .select()

    if (error) {
      console.error('❌ Step 6: 쿠폰 배포 INSERT 실패:', error)
      console.error('에러 상세:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: '쿠폰 배포에 실패했습니다', details: error.message },
        { status: 500 }
      )
    }
    console.log(`✅ Step 6: DB INSERT 완료 (${data?.length}개 성공)`)

    // 7. 결과 반환
    const result = {
      success: true,
      distributedCount: data?.length || 0,
      requestedCount: userIds.length,
      couponCode: coupon.code,
      message: '쿠폰이 성공적으로 배포되었습니다 (중복 배포 가능)'
    }

    console.log('✅ Step 7: 쿠폰 배포 완료:', result)

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    console.error('❌ 쿠폰 배포 API 에러 (catch):', error)
    console.error('에러 메시지:', error.message)
    console.error('에러 스택:', error.stack)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}
