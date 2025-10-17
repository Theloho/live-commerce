/**
 * Google Analytics 이벤트 추적 유틸리티
 *
 * GA4 이벤트 참고: https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
 */

/**
 * GA가 로드되었는지 확인
 */
const isGALoaded = () => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

/**
 * 페이지뷰 추적
 * @param {string} url - 페이지 URL
 */
export const trackPageView = (url) => {
  if (isGALoaded()) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_path: url,
    })
  }
}

/**
 * 상품 상세 조회 이벤트
 * @param {Object} product - 상품 정보
 */
export const trackViewItem = (product) => {
  if (!isGALoaded()) return

  window.gtag('event', 'view_item', {
    currency: 'KRW',
    value: product.price,
    items: [
      {
        item_id: product.id,
        item_name: product.title,
        price: product.price,
        quantity: 1,
      },
    ],
  })
}

/**
 * 장바구니 추가 이벤트
 * @param {Object} product - 상품 정보
 * @param {number} quantity - 수량
 */
export const trackAddToCart = (product, quantity = 1) => {
  if (!isGALoaded()) return

  window.gtag('event', 'add_to_cart', {
    currency: 'KRW',
    value: product.price * quantity,
    items: [
      {
        item_id: product.id,
        item_name: product.title,
        price: product.price,
        quantity: quantity,
      },
    ],
  })
}

/**
 * 결제 시작 이벤트
 * @param {Array} items - 주문 아이템 배열
 * @param {number} totalAmount - 총 금액
 */
export const trackBeginCheckout = (items, totalAmount) => {
  if (!isGALoaded()) return

  const gaItems = items.map((item) => ({
    item_id: item.product_id || item.id,
    item_name: item.title,
    price: item.price,
    quantity: item.quantity,
  }))

  window.gtag('event', 'begin_checkout', {
    currency: 'KRW',
    value: totalAmount,
    items: gaItems,
  })
}

/**
 * 구매 완료 이벤트
 * @param {Object} order - 주문 정보
 */
export const trackPurchase = (order) => {
  if (!isGALoaded()) return

  const gaItems = order.items.map((item) => ({
    item_id: item.product_id || item.id,
    item_name: item.title,
    price: item.price,
    quantity: item.quantity,
  }))

  window.gtag('event', 'purchase', {
    transaction_id: order.id,
    value: order.total_amount,
    currency: 'KRW',
    shipping: order.shipping_fee || 0,
    items: gaItems,
  })
}

/**
 * 검색 이벤트
 * @param {string} searchTerm - 검색어
 */
export const trackSearch = (searchTerm) => {
  if (!isGALoaded()) return

  window.gtag('event', 'search', {
    search_term: searchTerm,
  })
}

/**
 * 커스텀 이벤트
 * @param {string} eventName - 이벤트명
 * @param {Object} params - 파라미터
 */
export const trackEvent = (eventName, params = {}) => {
  if (!isGALoaded()) return

  window.gtag('event', eventName, params)
}

/**
 * 쿠폰 사용 이벤트
 * @param {Object} coupon - 쿠폰 정보
 * @param {number} discountAmount - 할인 금액
 */
export const trackCouponUse = (coupon, discountAmount) => {
  if (!isGALoaded()) return

  window.gtag('event', 'coupon_use', {
    coupon_code: coupon.code,
    discount_type: coupon.discount_type,
    discount_amount: discountAmount,
  })
}

/**
 * 라이브 방송 시청 이벤트
 * @param {string} broadcastId - 방송 ID
 * @param {string} broadcastTitle - 방송 제목
 */
export const trackLiveView = (broadcastId, broadcastTitle) => {
  if (!isGALoaded()) return

  window.gtag('event', 'live_view', {
    broadcast_id: broadcastId,
    broadcast_title: broadcastTitle,
  })
}
