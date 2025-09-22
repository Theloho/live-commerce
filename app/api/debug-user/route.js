import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

    console.log('사용자 디버깅 시작')

    // 모든 프로필 조회
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?order=updated_at.desc&limit=5`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        error: 'Failed to fetch profiles',
        details: errorText,
        status: response.status
      })
    }

    const profiles = await response.json()
    console.log('최근 프로필들:', profiles)

    return NextResponse.json({
      success: true,
      profiles: profiles,
      count: profiles.length,
      message: '최근 5개 프로필 조회 성공'
    })

  } catch (error) {
    console.error('디버그 오류:', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error.message
    }, { status: 500 })
  }
}