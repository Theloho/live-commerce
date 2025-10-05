-- ==========================================
-- 카카오 사용자 주문 조회 정책 수정
-- 생성일: 2025-10-05
-- 문제: 모든 일반 사용자가 카카오 로그인인데, 기존 정책이 Supabase UUID로만 매칭 시도
-- 해결: profiles.kakao_id를 사용하여 order_type 매칭
-- ==========================================

-- ==========================================
-- 1. orders 테이블 SELECT 정책 수정 (카카오 사용자)
-- ==========================================

DROP POLICY IF EXISTS "Users view own orders" ON orders;

CREATE POLICY "Users view own orders"
ON orders
FOR SELECT
TO authenticated
USING (
  -- Supabase Auth 사용자 (관리자 등): user_id로 매칭
  auth.uid() = user_id
  OR
  -- 카카오 사용자: profiles.kakao_id를 사용하여 order_type 매칭
  order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
);

-- ==========================================
-- 2. order_items 테이블 SELECT 정책 수정
-- ==========================================

DROP POLICY IF EXISTS "Users view own order_items" ON order_items;

CREATE POLICY "Users view own order_items"
ON order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (
      -- Supabase Auth 사용자
      orders.user_id = auth.uid()
      OR
      -- 카카오 사용자
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
);

-- ==========================================
-- 3. order_shipping 테이블 SELECT 정책 수정
-- ==========================================

DROP POLICY IF EXISTS "Users view own shipping" ON order_shipping;

CREATE POLICY "Users view own shipping"
ON order_shipping
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_shipping.order_id
    AND (
      -- Supabase Auth 사용자
      orders.user_id = auth.uid()
      OR
      -- 카카오 사용자
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
);

-- ==========================================
-- 4. order_payments 테이블 SELECT 정책 수정
-- ==========================================

DROP POLICY IF EXISTS "Users view own payments" ON order_payments;

CREATE POLICY "Users view own payments"
ON order_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_payments.order_id
    AND (
      -- Supabase Auth 사용자
      orders.user_id = auth.uid()
      OR
      -- 카카오 사용자
      orders.order_type LIKE '%KAKAO:' || (SELECT kakao_id FROM profiles WHERE id = auth.uid())::text || '%'
    )
  )
);

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
    ELSE LEFT(qual, 200)
  END as condition
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_shipping', 'order_payments')
ORDER BY tablename, cmd, policyname;

-- ==========================================
-- 6. 테스트 쿼리 (디버깅용 - 주석 처리)
-- ==========================================

-- 김진태 사용자 확인
-- SELECT
--   id,
--   email,
--   name,
--   kakao_id,
--   is_admin
-- FROM profiles
-- WHERE name = '김진태';

-- 김진태 사용자의 주문 확인 (profiles.kakao_id와 order_type 매칭 확인)
-- SELECT
--   o.id,
--   o.customer_order_number,
--   o.user_id,
--   o.order_type,
--   o.status,
--   o.created_at,
--   p.kakao_id,
--   p.name
-- FROM orders o
-- LEFT JOIN profiles p ON o.order_type LIKE '%KAKAO:' || p.kakao_id::text || '%'
-- WHERE p.name = '김진태'
-- ORDER BY o.created_at DESC
-- LIMIT 10;
