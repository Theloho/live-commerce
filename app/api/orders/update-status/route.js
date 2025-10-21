import { NextResponse } from 'next/server'
import UpdateOrderStatusUseCase from '@/lib/use-cases/UpdateOrderStatusUseCase'

/**
 * 주문 상태 업데이트 API (Phase 5.2.4 - Use Case Pattern)
 * - Clean Architecture: Presentation Layer (Routing Only)
 * - Business Logic: UpdateOrderStatusUseCase
 */
export async function POST(request) {
  try {
    const { orderIds, status, paymentData } = await request.json()

    const result = await UpdateOrderStatusUseCase.execute({
      orderIds,
      status,
      paymentData
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error.message || '주문 상태 업데이트에 실패했습니다', details: error.toString() },
      { status: 500 }
    )
  }
}
