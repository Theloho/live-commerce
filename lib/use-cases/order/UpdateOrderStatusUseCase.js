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

      // 2. ⭐ 합배 원칙: 일괄 처리 그룹 ID (1건이든 2건이든 항상 기존 그룹 확인)
      // ✅ 2025-10-27: paymentData 전달하여 정확한 배송지 비교
      const groupId = await this._findOrReusePaymentGroupId(orderIds, paymentData)
      if (groupId) {
        this.log('일괄결제 그룹 적용', { count: orderIds.length, groupId })
      }

      // 3. 각 주문 업데이트 (대표 주문만 쿠폰 할인 저장)
      for (let i = 0; i < orderIds.length; i++) {
        const isRepresentative = (i === 0)  // 첫 번째 주문이 대표 주문
        await this._updateSingleOrder(orderIds[i], status, paymentData, groupId, isRepresentative, i)
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
  async _updateSingleOrder(orderId, status, paymentData, groupId, isRepresentative = true, groupOrderIndex = 0) {
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
    // ⭐ 쿠폰 할인: 대표 주문만 저장, 나머지는 0
    const updateData = {
      status,
      ...(groupId && {
        payment_group_id: groupId,
        group_order_index: groupOrderIndex,
      }),
      ...(paymentData?.discountAmount !== undefined && {
        discount_amount: isRepresentative ? paymentData.discountAmount : 0,
      }),
    }

    await this.orderRepository.updateStatus(orderId, status)
    if (groupId || paymentData?.discountAmount !== undefined) {
      await this.orderRepository.update(orderId, updateData)
    }

    // 2. 배송 정보 업데이트
    if (paymentData?.shippingData) {
      await this._updateShipping(orderId, paymentData.shippingData, groupOrderIndex)
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
   * 배송비 계산 우선순위:
   * 1. 무료배송 (is_free_shipping = true) → ₩0
   * 2. 합배 (parent_order_id 존재 OR group_order_index > 0) → ₩0
   * 3. 도서산간 (postal_code 59xxx) → ₩7,000
   * 4. 제주 (postal_code 63xxx) → ₩7,000
   * 5. 일반 지역 → ₩4,000
   */
  async _updateShipping(orderId, shippingData, groupOrderIndex = 0) {
    try {
      // 주문 정보 조회
      const order = await this.orderRepository.findById(orderId)
      const isFreeShipping = order?.is_free_shipping || false
      const parentOrderId = order?.parent_order_id || null
      const postalCode = shippingData.shipping_postal_code || null

      // 배송비 계산 (우선순위 적용)
      let shippingFee = 4000 // 기본값

      if (isFreeShipping) {
        // 1순위: 무료배송
        shippingFee = 0
      } else if (parentOrderId || groupOrderIndex > 0) {
        // 2순위: 합배 (Phase 3) 또는 일괄결제 비대표 주문
        shippingFee = 0
      } else if (postalCode) {
        // 3-4순위: 도서산간/제주
        const firstTwo = postalCode.substring(0, 2)
        if (firstTwo === '59') {
          shippingFee = 7000 // 도서산간
        } else if (firstTwo === '63') {
          shippingFee = 7000 // 제주
        }
        // else: 일반 지역 ₩4,000 (기본값 유지)
      }

      const shippingInfo = {
        order_id: orderId,
        name: shippingData.shipping_name,
        phone: shippingData.shipping_phone,
        address: shippingData.shipping_address,
        detail_address: shippingData.shipping_detail_address || '',
        postal_code: postalCode,
        shipping_fee: shippingFee,
      }

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
   * 합배 원칙: 같은 세션 주문만 그룹핑 @private
   * @description 같은 세션에서 체크아웃한 주문들만 payment_group_id로 그룹핑
   * @param {Array<string>} orderIds - 업데이트할 주문 ID 배열
   * @param {Object} paymentData - 결제 데이터 (shippingData 포함)
   * @returns {Promise<string|null>} payment_group_id (GROUP-TIMESTAMP 형식) 또는 null
   */
  async _findOrReusePaymentGroupId(orderIds, paymentData = null) {
    try {
      this.log('🔍 [합배 원칙] payment_group_id 조회 시작', { count: orderIds.length })

      // 1. 업데이트할 주문들 중 이미 payment_group_id가 있는지 확인
      for (const orderId of orderIds) {
        const order = await this.orderRepository.findById(orderId)
        if (order?.payment_group_id) {
          this.log('✅ [합배 원칙] 현재 주문의 기존 payment_group_id 재사용:', order.payment_group_id)
          return order.payment_group_id
        }
      }

      // 2. ⭐ 1건이든 N건이든 항상 GROUP-ID 생성 (2025-10-29 변경)
      // 이유: 1건 주문도 bulkPaymentInfo 계산이 필요하고, 일관된 데이터 구조 유지
      const newGroupId = `GROUP-${Date.now()}`
      this.log('✅ [합배 원칙] 신규 그룹 생성 (' + orderIds.length + '건):', newGroupId)
      return newGroupId
    } catch (error) {
      this.log('⚠️ [합배 원칙] payment_group_id 조회 실패:', error.message)
      // 에러 시: 2건 이상이면 신규 생성, 1건이면 null
      return orderIds.length > 1 ? `GROUP-${Date.now()}` : null
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
