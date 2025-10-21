/**
 * Order Entity - 주문 도메인 모델
 * @author Claude
 * @since 2025-10-21
 */

import { Entity } from '../Entity'

export const OrderStatus = {
  PENDING: 'pending',
  VERIFYING: 'verifying',
  DEPOSITED: 'deposited',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
}

/**
 * Order Entity - 주문 비즈니스 로직 포함
 */
export class Order extends Entity {
  constructor({
    id,
    customer_order_number,
    status,
    user_id = null,
    order_type = null,
    total_amount,
    discount_amount = 0,
    shipping_cost = 0,
    depositor_name = null,
    created_at = new Date(),
    updated_at = new Date(),
  }) {
    super(id)

    this.customer_order_number = customer_order_number
    this.status = status
    this.user_id = user_id
    this.order_type = order_type
    this.total_amount = total_amount
    this.discount_amount = discount_amount
    this.shipping_cost = shipping_cost
    this.depositor_name = depositor_name
    this.created_at = created_at instanceof Date ? created_at : new Date(created_at)
    this.updated_at = updated_at instanceof Date ? updated_at : new Date(updated_at)
  }

  /** 주문 검증 */
  validate() {
    // 필수 필드 검증
    if (!this.customer_order_number) {
      throw new Error('주문 번호는 필수입니다.')
    }

    // 상태 검증
    if (!Object.values(OrderStatus).includes(this.status)) {
      throw new Error(`잘못된 주문 상태: ${this.status}`)
    }

    // 금액 검증
    if (typeof this.total_amount !== 'number' || this.total_amount < 0) {
      throw new Error('총 금액은 0 이상이어야 합니다.')
    }

    if (typeof this.discount_amount !== 'number' || this.discount_amount < 0) {
      throw new Error('할인 금액은 0 이상이어야 합니다.')
    }

    if (typeof this.shipping_cost !== 'number' || this.shipping_cost < 0) {
      throw new Error('배송비는 0 이상이어야 합니다.')
    }

    // 카카오 사용자 검증
    if (!this.user_id && !this.order_type) {
      throw new Error('user_id 또는 order_type 중 하나는 필수입니다.')
    }
  }

  /** 주문 취소 가능 여부 (pending/verifying만) */
  canBeCancelled() {
    return [OrderStatus.PENDING, OrderStatus.VERIFYING].includes(this.status)
  }

  isPending() {
    return this.status === OrderStatus.PENDING
  }

  isVerifying() {
    return this.status === OrderStatus.VERIFYING
  }

  isDeposited() {
    return this.status === OrderStatus.DEPOSITED
  }

  isDelivered() {
    return this.status === OrderStatus.DELIVERED
  }

  isCancelled() {
    return this.status === OrderStatus.CANCELLED
  }

  /** 카카오 사용자 주문 여부 */
  isKakaoOrder() {
    return !this.user_id && this.order_type && this.order_type.startsWith('direct:KAKAO:')
  }

  /** Plain Object로 변환 (DB 저장/JSON 직렬화) */
  toJSON() {
    return {
      id: this.id,
      customer_order_number: this.customer_order_number,
      status: this.status,
      user_id: this.user_id,
      order_type: this.order_type,
      total_amount: this.total_amount,
      discount_amount: this.discount_amount,
      shipping_cost: this.shipping_cost,
      depositor_name: this.depositor_name,
      created_at: this.created_at.toISOString(),
      updated_at: this.updated_at.toISOString(),
    }
  }

  /** Plain Object에서 Order Entity 생성 (DB 조회 결과 → Entity) */
  static fromJSON(data) {
    return new Order({
      id: data.id,
      customer_order_number: data.customer_order_number,
      status: data.status,
      user_id: data.user_id,
      order_type: data.order_type,
      total_amount: data.total_amount,
      discount_amount: data.discount_amount,
      shipping_cost: data.shipping_cost,
      depositor_name: data.depositor_name,
      created_at: data.created_at,
      updated_at: data.updated_at,
    })
  }
}
