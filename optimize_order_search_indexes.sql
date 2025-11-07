-- ==========================================
-- 주문 검색 성능 최적화 - DB 인덱스 추가
-- 목표: 검색 속도 10-50배 향상
-- ==========================================

-- 1. customer_order_number 인덱스 (주문번호 검색)
-- 사용처: 주문번호로 검색 (가장 많이 사용)
CREATE INDEX IF NOT EXISTS idx_orders_customer_order_number
ON orders (customer_order_number);

-- 2. order_type 인덱스 (카카오 ID 검색)
-- 사용처: order_type LIKE '%KAKAO%' 검색
CREATE INDEX IF NOT EXISTS idx_orders_order_type
ON orders (order_type);

-- 3. created_at 인덱스 (정렬용 - 이미 있을 수도 있음)
-- 사용처: ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc
ON orders (created_at DESC);

-- 4. status + created_at 복합 인덱스 (필터 + 정렬 최적화)
-- 사용처: WHERE status = 'pending' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
ON orders (status, created_at DESC);

-- 5. payment_group_id 인덱스 (일괄결제 그룹 검색)
-- 사용처: WHERE payment_group_id = 'xxx'
CREATE INDEX IF NOT EXISTS idx_orders_payment_group_id
ON orders (payment_group_id)
WHERE payment_group_id IS NOT NULL;

-- 6. order_shipping 테이블 인덱스
-- name, phone 검색용
CREATE INDEX IF NOT EXISTS idx_order_shipping_name
ON order_shipping (name);

CREATE INDEX IF NOT EXISTS idx_order_shipping_phone
ON order_shipping (phone);

CREATE INDEX IF NOT EXISTS idx_order_shipping_order_id
ON order_shipping (order_id);

-- 7. order_payments 테이블 인덱스
-- depositor_name 검색용
CREATE INDEX IF NOT EXISTS idx_order_payments_depositor_name
ON order_payments (depositor_name);

CREATE INDEX IF NOT EXISTS idx_order_payments_order_id
ON order_payments (order_id);

-- 8. order_items 테이블 인덱스
-- title 검색용 (GIN 인덱스 - 부분 문자열 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_order_items_title_gin
ON order_items USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
ON order_items (order_id);

-- 9. profiles 테이블 인덱스
-- name, nickname, phone 검색용
CREATE INDEX IF NOT EXISTS idx_profiles_name
ON profiles (name);

CREATE INDEX IF NOT EXISTS idx_profiles_nickname
ON profiles (nickname);

CREATE INDEX IF NOT EXISTS idx_profiles_phone
ON profiles (phone);

CREATE INDEX IF NOT EXISTS idx_profiles_kakao_id
ON profiles (kakao_id)
WHERE kakao_id IS NOT NULL;

-- ==========================================
-- 인덱스 생성 완료 확인
-- ==========================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename IN ('orders', 'order_shipping', 'order_payments', 'order_items', 'profiles')
  )
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
