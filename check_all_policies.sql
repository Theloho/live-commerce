-- 현재 DB의 모든 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || substring(qual from 1 for 100)
    ELSE ''
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'CHECK: ' || substring(with_check from 1 for 100)
    ELSE ''
  END as check_clause
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;
