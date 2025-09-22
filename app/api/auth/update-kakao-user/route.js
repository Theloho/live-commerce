import { NextResponse } from 'next/server'

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
        name: name,
        nickname: nickname,
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

    return NextResponse.json(updatedUser[0])

  } catch (error) {
    console.error('카카오 사용자 업데이트 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}