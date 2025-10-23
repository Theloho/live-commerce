import { NextResponse } from 'next/server'
import { CreateOrderUseCase } from '@/lib/use-cases/order/CreateOrderUseCase'
import OrderRepository from '@/lib/repositories/OrderRepository'
import ProductRepository from '@/lib/repositories/ProductRepository'
import { QueueService } from '@/lib/services/QueueService'

/**
 * 주문 생성 API (Clean Architecture Version)
 * - Dependency Injection: OrderRepository, ProductRepository, QueueService
 * - Legacy 파라미터 → Clean 파라미터 변환
 * - Clean Architecture: Presentation Layer (Routing Only)
 * - Business Logic: CreateOrderUseCase (Clean Version)
 */
export async function POST(request) {
  try {
    const { orderData, userProfile, depositName, user } = await request.json()

    // 1. Dependency Injection (Clean Architecture)
    const createOrderUseCase = new CreateOrderUseCase(
      OrderRepository,
      ProductRepository,
      QueueService
    )

    // 2. Legacy 파라미터 → Clean 파라미터 변환
    const cleanParams = {
      orderData: {
        items: [orderData], // 단일 상품을 배열로 변환
        orderType: orderData.orderType || 'direct',
      },
      shipping: {
        name: userProfile.name,
        phone: userProfile.phone,
        address: userProfile.address,
        postalCode: userProfile.postal_code,
      },
      payment: {
        paymentMethod: 'bank_transfer', // 현재는 무통장입금만
        depositorName: depositName,
      },
      coupon: null, // 추후 쿠폰 시스템 통합 시 추가
      user,
    }

    // 3. Clean CreateOrderUseCase 실행
    const result = await createOrderUseCase.execute(cleanParams)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error.message || '주문 생성에 실패했습니다', details: error.toString() },
      { status: 500 }
    )
  }
}
