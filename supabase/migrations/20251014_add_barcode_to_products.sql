-- ================================================================
-- products 테이블에 barcode 컬럼 추가
-- ================================================================
-- 목적: 바코드 스캐너 연동을 위한 준비 (향후 사용 대비)
-- ================================================================

-- 1. barcode 컬럼 추가
ALTER TABLE products
ADD COLUMN barcode VARCHAR(100) DEFAULT NULL;

-- 2. barcode 인덱스 추가 (바코드 검색 최적화)
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

COMMENT ON COLUMN products.barcode IS '상품 바코드 (EAN-13, UPC 등). 향후 바코드 스캐너 연동 시 사용.';
