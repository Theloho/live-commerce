-- ============================================================================
-- 새로운 Variant 기반 상품 시스템 마이그레이션
-- 작성일: 2025-10-01
-- 목적: 옵션 조합 재고 관리 + 상품 상세정보 + 발주 시스템
-- ============================================================================

-- ============================================================================
-- PART 1: 기존 테이블 정리 (모든 관련 테이블 삭제)
-- ============================================================================

-- ⚠️ 주의: 기존 데이터가 모두 삭제됩니다!
-- 순서 중요: 참조 관계 역순으로 삭제

DROP TABLE IF EXISTS variant_option_values CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS product_option_values CASCADE;
DROP TABLE IF EXISTS product_options CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- products 테이블의 추가된 컬럼들 삭제 (에러 방지용)
DO $$
BEGIN
    -- supplier_id 컬럼 삭제
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='products' AND column_name='supplier_id'
    ) THEN
        ALTER TABLE products DROP COLUMN supplier_id;
    END IF;

    -- category_id 컬럼 삭제 (기존에 있을 수 있으므로)
    -- 단, 이미 사용 중이라면 삭제하지 않음
END $$;

-- order_items 테이블의 variant_id 컬럼 삭제
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='order_items' AND column_name='variant_id'
    ) THEN
        ALTER TABLE order_items DROP COLUMN variant_id;
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '✅ 기존 테이블 정리 완료';
END $$;

-- ============================================================================
-- PART 2: 새 테이블 생성
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 suppliers (업체 관리)
-- ----------------------------------------------------------------------------
CREATE TABLE suppliers (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,

    -- 연락처
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),

    -- 주소
    address TEXT,
    detail_address TEXT,

    -- 거래 조건
    bank_name VARCHAR(50),
    account_number VARCHAR(50),
    account_holder VARCHAR(100),
    payment_terms VARCHAR(100),

    -- 메타 정보
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);

-- 코멘트
COMMENT ON TABLE suppliers IS '업체(공급업체) 정보 - 발주서 생성 및 매입 관리용';
COMMENT ON COLUMN suppliers.code IS '업체 고유 코드 (예: SUP001, SUP002)';
COMMENT ON COLUMN suppliers.payment_terms IS '결제 조건 (예: 월말 결제, 15일 후 결제)';

DO $$
BEGIN
    RAISE NOTICE '✅ suppliers 테이블 생성 완료';
END $$;

-- ----------------------------------------------------------------------------
-- 2.2 categories (카테고리 - 계층 구조)
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,

    -- 계층 구조
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 0,

    -- 표시
    display_order INTEGER DEFAULT 0,
    icon VARCHAR(100),
    thumbnail_url TEXT,

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
CREATE INDEX idx_categories_is_visible ON categories(is_visible);

-- 코멘트
COMMENT ON TABLE categories IS '상품 카테고리 (계층 구조 지원: 대분류 > 중분류 > 소분류)';
COMMENT ON COLUMN categories.parent_id IS '상위 카테고리 ID (NULL이면 최상위 카테고리)';
COMMENT ON COLUMN categories.level IS '계층 레벨 (0=대분류, 1=중분류, 2=소분류)';
COMMENT ON COLUMN categories.slug IS 'URL용 슬러그 (예: outer-jacket)';

DO $$
BEGIN
    RAISE NOTICE '✅ categories 테이블 생성 완료';
END $$;

-- ----------------------------------------------------------------------------
-- 2.3 product_options (옵션 정의 - 정규화)
-- ----------------------------------------------------------------------------
CREATE TABLE product_options (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,

    -- 옵션 정보
    name VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0,

    -- 메타 정보
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 제약조건
    UNIQUE(product_id, name)
);

-- 인덱스
CREATE INDEX idx_product_options_product_id ON product_options(product_id);
CREATE INDEX idx_product_options_display_order ON product_options(display_order);

-- 코멘트
COMMENT ON TABLE product_options IS '상품 옵션 정의 (예: 사이즈, 색상, 재질)';
COMMENT ON COLUMN product_options.display_order IS '표시 순서 (0=첫번째, 1=두번째)';
COMMENT ON COLUMN product_options.is_required IS '필수 선택 여부';

DO $$
BEGIN
    RAISE NOTICE '✅ product_options 테이블 생성 완료';
END $$;

-- ----------------------------------------------------------------------------
-- 2.4 product_option_values (옵션 값)
-- ----------------------------------------------------------------------------
CREATE TABLE product_option_values (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID REFERENCES product_options(id) ON DELETE CASCADE,

    -- 옵션 값
    value VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0,

    -- 메타 정보
    color_code VARCHAR(7),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 제약조건
    UNIQUE(option_id, value)
);

-- 인덱스
CREATE INDEX idx_option_values_option_id ON product_option_values(option_id);
CREATE INDEX idx_option_values_display_order ON product_option_values(display_order);

-- 코멘트
COMMENT ON TABLE product_option_values IS '옵션 값 정의 (예: 사이즈=66, 색상=핑크)';
COMMENT ON COLUMN product_option_values.color_code IS '색상 코드 (색상 옵션인 경우, 예: #FF0000)';
COMMENT ON COLUMN product_option_values.image_url IS '옵션별 대표 이미지 (선택사항)';

DO $$ BEGIN RAISE NOTICE '✅ product_option_values 테이블 생성 완료';
END $$;

-- ----------------------------------------------------------------------------
-- 2.5 product_variants (상품 변형 = SKU) ⭐ 핵심!
-- ----------------------------------------------------------------------------
CREATE TABLE product_variants (
    -- 기본 정보
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,

    -- SKU 정보
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),

    -- ⭐ 재고 (핵심!)
    inventory INTEGER DEFAULT 0 NOT NULL CHECK (inventory >= 0),

    -- 가격 조정
    price_adjustment NUMERIC(10,2) DEFAULT 0,

    -- 업체 정보
    supplier_sku VARCHAR(100),

    -- 물리적 속성
    weight_g INTEGER,
    dimensions JSONB,

    -- 이미지
    image_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,

    -- 상태
    is_active BOOLEAN DEFAULT true,

    -- 메타 정보
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_inventory ON product_variants(inventory);
CREATE INDEX idx_variants_is_active ON product_variants(is_active);
CREATE INDEX idx_variants_product_sku ON product_variants(product_id, sku);

-- 코멘트
COMMENT ON TABLE product_variants IS '상품 변형 (옵션 조합 = SKU, 각 조합별 독립 재고 관리)';
COMMENT ON COLUMN product_variants.sku IS '고유 SKU (예: JACKET-66-PINK)';
COMMENT ON COLUMN product_variants.inventory IS '재고 수량 (이 조합의 실제 재고)';
COMMENT ON COLUMN product_variants.supplier_sku IS '업체 상품코드 (발주서 출력용)';
COMMENT ON COLUMN product_variants.price_adjustment IS '가격 조정 (예: Large +5000원, XL +10000원)';
COMMENT ON COLUMN product_variants.dimensions IS '치수 정보 JSONB (예: {"length": 10, "width": 20, "height": 5})';

DO $$ BEGIN RAISE NOTICE '✅ product_variants 테이블 생성 완료';
END $$;

-- ----------------------------------------------------------------------------
-- 2.6 variant_option_values (변형-옵션 매핑)
-- ----------------------------------------------------------------------------
CREATE TABLE variant_option_values (
    -- 연결 정보
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    option_value_id UUID REFERENCES product_option_values(id) ON DELETE RESTRICT,

    -- 복합 Primary Key
    PRIMARY KEY (variant_id, option_value_id)
);

-- 인덱스 (PK로 자동 생성)
CREATE INDEX idx_variant_options_value_id ON variant_option_values(option_value_id);

-- 코멘트
COMMENT ON TABLE variant_option_values IS 'Variant와 Option Value 매핑 테이블 (조합 정의)';

DO $$ BEGIN RAISE NOTICE '✅ variant_option_values 테이블 생성 완료';
END $$;

-- ============================================================================
-- PART 3: 기존 테이블 수정
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 products 테이블 - 컬럼 추가
-- ----------------------------------------------------------------------------

-- 모델번호
ALTER TABLE products
ADD COLUMN IF NOT EXISTS model_number VARCHAR(100);

-- 상세 정보
ALTER TABLE products
ADD COLUMN IF NOT EXISTS detailed_description TEXT;

-- 매입 정보
ALTER TABLE products
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10,2);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS purchase_date DATE;

-- 업체 연결
ALTER TABLE products
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- 카테고리 연결 (기존에 category_id가 있을 수 있으므로 체크)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='products' AND column_name='category_id'
    ) THEN
        ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_model_number ON products(model_number);

-- 코멘트
COMMENT ON COLUMN products.model_number IS '모델번호 (예: JK-2024-001)';
COMMENT ON COLUMN products.detailed_description IS '상세 정보 (긴 텍스트)';
COMMENT ON COLUMN products.purchase_price IS '매입가 (원가)';
COMMENT ON COLUMN products.purchase_date IS '매입일';
COMMENT ON COLUMN products.supplier_id IS '공급업체 ID (발주서 생성용)';
COMMENT ON COLUMN products.inventory IS '전체 재고 (모든 variant 재고 합계, 자동 계산됨)';

DO $$ BEGIN RAISE NOTICE '✅ products 테이블 수정 완료 (컬럼 추가)';
END $$;

-- ----------------------------------------------------------------------------
-- 3.2 order_items 테이블 - variant_id 추가
-- ----------------------------------------------------------------------------

-- variant_id 컬럼 추가
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);

-- 코멘트
COMMENT ON COLUMN order_items.variant_id IS '정확한 SKU 참조 (옵션 조합), 재고 추적 및 발주서 생성용';

DO $$ BEGIN RAISE NOTICE '✅ order_items 테이블 수정 완료 (variant_id 추가)';
END $$;

-- ============================================================================
-- PART 4: 트리거 및 함수 생성
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 products.inventory 자동 계산 함수
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_product_total_inventory(p_product_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_total INTEGER;
BEGIN
    SELECT COALESCE(SUM(inventory), 0) INTO v_total
    FROM product_variants
    WHERE product_id = p_product_id AND is_active = true;

    RETURN v_total;
END;
$$;

COMMENT ON FUNCTION calculate_product_total_inventory IS '상품의 모든 활성 variant 재고를 합산하여 전체 재고를 계산';

DO $$ BEGIN RAISE NOTICE '✅ calculate_product_total_inventory 함수 생성 완료';
END $$;

-- ----------------------------------------------------------------------------
-- 4.2 variant 재고 변경 시 product.inventory 자동 업데이트 트리거
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_product_inventory_on_variant_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- variant의 재고가 변경되면 product의 전체 재고 재계산
    UPDATE products
    SET
        inventory = calculate_product_total_inventory(NEW.product_id),
        updated_at = NOW()
    WHERE id = NEW.product_id;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_product_inventory_on_variant_change IS 'Variant 재고 변경 시 상품 전체 재고 자동 재계산';

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_product_inventory ON product_variants;

CREATE TRIGGER trigger_update_product_inventory
AFTER INSERT OR UPDATE OF inventory, is_active ON product_variants
FOR EACH ROW
EXECUTE FUNCTION update_product_inventory_on_variant_change();

COMMENT ON TRIGGER trigger_update_product_inventory ON product_variants IS 'Variant 재고/활성화 변경 시 상품 전체 재고 자동 업데이트';

DO $$ BEGIN RAISE NOTICE '✅ 트리거 생성 완료 (product.inventory 자동 계산)';
END $$;

-- ----------------------------------------------------------------------------
-- 4.3 variant 재고 업데이트 함수 (트랜잭션 보장)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_variant_inventory(
    p_variant_id UUID,
    p_quantity_change INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_inventory INTEGER;
    v_new_inventory INTEGER;
    v_result JSONB;
BEGIN
    -- FOR UPDATE 락으로 동시성 제어
    SELECT inventory INTO v_current_inventory
    FROM product_variants
    WHERE id = p_variant_id
    FOR UPDATE;

    -- Variant가 없는 경우
    IF v_current_inventory IS NULL THEN
        RAISE EXCEPTION 'Variant not found: %', p_variant_id;
    END IF;

    -- 새 재고 계산
    v_new_inventory := v_current_inventory + p_quantity_change;

    -- 재고 부족 체크
    IF v_new_inventory < 0 THEN
        RAISE EXCEPTION 'Insufficient inventory. Current: %, Requested: %',
            v_current_inventory, ABS(p_quantity_change);
    END IF;

    -- 재고 업데이트
    UPDATE product_variants
    SET
        inventory = v_new_inventory,
        updated_at = NOW()
    WHERE id = p_variant_id;

    -- 결과 반환
    v_result := jsonb_build_object(
        'variant_id', p_variant_id,
        'old_inventory', v_current_inventory,
        'new_inventory', v_new_inventory,
        'change', p_quantity_change
    );

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION update_variant_inventory IS 'Variant 재고를 안전하게 업데이트 (FOR UPDATE 락, 재고 부족 체크)';

DO $$ BEGIN RAISE NOTICE '✅ update_variant_inventory 함수 생성 완료';
END $$;

-- ============================================================================
-- PART 5: 권한 설정
-- ============================================================================

-- authenticated 사용자에게 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION calculate_product_total_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION update_variant_inventory TO authenticated;

-- anon 사용자에게 읽기 전용 함수 권한
GRANT EXECUTE ON FUNCTION calculate_product_total_inventory TO anon;

DO $$ BEGIN RAISE NOTICE '✅ 권한 설정 완료';
END $$;

-- ============================================================================
-- PART 6: 샘플 데이터 (테스트용)
-- ============================================================================

-- 업체 샘플 데이터
INSERT INTO suppliers (code, name, contact_person, phone, payment_terms, is_active)
VALUES
    ('SUP001', '동대문 의류', '김철수', '010-1234-5678', '월말 결제', true),
    ('SUP002', 'ABC 무역', '이영희', '010-8765-4321', '15일 후 결제', true)
ON CONFLICT (code) DO NOTHING;

-- 카테고리 샘플 데이터
INSERT INTO categories (name, slug, level, display_order, is_visible)
VALUES
    ('상의', 'tops', 0, 0, true),
    ('하의', 'bottoms', 0, 1, true),
    ('아우터', 'outer', 0, 2, true)
ON CONFLICT (slug) DO NOTHING;

DO $$ BEGIN RAISE NOTICE '✅ 샘플 데이터 삽입 완료';
END $$;

-- ============================================================================
-- 완료 메시지
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ 새로운 Variant 시스템 마이그레이션 완료!';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📦 생성된 테이블:';
    RAISE NOTICE '   1. suppliers (업체 관리)';
    RAISE NOTICE '   2. categories (카테고리)';
    RAISE NOTICE '   3. product_options (옵션 정의)';
    RAISE NOTICE '   4. product_option_values (옵션 값)';
    RAISE NOTICE '   5. product_variants (SKU/재고 핵심) ⭐';
    RAISE NOTICE '   6. variant_option_values (조합 매핑)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 수정된 테이블:';
    RAISE NOTICE '   - products (컬럼 추가: supplier_id, model_number, 매입가 등)';
    RAISE NOTICE '   - order_items (컬럼 추가: variant_id)';
    RAISE NOTICE '';
    RAISE NOTICE '⚡ 생성된 함수:';
    RAISE NOTICE '   - calculate_product_total_inventory() - 전체 재고 계산';
    RAISE NOTICE '   - update_variant_inventory() - 안전한 재고 업데이트';
    RAISE NOTICE '';
    RAISE NOTICE '🔔 생성된 트리거:';
    RAISE NOTICE '   - trigger_update_product_inventory (자동 재고 합산)';
    RAISE NOTICE '';
    RAISE NOTICE '📊 샘플 데이터:';
    RAISE NOTICE '   - suppliers: 2개 업체';
    RAISE NOTICE '   - categories: 3개 카테고리';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '다음 단계: API 함수 구현 (lib/supabaseApi.js)';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;
