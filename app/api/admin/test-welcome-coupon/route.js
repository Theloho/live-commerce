import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * 웰컴 쿠폰 시스템 상태 확인 API (디버깅용)
 */
export async function GET(request) {
  try {
    // 1. 웰컴 쿠폰 존재 여부 확인
    const { data: welcomeCoupons, error: couponError } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('is_welcome_coupon', true)
      .eq('is_active', true)

    if (couponError) throw couponError

    // 2. 최근 가입한 사용자 10명의 쿠폰 발급 현황
    const { data: recentUsers, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        email,
        name,
        created_at,
        user_coupons (
          id,
          coupon_id,
          issued_at,
          coupons (
            name,
            is_welcome_coupon
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (usersError) throw usersError

    return NextResponse.json({
      success: true,
      welcomeCoupons: {
        count: welcomeCoupons?.length || 0,
        coupons: welcomeCoupons || []
      },
      recentUsers: recentUsers?.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        welcomeCouponReceived: user.user_coupons?.some(uc => uc.coupons?.is_welcome_coupon) || false,
        totalCoupons: user.user_coupons?.length || 0
      })) || [],
      diagnosis: {
        hasActivWelcomeCoupon: (welcomeCoupons?.length || 0) > 0,
        recentUsersCount: recentUsers?.length || 0,
        usersWithWelcomeCoupon: recentUsers?.filter(u =>
          u.user_coupons?.some(uc => uc.coupons?.is_welcome_coupon)
        ).length || 0
      }
    })
  } catch (error) {
    console.error('❌ 웰컴 쿠폰 시스템 확인 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
