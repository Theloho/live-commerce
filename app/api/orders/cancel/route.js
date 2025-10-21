import { NextResponse } from 'next/server'
import { CancelOrderUseCase } from '@/lib/use-cases/order/CancelOrderUseCase'
import OrderRepository from '@/lib/repositories/OrderRepository'
import ProductRepository from '@/lib/repositories/ProductRepository'

/**
 * 주문 취소 API (Phase 6 - Layer Boundary Fix)
 * - Clean Architecture: Presentation Layer (Routing Only)
 * - Business Logic: CancelOrderUseCase
 * - ✅ Rule #2 준수: 클라이언트 → API Route → Use Case → Repository
 */
export async function POST(request) {
  try {
    const { orderId, user } = await request.json()

    if (!orderId || !user) {
      return NextResponse.json(
        { error: 'orderId와 user 정보가 필요합니다' },
        { status: 400 }
      )
    }

    // Use Case 인스턴스 생성 (서버 사이드에서만)
    const cancelOrderUseCase = new CancelOrderUseCase(
      OrderRepository,
      ProductRepository
    )

    // 주문 취소 실행
    const result = await cancelOrderUseCase.execute({
      orderId,
      user
    })

    return NextResponse.json({
      success: true,
      order: result
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || '주문 취소에 실패했습니다',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
