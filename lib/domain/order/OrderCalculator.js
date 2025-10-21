/**
 * OrderCalculator - 주문 계산 도메인 서비스
 * @author Claude
 * @since 2025-10-21
 */

/**
 * OrderCalculator - 주문 금액 계산 로직
 */
export class OrderCalculator {
  /**
   * 상품 아이템 총액 계산
   * @param {Array} items - 주문 아이템 배열
   * @returns {number} 총 상품 금액
   */
  static calculateItemsTotal(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return 0
    }

    return items.reduce((sum, item) => {
      const itemTotal =
        item.total ||
        (item.price && item.quantity ? item.price * item.quantity : 0) ||
        item.totalPrice ||
        (item.unit_price && item.quantity ? item.unit_price * item.quantity : 0) ||
        0

      return sum + itemTotal
    }, 0)
  }

  /**
   * 배송비 계산 (우편번호 기반 도서산간 추가비 포함)
   * @param {number} itemsTotal - 상품 총액
   * @param {string} postalCodeOrRegion - 우편번호(5자리) 또는 지역명
   * @param {number} baseShippingFee - 기본 배송비 (무료배송 시 0)
   * @returns {number} 배송비
   */
  static calculateShipping(itemsTotal, postalCodeOrRegion = 'normal', baseShippingFee = 4000) {
    // 우편번호인 경우 (5자리 숫자) - shippingUtils 사용
    if (/^\d{5}$/.test(postalCodeOrRegion)) {
      const { formatShippingInfo } = require('../../shippingUtils')
      const shippingInfo = formatShippingInfo(baseShippingFee, postalCodeOrRegion)
      return shippingInfo.totalShipping
    }

    // 지역명인 경우 ('제주', '울릉도/독도', '도서산간')
    if (postalCodeOrRegion === '제주') {
      const { formatShippingInfo } = require('../../shippingUtils')
      const shippingInfo = formatShippingInfo(baseShippingFee, '63000')
      return shippingInfo.totalShipping
    } else if (postalCodeOrRegion === '울릉도/독도') {
      const { formatShippingInfo } = require('../../shippingUtils')
      const shippingInfo = formatShippingInfo(baseShippingFee, '40200')
      return shippingInfo.totalShipping
    } else if (postalCodeOrRegion === '도서산간') {
      const surcharge = baseShippingFee > 0 ? 5000 : 0
      return baseShippingFee + surcharge
    }

    // 레거시 호환: 'normal', 'remote', 'island'
    const regionFees = {
      normal: 0,
      remote: 5000,
      island: 5000,
    }

    const surcharge = baseShippingFee > 0 ? regionFees[postalCodeOrRegion] || 0 : 0
    return baseShippingFee + surcharge
  }

  /**
   * 쿠폰 할인 계산 (배송비 제외, 상품 금액에만 적용)
   * @param {number} itemsTotal - 상품 금액
   * @param {Object} coupon - 쿠폰 정보 { type, value, maxDiscount? }
   * @returns {Object} { discountAmount, itemsTotalAfterDiscount }
   */
  static calculateDiscount(itemsTotal, coupon = null) {
    if (!coupon || !coupon.type || !coupon.value) {
      return {
        discountAmount: 0,
        itemsTotalAfterDiscount: itemsTotal,
      }
    }

    let discountAmount = 0

    if (coupon.type === 'percentage') {
      discountAmount = Math.floor(itemsTotal * (coupon.value / 100))

      // 최대 할인 금액 제한
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount
      }
    } else if (coupon.type === 'fixed_amount') {
      discountAmount = Math.min(coupon.value, itemsTotal)
    }

    return {
      discountAmount,
      itemsTotalAfterDiscount: itemsTotal - discountAmount,
    }
  }

  /**
   * 무료배송 조건 확인
   * @param {number} itemsTotal - 상품 총액
   * @param {number} freeShippingThreshold - 무료배송 기준 금액 (기본 30,000원)
   * @returns {boolean} 무료배송 해당 여부
   */
  static checkFreeShipping(itemsTotal, freeShippingThreshold = 30000) {
    return itemsTotal >= freeShippingThreshold
  }

  /**
   * 최종 주문 금액 계산 (쿠폰 할인 + 배송비 포함)
   * @param {Array} items - 주문 아이템 배열
   * @param {Object} options - { region?, coupon?, paymentMethod?, baseShippingFee?, freeShippingThreshold? }
   * @returns {Object} 완전한 주문 계산 결과
   */
  static calculateFinalAmount(items, options = {}) {
    const {
      region = 'normal',
      coupon = null,
      paymentMethod = 'transfer',
      baseShippingFee = 4000,
      freeShippingThreshold = 30000,
    } = options

    // 1. 상품 금액 계산
    const itemsTotal = this.calculateItemsTotal(items)

    // 2. 쿠폰 할인 적용
    const { discountAmount, itemsTotalAfterDiscount } = this.calculateDiscount(itemsTotal, coupon)

    // 3. 무료배송 조건 확인
    const isFreeShipping = this.checkFreeShipping(itemsTotal, freeShippingThreshold)
    const finalBaseShippingFee = isFreeShipping ? 0 : baseShippingFee

    // 4. 배송비 계산
    const shippingFee = this.calculateShipping(itemsTotal, region, finalBaseShippingFee)

    // 5. 최종 금액 계산 (할인된 상품금액 + 배송비)
    const totalBeforeVAT = itemsTotalAfterDiscount + shippingFee

    // 6. 카드결제 시 부가세 추가
    let finalAmount = totalBeforeVAT
    let vat = 0
    if (paymentMethod === 'card') {
      vat = Math.floor(totalBeforeVAT * 0.1)
      finalAmount = totalBeforeVAT + vat
    }

    return {
      itemsTotal,
      couponDiscount: discountAmount,
      itemsTotalAfterDiscount,
      isFreeShipping,
      shippingFee,
      subtotal: totalBeforeVAT,
      vat,
      finalAmount,
      paymentMethod,
      couponApplied: !!coupon,
    }
  }

  /**
   * 주문 아이템 데이터 정규화
   * @param {Array} items - 원본 주문 아이템 배열
   * @returns {Array} 정규화된 주문 아이템 배열
   */
  static normalizeItems(items) {
    if (!Array.isArray(items)) {
      return []
    }

    return items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      title: item.title || item.product?.title || '상품명 미확인',
      quantity: item.quantity || 1,
      price: item.price || item.unit_price || 0,
      total: item.total || item.total_price || (item.price || item.unit_price || 0) * (item.quantity || 1),
      selected_options: item.selected_options || {},
      variant_title: item.variant_title || null,
      sku: item.sku || null,
      unit_price: item.unit_price || item.price || 0,
      total_price: item.total_price || item.total || 0,
    }))
  }
}
