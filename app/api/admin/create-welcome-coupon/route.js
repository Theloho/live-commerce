import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * 웰컴 쿠폰 생성 API (관리자 전용)
 * 회원가입 시 자동 지급되는 WELCOME 쿠폰 생성
 */
export async function POST(request) {
  try {
    console.log('🎟️ 웰컴 쿠폰 생성 시작...')

    // 1. 기존 WELCOME 쿠폰 확인
    const { data: existingCoupons, error: checkError } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', 'WELCOME')

    if (checkError) throw checkError

    console.log('📋 기존 WELCOME 쿠폰:', existingCoupons)

    // 2. 웰컴 쿠폰 데이터
    const welcomeCouponData = {
      code: 'WELCOME',
      name: '신규가입 환영 쿠폰',
      description: '첫 구매 시 사용 가능한 5,000원 할인 쿠폰 (3만원 이상 구매 시)',
      discount_type: 'fixed_amount',
      discount_value: 5000,
      min_purchase_amount: 30000,
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1년 후
      usage_limit_per_user: 1,
      total_usage_limit: null, // 무제한 발급
      is_active: true,
      is_welcome_coupon: true, // ⭐ 웰컴 쿠폰 플래그
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    let coupon
    if (existingCoupons && existingCoupons.length > 0) {
      // 3-A. 기존 쿠폰 업데이트
      const { data, error } = await supabaseAdmin
        .from('coupons')
        .update({
          ...welcomeCouponData,
          id: existingCoupons[0].id // 기존 ID 유지
        })
        .eq('code', 'WELCOME')
        .select()
        .single()

      if (error) throw error
      coupon = data
      console.log('✅ 기존 WELCOME 쿠폰 업데이트 완료:', coupon)
    } else {
      // 3-B. 새 쿠폰 생성
      const { data, error } = await supabaseAdmin
        .from('coupons')
        .insert(welcomeCouponData)
        .select()
        .single()

      if (error) throw error
      coupon = data
      console.log('✅ 새 WELCOME 쿠폰 생성 완료:', coupon)
    }

    return NextResponse.json({
      success: true,
      coupon: coupon,
      message: existingCoupons?.length > 0 ? '웰컴 쿠폰 업데이트 완료' : '웰컴 쿠폰 생성 완료',
      info: {
        code: coupon.code,
        discount: `${coupon.discount_value}원`,
        min_purchase: `${coupon.min_purchase_amount}원 이상`,
        is_welcome_coupon: coupon.is_welcome_coupon,
        is_active: coupon.is_active
      },
      trigger_info: '회원가입 시 handle_new_user_signup() 트리거가 자동으로 쿠폰을 발급합니다'
    })

  } catch (error) {
    console.error('❌ 웰컴 쿠폰 생성 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.details || error.hint
      },
      { status: 500 }
    )
  }
}

/**
 * 웰컴 쿠폰 상태 확인 (GET)
 */
export async function GET(request) {
  try {
    // 1. 웰컴 쿠폰 조회
    const { data: welcomeCoupons, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('is_welcome_coupon', true)

    if (error) throw error

    // 2. WELCOME 코드 쿠폰 조회
    const { data: welcomeCodeCoupon } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', 'WELCOME')
      .maybeSingle()

    return NextResponse.json({
      success: true,
      welcomeCoupons: welcomeCoupons || [],
      welcomeCodeCoupon: welcomeCodeCoupon,
      count: welcomeCoupons?.length || 0,
      diagnosis: {
        hasWelcomeCoupon: (welcomeCoupons?.length || 0) > 0,
        welcomeCodeExists: !!welcomeCodeCoupon,
        welcomeCodeIsWelcome: welcomeCodeCoupon?.is_welcome_coupon === true
      }
    })
  } catch (error) {
    console.error('❌ 웰컴 쿠폰 조회 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
