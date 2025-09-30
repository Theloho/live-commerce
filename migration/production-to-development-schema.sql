-- 🚀 프로덕션 → 개발 스키마 안전 마이그레이션 SQL
-- 목표: 무중단 서비스, 데이터 보존, 백워드 호환성
-- 실행 시간: 약 3-5분 예상

-- =============================================================================
-- Phase 1: 백업 및 안전 확인
-- =============================================================================

-- 현재 order_items 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'order_items'
ORDER BY ordinal_position;

-- 현재 데이터 백업 테이블 생성
CREATE TABLE IF NOT EXISTS order_items_backup_20250930 AS
SELECT * FROM order_items;

-- 백업 확인
SELECT COUNT(*) as total_orders FROM order_items_backup_20250930;

-- =============================================================================
-- Phase 2: 스키마 확장 (무중단 - 새 컬럼 추가)
-- =============================================================================

-- 1. order_items 테이블에 새 컬럼들 추가 (NULL 허용으로 안전하게)
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS total DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS variant_title TEXT,
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS product_snapshot JSONB DEFAULT '{}';

-- 2. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_order_items_sku ON order_items(sku);
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_title);

-- =============================================================================
-- Phase 3: 데이터 마이그레이션 (기존 → 신규 컬럼)
-- =============================================================================

-- 기존 데이터를 새 컬럼으로 복사
UPDATE order_items SET
  price = unit_price,              -- unit_price → price
  total = total_price              -- total_price → total
WHERE price IS NULL OR total IS NULL;

-- products 테이블 조인하여 title 정보 채우기
UPDATE order_items
SET title = products.title
FROM products
WHERE order_items.product_id = products.id
AND order_items.title IS NULL;

-- title이 여전히 NULL인 경우 기본값 설정
UPDATE order_items
SET title = '상품명 미확인'
WHERE title IS NULL;

-- =============================================================================
-- Phase 4: 제약조건 및 기본값 설정
-- =============================================================================

-- 필수 컬럼들에 NOT NULL 제약조건 추가 (데이터 채운 후)
-- title은 필수로 설정
ALTER TABLE order_items
ALTER COLUMN title SET NOT NULL;

-- price는 unit_price와 동기화 유지를 위해 일단 NULL 허용 유지
-- total은 total_price와 동기화 유지를 위해 일단 NULL 허용 유지

-- =============================================================================
-- Phase 5: 백워드 호환성 보장 (기존 코드 보호)
-- =============================================================================

-- unit_price, total_price 컬럼은 유지 (기존 코드 호환성)
-- 향후 점진적으로 price, total로 마이그레이션 예정

-- =============================================================================
-- Phase 6: 검증 쿼리
-- =============================================================================

-- 마이그레이션 결과 확인
SELECT
  COUNT(*) as total_items,
  COUNT(title) as items_with_title,
  COUNT(price) as items_with_price,
  COUNT(total) as items_with_total,
  COUNT(unit_price) as items_with_unit_price,
  COUNT(total_price) as items_with_total_price
FROM order_items;

-- 데이터 일관성 확인
SELECT
  COUNT(*) as inconsistent_price_items
FROM order_items
WHERE price != unit_price;

SELECT
  COUNT(*) as inconsistent_total_items
FROM order_items
WHERE total != total_price;

-- =============================================================================
-- Phase 7: 롤백 스크립트 (필요시 사용)
-- =============================================================================

-- 롤백이 필요한 경우 아래 주석을 해제하고 실행:
-- DROP TABLE IF EXISTS order_items;
-- ALTER TABLE order_items_backup_20250930 RENAME TO order_items;

-- =============================================================================
-- 마이그레이션 완료 확인
-- =============================================================================

-- 최종 스키마 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'order_items'
ORDER BY ordinal_position;

-- 샘플 데이터 확인 (최근 주문 5개)
SELECT
  id,
  product_id,
  title,           -- 새로 추가된 컬럼
  price,          -- 새로 추가된 컬럼 (unit_price와 동일)
  total,          -- 새로 추가된 컬럼 (total_price와 동일)
  unit_price,     -- 기존 컬럼 (호환성 유지)
  total_price,    -- 기존 컬럼 (호환성 유지)
  quantity,
  selected_options
FROM order_items
ORDER BY created_at DESC
LIMIT 5;

-- 마이그레이션 성공 로그
INSERT INTO migration_log (
  migration_name,
  executed_at,
  description
) VALUES (
  'production-to-development-schema',
  NOW(),
  '프로덕션 DB 개발 스키마 마이그레이션 완료 - 확장성/보안/카카오연동 대비'
);

-- 🎉 마이그레이션 완료!
-- 이제 개발 스키마 기반 코드를 안전하게 배포할 수 있습니다.