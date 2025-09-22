import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('Supabase 연결 테스트 시작')

    // 1. profiles 테이블 조회 테스트
    const profilesUrl = `${supabaseUrl}/rest/v1/profiles?select=id,kakao_id,name&limit=1`
    console.log('profiles 테이블 조회 URL:', profilesUrl)

    const profilesResponse = await fetch(profilesUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('profiles 응답 상태:', profilesResponse.status)

    let profilesResult
    if (profilesResponse.ok) {
      profilesResult = await profilesResponse.json()
      console.log('profiles 조회 성공:', profilesResult)
    } else {
      const errorText = await profilesResponse.text()
      console.error('profiles 조회 실패:', errorText)
      profilesResult = { error: errorText, status: profilesResponse.status }
    }

    // 2. 특정 kakao_id로 검색 테스트
    const testKakaoId = '4454444603'
    const searchUrl = `${supabaseUrl}/rest/v1/profiles?kakao_id=eq.${testKakaoId}&select=*`
    console.log('kakao_id 검색 URL:', searchUrl)

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('검색 응답 상태:', searchResponse.status)

    let searchResult
    if (searchResponse.ok) {
      searchResult = await searchResponse.json()
      console.log('검색 성공:', searchResult)
    } else {
      const errorText = await searchResponse.text()
      console.error('검색 실패:', errorText)
      searchResult = { error: errorText, status: searchResponse.status }
    }

    return NextResponse.json({
      success: true,
      profiles: {
        status: profilesResponse.status,
        result: profilesResult
      },
      search: {
        status: searchResponse.status,
        result: searchResult,
        kakaoId: testKakaoId
      }
    })

  } catch (error) {
    console.error('Supabase 테스트 오류:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}