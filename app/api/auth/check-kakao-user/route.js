import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { kakao_id } = await request.json()

    if (!kakao_id) {
      return NextResponse.json({ error: 'Kakao ID is required' }, { status: 400 })
    }

    console.log('카카오 사용자 확인:', kakao_id)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

    console.log('환경변수 확인:', {
      urlExists: !!supabaseUrl,
      keyExists: !!supabaseKey,
      urlLength: supabaseUrl?.length,
      keyLength: supabaseKey?.length
    })

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase 환경변수가 설정되지 않았습니다')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // REST API로 사용자 확인
    const fetchUrl = `${supabaseUrl}/rest/v1/profiles?kakao_id=eq.${kakao_id}&select=*`
    console.log('요청 URL:', fetchUrl)

    const response = await fetch(fetchUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('응답 상태:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase 요청 실패:', errorText)
      throw new Error(`사용자 조회 실패: ${response.status} - ${errorText}`)
    }

    const users = await response.json()
    const exists = users.length > 0

    console.log('카카오 사용자 존재 여부:', exists, '결과:', users)

    return NextResponse.json({
      exists,
      user: exists ? users[0] : null
    })

  } catch (error) {
    console.error('카카오 사용자 확인 오류:', error.message)
    console.error('스택 트레이스:', error.stack)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}