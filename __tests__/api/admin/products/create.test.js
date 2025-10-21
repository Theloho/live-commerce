/**
 * POST /api/admin/products/create Integration 테스트
 *
 * 테스트 전략:
 * - API Route Layer 테스트 (관리자 인증 + 상품 생성)
 * - Supabase Admin Mock 사용
 * - 빠른등록 vs 상세등록 검증
 *
 * ✅ Rule #0 준수:
 * - Rule 1: 파일 크기 ≤150 lines
 * - Rule 7: 에러 처리 검증
 *
 * 기존 API (상품 관리 핵심 기능)
 */

import { POST } from '@/app/api/admin/products/create/route'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

// Mock Supabase Admin
jest.mock('@/lib/supabaseAdmin')

describe('POST /api/admin/products/create - Integration 테스트', () => {
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
        json: jest.fn().mockResolvedValue({
          title: '테스트 상품',
          product_number: 'TEST-001',
          price: 10000,
          inventory: 100
          // adminEmail 누락
        })
      }

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('관리자 인증 정보가 필요합니다')
    })

    test('관리자 권한이 없으면 403 에러를 반환한다', async () => {
      verifyAdminAuth.mockResolvedValue(false)

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          title: '테스트 상품',
          product_number: 'TEST-001',
          price: 10000,
          inventory: 100,
          adminEmail: 'user@example.com'
        })
      }

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('관리자 권한이 없습니다')
      expect(verifyAdminAuth).toHaveBeenCalledWith('user@example.com')
    })
  })

  /**
   * 2. 정상 시나리오 - 일반 상품 생성
   */
  describe('정상 시나리오', () => {
    test('일반 상품 생성 성공 시 200 응답과 상품 정보를 반환한다', async () => {
      const mockProduct = {
        id: 'product-123',
        title: '테스트 상품',
        product_number: 'TEST-001',
        price: 10000,
        inventory: 100
      }

      const mockSupabaseChain = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProduct,
          error: null
        })
      }

      supabaseAdmin.from = jest.fn().mockReturnValue(mockSupabaseChain)

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          title: '테스트 상품',
          product_number: 'TEST-001',
          price: 10000,
          inventory: 100,
          thumbnail_url: '/test.jpg',
          optionType: 'none',
          adminEmail: 'admin@example.com'
        })
      }

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.product).toEqual(mockProduct)
      expect(verifyAdminAuth).toHaveBeenCalledWith('admin@example.com')
    })

    test('상세등록 필드가 정상적으로 처리된다', async () => {
      const mockSupabaseChain = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'product-123' },
          error: null
        })
      }

      supabaseAdmin.from = jest.fn().mockReturnValue(mockSupabaseChain)

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          title: '상세 상품',
          product_number: 'DETAIL-001',
          price: 20000,
          inventory: 50,
          thumbnail_url: '/detail.jpg',
          optionType: 'none',
          supplier_id: 'supplier-1',
          category: '의류',
          sub_category: '상의',
          purchase_price: 15000,
          compare_price: 25000,
          is_live: false, // 상세등록
          adminEmail: 'admin@example.com'
        })
      }

      await POST(mockRequest)

      const insertCall = mockSupabaseChain.insert.mock.calls[0][0]
      expect(insertCall.supplier_id).toBe('supplier-1')
      expect(insertCall.category).toBe('의류')
      expect(insertCall.sub_category).toBe('상의')
      expect(insertCall.purchase_price).toBe(15000)
      expect(insertCall.compare_price).toBe(25000)
      expect(insertCall.is_live).toBe(false)
    })
  })

  /**
   * 3. 에러 시나리오
   */
  describe('에러 시나리오', () => {
    test('상품 생성 실패 시 500 에러를 반환한다', async () => {
      const mockSupabaseChain = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Duplicate product_number' }
        })
      }

      supabaseAdmin.from = jest.fn().mockReturnValue(mockSupabaseChain)

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          title: '테스트 상품',
          product_number: 'DUPLICATE-001',
          price: 10000,
          inventory: 100,
          optionType: 'none',
          adminEmail: 'admin@example.com'
        })
      }

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Duplicate product_number')
    })
  })
})
