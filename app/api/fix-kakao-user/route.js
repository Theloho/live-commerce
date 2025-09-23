import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용한 관리자 클라이언트 생성
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    const { userId, email, name, nickname, kakaoId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('카카오 사용자 auth.users 추가 시도:', { userId, email })

    // auth.users에 사용자가 있는지 확인
    try {
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId)

      if (existingUser?.user) {
        console.log('사용자가 이미 auth.users에 존재합니다')
        return NextResponse.json({
          success: true,
          message: '사용자가 이미 auth.users에 존재합니다',
          user: existingUser.user
        })
      }
    } catch (checkError) {
      console.log('사용자 확인 중...', checkError.message)
    }

    // auth.users에 사용자 생성
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      id: userId,
      email: email || `kakao_${kakaoId}@temp.com`,
      email_confirm: true,
      user_metadata: {
        kakao_id: kakaoId,
        name: name,
        nickname: nickname,
        provider: 'kakao'
      }
    })

    if (authError) {
      console.error('auth.users 생성 실패:', authError)

      // Anon key로는 auth.admin 접근 불가
      if (authError.message?.includes('not allowed') || authError.message?.includes('Invalid API key')) {
        // 대안: orders 테이블의 외래 키 제약을 우회하는 방법
        return NextResponse.json({
          success: false,
          message: 'Service Role Key가 필요합니다. 로그아웃 후 다시 로그인하거나 관리자에게 문의하세요.',
          alternative: '다시 로그인하면 자동으로 해결됩니다'
        })
      }

      throw authError
    }

    console.log('auth.users에 사용자 추가 성공:', authUser)

    return NextResponse.json({
      success: true,
      message: 'auth.users에 사용자가 추가되었습니다',
      user: authUser.user
    })

  } catch (error) {
    console.error('카카오 사용자 수정 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        suggestion: '로그아웃 후 다시 로그인해주세요'
      },
      { status: 500 }
    )
  }
}