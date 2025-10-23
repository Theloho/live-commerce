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

      // ⚡ 성능 최적화: RPC 함수로 한 번에 INSERT (4회 → 1회 네트워크 왕복)
      const startTime = Date.now()
      logger.info('🔵 [OrderRepository] RPC 호출 시작:', new Date().toISOString())

      const { data, error } = await supabase.rpc('create_order_with_relations', {
        order_data: orderData,
        order_items_data: orderItems || [],
        shipping_data: shipping || null,
        payment_data: payment || null
      })

      const elapsed = Date.now() - startTime
      logger.info('🔵 [OrderRepository] RPC 호출 완료:', { elapsed: `${elapsed}ms`, hasError: !!error })

      if (error) {
        logger.error('❌ [OrderRepository] RPC 에러:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw error
      }

      logger.info('✅ [OrderRepository] 주문 생성 완료 (RPC):', data.id)
      return data

      // ─────────────────────────────────────────────────────────────
      // 🗑️ Legacy Code (4번 네트워크 왕복) - RPC 함수 실패 시 폴백용
      // ─────────────────────────────────────────────────────────────
      // // 1. orders 테이블 INSERT
      // const { data: order, error: orderError } = await supabase
      //   .from('orders')
      //   .insert(orderData)
      //   .select()
      //   .single()
      //
      // if (orderError) throw orderError
      //
      // const orderId = order.id
      //
      // // 2. order_items 테이블 INSERT (배열)
      // if (orderItems && orderItems.length > 0) {
      //   const itemsWithOrderId = orderItems.map(item => ({
      //     ...item,
      //     order_id: orderId
      //   }))
      //
      //   const { error: itemsError } = await supabase
      //     .from('order_items')
      //     .insert(itemsWithOrderId)
      //
      //   if (itemsError) throw itemsError
      // }
      //
      // // 3. order_shipping 테이블 INSERT
      // if (shipping) {
      //   const { error: shippingError } = await supabase
      //     .from('order_shipping')
      //     .insert({
      //       ...shipping,
      //       order_id: orderId
      //     })
      //
      //   if (shippingError) throw shippingError
      // }
      //
      // // 4. order_payments 테이블 INSERT
      // if (payment) {
      //   const { error: paymentError } = await supabase
      //     .from('order_payments')
      //     .insert({
      //       ...payment,
      //       order_id: orderId
      //     })
      //
      //   if (paymentError) throw paymentError
      // }
      //
      // logger.info('✅ [OrderRepository] 주문 생성 완료 (4개 테이블):', orderId)
      // return order
      // ─────────────────────────────────────────────────────────────

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
   * pending 장바구니 찾기
   */
  async findPendingCart(filters) {
    try {
      const supabase = this._getClient()
      const { kakaoId } = filters

      const pattern = kakaoId ? `cart:KAKAO:${kakaoId}` : 'cart'

      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_order_number')
        .eq('status', 'pending')
        .like('order_type', `${pattern}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('❌ [OrderRepository] pending 장바구니 조회 실패:', error)
      throw new Error(`pending 장바구니 조회 실패: ${error.message}`)
    }
  }

  /**
   * pending/verifying 주문 존재 확인 (무료배송 조건 확인용)
   */
  async hasPendingOrders(filters) {
    try {
      const supabase = this._getClient()
      const { userId, kakaoId, excludeIds = [] } = filters

      let query = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'verifying'])

      if (userId) {
        query = query.eq('user_id', userId)
      } else if (kakaoId) {
        query = query.like('order_type', `%KAKAO:${kakaoId}%`)
      }

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`)
      }

      const { count, error } = await query

      if (error) throw error
      return count > 0
    } catch (error) {
      logger.error('❌ [OrderRepository] pending 주문 확인 실패:', error)
      throw new Error(`pending 주문 확인 실패: ${error.message}`)
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
      const { userId, orderType, excludeCancelled = false } = filters

      let query = supabase
        .from('orders')
        .select('status', { count: 'exact' })

      // User filtering
      if (userId) {
        query = query.eq('user_id', userId)
      } else if (orderType) {
        query = query.like('order_type', orderType)
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
      const { userId, orderType, status, excludeCancelled = false } = filters

      let query = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })

      // User filtering
      if (userId) {
        query = query.eq('user_id', userId)
      } else if (orderType) {
        query = query.like('order_type', orderType)
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
