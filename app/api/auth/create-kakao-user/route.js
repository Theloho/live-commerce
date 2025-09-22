import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { kakao_id, email, name, nickname, avatar_url, provider } = await request.json()

    if (!kakao_id || !name) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    console.log('새 카카오 사용자 생성:', { kakao_id, email, name })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase 환경변수가 설정되지 않았습니다')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // REST API로 사용자 생성
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        kakao_id: kakao_id,
        email: email,
        name: name, // 초기에는 카카오 닉네임을 이름으로 사용
        nickname: nickname, // 카카오 닉네임은 별도 필드로 저장
        avatar_url: avatar_url,
        provider: provider,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`사용자 생성 실패: ${response.status} - ${errorData}`)
    }

    const newUser = await response.json()
    console.log('카카오 사용자 생성 성공:', newUser[0])

    return NextResponse.json(newUser[0])

  } catch (error) {
    console.error('카카오 사용자 생성 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}