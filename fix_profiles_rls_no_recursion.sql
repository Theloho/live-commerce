-- ==========================================
-- profiles 테이블 RLS 정책 수정 (무한 재귀 방지)
-- ==========================================

-- 기존 정책 모두 제거
DROP POLICY IF EXISTS "Admin full access on profiles" ON profiles;
DROP POLICY IF EXISTS "Users own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- RLS 비활성화 (임시)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
