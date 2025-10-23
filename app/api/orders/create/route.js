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
  const startTime = Date.now()
  console.log('🔵 [API /orders/create] 시작:', new Date().toISOString())

  try {
    const { orderData, userProfile, depositName, user } = await request.json()

    console.log('🔵 [API /orders/create] 파라미터 수신:', {
      orderId: orderData?.id,
      userId: user?.id,
      hasUserProfile: !!userProfile
    })

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

    console.log('🔵 [API /orders/create] Use Case 실행 시작')

    // 3. Clean CreateOrderUseCase 실행
    const result = await createOrderUseCase.execute(cleanParams)

    const elapsed = Date.now() - startTime
    console.log('✅ [API /orders/create] 완료:', { elapsed: `${elapsed}ms` })

    // 🔵 디버깅: timings를 응답에 포함
    return NextResponse.json({
      ...result,
      _debug: {
        elapsed: `${elapsed}ms`,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error('❌ [API /orders/create] 실패:', {
      elapsed: `${elapsed}ms`,
      message: error.message,
      stack: error.stack
    })

    return NextResponse.json(
      {
        error: error.message || '주문 생성에 실패했습니다',
        details: error.toString(),
        elapsed: `${elapsed}ms`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
