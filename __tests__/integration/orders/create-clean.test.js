/**
 * Clean CreateOrderUseCase Integration 테스트
 *
 * 테스트 목적:
 * - 무료배송 확인 로직 검증
 * - 장바구니 병합 로직 검증
 * - 카카오 사용자 패턴 검증
 * - API Route 파라미터 변환 검증
 *
 * 작성일: 2025-10-23
 * 관련 이슈: Clean Architecture 마이그레이션
 */

import { CreateOrderUseCase } from '@/lib/use-cases/order/CreateOrderUseCase'

// Mock repositories
const mockOrderRepository = {
  findByUser: jest.fn(),
  findPendingCart: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockProductRepository = {
  findByIds: jest.fn(),
}

const mockQueueService = {
  addJob: jest.fn(),
}

describe('Clean CreateOrderUseCase Integration 테스트', () => {
  let createOrderUseCase

  beforeEach(() => {
    jest.clearAllMocks()

    // Dependency Injection
    createOrderUseCase = new CreateOrderUseCase(
      mockOrderRepository,
      mockProductRepository,
      mockQueueService
    )

    // Default mock responses
    mockProductRepository.findByIds.mockResolvedValue([
      { id: 'product-1', title: '테스트 상품', inventory: 100 },
    ])

    mockQueueService.addJob.mockResolvedValue({ jobId: 'job-123', position: 1 })
  })

  /**
   * Test 1: 무료배송 확인 로직 (다른 주문 있으면 무료배송)
   */
  test('다른 pending/verifying 주문이 있으면 무료배송 적용', async () => {
    // Mock: 다른 주문이 1개 있음
    mockOrderRepository.findByUser.mockResolvedValue([
      { id: 'order-prev', status: 'pending' },
    ])
    mockOrderRepository.findPendingCart.mockResolvedValue(null)
    mockOrderRepository.create.mockResolvedValue({
      id: 'order-123',
      customer_order_number: 'S251023-1234',
      status: 'pending',
      total_amount: 50000,
      is_free_shipping: true, // ✅ 무료배송 플래그
    })

    const result = await createOrderUseCase.execute({
      orderData: {
        items: [
          {
            product_id: 'product-1',
            title: '테스트 상품',
            price: 50000,
            quantity: 1,
          },
        ],
        orderType: 'direct',
      },
      shipping: {
        name: '홍길동',
        phone: '010-1234-5678',
        address: '서울시 강남구',
        postalCode: '06000',
      },
      payment: {
        paymentMethod: 'bank_transfer',
        depositorName: '홍길동',
      },
      user: { id: 'user-123', name: '홍길동' },
    })

    // ✅ 무료배송 확인 쿼리 호출 확인
    expect(mockOrderRepository.findByUser).toHaveBeenCalledWith({
      userId: 'user-123',
      status: ['pending', 'verifying'],
    })

    // ✅ 주문 생성 시 is_free_shipping: true
    expect(mockOrderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderData: expect.objectContaining({
          is_free_shipping: true,
        }),
      })
    )
  })

  /**
   * Test 2: 카카오 사용자 패턴 (order_type: "direct:KAKAO:123456")
   */
  test('카카오 사용자는 order_type에 KAKAO ID 포함', async () => {
    mockOrderRepository.findByUser.mockResolvedValue([])
    mockOrderRepository.findPendingCart.mockResolvedValue(null)
    mockOrderRepository.create.mockResolvedValue({
      id: 'order-123',
      customer_order_number: 'S251023-1234',
      order_type: 'direct:KAKAO:1234567890',
    })

    await createOrderUseCase.execute({
      orderData: {
        items: [
          {
            product_id: 'product-1',
            title: '테스트 상품',
            price: 50000,
            quantity: 1,
          },
        ],
        orderType: 'direct',
      },
      shipping: {
        name: '홍길동',
        phone: '010-1234-5678',
        address: '서울시 강남구',
        postalCode: '06000',
      },
      payment: {
        paymentMethod: 'bank_transfer',
        depositorName: '홍길동',
      },
      user: { id: 'user-123', name: '홍길동', kakao_id: '1234567890' },
    })

    // ✅ order_type에 KAKAO 패턴 포함
    expect(mockOrderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderData: expect.objectContaining({
          order_type: 'direct:KAKAO:1234567890',
        }),
      })
    )

    // ✅ 무료배송 확인 시 kakao_id 사용
    expect(mockOrderRepository.findByUser).toHaveBeenCalledWith({
      orderType: '%KAKAO:1234567890%',
      status: ['pending', 'verifying'],
    })
  })

  /**
   * Test 3: 장바구니 병합 (cart 타입일 때 기존 주문에 추가)
   */
  test('cart 타입 주문은 기존 pending cart에 병합', async () => {
    // Mock: 기존 pending cart 있음
    mockOrderRepository.findByUser.mockResolvedValue([])
    mockOrderRepository.findPendingCart.mockResolvedValue({
      id: 'cart-123',
      customer_order_number: 'S251023-CART',
      total_amount: 30000,
      status: 'pending',
    })
    mockOrderRepository.update.mockResolvedValue({
      id: 'cart-123',
      total_amount: 80000, // 30000 + 50000
    })

    await createOrderUseCase.execute({
      orderData: {
        items: [
          {
            product_id: 'product-1',
            title: '테스트 상품',
            price: 50000,
            quantity: 1,
          },
        ],
        orderType: 'cart', // ✅ cart 타입
      },
      shipping: {
        name: '홍길동',
        phone: '010-1234-5678',
        address: '서울시 강남구',
        postalCode: '06000',
      },
      payment: {
        paymentMethod: 'bank_transfer',
        depositorName: '홍길동',
      },
      user: { id: 'user-123', name: '홍길동' },
    })

    // ✅ pending cart 조회 확인
    expect(mockOrderRepository.findPendingCart).toHaveBeenCalledWith({
      status: 'pending',
      orderType: 'cart',
    })

    // ✅ 기존 주문 업데이트 (total_amount 누적)
    expect(mockOrderRepository.update).toHaveBeenCalledWith(
      'cart-123',
      expect.objectContaining({
        total_amount: expect.any(Number),
      })
    )

    // ✅ 새 주문 생성하지 않음
    expect(mockOrderRepository.create).not.toHaveBeenCalled()
  })

  /**
   * Test 4: 신규 주문 시 Queue 추가
   */
  test('신규 주문 시 Queue에 재고 차감 작업 추가', async () => {
    mockOrderRepository.findByUser.mockResolvedValue([])
    mockOrderRepository.findPendingCart.mockResolvedValue(null)
    mockOrderRepository.create.mockResolvedValue({
      id: 'order-123',
      customer_order_number: 'S251023-1234',
    })

    await createOrderUseCase.execute({
      orderData: {
        items: [
          {
            product_id: 'product-1',
            title: '테스트 상품',
            price: 50000,
            quantity: 2,
          },
        ],
        orderType: 'direct',
      },
      shipping: {
        name: '홍길동',
        phone: '010-1234-5678',
        address: '서울시 강남구',
        postalCode: '06000',
      },
      payment: {
        paymentMethod: 'bank_transfer',
        depositorName: '홍길동',
      },
      user: { id: 'user-123', name: '홍길동' },
    })

    // ✅ Queue 작업 추가
    expect(mockQueueService.addJob).toHaveBeenCalledWith(
      'order-processing',
      expect.objectContaining({
        orderId: 'order-123',
        items: expect.arrayContaining([
          expect.objectContaining({
            product_id: 'product-1',
            quantity: 2,
          }),
        ]),
        action: 'deduct_inventory',
      })
    )
  })

  /**
   * Test 5: 장바구니 병합 시 Queue 추가 안 함
   */
  test('장바구니 병합 시 Queue에 작업 추가하지 않음', async () => {
    mockOrderRepository.findByUser.mockResolvedValue([])
    mockOrderRepository.findPendingCart.mockResolvedValue({
      id: 'cart-123',
      customer_order_number: 'S251023-CART',
      total_amount: 30000,
    })
    mockOrderRepository.update.mockResolvedValue({
      id: 'cart-123',
      total_amount: 80000,
    })

    await createOrderUseCase.execute({
      orderData: {
        items: [
          {
            product_id: 'product-1',
            title: '테스트 상품',
            price: 50000,
            quantity: 1,
          },
        ],
        orderType: 'cart',
      },
      shipping: {
        name: '홍길동',
        phone: '010-1234-5678',
        address: '서울시 강남구',
        postalCode: '06000',
      },
      payment: {
        paymentMethod: 'bank_transfer',
        depositorName: '홍길동',
      },
      user: { id: 'user-123', name: '홍길동' },
    })

    // ✅ Queue 작업 추가 안 함
    expect(mockQueueService.addJob).not.toHaveBeenCalled()
  })
})
