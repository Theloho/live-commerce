# 🏗️ 새로운 DB 아키텍처 설계 문서

**작성일**: 2025-10-01
**목적**: 옵션 조합 재고 관리 + 상품 상세정보 + 발주 시스템을 위한 근본적인 DB 재설계
**설계 원칙**: 안정성, 확장성, 효율성, 데이터 무결성

---

## 📋 목차

1. [현재 문제점 분석](#1-현재-문제점-분석)
2. [설계 원칙](#2-설계-원칙)
3. [새로운 테이블 구조](#3-새로운-테이블-구조)
4. [마이그레이션 전략](#4-마이그레이션-전략)
5. [성능 최적화](#5-성능-최적화)
6. [확장성 고려사항](#6-확장성-고려사항)

---

## 1. 현재 문제점 분석

### 1.1 옵션 시스템의 구조적 문제

**현재 구조 (JSONB 기반)**:
```sql
product_options
├── id
├── product_id
├── name ('사이즈', '색상')
└── values JSONB: [{"name": "66", "inventory": 6}, ...]
```

**문제점**:
1. ❌ **옵션 조합 불가능**: 사이즈와 색상이 독립적으로 재고 관리됨
   - 현재: 사이즈(66)=6개, 색상(핑크)=6개 ← 잘못됨
   - 필요: 사이즈(66)/색상(핑크) = 6개 ← 조합 재고

2. ❌ **쿼리 성능 저하**: JSONB 내부 검색은 인덱스 활용 제한
   ```sql
   -- 느린 쿼리
   SELECT * FROM product_options
   WHERE values @> '[{"name": "66"}]'::jsonb
   ```

3. ❌ **데이터 무결성 보장 어려움**: JSONB는 스키마가 없음
   - 오타 가능: `"inventroy"` vs `"inventory"`
   - 타입 오류: `"inventory": "6"` (문자열) vs `6` (숫자)

4. ❌ **확장성 제한**:
   - 옵션이 3개 이상일 때 (사이즈/색상/재질) 처리 복잡도 급증
   - SKU 관리 불가능

### 1.2 상품 정보의 제한

**현재 products 테이블**:
```sql
products
├── title, description, price
├── thumbnail_url, inventory
└── ... (기본 필드만 존재)
```

**부족한 정보**:
- ❌ 모델번호 (model_number)
- ❌ 업체 정보 (supplier)
- ❌ 매입가 (purchase_price)
- ❌ 매입일 (purchase_date)
- ❌ 카테고리 구조 (categories 테이블 미흡)
- ❌ 상세 정보 (detailed_description)

**향후 필요한 기능**:
- 📊 업체별 발주서 출력 (supplier 기반)
- 💰 마진 계산 (판매가 - 매입가)
- 📦 재고 회전율 분석 (SKU 기반)
- 📋 카테고리별 매출 분석

### 1.3 주문 시스템의 정확도 문제

**현재 order_items**:
```sql
order_items
├── product_id (어떤 상품인지)
├── selected_options JSONB (어떤 옵션 선택했는지)
└── ❌ variant_id 없음 (정확한 SKU 참조 불가)
```

**문제**:
- 재고 차감이 부정확 (어떤 조합이 팔렸는지 정확히 알 수 없음)
- 발주서 출력 시 SKU 정보 부족
- 재고 추적 어려움

---

## 2. 설계 원칙

### 2.1 정규화 (Normalization)

**원칙**: 데이터 중복 최소화, JSONB 사용 최소화

- ✅ **DO**: 관계형 테이블로 분리 (정규화)
- ❌ **DON'T**: JSONB에 복잡한 구조 저장

**예외**: 성능을 위한 역정규화
- 주문 스냅샷 (order_items.product_snapshot)
- 주소 목록 (profiles.addresses)

### 2.2 데이터 무결성 (Data Integrity)

**Foreign Key 제약조건 필수**:
```sql
-- ✅ Good
variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT

-- ❌ Bad (제약 없음)
variant_id UUID
```

**ON DELETE 정책**:
- `CASCADE`: 부모 삭제 시 자식도 삭제 (order_items → order 삭제 시)
- `RESTRICT`: 자식이 있으면 부모 삭제 불가 (variant → 주문이 있으면 삭제 불가)
- `SET NULL`: 부모 삭제 시 자식은 NULL (supplier 삭제해도 product 유지)

### 2.3 성능 최적화

**인덱스 전략**:
```sql
-- 1. Primary Key (자동 인덱스)
id UUID PRIMARY KEY

-- 2. Foreign Key (수동 인덱스 필요)
CREATE INDEX idx_variants_product_id ON product_variants(product_id);

-- 3. 자주 검색하는 컬럼
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_products_supplier_id ON products(supplier_id);

-- 4. 복합 인덱스 (조합 검색)
CREATE INDEX idx_variants_product_sku ON product_variants(product_id, sku);
```

### 2.4 확장성

**미래를 고려한 설계**:
- 옵션 3개 이상 지원 (사이즈/색상/재질)
- 다중 이미지 (variant별 이미지)
- 다중 가격 (회원 등급별 가격)
- 다중 재고 (창고별 재고)

### 2.5 호환성

**기존 데이터와의 호환성 유지**:
- 기존 `product_options` 테이블 유지 (읽기 전용)
- 새 테이블 추가 방식 (기존 삭제 X)
- 점진적 마이그레이션 가능

---

## 3. 새로운 테이블 구조

### 3.1 핵심 개념: Variant (상품 변형)

**Variant = SKU = 옵션 조합**

```
상품: "자켓"
└─ Variant 1: 66/핑크 (SKU: JACKET-66-PINK, 재고: 6개)
└─ Variant 2: 66/레드 (SKU: JACKET-66-RED, 재고: 6개)
└─ Variant 3: 66/블루 (SKU: JACKET-66-BLUE, 재고: 6개)
└─ Variant 4: 77/핑크 (SKU: JACKET-77-PINK, 재고: 6개)
└─ ... (총 12개 variant)
```

---

### 3.2 테이블 설계

#### 📦 suppliers (업체)

```sql
CREATE TABLE suppliers (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,  -- 'SUP001', 'SUP002' (고유 코드)
    name VARCHAR(255) NOT NULL,         -- '동대문 의류', 'ABC 무역'

    -- 연락처
    contact_person VARCHAR(100),        -- 담당자명
    phone VARCHAR(20),
    email VARCHAR(255),

    -- 주소
    address TEXT,
    detail_address TEXT,

    -- 거래 조건
    bank_name VARCHAR(50),              -- 은행명
    account_number VARCHAR(50),         -- 계좌번호
    account_holder VARCHAR(100),        -- 예금주
    payment_terms VARCHAR(100),         -- '월말 결제', '현금 결제' 등

    -- 메타 정보
    notes TEXT,                         -- 특이사항
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_name ON suppliers(name);

-- 코멘트
COMMENT ON TABLE suppliers IS '업체(공급업체) 정보 - 발주서 생성에 사용';
COMMENT ON COLUMN suppliers.code IS '업체 고유 코드 (예: SUP001)';
COMMENT ON COLUMN suppliers.payment_terms IS '결제 조건 (예: 월말 결제, 15일 후 결제)';
```

---

#### 🏷️ categories (카테고리)

```sql
CREATE TABLE categories (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,  -- URL용 (예: 'outer-jacket')

    -- 계층 구조
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 0,            -- 0=대분류, 1=중분류, 2=소분류

    -- 표시
    display_order INTEGER DEFAULT 0,
    icon VARCHAR(100),                  -- 아이콘 이름
    thumbnail_url TEXT,                 -- 카테고리 이미지

    -- 메타 정보
    description TEXT,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_level ON categories(level);

-- 코멘트
COMMENT ON TABLE categories IS '카테고리 (계층 구조 지원)';
COMMENT ON COLUMN categories.parent_id IS '상위 카테고리 ID (NULL이면 최상위)';
COMMENT ON COLUMN categories.level IS '0=대분류, 1=중분류, 2=소분류';

-- 예시 데이터
-- parent_id=NULL, level=0, name='상의'
-- parent_id=(상의ID), level=1, name='티셔츠'
-- parent_id=(티셔츠ID), level=2, name='반팔 티셔츠'
```

---

#### 👕 products (상품) - 확장

```sql
CREATE TABLE products (
    -- 기본 정보 (기존)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- ⭐ 새로 추가되는 필드들
    model_number VARCHAR(100),          -- 모델번호 (예: 'JK-2024-001')
    detailed_description TEXT,          -- 상세 정보 (긴 텍스트)

    -- 가격 정보 (기존)
    price NUMERIC(10,2) NOT NULL,       -- 판매가
    compare_price NUMERIC(10,2),        -- 정가
    discount_rate INTEGER DEFAULT 0,

    -- ⭐ 매입 정보 (새로 추가)
    purchase_price NUMERIC(10,2),       -- 매입가 (원가)
    purchase_date DATE,                 -- 매입일

    -- 이미지 (기존)
    thumbnail_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,

    -- ⭐ 분류 (개선)
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,  -- ⭐ 업체 연결
    tags TEXT[],

    -- 재고 (기존 - 이제는 자동 계산됨)
    inventory INTEGER DEFAULT 0,        -- 모든 variant 재고 합계 (자동 계산)
    sku TEXT,                           -- 기본 SKU (옵션 없는 경우)

    -- 상태 (기존)
    status TEXT DEFAULT 'active',       -- 'active', 'draft', 'deleted'
    is_visible BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,

    -- 라이브 방송 (기존)
    is_live BOOLEAN DEFAULT false,
    is_live_active BOOLEAN DEFAULT false,
    live_priority INTEGER DEFAULT 0,
    live_start_time TIMESTAMPTZ,
    live_end_time TIMESTAMPTZ,

    -- 통계 (기존)
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,

    -- 기타
    notes TEXT,

    -- 메타 정보
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_supplier_id ON products(supplier_id);  -- ⭐ 발주서용
CREATE INDEX idx_products_model_number ON products(model_number);
CREATE INDEX idx_products_status ON products(status);

-- 코멘트
COMMENT ON COLUMN products.model_number IS '모델번호 (예: JK-2024-001)';
COMMENT ON COLUMN products.purchase_price IS '매입가 (원가)';
COMMENT ON COLUMN products.supplier_id IS '공급업체 ID (발주서 생성용)';
COMMENT ON COLUMN products.inventory IS '전체 재고 (variant 재고 합계, 자동 계산)';
```

---

#### 🎨 product_options (옵션 정의) - 정규화

```sql
CREATE TABLE product_options (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,

    -- 옵션 정보
    name VARCHAR(100) NOT NULL,         -- '사이즈', '색상', '재질' 등
    display_order INTEGER DEFAULT 0,    -- 표시 순서

    -- 메타 정보
    is_required BOOLEAN DEFAULT false,  -- 필수 선택 여부
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 제약조건
    UNIQUE(product_id, name)            -- 같은 상품에 같은 옵션명 중복 방지
);

-- 인덱스
CREATE INDEX idx_product_options_product_id ON product_options(product_id);

-- 코멘트
COMMENT ON TABLE product_options IS '상품 옵션 정의 (예: 사이즈, 색상)';
COMMENT ON COLUMN product_options.display_order IS '표시 순서 (0=첫번째)';
```

---

#### 🏷️ product_option_values (옵션 값)

```sql
CREATE TABLE product_option_values (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID REFERENCES product_options(id) ON DELETE CASCADE,

    -- 옵션 값
    value VARCHAR(100) NOT NULL,        -- '66', '핑크', '면100%' 등
    display_order INTEGER DEFAULT 0,    -- 표시 순서

    -- 메타 정보
    color_code VARCHAR(7),              -- 색상 코드 (예: '#FF0000', 색상 옵션인 경우)
    image_url TEXT,                     -- 옵션별 이미지 (선택사항)
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 제약조건
    UNIQUE(option_id, value)            -- 같은 옵션에 같은 값 중복 방지
);

-- 인덱스
CREATE INDEX idx_option_values_option_id ON product_option_values(option_id);

-- 코멘트
COMMENT ON TABLE product_option_values IS '옵션 값 (예: 사이즈=66, 색상=핑크)';
COMMENT ON COLUMN product_option_values.color_code IS '색상 코드 (색상 옵션인 경우, 예: #FF0000)';
```

---

#### ⭐ product_variants (상품 변형 = SKU) - 핵심!

```sql
CREATE TABLE product_variants (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,

    -- SKU 정보
    sku VARCHAR(100) UNIQUE NOT NULL,   -- 고유 SKU (예: 'JACKET-66-PINK')
    barcode VARCHAR(100),               -- 바코드 (선택사항)

    -- ⭐ 재고 (핵심!)
    inventory INTEGER DEFAULT 0 NOT NULL,

    -- 가격 조정
    price_adjustment NUMERIC(10,2) DEFAULT 0,  -- 가격 조정 (예: +5000원)

    -- ⭐ 업체 정보
    supplier_sku VARCHAR(100),          -- 업체 상품코드 (발주서용)

    -- 물리적 속성
    weight_g INTEGER,                   -- 무게 (그램)
    dimensions JSONB,                   -- 치수 {"length": 10, "width": 20, "height": 5}

    -- 이미지
    image_url TEXT,                     -- variant별 대표 이미지
    images JSONB DEFAULT '[]'::jsonb,   -- variant별 추가 이미지들

    -- 상태
    is_active BOOLEAN DEFAULT true,     -- 판매 가능 여부

    -- 메타 정보
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_inventory ON product_variants(inventory);  -- 재고 검색용
CREATE INDEX idx_variants_product_sku ON product_variants(product_id, sku);  -- 복합 검색

-- 코멘트
COMMENT ON TABLE product_variants IS '상품 변형 (옵션 조합 = SKU)';
COMMENT ON COLUMN product_variants.sku IS '고유 SKU (예: JACKET-66-PINK)';
COMMENT ON COLUMN product_variants.inventory IS '재고 수량 (이 조합의 실제 재고)';
COMMENT ON COLUMN product_variants.supplier_sku IS '업체 상품코드 (발주서 출력용)';
COMMENT ON COLUMN product_variants.price_adjustment IS '가격 조정 (예: Large +5000원)';
```

---

#### 🔗 variant_option_values (변형-옵션 매핑)

```sql
CREATE TABLE variant_option_values (
    -- 연결 정보
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    option_value_id UUID REFERENCES product_option_values(id) ON DELETE RESTRICT,

    -- 복합 Primary Key
    PRIMARY KEY (variant_id, option_value_id)
);

-- 인덱스 (자동 생성됨 - PK)
-- CREATE INDEX idx_variant_options_variant_id ON variant_option_values(variant_id);
-- CREATE INDEX idx_variant_options_value_id ON variant_option_values(option_value_id);

-- 코멘트
COMMENT ON TABLE variant_option_values IS 'Variant와 Option Value 매핑 (조합 정의)';

-- 예시 데이터:
-- Variant: JACKET-66-PINK (id=V1)
-- ├─ variant_id=V1, option_value_id=OV1 (사이즈=66)
-- └─ variant_id=V1, option_value_id=OV5 (색상=핑크)
```

---

#### 📦 order_items (주문 상품) - 개선

```sql
CREATE TABLE order_items (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),

    -- ⭐ Variant 참조 (새로 추가)
    variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,  -- 정확한 SKU

    -- 상품 정보 (스냅샷)
    title TEXT NOT NULL,
    sku TEXT,                           -- 주문 시점의 SKU (스냅샷)

    -- 수량
    quantity INTEGER NOT NULL DEFAULT 1,

    -- 가격 (기존 중복 컬럼 유지 - 호환성)
    price NUMERIC(10,2),
    unit_price NUMERIC(10,2),
    total NUMERIC(10,2),
    total_price NUMERIC(10,2) NOT NULL,

    -- 옵션 (기존 - 하위 호환)
    selected_options JSONB DEFAULT '{}'::jsonb,
    variant_title TEXT,

    -- 상품 스냅샷
    product_snapshot JSONB DEFAULT '{}'::jsonb,

    -- 메타 정보
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);  -- ⭐ SKU 추적용

-- 코멘트
COMMENT ON COLUMN order_items.variant_id IS '정확한 SKU 참조 (옵션 조합)';
COMMENT ON COLUMN order_items.selected_options IS '(레거시) 하위 호환용';
```

---

### 3.3 데이터 예시

#### 자켓 상품 (사이즈 4종 × 색상 3종 = 12개 variant)

**1. products**
```sql
INSERT INTO products (id, title, price, supplier_id, category_id)
VALUES ('P1', '0002/자켓', 12000, 'SUP1', 'CAT1');
```

**2. product_options**
```sql
INSERT INTO product_options (id, product_id, name, display_order)
VALUES
  ('OPT1', 'P1', '사이즈', 0),
  ('OPT2', 'P1', '색상', 1);
```

**3. product_option_values**
```sql
INSERT INTO product_option_values (id, option_id, value, display_order)
VALUES
  -- 사이즈
  ('OV1', 'OPT1', '66', 0),
  ('OV2', 'OPT1', '77', 1),
  ('OV3', 'OPT1', '88', 2),
  ('OV4', 'OPT1', '99', 3),
  -- 색상
  ('OV5', 'OPT2', '핑크', 0),
  ('OV6', 'OPT2', '레드', 1),
  ('OV7', 'OPT2', '블루', 2);
```

**4. product_variants (12개 조합)**
```sql
INSERT INTO product_variants (id, product_id, sku, inventory, supplier_sku)
VALUES
  ('V1', 'P1', 'JACKET-66-PINK', 6, 'SUP-JK-66-PK'),
  ('V2', 'P1', 'JACKET-66-RED',  6, 'SUP-JK-66-RD'),
  ('V3', 'P1', 'JACKET-66-BLUE', 6, 'SUP-JK-66-BL'),
  ('V4', 'P1', 'JACKET-77-PINK', 6, 'SUP-JK-77-PK'),
  ('V5', 'P1', 'JACKET-77-RED',  6, 'SUP-JK-77-RD'),
  ('V6', 'P1', 'JACKET-77-BLUE', 6, 'SUP-JK-77-BL'),
  ('V7', 'P1', 'JACKET-88-PINK', 6, 'SUP-JK-88-PK'),
  ('V8', 'P1', 'JACKET-88-RED',  6, 'SUP-JK-88-RD'),
  ('V9', 'P1', 'JACKET-88-BLUE', 6, 'SUP-JK-88-BL'),
  ('V10', 'P1', 'JACKET-99-PINK', 6, 'SUP-JK-99-PK'),
  ('V11', 'P1', 'JACKET-99-RED',  6, 'SUP-JK-99-RD'),
  ('V12', 'P1', 'JACKET-99-BLUE', 6, 'SUP-JK-99-BL');
```

**5. variant_option_values (매핑)**
```sql
INSERT INTO variant_option_values (variant_id, option_value_id)
VALUES
  -- V1: 66/핑크
  ('V1', 'OV1'),  -- 사이즈=66
  ('V1', 'OV5'),  -- 색상=핑크
  -- V2: 66/레드
  ('V2', 'OV1'),  -- 사이즈=66
  ('V2', 'OV6'),  -- 색상=레드
  -- ... (총 24개 행: 12 variants × 2 options)
```

**6. 주문 시**
```sql
INSERT INTO order_items (order_id, product_id, variant_id, quantity, sku)
VALUES ('ORDER1', 'P1', 'V1', 2, 'JACKET-66-PINK');
-- ✅ variant_id로 정확한 SKU 참조!
```

---

## 4. 마이그레이션 전략

### 4.1 단계별 마이그레이션

**Phase 1: 새 테이블 생성** (기존 영향 없음)
```sql
-- 1단계: 새 테이블 생성
CREATE TABLE suppliers (...);
CREATE TABLE categories (...);
CREATE TABLE product_options_new (...);  -- 기존과 별도
CREATE TABLE product_option_values (...);
CREATE TABLE product_variants (...);
CREATE TABLE variant_option_values (...);

-- 2단계: products 테이블에 컬럼 추가
ALTER TABLE products ADD COLUMN model_number VARCHAR(100);
ALTER TABLE products ADD COLUMN supplier_id UUID REFERENCES suppliers(id);
ALTER TABLE products ADD COLUMN purchase_price NUMERIC(10,2);
ALTER TABLE products ADD COLUMN purchase_date DATE;
ALTER TABLE products ADD COLUMN detailed_description TEXT;
ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id);

-- 3단계: order_items 테이블에 컬럼 추가
ALTER TABLE order_items ADD COLUMN variant_id UUID REFERENCES product_variants(id);
```

**Phase 2: 데이터 변환** (읽기 전용)
```sql
-- 기존 product_options (JSONB) → 새 테이블로 변환
-- 1. 옵션 정의 생성
INSERT INTO product_options_new (product_id, name)
SELECT product_id, name
FROM product_options
WHERE name != '조합';  -- 조합 형태 제외

-- 2. 옵션 값 생성
-- (복잡한 변환 로직 - 별도 스크립트 필요)

-- 3. Variant 생성
-- (옵션 조합 계산 - 별도 스크립트 필요)
```

**Phase 3: 점진적 전환**
```sql
-- 1. 새 상품 등록 시 새 구조 사용
-- 2. 기존 상품 수정 시 새 구조로 변환
-- 3. 일괄 변환 스크립트 실행 (야간)
```

**Phase 4: 기존 테이블 제거** (충분한 테스트 후)
```sql
-- product_options (JSONB 방식) → 읽기 전용으로 변경 또는 삭제
```

### 4.2 롤백 전략

**실패 시 롤백**:
```sql
-- 1. 새 테이블 삭제
DROP TABLE IF EXISTS variant_option_values;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS product_option_values;
DROP TABLE IF EXISTS product_options_new;
DROP TABLE IF EXISTS suppliers;

-- 2. 추가된 컬럼 제거
ALTER TABLE products DROP COLUMN IF EXISTS supplier_id;
ALTER TABLE products DROP COLUMN IF EXISTS model_number;
ALTER TABLE order_items DROP COLUMN IF EXISTS variant_id;

-- 3. 기존 구조로 복구 (백업에서)
```

---

## 5. 성능 최적화

### 5.1 인덱스 전략

**핵심 인덱스**:
```sql
-- 1. Primary Key (자동)
-- 2. Foreign Key
CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_products_supplier_id ON products(supplier_id);
CREATE INDEX idx_products_category_id ON products(category_id);

-- 3. 검색용
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_inventory ON product_variants(inventory);

-- 4. 복합 인덱스
CREATE INDEX idx_variants_product_sku ON product_variants(product_id, sku);
CREATE INDEX idx_order_items_order_variant ON order_items(order_id, variant_id);
```

### 5.2 쿼리 최적화

**재고 조회 (빠름)**:
```sql
-- ✅ Good: 인덱스 활용
SELECT inventory
FROM product_variants
WHERE sku = 'JACKET-66-PINK';

-- ❌ Bad: JSONB 검색
SELECT values->>'inventory'
FROM product_options
WHERE values @> '[{"name": "66"}]'::jsonb;
```

**옵션 조합 조회**:
```sql
-- Variant의 옵션 조합 가져오기
SELECT
  v.sku,
  v.inventory,
  po.name AS option_name,
  pov.value AS option_value
FROM product_variants v
JOIN variant_option_values vov ON v.id = vov.variant_id
JOIN product_option_values pov ON vov.option_value_id = pov.id
JOIN product_options po ON pov.option_id = po.id
WHERE v.product_id = 'P1'
ORDER BY v.sku, po.display_order;
```

### 5.3 자동 재고 계산

**Trigger로 products.inventory 자동 업데이트**:
```sql
CREATE OR REPLACE FUNCTION update_product_total_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- product의 모든 variant 재고 합산
  UPDATE products
  SET
    inventory = (
      SELECT COALESCE(SUM(inventory), 0)
      FROM product_variants
      WHERE product_id = NEW.product_id
    ),
    updated_at = NOW()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_inventory
AFTER INSERT OR UPDATE OF inventory ON product_variants
FOR EACH ROW
EXECUTE FUNCTION update_product_total_inventory();
```

---

## 6. 확장성 고려사항

### 6.1 추가 가능한 기능

**1. 창고별 재고**:
```sql
CREATE TABLE warehouses (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  address TEXT
);

CREATE TABLE variant_warehouse_inventory (
  variant_id UUID REFERENCES product_variants(id),
  warehouse_id UUID REFERENCES warehouses(id),
  inventory INTEGER DEFAULT 0,
  PRIMARY KEY (variant_id, warehouse_id)
);
```

**2. 회원 등급별 가격**:
```sql
CREATE TABLE variant_tier_prices (
  variant_id UUID REFERENCES product_variants(id),
  tier_level INTEGER,  -- 1=일반, 2=VIP, 3=VVIP
  price NUMERIC(10,2),
  PRIMARY KEY (variant_id, tier_level)
);
```

**3. 옵션 3개 이상**:
- 현재 구조는 이미 지원함!
- 사이즈/색상/재질 → 3차원 조합 가능

**4. Variant별 이미지**:
- 이미 `product_variants.image_url` 필드 존재
- 색상별 다른 이미지 표시 가능

### 6.2 발주 시스템 확장

**발주서 생성 쿼리**:
```sql
-- 특정 기간 + 특정 업체의 판매 집계
SELECT
  s.name AS 업체명,
  s.contact_person AS 담당자,
  s.phone AS 연락처,
  p.title AS 상품명,
  p.model_number AS 모델번호,
  v.sku AS SKU,
  v.supplier_sku AS 업체상품코드,
  SUM(oi.quantity) AS 총판매수량,
  p.purchase_price AS 매입단가,
  SUM(oi.quantity) * p.purchase_price AS 발주금액
FROM order_items oi
JOIN product_variants v ON oi.variant_id = v.id
JOIN products p ON v.product_id = p.id
JOIN suppliers s ON p.supplier_id = s.id
WHERE oi.created_at >= '2025-10-01'
  AND oi.created_at < '2025-11-01'
  AND s.id = 'SUP1'  -- 특정 업체
GROUP BY s.id, s.name, s.contact_person, s.phone,
         p.id, p.title, p.model_number, v.sku, v.supplier_sku, p.purchase_price
ORDER BY 총판매수량 DESC;
```

**마진 분석**:
```sql
-- 상품별 마진 계산
SELECT
  p.title,
  p.purchase_price AS 매입가,
  p.price AS 판매가,
  p.price - p.purchase_price AS 마진,
  ROUND((p.price - p.purchase_price) / p.price * 100, 2) AS 마진율
FROM products p
WHERE p.purchase_price IS NOT NULL
ORDER BY 마진율 DESC;
```

---

## 7. 요약

### 7.1 새 구조의 장점

| 항목 | 기존 (JSONB) | 새 구조 (정규화) |
|------|-------------|-----------------|
| **옵션 조합 재고** | ❌ 불가능 | ✅ 가능 |
| **쿼리 성능** | ❌ 느림 (JSONB 검색) | ✅ 빠름 (인덱스) |
| **데이터 무결성** | ❌ 약함 | ✅ 강함 (FK) |
| **확장성** | ❌ 제한적 | ✅ 높음 |
| **발주 기능** | ❌ 어려움 | ✅ 쉬움 |
| **SKU 추적** | ❌ 불가능 | ✅ 가능 |

### 7.2 핵심 변경사항

1. ✅ **Variant 중심 설계**: 옵션 조합 = SKU = Variant
2. ✅ **정규화**: JSONB 최소화, 관계형 테이블로 분리
3. ✅ **업체 관리**: suppliers 테이블 추가 → 발주서 출력
4. ✅ **상품 상세정보**: 모델번호, 매입가, 매입일 등 추가
5. ✅ **정확한 주문 추적**: order_items.variant_id로 정확한 SKU 참조
6. ✅ **자동 재고 계산**: Trigger로 products.inventory 자동 업데이트

### 7.3 마이그레이션 위험도

- 🟢 **위험도: 낮음**
  - 기존 테이블 삭제 없음
  - 컬럼 추가만 진행
  - 점진적 전환 가능
  - 롤백 전략 준비

### 7.4 예상 작업 시간

- Phase 1 (테이블 생성): 2시간
- Phase 2 (데이터 변환 스크립트): 3시간
- Phase 3 (API 함수 수정): 4시간
- Phase 4 (UI 수정): 5시간
- Phase 5 (테스트): 2시간
- **총 예상 시간: 16시간**

---

## 8. 다음 단계

1. ✅ **문서 검토 및 승인**
2. 🔄 **SQL 마이그레이션 스크립트 작성**
3. 🔄 **데이터 변환 스크립트 작성**
4. 🔄 **API 함수 수정**
5. 🔄 **관리자 UI 수정**
6. 🔄 **사용자 UI 수정**
7. 🔄 **테스트 및 배포**

---

**작성자**: Claude Code
**검토 필요**: 데이터베이스 구조, 마이그레이션 전략, 성능 최적화
**최종 업데이트**: 2025-10-01
