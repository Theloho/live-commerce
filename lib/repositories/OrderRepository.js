/**
 * OrderRepository - 주문 데이터 저장소 (Phase 5.1 Clean Architecture)
 * @author Claude
 * @since 2025-10-21
 *
 * Infrastructure Layer:
 * - DB 접근만 담당 (비즈니스 로직 없음)
 * - Supabase Service Role 사용 (RLS 우회)
 * - 에러 처리 및 로깅
 *
 * ✅ Rule #0 준수:
 * - Rule 1: ≤250 lines
 * - Rule 5: Repository를 통한 DB 접근
 * - Rule 7: 모든 메서드 try-catch
 */

import { createClient } from '@supabase/supabase-js'
import logger from '@/lib/logger'

// Service Role 클라이언트 (서버 사이드 전용)
const getSupabaseAdmin = () => {
  if (typeof window !== 'undefined') {
    throw new Error('OrderRepository는 서버 사이드에서만 사용 가능합니다')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * OrderRepository - 주문 CRUD + 비즈니스 쿼리
 */
class OrderRepository {
  constructor() {
    this.supabase = null // Lazy initialization
  }

  _getClient() {
    if (!this.supabase) {
      this.supabase = getSupabaseAdmin()
    }
    return this.supabase
  }

  /**
   * 주문 생성 (4개 테이블 INSERT)
   * @param {Object} params
   * @param {Object} params.orderData - orders 테이블 데이터
   * @param {Array} params.orderItems - order_items 배열
   * @param {Object} params.payment - order_payments 데이터
   * @param {Object} params.shipping - order_shipping 데이터
   * @returns {Promise<Object>} 생성된 주문 (order_id 포함)
   */
  async create({ orderData, orderItems, payment, shipping }) {
    try {
      const supabase = this._getClient()

      // 🔵 디버깅: 입력 파라미터 확인
      logger.info('🔵 [OrderRepository] create() 시작:', {
        orderId: orderData.id,
        itemsCount: orderItems?.length || 0,
        hasShipping: !!shipping,
        hasPayment: !!payment
      })

      // ✅ Clean Architecture: Repository에서 4개 테이블에 직접 INSERT
      // - product_number, thumbnail_url 포함 (2025-10-24)
      const startTime = Date.now()
      logger.info('🔵 [OrderRepository] 주문 생성 시작:', new Date().toISOString())

      // 1. orders 테이블 INSERT
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single()

      if (orderError) throw orderError

      const orderId = order.id

      // 2. order_items 테이블 INSERT (배열) - product_number, thumbnail_url 포함
      if (orderItems && orderItems.length > 0) {
        const itemsWithOrderId = orderItems.map(item => ({
          ...item,
          order_id: orderId
        }))

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsWithOrderId)

        if (itemsError) throw itemsError
      }

      // 3. order_shipping 테이블 INSERT
      if (shipping) {
        const { error: shippingError } = await supabase
          .from('order_shipping')
          .insert({
            ...shipping,
            order_id: orderId
          })

        if (shippingError) throw shippingError
      }

      // 4. order_payments 테이블 INSERT
      if (payment) {
        const { error: paymentError } = await supabase
          .from('order_payments')
          .insert({
            ...payment,
            order_id: orderId
          })

        if (paymentError) throw paymentError
      }

      const elapsed = Date.now() - startTime
      logger.info('✅ [OrderRepository] 주문 생성 완료 (4개 테이블):', { orderId, elapsed: `${elapsed}ms` })
      return order

    } catch (error) {
      logger.error('❌ [OrderRepository] 주문 생성 실패:', error)
      throw new Error(`주문 생성 실패: ${error.message}`)
    }
  }

  /**
   * 주문 조회 (ID)
   */
  async findById(orderId) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          order_payments (*),
          order_shipping (*)
        `)
        .eq('id', orderId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('❌ [OrderRepository] 주문 조회 실패:', error)
      throw new Error(`주문 조회 실패: ${error.message}`)
    }
  }

  /**
   * 주문 목록 조회 (사용자별)
   */
  async findByUser(filters) {
    try {
      const supabase = this._getClient()
      const { userId, kakaoId, page = 1, pageSize = 10, status = null } = filters

      let query = supabase
        .from('orders')
        .select(`*, order_items (*), order_payments (*), order_shipping (*)`, { count: 'exact' })

      if (userId) {
        query = query.eq('user_id', userId)
      } else if (kakaoId) {
        query = query.like('order_type', `%KAKAO:${kakaoId}%`)
      }

      if (status) query = query.eq('status', status)

      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })

      const { data, error, count } = await query
      if (error) throw error

      return {
        orders: data,
        totalCount: count,
        currentPage: page,
        totalPages: Math.ceil(count / pageSize)
      }
    } catch (error) {
      logger.error('❌ [OrderRepository] 주문 목록 조회 실패:', error)
      throw new Error(`주문 목록 조회 실패: ${error.message}`)
    }
  }

  /**
   * payment_group_id로 주문 조회 (일괄결제 그룹)
   */
  async findByPaymentGroup(filters) {
    try {
      const supabase = this._getClient()
      const { userId, kakaoId, paymentGroupId } = filters

      let query = supabase
        .from('orders')
        .select(`*, order_items (*), order_payments (*), order_shipping (*)`)
        .eq('payment_group_id', paymentGroupId)

      if (userId) {
        query = query.eq('user_id', userId)
      } else if (kakaoId) {
        query = query.like('order_type', `%KAKAO:${kakaoId}%`)
      }

      const { data, error } = await query
      if (error) throw error

      return { orders: data }
    } catch (error) {
      logger.error('❌ [OrderRepository] 일괄결제 그룹 조회 실패:', error)
      throw new Error(`일괄결제 그룹 조회 실패: ${error.message}`)
    }
  }

  /**
   * 모든 주문 조회 (관리자)
   */
  async findAll(filters = {}) {
    try {
      const supabase = this._getClient()
      const { status, page = 1, pageSize = 50 } = filters

      let query = supabase
        .from('orders')
        .select(`*, order_items (*), order_payments (*), order_shipping (*), user:profiles (*)`, { count: 'exact' })

      if (status) query = query.eq('status', status)

      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })

      const { data, error, count } = await query
      if (error) throw error

      return { orders: data, totalCount: count, currentPage: page, totalPages: Math.ceil(count / pageSize) }
    } catch (error) {
      logger.error('❌ [OrderRepository] 전체 주문 조회 실패:', error)
      throw new Error(`전체 주문 조회 실패: ${error.message}`)
    }
  }

  /**
   * 주문 데이터 업데이트 (일반)
   */
  async update(orderId, updateData) {
    try {
      const supabase = this._getClient()
      logger.debug(`🔄 [OrderRepository] 주문 업데이트:`, { orderId, updateData })

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error
      logger.info(`✅ [OrderRepository] 주문 업데이트 완료:`, { orderId })
      return data
    } catch (error) {
      logger.error(`❌ [OrderRepository] 주문 업데이트 실패:`, error)
      throw new Error(`주문 업데이트 실패: ${error.message}`)
    }
  }

  /**
   * 주문 상태 업데이트 (타임스탬프 자동 추가)
   */
  async updateStatus(orderId, status) {
    try {
      const supabase = this._getClient()

      const updateData = { status }
      if (status === 'verifying') updateData.verifying_at = new Date().toISOString()
      if (status === 'deposited') updateData.paid_at = new Date().toISOString()
      if (status === 'paid') updateData.paid_at = new Date().toISOString()
      if (status === 'delivered') updateData.delivered_at = new Date().toISOString()
      if (status === 'cancelled') updateData.cancelled_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error

      logger.info('✅ [OrderRepository] 상태 업데이트:', orderId, '→', status)
      return data
    } catch (error) {
      logger.error('❌ [OrderRepository] 상태 업데이트 실패:', error)
      throw new Error(`상태 업데이트 실패: ${error.message}`)
    }
  }

  /**
   * 주문 취소 (상태를 cancelled로 변경 + cancelled_at 타임스탬프 자동 추가)
   * @param {string} orderId - 주문 ID
   * @returns {Promise<Object>} 취소된 주문 데이터
   */
  async cancel(orderId) {
    try {
      logger.info('🔵 [OrderRepository] 주문 취소 시작:', orderId)
      const result = await this.updateStatus(orderId, 'cancelled')
      logger.info('✅ [OrderRepository] 주문 취소 완료:', orderId)
      return result
    } catch (error) {
      logger.error('❌ [OrderRepository] 주문 취소 실패:', error)
      throw new Error(`주문 취소 실패: ${error.message}`)
    }
  }

  /**
   * pending 장바구니 찾기
   */
  async findPendingCart(filters) {
    try {
      const supabase = this._getClient()
      const { kakaoId } = filters

      // ⚡ 성능 최적화: 타임아웃 추가 (1초)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('findPendingCart timeout')), 1000)
      )

      const queryPromise = (async () => {
        let query = supabase
          .from('orders')
          .select('id, customer_order_number, total_amount')
          .eq('status', 'pending')

        if (kakaoId) {
          // 카카오 사용자: 'cart:KAKAO:123456' 정확히 매칭
          query = query.eq('order_type', `cart:KAKAO:${kakaoId}`)
        } else {
          // 일반 사용자: 'cart' 정확히 매칭
          query = query.eq('order_type', 'cart')
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error
        return data
      })()

      return await Promise.race([queryPromise, timeoutPromise])
    } catch (error) {
      logger.warn('⚠️ [OrderRepository] pending 장바구니 조회 실패 (null 반환):', error.message)
      return null // 실패 시 null 반환 (신규 주문 생성)
    }
  }

  /**
   * pending/verifying 주문 존재 확인 (무료배송 조건 확인용)
   */
  async hasPendingOrders(filters) {
    try {
      const supabase = this._getClient()
      const { userId, kakaoId, excludeIds = [] } = filters

      // ⚡ 성능 최적화: 타임아웃 추가 (1초)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('hasPendingOrders timeout')), 1000)
      )

      const queryPromise = (async () => {
        let query = supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'verifying'])

        if (userId) {
          // 일반 사용자: user_id로 정확히 매칭
          query = query.eq('user_id', userId)
        } else if (kakaoId) {
          // 카카오 사용자: 간단하게 2개 패턴만 확인 (direct, cart)
          query = query
            .is('user_id', null)
            .in('order_type', [`direct:KAKAO:${kakaoId}`, `cart:KAKAO:${kakaoId}`])
        }

        if (excludeIds.length > 0) {
          query = query.not('id', 'in', `(${excludeIds.join(',')})`)
        }

        const { count, error } = await query
        if (error) throw error
        return count > 0
      })()

      return await Promise.race([queryPromise, timeoutPromise])
    } catch (error) {
      logger.warn('⚠️ [OrderRepository] pending 주문 확인 실패 (기본값 false):', error.message)
      return false // 실패 시 무료배송 없음으로 처리
    }
  }

  /**
   * pending/verifying 주문 중 payment_group_id가 있는 가장 최근 주문 조회 (합배 원칙용)
   * @param {Object} filters - { userId, kakaoId, excludeIds? }
   * @returns {Promise<Object|null>} 주문 객체 또는 null
   */
  async findPendingOrdersWithGroup(filters) {
    try {
      const supabase = this._getClient()
      const { userId, kakaoId, excludeIds = [] } = filters

      logger.debug('🔍 [OrderRepository] pending 주문 조회 시작:', { userId, kakaoId, excludeIds })

      let query = supabase
        .from('orders')
        .select(`
          id,
          payment_group_id,
          created_at,
          order_type,
          user_id,
          order_shipping (
            postal_code,
            detail_address
          )
        `)
        .eq('status', 'pending')  // ⭐ pending만! verifying은 제외 (체크아웃 완료된 주문은 새 그룹으로 분리)
        .order('created_at', { ascending: false })

      if (userId) {
        // 일반 사용자: user_id로 정확히 매칭
        query = query.eq('user_id', userId)
      } else if (kakaoId) {
        // 카카오 사용자: order_type LIKE 패턴
        query = query
          .is('user_id', null)
          .like('order_type', `%KAKAO:${kakaoId}%`)
      } else {
        // userId와 kakaoId 둘 다 없으면 null 반환
        return null
      }

      // excludeIds 처리 (현재 업데이트할 주문 제외)
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`)
      }

      // ⭐ 배송지 비교를 위해 전체 조회 (배열 반환)
      const { data, error } = await query

      if (error) {
        throw error
      }

      // 결과 없음
      if (!data || data.length === 0) {
        logger.debug('✅ [OrderRepository] pending 주문 없음')
        return null
      }

      // ⭐ 전체 배열 반환 (배송지 비교는 UseCase에서 수행)
      logger.debug('✅ [OrderRepository] pending 주문 조회 완료:', {
        count: data.length,
        ids: data.map(o => o.id)
      })

      return data
    } catch (error) {
      logger.warn('⚠️ [OrderRepository] pending 주문 조회 실패 (기본값 null):', error.message)
      return null // 실패 시 null 반환 (신규 주문은 정상 생성)
    }
  }

  /**
   * 배송 정보 업데이트 (없으면 생성)
   */
  async updateShipping(orderId, shippingData) {
    try {
      const supabase = this._getClient()
      logger.debug(`🔄 [OrderRepository] 배송 정보 업데이트:`, { orderId })

      // 기존 배송 정보 확인
      const { data: existing } = await supabase
        .from('order_shipping')
        .select('id')
        .eq('order_id', orderId)
        .single()

      let result
      if (existing) {
        // 업데이트
        const { data, error } = await supabase
          .from('order_shipping')
          .update(shippingData)
          .eq('order_id', orderId)
          .select()
          .single()
        if (error) throw error
        result = data
      } else {
        // 생성
        const { data, error } = await supabase
          .from('order_shipping')
          .insert({ order_id: orderId, ...shippingData })
          .select()
          .single()
        if (error) throw error
        result = data
      }

      logger.info(`✅ [OrderRepository] 배송 정보 업데이트 완료:`, { orderId })
      return result
    } catch (error) {
      logger.error(`❌ [OrderRepository] 배송 정보 업데이트 실패:`, error)
      throw new Error(`배송 정보 업데이트 실패: ${error.message}`)
    }
  }

  /**
   * 결제 정보 업데이트 (없으면 생성)
   */
  async updatePayment(orderId, paymentData) {
    try {
      const supabase = this._getClient()
      logger.debug(`🔄 [OrderRepository] 결제 정보 업데이트:`, { orderId })

      // 기존 결제 정보 확인
      const { data: existing } = await supabase
        .from('order_payments')
        .select('id')
        .eq('order_id', orderId)
        .single()

      let result
      if (existing) {
        // 업데이트
        const { data, error } = await supabase
          .from('order_payments')
          .update(paymentData)
          .eq('order_id', orderId)
          .select()
          .single()
        if (error) throw error
        result = data
      } else {
        // 생성
        const { data, error } = await supabase
          .from('order_payments')
          .insert({ order_id: orderId, ...paymentData })
          .select()
          .single()
        if (error) throw error
        result = data
      }

      logger.info(`✅ [OrderRepository] 결제 정보 업데이트 완료:`, { orderId })
      return result
    } catch (error) {
      logger.error(`❌ [OrderRepository] 결제 정보 업데이트 실패:`, error)
      throw new Error(`결제 정보 업데이트 실패: ${error.message}`)
    }
  }

  /**
   * 상태별 주문 개수 조회 (GetOrdersUseCase용)
   */
  async countByStatus(filters) {
    try {
      const supabase = this._getClient()
      const { userId, kakaoId, excludeCancelled = false } = filters

      let query = supabase
        .from('orders')
        .select('status', { count: 'exact' })

      // User filtering
      if (userId) {
        query = query.eq('user_id', userId)
      } else if (kakaoId) {
        query = query.like('order_type', `%KAKAO:${kakaoId}%`)
      }

      // Exclude cancelled
      if (excludeCancelled) {
        query = query.neq('status', 'cancelled')
      }

      const { data, error } = await query

      if (error) throw error

      // Count by status
      const counts = {}
      if (data) {
        data.forEach((order) => {
          const status = order.status
          counts[status] = (counts[status] || 0) + 1
        })
      }

      logger.debug('✅ [OrderRepository] 상태별 개수:', counts)
      return counts
    } catch (error) {
      logger.error('❌ [OrderRepository] 상태별 개수 조회 실패:', error)
      throw new Error(`상태별 개수 조회 실패: ${error.message}`)
    }
  }

  /**
   * 필터링된 주문 총 개수 조회 (GetOrdersUseCase용)
   */
  async count(filters) {
    try {
      const supabase = this._getClient()
      const { userId, kakaoId, status, excludeCancelled = false } = filters

      let query = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })

      // User filtering
      if (userId) {
        query = query.eq('user_id', userId)
      } else if (kakaoId) {
        query = query.like('order_type', `%KAKAO:${kakaoId}%`)
      }

      // Status filtering
      if (status) {
        query = query.eq('status', status)
      }

      // Exclude cancelled
      if (excludeCancelled) {
        query = query.neq('status', 'cancelled')
      }

      const { count, error } = await query

      if (error) throw error

      logger.debug('✅ [OrderRepository] 필터링된 개수:', count)
      return count || 0
    } catch (error) {
      logger.error('❌ [OrderRepository] 개수 조회 실패:', error)
      throw new Error(`개수 조회 실패: ${error.message}`)
    }
  }
}

export default new OrderRepository()
