/**
 * 주문 계산 로직 통합 모듈
 * 모든 주문 관련 계산을 중앙화하여 일관성 보장
 */

export class OrderCalculations {
  /**
   * 상품 아이템 총액 계산
   * @param {array} items - 주문 아이템 배열
   * @returns {number} 총 상품 금액
   */
  static calculateItemsTotal(items) {
    if (!Array.isArray(items) || items.length === 0) {
      console.warn('📦 주문 아이템이 없습니다')
      return 0
    }

    const total = items.reduce((sum, item) => {
      // 신규 스키마 우선, 구 스키마 fallback
      const itemTotal = item.total ||
                       (item.price && item.quantity ? item.price * item.quantity : 0) ||
                       item.totalPrice ||
                       (item.unit_price && item.quantity ? item.unit_price * item.quantity : 0) ||
                       0

      console.log(`💰 ${item.title || item.product?.title || '상품'}: ₩${itemTotal.toLocaleString()} (수량: ${item.quantity})`)
      return sum + itemTotal
    }, 0)

    console.log(`📊 총 상품금액: ₩${total.toLocaleString()}`)
    return total
  }

  /**
   * 배송비 계산
   * @param {number} itemsTotal - 상품 총액
   * @param {string} region - 배송 지역 ('normal'|'remote'|'island')
   * @returns {number} 배송비
   */
  static calculateShippingFee(itemsTotal, region = 'normal') {
    // 기본 배송비
    const baseShippingFee = 4000

    // 지역별 추가 배송비 (향후 확장용)
    const regionFees = {
      normal: 0,      // 일반 지역
      remote: 2000,   // 도서산간
      island: 4000    // 특수 지역
    }

    const totalShippingFee = baseShippingFee + (regionFees[region] || 0)
    console.log(`🚚 배송비 (${region}): ₩${totalShippingFee.toLocaleString()}`)

    return totalShippingFee
  }

  /**
   * 총 주문 금액 계산
   * @param {array} items - 주문 아이템 배열
   * @param {string} region - 배송 지역
   * @returns {object} 계산 결과 객체
   */
  static calculateOrderTotal(items, region = 'normal') {
    const itemsTotal = this.calculateItemsTotal(items)
    const shippingFee = this.calculateShippingFee(itemsTotal, region)
    const totalAmount = itemsTotal + shippingFee

    const result = {
      itemsTotal,
      shippingFee,
      totalAmount,
      breakdown: {
        상품금액: itemsTotal,
        배송비: shippingFee,
        총결제금액: totalAmount
      }
    }

    console.log('🧮 주문 계산 완료:', result.breakdown)
    return result
  }

  /**
   * 그룹 주문 계산 (여러 주문을 묶어서 계산)
   * @param {array} orders - 주문 배열
   * @returns {object} 그룹 계산 결과
   */
  static calculateGroupOrderTotal(orders) {
    if (!Array.isArray(orders) || orders.length === 0) {
      console.warn('📦 그룹 주문이 없습니다')
      return {
        totalItemsAmount: 0,
        totalShippingFee: 0,
        totalAmount: 0,
        orderCount: 0
      }
    }

    let totalItemsAmount = 0
    let totalShippingFee = 0

    orders.forEach((order, index) => {
      console.log(`🔍 그룹 주문 ${index + 1} 계산 중...`)
      const orderCalc = this.calculateOrderTotal(order.items || order.order_items)
      totalItemsAmount += orderCalc.itemsTotal
      totalShippingFee += orderCalc.shippingFee
    })

    const result = {
      totalItemsAmount,
      totalShippingFee,
      totalAmount: totalItemsAmount + totalShippingFee,
      orderCount: orders.length
    }

    console.log('📊 그룹 주문 계산 완료:', {
      주문수: result.orderCount,
      총상품금액: `₩${result.totalItemsAmount.toLocaleString()}`,
      총배송비: `₩${result.totalShippingFee.toLocaleString()}`,
      총결제금액: `₩${result.totalAmount.toLocaleString()}`
    })

    return result
  }

  /**
   * 카드결제 부가세 포함 계산
   * @param {number} baseAmount - 기본 금액
   * @returns {number} 부가세 포함 금액
   */
  static calculateCardAmount(baseAmount) {
    const cardAmount = Math.floor(baseAmount * 1.1) // 부가세 10%
    console.log(`💳 카드결제 금액 (부가세 포함): ₩${cardAmount.toLocaleString()} (기본: ₩${baseAmount.toLocaleString()})`)
    return cardAmount
  }

  /**
   * 입금 금액 계산 (계좌이체용)
   * @param {array} items - 주문 아이템 배열
   * @param {string} region - 배송 지역
   * @returns {object} 계산 결과
   */
  static calculateDepositAmount(items, region = 'normal') {
    const orderCalc = this.calculateOrderTotal(items, region)

    return {
      ...orderCalc,
      depositAmount: orderCalc.totalAmount, // 계좌이체는 부가세 없음
      displayText: `입금금액: ₩${orderCalc.totalAmount.toLocaleString()}`
    }
  }

  /**
   * 주문 아이템 데이터 정규화
   * 다양한 스키마 형태를 통일된 형태로 변환
   * @param {array} items - 원본 주문 아이템 배열
   * @returns {array} 정규화된 주문 아이템 배열
   */
  static normalizeOrderItems(items) {
    if (!Array.isArray(items)) {
      console.warn('⚠️ 주문 아이템이 배열이 아닙니다:', typeof items)
      return []
    }

    return items.map(item => ({
      id: item.id,
      product_id: item.product_id,
      title: item.title || item.product?.title || '상품명 미확인',
      quantity: item.quantity || 1,
      price: item.price || item.unit_price || 0,
      total: item.total || item.total_price || (item.price || item.unit_price || 0) * (item.quantity || 1),
      selected_options: item.selected_options || {},
      variant_title: item.variant_title || null,
      sku: item.sku || null,
      // 추가 필드들 (호환성)
      unit_price: item.unit_price || item.price || 0,
      total_price: item.total_price || item.total || 0,
      totalPrice: item.totalPrice || item.total || item.total_price || 0
    }))
  }

  /**
   * 결제 방법별 최종 금액 계산
   * @param {array} items - 주문 아이템 배열
   * @param {string} paymentMethod - 결제 방법 ('card' | 'transfer')
   * @param {string} region - 배송 지역
   * @returns {object} 결제 방법별 계산 결과
   */
  static calculateFinalAmount(items, paymentMethod = 'transfer', region = 'normal') {
    const baseCalc = this.calculateOrderTotal(items, region)

    if (paymentMethod === 'card') {
      const cardAmount = this.calculateCardAmount(baseCalc.totalAmount)
      return {
        ...baseCalc,
        finalAmount: cardAmount,
        paymentMethod: 'card',
        note: '부가세 10% 포함'
      }
    } else {
      return {
        ...baseCalc,
        finalAmount: baseCalc.totalAmount,
        paymentMethod: 'transfer',
        note: '계좌이체'
      }
    }
  }

  /**
   * 할인 적용 계산 (향후 쿠폰 시스템 확장용)
   * @param {number} baseAmount - 기본 금액
   * @param {object} discount - 할인 정보
   * @returns {object} 할인 적용 결과
   */
  static applyDiscount(baseAmount, discount = null) {
    if (!discount) {
      return {
        originalAmount: baseAmount,
        discountAmount: 0,
        finalAmount: baseAmount
      }
    }

    let discountAmount = 0

    if (discount.type === 'percent') {
      discountAmount = Math.floor(baseAmount * (discount.value / 100))
    } else if (discount.type === 'fixed') {
      discountAmount = Math.min(discount.value, baseAmount)
    }

    return {
      originalAmount: baseAmount,
      discountAmount,
      finalAmount: baseAmount - discountAmount,
      discountInfo: discount
    }
  }
}

export default OrderCalculations