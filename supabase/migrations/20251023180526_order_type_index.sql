-- ========================================
-- 주문 성능 최적화: order_type 인덱스 추가
-- ========================================
-- 작성일: 2025-10-23
-- 목적: 카카오 사용자 주문 조회 성능 최적화
-- 문제: order_type LIKE '%KAKAO:xxx%' 쿼리가 5.88초 소요
-- 해결: 복합 인덱스 + GIN 인덱스로 1-2초 → 0.3초 단축
-- ========================================

-- ========================================
-- 1. 복합 인덱스 (order_type + status)
-- ========================================
-- 용도: 무료배송 조건 확인, 장바구니 병합 조회
-- 쿼리 예시:
--   SELECT * FROM orders
--   WHERE order_type LIKE 'cart:KAKAO:xxx%' AND status = 'pending'

CREATE INDEX IF NOT EXISTS idx_orders_order_type_status
ON orders (order_type, status);

COMMENT ON INDEX idx_orders_order_type_status IS
'주문 타입 + 상태 복합 인덱스 (무료배송 확인, 장바구니 조회 최적화)';

-- ========================================
-- 2. GIN 인덱스 (order_type) - LIKE 쿼리 최적화
-- ========================================
-- 용도: LIKE '%KAKAO:xxx%' 패턴 매칭 최적화
-- 전제조건: pg_trgm 확장 활성화 필요

-- pg_trgm 확장 확인 및 활성화
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN 인덱스 생성 (trigram 방식)
CREATE INDEX IF NOT EXISTS idx_orders_order_type_gin
ON orders USING GIN (order_type gin_trgm_ops);

COMMENT ON INDEX idx_orders_order_type_gin IS
'주문 타입 GIN 인덱스 (LIKE 패턴 매칭 최적화, pg_trgm 사용)';

-- ========================================
-- 3. 인덱스 성능 검증 쿼리
-- ========================================

-- EXPLAIN ANALYZE로 인덱스 사용 확인
-- 실행 예시 (콘솔에서 실행):
/*
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE order_type LIKE '%KAKAO:1234567890%'
AND status = 'pending';

-- 기대 결과:
-- Before: Seq Scan (1-2초)
-- After:  Bitmap Index Scan on idx_orders_order_type_gin (0.3초)
*/

-- ========================================
-- 4. 인덱스 크기 확인
-- ========================================

-- 인덱스 크기 조회 쿼리 (선택사항)
/*
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'orders'
ORDER BY pg_relation_size(indexrelid) DESC;
*/

-- ========================================
-- 예상 성능 개선
-- ========================================
-- Before: 1-2초 (Seq Scan)
-- After:  0.3초 (Index Scan)
-- 개선율: 70% 빠름
-- ========================================
