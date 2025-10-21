/**
 * POST /api/orders/create Integration 테스트
 *
 * 테스트 전략:
 * - API Route Layer 테스트 (Routing + Use Case 연동)
 * - Use Case는 Mock 사용
 * - 주문 생성 파라미터 검증 중심
 *
 * ✅ Rule #0 준수:
 * - Rule 1: 파일 크기 ≤150 lines
 * - Rule 7: 에러 처리 검증
 *
 * 기존 API (Phase 5.2.4)
 */

import { POST } from '@/app/api/orders/create/route'
import CreateOrderUseCase from '@/lib/use-cases/CreateOrderUseCase'

// Mock Use Case
jest.mock('@/lib/use-cases/CreateOrderUseCase')

describe('POST /api/orders/create - Integration 테스트', () => {
  let mockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      json: jest.fn()
    }
  })

  /**
   * 1. 정상 시나리오
   */
  describe('정상 시나리오', () => {
    test('주문 생성 성공 시 200 응답과 주문 정보를 반환한다', async () => {
      const mockResult = {
        success: true,
        order: {
          id: 'order-123',
          customer_order_number: 'S2025-001',
          status: 'pending',
          total_amount: 50000
        }
      }

      CreateOrderUseCase.execute = jest.fn().mockResolvedValue(mockResult)

      mockRequest.json.mockResolvedValue({
        orderData: {
          id: 'product-1',
          title: '테스트 상품',
          price: 50000,
          quantity: 1,
          totalPrice: 50000
        },
        userProfile: {
          name: '테스트 사용자',
          phone: '010-1234-5678',
          address: '서울시 강남구',
          postal_code: '06000'
        },
        user: {
          id: 'user-1'
        }
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.order).toBeDefined()
      expect(data.order.id).toBe('order-123')
      expect(data.order.status).toBe('pending')
    })

    test('Use Case에 올바른 파라미터가 전달된다', async () => {
      CreateOrderUseCase.execute = jest.fn().mockResolvedValue({ success: true })

      const requestData = {
        orderData: { id: 'product-1', title: '상품', price: 10000, quantity: 2 },
        userProfile: { name: '사용자', phone: '010-0000-0000' },
        depositName: '입금자명',
        user: { id: 'user-123' }
      }

      mockRequest.json.mockResolvedValue(requestData)

      await POST(mockRequest)

      expect(CreateOrderUseCase.execute).toHaveBeenCalledWith(requestData)
    })

    test('depositName이 포함된 주문을 처리할 수 있다', async () => {
      CreateOrderUseCase.execute = jest.fn().mockResolvedValue({ success: true })

      mockRequest.json.mockResolvedValue({
        orderData: { id: 'product-1', price: 20000 },
        userProfile: { name: '사용자' },
        depositName: '홍길동',
        user: { id: 'user-1' }
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(CreateOrderUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          depositName: '홍길동'
        })
      )
    })
  })

  /**
   * 2. 에러 시나리오
   */
  describe('에러 시나리오', () => {
    test('Use Case에서 에러 발생 시 500 응답을 반환한다', async () => {
      CreateOrderUseCase.execute = jest.fn().mockRejectedValue(
        new Error('필수 정보 누락')
      )

      mockRequest.json.mockResolvedValue({
        orderData: {},
        userProfile: {},
        user: {}
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('필수 정보 누락')
    })

    test('재고 부족 에러를 올바르게 반환한다', async () => {
      CreateOrderUseCase.execute = jest.fn().mockRejectedValue(
        new Error('재고가 부족합니다')
      )

      mockRequest.json.mockResolvedValue({
        orderData: { id: 'product-1', quantity: 999 },
        userProfile: { name: '사용자' },
        user: { id: 'user-1' }
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('재고가 부족')
    })

    test('유효하지 않은 쿠폰 에러를 올바르게 반환한다', async () => {
      CreateOrderUseCase.execute = jest.fn().mockRejectedValue(
        new Error('유효하지 않은 쿠폰입니다')
      )

      mockRequest.json.mockResolvedValue({
        orderData: { id: 'product-1', couponCode: 'INVALID' },
        userProfile: { name: '사용자' },
        user: { id: 'user-1' }
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('유효하지 않은 쿠폰')
    })

    test('에러 상세 정보(details)가 포함된다', async () => {
      const mockError = new Error('Test error')
      CreateOrderUseCase.execute = jest.fn().mockRejectedValue(mockError)

      mockRequest.json.mockResolvedValue({
        orderData: {},
        userProfile: {},
        user: {}
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(data.details).toBeDefined()
      expect(data.details).toContain('Error: Test error')
    })
  })
})
