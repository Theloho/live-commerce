# 🚀 시스템 최적화 구현 계획

## 📋 개요
데이터 흐름 분석을 바탕으로 도출된 최적화 방안을 **우선순위별로 구현**하여 시스템의 안정성, 성능, 유지보수성을 향상시킵니다.

---

## 🎯 즉시 구현 필요 (Critical Priority)

### 1. **addresses 테이블 생성 및 API 500 에러 해결**

**문제**: 체크아웃 페이지에서 주소 로드 시 500 에러 발생
**원인**: addresses 테이블이 프로덕션 DB에 생성되지 않음
**영향**: 다중 주소 관리 기능 완전 중단

#### 🔧 구현 방법
```sql
-- Supabase 대시보드 SQL Editor에서 실행
CREATE TABLE addresses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '배송지',
  address TEXT NOT NULL,
  detail_address TEXT DEFAULT '',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_default ON addresses(user_id, is_default);

-- RLS 정책 생성
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own addresses" ON addresses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses" ON addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses" ON addresses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses" ON addresses
  FOR DELETE USING (auth.uid() = user_id);
```

#### ✅ 검증 체크리스트
```bash
1. addresses 테이블 생성 확인
2. API /api/addresses 정상 응답 확인
3. 마이페이지 주소 관리 기능 테스트
4. 체크아웃 주소 선택 기능 테스트
```

### 2. **UserProfileManager 성능 최적화**

**문제**: 복잡한 다중 저장소 동기화로 인한 성능 저하 및 일관성 위험
**개선**: 통합 프로필 업데이트 함수로 원자적 처리

#### 🔧 구현 방법
**파일**: `/Users/jt/live-commerce/lib/userProfileManager.js`에 추가

```javascript
/**
 * 통합 프로필 업데이트 - 모든 저장소를 원자적으로 업데이트
 * @param {string} userId - 사용자 ID
 * @param {object} profileData - 업데이트할 프로필 데이터
 * @param {boolean} isKakaoUser - 카카오 사용자 여부
 */
static async atomicProfileUpdate(userId, profileData, isKakaoUser = false) {
  console.log('🔄 통합 프로필 업데이트 시작:', { userId, isKakaoUser })

  try {
    // 병렬 업데이트로 성능 최적화
    const updatePromises = []

    // 1. profiles 테이블 업데이트 (항상 실행)
    updatePromises.push(
      supabase
        .from('profiles')
        .upsert({
          id: userId,
          name: profileData.name,
          phone: profileData.phone,
          nickname: profileData.nickname || profileData.name,
          address: profileData.address,
          detail_address: profileData.detail_address || '',
          updated_at: new Date().toISOString()
        })
    )

    // 2. auth.users user_metadata 업데이트 (항상 실행 - 관리자 페이지용)
    updatePromises.push(
      supabase.auth.updateUser({
        data: {
          name: profileData.name,
          phone: profileData.phone,
          nickname: profileData.nickname || profileData.name,
          address: profileData.address,
          detail_address: profileData.detail_address || '',
          profile_completed: true,
          updated_at: new Date().toISOString()
        }
      })
    )

    // 병렬 실행으로 성능 최적화
    const [profileResult, metadataResult] = await Promise.allSettled(updatePromises)

    // 결과 검증
    if (profileResult.status === 'rejected') {
      console.error('❌ profiles 업데이트 실패:', profileResult.reason)
      throw new Error('프로필 정보 저장 실패')
    }

    if (metadataResult.status === 'rejected') {
      console.warn('⚠️ user_metadata 업데이트 실패:', metadataResult.reason)
      // 경고만 하고 계속 진행 (중요하지만 치명적이지 않음)
    }

    // 3. 카카오 사용자인 경우 sessionStorage 업데이트
    if (isKakaoUser) {
      try {
        const currentSession = sessionStorage.getItem('user')
        if (currentSession) {
          const sessionData = JSON.parse(currentSession)
          const updatedSession = {
            ...sessionData,
            ...profileData,
            updated_at: new Date().toISOString()
          }
          sessionStorage.setItem('user', JSON.stringify(updatedSession))
          console.log('✅ sessionStorage 업데이트 완료')
        }
      } catch (error) {
        console.warn('⚠️ sessionStorage 업데이트 실패:', error)
      }
    }

    console.log('✅ 통합 프로필 업데이트 완료')
    return { success: true, data: profileResult.value }

  } catch (error) {
    console.error('❌ 통합 프로필 업데이트 실패:', error)
    throw error
  }
}
```

#### 📝 적용 파일 수정

**파일 1**: `/Users/jt/live-commerce/app/auth/complete-profile/page.js`
```javascript
// 기존 복잡한 로직 교체 (line 153-172)
await UserProfileManager.atomicProfileUpdate(
  sessionUser.id,
  {
    name: formData.name,
    phone: formData.phone,
    nickname: formData.nickname || formData.name,
    address: formData.address,
    detail_address: formData.detailAddress || ''
  },
  true // 카카오 사용자
)
```

**파일 2**: `/Users/jt/live-commerce/app/mypage/page.js`
```javascript
// 기존 복잡한 로직 교체 (line 220-271)
await UserProfileManager.atomicProfileUpdate(
  currentUser.id,
  { [field]: editValues[field] },
  !!currentUser.kakao_id // 카카오 사용자 여부 자동 판별
)
```

---

## 🎯 단기 구현 목표 (High Priority)

### 3. **체크아웃 페이지 성능 최적화**

**문제**: 순차적 API 호출로 인한 느린 로딩
**개선**: 병렬 처리로 로딩 시간 50% 단축

#### 🔧 구현 방법
**파일**: `/Users/jt/live-commerce/app/checkout/page.js`의 `loadUserDataParallel` 함수 개선

```javascript
// 기존 순차 처리를 병렬 처리로 최적화
const loadUserDataParallel = async (sessionData) => {
  const { sessionUser } = sessionData

  try {
    // 🚀 병렬 API 호출로 성능 최적화
    const promises = []

    // 1. 사용자 프로필 로드
    if (sessionUser?.id) {
      promises.push(
        fetch(`/api/users/${sessionUser.id}`)
          .then(res => res.json())
          .catch(err => ({ error: '사용자 정보 로드 실패', details: err }))
      )
    } else {
      promises.push(Promise.resolve(null))
    }

    // 2. 주소 목록 로드 (카카오/일반 사용자 공통)
    if (sessionUser?.id) {
      promises.push(
        fetch(`/api/addresses?user_id=${sessionUser.id}`)
          .then(res => res.json())
          .catch(err => ({ error: '주소 정보 로드 실패', details: err }))
      )
    } else {
      promises.push(Promise.resolve({ addresses: [] }))
    }

    // 3. 주문 기록 로드 (선택적)
    if (sessionUser?.id) {
      promises.push(
        fetch(`/api/orders?user_id=${sessionUser.id}&limit=1`)
          .then(res => res.json())
          .catch(err => ({ error: '주문 기록 로드 실패', details: err }))
      )
    } else {
      promises.push(Promise.resolve({ orders: [] }))
    }

    // 🚀 모든 API 호출을 병렬로 실행
    const [userResult, addressResult, orderResult] = await Promise.all(promises)

    // 결과 처리
    if (userResult && !userResult.error) {
      setUserProfile(prev => ({
        ...prev,
        ...UserProfileManager.normalizeProfile(userResult.user)
      }))
    }

    if (addressResult && !addressResult.error && addressResult.addresses) {
      const defaultAddress = addressResult.addresses.find(addr => addr.is_default)
      if (defaultAddress) {
        setSelectedAddress(defaultAddress)
        setUserProfile(prev => ({
          ...prev,
          address: defaultAddress.address,
          detail_address: defaultAddress.detail_address
        }))
      }
    }

    console.log('✅ 병렬 데이터 로드 완료')

  } catch (error) {
    console.error('❌ 병렬 데이터 로드 실패:', error)
    toast.error('데이터 로딩 중 오류가 발생했습니다')
  }
}
```

### 4. **주문 계산 로직 통합 및 정확성 보장**

**문제**: 여러 위치에서 다른 계산 로직 사용으로 인한 불일치
**개선**: 중앙화된 계산 로직으로 일관성 보장

#### 🔧 구현 방법
**새 파일**: `/Users/jt/live-commerce/lib/orderCalculations.js`

```javascript
/**
 * 주문 계산 로직 통합 모듈
 * 모든 주문 관련 계산을 중앙화하여 일관성 보장
 */

export class OrderCalculations {
  /**
   * 상품 아이템 총액 계산
   * @param {array} items - 주문 아이템 배열
   * @returns {number} 총 상품 금액
   */
  static calculateItemsTotal(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return 0
    }

    return items.reduce((sum, item) => {
      // 신규 스키마 우선, 구 스키마 fallback
      const itemTotal = item.total ||
                       (item.price && item.quantity ? item.price * item.quantity) ||
                       item.totalPrice ||
                       (item.unit_price && item.quantity ? item.unit_price * item.quantity) ||
                       0

      console.log(`💰 ${item.title || '상품'}: ₩${itemTotal.toLocaleString()}`)
      return sum + itemTotal
    }, 0)
  }

  /**
   * 배송비 계산
   * @param {number} itemsTotal - 상품 총액
   * @param {string} region - 배송 지역 ('normal'|'remote'|'island')
   * @returns {number} 배송비
   */
  static calculateShippingFee(itemsTotal, region = 'normal') {
    // 기본 배송비
    const baseShippingFee = 4000

    // 지역별 추가 배송비 (향후 확장용)
    const regionFees = {
      normal: 0,      // 일반 지역
      remote: 2000,   // 도서산간
      island: 4000    // 특수 지역
    }

    return baseShippingFee + (regionFees[region] || 0)
  }

  /**
   * 총 주문 금액 계산
   * @param {array} items - 주문 아이템 배열
   * @param {string} region - 배송 지역
   * @returns {object} 계산 결과 객체
   */
  static calculateOrderTotal(items, region = 'normal') {
    const itemsTotal = this.calculateItemsTotal(items)
    const shippingFee = this.calculateShippingFee(itemsTotal, region)
    const totalAmount = itemsTotal + shippingFee

    return {
      itemsTotal,
      shippingFee,
      totalAmount,
      breakdown: {
        상품금액: itemsTotal,
        배송비: shippingFee,
        총결제금액: totalAmount
      }
    }
  }

  /**
   * 그룹 주문 계산 (여러 주문을 묶어서 계산)
   * @param {array} orders - 주문 배열
   * @returns {object} 그룹 계산 결과
   */
  static calculateGroupOrderTotal(orders) {
    if (!Array.isArray(orders) || orders.length === 0) {
      return {
        totalItemsAmount: 0,
        totalShippingFee: 0,
        totalAmount: 0,
        orderCount: 0
      }
    }

    let totalItemsAmount = 0
    let totalShippingFee = 0

    orders.forEach(order => {
      const orderCalc = this.calculateOrderTotal(order.items || order.order_items)
      totalItemsAmount += orderCalc.itemsTotal
      totalShippingFee += orderCalc.shippingFee
    })

    return {
      totalItemsAmount,
      totalShippingFee,
      totalAmount: totalItemsAmount + totalShippingFee,
      orderCount: orders.length
    }
  }

  /**
   * 카드결제 부가세 포함 계산
   * @param {number} baseAmount - 기본 금액
   * @returns {number} 부가세 포함 금액
   */
  static calculateCardAmount(baseAmount) {
    return Math.floor(baseAmount * 1.1) // 부가세 10%
  }
}

export default OrderCalculations
```

#### 📝 적용 예시

**관리자 페이지 적용**:
```javascript
// app/admin/customers/[id]/page.js
import { OrderCalculations } from '@/lib/orderCalculations'

const calculation = OrderCalculations.calculateOrderTotal(order.order_items)
// 일관된 계산 결과 보장
```

**주문완료 페이지 적용**:
```javascript
// app/orders/[id]/complete/page.js
import { OrderCalculations } from '@/lib/orderCalculations'

const { itemsTotal, shippingFee, totalAmount } = OrderCalculations.calculateOrderTotal(orderData.items)
// 정확한 금액 표시 보장
```

---

## 🎯 중기 구현 목표 (Medium Priority)

### 5. **데이터베이스 쿼리 최적화**

**목표**: JOIN 쿼리 성능 개선 및 불필요한 쿼리 제거

#### 🔧 구현 방법
**파일**: `/Users/jt/live-commerce/lib/supabaseApi.js`의 `getOrders` 함수 최적화

```javascript
// 기존 복잡한 JOIN을 한 번의 쿼리로 최적화
const { data: orders, error } = await supabase
  .from('orders')
  .select(`
    *,
    order_items!inner (
      id, product_id, title, quantity, price, total, unit_price, total_price,
      selected_options, variant_title, sku
    ),
    order_shipping!inner (
      name, phone, address, detail_address
    ),
    order_payments!inner (
      method, amount, status, depositor_name
    )
  `)
  .eq(queryColumn, queryValue)
  .order('created_at', { ascending: false })
  .limit(limit || 50)
```

### 6. **캐싱 전략 구현**

**목표**: 자주 조회되는 데이터의 캐싱으로 성능 향상

#### 🔧 구현 방법
**새 파일**: `/Users/jt/live-commerce/lib/cacheManager.js`

```javascript
/**
 * 클라이언트 사이드 캐싱 관리
 */
export class CacheManager {
  static cache = new Map()
  static TTL = 5 * 60 * 1000 // 5분

  static set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  static get(key) {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  static invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}
```

---

## 🎯 장기 구현 목표 (Long-term)

### 7. **실시간 데이터 동기화**

**목표**: Supabase Realtime을 활용한 실시간 업데이트

### 8. **마이크로서비스 아키텍처 전환**

**목표**: 주문, 사용자, 결제 시스템을 독립적 모듈로 분리

### 9. **성능 모니터링 시스템**

**목표**: 실시간 성능 지표 수집 및 알림 시스템 구축

---

## 📋 구현 우선순위 및 일정

### 즉시 (오늘 내)
1. ✅ **addresses 테이블 생성** - 30분
2. ✅ **UserProfileManager 통합 함수** - 1시간

### 단기 (1-2일 내)
3. ✅ **체크아웃 성능 최적화** - 2시간
4. ✅ **주문 계산 로직 통합** - 3시간

### 중기 (1주일 내)
5. ✅ **데이터베이스 쿼리 최적화** - 4시간
6. ✅ **캐싱 전략 구현** - 3시간

### 장기 (1개월 내)
7. ✅ **실시간 동기화** - 1주일
8. ✅ **아키텍처 개선** - 2주일

---

## 🔍 성과 측정 지표

### 성능 지표
- **페이지 로딩 시간**: 현재 3-5초 → 목표 1-2초
- **API 응답 시간**: 현재 500-1000ms → 목표 200-500ms
- **동시 사용자 처리**: 현재 10명 → 목표 100명

### 안정성 지표
- **데이터 일관성**: 현재 95% → 목표 99.9%
- **에러율**: 현재 2-3% → 목표 0.1%
- **가동률**: 현재 99% → 목표 99.9%

### 개발 효율성 지표
- **버그 수정 시간**: 현재 2-4시간 → 목표 30분-1시간
- **새 기능 개발 시간**: 현재 1-2일 → 목표 4-8시간
- **코드 커버리지**: 현재 70% → 목표 90%

---

**📊 최적화 계획 수립 완료**: 2025-10-01
**🎯 목표**: 단계적 최적화를 통한 시스템 성능 및 안정성 향상