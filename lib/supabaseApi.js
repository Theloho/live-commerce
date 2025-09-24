import { supabase } from './supabase'

// ===============================
// 상품 관련 API
// ===============================

export const getProducts = async (filters = {}) => {
  try {
    console.log('API 엔드포인트로 상품 데이터 로드 중...')

    // API 엔드포인트 사용 (RLS 우회)
    const response = await fetch('/api/get-products')

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || '상품 조회 실패')
    }

    console.log('API 응답 성공:', result.products?.length || 0, '개 상품')
    const data = result.products || []

    // 옵션 데이터 형태 변환 (Mock 데이터와 호환)
    const productsWithOptions = data.map(product => ({
      ...product,
      options: product.product_options || product.options || [],
      isLive: product.isLive || false,
      // 재고 정보 로깅 추가
      stock_info: {
        stock_quantity: product.stock_quantity,
        inventory: product.inventory,
        inventory_quantity: product.inventory_quantity
      }
    }))

    console.log('📦 getProducts 응답 (재고 정보 포함):', productsWithOptions.map(p => ({
      id: p.id,
      title: p.title,
      stock_quantity: p.stock_quantity,
      inventory: p.inventory,
      inventory_quantity: p.inventory_quantity
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

    console.log(`상품 ${productId} 재고 업데이트: ${product.stock_quantity} → ${newQuantity}`)
    return data
  } catch (error) {
    console.error('상품 재고 업데이트 오류:', error)
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

    // 5. 재고 차감
    await updateProductInventory(orderData.id, -orderData.quantity)

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
      payment: order.order_payments[0] || {}
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
            customer_order_number: `GROUP-${order.payment_group_id.split('-')[1]}`,
            status: order.status,
            created_at: order.created_at,
            updated_at: order.updated_at,
            user_id: order.user_id,
            order_type: 'bulk_payment',
            total_amount: groupOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),

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

    if (error) throw error

    // Mock 형태로 변환
    const ordersWithItems = data.map(order => ({
      ...order,
      items: order.order_items.map(item => ({
        ...item.products,
        id: item.id, // order_item의 실제 ID 사용
        product_id: item.product_id, // 제품 ID도 별도로 포함
        quantity: item.quantity,
        totalPrice: item.total_price,
        selectedOptions: item.selected_options || {}
      })),
      shipping: order.order_shipping[0] || {},
      payment: order.order_payments[0] || {},
      // 사용자 정보 (일단 기본값)
      userId: order.user_id,
      userName: '사용자',
      userNickname: '사용자',
      userEmail: '이메일'
    }))

    return ordersWithItems
  } catch (error) {
    console.error('전체 주문 목록 조회 오류:', error)
    return []
  }
}

// 관리자용 - 모든 고객 조회 (일단 빈 배열 반환)
export const getAllCustomers = async () => {
  try {
    // TODO: auth.users 테이블 접근 방법 필요
    console.log('고객 목록 조회 - 아직 구현되지 않음')
    return []
  } catch (error) {
    console.error('고객 목록 조회 오류:', error)
    return []
  }
}

export const getOrderById = async (orderId) => {
  try {
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

    // Mock 형태로 변환
    return {
      ...data,
      items: data.order_items.map(item => ({
        ...item.products,
        id: item.product_id,
        quantity: item.quantity,
        totalPrice: item.total_price,
        selectedOptions: item.selected_options || {}
      })),
      shipping: data.order_shipping[0] || {},
      payment: data.order_payments[0] || {}
    }
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
    console.log('일괄 주문 상태 업데이트:', { orderIds, status })

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

      // 결제 정보가 있으면 결제 테이블도 업데이트
      if (paymentData) {
        console.log('💳 결제 정보 업데이트 시도:', {
          orderId,
          method: paymentData.method,
          status: 'pending'
        })

        const paymentUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/order_payments?order_id=eq.${orderId}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            method: paymentData.method,
            status: 'pending',  // payment_status 대신 status 사용
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        })

        if (!paymentUpdateResponse.ok) {
          console.error(`❌ 결제 테이블 업데이트 실패 (${orderId}):`, {
            status: paymentUpdateResponse.status,
            statusText: paymentUpdateResponse.statusText
          })

          // 응답 내용도 로그
          const responseText = await paymentUpdateResponse.text()
          console.error('응답 내용:', responseText)
        } else {
          console.log(`✅ 결제 테이블 업데이트 성공 (${orderId})`)
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

export const generateCustomerOrderNumber = () => {
  const date = new Date()
  const dateStr = date.getFullYear().toString().slice(-2) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0')
  const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase()
  return `${dateStr}-${randomStr}`
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