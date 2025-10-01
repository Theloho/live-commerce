# 🗄️ DB 참조 가이드 - 완전판

**최종 업데이트**: 2025-10-01
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

products (상품)
    ├─ product_options (옵션) [1:N]
    └─ categories (카테고리) [N:1]

orders (주문) ⭐ 핵심
    ├─ user_id → profiles.id (NULL 가능, 카카오 사용자)
    ├─ order_type (일반/카트/카카오 구분)
    ├─ payment_group_id (일괄결제 그룹)
    ├─ shipping_* (배송 정보 직접 저장)
    └─ *_at (타임스탬프 4개)

orders (1:N 관계)
    ├─ order_items (주문 상품들)
    │   └─ product_id → products.id
    ├─ order_shipping (배송 정보)
    └─ order_payments (결제 정보)

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

**addresses JSONB 구조**:
```json
[
  {
    "id": 1234567890,
    "label": "집",
    "address": "서울시 강남구...",
    "detail_address": "101동 101호",
    "is_default": true,
    "created_at": "2025-10-01T..."
  },
  {
    "id": 1234567891,
    "label": "회사",
    "address": "서울시 서초구...",
    "detail_address": "5층",
    "is_default": false,
    "created_at": "2025-10-01T..."
  }
]
```

---

### 2.2 products (상품)

```sql
CREATE TABLE products (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- 가격 정보
    price NUMERIC(10,2) NOT NULL,
    compare_price NUMERIC(10,2),
    discount_rate INTEGER DEFAULT 0,

    -- 이미지
    thumbnail_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,

    -- 분류
    category VARCHAR(100),
    sub_category VARCHAR(100),
    category_id UUID REFERENCES categories(id),
    tags TEXT[],

    -- 재고
    inventory INTEGER DEFAULT 0,
    sku TEXT,

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
- `status`: 'active' (활성), 'draft' (임시저장), 'deleted' (삭제됨)
- `inventory`: 전체 재고 (옵션별 재고는 product_options에)
- `is_live_active`: 현재 라이브 방송 중인지 여부

---

### 2.3 orders (주문) ⭐⭐⭐

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

    -- 타임스탬프 ⭐ 중요 (2025-10-01 추가)
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

1. **user_id는 NULL 가능**
   - 카카오 로그인 사용자는 auth.users에 없을 수 있음
   - 대신 `order_type`에 카카오 ID 포함

2. **order_type 패턴**:
   ```javascript
   // 일반 사용자
   order_type = 'direct'  // 직접 구매
   order_type = 'cart'    // 장바구니 구매

   // 카카오 사용자
   order_type = 'direct:KAKAO:1234567890'  // 카카오 ID 포함
   order_type = 'cart:KAKAO:1234567890'
   ```

3. **타임스탬프 흐름**:
   ```
   created_at (장바구니 담기)
      ↓
   verifying_at (체크아웃 완료, "전체결제" 버튼 클릭)
      ↓
   paid_at (관리자가 "입금 확인" 버튼 클릭)
      ↓
   delivered_at (관리자가 "발송 처리" 버튼 클릭)
   ```

4. **payment_group_id**:
   - 여러 주문을 한 번에 결제할 때 사용
   - 같은 그룹 ID를 가진 주문들은 묶어서 표시

---

### 2.4 order_items (주문 상품) ⭐

```sql
CREATE TABLE order_items (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),

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

    -- 옵션
    selected_options JSONB DEFAULT '{}'::jsonb,
    variant_title TEXT,

    -- 상품 스냅샷
    sku TEXT,
    product_snapshot JSONB DEFAULT '{}'::jsonb,

    -- 메타 정보
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**⚠️ 중요: 중복 컬럼 처리**

현재 프로덕션 DB에는 같은 역할의 컬럼이 2세트 존재합니다:
- **단가**: `price` (신규) + `unit_price` (기존)
- **총액**: `total` (신규) + `total_price` (기존)

**코드에서 처리 방법**:
```javascript
// ✅ 올바른 방법: 양쪽 모두 저장
const itemData = {
  order_id: orderId,
  product_id: productId,
  title: product.title,  // ⭐ 반드시 포함
  quantity: quantity,

  // 중복 컬럼 모두 저장 (호환성 유지)
  price: unitPrice,
  unit_price: unitPrice,
  total: totalPrice,
  total_price: totalPrice,

  selected_options: selectedOptions || {}
}

await supabase.from('order_items').insert([itemData])
```

**조회 시 우선순위**:
```javascript
// ✅ 안전한 조회 방법
const unitPrice = item.unit_price || item.price
const totalPrice = item.total_price || item.total
```

---

### 2.5 order_shipping (배송 정보)

```sql
CREATE TABLE order_shipping (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,

    -- 수령인 정보
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,

    -- 주소
    address TEXT NOT NULL,
    detail_address TEXT,
    postal_code VARCHAR(10),

    -- 배송 요청사항
    memo TEXT,

    -- 배송비
    shipping_fee NUMERIC(10,2) DEFAULT 4000,
    shipping_method VARCHAR(50) DEFAULT 'standard',

    -- 배송 추적
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,

    -- 메타 정보
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**⚠️ 주의**: `orders` 테이블에도 `shipping_*` 컬럼이 있음 (중복 가능성)

---

### 2.6 order_payments (결제 정보)

```sql
CREATE TABLE order_payments (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,

    -- 결제 방법
    method VARCHAR(50) NOT NULL,  -- 'bank_transfer', 'card', etc.

    -- 금액
    amount NUMERIC(10,2) NOT NULL,

    -- 결제 상태
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'completed', 'failed', 'cancelled'

    -- 결제 정보
    transaction_id VARCHAR(100),
    paid_at TIMESTAMPTZ,

    -- 계좌이체 정보
    bank_name VARCHAR(50),
    account_number VARCHAR(50),
    depositor_name VARCHAR(100),  -- ⭐ 입금자명

    -- 메타 정보
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**중요 포인트**:
- `depositor_name`: 입금자명 (주문자와 다를 수 있음)
- `method`: 'bank_transfer' (계좌이체), 'card' (카드결제)

---

### 2.7 product_options (상품 옵션)

```sql
CREATE TABLE product_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- '색상', '사이즈' 등
    values JSONB NOT NULL,
    required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**values JSONB 구조**:
```json
[
  {
    "name": "블랙",
    "inventory": 10,
    "price_adjustment": 0
  },
  {
    "name": "화이트",
    "inventory": 5,
    "price_adjustment": 1000
  }
]
```

---

## 3. 데이터 저장 패턴

### 3.1 주문 생성 (createOrder)

**위치**: `/lib/supabaseApi.js:379-562`

**전체 프로세스**:
```javascript
export const createOrder = async (orderData, userProfile, depositName = null) => {
  // 1단계: 사용자 확인
  const user = await getCurrentUser()

  // 2단계: user_id 유효성 확인 (auth.users에 존재하는지)
  let validUserId = null
  const { data: authUser } = await supabase.auth.getUser()
  if (authUser?.user && authUser.user.id === user.id) {
    validUserId = user.id
  }

  // 3단계: orders 테이블 INSERT
  const orderId = crypto.randomUUID()
  const customerOrderNumber = generateCustomerOrderNumber() // 'S251001-1234'

  const orderData_final = {
    id: orderId,
    customer_order_number: customerOrderNumber,
    status: 'pending',

    // ⭐ order_type 생성 규칙
    order_type: user.kakao_id
      ? `${orderData.orderType || 'direct'}:KAKAO:${user.kakao_id}`
      : (orderData.orderType || 'direct'),

    total_amount: orderData.totalPrice,
    user_id: validUserId  // NULL 가능
  }

  await supabase.from('orders').insert([orderData_final])

  // 4단계: order_items 테이블 INSERT
  const itemData = {
    order_id: orderId,
    product_id: orderData.id,
    title: orderData.title,  // ⭐ 필수
    quantity: orderData.quantity,

    // ⚠️ 중복 컬럼 모두 저장
    price: orderData.price,
    unit_price: orderData.price,
    total: orderData.totalPrice,
    total_price: orderData.totalPrice,

    selected_options: orderData.selectedOptions || {}
  }

  await supabase.from('order_items').insert([itemData])

  // 5단계: order_shipping 테이블 INSERT
  const shippingData = {
    order_id: orderId,
    name: userProfile.name,
    phone: userProfile.phone,
    address: userProfile.address,
    detail_address: userProfile.detail_address
  }

  await supabase.from('order_shipping').insert([shippingData])

  // 6단계: order_payments 테이블 INSERT
  const shippingFee = 4000
  const totalAmount = orderData.totalPrice + shippingFee

  const paymentData = {
    order_id: orderId,
    method: 'bank_transfer',
    amount: totalAmount,
    status: 'pending',
    depositor_name: depositName || userProfile.name  // ⭐ 입금자명
  }

  await supabase.from('order_payments').insert([paymentData])

  // 7단계: 재고 차감
  await updateProductInventory(orderData.id, -orderData.quantity)

  return order
}
```

**핵심 포인트**:
1. `order_type`에 카카오 ID 포함 (조회 시 사용)
2. `order_items.title` 반드시 저장 (상품 스냅샷)
3. 가격 중복 컬럼 모두 저장 (호환성)
4. `depositor_name` 저장 (입금자명)

---

### 3.2 주문 상태 변경 (updateOrderStatus)

**위치**: `/lib/supabaseApi.js:1498-1568`

```javascript
export const updateOrderStatus = async (orderId, status, paymentData = null) => {
  const now = new Date().toISOString()
  const updateData = {
    status: status,
    updated_at: now
  }

  // ⭐ 상태별 타임스탬프 자동 기록
  if (status === 'verifying') {
    updateData.verifying_at = now
  }
  if (status === 'paid') {
    updateData.paid_at = now
  }
  if (status === 'delivered') {
    updateData.delivered_at = now
  }
  if (status === 'cancelled') {
    updateData.cancelled_at = now
  }

  // orders 테이블 업데이트
  await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)

  // order_payments 테이블도 업데이트 (필요시)
  if (paymentData) {
    await supabase
      .from('order_payments')
      .update(paymentData)
      .eq('order_id', orderId)
  }
}
```

**핵심 포인트**:
- 상태 변경 시 해당 타임스탬프 자동 기록
- `updateMultipleOrderStatus`도 동일한 로직 사용

---

### 3.3 주소 저장 (profiles.addresses JSONB)

**위치**: `/app/components/AddressManager.jsx`

```javascript
// 주소 추가
const addAddress = async (newAddress) => {
  // 1. 현재 주소 목록 조회
  const response = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=addresses`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    }
  )

  const profiles = await response.json()
  let addresses = profiles[0]?.addresses || []

  // 2. 새 주소 추가
  const newAddressObj = {
    id: Date.now(),  // 간단한 ID
    label: '집',
    address: '서울시...',
    detail_address: '101동',
    is_default: addresses.length === 0,  // 첫 주소면 기본
    created_at: new Date().toISOString()
  }

  addresses.push(newAddressObj)

  // 3. JSONB 전체 업데이트
  await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ addresses })
    }
  )
}
```

**핵심 포인트**:
- JSONB 배열 전체를 읽어서 수정 후 다시 저장
- 직접 Supabase REST API 사용

---

## 4. 데이터 조회 패턴

### 4.1 주문 조회 (getOrders)

**위치**: `/lib/supabaseApi.js:564-650`

```javascript
export const getOrders = async (userId = null) => {
  // 1. UserProfileManager로 조회 조건 생성
  const { UserProfileManager } = await import('./userProfileManager')
  const userQuery = UserProfileManager.getUserOrderQuery()

  // 2. 기본 쿼리 구성
  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (
          title,
          thumbnail_url,
          price
        )
      ),
      order_shipping (*),
      order_payments (*)
    `)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  // 3. 사용자 타입별 필터링
  let data = []

  if (userQuery.type === 'kakao') {
    // 카카오 사용자: order_type으로 조회
    const { data: primaryData } = await query.eq(
      userQuery.query.column,  // 'order_type'
      userQuery.query.value     // 'direct:KAKAO:1234567890'
    )

    data = primaryData || []

    // ⭐ 대체 조회 (기존 주문 호환성)
    if (data.length === 0 && userQuery.alternativeQueries) {
      for (const altQuery of userQuery.alternativeQueries) {
        const { data: altData } = await supabase
          .from('orders')
          .select(`...`)
          .eq(altQuery.column, altQuery.value)

        if (altData && altData.length > 0) {
          data = altData
          break
        }
      }
    }
  } else if (userQuery.type === 'supabase') {
    // 일반 사용자: user_id로 조회
    const { data: supabaseData } = await query.eq('user_id', userQuery.query.value)
    data = supabaseData || []
  }

  // 4. 데이터 가공
  const orders = data.map(order => ({
    ...order,
    items: order.order_items || [],
    shipping: order.order_shipping?.[0] || {},
    payment: getBestPayment(order.order_payments)  // ⭐ depositor_name 우선
  }))

  return orders
}
```

**핵심 포인트**:
1. 카카오 사용자: `order_type` 컬럼으로 조회
2. 일반 사용자: `user_id` 컬럼으로 조회
3. 대체 조회 로직 (기존 주문 호환)
4. `getBestPayment`로 최적 결제 정보 선택

---

### 4.2 주문 상세 조회

```javascript
// 단일 주문 조회
const { data: order } = await supabase
  .from('orders')
  .select(`
    *,
    order_items (
      *,
      products (
        title,
        thumbnail_url,
        price
      )
    ),
    order_shipping (*),
    order_payments (*)
  `)
  .eq('id', orderId)
  .single()

// 데이터 가공
const orderDetail = {
  ...order,
  items: order.order_items || [],
  shipping: order.order_shipping?.[0] || {},
  payment: order.order_payments?.[0] || {}
}
```

---

### 4.3 상품 조회 (재고 포함)

```javascript
const { data: products } = await supabase
  .from('products')
  .select(`
    *,
    product_options (
      id,
      name,
      values
    )
  `)
  .eq('status', 'active')
  .order('created_at', { ascending: false })

// 재고 확인
products.forEach(product => {
  console.log(`${product.title}: ${product.inventory}개 재고`)

  // 옵션별 재고
  product.product_options?.forEach(option => {
    option.values.forEach(value => {
      console.log(`  - ${value.name}: ${value.inventory}개`)
    })
  })
})
```

---

## 5. 주의사항 및 함정

### ⚠️ 5.1 order_items 중복 컬럼

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

### ⚠️ 5.2 orders.user_id는 NULL 가능

**이유**: 카카오 로그인 사용자는 auth.users에 없을 수 있음

**조회 방법**:
```javascript
// ❌ 잘못된 방법
const orders = await supabase
  .from('orders')
  .eq('user_id', userId)  // 카카오 사용자 조회 안 됨

// ✅ 올바른 방법
const orders = await supabase
  .from('orders')
  .eq('order_type', `direct:KAKAO:${kakaoId}`)  // order_type으로 조회
```

---

### ⚠️ 5.3 order_type 패턴 주의

**올바른 패턴**:
```javascript
// 일반 사용자
'direct'
'cart'

// 카카오 사용자
'direct:KAKAO:1234567890'
'cart:KAKAO:1234567890'
```

**잘못된 패턴**:
```javascript
// ❌ UUID 사용 (과거 버그)
'direct:KAKAO:f5a993cd-2eb0-44ef-a5f0-4decaf4d7ecf'

// ✅ 수정됨: kakao_id 사용
'direct:KAKAO:1234567890'
```

---

### ⚠️ 5.4 타임스탬프 흐름 이해

**올바른 흐름**:
```
1. created_at      (주문 생성 - 장바구니에 담기)
   ↓
2. verifying_at    (결제 확인중 - 고객이 "전체결제" 클릭)
   ↓
3. paid_at         (결제 완료 - 관리자가 "입금 확인" 클릭)
   ↓
4. delivered_at    (발송 완료 - 관리자가 "발송 처리" 클릭)
```

**주의**: `verifying_at`는 고객 액션, `paid_at`은 관리자 액션

---

### ⚠️ 5.5 재고 차감 타이밍

```javascript
// ✅ 주문 생성 시 즉시 차감
await createOrder(orderData, userProfile)
  └─ updateProductInventory(productId, -quantity)

// ⚠️ 주의: 결제 취소 시 재고 복구 로직 필요
```

---

## 6. 코드 예제

### 6.1 완전한 주문 생성 예제

```javascript
// 1. 사용자 정보 가져오기
const user = await getCurrentUser()

// 2. 주소 선택 (profiles.addresses에서)
const addresses = await fetchAddresses(user.id)
const selectedAddress = addresses.find(a => a.is_default)

// 3. 주문 데이터 준비
const orderData = {
  id: productId,
  title: '상품명',
  price: 10000,
  totalPrice: 10000,
  quantity: 1,
  orderType: 'direct',
  selectedOptions: {
    '색상': '블랙',
    '사이즈': 'L'
  }
}

const userProfile = {
  name: user.name,
  phone: user.phone,
  address: selectedAddress.address,
  detail_address: selectedAddress.detail_address
}

const depositName = '입금자명'  // 사용자가 입력한 입금자명

// 4. 주문 생성
const order = await createOrder(orderData, userProfile, depositName)

console.log('주문 완료:', order.customer_order_number)
```

---

### 6.2 주문 조회 및 표시 예제

```javascript
// 1. 주문 목록 조회
const orders = await getOrders()

// 2. 각 주문 표시
orders.forEach(order => {
  console.log('주문번호:', order.customer_order_number)
  console.log('상태:', order.status)
  console.log('주문시간:', order.created_at)

  // 타임스탬프 표시
  if (order.verifying_at) {
    console.log('결제확인:', order.verifying_at)
  }
  if (order.paid_at) {
    console.log('결제완료:', order.paid_at)
  }
  if (order.delivered_at) {
    console.log('발송완료:', order.delivered_at)
  }

  // 상품 목록
  order.items.forEach(item => {
    console.log(`- ${item.title} x ${item.quantity}개`)
    console.log(`  가격: ${item.unit_price || item.price}원`)
  })

  // 배송 정보
  console.log('배송지:', order.shipping?.address)

  // 결제 정보
  console.log('입금자명:', order.payment?.depositor_name)
  console.log('결제금액:', order.payment?.amount)
})
```

---

### 6.3 주문 상태 변경 예제

```javascript
// 관리자가 "입금 확인" 버튼 클릭
const confirmPayment = async (orderId) => {
  await updateOrderStatus(orderId, 'paid', {
    status: 'completed',
    paid_at: new Date().toISOString()
  })

  console.log('✅ 결제 확인 완료, paid_at 자동 기록됨')
}

// 관리자가 "발송 처리" 버튼 클릭
const markAsDelivered = async (orderId) => {
  await updateOrderStatus(orderId, 'delivered', {
    tracking_number: 'CJ12345678'
  })

  console.log('✅ 발송 완료, delivered_at 자동 기록됨')
}
```

---

### 6.4 주소 관리 예제

```javascript
// 주소 목록 조회
const fetchAddresses = async (userId) => {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=addresses`,
    { headers: { ... } }
  )
  const profiles = await response.json()
  return profiles[0]?.addresses || []
}

// 주소 추가
const addAddress = async (userId, newAddress) => {
  const addresses = await fetchAddresses(userId)

  addresses.push({
    id: Date.now(),
    label: newAddress.label,
    address: newAddress.address,
    detail_address: newAddress.detail_address,
    is_default: addresses.length === 0,
    created_at: new Date().toISOString()
  })

  await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: { ... },
      body: JSON.stringify({ addresses })
    }
  )
}

// 기본 배송지 변경
const setDefaultAddress = async (userId, addressId) => {
  const addresses = await fetchAddresses(userId)

  const updated = addresses.map(addr => ({
    ...addr,
    is_default: addr.id === addressId
  }))

  await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: { ... },
      body: JSON.stringify({ addresses: updated })
    }
  )
}
```

---

## 📌 빠른 참조 체크리스트

### 주문 생성 시 체크리스트

- [ ] `order_items.title` 포함했는가?
- [ ] `price`, `unit_price` 양쪽 모두 저장했는가?
- [ ] `total`, `total_price` 양쪽 모두 저장했는가?
- [ ] `order_type`에 카카오 ID 포함했는가? (카카오 사용자인 경우)
- [ ] `depositor_name` 저장했는가?
- [ ] 재고 차감했는가?

### 주문 조회 시 체크리스트

- [ ] UserProfileManager 사용했는가?
- [ ] 카카오 사용자의 경우 `order_type`으로 조회하는가?
- [ ] 대체 조회 로직 포함했는가?
- [ ] `getBestPayment`로 결제 정보 선택했는가?

### 주문 상태 변경 시 체크리스트

- [ ] 타임스탬프 자동 기록되는가?
- [ ] `order_payments` 테이블도 업데이트하는가? (필요시)
- [ ] 로그 확인 가능한가? (🕐, 💰, 🚚 이모지)

---

**이 문서를 항상 참고하여 DB 작업을 수행하세요!**

**최종 업데이트**: 2025-10-01
