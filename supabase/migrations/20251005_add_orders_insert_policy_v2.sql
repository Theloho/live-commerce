-- ==========================================
-- orders 테이블 INSERT RLS 정책 추가
-- 생성일: 2025-10-05
-- 목적: 고객이 자신의 주문을 생성할 수 있도록 허용
-- ==========================================

-- ==========================================
-- 1. orders INSERT 정책 (고객 주문 생성)
-- ==========================================

-- 기존 INSERT 정책이 있다면 삭제
DROP POLICY IF EXISTS "orders_insert_policy" ON orders;

-- 새 INSERT 정책 생성
CREATE POLICY "orders_insert_policy"
ON orders
FOR INSERT
TO authenticated
WITH CHECK (
  -- 조건 1: user_id가 현재 로그인한 사용자와 일치
  -- (일반 Supabase Auth 사용자)
  user_id = auth.uid()
  OR
  -- 조건 2: user_id가 NULL이고 order_type에 KAKAO가 포함
  -- (카카오 사용자 - order_type으로 식별)
  (user_id IS NULL AND order_type LIKE '%KAKAO%')
);

-- ==========================================
-- 2. order_items INSERT 정책 추가
-- ==========================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "order_items_insert_policy" ON order_items;

-- 새 INSERT 정책 생성
CREATE POLICY "order_items_insert_policy"
ON order_items
FOR INSERT
TO authenticated
WITH CHECK (
  -- order_items는 orders와 연관되므로 orders의 소유권만 확인
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (
      orders.user_id = auth.uid()
      OR
      (orders.user_id IS NULL AND orders.order_type LIKE '%KAKAO%')
    )
  )
);

-- ==========================================
-- 3. order_shipping INSERT 정책 추가
-- ==========================================

DROP POLICY IF EXISTS "order_shipping_insert_policy" ON order_shipping;

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
    )
  )
);

-- ==========================================
-- 4. order_payments INSERT 정책 추가
-- ==========================================

DROP POLICY IF EXISTS "order_payments_insert_policy" ON order_payments;

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
    )
  )
);

-- ==========================================
-- 완료 메시지
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ orders INSERT RLS 정책 추가 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '생성된 정책:';
  RAISE NOTICE '  1. orders_insert_policy';
  RAISE NOTICE '  2. order_items_insert_policy';
  RAISE NOTICE '  3. order_shipping_insert_policy';
  RAISE NOTICE '  4. order_payments_insert_policy';
  RAISE NOTICE '';
  RAISE NOTICE '허용 조건:';
  RAISE NOTICE '  - user_id = auth.uid() (일반 사용자)';
  RAISE NOTICE '  - user_id IS NULL AND order_type LIKE %%KAKAO%% (카카오 사용자)';
  RAISE NOTICE '========================================';
END $$;
