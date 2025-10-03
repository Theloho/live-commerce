-- =========================================
-- 현재 RLS 정책 전체 확인
-- =========================================
-- Supabase SQL Editor에서 실행:
-- https://app.supabase.com/project/xoinislnaxllijlnjeue/sql/new

-- 1. 모든 테이블의 RLS 활성화 상태 확인
SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ RLS 활성화'
    ELSE '❌ RLS 비활성화'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. 현재 설정된 모든 RLS 정책 확인
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. profiles 테이블의 is_admin 컬럼 확인
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('id', 'email', 'is_admin')
ORDER BY ordinal_position;

-- 4. 현재 관리자 계정 확인
SELECT
  id,
  email,
  is_admin,
  created_at
FROM profiles
WHERE is_admin = true OR email = 'master@allok.world';
