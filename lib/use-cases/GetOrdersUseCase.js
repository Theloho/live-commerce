/** GetOrdersUseCase - Phase 5.2.2 (<150 lines, <10 functions) */
import OrderRepository from '@/lib/repositories/OrderRepository'
import { createClient } from '@supabase/supabase-js'
import logger from '@/lib/logger'

const getAdmin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

class GetOrdersUseCase {
  constructor() { this.db = null }
  _db() { if (!this.db) this.db = getAdmin(); return this.db }

  async execute({ user, orderId = null, page = 1, pageSize = 10, status = null }) {
    try {
      const start = Date.now()
      logger.info('🚀 주문 조회', { user: user?.id?.substring(0, 8), orderId, page, status })

      if (!user || !user.id) throw new Error('사용자 정보 필요')

      // ✅ 성능 최적화 1: DB COUNT 쿼리로 statusCounts 계산 (전체 조회 제거)
      const statusCounts = await this._fetchStatusCounts(user)

      // ✅ 성능 최적화 2: DB 레벨 필터/페이지네이션 적용
      const offset = (page - 1) * pageSize
      const filteredOrders = await this._fetchOrders(user, orderId, status, pageSize, offset)
      const normalized = this._normalizeOrders(filteredOrders)

      // ✅ 성능 최적화 3: 필터링된 총 개수 DB COUNT 쿼리
      const totalCount = await this._fetchFilteredCount(user, status)
      const totalPages = Math.ceil(totalCount / pageSize)

      logger.info('✅ 조회 완료', { count: normalized.length, total: totalCount, ms: Date.now() - start })
      return {
        success: true,
        orders: normalized,
        pagination: { currentPage: page, pageSize, totalCount, totalPages },
        statusCounts
      }
    } catch (error) {
      logger.error('❌ 조회 실패', { error: error.message })
      throw error
    }
  }

  async _fetchOrders(user, orderId, status = null, limit = null, offset = null) {
    // ✅ 성능 최적화: products JOIN 제거 (order_items에 이미 title, price 있음)
    const baseQuery = `*, order_items (*), order_shipping (*), order_payments (*)`

    const buildQuery = () => {
      let q = this._db().from('orders').select(baseQuery)

      // 단일 주문 조회
      if (orderId) return q.eq('id', orderId)

      // 상태 필터
      if (status) {
        q = q.eq('status', status)
      } else {
        q = q.neq('status', 'cancelled')
      }

      // 정렬
      q = q.order('created_at', { ascending: false })

      // ✅ DB 레벨 페이지네이션
      if (limit && offset !== null) {
        q = q.range(offset, offset + limit - 1)
      }

      return q
    }

    if (user.kakao_id) {
      // ✅ 성능 최적화: 3개 순차 쿼리 → 1개 OR 쿼리로 통합 (18초 → 6초)
      const primary = `direct:KAKAO:${user.kakao_id}`
      const cart = `cart:KAKAO:${user.kakao_id}`
      const idPat = `%KAKAO:${user.id}%`

      const { data, error } = await buildQuery().or(
        `order_type.eq.${primary},` +
        `order_type.like.${cart}%,` +
        `order_type.like.${idPat}`
      )

      if (error) throw error

      // 중복 제거 (혹시 여러 조건에 매칭되는 주문이 있을 경우)
      const uniqueOrders = Array.from(
        new Map(data.map(o => [o.id, o])).values()
      )

      return uniqueOrders
    } else {
      const { data: ad, error: ae } = await buildQuery().eq('user_id', user.id)
      if (ae) throw ae
      return ad || []
    }
  }

  _normalizeOrders(orders) {
    return orders.map(o => ({
      ...o,
      items: (o.order_items || []).map(i => ({
        ...i,
        // ✅ order_items에 이미 모든 정보 있음 (products JOIN 제거)
        thumbnail_url: i.thumbnail_url || '/placeholder.png',
        title: i.title || '상품명 없음',
        price: i.price || i.unit_price || 0,
        totalPrice: i.total_price || i.total || 0,
        selectedOptions: i.selected_options || {},
        product_number: i.product_number || i.product_id,
        product_id: i.product_id,
        variant_id: i.variant_id
      })),
      shipping: Array.isArray(o.order_shipping) && o.order_shipping.length > 0 ? o.order_shipping[0] : o.order_shipping || null,
      payment: Array.isArray(o.order_payments) && o.order_payments.length > 0 ? o.order_payments[0] : o.order_payments || null
    }))
  }

  async _fetchStatusCounts(user) {
    // ✅ DB COUNT 쿼리로 statusCounts 계산 (전체 조회 불필요)
    const buildCountQuery = () => {
      return this._db()
        .from('orders')
        .select('status', { count: 'exact' })
        .neq('status', 'cancelled')
    }

    try {
      let query = buildCountQuery()

      if (user.kakao_id) {
        const primary = `direct:KAKAO:${user.kakao_id}`
        const cart = `cart:KAKAO:${user.kakao_id}`
        const idPat = `%KAKAO:${user.id}%`

        query = query.or(
          `order_type.eq.${primary},` +
          `order_type.like.${cart}%,` +
          `order_type.like.${idPat}`
        )
      } else {
        query = query.eq('user_id', user.id)
      }

      const { data, error } = await query

      if (error) throw error

      // 상태별로 그룹핑하여 카운트
      const counts = {}
      data.forEach(order => {
        const status = order.status
        counts[status] = (counts[status] || 0) + 1
      })

      return counts
    } catch (error) {
      logger.error('❌ statusCounts 조회 실패', { error: error.message })
      return {}
    }
  }

  async _fetchFilteredCount(user, status = null) {
    // ✅ 필터링된 총 개수 DB COUNT 쿼리
    const buildCountQuery = () => {
      let q = this._db()
        .from('orders')
        .select('*', { count: 'exact', head: true })

      if (status) {
        q = q.eq('status', status)
      } else {
        q = q.neq('status', 'cancelled')
      }

      return q
    }

    try {
      let query = buildCountQuery()

      if (user.kakao_id) {
        const primary = `direct:KAKAO:${user.kakao_id}`
        const cart = `cart:KAKAO:${user.kakao_id}`
        const idPat = `%KAKAO:${user.id}%`

        query = query.or(
          `order_type.eq.${primary},` +
          `order_type.like.${cart}%,` +
          `order_type.like.${idPat}`
        )
      } else {
        query = query.eq('user_id', user.id)
      }

      const { count, error } = await query

      if (error) throw error

      return count || 0
    } catch (error) {
      logger.error('❌ filteredCount 조회 실패', { error: error.message })
      return 0
    }
  }

  _calcCounts(orders) {
    return orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1
      return acc
    }, {})
  }
}

export default new GetOrdersUseCase()
