-- ==========================================
-- profiles 테이블 RLS 정책 수정
-- ==========================================
-- 목적: 관리자는 모든 프로필 조회, 일반 사용자는 자기 프로필만
-- ==========================================

-- 기존 정책 모두 제거
DROP POLICY IF EXISTS "Admin full access on profiles" ON profiles;
DROP POLICY IF EXISTS "Users own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. 관리자는 모든 프로필 접근 가능
CREATE POLICY "Admin full access on profiles"
ON profiles
FOR ALL
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- 2. 일반 사용자는 자기 프로필만 접근
CREATE POLICY "Users own profile"
ON profiles
FOR ALL
USING (auth.uid() = id);

-- 3. 신규 사용자 프로필 생성 허용
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 확인
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
AND schemaname = 'public';
