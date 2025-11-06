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

    // 카카오 토큰 요청 (Retry 로직 포함)
    let tokenResponse
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
          signal: AbortSignal.timeout(10000) // 10초 타임아웃
        })

        // 성공하면 루프 종료
        if (tokenResponse.ok || tokenResponse.status < 500) {
          break
        }

        // 5xx 에러면 재시도
        console.warn(`Kakao API 응답 오류 (${tokenResponse.status}), 재시도 ${retryCount + 1}/${maxRetries}`)
        retryCount++

        if (retryCount < maxRetries) {
          // 지수 백오프: 1초, 2초, 4초
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)))
        }
      } catch (fetchError) {
        console.warn(`Kakao API 호출 실패 (${fetchError.message}), 재시도 ${retryCount + 1}/${maxRetries}`)
        retryCount++

        if (retryCount >= maxRetries) {
          throw new Error(`카카오 API 호출 실패 (${maxRetries}회 시도): ${fetchError.message}`)
        }

        // 지수 백오프
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)))
      }
    }

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