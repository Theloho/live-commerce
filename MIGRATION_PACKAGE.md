# 🚀 라이브커머스 시스템 마이그레이션 패키지

**작성일**: 2025-11-18
**시스템**: Next.js 15 + Supabase (PostgreSQL)
**목적**: 새로운 쇼핑몰로 데이터 마이그레이션

---

## 📋 목차

1. [전달 파일 체크리스트](#1-전달-파일-체크리스트)
2. [데이터베이스 스키마](#2-데이터베이스-스키마)
3. [데이터 Export 가이드](#3-데이터-export-가이드)
4. [주의사항 및 특이사항](#4-주의사항-및-특이사항)
5. [비즈니스 로직 설명](#5-비즈니스-로직-설명)
6. [마이그레이션 체크리스트](#6-마이그레이션-체크리스트)

---

## 1. 전달 파일 체크리스트

### ✅ 필수 문서 (반드시 전달!)

- [ ] **MIGRATION_PACKAGE.md** (이 파일)
- [ ] **DB_REFERENCE_GUIDE.md** - 전체 DB 스키마 및 사용법
- [ ] **SYSTEM_ARCHITECTURE.md** - 시스템 구조
- [ ] **DETAILED_DATA_FLOW.md** - 페이지별 데이터 흐름
- [ ] **CODING_RULES.md** - 코딩 규칙 및 중앙화 모듈
- [ ] **DATA_ARCHITECTURE.md** - API 매핑
- [ ] **COUPON_SYSTEM.md** - 쿠폰 시스템 완벽 가이드

### ✅ 데이터 파일

- [ ] **full_data_backup.sql** - 전체 데이터 덤프
- [ ] **profiles.csv** - 사용자 프로필
- [ ] **orders.csv** - 주문 내역
- [ ] **order_items.csv** - 주문 상품
- [ ] **products.csv** - 상품 정보
- [ ] **product_variants.csv** - 상품 옵션
- [ ] **coupons.csv** - 쿠폰 정보
- [ ] **categories.csv** - 카테고리
- [ ] **suppliers.csv** - 공급업체

### ✅ 스키마 파일

- [ ] **supabase_schema.sql** - 전체 테이블 구조
- [ ] **supabase_rls_policies.sql** - RLS 정책
- [ ] **supabase_functions.sql** - DB 함수/트리거

### ✅ 환경 변수 템플릿

- [ ] **.env.example** - 필요한 환경 변수 리스트

### ✅ 이미지/미디어 파일

- [ ] **product_images/** - 상품 이미지 폴더
- [ ] **category_images/** - 카테고리 이미지
- [ ] **image_mapping.csv** - 이미지 URL 매핑 테이블

---

## 2. 데이터베이스 스키마

### 2.1 테이블 개수: 22개

**핵심 테이블 (16개):**

#### 📦 주문 시스템 (4개)
- `orders` - 주문 마스터
- `order_items` - 주문 상품 (주문:상품 = 1:N)
- `order_payments` - 결제 정보
- `order_shipping` - 배송 정보

#### 🛍️ 상품 시스템 (5개)
- `products` - 상품 마스터
- `product_options` - 옵션 (사이즈, 컬러)
- `product_option_values` - 옵션 값 (XL, 블랙)
- `product_variants` - 변형 상품 (XL+블랙 조합)
- `variant_option_values` - 변형-옵션 매핑

#### 👤 사용자 시스템 (3개)
- `profiles` - 사용자 프로필 (Supabase Auth 연결)
- `cart_items` - 장바구니
- `wishlist` - 찜 목록

#### 🎟️ 쿠폰 시스템 (2개)
- `coupons` - 쿠폰 마스터
- `user_coupons` - 사용자별 쿠폰 (발급/사용 이력)

#### 🏢 관리 시스템 (4개)
- `categories` - 카테고리
- `suppliers` - 공급업체
- `purchase_order_batches` - 발주 이력
- `admin_permissions` - 관리자 권한

#### 📺 라이브 시스템 (2개)
- `live_broadcasts` - 라이브 방송
- `live_products` - 방송-상품 연결

**관리자 시스템 (2개):**
- `admins` - 관리자 계정 (별도 인증)
- `admin_sessions` - 관리자 세션

**기타 (4개):**
- `reviews` - 리뷰
- `notifications` - 알림

---

## 3. 데이터 Export 가이드

### 3.1 Supabase에서 데이터 추출

#### 방법 1: SQL 덤프 (추천)

```bash
# 전체 스키마 + 데이터
pg_dump \
  -h db.YOUR_PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  > full_backup_$(date +%Y%m%d_%H%M%S).sql

# 스키마만 (테이블 구조)
pg_dump \
  -h db.YOUR_PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --schema-only \
  > schema_only.sql

# 데이터만
pg_dump \
  -h db.YOUR_PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --data-only \
  > data_only.sql
```

**Supabase 연결 정보 확인:**
```
Project Settings > Database > Connection String
```

#### 방법 2: CSV Export (테이블별)

```sql
-- Supabase SQL Editor에서 실행
-- 1. 사용자 데이터
COPY (
  SELECT * FROM profiles
  ORDER BY created_at
) TO STDOUT WITH CSV HEADER;

-- 2. 주문 데이터 (최근 1년)
COPY (
  SELECT * FROM orders
  WHERE created_at >= NOW() - INTERVAL '1 year'
  ORDER BY created_at DESC
) TO STDOUT WITH CSV HEADER;

-- 3. 주문 상품
COPY (
  SELECT oi.* FROM order_items oi
  INNER JOIN orders o ON oi.order_id = o.id
  WHERE o.created_at >= NOW() - INTERVAL '1 year'
  ORDER BY oi.created_at DESC
) TO STDOUT WITH CSV HEADER;

-- 4. 상품 데이터
COPY (
  SELECT * FROM products
  WHERE deleted_at IS NULL
  ORDER BY created_at
) TO STDOUT WITH CSV HEADER;

-- 5. 상품 옵션 (Variants)
COPY (
  SELECT * FROM product_variants
  ORDER BY product_id, created_at
) TO STDOUT WITH CSV HEADER;

-- 6. 쿠폰 데이터
COPY (
  SELECT * FROM coupons
  WHERE deleted_at IS NULL
  ORDER BY created_at
) TO STDOUT WITH CSV HEADER;

-- 7. 사용자 쿠폰 이력
COPY (
  SELECT * FROM user_coupons
  ORDER BY created_at DESC
) TO STDOUT WITH CSV HEADER;
```

#### 방법 3: API를 통한 Export

```javascript
// export-data.js
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ 서비스 키 사용
)

async function exportAllData() {
  const tables = [
    'profiles',
    'orders',
    'order_items',
    'order_payments',
    'order_shipping',
    'products',
    'product_variants',
    'coupons',
    'user_coupons',
    'categories',
    'suppliers'
  ]

  for (const table of tables) {
    console.log(`Exporting ${table}...`)

    let allData = []
    let page = 0
    const pageSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(`Error exporting ${table}:`, error)
        break
      }

      if (!data || data.length === 0) break

      allData = [...allData, ...data]
      page++

      if (data.length < pageSize) break
    }

    // JSON 파일로 저장
    fs.writeFileSync(
      `./export/${table}.json`,
      JSON.stringify(allData, null, 2)
    )

    console.log(`✅ ${table}: ${allData.length}건 저장`)
  }
}

exportAllData()
```

**실행:**
```bash
mkdir export
node export-data.js
```

---

## 4. 주의사항 및 특이사항

### ⚠️ 매우 중요한 데이터 구조 특이사항

#### 4.1 주문 시스템 (orders, order_items)

**🔴 중복 컬럼 주의!**

`order_items` 테이블에 **의도적인 중복 저장**:
- `price` = `unit_price` (같은 값)
- `total` = `total_price` (같은 값)

**이유**: 레거시 호환성
**마이그레이션 시**: 양쪽 모두 저장해야 함!

```sql
-- ❌ 잘못된 INSERT
INSERT INTO order_items (product_id, price, quantity)
VALUES (uuid, 10000, 2);

-- ✅ 올바른 INSERT
INSERT INTO order_items (
  product_id,
  price, unit_price,      -- 둘 다 저장!
  total, total_price,     -- 둘 다 저장!
  quantity
) VALUES (
  uuid,
  10000, 10000,           -- 같은 값
  20000, 20000,           -- 같은 값
  2
);
```

#### 4.2 사용자 인증 (profiles)

**카카오 사용자 처리:**
- `user_id`: NULL 가능! (카카오 사용자는 auth.users 없음)
- `kakao_id`: TEXT (카카오 고유 ID)
- `order_type`: `"direct:KAKAO:1234567890"` 형식

**주문 조회 시:**
```javascript
// ❌ 잘못된 조회
const orders = await supabase
  .from('orders')
  .select('*')
  .eq('user_id', userId)  // 카카오 사용자는 NULL!

// ✅ 올바른 조회
const orders = await supabase
  .from('orders')
  .select('*')
  .or(`user_id.eq.${userId},order_type.like.%KAKAO:${kakaoId}%`)
```

#### 4.3 상품 옵션 (Product Variants)

**복잡한 관계 구조:**
```
products (상품)
  ├─ product_options (옵션 타입: 사이즈, 컬러)
  │   └─ product_option_values (옵션 값: XL, 블랙)
  └─ product_variants (조합: XL+블랙)
      └─ variant_option_values (매핑 테이블)
          └─ product_option_values.id
```

**예시:**
```sql
-- 1. 상품 생성
INSERT INTO products (id, title) VALUES ('prod-1', '티셔츠');

-- 2. 옵션 타입 생성
INSERT INTO product_options (id, product_id, name)
VALUES ('opt-1', 'prod-1', '사이즈'),
       ('opt-2', 'prod-1', '컬러');

-- 3. 옵션 값 생성
INSERT INTO product_option_values (id, option_id, value)
VALUES ('val-1', 'opt-1', 'XL'),
       ('val-2', 'opt-1', 'L'),
       ('val-3', 'opt-2', '블랙'),
       ('val-4', 'opt-2', '화이트');

-- 4. 조합 생성 (XL+블랙)
INSERT INTO product_variants (id, product_id, sku, stock_quantity)
VALUES ('var-1', 'prod-1', 'TS-XL-BLK', 100);

-- 5. 매핑 테이블
INSERT INTO variant_option_values (variant_id, option_value_id)
VALUES ('var-1', 'val-1'),  -- XL
       ('var-1', 'val-3');  -- 블랙
```

**⚠️ 중요**: 모든 조합을 미리 생성해야 함!

#### 4.4 쿠폰 시스템

**중요 컬럼:**
- `coupons.available_count`: 전체 발급 가능 개수
- `user_coupons.is_used`: 사용 여부
- `user_coupons.order_id`: 사용된 주문 (NULL 가능)

**제약 조건 제거됨 (2025-10-06):**
```sql
-- ❌ 과거: UNIQUE(user_id, coupon_id) 제약
-- ✅ 현재: 제약 없음 (같은 쿠폰 여러 번 발급 가능)
```

**쿠폰 사용 로직:**
```javascript
// 1. 사용 가능 여부 확인
const { data: userCoupon } = await supabase
  .from('user_coupons')
  .select('*, coupons(*)')
  .eq('id', userCouponId)
  .eq('is_used', false)
  .single()

// 2. 쿠폰 사용 처리
await supabase
  .from('user_coupons')
  .update({
    is_used: true,
    order_id: orderId,
    used_at: new Date().toISOString()
  })
  .eq('id', userCouponId)

// 3. 쿠폰 남은 개수 차감
await supabase.rpc('decrement_coupon_count', {
  coupon_id: couponId
})
```

#### 4.5 배송비 계산

**우편번호 기반 도서산간 배송비:**
```javascript
import { REMOTE_AREA_POSTCODES } from '@/lib/constants'

function calculateShippingFee(postalCode, orderAmount) {
  const FREE_SHIPPING_THRESHOLD = 50000
  const BASE_SHIPPING_FEE = 3000
  const REMOTE_AREA_FEE = 5000

  // 1. 50,000원 이상 무료배송
  if (orderAmount >= FREE_SHIPPING_THRESHOLD) {
    return 0
  }

  // 2. 도서산간 지역 체크
  const isRemoteArea = REMOTE_AREA_POSTCODES.some(code =>
    postalCode.startsWith(code)
  )

  return isRemoteArea ? REMOTE_AREA_FEE : BASE_SHIPPING_FEE
}
```

**우편번호 저장 위치 (2개):**
1. `profiles.postal_code` - 사용자 기본 우편번호
2. `order_shipping.postal_code` - 주문 시점 우편번호 (변경 가능)

**⚠️ 중요**: 배송비 계산은 `order_shipping.postal_code` 사용!

#### 4.6 재고 관리

**옵션 없는 상품:**
- `products.stock_quantity` 사용

**옵션 있는 상품:**
- `product_variants.stock_quantity` 사용
- `products.stock_quantity` 무시

**재고 업데이트 (동시성 제어):**
```sql
-- RPC 함수 사용 (Race Condition 방지)
-- 옵션 없는 상품
SELECT updateProductInventory(product_id, quantity);

-- 옵션 있는 상품
SELECT updateVariantInventory(variant_id, quantity);
```

#### 4.7 RLS (Row Level Security) 정책

**매우 중요!**

모든 테이블에 RLS 활성화:
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ... (모든 테이블)
```

**주요 정책:**
```sql
-- 1. 사용자는 자신의 주문만 조회
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- 2. 관리자는 모든 주문 조회
CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 3. 모든 사용자는 상품 조회 가능
CREATE POLICY "Anyone can view products"
ON products FOR SELECT
USING (true);
```

**⚠️ 마이그레이션 시 주의**: RLS 정책도 함께 이관해야 함!

---

## 5. 비즈니스 로직 설명

### 5.1 주문 생성 플로우

```javascript
// 1. 주문 생성
const order = await createOrder({
  user_id,           // NULL 가능 (카카오)
  order_type,        // "cart", "direct:KAKAO:123", etc
  total_amount,
  discount_amount,   // 쿠폰 할인
  payment_group_id,  // 일괄결제 그룹 (옵션)
  status: 'pending'
})

// 2. 주문 상품 추가
for (const item of cartItems) {
  await createOrderItem({
    order_id: order.id,
    product_id: item.product_id,
    variant_id: item.variant_id,  // NULL 가능
    quantity: item.quantity,
    price: item.price,
    unit_price: item.price,        // ⚠️ 중복!
    total: item.price * item.quantity,
    total_price: item.price * item.quantity,  // ⚠️ 중복!
    title: item.title,
    thumbnail_url: item.thumbnail_url
  })
}

// 3. 배송 정보 저장
await createOrderShipping({
  order_id: order.id,
  name,
  phone,
  postal_code,       // ⚠️ 배송비 계산에 사용!
  address,
  detail_address,
  memo
})

// 4. 재고 차감 (동시성 제어)
for (const item of cartItems) {
  if (item.variant_id) {
    await supabase.rpc('updateVariantInventory', {
      variant_id: item.variant_id,
      quantity_change: -item.quantity
    })
  } else {
    await supabase.rpc('updateProductInventory', {
      product_id: item.product_id,
      quantity_change: -item.quantity
    })
  }
}

// 5. 쿠폰 사용 처리 (있는 경우)
if (userCouponId) {
  await supabase
    .from('user_coupons')
    .update({
      is_used: true,
      order_id: order.id,
      used_at: new Date().toISOString()
    })
    .eq('id', userCouponId)
}

// 6. 장바구니 비우기
if (order_type === 'cart') {
  await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', user_id)
}
```

### 5.2 배송비 계산 로직

```javascript
// lib/orderCalculations.js
import { formatShippingInfo } from '@/lib/shipping'

// ⚠️ 이 함수를 반드시 사용해야 함!
export function calculateOrderShipping(cartItems, postalCode) {
  const subtotal = cartItems.reduce((sum, item) =>
    sum + (item.price * item.quantity), 0
  )

  // formatShippingInfo 중앙화 함수 사용
  const { shipping_fee, free_shipping } = formatShippingInfo(
    subtotal,
    postalCode
  )

  return {
    subtotal,
    shipping_fee,
    total: subtotal + shipping_fee,
    free_shipping
  }
}
```

**⚠️ 절대 직접 계산하지 말 것!**

### 5.3 일괄결제 (Payment Group)

**여러 주문을 하나의 결제로 처리:**

```javascript
// 1. 일괄결제 그룹 생성
const payment_group_id = generateUUID()

// 2. 여러 주문 생성 (같은 그룹)
for (const supplierOrder of supplierOrders) {
  await createOrder({
    ...supplierOrder,
    payment_group_id,  // ⚠️ 같은 ID 사용
    status: 'pending'
  })
}

// 3. 결제 완료 시 모두 업데이트
await supabase
  .from('orders')
  .update({ status: 'paid' })
  .eq('payment_group_id', payment_group_id)
```

**관리자 페이지에서 그룹핑 표시:**
```javascript
// 같은 payment_group_id로 묶어서 표시
const groupedOrders = orders.reduce((acc, order) => {
  const groupId = order.payment_group_id || order.id
  if (!acc[groupId]) acc[groupId] = []
  acc[groupId].push(order)
  return acc
}, {})
```

---

## 6. 마이그레이션 체크리스트

### ✅ 사전 준비 (D-7일)

- [ ] 현재 데이터 규모 파악
  - [ ] 총 사용자 수
  - [ ] 총 주문 수
  - [ ] 총 상품 수
  - [ ] 이미지 파일 용량

- [ ] 백업 실행
  - [ ] 전체 SQL 덤프
  - [ ] 테이블별 CSV
  - [ ] 이미지 파일 다운로드

- [ ] 데이터 검증
  - [ ] 주문 무결성 체크
  - [ ] 상품 이미지 누락 체크
  - [ ] 재고 음수 체크

### ✅ 문서 전달 (D-5일)

- [ ] **DB_REFERENCE_GUIDE.md** 전달
- [ ] **MIGRATION_PACKAGE.md** (이 파일) 전달
- [ ] **SYSTEM_ARCHITECTURE.md** 전달
- [ ] **CODING_RULES.md** 전달
- [ ] 스키마 SQL 파일 전달
- [ ] 데이터 CSV/JSON 파일 전달

### ✅ 개발사 검토 (D-3일)

- [ ] 새 시스템 DB 스키마 확인
- [ ] 매핑 테이블 확인 (ID 변환 필요?)
- [ ] 특이사항 이해 확인
  - [ ] order_items 중복 컬럼
  - [ ] 카카오 사용자 처리
  - [ ] product_variants 구조
  - [ ] 쿠폰 시스템
  - [ ] 배송비 계산 로직

### ✅ 테스트 마이그레이션 (D-1일)

- [ ] 스테이징 환경에 데이터 Import
- [ ] 주요 기능 테스트
  - [ ] 로그인 (이메일/카카오)
  - [ ] 상품 조회
  - [ ] 장바구니
  - [ ] 주문 생성
  - [ ] 배송비 계산
  - [ ] 쿠폰 사용
- [ ] 데이터 검증
  - [ ] 주문 개수 일치
  - [ ] 상품 개수 일치
  - [ ] 사용자 개수 일치

### ✅ 본 마이그레이션 (D-Day)

- [ ] 현재 사이트 점검 모드
- [ ] 최종 데이터 Export
- [ ] 새 시스템으로 Import
- [ ] 데이터 검증 (테스트 시나리오)
- [ ] DNS 전환 또는 배포
- [ ] 모니터링 시작

### ✅ 사후 관리 (D+7일)

- [ ] 주문 생성 모니터링
- [ ] 재고 동기화 확인
- [ ] 사용자 문의 대응
- [ ] 버그 수정

---

## 7. 긴급 연락처 및 지원

### 현재 시스템 정보

```
프로젝트: 라이브 커머스
기술 스택: Next.js 15 + Supabase
Supabase Project ID: [여기에 입력]
Vercel Project: [여기에 입력]
```

### 주요 API 엔드포인트

```
/api/orders - 주문 관리
/api/products - 상품 관리
/api/cart - 장바구니
/api/checkout - 결제
/api/admin/* - 관리자 API
```

### 환경 변수 (새 시스템에서 설정 필요)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 결제 (아임포트)
NEXT_PUBLIC_IAMPORT_ID=
IAMPORT_API_KEY=
IAMPORT_API_SECRET=

# 카카오 로그인
NEXT_PUBLIC_KAKAO_JS_KEY=
KAKAO_REST_API_KEY=

# 기타
NEXT_PUBLIC_SITE_URL=
```

---

## 8. 추가 참고 자료

- **Supabase 공식 문서**: https://supabase.com/docs
- **Next.js 15 문서**: https://nextjs.org/docs
- **PostgreSQL 마이그레이션 가이드**: https://www.postgresql.org/docs/current/backup.html

---

**작성자**: Claude (AI Assistant)
**최종 업데이트**: 2025-11-18
**버전**: 1.0
