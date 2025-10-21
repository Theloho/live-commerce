/**
 * Domain Errors
 *
 * 비즈니스 로직 검증 실패 시 발생하는 에러들
 *
 * @author Claude
 * @since 2025-10-21
 * @version 1.0
 */

import { BaseError } from './BaseError'

/**
 * 재고 부족 에러
 */
export class InsufficientInventoryError extends BaseError {
  constructor(productId, requested, available) {
    super('재고가 부족합니다', {
      productId,
      requested,
      available
    })
  }

  getUserMessage() {
    return `재고가 부족합니다. (요청: ${this.context.requested}개, 재고: ${this.context.available}개)`
  }
}

/**
 * 잘못된 주문 상태 전환 에러
 */
export class InvalidOrderStatusError extends BaseError {
  constructor(orderId, currentStatus, requestedStatus) {
    super('잘못된 주문 상태 전환입니다', {
      orderId,
      currentStatus,
      requestedStatus
    })
  }

  getUserMessage() {
    return `${this.context.currentStatus} 상태에서 ${this.context.requestedStatus}로 변경할 수 없습니다.`
  }
}

/**
 * 쿠폰 사용 불가 에러
 */
export class CouponNotAvailableError extends BaseError {
  constructor(couponId, reason) {
    super('쿠폰을 사용할 수 없습니다', {
      couponId,
      reason
    })
  }

  getUserMessage() {
    return `쿠폰을 사용할 수 없습니다: ${this.context.reason}`
  }
}

/**
 * 검증 에러
 */
export class ValidationError extends BaseError {
  constructor(field, value, rule) {
    super(`${field} 검증 실패`, {
      field,
      value,
      rule
    })
  }

  getUserMessage() {
    return `${this.context.field}: ${this.context.rule}`
  }
}

/**
 * 권한 없음 에러
 */
export class UnauthorizedError extends BaseError {
  constructor(userId, action) {
    super('권한이 없습니다', {
      userId,
      action
    })
  }

  getUserMessage() {
    return '이 작업을 수행할 권한이 없습니다.'
  }
}

/**
 * 리소스를 찾을 수 없음
 */
export class NotFoundError extends BaseError {
  constructor(resource, id) {
    super(`${resource}를 찾을 수 없습니다`, {
      resource,
      id
    })
  }

  getUserMessage() {
    return `요청하신 ${this.context.resource}를 찾을 수 없습니다.`
  }
}
