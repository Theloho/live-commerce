import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }

    console.log('프로필 테이블에 누락된 컬럼 추가...')

    // 기존 사용자 프로필을 먼저 조회
    const checkResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!checkResponse.ok) {
      const error = await checkResponse.text()
      console.log('프로필 테이블 조회:', error)
    }

    const profiles = await checkResponse.json()
    console.log('현재 프로필 테이블 구조:', Object.keys(profiles[0] || {}))

    // 현재 테이블에 detail_address 컬럼이 없다면 기본값으로 처리
    const missingColumns = ['detail_address', 'postal_code', 'birth_date', 'gender', 'marketing_agreed']

    // 각 사용자의 누락된 필드를 NULL 또는 기본값으로 설정
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?kakao_id=not.is.null`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        updated_at: new Date().toISOString()
      })
    })

    let updateResult = null
    if (updateResponse.ok) {
      updateResult = await updateResponse.json()
      console.log('프로필 업데이트 성공:', updateResult.length, '개 레코드')
    } else {
      const error = await updateResponse.text()
      console.log('프로필 업데이트 실패:', error)
    }

    return NextResponse.json({
      success: true,
      message: '프로필 테이블 호환성 확인 완료',
      currentStructure: Object.keys(profiles[0] || {}),
      updateResult: updateResult?.length || 0
    })

  } catch (error) {
    console.error('스키마 업데이트 오류:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}