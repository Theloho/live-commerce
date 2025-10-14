-- ==========================================
-- 🔧 주문 테이블 SELECT 정책 제거 (Service Role API 전환)
-- 생성일: 2025-10-14
-- 목적: 주문 조회도 Service Role API로 처리
-- ==========================================
--
-- 🚨 변경 사항:
-- - Service Role API (/api/orders/list)로 주문 조회
-- - RLS SELECT 정책 제거 (orders, order_items, order_shipping, order_payments)
-- - 카카오 사용자(sessionStorage) 완전 지원
-- ==========================================

-- orders 테이블 SELECT 정책 제거
DROP POLICY IF EXISTS "Users view own orders" ON orders;
DROP POLICY IF EXISTS "orders_select_policy" ON orders;

-- order_items 테이블 SELECT 정책 제거
DROP POLICY IF EXISTS "order_items_select_policy" ON order_items;
DROP POLICY IF EXISTS "Users can view their order items" ON order_items;

-- order_shipping 테이블 SELECT 정책 제거
DROP POLICY IF EXISTS "order_shipping_select_policy" ON order_shipping;
DROP POLICY IF EXISTS "Users can view their shipping info" ON order_shipping;

-- order_payments 테이블 SELECT 정책 제거
DROP POLICY IF EXISTS "order_payments_select_policy" ON order_payments;
DROP POLICY IF EXISTS "Users can view their payment info" ON order_payments;

-- 검증 쿼리: SELECT 정책이 모두 제거되었는지 확인
SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN cmd = 'SELECT' THEN '⚠️  SELECT 정책 남아있음 (제거 필요)'
    ELSE '✅ 정상'
  END as status
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_shipping', 'order_payments')
ORDER BY tablename, cmd;

-- 안내 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 주문 테이블 SELECT 정책 제거 완료';
  RAISE NOTICE 'ℹ️  이제 모든 주문 조회는 Service Role API (/api/orders/list)를 통해 처리됩니다';
  RAISE NOTICE 'ℹ️  카카오 사용자(sessionStorage)도 완전 지원됩니다';
END $$;
