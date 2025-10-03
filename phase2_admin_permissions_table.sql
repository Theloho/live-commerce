-- ==========================================
-- Phase 2: 관리자 권한 시스템 DB 구축
-- ==========================================
-- 목적: 마스터/하위 관리자 구조 + 메뉴별 권한 관리
-- 날짜: 2025-10-03
-- ==========================================

-- ==========================================
-- 1. profiles 테이블에 is_master 컬럼 추가
-- ==========================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.is_master IS '마스터 관리자 여부 (하위 관리자 생성 및 권한 부여 가능)';

-- 현재 관리자를 마스터로 승격
UPDATE profiles
SET is_master = true
WHERE email = 'master@allok.world' AND is_admin = true;

-- ==========================================
-- 2. admin_permissions 테이블 생성
-- ==========================================

CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 관리자
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- 권한 정보
    permission VARCHAR(100) NOT NULL,  -- 예: 'customers.view', 'orders.*', 'products.edit'

    -- 메타 정보
    granted_by UUID REFERENCES profiles(id),  -- 권한 부여한 마스터
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 유니크 제약 (동일 관리자에게 동일 권한 중복 방지)
    UNIQUE(admin_id, permission)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_admin_permissions_admin_id ON admin_permissions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_permission ON admin_permissions(permission);

COMMENT ON TABLE admin_permissions IS '관리자별 메뉴 접근 권한 (customers.view, orders.*, 등)';
COMMENT ON COLUMN admin_permissions.permission IS '권한 형식: {메뉴}.{액션} 또는 {메뉴}.* (전체)';
COMMENT ON COLUMN admin_permissions.granted_by IS '이 권한을 부여한 마스터 관리자 ID';

-- ==========================================
-- 3. 마스터 관리자 확인 함수
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  master_status BOOLEAN;
BEGIN
  SELECT is_master INTO master_status
  FROM profiles
  WHERE id = auth.uid();

  RETURN COALESCE(master_status, false);
END;
$$;

COMMENT ON FUNCTION public.is_master() IS '현재 로그인한 사용자가 마스터 관리자인지 확인';

-- ==========================================
-- 4. 권한 확인 함수 (와일드카드 지원)
-- ==========================================

CREATE OR REPLACE FUNCTION public.has_permission(required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  is_master_admin BOOLEAN;
  has_exact_permission BOOLEAN;
  has_wildcard_permission BOOLEAN;
  permission_prefix TEXT;
BEGIN
  -- 마스터는 모든 권한
  SELECT is_master INTO is_master_admin
  FROM profiles
  WHERE id = auth.uid();

  IF COALESCE(is_master_admin, false) THEN
    RETURN true;
  END IF;

  -- 정확한 권한 체크 (예: 'customers.view')
  SELECT EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE admin_id = auth.uid()
    AND permission = required_permission
  ) INTO has_exact_permission;

  IF has_exact_permission THEN
    RETURN true;
  END IF;

  -- 와일드카드 권한 체크 (예: 'customers.*' → 'customers.view', 'customers.edit' 모두 허용)
  permission_prefix := split_part(required_permission, '.', 1) || '.*';

  SELECT EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE admin_id = auth.uid()
    AND permission = permission_prefix
  ) INTO has_wildcard_permission;

  RETURN COALESCE(has_wildcard_permission, false);
END;
$$;

COMMENT ON FUNCTION public.has_permission(TEXT) IS '현재 사용자가 특정 권한을 가지고 있는지 확인 (와일드카드 지원)';

-- ==========================================
-- 5. admin_permissions 테이블 RLS 정책
-- ==========================================

ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- 마스터는 모든 권한 조회/수정 가능
DROP POLICY IF EXISTS "Master can manage all permissions" ON admin_permissions;
CREATE POLICY "Master can manage all permissions"
ON admin_permissions
FOR ALL
USING (is_master());

-- 일반 관리자는 자기 권한만 조회 가능 (수정 불가)
DROP POLICY IF EXISTS "Admins can view own permissions" ON admin_permissions;
CREATE POLICY "Admins can view own permissions"
ON admin_permissions
FOR SELECT
USING (admin_id = auth.uid());

COMMENT ON POLICY "Master can manage all permissions" ON admin_permissions IS '마스터는 모든 권한 관리 가능';
COMMENT ON POLICY "Admins can view own permissions" ON admin_permissions IS '일반 관리자는 자기 권한만 조회';

-- ==========================================
-- 6. 확인 쿼리
-- ==========================================

-- 마스터 관리자 확인
SELECT
  id,
  email,
  name,
  is_master,
  is_admin,
  created_at
FROM profiles
WHERE is_master = true OR is_admin = true
ORDER BY is_master DESC, created_at ASC;

-- admin_permissions 테이블 확인
SELECT
  ap.id,
  p.email as admin_email,
  ap.permission,
  master.email as granted_by_email,
  ap.granted_at
FROM admin_permissions ap
LEFT JOIN profiles p ON ap.admin_id = p.id
LEFT JOIN profiles master ON ap.granted_by = master.id
ORDER BY p.email, ap.permission;

-- RLS 정책 확인
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'admin_permissions'
ORDER BY policyname;

-- ==========================================
-- 7. 샘플 데이터 (테스트용 - 선택사항)
-- ==========================================

-- 테스트용 하위 관리자 생성 예시 (실제로는 API에서 생성)
-- INSERT INTO profiles (id, email, name, is_admin, is_master)
-- VALUES (
--   '00000000-0000-0000-0000-000000000002',
--   'admin@example.com',
--   '일반 관리자',
--   true,
--   false
-- );

-- 테스트용 권한 부여 예시
-- INSERT INTO admin_permissions (admin_id, permission, granted_by)
-- VALUES
--   ('00000000-0000-0000-0000-000000000002', 'customers.view', (SELECT id FROM profiles WHERE email = 'master@allok.world')),
--   ('00000000-0000-0000-0000-000000000002', 'orders.view', (SELECT id FROM profiles WHERE email = 'master@allok.world'));

-- ==========================================
-- 완료 메시지
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Phase 2 완료: 관리자 권한 시스템 DB 구축';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '👑 is_master 컬럼 추가 (master@allok.world 승격)';
  RAISE NOTICE '📋 admin_permissions 테이블 생성';
  RAISE NOTICE '🔧 is_master() 함수 생성';
  RAISE NOTICE '🔐 has_permission() 함수 생성 (와일드카드 지원)';
  RAISE NOTICE '🛡️ RLS 정책 설정 완료';
  RAISE NOTICE '';
  RAISE NOTICE '📋 권한 형식:';
  RAISE NOTICE '  - customers.view : 고객 조회만';
  RAISE NOTICE '  - customers.* : 고객 모든 권한';
  RAISE NOTICE '  - orders.edit : 주문 수정';
  RAISE NOTICE '  - products.* : 상품 전체 관리';
  RAISE NOTICE '';
  RAISE NOTICE '📋 다음 단계 (Phase 3):';
  RAISE NOTICE '  1. useAdminPermissions 훅 생성';
  RAISE NOTICE '  2. AdminLayout 권한별 메뉴 숨김';
  RAISE NOTICE '  3. 각 페이지에 권한 체크 추가';
  RAISE NOTICE '';
END $$;
