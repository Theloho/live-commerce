/**
 * 동시성 테스트 API
 *
 * 사용법:
 * 1. 재고 1개 상품 ID 준비
 * 2. 브라우저에서 접속:
 *    /api/test-concurrency?productId=상품ID&count=10
 *
 * 결과:
 * - 성공: 1명
 * - 실패: 9명 (concurrent_update 또는 재고 부족)
 */

import { NextResponse } from 'next/server'
import { CreateOrderUseCase } from '@/lib/use-cases/order/CreateOrderUseCase'
import OrderRepository from '@/lib/repositories/OrderRepository'
import ProductRepository from '@/lib/repositories/ProductRepository'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const count = parseInt(searchParams.get('count') || '10')

    if (!productId) {
      return NextResponse.json(
        { error: 'productId 파라미터가 필요합니다' },
        { status: 400 }
      )
    }

    console.log(`🧪 동시성 테스트 시작: ${count}명이 동시에 구매 시도`)

    // CreateOrderUseCase 준비
    const createOrderUseCase = new CreateOrderUseCase(
      OrderRepository,
      ProductRepository
    )

    // 테스트용 주문 데이터
    const createTestOrder = (index) => ({
      items: [
        {
          product_id: productId,
          quantity: 1,
          title: `Test Product ${index}`,
          price: 10000,
          thumbnail_url: 'https://via.placeholder.com/400'
        }
      ]
    })

    const testProfile = {
      id: 'test-user-id',
      name: 'Test User',
      phone: '01012345678',
      address: 'Test Address',
      detail_address: 'Detail',
      postal_code: '12345'
    }

    // 🔥 동시 요청 (Promise.all)
    const promises = []
    for (let i = 0; i < count; i++) {
      promises.push(
        createOrderUseCase
          .execute({
            orderData: createTestOrder(i),
            userProfile: testProfile
          })
          .then(result => ({
            index: i,
            success: true,
            orderId: result.id
          }))
          .catch(error => ({
            index: i,
            success: false,
            error: error.message
          }))
      )
    }

    const results = await Promise.all(promises)

    // 📊 결과 분석
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    const lockErrors = results.filter(r =>
      r.error?.includes('동시 구매 중') ||
      r.error?.includes('concurrent_update')
    ).length
    const inventoryErrors = results.filter(r =>
      r.error?.includes('재고 부족') ||
      r.error?.includes('Insufficient inventory')
    ).length

    return NextResponse.json({
      success: true,
      test: {
        productId,
        attemptCount: count,
        successCount,
        failCount,
        lockErrors,
        inventoryErrors
      },
      results,
      verdict: successCount === 1 && failCount === count - 1
        ? '✅ Lock이 정상 작동합니다!'
        : '⚠️ 예상과 다른 결과입니다'
    })

  } catch (error) {
    console.error('테스트 오류:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
