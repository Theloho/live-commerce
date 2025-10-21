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
      logger.info('🚀 주문 조회', { user: user?.id?.substring(0, 8), orderId, page })
      
      if (!user || !user.id) throw new Error('사용자 정보 필요')
      
      const orders = await this._fetchOrders(user, orderId)
      const normalized = this._normalizeOrders(orders)
      const statusCounts = this._calcCounts(normalized)
      
      let filtered = status ? normalized.filter(o => o.status === status) : normalized
      const totalCount = filtered.length
      const totalPages = Math.ceil(totalCount / pageSize)
      const offset = (page - 1) * pageSize
      const paginated = filtered.slice(offset, offset + pageSize)
      
      logger.info('✅ 조회 완료', { count: paginated.length, ms: Date.now() - start })
      return { success: true, orders: paginated, pagination: { currentPage: page, pageSize, totalCount, totalPages }, statusCounts }
    } catch (error) {
      logger.error('❌ 조회 실패', { error: error.message })
      throw error
    }
  }

  async _fetchOrders(user, orderId) {
    const baseQuery = `*, order_items (*, products!order_items_product_id_fkey (product_number, title, thumbnail_url, price)), order_shipping (*), order_payments (*)`
    
    const buildQuery = () => {
      let q = this._db().from('orders').select(baseQuery)
      if (orderId) return q.eq('id', orderId)
      return q.neq('status', 'cancelled').order('created_at', { ascending: false })
    }

    if (user.kakao_id) {
      let data = []
      
      const primary = `direct:KAKAO:` + user.kakao_id
      const { data: pd, error: pe } = await buildQuery().eq('order_type', primary)
      if (pe) throw pe
      data = pd || []
      
      const cart = `cart:KAKAO:` + user.kakao_id
      const { data: cd, error: ce } = await buildQuery().like('order_type', cart + '%')
      if (!ce && cd && cd.length > 0) {
        const existing = new Set(data.map(o => o.id))
        data = [...data, ...cd.filter(o => !existing.has(o.id))]
      }
      
      const idPat = '%KAKAO:' + user.id + '%'
      const { data: id, error: ie } = await buildQuery().like('order_type', idPat)
      if (!ie && id && id.length > 0) {
        const existing = new Set(data.map(o => o.id))
        data = [...data, ...id.filter(o => !existing.has(o.id))]
      }
      
      return data
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
        thumbnail_url: i.thumbnail_url || i.products?.thumbnail_url || '/placeholder.png',
        title: i.title || i.products?.title || '상품명 없음',
        price: i.price || i.unit_price || i.products?.price || 0,
        totalPrice: i.total_price || i.total || 0,
        selectedOptions: i.selected_options || {},
        product_number: i.product_number || i.products?.product_number || i.product_id,
        product_id: i.product_id,
        variant_id: i.variant_id
      })),
      shipping: Array.isArray(o.order_shipping) && o.order_shipping.length > 0 ? o.order_shipping[0] : o.order_shipping || null,
      payment: Array.isArray(o.order_payments) && o.order_payments.length > 0 ? o.order_payments[0] : o.order_payments || null
    }))
  }

  _calcCounts(orders) {
    return orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1
      return acc
    }, {})
  }
}

export default new GetOrdersUseCase()
