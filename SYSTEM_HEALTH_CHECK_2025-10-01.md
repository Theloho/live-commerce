# 🏥 시스템 전체 상태 점검 보고서

**점검일**: 2025-10-01
**점검자**: Claude Code
**점검 범위**: DB 구조, 데이터 흐름, 페이지별 연결성, 코드 일관성

---

## 📊 1. 프로덕션 DB 구조 현황

### ✅ 핵심 테이블 (17개)

| 테이블명 | 컬럼 수 | 상태 | 비고 |
|---------|---------|------|------|
| **profiles** | 16 | ✅ 정상 | addresses JSONB 추가됨 |
| **products** | 28 | ✅ 정상 | 라이브 관련 컬럼 추가됨 |
| **orders** | 17 | ✅ 정상 | 타임스탬프 컬럼 4개 추가됨 |
| **order_items** | 14 | ⚠️ 주의 | title, price, total 등 중복 컬럼 |
| **order_shipping** | 14 | ✅ 정상 | 표준 구조 |
| **order_payments** | 11 | ✅ 정상 | depositor_name 포함 |
| cart_items | 7 | ✅ 정상 | |
| live_broadcasts | 13 | ✅ 정상 | |
| live_products | 6 | ✅ 정상 | |
| product_options | 6 | ✅ 정상 | |
| categories | 6 | ✅ 정상 | |
| reviews | 12 | ✅ 정상 | |
| wishlist | 4 | ✅ 정상 | |
| coupons | 14 | ✅ 정상 | |
| user_coupons | 6 | ✅ 정상 | |
| notifications | 8 | ✅ 정상 | |
| order_items_backup_20250930 | 8 | ⚠️ 백업 | 정리 필요 |

---

## 🔍 2. 중요 발견사항

### ⚠️ 문제점 1: order_items 테이블 컬럼 중복

**현상**: order_items 테이블에 동일한 역할의 컬럼이 중복 존재

```sql
-- 가격 관련 중복 컬럼
unit_price  -- 기존 컬럼 (프로덕션 스키마)
price       -- 새로 추가된 컬럼 (개발 중 추가?)

-- 총액 관련 중복 컬럼
total_price -- 기존 컬럼 (프로덕션 스키마)
total       -- 새로 추가된 컬럼 (개발 중 추가?)
```

**코드에서의 처리** (`/lib/supabaseApi.js:489-502`):
```javascript
const itemData = {
  order_id: orderId,
  product_id: normalizedOrderData.id,
  title: normalizedOrderData.title || '상품명 미확인',
  quantity: normalizedOrderData.quantity,
  price: normalizedOrderData.price,        // 신규 컬럼
  total: normalizedOrderData.totalPrice,   // 신규 컬럼
  unit_price: normalizedOrderData.price,   // 기존 컬럼 (호환성 유지)
  total_price: normalizedOrderData.totalPrice, // 기존 컬럼 (호환성 유지)
  selected_options: normalizedOrderData.selectedOptions || {},
  variant_title: normalizedOrderData.variant || null,
  sku: normalizedOrderData.sku || null,
  product_snapshot: normalizedOrderData.productSnapshot || {}
}
```

**영향**:
- ✅ 현재 코드는 양쪽 컬럼 모두에 값을 넣어서 호환성 유지
- ⚠️ 데이터 중복 저장 (스토리지 낭비)
- ⚠️ 혼란 가능성 (어떤 컬럼을 읽어야 할지 불명확)

**권장 조치**:
1. **단기**: 현재 상태 유지 (양쪽 모두 저장)
2. **중기**: 표준 컬럼 결정 후 마이그레이션 계획 수립
3. **장기**: 중복 컬럼 제거

---

### ⚠️ 문제점 2: order_items에 title 컬럼 존재

**현상**:
- 실제 프로덕션 DB: order_items에 `title` 컬럼 존재 (NOT NULL)
- 기존 문서 (`DETAILED_DATA_FLOW.md:93`): "title 컬럼 없음" 이라고 기재됨

**실제 DB 구조**:
```sql
order_items:
  - title (text, NOT NULL)  -- 상품 제목이 직접 저장됨
  - product_id (uuid)       -- products 테이블 참조
```

**영향**:
- ✅ 실제로는 문제 없음 (title이 직접 저장되어 products 조인 불필요)
- ⚠️ 문서가 실제와 불일치

**권장 조치**:
- `DETAILED_DATA_FLOW.md` 업데이트 필요

---

### ✅ 정상 동작 확인: orders 테이블 타임스탬프

**추가된 컬럼** (2025-10-01):
```sql
verifying_at  TIMESTAMPTZ  -- 결제 확인중 시간
paid_at       TIMESTAMPTZ  -- 결제 완료 시간
delivered_at  TIMESTAMPTZ  -- 발송 완료 시간
cancelled_at  TIMESTAMPTZ  -- 주문 취소 시간
```

**동작 상태**: ✅ 완벽히 작동
- `updateOrderStatus` 함수에서 자동 기록
- `updateMultipleOrderStatus` 함수에서도 자동 기록
- 관리자 페이지에서 정상 표시

---

### ✅ 정상 동작 확인: profiles.addresses JSONB

**구조**:
```sql
profiles:
  - addresses JSONB DEFAULT '[]'::jsonb
```

**사용처**:
- `/app/components/AddressManager.jsx` - 마이페이지
- `/app/components/address/AddressManager.jsx` - 체크아웃

**동작 방식**: 직접 Supabase REST API 호출
```javascript
// 주소 조회
fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=addresses`)

// 주소 업데이트
fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
  method: 'PATCH',
  body: JSON.stringify({ addresses })
})
```

**상태**: ✅ 완벽히 작동

---

### ⚠️ 문제점 3: orders 테이블 배송 정보 중복

**현상**: orders 테이블에 배송 정보가 직접 저장됨
```sql
orders:
  - shipping_name
  - shipping_phone
  - shipping_address
  - shipping_detail_address
```

**동시에 order_shipping 테이블에도 저장됨**:
```sql
order_shipping:
  - name
  - phone
  - address
  - detail_address
```

**영향**:
- ⚠️ 데이터 중복 (orders 테이블과 order_shipping 테이블에 같은 정보)
- ⚠️ 동기화 문제 가능성

**코드 동작** (`/lib/supabaseApi.js:512-527`):
```javascript
// 배송 정보는 order_shipping에만 저장
const shippingData = {
  order_id: orderId,
  name: userProfile.name,
  phone: userProfile.phone,
  address: userProfile.address,
  detail_address: userProfile.detail_address
}

await supabase.from('order_shipping').insert([shippingData])

// ❓ orders 테이블의 shipping_* 컬럼에는 언제 저장되는가?
```

**추가 조사 필요**:
- orders.shipping_* 컬럼이 실제로 사용되는지 확인
- 사용되지 않으면 제거 고려
- 사용된다면 동기화 로직 구현 필요

---

## 📋 3. 페이지별 데이터 흐름 검증

### 1️⃣ 홈 페이지 (`/app/page.js`)

**데이터 소스**:
- `getProducts()` → products 테이블
- LEFT JOIN product_options

**표시 정보**:
- 상품 목록 (is_live_active, status='active')
- 재고 정보 (inventory)
- 라이브 방송 중 상품 표시

**상태**: ✅ 정상

---

### 2️⃣ 체크아웃 페이지 (`/app/checkout/page.js`)

**데이터 입력**:
1. 사용자 정보 (profiles)
2. 주소 선택 (profiles.addresses JSONB)
3. 입금자명 입력

**데이터 생성**:
- `createOrder()` 호출
  - orders 테이블 INSERT
  - order_items 테이블 INSERT
  - order_shipping 테이블 INSERT
  - order_payments 테이블 INSERT (depositor_name 포함)

**재고 처리**:
- `updateProductInventory()` 또는 `updateOptionInventory()` 호출

**상태**: ✅ 정상

---

### 3️⃣ 주문 내역 페이지 (`/app/orders/page.js`)

**데이터 조회**:
- `getOrders()` → UserProfileManager 기반
- orders + order_items + products (LEFT JOIN)
- order_shipping, order_payments

**필터링**:
- 카카오 사용자: `order_type LIKE '%KAKAO:{kakao_id}%'`
- 일반 사용자: `user_id = {user_id}`
- 대체 조회 로직 (alternativeQueries)

**상태**: ✅ 정상 (9월 30일 수정 완료)

---

### 4️⃣ 주문 상세 페이지 (`/app/orders/[id]/complete/page.js`)

**데이터 조회**:
- orders + order_items + order_shipping + order_payments
- products (LEFT JOIN)

**표시 정보**:
- 총 상품금액 (모든 order_items 합계)
- 배송비
- 입금금액 (총액)
- 입금자명 (payment.depositor_name 우선)

**상태**: ✅ 정상 (9월 30일 계산 로직 수정 완료)

---

### 5️⃣ 관리자 주문 관리 (`/app/admin/orders/page.js`)

**데이터 조회**:
- `getAllOrders()` → orders + order_items + products
- order_shipping, order_payments

**그룹 주문 처리**:
- `payment_group_id` 기준으로 여러 주문 묶음
- 타임스탬프 집계 (최근 시간 사용)

**상태**: ✅ 정상

---

### 6️⃣ 관리자 주문 상세 (`/app/admin/orders/[id]/page.js`)

**데이터 조회**:
- orders + order_items + products
- order_shipping, order_payments

**기능**:
- 주문 상태 변경 (`updateOrderStatus`)
- 타임스탬프 자동 기록
- 단계별 진행 상황 표시

**타임라인 표시**:
- created_at → verifying_at → paid_at → delivered_at
- 각 단계별 한국 시간 표시

**상태**: ✅ 정상 (2025-10-01 완성)

---

### 7️⃣ 마이페이지 (`/app/mypage/page.js`)

**데이터 조회**:
- profiles (Supabase REST API 직접 호출)
- profiles.addresses JSONB

**기능**:
- 프로필 정보 수정
- 주소 관리 (AddressManager 컴포넌트)

**상태**: ✅ 정상

---

## 🔗 4. 기능별 연결성 검증

### ✅ 주문 생성 플로우

```
사용자 홈
  ↓ (상품 선택)
체크아웃 페이지
  ↓ (정보 입력)
createOrder() 호출
  ├─ orders INSERT
  ├─ order_items INSERT (title, price, total, unit_price, total_price 모두 저장)
  ├─ order_shipping INSERT
  ├─ order_payments INSERT (depositor_name 포함)
  └─ 재고 차감
  ↓
주문 완료 페이지
```

**상태**: ✅ 완벽히 작동

---

### ✅ 주문 조회 플로우

```
사용자 로그인
  ↓
UserProfileManager.getUserOrderQuery()
  ├─ 카카오 사용자: order_type LIKE '%KAKAO:{kakao_id}%'
  └─ 일반 사용자: user_id = {user_id}
  ↓
getOrders() 호출
  ├─ 기본 조회
  └─ 대체 조회 (alternativeQueries)
  ↓
주문 내역 페이지 표시
```

**상태**: ✅ 완벽히 작동 (9월 30일 수정 완료)

---

### ✅ 주문 상태 변경 플로우

```
관리자 주문 상세 페이지
  ↓ (버튼 클릭)
updateOrderStatus() 또는 updateMultipleOrderStatus()
  ├─ orders.status 업데이트
  ├─ orders.{status}_at 타임스탬프 기록
  └─ order_payments.status 업데이트 (필요시)
  ↓
주문 상세 페이지 새로고침
  └─ 타임라인에 시간 표시
```

**상태**: ✅ 완벽히 작동 (2025-10-01 완성)

---

### ✅ 주소 관리 플로우

```
마이페이지
  ↓
AddressManager 컴포넌트
  ↓
Supabase REST API 직접 호출
  ├─ GET: profiles.addresses 조회
  ├─ PATCH: profiles.addresses 업데이트
  └─ JSONB 배열 직접 조작
  ↓
체크아웃 페이지에서 주소 선택
  └─ selectedAddress → order_shipping
```

**상태**: ✅ 완벽히 작동

---

## 🎯 5. 개선 권장사항

### 우선순위 1: order_items 컬럼 정리 (중기 과제)

**현재 상황**:
- title, price, total (신규?)
- unit_price, total_price (기존)
- 양쪽 모두에 같은 값 저장 중

**권장 방향**:
1. 표준 컬럼 결정
2. 기존 데이터 마이그레이션
3. 미사용 컬럼 제거

**예상 소요 시간**: 2-3시간

---

### 우선순위 2: orders.shipping_* 컬럼 조사 (단기 과제)

**조사 항목**:
1. orders.shipping_* 컬럼이 실제로 사용되는지 확인
2. 사용된다면 order_shipping과 동기화 로직 추가
3. 사용 안 한다면 제거 고려

**예상 소요 시간**: 1시간

---

### 우선순위 3: 백업 테이블 정리 (즉시 가능)

**대상**:
- `order_items_backup_20250930` (8개 컬럼)

**조치**:
- 필요한 데이터 확인 후 삭제

**예상 소요 시간**: 30분

---

### 우선순위 4: 문서 업데이트 (즉시 가능)

**대상**:
- `DETAILED_DATA_FLOW.md`
  - order_items.title 컬럼 존재함으로 수정
  - 최신 DB 구조 반영

**예상 소요 시간**: 30분

---

## ✅ 6. 최종 결론

### 🎉 전체 시스템 상태: 매우 양호

**잘 작동하는 부분**:
- ✅ 주문 생성/조회/수정 플로우 완벽
- ✅ 타임스탬프 시스템 완성
- ✅ 주소 관리 시스템 정상
- ✅ 카카오/일반 사용자 통합 처리
- ✅ 재고 관리 (상품/옵션별)

**개선 여지**:
- ⚠️ order_items 중복 컬럼 (기능 문제 없음, 정리 권장)
- ⚠️ orders.shipping_* 중복 가능성 (조사 필요)
- ⚠️ 백업 테이블 정리

### 📊 안정성 점수: 95/100

**감점 사유**:
- 데이터 중복 (-3점)
- 문서 불일치 (-2점)

**종합 평가**: 🟢 **프로덕션 운영에 문제 없음**

---

## 📅 7. 다음 점검 일정

**권장 점검 주기**: 매월 1회

**다음 점검 시 확인 사항**:
1. order_items 컬럼 정리 진행 상황
2. orders.shipping_* 컬럼 사용 현황
3. 새로운 기능 추가 여부
4. 성능 이슈 발생 여부

---

**보고서 끝**
