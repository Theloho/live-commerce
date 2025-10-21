import { NextResponse } from 'next/server'
import CreateOrderUseCase from '@/lib/use-cases/CreateOrderUseCase'

/**
 * 주문 생성 API (Phase 5.2.4 - Use Case Pattern)
 * - Clean Architecture: Presentation Layer (Routing Only)
 * - Business Logic: CreateOrderUseCase
 */
export async function POST(request) {
  try {
    const { orderData, userProfile, depositName, user } = await request.json()

    const result = await CreateOrderUseCase.execute({
      orderData,
      userProfile,
      depositName,
      user
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error.message || '주문 생성에 실패했습니다', details: error.toString() },
      { status: 500 }
    )
  }
}
