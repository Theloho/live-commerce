/**
 * 주문 계산 로직 통합 모듈
 * 모든 주문 관련 계산을 중앙화하여 일관성 보장
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export class OrderCalculations {
  /**
   * 상품 아이템 총액 계산
   * @param {array} items - 주문 아이템 배열
   * @returns {number} 총 상품 금액
   */
  static calculateItemsTotal(items) {
    if (!Array.isArray(items) || items.length === 0) {
      if (isDevelopment) console.warn('📦 주문 아이템이 없습니다')
      return 0
    }

    const total = items.reduce((sum, item) => {
      // 신규 스키마 우선, 구 스키마 fallback
      const itemTotal = item.total ||
                       (item.price && item.quantity ? item.price * item.quantity : 0) ||
                       item.totalPrice ||
                       (item.unit_price && item.quantity ? item.unit_price * item.quantity : 0) ||
                       0

      if (isDevelopment) console.log(`💰 ${item.title || item.product?.title || '상품'}: ₩${itemTotal.toLocaleString()} (수량: ${item.quantity})`)
      return sum + itemTotal
    }, 0)

    if (isDevelopment) console.log(`📊 총 상품금액: ₩${total.toLocaleString()}`)
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
    if (isDevelopment) console.log(`🚚 배송비 (${region}): ₩${totalShippingFee.toLocaleString()}`)

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

    if (isDevelopment) console.log('🧮 주문 계산 완료:', result.breakdown)
    return result
  }

  /**
   * 그룹 주문 계산 (여러 주문을 묶어서 계산)
   * @param {array} orders - 주문 배열
   * @returns {object} 그룹 계산 결과
   */
  static calculateGroupOrderTotal(orders) {
    if (!Array.isArray(orders) || orders.length === 0) {
      if (isDevelopment) console.warn('📦 그룹 주문이 없습니다')
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
      if (isDevelopment) console.log(`🔍 그룹 주문 ${index + 1} 계산 중...`)
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

    if (isDevelopment) console.log('📊 그룹 주문 계산 완료:', {
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
    if (isDevelopment) console.log(`💳 카드결제 금액 (부가세 포함): ₩${cardAmount.toLocaleString()} (기본: ₩${baseAmount.toLocaleString()})`)
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
      if (isDevelopment) console.warn('⚠️ 주문 아이템이 배열이 아닙니다:', typeof items)
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
   * 쿠폰 할인 적용 계산 (배송비 제외!)
   * 주의: 쿠폰 할인은 상품 금액에만 적용되며, 배송비는 할인 대상이 아닙니다.
   * @param {number} itemsTotal - 상품 금액 (배송비 제외)
   * @param {object} coupon - 쿠폰 정보 { type: 'fixed_amount'|'percentage', value: number, maxDiscount?: number }
   * @returns {object} 할인 적용 결과
   */
  static applyCouponDiscount(itemsTotal, coupon = null) {
    if (!coupon || !coupon.type || !coupon.value) {
      if (isDevelopment) console.log('🎟️ 쿠폰 없음 - 할인 없음')
      return {
        itemsTotal,
        discountAmount: 0,
        itemsTotalAfterDiscount: itemsTotal,
        couponApplied: false
      }
    }

    let discountAmount = 0

    if (coupon.type === 'percentage') {
      // 퍼센트 할인: 상품 금액의 X% (배송비 제외!)
      discountAmount = Math.floor(itemsTotal * (coupon.value / 100))

      // 최대 할인 금액 제한
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount
        if (isDevelopment) console.log(`🎟️ 퍼센트 할인 (최대 제한 적용): ₩${itemsTotal.toLocaleString()} × ${coupon.value}% = ₩${discountAmount.toLocaleString()} (최대 ₩${coupon.maxDiscount.toLocaleString()})`)
      } else {
        if (isDevelopment) console.log(`🎟️ 퍼센트 할인: ₩${itemsTotal.toLocaleString()} × ${coupon.value}% = ₩${discountAmount.toLocaleString()}`)
      }
    } else if (coupon.type === 'fixed_amount') {
      // 금액 할인: 쿠폰 금액과 상품 금액 중 작은 값
      discountAmount = Math.min(coupon.value, itemsTotal)
      if (isDevelopment) console.log(`🎟️ 금액 할인: MIN(₩${coupon.value.toLocaleString()}, ₩${itemsTotal.toLocaleString()}) = ₩${discountAmount.toLocaleString()}`)
    }

    const result = {
      itemsTotal,
      discountAmount,
      itemsTotalAfterDiscount: itemsTotal - discountAmount,
      couponApplied: true,
      couponInfo: {
        type: coupon.type,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount,
        code: coupon.code || 'UNKNOWN'
      }
    }

    if (isDevelopment) console.log('🎟️ 쿠폰 할인 적용 완료:', {
      상품금액: `₩${result.itemsTotal.toLocaleString()}`,
      할인금액: `₩${result.discountAmount.toLocaleString()}`,
      할인후상품금액: `₩${result.itemsTotalAfterDiscount.toLocaleString()}`
    })

    return result
  }

  /**
   * 최종 주문 금액 계산 (쿠폰 할인 포함)
   * @param {array} items - 주문 아이템 배열
   * @param {object} options - 계산 옵션 { region?: string, coupon?: object, paymentMethod?: string }
   * @returns {object} 완전한 주문 계산 결과
   */
  static calculateFinalOrderAmount(items, options = {}) {
    const { region = 'normal', coupon = null, paymentMethod = 'transfer' } = options

    // 1. 상품 금액 계산
    const itemsTotal = this.calculateItemsTotal(items)

    // 2. 쿠폰 할인 적용 (배송비 제외!)
    const couponResult = this.applyCouponDiscount(itemsTotal, coupon)

    // 3. 배송비 계산
    const shippingFee = this.calculateShippingFee(itemsTotal, region)

    // 4. 최종 금액 계산 (할인된 상품금액 + 배송비)
    const totalBeforeVAT = couponResult.itemsTotalAfterDiscount + shippingFee

    // 5. 카드결제 시 부가세 추가
    let finalAmount = totalBeforeVAT
    let vat = 0
    if (paymentMethod === 'card') {
      vat = Math.floor(totalBeforeVAT * 0.1)
      finalAmount = totalBeforeVAT + vat
    }

    const result = {
      itemsTotal: itemsTotal,
      couponDiscount: couponResult.discountAmount,
      itemsTotalAfterDiscount: couponResult.itemsTotalAfterDiscount,
      shippingFee: shippingFee,
      subtotal: totalBeforeVAT,
      vat: vat,
      finalAmount: finalAmount,
      paymentMethod: paymentMethod,
      couponApplied: couponResult.couponApplied,
      breakdown: {
        상품금액: itemsTotal,
        쿠폰할인: couponResult.discountAmount,
        할인후상품금액: couponResult.itemsTotalAfterDiscount,
        배송비: shippingFee,
        부가세: vat,
        최종결제금액: finalAmount
      }
    }

    if (isDevelopment) console.log('🧮 최종 주문 계산 완료:', result.breakdown)
    return result
  }

  /**
   * 할인 적용 계산 (레거시 - 호환성 유지)
   * @deprecated calculateFinalOrderAmount 또는 applyCouponDiscount 사용 권장
   */
  static applyDiscount(baseAmount, discount = null) {
    if (isDevelopment) console.warn('⚠️ applyDiscount는 deprecated입니다. calculateFinalOrderAmount 사용을 권장합니다.')

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