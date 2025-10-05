-- ==========================================
-- 초기 마스터 관리자 계정 생성
-- 생성일: 2025-10-05
-- 이메일: master@allok.world
-- 초기 패스워드: yi01buddy!!
-- ==========================================

-- 마스터 관리자 계정 생성
INSERT INTO admins (email, password_hash, name, is_master, is_active)
VALUES (
  'master@allok.world',
  '$2b$10$ZoPH3qFlNtYKfYNZKJw8FOq0AnQsz/f3.uhE.eI6HgoM/g2bXv9Ty',
  '마스터 관리자',
  true,
  true
)
ON CONFLICT (email) DO NOTHING;

-- 완료 메시지
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM admins WHERE email = 'master@allok.world';

  IF admin_count > 0 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 마스터 관리자 계정 생성 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '이메일: master@allok.world';
    RAISE NOTICE '패스워드: yi01buddy!!';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  보안: 첫 로그인 후 반드시 패스워드를 변경하세요!';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '⚠️  마스터 관리자 계정이 이미 존재합니다.';
  END IF;
END $$;
