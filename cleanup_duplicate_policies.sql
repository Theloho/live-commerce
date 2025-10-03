-- ==========================================
-- 중복 RLS 정책 제거
-- ==========================================
-- 목적: 불필요한 중복 정책 삭제
-- ==========================================

-- coupons 테이블 중복 정책 제거
DROP POLICY IF EXISTS "모든 사용자 쿠폰 조회 가능" ON coupons;
DROP POLICY IF EXISTS "인증된 사용자 쿠폰 관리 가능" ON coupons;

-- user_coupons 테이블 중복 정책 제거
DROP POLICY IF EXISTS "사용자는 자신의 쿠폰만 조회" ON user_coupons;
DROP POLICY IF EXISTS "인증된 사용자 user_coupons 관리 가능" ON user_coupons;

-- 확인
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('coupons', 'user_coupons')
ORDER BY tablename, policyname;

DO $$
BEGIN
  RAISE NOTICE '✅ 중복 정책 제거 완료';
END $$;
