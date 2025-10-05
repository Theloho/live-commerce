-- ==========================================
-- RLS 정책 수정: 관리자 권한 추가
-- 생성일: 2025-10-05
-- 문제: 어제 추가한 UPDATE 정책이 관리자를 고려하지 않아 관리자 로그인 불가
-- 해결: 모든 정책에 관리자 예외 추가 (profiles.is_admin = true)
-- ==========================================

-- ==========================================
-- 1. orders 테이블 UPDATE 정책 (관리자 추가)
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
  -- 일반 사용자는 자기 주문만 수정 가능
  user_id = auth.uid()
)
WITH CHECK (
  -- UPDATE 후에도 동일한 조건 유지
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  user_id = auth.uid()
);

-- ==========================================
-- 2. order_payments 테이블 UPDATE 정책 (관리자 추가)
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
  -- 일반 사용자는 자기 주문의 결제 정보만 수정 가능
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
);

-- ==========================================
-- 3. order_shipping 테이블 UPDATE 정책 (관리자 추가)
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
  -- 일반 사용자는 자기 주문의 배송 정보만 수정 가능
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  OR
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
);

-- ==========================================
-- 4. SELECT 정책 확인 및 수정 (안전장치)
-- ==========================================

-- 기존 SELECT 정책 확인 후 없으면 생성
DO $$
BEGIN
  -- orders 테이블 SELECT 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders'
    AND policyname = 'Anyone can view orders'
    AND cmd = 'SELECT'
  ) THEN
    -- 기존 SELECT 정책이 너무 제한적일 경우 대비
    DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
    DROP POLICY IF EXISTS "Authenticated users can view orders" ON orders;

    CREATE POLICY "Anyone can view orders"
    ON orders
    FOR SELECT
    TO authenticated
    USING (true);  -- 일단 모든 authenticated 사용자가 조회 가능

    RAISE NOTICE '✅ orders SELECT 정책 생성됨';
  END IF;

  -- order_items SELECT 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'order_items'
    AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Anyone can view order items"
    ON order_items
    FOR SELECT
    TO authenticated
    USING (true);

    RAISE NOTICE '✅ order_items SELECT 정책 생성됨';
  END IF;

  -- order_shipping SELECT 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'order_shipping'
    AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Anyone can view order shipping"
    ON order_shipping
    FOR SELECT
    TO authenticated
    USING (true);

    RAISE NOTICE '✅ order_shipping SELECT 정책 생성됨';
  END IF;

  -- order_payments SELECT 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'order_payments'
    AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Anyone can view order payments"
    ON order_payments
    FOR SELECT
    TO authenticated
    USING (true);

    RAISE NOTICE '✅ order_payments SELECT 정책 생성됨';
  END IF;
END $$;

-- ==========================================
-- 5. 정책 확인 (결과 확인용)
-- ==========================================

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN qual IS NULL THEN 'N/A'
    ELSE LEFT(qual, 100)
  END as condition,
  CASE
    WHEN with_check IS NULL THEN 'N/A'
    ELSE LEFT(with_check, 100)
  END as with_check_condition
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_shipping', 'order_payments')
ORDER BY tablename, cmd, policyname;
