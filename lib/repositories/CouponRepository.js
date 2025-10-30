/**
 * CouponRepository - Infrastructure Layer
 * @author Claude
 * @since 2025-10-23
 * @version 2.0
 */

import { BaseRepository } from './BaseRepository'
import logger from '../logger'

/**
 * CouponRepository - 쿠폰 데이터 저장소 (Infrastructure Layer)
 *
 * 책임:
 * - coupons 테이블 CRUD
 * - user_coupons 테이블 CRUD
 * - 쿠폰 검증 쿼리
 * - 쿠폰 통계 조회
 */
export class CouponRepository extends BaseRepository {
  /**
   * @param {SupabaseClient} client - Supabase 클라이언트
   */
  constructor(client) {
    super(client, 'coupons')
  }

  /**
   * 코드로 쿠폰 조회
   *
   * @param {string} code - 쿠폰 코드
   * @returns {Promise<Object|null>} 쿠폰 정보 또는 null
   */
  async findByCode(code) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('code', code)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      this.handleError(error, `쿠폰 코드 조회 실패: ${code}`)
    }
  }

  /**
   * 쿠폰 생성
   *
   * @param {Object} couponData - 쿠폰 데이터
   * @returns {Promise<Object>} 생성된 쿠폰
   */
  async create(couponData) {
    try {
      const { data, error} = await this.client
        .from(this.tableName)
        .insert({
          code: couponData.code.toUpperCase(),
          name: couponData.name,
          description: couponData.description || null,
          discount_type: couponData.discount_type,
          discount_value: couponData.discount_value,
          min_purchase_amount: couponData.min_purchase_amount || 0,
          max_discount_amount: couponData.max_discount_amount || null,
          valid_from: couponData.valid_from,
          valid_until: couponData.valid_until,
          usage_limit_per_user: couponData.usage_limit_per_user || 1,
          total_usage_limit: couponData.total_usage_limit || null,
          is_active: couponData.is_active !== false,
          is_welcome_coupon: couponData.is_welcome_coupon || false,
          created_by: couponData.created_by || null,
        })
        .select()
        .single()

      if (error) throw error

      logger.info(`[${this.tableName}] Coupon created:`, data.code)
      return data
    } catch (error) {
      this.handleError(error, '쿠폰 생성 실패')
    }
  }

  /**
   * 활성 쿠폰 목록 조회
   *
   * @param {Object} filters - 필터 조건
   * @param {boolean} filters.isActive - 활성 여부
   * @param {boolean} filters.isWelcome - 웰컴 쿠폰 여부
   * @param {string} filters.sortBy - 정렬 기준 (created_at, valid_until, etc.)
   * @param {string} filters.sortOrder - 정렬 순서 (asc, desc)
   * @returns {Promise<Array>} 쿠폰 목록
   */
  async findActive(filters = {}) {
    try {
      let query = this.client.from(this.tableName).select('*')

      // 필터 적용
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }

      if (filters.isWelcome !== undefined) {
        query = query.eq('is_welcome_coupon', filters.isWelcome)
      }

      // 현재 유효한 쿠폰만 (valid_from <= now <= valid_until)
      if (filters.validOnly) {
        const now = new Date().toISOString()
        query = query.lte('valid_from', now).gte('valid_until', now)
      }

      // 정렬
      const sortBy = filters.sortBy || 'created_at'
      const sortOrder = filters.sortOrder || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      this.handleError(error, '활성 쿠폰 조회 실패')
    }
  }

  /**
   * 사용자에게 쿠폰 배포
   *
   * @param {string} couponId - 쿠폰 ID
   * @param {string} userId - 사용자 ID
   * @param {string} issuedBy - 발급자 ID (관리자)
   * @returns {Promise<Object>} 생성된 user_coupon 레코드
   */
  async distributeTo(couponId, userId, issuedBy) {
    try {
      const userCouponData = {
        coupon_id: couponId,
        user_id: userId,
        issued_by: issuedBy,
        issued_at: new Date().toISOString(),
        is_used: false,
      }

      const { data, error } = await this.client
        .from('user_coupons')
        .insert(userCouponData)
        .select()
        .single()

      if (error) throw error

      // total_issued_count 증가
      await this.incrementIssuedCount(couponId)

      return data
    } catch (error) {
      this.handleError(error, `쿠폰 배포 실패: ${couponId} → ${userId}`)
    }
  }

  /**
   * 사용자 쿠폰 목록 조회
   *
   * @param {string} userId - 사용자 ID
   * @param {Object} filters - 필터 조건
   * @param {boolean} filters.isUsed - 사용 여부
   * @param {boolean} filters.validOnly - 유효 기간 내 쿠폰만
   * @returns {Promise<Array>} 사용자 쿠폰 목록 (coupons JOIN)
   */
  async getUserCoupons(userId, filters = {}) {
    try {
      let query = this.client
        .from('user_coupons')
        .select(
          `
          *,
          coupon:coupons(*)
        `
        )
        .eq('user_id', userId)

      // 필터 적용
      if (filters.isUsed !== undefined) {
        query = query.eq('is_used', filters.isUsed)
      }

      // 유효 기간 내 쿠폰만
      if (filters.validOnly) {
        const now = new Date().toISOString()
        query = query
          .lte('coupon.valid_from', now)
          .gte('coupon.valid_until', now)
          .eq('coupon.is_active', true)
      }

      // 정렬 (최신순)
      query = query.order('issued_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      this.handleError(error, `사용자 쿠폰 조회 실패: ${userId}`)
    }
  }

  /**
   * 사용자 쿠폰 검증
   *
   * @param {string} couponCode - 쿠폰 코드
   * @param {string} userId - 사용자 ID
   * @param {number} orderAmount - 주문 금액
   * @returns {Promise<Object>} 검증 결과 { valid, error, coupon, userCoupon, discount }
   */
  async validateForUser(couponCode, userId, orderAmount) {
    try {
      // 1. 쿠폰 조회
      const coupon = await this.findByCode(couponCode)
      if (!coupon) {
        return { valid: false, error: '존재하지 않는 쿠폰 코드입니다' }
      }

      // 2. 활성 여부
      if (!coupon.is_active) {
        return { valid: false, error: '비활성화된 쿠폰입니다' }
      }

      // 3. 유효 기간
      const now = new Date()
      const validFrom = new Date(coupon.valid_from)
      const validUntil = new Date(coupon.valid_until)

      if (now < validFrom) {
        return { valid: false, error: '쿠폰 사용 기간이 아닙니다' }
      }

      if (now > validUntil) {
        return { valid: false, error: '만료된 쿠폰입니다' }
      }

      // 4. 최소 주문 금액
      if (orderAmount < coupon.min_purchase_amount) {
        return {
          valid: false,
          error: `최소 주문 금액 ${coupon.min_purchase_amount}원 이상이어야 합니다`,
        }
      }

      // 5. 전체 사용 한도
      if (coupon.total_usage_limit && coupon.total_used_count >= coupon.total_usage_limit) {
        return { valid: false, error: '쿠폰 사용 한도가 초과되었습니다' }
      }

      // 6. 사용자별 사용 한도
      const { data: userCoupons, error: userCouponsError } = await this.client
        .from('user_coupons')
        .select('*')
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId)

      if (userCouponsError) throw userCouponsError

      // 사용자가 이 쿠폰을 보유하지 않음
      if (!userCoupons || userCoupons.length === 0) {
        return { valid: false, error: '보유하지 않은 쿠폰입니다' }
      }

      // 이미 사용한 쿠폰 개수
      const usedCount = userCoupons.filter((uc) => uc.is_used).length

      if (usedCount >= coupon.usage_limit_per_user) {
        return { valid: false, error: '쿠폰 사용 횟수를 초과했습니다' }
      }

      // 사용 가능한 user_coupon 찾기
      const availableUserCoupon = userCoupons.find((uc) => !uc.is_used)

      if (!availableUserCoupon) {
        return { valid: false, error: '사용 가능한 쿠폰이 없습니다' }
      }

      // 7. 할인 금액 계산
      let discountAmount = 0

      if (coupon.discount_type === 'fixed_amount') {
        discountAmount = coupon.discount_value
      } else if (coupon.discount_type === 'percentage') {
        discountAmount = Math.floor((orderAmount * coupon.discount_value) / 100)

        // 최대 할인 금액 제한
        if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
          discountAmount = coupon.max_discount_amount
        }
      }

      // 할인 금액이 주문 금액보다 클 수 없음
      if (discountAmount > orderAmount) {
        discountAmount = orderAmount
      }

      // ✅ 검증 성공
      return {
        valid: true,
        error: null,
        coupon,
        userCoupon: availableUserCoupon,
        discount: discountAmount,
      }
    } catch (error) {
      this.handleError(error, `쿠폰 검증 실패: ${couponCode}`)
    }
  }

  /**
   * 쿠폰 사용 처리
   *
   * @param {string} userCouponId - user_coupons.id
   * @param {string} orderId - 주문 ID
   * @param {number} discountAmount - 할인 금액
   * @returns {Promise<Object>} 업데이트된 user_coupon 레코드
   */
  async markAsUsed(userCouponId, orderId, discountAmount) {
    try {
      const { data, error } = await this.client
        .from('user_coupons')
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
          order_id: orderId,
          discount_amount: discountAmount,
        })
        .eq('id', userCouponId)
        .select()
        .single()

      if (error) throw error

      // total_used_count 증가
      const { data: userCoupon } = await this.client
        .from('user_coupons')
        .select('coupon_id')
        .eq('id', userCouponId)
        .single()

      if (userCoupon) {
        await this.incrementUsedCount(userCoupon.coupon_id)
      }

      return data
    } catch (error) {
      this.handleError(error, `쿠폰 사용 처리 실패: ${userCouponId}`)
    }
  }

  /**
   * 쿠폰 통계 조회
   *
   * @param {string} couponId - 쿠폰 ID
   * @returns {Promise<Object>} 통계 정보
   */
  async getCouponStats(couponId) {
    try {
      // 1. 쿠폰 기본 정보
      const coupon = await this.findById(couponId)
      if (!coupon) {
        throw new Error('쿠폰을 찾을 수 없습니다')
      }

      // 2. user_coupons 통계
      const { data: userCoupons, error: userCouponsError } = await this.client
        .from('user_coupons')
        .select('*')
        .eq('coupon_id', couponId)

      if (userCouponsError) throw userCouponsError

      const totalIssued = userCoupons?.length || 0
      const totalUsed = userCoupons?.filter((uc) => uc.is_used).length || 0
      const totalUnused = totalIssued - totalUsed

      // 3. 할인 금액 합계
      const totalDiscountAmount = userCoupons
        ?.filter((uc) => uc.is_used && uc.discount_amount)
        .reduce((sum, uc) => sum + parseFloat(uc.discount_amount), 0)

      return {
        coupon,
        stats: {
          total_issued: totalIssued,
          total_used: totalUsed,
          total_unused: totalUnused,
          usage_rate: totalIssued > 0 ? ((totalUsed / totalIssued) * 100).toFixed(1) : 0,
          total_discount_amount: totalDiscountAmount || 0,
        },
      }
    } catch (error) {
      this.handleError(error, `쿠폰 통계 조회 실패: ${couponId}`)
    }
  }

  /**
   * 쿠폰 활성 상태 토글
   *
   * @param {string} couponId - 쿠폰 ID
   * @param {boolean} isActive - 활성 여부
   * @returns {Promise<Object>} 업데이트된 쿠폰
   */
  async toggleStatus(couponId, isActive) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', couponId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      this.handleError(error, `쿠폰 상태 토글 실패: ${couponId}`)
    }
  }

  /**
   * 쿠폰 보유 고객 목록 조회
   *
   * @param {string} couponId - 쿠폰 ID
   * @param {Object} filters - 필터 조건
   * @param {boolean} filters.isUsed - 사용 여부
   * @returns {Promise<Array>} 고객 목록 (profiles JOIN)
   */
  async getCouponHolders(couponId, filters = {}) {
    try {
      let query = this.client
        .from('user_coupons')
        .select(
          `
          *,
          user:profiles(*)
        `
        )
        .eq('coupon_id', couponId)

      // 필터 적용
      if (filters.isUsed !== undefined) {
        query = query.eq('is_used', filters.isUsed)
      }

      // 정렬 (최신순)
      query = query.order('issued_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      this.handleError(error, `쿠폰 보유 고객 조회 실패: ${couponId}`)
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * total_issued_count 증가
   * @private
   *
   * ⚠️ 2025-10-30 수정:
   * - RPC 함수 제거됨 (Vercel/Supabase 응답 문제로 인해)
   * - Service Role로 직접 UPDATE (RLS 우회)
   * - SQL INCREMENT 사용 (Race Condition 방지)
   */
  async incrementIssuedCount(couponId) {
    try {
      // ✅ Service Role로 직접 UPDATE (RLS 우회)
      const { error } = await this.client
        .from('coupons')
        .update({
          total_issued_count: this.client.raw('total_issued_count + 1')
        })
        .eq('id', couponId)

      if (error) {
        console.error('쿠폰 발급 카운트 증가 실패:', error)
        throw error
      }
    } catch (error) {
      console.error('쿠폰 발급 카운트 증가 실패:', error)
      // 에러를 던지지 않음 (통계 업데이트 실패해도 배포 자체는 성공)
    }
  }

  /**
   * total_used_count 증가
   * @private
   *
   * ⚠️ 2025-10-30 수정:
   * - RPC 함수 제거됨 (Vercel/Supabase 응답 문제로 인해)
   * - Service Role로 직접 UPDATE (RLS 우회)
   * - SQL INCREMENT 사용 (Race Condition 방지)
   */
  async incrementUsedCount(couponId) {
    try {
      // ✅ Service Role로 직접 UPDATE (RLS 우회)
      const { error } = await this.client
        .from('coupons')
        .update({
          total_used_count: this.client.raw('total_used_count + 1')
        })
        .eq('id', couponId)

      if (error) {
        console.error('쿠폰 사용 카운트 증가 실패:', error)
        throw error
      }
    } catch (error) {
      console.error('쿠폰 사용 카운트 증가 실패:', error)
      // 에러를 던지지 않음 (통계 업데이트 실패해도 사용 처리 자체는 성공)
    }
  }

  /**
   * 에러 처리 (BaseRepository 오버라이드)
   * @private
   */
  handleError(error, context) {
    console.error(`[CouponRepository] ${context}:`, error)
    throw new Error(`${context}: ${error.message}`)
  }
}

// Singleton instance export
import { supabaseAdmin } from '../supabaseAdmin'
const couponRepository = new CouponRepository(supabaseAdmin)
export default couponRepository
