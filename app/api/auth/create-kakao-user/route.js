import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용한 관리자 클라이언트 생성
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    const { kakao_id, email, name, nickname, avatar_url, provider } = await request.json()

    if (!kakao_id || !name) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    console.log('새 카카오 사용자 생성:', { kakao_id, email, name })

    const userId = crypto.randomUUID()

    // 1. auth.users 테이블에 사용자 생성 (Service Role Key 필요)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      id: userId,
      email: email || `kakao_${kakao_id}@temp.com`,
      email_confirm: true,
      user_metadata: {
        kakao_id: kakao_id,
        name: name,
        nickname: nickname,
        avatar_url: avatar_url,
        provider: provider
      }
    })

    if (authError) {
      console.error('auth.users 생성 실패:', authError)
      // auth.users 생성 실패해도 profiles는 생성 시도
    }

    // 2. profiles 테이블에 프로필 생성
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        kakao_id: kakao_id,
        email: email || `kakao_${kakao_id}@temp.com`,
        name: name,
        nickname: nickname,
        avatar_url: avatar_url,
        provider: provider
      })
      .select()
      .single()

    if (profileError) {
      console.error('프로필 생성 실패:', profileError)
      throw profileError
    }

    console.log('카카오 사용자 생성 성공:', profile)

    // 3. 웰컴 쿠폰 자동 발급
    try {
      // WELCOME 쿠폰 찾기
      const { data: welcomeCoupon } = await supabaseAdmin
        .from('coupons')
        .select('id, code, name')
        .eq('code', 'WELCOME')
        .eq('is_active', true)
        .single()

      if (welcomeCoupon) {
        // 웰컴 쿠폰 발급
        const { error: couponError } = await supabaseAdmin
          .from('user_coupons')
          .insert({
            user_id: userId,
            coupon_id: welcomeCoupon.id,
            issued_by: null, // 시스템 자동 발급
            issued_at: new Date().toISOString()
          })

        if (couponError) {
          console.error('웰컴 쿠폰 발급 실패:', couponError)
        } else {
          console.log('🎟️ 웰컴 쿠폰 자동 발급 성공:', welcomeCoupon.code)
        }
      } else {
        console.log('⚠️ WELCOME 쿠폰이 존재하지 않거나 비활성화되어 있습니다')
      }
    } catch (couponError) {
      console.error('웰컴 쿠폰 발급 중 오류:', couponError)
      // 쿠폰 발급 실패해도 회원가입은 성공 처리
    }

    return NextResponse.json(profile)

  } catch (error) {
    console.error('카카오 사용자 생성 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}