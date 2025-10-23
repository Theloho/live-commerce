/**
 * DistributeCouponUseCase - Application Layer
 * @author Claude
 * @since 2025-10-23
 * @version 1.0
 */

import { BaseUseCase } from '../BaseUseCase'

/**
 * DistributeCouponUseCase - Coupon Distribution Business Logic
 *
 * Responsibilities:
 * - Individual Distribution: Distribute coupons to specific users
 * - Bulk Distribution: Distribute coupons to all customers
 * - Pre-distribution Validation: coupon validity, limits, duplicates
 * - Batch Processing: performance optimization for bulk distribution
 *
 * Dependency Injection:
 * - CouponRepository: Coupon data access layer
 * - UserRepository: User data access layer
 */
export class DistributeCouponUseCase extends BaseUseCase {
  /**
   * @param {CouponRepository} couponRepository - Dependency Injection
   * @param {UserRepository} userRepository - Dependency Injection
   */
  constructor(couponRepository, userRepository) {
    super()
    this.couponRepository = couponRepository
    this.userRepository = userRepository
  }

  /**
   * Distribute coupons to specific users
   *
   * @param {string} couponId - Coupon ID
   * @param {Array<string>} userIds - User ID array
   * @param {string} adminId - Issuer ID (admin)
   * @returns {Promise<Object>} Distribution result
   */
  async distributeToUsers(couponId, userIds, adminId) {
    try {
      this.log('Coupon distribution started (individual)', { couponId, userCount: userIds.length })

      const coupon = await this._validateCoupon(couponId)
      const remainingSlots = this._getRemainingSlots(coupon, userIds.length)

      if (remainingSlots === 0) {
        throw new Error(`Coupon issuance limit exceeded (max ${coupon.total_usage_limit})`)
      }

      if (remainingSlots < userIds.length) {
        this.log(`Insufficient quota: ${userIds.length} requested, ${remainingSlots} available`)
        userIds = userIds.slice(0, remainingSlots)
      }

      const { newUsers, alreadyHasUsers } = await this._filterDuplicates(couponId, userIds)

      this.log(`Target filtering: ${userIds.length} -> ${newUsers.length} (${alreadyHasUsers.length} duplicates excluded)`)

      const results = await this._batchDistribute(couponId, newUsers, adminId)

      const summary = {
        success: true,
        totalRequested: userIds.length,
        totalIssued: results.success,
        totalFailed: results.failed,
        totalSkipped: alreadyHasUsers.length,
        results: {
          issued: results.successDetails,
          failed: results.failureDetails,
          skipped: alreadyHasUsers,
        },
      }

      this.log('Coupon distribution completed', summary)
      return summary
    } catch (error) {
      this.handleError(error, 'Coupon distribution failed (individual)')
    }
  }

  /**
   * Distribute coupons to all customers
   *
   * @param {string} couponId - Coupon ID
   * @param {string} adminId - Issuer ID (admin)
   * @returns {Promise<Object>} Distribution result
   */
  async distributeToAll(couponId, adminId) {
    try {
      this.log('Coupon distribution started (all customers)', { couponId })

      const coupon = await this._validateCoupon(couponId)

      const result = await this.userRepository.findAll({
        role: 'customer',
      })

      const allCustomers = result.users || []

      if (!allCustomers || allCustomers.length === 0) {
        throw new Error('No target customers found')
      }

      const userIds = allCustomers.map((user) => user.id)
      this.log(`All customers retrieved: ${userIds.length} users`)

      const remainingSlots = this._getRemainingSlots(coupon, userIds.length)

      if (remainingSlots === 0) {
        throw new Error(`Coupon issuance limit exceeded (max ${coupon.total_usage_limit})`)
      }

      if (remainingSlots < userIds.length) {
        this.log(`Insufficient quota: ${userIds.length} requested, ${remainingSlots} available`)
        userIds = userIds.slice(0, remainingSlots)
      }

      const { newUsers, alreadyHasUsers } = await this._filterDuplicates(couponId, userIds)

      this.log(`Target filtering: ${allCustomers.length} -> ${newUsers.length} (${alreadyHasUsers.length} duplicates excluded)`)

      const results = await this._batchDistribute(couponId, newUsers, adminId)

      const summary = {
        success: true,
        totalCustomers: allCustomers.length,
        totalIssued: results.success,
        totalFailed: results.failed,
        totalSkipped: alreadyHasUsers.length,
        results: {
          issued: results.successDetails,
          failed: results.failureDetails,
          skipped: alreadyHasUsers,
        },
      }

      this.log('Coupon distribution completed (all customers)', summary)
      return summary
    } catch (error) {
      this.handleError(error, 'Coupon distribution failed (all customers)')
    }
  }

  async _validateCoupon(couponId) {
    const coupon = await this.couponRepository.findById(couponId)

    if (!coupon) {
      throw new Error(`Coupon not found: ${couponId}`)
    }

    if (!coupon.is_active) {
      throw new Error('Inactive coupons cannot be distributed')
    }

    const now = new Date()
    const validFrom = new Date(coupon.valid_from)
    const validUntil = new Date(coupon.valid_until)

    if (now < validFrom) {
      throw new Error('Coupon usage period has not started yet')
    }

    if (now > validUntil) {
      throw new Error('Expired coupons cannot be distributed')
    }

    return coupon
  }

  _getRemainingSlots(coupon, requestedCount) {
    if (!coupon.total_usage_limit) {
      return requestedCount
    }

    const alreadyIssued = coupon.total_issued_count || 0
    const remaining = coupon.total_usage_limit - alreadyIssued

    return Math.max(0, remaining)
  }

  async _filterDuplicates(couponId, userIds) {
    try {
      const holders = await this.couponRepository.getCouponHolders(couponId, {})
      const holderIds = new Set(holders.map((h) => h.user_id))

      const newUsers = userIds.filter((userId) => !holderIds.has(userId))
      const alreadyHasUsers = userIds.filter((userId) => holderIds.has(userId))

      return {
        newUsers,
        alreadyHasUsers,
      }
    } catch (error) {
      this.log('Duplicate check failed, attempting distribution to all users', { error: error.message })
      return {
        newUsers: userIds,
        alreadyHasUsers: [],
      }
    }
  }

  async _batchDistribute(couponId, userIds, adminId) {
    const promises = userIds.map((userId) =>
      this.couponRepository
        .distributeTo(couponId, userId, adminId)
        .then((result) => ({
          status: 'fulfilled',
          userId,
          result,
        }))
        .catch((error) => ({
          status: 'rejected',
          userId,
          error: error.message,
        }))
    )

    const results = await Promise.allSettled(promises)

    const successDetails = []
    const failureDetails = []

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const data = result.value
        if (data.status === 'fulfilled') {
          successDetails.push({
            userId: data.userId,
            userCouponId: data.result.id,
          })
        } else {
          failureDetails.push({
            userId: data.userId,
            error: data.error,
          })
        }
      } else {
        failureDetails.push({
          userId: 'unknown',
          error: result.reason?.message || 'Unknown error',
        })
      }
    })

    return {
      success: successDetails.length,
      failed: failureDetails.length,
      successDetails,
      failureDetails,
    }
  }
}
