import { supabase } from './supabase'

// ===============================
// 유틸리티 함수
// ===============================

// 최적 결제 방법 선택 함수 (0원이 아닌 금액 우선, 카드 > 기타 > bank_transfer 순서)
const getBestPayment = (payments) => {
  if (!payments || payments.length === 0) return {}

  // 모든 결제 기록의 depositor_name 디버깅
  console.log('🔍 getBestPayment 디버깅 - 모든 결제 기록:', payments.map((p, i) => ({
    index: i,
    order_id: p.order_id,
    amount: p.amount,
    method: p.method,
    depositor_name: p.depositor_name,
    status: p.status
  })))

  // 0원이 아닌 결제 정보만 필터링
  const nonZeroPayments = payments.filter(p => p.amount && p.amount > 0)

  // 0원이 아닌 결제가 있으면 그 중에서 선택
  const paymentsToCheck = nonZeroPayments.length > 0 ? nonZeroPayments : payments

  console.log('🔍 paymentsToCheck 디버깅:', paymentsToCheck.map((p, i) => ({
    index: i,
    depositor_name: p.depositor_name,
    amount: p.amount,
    method: p.method
  })))

  // depositor_name이 있는 결제를 우선 선택
  const paymentWithDepositor = paymentsToCheck.find(p => p.depositor_name)
  console.log('🔍 paymentWithDepositor 찾기 결과:', paymentWithDepositor)
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
    console.log('🏠 사용자 홈 - Supabase 직접 연결로 상품 데이터 로드 중...')

    // 관리자와 동일하게 Supabase 직접 호출
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_options (
          id,
          name,
          values
        )
      `)
      .eq('status', 'active') // 사용자는 활성 상품만
      .order('created_at', { ascending: false })

    if (error) {
      console.error('사용자 홈 상품 조회 오류:', error)
      throw error
    }

    console.log('🏠 사용자 홈 상품 조회 성공:', data?.length || 0, '개 상품')
    console.log('🏠 사용자 홈 재고 정보:', data?.map(p => ({
      id: p.id,
      title: p.title?.slice(0, 20) + '...',
      inventory: p.inventory,
      status: p.status
    })))

    // 옵션 데이터 형태 변환
    const productsWithOptions = data.map(product => ({
      ...product,
      options: product.product_options || [],
      isLive: product.tags?.includes('LIVE') || false
    }))

    console.log('📦 사용자 홈 최종 상품 데이터:', productsWithOptions.map(p => ({
      id: p.id,
      title: p.title?.slice(0, 20) + '...',
      inventory: p.inventory,
      status: p.status,
      isLive: p.isLive
    })))

    return productsWithOptions
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
      .select(`
        *,
        product_options (
          id,
          name,
          values
        )
      `)
      .eq('id', productId)
      // .eq('status', 'active') // status 컬럼이 없으므로 주석처리
      .single()

    if (error) throw error

    return {
      ...data,
      options: data.product_options || [],
      isLive: data.isLive || false // Map database field to component prop isLive
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

    console.log(`상품 ${productId} 재고 업데이트: ${currentInventory} → ${newQuantity}`)
    return data
  } catch (error) {
    console.error('상품 재고 업데이트 오류:', error)
    throw error
  }
}

// 옵션별 재고 차감 함수
export const updateOptionInventory = async (productId, selectedOptions, quantityChange) => {
  try {
    console.log('🔧 옵션별 재고 차감 시작:', { productId, selectedOptions, quantityChange })

    // 상품의 옵션 정보 조회
    const { data: productOptions, error: optionsError } = await supabase
      .from('product_options')
      .select('*')
      .eq('product_id', productId)

    if (optionsError) throw optionsError
    if (!productOptions || productOptions.length === 0) {
      console.log('옵션이 없는 상품, 기존 방식으로 재고 차감')
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

      console.log(`옵션 ${option.name}의 ${selectedValue} 재고 차감 완료`)
    }

    console.log('✅ 옵션별 재고 차감 완료')
    return true
  } catch (error) {
    console.error('옵션별 재고 차감 오류:', error)
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

export const createOrder = async (orderData, userProfile) => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('로그인이 필요합니다')

    // 카카오 사용자인 경우 별도 API 사용
    if (user.email && user.email.includes('@temp.com')) {
      console.log('카카오 사용자 주문 - 별도 API 사용')

      const response = await fetch('/api/create-order-kakao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderData,
          userProfile,
          userId: user.id
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || '주문 생성에 실패했습니다')
      }

      return result
    }

    // 일반 사용자는 기존 로직 사용
    // 1. 주문 생성
    const orderId = crypto.randomUUID()
    const customerOrderNumber = generateCustomerOrderNumber()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        id: orderId,
        customer_order_number: customerOrderNumber,
        user_id: user.id,
        status: 'pending',
        order_type: orderData.orderType || 'direct'
      }])
      .select()
      .single()

    if (orderError) throw orderError

    // 2. 주문 아이템 생성
    const { error: itemError } = await supabase
      .from('order_items')
      .insert([{
        order_id: orderId,
        product_id: orderData.id,
        quantity: orderData.quantity,
        unit_price: orderData.price,
        total_price: orderData.totalPrice,
        selected_options: orderData.selectedOptions || {}
      }])

    if (itemError) throw itemError

    // 3. 배송 정보 생성
    const { error: shippingError } = await supabase
      .from('order_shipping')
      .insert([{
        order_id: orderId,
        name: userProfile.name,
        phone: userProfile.phone,
        address: userProfile.address,
        detail_address: userProfile.detail_address || ''
      }])

    if (shippingError) throw shippingError

    // 4. 결제 정보 생성
    const shippingFee = 4000
    const totalAmount = orderData.totalPrice + shippingFee

    const { error: paymentError } = await supabase
      .from('order_payments')
      .insert([{
        order_id: orderId,
        method: 'bank_transfer', // 기본값
        amount: totalAmount,
        status: 'pending'
      }])

    if (paymentError) throw paymentError

    // 5. 재고 차감 (옵션별 재고 지원)
    if (orderData.selectedOptions && Object.keys(orderData.selectedOptions).length > 0) {
      await updateOptionInventory(orderData.id, orderData.selectedOptions, -orderData.quantity)
    } else {
      await updateProductInventory(orderData.id, -orderData.quantity)
    }

    return { ...order, items: [orderData] }
  } catch (error) {
    console.error('주문 생성 오류:', error)
    throw error
  }
}

export const getOrders = async (userId = null) => {
  try {
    const user = userId ? { id: userId } : await getCurrentUser()
    if (!user) throw new Error('로그인이 필요합니다')

    console.log('📊 주문 조회 시작 - 사용자 ID:', user.id)

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
      .eq('user_id', user.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    if (error) throw error

    console.log('📊 조회된 주문 수:', data?.length || 0)
    console.log('📊 payment_group_id 확인:', data?.map(o => ({ id: o.id, group_id: o.payment_group_id })))
    console.log('📊 결제 정보 확인:', data?.map(o => ({
      id: o.id,
      payment_count: o.order_payments?.length || 0,
      payment_method: o.order_payments?.[0]?.method || 'none'
    })))


    // Mock 형태로 변환
    const ordersWithItems = data.map(order => ({
      ...order,
      items: order.order_items.map(item => ({
        ...item.products,
        id: item.id,  // order_item의 실제 ID를 사용
        product_id: item.product_id,  // 제품 ID는 별도로 저장
        quantity: item.quantity,
        totalPrice: item.total_price,
        selectedOptions: item.selected_options || {}
      })),
      shipping: order.order_shipping[0] || {},
      payment: getBestPayment(order.order_payments)
    }))

    // payment_group_id로 주문 그룹화
    const groupedOrders = []
    const processedGroupIds = new Set()

    console.log('🔍 그룹화 시작 - 전체 주문:', ordersWithItems.length)

    for (const order of ordersWithItems) {
      // payment_group_id가 있고 아직 처리되지 않은 그룹인 경우
      if (order.payment_group_id && !processedGroupIds.has(order.payment_group_id)) {
        // 같은 group_id를 가진 모든 주문 찾기
        const groupOrders = ordersWithItems.filter(o => o.payment_group_id === order.payment_group_id)

        console.log('🔍 그룹 발견:', {
          groupId: order.payment_group_id,
          orderCount: groupOrders.length,
          orderIds: groupOrders.map(o => o.id)
        })

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

    console.log('🔍 최종 그룹화 결과:', {
      totalOrders: groupedOrders.length,
      groupOrders: groupedOrders.filter(o => o.isGroup).length,
      regularOrders: groupedOrders.filter(o => !o.isGroup).length
    })

    // 그룹 주문이 있다면 첫 번째 그룹 주문 정보 출력
    const firstGroupOrder = groupedOrders.find(o => o.isGroup)
    if (firstGroupOrder) {
      console.log('🔍 첫 번째 그룹 주문 샘플:', {
        id: firstGroupOrder.id,
        groupOrderCount: firstGroupOrder.groupOrderCount,
        originalOrderIds: firstGroupOrder.originalOrderIds
      })
    }

    return groupedOrders
  } catch (error) {
    console.error('주문 목록 조회 오류:', error)
    return []
  }
}

// 관리자용 - 모든 주문 조회
export const getAllOrders = async () => {
  try {
    console.log('🔍 관리자용 전체 주문 조회 시작')

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

    console.log(`✅ DB에서 조회된 주문 수: ${data?.length || 0}`)
    console.log('📋 조회된 주문 ID 목록:', data?.map(o => o.id) || [])

    if (data && data.length > 0) {
      console.log('📝 첫 번째 주문 상세:', {
        id: data[0].id,
        user_id: data[0].user_id,
        status: data[0].status,
        created_at: data[0].created_at,
        order_items_count: data[0].order_items?.length || 0,
        order_shipping_count: data[0].order_shipping?.length || 0,
        order_payments_count: data[0].order_payments?.length || 0
      })
    }

    // Mock 형태로 변환 - 사용자 정보도 함께 조회
    const ordersWithItems = await Promise.all(data.map(async order => {
      const shipping = order.order_shipping[0] || {}
      const payment = getBestPayment(order.order_payments)

      // 실제 사용자 정보 조회
      let userInfo = null
      if (order.user_id) {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(order.user_id)
          userInfo = userData?.user
        } catch (error) {
          console.log('사용자 정보 조회 실패:', order.user_id, error.message)
        }
      } else {
        // user_id가 없는 경우, 배송 정보의 이름으로 profiles에서 nickname 조회
        const shippingName = shipping?.name
        if (shippingName) {
          try {
            const { data: profileByName, error: profileError } = await supabase
              .from('profiles')
              .select('nickname, name')
              .eq('name', shippingName)
              .single()

            if (!profileError && profileByName) {
              userInfo = profileByName
            }
          } catch (error) {
            // 프로필 조회 실패는 무시 (선택적 기능)
          }
        }
      }

      // 사용자 정보 우선순위: DB users 테이블 > auth 메타데이터 > shipping 정보
      const userName = userInfo?.user_metadata?.name || userInfo?.name || shipping.name || '정보없음'

      // 닉네임 우선순위: auth 닉네임 > name과 다른 경우만 사용 > 익명
      let userNickname = userInfo?.user_metadata?.nickname || userInfo?.nickname

      // 닉네임이 없거나 이름과 동일한 경우에만 익명 처리
      if (!userNickname) {
        userNickname = '익명'
      }

      // 입금자명: 결제 테이블의 depositor_name 우선, 없으면 사용자명 사용
      const depositName = payment.depositor_name || (userName !== '정보없음' ? userName : null)

      return {
        ...order,
        items: order.order_items.map(item => ({
          ...item.products,
          id: item.id, // order_item의 실제 ID 사용
          product_id: item.product_id, // 제품 ID도 별도로 포함
          quantity: item.quantity,
          totalPrice: item.total_price,
          selectedOptions: item.selected_options || {}
        })),
        shipping,
        payment,
        // 실제 사용자 정보
        userId: order.user_id,
        userName,
        userNickname,
        userEmail: userInfo?.email || '정보없음',
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
          const groupOrder = {
            id: `GROUP-${order.payment_group_id}`,
            payment_group_id: order.payment_group_id,
            customer_order_number: generateGroupOrderNumber(order.payment_group_id),
            created_at: order.created_at,
            status: order.status,
            // 모든 그룹 주문의 아이템을 합침
            items: groupOrders.flatMap(o => o.items),
            // 첫 번째 주문의 배송 정보 사용
            shipping: order.shipping,
            // 총 결제 금액 합산 (배송비 중복 제거)
            payment: (() => {
              // 상품 금액만 합산
              const itemsTotal = groupOrders.reduce((sum, o) => {
                return sum + (o.items || []).reduce((itemSum, item) => {
                  return itemSum + (item.totalPrice || (item.price * item.quantity))
                }, 0)
              }, 0)
              // 배송비는 한 번만 추가
              const shippingFee = 4000
              return {
                ...order.payment,
                amount: itemsTotal + shippingFee
              }
            })(),
            // 첫 번째 주문의 사용자 정보 사용
            userId: order.userId,
            userName: order.userName,
            userNickname: order.userNickname,
            userEmail: order.userEmail,
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
    console.log('🔍 주문 상세 조회 시작:', orderId)

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
      .eq('id', orderId)
      .single()

    if (error) throw error

    console.log('📝 주문 상세 조회 결과:', {
      id: data.id,
      user_id: data.user_id,
      status: data.status,
      shipping_count: data.order_shipping?.length || 0,
      items_count: data.order_items?.length || 0,
      payments_count: data.order_payments?.length || 0
    })

    console.log('🚚 실제 배송 데이터:', data.order_shipping)
    console.log('💳 실제 결제 데이터:', data.order_payments)
    console.log('💰 선택된 최적 결제 정보:', getBestPayment(data.order_payments))

    // 그룹 주문인 경우 같은 그룹의 모든 주문 아이템 가져오기
    let allItems = data.order_items
    if (data.payment_group_id) {
      console.log('🔍 그룹 주문 감지, 같은 그룹의 모든 아이템 조회:', data.payment_group_id)

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
        console.log(`📦 그룹 주문 ${groupOrders.length}개 발견`)
        allItems = groupOrders.flatMap(order => order.order_items || [])
        console.log(`🛍️ 총 아이템 수: ${allItems.length}`)

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

        console.log('💰 그룹 주문 결제 합산 (수정됨):', {
          상품금액합계: itemsTotal,
          배송비: shippingFee,
          총결제금액: totalGroupPaymentAmount,
          기존결제방식_합산: groupPayments
            .filter(payment => payment.amount && payment.amount > 0)
            .reduce((sum, payment) => sum + payment.amount, 0),
          groupPayments: groupPayments.map(p => ({
            id: p.id,
            amount: p.amount,
            method: p.method,
            order_id: p.order_id,
            depositor_name: p.depositor_name
          }))
        })

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
      shipping: data.order_shipping[0] || {},
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
      .select('product_id, quantity')
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

    // 3. 재고 복원 (각 상품별로)
    console.log('재고 복원 시작')
    for (const item of orderItems) {
      try {
        await updateProductInventory(item.product_id, item.quantity)
        console.log(`상품 ${item.product_id} 재고 복원: +${item.quantity}`)
      } catch (inventoryError) {
        console.error(`상품 ${item.product_id} 재고 복원 실패:`, inventoryError)
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
    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
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
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId)

      if (paymentError) throw paymentError
    }

    return true
  } catch (error) {
    console.error('주문 상태 업데이트 오류:', error)
    throw error
  }
}

// 여러 주문 상태 일괄 업데이트 (전체결제 완료 후 사용) - REST API 방식
export const updateMultipleOrderStatus = async (orderIds, status, paymentData = null) => {
  try {
    console.log('일괄 주문 상태 업데이트:', { orderIds, status, paymentData })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/[\r\n\s]+/g, '')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase 환경변수가 설정되지 않았습니다')
    }

    // 전체 결제인 경우 payment_group_id 생성 (2개 이상 주문일 때)
    const paymentGroupId = orderIds.length > 1 ? `GROUP-${Date.now()}` : null
    console.log('🏷️ 전체결제 처리 - 주문 개수:', orderIds.length)
    console.log('🏷️ 생성된 그룹 ID:', paymentGroupId)

    // 각 주문 ID에 대해 순차적으로 업데이트
    for (const orderId of orderIds) {
      console.log('주문 상태 업데이트 중:', orderId, '→', status)

      // 주문 테이블 업데이트 (payment_group_id 포함)
      const updateData = {
        status: status,
        updated_at: new Date().toISOString()
      }

      // payment_group_id가 있으면 추가 (데이터베이스에 컬럼이 있는 경우에만)
      if (paymentGroupId) {
        updateData.payment_group_id = paymentGroupId
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

      // 결제 정보가 있으면 결제 테이블도 업데이트/생성
      if (paymentData) {
        console.log('💳 결제 정보 업데이트 시도:', {
          orderId,
          method: paymentData.method,
          status: 'pending',
          depositor_name: paymentData.depositorName,
          전체_paymentData: paymentData
        })

        // 먼저 UPDATE 시도
        const updatePayload = {
          method: paymentData.method,
          status: 'pending',
          depositor_name: paymentData.depositorName || null
        }
        console.log('💳 PATCH 요청 body:', updatePayload)

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

        console.log('💳 PATCH 응답 상태:', paymentUpdateResponse.status, paymentUpdateResponse.statusText)

        if (!paymentUpdateResponse.ok) {
          const errorText = await paymentUpdateResponse.text()
          console.error(`❌ PATCH 실패 응답 내용:`, errorText)
          console.warn(`⚠️ 결제 테이블 UPDATE 실패 (${orderId}), INSERT 시도...`)

          // UPDATE 실패 시 INSERT 시도 (레코드가 없는 경우)
          const insertPayload = {
            order_id: orderId,
            method: paymentData.method,
            amount: 0, // 기본값
            status: 'pending',
            depositor_name: paymentData.depositorName || null
          }
          console.log('💳 INSERT 요청 body:', insertPayload)

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
            console.log(`✅ 결제 테이블 INSERT 성공 (${orderId})`)
          }
        } else {
          console.log(`✅ 결제 테이블 UPDATE 성공 (${orderId}) - depositor_name: ${paymentData.depositorName}`)
        }
      }

      console.log('주문 상태 업데이트 완료:', orderId)
    }

    console.log('모든 주문 상태 업데이트 완료')
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

    console.log('수량 변경 및 재고 반영 완료:', { orderItemId, newQuantity, newTotalPrice, quantityDifference })
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