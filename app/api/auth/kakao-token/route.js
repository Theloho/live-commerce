import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 })
    }

    console.log('카카오 토큰 교환 시작:', code)

    // 환경변수 디버깅
    const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || '25369ebb145320aed6a888a721f088a9'
    const redirectUri = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI || 'https://allok.shop/auth/callback'
    const clientSecret = process.env.KAKAO_CLIENT_SECRET || ''

    console.log('환경변수 확인:', {
      clientId: clientId ? '설정됨' : '미설정',
      redirectUri: redirectUri ? '설정됨' : '미설정',
      clientSecret: clientSecret ? '설정됨' : '미설정'
    })

    // 카카오 토큰 교환 요청
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('카카오 토큰 교환 실패:', tokenData)
      return NextResponse.json({ error: tokenData.error_description || 'Token exchange failed' }, { status: 400 })
    }

    console.log('카카오 토큰 교환 성공')
    return NextResponse.json(tokenData)

  } catch (error) {
    console.error('카카오 토큰 교환 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}