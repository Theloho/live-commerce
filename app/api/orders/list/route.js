import { NextResponse } from 'next/server'
import { GetOrdersUseCase } from '@/lib/use-cases/order/GetOrdersUseCase'
import OrderRepository from '@/lib/repositories/OrderRepository'

/**
 * 주문 목록 조회 API (Clean Architecture Version)
 * - Dependency Injection: OrderRepository
 * - Clean Architecture: Presentation Layer (Routing Only)
 * - Business Logic: GetOrdersUseCase
 */
export async function POST(request) {
  try {
    const { user, orderId, page = 1, pageSize = 10, status = null } = await request.json()

    // Dependency Injection
    const getOrdersUseCase = new GetOrdersUseCase(OrderRepository)

    const result = await getOrdersUseCase.execute({
      user,
      orderId,
      page,
      pageSize,
      status,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error.message || '주문 조회에 실패했습니다', details: error.toString() },
      { status: 500 }
    )
  }
}
