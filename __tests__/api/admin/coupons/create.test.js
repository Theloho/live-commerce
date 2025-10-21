/**
 * POST /api/admin/coupons/create Integration 테스트
 *
 * 테스트 전략:
 * - API Route Layer 테스트 (Service Role 직접 사용)
 * - Supabase Admin Mock 사용
 * - 쿠폰 생성 필드 검증 중심
 *
 * ✅ Rule #0 준수:
 * - Rule 1: 파일 크기 ≤150 lines
 * - Rule 7: 에러 처리 검증
 *
 * Phase 6 신규 API (2025-10-22)
 */

import { POST } from '@/app/api/admin/coupons/create/route'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Mock Supabase Admin
jest.mock('@/lib/supabaseAdmin')

describe('POST /api/admin/coupons/create - Integration 테스트', () => {
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
    test('정액 할인 쿠폰 생성 성공 시 200 응답과 쿠폰 정보를 반환한다', async () => {
      const mockCoupon = {
        id: 'coupon-1',
        code: 'WELCOME2025',
        name: '신규가입 웰컴 쿠폰',
        discount_type: 'amount',
        discount_value: 5000,
        min_purchase_amount: 10000
      }

      const mockSupabaseChain = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockCoupon,
          error: null
        })
      }

      supabaseAdmin.from = jest.fn().mockReturnValue(mockSupabaseChain)

      mockRequest.json.mockResolvedValue({
        code: 'WELCOME2025',
        name: '신규가입 웰컴 쿠폰',
        discount_type: 'amount',
        discount_value: 5000,
        min_purchase_amount: 10000,
        valid_from: '2025-01-01',
        valid_until: '2025-12-31'
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.coupon).toEqual(mockCoupon)
      expect(data.coupon.discount_type).toBe('amount')
    })

    test('정률 할인 쿠폰 생성 성공 시 200 응답을 반환한다', async () => {
      const mockSupabaseChain = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'coupon-2',
            code: 'SALE10',
            discount_type: 'percentage',
            discount_value: 10
          },
          error: null
        })
      }

      supabaseAdmin.from = jest.fn().mockReturnValue(mockSupabaseChain)

      mockRequest.json.mockResolvedValue({
        code: 'SALE10',
        name: '10% 할인 쿠폰',
        discount_type: 'percentage',
        discount_value: 10,
        valid_from: '2025-01-01',
        valid_until: '2025-12-31'
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
    })

    test('웰컴 쿠폰 플래그가 정상적으로 처리된다', async () => {
      const mockSupabaseChain = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'coupon-3' },
          error: null
        })
      }

      supabaseAdmin.from = jest.fn().mockReturnValue(mockSupabaseChain)

      mockRequest.json.mockResolvedValue({
        code: 'WELCOME',
        name: '웰컴 쿠폰',
        discount_type: 'amount',
        discount_value: 3000,
        valid_from: '2025-01-01',
        valid_until: '2025-12-31',
        is_welcome_coupon: true
      })

      await POST(mockRequest)

      const insertCall = mockSupabaseChain.insert.mock.calls[0][0]
      expect(insertCall.is_welcome_coupon).toBe(true)
    })
  })

  /**
   * 2. 파라미터 검증
   */
  describe('파라미터 검증', () => {
    test('쿠폰 코드가 대문자로 변환된다', async () => {
      const mockSupabaseChain = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'coupon-4' },
          error: null
        })
      }

      supabaseAdmin.from = jest.fn().mockReturnValue(mockSupabaseChain)

      mockRequest.json.mockResolvedValue({
        code: 'lowercase',
        name: '소문자 코드',
        discount_type: 'amount',
        discount_value: 1000,
        valid_from: '2025-01-01',
        valid_until: '2025-12-31'
      })

      await POST(mockRequest)

      const insertCall = mockSupabaseChain.insert.mock.calls[0][0]
      expect(insertCall.code).toBe('LOWERCASE')
    })

    test('min_purchase_amount 기본값이 0으로 설정된다', async () => {
      const mockSupabaseChain = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'coupon-5' },
          error: null
        })
      }

      supabaseAdmin.from = jest.fn().mockReturnValue(mockSupabaseChain)

      mockRequest.json.mockResolvedValue({
        code: 'NOMIN',
        name: '최소금액 없음',
        discount_type: 'amount',
        discount_value: 1000,
        valid_from: '2025-01-01',
        valid_until: '2025-12-31'
        // min_purchase_amount 누락
      })

      await POST(mockRequest)

      const insertCall = mockSupabaseChain.insert.mock.calls[0][0]
      expect(insertCall.min_purchase_amount).toBe(0)
    })
  })

  /**
   * 3. 에러 시나리오
   */
  describe('에러 시나리오', () => {
    test('쿠폰 생성 실패 시 500 에러를 반환한다', async () => {
      const mockSupabaseChain = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      }

      supabaseAdmin.from = jest.fn().mockReturnValue(mockSupabaseChain)

      mockRequest.json.mockResolvedValue({
        code: 'ERROR',
        name: '에러 쿠폰',
        discount_type: 'amount',
        discount_value: 1000,
        valid_from: '2025-01-01',
        valid_until: '2025-12-31'
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Database error')
    })

    test('중복 쿠폰 코드 에러를 올바르게 반환한다', async () => {
      const mockSupabaseChain = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'duplicate key value violates unique constraint' }
        })
      }

      supabaseAdmin.from = jest.fn().mockReturnValue(mockSupabaseChain)

      mockRequest.json.mockResolvedValue({
        code: 'DUPLICATE',
        name: '중복 쿠폰',
        discount_type: 'amount',
        discount_value: 1000,
        valid_from: '2025-01-01',
        valid_until: '2025-12-31'
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('duplicate key')
    })
  })
})
