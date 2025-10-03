# 🗄️ DB 참조 가이드 - 완전판

**최종 업데이트**: 2025-10-03
**목적**: 모든 작업 시 DB 구조를 정확히 참조하고 올바르게 사용하기 위한 필수 가이드

---

## 📋 목차

1. [DB 스키마 전체 구조](#1-db-스키마-전체-구조)
2. [테이블별 상세 스키마](#2-테이블별-상세-스키마)
3. [데이터 저장 패턴](#3-데이터-저장-패턴)
4. [데이터 조회 패턴](#4-데이터-조회-패턴)
5. [주의사항 및 함정](#5-주의사항-및-함정)
6. [코드 예제](#6-코드-예제)

---

## 1. DB 스키마 전체 구조

### 1.1 테이블 관계도

```
auth.users (Supabase Auth)
    ↓ (1:1)
profiles (사용자 프로필)
    ├─ addresses: JSONB (여러 주소)
    ├─ kakao_id: TEXT (카카오 로그인)
    └─ provider: TEXT (로그인 방식)

categories (카테고리)
    └─ products (상품) [1:N]

suppliers (업체)
    └─ products (상품) [1:N]

products (상품) ⭐ 핵심
    ├─ category_id → categories.id [N:1]
    ├─ supplier_id → suppliers.id [N:1]
    ├─ product_options (옵션) [1:N]
    │   └─ product_option_values (옵션 값) [1:N]
    └─ product_variants (변형 상품) [1:N]
        └─ variant_option_values (변형-옵션 매핑) [N:N]
            └─ product_option_values.id

orders (주문) ⭐ 핵심
    ├─ user_id → profiles.id (NULL 가능, 카카오 사용자)
    ├─ order_type (일반/카트/카카오 구분)
    ├─ payment_group_id (일괄결제 그룹)
    ├─ shipping_* (배송 정보 직접 저장)
    └─ *_at (타임스탬프 4개)

orders (1:N 관계)
    ├─ order_items (주문 상품들)
    │   ├─ product_id → products.id
    │   └─ variant_id → product_variants.id ⭐ 신규
    ├─ order_shipping (배송 정보)
    └─ order_payments (결제 정보)

purchase_order_batches (발주 이력) ⭐ 신규
    ├─ supplier_id → suppliers.id
    └─ order_ids: UUID[] (포함된 주문 배열)

cart_items (장바구니)
    ├─ user_id → auth.users.id
    └─ product_id → products.id

live_broadcasts (라이브 방송)
    └─ live_products (방송-상품 연결) [1:N]
        └─ product_id → products.id

reviews (리뷰)
    ├─ user_id → auth.users.id
    ├─ product_id → products.id
    └─ order_item_id → order_items.id

wishlist (찜)
    ├─ user_id → auth.users.id
    └─ product_id → products.id

coupons (쿠폰)
    └─ user_coupons (사용자별 쿠폰) [1:N]
        ├─ user_id → auth.users.id
        └─ order_id → orders.id

notifications (알림)
    └─ user_id → auth.users.id
```

---

## 2. 테이블별 상세 스키마

### 2.1 profiles (사용자 프로필)

```sql
CREATE TABLE profiles (
    -- 기본 정보
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    nickname TEXT,
    avatar_url TEXT,

    -- 연락처 및 주소
    phone TEXT,
    address TEXT,
    detail_address TEXT DEFAULT '',
    addresses JSONB DEFAULT '[]'::jsonb,  -- ⭐ 여러 주소 저장

    -- 로그인 정보
    provider TEXT DEFAULT 'email',  -- 'email', 'kakao', 'google' 등
    kakao_id TEXT,                  -- ⭐ 카카오 사용자 식별
    kakao_link TEXT,
    tiktok_id TEXT,
    youtube_id TEXT,

    -- 메타 정보
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**중요 포인트**:
- `id`는 auth.users(id)와 동일 (UUID)
- `kakao_id`로 카카오 로그인 사용자 식별
- `addresses`는 JSONB 배열 형태로 여러 주소 저장

---

### 2.2 categories (카테고리)

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    image_url TEXT,
    parent_id UUID REFERENCES categories(id),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**중요 포인트**:
- `parent_id`로 카테고리 계층 구조 지원
- `slug`로 URL 친화적 식별자

---

### 2.3 suppliers (업체)

```sql
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**중요 포인트**:
- `code`: 업체 코드 (고유 식별자)
- `contact_person`: 담당자명
- 발주 관리에서 활용

---

### 2.4 products (상품)

```sql
CREATE TABLE products (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    product_number VARCHAR(20),  -- '0001' ~ '9999'

    -- 가격 정보
    price NUMERIC(10,2) NOT NULL,
    compare_price NUMERIC(10,2),
    discount_rate INTEGER DEFAULT 0,
    purchase_price NUMERIC(10,2),  -- 매입가

    -- 이미지
    thumbnail_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,

    -- 분류 ⭐ FK 추가됨
    category VARCHAR(100),
    sub_category VARCHAR(100),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    tags TEXT[],

    -- 업체 정보 ⭐ FK 추가됨
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_sku TEXT,
    model_number TEXT,

    -- 재고 (전체 재고, variant별 재고는 product_variants에)
    inventory INTEGER DEFAULT 0,
    sku TEXT,

    -- Variant 시스템 ⭐ 신규
    option_count INTEGER DEFAULT 0,    -- 옵션 개수
    variant_count INTEGER DEFAULT 0,   -- 변형 상품 개수

    -- 상태
    status TEXT DEFAULT 'active',  -- 'active', 'draft', 'deleted'
    is_visible BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,

    -- 라이브 방송 관련
    is_live BOOLEAN DEFAULT false,
    is_live_active BOOLEAN DEFAULT false,
    live_priority INTEGER DEFAULT 0,
    live_start_time TIMESTAMPTZ,
    live_end_time TIMESTAMPTZ,

    -- 통계
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,

    -- 기타
    notes TEXT,

    -- 메타 정보
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**중요 포인트**:
- `product_number`: 0001~9999 자동 생성
- `category_id`: categories 테이블 FK
- `supplier_id`: suppliers 테이블 FK
- `purchase_price`: 매입가 (발주서에서 사용)
- `option_count`, `variant_count`: Variant 시스템 통계

---

### 2.5 product_options (상품 옵션) ⭐ Variant 시스템

```sql
CREATE TABLE product_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- '색상', '사이즈' 등
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**중요 포인트**:
- 옵션 이름만 저장 (예: "색상", "사이즈")
- 실제 값은 `product_option_values` 테이블에

---

### 2.6 product_option_values (옵션 값) ⭐ Variant 시스템

```sql
CREATE TABLE product_option_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
    value VARCHAR(100) NOT NULL,  -- '블랙', 'L', '66' 등
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**중요 포인트**:
- 옵션의 실제 값 저장
- 예: option_id가 "색상"이면 value는 "블랙", "화이트" 등

---

### 2.7 product_variants (변형 상품) ⭐ Variant 시스템 핵심

```sql
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE,  -- 예: '0005-66-블랙'
    inventory INTEGER DEFAULT 0,  -- ⭐ 재고 관리
    price_adjustment NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**중요 포인트**:
- **실제 재고는 여기서 관리** (products.inventory는 참고용)
- `sku`: 자동 생성 (제품번호-옵션값1-옵션값2)
- 각 옵션 조합마다 하나의 variant

---

### 2.8 variant_option_values (변형-옵션 매핑) ⭐ Variant 시스템

```sql
CREATE TABLE variant_option_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    option_value_id UUID NOT NULL REFERENCES product_option_values(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(variant_id, option_value_id)
);
```

**중요 포인트**:
- Variant와 옵션 값의 N:N 관계
- 예: variant_id="ABC" + option_value_id="블랙", "L" 2개 레코드

**Variant 시스템 데이터 흐름**:
```
product (상품)
  └─ product_options (옵션: 색상, 사이즈)
      └─ product_option_values (값: 블랙, L)
          └─ variant_option_values (매핑)
              └─ product_variants (변형: 블랙+L, 재고=10)
```

---

### 2.9 orders (주문) ⭐⭐⭐

```sql
CREATE TABLE orders (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_order_number VARCHAR(50) UNIQUE,  -- 'S251001-1234' 형식

    -- 사용자 정보
    user_id UUID REFERENCES auth.users(id),  -- ⚠️ NULL 가능 (카카오 사용자)

    -- 주문 상태
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending' (결제대기)
    -- 'verifying' (결제확인중)
    -- 'deposited' (입금확인완료) ⭐ 발주 대상
    -- 'paid' (결제완료)
    -- 'delivered' (발송완료)
    -- 'cancelled' (취소)

    -- 주문 타입 ⭐ 중요
    order_type VARCHAR(20) DEFAULT 'direct',
    -- 'direct' (일반 직접 구매)
    -- 'cart' (장바구니 구매)
    -- 'direct:KAKAO:1234567890' (카카오 사용자 직접 구매)
    -- 'cart:KAKAO:1234567890' (카카오 사용자 장바구니 구매)

    -- 결제 그룹
    payment_group_id VARCHAR(50),  -- 일괄결제 시 동일한 그룹 ID

    -- 금액
    total_amount NUMERIC(10,2),

    -- 배송 정보 (orders 테이블에 직접 저장) ⚠️ order_shipping과 중복
    shipping_name TEXT,
    shipping_phone TEXT,
    shipping_address TEXT,
    shipping_detail_address TEXT,

    -- 타임스탬프 ⭐ 중요
    verifying_at TIMESTAMPTZ,   -- 결제 확인중 시간 (고객이 체크아웃 완료)
    paid_at TIMESTAMPTZ,         -- 결제 완료 시간 (관리자가 입금 확인)
    delivered_at TIMESTAMPTZ,    -- 발송 완료 시간 (관리자가 발송 처리)
    cancelled_at TIMESTAMPTZ,    -- 주문 취소 시간

    -- 메타 정보
    created_at TIMESTAMPTZ DEFAULT NOW(),  -- 주문 생성 시간 (장바구니에 담은 시점)
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**중요 포인트**:
- `status = 'deposited'`: 입금확인 완료, **발주 대상 상태**
- 타임스탬프 흐름: `created_at` → `verifying_at` → `paid_at` → `delivered_at`

---

### 2.10 order_items (주문 상품) ⭐⭐⭐

```sql
CREATE TABLE order_items (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,  -- ⭐ 신규

    -- 상품 정보 (스냅샷)
    title TEXT NOT NULL,  -- ⭐ 주문 시점의 상품명 저장

    -- 수량
    quantity INTEGER NOT NULL DEFAULT 1,

    -- 가격 (⚠️ 중복 컬럼 주의)
    price NUMERIC(10,2),        -- 신규 컬럼
    unit_price NUMERIC(10,2),   -- 기존 컬럼 (동일한 값)

    -- 총액 (⚠️ 중복 컬럼 주의)
    total NUMERIC(10,2),        -- 신규 컬럼
    total_price NUMERIC(10,2) NOT NULL,  -- 기존 컬럼 (동일한 값)

    -- 옵션 (⭐ 이중 저장 전략)
    selected_options JSONB DEFAULT '{}'::jsonb,  -- 스냅샷 (주문 시점 옵션)
    variant_title TEXT,

    -- 상품 스냅샷
    sku TEXT,
    product_snapshot JSONB DEFAULT '{}'::jsonb,

    -- 메타 정보
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**⭐⭐⭐ 이중 저장 전략 (2025-10-02)**:
1. `selected_options` (JSONB): 주문 시점 옵션 스냅샷 (변경 불가)
2. `variant_id` (FK): 실시간 variant 정보 조회용

**왜 두 개?**
- `selected_options`: 과거 주문 호환성, 주문 이력 보존
- `variant_id`: 실시간 재고 관리, variant 정보 JOIN 조회

**조회 예시**:
```sql
SELECT
  order_items.*,
  product_variants.inventory,
  product_variants.sku
FROM order_items
LEFT JOIN product_variants ON order_items.variant_id = product_variants.id
```

---

### 2.11 purchase_order_batches (발주 이력) ⭐ 신규

```sql
CREATE TABLE purchase_order_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    download_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    order_ids UUID[] NOT NULL,  -- 포함된 주문 ID 배열
    adjusted_quantities JSONB,  -- 수량 조정 내역 {order_item_id: adjusted_qty}
    total_items INT NOT NULL,   -- 총 아이템 수
    total_amount INT NOT NULL,  -- 총 발주 금액
    status VARCHAR(20) DEFAULT 'completed',  -- 'completed', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255)  -- 다운로드한 관리자 이메일
);

-- 인덱스 (중요!)
CREATE INDEX idx_purchase_order_batches_supplier ON purchase_order_batches(supplier_id);
CREATE INDEX idx_purchase_order_batches_date ON purchase_order_batches(download_date DESC);
CREATE INDEX idx_purchase_order_batches_order_ids ON purchase_order_batches USING GIN(order_ids);
-- ⭐ GIN 인덱스: UUID 배열 검색 최적화 (order_ids @> ARRAY[...])
```

**중요 포인트**:
- 발주서 다운로드 시 자동 생성
- `order_ids`: UUID 배열, **GIN 인덱스로 배열 검색 최적화**
- `adjusted_quantities`: **{order_item_id: adjusted_quantity} JSONB 구조**
- **중복 발주 방지**: 이미 발주된 order_ids 자동 제외 (배열 검색)

**JSONB 구조 상세**:
```json
// adjusted_quantities 예시
{
  "abc123-uuid-order-item-id-1": 5,  // order_item_id: 조정된 수량
  "def456-uuid-order-item-id-2": 3,  // 원래 10개 → 3개로 조정
  "ghi789-uuid-order-item-id-3": 0   // 0으로 설정하면 해당 아이템 제외
}
```

**발주 중복 방지 로직**:
```javascript
// 1. 이미 발주 완료된 주문 ID 수집
const { data: completedBatches } = await supabase
  .from('purchase_order_batches')
  .select('order_ids')
  .eq('status', 'completed')

const completedOrderIds = new Set()
completedBatches?.forEach(batch => {
  // order_ids는 UUID 배열
  batch.order_ids?.forEach(id => completedOrderIds.add(id))
})

// 2. 발주 안 된 주문만 필터링
const pendingOrders = allOrders.filter(order =>
  !completedOrderIds.has(order.id)
)

console.log(`전체 ${allOrders.length}개 중 ${pendingOrders.length}개 발주 가능`)
```

**사용 패턴 (전체 프로세스)**:
```javascript
// 1. 입금확인 완료(deposited) 주문 조회
const { data: orders } = await supabase
  .from('orders')
  .select(`
    id,
    customer_order_number,
    order_items (
      id,
      quantity,
      products (
        title,
        supplier_id,
        purchase_price
      )
    )
  `)
  .eq('status', 'deposited')  // 입금확인 완료만
  .order('created_at', { ascending: false })

// 2. 이미 발주된 주문 제외
const { data: completedBatches } = await supabase
  .from('purchase_order_batches')
  .select('order_ids')
  .eq('status', 'completed')

const completedOrderIds = new Set()
completedBatches?.forEach(batch => {
  batch.order_ids?.forEach(id => completedOrderIds.add(id))
})

const pendingOrders = orders.filter(o => !completedOrderIds.has(o.id))

// 3. 업체별 그룹핑
const supplierMap = new Map()
pendingOrders.forEach(order => {
  order.order_items.forEach(item => {
    const supplierId = item.products.supplier_id
    if (!supplierMap.has(supplierId)) {
      supplierMap.set(supplierId, {
        items: [],
        totalAmount: 0
      })
    }
    const summary = supplierMap.get(supplierId)
    summary.items.push(item)
    summary.totalAmount += (item.products.purchase_price || 0) * item.quantity
  })
})

// 4. Excel 다운로드 시 batch 생성
const orderIds = [...new Set(items.map(item => item.order_id))]

await supabase.from('purchase_order_batches').insert({
  supplier_id: supplierId,
  order_ids: orderIds,  // ⭐ UUID 배열 (중복 방지용)
  adjusted_quantities: adjustedQty,  // ⭐ JSONB (수량 조정 내역)
  total_items: items.length,
  total_amount: totalAmount,
  status: 'completed',
  created_by: adminEmail
})

console.log(`✅ ${supplierName} 발주 완료: ${items.length}개 아이템`)
```

**GIN 인덱스 활용 (고급)**:
```sql
-- ✅ 특정 주문 ID를 포함하는 발주 batch 검색
SELECT * FROM purchase_order_batches
WHERE order_ids @> ARRAY['order-uuid-here']::uuid[];

-- ✅ 특정 주문 ID가 발주되었는지 확인
SELECT EXISTS(
  SELECT 1 FROM purchase_order_batches
  WHERE order_ids @> ARRAY['order-uuid-here']::uuid[]
    AND status = 'completed'
) AS is_already_ordered;

-- ✅ 여러 주문 ID 중 하나라도 포함하는 batch 찾기
SELECT * FROM purchase_order_batches
WHERE order_ids && ARRAY['uuid1', 'uuid2', 'uuid3']::uuid[];
```

**adjusted_quantities 활용 예시**:
```javascript
// 발주 수량 조정 시나리오
const adjustedQuantities = {}

orderItems.forEach(item => {
  // 기본: 원래 수량 그대로
  let finalQuantity = item.quantity

  // 재고 부족 시 수량 조정
  if (item.products.inventory < item.quantity) {
    finalQuantity = item.products.inventory
    console.warn(`⚠️ 재고 부족: ${item.products.title} (${item.quantity} → ${finalQuantity})`)
  }

  // 조정된 수량 기록
  if (finalQuantity !== item.quantity) {
    adjustedQuantities[item.id] = finalQuantity
  }
})

// batch 생성 시 저장
await supabase.from('purchase_order_batches').insert({
  // ...
  adjusted_quantities: adjustedQuantities  // 조정 내역 저장
})
```

---

### 2.12 order_shipping (배송 정보)

```sql
CREATE TABLE order_shipping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    detail_address TEXT,
    postal_code VARCHAR(10),
    memo TEXT,
    shipping_fee NUMERIC(10,2) DEFAULT 4000,
    shipping_method VARCHAR(50) DEFAULT 'standard',
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.13 order_payments (결제 정보)

```sql
CREATE TABLE order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    transaction_id VARCHAR(100),
    paid_at TIMESTAMPTZ,
    bank_name VARCHAR(50),
    account_number VARCHAR(50),
    depositor_name VARCHAR(100),  -- ⭐ 입금자명
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. 데이터 저장 패턴

### 3.1 Variant 상품 등록 (2025-10-02 신규)

**위치**: `/app/admin/products/new/page.js:359-532`

```javascript
// 1. 상품 생성
const { data: product } = await supabase
  .from('products')
  .insert({
    title: '상품명',
    price: 50000,
    product_number: '0005',
    option_count: 2,  // 색상, 사이즈
    variant_count: 4  // 2x2 = 4개 조합
  })
  .select()
  .single()

// 2. 옵션 생성
const optionsData = [
  { name: '색상', values: ['블랙', '화이트'] },
  { name: '사이즈', values: ['66', '77'] }
]

for (const option of optionsData) {
  // 2-1. product_options 생성
  const { data: createdOption } = await supabase
    .from('product_options')
    .insert({
      product_id: product.id,
      name: option.name
    })
    .select()
    .single()

  // 2-2. product_option_values 생성
  const valuesToInsert = option.values.map((value, index) => ({
    option_id: createdOption.id,
    value: value,
    display_order: index
  }))

  await supabase
    .from('product_option_values')
    .insert(valuesToInsert)
}

// 3. Variant 생성 (모든 조합)
const combinations = [
  { 색상: '블랙', 사이즈: '66' },
  { 색상: '블랙', 사이즈: '77' },
  { 색상: '화이트', 사이즈: '66' },
  { 색상: '화이트', 사이즈: '77' }
]

for (const combo of combinations) {
  // 3-1. SKU 생성
  const sku = `0005-${combo.사이즈}-${combo.색상}`

  // 3-2. product_variants 생성
  const { data: variant } = await supabase
    .from('product_variants')
    .insert({
      product_id: product.id,
      sku: sku,
      inventory: 10  // 재고
    })
    .select()
    .single()

  // 3-3. variant_option_values 매핑
  for (const [optionName, optionValue] of Object.entries(combo)) {
    // option_value_id 조회
    const { data: optionValue } = await supabase
      .from('product_option_values')
      .select('id')
      .eq('value', optionValue)
      .single()

    await supabase
      .from('variant_option_values')
      .insert({
        variant_id: variant.id,
        option_value_id: optionValue.id
      })
  }
}
```

---

### 3.2 주문 생성 (Variant 재고 차감)

**위치**: `/lib/supabaseApi.js`, `/app/components/product/BuyBottomSheet.jsx`

```javascript
// 1. Variant 찾기
const findVariantId = (product, selectedOptions) => {
  if (!product.variants || product.variants.length === 0) {
    return null
  }

  const variant = product.variants.find(v => {
    return Object.entries(selectedOptions).every(([optName, optValue]) => {
      return v.options.some(opt =>
        opt.optionName === optName && opt.optionValue === optValue
      )
    })
  })

  return variant?.id || null
}

// 2. Variant 재고 즉시 차감 (장바구니 담기 시)
const variantId = findVariantId(product, selectedOptions)

if (variantId) {
  const { error } = await supabase
    .from('product_variants')
    .update({
      inventory: supabase.raw('inventory - ?', [quantity])
    })
    .eq('id', variantId)

  if (error) {
    toast.error('재고 차감 실패')
    return
  }
}

// 3. 주문 생성
const { data: order } = await supabase
  .from('orders')
  .insert({
    customer_order_number: 'S251002-0001',
    user_id: userId,
    status: 'pending',
    total_amount: totalPrice
  })
  .select()
  .single()

// 4. order_items 생성 (⭐ variant_id 포함)
await supabase
  .from('order_items')
  .insert({
    order_id: order.id,
    product_id: product.id,
    variant_id: variantId,  // ⭐ 신규
    title: product.title,
    quantity: quantity,
    price: unitPrice,
    unit_price: unitPrice,
    total: totalPrice,
    total_price: totalPrice,
    selected_options: selectedOptions  // 스냅샷
  })

// ⚠️ 주의: variant_id가 있으면 createOrderWithOptions에서 재고 차감 스킵
```

---

### 3.3 주문 상태 변경 (updateOrderStatus)

```javascript
export const updateOrderStatus = async (orderId, status, paymentData = null) => {
  const now = new Date().toISOString()
  const updateData = {
    status: status,
    updated_at: now
  }

  // ⭐ 상태별 타임스탬프 자동 기록
  if (status === 'verifying') updateData.verifying_at = now
  if (status === 'deposited') updateData.paid_at = now  // 입금확인
  if (status === 'paid') updateData.paid_at = now
  if (status === 'delivered') updateData.delivered_at = now
  if (status === 'cancelled') updateData.cancelled_at = now

  await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
}
```

---

### 3.4 발주서 다운로드 및 완료 처리 (2025-10-02 신규)

**위치**: `/app/admin/purchase-orders/[supplierId]/page.js`

```javascript
const handleExcelDownload = async () => {
  // 1. Excel 생성 (생략)

  // 2. 발주 완료 batch 생성
  const orderIds = [...new Set(orderItems.map(item => item.orderId))]
  const adminEmail = localStorage.getItem('admin_email')

  const { error } = await supabase
    .from('purchase_order_batches')
    .insert({
      supplier_id: supplierId,
      order_ids: orderIds,  // UUID 배열
      adjusted_quantities: adjustedQuantities,  // {itemId: qty}
      total_items: orderItems.length,
      total_amount: totals.totalAmount,
      status: 'completed',
      created_by: adminEmail
    })

  if (error) throw error

  toast.success('발주 완료 처리되었습니다')
  router.push('/admin/purchase-orders')
}
```

---

## 4. 데이터 조회 패턴

### 4.1 Variant 포함 상품 조회 (2025-10-02)

```javascript
const { data: products } = await supabase
  .from('products')
  .select(`
    *,
    product_options (
      id,
      name,
      display_order,
      product_option_values (
        id,
        value,
        display_order
      )
    ),
    product_variants (
      id,
      sku,
      inventory,
      variant_option_values (
        product_option_values (
          value,
          product_options (
            name
          )
        )
      )
    )
  `)
  .eq('status', 'active')

// 데이터 가공
products.forEach(product => {
  product.variants = product.product_variants?.map(v => ({
    id: v.id,
    sku: v.sku,
    inventory: v.inventory,
    options: v.variant_option_values?.map(vov => ({
      optionName: vov.product_option_values.product_options.name,
      optionValue: vov.product_option_values.value
    }))
  }))
})
```

---

### 4.2 주문 조회 (Variant JOIN)

```javascript
const { data: orders } = await supabase
  .from('orders')
  .select(`
    *,
    order_items (
      *,
      products (
        title,
        thumbnail_url,
        price
      ),
      product_variants (
        id,
        sku,
        inventory,
        variant_option_values (
          product_option_values (
            value,
            product_options (
              name
            )
          )
        )
      )
    ),
    order_shipping (*),
    order_payments (*)
  `)
  .neq('status', 'cancelled')
  .order('created_at', { ascending: false })

// 데이터 가공
orders.forEach(order => {
  order.items = order.order_items.map(item => ({
    ...item,
    variantInfo: item.product_variants ? {
      sku: item.product_variants.sku,
      inventory: item.product_variants.inventory,
      options: item.product_variants.variant_option_values?.map(vov => ({
        name: vov.product_option_values.product_options.name,
        value: vov.product_option_values.value
      }))
    } : null
  }))
})
```

---

### 4.3 발주 대상 주문 조회 (2025-10-02)

```javascript
// 1. 입금확인 완료 주문 조회
const { data: orders } = await supabase
  .from('orders')
  .select(`
    id,
    customer_order_number,
    created_at,
    order_items (
      id,
      product_id,
      variant_id,
      title,
      quantity,
      price,
      selected_options,
      products (
        id,
        title,
        model_number,
        supplier_id,
        purchase_price,
        suppliers (
          id,
          name,
          code,
          contact_person,
          phone
        )
      ),
      product_variants (
        id,
        sku,
        variant_option_values (
          product_option_values (
            value,
            product_options (
              name
            )
          )
        )
      )
    )
  `)
  .eq('status', 'deposited')  // ⭐ 입금확인 완료
  .order('created_at', { ascending: false })

// 2. 이미 발주 완료된 주문 제외
const { data: completedBatches } = await supabase
  .from('purchase_order_batches')
  .select('order_ids')
  .eq('status', 'completed')

const completedOrderIds = new Set()
completedBatches?.forEach(batch => {
  batch.order_ids?.forEach(id => completedOrderIds.add(id))
})

// 3. 발주 안 된 주문만 필터링
const pendingOrders = orders.filter(order => !completedOrderIds.has(order.id))

// 4. 업체별 그룹핑
const supplierMap = new Map()
pendingOrders.forEach(order => {
  order.order_items?.forEach(item => {
    const supplierId = item.products?.supplier_id
    if (!supplierId) return

    if (!supplierMap.has(supplierId)) {
      supplierMap.set(supplierId, {
        supplier: item.products.suppliers,
        totalQuantity: 0,
        totalAmount: 0,
        items: []
      })
    }

    const summary = supplierMap.get(supplierId)
    summary.totalQuantity += item.quantity
    summary.totalAmount += (item.products.purchase_price || 0) * item.quantity
    summary.items.push(item)
  })
})
```

---

## 5. 주의사항 및 함정

### ⚠️ 5.1 재고 관리 - Variant vs Product

**문제**: 재고를 어디서 관리하나?

**답**:
- **Variant 있는 상품**: `product_variants.inventory` ⭐ 여기서 관리
- **Variant 없는 상품**: `products.inventory` 사용

```javascript
// ✅ 올바른 재고 확인
const getAvailableInventory = (product, selectedOptions) => {
  if (product.variants && product.variants.length > 0) {
    // Variant 상품: variant 재고 확인
    const variant = findVariant(product, selectedOptions)
    return variant ? variant.inventory : 0
  } else {
    // 일반 상품: product 재고 확인
    return product.inventory
  }
}
```

---

### ⚠️ 5.2 order_items 이중 저장 전략

**selected_options (JSONB)** vs **variant_id (FK)**

| 용도 | selected_options | variant_id |
|------|-----------------|------------|
| 주문 이력 보존 | ✅ 주문 시점 스냅샷 | ❌ variant 삭제 시 NULL |
| 실시간 정보 조회 | ❌ 과거 데이터 | ✅ JOIN으로 최신 정보 |
| 재고 관리 | ❌ 사용 안 함 | ✅ variant 재고 참조 |

**코드 예시**:
```javascript
// ✅ 저장 시: 둘 다 저장
await supabase.from('order_items').insert({
  variant_id: variantId,  // FK (실시간 조회용)
  selected_options: { 색상: '블랙', 사이즈: 'L' }  // 스냅샷 (보존용)
})

// ✅ 조회 시: variant JOIN
const { data } = await supabase
  .from('order_items')
  .select(`
    *,
    product_variants (sku, inventory)
  `)
```

---

### ⚠️ 5.3 재고 차감 타이밍 (이중 차감 방지)

**문제**: BuyBottomSheet + createOrderWithOptions = 이중 차감?

**해결**:
```javascript
// 1. BuyBottomSheet: variant 재고 즉시 차감 (장바구니 담기 시)
if (variantId) {
  await supabase
    .from('product_variants')
    .update({ inventory: raw('inventory - ?', [qty]) })
    .eq('id', variantId)
}

// 2. createOrderWithOptions: variant_id 있으면 재고 차감 스킵
if (orderData.variantId) {
  logger.info('ℹ️ variantId 존재, 재고 차감 스킵 (이미 차감됨)')
} else {
  await checkOptionInventory(...)  // 재고 차감
}
```

---

### ⚠️ 5.4 order_items 중복 컬럼

**문제**:
```sql
price / unit_price        -- 같은 값
total / total_price       -- 같은 값
```

**해결**:
```javascript
// ✅ 저장 시: 양쪽 모두 저장
const itemData = {
  price: unitPrice,
  unit_price: unitPrice,
  total: totalPrice,
  total_price: totalPrice
}

// ✅ 조회 시: 안전한 fallback
const unitPrice = item.unit_price || item.price
const totalPrice = item.total_price || item.total
```

---

### ⚠️ 5.5 발주서 중복 다운로드 방지

```javascript
// 1. 이미 발주된 주문 조회
const { data: completedBatches } = await supabase
  .from('purchase_order_batches')
  .select('order_ids')
  .eq('supplier_id', supplierId)
  .eq('status', 'completed')

// 2. 완료된 주문 ID Set 생성
const completedOrderIds = new Set()
completedBatches?.forEach(batch => {
  batch.order_ids?.forEach(id => completedOrderIds.add(id))
})

// 3. 발주 안 된 주문만 표시
const pendingOrders = orders.filter(order => !completedOrderIds.has(order.id))
```

---

## 6. 코드 예제

### 6.1 Variant 상품 재고 확인

```javascript
// 상품 + variants 조회
const { data: product } = await supabase
  .from('products')
  .select(`
    *,
    product_variants (
      id,
      sku,
      inventory,
      variant_option_values (
        product_option_values (
          value,
          product_options (name)
        )
      )
    )
  `)
  .eq('id', productId)
  .single()

// Variant 찾기
const findVariant = (selectedOptions) => {
  return product.product_variants.find(v => {
    return Object.entries(selectedOptions).every(([optName, optValue]) => {
      return v.variant_option_values.some(vov =>
        vov.product_option_values.product_options.name === optName &&
        vov.product_option_values.value === optValue
      )
    })
  })
}

const variant = findVariant({ 색상: '블랙', 사이즈: 'L' })
console.log('재고:', variant.inventory)
```

---

### 6.2 업체별 발주서 생성

```javascript
// 1. 입금확인 완료 주문 조회 (발주 안 된 것만)
const { data: orders } = await supabase
  .from('orders')
  .select(`
    id,
    order_items (
      quantity,
      products (
        title,
        purchase_price,
        supplier_id,
        suppliers (name, code)
      ),
      product_variants (sku)
    )
  `)
  .eq('status', 'deposited')

// 2. 발주 완료된 주문 제외
const { data: batches } = await supabase
  .from('purchase_order_batches')
  .select('order_ids')
  .eq('status', 'completed')

const completedIds = new Set()
batches?.forEach(b => b.order_ids.forEach(id => completedIds.add(id)))

const pendingOrders = orders.filter(o => !completedIds.has(o.id))

// 3. 업체별 그룹핑
const supplierOrders = {}
pendingOrders.forEach(order => {
  order.order_items.forEach(item => {
    const supplierId = item.products.supplier_id
    if (!supplierOrders[supplierId]) {
      supplierOrders[supplierId] = {
        supplier: item.products.suppliers,
        items: [],
        totalAmount: 0
      }
    }
    supplierOrders[supplierId].items.push(item)
    supplierOrders[supplierId].totalAmount +=
      item.products.purchase_price * item.quantity
  })
})

// 4. Excel 생성 및 발주 완료 처리
for (const [supplierId, data] of Object.entries(supplierOrders)) {
  // Excel 생성 (생략)

  // 발주 완료 기록
  await supabase.from('purchase_order_batches').insert({
    supplier_id: supplierId,
    order_ids: data.items.map(i => i.order_id),
    total_items: data.items.length,
    total_amount: data.totalAmount,
    status: 'completed'
  })
}
```

---

## 📌 빠른 참조 체크리스트

### Variant 상품 등록 체크리스트

- [ ] `product_options` 생성했는가?
- [ ] `product_option_values` 생성했는가?
- [ ] 모든 조합의 `product_variants` 생성했는가?
- [ ] `variant_option_values` 매핑했는가?
- [ ] SKU 자동 생성했는가?
- [ ] `option_count`, `variant_count` 업데이트했는가?

### 주문 생성 체크리스트

- [ ] `order_items.variant_id` 포함했는가?
- [ ] `order_items.selected_options` 저장했는가? (이중 저장)
- [ ] Variant 재고 차감했는가?
- [ ] 이중 차감 방지 로직 있는가?
- [ ] `order_items.title` 포함했는가?
- [ ] `price`, `unit_price` 양쪽 모두 저장했는가?
- [ ] `total`, `total_price` 양쪽 모두 저장했는가?

### 발주서 생성 체크리스트

- [ ] `status = 'deposited'` 주문만 조회하는가?
- [ ] `purchase_order_batches`에서 완료된 주문 제외하는가?
- [ ] 업체별로 정확히 그룹핑되는가?
- [ ] Excel 다운로드 시 batch 생성하는가?
- [ ] `order_ids` 배열에 모든 주문 포함했는가?
- [ ] `adjusted_quantities` JSONB에 수량 조정 내역 저장했는가?

---

## 7. 우편번호 및 배송비 계산 ⭐ 신규 (2025-10-03)

### 7.1 우편번호 시스템 구조

**데이터베이스 구조**:
```sql
-- profiles 테이블 (사용자 기본 정보)
ALTER TABLE profiles ADD COLUMN postal_code VARCHAR(10);

-- order_shipping 테이블 (주문 시점 스냅샷)
ALTER TABLE order_shipping ADD COLUMN postal_code VARCHAR(10);
```

**저장 패턴**:
- `profiles.postal_code`: 사용자가 설정한 **기본 우편번호** (마이페이지에서 수정 가능)
- `order_shipping.postal_code`: 주문 시점의 **우편번호 스냅샷** (변경 불가, 이력 보존)

**도서산간 배송비 규칙** (2025-10-03 기준):
```javascript
// /lib/shippingUtils.js
제주도: 63000-63644 → 기본 배송비 + 3,000원
울릉도: 40200-40240 → 기본 배송비 + 5,000원
기타 도서산간: → 기본 배송비 + 5,000원

// 예시
기본 배송비 4,000원 + 제주 추가 3,000원 = 총 7,000원
```

---

### 7.2 핵심 함수: formatShippingInfo()

**위치**: `/lib/shippingUtils.js`

```javascript
import { formatShippingInfo } from '@/lib/shippingUtils'

// 사용법
const shippingInfo = formatShippingInfo(baseShipping, postalCode)

// 입력 예시
formatShippingInfo(4000, "63001")  // 제주
formatShippingInfo(4000, "40210")  // 울릉도
formatShippingInfo(4000, "06000")  // 일반 지역

// 반환 객체 구조
{
  baseShipping: 4000,      // 기본 배송비
  surcharge: 3000,         // 도서산간 추가 배송비 (제주: 3000, 울릉도: 5000)
  totalShipping: 7000,     // 총 배송비 (baseShipping + surcharge)
  region: "제주",          // 지역명 ("제주", "울릉도", "기타 도서산간", "일반")
  isRemote: true           // 도서산간 여부 (true/false)
}
```

**함수 내부 로직**:
```javascript
// /lib/shippingUtils.js
export const formatShippingInfo = (baseShipping, postalCode) => {
  let surcharge = 0
  let region = "일반"
  let isRemote = false

  if (!postalCode) {
    return { baseShipping, surcharge, totalShipping: baseShipping, region, isRemote }
  }

  const code = parseInt(postalCode)

  // 제주: 63000-63644
  if (code >= 63000 && code <= 63644) {
    surcharge = 3000
    region = "제주"
    isRemote = true
  }
  // 울릉도: 40200-40240
  else if (code >= 40200 && code <= 40240) {
    surcharge = 5000
    region = "울릉도"
    isRemote = true
  }
  // 기타 도서산간 (필요 시 추가)
  // else if (...) {
  //   surcharge = 5000
  //   region = "기타 도서산간"
  //   isRemote = true
  // }

  return {
    baseShipping,
    surcharge,
    totalShipping: baseShipping + surcharge,
    region,
    isRemote
  }
}
```

---

### 7.3 적용 페이지 (100% 통합 완료)

**모든 배송비 계산 페이지에 필수 적용**:

| 페이지 | 경로 | 역할 | 우편번호 사용 |
|--------|------|------|--------------|
| ✅ 체크아웃 | `/checkout` | 주문 생성, 배송비 실시간 계산 | `profiles.postal_code` 조회 → `formatShippingInfo()` |
| ✅ 주문 상세 | `/orders/[id]/complete` | 주문 완료 내역 표시 | `order_shipping.postal_code` 조회 → 배송비 재계산 |
| ✅ 주문 목록 | `/orders` | 주문 리스트 표시 | `order_shipping.postal_code` 조회 → 배송비 표시 |
| ✅ 관리자 주문 리스트 | `/admin/orders` | 주문 관리 | `order_shipping.postal_code` 조회 → 배송비 표시 |
| ✅ 관리자 주문 상세 | `/admin/orders/[id]` | 주문 상세 관리 | `order_shipping.postal_code` 조회 → 배송비 표시 |
| ✅ 발송 관리 | `/admin/shipping` | 송장 번호 입력 | `order_shipping.postal_code` 조회 → 배송비 표시 |
| ✅ 마이페이지 | `/mypage` | 주소 관리 | `profiles.postal_code` 저장/수정 |

---

### 7.4 주문 생성 시 체크리스트

**⭐ 모든 주문 생성 시 필수 확인**:

```javascript
// ✅ 필수 단계 체크리스트
- [ ] 1. userProfile.postal_code 조회했는가?
- [ ] 2. formatShippingInfo(baseShipping, postalCode) 호출했는가?
- [ ] 3. shippingInfo.totalShipping 값 확인했는가?
- [ ] 4. order_shipping.postal_code에 우편번호 저장했는가?
- [ ] 5. order_shipping.shipping_fee에 totalShipping 저장했는가?
- [ ] 6. orders.total_amount에 배송비 포함했는가? (상품금액 + totalShipping)
- [ ] 7. 도서산간인 경우 UI에 추가 배송비 표시했는가?
```

**❌ 흔한 실수**:
```javascript
// ❌ 잘못된 예시: postal_code 없이 배송비 계산
const shippingFee = 4000  // 무조건 4,000원 (도서산간 무시)

// ❌ 잘못된 예시: postal_code 저장 누락
await supabase.from('order_shipping').insert({
  // postal_code 필드 누락!
  shipping_fee: 4000
})

// ✅ 올바른 예시
const postalCode = userProfile.postal_code || "06000"
const shippingInfo = formatShippingInfo(4000, postalCode)
await supabase.from('order_shipping').insert({
  postal_code: postalCode,  // ⭐ 필수!
  shipping_fee: shippingInfo.totalShipping
})
```

---

### 7.5 코드 예제 (실전)

#### 7.5.1 주문 생성 시 (체크아웃 페이지)

```javascript
// /app/checkout/page.js 또는 /lib/supabaseApi.js

// 1. 사용자 프로필에서 우편번호 가져오기
const userProfile = await UserProfileManager.getCurrentUser()
const postalCode = userProfile.postal_code || "06000"  // 기본값: 서울

console.log('사용자 우편번호:', postalCode)

// 2. 배송비 계산 (formatShippingInfo 사용 필수!)
const shippingInfo = formatShippingInfo(4000, postalCode)
console.log('배송비 정보:', shippingInfo)
// 제주: { baseShipping: 4000, surcharge: 3000, totalShipping: 7000, region: "제주", isRemote: true }
// 일반: { baseShipping: 4000, surcharge: 0, totalShipping: 4000, region: "일반", isRemote: false }

// 3. 주문 총액 계산 (상품금액 + 배송비)
const itemsTotal = orderData.items.reduce((sum, item) => sum + item.total_price, 0)
const totalAmount = itemsTotal + shippingInfo.totalShipping

console.log(`상품 금액: ${itemsTotal}원`)
console.log(`배송비: ${shippingInfo.totalShipping}원 (기본 ${shippingInfo.baseShipping} + 추가 ${shippingInfo.surcharge})`)
console.log(`총 결제 금액: ${totalAmount}원`)

// 4. 주문 생성
const { data: order } = await supabase
  .from('orders')
  .insert({
    user_id: userId,
    total_amount: totalAmount,  // ⭐ 배송비 포함
    status: 'pending'
  })
  .select()
  .single()

// 5. order_shipping 생성 (postal_code 저장 필수!)
await supabase.from('order_shipping').insert({
  order_id: order.id,
  name: shippingData.name,
  phone: shippingData.phone,
  address: shippingData.address,
  detail_address: shippingData.detail_address,
  postal_code: postalCode,  // ⭐ 주문 시점 우편번호 저장 (스냅샷)
  shipping_fee: shippingInfo.totalShipping  // ⭐ 계산된 배송비 저장
})

// 6. UI에 도서산간 안내 표시 (선택)
if (shippingInfo.isRemote) {
  toast.info(`${shippingInfo.region} 지역 추가 배송비 ${shippingInfo.surcharge.toLocaleString()}원`)
}
```

---

#### 7.5.2 주문 조회 시 (주문 상세 페이지)

```javascript
// /app/orders/[id]/complete/page.js

// 1. 주문 데이터 조회 (postal_code 포함)
const { data: order } = await supabase
  .from('orders')
  .select(`
    *,
    order_items (
      id,
      title,
      quantity,
      total_price
    ),
    order_shipping (
      name,
      phone,
      address,
      detail_address,
      postal_code,
      shipping_fee
    )
  `)
  .eq('id', orderId)
  .single()

// 2. 저장된 우편번호로 배송비 정보 재계산 (표시용)
const postalCode = order.order_shipping.postal_code
const shippingInfo = formatShippingInfo(4000, postalCode)

console.log('주문 시점 우편번호:', postalCode)
console.log('도서산간 지역:', shippingInfo.region)
console.log('추가 배송비:', shippingInfo.surcharge)

// 3. UI 렌더링
return (
  <div>
    <h2>배송 정보</h2>
    <p>주소: {order.order_shipping.address}</p>
    <p>우편번호: {postalCode}</p>

    <h2>결제 정보</h2>
    <p>상품 금액: {(order.total_amount - shippingInfo.totalShipping).toLocaleString()}원</p>
    <p>
      배송비: {shippingInfo.totalShipping.toLocaleString()}원
      {shippingInfo.isRemote && (
        <span className="text-orange-600">
          ({shippingInfo.region} 지역 추가 {shippingInfo.surcharge.toLocaleString()}원)
        </span>
      )}
    </p>
    <p className="font-bold">총 결제 금액: {order.total_amount.toLocaleString()}원</p>
  </div>
)
```

---

#### 7.5.3 마이페이지 - 우편번호 저장/수정

```javascript
// /app/mypage/page.js (AddressManager 컴포넌트)

const handlePostalCodeUpdate = async (newPostalCode) => {
  // 1. profiles 테이블 업데이트
  const { error } = await supabase
    .from('profiles')
    .update({ postal_code: newPostalCode })
    .eq('id', userId)

  if (error) {
    toast.error('우편번호 저장 실패')
    return
  }

  // 2. 배송비 미리보기
  const shippingInfo = formatShippingInfo(4000, newPostalCode)

  if (shippingInfo.isRemote) {
    toast.info(`${shippingInfo.region} 지역으로 설정되었습니다. 추가 배송비 ${shippingInfo.surcharge.toLocaleString()}원`)
  } else {
    toast.success('우편번호가 저장되었습니다.')
  }

  console.log('업데이트된 배송비:', shippingInfo)
}
```

---

#### 7.5.4 관리자 - 주문 리스트에서 배송비 표시

```javascript
// /app/admin/orders/page.js

const { data: orders } = await supabase
  .from('orders')
  .select(`
    id,
    customer_order_number,
    total_amount,
    order_shipping (
      postal_code,
      shipping_fee,
      address
    )
  `)
  .order('created_at', { ascending: false })

// 각 주문의 배송비 정보 계산
const ordersWithShippingInfo = orders.map(order => {
  const postalCode = order.order_shipping.postal_code
  const shippingInfo = formatShippingInfo(4000, postalCode)

  return {
    ...order,
    shippingRegion: shippingInfo.region,
    isRemoteArea: shippingInfo.isRemote,
    shippingSurcharge: shippingInfo.surcharge
  }
})

console.log('도서산간 주문 수:', ordersWithShippingInfo.filter(o => o.isRemoteArea).length)
```

---

### 7.6 트러블슈팅

#### 문제 1: 배송비가 항상 4,000원으로 계산됨
**원인**: `formatShippingInfo()` 미사용
**해결**:
```javascript
// ❌ 잘못된 코드
const shippingFee = 4000

// ✅ 올바른 코드
const shippingInfo = formatShippingInfo(4000, postalCode)
const shippingFee = shippingInfo.totalShipping
```

#### 문제 2: 주문 후 배송비가 변경됨
**원인**: `order_shipping.postal_code` 저장 누락
**해결**: 주문 생성 시 반드시 `postal_code` 저장 (스냅샷)

#### 문제 3: 우편번호가 null 또는 빈 문자열
**원인**: 신규 사용자 또는 마이페이지 미설정
**해결**:
```javascript
const postalCode = userProfile.postal_code || "06000"  // 기본값 설정
```

---

### 7.7 주의사항 및 베스트 프랙티스

**⭐ 반드시 지킬 것**:
1. **모든 주문 생성 시** `formatShippingInfo()` 사용
2. **order_shipping.postal_code** 반드시 저장 (주문 이력 보존)
3. **orders.total_amount**에 배송비 포함 (상품금액 + 배송비)
4. **UI에 도서산간 안내** 표시 (사용자 경험)

**권장 사항**:
- 우편번호 없는 사용자: 기본값 "06000" (서울) 사용
- 체크아웃 페이지: 실시간 배송비 계산 표시
- 관리자 페이지: 도서산간 주문 필터링 기능

**성능 최적화**:
- `formatShippingInfo()`는 순수 함수 → 캐싱 가능
- 주문 조회 시 `postal_code` 인덱스 활용

---

**이 문서를 항상 참고하여 DB 작업을 수행하세요!**

**최종 업데이트**: 2025-10-03 (Section 2.14 & Section 7 완전 개선)
**문서 상태**: 100% 최신 (Variant 시스템, 발주 시스템, 우편번호 시스템 완전 반영)
