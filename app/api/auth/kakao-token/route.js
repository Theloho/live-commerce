import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      )
    }

    // 환경변수 설정 (임시로 하드코딩 우선 사용)
    const clientId = '25369ebb145320aed6a888a721f088a9'
    const clientSecret = 'i07Uam9nawUxEglylpaycYim67rYi5B6'
    const redirectUri = 'https://allok.shop/auth/callback'

    // 카카오 토큰 교환 요청 파라미터
    const params = new URLSearchParams()
    params.append('grant_type', 'authorization_code')
    params.append('client_id', clientId)
    params.append('client_secret', clientSecret)
    params.append('redirect_uri', redirectUri)
    params.append('code', code)

    // 카카오 토큰 요청
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      return NextResponse.json(
        {
          error: tokenData.error_description || tokenData.error || 'Token exchange failed',
          error_code: tokenData.error_code,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(tokenData)

  } catch (error) {
    console.error('Kakao token exchange error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}