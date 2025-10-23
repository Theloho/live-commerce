/**
 * 단일 주문 조회 API (Clean Architecture Version)
 * @author Claude
 * @since 2025-10-23
 * @version 1.0
 */
import { NextResponse } from 'next/server'
import { GetOrdersUseCase } from '@/lib/use-cases/order/GetOrdersUseCase'
import OrderRepository from '@/lib/repositories/OrderRepository'

export async function GET(request, { params }) {
  try {
    const { id: orderId } = params

    console.log('🔍 [Order Detail API] Request received:', { orderId })

    if (!orderId) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // Dependency Injection
    const getOrdersUseCase = new GetOrdersUseCase(OrderRepository)

    // Execute Use Case
    const result = await getOrdersUseCase.getById({ orderId })

    console.log('✅ [Order Detail API] Success:', {
      orderId,
      itemCount: result.order?.items?.length,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [Order Detail API] Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
