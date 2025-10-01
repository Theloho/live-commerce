import { supabase } from './supabase'
import { OrderCalculations } from './orderCalculations'
import logger from './logger'

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

    // 관리자와 동일하게 Supabase 직접 호출
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'active') // 사용자는 활성 상품만
      .order('created_at', { ascending: false })

    if (error) {
      console.error('사용자 홈 상품 조회 오류:', error)
      throw error
    }

    logger.info('🏠 사용자 홈 상품 조회 성공:', data?.length || 0, '개 상품')

    // 각 상품의 variant 정보 로드
    const productsWithVariants = await Promise.all(
      data.map(async (product) => {
        try {
          const variants = await getProductVariants(product.id)

          // Variant가 있으면 옵션을 variant 기반으로 생성
          let options = []
          let totalInventory = 0

          if (variants && variants.length > 0) {
            // 총 재고 계산 (모든 variant의 재고 합계)
            totalInventory = variants.reduce((sum, v) => sum + (v.inventory || 0), 0)

            // Variant에서 옵션 정보 추출
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

                  // 중복 제거하면서 옵션값 추가
                  const valueExists = optionsMap[opt.optionName].values.some(v => {
                    const vName = typeof v === 'string' ? v : (v.name || v.value)
                    return vName === opt.optionValue
                  })

                  if (!valueExists) {
                    optionsMap[opt.optionName].values.push({
                      name: opt.optionValue,
                      value: opt.optionValue,
                      // inventory는 여기에 저장하지 않음 (오해의 소지)
                      variantId: variant.id
                    })
                  }
                })
              }
            })

            options = Object.values(optionsMap)
          }

          return {
            ...product,
            options,
            variants: variants || [],
            stock_quantity: totalInventory, // 총 재고 저장
            isLive: product.is_live_active || false
          }
        } catch (error) {
          console.error(`Variant 로딩 실패 for product ${product.id}:`, error)
          return {
            ...product,
            options: [],
            variants: [],
            isLive: product.is_live_active || false
          }
        }
      })
    )

    return productsWithVariants
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

export const updateProductInventory = async (productId, quantityChange) => {
  try {
    // 현재 재고 조회 (inventory 컬럼 사용)
    const { data: product, error: selectError } = await supabase
      .from('products')
      .select('id, inventory')
      .eq('id', productId)
      .single()

    if (selectError) throw selectError

    const currentInventory = product.inventory || 0
    const newQuantity = Math.max(0, currentInventory + quantityChange)

    // 재고 업데이트
    const { data, error } = await supabase
      .from('products')
      .update({
        inventory: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single()

    if (error) throw error

    logger.info(`상품 ${productId} 재고 업데이트: ${currentInventory} → ${newQuantity}`)
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
 * @param {object} orderData - 주문 데이터
 * @param {object} userProfile - 사용자 프로필
 * @param {string} depositName - 입금자명
 * @returns {Promise<object>} 생성된 주문
 */
export const createOrderWithOptions = async (orderData, userProfile, depositName = null) => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('로그인이 필요합니다')

    logger.debug('📦 옵션 재고 검증 포함 주문 생성 시작:', user.name)

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

    // 2. 기존 주문 생성 로직 (재고 차감 전까지)
    const normalizedOrderData = {
      ...orderData,
      title: orderData.title || '상품명 미확인',
      price: orderData.price || orderData.totalPrice,
      totalPrice: orderData.totalPrice || orderData.price,
      quantity: orderData.quantity || 1
    }

    const orderId = crypto.randomUUID()
    const customerOrderNumber = generateCustomerOrderNumber()

    // auth.users 확인
    let validUserId = null
    try {
      const { data: authUser, error: authError } = await supabase.auth.getUser()

      if (authUser?.user && authUser.user.id === user.id) {
        validUserId = user.id
        logger.debug('✅ 인증된 사용자 확인:', validUserId)
      } else if (authUser?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (profile) {
          validUserId = user.id
          logger.debug('✅ 프로필 기반 사용자 확인:', validUserId)
        }
      }
    } catch (error) {
      logger.debug('Auth 사용자 확인 중 오류:', error.message)

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (profile) {
          validUserId = user.id
          logger.debug('✅ 프로필 직접 확인으로 사용자 인정:', validUserId)
        }
      } catch (profileError) {
        logger.debug('프로필 확인도 실패, user_id null로 설정')
      }
    }

    // 주문 생성
    const orderData_final = {
      id: orderId,
      customer_order_number: customerOrderNumber,
      status: 'pending',
      order_type: user.kakao_id
        ? `${orderData.orderType || 'direct'}:KAKAO:${user.kakao_id}`
        : (orderData.orderType || 'direct'),
      total_amount: orderData.totalPrice
    }

    if (validUserId) {
      orderData_final.user_id = validUserId
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderData_final])
      .select()
      .single()

    if (orderError) {
      console.error('주문 생성 오류:', orderError)
      throw orderError
    }

    // 3. 주문 아이템 생성 (옵션 정보 저장)
    const itemData = {
      order_id: orderId,
      product_id: normalizedOrderData.id,
      title: normalizedOrderData.title || '상품명 미확인',
      quantity: normalizedOrderData.quantity,
      price: normalizedOrderData.price,
      total: normalizedOrderData.totalPrice || (normalizedOrderData.price * normalizedOrderData.quantity),
      unit_price: normalizedOrderData.price,
      total_price: normalizedOrderData.totalPrice || (normalizedOrderData.price * normalizedOrderData.quantity),
      selected_options: normalizedOrderData.selectedOptions || {},
      variant_title: normalizedOrderData.variant || null,
      variant_id: normalizedOrderData.variantId || null, // ⭐ variant_id 저장
      sku: normalizedOrderData.sku || null,
      product_snapshot: normalizedOrderData.productSnapshot || {}
    }

    const { error: itemError } = await supabase
      .from('order_items')
      .insert([itemData])

    if (itemError) throw itemError

    // 4. 배송 정보 생성
    const shippingData = {
      order_id: orderId,
      name: userProfile.name || user.name || user.nickname || '주문자',
      phone: userProfile.phone || user.phone || '연락처 미입력',
      address: userProfile.address || '배송지 미입력',
      detail_address: userProfile.detail_address || ''
    }

    const { error: shippingError } = await supabase
      .from('order_shipping')
      .insert([shippingData])

    if (shippingError) throw shippingError

    // 5. 결제 정보 생성
    const shippingFee = 4000
    const totalAmount = normalizedOrderData.totalPrice + shippingFee

    const paymentData = {
      order_id: orderId,
      method: 'bank_transfer',
      amount: totalAmount,
      status: 'pending',
      depositor_name: depositName || userProfile.name || ''
    }

    const { error: paymentError } = await supabase
      .from('order_payments')
      .insert([paymentData])

    if (paymentError) throw paymentError

    // 6. 재고 차감
    // variantId가 있으면 이미 BuyBottomSheet에서 차감 완료했으므로 스킵
    if (normalizedOrderData.variantId) {
      logger.info('ℹ️ variantId 존재, 재고 차감 스킵 (이미 차감됨)')
    } else if (orderData.selectedOptions && Object.keys(orderData.selectedOptions).length > 0) {
      // 옵션이 있지만 variantId가 없는 경우 (레거시)
      logger.debug('⚠️ 옵션 있음 + variantId 없음, 기존 재고 차감 방식 사용')
      await updateOptionInventory(normalizedOrderData.id, orderData.selectedOptions, -normalizedOrderData.quantity)
    } else {
      // Variant도 옵션도 없는 상품은 기존 방식으로 재고 차감
      logger.debug('⚠️ Variant 없음, 기존 재고 차감 방식 사용')
      await updateProductInventory(normalizedOrderData.id, -normalizedOrderData.quantity)
    }

    logger.info('✅ 주문 생성 완료 (옵션 재고 관리 포함):', order.id)
    return { ...order, items: [normalizedOrderData] }
  } catch (error) {
    console.error('주문 생성 오류 (옵션):', error)
    throw error
  }
}

// 옵션별 재고 차감 함수 (기존 - 호환성 유지)
export const updateOptionInventory = async (productId, selectedOptions, quantityChange) => {
  try {
    logger.debug('🔧 옵션별 재고 차감 시작 (레거시):', { productId, selectedOptions, quantityChange })

    // 상품의 옵션 정보 조회
    const { data: productOptions, error: optionsError } = await supabase
      .from('product_options')
      .select('*')
      .eq('product_id', productId)

    if (optionsError) throw optionsError
    if (!productOptions || productOptions.length === 0) {
      logger.debug('옵션이 없는 상품, 기존 방식으로 재고 차감')
      return await updateProductInventory(productId, quantityChange)
    }

    // 각 옵션의 재고 업데이트
    for (const option of productOptions) {
      const selectedValue = selectedOptions[option.id]
      if (!selectedValue) continue

      const values = Array.isArray(option.values) ? option.values : []
      const updatedValues = values.map(value => {
        if (typeof value === 'string') {
          // 기존 문자열 형태는 객체로 변환
          return value === selectedValue
            ? { name: value, inventory: Math.max(0, 10 + quantityChange) }
            : { name: value, inventory: 10 }
        } else if (value.name === selectedValue) {
          // 선택된 옵션의 재고 차감
          return {
            ...value,
            inventory: Math.max(0, (value.inventory || 0) + quantityChange)
          }
        }
        return value
      })

      // 옵션 재고 업데이트
      const { error: updateError } = await supabase
        .from('product_options')
        .update({ values: updatedValues })
        .eq('id', option.id)

      if (updateError) throw updateError
    }

    logger.info('✅ 옵션별 재고 차감 완료 (레거시)')
    return true
  } catch (error) {
    console.error('옵션별 재고 차감 오류 (레거시):', error)
    throw error
  }
}

export const deleteProduct = async (productId) => {
  try {
    const { error } = await supabase
      .from('products')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('상품 삭제 오류:', error)
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

    logger.debug('📦 통합 주문 생성 시작 - 사용자:', user.name, '입금자명:', depositName)

    // 주문 데이터 정규화
    const normalizedOrderData = {
      ...orderData,
      title: orderData.title || '상품명 미확인', // title 필드 명시적 추가
      price: orderData.price || orderData.totalPrice, // price가 없으면 totalPrice 사용
      totalPrice: orderData.totalPrice || orderData.price, // totalPrice가 없으면 price 사용
      quantity: orderData.quantity || 1
    }

    // 통합 주문 생성 로직 (카카오/일반 사용자 모두 동일 처리)
    // 1. 주문 생성
    const orderId = crypto.randomUUID()
    const customerOrderNumber = generateCustomerOrderNumber()

    // auth.users에 실제 사용자가 있는지 확인
    let validUserId = null
    try {
      const { data: authUser, error: authError } = await supabase.auth.getUser()

      if (authUser?.user && authUser.user.id === user.id) {
        validUserId = user.id
        logger.debug('✅ 인증된 사용자 확인:', validUserId)
      } else if (authUser?.user) {
        // auth 사용자는 있지만 다른 사용자인 경우, profiles에서 확인
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (profile) {
          validUserId = user.id
          logger.debug('✅ 프로필 기반 사용자 확인:', validUserId)
        }
      }
    } catch (error) {
      logger.debug('Auth 사용자 확인 중 오류:', error.message)

      // 마지막 시도: profiles 테이블에서 직접 확인
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (profile) {
          validUserId = user.id
          logger.debug('✅ 프로필 직접 확인으로 사용자 인정:', validUserId)
        }
      } catch (profileError) {
        logger.debug('프로필 확인도 실패, user_id null로 설정')
      }
    }

    // 주문 생성 (카카오 사용자의 경우 user_id null 가능)
    const orderData_final = {
      id: orderId,
      customer_order_number: customerOrderNumber,
      status: 'pending',
      order_type: user.kakao_id
        ? `${orderData.orderType || 'direct'}:KAKAO:${user.kakao_id}`
        : (orderData.orderType || 'direct'),
      total_amount: orderData.totalPrice // 상품금액 + 배송비 총액
    }

    if (validUserId) {
      orderData_final.user_id = validUserId
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderData_final])
      .select()
      .single()

    if (orderError) {
      console.error('주문 생성 오류:', orderError)
      throw orderError
    }

    // 2. 주문 아이템 생성 (개발 스키마 기준: 신/구 컬럼 모두 지원)
    const itemData = {
      order_id: orderId,
      product_id: normalizedOrderData.id,
      title: normalizedOrderData.title || '상품명 미확인',
      quantity: normalizedOrderData.quantity,
      price: normalizedOrderData.price, // 개발 스키마 신규 컬럼
      total: normalizedOrderData.totalPrice || (normalizedOrderData.price * normalizedOrderData.quantity), // 개발 스키마 신규 컬럼
      unit_price: normalizedOrderData.price, // 기존 컬럼 (호환성 유지)
      total_price: normalizedOrderData.totalPrice || (normalizedOrderData.price * normalizedOrderData.quantity), // 기존 컬럼 (호환성 유지)
      selected_options: normalizedOrderData.selectedOptions || {},
      variant_title: normalizedOrderData.variant || null,
      variant_id: normalizedOrderData.variantId || null, // ⭐ variant_id 저장
      sku: normalizedOrderData.sku || null,
      product_snapshot: normalizedOrderData.productSnapshot || {}
    }

    const { error: itemError } = await supabase
      .from('order_items')
      .insert([itemData])

    if (itemError) throw itemError

    // 3. 배송 정보 생성 (selectedAddress 우선 사용)
    const shippingData = {
      order_id: orderId,
      name: userProfile.name || user.name || user.nickname || '주문자',
      phone: userProfile.phone || user.phone || '연락처 미입력',
      address: userProfile.address || '배송지 미입력',
      detail_address: userProfile.detail_address || ''
    }

    const { error: shippingError } = await supabase
      .from('order_shipping')
      .insert([shippingData])

    if (shippingError) throw shippingError

    // 4. 결제 정보 생성
    const shippingFee = 4000
    const totalAmount = normalizedOrderData.totalPrice + shippingFee

    const paymentData = {
      order_id: orderId,
      method: 'bank_transfer', // 기본값
      amount: totalAmount,
      status: 'pending',
      depositor_name: depositName || userProfile.name || '' // 입금자명 저장
    }

    const { error: paymentError } = await supabase
      .from('order_payments')
      .insert([paymentData])

    if (paymentError) throw paymentError

    // 5. 재고 차감 (Variant 기반)
    if (normalizedOrderData.variantId) {
      // Variant가 있는 경우 - Variant 재고 차감
      logger.debug('🔧 Variant 재고 차감 시작:', normalizedOrderData.variantId)

      try {
        const result = await updateVariantInventory(
          normalizedOrderData.variantId,
          -normalizedOrderData.quantity
        )

        if (!result || !result.success) {
          throw new Error('Variant 재고 차감 실패')
        }

        logger.info(`✅ Variant 재고 차감 완료: ${normalizedOrderData.variantId} (-${normalizedOrderData.quantity}개)`)
      } catch (inventoryError) {
        console.error(`❌ Variant 재고 차감 실패:`, inventoryError)

        if (inventoryError.message && inventoryError.message.includes('Insufficient inventory')) {
          throw new Error('재고가 부족합니다')
        }
        throw new Error(`재고 차감 실패: ${inventoryError.message}`)
      }
    } else {
      // Variant가 없는 상품은 기존 방식으로 재고 차감 (하위 호환성)
      logger.debug('⚠️ Variant 없음, 기존 재고 차감 방식 사용')
      await updateProductInventory(normalizedOrderData.id, -normalizedOrderData.quantity)
    }

    logger.info('✅ 주문 생성 완료:', order.id)
    return { ...order, items: [normalizedOrderData] }
  } catch (error) {
    console.error('주문 생성 오류:', error)
    throw error
  }
}

export const getOrders = async (userId = null) => {
  try {
    // ✅ UserProfileManager 기반 통합 주문 조회
    const { UserProfileManager } = await import('./userProfileManager')

    logger.debug('🎯 UserProfileManager 기반 주문 조회 시작')

    // 통합 사용자 식별 정보 가져오기
    const userQuery = UserProfileManager.getUserOrderQuery()

    // 기본 쿼리 구성
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            title,
            thumbnail_url,
            price
          ),
          product_variants (
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
          )
        ),
        order_shipping (*),
        order_payments (*)
      `)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    // UserProfileManager 기반 사용자별 필터링
    let data = []
    if (userQuery.type === 'kakao') {
      // 기본 조회
      let kakaoQuery = query.eq(userQuery.query.column, userQuery.query.value)
      const { data: primaryData, error: primaryError } = await kakaoQuery
      if (primaryError) throw primaryError

      data = primaryData || []

      // alternativeQueries가 있고 기본 조회 결과가 없으면 대체 조회 시도
      if (data.length === 0 && userQuery.alternativeQueries) {
        logger.debug('🔄 대체 조회 조건들로 재시도...')

        for (const altQuery of userQuery.alternativeQueries) {
          let altQueryBuilder = supabase
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
            .eq(altQuery.column, altQuery.value)

          const { data: altData, error: altError } = await altQueryBuilder
          if (altError) {
            logger.debug('대체 조회 오류:', altError.message)
            continue
          }

          if (altData && altData.length > 0) {
            data = altData
            logger.debug('✅ 대체 조회 성공:', data.length, '개')
            break
          }
        }
      }
    } else if (userQuery.type === 'supabase') {
      const { data: supabaseData, error } = await query.eq(userQuery.query.column, userQuery.query.value)
      if (error) throw error
      data = supabaseData || []
    }

    let error = null // 에러는 이미 위에서 처리됨

    logger.info('✅ UserProfileManager 조회 완료:', data?.length || 0, '개')

    // UserProfileManager 기반 조회이므로 추가 필터링 불필요
    const secureFilteredData = data

    // 필터링된 데이터로 교체
    const finalData = secureFilteredData


    // Mock 형태로 변환
    const ordersWithItems = finalData.map(order => ({
      ...order,
      items: order.order_items.map(item => {
        // 🔧 unit_price 우선 사용, 없으면 total_price / quantity로 계산
        const unitPrice = item.unit_price || (item.total_price / item.quantity) || 0
        const totalPrice = item.total_price || (unitPrice * item.quantity) || 0

        return {
          ...item.products,
          id: item.id,  // order_item의 실제 ID를 사용
          product_id: item.product_id,  // 제품 ID는 별도로 저장
          title: item.title || item.products?.title || '상품', // DB의 title 또는 products.title 사용
          quantity: item.quantity,
          price: unitPrice, // 🔧 unit_price 사용
          total: totalPrice, // 🔧 total_price 사용
          totalPrice: totalPrice, // UI 호환성을 위한 alias
          selectedOptions: item.selected_options || {},
          variant: item.variant_title || null,
          sku: item.sku || null,
          thumbnail_url: item.products?.thumbnail_url || '/placeholder.png'
        }
      }),
      shipping: {
        name: order.shipping_name || order.order_shipping[0]?.name || '',
        phone: order.shipping_phone || order.order_shipping[0]?.phone || '',
        address: order.shipping_address || order.order_shipping[0]?.address || '',
        detail_address: order.shipping_detail_address || order.order_shipping[0]?.detail_address || ''
      },
      payment: getBestPayment(order.order_payments)
    }))

    // payment_group_id로 주문 그룹화
    const groupedOrders = []
    const processedGroupIds = new Set()

    for (const order of ordersWithItems) {
      // payment_group_id가 있고 아직 처리되지 않은 그룹인 경우
      if (order.payment_group_id && !processedGroupIds.has(order.payment_group_id)) {
        // 같은 group_id를 가진 모든 주문 찾기
        const groupOrders = ordersWithItems.filter(o => o.payment_group_id === order.payment_group_id)

        if (groupOrders.length > 1) {
          // 여러 개 주문이 그룹화된 경우
          const groupOrder = {
            id: `GROUP-${order.payment_group_id}`,
            payment_group_id: order.payment_group_id,
            customer_order_number: generateGroupOrderNumber(order.payment_group_id),
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
          // 단일 주문이지만 payment_group_id가 있는 경우 (전체결제에서 1개만 결제한 경우)
          // 그룹으로 처리하지 않고 일반 주문으로 표시
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

    return groupedOrders
  } catch (error) {
    console.error('주문 목록 조회 오류:', error)
    return []
  }
}

// 관리자용 - 모든 주문 조회 (UserProfileManager 통합)
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

    if (error) {
      console.error('❌ 주문 조회 쿼리 오류:', error)
      throw error
    }

    logger.info(`✅ DB에서 조회된 주문 수: ${data?.length || 0}`)

    // Mock 형태로 변환 - 사용자 정보도 함께 조회
    const ordersWithItems = await Promise.all(data.map(async order => {
      const shipping = order.order_shipping[0] || {}
      const payment = getBestPayment(order.order_payments)

      // 실제 사용자 정보 조회
      let userInfo = null
      let profileInfo = null

      if (order.user_id) {
        try {
          // Auth 정보 조회
          const { data: userData } = await supabase.auth.admin.getUserById(order.user_id)
          userInfo = userData?.user

          // Profile 정보 조회
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('nickname, name')
            .eq('id', order.user_id)
            .single()

          if (profileData) {
            profileInfo = profileData
          }
        } catch (error) {
          logger.debug('사용자 정보 조회 실패:', order.user_id, error.message)
        }
      } else {
        // user_id가 없는 경우 - 카카오 사용자 또는 게스트 주문
        // 카카오 주문인지 확인 (direct:KAKAO 또는 cart:KAKAO)
        if (order.order_type?.includes(':KAKAO:')) {
          const kakaoId = order.order_type.split(':KAKAO:')[1]

          // 카카오 사용자는 배송지 이름을 사용자명으로 처리
          profileInfo = {
            name: shipping?.name || '카카오 사용자',
            nickname: shipping?.name || '카카오 사용자'
          }
        } else {
          // 일반 게스트 주문: 배송 정보의 이름으로 profiles에서 조회
          const shippingName = shipping?.name
          if (shippingName) {
            try {
              const { data: profileByName, error: profileError } = await supabase
                .from('profiles')
                .select('nickname, name')
                .eq('name', shippingName)
                .single()

              if (!profileError && profileByName) {
                profileInfo = profileByName
              }
            } catch (error) {
              // 프로필 조회 실패는 무시 (선택적 기능)
            }
          }
        }
      }

      // 사용자 정보 우선순위: profiles 테이블 > auth 메타데이터 > shipping 정보
      const userName = profileInfo?.name || userInfo?.user_metadata?.name || userInfo?.name || shipping.name || '정보없음'

      // 닉네임 우선순위: profiles 테이블 > auth 메타데이터 > 익명
      let userNickname = profileInfo?.nickname || userInfo?.user_metadata?.nickname || userInfo?.nickname

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
        userEmail: userInfo?.email || '정보없음',
        // 사용자 객체에 profile 정보 포함
        user: {
          ...userInfo,
          profile: profileInfo,
          name: userName,
          nickname: userNickname
        },
        // 입금자명 추가
        depositName
      }
    }))

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
            customer_order_number: generateGroupOrderNumber(order.payment_group_id),
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

    // profiles 테이블에서 모든 사용자 조회
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profileError) {
      console.error('profiles 조회 오류:', profileError)
      throw profileError
    }

    console.log(`🔍 profiles 테이블에서 ${profiles.length}명 발견`)

    // 각 사용자의 주문 통계 곈4산
    const customers = await Promise.all(
      profiles.map(async (profile) => {
        try {
          // 해당 사용자의 주문 정보 조회 (고객명으로 매칭)
          const { data: orders, error: orderError } = await supabase
            .from('orders')
            .select(`
              id,
              created_at,
              total_amount,
              status,
              order_shipping!inner (
                name,
                phone,
                address
              ),
              order_payments (
                amount,
                method,
                status
              )
            `)
            .eq('order_shipping.name', profile.name)

          if (orderError) {
            console.warn(`사용자 ${profile.id} 주문 조회 오류:`, orderError)
          }

          // 주문 통계 곈4산
          const orderCount = orders?.length || 0
          let totalSpent = 0
          let lastOrderDate = null
          let latestShippingInfo = null

          if (orders && orders.length > 0) {
            // 결제완료 주문만 매출에 포함
            orders.forEach(order => {
              if (order.status === 'paid' || order.status === 'delivered') {
                const payment = order.order_payments?.[0]
                totalSpent += payment?.amount || order.total_amount || 0
              }
            })

            // 최근 주문일과 배송 정보 (가장 최신 주문 기준)
            const sortedOrders = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            lastOrderDate = sortedOrders[0].created_at
            latestShippingInfo = sortedOrders[0].order_shipping?.[0]
          }

          return {
            id: profile.id,
            name: profile.name || latestShippingInfo?.name || '정보없음',
            nickname: profile.nickname || profile.name || '사용자',
            phone: profile.phone || latestShippingInfo?.phone || '정보없음',
            address: profile.address || latestShippingInfo?.address || '정보없음',
            detailAddress: profile.detail_address || latestShippingInfo?.detail_address || '',
            avatar_url: profile.avatar_url || '',
            tiktokId: profile.tiktok_id || '',
            youtubeId: profile.youtube_id || '',
            kakaoLink: profile.kakao_link || profile.kakao_id || '',
            created_at: profile.created_at,
            orderCount,
            totalSpent,
            lastOrderDate,
            status: orderCount > 0 ? 'active' : 'inactive'
          }
        } catch (error) {
          console.error(`사용자 ${profile.id} 처리 오류:`, error)
          return {
            id: profile.id,
            name: profile.name || '정보없음',
            nickname: profile.nickname || profile.name || '사용자',
            phone: profile.phone || '정보없음',
            address: profile.address || '정보없음',
            detailAddress: profile.detail_address || '',
            avatar_url: profile.avatar_url || '',
            tiktokId: '',
            youtubeId: '',
            kakaoLink: profile.kakao_link || profile.kakao_id || '',
            created_at: profile.created_at,
            orderCount: 0,
            totalSpent: 0,
            lastOrderDate: null,
            status: 'inactive'
          }
        }
      })
    )

    console.log(`✅ 고객 ${customers.length}명 조회 완료`)
    return customers

  } catch (error) {
    console.error('고객 목록 조회 오류:', error)
    return []
  }
}

export const getOrderById = async (orderId) => {
  try {
    logger.debug('🔍 주문 상세 조회 시작:', orderId)

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
          ),
          product_variants (
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
          )
        ),
        order_shipping (*),
        order_payments (*)
      `)
      .eq('id', orderId)
      .single()

    if (error) throw error

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
        detail_address: data.shipping_detail_address || data.order_shipping[0]?.detail_address || ''
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

          if (!result || !result.success) {
            throw new Error('Variant 재고 복원 실패')
          }

          console.log(`✅ Variant ${item.variant_id} 재고 복원: +${item.quantity}개`)
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

// 주문 상태 업데이트 (일괄결제 완료 후 사용)
export const updateOrderStatus = async (orderId, status, paymentData = null) => {
  try {
    const now = new Date().toISOString()
    const updateData = {
      status: status,
      updated_at: now
    }

    // ✨ 상태별 타임스탬프 자동 기록
    if (status === 'verifying') {
      updateData.verifying_at = now
      logger.info('🕐 결제 확인중 시간 기록:', orderId)
    }
    if (status === 'paid') {
      updateData.paid_at = now
      logger.info('💰 결제 완료 시간 기록:', orderId)
    }
    if (status === 'delivered') {
      updateData.delivered_at = now
      logger.info('🚚 발송 완료 시간 기록:', orderId)
    }
    if (status === 'cancelled') {
      updateData.cancelled_at = now
      logger.info('❌ 주문 취소 시간 기록:', orderId)
    }

    const { error: orderError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (orderError) throw orderError

    // 결제 정보가 있으면 결제 테이블도 업데이트
    if (paymentData) {
      const { error: paymentError } = await supabase
        .from('order_payments')
        .update({
          method: paymentData.method,
          payment_status: 'completed',
          paid_at: now,
          updated_at: now
        })
        .eq('order_id', orderId)

      if (paymentError) throw paymentError
    }

    logger.info('✅ 주문 상태 업데이트 완료:', orderId, status)
    return true
  } catch (error) {
    console.error('주문 상태 업데이트 오류:', error)
    throw error
  }
}

// 여러 주문 상태 일괄 업데이트 (전체결제 완료 후 사용) - REST API 방식
export const updateMultipleOrderStatus = async (orderIds, status, paymentData = null) => {
  try {
    logger.debug('일괄 주문 상태 업데이트:', orderIds.length, '개 주문')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/[\r\n\s]+/g, '')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase 환경변수가 설정되지 않았습니다')
    }

    // 전체 결제인 경우 payment_group_id 생성 (2개 이상 주문일 때)
    const paymentGroupId = orderIds.length > 1 ? `GROUP-${Date.now()}` : null
    if (paymentGroupId) {
      logger.info('🏷️ 전체결제 처리 - 주문 개수:', orderIds.length, '그룹 ID:', paymentGroupId)
    }

    // 각 주문 ID에 대해 순차적으로 업데이트
    for (const orderId of orderIds) {

      // 주문 테이블 업데이트 (payment_group_id 및 배송지 정보 포함)
      const now = new Date().toISOString()
      const updateData = {
        status: status,
        updated_at: now
      }

      // ✨ 상태별 타임스탬프 자동 기록
      if (status === 'verifying') {
        updateData.verifying_at = now
      }
      if (status === 'paid') {
        updateData.paid_at = now
      }
      if (status === 'delivered') {
        updateData.delivered_at = now
      }
      if (status === 'cancelled') {
        updateData.cancelled_at = now
      }

      // payment_group_id가 있으면 추가 (데이터베이스에 컬럼이 있는 경우에만)
      if (paymentGroupId) {
        updateData.payment_group_id = paymentGroupId
      }

      // 배송지 정보가 있으면 추가 (orders 테이블)
      if (paymentData && paymentData.shippingData) {
        const shippingData = paymentData.shippingData

        if (shippingData.shipping_name) {
          updateData.shipping_name = shippingData.shipping_name
        }
        if (shippingData.shipping_phone) {
          updateData.shipping_phone = shippingData.shipping_phone
        }
        if (shippingData.shipping_address) {
          updateData.shipping_address = shippingData.shipping_address
        }
        if (shippingData.shipping_detail_address !== undefined) {
          updateData.shipping_detail_address = shippingData.shipping_detail_address
        }
      }

      const orderUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
      })

      if (!orderUpdateResponse.ok) {
        throw new Error(`주문 상태 업데이트 실패 (${orderId}): ${orderUpdateResponse.status}`)
      }

      // 🔧 order_shipping 테이블도 업데이트 (중요!)
      if (paymentData && paymentData.shippingData) {
        const shippingData = paymentData.shippingData

        const shippingUpdatePayload = {
          name: shippingData.shipping_name,
          phone: shippingData.shipping_phone,
          address: shippingData.shipping_address,
          detail_address: shippingData.shipping_detail_address || ''
        }

        // 먼저 UPDATE 시도
        const shippingUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/order_shipping?order_id=eq.${orderId}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(shippingUpdatePayload)
        })

        if (!shippingUpdateResponse.ok) {
          logger.debug(`⚠️ order_shipping UPDATE 실패 (${orderId}), INSERT 시도...`)

          // UPDATE 실패 시 INSERT 시도
          const shippingInsertPayload = {
            order_id: orderId,
            ...shippingUpdatePayload,
            shipping_fee: 4000
          }

          const shippingInsertResponse = await fetch(`${supabaseUrl}/rest/v1/order_shipping`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(shippingInsertPayload)
          })

          if (!shippingInsertResponse.ok) {
            console.error(`❌ order_shipping INSERT도 실패 (${orderId}):`, shippingInsertResponse.status)
          } else {
            logger.debug(`✅ order_shipping INSERT 성공 (${orderId})`)
          }
        } else {
          logger.debug(`✅ order_shipping UPDATE 성공 (${orderId})`)
        }
      }

      // 결제 정보가 있으면 결제 테이블도 업데이트/생성
      if (paymentData) {
        // 먼저 UPDATE 시도
        const updatePayload = {
          method: paymentData.method,
          status: 'pending',
          depositor_name: paymentData.depositorName || null
        }

        const paymentUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/order_payments?order_id=eq.${orderId}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(updatePayload)
        })

        if (!paymentUpdateResponse.ok) {
          const errorText = await paymentUpdateResponse.text()
          console.error(`❌ PATCH 실패 응답 내용:`, errorText)
          logger.debug(`⚠️ 결제 테이블 UPDATE 실패 (${orderId}), INSERT 시도...`)

          // UPDATE 실패 시 INSERT 시도 (레코드가 없는 경우)
          const insertPayload = {
            order_id: orderId,
            method: paymentData.method,
            amount: 0, // 기본값
            status: 'pending',
            depositor_name: paymentData.depositorName || null
          }

          const paymentInsertResponse = await fetch(`${supabaseUrl}/rest/v1/order_payments`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(insertPayload)
          })

          if (!paymentInsertResponse.ok) {
            console.error(`❌ 결제 테이블 INSERT도 실패 (${orderId}):`, paymentInsertResponse.status)
          } else {
            logger.debug(`✅ 결제 테이블 INSERT 성공 (${orderId})`)
          }
        } else {
          logger.debug(`✅ 결제 테이블 UPDATE 성공 (${orderId})`)
        }
      }
    }

    logger.info('모든 주문 상태 업데이트 완료:', orderIds.length, '개')
    return { success: true, paymentGroupId }
  } catch (error) {
    console.error('일괄 주문 상태 업데이트 오류:', error)
    throw error
  }
}

// 주문 아이템 수량 업데이트 및 재고 반영 (REST API 방식)
export const updateOrderItemQuantity = async (orderItemId, newQuantity) => {
  try {
    console.log('수량 변경 시작:', { orderItemId, newQuantity })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://xoinislnaxllijlnjeue.supabase.co'
    const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvaW5pc2xuYXhsbGlqbG5qZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjM3MjEsImV4cCI6MjA3NDA5OTcyMX0.NnX051NMmeECmVTzPybzl5jF4Mk7RhmekJcnOCzG7lI')?.replace(/[\r\n\s]+/g, '')

    // 1. 현재 주문 아이템 정보 가져오기 (id로 조회)
    const fetchResponse = await fetch(`${supabaseUrl}/rest/v1/order_items?id=eq.${orderItemId}&select=quantity,total_price,id,product_id`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
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
        'Authorization': `Bearer ${supabaseKey}`,
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
      console.log('재고 반영 시작:', { productId: currentItem.product_id, quantityDifference })

      try {
        // 재고 변경량은 주문 수량 변경과 반대
        // 주문 수량이 증가(+1)하면 재고는 차감(-1)
        // 주문 수량이 감소(-1)하면 재고는 증가(+1)
        await updateProductInventory(currentItem.product_id, -quantityDifference)
        console.log(`상품 ${currentItem.product_id} 재고 반영 완료: ${quantityDifference > 0 ? '차감' : '증가'} ${Math.abs(quantityDifference)}`)
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

export const getCurrentUser = async () => {
  try {
    console.log('getCurrentUser 호출됨')

    // 브라우저 환경에서만 sessionStorage 접근
    if (typeof window !== 'undefined') {
      // 먼저 user 세션 확인 (카카오 로그인 포함)
      const userSession = sessionStorage.getItem('user')
      console.log('사용자 세션 확인:', userSession ? '있음' : '없음')

      if (userSession) {
        const session = JSON.parse(userSession)
        console.log('세션 파싱 결과:', session)
        console.log('사용자 ID:', session.id)
        console.log('사용자 이메일:', session.email)
        // 카카오 사용자인지 확인
        if (session.email && session.email.includes('@temp.com')) {
          console.log('카카오 사용자 확인됨')
        }
        return session
      }
    }

    console.log('Supabase 세션 확인 시작')
    // 카카오 세션이 없으면 Supabase 세션 확인
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.log('Supabase 세션 오류:', error.message)
      throw error
    }
    console.log('Supabase 사용자:', user)
    return user
  } catch (error) {
    console.error('현재 사용자 조회 오류:', error)
    return null
  }
}

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

// 그룹 주문번호 생성: G + YYMMDD-XXXX (4자리 랜덤)
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
      .select(`
        *,
        categories (
          id,
          name
        )
      `)

    // 필터링 적용
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id)
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
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
