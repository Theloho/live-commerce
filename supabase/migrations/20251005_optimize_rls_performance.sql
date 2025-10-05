-- ==========================================
-- RLS 정책 성능 최적화 (모바일 느린 조회 문제 해결)
-- 생성일: 2025-10-05
-- 문제: profiles.kakao_id 서브쿼리가 모바일에서 느림
-- 해결: 인덱스 추가 + 쿼리 최적화
-- ==========================================

-- ==========================================
-- 1. profiles 테이블 인덱스 추가 (서브쿼리 성능 향상)
-- ==========================================

-- auth.uid()로 조회하는 경우 최적화
CREATE INDEX IF NOT EXISTS idx_profiles_id_kakao_id
ON profiles(id, kakao_id);

-- ==========================================
-- 2. orders 테이블 인덱스 추가 (order_type LIKE 최적화)
-- ==========================================

-- order_type에 GIN 인덱스 추가 (LIKE 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_orders_order_type_gin
ON orders USING gin(order_type gin_trgm_ops);

-- pg_trgm 확장 활성화 (없으면 생성)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ==========================================
-- 3. 대체 방법: Function 기반 정책 (더 빠름)
-- ==========================================

-- 현재 사용자의 kakao_id를 반환하는 함수
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

-- ==========================================
-- 4. orders SELECT 정책 최적화 버전 (선택사항)
-- ==========================================

-- 기존 정책 삭제 후 함수 기반으로 재생성
DROP POLICY IF EXISTS "Users view own orders" ON orders;

CREATE POLICY "Users view own orders"
ON orders
FOR SELECT
TO authenticated
USING (
  -- Supabase Auth 사용자
  auth.uid() = user_id
  OR
  -- 카카오 사용자 (함수 사용으로 성능 개선)
  order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'
);

-- ==========================================
-- 5. 인덱스 확인
-- ==========================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('profiles', 'orders')
  AND (indexname LIKE '%kakao%' OR indexname LIKE '%order_type%')
ORDER BY tablename, indexname;

-- ==========================================
-- 6. 성능 테스트 (디버깅용)
-- ==========================================

-- EXPLAIN ANALYZE로 쿼리 성능 확인
-- EXPLAIN ANALYZE
-- SELECT * FROM orders
-- WHERE order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
-- LIMIT 10;

-- 함수 버전 성능 확인
-- EXPLAIN ANALYZE
-- SELECT * FROM orders
-- WHERE order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'
-- LIMIT 10;
