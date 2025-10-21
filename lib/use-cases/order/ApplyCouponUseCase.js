/**
 * ApplyCouponUseCase - 쿠폰 적용 Use Case
 * @author Claude
 * @since 2025-10-21
 */

import { BaseUseCase } from '../BaseUseCase'

/**
 * ApplyCouponUseCase - 쿠폰 검증 및 할인 계산 비즈니스 로직
 * - CouponRepository.validateCoupon() 호출 (RPC)
 * - 검증 성공 시 couponId + discount_amount 반환
 * - 검증 실패 시 error 반환
 */
export class ApplyCouponUseCase extends BaseUseCase {
  /**
   * @param {CouponRepository} couponRepository
   */
  constructor(couponRepository) {
    super()
    this.couponRepository = couponRepository
  }

  /**
   * 쿠폰 적용 실행
   * @param {Object} params - { couponCode, userId, orderData }
   * @param {string} params.couponCode - 쿠폰 코드 (대소문자 무관)
   * @param {string} params.userId - 사용자 ID
   * @param {Object} params.orderData - 주문 데이터 { items: Array }
   * @returns {Promise<Object>} { success, couponId?, discountAmount?, error? }
   */
  async execute({ couponCode, userId, orderData }) {
    try {
      // 1. 상품 금액 계산 (배송비 제외)
      const itemsTotal = this._calculateItemsTotal(orderData.items)

      this.log('쿠폰 적용 요청', { code: couponCode, amount: itemsTotal })

      // 2. 쿠폰 검증 (RPC: validate_coupon)
      const validation = await this.couponRepository.validateCoupon(
        couponCode,
        userId,
        itemsTotal
      )

      // 3. 검증 결과 반환
      if (!validation.is_valid) {
        this.log('쿠폰 검증 실패', { error: validation.error_message })
        return {
          success: false,
          error: validation.error_message,
        }
      }

      this.log('쿠폰 검증 성공', {
        couponId: validation.coupon_id,
        discount: validation.discount_amount,
      })

      return {
        success: true,
        couponId: validation.coupon_id,
        discountAmount: validation.discount_amount,
      }
    } catch (error) {
      this.handleError(error, '쿠폰 적용 실패')
    }
  }

  /**
   * 상품 금액 합계 계산 @private
   * @param {Array} items - 주문 아이템 배열
   * @returns {number} 상품 금액 합계 (배송비 제외)
   */
  _calculateItemsTotal(items) {
    return items.reduce((sum, item) => {
      const price = item.price || item.unit_price || 0
      const quantity = item.quantity || 1
      return sum + price * quantity
    }, 0)
  }
}
