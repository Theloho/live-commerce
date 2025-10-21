import { NextResponse } from 'next/server'
import GetOrdersUseCase from '@/lib/use-cases/GetOrdersUseCase'

/**
 * 주문 목록 조회 API (Phase 5.2.4 - Use Case Pattern)
 * - Clean Architecture: Presentation Layer (Routing Only)
 * - Business Logic: GetOrdersUseCase
 */
export async function POST(request) {
  try {
    const { user, orderId, page = 1, pageSize = 10, status = null } = await request.json()

    const result = await GetOrdersUseCase.execute({
      user,
      orderId,
      page,
      pageSize,
      status
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error.message || '주문 조회에 실패했습니다', details: error.toString() },
      { status: 500 }
    )
  }
}
