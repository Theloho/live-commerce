import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

    console.log('사용자 생성 테스트 시작')

    // 테스트 사용자 데이터
    const testUserData = {
      kakao_id: '4454444603',
      email: 'kakao_4454444603@temp.com',
      name: '테스트사용자',
      nickname: '테스트사용자',
      avatar_url: 'https://example.com/avatar.jpg',
      provider: 'kakao'
    }

    console.log('생성할 사용자 데이터:', testUserData)

    // REST API로 사용자 생성
    const createUrl = `${supabaseUrl}/rest/v1/profiles`
    console.log('생성 URL:', createUrl)

    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        kakao_id: testUserData.kakao_id,
        email: testUserData.email,
        name: testUserData.name,
        nickname: testUserData.nickname,
        avatar_url: testUserData.avatar_url,
        provider: testUserData.provider,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    })

    console.log('생성 응답 상태:', response.status)

    let result
    if (response.ok) {
      result = await response.json()
      console.log('사용자 생성 성공:', result)
    } else {
      const errorText = await response.text()
      console.error('사용자 생성 실패:', errorText)
      result = { error: errorText, status: response.status }
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      result: result,
      testData: testUserData
    })

  } catch (error) {
    console.error('사용자 생성 테스트 오류:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}