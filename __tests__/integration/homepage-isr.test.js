/**
 * 홈페이지 ISR (Incremental Static Regeneration) Integration 테스트
 *
 * Rule #0-A Stage 6.5: 테스트 작성 필수
 * - ISR 설정 확인 (revalidate = 300)
 * - GetProductsUseCase 통합 테스트
 * - 상품 데이터 형식 검증
 *
 * @author Claude (Rule #0-A 적용)
 * @date 2025-10-24
 */

import { GetProductsUseCase } from '@/lib/use-cases/product/GetProductsUseCase'
import ProductRepository from '@/lib/repositories/ProductRepository'

describe('홈페이지 ISR Integration 테스트', () => {
  let getProductsUseCase

  beforeAll(() => {
    getProductsUseCase = new GetProductsUseCase(ProductRepository)
  })

  describe('1. ISR 설정 확인', () => {
    it('app/page.js에 revalidate = 300 설정이 있어야 함', async () => {
      // app/page.js 파일 읽기
      const fs = require('fs')
      const path = require('path')
      const pageContent = fs.readFileSync(
        path.join(process.cwd(), 'app/page.js'),
        'utf-8'
      )

      // revalidate 설정 확인
      expect(pageContent).toContain('export const revalidate')
      expect(pageContent).toContain('300')
    })

    it('ISR 주석이 명확히 작성되어 있어야 함', async () => {
      const fs = require('fs')
      const path = require('path')
      const pageContent = fs.readFileSync(
        path.join(process.cwd(), 'app/page.js'),
        'utf-8'
      )

      // ISR 관련 주석 확인
      expect(pageContent).toContain('ISR')
      expect(pageContent.toLowerCase()).toMatch(/isr|incremental static regeneration/i)
    })
  })

  describe('2. GetProductsUseCase Integration 테스트', () => {
    it('활성 상품 조회가 성공해야 함', async () => {
      const result = await getProductsUseCase.execute({
        status: 'active',
        isLive: true,
        page: 1,
        pageSize: 50,
      })

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(Array.isArray(result.products)).toBe(true)
    }, 10000)

    it('상품 데이터가 올바른 형식이어야 함', async () => {
      const result = await getProductsUseCase.execute({
        status: 'active',
        isLive: true,
        page: 1,
        pageSize: 50,
      })

      expect(result.success).toBe(true)

      if (result.products.length > 0) {
        const product = result.products[0]

        // 필수 필드 확인
        expect(product).toHaveProperty('id')
        expect(product).toHaveProperty('title')
        expect(product).toHaveProperty('price')
        expect(product).toHaveProperty('inventory')
        expect(product).toHaveProperty('is_live')
        expect(product).toHaveProperty('status')

        // 데이터 타입 확인
        expect(typeof product.id).toBe('string')
        expect(typeof product.title).toBe('string')
        expect(typeof product.price).toBe('number')
        expect(typeof product.inventory).toBe('number')
        expect(typeof product.is_live).toBe('boolean')
        expect(typeof product.status).toBe('string')
      }
    }, 10000)

    it('상품 필터링이 정확해야 함 (status=active, isLive=true)', async () => {
      const result = await getProductsUseCase.execute({
        status: 'active',
        isLive: true,
        page: 1,
        pageSize: 50,
      })

      expect(result.success).toBe(true)

      // 모든 상품이 active 상태이고 live 활성화되어 있어야 함
      result.products.forEach(product => {
        expect(product.status).toBe('active')
        expect(product.is_live).toBe(true)
      })
    }, 10000)

    it('페이지네이션이 작동해야 함', async () => {
      const result = await getProductsUseCase.execute({
        status: 'active',
        isLive: true,
        page: 1,
        pageSize: 10, // 10개만 요청
      })

      expect(result.success).toBe(true)
      expect(result.products.length).toBeLessThanOrEqual(10)
      expect(result).toHaveProperty('totalCount')
      expect(typeof result.totalCount).toBe('number')
    }, 10000)
  })

  describe('3. 홈페이지 데이터 형식 검증', () => {
    it('ProductGrid에 필요한 형식으로 데이터가 반환되어야 함', async () => {
      const result = await getProductsUseCase.execute({
        status: 'active',
        isLive: true,
        page: 1,
        pageSize: 50,
      })

      expect(result.success).toBe(true)

      if (result.products.length > 0) {
        const product = result.products[0]

        // ProductGrid가 필요로 하는 필드
        expect(product).toHaveProperty('id')
        expect(product).toHaveProperty('title')
        expect(product).toHaveProperty('price')
        expect(product).toHaveProperty('thumbnail_url')
        expect(product).toHaveProperty('inventory')

        // thumbnail_url이 있거나 null이어야 함 (선택적)
        if (product.thumbnail_url !== null) {
          expect(typeof product.thumbnail_url).toBe('string')
        }
      }
    }, 10000)

    it('빈 결과도 정상 처리되어야 함', async () => {
      // 존재하지 않는 조건으로 조회
      const result = await getProductsUseCase.execute({
        status: 'inactive', // 비활성 상품
        isLive: false,
        page: 1,
        pageSize: 50,
      })

      // 성공하지만 결과가 비어있을 수 있음
      expect(result).toBeDefined()
      expect(Array.isArray(result.products)).toBe(true)
    }, 10000)
  })

  describe('4. 성능 테스트 (ISR 효과 확인)', () => {
    it('상품 조회가 2초 이내에 완료되어야 함', async () => {
      const startTime = Date.now()

      const result = await getProductsUseCase.execute({
        status: 'active',
        isLive: true,
        page: 1,
        pageSize: 50,
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(2000) // 2초 이내
    }, 10000)
  })

  describe('5. 에러 처리 테스트', () => {
    it('잘못된 파라미터로 조회해도 에러가 발생하지 않아야 함', async () => {
      const result = await getProductsUseCase.execute({
        status: 'invalid_status',
        isLive: true,
        page: 1,
        pageSize: 50,
      })

      // 결과가 비어있을 수 있지만 에러는 발생하지 않아야 함
      expect(result).toBeDefined()
      expect(Array.isArray(result.products)).toBe(true)
    }, 10000)

    it('페이지 번호가 범위를 벗어나도 에러가 발생하지 않아야 함', async () => {
      const result = await getProductsUseCase.execute({
        status: 'active',
        isLive: true,
        page: 9999, // 존재하지 않는 페이지
        pageSize: 50,
      })

      expect(result).toBeDefined()
      expect(Array.isArray(result.products)).toBe(true)
      expect(result.products.length).toBe(0) // 빈 배열
    }, 10000)
  })
})
