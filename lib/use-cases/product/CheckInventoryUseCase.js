/**
 * CheckInventoryUseCase - Application Layer
 * @author Claude
 * @since 2025-10-23
 * @version 1.0
 */

import { BaseUseCase } from '../BaseUseCase'

/**
 * CheckInventoryUseCase - 재고 확인 Business Logic
 *
 * Responsibilities:
 * - productId 검증
 * - selectedOptions 검증
 * - ProductRepository.checkInventoryWithOptions() 호출
 * - 재고 정보 반환 { available, inventory, variantId? }
 *
 * Dependency Injection:
 * - ProductRepository: 상품 데이터 접근 레이어
 */
export class CheckInventoryUseCase extends BaseUseCase {
  /**
   * @param {ProductRepository} productRepository - Dependency Injection
   */
  constructor(productRepository) {
    super()
    this.productRepository = productRepository
  }

  /**
   * Execute 재고 확인
   *
   * @param {Object} params
   * @param {string} params.productId - 상품 ID
   * @param {Object} params.selectedOptions - 선택된 옵션 (예: { "색상": "빨강", "사이즈": "M" })
   * @returns {Promise<Object>} { available: boolean, inventory: number, variantId?: string }
   */
  async execute({ productId, selectedOptions }) {
    try {
      this.log('재고 확인 시작', { productId, selectedOptions })

      // 1. productId 검증
      if (!productId) {
        throw new Error('productId가 필요합니다')
      }

      // 2. selectedOptions 검증
      if (!selectedOptions || typeof selectedOptions !== 'object') {
        throw new Error('selectedOptions는 객체여야 합니다')
      }

      // 3. Repository를 통해 재고 확인
      const result = await this.productRepository.checkInventoryWithOptions(
        productId,
        selectedOptions
      )

      this.log('재고 확인 성공', {
        productId,
        available: result.available,
        inventory: result.inventory,
        variantId: result.variantId,
      })

      return {
        success: true,
        available: result.available,
        inventory: result.inventory,
        variantId: result.variantId,
      }
    } catch (error) {
      this.handleError(error, '재고 확인 실패')
    }
  }
}
