-- Migration: order_items에 thumbnail_url, product_number 추가
-- Date: 2025-10-22
-- Purpose: products JOIN 제거 완전 지원 (성능 최적화 + 데이터 정규화)

-- 1. 컬럼 추가
ALTER TABLE order_items 
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS product_number VARCHAR(20);

-- 2. 기존 데이터 마이그레이션 (products 테이블에서 복사)
UPDATE order_items 
SET 
  thumbnail_url = products.thumbnail_url,
  product_number = products.product_number
FROM products
WHERE order_items.product_id = products.id
  AND (order_items.thumbnail_url IS NULL OR order_items.product_number IS NULL);

-- 3. 인덱스 추가 (검색 최적화)
CREATE INDEX IF NOT EXISTS idx_order_items_product_number ON order_items(product_number);

-- 4. 마이그레이션 결과 확인
DO $$
DECLARE
  total_count INTEGER;
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM order_items;
  SELECT COUNT(*) INTO migrated_count FROM order_items WHERE thumbnail_url IS NOT NULL OR product_number IS NOT NULL;
  
  RAISE NOTICE '✅ 마이그레이션 완료: % / % (%.1f%%)', migrated_count, total_count, (migrated_count::FLOAT / NULLIF(total_count, 0) * 100);
END $$;
