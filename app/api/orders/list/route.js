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

    // 🔍 디버깅 로그 (2025-10-24)
    console.log('🔍 [/api/orders/list] 요청 파라미터:', {
      userId: user?.id?.substring(0, 8),
      kakaoId: user?.kakao_id,
      page,
      status,
      hasUser: !!user
    })

    // Dependency Injection
    const getOrdersUseCase = new GetOrdersUseCase(OrderRepository)

    const result = await getOrdersUseCase.execute({
      user,
      orderId,
      page,
      pageSize,
      status,
    })

    // 🔍 디버깅 로그 (2025-10-24)
    console.log('✅ [/api/orders/list] 응답:', {
      count: result.orders?.length,
      total: result.pagination?.totalCount,
      statusCounts: result.statusCounts
    })

    return NextResponse.json(result)
  } catch (error) {
    // 🔍 디버깅 로그 (2025-10-24)
    console.error('❌ [/api/orders/list] 에러:', {
      message: error.message,
      stack: error.stack?.substring(0, 200)
    })

    return NextResponse.json(
      { error: error.message || '주문 조회에 실패했습니다', details: error.toString() },
      { status: 500 }
    )
  }
}
