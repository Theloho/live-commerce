import { NextResponse } from 'next/server'
import { getAdminByToken, getAdminPermissions } from '@/lib/adminAuthNew'

/**
 * 관리자 토큰 검증 및 정보 조회 API
 * POST /api/admin/verify
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

    // 토큰 검증
    const result = await getAdminByToken(token)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      )
    }

    // 권한 조회
    const permissions = await getAdminPermissions(result.admin.id)

    return NextResponse.json({
      success: true,
      admin: {
        ...result.admin,
        permissions: permissions
      }
    })

  } catch (error) {
    console.error('❌ 토큰 검증 API 에러:', error)
    return NextResponse.json(
      { success: false, error: '토큰 검증 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
