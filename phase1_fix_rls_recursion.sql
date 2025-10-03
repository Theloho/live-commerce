-- ==========================================
-- Phase 1: RLS 무한 재귀 문제 해결
-- ==========================================
-- 목적: SECURITY DEFINER 함수로 profiles RLS 재귀 방지
-- 날짜: 2025-10-03
-- 영향: 모든 관리자 페이지 정상화
-- ==========================================

-- ==========================================
-- 1. 관리자 확인 함수 생성 (재귀 방지)
-- ==========================================

-- 현재 사용자가 관리자인지 확인
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  -- SECURITY DEFINER로 실행되므로 RLS 우회
  SELECT is_admin INTO admin_status
  FROM profiles
  WHERE id = auth.uid();

  RETURN COALESCE(admin_status, false);
END;
$$;

COMMENT ON FUNCTION public.is_admin() IS '현재 로그인한 사용자가 관리자인지 확인 (RLS 재귀 방지)';

-- ==========================================
-- 2. profiles 테이블 RLS 정책 업데이트
-- ==========================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "Admin full access on profiles" ON profiles;
DROP POLICY IF EXISTS "Users own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. 관리자는 모든 프로필 조회/수정 (함수 사용으로 재귀 방지)
CREATE POLICY "Admin full access on profiles"
ON profiles
FOR ALL
USING (is_admin());

COMMENT ON POLICY "Admin full access on profiles" ON profiles IS '관리자는 모든 프로필 접근 (재귀 없음)';

-- 2. 일반 사용자는 자기 프로필만
CREATE POLICY "Users own profile"
ON profiles
FOR ALL
USING (auth.uid() = id);

-- 3. 신규 사용자 프로필 생성
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- ==========================================
-- 3. 다른 테이블 RLS 정책 업데이트 (함수 사용)
-- ==========================================

-- user_coupons
DROP POLICY IF EXISTS "Admin full access on user_coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users view own coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users update own coupons" ON user_coupons;

ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on user_coupons"
ON user_coupons
FOR ALL
USING (is_admin());

CREATE POLICY "Users view own coupons"
ON user_coupons
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users update own coupons"
ON user_coupons
FOR UPDATE
USING (auth.uid() = user_id);

-- coupons
DROP POLICY IF EXISTS "Admin full access on coupons" ON coupons;
DROP POLICY IF EXISTS "Users view active coupons" ON coupons;

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on coupons"
ON coupons
FOR ALL
USING (is_admin());

CREATE POLICY "Users view active coupons"
ON coupons
FOR SELECT
USING (is_active = true);

-- orders
DROP POLICY IF EXISTS "Admin full access on orders" ON orders;
DROP POLICY IF EXISTS "Users view own orders" ON orders;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on orders"
ON orders
FOR ALL
USING (is_admin());

CREATE POLICY "Users view own orders"
ON orders
FOR SELECT
USING (
  auth.uid() = user_id OR
  order_type LIKE '%' || auth.uid()::text || '%'
);

-- order_items
DROP POLICY IF EXISTS "Admin full access on order_items" ON order_items;
DROP POLICY IF EXISTS "Users view own order_items" ON order_items;

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on order_items"
ON order_items
FOR ALL
USING (is_admin());

CREATE POLICY "Users view own order_items"
ON order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (orders.user_id = auth.uid() OR orders.order_type LIKE '%' || auth.uid()::text || '%')
  )
);

-- products
DROP POLICY IF EXISTS "Admin full access on products" ON products;
DROP POLICY IF EXISTS "Public view active products" ON products;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on products"
ON products
FOR ALL
USING (is_admin());

CREATE POLICY "Public view active products"
ON products
FOR SELECT
USING (is_visible = true);

-- order_shipping
DROP POLICY IF EXISTS "Admin full access on order_shipping" ON order_shipping;
DROP POLICY IF EXISTS "Users view own shipping" ON order_shipping;

ALTER TABLE order_shipping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on order_shipping"
ON order_shipping
FOR ALL
USING (is_admin());

CREATE POLICY "Users view own shipping"
ON order_shipping
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_shipping.order_id
    AND (orders.user_id = auth.uid() OR orders.order_type LIKE '%' || auth.uid()::text || '%')
  )
);

-- order_payments
DROP POLICY IF EXISTS "Admin full access on order_payments" ON order_payments;
DROP POLICY IF EXISTS "Users view own payments" ON order_payments;

ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on order_payments"
ON order_payments
FOR ALL
USING (is_admin());

CREATE POLICY "Users view own payments"
ON order_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_payments.order_id
    AND (orders.user_id = auth.uid() OR orders.order_type LIKE '%' || auth.uid()::text || '%')
  )
);

-- ==========================================
-- 4. 확인 쿼리
-- ==========================================

-- 함수 테스트
DO $$
BEGIN
  RAISE NOTICE '=== 함수 테스트 ===';
  RAISE NOTICE 'is_admin() 함수가 생성되었습니다.';
END $$;

-- RLS 정책 확인
SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN policyname LIKE '%Admin%' THEN '🔴 관리자'
    WHEN policyname LIKE '%Users%' THEN '🟢 사용자'
    WHEN policyname LIKE '%Public%' THEN '🔵 공개'
    ELSE '⚪ 기타'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'user_coupons', 'coupons', 'orders', 'order_items', 'products', 'order_shipping', 'order_payments')
ORDER BY tablename, policyname;

-- ==========================================
-- 완료 메시지
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Phase 1 완료: RLS 무한 재귀 해결';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔧 is_admin() 함수 생성 (SECURITY DEFINER)';
  RAISE NOTICE '🛡️ 8개 테이블 RLS 정책 업데이트';
  RAISE NOTICE '✨ 관리자 페이지 정상 작동 가능';
  RAISE NOTICE '';
  RAISE NOTICE '📋 다음 단계:';
  RAISE NOTICE '  1. 관리자 로그인 테스트';
  RAISE NOTICE '  2. /admin/customers 접근 확인';
  RAISE NOTICE '  3. 쿠폰 페이지 고객 목록 확인';
  RAISE NOTICE '';
END $$;
