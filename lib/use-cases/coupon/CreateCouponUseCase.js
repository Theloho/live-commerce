/**
 * CreateCouponUseCase - Application Layer
 * @author Claude
 * @since 2025-10-23
 * @version 1.0
 */

import { BaseUseCase } from '../BaseUseCase'

/**
 * CreateCouponUseCase - Coupon Creation Business Logic
 *
 * Responsibilities:
 * - Coupon data validation
 * - Code uniqueness check
 * - Coupon creation via Repository
 *
 * Dependency Injection:
 * - CouponRepository: Coupon data access layer
 */
export class CreateCouponUseCase extends BaseUseCase {
  /**
   * @param {CouponRepository} couponRepository - Dependency Injection
   */
  constructor(couponRepository) {
    super()
    this.couponRepository = couponRepository
  }

  /**
   * Execute coupon creation
   *
   * @param {Object} couponData - Coupon creation data
   * @param {string} couponData.code - Coupon code
   * @param {string} couponData.name - Coupon name
   * @param {string} couponData.discount_type - 'percentage' or 'fixed'
   * @param {number} couponData.discount_value - Discount value
   * @param {string} couponData.valid_from - Valid from date (ISO)
   * @param {string} couponData.valid_until - Valid until date (ISO)
   * @returns {Promise<Object>} Created coupon
   */
  async execute(couponData) {
    try {
      this.log('Coupon creation started', { code: couponData.code })

      // 1. Code validation
      if (!couponData.code || couponData.code.length < 3) {
        throw new Error('Coupon code must be at least 3 characters')
      }

      // 2. Check code uniqueness
      const existingCoupon = await this.couponRepository.findByCode(couponData.code)
      if (existingCoupon) {
        throw new Error(`Coupon code '${couponData.code}' already exists`)
      }

      // 3. Validate dates
      const validFrom = new Date(couponData.valid_from)
      const validUntil = new Date(couponData.valid_until)

      if (validUntil <= validFrom) {
        throw new Error('Valid until date must be after valid from date')
      }

      // 4. Validate discount value
      if (couponData.discount_type === 'percentage') {
        if (couponData.discount_value <= 0 || couponData.discount_value > 100) {
          throw new Error('Percentage discount must be between 1 and 100')
        }
      } else if (couponData.discount_type === 'fixed') {
        if (couponData.discount_value <= 0) {
          throw new Error('Fixed discount must be greater than 0')
        }
      } else {
        throw new Error('Invalid discount type. Must be "percentage" or "fixed"')
      }

      // 5. Create coupon via Repository
      const createdCoupon = await this.couponRepository.create(couponData)

      this.log('Coupon created successfully', {
        id: createdCoupon.id,
        code: createdCoupon.code,
      })

      return {
        success: true,
        coupon: createdCoupon,
      }
    } catch (error) {
      this.handleError(error, 'Coupon creation failed')
    }
  }
}
