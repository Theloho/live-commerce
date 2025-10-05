-- ==========================================
-- 전체 RLS 정책 성능 최적화 (완전판)
-- 생성일: 2025-10-05
-- 목적: 모바일 느린 조회 문제 해결 + 전체 성능 향상
-- 개선: 인덱스 추가 + 함수 캐싱 + 모든 테이블 정책 최적화
-- ==========================================

-- ==========================================
-- 1. 필수 확장 활성화
-- ==========================================

-- pg_trgm: LIKE 검색 최적화 (GIN 인덱스)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ==========================================
-- 2. 인덱스 추가 (성능 대폭 향상)
-- ==========================================

-- profiles 테이블: auth.uid()로 kakao_id 조회 최적화
CREATE INDEX IF NOT EXISTS idx_profiles_id_kakao_id
ON profiles(id, kakao_id)
WHERE kakao_id IS NOT NULL;

-- orders 테이블: order_type LIKE 검색 최적화
CREATE INDEX IF NOT EXISTS idx_orders_order_type_gin
ON orders USING gin(order_type gin_trgm_ops);

-- orders 테이블: user_id 조회 최적화 (이미 있을 수 있음)
CREATE INDEX IF NOT EXISTS idx_orders_user_id
ON orders(user_id)
WHERE user_id IS NOT NULL;

-- ==========================================
-- 3. 헬퍼 함수 생성 (서브쿼리 캐싱)
-- ==========================================

-- 현재 사용자의 kakao_id를 반환 (STABLE = 캐시됨)
CREATE OR REPLACE FUNCTION get_current_user_kakao_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT kakao_id::text
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- 현재 사용자가 특정 주문의 소유자인지 확인
CREATE OR REPLACE FUNCTION is_order_owner(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orders
    WHERE id = p_order_id
    AND (
      user_id = auth.uid()
      OR order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'
    )
  );
$$;

-- ==========================================
-- 4. orders 테이블 정책 최적화
-- ==========================================

DROP POLICY IF EXISTS "Users view own orders" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;

-- SELECT 정책 (함수 사용)
CREATE POLICY "Users view own orders"
ON orders
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'
);

-- UPDATE 정책 (함수 사용)
CREATE POLICY "Users can update their own orders"
ON orders
FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  user_id = auth.uid()
  OR
  order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  user_id = auth.uid()
  OR
  order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'
);

-- ==========================================
-- 5. order_items 테이블 정책 최적화
-- ==========================================

DROP POLICY IF EXISTS "Users view own order_items" ON order_items;

CREATE POLICY "Users view own order_items"
ON order_items
FOR SELECT
TO authenticated
USING (
  is_order_owner(order_id)  -- 헬퍼 함수 사용
);

-- ==========================================
-- 6. order_payments 테이블 정책 최적화
-- ==========================================

DROP POLICY IF EXISTS "Users view own payments" ON order_payments;
DROP POLICY IF EXISTS "Users can update payments for their orders" ON order_payments;

-- SELECT 정책
CREATE POLICY "Users view own payments"
ON order_payments
FOR SELECT
TO authenticated
USING (
  is_order_owner(order_id)
);

-- UPDATE 정책
CREATE POLICY "Users can update payments for their orders"
ON order_payments
FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  is_order_owner(order_id)
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  is_order_owner(order_id)
);

-- ==========================================
-- 7. order_shipping 테이블 정책 최적화
-- ==========================================

DROP POLICY IF EXISTS "Users view own shipping" ON order_shipping;
DROP POLICY IF EXISTS "Users can update shipping for their orders" ON order_shipping;

-- SELECT 정책
CREATE POLICY "Users view own shipping"
ON order_shipping
FOR SELECT
TO authenticated
USING (
  is_order_owner(order_id)
);

-- UPDATE 정책
CREATE POLICY "Users can update shipping for their orders"
ON order_shipping
FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  is_order_owner(order_id)
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  is_order_owner(order_id)
);

-- ==========================================
-- 8. 성능 확인 (ANALYZE 실행)
-- ==========================================

ANALYZE profiles;
ANALYZE orders;
ANALYZE order_items;
ANALYZE order_payments;
ANALYZE order_shipping;

-- ==========================================
-- 9. 결과 확인
-- ==========================================

-- 인덱스 확인
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('profiles', 'orders')
  AND (
    indexname LIKE '%kakao%'
    OR indexname LIKE '%order_type%'
    OR indexname LIKE '%user_id%'
  )
ORDER BY tablename, indexname;

-- 함수 확인
SELECT
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname IN ('get_current_user_kakao_id', 'is_order_owner');

-- 정책 확인
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN qual LIKE '%get_current_user_kakao_id%' THEN '✅ 함수 최적화'
    WHEN qual LIKE '%is_order_owner%' THEN '✅ 함수 최적화'
    WHEN qual LIKE '%KAKAO%' THEN '✅ 카카오 매칭'
    WHEN qual LIKE '%is_admin%' THEN '✅ 관리자'
    ELSE '기본'
  END as optimization_status
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_payments', 'order_shipping')
  AND cmd IN ('SELECT', 'UPDATE')
ORDER BY tablename, cmd DESC, policyname;

-- ==========================================
-- 10. 성능 테스트 (선택적 실행)
-- ==========================================

-- 주석을 제거하고 실행하면 실제 성능을 확인할 수 있습니다
-- EXPLAIN ANALYZE
-- SELECT * FROM orders
-- WHERE order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'
-- LIMIT 10;

-- ==========================================
-- 완료 메시지
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS 정책 성능 최적화 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 추가된 인덱스:';
  RAISE NOTICE '  - profiles(id, kakao_id)';
  RAISE NOTICE '  - orders.order_type (GIN)';
  RAISE NOTICE '  - orders.user_id';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 생성된 함수:';
  RAISE NOTICE '  - get_current_user_kakao_id() - 캐시됨';
  RAISE NOTICE '  - is_order_owner() - 캐시됨';
  RAISE NOTICE '';
  RAISE NOTICE '✅ 최적화된 정책:';
  RAISE NOTICE '  - orders (SELECT, UPDATE)';
  RAISE NOTICE '  - order_items (SELECT)';
  RAISE NOTICE '  - order_payments (SELECT, UPDATE)';
  RAISE NOTICE '  - order_shipping (SELECT, UPDATE)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 예상 성능 향상:';
  RAISE NOTICE '  - 카카오 사용자 조회: 2-5배 빠름';
  RAISE NOTICE '  - 모바일 환경: 대폭 개선';
  RAISE NOTICE '  - 서브쿼리 캐싱: 중복 호출 제거';
  RAISE NOTICE '========================================';
END $$;
