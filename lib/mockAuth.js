// Mock 인증 시스템 (개발용)
class MockAuth {
  constructor() {
    this.listeners = []

    // 클라이언트 사이드에서는 전역 상태 사용
    if (typeof window !== 'undefined' && window.__globalAuthState) {
      // 전역 상태가 있으면 참조만 저장
      this.globalState = window.__globalAuthState
    } else {
      // 서버 사이드나 전역 상태가 없으면 로컬 상태 사용
      this.globalState = {
        users: [],
        currentUser: null,
        initialized: false
      }
    }
  }

  // localStorage에서 최신 데이터 동기화 (더 이상 사용하지 않음)
  syncFromLocalStorage() {
    // 전역 상태를 사용하므로 더 이상 필요 없음
    console.log('syncFromLocalStorage - using global state, currentUser:', this.globalState.currentUser)
  }

  // 회원가입
  async signUp({ email, password, options = {} }) {
    console.log('Mock signUp called with:', { email, password, options })
    try {
      // localStorage에서도 최신 사용자 목록 확인 (중복 방지 강화)
      const savedUsers = JSON.parse(localStorage.getItem('mock_users') || '[]')
      this.globalState.users = savedUsers.length > 0 ? savedUsers : this.globalState.users

      // 이미 존재하는 이메일인지 확인 - 여러 조건으로 중복 체크
      const userData = options.data || {}

      // 1. 이메일 중복 확인
      const existingEmailUser = this.globalState.users.find(user => user.email === email)
      if (existingEmailUser) {
        console.log('이미 같은 이메일로 가입된 사용자가 있습니다:', existingEmailUser)
        return {
          data: null,
          error: { message: 'User already registered with this email' }
        }
      }

      // 2. 닉네임 중복 확인 (닉네임이 있는 경우)
      if (userData.nickname) {
        const existingNicknameUser = this.globalState.users.find(user =>
          (user.nickname === userData.nickname) ||
          (user.user_metadata?.nickname === userData.nickname)
        )
        if (existingNicknameUser) {
          console.log('이미 같은 닉네임으로 가입된 사용자가 있습니다:', existingNicknameUser)
          return {
            data: null,
            error: { message: 'User already registered with this nickname' }
          }
        }
      }

      // 3. 전화번호 중복 확인 (전화번호가 있는 경우)
      if (userData.phone) {
        const existingPhoneUser = this.globalState.users.find(user =>
          (user.phone === userData.phone) ||
          (user.user_metadata?.phone === userData.phone)
        )
        if (existingPhoneUser) {
          console.log('이미 같은 전화번호로 가입된 사용자가 있습니다:', existingPhoneUser)
          return {
            data: null,
            error: { message: 'User already registered with this phone number' }
          }
        }
      }

      // 새 사용자 생성
      const newUser = {
        id: 'mock-user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        email: email,
        created_at: new Date().toISOString(),
        // 직접 접근 가능한 필드들
        name: userData.name || '',
        nickname: userData.nickname || '',
        phone: userData.phone || '',
        address: userData.address || '',
        detailAddress: userData.detailAddress || '',
        tiktokId: userData.tiktokId || '',
        youtubeId: userData.youtubeId || '',
        user_metadata: userData
      }
      console.log('Creating new user:', newUser)

      this.globalState.users.push(newUser)
      if (typeof window !== 'undefined') {
        localStorage.setItem('mock_users', JSON.stringify(this.globalState.users))
        console.log('Saved to localStorage')
      }

      // 자동 로그인
      this.globalState.currentUser = newUser
      if (typeof window !== 'undefined') {
        localStorage.setItem('mock_current_user', JSON.stringify(newUser))
      }
      console.log('Set current user:', this.globalState.currentUser)

      // 리스너들에게 알림
      this.notifyListeners('SIGNED_IN', { user: newUser })

      const result = {
        data: { user: newUser, session: { user: newUser } },
        error: null
      }
      console.log('Returning signup result:', result)
      return result
    } catch (error) {
      console.error('Mock signUp error:', error)
      return {
        data: null,
        error: { message: error.message }
      }
    }
  }

  // 로그인
  async signInWithPassword({ email, password }) {
    try {
      const user = this.globalState.users.find(user => user.email === email)
      if (!user) {
        return {
          data: null,
          error: { message: 'Invalid login credentials' }
        }
      }

      this.globalState.currentUser = user
      if (typeof window !== 'undefined') {
        localStorage.setItem('mock_current_user', JSON.stringify(user))
        console.log('signInWithPassword - localStorage에 사용자 저장:', user)
        console.log('signInWithPassword - localStorage 확인:', localStorage.getItem('mock_current_user'))
      }
      console.log('signInWithPassword - set currentUser:', this.globalState.currentUser)

      // 리스너들에게 알림
      console.log('signInWithPassword - SIGNED_IN 이벤트 발생 시작')
      this.notifyListeners('SIGNED_IN', { user })
      console.log('signInWithPassword - SIGNED_IN 이벤트 발생 완료')

      return {
        data: { user },
        error: null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error.message }
      }
    }
  }

  // 로그아웃
  async signOut() {
    try {
      this.globalState.currentUser = null
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mock_current_user')
      }
      console.log('signOut - cleared currentUser')

      // 리스너들에게 알림
      this.notifyListeners('SIGNED_OUT', { user: null })

      return { error: null }
    } catch (error) {
      return { error: { message: error.message } }
    }
  }

  // 현재 세션 가져오기
  async getSession() {
    // localStorage에서 최신 사용자 정보 확인
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('mock_current_user')
      if (savedUser && savedUser !== 'null') {
        try {
          const user = JSON.parse(savedUser)
          this.globalState.currentUser = user
          console.log('getSession - localStorage에서 사용자 복원:', user)

          // session 객체 구조를 Supabase와 동일하게 반환
          return {
            data: {
              session: {
                user: user,
                access_token: 'mock_access_token',
                refresh_token: 'mock_refresh_token'
              }
            },
            error: null
          }
        } catch (error) {
          console.error('getSession - 사용자 정보 파싱 오류:', error)
          localStorage.removeItem('mock_current_user')
          this.globalState.currentUser = null
        }
      } else {
        this.globalState.currentUser = null
      }
    }

    console.log('getSession - 사용자 없음')
    return {
      data: {
        session: null
      },
      error: null
    }
  }

  // 인증 상태 변경 리스너
  onAuthStateChange(callback) {
    const id = Date.now()
    this.listeners.push({ id, callback })

    // 구독 해제 함수 반환
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter(listener => listener.id !== id)
          }
        }
      }
    }
  }

  // 리스너들에게 알림
  notifyListeners(event, session) {
    console.log('notifyListeners 호출 - event:', event, 'session:', session)
    console.log('notifyListeners - 등록된 리스너 개수:', this.listeners.length)

    this.listeners.forEach((listener, index) => {
      console.log(`notifyListeners - 리스너 ${index} 호출`)
      listener.callback(event, session)
    })

    console.log('notifyListeners 완료')
  }
}

// 기본 상품 데이터 템플릿
const defaultProducts = [
  {
    id: '1',
    title: '프리미엄 무선 이어폰',
    description: '최신 블루투스 5.0 기술을 적용한 프리미엄 무선 이어폰입니다. 노이즈 캔슬링 기능으로 깨끗한 음질을 제공하며, 최대 8시간 연속 재생이 가능합니다.',
    price: 89000,
    compare_price: 129000,
    thumbnail_url: 'https://picsum.photos/400/500?random=1',
    review_rating: 4.5,
    review_count: 324,
    is_featured: true,
    badge: 'BEST',
    freeShipping: false,
    seller: '테크스토어',
    status: 'active',
    inventory_quantity: 3,
    isLive: false,
    options: [
      {
        id: 1001,
        name: '색상',
        values: ['블랙', '화이트', '실버']
      },
      {
        id: 1002,
        name: '사이즈',
        values: ['일반형', '소형']
      }
    ],
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    title: '스마트워치 프로',
    description: '건강 관리와 피트니스 추적을 위한 완벽한 스마트워치입니다. 심박수, 수면 모니터링, GPS 기능을 지원합니다.',
    price: 299000,
    compare_price: 399000,
    thumbnail_url: 'https://picsum.photos/400/500?random=2',
    review_rating: 4.8,
    review_count: 156,
    is_featured: false,
    badge: 'NEW',
    freeShipping: true,
    seller: '스마트몰',
    status: 'active',
    inventory_quantity: 5,
    isLive: false,
    created_at: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    title: '무선 충전패드',
    description: '빠른 무선 충전을 지원하는 슬림한 충전패드입니다. 대부분의 스마트폰과 호환되며, LED 인디케이터로 충전 상태를 확인할 수 있습니다.',
    price: 35000,
    compare_price: null,
    thumbnail_url: 'https://picsum.photos/400/500?random=3',
    review_rating: 4.2,
    review_count: 89,
    is_featured: false,
    badge: null,
    freeShipping: false,
    seller: '전자랜드',
    status: 'active',
    inventory_quantity: 2,
    isLive: true,
    created_at: '2024-01-03T00:00:00Z'
  },
  {
    id: '4',
    title: '블루투스 스피커',
    description: '강력한 저음과 선명한 고음을 제공하는 프리미엄 블루투스 스피커입니다. 방수 기능과 최대 12시간 연속 재생이 가능합니다.',
    price: 149000,
    compare_price: 199000,
    thumbnail_url: 'https://picsum.photos/400/500?random=4',
    review_rating: 4.6,
    review_count: 267,
    is_featured: true,
    badge: 'HOT',
    freeShipping: true,
    seller: '사운드몰',
    status: 'active',
    inventory_quantity: 7,
    isLive: false,
    created_at: '2024-01-04T00:00:00Z'
  }
]

// localStorage에서 상품 데이터 로드하거나 초기화
function loadMockProducts() {
  if (typeof window === 'undefined') return [...defaultProducts]

  try {
    const saved = localStorage.getItem('mock_products')
    if (saved && saved !== 'null') {
      const products = JSON.parse(saved)
      console.log('localStorage에서 상품 데이터 로드:', products.length, '개')

      // 재고 정보만 저장된 경우 (id와 inventory_quantity만 있는 경우)
      if (products.length > 0 && !products[0].title && products[0].id && products[0].inventory_quantity !== undefined) {
        console.log('재고 정보만 있음, 전체 상품 데이터 복원')
        const fullProducts = JSON.parse(localStorage.getItem('mock_products_full') || '[]')
        if (fullProducts.length > 0) {
          // 저장된 전체 상품 데이터가 있으면 재고 정보 업데이트
          const mergedProducts = fullProducts.map(product => {
            const inventoryData = products.find(p => p.id === product.id)
            return inventoryData ? { ...product, inventory_quantity: inventoryData.inventory_quantity } : product
          })
          return mergedProducts
        } else {
          // 전체 상품 데이터가 없으면 기본값 사용
          const mergedProducts = [...defaultProducts].map(product => {
            const inventoryData = products.find(p => p.id === product.id)
            return inventoryData ? { ...product, inventory_quantity: inventoryData.inventory_quantity } : product
          })
          return mergedProducts
        }
      }

      // 전체 상품 데이터가 있는 경우
      if (products.length > 0 && products[0].title) {
        // 전체 상품 데이터 백업
        localStorage.setItem('mock_products_full', JSON.stringify(products))
        return products
      }

      return products
    } else {
      console.log('localStorage 상품 없음, 기본 상품으로 초기화')
      const products = [...defaultProducts]
      localStorage.setItem('mock_products', JSON.stringify(products))
      localStorage.setItem('mock_products_full', JSON.stringify(products))
      return products
    }
  } catch (error) {
    console.error('상품 데이터 로드 오류:', error)
    const products = [...defaultProducts]
    localStorage.setItem('mock_products', JSON.stringify(products))
    localStorage.setItem('mock_products_full', JSON.stringify(products))
    return products
  }
}

// localStorage에 상품 데이터 저장
function saveMockProducts(products) {
  if (typeof window === 'undefined') return

  try {
    // 전체 상품 데이터 저장
    localStorage.setItem('mock_products', JSON.stringify(products))
    localStorage.setItem('mock_products_full', JSON.stringify(products))
    console.log('localStorage에 상품 데이터 저장:', products.length, '개')
  } catch (error) {
    console.error('상품 데이터 저장 오류:', error)
  }
}

// Mock 상품 데이터 (localStorage 기반)
let mockProducts = loadMockProducts()

// Mock 방송 데이터
const mockBroadcasts = [
  {
    id: '1',
    title: '🔴 라이브 특가세일',
    description: '지금까지 이런 할인은 없었다! 최대 70% 할인',
    status: 'live',
    viewer_count: 1247,
    started_at: new Date().toISOString(),
    thumbnail_url: 'https://picsum.photos/800/400?random=live1'
  }
]

// Mock Query Builder 클래스
class MockQueryBuilder {
  constructor(table, data) {
    this.table = table
    this.data = data
    this.filters = []
    this.orderBy = null
    this.limitCount = null
    this.isSingle = false
  }

  select(columns = '*') {
    return this
  }

  eq(column, value) {
    this.filters.push({ type: 'eq', column, value })
    return this
  }

  in(column, values) {
    this.filters.push({ type: 'in', column, values })
    return this
  }

  order(column, options = {}) {
    this.orderBy = { column, ascending: options.ascending !== false }
    return this
  }

  limit(count) {
    this.limitCount = count
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  insert(newData) {
    return {
      then: async (resolve) => {
        console.log('Mock insert:', newData)
        resolve({ data: newData, error: null })
      }
    }
  }

  upsert(newData, options = {}) {
    return {
      then: async (resolve) => {
        console.log('Mock upsert:', newData)
        resolve({ data: newData, error: null })
      }
    }
  }

  update(updateData) {
    return {
      then: async (resolve) => {
        console.log('Mock update:', updateData)
        resolve({ data: updateData, error: null })
      }
    }
  }

  delete() {
    return {
      then: async (resolve) => {
        console.log('Mock delete')
        resolve({ data: [], error: null })
      }
    }
  }

  async then(resolve) {
    let result = [...(this.data || [])]

    // Apply filters
    this.filters.forEach(filter => {
      if (filter.type === 'eq') {
        result = result.filter(item => item[filter.column] === filter.value)
      } else if (filter.type === 'in') {
        result = result.filter(item => filter.values.includes(item[filter.column]))
      }
    })

    // Apply ordering
    if (this.orderBy) {
      result.sort((a, b) => {
        const aVal = a[this.orderBy.column]
        const bVal = b[this.orderBy.column]

        let comparison = 0
        if (aVal > bVal) comparison = 1
        if (aVal < bVal) comparison = -1

        return this.orderBy.ascending ? comparison : -comparison
      })
    }

    // Apply limit
    if (this.limitCount) {
      result = result.slice(0, this.limitCount)
    }

    // Handle single
    if (this.isSingle) {
      const data = result[0] || null
      if (!data) {
        resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found' } })
      } else {
        resolve({ data, error: null })
      }
    } else {
      resolve({ data: result, error: null })
    }
  }
}

// 재고 업데이트 함수
export const updateProductInventory = (productId, quantityChange) => {
  if (typeof window === 'undefined') return false

  try {
    console.log(`=== updateProductInventory 시작 - productId: ${productId}, quantityChange: ${quantityChange} ===`)

    // 현재 저장된 상품 데이터 가져오기
    const savedProducts = JSON.parse(localStorage.getItem('mock_products') || '[]')
    console.log('localStorage에서 가져온 상품 데이터:', savedProducts)

    // 기본 상품 데이터와 저장된 데이터 병합
    let currentProducts = [...mockProducts]
    console.log('기본 상품 데이터:', currentProducts.map(p => ({ id: p.id, title: p.title, inventory: p.inventory_quantity })))

    // localStorage에 저장된 재고 업데이트 적용
    if (savedProducts.length > 0) {
      currentProducts = currentProducts.map(product => {
        const savedProduct = savedProducts.find(saved => saved.id === product.id)
        const result = savedProduct ? { ...product, inventory_quantity: savedProduct.inventory_quantity } : product
        return result
      })
      console.log('저장된 재고 적용 후:', currentProducts.map(p => ({ id: p.id, title: p.title, inventory: p.inventory_quantity })))
    }

    // 해당 상품 찾기 및 재고 업데이트
    const productIndex = currentProducts.findIndex(product => product.id === productId)
    console.log(`상품 인덱스 찾기: ${productIndex}`)

    if (productIndex === -1) {
      console.error(`상품을 찾을 수 없음: ${productId}`)
      return false
    }

    const currentInventory = currentProducts[productIndex].inventory_quantity || 0
    const newQuantity = currentInventory + quantityChange
    console.log(`재고 계산: ${currentInventory} + ${quantityChange} = ${newQuantity}`)

    if (newQuantity < 0) {
      console.warn(`재고가 음수가 될 수 없음: ${newQuantity}`)
      return false // 재고가 음수가 될 수 없음
    }

    currentProducts[productIndex].inventory_quantity = newQuantity
    console.log(`상품 ${productId} 재고 업데이트: ${currentInventory} -> ${newQuantity}`)

    // 전체 상품 데이터를 localStorage에 저장
    // 기존 전체 데이터 가져오기
    const fullProducts = JSON.parse(localStorage.getItem('mock_products_full') || '[]')
    const updatedFullProducts = fullProducts.map(product =>
      product.id === productId ? { ...product, inventory_quantity: newQuantity } : product
    )

    // 재고만 업데이트된 전체 상품 데이터 저장
    localStorage.setItem('mock_products', JSON.stringify(updatedFullProducts))
    localStorage.setItem('mock_products_full', JSON.stringify(updatedFullProducts))
    console.log('localStorage에 전체 상품 데이터 저장 완료')

    // 저장 확인
    const verification = JSON.parse(localStorage.getItem('mock_products') || '[]')
    console.log('저장 확인:', verification)

    console.log(`✅ Product ${productId} inventory updated: ${quantityChange} (new total: ${newQuantity})`)

    // 재고 업데이트 이벤트 발생
    console.log('재고 업데이트 이벤트 발생 중...')
    window.dispatchEvent(new CustomEvent('inventoryUpdated', {
      detail: { productId, newQuantity, change: quantityChange }
    }))
    console.log('재고 업데이트 이벤트 발생 완료')

    console.log(`=== updateProductInventory 완료 ===`)
    return true
  } catch (error) {
    console.error('❌ 재고 업데이트 실패:', error)
    return false
  }
}

// 주문 상태 변경 시 재고 처리 함수
export const updateOrderStatus = (orderId, newStatus) => {
  if (typeof window === 'undefined') return false

  try {
    console.log(`=== updateOrderStatus 시작 - orderId: ${orderId}, newStatus: ${newStatus} ===`)

    const orders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
    console.log('현재 주문 목록:', orders)

    const orderIndex = orders.findIndex(order => order.id === orderId)
    console.log('주문 인덱스:', orderIndex)

    if (orderIndex === -1) {
      console.error('주문을 찾을 수 없음:', orderId)
      return false
    }

    const order = orders[orderIndex]
    const oldStatus = order.status
    console.log(`주문 발견 - oldStatus: ${oldStatus}, newStatus: ${newStatus}`)
    console.log('주문 상품들:', order.items)

    // 상태 변경
    orders[orderIndex].status = newStatus
    orders[orderIndex].updated_at = new Date().toISOString()

    // pending -> verifying 상태 변경 시에는 이미 재고가 차감되어 있으므로 스킵
    if (oldStatus === 'pending' && newStatus === 'verifying') {
      console.log('✅ 주문 상태 변경: pending -> verifying')
      console.log('📌 재고는 이미 주문 생성 시 차감되었으므로 추가 차감하지 않음')
    } else {
      console.log(`상태 변경: ${oldStatus} -> ${newStatus}`)
    }

    // localStorage에 저장
    localStorage.setItem('mock_orders', JSON.stringify(orders))

    // 주문 업데이트 이벤트 발생
    window.dispatchEvent(new CustomEvent('orderUpdated', {
      detail: { action: 'statusUpdate', orderId, oldStatus, newStatus }
    }))

    console.log(`✅ 주문 ${orderId} 상태 변경 완료: ${oldStatus} -> ${newStatus}`)
    console.log(`=== updateOrderStatus 완료 ===`)
    return true
  } catch (error) {
    console.error('❌ 주문 상태 업데이트 실패:', error)
    return false
  }
}

// 주문 취소 함수 (재고 복원 포함)
export const cancelOrder = (orderId) => {
  if (typeof window === 'undefined') return false

  try {
    console.log(`=== 주문 취소 시작 - orderId: ${orderId} ===`)

    const orders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
    const orderIndex = orders.findIndex(order => order.id === orderId)

    if (orderIndex === -1) {
      console.error('취소할 주문을 찾을 수 없음:', orderId)
      return false
    }

    const order = orders[orderIndex]
    console.log('취소할 주문:', order)

    // pending 상태의 주문만 취소 가능
    if (order.status !== 'pending') {
      console.error('결제대기 상태의 주문만 취소 가능합니다. 현재 상태:', order.status)
      return false
    }

    // 재고 복원
    console.log('📦 재고 복원 시작')
    order.items.forEach((item, index) => {
      console.log(`--- 상품 ${index + 1} 재고 복원 ---`)

      // 일괄결제인 경우 원본 상품들 처리
      if (item.id === 'COMBINED-ORDER' && (item.allItems || item.originalItems)) {
        const itemsToProcess = item.allItems || item.originalItems
        console.log('일괄결제 상품 재고 복원:', itemsToProcess)

        itemsToProcess.forEach(originalItem => {
          const quantityToRestore = originalItem.quantity || 1 // 양수로 복원
          const success = updateProductInventory(originalItem.id, quantityToRestore)
          if (success) {
            console.log(`✅ 상품 ${originalItem.title} 재고 ${quantityToRestore}개 복원`)
          } else {
            console.warn(`❌ 상품 ${originalItem.title} 재고 복원 실패`)
          }
        })
      } else {
        // 일반 상품인 경우
        const quantityToRestore = item.quantity || 1 // 양수로 복원
        const success = updateProductInventory(item.id, quantityToRestore)
        if (success) {
          console.log(`✅ 상품 ${item.title} 재고 ${quantityToRestore}개 복원`)
        } else {
          console.warn(`❌ 상품 ${item.title} 재고 복원 실패`)
        }
      }
    })

    // 주문 상태를 cancelled로 변경
    orders[orderIndex].status = 'cancelled'
    orders[orderIndex].cancelled_at = new Date().toISOString()

    // localStorage에 저장
    localStorage.setItem('mock_orders', JSON.stringify(orders))

    // 주문 업데이트 이벤트 발생
    window.dispatchEvent(new CustomEvent('orderUpdated', {
      detail: { action: 'cancelled', orderId, order: orders[orderIndex] }
    }))

    console.log(`✅ 주문 ${orderId} 취소 완료`)
    console.log(`=== 주문 취소 완료 ===`)
    return true
  } catch (error) {
    console.error('❌ 주문 취소 실패:', error)
    return false
  }
}

// 현재 재고 조회 함수
// 결제 전 재고 검증 함수
export const validateInventoryBeforePayment = (orderItem, isFromPendingOrder = false) => {
  console.log('=== 결제 전 재고 검증 시작 ===')
  console.log('결제대기 주문 여부:', isFromPendingOrder)

  // 결제대기 주문의 경우 이미 재고가 차감되어 있으므로 검증 통과
  if (isFromPendingOrder) {
    console.log('✅ 결제대기 주문은 재고가 이미 확보되어 있으므로 검증 통과')
    return { success: true }
  }

  try {
    if (orderItem.items && Array.isArray(orderItem.items)) {
      // 장바구니 상품들인 경우
      const insufficientItems = []

      orderItem.items.forEach(item => {
        const currentInventory = getCurrentInventory(item.id)
        const requiredQuantity = item.quantity || 1

        console.log(`재고 검증: ${item.title} - 현재: ${currentInventory}개, 필요: ${requiredQuantity}개`)

        if (currentInventory < requiredQuantity) {
          insufficientItems.push({
            title: item.title,
            current: currentInventory,
            required: requiredQuantity
          })
        }
      })

      if (insufficientItems.length > 0) {
        return {
          success: false,
          insufficientItems
        }
      }
    } else {
      // 일괄결제 (COMBINED-ORDER)인 경우 실제 상품들 확인
      if (orderItem.id === 'COMBINED-ORDER' && (orderItem.allItems || orderItem.originalItems)) {
        console.log('일괄결제 상품들 재고 검증 시작')
        const itemsToCheck = orderItem.allItems || orderItem.originalItems
        const insufficientItems = []

        itemsToCheck.forEach(item => {
          const currentInventory = getCurrentInventory(item.id)
          const requiredQuantity = item.quantity || 1

          console.log(`재고 검증: ${item.title} - 현재: ${currentInventory}개, 필요: ${requiredQuantity}개`)

          if (currentInventory < requiredQuantity) {
            insufficientItems.push({
              title: item.title,
              current: currentInventory,
              required: requiredQuantity
            })
          }
        })

        if (insufficientItems.length > 0) {
          return {
            success: false,
            insufficientItems
          }
        }
      } else {
        // 일반 상품인 경우
        const currentInventory = getCurrentInventory(orderItem.id)
        const requiredQuantity = orderItem.quantity || 1

        console.log(`재고 검증: ${orderItem.title} - 현재: ${currentInventory}개, 필요: ${requiredQuantity}개`)

        if (currentInventory < requiredQuantity) {
          return {
            success: false,
            insufficientItems: [{
              title: orderItem.title,
              current: currentInventory,
              required: requiredQuantity
            }]
          }
        }
      }
    }

    console.log('✅ 모든 상품 재고 충분')
    return { success: true }

  } catch (error) {
    console.error('재고 검증 중 오류:', error)
    return {
      success: false,
      error: '재고 확인 중 오류가 발생했습니다'
    }
  }
}

export const getCurrentInventory = (productId) => {
  if (typeof window === 'undefined') {
    // 서버 사이드에서는 기본 재고 반환
    const product = mockProducts.find(p => p.id === productId)
    console.log(`[서버] getCurrentInventory - productId: ${productId}, inventory: ${product?.inventory_quantity || 0}`)
    return product?.inventory_quantity || 0
  }

  try {
    console.log(`[클라이언트] getCurrentInventory 시작 - productId: ${productId}`)

    const savedProducts = JSON.parse(localStorage.getItem('mock_products') || '[]')
    console.log('localStorage 재고 데이터:', savedProducts)

    const savedProduct = savedProducts.find(saved => saved.id === productId)
    console.log('찾은 저장된 상품:', savedProduct)

    if (savedProduct) {
      console.log(`✅ 저장된 재고 반환: ${savedProduct.inventory_quantity}`)
      return savedProduct.inventory_quantity
    }

    // 저장된 데이터가 없으면 기본 상품 데이터에서 가져오기
    const product = mockProducts.find(p => p.id === productId)
    const defaultInventory = product?.inventory_quantity || 0
    console.log(`기본 재고 반환: ${defaultInventory}`)
    return defaultInventory
  } catch (error) {
    console.error('재고 조회 실패:', error)
    return 0
  }
}

// 고객용 주문번호 생성 함수
const generateCustomerOrderNumber = () => {
  // 오늘 날짜 (YYMMDD 형식)
  const today = new Date()
  const dateStr = today.getFullYear().toString().slice(2) +
                  (today.getMonth() + 1).toString().padStart(2, '0') +
                  today.getDate().toString().padStart(2, '0')

  // 오늘 생성된 주문 수 확인
  const existingOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
  const todayOrders = existingOrders.filter(order => {
    if (!order.customerOrderNumber) return false
    return order.customerOrderNumber.startsWith(`#${dateStr}`)
  })

  // 오늘의 순번 (001부터 시작)
  const todayCount = todayOrders.length + 1
  const sequenceNumber = todayCount.toString().padStart(3, '0')

  return `#${dateStr}-${sequenceNumber}`
}

// Mock 주문 데이터 생성 함수
export const createMockOrder = (orderItem, userProfile, paymentMethod = 'bank_transfer', skipInventoryDeduction = false) => {
  console.log('createMockOrder 호출됨:', { orderItem, userProfile, paymentMethod })

  if (!orderItem) {
    throw new Error('주문 항목이 없습니다')
  }

  if (!userProfile) {
    throw new Error('사용자 프로필이 없습니다')
  }

  if (!orderItem.totalPrice || orderItem.totalPrice <= 0) {
    throw new Error('유효하지 않은 주문 금액입니다')
  }

  // 현재 로그인한 사용자 정보 가져오기
  let currentUser = null
  if (typeof window !== 'undefined' && window.__globalAuthState?.currentUser) {
    currentUser = window.__globalAuthState.currentUser
  }

  if (!currentUser) {
    throw new Error('로그인이 필요합니다')
  }

  console.log('주문 생성 - 현재 사용자 정보:', {
    id: currentUser.id,
    name: currentUser.name,
    nickname: currentUser.nickname,
    user_metadata: currentUser.user_metadata
  })

  // 주문 상품들 재고 확인
  console.log('주문 아이템 재고 확인:', orderItem)

  try {
    const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    const shippingFee = 4000
    const totalAmount = paymentMethod === 'card'
      ? Math.floor(orderItem.totalPrice * 1.1) + shippingFee
      : orderItem.totalPrice + shippingFee

    const mockOrder = {
      id: orderId,
      customerOrderNumber: generateCustomerOrderNumber(), // 고객용 주문번호 추가
      userId: currentUser.id, // 사용자 ID 추가
      userNickname: currentUser.nickname || currentUser.user_metadata?.nickname || 'Unknown', // 사용자 닉네임 추가
      userName: currentUser.name || currentUser.user_metadata?.name || 'Unknown', // 사용자 실제 이름 추가
      status: 'pending', // 모든 주문은 결제대기 상태로 시작
      created_at: new Date().toISOString(),
      items: [orderItem],
      shipping: {
        name: userProfile.name || '사용자',
        phone: userProfile.phone || '010-0000-0000',
        address: userProfile.address || '기본주소',
        detail_address: userProfile.detail_address || ''
      },
      payment: {
        method: paymentMethod, // cart, bank_transfer, card
        amount: totalAmount,
        status: 'pending' // 모든 결제는 pending 상태로 시작
      },
      // 주문 타입 구분 (장바구니에서 온 것인지, 바로구매인지)
      orderType: paymentMethod === 'cart' ? 'cart' : 'direct'
    }

    // 주문 생성 시 즉시 재고 차감 (pending 상태에서)
    if (skipInventoryDeduction) {
      console.log('📦 재고 차감 건너뛰기 (이미 차감된 주문들의 일괄결제)')
    } else {
      console.log('📦 주문 생성 시 재고 차감 시작')
    }

    // 일괄결제인 경우 원본 상품들 처리
    if (!skipInventoryDeduction && orderItem.id === 'COMBINED-ORDER' && (orderItem.allItems || orderItem.originalItems)) {
      const itemsToProcess = orderItem.allItems || orderItem.originalItems
      console.log('일괄결제 상품 재고 차감:', itemsToProcess)

      itemsToProcess.forEach(item => {
        const quantityToReduce = -(item.quantity || 1)
        const success = updateProductInventory(item.id, quantityToReduce)
        if (success) {
          console.log(`✅ 상품 ${item.title} 재고 ${Math.abs(quantityToReduce)}개 차감`)
        } else {
          const currentInventory = getCurrentInventory(item.id)
          console.warn(`❌ 상품 ${item.title} 재고 차감 실패 - 재고 부족 (현재: ${currentInventory}개, 필요: ${Math.abs(quantityToReduce)}개)`)
          throw new Error(`${item.title} 재고가 부족합니다 (현재: ${currentInventory}개, 필요: ${Math.abs(quantityToReduce)}개)`)
        }
      })
    } else if (!skipInventoryDeduction) {
      // 일반 상품인 경우
      const quantityToReduce = -(orderItem.quantity || 1)
      const success = updateProductInventory(orderItem.id, quantityToReduce)
      if (success) {
        console.log(`✅ 상품 ${orderItem.title} 재고 ${Math.abs(quantityToReduce)}개 차감`)
      } else {
        const currentInventory = getCurrentInventory(orderItem.id)
        console.warn(`❌ 상품 ${orderItem.title} 재고 차감 실패 - 재고 부족 (현재: ${currentInventory}개, 필요: ${Math.abs(quantityToReduce)}개)`)
        throw new Error(`${orderItem.title} 재고가 부족합니다 (현재: ${currentInventory}개, 필요: ${Math.abs(quantityToReduce)}개)`)
      }
    }

    // localStorage에 저장
    if (typeof window !== 'undefined') {
      const existingOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
      existingOrders.unshift(mockOrder) // 최신 주문을 맨 앞에
      localStorage.setItem('mock_orders', JSON.stringify(existingOrders))

      // 최근 주문을 세션에도 저장 (완료 페이지용)
      sessionStorage.setItem('recentOrder', JSON.stringify(mockOrder))

      console.log('Created mock order:', mockOrder) // 디버깅용
    }

    return mockOrder
  } catch (error) {
    console.error('주문 생성 중 오류:', error)
    throw error
  }
}

// 전역 상태 관리
if (typeof window !== 'undefined') {
  if (!window.__globalAuthState) {
    window.__globalAuthState = {
      currentUser: null,
      users: [],
      initialized: false
    }

    // localStorage에서 초기 상태 로드
    try {
      const savedUser = localStorage.getItem('mock_current_user')
      const savedUsers = localStorage.getItem('mock_users')

      if (savedUser && savedUser !== 'null') {
        window.__globalAuthState.currentUser = JSON.parse(savedUser)
        console.log('Loaded user from localStorage:', window.__globalAuthState.currentUser)
      }
      if (savedUsers) {
        window.__globalAuthState.users = JSON.parse(savedUsers)
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error)
    }

    window.__globalAuthState.initialized = true
  }
}

// 전역 싱글톤 인스턴스 (브라우저 전체에서 공유)
if (typeof window !== 'undefined') {
  if (!window.__mockAuthInstance) {
    window.__mockAuthInstance = new MockAuth()
  }
  if (!window.__mockClientInstance) {
    const mockDatabase = {
      products: mockProducts,
      broadcasts: mockBroadcasts,
      profiles: [],
      broadcast_products: []
    }

    window.__mockClientInstance = {
      auth: window.__mockAuthInstance,
      from: (table) => {
        let data = mockDatabase[table] || []

        // products 테이블의 경우 localStorage의 재고 정보 반영
        if (table === 'products') {
          try {
            const savedProducts = JSON.parse(localStorage.getItem('mock_products') || '[]')
            if (savedProducts.length > 0) {
              data = data.map(product => {
                const savedProduct = savedProducts.find(saved => saved.id === product.id)
                return savedProduct ? { ...product, inventory_quantity: savedProduct.inventory_quantity } : product
              })
            }
          } catch (error) {
            console.error('재고 데이터 로드 실패:', error)
          }
        }

        return new MockQueryBuilder(table, data)
      }
    }
  }
}

// Mock 상품 데이터 초기화 함수 (기본 상품으로 리셋)
export const clearMockProducts = () => {
  if (typeof window === 'undefined') return false

  try {
    // localStorage 초기화
    localStorage.removeItem('mock_products')
    localStorage.removeItem('mock_products_full')

    // Mock 상품 배열 초기화
    mockProducts.length = 0

    // 기본 상품 4개 다시 추가
    const defaultProducts = [
      {
        id: '1',
        title: '프리미엄 무선 이어폰',
        description: '최신 블루투스 5.0 기술을 적용한 프리미엄 무선 이어폰입니다. 노이즈 캔슬링 기능으로 깨끗한 음질을 제공하며, 최대 8시간 연속 재생이 가능합니다.',
        price: 89000,
        compare_price: 129000,
        thumbnail_url: 'https://picsum.photos/400/500?random=1',
        review_rating: 4.5,
        review_count: 324,
        is_featured: true,
        badge: 'BEST',
        freeShipping: false,
        seller: '테크스토어',
        status: 'active',
        inventory_quantity: 3,
        isLive: false,
        options: [
          {
            id: 1001,
            name: '색상',
            values: ['블랙', '화이트', '실버']
          },
          {
            id: 1002,
            name: '사이즈',
            values: ['일반형', '소형']
          }
        ],
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        title: '스마트워치 프로',
        description: '건강 관리와 피트니스 추적을 위한 완벽한 스마트워치입니다. 심박수, 수면 모니터링, GPS 기능을 지원합니다.',
        price: 299000,
        compare_price: 399000,
        thumbnail_url: 'https://picsum.photos/400/500?random=2',
        review_rating: 4.8,
        review_count: 156,
        is_featured: false,
        badge: 'NEW',
        freeShipping: true,
        seller: '스마트몰',
        status: 'active',
        inventory_quantity: 5,
        isLive: false,
        created_at: '2024-01-02T00:00:00Z'
      },
      {
        id: '3',
        title: '무선 충전패드',
        description: '빠른 무선 충전을 지원하는 슬림한 충전패드입니다. 대부분의 스마트폰과 호환되며, LED 인디케이터로 충전 상태를 확인할 수 있습니다.',
        price: 35000,
        compare_price: null,
        thumbnail_url: 'https://picsum.photos/400/500?random=3',
        review_rating: 4.2,
        review_count: 89,
        is_featured: false,
        badge: null,
        freeShipping: false,
        seller: '전자랜드',
        status: 'active',
        inventory_quantity: 2,
        isLive: true,
        created_at: '2024-01-03T00:00:00Z'
      },
      {
        id: '4',
        title: '블루투스 스피커',
        description: '강력한 저음과 선명한 고음을 제공하는 프리미엄 블루투스 스피커입니다. 방수 기능과 최대 12시간 연속 재생이 가능합니다.',
        price: 149000,
        compare_price: 199000,
        thumbnail_url: 'https://picsum.photos/400/500?random=4',
        review_rating: 4.6,
        review_count: 267,
        is_featured: true,
        badge: 'HOT',
        freeShipping: true,
        seller: '사운드몰',
        status: 'active',
        inventory_quantity: 7,
        isLive: false,
        created_at: '2024-01-04T00:00:00Z'
      }
    ]

    mockProducts.push(...defaultProducts)
    console.log('Mock 상품 데이터베이스가 기본 상품으로 초기화되었습니다')

    // 상품 초기화 이벤트 발생
    window.dispatchEvent(new CustomEvent('productsCleared'))

    return true
  } catch (error) {
    console.error('Mock 상품 초기화 실패:', error)
    return false
  }
}

// Mock 상품 완전 삭제 함수 (기본 상품 복원 없음)
export const deleteAllMockProducts = () => {
  if (typeof window === 'undefined') return false

  try {
    // 모든 상품 삭제
    mockProducts.length = 0
    // localStorage 완전 초기화
    localStorage.removeItem('mock_products')
    localStorage.removeItem('mock_products_full')
    console.log('모든 Mock 상품이 삭제되었습니다')

    // 상품 삭제 이벤트 발생
    window.dispatchEvent(new CustomEvent('productsCleared'))

    return true
  } catch (error) {
    console.error('Mock 상품 삭제 실패:', error)
    return false
  }
}

// Mock 상품 데이터 강제 리로드 함수
export const reloadMockProducts = () => {
  if (typeof window === 'undefined') return false

  try {
    console.log('현재 Mock 상품 개수:', mockProducts.length)
    console.log('Mock 상품 목록:', mockProducts.map(p => p.title))

    // 상품 리로드 이벤트 발생
    window.dispatchEvent(new CustomEvent('productsReloaded'))

    return true
  } catch (error) {
    console.error('Mock 상품 리로드 실패:', error)
    return false
  }
}

// 상품 추가 함수 (관리자용)
export const addMockProduct = (productData) => {
  if (typeof window === 'undefined') return false

  try {
    // Mock 데이터베이스에 추가
    mockProducts.push({
      ...productData,
      id: String(productData.id),
      seller: 'allok',
      badge: null,
      freeShipping: false,
      review_rating: 0,
      review_count: 0
    })

    // localStorage에도 저장
    saveMockProducts(mockProducts)
    console.log('Mock 상품 데이터베이스에 상품 추가:', productData.title)

    // 상품 업데이트 이벤트 발생
    window.dispatchEvent(new CustomEvent('productAdded', {
      detail: { product: productData }
    }))

    return true
  } catch (error) {
    console.error('Mock 상품 추가 실패:', error)
    return false
  }
}

// Mock 상품 목록 가져오기 함수
export const getMockProducts = () => {
  // 항상 localStorage에서 최신 데이터 읽기
  const freshProducts = loadMockProducts()
  mockProducts = freshProducts // 메모리 캐시도 업데이트
  return [...freshProducts]
}

// 상품 삭제 함수 (단일 상품)
export const deleteMockProduct = (productId) => {
  if (typeof window === 'undefined') return false

  try {
    // 현재 상품 목록 가져오기
    const currentProducts = getMockProducts()

    // 해당 상품 제거
    const filteredProducts = currentProducts.filter(product => product.id !== productId)

    if (filteredProducts.length === currentProducts.length) {
      console.error('삭제할 상품을 찾을 수 없음:', productId)
      return false
    }

    // 업데이트된 상품 목록 저장
    saveMockProducts(filteredProducts)
    mockProducts = filteredProducts

    console.log(`상품 ${productId} 삭제 완료`)

    // 상품 삭제 이벤트 발생
    window.dispatchEvent(new CustomEvent('productDeleted', {
      detail: { productId }
    }))

    return true
  } catch (error) {
    console.error('상품 삭제 실패:', error)
    return false
  }
}

// 상품 상태 업데이트 함수
export const updateMockProductStatus = (productId, newStatus) => {
  if (typeof window === 'undefined') return false

  try {
    // 현재 상품 목록 가져오기
    const currentProducts = getMockProducts()

    // 해당 상품 찾기
    const productIndex = currentProducts.findIndex(product => product.id === productId)

    if (productIndex === -1) {
      console.error('상태 변경할 상품을 찾을 수 없음:', productId)
      return false
    }

    // 상태 변경
    currentProducts[productIndex].status = newStatus

    // 업데이트된 상품 목록 저장
    saveMockProducts(currentProducts)
    mockProducts = currentProducts

    console.log(`상품 ${productId} 상태 변경: ${newStatus}`)

    // 상품 상태 변경 이벤트 발생
    window.dispatchEvent(new CustomEvent('productStatusChanged', {
      detail: { productId, newStatus }
    }))

    return true
  } catch (error) {
    console.error('상품 상태 변경 실패:', error)
    return false
  }
}

// 상품 재고 업데이트 함수 (관리자용)
export const updateMockProductInventory = (productId, newQuantity) => {
  if (typeof window === 'undefined') return false

  try {
    // 현재 상품 목록 가져오기
    const currentProducts = getMockProducts()

    // 해당 상품 찾기
    const productIndex = currentProducts.findIndex(product => product.id === productId)

    if (productIndex === -1) {
      console.error('재고 업데이트할 상품을 찾을 수 없음:', productId)
      return false
    }

    // 재고 업데이트
    currentProducts[productIndex].inventory_quantity = newQuantity

    // 업데이트된 상품 목록 저장
    saveMockProducts(currentProducts)
    mockProducts = currentProducts

    console.log(`상품 ${productId} 재고 업데이트: ${newQuantity}`)

    // 재고 업데이트 이벤트 발생
    window.dispatchEvent(new CustomEvent('inventoryUpdated', {
      detail: { productId, newQuantity }
    }))

    return true
  } catch (error) {
    console.error('상품 재고 업데이트 실패:', error)
    return false
  }
}

// 상품 라이브 라벨 업데이트 함수
export const updateMockProductLiveStatus = (productId, isLive) => {
  if (typeof window === 'undefined') return false

  try {
    // 현재 상품 목록 가져오기
    const currentProducts = getMockProducts()

    // 해당 상품 찾기
    const productIndex = currentProducts.findIndex(product => product.id === productId)

    if (productIndex === -1) {
      console.error('라이브 상태 변경할 상품을 찾을 수 없음:', productId)
      return false
    }

    // 라이브 상태 변경
    currentProducts[productIndex].isLive = isLive

    // 업데이트된 상품 목록 저장
    saveMockProducts(currentProducts)
    mockProducts = currentProducts

    console.log(`상품 ${productId} 라이브 상태 변경: ${isLive}`)

    // 상품 라이브 상태 변경 이벤트 발생
    window.dispatchEvent(new CustomEvent('productLiveStatusChanged', {
      detail: { productId, isLive }
    }))

    return true
  } catch (error) {
    console.error('상품 라이브 상태 업데이트 실패:', error)
    return false
  }
}

// 상품 전체 정보 업데이트 함수
export const updateMockProduct = (productId, updatedData) => {
  if (typeof window === 'undefined') return false

  try {
    // 현재 상품 목록 가져오기
    const currentProducts = getMockProducts()

    // 해당 상품 찾기
    const productIndex = currentProducts.findIndex(product => product.id === productId)

    if (productIndex === -1) {
      console.error('업데이트할 상품을 찾을 수 없음:', productId)
      return false
    }

    // 상품 정보 업데이트 (기존 정보에 새 정보 덮어쓰기)
    currentProducts[productIndex] = {
      ...currentProducts[productIndex],
      ...updatedData,
      id: productId // ID는 변경하지 않음
    }

    // 업데이트된 상품 목록 저장
    saveMockProducts(currentProducts)
    mockProducts = currentProducts

    console.log(`상품 ${productId} 정보 업데이트 완료`)

    // 상품 업데이트 이벤트 발생
    window.dispatchEvent(new CustomEvent('productUpdated', {
      detail: { productId, updatedData }
    }))

    return true
  } catch (error) {
    console.error('상품 업데이트 실패:', error)
    return false
  }
}

// Mock Supabase 클라이언트
export const createMockSupabaseClient = () => {
  // 서버 사이드에서는 기본 인스턴스 생성
  if (typeof window === 'undefined') {
    const mockAuthInstance = new MockAuth()
    const mockDatabase = {
      products: mockProducts,
      broadcasts: mockBroadcasts,
      profiles: [],
      broadcast_products: []
    }

    return {
      auth: mockAuthInstance,
      from: (table) => {
        let data = mockDatabase[table] || []

        // 서버 사이드에서는 기본 재고 정보 사용 (localStorage 접근 불가)
        return new MockQueryBuilder(table, data)
      }
    }
  }

  // 클라이언트 사이드에서는 전역 싱글톤 사용
  return window.__mockClientInstance
}