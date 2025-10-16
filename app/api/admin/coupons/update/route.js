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
 * 쿠폰 수정 API (관리자 전용)
 * Service Role 키로 RLS 우회
 */
export async function PATCH(request) {
  try {
    const { couponId, updates } = await request.json()

    if (!couponId) {
      return NextResponse.json({
        error: '쿠폰 ID가 필요합니다'
      }, { status: 400 })
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({
        error: '수정할 데이터가 없습니다'
      }, { status: 400 })
    }

    console.log('✏️ 쿠폰 수정 API:', { couponId, updates })

    // Service Role로 쿠폰 수정 (RLS 우회)
    const { data: coupon, error: updateError } = await supabaseAdmin
      .from('coupons')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', couponId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ 쿠폰 수정 실패:', updateError)
      return NextResponse.json({
        error: updateError.message || '쿠폰 수정에 실패했습니다'
      }, { status: 500 })
    }

    console.log('✅ 쿠폰 수정 성공:', coupon.code)

    return NextResponse.json({
      success: true,
      coupon
    })

  } catch (error) {
    console.error('❌ 쿠폰 수정 API 오류:', error)
    return NextResponse.json({
      error: '쿠폰 수정 중 오류가 발생했습니다',
      details: error.message
    }, { status: 500 })
  }
}
