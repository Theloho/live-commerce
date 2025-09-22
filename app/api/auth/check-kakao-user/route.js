import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { kakao_id } = await request.json()

    if (!kakao_id) {
      return NextResponse.json({ error: 'Kakao ID is required' }, { status: 400 })
    }

    console.log('카카오 사용자 확인:', kakao_id)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase 환경변수가 설정되지 않았습니다')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // REST API로 사용자 확인
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?kakao_id=eq.${kakao_id}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`사용자 조회 실패: ${response.status}`)
    }

    const users = await response.json()
    const exists = users.length > 0

    console.log('카카오 사용자 존재 여부:', exists)

    return NextResponse.json({
      exists,
      user: exists ? users[0] : null
    })

  } catch (error) {
    console.error('카카오 사용자 확인 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}