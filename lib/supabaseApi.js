import { supabase } from './supabase'

// ===============================
// 상품 관련 API
// ===============================

export const getProducts = async (filters = {}) => {
  try {
    console.log('XMLHttpRequest로 상품 데이터 로드 중...')

    // fetch API 대신 XMLHttpRequest 사용 (Invalid value 오류 우회)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xoinislnaxllijlnjeue.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvaW5pc2xuYXhsbGlqbG5qZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjM3MjEsImV4cCI6MjA3NDA5OTcyMX0.NnX051NMmeECmVTzPybzl5jF4Mk7RhmekJcnOCzG7lI'

    const data = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', `${supabaseUrl}/rest/v1/products?order=created_at.desc`)

      // JWT 토큰에서 개행문자 및 공백 제거
      const cleanKey = supabaseKey.trim().replace(/\r?\n|\r/g, '')

      xhr.setRequestHeader('apikey', cleanKey)
      xhr.setRequestHeader('Authorization', `Bearer ${cleanKey}`)
      xhr.setRequestHeader('Content-Type', 'application/json')

      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText)
            console.log('XMLHttpRequest 응답 성공:', result.length, '개 상품')
            resolve(result)
          } catch (parseError) {
            reject(new Error('JSON 파싱 오류: ' + parseError.message))
          }
        } else {
          console.warn(`HTTP error! status: ${xhr.status}, 401이면 RLS 정책 문제입니다.`)
          // 401 오류 시 Mock 데이터 반환
          if (xhr.status === 401) {
            console.log('401 오류로 인해 Mock 데이터 사용')
            resolve(getMockProducts())
          } else {
            reject(new Error(`HTTP error! status: ${xhr.status}`))
          }
        }
      }

      xhr.onerror = function() {
        reject(new Error('네트워크 오류'))
      }

      xhr.send()
    })

    // 옵션 데이터 형태 변환 (Mock 데이터와 호환)
    const productsWithOptions = data.map(product => ({
      ...product,
      options: product.product_options || product.options || [],
      isLive: product.is_live || product.isLive || false
    }))

    return productsWithOptions
  } catch (error) {
    console.error('상품 데이터 로드 오류:', error)
    console.log('오류로 인해 Mock 데이터 사용')
    return getMockProducts()
  }
}

// Mock 데이터 함수
function getMockProducts() {
  return [
    {
      id: '1',
      title: '프리미엄 한우 등심',
      description: '최고급 1++ 한우 등심 500g',
      price: 89000,
      compare_price: 120000,
      discount_rate: 26,
      thumbnail_url: 'https://images.unsplash.com/photo-1558030006-450675393462',
      category: '육류',
      inventory: 50,
      is_visible: true,
      options: [],
      isLive: false
    },
    {
      id: '2',
      title: '제주 흑돼지 삼겹살',
      description: '제주산 흑돼지 삼겹살 600g',
      price: 45000,
      compare_price: 55000,
      discount_rate: 18,
      thumbnail_url: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6',
      category: '육류',
      inventory: 100,
      is_visible: true,
      options: [],
      isLive: true
    },
    {
      id: '3',
      title: '노르웨이 연어',
      description: '신선한 노르웨이산 연어 300g',
      price: 28000,
      compare_price: 35000,
      discount_rate: 20,
      thumbnail_url: 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6',
      category: '수산물',
      inventory: 80,
      is_visible: true,
      options: [],
      isLive: false
    },
    {
      id: '4',
      title: '유기농 채소 세트',
      description: '신선한 유기농 채소 모음',
      price: 25000,
      compare_price: 30000,
      discount_rate: 17,
      thumbnail_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999',
      category: '채소',
      inventory: 120,
      is_visible: true,
      options: [],
      isLive: false
    },
    {
      id: '5',
      title: '프리미엄 과일 선물세트',
      description: '엄선된 제철 과일 모음',
      price: 65000,
      compare_price: 80000,
      discount_rate: 19,
      thumbnail_url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b',
      category: '과일',
      inventory: 60,
      is_visible: true,
      options: [],
      isLive: false
    }
  ]
}

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
      .eq('status', 'active')
      .single()

    if (error) throw error

    return {
      ...data,
      options: data.product_options || [],
      isLive: data.is_live // Map database field is_live to component prop isLive
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
        inventory_quantity: productData.inventory_quantity || 0,
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
        inventory_quantity: productData.inventory_quantity,
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
        is_live: isLive,
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
    // 현재 재고 조회
    const { data: product, error: selectError } = await supabase
      .from('products')
      .select('inventory_quantity')
      .eq('id', productId)
      .single()

    if (selectError) throw selectError

    const newQuantity = Math.max(0, product.inventory_quantity + quantityChange)

    // 재고 업데이트
    const { data, error } = await supabase
      .from('products')
      .update({
        inventory_quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single()

    if (error) throw error
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

    return ordersWithItems
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
    // 1. 주문 취소
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (orderError) throw orderError

    // 2. 재고 복원
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId)

    if (itemsError) throw itemsError

    for (const item of orderItems) {
      await updateProductInventory(item.product_id, item.quantity)
    }

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
          payment_method: paymentData.method,
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // 각 주문 ID에 대해 순차적으로 업데이트
    for (const orderId of orderIds) {
      console.log('주문 상태 업데이트 중:', orderId, '→', status)

      // 주문 테이블 업데이트
      const orderUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          status: status,
          updated_at: new Date().toISOString()
        })
      })

      if (!orderUpdateResponse.ok) {
        throw new Error(`주문 상태 업데이트 실패 (${orderId}): ${orderUpdateResponse.status}`)
      }

      // 결제 정보가 있으면 결제 테이블도 업데이트
      if (paymentData) {
        const paymentUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/order_payments?order_id=eq.${orderId}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            payment_method: paymentData.method,
            payment_status: 'completed',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        })

        if (!paymentUpdateResponse.ok) {
          console.warn(`결제 테이블 업데이트 실패 (${orderId}): ${paymentUpdateResponse.status}`)
        }
      }

      console.log('주문 상태 업데이트 완료:', orderId)
    }

    console.log('모든 주문 상태 업데이트 완료')
    return true
  } catch (error) {
    console.error('일괄 주문 상태 업데이트 오류:', error)
    throw error
  }
}

// 주문 아이템 수량 업데이트 (REST API 방식)
export const updateOrderItemQuantity = async (orderItemId, newQuantity) => {
  try {
    console.log('수량 변경:', { orderItemId, newQuantity })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // 1. 현재 주문 아이템 정보 가져오기
    const fetchResponse = await fetch(`${supabaseUrl}/rest/v1/order_items?id=eq.${orderItemId}&select=quantity,total_price`, {
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

    // 2. 단가 계산 (총가격 / 수량)
    const unitPrice = currentItem.total_price / currentItem.quantity

    // 3. 새로운 총 가격 계산
    const newTotalPrice = unitPrice * newQuantity

    // 4. 주문 아이템 수량과 총 가격 업데이트
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/order_items?id=eq.${orderItemId}`, {
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

    console.log('수량 변경 완료:', { orderItemId, newQuantity, newTotalPrice })
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
    // 브라우저 환경에서만 sessionStorage 접근
    if (typeof window !== 'undefined') {
      // 먼저 카카오 세션 확인
      const kakaoSession = sessionStorage.getItem('kakao_session')
      if (kakaoSession) {
        const session = JSON.parse(kakaoSession)
        console.log('카카오 세션에서 사용자 정보 반환:', session)
        return session
      }
    }

    // 카카오 세션이 없으면 Supabase 세션 확인
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
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