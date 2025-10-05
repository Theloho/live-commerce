import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service Role 클라이언트 (RLS 우회)
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

export async function POST(request) {
  try {
    const { kakao_id, new_password } = await request.json()

    if (!kakao_id || !new_password) {
      return NextResponse.json(
        { success: false, error: 'kakao_id와 new_password 필수' },
        { status: 400 }
      )
    }

    console.log(`🔧 카카오 사용자 패스워드 재설정: kakao_id=${kakao_id}`)

    // 1. profiles에서 사용자 ID 조회
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('kakao_id', kakao_id)
      .single()

    if (profileError || !profile) {
      console.error('프로필 조회 실패:', profileError)
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    console.log(`📧 사용자 확인: ${profile.email} (${profile.id})`)

    // 2. Service Role로 패스워드 재설정
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: new_password }
    )

    if (updateError) {
      console.error('패스워드 재설정 실패:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    console.log(`✅ 패스워드 재설정 성공: ${profile.email}`)

    return NextResponse.json({
      success: true,
      user_id: profile.id,
      email: profile.email
    })

  } catch (error) {
    console.error('API 에러:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
