-- =========================================
-- user_coupons 테이블 RLS 정책 설정
-- =========================================
-- Supabase SQL Editor에서 실행하세요:
-- https://app.supabase.com/project/xoinislnaxllijlnjeue/sql/new
--
-- 목적: 관리자가 쿠폰을 배포할 수 있도록 안전한 RLS 정책 설정
-- 날짜: 2025-10-03
-- =========================================

-- 1. 기존 정책 모두 제거
DROP POLICY IF EXISTS "Users can view own coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users can insert coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users can update own coupons" ON user_coupons;
DROP POLICY IF EXISTS "Anyone can insert coupons" ON user_coupons;

-- 2. RLS 활성화
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

-- 3. 정책 1: 사용자는 자신의 쿠폰만 조회 가능
CREATE POLICY "Users can view own coupons"
ON user_coupons
FOR SELECT
USING (auth.uid() = user_id);

-- 4. 정책 2: 인증된 사용자는 INSERT 가능 (쿠폰 배포용)
-- 이유: 관리자 API에서 service role key를 사용하여 배포
CREATE POLICY "Authenticated can insert coupons"
ON user_coupons
FOR INSERT
WITH CHECK (true);

-- 5. 정책 3: 사용자는 자신의 쿠폰만 업데이트 가능 (사용 처리)
CREATE POLICY "Users can update own coupons"
ON user_coupons
FOR UPDATE
USING (auth.uid() = user_id);

-- 6. 정책 4: 사용자는 자신의 쿠폰만 삭제 가능 (선택사항)
CREATE POLICY "Users can delete own coupons"
ON user_coupons
FOR DELETE
USING (auth.uid() = user_id);

-- 7. 확인: 생성된 정책 목록 조회
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_coupons'
ORDER BY policyname;
