/**
 * 단일 주문 조회 API (Clean Architecture Version)
 * @author Claude
 * @since 2025-10-23
 * @version 1.0
 */
import { NextResponse } from 'next/server'
import { GetOrdersUseCase } from '@/lib/use-cases/order/GetOrdersUseCase'
import OrderRepository from '@/lib/repositories/OrderRepository'

// ⭐ GET 유지 (쿼리스트링으로 user 정보는 선택적)
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

    // Execute Use Case (user 없이 호출, bulkPaymentInfo는 계산 안 됨)
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

// ⭐ POST 추가 (user 정보 포함, bulkPaymentInfo 계산)
export async function POST(request, { params }) {
  try {
    const { id: orderId } = params
    const { user } = await request.json()

    console.log('🔍 [Order Detail API POST] Request received:', { orderId, userId: user?.id?.substring(0, 8) })

    if (!orderId) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // Dependency Injection
    const getOrdersUseCase = new GetOrdersUseCase(OrderRepository)

    // Execute Use Case (user 포함, bulkPaymentInfo 계산됨)
    const result = await getOrdersUseCase.getById({ orderId, user })

    console.log('✅ [Order Detail API POST] Success:', {
      orderId,
      itemCount: result.order?.items?.length,
      hasBulkPaymentInfo: !!result.order?.bulkPaymentInfo
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [Order Detail API POST] Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
