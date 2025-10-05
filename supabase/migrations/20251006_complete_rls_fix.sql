-- ==========================================
-- 🔧 완전한 RLS 정책 통합 수정 스크립트
-- 생성일: 2025-10-06
-- 목적: 주문/쿠폰 모든 RLS 문제 한 번에 해결
-- ==========================================
--
-- 🚨 핵심 문제:
-- 1. RLS 정책이 "TO authenticated"로 되어 있어서
--    Supabase Auth 세션이 없으면 아예 정책 평가 안 됨
-- 2. 카카오 사용자는 sessionStorage만 있고 Auth 세션 없을 수 있음
-- 3. 여러 마이그레이션 파일이 같은 정책을 덮어쓰며 충돌
--
-- ✅ 해결 방법:
-- - 최신 버전의 정책만 유지 (카카오 사용자 지원 포함)
-- - INSERT 정책도 카카오 패턴 매칭 추가
-- - 모든 정책을 하나의 스크립트로 통합
-- ==========================================

-- ==========================================
-- Part 1: orders 테이블 정책
-- ==========================================

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "orders_insert_policy" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own pending orders" ON orders;
DROP POLICY IF EXISTS "Users view own orders" ON orders;

-- SELECT 정책 (주문 조회)
CREATE POLICY "Users view own orders"
ON orders
FOR SELECT
TO authenticated
USING (
  -- 관리자는 모든 주문 조회 가능
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  -- Supabase Auth 사용자는 자기 주문만
  user_id = auth.uid()
  OR
  -- 카카오 사용자: profiles.kakao_id로 order_type 매칭
  order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
);

-- INSERT 정책 (주문 생성)
CREATE POLICY "orders_insert_policy"
ON orders
FOR INSERT
TO authenticated
WITH CHECK (
  -- 조건 1: Supabase Auth 사용자
  user_id = auth.uid()
  OR
  -- 조건 2: 카카오 사용자 (user_id NULL + order_type에 KAKAO)
  (user_id IS NULL AND order_type LIKE '%KAKAO%')
  OR
  -- 조건 3: 카카오 사용자 (profiles.kakao_id 기반 매칭)
  order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
);

-- UPDATE 정책 (주문 수정)
CREATE POLICY "Users can update their own orders"
ON orders
FOR UPDATE
TO authenticated
USING (
  -- 관리자는 모든 주문 수정 가능
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  -- Supabase Auth 사용자
  user_id = auth.uid()
  OR
  -- 카카오 사용자
  order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  user_id = auth.uid()
  OR
  order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
);

-- ==========================================
-- Part 2: order_items 테이블 정책
-- ==========================================

DROP POLICY IF EXISTS "order_items_insert_policy" ON order_items;
DROP POLICY IF EXISTS "Users view own order items" ON order_items;

-- SELECT 정책
CREATE POLICY "Users view own order items"
ON order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (
      (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
      OR
      orders.user_id = auth.uid()
      OR
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
);

-- INSERT 정책
CREATE POLICY "order_items_insert_policy"
ON order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (
      orders.user_id = auth.uid()
      OR
      (orders.user_id IS NULL AND orders.order_type LIKE '%KAKAO%')
      OR
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
);

-- ==========================================
-- Part 3: order_shipping 테이블 정책
-- ==========================================

DROP POLICY IF EXISTS "order_shipping_insert_policy" ON order_shipping;
DROP POLICY IF EXISTS "Users can update shipping for their orders" ON order_shipping;
DROP POLICY IF EXISTS "Users view own shipping" ON order_shipping;

-- SELECT 정책
CREATE POLICY "Users view own shipping"
ON order_shipping
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_shipping.order_id
    AND (
      (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
      OR
      orders.user_id = auth.uid()
      OR
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
);

-- INSERT 정책
CREATE POLICY "order_shipping_insert_policy"
ON order_shipping
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_shipping.order_id
    AND (
      orders.user_id = auth.uid()
      OR
      (orders.user_id IS NULL AND orders.order_type LIKE '%KAKAO%')
      OR
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
);

-- UPDATE 정책
CREATE POLICY "Users can update shipping for their orders"
ON order_shipping
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_shipping.order_id
    AND (
      (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
      OR
      orders.user_id = auth.uid()
      OR
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_shipping.order_id
    AND (
      (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
      OR
      orders.user_id = auth.uid()
      OR
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
);

-- ==========================================
-- Part 4: order_payments 테이블 정책
-- ==========================================

DROP POLICY IF EXISTS "order_payments_insert_policy" ON order_payments;
DROP POLICY IF EXISTS "Users can update payments for their orders" ON order_payments;
DROP POLICY IF EXISTS "Users view own payments" ON order_payments;

-- SELECT 정책
CREATE POLICY "Users view own payments"
ON order_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_payments.order_id
    AND (
      (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
      OR
      orders.user_id = auth.uid()
      OR
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
);

-- INSERT 정책
CREATE POLICY "order_payments_insert_policy"
ON order_payments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_payments.order_id
    AND (
      orders.user_id = auth.uid()
      OR
      (orders.user_id IS NULL AND orders.order_type LIKE '%KAKAO%')
      OR
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
);

-- UPDATE 정책
CREATE POLICY "Users can update payments for their orders"
ON order_payments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_payments.order_id
    AND (
      (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
      OR
      orders.user_id = auth.uid()
      OR
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_payments.order_id
    AND (
      (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
      OR
      orders.user_id = auth.uid()
      OR
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
);

-- ==========================================
-- Part 5: user_coupons 테이블 정책 (쿠폰 사용)
-- ==========================================

DROP POLICY IF EXISTS "Users can update own coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users can update their coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users can view own coupons" ON user_coupons;
DROP POLICY IF EXISTS "Admins can insert coupons for users" ON user_coupons;

-- SELECT 정책 (쿠폰 조회)
CREATE POLICY "Users can view own coupons"
ON user_coupons
FOR SELECT
TO authenticated
USING (
  -- 자기 쿠폰만 조회 가능
  user_id = auth.uid()
  OR
  -- 관리자는 모든 쿠폰 조회 가능
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- INSERT 정책 (관리자가 고객에게 쿠폰 배포)
CREATE POLICY "Admins can insert coupons for users"
ON user_coupons
FOR INSERT
TO authenticated
WITH CHECK (
  -- 관리자만 쿠폰 배포 가능
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  -- 또는 자기 자신에게 (자동 지급 이벤트용)
  user_id = auth.uid()
);

-- UPDATE 정책 (쿠폰 사용 처리)
CREATE POLICY "Users can update their coupons"
ON user_coupons
FOR UPDATE
TO authenticated
USING (
  -- 자기 쿠폰만 업데이트 가능 (사용 처리)
  user_id = auth.uid()
  OR
  -- 관리자는 모든 쿠폰 업데이트 가능
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  user_id = auth.uid()
  OR
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- ==========================================
-- Part 6: 검증 쿼리
-- ==========================================

-- 전체 정책 확인
SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN with_check LIKE '%KAKAO%' OR qual LIKE '%KAKAO%' THEN '✅ 카카오 지원'
    WHEN with_check LIKE '%is_admin%' OR qual LIKE '%is_admin%' THEN '✅ 관리자 지원'
    ELSE '⚠️  기본 매칭만'
  END as support_level
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_shipping', 'order_payments', 'user_coupons')
ORDER BY tablename, cmd, policyname;

-- 정책 개수 확인
SELECT
  tablename,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_count,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_count,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_count,
  COUNT(*) as total_policies
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_shipping', 'order_payments', 'user_coupons')
GROUP BY tablename
ORDER BY tablename;

-- 예상 결과:
-- orders: SELECT(1) + INSERT(1) + UPDATE(1) = 3개
-- order_items: SELECT(1) + INSERT(1) = 2개
-- order_shipping: SELECT(1) + INSERT(1) + UPDATE(1) = 3개
-- order_payments: SELECT(1) + INSERT(1) + UPDATE(1) = 3개
-- user_coupons: SELECT(1) + INSERT(1) + UPDATE(1) = 3개
