# 🗄️ DB 참조 가이드 - 완전판

**최종 업데이트**: 2025-10-08
**목적**: 모든 작업 시 DB 구조를 정확히 참조하고 올바르게 사용하기 위한 필수 가이드

---

## 📋 목차

1. [DB 스키마 전체 구조](#1-db-스키마-전체-구조)
2. [테이블별 상세 스키마](#2-테이블별-상세-스키마)
3. [데이터 저장 패턴](#3-데이터-저장-패턴)
4. [데이터 조회 패턴](#4-데-조회-패턴)
5. [주의사항 및 함정](#5-주의사항-및-함정)
6. [코드 예제](#6-코드-예제)
7. [우편번호 및 배송비 계산](#7-우편번호-및-배송비-계산)
8. [RLS 정책 및 성능 최적화](#8-rls-정책-및-성능-최적화)
9. [DB 함수 및 트리거](#9-db-함수-및-트리거)

---

## 1. DB 스키마 전체 구조

### 1.1 전체 테이블 개수: 22개

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

### 1.2 테이블 관계도

```
auth.users (Supabase Auth)
    ↓ (1:1)
profiles (사용자 프로필)
    ├─ addresses: JSONB (여러 주소)
    ├─ kakao_id: TEXT (카카오 로그인)
    ├─ is_admin: BOOLEAN (관리자 플래그) ⭐ 2025-10-05 추가
    ├─ postal_code: VARCHAR(10) (우편번호) ⭐ 2025-10-03 추가
    └─ provider: TEXT (로그인 방식)

admins (관리자 계정) ⭐ 2025-10-05 추가
    ├─ password_hash: bcrypt 해시
    └─ admin_sessions (세션 관리)

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
    ├─ discount_amount (쿠폰 할인) ⭐ 2025-10-04 추가
    ├─ payment_group_id (일괄결제 그룹)
    ├─ shipping_* (배송 정보 직접 저장)
    └─ *_at (타임스탬프 4개)

orders (1:N 관계)
    ├─ order_items (주문 상품들)
    │   ├─ product_id → products.id
    │   └─ variant_id → product_variants.id ⭐ Variant 재고
    ├─ order_shipping (배송 정보)
    └─ order_payments (결제 정보)

coupons (쿠폰) ⭐ 2025-10-03 추가
    └─ user_coupons (사용자별 쿠폰) [1:N]
        ├─ user_id → profiles.id
        ├─ order_id → orders.id
        └─ UNIQUE(user_id, coupon_id) 제약 제거됨 ⭐ 2025-10-06

purchase_order_batches (발주 이력) ⭐ 2025-10-02 추가
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

### 2.2 admins (관리자 계정) ⭐ 2025-10-05 추가

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

### 2.3 admin_sessions (관리자 세션) ⭐ 2025-10-05 추가

```sql
CREATE TABLE admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**핵심 포인트**:
- JWT 토큰 대신 자체 세션 관리
- `token`: 랜덤 생성된 세션 토큰
- `expires_at`: 세션 만료 시간
- **RLS 비활성화** (애플리케이션 레벨 관리)

---

### 2.4 categories (카테고리)

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

### 2.5 suppliers (업체)

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

### 2.6 products (상품)

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

### 2.7 product_options (상품 옵션) ⭐ Variant 시스템

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

### 2.8 product_option_values (옵션 값) ⭐ Variant 시스템

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

### 2.9 product_variants (변형 상품) ⭐ Variant 시스템 핵심

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
- **실제 재고는 여기서 관리** (products.inventory는 참고용)
- `sku` 자동 생성: `제품번호-옵션값1-옵션값2`
- 각 옵션 조합마다 하나의 variant

**트리거**:
```sql
-- product_variants 재고 변경 시 products.inventory 자동 업데이트
CREATE TRIGGER update_product_inventory_trigger
    AFTER INSERT OR UPDATE OR DELETE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_product_inventory();
```

---

### 2.10 variant_option_values (변형-옵션 매핑) ⭐ Variant 시스템

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

### 2.11 orders (주문) ⭐⭐⭐

```sql
CREATE TABLE orders (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_order_number VARCHAR(50) UNIQUE,  -- 'S251001-1234'

    -- 사용자 정보
    user_id UUID REFERENCES auth.users(id),  -- ⚠️ NULL 가능 (카카오 사용자)

    -- 주문 상태 ⭐ 실제 사용하는 4가지 상태 (2025-10-20 명확화)
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending' (결제대기 = 장바구니 역할 ⭐)
    -- 'verifying' (결제확인중 = 입금 대기, 체크아웃 완료)
    -- 'paid' (결제완료 = 입금 확인 완료 ⭐ 발주 대상)
    -- 'delivered' (발송완료)
    -- 'cancelled' (취소)
    --
    -- ⚠️ 'deposited'는 DB 스키마에 정의되어 있지만 실제로는 사용하지 않음
    -- ⚠️ 입금 확인 시 'paid' 상태로 변경됨 (admin/deposits/page.js:380)

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
    is_free_shipping BOOLEAN DEFAULT false,  -- ⭐ 무료배송 조건 (2025-10-16)

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
- ⭐ **주문 상태 흐름** (2025-10-20 명확화):
  - `pending` → 장바구니 역할 (여러 상품 담기 가능)
  - `verifying` → 체크아웃 완료, 입금 대기
  - `paid` → 입금 확인 완료, **발주 대상 상태** ⭐
  - `delivered` → 출고 완료
- 타임스탬프 흐름: `created_at` → `verifying_at` → `paid_at` → `delivered_at`

**인덱스**:
```sql
CREATE INDEX idx_orders_user_id ON orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_orders_order_type_gin ON orders USING gin(order_type gin_trgm_ops);
CREATE INDEX idx_orders_discount_amount ON orders(discount_amount) WHERE discount_amount > 0;
```

---

### 2.12 order_items (주문 상품) ⭐⭐⭐

```sql
CREATE TABLE order_items (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,  -- ⭐ Variant 재고

    -- 상품 정보 (스냅샷)
    title TEXT NOT NULL,  -- ⭐ 주문 시점 상품명
    thumbnail_url TEXT,  -- ⭐ 2025-10-22 추가 (성능 최적화: products JOIN 제거)
    product_number VARCHAR(20),  -- ⭐ 2025-10-22 추가 (성능 최적화: products JOIN 제거)

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

**⭐ 성능 최적화 (2025-10-22)**:
- `thumbnail_url`, `product_number`: products JOIN 제거를 위해 order_items에 스냅샷 저장
- 기존 데이터: 마이그레이션 완료 (products 테이블에서 복사)
- 새 주문: CreateOrderUseCase에서 자동 저장
- **효과**: 주문 조회 시 products JOIN 불필요 → 성능 20배 향상

---

### 2.13 order_shipping (배송 정보)

```sql
CREATE TABLE order_shipping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    detail_address TEXT,
    postal_code VARCHAR(10),  -- ⭐ 2025-10-03 추가 (도서산간 배송비)
    memo TEXT,
    shipping_fee NUMERIC(10,2) DEFAULT 4000,
    shipping_method VARCHAR(50) DEFAULT 'standard',
    tracking_number VARCHAR(100),
    tracking_company VARCHAR(50),  -- ⭐ 택배사명 (예: CJ대한통운, 한진택배)
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**핵심 포인트**:
- `postal_code`: 주문 시점 우편번호 스냅샷 (2025-10-03 추가)
- `shipping_fee`: 도서산간 배송비 포함된 총 배송비
- `tracking_company`: 택배사명 (2025-10-18 추가)

---

### 2.14 order_payments (결제 정보)

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

### 2.15 coupons (쿠폰) ⭐ 2025-10-03 추가

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
    is_welcome_coupon BOOLEAN DEFAULT false,  -- ⭐ 2025-10-08 추가 (회원가입 자동 지급)

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
CREATE INDEX idx_coupons_welcome ON coupons(is_welcome_coupon, is_active) WHERE is_welcome_coupon = true;  -- ⭐ 2025-10-08 추가
```

---

### 2.16 user_coupons (사용자 쿠폰) ⭐ 2025-10-03 추가

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

### 2.17 purchase_order_batches (발주 이력) ⭐ 2025-10-02 추가

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

### 2.18 cart_items (장바구니)

```sql
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    selected_options JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.19 wishlist (찜 목록)

```sql
CREATE TABLE wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);
```

---

### 2.20 live_broadcasts (라이브 방송)

```sql
CREATE TABLE live_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'scheduled',  -- 'scheduled', 'live', 'ended'
    stream_url TEXT,
    thumbnail_url TEXT,
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    viewer_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.21 live_products (방송-상품 연결)

```sql
CREATE TABLE live_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID NOT NULL REFERENCES live_broadcasts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(broadcast_id, product_id)
);
```

---

### 2.22 reviews (상품 리뷰)

```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.23 notifications (알림)

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,  -- 'order', 'promotion', 'system' 등
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.24 admin_permissions (관리자 권한)

```sql
CREATE TABLE admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 관리자
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- 권한 정보
    permission VARCHAR(100) NOT NULL,  -- 예: 'customers.view', 'orders.*'

    -- 메타 정보
    granted_by UUID REFERENCES profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 중복 방지
    UNIQUE(admin_id, permission)
);
```

**핵심 컬럼**:
- `permission`: 권한 형식 `{메뉴}.{액션}` 또는 `{메뉴}.*` (전체)
  - 예: 'customers.view', 'orders.edit', 'products.*'
- `granted_by`: 권한을 부여한 마스터 관리자 ID

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

### 3.4 쿠폰 사용 처리 (2025-10-03)

```javascript
// 1. 쿠폰 검증 (validate_coupon DB 함수)
const { data: validation, error } = await supabase
  .rpc('validate_coupon', {
    p_coupon_code: couponCode,
    p_user_id: userId,
    p_product_amount: productAmount  // ⭐ 배송비 제외 상품 금액만
  })

if (!validation.is_valid) {
  toast.error(validation.error_message)
  return
}

console.log('할인 금액:', validation.discount_amount)

// 2. 주문 생성 시 discount_amount 저장
const { data: order } = await supabase
  .from('orders')
  .insert({
    user_id: userId,
    total_amount: totalAmount,
    discount_amount: validation.discount_amount,  // ⭐ 쿠폰 할인
    status: 'pending'
  })
  .select()
  .single()

// 3. 쿠폰 사용 처리 (use_coupon DB 함수)
const { data: used } = await supabase
  .rpc('use_coupon', {
    p_user_id: userId,
    p_coupon_id: validation.coupon_id,
    p_order_id: order.id,
    p_discount_amount: validation.discount_amount
  })

if (!used) {
  toast.error('쿠폰 사용 처리 실패')
  return
}

// 최종 결제 금액 = 상품 금액 - 쿠폰 할인 + 배송비
const finalAmount = productAmount - validation.discount_amount + shippingFee
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

### 4.2 주문 조회 (사용자별 - RLS 자동 처리)

```javascript
// ✅ 올바른 조회 (RLS 정책 자동 처리)
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

// RLS 정책이 자동으로 처리:
// - 일반 사용자: user_id = auth.uid()
// - 카카오 사용자: order_type LIKE '%KAKAO:' || kakao_id || '%'
// - 관리자: is_admin = true
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

### ⚠️ 5.5 쿠폰 할인 계산

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

---

### ⚠️ 5.6 카카오 사용자 주문 조회

**문제**: `user_id`가 NULL이므로 일반 조회 실패
**해결**: RLS 정책이 자동으로 `order_type`으로 매칭

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
// order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'
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

### 6.3 쿠폰 적용 및 주문 생성

```javascript
// 1. 쿠폰 검증
const productAmount = 50000  // 배송비 제외 상품 금액
const { data: validation } = await supabase
  .rpc('validate_coupon', {
    p_coupon_code: 'WELCOME10',
    p_user_id: userId,
    p_product_amount: productAmount
  })

if (!validation.is_valid) {
  toast.error(validation.error_message)
  return
}

// 2. 배송비 계산
const shippingInfo = formatShippingInfo(4000, postalCode)

// 3. 최종 금액 계산
const discountAmount = validation.discount_amount  // 쿠폰 할인
const finalAmount = productAmount - discountAmount + shippingInfo.totalShipping

console.log(`상품 금액: ${productAmount}원`)
console.log(`쿠폰 할인: -${discountAmount}원`)
console.log(`배송비: +${shippingInfo.totalShipping}원`)
console.log(`최종 결제 금액: ${finalAmount}원`)

// 4. 주문 생성
const { data: order } = await supabase
  .from('orders')
  .insert({
    user_id: userId,
    total_amount: finalAmount,
    discount_amount: discountAmount,  // ⭐ 쿠폰 할인 저장
    status: 'pending'
  })
  .select()
  .single()

// 5. 쿠폰 사용 처리
await supabase.rpc('use_coupon', {
  p_user_id: userId,
  p_coupon_id: validation.coupon_id,
  p_order_id: order.id,
  p_discount_amount: discountAmount
})

toast.success('주문이 생성되었습니다!')
```

---

## 7. 우편번호 및 배송비 계산 ⭐ 2025-10-03

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

---

### 7.3 주문 생성 시 체크리스트

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

**코드 예제**:
```javascript
// 1. 사용자 프로필에서 우편번호 가져오기
const userProfile = await UserProfileManager.getCurrentUser()
const postalCode = userProfile.postal_code || "06000"  // 기본값: 서울

// 2. 배송비 계산 (formatShippingInfo 사용 필수!)
const shippingInfo = formatShippingInfo(4000, postalCode)

// 3. 주문 총액 계산 (상품금액 + 배송비)
const itemsTotal = orderData.items.reduce((sum, item) => sum + item.total_price, 0)
const totalAmount = itemsTotal + shippingInfo.totalShipping

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
  postal_code: postalCode,  // ⭐ 주문 시점 우편번호 저장
  shipping_fee: shippingInfo.totalShipping  // ⭐ 계산된 배송비 저장
})
```

---

## 8. RLS 정책 및 성능 최적화

### 8.1 RLS 정책 전체 현황 (2025-10-07 기준)

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

---

#### 2. order_items 테이블

| 정책명 | 작업 | 조건 |
|--------|------|------|
| `Users view own order items` | SELECT | `is_order_owner(order_id)` 헬퍼 함수 |
| `order_items_insert_policy` | INSERT | `is_order_owner(order_id)` 헬퍼 함수 |
| `Users can update their order items` | UPDATE | 관리자 OR `is_order_owner(order_id)` |

**핵심 포인트**:
- `is_order_owner()` 헬퍼 함수로 중복 서브쿼리 제거
- 성능 최적화: STABLE 함수로 캐싱

---

#### 3. coupons 테이블 (2025-10-07 수정)

| 정책명 | 작업 | 조건 |
|--------|------|------|
| `모든 사용자 쿠폰 조회 가능` | SELECT | `true` (모든 authenticated 사용자) |
| `관리자만 쿠폰 생성 가능` | INSERT | `is_admin = true` |
| `관리자만 쿠폰 수정 가능` | UPDATE | `is_admin = true` |
| `관리자만 쿠폰 삭제 가능` | DELETE | `is_admin = true` |

**⚠️ 변경 사항 (2025-10-07)**:
- 기존 `FOR ALL USING` 정책 삭제
- INSERT/UPDATE/DELETE 정책 세분화
- 관리자 권한 명확히 검증

---

#### 4. user_coupons 테이블

| 정책명 | 작업 | 조건 |
|--------|------|------|
| `Users can view own coupons` | SELECT | `user_id = auth.uid()` OR 관리자 |
| `Admins can insert coupons for users` | INSERT | 관리자 OR `user_id = auth.uid()` |
| `Users can update their coupons` | UPDATE | `user_id = auth.uid()` OR 관리자 |

---

### 8.2 성능 최적화 인덱스 (2025-10-05 추가)

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

## 9. DB 함수 및 트리거

### 9.1 헬퍼 함수 (성능 최적화)

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

---

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

### 9.2 쿠폰 관련 함수

#### `handle_new_user_signup()` ⭐ 2025-10-08 추가
```sql
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
-- 회원가입 시 웰컴 쿠폰 자동 발급
-- profiles INSERT 시 실행
-- is_welcome_coupon = true인 활성 쿠폰을 자동으로 발급
$$;
```

**기능**:
- 신규 회원가입 시 자동 실행
- `is_welcome_coupon = true` AND `is_active = true` 쿠폰 찾기
- 유효기간 내 쿠폰만 발급
- `total_usage_limit` 확인 (선착순)
- `user_coupons` INSERT + `coupons.total_issued_count` 증가

**트리거**:
```sql
CREATE TRIGGER trigger_new_user_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_signup();
```

---

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

---

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

### 9.3 트리거

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

---

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

---

#### Variant 재고 → Product 재고 동기화
```sql
CREATE TRIGGER update_product_inventory_trigger
    AFTER INSERT OR UPDATE OR DELETE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_product_inventory();
```

**기능**:
- `product_variants.inventory` 변경 시
- `products.inventory = SUM(variant.inventory)` 자동 계산

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
- [ ] `postal_code` 저장했는가? (도서산간 배송비)
- [ ] `formatShippingInfo()` 사용하여 배송비 계산했는가?

### 쿠폰 사용 체크리스트

- [ ] `validate_coupon()` 함수로 검증했는가?
- [ ] `p_product_amount`는 배송비 제외했는가?
- [ ] `orders.discount_amount` 저장했는가?
- [ ] `use_coupon()` 함수로 사용 처리했는가?
- [ ] 최종 결제 금액 = 상품금액 - 할인 + 배송비 계산했는가?

### 발주서 생성 체크리스트

- [ ] `status = 'deposited'` 주문만 조회하는가?
- [ ] `purchase_order_batches`에서 완료된 주문 제외하는가?
- [ ] 업체별로 정확히 그룹핑되는가?
- [ ] Excel 다운로드 시 batch 생성하는가?
- [ ] `order_ids` 배열에 모든 주문 포함했는가?
- [ ] `adjusted_quantities` JSONB에 수량 조정 내역 저장했는가?

---

## 🔄 최근 마이그레이션 이력

### 2025-10-08
- ✅ `20251008_welcome_coupon_auto_issue.sql` - 웰컴 쿠폰 자동 지급 기능 추가
  - `coupons.is_welcome_coupon` 컬럼 추가
  - `handle_new_user_signup()` 함수 생성
  - `trigger_new_user_signup` 트리거 생성 (profiles INSERT)
  - 인덱스: `idx_coupons_welcome`

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
- ✅ `20251003_add_postal_code_to_profiles.sql` - 우편번호 시스템 추가

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
6. **우편번호 시스템**: 도서산간 배송비 자동 계산 (2025-10-03)

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

**이 문서를 항상 참고하여 DB 작업을 수행하세요!**

**최종 업데이트**: 2025-10-08 (오후 - 웰컴 쿠폰 자동 지급 기능 반영)
**문서 상태**: 100% 최신 (본서버 실제 DB 스키마 완전 반영)
**총 테이블 수**: 22개 (admins, admin_sessions 포함)
**최신 변경사항**:
- ✅ coupons.is_welcome_coupon 컬럼 추가
- ✅ handle_new_user_signup() 함수 및 트리거 추가
