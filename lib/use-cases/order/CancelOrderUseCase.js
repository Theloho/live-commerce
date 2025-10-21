/**
 * CancelOrderUseCase - 주문 취소 Use Case
 * @author Claude
 * @since 2025-10-21
 */

import { BaseUseCase } from '../BaseUseCase'
import { Order } from '@/lib/domain/order/Order'

/**
 * CancelOrderUseCase - 주문 취소 비즈니스 로직
 * - 주문 상태 확인 (pending/verifying만 취소 가능)
 * - 주문 상태 변경 (cancelled)
 * - 재고 복원 (order_items 기반)
 * - 쿠폰 복구 (TODO: Phase 3.5에서 구현)
 */
export class CancelOrderUseCase extends BaseUseCase {
  /**
   * @param {OrderRepository} orderRepository
   * @param {ProductRepository} productRepository
   */
  constructor(orderRepository, productRepository) {
    super()
    this.orderRepository = orderRepository
    this.productRepository = productRepository
  }

  /**
   * 주문 취소 실행
   * @param {Object} params - { orderId, user }
   * @param {string} params.orderId - 주문 ID
   * @param {Object} params.user - 사용자 정보 (소유권 확인용)
   * @returns {Promise<Order>} 취소된 Order Entity
   * @throws {Error} 주문이 없거나 취소 불가 상태인 경우
   */
  async execute({ orderId, user }) {
    try {
      // 1. 주문 조회
      const orderData = await this.orderRepository.findById(orderId)
      if (!orderData) {
        throw new Error(`주문을 찾을 수 없습니다: ${orderId}`)
      }

      // 2. Order Entity 생성
      const order = Order.fromJSON(orderData)

      // 3. 소유권 확인 (user_id 또는 order_type으로)
      this._checkOwnership(order, user)

      // 4. 취소 가능 여부 확인
      if (!order.canBeCancelled()) {
        throw new Error(
          `주문 취소 불가: ${order.status} 상태에서는 취소할 수 없습니다. (pending/verifying만 가능)`
        )
      }

      this.log('주문 취소 시작', { orderId, status: order.status })

      // 5. 재고 복원 (order_items 기반)
      await this._restoreInventory(orderData.order_items)

      // 6. 주문 상태 변경 (cancelled)
      const cancelled = await this.orderRepository.cancel(orderId)

      // TODO: 7. 쿠폰 복구 (Phase 3.5에서 구현)
      // if (orderData.discount_amount > 0) {
      //   await this.couponRepository.restoreCoupon(user.id, orderId)
      // }

      this.log('주문 취소 완료', { orderId })
      return Order.fromJSON(cancelled)
    } catch (error) {
      this.handleError(error, '주문 취소 실패')
    }
  }

  /**
   * 소유권 확인 @private
   * @param {Order} order - 주문 Entity
   * @param {Object} user - 사용자 정보
   * @throws {Error} 소유권이 없는 경우
   */
  _checkOwnership(order, user) {
    const isOwner =
      order.user_id === user.id ||
      (order.isKakaoOrder() && order.order_type === `direct:KAKAO:${user.kakaoId}`)

    if (!isOwner) {
      throw new Error('주문 취소 권한이 없습니다.')
    }
  }

  /**
   * 재고 복원 @private
   * @param {Array} orderItems - 주문 아이템 배열
   */
  async _restoreInventory(orderItems) {
    if (!orderItems || orderItems.length === 0) {
      this.log('재고 복원 대상 없음')
      return
    }

    for (const item of orderItems) {
      if (!item.product_id) continue

      try {
        // 양수로 재고 증가 (복원)
        await this.productRepository.updateInventory(item.product_id, item.quantity)
        this.log('재고 복원 완료', { product_id: item.product_id, quantity: item.quantity })
      } catch (error) {
        // 재고 복원 실패 시 로그만 출력하고 계속 진행
        this.log('재고 복원 실패 (계속 진행)', { product_id: item.product_id, error: error.message })
      }
    }
  }
}
