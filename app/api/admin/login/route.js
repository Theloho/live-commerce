import { NextResponse } from 'next/server'
import { adminLogin } from '@/lib/adminAuthNew'

/**
 * 관리자 로그인 API
 * POST /api/admin/login
 */
export async function POST(request) {
  try {
    const { email, password } = await request.json()

    // 입력 검증
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '이메일과 비밀번호를 입력하세요' },
        { status: 400 }
      )
    }

    // 로그인 처리
    const result = await adminLogin(email, password)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      )
    }

    // 성공 응답
    return NextResponse.json({
      success: true,
      token: result.token,
      admin: result.admin
    })

  } catch (error) {
    console.error('❌ 로그인 API 에러:', error)
    return NextResponse.json(
      { success: false, error: '로그인 처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
