import { supabase } from './supabase'
import { OrderCalculations } from './orderCalculations'
import { formatShippingInfo } from './shippingUtils'
import logger from './logger'
import { UserProfileManager } from './userProfileManager'

// ===============================
// 유틸리티 함수
// ===============================

// 최적 결제 방법 선택 함수 (0원이 아닌 금액 우선, 카드 > 기타 > bank_transfer 순서)
const getBestPayment = (payments) => {
  if (!payments || payments.length === 0) return {}

  // 0원이 아닌 결제 정보만 필터링
  const nonZeroPayments = payments.filter(p => p.amount && p.amount > 0)

  // 0원이 아닌 결제가 있으면 그 중에서 선택
  const paymentsToCheck = nonZeroPayments.length > 0 ? nonZeroPayments : payments

  // depositor_name이 있는 결제를 우선 선택
  const paymentWithDepositor = paymentsToCheck.find(p => p.depositor_name)
  if (paymentWithDepositor) return paymentWithDepositor

  // 카드 결제가 있으면 우선 선택
  const cardPayment = paymentsToCheck.find(p => p.method === 'card')
  if (cardPayment) return cardPayment

  // bank_transfer가 아닌 다른 방법이 있으면 선택
  const nonBankPayment = paymentsToCheck.find(p => p.method !== 'bank_transfer')
  if (nonBankPayment) return nonBankPayment

  // 가장 최근 업데이트된 결제 방법 선택
  const sortedPayments = [...paymentsToCheck].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at)
    const bTime = new Date(b.updated_at || b.created_at)
    return bTime - aTime
  })

  return sortedPayments[0] || {}
}

// ===============================
// 상품 관련 API
// ===============================

export const getProducts = async (filters = {}) => {
  try {
    logger.debug('🏠 사용자 홈 - Supabase 직접 연결로 상품 데이터 로드 중...')

    // ⚡ 모바일 최적화: 필요한 컬럼만 SELECT (JOIN 제거)
    // ProductCard는 variant 데이터를 사용하지 않으므로 JOIN 불필요
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        title,
        product_number,
        price,
        compare_price,
        thumbnail_url,
        inventory,
        status,
        is_featured,
        is_live_active,
        created_at
      `)
      .eq('status', 'active')       // 활성 상품만 (필수)
      .order('created_at', { ascending: false })
      .limit(50)  // ⚡ 성능: 최대 50개만 로드

    if (error) {
      console.error('사용자 홈 상품 조회 오류:', error)
      throw error
    }

    // ⚠️ 상품이 없으면 즉시 빈 배열 반환 (무한 로딩 방지)
    if (!data || data.length === 0) {
      console.log('📦 상품 데이터 없음 - 빈 배열 반환')
      return []
    }

    logger.info('🏠 사용자 홈 상품 조회 성공:', data?.length || 0, '개 상품')

    // ⚡ 간단한 데이터 변환 (ProductCard 호환성)
    const productsFormatted = data.map(product => ({
      ...product,
      stock_quantity: product.inventory, // ProductCard는 stock_quantity 사용
      isLive: product.is_live_active || false
    }))

    return productsFormatted
  } catch (error) {
    console.error('상품 데이터 로드 오류:', error)
    throw error
  }
}

// Mock 데이터 함수 제거됨 - 실제 서비스에서는 사용하지 않음

export const getProductById = async (productId) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (error) throw error

    // variant 정보 로드
    const variants = await getProductVariants(productId)

    // Variant에서 옵션 생성
    let options = []
    let totalInventory = 0

    if (variants && variants.length > 0) {
      // 총 재고 계산
      totalInventory = variants.reduce((sum, v) => sum + (v.inventory || 0), 0)

      const optionsMap = {}

      variants.forEach(variant => {
        if (variant.options) {
          variant.options.forEach(opt => {
            if (!optionsMap[opt.optionName]) {
              optionsMap[opt.optionName] = {
                name: opt.optionName,
                values: []
              }
            }

            const valueExists = optionsMap[opt.optionName].values.some(v => {
              const vName = typeof v === 'string' ? v : (v.name || v.value)
              return vName === opt.optionValue
            })

            if (!valueExists) {
              optionsMap[opt.optionName].values.push({
                name: opt.optionValue,
                value: opt.optionValue,
                // inventory는 여기에 저장하지 않음
                variantId: variant.id
              })
            }
          })
        }
      })

      options = Object.values(optionsMap)
    }

    return {
      ...data,
      options,
      variants: variants || [],
      stock_quantity: totalInventory, // 총 재고 저장
      isLive: data.is_live_active || false
    }
  } catch (error) {
    console.error('상품 단일 조회 오류:', error)
    return null
  }
}

export const addProduct = async (productData) => {
  try {
    // 1. 상품 생성
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([{
        title: productData.title,
        description: productData.description || '',
        price: productData.price,
        compare_price: productData.compare_price,
        thumbnail_url: productData.thumbnail_url,
        // inventory_quantity: productData.inventory_quantity || 0, // 스키마에 없는 컬럼
        seller: productData.seller || '',
        is_featured: productData.is_featured || false,
        badge: productData.badge || null,
        free_shipping: productData.freeShipping || false
      }])
      .select()
      .single()

    if (productError) throw productError

    // 2. 옵션이 있으면 옵션 생성
    if (productData.options && productData.options.length > 0) {
      const optionsToInsert = productData.options.map(option => ({
        product_id: product.id,
        name: option.name,
        values: JSON.stringify(option.values)
      }))

      const { error: optionsError } = await supabase
        .from('product_options')
        .insert(optionsToInsert)

      if (optionsError) throw optionsError
    }

    return product
  } catch (error) {
    console.error('상품 추가 오류:', error)
    throw error
  }
}

export const updateProduct = async (productId, productData) => {
  try {
    // 1. 상품 업데이트
    const { data: product, error: productError } = await supabase
      .from('products')
      .update({
        title: productData.title,
        description: productData.description || '',
        price: productData.price,
        compare_price: productData.compare_price,
        thumbnail_url: productData.thumbnail_url,
        // inventory_quantity: productData.inventory_quantity, // 스키마에 없는 컬럼
        seller: productData.seller || '',
        is_featured: productData.is_featured || false,
        badge: productData.badge || null,
        free_shipping: productData.freeShipping || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single()

    if (productError) throw productError

    // 2. 기존 옵션 삭제
    const { error: deleteOptionsError } = await supabase
      .from('product_options')
      .delete()
      .eq('product_id', productId)

    if (deleteOptionsError) throw deleteOptionsError

    // 3. 새 옵션 추가
    if (productData.options && productData.options.length > 0) {
      const optionsToInsert = productData.options.map(option => ({
        product_id: productId,
        name: option.name,
        values: JSON.stringify(option.values)
      }))

      const { error: optionsError } = await supabase
        .from('product_options')
        .insert(optionsToInsert)

      if (optionsError) throw optionsError
    }

    return product
  } catch (error) {
    console.error('상품 업데이트 오류:', error)
    throw error
  }
}

export const updateProductLiveStatus = async (productId, isLive) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        // is_live: isLive, // 스키마에 없는 컬럼 주석처리
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('상품 라이브 상태 업데이트 오류:', error)
    throw error
  }
}

/**
 * 일반 상품 재고 업데이트 (옵션 없는 상품)
 * - RPC 함수 사용 (SECURITY DEFINER) → RLS 우회
 * - Variant와 동일한 패턴
 * @param {string} productId - 상품 ID
 * @param {number} quantityChange - 재고 변경량 (양수: 증가, 음수: 감소)
 * @returns {Promise<Object>} - 업데이트 결과
 */
export const updateProductInventory = async (productId, quantityChange) => {
  try {
    logger.debug('🔧 상품 재고 업데이트:', { productId, quantityChange })

    const { data, error } = await supabase.rpc('update_product_inventory_with_lock', {
      p_product_id: productId,
      p_change: quantityChange
    })

    if (error) throw error

    logger.info('✅ 상품 재고 업데이트 성공:', data)
    return data
  } catch (error) {
    console.error('상품 재고 업데이트 오류:', error)
    throw error
  }
}

// ===============================
// 옵션별 재고 관리 API (New System)
// ===============================

/**
 * 옵션별 재고 확인 함수
 * @deprecated 2025-10-21 - checkVariantInventory()로 대체됨 (Variant 시스템 전환)
 * @see checkVariantInventory (line 2383)
 * @param {string} productId - 상품 ID
 * @param {object} selectedOptions - 선택된 옵션 조합 (예: {"색상": "블랙", "사이즈": "M"})
 * @returns {Promise<{available: boolean, inventory: number}>}
 */
export const checkOptionInventory = async (productId, selectedOptions) => {
  try {
    logger.debug('🔍 옵션별 재고 확인:', { productId, selectedOptions })

    // 1. 상품의 모든 옵션 조회
    const { data: productOptions, error: optionsError } = await supabase
      .from('product_options')
      .select('*')
      .eq('product_id', productId)

    if (optionsError) throw optionsError

    // 옵션이 없는 상품은 products.inventory 사용
    if (!productOptions || productOptions.length === 0) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('inventory')
        .eq('id', productId)
        .single()

      if (productError) throw productError

      return {
        available: product.inventory > 0,
        inventory: product.inventory || 0
      }
    }

    // 2. 선택된 옵션값들의 ID를 찾기
    const optionValueIds = []
    for (const option of productOptions) {
      const selectedValue = selectedOptions[option.name]
      logger.debug(`옵션 "${option.name}" 확인:`, { selectedValue, optionId: option.id })

      if (!selectedValue) {
        logger.debug(`옵션 "${option.name}"에 선택값 없음, 스킵`)
        continue
      }

      // product_option_values에서 해당 값 찾기
      const { data: optionValues, error: valuesError } = await supabase
        .from('product_option_values')
        .select('id, value')
        .eq('option_id', option.id)

      if (valuesError) throw valuesError

      logger.debug(`옵션 "${option.name}"의 가능한 값들:`, optionValues)

      const matchedValue = optionValues?.find(v => v.value === selectedValue)

      if (!matchedValue) {
        logger.warn(`옵션 "${option.name}"에서 값 "${selectedValue}"을 찾을 수 없음`)
        logger.warn('가능한 값들:', optionValues?.map(v => v.value))
        return { available: false, inventory: 0 }
      }

      logger.debug(`✅ 매칭된 값:`, matchedValue)
      optionValueIds.push(matchedValue.id)
    }

    // 3. 해당 옵션값 조합을 가진 variant 찾기
    logger.debug('수집된 option_value_ids:', optionValueIds)

    // variant_option_values에서 모든 optionValueIds를 가진 variant_id 찾기
    const { data: variantMappings, error: mappingsError } = await supabase
      .from('variant_option_values')
      .select('variant_id')
      .in('option_value_id', optionValueIds)

    if (mappingsError) throw mappingsError

    logger.debug('Variant 매핑 결과:', variantMappings)

    // variant_id별로 매칭된 option_value_id 개수 세기
    const variantCounts = {}
    variantMappings?.forEach(m => {
      variantCounts[m.variant_id] = (variantCounts[m.variant_id] || 0) + 1
    })

    logger.debug('Variant별 매칭 카운트:', variantCounts)
    logger.debug('필요한 매칭 개수:', optionValueIds.length)

    // 모든 옵션값이 매칭된 variant 찾기
    const matchedVariantId = Object.entries(variantCounts).find(
      ([_, count]) => count === optionValueIds.length
    )?.[0]

    if (!matchedVariantId) {
      logger.warn('선택된 옵션 조합에 해당하는 variant를 찾을 수 없음')
      return { available: false, inventory: 0 }
    }

    logger.debug('✅ 매칭된 variant_id:', matchedVariantId)

    // 4. variant의 재고 확인
    const { data: variant, error: variantError } = await supabase
      .from('product_variants')
      .select('inventory')
      .eq('id', matchedVariantId)
      .single()

    if (variantError) throw variantError

    logger.info(`✅ Variant 재고 확인 완료: ${variant.inventory}개`)

    return {
      available: variant.inventory > 0,
      inventory: variant.inventory || 0
    }
  } catch (error) {
    console.error('옵션별 재고 확인 오류:', error)
    throw error
  }
}

/**
 * 옵션별 재고 업데이트 함수 (Supabase RPC 호출)
 * @deprecated 2025-10-21 - updateVariantInventory()로 대체됨 (Variant 시스템 전환)
 * @see updateVariantInventory (line 2317)
 * @param {string} productId - 상품 ID
 * @param {string} optionName - 옵션 이름 (예: "색상")
 * @param {string} optionValue - 옵션 값 (예: "블랙")
 * @param {number} quantityChange - 재고 변경량 (음수면 차감, 양수면 증가)
 * @returns {Promise<object>} 업데이트된 옵션 데이터
 */
export const updateOptionInventoryRPC = async (productId, optionName, optionValue, quantityChange) => {
  try {
    logger.debug('🔧 옵션별 재고 업데이트 (RPC):', { productId, optionName, optionValue, quantityChange })

    const { data, error } = await supabase.rpc('update_option_inventory', {
      p_product_id: productId,
      p_option_name: optionName,
      p_option_value: optionValue,
      p_quantity_change: quantityChange
    })

    if (error) throw error

    logger.info('✅ 옵션별 재고 업데이트 완료 (RPC):', { productId, optionName, optionValue })
    return data
  } catch (error) {
    console.error('옵션별 재고 업데이트 오류 (RPC):', error)
    throw error
  }
}

/**
 * 옵션이 포함된 주문 생성 함수
 * @deprecated 2025-10-21 - createOrder()로 대체됨 (createOrder가 Variant 지원)
 * @see createOrder (line 637)
 * @param {object} orderData - 주문 데이터
 * @param {object} userProfile - 사용자 프로필
 * @param {string} depositName - 입금자명
 * @returns {Promise<object>} 생성된 주문
 */
export const createOrderWithOptions = async (orderData, userProfile, depositName = null) => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('로그인이 필요합니다')

    logger.debug('📦 옵션 재고 검증 포함 주문 생성 시작 (Service Role API 호출):', user.name)

    // 1. 옵션별 재고 검증 (Double Validation - Frontend)
    // variantId가 있으면 이미 BuyBottomSheet에서 재고 차감 완료했으므로 스킵
    if (orderData.selectedOptions && Object.keys(orderData.selectedOptions).length > 0 && !orderData.variantId) {
      const inventoryCheck = await checkOptionInventory(orderData.id, orderData.selectedOptions)

      if (!inventoryCheck.available || inventoryCheck.inventory < orderData.quantity) {
        throw new Error(`재고가 부족합니다. 현재 재고: ${inventoryCheck.inventory}개`)
      }

      logger.info('✅ 프론트엔드 재고 검증 통과:', inventoryCheck)
    } else if (orderData.variantId) {
      logger.info('ℹ️ variantId 존재, 재고 검증 스킵 (이미 차감됨)')
    }

    // 2. Service Role API 호출
    const response = await fetch('/api/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderData,
        userProfile,
        depositName,
        user
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ 주문 생성 API 오류 (옵션):', errorData)
      throw new Error(errorData.error || '주문 생성에 실패했습니다')
    }

    const result = await response.json()
    logger.info('✅ 주문 생성 완료 (옵션 재고 관리 포함, Service Role API):', result.order.id)
    return result.order
  } catch (error) {
    console.error('주문 생성 오류 (옵션):', error)
    throw error
  }
}

/**
 * 옵션별 재고 차감 함수 (Variant 시스템)
 * @deprecated 2025-10-21 - updateVariantInventory()로 대체됨 (Variant 시스템 전환)
 * @see updateVariantInventory (line 2317)
 * @param {string} productId - 상품 ID
 * @param {object} selectedOptions - 선택된 옵션 조합
 * @param {number} quantityChange - 재고 변경량
 * @returns {Promise<void>}
 */
export const updateOptionInventory = async (productId, selectedOptions, quantityChange) => {
  try {
    logger.debug('🔧 옵션별 재고 차감 시작 (Variant):', { productId, selectedOptions, quantityChange })

    // 1. 상품의 variant 조회
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select(`
        id,
        sku,
        inventory,
        variant_option_values (
          product_option_values (
            value,
            product_options (
              name
            )
          )
        )
      `)
      .eq('product_id', productId)
      .eq('is_active', true)

    if (variantsError) throw variantsError

    // 2. Variant가 없으면 일반 재고 관리
    if (!variants || variants.length === 0) {
      logger.debug('Variant가 없는 상품, 일반 재고 차감')
      return await updateProductInventory(productId, quantityChange)
    }

    // 3. 선택된 옵션과 일치하는 Variant 찾기
    const matchingVariant = variants.find(variant => {
      if (!variant.variant_option_values || variant.variant_option_values.length === 0) {
        return false
      }

      return Object.entries(selectedOptions).every(([optionName, optionValue]) => {
        return variant.variant_option_values.some(vov =>
          vov.product_option_values.product_options.name === optionName &&
          vov.product_option_values.value === optionValue
        )
      })
    })

    if (!matchingVariant) {
      logger.warn('⚠️ 선택된 옵션과 일치하는 Variant 없음:', selectedOptions)
      throw new Error('선택된 옵션 조합을 찾을 수 없습니다')
    }

    // 4. Variant 재고 업데이트
    const newInventory = Math.max(0, matchingVariant.inventory + quantityChange)

    const { error: updateError } = await supabase
      .from('product_variants')
      .update({
        inventory: newInventory,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchingVariant.id)

    if (updateError) throw updateError

    logger.info('✅ Variant 재고 차감 완료:', {
      variantId: matchingVariant.id,
      sku: matchingVariant.sku,
      oldInventory: matchingVariant.inventory,
      newInventory: newInventory,
      change: quantityChange
    })

    return true
  } catch (error) {
    console.error('Variant 재고 차감 오류:', error)
    throw error
  }
}

// Soft Delete: 실제 삭제가 아닌 status='deleted' + deleted_at 타임스탬프
export const deleteProduct = async (productId) => {
  try {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('products')
      .update({
        status: 'deleted',
        deleted_at: now,
        updated_at: now
      })
      .eq('id', productId)

    if (error) throw error
    console.log('✅ 상품 삭제 완료 (soft delete):', productId)
    return true
  } catch (error) {
    console.error('❌ 상품 삭제 오류:', error)
    throw error
  }
}

// ===============================
// 주문 관련 API
// ===============================

export const createOrder = async (orderData, userProfile, depositName = null) => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('로그인이 필요합니다')

    logger.debug('📦 통합 주문 생성 시작 (Service Role API 호출) - 사용자:', user.name, '입금자명:', depositName)

    // Service Role API 호출
    const response = await fetch('/api/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderData,
        userProfile,
        depositName,
        user
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ 주문 생성 API 오류:', errorData)
      throw new Error(errorData.error || '주문 생성에 실패했습니다')
    }

    const result = await response.json()
    logger.info('✅ 주문 생성 완료 (Service Role API):', result.order.id)
    return result.order
  } catch (error) {
    console.error('주문 생성 오류:', error)
    throw error
  }
}

/**
 * 사용자 주문 목록 조회
 * @deprecated 2025-10-21 - /api/orders/list API Route로 대체됨 (성능 문제 해결)
 * @see app/api/orders/list/route.js
 * @param {string} userId - 사용자 ID
 * @param {object} options - 조회 옵션
 * @returns {Promise<Array>}
 */
export const getOrders = async (userId = null, options = {}) => {
  try {
    const { page = 1, pageSize = 10, status = null } = options

    // ✅ Service Role API로 주문 조회 (RLS 우회)
    const user = await UserProfileManager.getCurrentUser()

    if (!user) {
      return { orders: [], pagination: { currentPage: 1, totalPages: 0, totalCount: 0, pageSize: 10 }, statusCounts: {} }
    }

    // Service Role API 호출
    const response = await fetch('/api/orders/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user, page, pageSize, status })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ 주문 조회 API 오류:', errorData)
      throw new Error(errorData.error || '주문 조회에 실패했습니다')
    }

    const result = await response.json()
    const orders = result.orders || []
    const pagination = result.pagination || { currentPage: 1, totalPages: 0, totalCount: 0, pageSize: 10 }
    const statusCounts = result.statusCounts || {}

    logger.info('✅ Service Role API 주문 조회 완료:', orders.length, '개 (', pagination.currentPage, '/', pagination.totalPages, '페이지)')

    // payment_group_id로 주문 그룹화
    const groupedOrders = []
    const processedGroupIds = new Set()

    for (const order of orders) {
      // payment_group_id가 있고 아직 처리되지 않은 그룹인 경우
      if (order.payment_group_id && !processedGroupIds.has(order.payment_group_id)) {
        // 같은 group_id를 가진 모든 주문 찾기
        const groupOrders = orders.filter(o => o.payment_group_id === order.payment_group_id)

        if (groupOrders.length > 1) {
          // 여러 개 주문이 그룹화된 경우
          const groupOrder = {
            id: `GROUP-${order.payment_group_id}`,
            payment_group_id: order.payment_group_id,
            customer_order_number: order.customer_order_number, // ✅ 원본 주문번호 유지 (G/S 구분 제거)
            status: order.status,
            created_at: order.created_at,
            updated_at: order.updated_at,
            user_id: order.user_id,
            order_type: 'bulk_payment',
            total_amount: order.payment?.amount || groupOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),

            // 모든 아이템 합치기
            items: groupOrders.flatMap(o => o.items),

            // 첫 번째 주문의 배송/결제 정보 사용
            shipping: order.shipping,
            payment: order.payment,

            // 그룹 정보 추가
            isGroup: true,
            groupOrderCount: groupOrders.length,
            originalOrderIds: groupOrders.map(o => o.id)
          }

          groupedOrders.push(groupOrder)
          processedGroupIds.add(order.payment_group_id)
        } else if (groupOrders.length === 1) {
          // 단일 주문이지만 payment_group_id가 있는 경우
          groupedOrders.push(order)
          processedGroupIds.add(order.payment_group_id)
        }
      }
      // payment_group_id가 없는 개별 주문
      else if (!order.payment_group_id) {
        groupedOrders.push(order)
      }
    }

    logger.debug('🔍 최종 그룹화 결과:', {
      totalOrders: groupedOrders.length,
      groupOrders: groupedOrders.filter(o => o.isGroup).length,
      regularOrders: groupedOrders.filter(o => !o.isGroup).length
    })

    return {
      orders: groupedOrders,
      pagination,
      statusCounts
    }
  } catch (error) {
    console.error('주문 목록 조회 오류:', error)
    return { orders: [], pagination: { currentPage: 1, totalPages: 0, totalCount: 0, pageSize: 10 }, statusCounts: {} }
  }
}

/**
 * 관리자용 - 모든 주문 조회 (UserProfileManager 통합)
 * @deprecated 2025-10-21 - /api/admin/orders API Route로 대체됨 (성능 문제 해결)
 * @see app/api/admin/orders/route.js
 * @returns {Promise<Array>}
 */
export const getAllOrders = async () => {
  try {
    logger.debug('🔍 관리자용 전체 주문 조회 시작 (UserProfileManager 기반)')

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            title,
            thumbnail_url,
            price
          )
        ),
        order_shipping (*),
        order_payments (*)
      `)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(100)  // ⚡ 성능: 최대 100개만 조회

    if (error) {
      console.error('❌ 주문 조회 쿼리 오류:', error)
      throw error
    }

    logger.info(`✅ DB에서 조회된 주문 수: ${data?.length || 0}`)

    // ⚡ 성능 최적화: N+1 쿼리 제거 - 프로필 일괄 조회
    // 1. 모든 user_id와 kakao_id 수집
    const userIds = [...new Set(data.filter(o => o.user_id).map(o => o.user_id))]
    const kakaoIds = [...new Set(
      data
        .filter(o => !o.user_id && o.order_type?.includes(':KAKAO:'))
        .map(o => o.order_type.split(':KAKAO:')[1])
        .filter(id => id) // undefined 제거
    )]

    logger.debug(`🔍 일괄 조회: ${userIds.length}개 이메일 사용자, ${kakaoIds.length}개 카카오 사용자`)

    // 2. 프로필 일괄 조회 (2개 쿼리만 실행)
    const { data: emailProfiles } = userIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, nickname, name, phone, email')
          .in('id', userIds)
      : { data: [] }

    const { data: kakaoProfiles } = kakaoIds.length > 0
      ? await supabase
          .from('profiles')
          .select('kakao_id, nickname, name, phone, email')
          .in('kakao_id', kakaoIds)
      : { data: [] }

    // 3. Map으로 빠른 조회 준비
    const profileMap = new Map()
    emailProfiles?.forEach(p => profileMap.set(`email:${p.id}`, p))
    kakaoProfiles?.forEach(p => profileMap.set(`kakao:${p.kakao_id}`, p))

    logger.debug(`✅ 프로필 매핑 완료: ${profileMap.size}개`)

    // 4. 주문 데이터 변환 (메모리 매칭만, 추가 쿼리 없음)
    const ordersWithItems = data.map(order => {
      const shipping = order.order_shipping[0] || {}
      const payment = getBestPayment(order.order_payments)

      // 프로필 정보 조회 (Map에서, DB 쿼리 없음)
      let profileInfo = null
      if (order.user_id) {
        profileInfo = profileMap.get(`email:${order.user_id}`)
      } else if (order.order_type?.includes(':KAKAO:')) {
        const kakaoId = order.order_type.split(':KAKAO:')[1]
        profileInfo = profileMap.get(`kakao:${kakaoId}`)

        // 프로필이 없으면 배송 정보 사용
        if (!profileInfo) {
          profileInfo = {
            name: shipping?.name || '카카오 사용자',
            nickname: shipping?.name || '카카오 사용자'
          }
        }
      }

      // 사용자 정보 우선순위: profiles 테이블 > shipping 정보
      const userName = profileInfo?.name || shipping.name || '정보없음'

      // 닉네임 우선순위: profiles 테이블 > 익명
      let userNickname = profileInfo?.nickname

      // 닉네임이 없거나 이름과 동일한 경우에만 익명 처리
      if (!userNickname) {
        userNickname = '익명'
      }

      // 입금자명: 결제 테이블의 depositor_name 우선, 없으면 사용자명 사용
      const depositName = payment.depositor_name || (userName !== '정보없음' ? userName : null)

      return {
        ...order,
        items: order.order_items.map(item => {
          // 🔧 unit_price 우선 사용, 없으면 total_price / quantity로 계산
          const unitPrice = item.unit_price || (item.total_price / item.quantity) || item.products?.price || 0
          const totalPrice = item.total_price || (unitPrice * item.quantity) || 0

          return {
            ...item.products,
            id: item.id, // order_item의 실제 ID 사용
            product_id: item.product_id, // 제품 ID도 별도로 포함
            quantity: item.quantity,
            title: item.title || item.products?.title || '상품', // DB의 title 또는 products.title 사용
            price: unitPrice, // 🔧 unit_price 사용
            totalPrice: totalPrice, // 🔧 total_price 사용
            variant: item.variant_title || null,
            sku: item.sku || null,
            selectedOptions: item.selected_options || {},
            thumbnail_url: item.products?.thumbnail_url || '/placeholder.png'
          }
        }),
        shipping,
        payment,
        // 실제 사용자 정보
        userId: order.user_id,
        userName,
        userNickname,
        userEmail: profileInfo?.email || '정보없음',
        // 사용자 객체에 profile 정보 포함
        user: {
          ...profileInfo,
          profile: profileInfo,
          name: userName,
          nickname: userNickname
        },
        // 입금자명 추가
        depositName
      }
    })

    console.log(`🎯 그룹화 전 주문 수: ${ordersWithItems.length}`)
    console.log('📊 payment_group_id 확인:', ordersWithItems?.map(o => ({ id: o.id, group_id: o.payment_group_id })))

    // payment_group_id로 주문 그룹화 (관리자도 그룹 주문으로 표시)
    const groupedOrders = []
    const processedGroupIds = new Set()

    console.log(`🔄 관리자 주문 그룹화 시작`)

    for (const order of ordersWithItems) {
      // payment_group_id가 있고 아직 처리되지 않은 그룹인 경우
      if (order.payment_group_id && !processedGroupIds.has(order.payment_group_id)) {
        // 같은 group_id를 가진 모든 주문 찾기
        const groupOrders = ordersWithItems.filter(o => o.payment_group_id === order.payment_group_id)

        console.log('🔍 관리자 그룹 발견:', {
          groupId: order.payment_group_id,
          orderCount: groupOrders.length,
          orderIds: groupOrders.map(o => o.id)
        })

        if (groupOrders.length > 1) {
          // 여러 개 주문이 그룹화된 경우
          // 그룹 내 가장 최근 업데이트 시간 찾기
          const mostRecentUpdate = groupOrders.reduce((latest, o) => {
            const oUpdated = new Date(o.updated_at || o.created_at)
            return oUpdated > latest ? oUpdated : latest
          }, new Date(groupOrders[0].updated_at || groupOrders[0].created_at))

          // 그룹 내 가장 최근 타임스탬프 찾기
          const getMostRecent = (field) => {
            const timestamps = groupOrders
              .map(o => o[field])
              .filter(t => t != null)
              .map(t => new Date(t))
            return timestamps.length > 0
              ? new Date(Math.max(...timestamps)).toISOString()
              : null
          }

          // 🔧 그룹 내에서 가장 완전한 shipping 정보 찾기 (phone이 있는 것 우선)
          const bestShipping = (() => {
            // 1순위: 전화번호가 있고 '연락처 미입력'이 아닌 것
            const withValidPhone = groupOrders.find(o =>
              o.shipping?.phone &&
              o.shipping.phone !== '연락처 미입력' &&
              o.shipping.phone.trim() !== ''
            )?.shipping
            if (withValidPhone) {
              console.log('✅ 그룹 주문 bestShipping 찾기 - 1순위 성공 (유효한 전화번호):', withValidPhone)
              return withValidPhone
            }

            // 2순위: 전화번호가 있기만 한 것
            const withPhone = groupOrders.find(o => o.shipping?.phone)?.shipping
            if (withPhone) {
              console.log('✅ 그룹 주문 bestShipping 찾기 - 2순위 성공 (전화번호 있음):', withPhone)
              return withPhone
            }

            // 3순위: 이름이라도 있는 것
            const withName = groupOrders.find(o => o.shipping?.name)?.shipping
            if (withName) {
              console.log('⚠️ 그룹 주문 bestShipping 찾기 - 3순위 (이름만 있음):', withName)
              return withName
            }

            // 4순위: 첫 번째 주문의 shipping
            console.log('❌ 그룹 주문 bestShipping 찾기 - 실패, 첫 주문 사용:', order.shipping)
            return order.shipping
          })()

          const groupOrder = {
            id: `GROUP-${order.payment_group_id}`,
            payment_group_id: order.payment_group_id,
            customer_order_number: order.customer_order_number, // ✅ 원본 주문번호 유지 (G/S 구분 제거)
            created_at: order.created_at,
            updated_at: mostRecentUpdate.toISOString(), // 그룹 내 가장 최근 업데이트 시간
            status: order.status,
            // ✨ 단계별 타임스탬프 (그룹 내 가장 최근 시간)
            verifying_at: getMostRecent('verifying_at'),
            paid_at: getMostRecent('paid_at'),
            delivered_at: getMostRecent('delivered_at'),
            cancelled_at: getMostRecent('cancelled_at'),
            // 모든 그룹 주문의 아이템을 합침 (관리자 페이지 호환)
            items: groupOrders.flatMap(o => o.items),
            order_items: groupOrders.flatMap(o => o.order_items || []),
            // ✅ 그룹 내에서 가장 완전한 배송 정보 사용 (phone 우선)
            shipping: bestShipping,
            order_shipping: order.order_shipping,
            // 🚀 새로운 OrderCalculations 사용으로 정확한 계산
            payment: (() => {
              const groupCalc = OrderCalculations.calculateGroupOrderTotal(
                groupOrders.map(o => ({ items: o.items || [] }))
              )
              console.log('🧮 그룹 주문 계산 결과:', groupCalc)
              return {
                ...order.payment,
                amount: groupCalc.totalAmount
              }
            })(),
            order_payments: [(() => {
              // 🚀 OrderCalculations 사용으로 깔끔하고 정확한 계산
              const groupCalc = OrderCalculations.calculateGroupOrderTotal(
                groupOrders.map(o => ({ items: o.items || [] }))
              )
              return {
                ...order.payment,
                amount: groupCalc.totalAmount
              }
            })()],
            // 첫 번째 주문의 사용자 정보 사용
            userId: order.userId,
            userName: order.userName,
            userNickname: order.userNickname,
            userEmail: order.userEmail,
            user: order.user, // user 객체 전체 추가
            depositName: order.depositName,
            // 그룹 표시용 플래그
            isGroup: true,
            groupOrderCount: groupOrders.length,
            originalOrders: groupOrders
          }

          groupedOrders.push(groupOrder)
          processedGroupIds.add(order.payment_group_id)
        } else if (groupOrders.length === 1) {
          // 단일 주문이지만 payment_group_id가 있는 경우
          groupedOrders.push(order)
          processedGroupIds.add(order.payment_group_id)
        }
      }
      // payment_group_id가 없는 개별 주문
      else if (!order.payment_group_id) {
        groupedOrders.push(order)
      }
    }

    console.log(`🎯 그룹화 후 최종 주문 수: ${groupedOrders.length}`)
    console.log('📋 그룹 주문 목록:', groupedOrders?.filter(o => o.isGroup)?.map(o => ({
      id: o.id,
      groupId: o.payment_group_id,
      orderCount: o.groupOrderCount
    })))

    return groupedOrders
  } catch (error) {
    console.error('전체 주문 목록 조회 오류:', error)
    return []
  }
}

// 관리자용 - 모든 고객 조회 (profiles 테이블 기반)
export const getAllCustomers = async () => {
  try {
    console.log('📋 고객 목록 조회 시작')

    // ✅ 2025-11-03: 관리자 API Route를 통해 조회 (RLS 우회)
    const { data: { session } } = await supabase.auth.getSession()
    const adminEmail = session?.user?.email

    if (!adminEmail) {
      throw new Error('관리자 인증 정보가 필요합니다')
    }

    const response = await fetch(`/api/admin/customers?adminEmail=${encodeURIComponent(adminEmail)}`)
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || '고객 목록 조회 실패')
    }

    const customers = result.customers || []
    console.log(`🔍 API에서 ${customers.length}명 조회 완료`)

    return customers

  } catch (error) {
    console.error('고객 목록 조회 오류:', error)
    return []
  }
}

export const getOrderById = async (orderId) => {
  try {
    // ✅ Service Role API로 단일 주문 조회 (RLS 우회)
    logger.debug('🔍 Service Role API로 주문 상세 조회:', orderId)

    const { UserProfileManager } = await import('./userProfileManager')
    const user = await UserProfileManager.getCurrentUser()

    if (!user) {
      console.error('❌ 사용자 정보 없음')
      return null
    }

    const response = await fetch('/api/orders/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user,
        orderId // 특정 주문 ID 전달
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ 주문 조회 API 오류:', errorData)
      throw new Error(errorData.error || '주문 조회에 실패했습니다')
    }

    const apiResult = await response.json()
    const orders = apiResult.orders || []

    if (orders.length === 0) {
      console.error('❌ 주문을 찾을 수 없습니다:', orderId)
      return null
    }

    const data = orders[0] // 첫 번째 주문 (단일 조회)
    logger.info('✅ Service Role API 주문 조회 완료:', orderId)

    // 그룹 주문인 경우 같은 그룹의 모든 주문 아이템 가져오기
    let allItems = data.order_items
    if (data.payment_group_id) {
      logger.debug('🔍 그룹 주문 감지, 같은 그룹의 모든 아이템 조회:', data.payment_group_id)

      const { data: groupOrders, error: groupError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              title,
              thumbnail_url,
              price
            )
          ),
          order_payments (*)
        `)
        .eq('payment_group_id', data.payment_group_id)

      if (!groupError && groupOrders) {
        logger.debug(`📦 그룹 주문 ${groupOrders.length}개 발견`)
        allItems = groupOrders.flatMap(order => order.order_items || [])

        // 그룹 주문의 모든 결제 정보 합산
        const groupPayments = groupOrders.flatMap(order => order.order_payments || [])

        // 상품 금액만 합산 (배송비 제외)
        const itemsTotal = groupOrders.reduce((sum, order) => {
          const orderItemsTotal = (order.order_items || []).reduce((itemSum, item) => {
            return itemSum + (item.total_price || (item.price * item.quantity))
          }, 0)
          return sum + orderItemsTotal
        }, 0)

        // 배송비는 한 번만 계산 (첫 번째 주문의 배송비 사용)
        const shippingFee = 4000 // 고정 배송비
        const totalGroupPaymentAmount = itemsTotal + shippingFee

        // 결제 정보 업데이트 (그룹 총액 사용)
        if (totalGroupPaymentAmount > 0) {
          data.order_payments = [{
            ...getBestPayment(data.order_payments),
            amount: totalGroupPaymentAmount
          }]
        }
      }
    }

    // 사용자 정보 로드 (user_id가 있는 경우)
    let userInfo = null
    if (data.user_id) {
      try {
        userInfo = await getUserById(data.user_id)
        console.log('👤 사용자 정보 로드됨:', {
          id: userInfo?.id,
          name: userInfo?.name,
          nickname: userInfo?.nickname,
          user_metadata: userInfo?.user_metadata,
          전체_데이터: userInfo
        })
      } catch (error) {
        console.error('사용자 정보 로딩 실패:', error)
      }
    } else {
      // user_id가 없는 경우, 배송 정보의 이름으로 profiles에서 nickname 조회
      console.log('🔍 user_id 없음, 배송 데이터 구조:', data.order_shipping)
      const shippingName = data.order_shipping?.[0]?.name
      console.log('🔍 추출된 배송명:', shippingName)

      if (shippingName) {
        console.log('🔍 배송명으로 닉네임 조회 시작:', shippingName)
        try {
          const { data: profileByName, error: profileError } = await supabase
            .from('profiles')
            .select('nickname, name')
            .eq('name', shippingName)
            .single()

          console.log('🔍 profiles 조회 결과:', { profileByName, profileError })

          if (!profileError && profileByName) {
            console.log('👤 이름으로 찾은 프로필:', profileByName)
            userInfo = profileByName
          } else {
            console.log('⚠️ profiles에서 사용자 찾지 못함:', { profileError })
          }
        } catch (error) {
          console.error('이름으로 프로필 조회 실패:', error)
        }
      } else {
        console.log('⚠️ 배송명이 없어서 닉네임 조회 불가')
      }
    }

    // 사용자 정보 추출
    const userName = userInfo?.name || userInfo?.user_metadata?.name || data.order_shipping?.[0]?.name || '정보없음'

    // 닉네임 우선순위: auth 닉네임 > name과 다른 경우만 사용 > 익명
    let userNickname = userInfo?.user_metadata?.nickname || userInfo?.nickname

    console.log('🔍 닉네임 디버깅:', {
      'userInfo?.user_metadata?.nickname': userInfo?.user_metadata?.nickname,
      'userInfo?.nickname': userInfo?.nickname,
      '최종_닉네임': userNickname,
      '사용자_이름': userName
    })

    // 닉네임이 없는 경우에만 익명 처리
    if (!userNickname) {
      userNickname = '익명'
      console.log('🔍 닉네임이 없어서 익명으로 설정됨')
    }

    // 입금자명: 결제 테이블의 depositor_name 우선, 없으면 사용자명 사용
    const bestPayment = getBestPayment(data.order_payments)
    const depositName = bestPayment.depositor_name || (userName !== '정보없음' ? userName : null)

    console.log('💰 입금자명 디버깅:', {
      bestPayment_depositor_name: bestPayment.depositor_name,
      userName,
      최종_depositName: depositName,
      bestPayment_전체: bestPayment
    })

    // 그룹 주문인 경우 주문번호 생성
    let customerOrderNumber = data.customer_order_number
    if (data.payment_group_id) {
      const now = new Date(data.created_at)
      const year = now.getFullYear().toString().slice(-2)
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const date = now.getDate().toString().padStart(2, '0')
      const timestamp = data.payment_group_id.split('-')[1]
      const sequence = timestamp.slice(-4).padStart(4, '0')
      customerOrderNumber = `G${year}${month}${date}-${sequence}`
      console.log('🔢 그룹 주문번호 생성:', {
        payment_group_id: data.payment_group_id,
        생성된_주문번호: customerOrderNumber,
        기존_주문번호: data.customer_order_number
      })
    }

    // Mock 형태로 변환 (그룹 주문인 경우 모든 아이템 포함)
    const result = {
      ...data,
      customer_order_number: customerOrderNumber,
      items: allItems.map(item => ({
        ...item.products,
        id: item.product_id,
        quantity: item.quantity,
        totalPrice: item.total_price,
        selectedOptions: item.selected_options || {},
        // 이미지 URL 우선순위: image_url > thumbnail_url
        image: item.products?.image_url || item.products?.thumbnail_url
      })),
      shipping: {
        name: data.shipping_name || data.order_shipping[0]?.name || '',
        phone: data.shipping_phone || data.order_shipping[0]?.phone || '',
        address: data.shipping_address || data.order_shipping[0]?.address || '',
        detail_address: data.shipping_detail_address || data.order_shipping[0]?.detail_address || '',
        postal_code: data.shipping_postal_code || data.order_shipping[0]?.postal_code || ''
      },
      payment: getBestPayment(data.order_payments),
      // 사용자 정보 추가
      userId: data.user_id,
      userName,
      userNickname,
      userEmail: userInfo?.email || '정보없음',
      user: userInfo,
      // 입금자명 추가
      depositName
    }

    console.log('🎯 최종 주문 상세 결과:', {
      userName: result.userName,
      userNickname: result.userNickname,
      shipping_name: result.shipping?.name,
      shipping_phone: result.shipping?.phone,
      shipping_address: result.shipping?.address,
      items_with_images: result.items.map(item => ({
        title: item.title,
        image: item.image
      }))
    })

    return result
  } catch (error) {
    console.error('주문 단일 조회 오류:', error)
    return null
  }
}

export const cancelOrder = async (orderId) => {
  try {
    console.log('주문 취소 시작:', orderId)

    // 1. 취소 전 주문 아이템 조회 (재고 복구용)
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity, variant_id')
      .eq('order_id', orderId)

    if (itemsError) throw itemsError

    console.log('취소할 주문 아이템들:', orderItems)

    // 2. 주문 상태를 cancelled로 변경
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (orderError) throw orderError

    // 3. 재고 복원 (Variant 기반)
    console.log('재고 복원 시작')
    for (const item of orderItems) {
      try {
        if (item.variant_id) {
          // Variant가 있는 경우 - Variant 재고 복원
          const result = await updateVariantInventory(item.variant_id, item.quantity)

          // update_variant_inventory는 { variant_id, old_inventory, new_inventory, change } 반환
          if (!result || !result.variant_id) {
            throw new Error('Variant 재고 복원 실패')
          }

          console.log(`✅ Variant ${item.variant_id} 재고 복원: ${result.old_inventory} → ${result.new_inventory} (+${item.quantity}개)`)
        } else {
          // Variant가 없는 경우 - 기존 방식으로 재고 복원 (하위 호환성)
          await updateProductInventory(item.product_id, item.quantity)
          console.log(`✅ 상품 ${item.product_id} 재고 복원: +${item.quantity}개`)
        }
      } catch (inventoryError) {
        console.error(`❌ 재고 복원 실패 (product_id: ${item.product_id}, variant_id: ${item.variant_id}):`, inventoryError)
        // 재고 복원 실패해도 주문 취소는 계속 진행
      }
    }

    console.log('주문 취소 완료:', orderId)
    return true
  } catch (error) {
    console.error('주문 취소 오류:', error)
    throw error
  }
}

// 주문 상태 업데이트 (Service Role API 사용 - RLS 우회)
export const updateOrderStatus = async (orderId, status, paymentData = null) => {
  try {
    console.log('🔵 Service Role API로 단일 주문 상태 업데이트:', {
      orderId,
      status,
      hasPaymentData: !!paymentData
    })

    // ✅ Service Role API 호출 (단일 주문도 배열로 전달)
    const response = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderIds: [orderId],  // 배열로 전달
        status,
        paymentData
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ 주문 상태 업데이트 API 오류:', errorData)
      throw new Error(errorData.error || '주문 상태 업데이트에 실패했습니다')
    }

    const result = await response.json()
    logger.info('✅ Service Role API 업데이트 완료:', orderId, status)
    return true
  } catch (error) {
    console.error('주문 상태 업데이트 오류:', error)
    throw error
  }
}

// 여러 주문 상태 일괄 업데이트 (전체결제 완료 후 사용) - REST API 방식
export const updateMultipleOrderStatus = async (orderIds, status, paymentData = null) => {
  try {
    // ✅ Service Role API로 주문 상태 업데이트 (RLS 우회)
    console.log('🔵 Service Role API로 주문 상태 업데이트:', {
      orderIds,
      status,
      hasPaymentData: !!paymentData
    })

    logger.debug('일괄 주문 상태 업데이트:', orderIds.length, '개 주문')

    // Service Role API 호출
    const response = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderIds,
        status,
        paymentData
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ 주문 상태 업데이트 API 오류:', errorData)
      throw new Error(errorData.error || '주문 상태 업데이트에 실패했습니다')
    }

    const result = await response.json()
    logger.info('✅ Service Role API 업데이트 완료:', result.updatedCount, '개')
    return { success: true, paymentGroupId: result.paymentGroupId }
  } catch (error) {
    console.error('❌ 일괄 주문 상태 업데이트 오류:', error)
    throw error
  }
}

// 주문 아이템 수량 업데이트 및 재고 반영 (REST API 방식)
export const updateOrderItemQuantity = async (orderItemId, newQuantity) => {
  try {
    console.log('수량 변경 시작:', { orderItemId, newQuantity })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://xoinislnaxllijlnjeue.supabase.co'
    const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvaW5pc2xuYXhsbGlqbG5qZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjM3MjEsImV4cCI6MjA3NDA5OTcyMX0.NnX051NMmeECmVTzPybzl5jF4Mk7RhmekJcnOCzG7lI')?.replace(/[\r\n\s]+/g, '')

    // 사용자 세션 토큰 가져오기 (RLS 정책 통과를 위해)
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token || supabaseKey

    // 1. 현재 주문 아이템 정보 가져오기 (id로 조회, variant_id 포함)
    const fetchResponse = await fetch(`${supabaseUrl}/rest/v1/order_items?id=eq.${orderItemId}&select=quantity,total_price,id,product_id,variant_id`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!fetchResponse.ok) {
      throw new Error(`현재 주문 정보 조회 실패: ${fetchResponse.status}`)
    }

    const currentItems = await fetchResponse.json()
    if (currentItems.length === 0) {
      throw new Error('주문 아이템을 찾을 수 없습니다')
    }

    const currentItem = currentItems[0]
    const oldQuantity = currentItem.quantity
    const quantityDifference = newQuantity - oldQuantity

    console.log(`수량 변경: ${oldQuantity} → ${newQuantity} (차이: ${quantityDifference})`)

    // 2. 단가 계산 (총가격 / 수량)
    const unitPrice = currentItem.total_price / currentItem.quantity

    // 3. 새로운 총 가격 계산
    const newTotalPrice = unitPrice * newQuantity

    // 4. 주문 아이템 수량과 총 가격 업데이트 (실제 order_items의 id 사용)
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/order_items?id=eq.${currentItem.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        quantity: newQuantity,
        total_price: newTotalPrice
      })
    })

    if (!updateResponse.ok) {
      throw new Error(`수량 업데이트 실패: ${updateResponse.status}`)
    }

    // 5. 재고 반영 - 수량이 증가했으면 재고 차감, 감소했으면 재고 증가
    if (quantityDifference !== 0) {
      console.log('재고 반영 시작:', {
        productId: currentItem.product_id,
        variantId: currentItem.variant_id,
        quantityDifference
      })

      try {
        // 재고 변경량은 주문 수량 변경과 반대
        // 주문 수량이 증가(+1)하면 재고는 차감(-1)
        // 주문 수량이 감소(-1)하면 재고는 증가(+1)

        if (currentItem.variant_id) {
          // Variant 재고 업데이트
          await updateVariantInventory(currentItem.variant_id, -quantityDifference)
          console.log(`Variant ${currentItem.variant_id} 재고 반영 완료: ${quantityDifference > 0 ? '차감' : '증가'} ${Math.abs(quantityDifference)}`)
        } else {
          // 일반 상품 재고 업데이트
          await updateProductInventory(currentItem.product_id, -quantityDifference)
          console.log(`상품 ${currentItem.product_id} 재고 반영 완료: ${quantityDifference > 0 ? '차감' : '증가'} ${Math.abs(quantityDifference)}`)
        }
      } catch (inventoryError) {
        console.error('재고 반영 실패:', inventoryError)
        // 재고 반영 실패해도 주문 수량 변경은 완료된 상태이므로 경고만 출력
        console.warn('주문 수량은 변경되었으나 재고 반영에 실패했습니다')
      }
    }

    // 6. 주문 총액 및 결제 금액 업데이트
    // order_id 가져오기
    const orderIdResponse = await fetch(`${supabaseUrl}/rest/v1/order_items?id=eq.${currentItem.id}&select=order_id`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    })
    const orderIdData = await orderIdResponse.json()
    const orderId = orderIdData[0]?.order_id

    if (orderId) {
      // 해당 주문의 모든 아이템 조회하여 총액 재계산
      const allItemsResponse = await fetch(`${supabaseUrl}/rest/v1/order_items?order_id=eq.${orderId}&select=total_price`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })
      const allItems = await allItemsResponse.json()

      // 전체 상품 금액 합계
      const totalProductsAmount = allItems.reduce((sum, item) => sum + (item.total_price || 0), 0)

      // 주문 상태 확인
      const orderStatusResponse = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}&select=status`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })
      const orderStatusData = await orderStatusResponse.json()
      const orderStatus = orderStatusData[0]?.status

      // 결제대기는 배송비 제외, 나머지는 배송비 포함
      const shippingFee = orderStatus === 'pending' ? 0 : 4000
      const newTotalAmount = totalProductsAmount + shippingFee

      console.log('💰 주문 총액 재계산:', {
        orderId,
        orderStatus,
        totalProductsAmount,
        shippingFee,
        newTotalAmount
      })

      // orders.total_amount 업데이트
      await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          total_amount: newTotalAmount
        })
      })

      // order_payments.amount 업데이트
      await fetch(`${supabaseUrl}/rest/v1/order_payments?order_id=eq.${orderId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          amount: newTotalAmount
        })
      })

      console.log('✅ 주문 총액 및 결제 금액 업데이트 완료')
    }

    console.log('수량 변경, 재고 반영, 금액 업데이트 완료:', { orderItemId, newQuantity, newTotalPrice, quantityDifference })
    return true
  } catch (error) {
    console.error('주문 수량 업데이트 오류:', error)
    throw error
  }
}

// ===============================
// 인증 관련 API
// ===============================

/**
 * 현재 로그인 사용자 정보 조회
 * @deprecated 2025-10-21 - hooks/useAuth.js로 대체됨
 * @see hooks/useAuth.js
 * @returns {Promise<Object|null>}
 */
export const getCurrentUser = async () => {
  try {
    // 1️⃣ Supabase Auth 세션 확인 (우선)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (!sessionError && session?.user) {
      // profiles 테이블에서 사용자 정보 조회
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!profileError && profile) {
        return profile
      }

      // 프로필이 없어도 세션 user 정보는 반환
      return {
        id: session.user.id,
        email: session.user.email,
        ...session.user.user_metadata
      }
    }

    // 2️⃣ Supabase Auth 세션이 없으면 sessionStorage 확인 (카카오 로그인)
    if (typeof window !== 'undefined') {
      const storedUser = sessionStorage.getItem('user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        return userData
      }
    }

    // 세션이 없으면 null 반환
    return null

  } catch (error) {
    console.error('❌ getCurrentUser 에러:', error)
    return null
  }
}

/**
 * 로그인 함수
 * @deprecated 2025-10-21 - hooks/useAuth.js의 signInWithPassword()로 대체됨
 * @see hooks/useAuth.js
 * @param {string} email - 이메일
 * @param {string} password - 비밀번호
 * @returns {Promise<object>}
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('로그인 오류:', error)
    throw error
  }
}

/**
 * 회원가입 함수
 * @deprecated 2025-10-21 - hooks/useAuth.js의 signUp()으로 대체됨
 * @see hooks/useAuth.js
 * @param {string} email - 이메일
 * @param {string} password - 비밀번호
 * @param {object} userData - 사용자 데이터 (nickname, name, phone)
 * @returns {Promise<object>}
 */
export const signUp = async (email, password, userData) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: userData.nickname,
          name: userData.name,
          phone: userData.phone
        }
      }
    })

    if (error) throw error

    // 프로필 테이블에도 추가
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: data.user.id,
          nickname: userData.nickname,
          name: userData.name,
          phone: userData.phone
        }])

      if (profileError) {
        console.error('프로필 생성 오류:', profileError)
      }
    }

    return data
  } catch (error) {
    console.error('회원가입 오류:', error)
    throw error
  }
}

/**
 * 로그아웃 함수
 * @deprecated 2025-10-21 - hooks/useAuth.js의 signOut()으로 대체됨
 * @see hooks/useAuth.js
 * @returns {Promise<boolean>}
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return true
  } catch (error) {
    console.error('로그아웃 오류:', error)
    throw error
  }
}

// ===============================
// 유틸리티 함수
// ===============================

// 개별 주문번호 생성: S + YYMMDD-XXXX (4자리 랜덤)
export const generateCustomerOrderNumber = () => {
  const date = new Date()
  const dateStr = date.getFullYear().toString().slice(-2) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0')
  const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase()
  return `S${dateStr}-${randomStr}`
}

/**
 * 그룹 주문번호 생성: G + YYMMDD-XXXX (4자리 랜덤)
 * @deprecated 2025-10-21 - 삭제 예정 (주문번호 S 통일)
 * @see DEPRECATED_FILES.md - "G/S 구분 제거 (2025-10-15)"
 * @param {string} paymentGroupId - 결제 그룹 ID
 * @returns {string} 그룹 주문번호 (예: G251021-8418)
 */
export const generateGroupOrderNumber = (paymentGroupId) => {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')

  // payment_group_id가 있으면 그 ID의 타임스탬프에서 4자리 추출
  if (paymentGroupId) {
    const timestamp = paymentGroupId.split('-')[1] || ''
    const sequence = timestamp.slice(-4).padStart(4, '0')
    return `G${year}${month}${day}-${sequence}`
  }

  // payment_group_id가 없으면 랜덤 4자리
  const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `G${year}${month}${day}-${sequence}`
}

// ===============================
// 라이브 방송 관련 API
// ===============================

export const getLiveBroadcasts = async () => {
  try {
    const { data, error } = await supabase
      .from('live_broadcasts')
      .select('*')
      .eq('status', 'live')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('라이브 방송 조회 오류:', error)
    return []
  }
}

// 사용자 정보 단일 조회
export const getUserById = async (userId) => {
  try {
    // 세션 저장소에서 먼저 확인 (카카오 로그인 사용자)
    if (typeof window !== 'undefined') {
      const userSession = sessionStorage.getItem('user')
      if (userSession) {
        const session = JSON.parse(userSession)
        if (session.id === userId) {
          return session
        }
      }
    }

    // Supabase auth에서 사용자 정보 조회
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user || user.id !== userId) {
      // auth에서 찾을 수 없으면 users 테이블에서 조회
      console.log('🔍 users 테이블에서 사용자 정보 조회:', userId)
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (!userError && userProfile) {
        console.log('👤 users 테이블에서 찾은 정보:', userProfile)
        return userProfile
      }

      // users 테이블에서도 없으면 profiles 테이블에서 조회
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.log('프로필 테이블에서도 사용자 정보를 찾을 수 없음:', userId)
        return null
      }

      console.log('👤 profiles 테이블에서 찾은 정보:', profile)
      return profile
    }

    return user
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error)
    return null
  }
}

// ===============================
// 라이브 방송 상품 관리 API
// ===============================

/**
 * 라이브 방송 중인 상품 목록 조회
 */
export const getLiveProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq('is_live_active', true)
      .order('live_priority', { ascending: true })

    if (error) throw error

    console.log('📺 라이브 상품 조회 성공:', data?.length || 0, '개')
    return data || []
  } catch (error) {
    console.error('라이브 상품 조회 오류:', error)
    throw error
  }
}

/**
 * 전체 상품 목록 조회 (관리자용)
 */
export const getAllProducts = async (filters = {}) => {
  try {
    let query = supabase
      .from('products')
      .select('*')

    // ⭐ 삭제된 상품 제외 (Soft Delete) - includeDeleted 옵션으로 제어 가능
    if (!filters.includeDeleted) {
      query = query.neq('status', 'deleted')
    }

    // 필터링 적용
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters.category_id) {
      query = query.eq('category', filters.category_id)
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,product_number.ilike.%${filters.search}%`)
    }
    if (filters.is_live_active !== undefined) {
      query = query.eq('is_live_active', filters.is_live_active)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error

    console.log('🛍️ 전체 상품 조회 성공:', data?.length || 0, '개')
    return data || []
  } catch (error) {
    console.error('전체 상품 조회 오류:', error)
    throw error
  }
}

/**
 * 상품을 라이브 방송에 추가
 */
export const addToLive = async (productId, priority = 0) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        is_live_active: true,
        live_priority: priority,
        live_start_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()

    if (error) throw error

    console.log('📺 라이브 방송 추가 성공:', productId)
    return data?.[0]
  } catch (error) {
    console.error('라이브 방송 추가 오류:', error)
    throw error
  }
}

/**
 * 상품을 라이브 방송에서 제거
 */
export const removeFromLive = async (productId) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        is_live_active: false,
        live_end_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()

    if (error) throw error

    console.log('📺 라이브 방송 제거 성공:', productId)
    return data?.[0]
  } catch (error) {
    console.error('라이브 방송 제거 오류:', error)
    throw error
  }
}

/**
 * 라이브 상품 순서 변경
 */
export const updateLivePriority = async (productId, priority) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        live_priority: priority,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()

    if (error) throw error

    console.log('📺 라이브 순서 변경 성공:', productId, '→', priority)
    return data?.[0]
  } catch (error) {
    console.error('라이브 순서 변경 오류:', error)
    throw error
  }
}


// ===============================
// 카테고리 관리 API
// ===============================

/**
 * 모든 카테고리 조회
 */
export const getCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) throw error

    logger.info('📂 카테고리 조회 성공:', data?.length || 0, '개')
    return data || []
  } catch (error) {
    console.error('카테고리 조회 오류:', error)
    throw error
  }
}

// ===============================
// Supplier (업체) 관리 API
// ===============================

/**
 * 모든 업체 조회
 */
export const getSuppliers = async () => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    logger.info('🏢 업체 조회 성공:', data?.length || 0, '개')
    return data || []
  } catch (error) {
    console.error('업체 조회 오류:', error)
    throw error
  }
}

/**
 * 업체 생성
 */
export const createSupplier = async (supplierData) => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .insert([supplierData])
      .select()
      .single()

    if (error) throw error

    logger.info('✅ 업체 생성 성공:', data.name)
    return data
  } catch (error) {
    console.error('업체 생성 오류:', error)
    throw error
  }
}

/**
 * 업체 수정
 */
export const updateSupplier = async (supplierId, supplierData) => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .update({
        ...supplierData,
        updated_at: new Date().toISOString()
      })
      .eq('id', supplierId)
      .select()
      .single()

    if (error) throw error

    logger.info('✅ 업체 수정 성공:', data.name)
    return data
  } catch (error) {
    console.error('업체 수정 오류:', error)
    throw error
  }
}

// ===============================
// Product Variant (상품 변형) API
// ===============================

/**
 * 상품의 모든 variant 조회 (옵션 정보 포함)
 */
export const getProductVariants = async (productId) => {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select(`
        *,
        variant_option_values (
          option_value_id,
          product_option_values (
            id,
            value,
            option_id,
            product_options (
              id,
              name
            )
          )
        )
      `)
      .eq('product_id', productId)
      .order('sku', { ascending: true })

    if (error) throw error

    // 데이터 구조 정리
    const variants = data.map(variant => ({
      ...variant,
      options: variant.variant_option_values.map(vov => ({
        optionName: vov.product_option_values.product_options.name,
        optionValue: vov.product_option_values.value,
        optionId: vov.product_option_values.product_options.id,
        valueId: vov.product_option_values.id
      }))
    }))

    logger.info('📦 Variant 조회 성공:', variants.length, '개')
    return variants
  } catch (error) {
    console.error('Variant 조회 오류:', error)
    throw error
  }
}

/**
 * Variant 생성
 */
export const createVariant = async (variantData, optionValueIds) => {
  try {
    logger.debug('📦 Variant 생성 시작:', variantData.sku)

    // 1. Variant 생성
    const { data: variant, error: variantError } = await supabase
      .from('product_variants')
      .insert([variantData])
      .select()
      .single()

    if (variantError) throw variantError

    // 2. Variant-Option 매핑 생성
    const mappings = optionValueIds.map(valueId => ({
      variant_id: variant.id,
      option_value_id: valueId
    }))

    const { error: mappingError } = await supabase
      .from('variant_option_values')
      .insert(mappings)

    if (mappingError) throw mappingError

    logger.info('✅ Variant 생성 성공:', variant.sku)
    return variant
  } catch (error) {
    console.error('Variant 생성 오류:', error)
    throw error
  }
}

/**
 * Variant 재고 업데이트 (RPC 함수 사용)
 */
export const updateVariantInventory = async (variantId, quantityChange) => {
  try {
    logger.debug('🔧 Variant 재고 업데이트:', { variantId, quantityChange })

    const { data, error } = await supabase.rpc('update_variant_inventory', {
      p_variant_id: variantId,
      p_quantity_change: quantityChange
    })

    if (error) throw error

    logger.info('✅ Variant 재고 업데이트 성공:', data)
    return data
  } catch (error) {
    console.error('Variant 재고 업데이트 오류:', error)
    throw error
  }
}

/**
 * Variant 정보 수정
 */
export const updateVariant = async (variantId, variantData) => {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .update({
        ...variantData,
        updated_at: new Date().toISOString()
      })
      .eq('id', variantId)
      .select()
      .single()

    if (error) throw error

    logger.info('✅ Variant 수정 성공:', data.sku)
    return data
  } catch (error) {
    console.error('Variant 수정 오류:', error)
    throw error
  }
}

/**
 * Variant 삭제
 */
export const deleteVariant = async (variantId) => {
  try {
    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', variantId)

    if (error) throw error

    logger.info('✅ Variant 삭제 성공:', variantId)
  } catch (error) {
    console.error('Variant 삭제 오류:', error)
    throw error
  }
}

/**
 * 특정 옵션 조합의 재고 확인
 */
export const checkVariantInventory = async (productId, selectedOptions) => {
  try {
    logger.debug('🔍 Variant 재고 확인:', { productId, selectedOptions })

    // 1. 상품의 모든 variant 조회
    const variants = await getProductVariants(productId)

    // 2. 선택된 옵션과 일치하는 variant 찾기
    const matchedVariant = variants.find(variant => {
      // 선택된 모든 옵션이 variant의 옵션과 일치하는지 확인
      return Object.entries(selectedOptions).every(([optionName, optionValue]) => {
        return variant.options.some(
          opt => opt.optionName === optionName && opt.optionValue === optionValue
        )
      })
    })

    if (!matchedVariant) {
      return {
        available: false,
        inventory: 0,
        variant: null
      }
    }

    return {
      available: matchedVariant.inventory > 0 && matchedVariant.is_active,
      inventory: matchedVariant.inventory,
      variant: matchedVariant
    }
  } catch (error) {
    console.error('Variant 재고 확인 오류:', error)
    throw error
  }
}

// ===============================
// Product Options (상품 옵션) API
// ===============================

/**
 * 상품의 옵션 및 값 조회
 */
export const getProductOptions = async (productId) => {
  try {
    const { data, error } = await supabase
      .from('product_options')
      .select(`
        *,
        product_option_values (
          id,
          value,
          display_order,
          color_code,
          image_url
        )
      `)
      .eq('product_id', productId)
      .order('display_order', { ascending: true })

    if (error) throw error

    // 옵션 값도 정렬
    const options = data.map(opt => ({
      ...opt,
      values: (opt.product_option_values || []).sort((a, b) => a.display_order - b.display_order)
    }))

    logger.info('🎨 옵션 조회 성공:', options.length, '개')
    return options
  } catch (error) {
    console.error('옵션 조회 오류:', error)
    throw error
  }
}

/**
 * 옵션 생성
 */
export const createProductOption = async (optionData) => {
  try {
    const { data, error } = await supabase
      .from('product_options')
      .insert([optionData])
      .select()
      .single()

    if (error) throw error

    logger.info('✅ 옵션 생성 성공:', data.name)
    return data
  } catch (error) {
    console.error('옵션 생성 오류:', error)
    throw error
  }
}

/**
 * 옵션 값 생성
 */
export const createOptionValue = async (valueData) => {
  try {
    const { data, error } = await supabase
      .from('product_option_values')
      .insert([valueData])
      .select()
      .single()

    if (error) throw error

    logger.info('✅ 옵션 값 생성 성공:', data.value)
    return data
  } catch (error) {
    console.error('옵션 값 생성 오류:', error)
    throw error
  }
}

/**
 * 상품과 옵션을 한 번에 생성 (편의 함수)
 */
export const createProductWithOptions = async (productData, optionsData) => {
  try {
    logger.debug('📦 옵션 포함 상품 생성 시작')

    // 1. 상품 생성
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single()

    if (productError) throw productError

    // 2. 옵션 생성 (있는 경우)
    if (optionsData && optionsData.length > 0) {
      for (const option of optionsData) {
        // 옵션 정의 생성
        const { data: createdOption, error: optionError } = await supabase
          .from('product_options')
          .insert([{
            product_id: product.id,
            name: option.name,
            display_order: option.display_order || 0,
            is_required: option.is_required || false
          }])
          .select()
          .single()

        if (optionError) throw optionError

        // 옵션 값 생성
        if (option.values && option.values.length > 0) {
          const values = option.values.map((value, index) => ({
            option_id: createdOption.id,
            value: value.value || value,
            display_order: value.display_order !== undefined ? value.display_order : index,
            color_code: value.color_code || null,
            image_url: value.image_url || null
          }))

          const { error: valuesError } = await supabase
            .from('product_option_values')
            .insert(values)

          if (valuesError) throw valuesError
        }
      }
    }

    logger.info('✅ 옵션 포함 상품 생성 완료:', product.title)
    return product
  } catch (error) {
    console.error('옵션 포함 상품 생성 오류:', error)
    throw error
  }
}
// ===============================
// 발주 관리 API
// ===============================

// 업체별 주문 데이터 조회
export const getPurchaseOrdersBySupplier = async (startDate = null, endDate = null) => {
  try {
    logger.debug('📋 업체별 주문 데이터 조회 시작')

    // 1. 주문 아이템 조회 (variant_id가 있는 것만)
    let query = supabase
      .from('order_items')
      .select(`
        *,
        orders (
          id,
          status,
          created_at,
          customer_order_number
        ),
        product_variants (
          id,
          sku,
          supplier_sku,
          products (
            id,
            title,
            model_number,
            purchase_price,
            supplier_id,
            suppliers (
              id,
              code,
              name,
              contact_person,
              phone
            )
          )
        )
      `)
      .not('variant_id', 'is', null)
      .in('orders.status', ['pending', 'paid', 'confirmed']) // 결제 완료된 주문만

    // 날짜 필터
    if (startDate) {
      query = query.gte('orders.created_at', startDate)
    }
    if (endDate) {
      query = query.lte('orders.created_at', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    logger.info('✅ 주문 아이템 조회 완료:', data?.length || 0, '개')

    // 2. 업체별로 그룹화
    const supplierMap = {}

    data.forEach(item => {
      const supplier = item.product_variants?.products?.suppliers
      if (!supplier) return

      const supplierId = supplier.id
      if (!supplierMap[supplierId]) {
        supplierMap[supplierId] = {
          supplier: supplier,
          items: []
        }
      }

      supplierMap[supplierId].items.push({
        orderNumber: item.orders?.customer_order_number,
        orderDate: item.orders?.created_at,
        productTitle: item.product_variants?.products?.title || item.title,
        modelNumber: item.product_variants?.products?.model_number,
        sku: item.product_variants?.sku,
        supplierSku: item.product_variants?.supplier_sku,
        quantity: item.quantity,
        purchasePrice: item.product_variants?.products?.purchase_price,
        totalPurchasePrice: (item.product_variants?.products?.purchase_price || 0) * item.quantity,
        selectedOptions: item.selected_options || item.options,
        variantId: item.variant_id
      })
    })

    // 3. 배열로 변환하고 정렬
    const result = Object.values(supplierMap).map(group => ({
      supplier: group.supplier,
      items: group.items,
      totalQuantity: group.items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: group.items.reduce((sum, item) => sum + item.totalPurchasePrice, 0)
    }))

    logger.info('✅ 업체별 그룹화 완료:', result.length, '개 업체')

    return result
  } catch (error) {
    console.error('업체별 주문 조회 오류:', error)
    throw error
  }
}

// 특정 업체의 발주서 데이터 조회
export const getPurchaseOrderBySupplier = async (supplierId, startDate = null, endDate = null) => {
  try {
    const allOrders = await getPurchaseOrdersBySupplier(startDate, endDate)
    return allOrders.find(order => order.supplier.id === supplierId) || null
  } catch (error) {
    console.error('업체 발주서 조회 오류:', error)
    throw error
  }
}
