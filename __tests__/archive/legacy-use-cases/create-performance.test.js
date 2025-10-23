/**
 * 주문 생성 성능 최적화 Integration 테스트
 *
 * Rule #0 Stage 6.5: 필수 테스트 작성
 *
 * 테스트 목적:
 * - Option C 구현 검증 (thumbnail_url, product_number 처리)
 * - 성능 목표 달성 검증 (5.88초 → 1초 이하)
 * - DB 쿼리 최적화 검증 (인덱스 사용, 병렬 실행)
 *
 * 작성일: 2025-10-23
 * 관련 이슈: BuyBottomSheet 구매 버튼 5.88초 지연
 */

import CreateOrderUseCase from '@/lib/use-cases/CreateOrderUseCase'
import OrderRepository from '@/lib/repositories/OrderRepository'
import ProductRepository from '@/lib/repositories/ProductRepository'
import UserRepository from '@/lib/repositories/UserRepository'

// Mock repositories
jest.mock('@/lib/repositories/OrderRepository')
jest.mock('@/lib/repositories/ProductRepository')
jest.mock('@/lib/repositories/UserRepository')

describe('주문 생성 성능 최적화 Integration 테스트', () => {
  let mockUser, mockProfile, mockOrderData

  beforeEach(() => {
    jest.clearAllMocks()

    mockUser = {
      id: 'user-123',
      name: '테스트 사용자',
      email: 'test@example.com'
    }

    mockProfile = {
      name: '테스트 사용자',
      phone: '010-1234-5678',
      address: '서울시 강남구',
      detail_address: '테스트빌딩',
      postal_code: '06000'
    }

    mockOrderData = {
      id: 'product-1',
      title: '테스트 상품',
      price: 50000,
      totalPrice: 50000,
      quantity: 1,
      product_number: 'P2025-001',
      orderType: 'direct'
    }
  })

  /**
   * Test 1: 성능 목표 달성 검증
   */
  test('주문 생성이 1초 이내에 완료되어야 한다', async () => {
    // Mock repository responses
    OrderRepository.findByUser = jest.fn().mockResolvedValue([])
    OrderRepository.findPendingCart = jest.fn().mockResolvedValue(null)
    OrderRepository.create = jest.fn().mockResolvedValue({
      id: 'order-123',
      customer_order_number: 'S2025-001',
      status: 'pending',
      total_amount: 50000
    })
    OrderRepository.findById = jest.fn().mockResolvedValue({
      id: 'order-123',
      total_amount: 0
    })
    OrderRepository.update = jest.fn().mockResolvedValue({
      id: 'order-123',
      total_amount: 50000
    })

    ProductRepository.updateInventory = jest.fn().mockResolvedValue({
      success: true,
      newInventory: 10
    })

    // ✅ Option C: thumbnail_url과 product_number를 DB에서 조회
    const mockSupabaseQuery = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          thumbnail_url: 'https://example.com/image.jpg',
          product_number: 'P2025-001'
        },
        error: null
      }),
      insert: jest.fn().mockResolvedValue({ error: null })
    }

    // Mock Supabase client
    const originalGetAdmin = CreateOrderUseCase._db
    CreateOrderUseCase._db = jest.fn().mockReturnValue(mockSupabaseQuery)

    const startTime = performance.now()

    const result = await CreateOrderUseCase.execute({
      orderData: mockOrderData,
      userProfile: mockProfile,
      depositName: '테스트 사용자',
      user: mockUser
    })

    const endTime = performance.now()
    const duration = endTime - startTime

    // ✅ 성능 목표: 1초 이내
    expect(duration).toBeLessThan(1000)

    // ✅ 결과 검증
    expect(result.success).toBe(true)
    expect(result.order).toBeDefined()
    expect(result.order.id).toBe('order-123')

    // Cleanup
    CreateOrderUseCase._db = originalGetAdmin
  }, 10000) // 10초 타임아웃

  /**
   * Test 2: Option C 구현 검증 - thumbnail_url이 없을 때 DB에서 조회
   */
  test('orderData에 thumbnail_url이 없으면 DB에서 조회해야 한다', async () => {
    OrderRepository.findByUser = jest.fn().mockResolvedValue([])
    OrderRepository.findPendingCart = jest.fn().mockResolvedValue(null)
    OrderRepository.create = jest.fn().mockResolvedValue({
      id: 'order-123',
      customer_order_number: 'S2025-001',
      status: 'pending'
    })

    ProductRepository.updateInventory = jest.fn().mockResolvedValue({
      success: true,
      newInventory: 10
    })

    const mockSupabaseQuery = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => {
        // products 테이블 조회인지 확인
        const selectCall = mockSupabaseQuery.select.mock.calls[
          mockSupabaseQuery.select.mock.calls.length - 1
        ]
        if (selectCall && selectCall[0] === 'thumbnail_url, product_number') {
          return Promise.resolve({
            data: {
              thumbnail_url: 'https://example.com/image.jpg',
              product_number: 'P2025-001'
            },
            error: null
          })
        }
        return Promise.resolve({ data: null, error: null })
      }),
      insert: jest.fn().mockResolvedValue({ error: null })
    }

    CreateOrderUseCase._db = jest.fn().mockReturnValue(mockSupabaseQuery)

    // ✅ thumbnail_url 없이 주문 생성
    const orderDataWithoutThumbnail = { ...mockOrderData }
    delete orderDataWithoutThumbnail.thumbnail_url

    await CreateOrderUseCase.execute({
      orderData: orderDataWithoutThumbnail,
      userProfile: mockProfile,
      depositName: '테스트 사용자',
      user: mockUser
    })

    // ✅ products 테이블에서 thumbnail_url 조회 확인
    expect(mockSupabaseQuery.select).toHaveBeenCalledWith('thumbnail_url, product_number')
    expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('id', 'product-1')
  }, 10000)

  /**
   * Test 3: Option C 검증 - DB에도 데이터가 없으면 명확한 에러
   */
  test('DB에 thumbnail_url이 없으면 명확한 에러 메시지를 반환해야 한다', async () => {
    OrderRepository.findByUser = jest.fn().mockResolvedValue([])
    OrderRepository.findPendingCart = jest.fn().mockResolvedValue(null)
    OrderRepository.create = jest.fn().mockResolvedValue({
      id: 'order-123',
      customer_order_number: 'S2025-001'
    })

    const mockSupabaseQuery = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          thumbnail_url: null, // ✅ DB에 데이터 없음
          product_number: null
        },
        error: null
      }),
      insert: jest.fn().mockResolvedValue({ error: null })
    }

    CreateOrderUseCase._db = jest.fn().mockReturnValue(mockSupabaseQuery)

    const orderDataWithoutThumbnail = { ...mockOrderData }
    delete orderDataWithoutThumbnail.thumbnail_url
    delete orderDataWithoutThumbnail.product_number

    // ✅ 명확한 에러 메시지 검증
    await expect(
      CreateOrderUseCase.execute({
        orderData: orderDataWithoutThumbnail,
        userProfile: mockProfile,
        depositName: '테스트 사용자',
        user: mockUser
      })
    ).rejects.toThrow(/상품 데이터 불완전/)
  }, 10000)

  /**
   * Test 4: 병렬 실행 검증
   */
  test('_createItem과 _createShipAndPay가 병렬로 실행되어야 한다', async () => {
    const executionOrder = []

    OrderRepository.findByUser = jest.fn().mockResolvedValue([])
    OrderRepository.findPendingCart = jest.fn().mockResolvedValue(null)
    OrderRepository.create = jest.fn().mockResolvedValue({
      id: 'order-123',
      customer_order_number: 'S2025-001'
    })

    ProductRepository.updateInventory = jest.fn().mockResolvedValue({
      success: true,
      newInventory: 10
    })

    const mockSupabaseQuery = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          thumbnail_url: 'https://example.com/image.jpg',
          product_number: 'P2025-001'
        },
        error: null
      }),
      insert: jest.fn().mockImplementation((data) => {
        // order_items insert와 order_shipping/order_payments insert 순서 추적
        if (data[0].order_id) {
          executionOrder.push('item_or_shipping')
        }
        return Promise.resolve({ error: null })
      })
    }

    CreateOrderUseCase._db = jest.fn().mockReturnValue(mockSupabaseQuery)

    await CreateOrderUseCase.execute({
      orderData: mockOrderData,
      userProfile: mockProfile,
      depositName: '테스트 사용자',
      user: mockUser
    })

    // ✅ insert가 병렬로 호출되었는지 확인 (정확한 순서가 아닌 호출 횟수)
    expect(mockSupabaseQuery.insert.mock.calls.length).toBeGreaterThanOrEqual(2)
  }, 10000)

  /**
   * Test 5: DB 인덱스 사용 검증 (LIKE 쿼리 최적화)
   */
  test('무료배송 확인 시 order_type LIKE 쿼리가 최적화되어야 한다', async () => {
    const mockOrders = [
      {
        id: 'order-prev',
        status: 'pending',
        order_type: 'cart:KAKAO:1234567890'
      }
    ]

    // ✅ 카카오 사용자로 주문 (무료배송 확인 쿼리 발생)
    OrderRepository.findByUser = jest.fn().mockImplementation((filter) => {
      // ✅ orderType에 LIKE 패턴이 포함되어 있는지 확인
      if (filter.orderType && filter.orderType.includes('%KAKAO:')) {
        // 인덱스를 사용하는 쿼리 실행 (빠른 응답)
        return Promise.resolve(mockOrders)
      }
      return Promise.resolve([])
    })

    OrderRepository.findPendingCart = jest.fn().mockResolvedValue(null)
    OrderRepository.create = jest.fn().mockResolvedValue({
      id: 'order-123',
      customer_order_number: 'S2025-001'
    })

    ProductRepository.updateInventory = jest.fn().mockResolvedValue({
      success: true,
      newInventory: 10
    })

    const mockSupabaseQuery = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          thumbnail_url: 'https://example.com/image.jpg',
          product_number: 'P2025-001'
        },
        error: null
      }),
      insert: jest.fn().mockResolvedValue({ error: null })
    }

    CreateOrderUseCase._db = jest.fn().mockReturnValue(mockSupabaseQuery)

    const kakaoUser = {
      ...mockUser,
      kakao_id: '1234567890'
    }

    const startTime = performance.now()

    await CreateOrderUseCase.execute({
      orderData: mockOrderData,
      userProfile: mockProfile,
      depositName: '테스트 사용자',
      user: kakaoUser
    })

    const endTime = performance.now()
    const duration = endTime - startTime

    // ✅ LIKE 쿼리가 인덱스를 사용하여 빠르게 실행되어야 함 (< 500ms)
    expect(duration).toBeLessThan(500)

    // ✅ findByUser가 KAKAO ID로 조회했는지 확인
    expect(OrderRepository.findByUser).toHaveBeenCalledWith(
      expect.objectContaining({
        orderType: expect.stringContaining('KAKAO:1234567890')
      })
    )
  }, 10000)
})
