/**
 * OrderRepository - 주문 데이터 접근 레이어
 * @author Claude
 * @since 2025-10-21
 */

import { BaseRepository } from './BaseRepository'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { DatabaseError } from '@/lib/errors'

export class OrderRepository extends BaseRepository {
  constructor() {
    super(supabaseAdmin, 'orders')
  }

  /**
   * 사용자 주문 목록 조회
   * @param {string} userId - Supabase Auth User ID
   * @param {string} orderType - 카카오 주문 타입
   * @returns {Promise<Array>}
   */
  async findByUser(userId = null, orderType = null) {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*, order_items (*), order_shipping (*), order_payments (*)')
        .order('created_at', { ascending: false })

      if (orderType) query = query.eq('order_type', orderType)
      if (userId) query = query.eq('user_id', userId)

      const { data, error } = await query
      if (error) throw new DatabaseError('주문 목록 조회 실패', { table: this.tableName, details: error })

      return data || []
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('주문 목록 조회 중 오류', { table: this.tableName, details: error })
    }
  }

  /**
   * 주문 상세 조회
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async findById(orderId) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*, order_items (*), order_shipping (*), order_payments (*)')
        .eq('id', orderId)
        .single()

      if (error) throw new DatabaseError('주문 조회 실패', { table: this.tableName, orderId, details: error })
      return data
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('주문 조회 중 오류', { table: this.tableName, orderId, details: error })
    }
  }

  /**
   * 새 주문 생성 (4개 테이블 INSERT)
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async create({ orderData, orderItems, payment, shipping }) {
    try {
      // 1. orders 테이블
      const { data: order, error: orderError } = await this.client
        .from(this.tableName)
        .insert(orderData)
        .select()
        .single()
      if (orderError) throw new DatabaseError('주문 생성 실패', { table: this.tableName, details: orderError })

      // 2. order_items
      const itemsWithOrderId = orderItems.map((item) => ({ ...item, order_id: order.id }))
      const { error: itemsError } = await this.client.from('order_items').insert(itemsWithOrderId)
      if (itemsError) throw new DatabaseError('주문 아이템 생성 실패', { table: 'order_items', orderId: order.id, details: itemsError })

      // 3. order_shipping
      const { error: shippingError } = await this.client.from('order_shipping').insert({ ...shipping, order_id: order.id })
      if (shippingError) throw new DatabaseError('배송 정보 생성 실패', { table: 'order_shipping', orderId: order.id, details: shippingError })

      // 4. order_payments
      const { error: paymentError } = await this.client.from('order_payments').insert({ ...payment, order_id: order.id })
      if (paymentError) throw new DatabaseError('결제 정보 생성 실패', { table: 'order_payments', orderId: order.id, details: paymentError })

      return order
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('주문 생성 중 오류', { table: this.tableName, details: error })
    }
  }

  /**
   * 주문 정보 수정
   * @param {string} orderId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async update(orderId, data) {
    try {
      const { data: updated, error } = await this.client
        .from(this.tableName)
        .update(data)
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw new DatabaseError('주문 수정 실패', { table: this.tableName, orderId, details: error })
      return updated
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('주문 수정 중 오류', { table: this.tableName, orderId, details: error })
    }
  }

  /**
   * 주문 상태 변경 (타임스탬프 자동 기록)
   * @param {string} orderId
   * @param {string} status - pending/deposited/shipped/delivered/cancelled
   * @returns {Promise<Object>}
   */
  async updateStatus(orderId, status) {
    try {
      const updateData = { status }
      const now = new Date().toISOString()

      // 타임스탬프 자동 기록
      if (status === 'deposited') updateData.deposited_at = now
      else if (status === 'shipped') updateData.shipped_at = now
      else if (status === 'delivered') updateData.delivered_at = now
      else if (status === 'cancelled') updateData.cancelled_at = now

      const { data: updated, error } = await this.client
        .from(this.tableName)
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw new DatabaseError('주문 상태 변경 실패', { table: this.tableName, orderId, status, details: error })

      // 로깅
      const emoji = { pending: '🕐', deposited: '💰', shipped: '🚚', delivered: '✅', cancelled: '❌' }
      console.log(`${emoji[status]} 주문 상태 변경: ${orderId} → ${status}`)

      return updated
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('주문 상태 변경 중 오류', { table: this.tableName, orderId, status, details: error })
    }
  }

  /**
   * 여러 주문 일괄 상태 변경
   * @param {Array<string>} orderIds
   * @param {string} status
   * @returns {Promise<number>} 수정된 주문 개수
   */
  async updateMultipleStatus(orderIds, status) {
    try {
      const updateData = { status }
      if (status === 'deposited') updateData.deposited_at = new Date().toISOString()

      const { data, error } = await this.client
        .from(this.tableName)
        .update(updateData)
        .in('id', orderIds)
        .select()

      if (error) throw new DatabaseError('일괄 상태 변경 실패', { table: this.tableName, orderIds, status, details: error })

      console.log(`💰 일괄 입금확인: ${data.length}개 주문 → ${status}`)
      return data.length
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('일괄 상태 변경 중 오류', { table: this.tableName, orderIds, status, details: error })
    }
  }

  /**
   * 주문 취소 (상태만 변경, 재고/쿠폰 복구는 Use Case에서 처리)
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async cancel(orderId) {
    try {
      const { data: updated, error } = await this.client
        .from(this.tableName)
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw new DatabaseError('주문 취소 실패', { table: this.tableName, orderId, details: error })

      console.log(`❌ 주문 취소: ${orderId}`)
      return updated
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('주문 취소 중 오류', { table: this.tableName, orderId, details: error })
    }
  }

  /**
   * pending/verifying 상태 주문 조회 (무료배송 조건 확인용)
   * @param {Object} params
   * @param {string} params.userId - 일반 사용자 ID
   * @param {string} params.kakaoId - 카카오 사용자 ID
   * @param {Array<string>} params.excludeIds - 제외할 주문 ID 목록 (일괄결제 시)
   * @returns {Promise<boolean>} pending/verifying 주문이 있으면 true
   */
  async hasPendingOrders({ userId = null, kakaoId = null, excludeIds = [] }) {
    try {
      let query = this.client
        .from(this.tableName)
        .select('id, status')
        .in('status', ['pending', 'verifying'])

      // 사용자 구분
      if (kakaoId) {
        // 카카오 사용자: order_type으로 조회
        query = query.or(`order_type.like.%KAKAO:${kakaoId}%`)
      } else if (userId) {
        // 일반 사용자: user_id로 조회
        query = query.eq('user_id', userId)
      } else {
        // userId와 kakaoId 모두 없으면 false 반환
        return false
      }

      const { data, error } = await query

      if (error) {
        console.warn('❌ OrderRepository.hasPendingOrders 실패:', error)
        return false
      }

      // excludeIds 제외 (일괄결제 시 결제하려는 주문 제외)
      let filteredOrders = data || []
      if (excludeIds.length > 0) {
        const excludeSet = new Set(excludeIds)
        filteredOrders = data.filter(order => !excludeSet.has(order.id))
      }

      return filteredOrders.length > 0
    } catch (error) {
      console.warn('❌ OrderRepository.hasPendingOrders 오류:', error)
      return false
    }
  }
}
