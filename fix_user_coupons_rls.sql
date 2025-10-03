-- =========================================
-- user_coupons 테이블 RLS 정책 수정
-- =========================================
-- Supabase SQL Editor에서 실행하세요
-- https://app.supabase.com/project/xoinislnaxllijlnjeue/sql/new

-- 1. 기존 정책 모두 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view own coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users can insert coupons" ON user_coupons;
DROP POLICY IF EXISTS "Admin can insert coupons" ON user_coupons;
DROP POLICY IF EXISTS "Service role can insert" ON user_coupons;

-- 2. RLS 활성화
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

-- 3. 사용자는 자신의 쿠폰만 조회 가능
CREATE POLICY "Users can view own coupons" ON user_coupons
    FOR SELECT USING (auth.uid() = user_id);

-- 4. 서비스 역할(관리자 API)은 모든 작업 가능
-- 이 정책이 핵심입니다! 관리자가 쿠폰을 배포할 때 필요합니다.
CREATE POLICY "Service role can manage all coupons" ON user_coupons
    FOR ALL USING (
        -- service_role 키로 접근하거나
        auth.jwt() ->> 'role' = 'service_role'
        OR
        -- 관리자로 인증된 경우
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 5. 일반 사용자는 자신의 쿠폰만 업데이트 가능 (사용 처리)
CREATE POLICY "Users can update own coupons" ON user_coupons
    FOR UPDATE USING (auth.uid() = user_id);

-- 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_coupons'
ORDER BY policyname;
