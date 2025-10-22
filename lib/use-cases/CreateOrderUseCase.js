/** CreateOrderUseCase - Phase 5.2.1 (<150 lines, <10 functions) */
import OrderRepository from '@/lib/repositories/OrderRepository'
import ProductRepository from '@/lib/repositories/ProductRepository'
import UserRepository from '@/lib/repositories/UserRepository'
import { formatShippingInfo } from '@/lib/shippingUtils'
import { createClient } from '@supabase/supabase-js'
import logger from '@/lib/logger'

const getAdmin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

class CreateOrderUseCase {
  constructor() { this.db = null }
  _db() { if (!this.db) this.db = getAdmin(); return this.db }

  async execute({ orderData, userProfile, depositName, user }) {
    try {
      logger.info('🚀 주문', { user: user?.name })
      if (!user || !orderData || !userProfile) throw new Error('필수 정보 누락')
      const norm = { ...orderData, title: orderData.title || '상품명 미확인', price: orderData.price || orderData.totalPrice, totalPrice: orderData.totalPrice || orderData.price, quantity: orderData.quantity || 1 }
      
      let uid = null
      try { const p = await UserRepository.findById(user.id); if (p) uid = user.id } catch (e) {}
      
      const { orderId, customerOrderNumber, existingOrder } = await this._findOrCreateOrder(user, orderData)
      
      let freeShip = false
      try {
        const f = user.kakao_id ? { orderType: '%KAKAO:' + user.kakao_id + '%', status: ['pending', 'verifying'] } : { userId: uid, status: ['pending', 'verifying'] }
        const o = await OrderRepository.findByUser(f)
        freeShip = o && o.length > 0
      } catch (e) {}
      
      const order = await this._createOrUpdateOrder({ orderId, customerOrderNumber, existingOrder, orderData: norm, user, uid, freeShip })
      await this._createItem(orderId, norm)
      
      if (!existingOrder) {
        await this._createShipAndPay(orderId, norm, userProfile, user, depositName, freeShip)
      } else {
        await this._updatePay(orderId, userProfile, freeShip)
      }
      
      if (norm.variantId) { await ProductRepository.updateVariantInventory(norm.variantId, -norm.quantity) } 
      else { await ProductRepository.updateInventory(norm.id, -norm.quantity) }
      
      logger.info('✅ 완료', { orderId })

      // ✅ 성능 최적화: API 응답 최소화 (2.7MB → 1KB)
      // - thumbnail_url 등 대용량 데이터 제거
      // - 클라이언트가 이미 가지고 있는 데이터 제거
      const { thumbnail_url, thumbnailUrl, productSnapshot, ...minimalItem } = norm

      return {
        success: true,
        order: {
          id: order.id,
          customer_order_number: order.customer_order_number,
          status: order.status,
          total_amount: order.total_amount
        },
        items: [minimalItem]
      }
    } catch (error) {
      logger.error('❌ 실패', { error: error.message })
      throw error
    }
  }

  async _findOrCreateOrder(user, od) {
    const genNum = () => {
      const n = new Date()
      const yy = n.getFullYear().toString().slice(-2)
      const mm = String(n.getMonth() + 1).padStart(2, '0')
      const dd = String(n.getDate()).padStart(2, '0')
      const r = Math.random().toString(36).substring(2, 6).toUpperCase()
      return 'S' + yy + mm + dd + '-' + r
    }
    if (od.orderType !== 'cart') return { orderId: crypto.randomUUID(), customerOrderNumber: genNum(), existingOrder: null }
    const filters = { status: 'pending', orderType: user.kakao_id ? 'cart:KAKAO:' + user.kakao_id : 'cart' }
    const ex = await OrderRepository.findPendingCart(filters)
    if (ex) return { orderId: ex.id, customerOrderNumber: ex.customer_order_number, existingOrder: ex }
    return { orderId: crypto.randomUUID(), customerOrderNumber: genNum(), existingOrder: null }
  }

  async _createOrUpdateOrder(p) {
    const { orderId, customerOrderNumber, existingOrder, orderData, user, uid, freeShip } = p
    if (existingOrder) {
      const c = await OrderRepository.findById(orderId)
      return await OrderRepository.update(orderId, { total_amount: (c?.total_amount || 0) + orderData.totalPrice })
    }
    const ot = user.kakao_id ? (orderData.orderType || 'direct') + ':KAKAO:' + user.kakao_id : (orderData.orderType || 'direct')
    return await OrderRepository.create({ id: orderId, customer_order_number: customerOrderNumber, status: 'pending', order_type: ot, total_amount: orderData.totalPrice, discount_amount: orderData.couponDiscount || 0, is_free_shipping: freeShip, user_id: uid })
  }

  async _createItem(oid, od) {
    // ✅ 성능 최적화: products JOIN 제거를 위해 thumbnail_url, product_number를 order_items에 저장
    let thumbnailUrl = od.thumbnail_url || od.thumbnailUrl
    let productNumber = od.product_number || od.productNumber

    // orderData에 없으면 products 테이블에서 가져오기
    if (!thumbnailUrl || !productNumber) {
      const { data: product } = await this._db()
        .from('products')
        .select('thumbnail_url, product_number')
        .eq('id', od.id)
        .single()

      if (product) {
        thumbnailUrl = thumbnailUrl || product.thumbnail_url
        productNumber = productNumber || product.product_number
      }
    }

    const { error } = await this._db().from('order_items').insert([{
      order_id: oid,
      product_id: od.id,
      title: od.title,
      quantity: od.quantity,
      price: od.price,
      total: od.totalPrice,
      unit_price: od.price,
      total_price: od.totalPrice,
      selected_options: od.selectedOptions || {},
      variant_title: od.variant || null,
      variant_id: od.variantId || null,
      sku: od.sku || null,
      product_snapshot: od.productSnapshot || {},
      thumbnail_url: thumbnailUrl,  // ⭐ 신규
      product_number: productNumber  // ⭐ 신규
    }])
    if (error) throw error
  }

  async _createShipAndPay(oid, od, up, u, dn, fs) {
    const db = this._db()
    const { error: se } = await db.from('order_shipping').insert([{ order_id: oid, name: up.name || u.name || u.nickname || '주문자', phone: up.phone || u.phone || '연락처 미입력', address: up.address || '배송지 미입력', detail_address: up.detail_address || '', postal_code: up.postal_code || null }])
    if (se) throw se
    const si = formatShippingInfo(fs ? 0 : 4000, up.postal_code)
    const { error: pe } = await db.from('order_payments').insert([{ order_id: oid, method: 'bank_transfer', amount: od.totalPrice + si.totalShipping, status: 'pending', depositor_name: dn || up.name || '' }])
    if (pe) throw pe
  }

  async _updatePay(oid, up, fs) {
    const { data: items } = await this._db().from('order_items').select('total, total_price').eq('order_id', oid)
    const it = items.reduce((sum, i) => sum + (i.total_price || i.total || 0), 0)
    const si = formatShippingInfo(fs ? 0 : 4000, up.postal_code)
    const { error } = await this._db().from('order_payments').update({ amount: it + si.totalShipping }).eq('order_id', oid)
    if (error) throw error
  }
}

export default new CreateOrderUseCase()
