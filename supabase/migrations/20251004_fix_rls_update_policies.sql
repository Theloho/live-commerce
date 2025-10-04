-- ==========================================
-- orders, order_shipping 테이블 UPDATE RLS 정책 추가
-- 생성일: 2025-10-04
-- 목적: 체크아웃 시 discount_amount, postal_code UPDATE 가능하도록
-- 문제: PATCH 요청은 204 성공하지만 실제 DB 저장 안 됨 (RLS 권한 없음)
-- ==========================================

-- ==========================================
-- 1. orders 테이블 UPDATE 정책
-- ==========================================

-- 기존 UPDATE 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own pending orders" ON orders;

-- 새로운 UPDATE 정책: 사용자는 자기 주문만 업데이트 가능
-- (카카오 사용자도 user_id가 있으므로 간단한 조건으로 충분)
CREATE POLICY "Users can update their own orders"
ON orders
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ==========================================
-- 2. order_payments 테이블 UPDATE 정책 (입금자명)
-- ==========================================

-- 기존 UPDATE 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can update payments for their orders" ON order_payments;
DROP POLICY IF EXISTS "Anyone can update order payments" ON order_payments;

-- 새로운 UPDATE 정책: 주문 소유자만 결제 정보 업데이트 가능
CREATE POLICY "Users can update payments for their orders"
ON order_payments
FOR UPDATE
TO authenticated
USING (
  -- order_id로 조인하여 주문 소유자 확인
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- UPDATE 후에도 동일한 조건 유지
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
);

-- ==========================================
-- 3. order_shipping 테이블 UPDATE 정책
-- ==========================================

-- 기존 UPDATE 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can update shipping for their orders" ON order_shipping;
DROP POLICY IF EXISTS "Anyone can update order shipping" ON order_shipping;

-- 새로운 UPDATE 정책: 주문 소유자만 배송 정보 업데이트 가능
CREATE POLICY "Users can update shipping for their orders"
ON order_shipping
FOR UPDATE
TO authenticated
USING (
  -- order_id로 조인하여 주문 소유자 확인
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- UPDATE 후에도 동일한 조건 유지
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
);

-- ==========================================
-- 4. 정책 확인 (결과 확인용)
-- ==========================================

-- orders 테이블 정책 확인
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'orders' AND cmd = 'UPDATE';

-- order_payments 테이블 정책 확인
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'order_payments' AND cmd = 'UPDATE';

-- order_shipping 테이블 정책 확인
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'order_shipping' AND cmd = 'UPDATE';
