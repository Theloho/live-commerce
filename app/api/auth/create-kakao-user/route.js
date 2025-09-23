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
    return NextResponse.json(profile)

  } catch (error) {
    console.error('카카오 사용자 생성 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}