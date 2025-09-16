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
      // 이미 존재하는 이메일인지 확인
      const existingUser = this.globalState.users.find(user => user.email === email)
      console.log('Existing user check:', existingUser)
      if (existingUser) {
        console.log('User already exists, returning error')
        return {
          data: null,
          error: { message: 'User already registered' }
        }
      }

      // 새 사용자 생성
      const newUser = {
        id: 'mock-user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        email: email,
        created_at: new Date().toISOString(),
        user_metadata: options.data || {}
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
      }
      console.log('signInWithPassword - set currentUser:', this.globalState.currentUser)

      // 리스너들에게 알림
      this.notifyListeners('SIGNED_IN', { user })

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
    console.log('getSession - returning currentUser:', this.globalState.currentUser)
    return {
      data: {
        session: this.globalState.currentUser ? { user: this.globalState.currentUser } : null
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
    this.listeners.forEach(listener => {
      listener.callback(event, session)
    })
  }
}

// Mock 상품 데이터
const mockProducts = [
  {
    id: '1',
    title: '프리미엄 무선 이어폰',
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
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    title: '스마트워치 프로',
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
    created_at: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    title: '무선 충전패드',
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
    created_at: '2024-01-03T00:00:00Z'
  },
  {
    id: '4',
    title: '블루투스 스피커',
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
    created_at: '2024-01-04T00:00:00Z'
  }
]

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

// Mock 주문 데이터 생성 함수
export const createMockOrder = (orderItem, userProfile, paymentMethod = 'bank_transfer') => {
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

  try {
    const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    const shippingFee = 4000
    const totalAmount = paymentMethod === 'card'
      ? Math.floor(orderItem.totalPrice * 1.1) + shippingFee
      : orderItem.totalPrice + shippingFee

    const mockOrder = {
      id: orderId,
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
        const data = mockDatabase[table] || []
        return new MockQueryBuilder(table, data)
      }
    }
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
        const data = mockDatabase[table] || []
        return new MockQueryBuilder(table, data)
      }
    }
  }

  // 클라이언트 사이드에서는 전역 싱글톤 사용
  return window.__mockClientInstance
}