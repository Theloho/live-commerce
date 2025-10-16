import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// SERVICE_ROLE_KEY 사용 (RLS 우회)
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
 * 쿠폰 완전 삭제 API (관리자 전용)
 * Service Role 키로 RLS 우회
 * ⚠️ CASCADE로 user_coupons도 삭제되지만, 주문 금액은 영향 없음
 */
export async function DELETE(request) {
  try {
    const { couponId } = await request.json()

    if (!couponId) {
      return NextResponse.json({
        error: '쿠폰 ID가 필요합니다'
      }, { status: 400 })
    }

    console.log('🗑️ 쿠폰 삭제 API:', couponId)

    // 쿠폰 정보 먼저 조회 (로그용)
    const { data: coupon, error: fetchError } = await supabaseAdmin
      .from('coupons')
      .select('code, name, total_issued_count, total_used_count')
      .eq('id', couponId)
      .single()

    if (fetchError || !coupon) {
      console.error('❌ 쿠폰 조회 실패:', fetchError)
      return NextResponse.json({
        error: '쿠폰을 찾을 수 없습니다'
      }, { status: 404 })
    }

    console.log(`🗑️ 삭제할 쿠폰: ${coupon.code} (발급: ${coupon.total_issued_count}명, 사용: ${coupon.total_used_count}명)`)

    // CASCADE로 user_coupons도 자동 삭제됨 (주문 금액은 영향 없음)
    const { error: deleteError } = await supabaseAdmin
      .from('coupons')
      .delete()
      .eq('id', couponId)

    if (deleteError) {
      console.error('❌ 쿠폰 삭제 실패:', deleteError)
      return NextResponse.json({
        error: deleteError.message || '쿠폰 삭제에 실패했습니다'
      }, { status: 500 })
    }

    console.log('✅ 쿠폰 삭제 완료:', coupon.code)

    return NextResponse.json({
      success: true,
      deletedCoupon: coupon
    })

  } catch (error) {
    console.error('❌ 쿠폰 삭제 API 오류:', error)
    return NextResponse.json({
      error: '쿠폰 삭제 중 오류가 발생했습니다',
      details: error.message
    }, { status: 500 })
  }
}
