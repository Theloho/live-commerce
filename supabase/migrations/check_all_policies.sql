-- 모든 정책 상세 확인 (중복 정책 찾기)
SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN with_check LIKE '%KAKAO%' OR qual LIKE '%KAKAO%' THEN '✅ 카카오 지원'
    WHEN with_check LIKE '%is_admin%' OR qual LIKE '%is_admin%' THEN '✅ 관리자 지원'
    ELSE '⚠️  기본 매칭만'
  END as support_level,
  CASE
    WHEN LENGTH(qual) > 50 THEN LEFT(qual, 50) || '...'
    ELSE qual
  END as qual_preview
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_shipping', 'order_payments', 'user_coupons')
ORDER BY tablename, cmd, policyname;
