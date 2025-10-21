import { NextResponse } from 'next/server'
import OrderRepository from '@/lib/repositories/OrderRepository'

/**
 * pending/verifying 주문 확인 API (Phase 6 - Layer Boundary Fix)
 * - Clean Architecture: Presentation Layer (Routing Only)
 * - Repository: OrderRepository.hasPendingOrders()
 * - ✅ Rule #2 준수: 클라이언트 → API Route → Repository
 *
 * 용도: 무료배송 조건 확인 (체크아웃 페이지)
 */
export async function POST(request) {
  try {
    const { userId, kakaoId, excludeIds = [] } = await request.json()

    if (!userId && !kakaoId) {
      return NextResponse.json(
        { error: 'userId 또는 kakaoId가 필요합니다' },
        { status: 400 }
      )
    }

    // Repository를 통한 DB 접근
    const hasPending = await OrderRepository.hasPendingOrders({
      userId,
      kakaoId,
      excludeIds
    })

    return NextResponse.json({
      success: true,
      hasPendingOrders: hasPending
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || 'pending 주문 확인에 실패했습니다',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
