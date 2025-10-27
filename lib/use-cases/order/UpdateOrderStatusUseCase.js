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
   * 합배 원칙: 기존 payment_group_id 재사용 또는 신규 생성 @private
   * @description 기존 verifying 주문이 있으면 그들의 payment_group_id 재사용
   * @param {Array<string>} orderIds - 업데이트할 주문 ID 배열
   * @param {Object} paymentData - 결제 데이터 (shippingData 포함) ✅ 2025-10-27
   * @returns {Promise<string|null>} payment_group_id (GROUP-TIMESTAMP 형식) 또는 null
   */
  async _findOrReusePaymentGroupId(orderIds, paymentData = null) {
    try {
      this.log('🔍 [합배 원칙] payment_group_id 조회 시작', { orderIds, hasPaymentData: !!paymentData })

      // 1. 업데이트할 주문들 중 이미 payment_group_id가 있는지 확인
      for (const orderId of orderIds) {
        const order = await this.orderRepository.findById(orderId)
        if (order?.payment_group_id) {
          this.log('✅ [합배 원칙] 현재 주문의 기존 payment_group_id 재사용:', order.payment_group_id)
          return order.payment_group_id
        }
      }

      // 2. 첫 번째 주문에서 user 정보 추출
      const firstOrder = await this.orderRepository.findById(orderIds[0])
      if (!firstOrder) {
        throw new Error('주문을 찾을 수 없습니다')
      }

      // 3. 같은 사용자의 다른 verifying 주문 찾기 (현재 주문들도 포함)
      const filter = {
        userId: firstOrder.user_id || null,
        kakaoId: firstOrder.order_type?.includes('KAKAO:')
          ? firstOrder.order_type.split('KAKAO:')[1]
          : null,
        // ⭐ excludeIds 제거: 현재 주문 중 이미 verifying이면서 payment_group_id 있는 경우도 찾아야 함
      }

      const existingOrders = await this.orderRepository.findPendingOrdersWithGroup(filter)

      if (existingOrders && existingOrders.length > 0) {
        // ⭐ 배송지 비교 (우편번호 + 상세주소)
        // ✅ 2025-10-27: paymentData.shippingData에서 직접 추출 (DB 조회 제거)
        let currentShipping
        if (paymentData?.shippingData) {
          currentShipping = {
            postal_code: paymentData.shippingData.shipping_postal_code || '',
            detail_address: paymentData.shippingData.shipping_detail_address || ''
          }
          this.log('✅ [합배 원칙] paymentData에서 배송지 추출:', currentShipping)
        } else {
          // Fallback: DB에서 조회 (하위 호환성)
          currentShipping = await this._getShippingAddress(orderIds[0])
          this.log('⚠️ [합배 원칙] paymentData 없음, DB에서 배송지 조회:', currentShipping)
        }

        // ✅ 현재 주문 배송지 정보 검증 (2025-10-27)
        if (!currentShipping.postal_code || !currentShipping.detail_address ||
            currentShipping.postal_code.trim() === '' || currentShipping.detail_address.trim() === '') {
          this.log('⚠️ [합배 원칙] 현재 주문 배송지 정보 불완전 → payment_group_id = null', {
            postal: currentShipping.postal_code,
            detail: currentShipping.detail_address
          })
          return null
        }

        this.log('🔍 [합배 원칙] 배송지 비교 시작:', {
          current: { postal: currentShipping.postal_code, detail: currentShipping.detail_address },
          existingCount: existingOrders.length
        })

        // 배송지 일치하는 주문 찾기
        const matchedOrder = existingOrders.find(order => {
          const shipping = order.order_shipping?.[0] || {}

          // ✅ 기존 주문 배송지 정보 검증 (2025-10-27)
          const hasValidShipping = (
            shipping.postal_code &&
            shipping.detail_address &&
            shipping.postal_code.trim() !== '' &&
            shipping.detail_address.trim() !== ''
          )

          if (!hasValidShipping) {
            return false // 기존 주문 배송지 정보 불완전 → 비교 안 함
          }

          const isMatch = (
            shipping.postal_code === currentShipping.postal_code &&
            shipping.detail_address === currentShipping.detail_address
          )

          if (isMatch) {
            this.log('✅ [합배 원칙] 배송지 일치:', {
              orderId: order.id,
              postal: shipping.postal_code,
              detail: shipping.detail_address
            })
          }

          return isMatch
        })

        if (!matchedOrder) {
          // 배송지 일치하는 주문 없음 → 합배 안 함
          this.log('⚠️ [합배 원칙] 배송지 일치하는 주문 없음 → payment_group_id = null')
          return null
        }

        // ⭐ 배송지 일치하는 주문 발견! (payment_group_id 여부 무관)
        if (matchedOrder.payment_group_id) {
          // 이미 그룹 ID 있으면 재사용
          this.log('✅ [합배 원칙] 배송지 같음 + 기존 그룹 재사용:', matchedOrder.payment_group_id)
          return matchedOrder.payment_group_id
        } else {
          // 그룹 ID 없으면 신규 생성 (기존 주문 + 현재 주문 = 2건 이상)
          const newGroupId = `GROUP-${Date.now()}`
          this.log('🔵 [합배 원칙] 배송지 같음 + 신규 그룹 생성:', newGroupId)

          // ⭐ 기존 주문에도 적용
          await this.orderRepository.update(matchedOrder.id, {
            payment_group_id: newGroupId
          })
          this.log('✅ [합배 원칙] 기존 주문에 payment_group_id 적용 완료')

          return newGroupId
        }
      }

      // 기존 verifying 주문 없으면: 1건이므로 null
      this.log('✅ [합배 원칙] 1건 주문 + 기존 verifying 없음 → payment_group_id = null')
      return null
    } catch (error) {
      this.log('⚠️ [합배 원칙] payment_group_id 조회 실패:', error.message)
      // 에러 시: 2건 이상이면 신규 생성, 1건이면 null
      return orderIds.length > 1 ? `GROUP-${Date.now()}` : null
    }
  }

  /**
   * 배송지 정보 조회 @private
   * @param {string} orderId - 주문 ID
   * @returns {Promise<{postal_code: string, detail_address: string}>}
   */
  async _getShippingAddress(orderId) {
    try {
      const order = await this.orderRepository.findById(orderId)
      const shipping = order?.order_shipping?.[0] || {}

      return {
        postal_code: shipping.postal_code || '',
        detail_address: shipping.detail_address || ''
      }
    } catch (error) {
      this.log('⚠️ [합배 원칙] 배송지 조회 실패:', error.message)
      return {
        postal_code: '',
        detail_address: ''
      }
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
