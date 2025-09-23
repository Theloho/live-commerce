import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용한 관리자 클라이언트 생성
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    const { kakao_id, name, nickname, avatar_url } = await request.json()

    if (!kakao_id) {
      return NextResponse.json({ error: 'Kakao ID is required' }, { status: 400 })
    }

    console.log('카카오 사용자 정보 업데이트:', { kakao_id, name })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase 환경변수가 설정되지 않았습니다')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // REST API로 사용자 정보 업데이트
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?kakao_id=eq.${kakao_id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        avatar_url: avatar_url,
        updated_at: new Date().toISOString()
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`사용자 업데이트 실패: ${response.status} - ${errorData}`)
    }

    const updatedUser = await response.json()
    console.log('카카오 사용자 업데이트 성공:', updatedUser[0])

    // auth.users에도 사용자가 있는지 확인하고 없으면 추가
    if (updatedUser[0]) {
      try {
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(updatedUser[0].id)

        if (!existingUser?.user) {
          console.log('auth.users에 사용자 추가 중...')
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            id: updatedUser[0].id,
            email: updatedUser[0].email,
            email_confirm: true,
            user_metadata: {
              kakao_id: updatedUser[0].kakao_id,
              name: updatedUser[0].name,
              nickname: updatedUser[0].nickname,
              avatar_url: updatedUser[0].avatar_url,
              provider: 'kakao'
            }
          })

          if (authError) {
            console.error('auth.users 생성 실패:', authError)
          } else {
            console.log('auth.users에 사용자 추가 성공')
          }
        }
      } catch (error) {
        console.error('auth.users 확인/생성 중 오류:', error)
      }
    }

    return NextResponse.json(updatedUser[0])

  } catch (error) {
    console.error('카카오 사용자 업데이트 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}