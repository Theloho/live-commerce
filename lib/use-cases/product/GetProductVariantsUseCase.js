/**
 * GetProductVariantsUseCase - Application Layer
 * @author Claude
 * @since 2025-10-23
 * @version 1.0
 */

import { BaseUseCase } from '../BaseUseCase'

/**
 * GetProductVariantsUseCase - 상품 Variant 조회 Business Logic
 *
 * Responsibilities:
 * - productId 검증
 * - ProductRepository.findVariantsByProduct() 호출
 * - Variant 데이터 반환 (옵션 정보 포함)
 *
 * Dependency Injection:
 * - ProductRepository: 상품 데이터 접근 레이어
 */
export class GetProductVariantsUseCase extends BaseUseCase {
  /**
   * @param {ProductRepository} productRepository - Dependency Injection
   */
  constructor(productRepository) {
    super()
    this.productRepository = productRepository
  }

  /**
   * Execute variant 조회
   *
   * @param {Object} params
   * @param {string} params.productId - 상품 ID
   * @returns {Promise<Array>} Variant 목록 (옵션 정보 포함)
   */
  async execute({ productId }) {
    try {
      this.log('Variant 조회 시작', { productId })

      // 1. productId 검증
      if (!productId) {
        throw new Error('productId가 필요합니다')
      }

      // 2. Repository를 통해 Variant 조회
      const variants = await this.productRepository.findVariantsByProduct(productId)

      this.log('Variant 조회 성공', {
        productId,
        count: variants.length,
      })

      return {
        success: true,
        variants,
      }
    } catch (error) {
      this.handleError(error, 'Variant 조회 실패')
    }
  }
}
