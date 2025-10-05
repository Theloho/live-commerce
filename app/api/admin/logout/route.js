import { NextResponse } from 'next/server'
import { adminLogout } from '@/lib/adminAuthNew'

/**
 * 관리자 로그아웃 API
 * POST /api/admin/logout
 */
export async function POST(request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, error: '토큰이 없습니다' },
        { status: 400 }
      )
    }

    // 로그아웃 처리
    const result = await adminLogout(token)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ 로그아웃 API 에러:', error)
    return NextResponse.json(
      { success: false, error: '로그아웃 처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
