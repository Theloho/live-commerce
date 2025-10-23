/**
 * GetProductsUseCase - Application Layer
 * @author Claude
 * @since 2025-10-23
 * @version 1.0
 */

import { BaseUseCase } from '../BaseUseCase'

/**
 * GetProductsUseCase - 상품 목록 조회 Business Logic
 *
 * Responsibilities:
 * - 필터 검증 (status, isLive, page, pageSize)
 * - ProductRepository.findAll() 호출
 * - 상품 목록 반환 (페이지네이션 포함)
 *
 * Dependency Injection:
 * - ProductRepository: 상품 데이터 접근 레이어
 */
export class GetProductsUseCase extends BaseUseCase {
  /**
   * @param {ProductRepository} productRepository - Dependency Injection
   */
  constructor(productRepository) {
    super()
    this.productRepository = productRepository
  }

  /**
   * Execute 상품 목록 조회
   *
   * @param {Object} filters - 필터 조건
   * @param {string} filters.status - 상품 상태 (active, inactive)
   * @param {boolean} filters.isLive - 라이브 활성 여부
   * @param {number} filters.page - 페이지 번호 (기본값: 1)
   * @param {number} filters.pageSize - 페이지 크기 (기본값: 50)
   * @returns {Promise<Object>} { success: true, products: [], totalCount, currentPage, totalPages }
   */
  async execute(filters = {}) {
    try {
      this.log('상품 목록 조회 시작', filters)

      // 기본값 설정
      const {
        status = 'active',
        isLive = true,
        page = 1,
        pageSize = 50,
      } = filters

      // 파라미터 검증
      if (page < 1) {
        throw new Error('페이지 번호는 1 이상이어야 합니다')
      }

      if (pageSize < 1 || pageSize > 100) {
        throw new Error('페이지 크기는 1~100 사이여야 합니다')
      }

      // Repository를 통해 상품 목록 조회
      const result = await this.productRepository.findAll({
        status,
        isLive,
        page,
        pageSize,
      })

      this.log('상품 목록 조회 성공', {
        count: result.products.length,
        totalCount: result.totalCount,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
      })

      return {
        success: true,
        products: result.products,
        totalCount: result.totalCount,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
      }
    } catch (error) {
      this.handleError(error, '상품 목록 조회 실패')
    }
  }
}
