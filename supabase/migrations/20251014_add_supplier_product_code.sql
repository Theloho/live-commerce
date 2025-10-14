-- ================================================================
-- products 테이블에 supplier_product_code 컬럼 추가
-- ================================================================
-- 목적: 업체에서 사용하는 상품 코드 저장
-- ================================================================

-- 1. supplier_product_code 컬럼 추가
ALTER TABLE products
ADD COLUMN supplier_product_code VARCHAR(100) DEFAULT NULL;

-- 2. 검색 최적화를 위한 인덱스 추가
CREATE INDEX idx_products_supplier_product_code ON products(supplier_product_code) WHERE supplier_product_code IS NOT NULL;

COMMENT ON COLUMN products.supplier_product_code IS '업체에서 사용하는 상품 코드. 발주 시 업체와 소통할 때 사용.';
