-- ==========================================
-- Hotfix: admin_permissions 테이블 RLS 임시 비활성화
-- ==========================================
-- 문제: 마스터 관리자가 자기 권한을 조회하려는데 RLS가 막고 있을 가능성
-- ==========================================

-- admin_permissions RLS 임시 비활성화
ALTER TABLE admin_permissions DISABLE ROW LEVEL SECURITY;

-- 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'admin_permissions';

DO $$
BEGIN
  RAISE NOTICE '✅ admin_permissions RLS 비활성화 완료';
  RAISE NOTICE '⚠️ 이는 임시 조치입니다';
END $$;
