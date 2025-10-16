/**
 * 배송 취합 관리 - 합배송 그룹핑 로직
 *
 * 같은 고객 + 같은 배송지 = 합배송 그룹으로 자동 묶음
 *
 * @param {Array} orders - 주문 배열 (status: 'paid')
 * @returns {Object} { merged: [], singles: [], total: N }
 */

export function groupOrdersByShipping(orders) {
  const groupMap = new Map()

  // 1단계: 입금확인 완료 주문만 필터
  const paidOrders = orders.filter(o => o.status === 'paid')

  // 2단계: 배송지 정보로 그룹 키 생성
  paidOrders.forEach(order => {
    // 배송지 정보 추출 (우선순위: shipping_* 컬럼 > order_shipping)
    const name = (order.shipping_name || order.order_shipping?.[0]?.name || '').toLowerCase().trim()
    const postalCode = (order.shipping_postal_code || order.order_shipping?.[0]?.postal_code || '').trim()
    const address = (order.shipping_address || order.order_shipping?.[0]?.address || '').toLowerCase().trim()
    const detailAddress = (order.shipping_detail_address || order.order_shipping?.[0]?.detail_address || '').toLowerCase().trim()

    // 그룹 키: 고객명 + 우편번호 + 주소 + 상세주소 (모두 일치해야 합배송)
    const key = [name, postalCode, address, detailAddress].join('|')

    if (!groupMap.has(key)) {
      groupMap.set(key, [])
    }
    groupMap.get(key).push(order)
  })

  // 3단계: 2개 이상 = 합배송(merged), 1개 = 단일(singles)
  const merged = []
  const singles = []

  groupMap.forEach((groupOrders, key) => {
    if (groupOrders.length >= 2) {
      // 합배송 그룹
      const groupData = createGroupData(groupOrders, 'merged')
      merged.push(groupData)
    } else {
      // 단일 배송
      const groupData = createGroupData(groupOrders, 'single')
      singles.push(groupData)
    }
  })

  // 4단계: 최신 주문부터 정렬
  merged.sort((a, b) => new Date(b.latestOrderDate) - new Date(a.latestOrderDate))
  singles.sort((a, b) => new Date(b.latestOrderDate) - new Date(a.latestOrderDate))

  return {
    merged,
    singles,
    total: merged.length + singles.length,
    totalOrders: paidOrders.length
  }
}

/**
 * 그룹 데이터 생성 (합배송/단일 공통)
 */
function createGroupData(orders, type) {
  const firstOrder = orders[0]

  // 배송지 정보 - profiles 테이블에서 fallback
  const profile = firstOrder.profiles || {}
  const payment = firstOrder.order_payments?.[0] || {}

  const shippingInfo = {
    name: firstOrder.shipping_name || firstOrder.order_shipping?.[0]?.name || profile.name || '이름없음',
    nickname: profile.nickname || profile.name || '-',
    phone: firstOrder.shipping_phone || firstOrder.order_shipping?.[0]?.phone || profile.phone || '연락처없음',
    depositorName: payment.depositor_name || profile.name || '-',
    postalCode: firstOrder.shipping_postal_code || firstOrder.order_shipping?.[0]?.postal_code || profile.postal_code || '',
    address: firstOrder.shipping_address || firstOrder.order_shipping?.[0]?.address || profile.address || '주소없음',
    detailAddress: firstOrder.shipping_detail_address || firstOrder.order_shipping?.[0]?.detail_address || ''
  }

  // 그룹 ID 생성
  const groupId = `G${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // 전체 제품 리스트 (모든 주문의 order_items 통합)
  const allItems = []
  let totalAmount = 0
  let totalQuantity = 0

  orders.forEach(order => {
    const orderAmount = order.order_payments?.[0]?.amount || order.payment?.amount || order.total_amount || 0
    totalAmount += orderAmount

    // 주문의 order_items 추가 (제품 이미지, 옵션 포함)
    const items = order.order_items?.map(item => {
      const quantity = item.quantity || 1
      totalQuantity += quantity

      // Variant 옵션 파싱
      const variantOptions = item.product_variants?.variant_option_values?.map(vov => ({
        name: vov.product_option_values?.product_options?.name || '',
        value: vov.product_option_values?.value || ''
      })) || []

      // Legacy 옵션
      const selectedOptions = item.selected_options || {}

      // 옵션 표시 문자열
      const optionDisplay = variantOptions.length > 0
        ? variantOptions.map(opt => `${opt.name}:${opt.value}`).join(' / ')
        : Object.entries(selectedOptions).map(([k, v]) => `${k}:${v}`).join(' / ')

      // 제품 번호 + 제품명
      const productNumber = item.products?.product_number || ''
      const productTitle = item.products?.title || item.title || '제품명 없음'
      const productDisplayName = productNumber
        ? `${productNumber} - ${productTitle}`
        : productTitle

      return {
        id: item.id,
        orderId: order.id,
        orderNumber: order.customer_order_number,
        productId: item.product_id,
        productNumber,
        productName: productTitle,
        productDisplayName,
        productImage: item.products?.thumbnail_url || null,
        sku: item.product_variants?.sku || item.products?.sku || '',
        variantOptions,
        selectedOptions,
        optionDisplay: optionDisplay || '옵션 없음',
        quantity,
        unitPrice: item.unit_price || item.price || 0,
        totalPrice: (item.unit_price || item.price || 0) * quantity
      }
    }) || []

    allItems.push(...items)
  })

  // 송장번호 (첫 번째 주문 기준)
  const trackingNumber = firstOrder.shipping?.tracking_number ||
                        firstOrder.order_shipping?.[0]?.tracking_number ||
                        null
  const trackingCompany = firstOrder.shipping?.tracking_company ||
                         firstOrder.order_shipping?.[0]?.tracking_company ||
                         'hanjin'

  return {
    type, // 'merged' or 'single'
    groupId,
    orders, // 원본 주문 배열
    orderCount: orders.length,
    shippingInfo,
    allItems,
    totalAmount,
    totalQuantity,
    uniqueProducts: allItems.length,
    trackingNumber,
    trackingCompany,
    latestOrderDate: orders[0].created_at,
    orderNumbers: orders.map(o => o.customer_order_number || o.id.slice(-8)).join(', ')
  }
}

/**
 * 선택된 주문들의 CSV 데이터 생성 (그룹 단위)
 */
export function generateGroupCSV(groups, selectedOrderIds) {
  const headers = ['그룹ID', '주문번호들', '고객명', '닉네임', '연락처', '입금자명', '주소', '제품목록', '옵션', 'SKU', '총수량', '총금액', '배송타입', '송장번호']

  const rows = groups.map(group => {
    // 선택된 주문만 필터
    const selectedOrders = group.orders.filter(o => selectedOrderIds.has(o.id))
    if (selectedOrders.length === 0) return null

    // 선택된 주문의 제품들만
    const selectedItems = group.allItems.filter(item => selectedOrderIds.has(item.orderId))

    const orderNumbers = selectedOrders.map(o => o.customer_order_number || o.id.slice(-8)).join(',')
    const fullAddress = group.shippingInfo.postalCode
      ? `[${group.shippingInfo.postalCode}] ${group.shippingInfo.address} ${group.shippingInfo.detailAddress}`
      : `${group.shippingInfo.address} ${group.shippingInfo.detailAddress}`

    const productNames = selectedItems.map(item => `${item.productDisplayName}(${item.quantity})`).join('; ')
    const optionList = selectedItems.map(item => item.optionDisplay).join('; ')
    const skuList = selectedItems.map(item => item.sku).filter(Boolean).join('; ')
    const totalQty = selectedItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalAmt = selectedItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const deliveryType = group.type === 'merged' ? '합배송' : '단일'

    return [
      group.groupId,
      `"${orderNumbers}"`,
      group.shippingInfo.name,
      group.shippingInfo.nickname,
      group.shippingInfo.phone,
      group.shippingInfo.depositorName,
      `"${fullAddress}"`,
      `"${productNames}"`,
      `"${optionList}"`,
      `"${skuList}"`,
      totalQty,
      totalAmt,
      deliveryType,
      group.trackingNumber || ''
    ]
  }).filter(Boolean)

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return '\uFEFF' + csvContent // UTF-8 BOM
}

/**
 * 선택된 주문들의 CSV 데이터 생성 (개별 주문 단위)
 */
export function generateOrderCSV(groups, selectedOrderIds) {
  const headers = ['주문번호', '고객명', '닉네임', '연락처', '입금자명', '주소', '제품명', '옵션', 'SKU', '수량', '금액', '그룹ID', '배송타입', '송장번호']

  const rows = []

  groups.forEach(group => {
    group.orders.forEach(order => {
      if (!selectedOrderIds.has(order.id)) return

      const items = group.allItems.filter(item => item.orderId === order.id)
      const fullAddress = group.shippingInfo.postalCode
        ? `[${group.shippingInfo.postalCode}] ${group.shippingInfo.address} ${group.shippingInfo.detailAddress}`
        : `${group.shippingInfo.address} ${group.shippingInfo.detailAddress}`

      items.forEach(item => {
        rows.push([
          order.customer_order_number || order.id.slice(-8),
          group.shippingInfo.name,
          group.shippingInfo.nickname,
          group.shippingInfo.phone,
          group.shippingInfo.depositorName,
          `"${fullAddress}"`,
          `"${item.productDisplayName}"`,
          `"${item.optionDisplay}"`,
          item.sku,
          item.quantity,
          item.totalPrice,
          group.groupId,
          group.type === 'merged' ? '합배송' : '단일',
          group.trackingNumber || ''
        ])
      })
    })
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return '\uFEFF' + csvContent // UTF-8 BOM
}
