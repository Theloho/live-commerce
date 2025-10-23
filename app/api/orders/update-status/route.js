import { NextResponse } from 'next/server'
import { UpdateOrderStatusUseCase } from '@/lib/use-cases/order/UpdateOrderStatusUseCase'
import OrderRepository from '@/lib/repositories/OrderRepository'

/**
 * 주문 상태 업데이트 API (Clean Architecture Version)
 * - Dependency Injection: OrderRepository
 * - Clean Architecture: Presentation Layer (Routing Only)
 * - Business Logic: UpdateOrderStatusUseCase
 */
export async function POST(request) {
  try {
    const { orderIds, status, paymentData } = await request.json()

    // Dependency Injection
    const updateOrderStatusUseCase = new UpdateOrderStatusUseCase(OrderRepository)

    const result = await updateOrderStatusUseCase.execute({
      orderIds,
      status,
      paymentData,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error.message || '주문 상태 업데이트에 실패했습니다', details: error.toString() },
      { status: 500 }
    )
  }
}
