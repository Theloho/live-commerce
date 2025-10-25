/**
 * UpdateOrderStatusUseCase - 주문 상태 업데이트 Use Case
 * @author Claude
 * @since 2025-10-23
 */

import { BaseUseCase } from '../BaseUseCase'
import { Order } from '@/lib/domain/order/Order'
import OrderCalculations from '@/lib/orderCalculations'

/**
 * UpdateOrderStatusUseCase - 주문 상태 업데이트 비즈니스 로직
 * - 주문 상태 변경 (pending → verifying → deposited → shipped → delivered)
 * - 일괄 처리 지원 (payment_group_id)
 * - 배송 정보 업데이트
 * - 결제 정보 업데이트
 * - 쿠폰 적용
 */
export class UpdateOrderStatusUseCase extends BaseUseCase {
  /**
   * @param {OrderRepository} orderRepository
   */
  constructor(orderRepository) {
    super()
    this.orderRepository = orderRepository
  }

  /**
   * 주문 상태 업데이트 실행
   * @param {Object} params
   * @param {Array<string>} params.orderIds - 주문 ID 배열
   * @param {string} params.status - 변경할 상태
   * @param {Object} params.paymentData - 결제 데이터 (optional)
   * @returns {Promise<{success: boolean, updatedCount: number}>}
   */
  async execute({ orderIds, status, paymentData = null }) {
    try {
      // 1. 검증
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        throw new Error('주문 ID가 필요합니다')
      }
      if (!status) {
        throw new Error('상태가 필요합니다')
      }

      this.log('주문 상태 업데이트 시작', { count: orderIds.length, status })

      // 2. 일괄 처리 그룹 ID 생성 (2개 이상일 때만)
      const groupId = orderIds.length > 1 ? `GROUP-${Date.now()}` : null
      if (groupId) {
        this.log('일괄결제 그룹 생성', { count: orderIds.length, groupId })
      }

      // 3. 각 주문 업데이트
      for (const orderId of orderIds) {
        await this._updateSingleOrder(orderId, status, paymentData, groupId)
      }

      this.log('주문 상태 업데이트 완료', { count: orderIds.length })
      return { success: true, updatedCount: orderIds.length }
    } catch (error) {
      this.handleError(error, '주문 상태 업데이트 실패')
    }
  }

  /**
   * 단일 주문 업데이트 @private
   */
  async _updateSingleOrder(orderId, status, paymentData, groupId) {
    // 0. 주문번호 부여 (pending → verifying 전환 시, 주문번호 없는 경우만)
    if (status === 'verifying') {
      const order = await this.orderRepository.findById(orderId)
      if (!order.customer_order_number) {
        const orderNumber = this._generateOrderNumber()
        await this.orderRepository.update(orderId, { customer_order_number: orderNumber })
        this.log('✅ 주문번호 부여', { orderId, orderNumber })
      }
    }

    // 1. 주문 상태 업데이트 (타임스탬프 자동 추가)
    const updateData = {
      status,
      ...(groupId && { payment_group_id: groupId }),
      ...(paymentData?.discountAmount !== undefined && {
        discount_amount: paymentData.discountAmount,
      }),
    }

    await this.orderRepository.updateStatus(orderId, status)
    if (groupId || paymentData?.discountAmount !== undefined) {
      await this.orderRepository.update(orderId, updateData)
    }

    // 2. 배송 정보 업데이트
    if (paymentData?.shippingData) {
      await this._updateShipping(orderId, paymentData.shippingData)
    }

    // 3. 결제 정보 업데이트
    if (paymentData) {
      await this._updatePayment(orderId, paymentData, status, groupId)
    }

    // 4. 쿠폰 적용
    if (paymentData?.selectedCoupon) {
      await this._applyCoupon(orderId, paymentData.selectedCoupon, paymentData.discountAmount)
    }
  }

  /**
   * 배송 정보 업데이트 @private
   */
  async _updateShipping(orderId, shippingData) {
    try {
      // 무료배송 확인
      const order = await this.orderRepository.findById(orderId)
      const isFreeShipping = order?.is_free_shipping || false
      const shippingFee = isFreeShipping ? 0 : 4000

      const shippingInfo = {
        order_id: orderId,
        name: shippingData.shipping_name,
        phone: shippingData.shipping_phone,
        address: shippingData.shipping_address,
        detail_address: shippingData.shipping_detail_address || '',
        postal_code: shippingData.shipping_postal_code || null,
        shipping_fee: shippingFee,
      }

      // Repository에 createOrUpdateShipping 메서드가 있다고 가정
      // 없으면 OrderRepository에 추가 필요
      await this.orderRepository.updateShipping(orderId, shippingInfo)
    } catch (error) {
      this.log('배송 정보 업데이트 실패 (계속 진행)', { orderId, error: error.message })
    }
  }

  /**
   * 결제 정보 업데이트 @private
   */
  async _updatePayment(orderId, paymentData, status, groupId) {
    try {
      // 🔍 디버깅: 서버에서 받은 paymentData 확인
      console.log('🔍 [UpdateOrderStatusUseCase._updatePayment] 시작:', {
        orderId,
        depositorName: paymentData.depositorName,
        method: paymentData.method,
        groupId
      })

      // 1. 주문 정보 조회 (order_items, order_shipping 포함)
      const order = await this.orderRepository.findById(orderId)
      const items = order.order_items || []
      const postalCode =
        order.order_shipping?.[0]?.postal_code ||
        order.order_shipping?.postal_code ||
        paymentData.shippingData?.shipping_postal_code ||
        'normal'

      const baseShippingFee = order.is_free_shipping ? 0 : 4000

      // 2. OrderCalculations로 최종 금액 계산
      const coupon =
        paymentData.discountAmount > 0
          ? { type: 'fixed_amount', value: paymentData.discountAmount }
          : null

      const calc = OrderCalculations.calculateFinalOrderAmount(items, {
        region: postalCode,
        coupon,
        paymentMethod: paymentData.method || 'bank_transfer',
        baseShippingFee,
      })

      // 3. 결제 정보 업데이트
      // ⚠️ payment_group_id는 orders 테이블에만 저장 (Line 83)
      // order_payments 테이블에는 payment_group_id 컬럼이 없음
      const paymentInfo = {
        order_id: orderId,
        method: paymentData.method || 'bank_transfer',
        amount: calc.finalAmount,
        status: status,
        depositor_name: paymentData.depositorName || '',
      }

      // 🔍 디버깅: DB 저장 직전 paymentInfo 확인
      console.log('🔍 [UpdateOrderStatusUseCase._updatePayment] DB 저장 직전:', {
        orderId,
        depositor_name: paymentInfo.depositor_name,
        paymentInfo
      })

      await this.orderRepository.updatePayment(orderId, paymentInfo)
    } catch (error) {
      this.log('결제 정보 업데이트 실패 (계속 진행)', { orderId, error: error.message })
    }
  }

  /**
   * 쿠폰 적용 @private
   */
  async _applyCoupon(orderId, coupon, discountAmount) {
    try {
      // 동적 import (couponApi는 클라이언트 사이드 모듈)
      const { applyCouponUsage } = await import('@/lib/couponApi')
      await applyCouponUsage(coupon.code, orderId, discountAmount)
      this.log('쿠폰 적용 완료', { code: coupon.code, orderId })
    } catch (error) {
      // 쿠폰 적용 실패 시 로그만 출력하고 계속 진행
      this.log('쿠폰 적용 실패 (계속 진행)', { code: coupon.code, error: error.message })
    }
  }

  /**
   * 주문번호 생성 @private
   * @returns {string} S251024-XXXX 형식의 주문번호
   */
  _generateOrderNumber() {
    const d = new Date()
    const date = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const rand = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')
    return `S${date}-${rand}`
  }
}
