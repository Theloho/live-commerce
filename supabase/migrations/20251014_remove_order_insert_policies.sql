-- ==========================================
-- 🔧 주문 테이블 INSERT 정책 제거
-- 생성일: 2025-10-14
-- 목적: Service Role API 사용으로 INSERT 정책 불필요
-- ==========================================
--
-- 🚨 변경 사항:
-- - Service Role API (/api/orders/create)로 주문 생성
-- - RLS INSERT 정책 제거 (orders, order_items, order_shipping, order_payments)
-- - SELECT 정책은 유지 (사용자가 자신의 주문 조회 필요)
-- ==========================================

-- orders 테이블 INSERT 정책 제거
DROP POLICY IF EXISTS "orders_insert_policy" ON orders;

-- order_items 테이블 INSERT 정책 제거
DROP POLICY IF EXISTS "order_items_insert_policy" ON order_items;

-- order_shipping 테이블 INSERT 정책 제거
DROP POLICY IF EXISTS "order_shipping_insert_policy" ON order_shipping;

-- order_payments 테이블 INSERT 정책 제거
DROP POLICY IF EXISTS "order_payments_insert_policy" ON order_payments;

-- 검증 쿼리: INSERT 정책이 모두 제거되었는지 확인
SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN cmd = 'INSERT' THEN '⚠️  INSERT 정책 남아있음 (제거 필요)'
    ELSE '✅ 정상'
  END as status
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_shipping', 'order_payments')
ORDER BY tablename, cmd;

-- 안내 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 주문 테이블 INSERT 정책 제거 완료';
  RAISE NOTICE 'ℹ️  이제 모든 주문 생성은 Service Role API (/api/orders/create)를 통해 처리됩니다';
  RAISE NOTICE 'ℹ️  SELECT 정책은 유지되어 사용자가 자신의 주문을 조회할 수 있습니다';
END $$;
