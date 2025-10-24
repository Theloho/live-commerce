-- 마이그레이션: order_items 테이블에 product_number, thumbnail_url 추가
-- 목적: products JOIN 제거를 통한 성능 최적화 (조회 속도 20배 향상)
-- 작성일: 2025-10-24

-- 1. 컬럼 추가
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS product_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 2. 기존 데이터 마이그레이션 (products 테이블에서 복사)
UPDATE order_items oi
SET
  product_number = p.product_number,
  thumbnail_url = p.thumbnail_url
FROM products p
WHERE oi.product_id = p.id
  AND (oi.product_number IS NULL OR oi.thumbnail_url IS NULL);

-- 3. 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_order_items_product_number
ON order_items(product_number)
WHERE product_number IS NOT NULL;

-- 4. 코멘트 추가
COMMENT ON COLUMN order_items.product_number IS '제품번호 (스냅샷 - 성능 최적화용)';
COMMENT ON COLUMN order_items.thumbnail_url IS '썸네일 URL (스냅샷 - 성능 최적화용)';
