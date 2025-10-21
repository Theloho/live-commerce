/**
 * OrderValidator - 주문 검증 도메인 서비스
 * @author Claude
 * @since 2025-10-21
 */

/**
 * OrderValidator - 주문 데이터 검증 로직
 */
export class OrderValidator {
  /**
   * 주문 데이터 검증
   * @param {Object} orderData - 주문 데이터 { items, totalAmount, ... }
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  static validateOrderData(orderData) {
    const errors = []

    // 주문 아이템 검증
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      errors.push('주문 아이템이 필요합니다')
      return { isValid: false, errors }
    }

    // 각 아이템 필수 필드 검증
    orderData.items.forEach((item, index) => {
      if (!item.title) {
        errors.push(`${index + 1}번째 상품의 제목이 필요합니다`)
      }

      if (!item.price && !item.unit_price && !item.totalPrice) {
        errors.push(`${index + 1}번째 상품의 가격 정보가 필요합니다`)
      }

      if (!item.quantity || item.quantity < 1) {
        errors.push(`${index + 1}번째 상품의 수량은 1개 이상이어야 합니다`)
      }

      if (item.product_id && typeof item.product_id !== 'string') {
        errors.push(`${index + 1}번째 상품의 product_id가 올바르지 않습니다`)
      }
    })

    // 총 금액 검증
    if (orderData.totalAmount !== undefined) {
      if (typeof orderData.totalAmount !== 'number' || orderData.totalAmount < 0) {
        errors.push('총 금액은 0 이상이어야 합니다')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * 배송 정보 검증
   * @param {Object} shipping - 배송 정보 { name, phone, address, postalCode, ... }
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  static validateShipping(shipping) {
    const errors = []

    if (!shipping) {
      errors.push('배송 정보가 필요합니다')
      return { isValid: false, errors }
    }

    // 받는 사람 이름 검증
    if (!shipping.name || shipping.name.trim().length === 0) {
      errors.push('받는 사람 이름이 필요합니다')
    } else if (shipping.name.length > 50) {
      errors.push('받는 사람 이름은 50자 이하여야 합니다')
    }

    // 연락처 검증
    if (!shipping.phone || shipping.phone.trim().length === 0) {
      errors.push('연락처가 필요합니다')
    } else {
      // 숫자와 하이픈만 허용 (010-1234-5678 또는 01012345678)
      const phoneRegex = /^[0-9-]+$/
      if (!phoneRegex.test(shipping.phone)) {
        errors.push('연락처는 숫자와 하이픈만 입력 가능합니다')
      }
    }

    // 주소 검증
    if (!shipping.address || shipping.address.trim().length === 0) {
      errors.push('주소가 필요합니다')
    }

    // 우편번호 검증 (선택적, 있으면 5자리 숫자)
    if (shipping.postalCode || shipping.postal_code) {
      const postalCode = shipping.postalCode || shipping.postal_code
      const postalCodeRegex = /^\d{5}$/
      if (!postalCodeRegex.test(postalCode)) {
        errors.push('우편번호는 5자리 숫자여야 합니다')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * 결제 정보 검증
   * @param {Object} payment - 결제 정보 { paymentMethod, depositorName?, ... }
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  static validatePayment(payment) {
    const errors = []

    if (!payment) {
      errors.push('결제 정보가 필요합니다')
      return { isValid: false, errors }
    }

    // 결제 방법 검증
    const validPaymentMethods = ['card', 'transfer', 'bank_transfer', 'account_transfer']
    if (!payment.paymentMethod || !validPaymentMethods.includes(payment.paymentMethod)) {
      errors.push('유효한 결제 방법을 선택해주세요 (card, transfer)')
    }

    // 무통장입금 시 입금자명 필수
    if (
      (payment.paymentMethod === 'transfer' ||
        payment.paymentMethod === 'bank_transfer' ||
        payment.paymentMethod === 'account_transfer') &&
      (!payment.depositorName && !payment.depositor_name)
    ) {
      errors.push('무통장입금 시 입금자명이 필요합니다')
    }

    // 입금자명 길이 검증
    if (payment.depositorName || payment.depositor_name) {
      const depositorName = payment.depositorName || payment.depositor_name
      if (depositorName.length > 50) {
        errors.push('입금자명은 50자 이하여야 합니다')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * 전체 주문 검증 (orderData + shipping + payment)
   * @param {Object} order - { orderData, shipping, payment }
   * @returns {Object} { isValid: boolean, errors: Object }
   */
  static validateOrder(order) {
    const orderDataResult = this.validateOrderData(order.orderData || order)
    const shippingResult = this.validateShipping(order.shipping)
    const paymentResult = this.validatePayment(order.payment)

    return {
      isValid: orderDataResult.isValid && shippingResult.isValid && paymentResult.isValid,
      errors: {
        orderData: orderDataResult.errors,
        shipping: shippingResult.errors,
        payment: paymentResult.errors,
      },
    }
  }
}
