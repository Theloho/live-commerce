# SYSTEM_DEPENDENCY_COMPLETE_PART5_3 - API 엔드포인트 수정 시나리오

**작성일**: 2025-10-20
**버전**: 1.0
**목적**: API 엔드포인트 수정 시 영향받는 모든 요소를 체크리스트로 관리

---

## 📋 목차

### Section 1: 주문 생성 API 수정 시나리오
- 1.1 요청 파라미터 변경
- 1.2 응답 형식 변경
- 1.3 비즈니스 로직 변경

### Section 2: 주문 조회 API 수정 시나리오
- 2.1 필터링 조건 추가
- 2.2 페이지네이션 변경
- 2.3 JOIN 최적화

### Section 3: 주문 상태 변경 API 수정 시나리오
- 3.1 상태 전환 로직 변경
- 3.2 타임스탬프 자동 기록

### Section 4: 관리자 API 수정 시나리오
- 4.1 권한 검증 강화
- 4.2 대량 작업 API

### Section 5: Service Role API 추가 시나리오
- 5.1 RLS 우회 필요성 확인
- 5.2 Service Role API 생성

### Section 6: API 인증 방식 변경 시나리오
- 6.1 Anon Key → Service Role
- 6.2 JWT 토큰 추가

### Section 7: API 응답 형식 변경 시나리오
- 7.1 통일된 응답 형식
- 7.2 에러 응답 표준화

---

## Section 1: 주문 생성 API 수정 시나리오

### 📌 개요
- **API**: POST /api/orders/create
- **현재 상태**: Part 3 Section 1.1 참조
- **호출 위치**: 2곳 (/checkout, BuyBottomSheet)
- **의존 함수**: 5개 (formatShippingInfo, calculateFinalOrderAmount 등)
- **DB 테이블**: 4개 (orders, order_items, order_payments, order_shipping)

### 🔍 현재 상태 (Part 3에서 확인)
```javascript
// Part 3 Section 1.1 참조

// 요청 파라미터
{
  orderData: { id, title, price, quantity, ... },
  userProfile: { name, phone, address, postal_code },
  depositName?: string,
  user: { id, name, kakao_id? },
  coupon?: { id, code, ... }
}

// 응답
{
  success: true,
  orderId: 'uuid',
  customer_order_number: 'S251020-1234'
}
```

---

### 1.1 요청 파라미터 변경 시나리오

#### 📋 파라미터 변경 전 체크리스트

- [ ] **1. 현재 호출처 확인** (Part 3 Section 1.1)
  - /app/checkout/page.js (line 1380)
  - /app/components/product/BuyBottomSheet.jsx (line 220)

- [ ] **2. 파라미터 구조 확인**
  - 필수 파라미터: orderData, userProfile, user
  - 선택 파라미터: depositName, coupon

- [ ] **3. 추가/삭제/변경할 파라미터 정의**
  - 예: `point` (포인트) 파라미터 추가
  - 예: `deliveryMessage` (배송 메시지) 추가

- [ ] **4. 기존 호출처 영향 확인**
  - 2곳 모두 새 파라미터 전달해야 하는가?
  - 선택 파라미터로 만들 수 있는가?

#### 🔧 파라미터 변경 작업 체크리스트

- [ ] **5. API Route 수정**
  ```javascript
  // /app/api/orders/create/route.js
  export async function POST(request) {
    const {
      orderData,
      userProfile,
      user,
      depositName,
      coupon,
      point = 0,  // ✅ 새 파라미터 (기본값 0)
      deliveryMessage = ''  // ✅ 새 파라미터
    } = await request.json()

    // 검증
    if (point < 0) {
      return NextResponse.json(
        { error: '포인트는 0 이상이어야 합니다' },
        { status: 400 }
      )
    }

    // DB 저장
    const { data: order } = await supabaseAdmin
      .from('orders')
      .insert({
        ...
        point_discount: point  // ✅ 새 컬럼
      })

    // ...
  }
  ```

- [ ] **6. 호출처 코드 수정** (2곳)
  - /app/checkout/page.js
    ```javascript
    const response = await fetch('/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        orderData,
        userProfile,
        user,
        depositName,
        coupon,
        point: pointToUse,  // ✅ 추가
        deliveryMessage: deliveryMsg  // ✅ 추가
      })
    })
    ```

  - /app/components/product/BuyBottomSheet.jsx
    ```javascript
    const response = await fetch('/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        orderData,
        userProfile,
        user,
        depositName,
        point: 0,  // ✅ 빠른 구매는 포인트 사용 불가
        deliveryMessage: ''  // ✅ 기본값
      })
    })
    ```

- [ ] **7. TypeScript 타입 정의 업데이트** (있다면)
  ```typescript
  interface OrderCreateRequest {
    orderData: OrderData
    userProfile: UserProfile
    user: User
    depositName?: string
    coupon?: Coupon
    point?: number  // ✅ 추가
    deliveryMessage?: string  // ✅ 추가
  }
  ```

#### ✅ 파라미터 변경 후 검증 체크리스트

- [ ] **8. 호출처별 테스트** (2곳)
  - 체크아웃: 포인트 입력 → 주문 생성 → DB 확인
  - BuyBottomSheet: 빠른 구매 → 주문 생성 → DB 확인

- [ ] **9. 기존 기능 정상 작동 확인**
  - 쿠폰 할인 여전히 작동?
  - 무료배송 여전히 작동?

- [ ] **10. 에러 처리 테스트**
  - point = -100 → 400 에러
  - 필수 파라미터 누락 → 400 에러

- [ ] **11. 문서 업데이트**
  - Part 3 Section 1.1 - 요청 파라미터 업데이트
  - Part 5-3 Section 1.1 - 과거 사례 추가

---

### 1.2 응답 형식 변경 시나리오

#### 📋 응답 형식 변경 전 체크리스트

- [ ] **1. 현재 응답 형식 확인**
  ```javascript
  // 성공 시
  {
    success: true,
    orderId: 'uuid',
    customer_order_number: 'S251020-1234'
  }

  // 실패 시
  {
    error: 'Error message'
  }
  ```

- [ ] **2. 호출처에서 응답 사용 방식 확인**
  - /app/checkout/page.js: `result.orderId` 사용
  - /app/components/product/BuyBottomSheet.jsx: `result.customer_order_number` 사용

- [ ] **3. 변경하려는 응답 형식 정의**
  - 예: 전체 주문 데이터 반환
  - 예: 추가 필드 포함 (포인트 잔액, 쿠폰 사용 내역)

#### 🔧 응답 형식 변경 작업 체크리스트

- [ ] **4. API Route 응답 수정**
  ```javascript
  return NextResponse.json({
    success: true,
    order: {
      id: order.id,
      customer_order_number: order.customer_order_number,
      total_amount: order.total_amount,
      discount_amount: order.discount_amount,
      point_discount: order.point_discount,  // ✅ 추가
      created_at: order.created_at
    },
    user: {
      remaining_points: remainingPoints  // ✅ 추가
    }
  })
  ```

- [ ] **5. 호출처 코드 수정** (2곳)
  - /app/checkout/page.js
    ```javascript
    const result = await response.json()
    if (result.success) {
      router.push(`/orders/${result.order.id}/complete`)  // ✅ result.orderId → result.order.id
      // 포인트 잔액 업데이트
      setRemainingPoints(result.user.remaining_points)  // ✅ 추가
    }
    ```

#### ✅ 응답 형식 변경 후 검증 체크리스트

- [ ] **6. 호출처별 테스트** (2곳)
  - 새 응답 형식으로 정상 작동?
  - 추가 필드 정확히 표시?

- [ ] **7. 하위 호환성 확인**
  - 기존 필드 그대로 유지?
  - 기존 코드 깨지지 않음?

- [ ] **8. 문서 업데이트**
  - Part 3 Section 1.1 - 응답 형식 업데이트

---

### 1.3 비즈니스 로직 변경 시나리오

#### 📋 비즈니스 로직 변경 전 체크리스트

- [ ] **1. 현재 로직 확인** (Part 3 Section 1.1)
  - 무료배송 조건 확인 (서버 사이드)
  - 쿠폰 할인 계산
  - 도서산간 배송비 계산
  - 재고 감소 (Variant)

- [ ] **2. 의존 함수 확인** (Part 1 참조)
  - formatShippingInfo()
  - calculateFinalOrderAmount()
  - validateCoupon()
  - applyCouponUsage()
  - update_variant_inventory RPC

- [ ] **3. 변경하려는 로직 정의**
  - 예: 포인트 할인 추가
  - 예: 재고 예약 시스템 추가

#### 🔧 비즈니스 로직 변경 작업 체크리스트

- [ ] **4. 중앙 함수 수정 확인**
  - calculateFinalOrderAmount() 수정 필요? (Part 5-1 Section 1.1 참조)
  - 새로운 중앙 함수 추가 필요? (Part 5-1 Section 5 참조)

- [ ] **5. DB 테이블 수정 확인**
  - 새 컬럼 추가 필요? (Part 5-2 Section 1.1 참조)
  - RLS 정책 수정 필요? (Part 5-2 Section 9 참조)

- [ ] **6. API Route 로직 수정**
  ```javascript
  // 예: 포인트 할인 추가
  const { default: OrderCalculations } = await import('@/lib/orderCalculations')

  const orderCalc = OrderCalculations.calculateFinalOrderAmount(items, {
    region: userProfile.postal_code,
    coupon: coupon,
    point: point,  // ✅ 추가
    paymentMethod: 'bank_transfer',
    baseShippingFee: isFreeShipping
  })

  // 포인트 차감
  const { data: updatedProfile } = await supabaseAdmin
    .from('profiles')
    .update({
      point: profiles.point - point
    })
    .eq('id', user.id)
    .select()
    .single()
  ```

- [ ] **7. 트랜잭션 처리 확인** ⚠️ 중요!
  - 주문 생성 + 재고 감소 + 포인트 차감
  - 하나 실패 시 롤백 필요?
  - Supabase는 트랜잭션 지원 제한적 → RPC 함수 사용 권장

#### ✅ 비즈니스 로직 변경 후 검증 체크리스트

- [ ] **8. 정상 케이스 테스트**
  - 주문 생성 성공
  - 재고 정확히 감소
  - 포인트 정확히 차감

- [ ] **9. 에러 케이스 테스트**
  - 재고 부족 → 주문 생성 실패
  - 포인트 부족 → 주문 생성 실패
  - 하나 실패 시 롤백 확인

- [ ] **10. 중앙 함수 영향 확인**
  - Part 5-1에서 수정한 함수 정상 작동?

- [ ] **11. 문서 업데이트**
  - Part 3 Section 1.1 - 비즈니스 로직 업데이트

#### 🐛 과거 버그 사례

**사례 1: 무료배송 조건 불일치 (2025-10-16)**
- **증상**: 클라이언트에서 무료배송 표시했는데 서버에서 배송비 부과
- **원인**:
  - 클라이언트: pending 주문 확인 (캐시된 데이터)
  - 서버: 플래그만 받아서 저장 (실시간 확인 안 함)
- **해결**: 서버에서 실시간 pending 주문 확인 추가
  ```javascript
  // 3.5. 무료배송 조건 확인 (서버에서 실시간 확인)
  let isFreeShipping = false
  let pendingQuery = supabaseAdmin
    .from('orders')
    .select('id')
    .in('status', ['pending', 'verifying'])

  if (user.kakao_id) {
    pendingQuery = pendingQuery.like('order_type', `%KAKAO:${user.kakao_id}%`)
  } else {
    pendingQuery = pendingQuery.eq('user_id', user.id)
  }

  const { data: pendingOrders } = await pendingQuery.limit(1)
  isFreeShipping = (pendingOrders && pendingOrders.length > 0)
  ```
- **재발 방지**: 서버 사이드 검증 필수!

**사례 2: 장바구니 주문 생성 버그 (2025-10-07)**
- **증상**: 여러 상품 장바구니 추가 시 1개만 주문 생성
- **원인**: `supabase.raw()` 함수 사용 → `is not a function` 에러
- **해결**: 직접 쿼리 + 계산으로 변경
- **재발 방지**: Supabase 공식 API만 사용

#### 📚 크로스 레퍼런스

- **Part 3 Section 1.1**: POST /api/orders/create 정의
- **Part 1 Section 1.1**: calculateFinalOrderAmount() 함수
- **Part 1 Section 3.5**: formatShippingInfo() 함수
- **Part 2 Section 1**: orders 테이블
- **Part 4 Section 2**: /checkout 페이지 (호출처)
- **Part 5-1 Section 1.1**: calculateFinalOrderAmount() 수정 시나리오
- **Part 5-2 Section 1**: orders 테이블 수정 시나리오

---

## Section 2: 주문 조회 API 수정 시나리오

### 📌 개요
- **API**: POST /api/orders/list
- **현재 상태**: Part 3 Section 2 참조
- **호출 위치**: 3곳 (/orders, /checkout?mode=bulk, 관리자)
- **특징**: Service Role API (RLS 우회), Kakao 사용자 3개 패턴 매칭

### 🔍 현재 상태 (Part 3에서 확인)
```javascript
// Part 3 Section 2 참조

// 요청 파라미터
{
  user: { id, kakao_id? },
  orderId?: string,  // 특정 주문 조회
  page: 1,
  pageSize: 10,
  status: null  // 필터
}

// 응답
{
  success: true,
  orders: [...],
  pagination: { currentPage, pageSize, totalCount, totalPages },
  statusCounts: { pending: 5, deposited: 10, ... }
}
```

---

### 2.1 필터링 조건 추가 시나리오

#### 📋 필터링 조건 추가 전 체크리스트

- [ ] **1. 현재 필터링 조건 확인**
  - status: 주문 상태 필터
  - orderId: 특정 주문 조회

- [ ] **2. 추가하려는 필터링 조건 정의**
  - 예: `dateRange` (날짜 범위)
  - 예: `paymentMethod` (결제 수단)
  - 예: `search` (주문번호/상품명 검색)

- [ ] **3. 호출처 확인** (Part 3 Section 2)
  - /app/orders/page.js - 사용자 주문 목록
  - /app/checkout/page.js?mode=bulk - 일괄결제
  - /app/admin/orders/page.js - 관리자 주문 목록

#### 🔧 필터링 조건 추가 작업 체크리스트

- [ ] **4. API Route 수정**
  ```javascript
  // /app/api/orders/list/route.js
  export async function POST(request) {
    const {
      user,
      orderId,
      page = 1,
      pageSize = 10,
      status = null,
      dateRange = null,  // ✅ 추가 { from: '2025-01-01', to: '2025-12-31' }
      paymentMethod = null,  // ✅ 추가
      search = null  // ✅ 추가
    } = await request.json()

    // 기본 쿼리
    let query = supabaseAdmin
      .from('orders')
      .select(`...`)

    // 날짜 범위 필터
    if (dateRange) {
      query = query
        .gte('created_at', dateRange.from)
        .lte('created_at', dateRange.to)
    }

    // 결제 수단 필터 (order_payments JOIN)
    if (paymentMethod) {
      query = query
        .eq('order_payments.method', paymentMethod)
    }

    // 검색 (주문번호 또는 상품명)
    if (search) {
      query = query.or(`
        customer_order_number.ilike.%${search}%,
        order_items.title.ilike.%${search}%
      `)
    }

    // ...
  }
  ```

- [ ] **5. 호출처 UI 수정** (필요한 곳만)
  - /app/orders/page.js
    ```jsx
    <input
      type="date"
      value={dateFrom}
      onChange={(e) => setDateFrom(e.target.value)}
    />
    <input
      type="date"
      value={dateTo}
      onChange={(e) => setDateTo(e.target.value)}
    />
    <button onClick={handleSearch}>검색</button>
    ```

- [ ] **6. API 호출 코드 수정**
  ```javascript
  const response = await fetch('/api/orders/list', {
    method: 'POST',
    body: JSON.stringify({
      user,
      page,
      pageSize,
      status,
      dateRange: { from: dateFrom, to: dateTo },  // ✅ 추가
      search: searchTerm  // ✅ 추가
    })
  })
  ```

#### ✅ 필터링 조건 추가 후 검증 체크리스트

- [ ] **7. 필터링 테스트**
  - 날짜 범위 → 해당 기간 주문만 조회
  - 결제 수단 → 해당 수단 주문만 조회
  - 검색 → 주문번호/상품명 검색 정상 작동

- [ ] **8. 성능 테스트**
  - 필터링 조건이 많을 때 쿼리 속도?
  - 인덱스 추가 필요? (Part 5-2 Section 10 참조)

- [ ] **9. 문서 업데이트**
  - Part 3 Section 2 - 필터링 조건 업데이트

---

### 2.2 페이지네이션 변경 시나리오

#### 📋 페이지네이션 변경 전 체크리스트

- [ ] **1. 현재 페이지네이션 방식 확인**
  - 클라이언트 사이드 페이지네이션
  - 전체 데이터 조회 후 slice()

- [ ] **2. 변경하려는 방식 정의**
  - 서버 사이드 페이지네이션
  - offset + limit 쿼리

- [ ] **3. 성능 영향 확인**
  - 전체 데이터 조회 → 느림
  - offset + limit → 빠름

#### 🔧 페이지네이션 변경 작업 체크리스트

- [ ] **4. API Route 수정**
  ```javascript
  // BEFORE: 클라이언트 사이드 (전체 조회)
  const { data: allOrders } = await query  // 1000개 조회
  const paginatedOrders = allOrders.slice(offset, offset + pageSize)  // 10개만 사용

  // AFTER: 서버 사이드 (필요한 만큼만 조회)
  const { data: paginatedOrders } = await query
    .range(offset, offset + pageSize - 1)  // 10개만 조회

  // 전체 개수 조회 (별도 쿼리)
  const { count } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  ```

- [ ] **5. 응답 형식 수정**
  ```javascript
  return NextResponse.json({
    success: true,
    orders: paginatedOrders,
    pagination: {
      currentPage: page,
      pageSize,
      totalCount: count,
      totalPages: Math.ceil(count / pageSize)
    }
  })
  ```

#### ✅ 페이지네이션 변경 후 검증 체크리스트

- [ ] **6. 성능 측정**
  - 쿼리 시간 Before/After
  - 데이터 전송량 Before/After

- [ ] **7. 페이지 이동 테스트**
  - 1페이지, 2페이지, 마지막 페이지
  - 페이지 번호 정확한가?

- [ ] **8. 문서 업데이트**
  - Part 3 Section 2 - 페이지네이션 방식 업데이트

---

### 2.3 JOIN 최적화 시나리오

#### 📋 JOIN 최적화 전 체크리스트

- [ ] **1. 현재 JOIN 구조 확인**
  ```javascript
  .select(`
    *,
    order_items (
      *,
      products (
        product_number,
        title,
        thumbnail_url,
        price
      )
    ),
    order_shipping (*),
    order_payments (*)
  `)
  ```

- [ ] **2. 불필요한 JOIN 확인**
  - products JOIN이 필요한가?
  - order_items에 이미 title, thumbnail_url 저장되어 있음
  - products JOIN 제거 가능?

- [ ] **3. 성능 문제 확인**
  - 쿼리 시간?
  - 데이터 전송량?

#### 🔧 JOIN 최적화 작업 체크리스트

- [ ] **4. 불필요한 JOIN 제거**
  ```javascript
  // BEFORE: products JOIN (불필요)
  .select(`
    *,
    order_items (
      *,
      products (
        product_number,
        title,
        thumbnail_url,
        price
      )
    ),
    order_shipping (*),
    order_payments (*)
  `)

  // AFTER: products JOIN 제거
  .select(`
    *,
    order_items (*),
    order_shipping (*),
    order_payments (*)
  `)
  ```

- [ ] **5. 필요한 컬럼만 SELECT**
  ```javascript
  .select(`
    id, customer_order_number, status, total_amount, created_at,
    order_items (id, title, thumbnail_url, price, quantity),
    order_shipping (recipient_name, phone, address),
    order_payments (method, amount, status)
  `)
  ```

#### ✅ JOIN 최적화 후 검증 체크리스트

- [ ] **6. 성능 측정**
  - 쿼리 시간: 5초 → 1초 (5배 향상)
  - 데이터 전송량: 50% 감소

- [ ] **7. 기능 확인**
  - 주문 목록 정상 표시
  - 모든 정보 정확

- [ ] **8. 문서 업데이트**
  - Part 3 Section 2 - 최적화 내역 업데이트

#### 🐛 과거 버그 사례

**사례 1: product_variants JOIN 제거 (2025-10-18)**
- **증상**: 홈페이지 모바일 타임아웃 (10-20초)
- **원인**: 4단계 JOIN (product_variants까지), 200KB 데이터
- **해결**: JOIN 제거, 11개 컬럼만 SELECT
- **결과**: 데이터 90% 감소 (200KB → 20KB), 즉시 로딩

#### 📚 크로스 레퍼런스

- **Part 3 Section 2**: POST /api/orders/list 정의
- **Part 4 Section 5**: /orders 페이지 (호출처)
- **Part 5-2 Section 1**: orders 테이블 수정 시나리오
- **Part 5-2 Section 10**: 인덱스 추가 시나리오

---

## Section 3: 주문 상태 변경 API 수정 시나리오

### 📌 개요
- **API**: PATCH /api/orders/update-status
- **현재 상태**: Part 3 Section 3 참조
- **호출 위치**: 2곳 (관리자 주문 상세, 입금 확인 페이지)
- **기능**: 주문 상태 변경 + 타임스탬프 자동 기록

### 🔍 현재 상태 (Part 3에서 확인)
```javascript
// Part 3 Section 3 참조

// 요청 파라미터
{
  orderId: 'uuid',
  newStatus: 'deposited',  // 'pending' → 'deposited' → 'shipped' → 'delivered'
  trackingNumber?: string,
  trackingCompany?: string
}

// 응답
{
  success: true,
  order: { id, status, deposited_at, shipped_at, ... }
}
```

---

### 3.1 상태 전환 로직 변경 시나리오

#### 📋 상태 전환 로직 변경 전 체크리스트

- [ ] **1. 현재 상태 전환 규칙 확인**
  - pending → verifying (입금 확인 대기)
  - verifying → deposited (입금 확인 완료)
  - deposited → shipped (발송 완료)
  - shipped → delivered (배송 완료)
  - 모든 상태 → cancelled (주문 취소)

- [ ] **2. 허용되지 않는 전환 확인**
  - delivered → pending (❌ 불가능)
  - cancelled → deposited (❌ 불가능)

- [ ] **3. 변경하려는 전환 규칙 정의**
  - 예: 새로운 상태 추가 (returned, exchanged)
  - 예: 전환 규칙 강화 (특정 전환만 허용)

#### 🔧 상태 전환 로직 변경 작업 체크리스트

- [ ] **4. 상태 전환 검증 추가**
  ```javascript
  // /app/api/orders/update-status/route.js

  // 허용된 전환 정의
  const ALLOWED_TRANSITIONS = {
    'pending': ['verifying', 'cancelled'],
    'verifying': ['deposited', 'cancelled'],
    'deposited': ['shipped', 'cancelled'],
    'shipped': ['delivered', 'returned'],
    'delivered': ['returned', 'exchanged'],
    'cancelled': [],  // 취소된 주문은 전환 불가
    'returned': [],
    'exchanged': []
  }

  // 전환 가능 여부 확인
  const currentStatus = existingOrder.status
  const allowedStatuses = ALLOWED_TRANSITIONS[currentStatus] || []

  if (!allowedStatuses.includes(newStatus)) {
    return NextResponse.json(
      { error: `${currentStatus}에서 ${newStatus}로 전환할 수 없습니다` },
      { status: 400 }
    )
  }
  ```

- [ ] **5. 새로운 상태 추가** (필요 시)
  - DB 마이그레이션 (Part 5-2 Section 1 참조)
  - CHECK 제약조건 업데이트

#### ✅ 상태 전환 로직 변경 후 검증 체크리스트

- [ ] **6. 허용된 전환 테스트**
  - pending → deposited → shipped → delivered
  - 각 단계 정상 작동?

- [ ] **7. 허용되지 않는 전환 테스트**
  - delivered → pending → 400 에러
  - cancelled → deposited → 400 에러

- [ ] **8. 문서 업데이트**
  - Part 3 Section 3 - 상태 전환 규칙 업데이트

---

### 3.2 타임스탬프 자동 기록 시나리오

#### 📋 타임스탬프 자동 기록 체크리스트

- [ ] **1. 현재 타임스탬프 로직 확인**
  - deposited → deposited_at 기록
  - shipped → shipped_at 기록
  - delivered → delivered_at 기록

- [ ] **2. 추가하려는 타임스탬프 정의**
  - 예: returned_at (반품 완료)
  - 예: exchanged_at (교환 완료)

#### 🔧 타임스탬프 자동 기록 작업 체크리스트

- [ ] **3. DB 컬럼 추가**
  ```sql
  ALTER TABLE orders
  ADD COLUMN returned_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN exchanged_at TIMESTAMP WITH TIME ZONE;
  ```

- [ ] **4. API Route 로직 수정**
  ```javascript
  // 타임스탬프 자동 기록
  const statusTimestamps = {
    'deposited': 'deposited_at',
    'shipped': 'shipped_at',
    'delivered': 'delivered_at',
    'returned': 'returned_at',
    'exchanged': 'exchanged_at'
  }

  const updateData = { status: newStatus }
  if (statusTimestamps[newStatus]) {
    updateData[statusTimestamps[newStatus]] = new Date().toISOString()
  }

  const { data: updatedOrder } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single()
  ```

#### ✅ 타임스탬프 자동 기록 후 검증 체크리스트

- [ ] **5. 타임스탬프 기록 확인**
  - deposited → deposited_at 저장?
  - shipped → shipped_at 저장?

- [ ] **6. 주문 상세 페이지 확인**
  - 타임스탬프 정확히 표시?

- [ ] **7. 문서 업데이트**
  - Part 3 Section 3 업데이트

#### 📚 크로스 레퍼런스

- **Part 3 Section 3**: PATCH /api/orders/update-status 정의
- **Part 2 Section 1**: orders 테이블 (상태 및 타임스탬프)
- **Part 4 Section 13**: /admin/orders/[id] 페이지 (호출처)
- **Part 5-2 Section 1**: orders 테이블 수정 시나리오

---

## Section 4: 관리자 API 수정 시나리오

### 📌 개요
- **API 타입**: Service Role API (RLS 우회)
- **인증 방식**: adminEmail 검증 (verifyAdminAuth)
- **주요 API**:
  - GET /api/admin/orders
  - POST /api/admin/coupons/create
  - POST /api/admin/coupons/distribute

### 4.1 권한 검증 강화 시나리오

#### 📋 권한 검증 강화 전 체크리스트

- [ ] **1. 현재 권한 검증 방식 확인**
  - adminEmail 파라미터 전달
  - verifyAdminAuth(adminEmail) 함수 호출
  - profiles.is_admin = true 확인

- [ ] **2. 보안 취약점 확인**
  - adminEmail 위조 가능?
  - 서버 사이드 검증 충분한가?

- [ ] **3. 강화하려는 검증 방식 정의**
  - 예: JWT 토큰 기반 인증
  - 예: 세션 기반 인증
  - 예: IP 화이트리스트

#### 🔧 권한 검증 강화 작업 체크리스트

- [ ] **4. JWT 토큰 기반 인증 추가**
  ```javascript
  // /lib/adminAuth.js
  import jwt from 'jsonwebtoken'

  export function generateAdminToken(adminEmail) {
    return jwt.sign(
      { email: adminEmail, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )
  }

  export function verifyAdminToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      return { valid: true, email: decoded.email }
    } catch (error) {
      return { valid: false, error: error.message }
    }
  }
  ```

- [ ] **5. API Route에 토큰 검증 추가**
  ```javascript
  // /app/api/admin/orders/route.js
  export async function GET(request) {
    // 토큰 추출
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    // 토큰 검증
    const { valid, email, error } = verifyAdminToken(token)
    if (!valid) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰' },
        { status: 401 }
      )
    }

    // DB에서 관리자 확인
    const { data: admin } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('email', email)
      .eq('is_admin', true)
      .single()

    if (!admin) {
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 정상 처리
    // ...
  }
  ```

- [ ] **6. 클라이언트 코드 수정**
  ```javascript
  // /hooks/useAdminAuthNew.js
  const token = generateAdminToken(adminUser.email)

  const response = await fetch('/api/admin/orders', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  ```

#### ✅ 권한 검증 강화 후 검증 체크리스트

- [ ] **7. 관리자 API 테스트**
  - 유효한 토큰 → 정상 작동
  - 유효하지 않은 토큰 → 401 에러
  - 토큰 없음 → 401 에러

- [ ] **8. 일반 사용자 접근 차단 확인**
  - 일반 사용자 토큰 → 403 에러

- [ ] **9. 문서 업데이트**
  - Part 3 Section 4 - 인증 방식 업데이트

---

### 4.2 대량 작업 API 시나리오

#### 📋 대량 작업 API 생성 전 체크리스트

- [ ] **1. 대량 작업 필요성 확인**
  - 예: 100개 주문 일괄 상태 변경
  - 예: 1000명에게 쿠폰 배포

- [ ] **2. 성능 영향 확인**
  - 순차 처리 vs 배치 처리
  - 타임아웃 가능성

- [ ] **3. 에러 처리 전략**
  - 일부 실패 시?
  - 전체 롤백 vs 부분 성공

#### 🔧 대량 작업 API 생성 작업 체크리스트

- [ ] **4. API Route 생성**
  ```javascript
  // /app/api/admin/orders/bulk-update/route.js
  export async function POST(request) {
    const { adminEmail, orderIds, newStatus } = await request.json()

    // 권한 검증
    // ...

    // 대량 업데이트 (배치 처리)
    const results = []
    const errors = []

    for (const orderId of orderIds) {
      try {
        const { data, error } = await supabaseAdmin
          .from('orders')
          .update({ status: newStatus })
          .eq('id', orderId)
          .select()
          .single()

        if (error) throw error
        results.push(data)
      } catch (error) {
        errors.push({ orderId, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      successCount: results.length,
      errorCount: errors.length,
      errors
    })
  }
  ```

#### ✅ 대량 작업 API 생성 후 검증 체크리스트

- [ ] **5. 대량 작업 테스트**
  - 10개 주문 일괄 변경 → 정상 작동?
  - 100개 주문 일괄 변경 → 타임아웃 없음?

- [ ] **6. 부분 실패 처리 확인**
  - 일부 실패 시 성공/실패 리스트 반환?

- [ ] **7. 문서 업데이트**
  - Part 3에 새 API 추가

#### 📚 크로스 레퍼런스

- **Part 3 Section 4**: 관리자 API 정의
- **Part 5-2 Section 9**: RLS 정책 (Service Role)

---

## Section 5: Service Role API 추가 시나리오

### 📌 개요
Service Role API는 RLS를 우회하여 모든 데이터에 접근 가능

**언제 필요한가?**
- RLS 정책이 복잡하거나 성능 문제 발생 시
- Kakao 사용자 매칭 실패 시
- 관리자 기능 구현 시

### 5.1 RLS 우회 필요성 확인 시나리오

#### 📋 필요성 확인 체크리스트

- [ ] **1. 현재 문제 파악**
  - RLS 정책으로 인한 타임아웃?
  - Kakao 사용자 조회 실패?
  - 복잡한 서브쿼리로 인한 성능 저하?

- [ ] **2. RLS 우회 대안 확인**
  - 헬퍼 함수 생성? (Part 5-2 Section 9.1 참조)
  - 인덱스 추가? (Part 5-2 Section 10 참조)
  - Service Role API 전환?

- [ ] **3. Service Role 전환 결정**
  - 보안 검증을 서버 사이드에서 수행 가능한가?
  - 복잡한 RLS 정책을 단순화할 수 있는가?

---

### 5.2 Service Role API 생성 시나리오

#### 📋 Service Role API 생성 전 체크리스트

- [ ] **1. 기존 API 분석**
  - Anon Key 사용 중?
  - RLS 정책 적용 중?

- [ ] **2. Service Role API 요구사항 정의**
  - 어떤 기능?
  - 어떤 권한 검증 필요?

- [ ] **3. 환경변수 확인**
  ```bash
  # .env.local
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```

#### 🔧 Service Role API 생성 작업 체크리스트

- [ ] **4. Service Role 클라이언트 생성**
  ```javascript
  // /app/api/orders/list/route.js
  import { createClient } from '@supabase/supabase-js'

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
  ```

- [ ] **5. 권한 검증 추가** ⚠️ 필수!
  ```javascript
  export async function POST(request) {
    const { user, ... } = await request.json()

    // 1. 기본 유효성 검사
    if (!user || !user.id) {
      return NextResponse.json(
        { error: '사용자 정보가 필요합니다' },
        { status: 400 }
      )
    }

    // 2. RLS 우회 쿼리
    let query = supabaseAdmin
      .from('orders')
      .select(`...`)

    // 3. 사용자 타입별 필터링 (서버 사이드)
    if (user.kakao_id) {
      // Kakao 사용자: order_type으로 조회
      query = query.eq('order_type', `direct:KAKAO:${user.kakao_id}`)
    } else {
      // Supabase Auth 사용자: user_id로 조회
      query = query.eq('user_id', user.id)
    }

    const { data } = await query

    return NextResponse.json({ success: true, orders: data })
  }
  ```

- [ ] **6. 기존 클라이언트 코드 수정**
  ```javascript
  // Anon Key 사용 → Service Role API 호출로 변경
  // BEFORE
  const { data } = await supabase.from('orders').select('*')

  // AFTER
  const response = await fetch('/api/orders/list', {
    method: 'POST',
    body: JSON.stringify({ user })
  })
  const { orders } = await response.json()
  ```

#### ✅ Service Role API 생성 후 검증 체크리스트

- [ ] **7. 권한 검증 테스트**
  - 유효한 사용자 → 자기 데이터만 조회
  - user_id 위조 시도 → 차단

- [ ] **8. 성능 테스트**
  - RLS 우회로 성능 향상?
  - 쿼리 시간 측정

- [ ] **9. 보안 확인**
  - Service Role Key 노출 안 됨 (서버 사이드만 사용)
  - 서버 사이드 권한 검증 충분

- [ ] **10. 문서 업데이트**
  - Part 3에 새 API 추가
  - Service Role 사용 명시

#### 🐛 과거 버그 사례

**사례 1: 관리자 RLS 순환 참조 (2025-10-03)**
- **문제**: profiles 조회 10초+ 타임아웃
- **해결**: Service Role API Route 생성 (`/api/admin/check-profile`)
- **결과**: 10초+ → 1초 이내

**사례 2: Kakao 사용자 주문 조회 0개 (2025-10-05)**
- **문제**: RLS 정책 auth.uid() 매칭 실패
- **해결**: Service Role API 전환 (`/api/orders/list`) + 3개 패턴 매칭
- **결과**: 주문 목록 정상 표시

#### 📚 크로스 레퍼런스

- **Part 3 Section 1.1**: POST /api/orders/create (Service Role 예시)
- **Part 3 Section 2**: POST /api/orders/list (Service Role 예시)
- **Part 5-2 Section 9.3**: Service Role API 전환 시나리오

---

## Section 6: API 인증 방식 변경 시나리오

### 6.1 Anon Key → Service Role 전환

**Part 5 Section 5 참조** (위에서 설명함)

---

### 6.2 JWT 토큰 추가

**Part 5 Section 4.1 참조** (위에서 설명함)

---

## Section 7: API 응답 형식 변경 시나리오

### 7.1 통일된 응답 형식 시나리오

#### 📋 통일된 응답 형식 정의

- [ ] **1. 현재 응답 형식 확인**
  ```javascript
  // 성공 시 (다양한 형식)
  { success: true, data: {...} }
  { success: true, orders: [...] }
  { orderId: '...' }

  // 실패 시 (다양한 형식)
  { error: 'Error message' }
  { success: false, error: '...' }
  ```

- [ ] **2. 표준 응답 형식 정의**
  ```javascript
  // 성공 시
  {
    success: true,
    data: { ... },
    meta: {
      timestamp: '2025-10-20T10:00:00Z',
      version: '1.0'
    }
  }

  // 실패 시
  {
    success: false,
    error: {
      code: 'INVALID_PARAMETER',
      message: '사용자 정보가 필요합니다',
      details: {...}
    },
    meta: {
      timestamp: '2025-10-20T10:00:00Z',
      version: '1.0'
    }
  }
  ```

#### 🔧 통일된 응답 형식 적용 작업 체크리스트

- [ ] **3. 응답 헬퍼 함수 생성**
  ```javascript
  // /lib/apiResponse.js
  export function successResponse(data, meta = {}) {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        ...meta
      }
    }
  }

  export function errorResponse(code, message, details = null, status = 400) {
    return {
      response: {
        success: false,
        error: {
          code,
          message,
          details
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      },
      status
    }
  }
  ```

- [ ] **4. 모든 API Route 수정**
  ```javascript
  // /app/api/orders/create/route.js
  import { successResponse, errorResponse } from '@/lib/apiResponse'

  export async function POST(request) {
    try {
      // ...
      return NextResponse.json(successResponse({ order }))
    } catch (error) {
      const { response, status } = errorResponse(
        'ORDER_CREATE_FAILED',
        '주문 생성에 실패했습니다',
        error.message
      )
      return NextResponse.json(response, { status })
    }
  }
  ```

- [ ] **5. 클라이언트 코드 수정**
  ```javascript
  const response = await fetch('/api/orders/create', {...})
  const result = await response.json()

  if (result.success) {
    const order = result.data.order  // ✅ 통일된 형식
  } else {
    console.error(result.error.message)  // ✅ 통일된 에러 형식
  }
  ```

#### ✅ 통일된 응답 형식 적용 후 검증 체크리스트

- [ ] **6. 모든 API 응답 형식 확인**
  - 성공 시 통일된 형식?
  - 실패 시 통일된 형식?

- [ ] **7. 클라이언트 코드 정상 작동 확인**
  - 모든 호출처 수정 완료?

- [ ] **8. 문서 업데이트**
  - Part 3 - 모든 API 응답 형식 업데이트

---

### 7.2 에러 응답 표준화 시나리오

#### 📋 에러 응답 표준화 체크리스트

- [ ] **1. 에러 코드 정의**
  ```javascript
  // /lib/errorCodes.js
  export const ERROR_CODES = {
    // 400 Bad Request
    INVALID_PARAMETER: { code: 'INVALID_PARAMETER', status: 400 },
    MISSING_REQUIRED_FIELD: { code: 'MISSING_REQUIRED_FIELD', status: 400 },

    // 401 Unauthorized
    UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401 },
    INVALID_TOKEN: { code: 'INVALID_TOKEN', status: 401 },

    // 403 Forbidden
    FORBIDDEN: { code: 'FORBIDDEN', status: 403 },
    INSUFFICIENT_PERMISSION: { code: 'INSUFFICIENT_PERMISSION', status: 403 },

    // 404 Not Found
    NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
    ORDER_NOT_FOUND: { code: 'ORDER_NOT_FOUND', status: 404 },

    // 500 Internal Server Error
    INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500 },
    DATABASE_ERROR: { code: 'DATABASE_ERROR', status: 500 }
  }
  ```

- [ ] **2. 에러 핸들러 생성**
  ```javascript
  // /lib/apiResponse.js
  import { ERROR_CODES } from './errorCodes'

  export function apiError(errorCode, message, details = null) {
    const error = ERROR_CODES[errorCode] || ERROR_CODES.INTERNAL_ERROR

    return NextResponse.json({
      success: false,
      error: {
        code: error.code,
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    }, { status: error.status })
  }
  ```

- [ ] **3. 모든 API Route 에러 처리 표준화**
  ```javascript
  // /app/api/orders/create/route.js
  import { apiError } from '@/lib/apiResponse'
  import { ERROR_CODES } from '@/lib/errorCodes'

  export async function POST(request) {
    try {
      const { user } = await request.json()

      if (!user) {
        return apiError(
          'MISSING_REQUIRED_FIELD',
          '사용자 정보가 필요합니다',
          { field: 'user' }
        )
      }

      // ...
    } catch (error) {
      return apiError(
        'INTERNAL_ERROR',
        '주문 생성에 실패했습니다',
        error.message
      )
    }
  }
  ```

#### ✅ 에러 응답 표준화 후 검증 체크리스트

- [ ] **4. 에러 코드별 테스트**
  - 400: 잘못된 파라미터
  - 401: 인증 실패
  - 403: 권한 없음
  - 404: 데이터 없음
  - 500: 서버 에러

- [ ] **5. 클라이언트 에러 처리 확인**
  - 에러 코드별 적절한 메시지 표시?

- [ ] **6. 문서 업데이트**
  - Part 3 - 모든 API 에러 응답 업데이트

---

## 📊 전체 요약

### API 수정 시 반드시 확인할 것

1. **Part 3에서 API 정의 확인** (요청/응답 형식, 호출처)
2. **Part 1에서 의존 함수 확인** (어떤 중앙 함수 사용?)
3. **Part 2에서 DB 테이블 확인** (어떤 테이블 접근?)
4. **Part 4에서 호출처 확인** (어떤 페이지에서 호출?)
5. **Part 5-3 체크리스트 따라가기** (빠짐없이 모든 항목 확인)

### API 수정 후 반드시 할 것

1. **요청 파라미터 변경 시 모든 호출처 수정**
2. **응답 형식 변경 시 모든 호출처 수정**
3. **비즈니스 로직 변경 시 중앙 함수 확인**
4. **Service Role 전환 시 권한 검증 추가**
5. **문서 업데이트** (Part 3, Part 5-3)

---

**다음 단계**: Part 5-4 (페이지 수정 시나리오) 읽기

**작성 완료**: 2025-10-20
