/**
 * GET /api/admin/orders Integration 테스트
 *
 * 테스트 전략:
 * - API Route Layer 테스트 (관리자 인증 + 쿼리 필터)
 * - Supabase Admin Mock 사용
 * - INNER JOIN 조건부 적용 검증 (과거 버그 재발 방지)
 *
 * ✅ Rule #0 준수:
 * - Rule 1: 파일 크기 ≤150 lines
 * - Rule 7: 에러 처리 검증
 *
 * 기존 API (관리자 주문 관리 핵심 기능)
 */

import { GET } from '@/app/api/admin/orders/route'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

// Mock Supabase Admin
jest.mock('@/lib/supabaseAdmin')

describe('GET /api/admin/orders - Integration 테스트', () => {
  let mockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock setup
    verifyAdminAuth.mockResolvedValue(true)
  })

  /**
   * 1. 관리자 인증 검증
   */
  describe('관리자 인증', () => {
    test('adminEmail이 없으면 401 에러를 반환한다', async () => {
      mockRequest = {
        url: 'http://localhost:3000/api/admin/orders'
      }

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('관리자 인증 정보가 필요합니다')
    })

    test('관리자 권한이 없으면 403 에러를 반환한다', async () => {
      verifyAdminAuth.mockResolvedValue(false)

      mockRequest = {
        url: 'http://localhost:3000/api/admin/orders?adminEmail=user@example.com'
      }

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('관리자 권한이 없습니다')
      expect(verifyAdminAuth).toHaveBeenCalledWith('user@example.com')
    })

    test('관리자 권한이 있으면 정상 처리된다', async () => {
      verifyAdminAuth.mockResolvedValue(true)

      const mockSupabaseChain = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      }

      supabaseAdmin.from = jest.fn().mockReturnValue(mockSupabaseChain)

      mockRequest = {
        url: 'http://localhost:3000/api/admin/orders?adminEmail=admin@example.com'
      }

      const response = await GET(mockRequest)

      expect(response.status).toBe(200)
      expect(verifyAdminAuth).toHaveBeenCalledWith('admin@example.com')
    })
  })

  /**
   * 2. 필터링 기능
   */
  describe('필터링', () => {
    beforeEach(() => {
      const mockSupabaseChain = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      }

      supabaseAdmin.from = jest.fn().mockReturnValue(mockSupabaseChain)
    })

    test('status 필터가 적용된다', async () => {
      mockRequest = {
        url: 'http://localhost:3000/api/admin/orders?adminEmail=admin@example.com&status=verifying,deposited'
      }

      await GET(mockRequest)

      const supabaseChain = supabaseAdmin.from()
      expect(supabaseChain.in).toHaveBeenCalledWith('status', ['verifying', 'deposited'])
    })

    test('paymentMethod 필터가 적용된다', async () => {
      mockRequest = {
        url: 'http://localhost:3000/api/admin/orders?adminEmail=admin@example.com&paymentMethod=bank_transfer'
      }

      await GET(mockRequest)

      const supabaseChain = supabaseAdmin.from()
      expect(supabaseChain.eq).toHaveBeenCalledWith('order_payments.method', 'bank_transfer')
    })
  })

  /**
   * 3. INNER JOIN 조건부 적용 (과거 버그 재발 방지) ⭐
   */
  describe('INNER JOIN 조건부 적용', () => {
    test('paymentMethod 필터 없으면 LEFT JOIN 사용 (order_payments!inner 미포함)', async () => {
      const mockSupabaseChain = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      }

      supabaseAdmin.from = jest.fn().mockReturnValue(mockSupabaseChain)

      mockRequest = {
        url: 'http://localhost:3000/api/admin/orders?adminEmail=admin@example.com'
      }

      await GET(mockRequest)

      // select() 호출 시 !inner 없이 호출되는지 확인
      expect(mockSupabaseChain.select).toHaveBeenCalled()
      const selectArg = mockSupabaseChain.select.mock.calls[0][0]
      expect(selectArg).not.toContain('order_payments!inner')
      expect(selectArg).toContain('order_payments (*)') // LEFT JOIN
    })

    test('paymentMethod 필터 있으면 INNER JOIN 사용 (order_payments!inner 포함)', async () => {
      const mockSupabaseChain = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      }

      supabaseAdmin.from = jest.fn().mockReturnValue(mockSupabaseChain)

      mockRequest = {
        url: 'http://localhost:3000/api/admin/orders?adminEmail=admin@example.com&paymentMethod=card'
      }

      await GET(mockRequest)

      // select() 호출 시 !inner가 포함되는지 확인
      expect(mockSupabaseChain.select).toHaveBeenCalled()
      const selectArg = mockSupabaseChain.select.mock.calls[0][0]
      expect(selectArg).toContain('order_payments!inner') // INNER JOIN
    })
  })
})
