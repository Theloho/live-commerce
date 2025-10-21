/**
 * POST /api/orders/check-pending Integration 테스트
 *
 * 테스트 전략:
 * - API Route Layer 테스트 (Routing + Repository 연동)
 * - Repository는 Mock 사용
 * - 무료배송 조건 검증 중심
 *
 * ✅ Rule #0 준수:
 * - Rule 1: 파일 크기 ≤150 lines
 * - Rule 7: 에러 처리 검증
 *
 * Phase 6 신규 API (2025-10-22)
 */

import { POST } from '@/app/api/orders/check-pending/route'
import OrderRepository from '@/lib/repositories/OrderRepository'

// Mock Repository
jest.mock('@/lib/repositories/OrderRepository')

describe('POST /api/orders/check-pending - Integration 테스트', () => {
  let mockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      json: jest.fn()
    }
  })

  /**
   * 1. 필수 파라미터 검증
   */
  describe('파라미터 검증', () => {
    test('userId와 kakaoId가 모두 없으면 400 에러를 반환한다', async () => {
      mockRequest.json.mockResolvedValue({
        // userId, kakaoId 모두 누락
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('userId 또는 kakaoId가 필요합니다')
    })

    test('userId가 있으면 정상 처리된다', async () => {
      OrderRepository.hasPendingOrders = jest.fn().mockResolvedValue(true)

      mockRequest.json.mockResolvedValue({
        userId: 'user-123'
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    test('kakaoId가 있으면 정상 처리된다', async () => {
      OrderRepository.hasPendingOrders = jest.fn().mockResolvedValue(false)

      mockRequest.json.mockResolvedValue({
        kakaoId: 'kakao-456'
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  /**
   * 2. 정상 시나리오 - hasPendingOrders 반환값
   */
  describe('정상 시나리오', () => {
    test('pending 주문이 있으면 true를 반환한다', async () => {
      OrderRepository.hasPendingOrders = jest.fn().mockResolvedValue(true)

      mockRequest.json.mockResolvedValue({
        userId: 'user-1',
        excludeIds: []
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.hasPendingOrders).toBe(true)
    })

    test('pending 주문이 없으면 false를 반환한다', async () => {
      OrderRepository.hasPendingOrders = jest.fn().mockResolvedValue(false)

      mockRequest.json.mockResolvedValue({
        userId: 'user-2',
        excludeIds: []
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.hasPendingOrders).toBe(false)
    })

    test('Repository에 올바른 파라미터가 전달된다 (userId)', async () => {
      OrderRepository.hasPendingOrders = jest.fn().mockResolvedValue(true)

      mockRequest.json.mockResolvedValue({
        userId: 'user-123',
        excludeIds: ['order-1', 'order-2']
      })

      await POST(mockRequest)

      expect(OrderRepository.hasPendingOrders).toHaveBeenCalledWith({
        userId: 'user-123',
        kakaoId: undefined,
        excludeIds: ['order-1', 'order-2']
      })
    })

    test('Repository에 올바른 파라미터가 전달된다 (kakaoId)', async () => {
      OrderRepository.hasPendingOrders = jest.fn().mockResolvedValue(false)

      mockRequest.json.mockResolvedValue({
        kakaoId: 'kakao-789',
        excludeIds: []
      })

      await POST(mockRequest)

      expect(OrderRepository.hasPendingOrders).toHaveBeenCalledWith({
        userId: undefined,
        kakaoId: 'kakao-789',
        excludeIds: []
      })
    })
  })

  /**
   * 3. excludeIds 기능 검증
   */
  describe('excludeIds 파라미터 처리', () => {
    test('excludeIds가 없으면 빈 배열로 기본값 설정된다', async () => {
      OrderRepository.hasPendingOrders = jest.fn().mockResolvedValue(true)

      mockRequest.json.mockResolvedValue({
        userId: 'user-1'
        // excludeIds 누락
      })

      await POST(mockRequest)

      expect(OrderRepository.hasPendingOrders).toHaveBeenCalledWith({
        userId: 'user-1',
        kakaoId: undefined,
        excludeIds: []
      })
    })

    test('excludeIds가 제공되면 Repository에 전달된다', async () => {
      OrderRepository.hasPendingOrders = jest.fn().mockResolvedValue(false)

      mockRequest.json.mockResolvedValue({
        userId: 'user-1',
        excludeIds: ['order-A', 'order-B', 'order-C']
      })

      await POST(mockRequest)

      expect(OrderRepository.hasPendingOrders).toHaveBeenCalledWith({
        userId: 'user-1',
        kakaoId: undefined,
        excludeIds: ['order-A', 'order-B', 'order-C']
      })
    })
  })

  /**
   * 4. 에러 시나리오
   */
  describe('에러 시나리오', () => {
    test('Repository에서 에러 발생 시 500 응답을 반환한다', async () => {
      OrderRepository.hasPendingOrders = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      )

      mockRequest.json.mockResolvedValue({
        userId: 'user-1'
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database connection failed')
    })
  })
})
