/**
 * 물류팀 - 제품 집계 및 업체별 발주 준비
 *
 * 입금확인 완료 주문의 제품들을 다음 기준으로 집계:
 * 1. 제품명 (같은 제품끼리 그룹)
 * 2. 옵션 (색상, 사이즈 등 variant별로 구분)
 * 3. 업체 (같은 옵션이라도 업체별로 분리)
 *
 * @param {Array} orders - 주문 배열 (status: 'paid')
 * @returns {Object} { products: [], totalProducts: N, totalQuantity: N, suppliers: [] }
 */

export function aggregateProductsForLogistics(orders) {
  const productMap = new Map()
  const supplierSet = new Set()

  // 1단계: 입금확인 완료 주문만 필터
  const paidOrders = orders.filter(o => o.status === 'paid')

  // 2단계: 제품별로 집계
  paidOrders.forEach(order => {
    order.order_items?.forEach(item => {
      const product = item.products
      if (!product) return

      const productId = product.id
      const productName = product.title || '제품명 없음'
      const productImage = product.thumbnail_url || null
      const productNumber = product.product_number || ''
      const supplierProductCode = product.supplier_product_code || ''

      // 제품이 처음 등장하면 초기화
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          productId,
          productName,
          productImage,
          productNumber,
          supplierProductCode,
          variants: new Map()
        })
      }

      const productData = productMap.get(productId)

      // Variant 정보 추출
      const variant = item.product_variants
      const variantId = variant?.id || 'no-variant'
      const sku = variant?.sku || product.sku || ''

      // 옵션 정보 파싱 (배송팀과 동일한 로직)
      const variantOptions = variant?.variant_option_values?.map(vov => ({
        name: vov.product_option_values?.product_options?.name || '',
        value: vov.product_option_values?.value || ''
      })) || []

      const selectedOptions = item.selected_options || {}

      const optionDisplay = variantOptions.length > 0
        ? variantOptions.map(opt => `${opt.name}:${opt.value}`).join(' / ')
        : Object.entries(selectedOptions).map(([k, v]) => `${k}:${v}`).join(' / ')

      // Variant 키 생성 (같은 옵션 = 같은 variant)
      const variantKey = variantId

      // Variant가 처음 등장하면 초기화
      if (!productData.variants.has(variantKey)) {
        productData.variants.set(variantKey, {
          variantId,
          sku,
          variantOptions,
          selectedOptions,
          optionDisplay: optionDisplay || '옵션 없음',
          suppliers: new Map()
        })
      }

      const variantData = productData.variants.get(variantKey)

      // 업체 정보
      const supplierId = product.supplier_id || 'no-supplier'
      const supplier = product.suppliers || {}
      const supplierName = supplier.name || '업체 미지정'
      const supplierCode = supplier.code || ''

      // 업체가 처음 등장하면 초기화
      if (!variantData.suppliers.has(supplierId)) {
        variantData.suppliers.set(supplierId, {
          supplierId,
          supplierName,
          supplierCode,
          quantity: 0,
          orders: []
        })
        supplierSet.add(supplierId)
      }

      const supplierData = variantData.suppliers.get(supplierId)

      // 수량 누적
      const quantity = item.quantity || 1
      supplierData.quantity += quantity

      // 주문 정보 추가
      supplierData.orders.push({
        orderId: order.id,
        orderNumber: order.customer_order_number,
        quantity,
        unitPrice: item.unit_price || 0,
        totalPrice: (item.unit_price || 0) * quantity
      })
    })
  })

  // 3단계: Map을 Array로 변환
  const products = Array.from(productMap.values()).map(product => {
    const variants = Array.from(product.variants.values()).map(variant => {
      const suppliers = Array.from(variant.suppliers.values())

      // 총 수량 계산
      const totalQuantity = suppliers.reduce((sum, s) => sum + s.quantity, 0)

      return {
        ...variant,
        suppliers,
        totalQuantity,
        supplierCount: suppliers.length
      }
    })

    // 제품 전체 수량 계산
    const totalQuantity = variants.reduce((sum, v) => sum + v.totalQuantity, 0)

    return {
      productId: product.productId,
      productName: product.productName,
      productImage: product.productImage,
      productNumber: product.productNumber,
      supplierProductCode: product.supplierProductCode,
      variants,
      totalQuantity,
      variantCount: variants.length
    }
  })

  // 4단계: 수량 기준 내림차순 정렬
  products.sort((a, b) => b.totalQuantity - a.totalQuantity)

  // 전체 통계
  const totalQuantity = products.reduce((sum, p) => sum + p.totalQuantity, 0)
  const uniqueSuppliers = Array.from(supplierSet)

  return {
    products,
    totalProducts: products.length,
    totalQuantity,
    totalSuppliers: uniqueSuppliers.length,
    uniqueSuppliers
  }
}

/**
 * 물류팀용 CSV 생성 - 제품/옵션/업체/수량 집계
 */
export function generateLogisticsCSV(products) {
  const headers = ['제품명', '상품번호', '업체제품코드', '옵션', 'SKU', '업체명', '업체코드', '필요수량', '주문건수']

  const rows = []

  products.forEach(product => {
    product.variants.forEach(variant => {
      variant.suppliers.forEach(supplier => {
        rows.push([
          `"${product.productName}"`,
          product.productNumber || '',
          product.supplierProductCode || '',
          `"${variant.optionDisplay}"`,
          variant.sku || '',
          supplier.supplierName,
          supplier.supplierCode || '',
          supplier.quantity,
          supplier.orders.length
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

/**
 * 업체별 필요 수량 요약
 */
export function getSupplierSummary(products) {
  const supplierMap = new Map()

  products.forEach(product => {
    product.variants.forEach(variant => {
      variant.suppliers.forEach(supplier => {
        if (!supplierMap.has(supplier.supplierId)) {
          supplierMap.set(supplier.supplierId, {
            supplierId: supplier.supplierId,
            supplierName: supplier.supplierName,
            supplierCode: supplier.supplierCode,
            totalQuantity: 0,
            productCount: 0,
            variantCount: 0
          })
        }

        const summary = supplierMap.get(supplier.supplierId)
        summary.totalQuantity += supplier.quantity
        summary.productCount += 1
        summary.variantCount += 1
      })
    })
  })

  const summaries = Array.from(supplierMap.values())
  summaries.sort((a, b) => b.totalQuantity - a.totalQuantity)

  return summaries
}
