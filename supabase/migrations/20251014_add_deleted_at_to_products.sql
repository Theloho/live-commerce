-- ================================================================
-- Soft Delete 시스템: products 테이블에 deleted_at 컬럼 추가
-- ================================================================
-- 목적: 상품 삭제 시 hard delete 대신 soft delete 사용
-- 이유:
--   1. 주문 내역 보존 (order_items.variant_id 관계 유지)
--   2. SKU 중복 방지 (삭제된 상품의 SKU 재사용 차단)
--   3. 데이터 복구 가능
--   4. 삭제 이력 추적
-- ================================================================

-- 1. products 테이블에 deleted_at 컬럼 추가
ALTER TABLE products
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. deleted_at 컬럼에 인덱스 추가 (조회 성능 최적화)
-- 대부분의 쿼리는 status = 'active'이고 deleted_at IS NULL인 상품을 조회
CREATE INDEX idx_products_deleted_at ON products(deleted_at);

-- 3. status + deleted_at 복합 인덱스 (WHERE status != 'deleted' 쿼리 최적화)
CREATE INDEX idx_products_status_deleted_at ON products(status, deleted_at);

COMMENT ON COLUMN products.deleted_at IS '상품 삭제 시점 (Soft Delete). NULL = 활성 상품, NOT NULL = 삭제된 상품';
