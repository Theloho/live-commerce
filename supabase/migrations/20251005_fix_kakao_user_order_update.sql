-- ==========================================
-- 카카오 사용자 주문 UPDATE 정책 수정
-- 생성일: 2025-10-05
-- 문제: UPDATE 정책에 카카오 사용자 매칭 누락
-- 해결: SELECT와 동일하게 profiles.kakao_id로 order_type 매칭
-- ==========================================

-- ==========================================
-- 1. orders 테이블 UPDATE 정책 수정
-- ==========================================

DROP POLICY IF EXISTS "Users can update their own orders" ON orders;

CREATE POLICY "Users can update their own orders"
ON orders
FOR UPDATE
TO authenticated
USING (
  -- 관리자는 모든 주문 수정 가능
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  -- Supabase Auth 사용자는 자기 주문만 수정 가능
  user_id = auth.uid()
  OR
  -- 카카오 사용자: profiles.kakao_id를 사용하여 order_type 매칭
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
-- 2. order_payments 테이블 UPDATE 정책 수정
-- ==========================================

DROP POLICY IF EXISTS "Users can update payments for their orders" ON order_payments;

CREATE POLICY "Users can update payments for their orders"
ON order_payments
FOR UPDATE
TO authenticated
USING (
  -- 관리자는 모든 결제 정보 수정 가능
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  -- 자기 주문의 결제 정보만 수정 가능 (Supabase Auth + 카카오)
  order_id IN (
    SELECT id FROM orders
    WHERE user_id = auth.uid()
       OR order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
  )
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  order_id IN (
    SELECT id FROM orders
    WHERE user_id = auth.uid()
       OR order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
  )
);

-- ==========================================
-- 3. order_shipping 테이블 UPDATE 정책 수정
-- ==========================================

DROP POLICY IF EXISTS "Users can update shipping for their orders" ON order_shipping;

CREATE POLICY "Users can update shipping for their orders"
ON order_shipping
FOR UPDATE
TO authenticated
USING (
  -- 관리자는 모든 배송 정보 수정 가능
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  -- 자기 주문의 배송 정보만 수정 가능 (Supabase Auth + 카카오)
  order_id IN (
    SELECT id FROM orders
    WHERE user_id = auth.uid()
       OR order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
  )
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  order_id IN (
    SELECT id FROM orders
    WHERE user_id = auth.uid()
       OR order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
  )
);

-- ==========================================
-- 4. 정책 확인 (결과 확인용)
-- ==========================================

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN cmd = 'UPDATE' THEN 'UPDATE 정책'
    ELSE cmd
  END as policy_type,
  CASE
    WHEN qual LIKE '%KAKAO%' THEN '✅ 카카오 매칭 포함'
    WHEN qual LIKE '%is_admin%' THEN '✅ 관리자 포함'
    ELSE '⚠️ 기본 매칭만'
  END as kakao_support
FROM pg_policies
WHERE tablename IN ('orders', 'order_payments', 'order_shipping')
  AND cmd IN ('SELECT', 'UPDATE')
ORDER BY tablename, cmd DESC, policyname;

-- ==========================================
-- 5. 예상 결과
-- ==========================================

-- 모든 SELECT, UPDATE 정책에 "✅ 카카오 매칭 포함" 또는 "✅ 관리자 포함"이 표시되어야 함
--
-- orders:
--   SELECT "Users view own orders" → ✅ 카카오 매칭 포함
--   UPDATE "Users can update their own orders" → ✅ 카카오 매칭 포함
--
-- order_payments:
--   SELECT "Users view own payments" → ✅ 카카오 매칭 포함
--   UPDATE "Users can update payments for their orders" → ✅ 카카오 매칭 포함
--
-- order_shipping:
--   SELECT "Users view own shipping" → ✅ 카카오 매칭 포함
--   UPDATE "Users can update shipping for their orders" → ✅ 카카오 매칭 포함
