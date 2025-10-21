/**
 * POST /api/orders/cancel Integration 테스트
 *
 * 테스트 전략:
 * - API Route Layer 테스트 (Routing + Use Case 연동)
 * - Use Case/Repository는 Mock 사용
 * - 파라미터 검증 및 에러 처리 중심
 *
 * ✅ Rule #0 준수:
 * - Rule 1: 파일 크기 ≤150 lines
 * - Rule 7: 에러 처리 검증
 *
 * Phase 6 신규 API (2025-10-22)
 */

import { POST } from '@/app/api/orders/cancel/route'
import { CancelOrderUseCase } from '@/lib/use-cases/order/CancelOrderUseCase'

// Mock Use Case
jest.mock('@/lib/use-cases/order/CancelOrderUseCase')

describe('POST /api/orders/cancel - Integration 테스트', () => {
  let mockRequest

  beforeEach(() => {
    // Mock 초기화
    jest.clearAllMocks()

    // Request 모킹
    mockRequest = {
      json: jest.fn()
    }
  })

  /**
   * 1. 필수 파라미터 검증
   */
  describe('파라미터 검증', () => {
    test('orderId가 없으면 400 에러를 반환한다', async () => {
      mockRequest.json.mockResolvedValue({
        // orderId 누락
        user: { id: 'user-1' }
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('orderId와 user 정보가 필요합니다')
    })

    test('user가 없으면 400 에러를 반환한다', async () => {
      mockRequest.json.mockResolvedValue({
        orderId: 'order-1'
        // user 누락
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('orderId와 user 정보가 필요합니다')
    })

    test('orderId와 user 모두 없으면 400 에러를 반환한다', async () => {
      mockRequest.json.mockResolvedValue({})

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('orderId와 user 정보가 필요합니다')
    })
  })

  /**
   * 2. 정상 시나리오
   */
  describe('정상 시나리오', () => {
    test('주문 취소 성공 시 200 응답과 취소된 주문 정보를 반환한다', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'cancelled',
        customer_order_number: 'S123456',
        total_amount: 50000
      }

      // Use Case Mock 설정
      CancelOrderUseCase.mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue(mockOrder)
      }))

      mockRequest.json.mockResolvedValue({
        orderId: 'order-1',
        user: { id: 'user-1', kakaoId: 'kakao-123' }
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.order).toEqual(mockOrder)
      expect(data.order.status).toBe('cancelled')
    })

    test('Use Case에 올바른 파라미터가 전달된다', async () => {
      const mockExecute = jest.fn().mockResolvedValue({ id: 'order-1', status: 'cancelled' })

      CancelOrderUseCase.mockImplementation(() => ({
        execute: mockExecute
      }))

      mockRequest.json.mockResolvedValue({
        orderId: 'order-123',
        user: { id: 'user-456', kakaoId: 'kakao-789' }
      })

      await POST(mockRequest)

      expect(mockExecute).toHaveBeenCalledWith({
        orderId: 'order-123',
        user: { id: 'user-456', kakaoId: 'kakao-789' }
      })
    })
  })

  /**
   * 3. 에러 시나리오
   */
  describe('에러 시나리오', () => {
    test('Use Case에서 에러 발생 시 500 응답을 반환한다', async () => {
      CancelOrderUseCase.mockImplementation(() => ({
        execute: jest.fn().mockRejectedValue(new Error('주문을 찾을 수 없습니다'))
      }))

      mockRequest.json.mockResolvedValue({
        orderId: 'invalid-order',
        user: { id: 'user-1' }
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('주문을 찾을 수 없습니다')
    })

    test('권한 없는 사용자 에러를 올바르게 반환한다', async () => {
      CancelOrderUseCase.mockImplementation(() => ({
        execute: jest.fn().mockRejectedValue(new Error('이 주문에 대한 권한이 없습니다'))
      }))

      mockRequest.json.mockResolvedValue({
        orderId: 'order-1',
        user: { id: 'wrong-user' }
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('권한이 없습니다')
    })
  })
})
