/** UpdateOrderStatusUseCase - Phase 5.2.3 (<150 lines, <10 functions) */
import OrderRepository from '@/lib/repositories/OrderRepository'
import { createClient } from '@supabase/supabase-js'
import logger from '@/lib/logger'

const getAdmin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

class UpdateOrderStatusUseCase {
  constructor() { this.db = null }
  _db() { if (!this.db) this.db = getAdmin(); return this.db }

  async execute({ orderIds, status, paymentData = null }) {
    try {
      logger.info('🔵 주문 상태 업데이트', { orderIds, status })
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) throw new Error('주문 ID 필요')
      if (!status) throw new Error('상태 필요')
      
      const groupId = orderIds.length > 1 ? `GROUP-` + Date.now() : null
      if (groupId) logger.info('🏷️ 일괄결제', { count: orderIds.length, groupId })
      
      for (const oid of orderIds) {
        await this._updateSingle(oid, status, paymentData, groupId)
      }
      
      logger.info('✅ 업데이트 완료', { count: orderIds.length })
      return { success: true, updatedCount: orderIds.length }
    } catch (error) {
      logger.error('❌ 업데이트 실패', { error: error.message })
      throw error
    }
  }

  async _updateSingle(oid, status, pd, groupId) {
    const now = new Date().toISOString()
    const upd = { status, updated_at: now }
    
    if (status === 'verifying') upd.verifying_at = now
    if (status === 'paid') upd.paid_at = now
    if (status === 'delivered') upd.delivered_at = now
    if (status === 'cancelled') upd.cancelled_at = now
    if (groupId) upd.payment_group_id = groupId
    if (pd && pd.discountAmount !== undefined) upd.discount_amount = pd.discountAmount
    
    const { error: oe } = await this._db().from('orders').update(upd).eq('id', oid)
    if (oe) throw oe
    
    if (pd && pd.shippingData) await this._updateShip(oid, pd.shippingData)
    if (pd) await this._updatePay(oid, pd, status, groupId)
    if (pd && pd.selectedCoupon) await this._applyCoupon(oid, pd.selectedCoupon, pd.discountAmount)
  }

  async _updateShip(oid, sd) {
    const { data: ord } = await this._db().from('orders').select('is_free_shipping').eq('id', oid).single()
    const fee = ord?.is_free_shipping ? 0 : 4000
    const upd = {
      name: sd.shipping_name,
      phone: sd.shipping_phone,
      address: sd.shipping_address,
      detail_address: sd.shipping_detail_address || '',
      postal_code: sd.shipping_postal_code || null,
      shipping_fee: fee
    }
    const { data: ex } = await this._db().from('order_shipping').select('id').eq('order_id', oid).single()
    const { error } = ex
      ? await this._db().from('order_shipping').update(upd).eq('order_id', oid)
      : await this._db().from('order_shipping').insert({ order_id: oid, ...upd })
    if (error) throw error
  }

  async _updatePay(oid, pd, status, groupId) {
    const { data: od } = await this._db().from('orders').select('id, is_free_shipping, order_items(*), order_shipping(postal_code)').eq('id', oid).single()
    const items = od.order_items || []
    const pc = od.order_shipping?.[0]?.postal_code || od.order_shipping?.postal_code || pd.shippingData?.shipping_postal_code || 'normal'
    const baseFee = od.is_free_shipping ? 0 : 4000
    
    const { default: OC } = await import('@/lib/orderCalculations')
    const calc = OC.calculateFinalOrderAmount(items, {
      region: pc,
      coupon: pd.discountAmount > 0 ? { type: 'fixed_amount', value: pd.discountAmount } : null,
      paymentMethod: pd.method || 'bank_transfer',
      baseShippingFee: baseFee
    })
    
    const upd = {
      method: pd.method || 'bank_transfer',
      amount: calc.finalAmount,
      status: status,
      depositor_name: pd.depositorName || ''
    }
    if (groupId) upd.payment_group_id = groupId
    
    const { data: ex } = await this._db().from('order_payments').select('id').eq('order_id', oid).single()
    const { error } = ex
      ? await this._db().from('order_payments').update(upd).eq('order_id', oid)
      : await this._db().from('order_payments').insert({ order_id: oid, ...upd })
    if (error) throw error
  }

  async _applyCoupon(oid, coup, amt) {
    try {
      const { applyCouponUsage } = await import('@/lib/couponApi')
      await applyCouponUsage(coup.code, oid, amt)
      logger.info('✅ 쿠폰 사용', { code: coup.code })
    } catch (e) {
      logger.warn('⚠️ 쿠폰 처리 실패 (계속)', { error: e.message })
    }
  }
}

export default new UpdateOrderStatusUseCase()
