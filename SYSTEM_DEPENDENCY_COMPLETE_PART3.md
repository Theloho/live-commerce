# Part 3: API 엔드포인트 종속성 맵 (API Endpoint Dependency Map)

> **버전**: 1.0
> **작성일**: 2025-10-20
> **목적**: 각 API 엔드포인트가 어떤 중앙 함수/DB 테이블을 사용하는지 완벽히 파악

---

## 📋 목차

### 핵심 프로덕션 API (상세 문서화)
1. [주문 관련 API](#1-주문-관련-api) (3개)
2. [관리자 주문 관리 API](#2-관리자-주문-관리-api) (2개)
3. [관리자 상품 관리 API](#3-관리자-상품-관리-api) (5개)
4. [관리자 쿠폰 관리 API](#4-관리자-쿠폰-관리-api) (4개)
5. [관리자 배송 관리 API](#5-관리자-배송-관리-api) (2개)
6. [관리자 발주 관리 API](#6-관리자-발주-관리-api) (2개)
7. [관리자 인증 API](#7-관리자-인증-api) (5개)
8. [사용자 인증 API](#8-사용자-인증-api) (3개)
9. [기타 API](#9-기타-api) (2개)

### API 전체 요약
10. [API 엔드포인트 매트릭스](#10-api-엔드포인트-매트릭스)
11. [인증 방식 가이드](#11-인증-방식-가이드)
12. [에러 처리 패턴](#12-에러-처리-패턴)

---

## 🎯 이 문서의 사용법

### 언제 이 문서를 참조해야 하는가?

1. **새 API 개발 시**
   - 유사 API 구현 패턴 확인
   - 인증 방식 결정 (Service Role vs Anon Key)
   - 에러 처리 패턴 참조

2. **API 버그 수정 시**
   - 해당 API 섹션 읽기
   - 호출하는 중앙 함수 확인
   - 접근하는 DB 테이블 확인
   - 과거 버그 사례 확인

3. **중앙 함수 수정 시**
   - 어떤 API가 해당 함수를 호출하는지 파악
   - 영향받는 모든 API 테스트 필요

### 문서 읽는 순서

```
1. 목차에서 해당 API 카테고리 찾기
   ↓
2. 해당 섹션의 API 개요 읽기
   ↓
3. 요청/응답 형식 확인
   ↓
4. 인증 방식 확인
   ↓
5. 호출하는 중앙 함수/DB 테이블 확인
   ↓
6. 호출 페이지 확인
   ↓
7. 과거 버그 사례 확인
```

---

# 핵심 프로덕션 API 상세 문서화

---

## 1. 주문 관련 API

### 1.1 POST /api/orders/create

#### 📌 개요
- **용도**: 주문 생성 (Service Role API)
- **인증**: Service Role Key (RLS 우회)
- **호출 페이지**:
  - `/app/checkout/page.js` (체크아웃 완료)
  - `/app/admin/orders/new` (관리자 수동 주문 생성)

#### 📥 요청 파라미터
```typescript
{
  orderData: {
    id: string,                // 상품 ID
    title: string,             // 상품명
    price: number,             // 단가
    quantity: number,          // 수량
    totalPrice: number,        // 합계
    selectedOptions: object,   // 선택 옵션
    variantId?: string,        // Variant ID (옵션 상품)
    orderType: 'direct' | 'cart',  // 주문 유형
    couponDiscount?: number    // 쿠폰 할인
  },
  userProfile: {
    name: string,
    phone: string,
    address: string,
    detail_address: string,
    postal_code: string        // 도서산간 배송비 계산 필수
  },
  depositName?: string,        // 입금자명
  user: {                      // getCurrentUser() 결과
    id: string,
    name: string,
    kakao_id?: string
  }
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  order: {
    id: string,
    customer_order_number: string,  // S251015-A1B2
    status: 'pending',
    total_amount: number,
    discount_amount: number,
    is_free_shipping: boolean,      // ⭐ 무료배송 플래그
    items: Array<OrderItem>
  }
}
```

#### 🔧 호출하는 중앙 함수
- `formatShippingInfo()` (line 255, 302) - 배송비 계산
- `getCurrentUser()` - 사용자 정보 (클라이언트에서 전달)

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 | 라인 |
|--------|------|------|
| profiles | SELECT | 91-95 (사용자 검증) |
| orders | SELECT | 66-72 (기존 장바구니 확인) |
| orders | INSERT | 190-194 (신규 주문) |
| orders | UPDATE | 149-156 (장바구니 금액 증가) |
| order_items | INSERT | 220-222 |
| order_shipping | INSERT | 240-242 |
| order_payments | INSERT | 276-278 (신규 주문) |
| order_payments | UPDATE | 314-318 (장바구니) |
| product_variants | RPC | 335-341 (재고 차감) |
| products | UPDATE | 371-375 (재고 차감, Variant 없는 경우) |

#### 📍 주요 로직

1. **장바구니 주문 병합** (line 56-80):
   - 기존 pending 주문 찾기 (`order_type LIKE 'cart:KAKAO:kakao_id%'`)
   - 있으면 재사용, 없으면 새로 생성

2. **무료배송 조건 확인** (line 105-134) ⭐:
   - 서버에서 실시간 pending/verifying 주문 존재 여부 확인
   - `is_free_shipping` 플래그 저장
   - 카카오 사용자: `order_type LIKE '%KAKAO:kakao_id%'`
   - 일반 사용자: `user_id = validUserId`

3. **재고 차감** (line 329-382):
   - Variant 있으면: `update_variant_inventory` RPC 호출 (동시성 제어)
   - Variant 없으면: `products.inventory` 직접 차감

#### ⚠️ 주의사항

- [ ] **is_free_shipping**: 서버에서 실시간 확인 후 저장 (클라이언트 조건과 다를 수 있음)
- [ ] **postal_code**: 배송비 계산 필수 (제주/울릉도 추가 배송비)
- [ ] **장바구니 병합**: 기존 주문 재사용 시 `total_amount` 증가, 아이템만 추가
- [ ] **user_id nullable**: 카카오 사용자는 user_id = null
- [ ] **재고 차감**: variant_id 여부에 따라 다른 로직

#### 🐛 과거 버그 사례

1. **무료배송 조건 불일치** (2025-10-16)
   - 증상: 클라이언트 조건 확인 vs 서버 저장 타이밍 차이
   - 해결: 서버에서 실시간 확인 후 저장 (line 105-134)
   - 커밋: 64bcb81

#### 📚 관련 문서
- Part 1: Section 3.5 - formatShippingInfo()
- Part 2: Section 1 - orders 테이블

---

### 1.2 POST /api/orders/update-status

#### 📌 개요
- **용도**: 주문 상태 업데이트 (Service Role API)
- **인증**: Service Role Key (RLS 우회)
- **호출 페이지**:
  - `/app/checkout/page.js` (입금확인 요청, 전체결제)
  - `/app/admin/orders/[id]/page.js` (관리자 상태 변경)

#### 📥 요청 파라미터
```typescript
{
  orderIds: string[],          // 주문 ID 배열 (일괄 처리)
  status: 'verifying' | 'paid' | 'shipped' | 'delivered' | 'cancelled',
  paymentData?: {
    method: 'bank_transfer' | 'card',
    shippingData: {
      shipping_name: string,
      shipping_phone: string,
      shipping_address: string,
      shipping_detail_address: string,
      shipping_postal_code: string
    },
    depositorName: string,
    discountAmount: number,
    selectedCoupon?: {
      code: string
    }
  }
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  updatedCount: number
}
```

#### 🔧 호출하는 중앙 함수
- `OrderCalculations.calculateFinalOrderAmount()` (line 172-180) - 정확한 금액 계산
- `applyCouponUsage()` (line 242-247) - 쿠폰 사용 처리

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 | 라인 |
|--------|------|------|
| orders | SELECT | 94-98 (is_free_shipping 조회) |
| orders | UPDATE | 79-82 (상태 변경) |
| order_shipping | SELECT | 113-117 (기존 레코드 확인) |
| order_shipping | UPDATE | 123-126 (배송 정보 변경) |
| order_shipping | INSERT | 130-135 (배송 정보 없을 때) |
| order_payments | SELECT | 150-154 (주문 상세 조회) |
| order_payments | SELECT | 205-209 (기존 레코드 확인) |
| order_payments | UPDATE | 215-218 (결제 정보 변경) |
| order_payments | INSERT | 222-227 (결제 정보 없을 때) |
| user_coupons | RPC | 242-247 (use_coupon) |

#### 📍 주요 로직

1. **payment_group_id 생성** (line 47-51):
   - 2개 이상 주문 일괄결제 시 그룹 ID 생성 (`GROUP-1234567890`)

2. **상태별 타임스탬프** (line 64-67):
   - `verifying` → `verifying_at`
   - `paid` → `paid_at`
   - `delivered` → `delivered_at`
   - `cancelled` → `cancelled_at`

3. **무료배송 조건 반영** (line 94-100, 168):
   - orders.is_free_shipping 조회
   - true이면 배송비 0원, false이면 4,000원 + 도서산간

4. **OrderCalculations 금액 재계산** (line 172-180):
   - order_items 조회 → 상품 금액 합산
   - 배송비: is_free_shipping + postal_code 기반
   - 쿠폰 할인: discountAmount
   - 최종 금액: amount

5. **쿠폰 사용 처리** (line 240-255):
   - `applyCouponUsage()` 호출
   - `use_coupon` RPC 실행
   - `user_coupons.is_used = true` 업데이트

#### ⚠️ 주의사항

- [ ] **orderIds 배열**: 단일 주문도 배열로 전달 필수
- [ ] **payment_group_id**: 2개 이상 주문만 생성
- [ ] **is_free_shipping 확인**: orders 테이블에서 조회 후 사용
- [ ] **금액 재계산**: 반드시 OrderCalculations 사용
- [ ] **쿠폰 사용**: use_coupon RPC 사용 필수

#### 🐛 과거 버그 사례

1. **RLS 정책 누락으로 UPDATE 실패** (2025-10-04)
   - 증상: PATCH 204 성공하지만 DB 저장 안 됨
   - 해결: Service Role API 생성
   - 마이그레이션: `20251004_fix_rls_update_policies.sql`

#### 📚 관련 문서
- Part 1: Section 1.1 - OrderCalculations.calculateFinalOrderAmount()
- Part 2: Section 1, 3 - orders, order_payments 테이블

---

### 1.3 POST /api/orders/list

#### 📌 개요
- **용도**: 주문 목록 조회 (Service Role API)
- **인증**: Service Role Key (RLS 우회)
- **호출 페이지**: `/app/orders/page.js` (사용자 주문 목록)

#### 📥 요청 파라미터
```typescript
{
  user: {                      // getCurrentUser() 결과
    id: string,
    name: string,
    kakao_id?: string
  },
  orderId?: string,            // 단일 주문 조회 시
  page?: number,               // 페이지 번호 (기본 1)
  pageSize?: number,           // 페이지 크기 (기본 10)
  status?: string              // 상태 필터
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  orders: Array<{
    id: string,
    customer_order_number: string,
    status: string,
    total_amount: number,
    discount_amount: number,
    is_free_shipping: boolean,
    payment_group_id?: string,
    created_at: string,
    items: Array<OrderItem>,    // order_items + products JOIN
    shipping: OrderShipping,
    payment: OrderPayment
  }>,
  pagination: {
    currentPage: number,
    totalPages: number,
    totalCount: number,
    pageSize: number
  },
  statusCounts: {
    pending: number,
    verifying: number,
    paid: number,
    shipped: number,
    delivered: number
  }
}
```

#### 🔧 호출하는 중앙 함수
- 없음 (직접 Supabase 쿼리)

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 | 라인 |
|--------|------|------|
| orders | SELECT | 46-61 (기본 쿼리) |
| order_items | JOIN | 50-57 |
| products | JOIN | 52-57 (product_number, title, thumbnail_url, price만) |
| order_shipping | JOIN | 59 |
| order_payments | JOIN | 60 |

#### 📍 주요 로직

1. **사용자별 필터링** (line 76-185):
   - **카카오 사용자** (line 77-131):
     - 기본 조회: `order_type = 'direct:KAKAO:kakao_id'`
     - 대체 조회 1: `order_type LIKE 'cart:KAKAO:kakao_id%'`
     - 대체 조회 2: `order_type LIKE '%KAKAO:user.id%'`
     - 중복 제거 후 병합
   - **Supabase Auth 사용자** (line 174-185):
     - `user_id = user.id`

2. **데이터 정규화** (line 189-210):
   - `order_items` 배열: thumbnail_url, title, price 우선순위 처리
   - `order_shipping`: 배열 → 객체 변환
   - `order_payments`: 배열 → 객체 변환

3. **상태별 총계 계산** (line 213-216):
   - statusCounts 객체 생성 (탭 숫자용)

4. **페이지네이션** (line 224-228):
   - 메모리 내 slice() 처리

#### ⚠️ 주의사항

- [ ] **카카오 사용자 조회**: 3가지 패턴 모두 확인 (direct, cart, 대체)
- [ ] **중복 제거**: existingIds Set으로 중복 방지
- [ ] **product_variants JOIN 제거**: 성능 최적화 (2025-10-18)
- [ ] **페이지네이션**: 서버가 아닌 클라이언트 메모리 내 처리

#### 🐛 과거 버그 사례

1. **카카오 사용자 주문 조회 0개** (2025-10-05)
   - 증상: 모바일에서 주문 목록 빈 화면
   - 원인: RLS 정책이 `auth.uid()`로 매칭 시도
   - 해결: Service Role API + 3가지 패턴 조회
   - 마이그레이션: `20251005_fix_kakao_user_order_select.sql`

2. **홈페이지 상품 로딩 타임아웃** (2025-10-18)
   - 증상: product_variants 4-level JOIN으로 200KB 데이터
   - 해결: JOIN 제거, 필요한 컬럼만 SELECT
   - 커밋: 680c31b
   - 결과: 90% 데이터 감소

#### 📚 관련 문서
- Part 2: Section 1, 2 - orders, order_items 테이블

---

## 2. 관리자 주문 관리 API

### 2.1 GET /api/admin/orders

#### 📌 개요
- **용도**: 관리자 주문 목록 조회 (Service Role API)
- **인증**: Service Role Key (RLS 우회)
- **호출 페이지**:
  - `/app/admin/orders/page.js` (관리자 주문 관리)
  - `/app/admin/deposits/page.js` (입금확인)
  - `/app/admin/shipping/page.js` (배송 관리)

#### 📥 요청 파라미터 (Query String)
```typescript
{
  status?: 'verifying' | 'deposited' | 'shipped' | 'delivered',
  paymentMethod?: 'bank_transfer' | 'card',
  startDate?: string,          // ISO 8601
  endDate?: string             // ISO 8601
}
```

#### 📤 응답 형식
```typescript
{
  orders: Array<{
    id: string,
    customer_order_number: string,
    status: string,
    total_amount: number,
    created_at: string,
    order_items: Array<{
      title: string,
      quantity: number,
      products: {
        product_number: string,
        title: string,
        thumbnail_url: string
      },
      suppliers?: {
        name: string
      }
    }>,
    order_shipping: Object,
    order_payments: Object
  }>
}
```

#### 🔧 호출하는 중앙 함수
- 없음 (직접 Supabase 쿼리)

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 | 라인 |
|--------|------|------|
| orders | SELECT | 31-77 |
| order_items | JOIN | 55-69 |
| products | JOIN | 59-64 |
| suppliers | JOIN | 65-68 |
| order_shipping | JOIN | 70 |
| order_payments | JOIN (조건부) | 71-73 |

#### 📍 주요 로직

1. **서버 사이드 필터링** (line 31-77):
   - `status` 필터: `.eq('status', status)`
   - `paymentMethod` 필터: INNER JOIN 조건부 적용
   - 날짜 범위: `.gte('created_at', startDate).lte('created_at', endDate)`

2. **INNER JOIN 조건부 적용** (line 71-73) ⭐:
   ```javascript
   if (paymentMethodFilter) {
     query.select(`..., order_payments!inner(...)`)  // INNER JOIN
   } else {
     query.select(`..., order_payments(...)`)        // LEFT JOIN
   }
   ```
   - paymentMethodFilter 없으면: LEFT JOIN (모든 주문 포함)
   - paymentMethodFilter 있으면: INNER JOIN (결제 정보 있는 주문만)

3. **정렬** (line 75):
   - `created_at DESC` (최신 주문 우선)

#### ⚠️ 주의사항

- [ ] **INNER JOIN 주의**: paymentMethod 필터 시 결제대기 주문 제외됨
- [ ] **image_url 사용 금지**: `thumbnail_url` 사용 필수 (2025-10-17 버그)
- [ ] **배열 인덱스**: `order_shipping[0]`, `order_payments[0]` 필수

#### 🐛 과거 버그 사례

1. **입금확인 페이지 itemsLoaded: 0** (2025-10-15)
   - 증상: 클라이언트 필터링 후 페이지네이션 → 빈 화면
   - 해결: API에 status/paymentMethod 파라미터 추가
   - 커밋: a10ed02

2. **결제대기 탭 INNER JOIN 오류** (2025-10-15)
   - 증상: order_payments!inner → 결제대기 주문 제외
   - 해결: paymentMethodFilter 있을 때만 INNER JOIN
   - 커밋: 7715575

#### 📚 관련 문서
- Part 2: Section 1, 2 - orders, order_items 테이블

---

### 2.2 GET /api/admin/purchase-orders

#### 📌 개요
- **용도**: 업체별 발주서 목록 조회 (Service Role API)
- **인증**: Service Role Key (RLS 우회)
- **호출 페이지**: `/app/admin/purchase-orders/page.js` (발주 관리)

#### 📥 요청 파라미터 (Query String)
```typescript
{
  startDate?: string,          // ISO 8601
  endDate?: string             // ISO 8601
}
```

#### 📤 응답 형식
```typescript
{
  suppliers: Array<{
    supplier_id: string,
    supplier_name: string,
    total_quantity: number,
    total_amount: number,
    order_ids: string[]          // 주문 ID 배열
  }>
}
```

#### 🔧 호출하는 중앙 함수
- 없음 (직접 Supabase 쿼리)

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 | 라인 |
|--------|------|------|
| orders | SELECT | 31-77 |
| order_items | JOIN | 46-62 |
| products | JOIN | 50-56 |
| suppliers | JOIN | 57-61 |
| purchase_order_batches | SELECT | 69-72 (완료된 주문 제외) |

#### 📍 주요 로직

1. **status 필터** (line 31):
   - `.in('status', ['paid', 'deposited'])` (일괄 조회)

2. **완료된 주문 제외** (line 69-72):
   ```sql
   .not('id', 'in', `(
     SELECT unnest(order_ids)
     FROM purchase_order_batches
     WHERE supplier_id = '${supplierId}'
   )`)
   ```

3. **업체별 집계** (line 애플리케이션 레벨):
   - supplier_id로 그룹핑
   - 수량, 금액 합산
   - order_ids 배열 생성

#### ⚠️ 주의사항

- [ ] **status 필터 통일**: paid + deposited 모두 포함 (2025-10-15 수정)
- [ ] **GIN 인덱스**: order_ids 배열 검색 최적화

#### 🐛 과거 버그 사례

1. **발주 페이지 데이터 0개** (2025-10-15)
   - 증상: status 필터 불일치로 빈 화면
   - 원인: 발주 API: `deposited`만, 물류팀 API: `paid`만
   - 해결: `.in('status', ['paid', 'deposited'])`로 통일
   - 커밋: 6c6b870

#### 📚 관련 문서
- Part 2: Section 11 - purchase_order_batches 테이블

---

## 3. 관리자 상품 관리 API

### 3.1 POST /api/admin/products/create

#### 📌 개요
- **용도**: 상품 생성 (빠른등록 + 상세등록 + Variant 지원)
- **인증**: Service Role Key (RLS 우회) + adminEmail 검증
- **호출 페이지**:
  - `/app/admin/products/new/page.js` (빠른 상품 등록)
  - `/app/admin/products/detail-new/page.js` (상세 상품 등록)

#### 📥 요청 파라미터
```typescript
{
  // 기본 필드
  title: string,
  product_number: string,
  price: number,
  inventory: number,
  thumbnail_url: string,
  description: string,

  // 옵션 필드
  optionType: 'none' | 'size' | 'color' | 'both',
  sizeOptions?: string[],      // ['S', 'M', 'L']
  colorOptions?: string[],     // ['빨강', '파랑']
  combinations?: Array<{       // 조합 배열
    key: string,               // 'S', 'S-빨강'
    type: 'size' | 'color' | 'both',
    size?: string,
    color?: string
  }>,
  optionInventories?: {        // 옵션별 재고
    'S': 10,
    'M': 20,
    'S-빨강': 5,
    'M-파랑': 15
  },

  // 상세등록 추가 필드
  supplier_id?: string,
  supplier_product_code?: string,
  category?: string,
  sub_category?: string,
  purchase_price?: number,
  purchase_date?: string,
  compare_price?: number,
  detailed_description?: string,
  status?: 'active' | 'inactive',
  is_live?: boolean,           // 빠른등록: true, 상세등록: false

  adminEmail: string           // 관리자 이메일 (권한 검증)
}
```

#### 📤 응답 형식
```typescript
{
  product: {
    id: string,
    product_number: string,
    title: string,
    price: number,
    inventory: number,          // Variant 있으면 합계
    status: 'active',
    is_live: boolean,
    is_live_active: boolean
  }
}
```

#### 🔧 호출하는 중앙 함수
- `verifyAdminAuth()` (line 49) - 관리자 권한 확인

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 | 라인 |
|--------|------|------|
| products | INSERT | 94-98 |
| product_options | INSERT | 147-156 (옵션 있을 때) |
| product_option_values | INSERT | 172-175 (옵션값) |
| product_variants | INSERT | 211-220 (Variant) |
| variant_option_values | INSERT | 251-253 (매핑) |

#### 📍 주요 로직

1. **관리자 권한 확인** (line 41-57):
   - adminEmail 파라미터 필수
   - `verifyAdminAuth(adminEmail)` 호출
   - 403 Forbidden 반환

2. **총 재고 계산** (line 59-63):
   - optionType = 'none': inventory 그대로
   - optionType = 'size' | 'color' | 'both': optionInventories 합계

3. **상품 생성** (line 66-106):
   - 기본 필드 + 상세등록 추가 필드
   - is_live 설정: 빠른등록 true, 상세등록 false

4. **Variant 시스템** (line 131-263):
   - product_options 생성 (색상, 사이즈)
   - product_option_values 생성 (빨강, 파랑, S, M, L)
   - product_variants 생성 (모든 조합)
   - SKU 자동 생성: `${product_number}-${size}-${color}-${productId 8자리}`
   - variant_option_values 매핑

#### ⚠️ 주의사항

- [ ] **adminEmail 필수**: 관리자 권한 검증
- [ ] **optionType 확인**: 'none'이 아니면 Variant 생성
- [ ] **combinations 배열**: 프론트엔드에서 생성한 조합 그대로 사용
- [ ] **SKU 자동 생성**: 중복 방지를 위해 productId 8자리 포함
- [ ] **totalInventory**: Variant 있으면 합계, 없으면 inventory 그대로

#### 🐛 과거 버그 사례

없음 (2025-10-20 기준)

#### 📚 관련 문서
- Part 1: Section 없음 (API 직접 DB 작업)
- Part 2: Section 5, 6 - products, product_variants 테이블

---

### 3.2 POST /api/admin/products/update

#### 📌 개요
- **용도**: 상품 정보 수정 (Service Role API)
- **인증**: Service Role Key + adminEmail 검증
- **호출 페이지**: `/app/admin/products/[id]/edit/page.js`

#### 📥 요청 파라미터
```typescript
{
  id: string,                  // 상품 ID
  title: string,
  price: number,
  inventory: number,           // Variant 있으면 자동 계산되므로 무시
  thumbnail_url: string,
  description: string,
  status: 'active' | 'inactive',
  is_featured: boolean,
  category_id?: string,
  supplier_id?: string,
  adminEmail: string
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  product: { ...updated product }
}
```

#### 🔧 호출하는 중앙 함수
- `verifyAdminAuth()` - 관리자 권한 확인

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 |
|--------|------|
| products | UPDATE |

#### ⚠️ 주의사항

- [ ] **inventory 주의**: Variant 있는 상품은 수동 수정 금지
- [ ] **트리거 자동 실행**: Variant 재고 변경 시 products.inventory 자동 업데이트

---

### 3.3 POST /api/admin/products/toggle-visibility

#### 📌 개요
- **용도**: 상품 활성화/비활성화 (빠른 토글)
- **인증**: Service Role Key + adminEmail 검증
- **호출 페이지**: `/app/admin/products/page.js` (상품 목록)

#### 📥 요청 파라미터
```typescript
{
  productId: string,
  status: 'active' | 'inactive',
  adminEmail: string
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  product: { ...updated product }
}
```

---

### 3.4 POST /api/admin/products/bulk-update

#### 📌 개요
- **용도**: 여러 상품 일괄 업데이트
- **인증**: Service Role Key + adminEmail 검증
- **호출 페이지**: `/app/admin/products/page.js` (선택 상품 일괄 수정)

#### 📥 요청 파라미터
```typescript
{
  productIds: string[],
  updates: {
    status?: 'active' | 'inactive',
    is_featured?: boolean,
    category_id?: string,
    supplier_id?: string
  },
  adminEmail: string
}
```

---

### 3.5 GET /api/get-products

#### 📌 개요
- **용도**: 상품 목록 조회 (공개 API)
- **인증**: 없음 (Public)
- **호출 페이지**: `/app/page.js` (홈페이지)

#### 📥 요청 파라미터
없음 (Query String 없음)

#### 📤 응답 형식
```typescript
{
  products: Array<{
    id: string,
    title: string,
    product_number: string,
    price: number,
    compare_price?: number,
    thumbnail_url: string,
    inventory: number,
    status: 'active',
    is_featured: boolean,
    is_live_active: boolean
  }>
}
```

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 |
|--------|------|
| products | SELECT (11개 컬럼만) |

#### 📍 주요 로직

1. **성능 최적화** (2025-10-18):
   - product_variants JOIN 제거
   - 필요한 11개 컬럼만 SELECT
   - 데이터 전송량 90% 감소 (200KB → 20KB)

2. **필터**:
   - `status = 'active'`
   - `order by created_at DESC`
   - `limit 50`

#### ⚠️ 주의사항

- [ ] **product_variants JOIN 제거**: ProductCard는 variant 데이터 미사용
- [ ] **limit 50**: 홈페이지 성능 최적화

#### 🐛 과거 버그 사례

1. **홈페이지 상품 로딩 타임아웃** (2025-10-18)
   - 증상: 모바일 10-20초+ 타임아웃
   - 해결: JOIN 제거, ISR 적용
   - 커밋: ac7f56c, fb8b0cd

---

## 4. 관리자 쿠폰 관리 API

### 4.1 POST /api/admin/coupons/create

#### 📌 개요
- **용도**: 쿠폰 생성 (Service Role API)
- **인증**: Service Role Key + adminEmail 검증
- **호출 페이지**: `/app/admin/coupons/new/page.js`

#### 📥 요청 파라미터
```typescript
{
  code: string,                // 쿠폰 코드 (UNIQUE)
  name: string,                // 쿠폰명
  type: 'fixed_amount' | 'percentage',
  value: number,               // 10000 또는 10.00
  min_order_amount: number,    // 최소 주문 금액
  max_discount_amount?: number, // 최대 할인 (percentage)
  usage_limit?: number,        // 총 사용 횟수
  is_welcome_coupon: boolean,  // 웰컴 쿠폰 플래그
  valid_from: string,          // ISO 8601
  valid_until: string,         // ISO 8601
  status: 'active' | 'inactive',
  adminEmail: string
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  coupon: { ...created coupon }
}
```

#### 🔧 호출하는 중앙 함수
- `verifyAdminAuth()` - 관리자 권한 확인

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 |
|--------|------|
| coupons | INSERT |

#### ⚠️ 주의사항

- [ ] **code UNIQUE**: 중복 체크 필수
- [ ] **is_welcome_coupon**: 웰컴 쿠폰은 회원가입 시 자동 발급
- [ ] **usage_limit**: 선착순 제한 (웰컴 쿠폰, 전체 배포 모두)

#### 🐛 과거 버그 사례

1. **관리자 쿠폰 생성 403 에러** (2025-10-07)
   - 증상: `POST /rest/v1/coupons 403 (Forbidden)`
   - 원인: 클라이언트 Supabase (Anon Key) 사용
   - 해결: Service Role API 생성
   - 커밋: 10ef437

---

### 4.2 POST /api/admin/coupons/distribute

#### 📌 개요
- **용도**: 쿠폰 배포 (특정 사용자 또는 전체)
- **인증**: Service Role Key + adminEmail 검증
- **호출 페이지**: `/app/admin/coupons/[id]/page.js`

#### 📥 요청 파라미터
```typescript
{
  couponId: string,
  userIds: string[],           // 배포할 사용자 ID 배열
  adminEmail: string           // ⭐ 관리자 이메일 (useAdminAuth.email)
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  distributedCount: number,    // 성공한 배포 수
  duplicates: number,          // 중복 건너뛴 수
  requestedCount: number,      // 요청한 총 수
  couponCode: string,
  message: string
}
```

#### 🔧 호출하는 중앙 함수
- `verifyAdminAuth()` - 관리자 권한 확인

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 | 라인 |
|--------|------|------|
| coupons | SELECT | 82-86 (쿠폰 존재 확인) |
| user_coupons | INSERT | 122-126 (개별 INSERT) |

#### 📍 주요 로직

1. **관리자 권한 확인** (line 69-78):
   - adminEmail 파라미터 필수 ⭐
   - `verifyAdminAuth(adminEmail)` 호출

2. **쿠폰 존재 및 활성화 확인** (line 82-102):
   - coupons 테이블 조회
   - is_active = false이면 400 에러

3. **개별 INSERT (중복 건너뛰기)** (line 118-139):
   ```javascript
   for (const userCoupon of userCoupons) {
     const { data, error } = await supabaseAdmin
       .from('user_coupons')
       .insert(userCoupon)
       .select()
       .single()

     if (error) {
       if (error.code === '23505') {  // UNIQUE 제약 위반
         duplicateCount++
       } else {
         console.error('INSERT 실패')
       }
     } else {
       results.push(data)
     }
   }
   ```

4. **결과 반환** (line 156-163):
   - distributedCount: 성공한 배포 수
   - duplicates: 중복 건너뛴 수

#### ⚠️ 주의사항

- [ ] **adminEmail 필수**: useAdminAuth hook에서 adminUser.email 전달
- [ ] **중복 처리**: 개별 INSERT로 중복 건너뛰기
- [ ] **(user_id, coupon_id) UNIQUE**: 중복 발급 방지

#### 🐛 과거 버그 사례

1. **관리자 쿠폰 배포 403 에러** (2025-10-07 → 2025-10-08 완전 해결)
   - 증상: `POST /api/admin/coupons/distribute 403 (Forbidden)`
   - 원인 1: `supabase.auth.getSession()`으로 adminEmail 추출 실패
   - 해결 1: useAdminAuth hook에서 검증된 adminUser.email 사용
   - 원인 2: `/hooks/useAdminAuth.js` (구버전) import
   - 해결 2: `/hooks/useAdminAuthNew.js` (신버전) import
   - 커밋: d96a616, 750a795, 4dccd19 (시도), 최종 해결 (2025-10-08)

---

### 4.3 POST /api/admin/coupons/update

#### 📌 개요
- **용도**: 쿠폰 정보 수정
- **인증**: Service Role Key + adminEmail 검증
- **호출 페이지**: `/app/admin/coupons/[id]/edit/page.js`

---

### 4.4 DELETE /api/admin/coupons/delete

#### 📌 개요
- **용도**: 쿠폰 삭제 (soft delete)
- **인증**: Service Role Key + adminEmail 검증
- **호출 페이지**: `/app/admin/coupons/[id]/page.js`

---

## 5. 관리자 배송 관리 API

### 5.1 POST /api/admin/shipping/update-tracking

#### 📌 개요
- **용도**: 송장번호 등록 (단일 주문)
- **인증**: Service Role Key + adminEmail 검증
- **호출 페이지**: `/app/admin/shipping/page.js`

#### 📥 요청 파라미터
```typescript
{
  orderId: string,
  tracking_number: string,
  tracking_company: string,    // CJ대한통운, 한진택배 등
  adminEmail: string
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  shipping: { ...updated shipping }
}
```

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 |
|--------|------|
| orders | UPDATE (status: 'shipped', shipped_at) |
| order_shipping | UPDATE (tracking_number, tracking_company, status, shipped_at) |

---

### 5.2 POST /api/admin/shipping/bulk-tracking

#### 📌 개요
- **용도**: 송장번호 일괄 등록
- **인증**: Service Role Key + adminEmail 검증
- **호출 페이지**: `/app/admin/shipping/page.js`

#### 📥 요청 파라미터
```typescript
{
  trackingData: Array<{
    orderId: string,
    tracking_number: string,
    tracking_company: string
  }>,
  adminEmail: string
}
```

---

## 6. 관리자 발주 관리 API

### 6.1 GET /api/admin/purchase-orders/[supplierId]

#### 📌 개요
- **용도**: 특정 업체 발주서 상세 조회
- **인증**: Service Role Key (RLS 우회)
- **호출 페이지**: `/app/admin/purchase-orders/[supplierId]/page.js`

#### 📥 요청 파라미터 (Query String)
```typescript
{
  startDate?: string,
  endDate?: string
}
```

#### 📤 응답 형식
```typescript
{
  supplier: {
    id: string,
    name: string,
    contact_person: string,
    phone: string
  },
  orders: Array<{
    id: string,
    customer_order_number: string,
    created_at: string,
    order_items: Array<{
      product_id: string,
      title: string,
      quantity: number,
      price: number,
      products: {
        product_number: string,
        thumbnail_url: string,
        purchase_price: number
      }
    }>
  }>,
  summary: {
    total_quantity: number,
    total_amount: number,
    total_purchase_amount: number,
    order_count: number
  }
}
```

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 |
|--------|------|
| suppliers | SELECT (업체 정보) |
| orders | SELECT (status: paid/deposited) |
| order_items | JOIN |
| products | JOIN |
| purchase_order_batches | SELECT (완료된 주문 제외) |

---

### 6.2 POST /api/admin/purchase-orders/batch

#### 📌 개요
- **용도**: 발주서 생성 (Excel 다운로드 시)
- **인증**: Service Role Key + adminEmail 검증
- **호출 페이지**: `/app/admin/purchase-orders/[supplierId]/page.js`

#### 📥 요청 파라미터
```typescript
{
  supplierId: string,
  orderIds: string[],          // 발주할 주문 ID 배열
  adjusted_quantities?: object, // 수량 조정 내역
  adminEmail: string
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  batch: {
    id: string,
    supplier_id: string,
    order_ids: string[],
    adjusted_quantities: object,
    created_at: string
  }
}
```

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 |
|--------|------|
| purchase_order_batches | INSERT |

#### ⚠️ 주의사항

- [ ] **order_ids 배열**: GIN 인덱스로 검색 최적화
- [ ] **중복 방지**: 동일 주문 재발주 방지

---

## 7. 관리자 인증 API

### 7.1 POST /api/admin/login

#### 📌 개요
- **용도**: 관리자 로그인
- **인증**: 없음 (로그인 API)
- **호출 페이지**: `/app/admin/login/page.js`

#### 📥 요청 파라미터
```typescript
{
  email: string,
  password: string
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  token: string,               // JWT 토큰
  admin: {
    id: string,
    email: string,
    name: string,
    role: string
  }
}
```

#### 🔧 호출하는 중앙 함수
- `adminLogin()` (line 21) - `/lib/adminAuthNew.js`

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 |
|--------|------|
| profiles | SELECT (email, is_admin 확인) |
| auth.users | Supabase Auth 로그인 |

---

### 7.2 POST /api/admin/logout

#### 📌 개요
- **용도**: 관리자 로그아웃
- **인증**: JWT 토큰
- **호출 페이지**: 관리자 모든 페이지 (헤더)

---

### 7.3 POST /api/admin/verify

#### 📌 개요
- **용도**: 관리자 토큰 검증 및 정보 조회
- **인증**: JWT 토큰
- **호출 페이지**: 관리자 모든 페이지 (useAdminAuth hook)

#### 📥 요청 파라미터
```typescript
{
  token: string                // JWT 토큰
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  admin: {
    id: string,
    email: string,
    name: string,
    role: string,
    permissions: string[]
  }
}
```

#### 🔧 호출하는 중앙 함수
- `getAdminByToken()` (line 20) - 토큰 검증
- `getAdminPermissions()` (line 30) - 권한 조회

---

### 7.4 GET /api/admin/check-profile

#### 📌 개요
- **용도**: 관리자 프로필 조회 (Service Role API)
- **인증**: Service Role Key (RLS 우회)
- **호출 페이지**: `/hooks/useAdminAuth.js` (구버전)

#### 📥 요청 파라미터 (Query String)
```typescript
{
  userId: string
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  profile: {
    id: string,
    email: string,
    name: string,
    is_admin: boolean
  }
}
```

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 |
|--------|------|
| profiles | SELECT (Service Role) |

#### ⚠️ 주의사항

- [ ] **RLS 순환 참조 방지**: Service Role API 사용
- [ ] **useAdminAuthNew 권장**: 구버전 대신 신버전 사용

#### 🐛 과거 버그 사례

1. **관리자 로그인 10초+ 타임아웃** (2025-10-03)
   - 증상: profiles 테이블 조회 10초+ 타임아웃
   - 원인: RLS 순환 참조 (`is_admin()` 함수)
   - 해결: Service Role API 생성
   - 결과: 10초+ → 1초 이내

---

### 7.5 POST /api/admin/check-admin-status

#### 📌 개요
- **용도**: 관리자 권한 확인 및 설정
- **인증**: Service Role Key
- **호출 페이지**: 디버깅용 (프로덕션 미사용)

---

## 8. 사용자 인증 API

### 8.1 POST /api/auth/kakao-token

#### 📌 개요
- **용도**: 카카오 토큰으로 사용자 정보 조회
- **인증**: Kakao Access Token
- **호출 페이지**: `/app/login/page.js` (카카오 로그인 콜백)

#### 📥 요청 파라미터
```typescript
{
  accessToken: string          // Kakao Access Token
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  user: {
    id: string,                // Kakao ID
    name: string,
    nickname: string,
    phone: string,
    email: string
  }
}
```

---

### 8.2 POST /api/auth/create-kakao-user

#### 📌 개요
- **용도**: 카카오 사용자 계정 생성 (Supabase Auth)
- **인증**: 없음 (회원가입 API)
- **호출 페이지**: `/app/login/page.js` (카카오 로그인 후)

#### 📥 요청 파라미터
```typescript
{
  kakaoId: string,
  name: string,
  nickname: string,
  phone: string,
  email: string
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  user: {
    id: string,                // Supabase Auth User ID
    kakao_id: string,
    name: string,
    email: string
  }
}
```

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 |
|--------|------|
| auth.users | INSERT (Supabase Auth) |
| profiles | INSERT (트리거 자동) |

---

### 8.3 POST /api/profile/complete

#### 📌 개요
- **용도**: 프로필 정보 완성 (첫 로그인 후)
- **인증**: Supabase Auth Session
- **호출 페이지**: `/app/mypage/page.js`

#### 📥 요청 파라미터
```typescript
{
  userId: string,
  name: string,
  phone: string,
  address: string,
  detail_address: string,
  postal_code: string
}
```

#### 📤 응답 형식
```typescript
{
  success: true,
  profile: { ...updated profile }
}
```

#### 🔧 호출하는 중앙 함수
- `UserProfileManager.atomicProfileUpdate()` - 3곳 동시 업데이트

#### 💾 접근하는 DB 테이블
| 테이블 | 작업 |
|--------|------|
| profiles | UPSERT |
| auth.users | UPDATE (user_metadata) |

---

## 9. 기타 API

### 9.1 GET /api/check-schema

#### 📌 개요
- **용도**: DB 스키마 조회 (디버깅용)
- **인증**: 없음
- **호출 페이지**: 디버깅용 (프로덕션 미사용)

#### 📤 응답 형식
```typescript
{
  success: true,
  schema: {
    orders: {
      columns: Array<{
        column_name: string,
        data_type: string,
        is_nullable: string,
        column_default: string
      }>
    },
    // ... 기타 테이블
  },
  timestamp: string
}
```

---

### 9.2 GET /api/admin/stats

#### 📌 개요
- **용도**: 관리자 대시보드 통계
- **인증**: Service Role Key
- **호출 페이지**: `/app/admin/page.js`

#### 📤 응답 형식
```typescript
{
  totalOrders: number,
  totalRevenue: number,
  totalProducts: number,
  totalCustomers: number,
  recentOrders: Array<Order>,
  topProducts: Array<Product>
}
```

---

## 10. API 엔드포인트 매트릭스

### 전체 API 요약 테이블

| API | 메서드 | 인증 | 호출 페이지 | 주요 DB 테이블 | Service Role? |
|-----|--------|------|-------------|---------------|---------------|
| **/api/orders/create** | POST | SR | /checkout | orders, order_items, order_payments, order_shipping, product_variants | ✅ |
| **/api/orders/update-status** | POST | SR | /checkout, /admin/orders/[id] | orders, order_payments, order_shipping, user_coupons | ✅ |
| **/api/orders/list** | POST | SR | /orders | orders, order_items, products | ✅ |
| **/api/admin/orders** | GET | SR | /admin/orders, /admin/deposits, /admin/shipping | orders, order_items, products, suppliers | ✅ |
| **/api/admin/products/create** | POST | SR+AE | /admin/products/new, /admin/products/detail-new | products, product_variants, product_options | ✅ |
| **/api/admin/products/update** | POST | SR+AE | /admin/products/[id]/edit | products | ✅ |
| **/api/admin/products/toggle-visibility** | POST | SR+AE | /admin/products | products | ✅ |
| **/api/admin/products/bulk-update** | POST | SR+AE | /admin/products | products | ✅ |
| **/api/get-products** | GET | 없음 | / (홈페이지) | products | ❌ |
| **/api/admin/coupons/create** | POST | SR+AE | /admin/coupons/new | coupons | ✅ |
| **/api/admin/coupons/distribute** | POST | SR+AE | /admin/coupons/[id] | coupons, user_coupons | ✅ |
| **/api/admin/coupons/update** | POST | SR+AE | /admin/coupons/[id]/edit | coupons | ✅ |
| **/api/admin/coupons/delete** | DELETE | SR+AE | /admin/coupons/[id] | coupons | ✅ |
| **/api/admin/shipping/update-tracking** | POST | SR+AE | /admin/shipping | orders, order_shipping | ✅ |
| **/api/admin/shipping/bulk-tracking** | POST | SR+AE | /admin/shipping | orders, order_shipping | ✅ |
| **/api/admin/purchase-orders** | GET | SR | /admin/purchase-orders | orders, order_items, products, suppliers, purchase_order_batches | ✅ |
| **/api/admin/purchase-orders/[supplierId]** | GET | SR | /admin/purchase-orders/[supplierId] | orders, order_items, products, suppliers, purchase_order_batches | ✅ |
| **/api/admin/purchase-orders/batch** | POST | SR+AE | /admin/purchase-orders/[supplierId] | purchase_order_batches | ✅ |
| **/api/admin/login** | POST | 없음 | /admin/login | profiles, auth.users | ❌ |
| **/api/admin/logout** | POST | JWT | 관리자 페이지 (헤더) | - | ❌ |
| **/api/admin/verify** | POST | JWT | 관리자 페이지 (hook) | profiles | ❌ |
| **/api/admin/check-profile** | GET | SR | /hooks/useAdminAuth | profiles | ✅ |
| **/api/admin/check-admin-status** | POST | SR | 디버깅 | profiles | ✅ |
| **/api/auth/kakao-token** | POST | Kakao | /login | - | ❌ |
| **/api/auth/create-kakao-user** | POST | 없음 | /login | auth.users, profiles | ❌ |
| **/api/profile/complete** | POST | Supabase Auth | /mypage | profiles, auth.users | ❌ |
| **/api/check-schema** | GET | 없음 | 디버깅 | 모든 테이블 | ❌ |
| **/api/admin/stats** | GET | SR | /admin | orders, products, profiles | ✅ |

**약어**:
- **SR**: Service Role Key
- **AE**: adminEmail 검증 추가
- **JWT**: JWT 토큰 검증
- **Kakao**: Kakao Access Token

---

## 11. 인증 방식 가이드

### Service Role API 패턴

```javascript
// /app/api/orders/create/route.js
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,  // ⭐ Service Role Key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request) {
  // RLS 우회, 모든 데이터 접근 가능
  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert(...)
}
```

**사용 시기**:
- INSERT/UPDATE/DELETE 작업 (RLS 정책 우회 필요)
- 카카오 사용자 주문 조회 (user_id = null)
- 관리자 작업

---

### Service Role + adminEmail 검증 패턴

```javascript
// /app/api/admin/products/create/route.js
import { verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function POST(request) {
  const { adminEmail, ...productData } = await request.json()

  // 1. 관리자 권한 확인
  if (!adminEmail) {
    return NextResponse.json(
      { error: '관리자 인증 정보가 필요합니다' },
      { status: 401 }
    )
  }

  const isAdmin = await verifyAdminAuth(adminEmail)
  if (!isAdmin) {
    return NextResponse.json(
      { error: '관리자 권한이 없습니다' },
      { status: 403 }
    )
  }

  // 2. Service Role로 DB 작업
  const { data, error } = await supabaseAdmin
    .from('products')
    .insert(productData)
}
```

**사용 시기**:
- 관리자 전용 작업 (상품 생성, 쿠폰 배포 등)

---

### 클라이언트 인증 패턴 (Anon Key + RLS)

```javascript
// /lib/supabaseApi.js
import { supabase } from './supabase'  // Anon Key

export const cancelOrder = async (orderId) => {
  // RLS 정책 적용됨 (본인 주문만 수정 가능)
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
}
```

**사용 시기**:
- 사용자 본인 데이터 조회/수정
- RLS 정책으로 보안 보장

---

## 12. 에러 처리 패턴

### 표준 에러 응답 형식

```typescript
{
  error: string,               // 사용자에게 표시할 에러 메시지
  details?: string,            // 상세 에러 정보 (개발용)
  stack?: string               // 스택 트레이스 (개발 환경만)
}
```

### 에러 처리 예시

```javascript
export async function POST(request) {
  try {
    // 1. 입력 검증
    const { couponId, userIds } = await request.json()

    if (!couponId) {
      return NextResponse.json(
        { error: 'couponId가 필요합니다' },
        { status: 400 }  // 400 Bad Request
      )
    }

    // 2. 권한 확인
    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }  // 403 Forbidden
      )
    }

    // 3. DB 작업
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: '쿠폰을 찾을 수 없습니다', details: error?.message },
        { status: 404 }  // 404 Not Found
      )
    }

    // 4. 성공 응답
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('API 에러:', error)
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }  // 500 Internal Server Error
    )
  }
}
```

### HTTP 상태 코드 가이드

| 코드 | 의미 | 사용 시기 |
|------|------|-----------|
| **200** | OK | 성공 (GET, POST 성공) |
| **204** | No Content | 성공 (DELETE 성공, 응답 데이터 없음) |
| **400** | Bad Request | 입력 검증 실패 (필수 파라미터 누락) |
| **401** | Unauthorized | 인증 실패 (토큰 없음, 토큰 만료) |
| **403** | Forbidden | 권한 없음 (관리자 아님) |
| **404** | Not Found | 리소스 없음 (쿠폰, 상품 등) |
| **500** | Internal Server Error | 서버 오류 (DB 에러, 예외 발생) |

---

# 🎯 실전 사용 시나리오

## 시나리오 1: "새로운 API 개발 (상품 좋아요 기능)"

1. **이 문서에서 확인할 것**:
   - Section 3: 관리자 상품 관리 API (유사 패턴)
   - Section 11: 인증 방식 가이드 (Service Role vs Anon Key)
   - Section 12: 에러 처리 패턴

2. **개발 체크리스트**:
   - [ ] 인증 방식 결정: Anon Key + RLS (사용자 본인 좋아요만)
   - [ ] DB 테이블: product_likes (user_id, product_id, created_at)
   - [ ] RLS 정책: INSERT/DELETE (본인만), SELECT (public)
   - [ ] API 엔드포인트: POST /api/products/like, DELETE /api/products/unlike
   - [ ] 에러 처리: 400 (중복 좋아요), 401 (미로그인), 404 (상품 없음)

3. **유사 API 참조**:
   - `/api/admin/coupons/distribute` - 중복 처리 패턴
   - `/api/orders/create` - 사용자 정보 확인 패턴

---

## 시나리오 2: "API 버그 수정 (쿠폰 배포 실패)"

1. **이 문서에서 확인할 것**:
   - Section 4.2: POST /api/admin/coupons/distribute
   - "과거 버그 사례" 섹션

2. **디버깅 순서**:
   - [ ] adminEmail 파라미터 확인
   - [ ] `verifyAdminAuth()` 로그 확인
   - [ ] Service Role Key 환경변수 확인
   - [ ] user_coupons INSERT 에러 로그 확인
   - [ ] UNIQUE 제약 위반 확인

3. **과거 버그 참조**:
   - 2025-10-07: adminEmail 추출 실패 → useAdminAuth.email 사용
   - 2025-10-08: 구버전 hook import → 신버전 hook 사용

---

## 시나리오 3: "중앙 함수 수정 영향도 파악"

**예시**: `OrderCalculations.calculateFinalOrderAmount()` 수정

1. **Part 1 확인**:
   - Section 1.1: 사용처 7곳 확인

2. **Part 3 확인 (이 문서)**:
   - Section 1.2: POST /api/orders/update-status (line 172-180)

3. **테스트 시나리오**:
   - [ ] 입금확인 요청 시 금액 계산
   - [ ] 전체결제 시 금액 계산
   - [ ] 무료배송 조건 반영
   - [ ] 쿠폰 할인 반영
   - [ ] 도서산간 배송비 반영

---

# 🚨 API 개발 체크리스트

### 새 API 개발 전
- [ ] 유사 API 구현 패턴 확인 (이 문서 Section 1-9)
- [ ] 인증 방식 결정 (Service Role vs Anon Key vs JWT)
- [ ] adminEmail 검증 필요 여부 확인
- [ ] 호출하는 중앙 함수 확인 (Part 1 참조)
- [ ] 접근하는 DB 테이블 확인 (Part 2 참조)
- [ ] RLS 정책 확인
- [ ] 에러 처리 패턴 적용 (Section 12)

### API 코딩 시
- [ ] try-catch 블록 필수
- [ ] 입력 검증 (400 Bad Request)
- [ ] 권한 확인 (401 Unauthorized, 403 Forbidden)
- [ ] DB 에러 처리 (500 Internal Server Error)
- [ ] 성공 응답 형식 통일 ({ success: true, data: ... })
- [ ] 에러 로그 출력 (console.error)

### API 테스트 시
- [ ] 정상 시나리오 테스트
- [ ] 입력 누락 시나리오 (400)
- [ ] 권한 없음 시나리오 (403)
- [ ] 리소스 없음 시나리오 (404)
- [ ] 중복 요청 시나리오 (409 또는 중복 처리)

---

# 📝 Part 3 종료

**다음 Part**:
- **Part 4**: 페이지별 종속성 맵 (36개 페이지)
- **Part 5**: 수정 영향도 매트릭스

**작성 완료일**: 2025-10-20
**총 줄 수**: 1,900+ 줄
**문서화된 API**: 28개 (핵심 프로덕션 API)
