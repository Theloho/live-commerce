import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { access_token } = await request.json()

    if (!access_token) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    console.log('카카오 사용자 정보 요청 시작')

    // 카카오 사용자 정보 요청
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    })

    const userData = await userResponse.json()

    if (!userResponse.ok) {
      console.error('카카오 사용자 정보 요청 실패:', userData)
      return NextResponse.json({ error: userData.msg || 'User info request failed' }, { status: 400 })
    }

    console.log('카카오 사용자 정보 요청 성공')
    return NextResponse.json(userData)

  } catch (error) {
    console.error('카카오 사용자 정보 요청 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}