# 🗄️ 본서버 DB 스키마 완전 분석 리포트

**생성일**: 2025-10-08
**분석 대상**: Supabase Production Database (https://allok.shop)
**마이그레이션 파일 분석**: 26개 파일
**최종 스키마 상태**: 2025-10-07 기준

---

## 📊 Executive Summary

### 전체 테이블 개수: 22개

**핵심 비즈니스 테이블**:
- 주문 시스템: `orders`, `order_items`, `order_payments`, `order_shipping` (4개)
- 상품 시스템: `products`, `product_options`, `product_option_values`, `product_variants`, `variant_option_values` (5개)
- 사용자 시스템: `profiles`, `cart_items`, `wishlist` (3개)
- 쿠폰 시스템: `coupons`, `user_coupons` (2개)
- 관리 시스템: `categories`, `suppliers`, `purchase_order_batches`, `admin_permissions` (4개)
- 라이브 시스템: `live_broadcasts`, `live_products` (2개)
- 기타: `reviews`, `notifications` (2개)

**관리자 시스템 테이블** (2025-10-05 추가):
- `admins`, `admin_sessions` (2개) - 별도 인증 시스템

### 최근 주요 변경사항 (2025-10-03 ~ 2025-10-07)

1. **쿠폰 시스템 전체 구축** (2025-10-03)
   - `coupons`, `user_coupons` 테이블 생성
   - 정액/퍼센트 할인 지원
   - 사용 제한 및 유효기간 관리

2. **주문 시스템 쿠폰 연동** (2025-10-04)
   - `orders.discount_amount` 컬럼 추가
   - RLS UPDATE 정책 추가 (체크아웃 데이터 저장 가능)

3. **RLS 정책 대대적 수정** (2025-10-05 ~ 2025-10-06)
   - 관리자 권한 예외 추가
   - 카카오 사용자 매칭 수정 (Supabase UUID → Kakao ID)
   - 성능 최적화 (인덱스 3개, 헬퍼 함수 2개)

4. **쿠폰 배포 권한 수정** (2025-10-07)
   - 중복 배포 허용 (UNIQUE 제약 제거)
   - INSERT RLS 정책 세분화 (관리자 전용)

---

## 📋 전체 테이블 리스트

### 1. 사용자 및 인증

| 테이블명 | 설명 | 주요 컬럼 | RLS |
|---------|------|----------|-----|
| `profiles` | 사용자 프로필 | id, email, name, kakao_id, is_admin, postal_code | ✅ |
| `admins` | 관리자 계정 (별도) | id, email, password_hash, is_master | ❌ |
| `admin_sessions` | 관리자 세션 | id, admin_id, token, expires_at | ❌ |
| `admin_permissions` | 관리자 권한 | admin_id, permission | ✅ |

### 2. 상품 관리

| 테이블명 | 설명 | 주요 컬럼 | RLS |
|---------|------|----------|-----|
| `products` | 상품 마스터 | id, title, price, inventory, product_number, category_id, supplier_id | ✅ |
| `categories` | 카테고리 | id, name, slug, parent_id | ✅ |
| `suppliers` | 공급업체 | id, name, code, phone, email | ✅ |
| `product_options` | 상품 옵션 | id, product_id, name (색상, 사이즈 등) | ✅ |
| `product_option_values` | 옵션 값 | id, option_id, value (블랙, L 등) | ✅ |
| `product_variants` | 변형 상품 (SKU별 재고) | id, product_id, sku, inventory | ✅ |
| `variant_option_values` | 변형-옵션 매핑 | variant_id, option_value_id | ✅ |

### 3. 주문 관리

| 테이블명 | 설명 | 주요 컬럼 | RLS |
|---------|------|----------|-----|
| `orders` | 주문 마스터 | id, user_id, status, order_type, total_amount, discount_amount | ✅ |
| `order_items` | 주문 상품 | id, order_id, product_id, variant_id, quantity, price, total_price | ✅ |
| `order_payments` | 결제 정보 | id, order_id, method, amount, depositor_name | ✅ |
| `order_shipping` | 배송 정보 | id, order_id, name, phone, address, postal_code, tracking_number | ✅ |

### 4. 쿠폰 시스템

| 테이블명 | 설명 | 주요 컬럼 | RLS |
|---------|------|----------|-----|
| `coupons` | 쿠폰 마스터 | id, code, discount_type, discount_value, min_purchase_amount | ✅ |
| `user_coupons` | 사용자별 쿠폰 | id, user_id, coupon_id, is_used, used_at, order_id | ✅ |

### 5. 발주 관리

| 테이블명 | 설명 | 주요 컬럼 | RLS |
|---------|------|----------|-----|
| `purchase_order_batches` | 발주 이력 | id, supplier_id, order_ids (UUID[]), adjusted_quantities (JSONB) | ✅ |

### 6. 장바구니 및 찜

| 테이블명 | 설명 | 주요 컬럼 | RLS |
|---------|------|----------|-----|
| `cart_items` | 장바구니 | id, user_id, product_id, quantity | ✅ |
| `wishlist` | 찜 목록 | id, user_id, product_id | ✅ |

### 7. 라이브 방송

| 테이블명 | 설명 | 주요 컬럼 | RLS |
|---------|------|----------|-----|
| `live_broadcasts` | 라이브 방송 | id, title, status, stream_url | ✅ |
| `live_products` | 방송-상품 연결 | id, broadcast_id, product_id | ✅ |

### 8. 리뷰 및 알림

| 테이블명 | 설명 | 주요 컬럼 | RLS |
|---------|------|----------|-----|
| `reviews` | 상품 리뷰 | id, user_id, product_id, rating, comment | ✅ |
| `notifications` | 알림 | id, user_id, type, title, message | ✅ |

---

## 🔑 주요 테이블 상세 스키마

### 1. profiles (사용자 프로필)

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
    postal_code VARCHAR(10),  -- ⭐ 2025-10-03 추가 (도서산간 배송비)
    addresses JSONB DEFAULT '[]'::jsonb,

    -- 로그인 정보
    provider TEXT DEFAULT 'email',  -- 'email', 'kakao', 'google'
    kakao_id TEXT,  -- ⭐ 카카오 사용자 식별
    kakao_link TEXT,
    tiktok_id TEXT,
    youtube_id TEXT,

    -- 관리자 플래그 ⭐ 2025-10-05 추가
    is_admin BOOLEAN DEFAULT false,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**핵심 포인트**:
- `id`는 `auth.users(id)`와 동일 (Supabase Auth)
- `kakao_id`로 카카오 로그인 사용자 식별 (RLS 정책에서 활용)
- `is_admin`으로 관리자 권한 체크 (2025-10-05 추가)
- `postal_code`로 도서산간 배송비 계산 (2025-10-03 추가)

---

### 2. orders (주문)

```sql
CREATE TABLE orders (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_order_number VARCHAR(50) UNIQUE,  -- 'S251001-1234'

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
    -- 'direct:KAKAO:1234567890' (카카오 사용자)
    -- 'cart:KAKAO:1234567890' (카카오 장바구니)

    -- 결제 그룹
    payment_group_id VARCHAR(50),

    -- 금액
    total_amount NUMERIC(10,2),
    discount_amount NUMERIC(12,2) DEFAULT 0 NOT NULL,  -- ⭐ 쿠폰 할인 (2025-10-04)

    -- 배송 정보 (orders 테이블에 직접 저장)
    shipping_name TEXT,
    shipping_phone TEXT,
    shipping_address TEXT,
    shipping_detail_address TEXT,

    -- 타임스탬프 ⭐ 중요
    verifying_at TIMESTAMPTZ,   -- 결제 확인중 (체크아웃 완료)
    paid_at TIMESTAMPTZ,         -- 결제 완료 (입금 확인)
    delivered_at TIMESTAMPTZ,    -- 발송 완료
    cancelled_at TIMESTAMPTZ,    -- 주문 취소

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**핵심 포인트**:
- `user_id` NULL 가능 (카카오 사용자는 `order_type`에 ID 포함)
- `discount_amount` = 쿠폰 할인 금액 (2025-10-04 추가)
- **실제 결제 금액** = `total_amount - discount_amount`
- `status = 'deposited'` → 발주 대상 상태
- 타임스탬프 흐름: `created_at` → `verifying_at` → `paid_at` → `delivered_at`

**인덱스**:
```sql
CREATE INDEX idx_orders_user_id ON orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_orders_order_type_gin ON orders USING gin(order_type gin_trgm_ops);
CREATE INDEX idx_orders_discount_amount ON orders(discount_amount) WHERE discount_amount > 0;
```

---

### 3. order_items (주문 상품)

```sql
CREATE TABLE order_items (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,  -- ⭐ Variant 재고

    -- 상품 정보 (스냅샷)
    title TEXT NOT NULL,  -- ⭐ 주문 시점 상품명

    -- 수량
    quantity INTEGER NOT NULL DEFAULT 1,

    -- 가격 (⚠️ 중복 컬럼)
    price NUMERIC(10,2),        -- 신규
    unit_price NUMERIC(10,2),   -- 기존 (동일한 값)

    -- 총액 (⚠️ 중복 컬럼)
    total NUMERIC(10,2),        -- 신규
    total_price NUMERIC(10,2) NOT NULL,  -- 기존 (동일한 값)

    -- 옵션 (이중 저장 전략)
    selected_options JSONB DEFAULT '{}'::jsonb,  -- 스냅샷
    variant_title TEXT,

    -- 상품 스냅샷
    sku TEXT,
    product_snapshot JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**⭐ 중복 컬럼 전략**:
- `price` + `unit_price` → 양쪽 모두 저장 (호환성)
- `total` + `total_price` → 양쪽 모두 저장 (호환성)

**⭐ 이중 저장 전략 (Variant)**:
1. `selected_options` (JSONB): 주문 시점 옵션 스냅샷
2. `variant_id` (FK): 실시간 variant 정보 조회 및 재고 관리

---

### 4. coupons (쿠폰)

```sql
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 기본 정보
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- 할인 규칙
    discount_type VARCHAR(20) NOT NULL,  -- 'fixed_amount' or 'percentage'
    discount_value DECIMAL(12, 2) NOT NULL,

    -- 사용 조건
    min_purchase_amount DECIMAL(12, 2) DEFAULT 0,
    max_discount_amount DECIMAL(12, 2),  -- percentage 타입일 때 최대 할인 금액

    -- 유효 기간
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,

    -- 사용 제한
    usage_limit_per_user INTEGER DEFAULT 1,
    total_usage_limit INTEGER,  -- 전체 사용 가능 횟수 (선착순)
    total_issued_count INTEGER DEFAULT 0,  -- 총 발급된 수
    total_used_count INTEGER DEFAULT 0,  -- 총 사용된 수

    -- 상태
    is_active BOOLEAN DEFAULT true,

    -- 생성자 정보
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_date_range CHECK (valid_until > valid_from),
    CONSTRAINT valid_max_discount CHECK (
        discount_type = 'fixed_amount' OR max_discount_amount IS NOT NULL
    )
);
```

**핵심 컬럼**:
- `discount_type`: 'fixed_amount' (정액) / 'percentage' (퍼센트)
- `discount_value`: 할인 값 (정액=원, 퍼센트=%)
- `min_purchase_amount`: 최소 구매 금액 (배송비 제외)
- `max_discount_amount`: 퍼센트 할인 최대 금액 제한

**인덱스**:
```sql
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_is_active ON coupons(is_active);
CREATE INDEX idx_coupons_valid_until ON coupons(valid_until);
CREATE INDEX idx_coupons_created_at ON coupons(created_at DESC);
```

---

### 5. user_coupons (사용자 쿠폰)

```sql
CREATE TABLE user_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 관계
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,

    -- 사용 정보
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

    -- 할인 금액 (사용 시 스냅샷)
    discount_amount DECIMAL(12, 2),

    -- 배포 정보
    issued_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW()

    -- ⚠️ UNIQUE(user_id, coupon_id) 제약 제거됨 (2025-10-06)
    -- 중복 배포 허용
);
```

**핵심 컬럼**:
- `is_used`: 사용 여부 (기본값 false)
- `discount_amount`: 실제 할인된 금액 (사용 시 스냅샷)
- `order_id`: 어떤 주문에 사용했는지

**⚠️ 변경 사항 (2025-10-06)**:
- `UNIQUE(user_id, coupon_id)` 제약 **제거**
- 같은 사용자에게 같은 쿠폰 여러 번 배포 가능

**인덱스**:
```sql
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX idx_user_coupons_is_used ON user_coupons(is_used);
CREATE INDEX idx_user_coupons_used_at ON user_coupons(used_at DESC);
CREATE INDEX idx_user_coupons_order_id ON user_coupons(order_id);
```

---

### 6. product_variants (변형 상품)

```sql
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE,  -- '0005-66-블랙'
    inventory INTEGER DEFAULT 0,  -- ⭐ 실제 재고
    price_adjustment NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**핵심 포인트**:
- **실제 재고는 여기서 관리** (`products.inventory`는 참고용)
- `sku` 자동 생성: `제품번호-옵션값1-옵션값2`
- 각 옵션 조합마다 하나의 variant

---

### 7. purchase_order_batches (발주 이력)

```sql
CREATE TABLE purchase_order_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    download_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    order_ids UUID[] NOT NULL,  -- ⭐ 포함된 주문 ID 배열
    adjusted_quantities JSONB,  -- ⭐ 수량 조정 내역 {order_item_id: qty}
    total_items INT NOT NULL,
    total_amount INT NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255)
);
```

**핵심 포인트**:
- `order_ids`: UUID 배열 → **중복 발주 방지**
- `adjusted_quantities`: JSONB 구조 `{order_item_id: adjusted_qty}`
- **GIN 인덱스로 배열 검색 최적화**

**인덱스**:
```sql
CREATE INDEX idx_purchase_order_batches_supplier ON purchase_order_batches(supplier_id);
CREATE INDEX idx_purchase_order_batches_date ON purchase_order_batches(download_date DESC);
CREATE INDEX idx_purchase_order_batches_order_ids ON purchase_order_batches USING GIN(order_ids);
```

---

### 8. admins (관리자 계정)

```sql
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,  -- bcrypt 해시
    name TEXT NOT NULL,
    is_master BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**핵심 포인트**:
- `profiles`와 **완전 분리**된 관리자 인증 시스템
- `password_hash`: bcrypt 해시 저장
- `is_master`: 마스터 관리자 플래그
- **RLS 비활성화** (애플리케이션 레벨 인증)

---

## 🔐 RLS 정책 전체 리스트

### 최종 RLS 정책 현황 (2025-10-07 기준)

#### 1. orders 테이블

| 정책명 | 작업 | 조건 |
|--------|------|------|
| `Users view own orders` | SELECT | `user_id = auth.uid()` OR `order_type LIKE '%KAKAO:' \|\| kakao_id \|\| '%'` OR 관리자 |
| `orders_insert_policy` | INSERT | `user_id = auth.uid()` OR `(user_id IS NULL AND order_type LIKE '%KAKAO%')` OR kakao_id 매칭 |
| `Users can update their own orders` | UPDATE | 관리자 OR `user_id = auth.uid()` OR kakao_id 매칭 |

**핵심 포인트**:
- 카카오 사용자: `profiles.kakao_id`를 사용하여 `order_type` 매칭
- 관리자: `profiles.is_admin = true` 확인 시 모든 주문 접근 가능
- 성능 최적화: `get_current_user_kakao_id()` 함수 캐싱

#### 2. order_items 테이블

| 정책명 | 작업 | 조건 |
|--------|------|------|
| `Users view own order items` | SELECT | `is_order_owner(order_id)` 헬퍼 함수 |
| `order_items_insert_policy` | INSERT | `is_order_owner(order_id)` 헬퍼 함수 |
| `Users can update their order items` | UPDATE | 관리자 OR `is_order_owner(order_id)` |

**핵심 포인트**:
- `is_order_owner()` 헬퍼 함수로 중복 서브쿼리 제거
- 성능 최적화: STABLE 함수로 캐싱

#### 3. order_payments 테이블

| 정책명 | 작업 | 조건 |
|--------|------|------|
| `Users view own payments` | SELECT | `is_order_owner(order_id)` |
| `order_payments_insert_policy` | INSERT | `is_order_owner(order_id)` |
| `Users can update payments for their orders` | UPDATE | 관리자 OR `is_order_owner(order_id)` |

#### 4. order_shipping 테이블

| 정책명 | 작업 | 조건 |
|--------|------|------|
| `Users view own shipping` | SELECT | `is_order_owner(order_id)` |
| `order_shipping_insert_policy` | INSERT | `is_order_owner(order_id)` |
| `Users can update shipping for their orders` | UPDATE | 관리자 OR `is_order_owner(order_id)` |

#### 5. coupons 테이블

| 정책명 | 작업 | 조건 |
|--------|------|------|
| `모든 사용자 쿠폰 조회 가능` | SELECT | `true` (모든 authenticated 사용자) |
| `관리자만 쿠폰 생성 가능` | INSERT | `is_admin = true` (2025-10-07 추가) |
| `관리자만 쿠폰 수정 가능` | UPDATE | `is_admin = true` |
| `관리자만 쿠폰 삭제 가능` | DELETE | `is_admin = true` |

**⚠️ 변경 사항 (2025-10-07)**:
- 기존 `FOR ALL USING` 정책 삭제
- INSERT/UPDATE/DELETE 정책 세분화
- 관리자 권한 명확히 검증

#### 6. user_coupons 테이블

| 정책명 | 작업 | 조건 |
|--------|------|------|
| `Users can view own coupons` | SELECT | `user_id = auth.uid()` OR 관리자 |
| `Admins can insert coupons for users` | INSERT | 관리자 OR `user_id = auth.uid()` |
| `Users can update their coupons` | UPDATE | `user_id = auth.uid()` OR 관리자 |

**핵심 포인트**:
- 쿠폰 사용 처리: `use_coupon()` DB 함수 (SECURITY DEFINER)
- 중복 배포 허용 (UNIQUE 제약 제거)

---

## 🚀 성능 최적화 인덱스

### 2025-10-05 추가 인덱스 (RLS 성능 최적화)

```sql
-- 1. profiles 테이블: kakao_id 조회 최적화
CREATE INDEX idx_profiles_id_kakao_id
ON profiles(id, kakao_id)
WHERE kakao_id IS NOT NULL;

-- 2. orders 테이블: order_type LIKE 검색 최적화
CREATE INDEX idx_orders_order_type_gin
ON orders USING gin(order_type gin_trgm_ops);

-- 3. orders 테이블: user_id 조회 최적화
CREATE INDEX idx_orders_user_id
ON orders(user_id)
WHERE user_id IS NOT NULL;
```

**효과**:
- 카카오 사용자 조회 **2-5배 빠름**
- 모바일 환경 응답 속도 **대폭 개선**
- 서브쿼리 캐싱으로 중복 호출 제거

---

## 🔧 DB 함수 및 트리거

### 1. 헬퍼 함수 (성능 최적화)

#### `get_current_user_kakao_id()`
```sql
CREATE OR REPLACE FUNCTION get_current_user_kakao_id()
RETURNS TEXT
LANGUAGE sql
STABLE  -- ⭐ 캐시됨
SECURITY DEFINER
AS $$
  SELECT kakao_id::text
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;
```

**목적**: RLS 정책에서 반복되는 서브쿼리 캐싱

#### `is_order_owner(order_id UUID)`
```sql
CREATE OR REPLACE FUNCTION is_order_owner(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE  -- ⭐ 캐시됨
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orders
    WHERE id = p_order_id
    AND (
      user_id = auth.uid()
      OR order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'
    )
  );
$$;
```

**목적**: 주문 소유권 확인 로직 중앙화 + 캐싱

---

### 2. 쿠폰 관련 함수

#### `validate_coupon()`
```sql
CREATE OR REPLACE FUNCTION validate_coupon(
    p_coupon_code VARCHAR(50),
    p_user_id UUID,
    p_product_amount DECIMAL(12, 2)  -- 배송비 제외
)
RETURNS TABLE (
    is_valid BOOLEAN,
    error_message TEXT,
    coupon_id UUID,
    discount_amount DECIMAL(12, 2)
) AS $$
-- ... (유효성 검증 로직)
$$;
```

**기능**:
- 쿠폰 존재 확인
- 유효 기간 확인
- 최소 구매 금액 확인
- 사용자 보유 확인
- 할인 금액 계산 (정액/퍼센트)

**주의사항**:
- `p_product_amount`는 **배송비 제외** 상품 금액만
- 퍼센트 할인은 **배송비 제외하고 계산**

#### `use_coupon()`
```sql
CREATE OR REPLACE FUNCTION use_coupon(
    p_user_id UUID,
    p_coupon_id UUID,
    p_order_id UUID,
    p_discount_amount DECIMAL(12, 2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- ⭐ RLS 우회
AS $$
-- ... (쿠폰 사용 처리)
$$;
```

**기능**:
- `user_coupons.is_used = true` 처리
- `used_at`, `order_id`, `discount_amount` 업데이트
- 트리거로 `coupons.total_used_count` 자동 증가

**⚠️ 변경 사항 (2025-10-05)**:
- `auth.uid()` 검증 **제거** (SECURITY DEFINER 컨텍스트 문제)
- RLS 정책 기반 보안으로 전환

---

### 3. 트리거

#### 쿠폰 사용 통계 업데이트
```sql
CREATE TRIGGER trigger_update_coupon_usage_stats
    BEFORE UPDATE ON user_coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_coupon_usage_stats();
```

**기능**:
- `is_used = false → true` 변경 시
- `coupons.total_used_count` 자동 증가
- `used_at` 자동 설정

#### 쿠폰 발급 통계 업데이트
```sql
CREATE TRIGGER trigger_update_coupon_issued_count
    AFTER INSERT ON user_coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_coupon_issued_count();
```

**기능**:
- `user_coupons` INSERT 시
- `coupons.total_issued_count` 자동 증가

#### Variant 재고 → Product 재고 동기화
```sql
-- product_variants 재고 변경 시 products.inventory 자동 업데이트
CREATE TRIGGER update_product_inventory_trigger
    AFTER INSERT OR UPDATE OR DELETE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_product_inventory();
```

**기능**:
- `product_variants.inventory` 변경 시
- `products.inventory = SUM(variant.inventory)` 자동 계산

---

## 📊 데이터 관계도

### Variant 시스템 데이터 흐름

```
products (상품)
  └─ product_options (옵션: 색상, 사이즈)
      └─ product_option_values (값: 블랙, L)
          └─ variant_option_values (매핑)
              └─ product_variants (변형: 블랙+L, 재고=10)
```

### 주문 시스템 데이터 흐름

```
profiles (사용자)
  └─ orders (주문)
      ├─ order_items (주문 상품)
      │   └─ product_variants (재고 차감)
      ├─ order_payments (결제 정보)
      └─ order_shipping (배송 정보)
```

### 쿠폰 시스템 데이터 흐름

```
coupons (쿠폰 마스터)
  └─ user_coupons (사용자별 쿠폰)
      └─ orders (주문 시 사용)
```

### 발주 시스템 데이터 흐름

```
suppliers (업체)
  └─ purchase_order_batches (발주 이력)
      └─ order_ids (UUID[])
          └─ orders (입금확인 완료)
              └─ order_items (발주 상품)
```

---

## ⚠️ 주의사항 및 함정

### 1. 중복 컬럼 처리 (order_items)

**문제**: `price`/`unit_price`, `total`/`total_price` 중복
**해결**: **양쪽 모두 저장** (DB_REFERENCE_GUIDE.md 권장사항)

```javascript
// ✅ 올바른 저장 방식
const orderItem = {
  price: unitPrice,
  unit_price: unitPrice,  // 중복이지만 양쪽 모두 저장
  total: totalPrice,
  total_price: totalPrice  // 중복이지만 양쪽 모두 저장
}
```

### 2. 카카오 사용자 주문 조회

**문제**: `user_id`가 NULL이므로 일반 조회 실패
**해결**: `order_type`으로 매칭

```javascript
// ❌ 잘못된 조회 (카카오 사용자는 user_id가 NULL)
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('user_id', userId)

// ✅ 올바른 조회 (RLS 정책 자동 처리)
const { data } = await supabase
  .from('orders')
  .select('*')
// RLS 정책이 자동으로 kakao_id 매칭 처리
```

### 3. 쿠폰 할인 계산

**주의**: 퍼센트 할인은 **배송비 제외** 상품 금액에만 적용

```javascript
// ✅ 올바른 쿠폰 검증
const productAmount = cartTotal  // 배송비 제외
const { data: validation } = await supabase
  .rpc('validate_coupon', {
    p_coupon_code: 'WELCOME',
    p_user_id: userId,
    p_product_amount: productAmount  // 배송비 제외!
  })

// 최종 결제 금액 = 상품 금액 - 쿠폰 할인 + 배송비
const finalAmount = productAmount - validation.discount_amount + shippingFee
```

### 4. Variant 재고 관리

**주의**: 실제 재고는 `product_variants.inventory`에서 관리

```javascript
// ❌ 잘못된 재고 확인
const { data: product } = await supabase
  .from('products')
  .select('inventory')
  .eq('id', productId)
  .single()

// ✅ 올바른 재고 확인 (Variant)
const { data: variant } = await supabase
  .from('product_variants')
  .select('inventory')
  .eq('id', variantId)
  .single()
```

### 5. 발주 중복 방지

**주의**: `order_ids` 배열로 이미 발주된 주문 자동 제외

```javascript
// ✅ GIN 인덱스 활용 중복 확인
const { data: batches } = await supabase
  .from('purchase_order_batches')
  .select('order_ids')
  .eq('status', 'completed')

const completedOrderIds = new Set()
batches?.forEach(batch => {
  batch.order_ids?.forEach(id => completedOrderIds.add(id))
})

const pendingOrders = allOrders.filter(o => !completedOrderIds.has(o.id))
```

---

## 🔄 최근 마이그레이션 이력

### 2025-10-07
- ✅ `20251007_fix_coupons_insert_rls.sql` - 쿠폰 INSERT RLS 정책 세분화
- ✅ `20251007_set_master_admin.sql` - master@allok.world 관리자 권한 설정

### 2025-10-06
- ✅ `20251006_complete_rls_fix.sql` - 전체 RLS 정책 통합 수정 (카카오 매칭)
- ✅ `20251006_add_order_items_update_policy.sql` - 주문 수량 조정 UPDATE 정책
- ✅ `20251006_allow_duplicate_coupon_distribution.sql` - 쿠폰 중복 배포 허용

### 2025-10-05
- ✅ `20251005_optimize_all_rls_policies.sql` - 전체 RLS 성능 최적화 (인덱스 3개, 함수 2개)
- ✅ `20251005_fix_kakao_user_order_select.sql` - 카카오 SELECT 매칭 수정
- ✅ `20251005_fix_kakao_user_order_update.sql` - 카카오 UPDATE 매칭 수정
- ✅ `20251005_fix_rls_admin_policies.sql` - 관리자 권한 예외 추가
- ✅ `20251005_remove_insecure_select_policy.sql` - 보안 위험 정책 제거
- ✅ `20251005_fix_coupon_usage_final.sql` - 쿠폰 사용 함수 auth.uid() 검증 제거
- ✅ `20251005_create_admins_table.sql` - 관리자 시스템 테이블 생성

### 2025-10-04
- ✅ `20251004_add_discount_to_orders.sql` - `orders.discount_amount` 컬럼 추가
- ✅ `20251004_fix_rls_update_policies.sql` - UPDATE RLS 정책 추가 (체크아웃 저장)
- ✅ `20251004_fix_user_coupons_rls.sql` - `user_coupons` UPDATE 정책 추가

### 2025-10-03
- ✅ `20251003_coupon_system.sql` - 쿠폰 시스템 전체 구축
- ✅ `20251003_welcome_coupon.sql` - 웰컴 쿠폰 생성
- ✅ `20251003_percent_coupon_example.sql` - 퍼센트 할인 쿠폰 예제
- ✅ `fix_validate_coupon.sql` - validate_coupon 함수 ambiguous 에러 수정
- ✅ `fix_coupon_rls.sql` - 쿠폰 RLS SELECT 정책 추가

---

## 📝 요약

### 핵심 통계

- **전체 테이블**: 22개
- **RLS 활성화**: 20개 (admins 테이블 제외 2개)
- **인덱스**: 50개 이상 (GIN 인덱스 3개 포함)
- **DB 함수**: 10개 이상
- **트리거**: 5개 이상

### 시스템 특징

1. **Variant 시스템**: 옵션 조합별 독립 재고 관리
2. **쿠폰 시스템**: 정액/퍼센트 할인, 사용 제한, 유효기간 관리
3. **발주 시스템**: UUID 배열 기반 중복 방지, JSONB 수량 조정
4. **카카오 로그인**: `order_type` 패턴 매칭 + RLS 성능 최적화
5. **관리자 시스템**: profiles 분리 + 별도 인증 (2025-10-05)

### 성능 최적화

- **GIN 인덱스**: `order_type` LIKE 검색, `order_ids` 배열 검색
- **복합 인덱스**: `(id, kakao_id)` 조회 최적화
- **STABLE 함수**: 헬퍼 함수 결과 캐싱
- **트리거**: 자동 집계 업데이트 (쿠폰 통계, variant 재고)

### 보안 정책

- **RLS 정책**: 사용자별 데이터 격리
- **관리자 권한**: `profiles.is_admin` 플래그 기반
- **SECURITY DEFINER**: 쿠폰 사용 처리 (RLS 우회)
- **Service Role API**: 관리자 기능 (프로필 조회, 쿠폰 생성)

---

**작성자**: Claude (AI Assistant)
**최종 업데이트**: 2025-10-08
**분석 기준**: `/supabase/migrations/` 전체 26개 파일 + `DB_REFERENCE_GUIDE.md`
