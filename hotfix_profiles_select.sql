-- ==========================================
-- Hotfix: profiles 테이블 SELECT 테스트
-- ==========================================

-- 현재 RLS 정책 확인
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
AND schemaname = 'public';

-- 마스터 관리자 프로필 확인
SELECT id, email, name, is_admin, is_master
FROM profiles
WHERE email = 'master@allok.world';

-- profiles 테이블 RLS 임시 비활성화 (테스트용)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'profiles';

DO $$
BEGIN
  RAISE NOTICE '✅ profiles RLS 비활성화 완료 (임시)';
  RAISE NOTICE '⚠️ 로그인 테스트 후 다시 활성화 필요';
END $$;
