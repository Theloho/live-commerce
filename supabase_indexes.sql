-- =====================================================
-- 주문 관리 성능 최적화를 위한 인덱스 추가
-- =====================================================
-- 실행 방법: Supabase Dashboard → SQL Editor → 복사 붙여넣기 → Run
-- 예상 효과: 쿼리 속도 70-90% 개선 (5-10초 → 0.5-1초)
-- =====================================================

-- 1. status + created_at 복합 인덱스 (가장 중요! ⭐⭐⭐)
-- 각 상태별 페이지에서 날짜로 정렬할 때 사용
-- 예: 장바구니(pending), 주문내역(verifying), 구매확정(paid) 등
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
ON orders (status, created_at DESC);

-- 2. payment_group_id 인덱스 (그룹 주문 조회용)
-- 일괄결제 주문을 빠르게 조회
CREATE INDEX IF NOT EXISTS idx_orders_payment_group_id
ON orders (payment_group_id)
WHERE payment_group_id IS NOT NULL;

-- 3. customer_order_number 인덱스 (주문번호 검색용)
-- 주문번호로 검색할 때 사용
CREATE INDEX IF NOT EXISTS idx_orders_customer_order_number
ON orders (customer_order_number);

-- 4. order_type 인덱스 (카카오 사용자 검색용)
-- 카카오 ID로 검색할 때 사용
CREATE INDEX IF NOT EXISTS idx_orders_order_type
ON orders (order_type);

-- =====================================================
-- 실행 후 확인 방법
-- =====================================================
-- 아래 쿼리로 인덱스가 잘 생성되었는지 확인:
--
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE tablename = 'orders'
-- ORDER BY indexname;
-- =====================================================
