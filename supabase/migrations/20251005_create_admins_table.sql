-- ==========================================
-- 관리자 시스템 완전 분리 - admins 테이블 생성
-- 생성일: 2025-10-05
-- 목적: 관리자와 고객 인증 시스템을 완전히 분리
-- ==========================================

-- ==========================================
-- 1. admins 테이블 생성 (profiles와 완전 분리)
-- ==========================================

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  -- bcrypt 해시
  name TEXT NOT NULL,
  is_master BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);
CREATE INDEX IF NOT EXISTS idx_admins_is_master ON admins(is_master);

-- ==========================================
-- 2. admin_sessions 테이블 생성 (토큰 관리)
-- ==========================================

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- ==========================================
-- 3. admin_permissions 테이블 수정 (admins 참조)
-- ==========================================

-- 기존 admin_permissions 테이블이 있다면 외래키 제약조건 확인
-- profiles → admins로 참조 변경 필요 (Phase 3에서 처리)

-- ==========================================
-- 4. 트리거: updated_at 자동 업데이트
-- ==========================================

CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_admins_updated_at();

-- ==========================================
-- 5. 만료된 세션 자동 삭제 함수 (선택적)
-- ==========================================

CREATE OR REPLACE FUNCTION cleanup_expired_admin_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 6. RLS 정책 (admins 테이블은 RLS 없음)
-- ==========================================

-- admins 테이블은 RLS를 사용하지 않음
-- 관리자는 애플리케이션 레벨에서 인증 처리
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- 7. 초기 마스터 관리자 생성 (수동 설정 필요)
-- ==========================================

-- 주의: password_hash는 bcrypt로 생성해야 함
-- 초기 패스워드: yi01buddy!!
-- bcrypt 해시는 애플리케이션에서 생성 후 수동 INSERT

-- 예시 (실제 해시값은 애플리케이션에서 생성):
-- INSERT INTO admins (email, password_hash, name, is_master)
-- VALUES ('master@allok.world', '$2b$10$...', '마스터 관리자', true);

-- ==========================================
-- 완료 메시지
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ admins 테이블 생성 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '생성된 테이블:';
  RAISE NOTICE '  1. admins - 관리자 계정';
  RAISE NOTICE '  2. admin_sessions - 관리자 세션';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '  1. 애플리케이션에서 bcrypt로 패스워드 해시 생성';
  RAISE NOTICE '  2. 마스터 관리자 INSERT';
  RAISE NOTICE '  3. 관리자 로그인 API 구현';
  RAISE NOTICE '========================================';
END $$;
