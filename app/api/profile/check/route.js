import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/profile/check
 * 사용자 프로필 완성도 체크 API
 *
 * Query Parameters:
 * - userId: 사용자 ID (필수)
 *
 * Response:
 * - success: true/false
 * - profile: { id, phone, address, name, ... }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId가 필요합니다' },
        { status: 400 }
      )
    }

    // DB에서 프로필 조회
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, phone, address, detail_address, postal_code, name, nickname, email, avatar_url, provider, kakao_id')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ 프로필 조회 실패:', error)
      return NextResponse.json(
        { success: false, error: '프로필 조회 실패' },
        { status: 500 }
      )
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: '프로필을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: profile
    })
  } catch (error) {
    console.error('❌ 프로필 체크 API 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
