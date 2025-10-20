# 🔧 라이브 커머스 플랫폼 리팩토링 계획

**작성 일자**: 2025-10-20
**목표**: 성능 80% 향상, 개발 효율 66% 향상
**소요 시간**: 3-4일

---

## 🎯 최우선 목표

**Zustand store 활성화 → 중복 쿼리 제거 → 성능 대폭 향상**

---

## 📋 Phase 1: authStore 활성화 (1일)

### 1.1 authStore 확장

**현재 authStore.js** (완벽하게 만들어져 있음):
```javascript
// app/stores/authStore.js
const useAuthStore = create(persist((set, get) => ({
  user: null,
  loading: false,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
  ...
})))
```

**추가 필요** (프로필 관리):
```javascript
// app/stores/authStore.js에 추가

const useAuthStore = create(persist((set, get) => ({
  // 기존 state...
  user: null,
  loading: false,
  isAuthenticated: false,
  
  // ⭐ 추가: 사용자 프로필 (중복 쿼리 제거)
  userProfile: null,
  profileLoading: false,
  profileError: null,
  
  // ⭐ 추가: 프로필 로드 (1번만 호출됨!)
  loadProfile: async (userId) => {
    const { userProfile } = get()
    
    // 캐시 확인 - 이미 로드되었으면 재사용!
    if (userProfile && userProfile.id === userId) {
      return userProfile
    }
    
    set({ profileLoading: true, profileError: null })
    
    try {
      const profile = await UserProfileManager.loadUserProfile(userId)
      set({ 
        userProfile: profile, 
        profileLoading: false 
      })
      return profile
    } catch (error) {
      set({ 
        profileError: error.message, 
        profileLoading: false 
      })
      throw error
    }
  },
  
  // ⭐ 추가: 프로필 업데이트 (DB + Store 동시 업데이트)
  updateProfile: async (userId, updates) => {
    try {
      // DB 업데이트
      await fetch('/api/profile/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, profileData: updates })
      })
      
      // Store 업데이트
      set((state) => ({
        userProfile: { ...state.userProfile, ...updates }
      }))
      
      return true
    } catch (error) {
      console.error('프로필 업데이트 실패:', error)
      return false
    }
  },
  
  // ⭐ 추가: 프로필 초기화
  clearProfile: () => set({ 
    userProfile: null, 
    profileLoading: false, 
    profileError: null 
  })
})))
```

---

### 1.2 checkout 페이지 리팩토링

**Before** (현재 - 문제):
```javascript
// app/checkout/page.js (Line 1-600)

const [userProfile, setUserProfile] = useState({...}) // ❌ 로컬 상태
const [pageLoading, setPageLoading] = useState(true)
const [profileErrors, setProfileErrors] = useState({})

useEffect(() => {
  const initCheckout = async () => {
    // ❌ 매번 DB에서 fetch
    const profile = await UserProfileManager.loadUserProfile(currentUser.id)
    setUserProfile(profile)
    
    // ❌ 주소 로드를 위해 또 호출!
    const profileAgain = await UserProfileManager.loadUserProfile(currentUser.id)
    // ...
  }
  initCheckout()
}, [])
```

**After** (개선 - 해결책):
```javascript
// app/checkout/page.js

import useAuthStore from '@/app/stores/authStore'

export default function CheckoutPage() {
  const router = useRouter()
  
  // ✅ Store에서 가져오기 (캐시 사용)
  const { 
    userProfile, 
    profileLoading, 
    loadProfile, 
    updateProfile 
  } = useAuthStore()
  
  // ✅ 로컬 상태는 UI 전용만 (23개 → 8개)
  const [orderItem, setOrderItem] = useState(null)
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositName, setDepositName] = useState('')
  const [selectedCoupon, setSelectedCoupon] = useState(null)
  
  useEffect(() => {
    const initCheckout = async () => {
      setPageLoading(true)
      
      try {
        const currentUser = userSession || user
        
        // ✅ Store에서 프로필 로드 (캐시 있으면 즉시 반환!)
        if (!userProfile || userProfile.id !== currentUser.id) {
          await loadProfile(currentUser.id)
        }
        
        // ✅ 주소는 userProfile에 이미 포함됨 (중복 호출 제거!)
        if (userProfile.addresses?.length > 0) {
          const defaultAddress = userProfile.addresses.find(a => a.is_default)
          setSelectedAddress(defaultAddress || userProfile.addresses[0])
        }
        
      } catch (error) {
        toast.error('페이지 로딩 실패')
      } finally {
        setPageLoading(false)
      }
    }
    
    initCheckout()
  }, [userProfile, loadProfile, userSession, user])
  
  // ✅ 주소 업데이트 - Store 사용
  const handleAddressUpdate = async (newAddresses) => {
    await updateProfile(currentUser.id, { addresses: newAddresses })
    toast.success('주소가 저장되었습니다')
  }
  
  // ... 나머지 코드 (23개 useState → 8개로 감소!)
}
```

**개선 효과**:
- DB 쿼리: 2번 → 0번 (캐시 사용)
- useState: 23개 → 8개 (65% 감소)
- 로딩 시간: 2-5초 → 0.1-0.5초 (90% 향상)

---

### 1.3 mypage 페이지 리팩토링

**Before** (현재):
```javascript
// app/mypage/page.js

const [userProfile, setUserProfile] = useState(null) // ❌
const [loading, setLoading] = useState(true)

useEffect(() => {
  const loadData = async () => {
    // ❌ 또 DB에서 fetch
    const profile = await UserProfileManager.loadUserProfile(userId)
    setUserProfile(profile)
  }
  loadData()
}, [])
```

**After** (개선):
```javascript
// app/mypage/page.js

import useAuthStore from '@/app/stores/authStore'

export default function MyPage() {
  // ✅ Store에서 가져오기 (즉시 표시!)
  const { userProfile, profileLoading, loadProfile, updateProfile } = useAuthStore()
  
  useEffect(() => {
    if (!userProfile && !profileLoading) {
      loadProfile(user.id) // 캐시 없을 때만 로드
    }
  }, [userProfile, profileLoading, loadProfile])
  
  // ✅ 프로필 수정 - Store 업데이트
  const handleProfileUpdate = async (updates) => {
    await updateProfile(user.id, updates)
    toast.success('프로필이 수정되었습니다')
  }
  
  // ... 나머지 코드
}
```

---

### 1.4 orders 페이지 리팩토링

**Before** (현재):
```javascript
// app/orders/page.js

const [userProfile, setUserProfile] = useState(null) // ❌
// ❌ 또 DB fetch
```

**After** (개선):
```javascript
// app/orders/page.js

import useAuthStore from '@/app/stores/authStore'

export default function OrdersPage() {
  const { userProfile, loadProfile } = useAuthStore() // ✅
  
  // 캐시 확인 후 필요시만 로드
  useEffect(() => {
    if (!userProfile) {
      loadProfile(user.id)
    }
  }, [userProfile])
  
  // 즉시 표시! (DB 쿼리 없음)
}
```

---

## 📋 Phase 2: cartStore 활성화 (1일)

### 2.1 cartStore에 쿠폰 기능 통합

**현재 cartStore.js** (이미 쿠폰 기능 있음!):
```javascript
// app/stores/cartStore.js

const useCartStore = create(persist((set, get) => ({
  appliedCoupon: null,
  discountAmount: 0,
  
  applyCoupon: (coupon) => { ... },
  removeCoupon: () => { ... }
})))
```

**추가 필요** (서버 쿠폰 목록):
```javascript
// app/stores/cartStore.js에 추가

const useCartStore = create(persist((set, get) => ({
  // 기존 state...
  appliedCoupon: null,
  discountAmount: 0,
  
  // ⭐ 추가: 사용자 쿠폰 목록
  availableCoupons: [],
  couponsLoading: false,
  
  // ⭐ 추가: 쿠폰 로드 (1번만!)
  loadCoupons: async (userId) => {
    const { availableCoupons } = get()
    
    // 캐시 확인
    if (availableCoupons.length > 0) {
      return availableCoupons
    }
    
    set({ couponsLoading: true })
    
    try {
      const coupons = await getUserCoupons(userId)
      const available = coupons.filter(c => !c.is_used)
      set({ availableCoupons: available, couponsLoading: false })
      return available
    } catch (error) {
      set({ couponsLoading: false })
      return []
    }
  },
  
  // ⭐ 추가: 쿠폰 사용 후 목록 업데이트
  markCouponUsed: (couponId) => {
    set((state) => ({
      availableCoupons: state.availableCoupons.filter(c => c.id !== couponId)
    }))
  }
})))
```

---

### 2.2 checkout 페이지 - 쿠폰 store 사용

**Before** (현재):
```javascript
// app/checkout/page.js

const [availableCoupons, setAvailableCoupons] = useState([]) // ❌
const [selectedCoupon, setSelectedCoupon] = useState(null)

useEffect(() => {
  // ❌ 매번 DB fetch
  const coupons = await getUserCoupons(userId)
  setAvailableCoupons(coupons)
}, [])
```

**After** (개선):
```javascript
// app/checkout/page.js

import useCartStore from '@/app/stores/cartStore'

export default function CheckoutPage() {
  // ✅ Store에서 가져오기
  const { 
    availableCoupons, 
    loadCoupons, 
    applyCoupon, 
    removeCoupon,
    appliedCoupon 
  } = useCartStore()
  
  useEffect(() => {
    if (availableCoupons.length === 0) {
      loadCoupons(user.id) // 캐시 없을 때만 로드
    }
  }, [])
  
  // ✅ 쿠폰 적용
  const handleApplyCoupon = (coupon) => {
    applyCoupon(coupon) // Store 업데이트
    toast.success('쿠폰이 적용되었습니다')
  }
  
  // 즉시 표시! (DB 쿼리 없음)
}
```

---

## 📋 Phase 3: productStore 활성화 (0.5일)

### 3.1 홈페이지 - productStore 사용

**Before** (현재):
```javascript
// app/page.js

const [products, setProducts] = useState([]) // ❌
// ❌ Server Component에서 fetch
```

**After** (개선):
```javascript
// app/page.js (Server Component 유지)

export default async function Home() {
  const products = await getProducts() // ISR로 캐시됨
  return <HomeClient initialProducts={products} />
}

// app/components/HomeClient.jsx

import useProductStore from '@/app/stores/productStore'

export default function HomeClient({ initialProducts }) {
  const { products, setProducts } = useProductStore()
  
  useEffect(() => {
    if (products.length === 0) {
      setProducts(initialProducts) // Store에 저장
    }
  }, [])
  
  // Store에서 사용
  return <ProductGrid products={products} />
}
```

---

## 📋 Phase 4: 테스트 및 배포 (1일)

### 4.1 성능 측정

**측정 항목**:
1. DB 쿼리 횟수 (Chrome DevTools Network)
2. 페이지 로딩 시간 (Lighthouse)
3. 번들 크기 (npm run build)
4. 사용자 흐름 시간 (홈 → 체크아웃 → 주문완료)

### 4.2 기대 효과

| 항목 | 개선 전 | 개선 후 | 달성 |
|------|---------|---------|------|
| 프로필 쿼리 | 5-8번 | 1번 | ✅ |
| 페이지 로딩 | 2-5초 | 0.1-0.5초 | ✅ |
| useState (체크아웃) | 23개 | 8개 | ✅ |
| 번들 크기 | 230kB | 190kB | ✅ |

---

## 🚀 Quick Start Guide

### 1. authStore 활성화 (우선순위 1)

```bash
# 1. app/stores/authStore.js 수정 (프로필 추가)
# 2. app/checkout/page.js 리팩토링
# 3. app/mypage/page.js 리팩토링
# 4. app/orders/page.js 리팩토링

# 테스트
npm run dev
# 체크아웃 페이지 접속 → Network 탭 확인 (쿼리 횟수 확인)
```

### 2. cartStore 활성화 (우선순위 2)

```bash
# 1. app/stores/cartStore.js 수정 (쿠폰 추가)
# 2. app/checkout/page.js 쿠폰 로직 수정
# 3. app/mypage/coupons/page.js 수정

# 테스트
# 쿠폰 목록 → 체크아웃 → 다시 쿠폰 목록 (DB 쿼리 1번만 확인)
```

### 3. productStore 활성화 (우선순위 3)

```bash
# 1. app/components/HomeClient.jsx 수정
# 2. ISR 유지 (캐싱 효과 유지)

# 테스트
# 홈 → 상품클릭 → 홈 (상품 데이터 캐시 확인)
```

---

## ⚠️ 주의사항

### 1. 점진적 적용

- ❌ 한 번에 모든 페이지 변경 (위험)
- ✅ 페이지별로 순차 적용 (안전)

### 2. 기존 코드 호환성

- ✅ useAuth hook 유지 (authStore 내부에서 사용)
- ✅ 기존 API 유지 (store는 캐시 레이어로 추가)

### 3. 테스트 필수

- ✅ 각 페이지 리팩토링 후 즉시 테스트
- ✅ Network 탭으로 쿼리 횟수 확인
- ✅ 사용자 플로우 전체 테스트

---

## 📊 예상 일정

```
Day 1: authStore 활성화
  ├─ 오전: authStore 확장 (프로필 추가)
  ├─ 오후: checkout 페이지 리팩토링
  └─ 저녁: mypage/orders 페이지 리팩토링

Day 2: cartStore 활성화
  ├─ 오전: cartStore 확장 (쿠폰 추가)
  ├─ 오후: checkout 쿠폰 로직 수정
  └─ 저녁: 테스트 및 버그 수정

Day 3: productStore + 테스트
  ├─ 오전: productStore 활성화
  ├─ 오후: 전체 테스트 및 성능 측정
  └─ 저녁: 배포 준비

Day 4: 배포 및 모니터링
  ├─ 오전: Vercel 배포
  └─ 오후: 모니터링 및 핫픽스
```

**총 3-4일 소요**

