-- ==========================================
-- 쿠폰 UPDATE/DELETE RLS 정책 추가
-- 문제: 관리자가 쿠폰을 수정/삭제할 수 없음 (406 Not Acceptable, 0 rows)
-- 원인: coupons 테이블에 UPDATE/DELETE 정책이 없음
-- 해결: 관리자만 쿠폰을 수정/삭제할 수 있도록 정책 추가
-- 날짜: 2025-10-16
-- ==========================================

-- 1. 기존 "인증된 사용자 쿠폰 관리 가능" 정책 삭제 (너무 광범위함)
DROP POLICY IF EXISTS "인증된 사용자 쿠폰 관리 가능" ON coupons;

-- 2. 관리자만 쿠폰 생성 가능
CREATE POLICY "Admins can create coupons"
ON coupons
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
  )
);

-- 3. 관리자만 쿠폰 수정 가능
CREATE POLICY "Admins can update coupons"
ON coupons
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
  )
);

-- 4. 관리자만 쿠폰 삭제 가능
CREATE POLICY "Admins can delete coupons"
ON coupons
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
  )
);

-- 5. 헬퍼 함수 추가 (성능 최적화)
-- 기존 is_admin() 함수가 없다면 생성
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 6. 헬퍼 함수 사용으로 정책 최적화 (optional, 기존 정책도 작동함)
-- 이미 생성된 정책을 DROP하고 다시 생성
DROP POLICY IF EXISTS "Admins can update coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can delete coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can create coupons" ON coupons;

CREATE POLICY "Admins can create coupons"
ON coupons
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update coupons"
ON coupons
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete coupons"
ON coupons
FOR DELETE
TO authenticated
USING (is_admin());

-- ==========================================
-- 완료
-- ==========================================
COMMENT ON POLICY "Admins can create coupons" ON coupons IS '관리자만 쿠폰 생성 가능';
COMMENT ON POLICY "Admins can update coupons" ON coupons IS '관리자만 쿠폰 수정 가능';
COMMENT ON POLICY "Admins can delete coupons" ON coupons IS '관리자만 쿠폰 삭제 가능';
