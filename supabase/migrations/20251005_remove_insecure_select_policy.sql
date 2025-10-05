-- ==========================================
-- 보안 위험 정책 제거
-- 생성일: 2025-10-05
-- 문제: "Anyone can view orders" 정책이 모든 사용자에게 모든 주문 조회 허용
-- 해결: 해당 정책 삭제, "Users view own orders"만 유지
-- ==========================================

-- ❌ 보안 위험 정책 삭제
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
DROP POLICY IF EXISTS "Anyone can view order items" ON order_items;
DROP POLICY IF EXISTS "Anyone can view order shipping" ON order_shipping;
DROP POLICY IF EXISTS "Anyone can view order payments" ON order_payments;

-- ==========================================
-- 정책 확인 (삭제 확인용)
-- ==========================================

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN qual IS NULL THEN 'N/A'
    ELSE LEFT(qual, 100)
  END as condition
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_shipping', 'order_payments')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- ✅ 예상 결과:
-- orders: "Users view own orders" (자기 주문만)
-- orders: "Admin full access on orders" (관리자)
-- order_items: "Users view own order_items" (자기 주문 아이템만)
-- order_items: "Admin full access on order_items" (관리자)
-- order_shipping: "Users view own shipping" (자기 배송 정보만)
-- order_shipping: "Admin full access on order_shipping" (관리자)
-- order_payments: "Users view own payments" (자기 결제 정보만)
-- order_payments: "Admin full access on order_payments" (관리자)
