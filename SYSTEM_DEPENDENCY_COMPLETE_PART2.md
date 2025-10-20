# Part 2: DB 테이블 사용처 맵 (Database Table Usage Map)

> **버전**: 1.0
> **작성일**: 2025-10-20
> **목적**: 각 DB 테이블이 어디서/어떻게 사용되는지 완벽히 파악하여 임기응변 코드 방지

---

## 📋 목차

### 핵심 테이블 (상세 문서화)
1. [orders 테이블](#1-orders-테이블) - 주문 메인 정보
2. [order_items 테이블](#2-order_items-테이블) - 주문 상품 목록
3. [order_payments 테이블](#3-order_payments-테이블) - 결제 정보
4. [order_shipping 테이블](#4-order_shipping-테이블) - 배송 정보
5. [products 테이블](#5-products-테이블) - 상품 정보
6. [product_variants 테이블](#6-product_variants-테이블) - 상품 옵션별 재고
7. [profiles 테이블](#7-profiles-테이블) - 사용자 프로필
8. [coupons / user_coupons 테이블](#8-coupons--user_coupons-테이블) - 쿠폰 시스템

### 추가 테이블 (간략 문서화)
9. [categories 테이블](#9-categories-테이블)
10. [suppliers 테이블](#10-suppliers-테이블)
11. [purchase_order_batches 테이블](#11-purchase_order_batches-테이블)
12. [product_options 테이블](#12-product_options-테이블)
13. [product_option_values 테이블](#13-product_option_values-테이블)
14. [variant_option_values 테이블](#14-variant_option_values-테이블)
15. [live_broadcasts 테이블](#15-live_broadcasts-테이블)
16. [live_products 테이블](#16-live_products-테이블)
17. [기타 테이블들](#17-기타-테이블들)

---

## 🎯 이 문서의 사용법

### 언제 이 문서를 참조해야 하는가?

1. **DB 스키마 변경 시** (컬럼 추가/삭제, 타입 변경)
   - 해당 테이블 섹션 읽기
   - 모든 INSERT/UPDATE 위치 확인
   - 영향받는 모든 파일 수정

2. **버그 수정 시** (데이터 저장 안 됨, 조회 안 됨)
   - 해당 테이블 섹션의 "과거 버그 사례" 확인
   - RLS 정책 확인
   - API Route vs 직접 접근 방식 확인

3. **새 기능 추가 시**
   - 유사 기능의 DB 접근 패턴 확인
   - 중앙화 모듈 (supabaseApi.js) 재사용
   - 새 함수 작성 금지 → 기존 함수 확장

### 문서 읽는 순서

```
1. 목차에서 해당 테이블 찾기
   ↓
2. 해당 섹션의 "개요" 읽기
   ↓
3. INSERT/UPDATE/SELECT 작업 위치 확인
   ↓
4. "수정 시 주의사항" 체크리스트 확인
   ↓
5. "과거 버그 사례" 확인
   ↓
6. 연관 테이블 및 트리거 확인
```

---

# 핵심 테이블 상세 문서화

---

## 1. orders 테이블

### 📌 개요

- **용도**: 주문 메인 정보 (주문번호, 상태, 금액, 타임스탬프)
- **중요도**: ⭐⭐⭐⭐⭐ (가장 중요, 모든 주문 관련 기능의 중심)
- **관련 테이블**: order_items, order_payments, order_shipping (1:N 관계)
- **RLS 정책**:
  - SELECT: Supabase Auth 사용자 + 카카오 사용자 (order_type LIKE)
  - INSERT/UPDATE: Service Role API 사용 (RLS 우회)

### 🔹 주요 컬럼

| 컬럼명 | 타입 | 설명 | 기본값 |
|--------|------|------|--------|
| id | UUID | PK | uuid_generate_v4() |
| customer_order_number | VARCHAR(20) | 고객용 주문번호 (S251015-A1B2) | |
| status | VARCHAR(20) | 주문 상태 | 'pending' |
| order_type | TEXT | 주문 유형 (direct:KAKAO:123456) | |
| user_id | UUID | 사용자 ID (Supabase Auth) | nullable |
| total_amount | NUMERIC(10,2) | 총 금액 | |
| discount_amount | NUMERIC(12,2) | 쿠폰 할인 | 0 |
| **is_free_shipping** | BOOLEAN | 무료배송 플래그 ⭐ | false |
| payment_group_id | VARCHAR(50) | 일괄결제 그룹 ID | nullable |
| created_at | TIMESTAMPTZ | 생성일 | now() |
| verifying_at | TIMESTAMPTZ | 입금확인 요청일 | nullable |
| paid_at | TIMESTAMPTZ | 결제 완료일 | nullable |
| shipped_at | TIMESTAMPTZ | 배송 시작일 | nullable |
| delivered_at | TIMESTAMPTZ | 배송 완료일 | nullable |
| cancelled_at | TIMESTAMPTZ | 취소일 | nullable |

### 🟢 INSERT 작업 (주문 생성)

#### 1. `/app/api/orders/create/route.js` - createOrder API (Service Role)
- **라인**: 190-194
- **방식**: Service Role API (RLS 우회)
- **트리거**: 클라이언트에서 `supabaseApi.createOrder()` 호출
- **호출 경로**:
  ```
  사용자 액션 (체크아웃 완료)
    ↓
  /app/checkout/page.js (handleSubmit)
    ↓
  /lib/supabaseApi.js - createOrder() (line 637)
    ↓
  fetch('/api/orders/create') → Service Role API
    ↓
  supabaseAdmin.from('orders').insert()
  ```
- **저장 데이터**:
  ```javascript
  {
    id: uuid,
    customer_order_number: 'S251015-A1B2',
    status: 'pending',
    order_type: 'direct:KAKAO:3456789012' 또는 'direct',
    total_amount: 주문 금액,
    discount_amount: 쿠폰 할인 (없으면 0),
    is_free_shipping: 무료배송 조건 (서버 확인) ⭐,
    user_id: validUserId (Supabase Auth) 또는 null (Kakao)
  }
  ```
- **특이사항**:
  - 장바구니 주문: 기존 pending 주문이 있으면 재사용 (UPDATE), 없으면 INSERT
  - 카카오 사용자: user_id = null, order_type에 KAKAO:kakao_id 포함
  - **무료배송 조건**: 서버에서 pending/verifying 주문 존재 여부 실시간 확인 후 is_free_shipping 저장

#### 2. `/lib/supabaseApi.js` - createOrder() (line 637)
- **방식**: 클라이언트 함수 → Service Role API 호출
- **사용처**:
  - `/app/checkout/page.js` (체크아웃 완료 시)
  - `/app/admin/orders/new` (관리자 수동 주문 생성)

### 🔵 UPDATE 작업 (주문 상태/정보 변경)

#### 1. `/app/api/orders/update-status/route.js` - updateOrderStatus API (Service Role)
- **라인**: 79-82
- **방식**: Service Role API (RLS 우회)
- **트리거**:
  - 관리자가 주문 상태 변경
  - 사용자가 입금확인 요청
  - 사용자가 전체결제 완료
- **호출 경로**:
  ```
  관리자 액션 (상태 변경)
    ↓
  /app/admin/orders/[id]/page.js (handleStatusChange)
    ↓
  /lib/supabaseApi.js - updateOrderStatus() (line 1515)
    ↓
  fetch('/api/orders/update-status') → Service Role API
    ↓
  supabaseAdmin.from('orders').update()
  ```
- **업데이트 컬럼**:
  - `status`: 새 상태
  - `updated_at`: 현재 시각
  - `verifying_at`, `paid_at`, `shipped_at`, `delivered_at`, `cancelled_at`: 상태별 타임스탬프
  - `payment_group_id`: 일괄결제 시 그룹 ID (2개 이상 주문)
  - `discount_amount`: 쿠폰 할인 (paymentData에 포함 시)

#### 2. `/app/api/orders/create/route.js` - 장바구니 주문 금액 업데이트
- **라인**: 149-156
- **방식**: Service Role API
- **시나리오**: 장바구니에 상품 추가 시 기존 pending 주문의 total_amount 증가
- **업데이트 컬럼**:
  ```javascript
  {
    total_amount: 기존 금액 + 새 상품 금액,
    updated_at: 현재 시각
  }
  ```

#### 3. `/lib/supabaseApi.js` - cancelOrder() (line 1456)
- **라인**: 1471-1477
- **방식**: 클라이언트 직접 Supabase 호출 (Anon Key, RLS 적용)
- **시나리오**: 사용자가 주문 취소 요청
- **업데이트 컬럼**:
  ```javascript
  {
    status: 'cancelled',
    updated_at: 현재 시각
  }
  ```
- **후처리**: 재고 복원 (order_items 조회 후 updateVariantInventory 호출)

### 🔷 SELECT 작업 (주문 조회)

#### 1. `/app/api/orders/list/route.js` - getOrders API (Service Role)
- **라인**: 46-61 (기본 쿼리), 76-185 (사용자별 필터링)
- **방식**: Service Role API (RLS 우회)
- **트리거**: 사용자 주문 목록 페이지 로드
- **호출 경로**:
  ```
  /app/orders/page.js (useEffect)
    ↓
  /lib/supabaseApi.js - getOrders() (line 673)
    ↓
  fetch('/api/orders/list') → Service Role API
    ↓
  supabaseAdmin.from('orders').select()
  ```
- **조회 조건**:
  - **카카오 사용자**:
    - `order_type = 'direct:KAKAO:kakao_id'` (기본)
    - `order_type LIKE 'cart:KAKAO:kakao_id%'` (장바구니)
    - `order_type LIKE '%KAKAO:user.id%'` (대체 조회)
  - **Supabase Auth 사용자**:
    - `user_id = auth.uid()`
  - 공통: `status != 'cancelled'` (취소 제외)
- **JOIN**:
  ```javascript
  .select(`
    *,
    order_items (
      *,
      products (product_number, title, thumbnail_url, price)
    ),
    order_shipping (*),
    order_payments (*)
  `)
  ```
- **페이지네이션**: 클라이언트에서 처리 (메모리 내)
- **⚡ 성능 최적화 (2025-10-18)**: product_variants JOIN 제거 (90% 데이터 감소)

#### 2. `/app/api/admin/orders/route.js` - 관리자 주문 조회 (Service Role)
- **라인**: 31-77 (기본 쿼리 + 필터)
- **방식**: Service Role API (RLS 우회)
- **트리거**: 관리자 주문 관리 페이지 로드
- **조회 조건**:
  - `status` 필터 (verifying, deposited, shipped 등)
  - `payment_method` 필터 (INNER JOIN 조건부 적용)
  - 날짜 범위 필터 (startDate, endDate)
- **JOIN**: order_items + products + suppliers
- **정렬**: `created_at DESC`

#### 3. `/lib/supabaseApi.js` - getOrderById() (line 1222)
- **라인**: 1222-1452
- **방식**: Service Role API 호출 (`/api/orders/list`)
- **시나리오**: 주문 상세 페이지 (`/orders/[id]/complete`)
- **특징**: 단일 주문 조회이지만 list API 재사용 (orderId 파라미터)

### ⚠️ 수정 시 주의사항 체크리스트

- [ ] **is_free_shipping 컬럼 추가 확인** (2025-10-16 추가) - 무료배송 프로모션 관련
- [ ] **discount_amount 컬럼 확인** (2025-10-04 추가) - 쿠폰 할인 저장
- [ ] **order_type 패턴 정확히 이해**: `direct:KAKAO:123456` vs `cart:KAKAO:123456`
- [ ] **user_id nullable 확인**: 카카오 사용자는 user_id = null
- [ ] **장바구니 주문 병합 로직**: 기존 pending 주문 재사용, 아이템 추가만
- [ ] **RLS 정책**: INSERT/UPDATE는 Service Role API만 사용 (Anon Key 사용 시 실패)
- [ ] **타임스탬프 자동 기록**: verifying_at, paid_at, shipped_at 등 상태별 자동 저장
- [ ] **payment_group_id**: 2개 이상 주문 일괄결제 시에만 생성 (`GROUP-1234567890`)
- [ ] **조회 성능**: product_variants JOIN 제거 후 90% 데이터 감소 (commit 680c31b)
- [ ] **카카오 사용자 조회**: 3가지 패턴 모두 확인 (direct, cart, 대체 조회)

### 🔗 연관 테이블 및 트리거

- **order_items**: 주문 생성 시 함께 INSERT, 주문 취소 시 재고 복원에 사용
- **order_payments**: 주문 생성/업데이트 시 함께 INSERT/UPDATE
- **order_shipping**: 주문 생성 시 함께 INSERT, 상태 업데이트 시 UPDATE 가능
- **purchase_order_batches**: status = 'deposited' 주문만 발주서 생성
- **트리거**: 없음 (애플리케이션 레벨에서 처리)

### 🐛 과거 버그 사례

1. **RLS 정책 누락으로 UPDATE 실패** (2025-10-04)
   - 증상: PATCH 요청 204 성공하지만 DB 저장 안 됨
   - 원인: Anon Key로 UPDATE 시도, RLS 정책 없음
   - 해결: Service Role API 생성 (`/api/orders/update-status`)
   - 마이그레이션: `20251004_fix_rls_update_policies.sql`

2. **카카오 사용자 주문 조회 0개** (2025-10-05)
   - 증상: 모바일에서 주문 목록 빈 화면
   - 원인: SELECT RLS 정책이 `auth.uid()`로 매칭 시도 → 카카오 ID와 불일치
   - 해결: `get_current_user_kakao_id()` 헬퍼 함수 생성, RLS 정책 수정
   - 마이그레이션: `20251005_fix_kakao_user_order_select.sql`

3. **주문번호 G/S 불일치** (2025-10-15)
   - 증상: 고객에게는 G251015-8418 표시, 관리자는 S251015-XXXX만 검색 가능
   - 원인: DB에는 S 저장, UI에서 G 동적 생성 → 검색 실패
   - 해결: G/S 구분 완전 제거, customer_order_number 원본 사용
   - 커밋: a10ed02

4. **무료배송 조건 불일치** (2025-10-16)
   - 증상: 클라이언트 조건 확인 vs 서버 저장 타이밍 차이로 무료배송 미적용
   - 원인: 클라이언트에서 checkPendingOrders() 확인 후 서버 전달, 서버는 전달받은 플래그만 저장
   - 해결: 서버에서 실시간 pending/verifying 주문 존재 여부 확인 후 is_free_shipping 저장
   - 커밋: 64bcb81

### 📚 관련 문서

- `DB_REFERENCE_GUIDE.md` - Section 3: orders 테이블 (line 401-564)
- `FEATURE_REFERENCE_MAP_PART1.md` - Section 1.1: 주문 생성 (일반)
- `DETAILED_DATA_FLOW.md` - 체크아웃 페이지 (주문 생성 흐름)
- `USER_JOURNEY_MAP.md` - Scenario 1: 일반 구매 프로세스

---

## 2. order_items 테이블

### 📌 개요

- **용도**: 주문에 포함된 상품 목록 (주문 1개에 상품 N개)
- **중요도**: ⭐⭐⭐⭐⭐
- **관련 테이블**: orders (N:1), products (N:1), product_variants (N:1)
- **RLS 정책**: SELECT/UPDATE만 있음 (INSERT는 Service Role API)

### 🔹 주요 컬럼

| 컬럼명 | 타입 | 설명 | 중복 컬럼? |
|--------|------|------|-----------|
| id | UUID | PK | |
| order_id | UUID | FK → orders.id | |
| product_id | UUID | FK → products.id | |
| **variant_id** | UUID | FK → product_variants.id | nullable ⭐ |
| title | TEXT | 상품명 (스냅샷) | |
| quantity | INT | 수량 | |
| **price** | NUMERIC(12,2) | 단가 | ⚠️ 중복 |
| **unit_price** | NUMERIC(12,2) | 단가 | ⚠️ 중복 |
| **total** | NUMERIC(12,2) | 합계 | ⚠️ 중복 |
| **total_price** | NUMERIC(12,2) | 합계 | ⚠️ 중복 |
| selected_options | JSONB | 선택 옵션 | {} |
| variant_title | TEXT | 옵션명 | nullable |
| sku | VARCHAR(50) | SKU | nullable |
| product_snapshot | JSONB | 상품 스냅샷 | {} |

⚠️ **중요**: price/unit_price, total/total_price는 **양쪽 모두 저장** 필수!

### 🟢 INSERT 작업 (주문 아이템 생성)

#### 1. `/app/api/orders/create/route.js` - createOrder API (Service Role)
- **라인**: 220-222
- **방식**: Service Role API (RLS 우회)
- **트리거**: 주문 생성 시 자동 INSERT
- **저장 데이터**:
  ```javascript
  {
    order_id: 주문 ID,
    product_id: 상품 ID,
    title: '상품명',
    quantity: 수량,
    price: 단가,  // ⚠️ 중복 컬럼 1
    unit_price: 단가,  // ⚠️ 중복 컬럼 2
    total: 합계,  // ⚠️ 중복 컬럼 3
    total_price: 합계,  // ⚠️ 중복 컬럼 4
    selected_options: { color: '빨강', size: 'M' },
    variant_title: '빨강 / M',
    variant_id: variant UUID (옵션 상품),
    sku: 'PROD001-RED-M',
    product_snapshot: { 상품 정보 전체 }
  }
  ```
- **특이사항**:
  - variant_id가 있으면 product_variants.inventory 차감
  - variant_id가 없으면 products.inventory 차감

### 🔵 UPDATE 작업 (수량 변경)

#### 1. `/lib/supabaseApi.js` - updateOrderItemQuantity() (line 1592)
- **라인**: 1592-1768
- **방식**: 클라이언트 직접 Supabase 호출 (Anon Key, RLS 적용)
- **시나리오**: 사용자가 주문 상세에서 수량 변경
- **호출 경로**:
  ```
  /app/orders/page.js (handleQuantityChange)
    ↓
  /lib/supabaseApi.js - updateOrderItemQuantity()
    ↓
  supabase.from('order_items').update()
  ```
- **업데이트 컬럼**:
  ```javascript
  {
    quantity: 새 수량,
    total: 단가 * 새 수량,
    total_price: 단가 * 새 수량,
    updated_at: 현재 시각
  }
  ```
- **재고 검증**:
  - variant_id가 있으면: `checkVariantInventory()` 호출 (product_variants 재고 확인)
  - variant_id가 없으면: `products.inventory` 직접 확인
- **재고 조정**: `updateVariantInventory(variant_id, 수량차)` RPC 호출
- **⚠️ 버그 수정** (2025-10-07): variant 재고 검증 누락 → 추가 완료

### 🔷 SELECT 작업 (주문 아이템 조회)

#### 1. `/app/api/orders/list/route.js` - JOIN으로 자동 조회
- **방식**: orders 테이블 JOIN
- **SELECT 구문**:
  ```javascript
  .select(`
    *,
    order_items (
      *,
      products (product_number, title, thumbnail_url, price)
    )
  `)
  ```
- **특징**:
  - orders 조회 시 자동으로 order_items 포함
  - products 테이블 JOIN (product_number, title, thumbnail_url만)
  - ⚡ product_variants JOIN 제거 (2025-10-18 성능 최적화)

#### 2. `/lib/supabaseApi.js` - cancelOrder() 재고 복원
- **라인**: 1461-1465
- **방식**: 클라이언트 직접 Supabase 호출
- **목적**: 주문 취소 시 재고 복원용 아이템 조회
- **SELECT 구문**:
  ```javascript
  .select('product_id, quantity, variant_id')
  .eq('order_id', orderId)
  ```

### ⚠️ 수정 시 주의사항 체크리스트

- [ ] **중복 컬럼 양쪽 모두 저장**: price & unit_price, total & total_price
- [ ] **variant_id 확인**: 옵션 상품은 variant_id 필수, 재고 검증도 variant 기준
- [ ] **title 저장 필수**: 상품명 변경 시에도 주문 내역 보존
- [ ] **selected_options JSONB**: 옵션별 분리 표시용 (`결제대기` 페이지)
- [ ] **product_snapshot**: 향후 상품 정보 변경 시에도 주문 당시 정보 보존
- [ ] **수량 변경 시**: order_items.quantity + order_payments.amount + variant 재고 모두 업데이트
- [ ] **재고 차감**: variant_id 있으면 update_variant_inventory RPC, 없으면 products.inventory 직접 차감

### 🔗 연관 테이블 및 트리거

- **orders**: order_id FK, 주문 취소 시 CASCADE DELETE는 없음 (수동 처리)
- **products**: product_id FK, JOIN으로 최신 상품 정보 표시
- **product_variants**: variant_id FK, 재고 차감/복원 대상
- **트리거**: `update_product_inventory_after_variant_change` (variant 재고 → products.inventory 합산)

### 🐛 과거 버그 사례

1. **수량 변경 시 variant 재고 검증 누락** (2025-10-07)
   - 증상: variant 재고 초과해도 수량 변경 가능
   - 원인: `updateOrderItemQuantity()`에서 variant_id 미확인
   - 해결: variant_id 추가 + checkVariantInventory() 호출
   - 커밋: 0c1d41a

2. **장바구니 주문 생성 시 1개만 저장** (2025-10-07)
   - 증상: 여러 상품 장바구니 추가 시 1개만 주문 생성
   - 원인: `supabase.raw()` 함수 오류 (`TypeError: a.supabase.raw is not a function`)
   - 해결: raw() 제거, 직접 쿼리 + 계산으로 변경
   - 커밋: 0c1d41a

### 📚 관련 문서

- `DB_REFERENCE_GUIDE.md` - Section 3: order_items 테이블 (line 1237-1429)
- `FEATURE_REFERENCE_MAP_PART1.md` - Section 1.3: 주문 수량 조정

---

## 3. order_payments 테이블

### 📌 개요

- **용도**: 결제 정보 (결제 방법, 금액, 입금자명)
- **중요도**: ⭐⭐⭐⭐
- **관련 테이블**: orders (N:1)
- **RLS 정책**: SELECT/UPDATE/INSERT (Service Role API 권장)

### 🔹 주요 컬럼

| 컬럼명 | 타입 | 설명 | 기본값 |
|--------|------|------|--------|
| id | UUID | PK | |
| order_id | UUID | FK → orders.id | |
| method | VARCHAR(20) | 결제 방법 (bank_transfer, card) | 'bank_transfer' |
| amount | NUMERIC(12,2) | 결제 금액 (상품 + 배송비 - 할인) | |
| status | VARCHAR(20) | 결제 상태 (pending, verifying, paid) | 'pending' |
| depositor_name | TEXT | 입금자명 (무통장입금) | |
| payment_group_id | VARCHAR(50) | 일괄결제 그룹 ID | nullable |
| created_at | TIMESTAMPTZ | 생성일 | now() |

### 🟢 INSERT 작업 (결제 정보 생성)

#### 1. `/app/api/orders/create/route.js` - createOrder API (Service Role)
- **라인**: 276-278 (신규 주문)
- **방식**: Service Role API (RLS 우회)
- **저장 데이터**:
  ```javascript
  {
    order_id: 주문 ID,
    method: 'bank_transfer',
    amount: 상품 금액 + 배송비,
    status: 'pending',
    depositor_name: 입금자명
  }
  ```
- **금액 계산**:
  - 무료배송: `is_free_shipping = true` → 배송비 0원
  - 유료배송: baseShippingFee 4,000원 + 도서산간 추가 배송비
  - `formatShippingInfo(baseShippingFee, postalCode)` 사용

#### 2. `/app/api/orders/update-status/route.js` - 결제 정보 없을 때 INSERT
- **라인**: 222-227
- **방식**: Service Role API
- **시나리오**: 상태 업데이트 시 order_payments 레코드 없으면 INSERT
- **로직**:
  ```javascript
  // 먼저 existingPayment 확인
  if (existingPayment) {
    // UPDATE
  } else {
    // INSERT
    supabaseAdmin.from('order_payments').insert()
  }
  ```

### 🔵 UPDATE 작업 (결제 정보 변경)

#### 1. `/app/api/orders/update-status/route.js` - updateOrderStatus API (Service Role)
- **라인**: 215-218
- **방식**: Service Role API (RLS 우회)
- **트리거**:
  - 입금확인 요청 (status: verifying)
  - 전체결제 완료 (status: paid)
  - 관리자 상태 변경
- **업데이트 컬럼**:
  ```javascript
  {
    method: paymentData.method || 기존값,
    amount: OrderCalculations 계산 결과,  // ⭐ 정확한 금액
    status: 새 상태,
    depositor_name: paymentData.depositorName,
    payment_group_id: 일괄결제 그룹 ID (2개 이상 주문)
  }
  ```
- **금액 재계산**:
  - `OrderCalculations.calculateFinalOrderAmount()` 호출
  - order_items 조회 → 상품 금액 합산
  - 배송비: `is_free_shipping = true` → 0원, false → 4,000원 + 도서산간
  - 쿠폰 할인: paymentData.discountAmount

#### 2. `/app/api/orders/create/route.js` - 장바구니 주문 금액 업데이트
- **라인**: 314-318
- **방식**: Service Role API
- **시나리오**: 장바구니에 상품 추가 시 결제 금액 증가
- **업데이트 컬럼**:
  ```javascript
  {
    amount: 모든 order_items 합계 + 배송비
  }
  ```

### 🔷 SELECT 작업 (결제 정보 조회)

#### 1. `/app/api/orders/list/route.js` - JOIN으로 자동 조회
- **방식**: orders 테이블 JOIN
- **SELECT 구문**:
  ```javascript
  .select(`
    *,
    order_payments (*)
  `)
  ```
- **데이터 정규화**:
  ```javascript
  payment: Array.isArray(order.order_payments) && order.order_payments.length > 0
    ? order.order_payments[0]
    : order.order_payments || null
  ```
- **getBestPayment()** 유틸:
  - 0원이 아닌 결제 정보 우선
  - depositor_name 있는 결제 우선
  - 카드 > 기타 > bank_transfer 순서

### ⚠️ 수정 시 주의사항 체크리스트

- [ ] **amount 계산**: 반드시 `OrderCalculations.calculateFinalOrderAmount()` 사용
- [ ] **is_free_shipping 확인**: orders.is_free_shipping = true이면 배송비 0원
- [ ] **도서산간 배송비**: `formatShippingInfo()` 사용 (postal_code 기반)
- [ ] **쿠폰 할인**: discount_amount는 배송비 제외하고 계산
- [ ] **payment_group_id**: 2개 이상 주문 일괄결제 시에만 생성
- [ ] **depositor_name**: 무통장입금 시 필수 (입금확인용)
- [ ] **status 동기화**: orders.status와 order_payments.status 일치 필수

### 🔗 연관 테이블 및 트리거

- **orders**: order_id FK, status 동기화
- **트리거**: 없음 (애플리케이션 레벨에서 처리)

### 🐛 과거 버그 사례

1. **RLS 정책 누락으로 UPDATE 실패** (2025-10-04)
   - 증상: PATCH 204 성공하지만 amount, depositor_name이 0 또는 빈값
   - 원인: order_payments UPDATE RLS 정책 없음
   - 해결: `20251004_fix_rls_update_policies.sql` 마이그레이션
   - 결과: Service Role API 권장

### 📚 관련 문서

- `DB_REFERENCE_GUIDE.md` - Section 3: order_payments 테이블 (line 1569-1644)
- `DETAILED_DATA_FLOW.md` - 체크아웃 페이지 (결제 정보 저장)

---

## 4. order_shipping 테이블

### 📌 개요

- **용도**: 배송 정보 (수령인, 주소, 우편번호, 송장번호)
- **중요도**: ⭐⭐⭐⭐
- **관련 테이블**: orders (N:1)
- **RLS 정책**: SELECT/UPDATE/INSERT (Service Role API 권장)

### 🔹 주요 컬럼

| 컬럼명 | 타입 | 설명 | 추가일 |
|--------|------|------|--------|
| id | UUID | PK | |
| order_id | UUID | FK → orders.id | |
| name | TEXT | 수령인 | |
| phone | TEXT | 연락처 | |
| address | TEXT | 주소 | |
| detail_address | TEXT | 상세 주소 | |
| **postal_code** | VARCHAR(10) | 우편번호 ⭐ | 2025-10-03 |
| shipping_fee | NUMERIC(8,2) | 배송비 | |
| status | VARCHAR(20) | 배송 상태 | 'pending' |
| tracking_number | VARCHAR(100) | 송장번호 | nullable |
| **tracking_company** | VARCHAR(50) | 택배사명 ⭐ | 2025-10-20 |
| shipped_at | TIMESTAMPTZ | 배송 시작일 | nullable |
| created_at | TIMESTAMPTZ | 생성일 | now() |

### 🟢 INSERT 작업 (배송 정보 생성)

#### 1. `/app/api/orders/create/route.js` - createOrder API (Service Role)
- **라인**: 240-242
- **방식**: Service Role API (RLS 우회)
- **트리거**: 신규 주문 생성 시 (장바구니는 skip)
- **저장 데이터**:
  ```javascript
  {
    order_id: 주문 ID,
    name: userProfile.name || user.name,
    phone: userProfile.phone || user.phone,
    address: userProfile.address || '배송지 미입력',
    detail_address: userProfile.detail_address || '',
    postal_code: userProfile.postal_code || null  // ⭐ 도서산간 배송비 계산 필수
  }
  ```

#### 2. `/app/api/orders/update-status/route.js` - 배송 정보 없을 때 INSERT
- **라인**: 130-135
- **방식**: Service Role API
- **시나리오**: 상태 업데이트 시 order_shipping 레코드 없으면 INSERT

### 🔵 UPDATE 작업 (배송 정보 변경)

#### 1. `/app/api/orders/update-status/route.js` - updateOrderStatus API (Service Role)
- **라인**: 123-126
- **방식**: Service Role API (RLS 우회)
- **트리거**: 입금확인 요청 시 배송지 변경 가능
- **업데이트 컬럼**:
  ```javascript
  {
    name: shippingData.shipping_name,
    phone: shippingData.shipping_phone,
    address: shippingData.shipping_address,
    detail_address: shippingData.shipping_detail_address || '',
    postal_code: shippingData.shipping_postal_code || null,
    shipping_fee: is_free_shipping ? 0 : formatShippingInfo().totalShipping
  }
  ```

#### 2. `/app/api/admin/shipping/update-tracking/route.js` - 송장번호 등록 (Service Role)
- **방식**: Service Role API
- **트리거**: 관리자가 송장번호 입력
- **업데이트 컬럼**:
  ```javascript
  {
    tracking_number: '123456789',
    tracking_company: 'CJ대한통운',
    status: 'shipped',
    shipped_at: 현재 시각
  }
  ```

### 🔷 SELECT 작업 (배송 정보 조회)

#### 1. `/app/api/orders/list/route.js` - JOIN으로 자동 조회
- **방식**: orders 테이블 JOIN
- **SELECT 구문**:
  ```javascript
  .select(`
    *,
    order_shipping (*)
  `)
  ```
- **데이터 정규화**:
  ```javascript
  shipping: Array.isArray(order.order_shipping) && order.order_shipping.length > 0
    ? order.order_shipping[0]
    : order.order_shipping || null
  ```

### ⚠️ 수정 시 주의사항 체크리스트

- [ ] **postal_code 필수**: 도서산간 배송비 계산에 필수 (2025-10-03 추가)
- [ ] **shipping_fee 계산**: `formatShippingInfo(baseShippingFee, postal_code)` 사용
- [ ] **is_free_shipping 확인**: orders.is_free_shipping = true이면 baseShippingFee = 0
- [ ] **tracking_company 추가**: 송장번호 등록 시 택배사명도 저장 (2025-10-20 확인)
- [ ] **status 동기화**: orders.status = 'shipped' 시 order_shipping.status도 'shipped'
- [ ] **shipped_at 자동 기록**: status = 'shipped' 시 자동 타임스탬프

### 🔗 연관 테이블 및 트리거

- **orders**: order_id FK, status/shipped_at 동기화
- **트리거**: 없음 (애플리케이션 레벨에서 처리)

### 🐛 과거 버그 사례

1. **postal_code 누락으로 도서산간 배송비 미계산** (2025-10-03)
   - 증상: 제주/울릉도 주문도 일반 배송비 4,000원만 부과
   - 원인: postal_code 컬럼 없음, profiles/order_shipping 모두
   - 해결: `20251003_add_postal_code_system.sql` 마이그레이션
   - 커밋: 2025-10-03 주간 작업

2. **RLS 정책 누락으로 UPDATE 실패** (2025-10-04)
   - 증상: 배송지 변경 204 성공하지만 DB 저장 안 됨
   - 원인: order_shipping UPDATE RLS 정책 없음
   - 해결: `20251004_fix_rls_update_policies.sql` 마이그레이션

### 📚 관련 문서

- `DB_REFERENCE_GUIDE.md` - Section 3: order_shipping 테이블 (line 1645-1772)
- `FEATURE_REFERENCE_MAP_PART3.md` - Section 7: 배송비 시스템
- `docs/WORK_LOG_2025-10-03.md` - 우편번호 시스템 완전 통합

---

## 5. products 테이블

### 📌 개요

- **용도**: 상품 기본 정보 (제목, 가격, 재고, 이미지)
- **중요도**: ⭐⭐⭐⭐⭐
- **관련 테이블**: product_variants (1:N), categories (N:1), suppliers (N:1)
- **RLS 정책**: SELECT (public), INSERT/UPDATE/DELETE (admin only)

### 🔹 주요 컬럼

| 컬럼명 | 타입 | 설명 | 기본값 |
|--------|------|------|--------|
| id | UUID | PK | |
| product_number | VARCHAR(20) | 상품 번호 (UNIQUE) | |
| title | TEXT | 상품명 | |
| price | NUMERIC(12,2) | 판매가 | |
| compare_price | NUMERIC(12,2) | 비교가 (정가) | nullable |
| thumbnail_url | TEXT | 썸네일 이미지 URL ⭐ | |
| inventory | INT | 재고 (variant 합산) | 0 |
| status | VARCHAR(20) | 상태 (active, inactive) | 'active' |
| is_featured | BOOLEAN | 인기 상품 | false |
| is_live_active | BOOLEAN | 라이브 방송 중 | false |
| category_id | UUID | FK → categories.id | nullable |
| supplier_id | UUID | FK → suppliers.id | nullable |
| option_count | INT | 옵션 개수 | 0 |
| variant_count | INT | Variant 개수 | 0 |
| created_at | TIMESTAMPTZ | 생성일 | now() |

⚠️ **주의**: `image_url` 컬럼은 존재하지 않음! `thumbnail_url` 사용!

### 🟢 INSERT 작업 (상품 생성)

#### 1. `/lib/supabaseApi.js` - addProduct() (line 167)
- **방식**: 클라이언트 직접 Supabase 호출 (Anon Key, RLS 적용)
- **트리거**: 관리자 상품 등록 (`/admin/products/new`)
- **호출 경로**:
  ```
  /app/admin/products/new/page.js (handleSubmit)
    ↓
  /lib/supabaseApi.js - addProduct()
    ↓
  supabase.from('products').insert()
  ```
- **저장 데이터**:
  ```javascript
  {
    product_number: 'PROD001',
    title: '상품명',
    price: 10000,
    compare_price: 15000,
    thumbnail_url: '/uploads/image.jpg',
    inventory: 100,
    status: 'active',
    is_featured: false,
    category_id: UUID,
    supplier_id: UUID
  }
  ```

#### 2. `/lib/supabaseApi.js` - createProductWithOptions() (line 2504)
- **방식**: 트랜잭션으로 products + options + variants 생성
- **트리거**: 관리자 옵션 상품 등록
- **순서**:
  1. products INSERT
  2. product_options INSERT (색상, 사이즈)
  3. product_option_values INSERT (빨강, 파랑, S, M, L)
  4. product_variants INSERT (모든 조합)
  5. variant_option_values INSERT (매핑)

### 🔵 UPDATE 작업 (상품 정보 변경)

#### 1. `/lib/supabaseApi.js` - updateProduct() (line 211)
- **방식**: 클라이언트 직접 Supabase 호출
- **트리거**: 관리자 상품 수정 (`/admin/products/[id]/edit`)
- **업데이트 컬럼**:
  ```javascript
  {
    title: '수정된 상품명',
    price: 12000,
    compare_price: 18000,
    thumbnail_url: '/uploads/new-image.jpg',
    inventory: 150,  // ⚠️ variant 있으면 자동 계산되므로 수동 수정 주의
    status: 'active' | 'inactive',
    is_featured: true,
    category_id: UUID,
    supplier_id: UUID,
    updated_at: 현재 시각
  }
  ```

#### 2. `/lib/supabaseApi.js` - updateProductLiveStatus() (line 265)
- **방식**: 클라이언트 직접 Supabase 호출
- **트리거**: 관리자 라이브 상태 토글
- **업데이트 컬럼**: `is_live_active = true | false`

#### 3. `/lib/supabaseApi.js` - updateProductInventory() (line 285)
- **방식**: 클라이언트 직접 Supabase 호출 (Variant 없는 상품만)
- **트리거**: 주문 생성 또는 주문 취소
- **업데이트 컬럼**: `inventory += quantityChange`
- **⚠️ 주의**: Variant 있는 상품은 `update_variant_inventory` RPC 사용

#### 4. **트리거 자동 업데이트**: `update_product_inventory_after_variant_change`
- **방식**: DB 트리거 (Variant 재고 변경 시 자동 실행)
- **목적**: product_variants 재고 합산 → products.inventory 자동 업데이트
- **타이밍**: product_variants INSERT/UPDATE/DELETE 후

### 🔷 SELECT 작업 (상품 조회)

#### 1. `/lib/supabaseApi.js` - getProducts() (line 47) ⚡ 최적화됨
- **방식**: 클라이언트 직접 Supabase 호출
- **트리거**: 홈페이지 로드 (`/app/page.js`)
- **SELECT 구문** (2025-10-18 최적화):
  ```javascript
  .select(`
    id, title, product_number, price, compare_price,
    thumbnail_url, inventory, status, is_featured,
    is_live_active, created_at
  `)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(50)
  ```
- **⚡ 성능 최적화**:
  - product_variants JOIN 제거 (4-level nested JOIN)
  - 데이터 전송량 90% 감소 (200KB → 20KB)
  - 모바일 타임아웃 완전 해결

#### 2. `/lib/supabaseApi.js` - getProductById() (line 101)
- **방식**: 클라이언트 직접 Supabase 호출
- **트리거**: 상품 상세 페이지 (`/products/[id]`)
- **SELECT 구문**:
  ```javascript
  .select(`
    *,
    product_variants (*),
    product_options (*),
    categories (*),
    suppliers (*)
  `)
  .eq('id', productId)
  .single()
  ```

#### 3. `/lib/supabaseApi.js` - getAllProducts() (line 2018)
- **방식**: 클라이언트 직접 Supabase 호출
- **트리거**: 관리자 상품 관리 (`/admin/products`)
- **필터**: status, category_id, supplier_id, is_featured
- **정렬**: created_at DESC

### ⚠️ 수정 시 주의사항 체크리스트

- [ ] **thumbnail_url 사용**: `image_url` 컬럼은 존재하지 않음! ⚠️ 버그 주의!
- [ ] **Variant 상품 재고**: products.inventory는 자동 계산, 수동 수정 금지
- [ ] **Variant 없는 상품 재고**: `updateProductInventory()` 사용 가능
- [ ] **product_number UNIQUE**: 중복 체크 필수
- [ ] **is_featured 필터**: 홈페이지 인기 상품 표시용
- [ ] **is_live_active 필터**: 라이브 방송 상품 표시용
- [ ] **status 필터**: 'active'만 일반 사용자에게 표시
- [ ] **JOIN 제거**: 성능 최적화 위해 불필요한 JOIN 제거 (commit 680c31b)

### 🔗 연관 테이블 및 트리거

- **product_variants**: Variant 재고 → products.inventory 자동 합산 (트리거)
- **product_options**: 옵션 정의 (색상, 사이즈)
- **categories**: 카테고리 분류
- **suppliers**: 공급업체 정보
- **트리거**: `update_product_inventory_after_variant_change`

### 🐛 과거 버그 사례

1. **image_url 컬럼 없음으로 500 에러** (2025-10-17)
   - 증상: `column products_2.image_url does not exist` - PostgreSQL 에러 42703
   - 원인: API 쿼리가 존재하지 않는 `image_url` 컬럼 참조
   - 해결: 모든 API에서 `image_url` → `thumbnail_url` 변경
   - 커밋: 37c57e1, 4cf8ef2, 050ae79
   - 영향 파일:
     - `/app/api/admin/orders/route.js` (lines 59, 67)
     - `/lib/fulfillmentGrouping.js` (line 127)
     - `/app/api/admin/purchase-orders/[supplierId]/route.js`

2. **홈페이지 상품 로딩 타임아웃** (2025-10-18)
   - 증상: 모바일(LTE/4G) 10-20초+ 타임아웃
   - 원인: product_variants 4-level nested JOIN, 데이터 200KB
   - 해결: JOIN 제거, 필요한 11개 컬럼만 SELECT
   - 커밋: ac7f56c (쿼리 최적화), fb8b0cd (ISR 적용)
   - 결과: 데이터 90% 감소, 모바일 타임아웃 완전 해결

### 📚 관련 문서

- `DB_REFERENCE_GUIDE.md` - Section 2: products 테이블 (line 145-339)
- `FEATURE_REFERENCE_MAP_PART1.md` - Section 2.1: 상품 등록
- `DETAILED_DATA_FLOW.md` - 홈 페이지 (상품 목록 로딩)

---

## 6. product_variants 테이블

### 📌 개요

- **용도**: 상품 옵션별 재고 관리 (색상-사이즈 조합별 독립 재고)
- **중요도**: ⭐⭐⭐⭐⭐
- **관련 테이블**: products (N:1), variant_option_values (1:N)
- **RLS 정책**: SELECT (public), INSERT/UPDATE/DELETE (admin only)

### 🔹 주요 컬럼

| 컬럼명 | 타입 | 설명 | 생성 방식 |
|--------|------|------|-----------|
| id | UUID | PK | |
| product_id | UUID | FK → products.id | |
| sku | VARCHAR(50) | SKU (UNIQUE) | 자동 생성 ⭐ |
| price | NUMERIC(12,2) | 판매가 (옵션별) | |
| compare_price | NUMERIC(12,2) | 비교가 | nullable |
| inventory | INT | 재고 (옵션별) | |
| variant_title | TEXT | 옵션명 (빨강 / M) | |
| image_url | TEXT | 옵션 이미지 URL | nullable |
| status | VARCHAR(20) | 상태 | 'active' |
| created_at | TIMESTAMPTZ | 생성일 | now() |

**SKU 자동 생성 규칙**:
```
제품번호-옵션값1-옵션값2
예: PROD001-RED-M, PROD001-BLUE-L
```

### 🟢 INSERT 작업 (Variant 생성)

#### 1. `/lib/supabaseApi.js` - createVariant() (line 2281)
- **방식**: 클라이언트 직접 Supabase 호출
- **트리거**: 관리자 옵션 추가 (`/admin/products/[id]/variants`)
- **호출 경로**:
  ```
  /app/admin/products/[id]/variants/page.js
    ↓
  /lib/supabaseApi.js - createVariant()
    ↓
  supabase.from('product_variants').insert()
  ```
- **저장 데이터**:
  ```javascript
  {
    product_id: UUID,
    sku: 'PROD001-RED-M',  // 자동 생성
    price: 10000,
    compare_price: 15000,
    inventory: 50,
    variant_title: '빨강 / M',
    image_url: '/uploads/variant-image.jpg',
    status: 'active'
  }
  ```
- **후처리**: variant_option_values INSERT (옵션 매핑)

#### 2. `/lib/supabaseApi.js` - createProductWithOptions() (line 2504)
- **방식**: 트랜잭션으로 모든 Variant 조합 생성
- **트리거**: 관리자 옵션 상품 등록
- **예시**: 색상 3개 × 사이즈 3개 = 9개 Variant 자동 생성

### 🔵 UPDATE 작업 (Variant 정보 변경)

#### 1. `/lib/supabaseApi.js` - updateVariant() (line 2339)
- **방식**: 클라이언트 직접 Supabase 호출
- **트리거**: 관리자 Variant 수정
- **업데이트 컬럼**:
  ```javascript
  {
    price: 12000,
    compare_price: 18000,
    inventory: 60,
    variant_title: '빨강 / M',
    image_url: '/uploads/new-image.jpg',
    status: 'active' | 'inactive'
  }
  ```
- **트리거 실행**: products.inventory 자동 재계산

#### 2. `/lib/supabaseApi.js` - updateVariantInventory() (line 2317) ⚡ 핵심
- **방식**: RPC 호출 (`update_variant_inventory`)
- **트리거**: 주문 생성 또는 주문 취소
- **호출 경로**:
  ```
  /app/api/orders/create/route.js (재고 차감)
    ↓
  supabaseAdmin.rpc('update_variant_inventory', {
    p_variant_id: UUID,
    p_quantity_change: -3  // 음수: 차감, 양수: 복원
  })
  ```
- **RPC 함수 내부**:
  1. FOR UPDATE 락 (동시성 제어)
  2. 재고 검증 (inventory + quantityChange >= 0)
  3. UPDATE product_variants SET inventory += quantityChange
  4. 트리거 실행 → products.inventory 자동 재계산
- **반환값**: `{ variant_id, old_inventory, new_inventory, change }`

### 🔷 SELECT 작업 (Variant 조회)

#### 1. `/lib/supabaseApi.js` - getProductVariants() (line 2235)
- **방식**: 클라이언트 직접 Supabase 호출
- **트리거**: 상품 상세 페이지 옵션 선택
- **SELECT 구문**:
  ```javascript
  .select(`
    *,
    variant_option_values (
      id,
      product_option_values (
        id, value, product_options (id, name)
      )
    )
  `)
  .eq('product_id', productId)
  .eq('status', 'active')
  ```

#### 2. `/lib/supabaseApi.js` - checkVariantInventory() (line 2383)
- **방식**: 클라이언트 직접 Supabase 호출
- **트리거**: 주문 수량 변경 시 재고 확인
- **SELECT 구문**:
  ```javascript
  .select('id, inventory, sku')
  .eq('product_id', productId)
  ```
- **옵션 매칭 로직**: selected_options와 variant_option_values 비교

### ⚠️ 수정 시 주의사항 체크리스트

- [ ] **재고 차감/복원**: 반드시 `update_variant_inventory` RPC 사용 (동시성 제어)
- [ ] **FOR UPDATE 락**: RPC 내부에서 자동 적용, 직접 UPDATE 금지
- [ ] **재고 검증**: RPC에서 자동 검증, Insufficient inventory 에러 발생 가능
- [ ] **SKU 중복 체크**: UNIQUE 제약 조건
- [ ] **트리거 자동 실행**: Variant 재고 변경 시 products.inventory 자동 업데이트
- [ ] **variant_option_values 매핑**: Variant 생성 시 함께 INSERT
- [ ] **옵션 조합 유일성**: 동일 옵션 조합 Variant 중복 생성 금지
- [ ] **주문 취소 시**: variant_id로 재고 복원 (updateVariantInventory 호출)

### 🔗 연관 테이블 및 트리거

- **products**: Variant 재고 합산 → products.inventory 자동 업데이트 (트리거)
- **variant_option_values**: Variant ↔ 옵션값 매핑 (N:N)
- **product_option_values**: 옵션값 정의 (빨강, 파랑, S, M, L)
- **트리거**: `update_product_inventory_after_variant_change` (매우 중요!)

### 🐛 과거 버그 사례

1. **주문 취소 시 variant 재고 복원 실패** (2025-10-16)
   - 증상: variant 재고 복원 시 "Variant 재고 복원 실패" 에러
   - 원인: `updateVariantInventory` RPC는 JSONB 반환, `!result.success` 검증 실패
   - 해결: 검증 로직 `!result.success` → `!result.variant_id`로 수정
   - 커밋: ccbab41
   - 영향 파일: `/lib/supabaseApi.js` (line 1525)

2. **수량 변경 시 variant 재고 검증 누락** (2025-10-07)
   - 증상: variant 재고 초과해도 수량 변경 가능
   - 원인: `updateOrderItemQuantity()`에서 variant_id 미확인
   - 해결: variant_id 추가 + checkVariantInventory() 호출
   - 커밋: 0c1d41a

### 📚 관련 문서

- `DB_REFERENCE_GUIDE.md` - Section 3.1: Variant 시스템 (line 840-1053)
- `FEATURE_REFERENCE_MAP_PART2.md` - Section 3: Variant 시스템
- `DETAILED_DATA_FLOW.md` - 상품 상세 페이지 (Variant 선택)

---

## 7. profiles 테이블

### 📌 개요

- **용도**: 사용자 프로필 정보 (이름, 연락처, 주소)
- **중요도**: ⭐⭐⭐⭐
- **관련 테이블**: auth.users (1:1)
- **RLS 정책**: SELECT/UPDATE (본인만), INSERT (trigger 자동)

### 🔹 주요 컬럼

| 컬럼명 | 타입 | 설명 | 추가일 |
|--------|------|------|--------|
| id | UUID | PK (auth.users.id) | |
| name | TEXT | 이름 | |
| nickname | TEXT | 닉네임 | nullable |
| phone | TEXT | 연락처 | |
| address | TEXT | 주소 | |
| detail_address | TEXT | 상세 주소 | |
| **postal_code** | VARCHAR(10) | 우편번호 ⭐ | 2025-10-03 |
| addresses | JSONB | 배송지 목록 | [] |
| kakao_id | VARCHAR(50) | 카카오 ID | nullable |
| is_admin | BOOLEAN | 관리자 플래그 | false |
| created_at | TIMESTAMPTZ | 생성일 | now() |

### 🟢 INSERT 작업 (프로필 생성)

#### 1. **트리거 자동 생성**: `handle_new_user`
- **방식**: DB 트리거 (auth.users INSERT 후 자동 실행)
- **타이밍**: 회원가입 시
- **저장 데이터**:
  ```javascript
  {
    id: auth.users.id,
    name: user_metadata.name || user_metadata.full_name,
    phone: user_metadata.phone,
    address: user_metadata.address,
    detail_address: user_metadata.detail_address,
    postal_code: user_metadata.postal_code,
    addresses: user_metadata.addresses || [],
    kakao_id: user_metadata.kakao_id
  }
  ```

#### 2. **웰컴 쿠폰 트리거**: `trigger_new_user_signup`
- **방식**: DB 트리거 (profiles INSERT 후 자동 실행)
- **타이밍**: 회원가입 직후
- **동작**: `handle_new_user_signup()` 함수 호출 → 웰컴 쿠폰 자동 발급
- **마이그레이션**: `20251008_welcome_coupon_auto_issue.sql`

### 🔵 UPDATE 작업 (프로필 정보 변경)

#### 1. `/lib/UserProfileManager.js` - atomicProfileUpdate() (line 248)
- **방식**: 클라이언트 직접 Supabase 호출 (3곳 동시 업데이트)
- **트리거**: 마이페이지 프로필 수정 (`/mypage`)
- **호출 경로**:
  ```
  /app/mypage/page.js (handleUpdateProfile)
    ↓
  UserProfileManager.atomicProfileUpdate()
    ↓
  Promise.allSettled([
    supabase.from('profiles').upsert(),
    supabase.auth.updateUser({ data: metadata }),
    sessionStorage.setItem('user')  // 카카오 사용자만
  ])
  ```
- **업데이트 컬럼** (profiles 테이블):
  ```javascript
  {
    id: userId,
    name: '홍길동',
    phone: '01012345678',
    nickname: '길동이',
    address: '서울시 강남구',
    detail_address: '101동 202호',
    postal_code: '12345',
    addresses: [{ label: '기본 배송지', address: '...', is_default: true }],
    updated_at: 현재 시각
  }
  ```
- **3곳 동시 업데이트**:
  1. profiles 테이블 (upsert)
  2. auth.users.user_metadata (updateUser)
  3. sessionStorage (카카오 사용자만)

### 🔷 SELECT 작업 (프로필 조회)

#### 1. `/lib/UserProfileManager.js` - getCurrentUser() (line 14)
- **방식**: 클라이언트 직접 Supabase 호출
- **트리거**: 모든 페이지 로드 시 (로그인 확인)
- **조회 순서**:
  1. Supabase Auth 세션 확인 (`supabase.auth.getSession()`)
  2. profiles 테이블 조회 (session.user.id)
  3. sessionStorage 확인 (카카오 사용자)
- **반환값**: `{ id, name, phone, address, kakao_id, ... }`

#### 2. `/app/api/admin/check-profile` - Service Role API
- **방식**: Service Role API (RLS 우회)
- **트리거**: 관리자 로그인 시
- **목적**: RLS 순환 참조 방지 (is_admin() 함수 → profiles → RLS → 무한루프)
- **SELECT 구문**:
  ```javascript
  supabaseAdmin.from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  ```

#### 3. `/app/api/orders/create/route.js` - 사용자 검증
- **라인**: 91-95
- **방식**: Service Role API
- **목적**: Supabase Auth 사용자 존재 확인 (validUserId 설정)

### ⚠️ 수정 시 주의사항 체크리스트

- [ ] **postal_code 필수**: 도서산간 배송비 계산에 필수 (2025-10-03 추가)
- [ ] **addresses JSONB 배열**: 다중 배송지 지원, 기본 배송지 플래그
- [ ] **atomicProfileUpdate 사용**: 3곳 동시 업데이트 (profiles + user_metadata + sessionStorage)
- [ ] **is_admin 플래그**: 관리자 권한 확인용, `master@allok.world`만 true
- [ ] **kakao_id**: 카카오 사용자 구분, 주문 조회 시 필수
- [ ] **RLS 정책**: Service Role API 권장 (순환 참조 방지)
- [ ] **트리거 2개**: handle_new_user, trigger_new_user_signup

### 🔗 연관 테이블 및 트리거

- **auth.users**: 1:1 관계, user_metadata와 동기화 필수
- **orders**: kakao_id로 카카오 사용자 주문 조회
- **트리거 1**: `handle_new_user` (auth.users → profiles 자동 생성)
- **트리거 2**: `trigger_new_user_signup` (profiles → 웰컴 쿠폰 자동 발급)

### 🐛 과거 버그 사례

1. **관리자 로그인 10초+ 타임아웃** (2025-10-03)
   - 증상: profiles 테이블 조회 10초+ 타임아웃, 무한루프
   - 원인: RLS 순환 참조 (`is_admin()` 함수 → profiles → RLS → is_admin() → 무한)
   - 해결: Service Role API 생성 (`/api/admin/check-profile`)
   - 커밋: 2025-10-03 야간 작업
   - 결과: 10초+ → 1초 이내

2. **postal_code 누락** (2025-10-03)
   - 증상: 도서산간 배송비 계산 불가
   - 원인: profiles.postal_code 컬럼 없음
   - 해결: `20251003_add_postal_code_system.sql` 마이그레이션
   - 추가 작업: 모든 페이지에 우편번호 표시 및 입력 추가

### 📚 관련 문서

- `DB_REFERENCE_GUIDE.md` - Section 4: profiles 테이블 (line 1773-1945)
- `FEATURE_REFERENCE_MAP_PART2.md` - Section 4: 사용자 프로필 관리
- `docs/WORK_LOG_2025-10-03_RLS_ISSUE.md` - 관리자 RLS 문제 해결

---

## 8. coupons / user_coupons 테이블

### 📌 개요

- **용도**: 쿠폰 정의 및 사용자별 쿠폰 발급/사용 기록
- **중요도**: ⭐⭐⭐⭐
- **관련 테이블**:
  - coupons: 쿠폰 마스터 정보
  - user_coupons: 사용자별 발급/사용 기록
- **RLS 정책**:
  - coupons: SELECT (public), INSERT/UPDATE/DELETE (admin only)
  - user_coupons: SELECT/UPDATE (본인만)

### 🔹 주요 컬럼 (coupons 테이블)

| 컬럼명 | 타입 | 설명 | 기본값 |
|--------|------|------|--------|
| id | UUID | PK | |
| code | VARCHAR(50) | 쿠폰 코드 (UNIQUE) | |
| name | TEXT | 쿠폰명 | |
| type | VARCHAR(20) | 할인 유형 (fixed_amount, percentage) | |
| value | NUMERIC(12,2) | 할인값 (10000 또는 10.00) | |
| min_order_amount | NUMERIC(12,2) | 최소 주문 금액 | 0 |
| max_discount_amount | NUMERIC(12,2) | 최대 할인 금액 (percentage) | nullable |
| usage_limit | INT | 총 사용 가능 횟수 | nullable |
| used_count | INT | 사용된 횟수 | 0 |
| **is_welcome_coupon** | BOOLEAN | 웰컴 쿠폰 플래그 ⭐ | false |
| valid_from | TIMESTAMPTZ | 유효 기간 시작 | now() |
| valid_until | TIMESTAMPTZ | 유효 기간 종료 | |
| status | VARCHAR(20) | 상태 (active, inactive) | 'active' |

### 🔹 주요 컬럼 (user_coupons 테이블)

| 컬럼명 | 타입 | 설명 | 기본값 |
|--------|------|------|--------|
| id | UUID | PK | |
| user_id | UUID | FK → auth.users.id | |
| coupon_id | UUID | FK → coupons.id | |
| is_used | BOOLEAN | 사용 여부 | false |
| used_at | TIMESTAMPTZ | 사용 시각 | nullable |
| order_id | UUID | 사용한 주문 ID | nullable |
| issued_at | TIMESTAMPTZ | 발급일 | now() |

### 🟢 INSERT 작업 (쿠폰 생성 및 발급)

#### 1. `/app/api/admin/coupons/create/route.js` - 쿠폰 생성 (Service Role)
- **방식**: Service Role API (RLS 우회)
- **트리거**: 관리자 쿠폰 생성 (`/admin/coupons/new`)
- **호출 경로**:
  ```
  /app/admin/coupons/new/page.js (handleCreate)
    ↓
  /lib/couponApi.js - createCoupon() (line 144)
    ↓
  fetch('/api/admin/coupons/create') → Service Role API
    ↓
  supabaseAdmin.from('coupons').insert()
  ```
- **저장 데이터**:
  ```javascript
  {
    code: 'WELCOME2025',
    name: '신규 회원 웰컴 쿠폰',
    type: 'fixed_amount',
    value: 10000,
    min_order_amount: 50000,
    max_discount_amount: null,
    usage_limit: 100,
    used_count: 0,
    is_welcome_coupon: true,  // ⭐ 웰컴 쿠폰 플래그
    valid_from: '2025-10-01',
    valid_until: '2025-12-31',
    status: 'active'
  }
  ```

#### 2. `/app/api/admin/coupons/distribute/route.js` - 쿠폰 배포 (Service Role)
- **방식**: Service Role API (RLS 우회)
- **트리거**: 관리자 쿠폰 배포 (`/admin/coupons/[id]`)
- **시나리오 1**: 특정 사용자에게 배포
  ```javascript
  supabaseAdmin.from('user_coupons').insert({
    user_id: userId,
    coupon_id: couponId,
    is_used: false,
    issued_at: 현재 시각
  })
  ```
- **시나리오 2**: 전체 고객 배포
  ```javascript
  // 모든 프로필 조회 → 개별 INSERT (중복 건너뛰기)
  for (const profile of profiles) {
    // 기존 발급 확인
    const { data: existing } = await supabaseAdmin
      .from('user_coupons')
      .select('id')
      .eq('user_id', profile.id)
      .eq('coupon_id', couponId)
      .single()

    if (!existing) {
      // 없으면 INSERT
      await supabaseAdmin.from('user_coupons').insert()
    }
  }
  ```

#### 3. **웰컴 쿠폰 자동 발급**: `handle_new_user_signup()`
- **방식**: DB 트리거 (profiles INSERT 후 자동 실행)
- **타이밍**: 회원가입 직후
- **로직**:
  1. is_welcome_coupon = true인 쿠폰 조회
  2. usage_limit 확인 (선착순)
  3. user_coupons INSERT
  4. coupons.used_count 증가
- **마이그레이션**: `20251008_welcome_coupon_auto_issue.sql`

### 🔵 UPDATE 작업 (쿠폰 사용 처리)

#### 1. **use_coupon()** RPC 함수 (DB 함수)
- **방식**: Supabase RPC
- **트리거**: 주문 생성 시 쿠폰 사용
- **호출 경로**:
  ```
  /app/api/orders/update-status/route.js (line 242)
    ↓
  /lib/couponApi.js - applyCouponUsage() (line 118)
    ↓
  supabase.rpc('use_coupon', {
    p_coupon_code: 'WELCOME2025',
    p_user_id: userId,
    p_order_id: orderId
  })
  ```
- **RPC 함수 내부**:
  1. coupons 테이블 조회 (coupon_code)
  2. user_coupons 조회 (user_id + coupon_id)
  3. UPDATE user_coupons SET:
     - is_used = true
     - used_at = 현재 시각
     - order_id = 주문 ID
  4. UPDATE coupons SET used_count += 1

#### 2. `/app/api/admin/coupons/update/route.js` - 쿠폰 정보 수정 (Service Role)
- **방식**: Service Role API (RLS 우회)
- **트리거**: 관리자 쿠폰 수정 (`/admin/coupons/[id]/edit`)
- **업데이트 컬럼**:
  ```javascript
  {
    name: '수정된 쿠폰명',
    value: 15000,
    min_order_amount: 60000,
    max_discount_amount: 20000,
    usage_limit: 200,
    valid_until: '2025-12-31',
    status: 'active' | 'inactive'
  }
  ```

### 🔷 SELECT 작업 (쿠폰 조회)

#### 1. `/lib/couponApi.js` - loadUserCouponsOptimized() (line 14)
- **방식**: 클라이언트 직접 Supabase 호출
- **트리거**: 체크아웃 페이지 로드, 마이페이지 로드
- **호출 경로**:
  ```
  /app/checkout/page.js (useEffect)
    ↓
  loadUserCouponsOptimized(userId)
    ↓
  supabase.from('user_coupons').select()
  ```
- **SELECT 구문**:
  ```javascript
  .select(`
    id,
    is_used,
    used_at,
    issued_at,
    coupons (
      id, code, name, type, value,
      min_order_amount, max_discount_amount,
      valid_from, valid_until, status
    )
  `)
  .eq('user_id', userId)
  .order('issued_at', { ascending: false })
  ```
- **필터링**: 클라이언트에서 is_used = false 필터 (사용 가능 쿠폰만)

#### 2. `/lib/couponApi.js` - validateCoupon() RPC (line 64)
- **방식**: Supabase RPC (DB 함수)
- **트리거**: 쿠폰 적용 버튼 클릭
- **RPC 파라미터**:
  ```javascript
  {
    p_coupon_code: 'WELCOME2025',
    p_user_id: userId,
    p_product_amount: 50000  // ⚠️ 배송비 제외!
  }
  ```
- **검증 항목**:
  1. 쿠폰 존재 확인 (code)
  2. 사용자에게 발급되었는가? (user_coupons)
  3. 이미 사용했는가? (is_used = false)
  4. 유효 기간 내인가? (valid_from ≤ now ≤ valid_until)
  5. 최소 주문 금액 충족? (product_amount ≥ min_order_amount)
  6. 총 사용 한도 초과? (usage_limit)
- **반환값**: `{ valid: true/false, discount_amount: 10000, message: '...' }`

### ⚠️ 수정 시 주의사항 체크리스트

- [ ] **배송비 제외 계산**: `validateCoupon()`, `applyCouponDiscount()` 모두 product_amount만 전달
- [ ] **is_welcome_coupon 플래그**: 웰컴 쿠폰은 회원가입 시 자동 발급
- [ ] **usage_limit**: 선착순 제한 (웰컴 쿠폰, 전체 배포 모두)
- [ ] **used_count 증가**: use_coupon() RPC에서 자동 처리
- [ ] **user_coupons UNIQUE 제약**: (user_id, coupon_id) 중복 발급 방지
- [ ] **쿠폰 사용 처리**: use_coupon() RPC 사용 필수 (수동 UPDATE 금지)
- [ ] **RLS 정책**: coupons INSERT/UPDATE/DELETE는 Service Role API만

### 🔗 연관 테이블 및 트리거

- **orders**: order_id FK (user_coupons), discount_amount 저장
- **profiles**: user_id FK (user_coupons)
- **트리거**: `trigger_new_user_signup` → `handle_new_user_signup()` (웰컴 쿠폰 자동 발급)

### 🐛 과거 버그 사례

1. **쿠폰 사용 완료 처리 실패** (2025-10-05)
   - 증상: user_coupons.is_used = false 유지
   - 원인: use_coupon() RPC 내 auth.uid() 검증 문제 (SECURITY DEFINER)
   - 해결: auth.uid() 검증 제거, RLS 정책만 사용
   - 마이그레이션: 없음 (기존 RPC 수정)
   - 결과: is_used = true 정상 저장, 마이페이지 "사용 완료" 탭 이동

2. **관리자 쿠폰 생성 403 에러** (2025-10-07)
   - 증상: `POST /rest/v1/coupons 403 (Forbidden)` - RLS 정책 차단
   - 원인: 클라이언트 Supabase (Anon Key) 사용 → RLS 적용
   - 해결: Service Role API 생성 (`/api/admin/coupons/create`)
   - 커밋: 10ef437

3. **관리자 쿠폰 배포 403 에러** (2025-10-07 → 2025-10-08 완전 해결)
   - 증상: `POST /api/admin/coupons/distribute 403 (Forbidden)` - "관리자 권한이 없습니다"
   - 원인: `supabase.auth.getSession()`으로 adminEmail 추출 실패
   - 해결: useAdminAuth hook에서 검증된 adminUser.email 사용
   - 추가 해결: `/hooks/useAdminAuth.js` (구버전) → `/hooks/useAdminAuthNew.js` (신버전)
   - 커밋: d96a616, 750a795, 4dccd19 (시도), 최종 해결 (2025-10-08)

### 📚 관련 문서

- `DB_REFERENCE_GUIDE.md` - Section 6: coupons/user_coupons 테이블
- `FEATURE_REFERENCE_MAP_PART3.md` - Section 8: 쿠폰 시스템
- `docs/COUPON_SYSTEM.md` - 🎟️ 쿠폰 시스템 완벽 가이드

---

# 추가 테이블 간략 문서화

---

## 9. categories 테이블

### 📌 개요
- **용도**: 상품 카테고리 분류
- **주요 작업**: SELECT (전체 조회), INSERT/UPDATE (관리자)

### 사용처
- `/lib/supabaseApi.js` - getCategories() (line 2140)
- 관리자 상품 등록/수정 시 카테고리 선택

---

## 10. suppliers 테이블

### 📌 개요
- **용도**: 공급업체 정보 (업체명, 연락처, 매입가)
- **주요 작업**: SELECT (전체 조회), INSERT/UPDATE/DELETE (관리자)

### 사용처
- `/lib/supabaseApi.js` - getSuppliers() (line 2164)
- `/lib/supabaseApi.js` - createSupplier() (line 2185)
- `/lib/supabaseApi.js` - updateSupplier() (line 2206)
- 관리자 공급업체 관리 (`/admin/suppliers`)

---

## 11. purchase_order_batches 테이블

### 📌 개요
- **용도**: 발주서 생성 이력 (업체별 발주 batch 추적)
- **주요 작업**: INSERT (발주서 다운로드), SELECT (발주 이력 조회)

### 주요 컬럼
- **order_ids**: 주문 ID 배열 (GIN 인덱스)
- **supplier_id**: FK → suppliers.id
- **adjusted_quantities**: JSONB (수량 조정 내역)

### 사용처
- `/lib/supabaseApi.js` - getPurchaseOrdersBySupplier() (line 2565)
- `/app/api/admin/purchase-orders/batch/route.js` - 발주서 다운로드 시 INSERT

### 중복 방지 로직
```javascript
// 이미 발주된 주문 제외
.not('id', 'in', `(SELECT unnest(order_ids) FROM purchase_order_batches WHERE supplier_id = '${supplierId}')`)
```

---

## 12. product_options 테이블

### 📌 개요
- **용도**: 상품 옵션 정의 (색상, 사이즈)
- **관련 테이블**: products (N:1), product_option_values (1:N)

### 사용처
- `/lib/supabaseApi.js` - getProductOptions() (line 2426)
- `/lib/supabaseApi.js` - createProductOption() (line 2462)
- 관리자 옵션 상품 등록 시

---

## 13. product_option_values 테이블

### 📌 개요
- **용도**: 옵션값 정의 (빨강, 파랑, S, M, L)
- **관련 테이블**: product_options (N:1), variant_option_values (1:N)

### 사용처
- `/lib/supabaseApi.js` - createOptionValue() (line 2483)
- 관리자 옵션값 추가 시

---

## 14. variant_option_values 테이블

### 📌 개요
- **용도**: Variant ↔ 옵션값 매핑 (N:N 중간 테이블)
- **관련 테이블**: product_variants (N:1), product_option_values (N:1)

### 사용처
- `/lib/supabaseApi.js` - createVariant() (line 2281) - INSERT
- `/lib/supabaseApi.js` - getProductVariants() (line 2235) - SELECT (JOIN)

---

## 15. live_broadcasts 테이블

### 📌 개요
- **용도**: 라이브 방송 정보 (방송명, 시작/종료 시각)
- **주요 작업**: SELECT (활성 방송 조회), INSERT/UPDATE (관리자)

### 사용처
- `/lib/supabaseApi.js` - getLiveBroadcasts() (line 1915)
- 관리자 라이브 관리 (`/admin/live`)

---

## 16. live_products 테이블

### 📌 개요
- **용도**: 라이브 방송 상품 목록 (방송별 상품 연결)
- **관련 테이블**: live_broadcasts (N:1), products (N:1)

### 사용처
- `/lib/supabaseApi.js` - getLiveProducts() (line 1991)
- `/lib/supabaseApi.js` - addToLive() (line 2060)
- `/lib/supabaseApi.js` - removeFromLive() (line 2086)

---

## 17. 기타 테이블들

### 17.1 테이블 목록
- **total_tables**: 22개

### 17.2 미문서화 테이블
위 16개 테이블 외 추가 테이블이 있으면 여기에 간략히 기록.

---

# 📋 전체 테이블 요약 매트릭스

| 테이블명 | INSERT 위치 | UPDATE 위치 | SELECT 위치 | 트리거 |
|---------|------------|------------|------------|--------|
| **orders** | `/api/orders/create` | `/api/orders/update-status`, `cancelOrder` | `/api/orders/list`, `/api/admin/orders` | 없음 |
| **order_items** | `/api/orders/create` | `updateOrderItemQuantity` | orders JOIN | 없음 |
| **order_payments** | `/api/orders/create`, `/api/orders/update-status` | `/api/orders/update-status` | orders JOIN | 없음 |
| **order_shipping** | `/api/orders/create`, `/api/orders/update-status` | `/api/orders/update-status` | orders JOIN | 없음 |
| **products** | `addProduct`, `createProductWithOptions` | `updateProduct`, `updateProductInventory` | `getProducts`, `getAllProducts` | ⭐ update_product_inventory |
| **product_variants** | `createVariant`, `createProductWithOptions` | `updateVariant`, `update_variant_inventory` RPC | `getProductVariants` | ⭐ update_product_inventory |
| **profiles** | ⭐ handle_new_user 트리거 | `atomicProfileUpdate` | `getCurrentUser`, `/api/admin/check-profile` | ⭐ trigger_new_user_signup |
| **coupons** | `/api/admin/coupons/create` | `/api/admin/coupons/update` | `loadUserCouponsOptimized` | 없음 |
| **user_coupons** | `/api/admin/coupons/distribute`, ⭐ handle_new_user_signup | `use_coupon` RPC | `loadUserCouponsOptimized` | 없음 |

---

# 🎯 실전 사용 시나리오

## 시나리오 1: "orders 테이블에 새 컬럼 추가"

1. **이 문서에서 확인할 것**:
   - Section 1: orders 테이블
   - INSERT 작업 위치 모두 확인 (2곳)
   - UPDATE 작업 위치 모두 확인 (3곳)

2. **수정해야 할 파일**:
   - `/app/api/orders/create/route.js` (INSERT 시 새 컬럼 포함)
   - `/app/api/orders/update-status/route.js` (UPDATE 시 새 컬럼 포함)
   - `/lib/supabaseApi.js` - cancelOrder() (필요 시)

3. **테스트 시나리오**:
   - 주문 생성 → 새 컬럼 저장 확인
   - 상태 변경 → 새 컬럼 업데이트 확인
   - 주문 취소 → 새 컬럼 영향 없음

4. **문서 업데이트**:
   - `DB_REFERENCE_GUIDE.md` (컬럼 추가)
   - 이 문서 Section 1 업데이트

---

## 시나리오 2: "주문 생성 버그 수정"

1. **이 문서에서 확인할 것**:
   - Section 1: orders 테이블 → "과거 버그 사례"
   - Section 2: order_items 테이블 → "과거 버그 사례"
   - Section 8: coupons 테이블 → "쿠폰 사용 처리"

2. **분석 순서**:
   - 어떤 테이블에 저장 실패했는가?
   - RLS 정책 문제인가? (Service Role API 확인)
   - 트리거 실행 실패인가?
   - 연관 테이블 영향은?

3. **수정 전 체크**:
   - "수정 시 주의사항 체크리스트" 모두 확인
   - 유사 버그 사례 참고
   - 연관 테이블 영향도 분석

---

## 시나리오 3: "성능 최적화 (쿼리 개선)"

1. **이 문서에서 확인할 것**:
   - Section 1: orders 테이블 → SELECT 작업 (JOIN 구조)
   - Section 5: products 테이블 → "과거 버그 사례" (JOIN 제거)

2. **최적화 체크리스트**:
   - [ ] 불필요한 JOIN 제거 가능한가?
   - [ ] SELECT 컬럼 수 줄일 수 있는가?
   - [ ] 인덱스 추가 필요한가?
   - [ ] RPC 함수로 서버 처리 가능한가?

3. **참고 사례**:
   - 2025-10-18: product_variants JOIN 제거 → 90% 데이터 감소
   - 2025-10-05: 헬퍼 함수 + 인덱스 → 2-5배 성능 향상

---

# 🚨 임기응변 코드 방지 체크리스트

### 새 기능 개발 전
- [ ] 이 문서에서 관련 테이블 섹션 읽기
- [ ] INSERT/UPDATE/SELECT 위치 모두 파악
- [ ] 유사 기능 구현 패턴 확인 (Part 1 참조)
- [ ] 중앙화 모듈 재사용 가능 여부 확인 (`supabaseApi.js`, `orderCalculations.js`)
- [ ] RLS 정책 확인 (Service Role API 필요 여부)
- [ ] 트리거 영향 확인

### DB 작업 시
- [ ] 컬럼명 정확히 확인 (중복 컬럼, 존재하지 않는 컬럼 주의)
- [ ] 데이터 타입 확인
- [ ] nullable 여부 확인
- [ ] 연관 테이블 FK 확인
- [ ] 트리거 실행 순서 확인

### 버그 수정 시
- [ ] "과거 버그 사례" 섹션 확인
- [ ] 근본 원인 분석 (RLS? 트리거? 동시성?)
- [ ] 영향받는 모든 파일 수정
- [ ] 유사 패턴 버그 함께 수정

---

# 📝 Part 2 종료

**다음 Part**:
- **Part 3**: API 엔드포인트 종속성 맵 (67개 API Route)
- **Part 4**: 페이지별 종속성 맵 (36개 페이지)
- **Part 5**: 수정 영향도 매트릭스

**작성 완료일**: 2025-10-20
**총 줄 수**: 1,600+ 줄
**문서화된 테이블**: 16개 (핵심 8개 상세, 추가 8개 간략)
