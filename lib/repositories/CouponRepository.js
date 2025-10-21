/**
 * CouponRepository - 쿠폰 데이터 접근 레이어
 * @author Claude
 * @since 2025-10-21
 */

import { BaseRepository } from './BaseRepository'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { DatabaseError } from '@/lib/errors'

export class CouponRepository extends BaseRepository {
  constructor() {
    super(supabaseAdmin, 'coupons')
  }

  /**
   * 쿠폰 상세 조회
   * @param {string} couponId
   * @returns {Promise<Object|null>}
   */
  async findById(couponId) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', couponId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new DatabaseError('쿠폰 조회 실패', { couponId, details: error })
      }

      return data
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('쿠폰 조회 중 오류', { couponId, details: error })
    }
  }

  /**
   * 사용자 보유 쿠폰 목록 조회
   * @param {string} userId
   * @param {Object} filters - { available_only: boolean }
   * @returns {Promise<Array>}
   */
  async findUserCoupons(userId, filters = {}) {
    try {
      let query = this.client
        .from('user_coupons')
        .select('*, coupon:coupons(*)')
        .eq('user_id', userId)
        .order('issued_at', { ascending: false })

      if (filters.available_only) {
        query = query
          .eq('is_used', false)
          .filter('coupon.is_active', 'eq', true)
          .filter('coupon.valid_until', 'gte', new Date().toISOString())
      }

      const { data, error } = await query

      if (error) {
        throw new DatabaseError('사용자 쿠폰 조회 실패', { userId, details: error })
      }

      console.log(`🎫 사용자 쿠폰 조회 완료: ${data?.length || 0}개`)
      return data || []
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('사용자 쿠폰 조회 중 오류', { userId, details: error })
    }
  }

  /**
   * 쿠폰 유효성 검증 (RPC: validate_coupon)
   * @param {string} couponCode
   * @param {string} userId
   * @param {number} orderAmount - 상품 금액 (배송비 제외)
   * @returns {Promise<Object>} { is_valid, error_message, discount_amount, coupon_id }
   */
  async validateCoupon(couponCode, userId, orderAmount) {
    try {
      const { data, error } = await this.client
        .rpc('validate_coupon', {
          p_coupon_code: couponCode.toUpperCase(),
          p_user_id: userId,
          p_product_amount: orderAmount
        })

      if (error) {
        throw new DatabaseError('쿠폰 검증 실패', { couponCode, userId, details: error })
      }

      const result = data[0]
      console.log(`🔍 쿠폰 검증: ${result.is_valid ? '사용 가능' : result.error_message}`)
      return result
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('쿠폰 검증 중 오류', { couponCode, details: error })
    }
  }

  /**
   * 쿠폰 사용 처리 (RPC: use_coupon)
   * @param {string} userId
   * @param {string} couponId
   * @param {string} orderId
   * @param {number} discountAmount
   * @returns {Promise<boolean>}
   */
  async useCoupon(userId, couponId, orderId, discountAmount) {
    try {
      const { data, error } = await this.client
        .rpc('use_coupon', {
          p_user_id: userId,
          p_coupon_id: couponId,
          p_order_id: orderId,
          p_discount_amount: discountAmount
        })

      if (error) {
        throw new DatabaseError('쿠폰 사용 실패', { couponId, orderId, details: error })
      }

      if (!data) {
        console.log('❌ 쿠폰 사용 불가: 이미 사용되었거나 보유하지 않은 쿠폰')
        return false
      }

      console.log(`💳 쿠폰 사용 완료: ${couponId}`)
      return true
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('쿠폰 사용 중 오류', { couponId, details: error })
    }
  }
}
