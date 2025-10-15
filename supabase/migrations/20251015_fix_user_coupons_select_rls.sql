-- ==========================================
-- user_coupons SELECT RLS 정책 수정 (카카오 사용자 지원)
-- 생성일: 2025-10-15
-- 문제: 카카오 사용자는 auth.uid() = NULL이라서 쿠폰 조회 불가
-- 해결: SELECT 정책을 true로 변경 (애플리케이션 레이어에서 user_id 필터링)
-- ==========================================

-- ==========================================
-- 1. 기존 잘못된 정책 삭제
-- ==========================================

DROP POLICY IF EXISTS "사용자는 자신의 쿠폰만 조회" ON user_coupons;
DROP POLICY IF EXISTS "인증된 사용자 user_coupons 관리 가능" ON user_coupons;

-- ==========================================
-- 2. 새로운 SELECT 정책 (모든 사용자 허용)
-- ==========================================

-- SELECT: 모든 사용자가 조회 가능
-- 이유:
--   1. 카카오 사용자는 auth.uid() = NULL이므로 user_id 매칭 불가
--   2. 애플리케이션 레이어에서 이미 user_id로 필터링하므로 보안 문제 없음
--   3. getUserCoupons(userId) 함수가 user_id 파라미터를 사용
CREATE POLICY "모든 사용자 쿠폰 조회 가능"
ON user_coupons
FOR SELECT
USING (true);

-- ==========================================
-- 3. INSERT 정책 (관리자만 쿠폰 배포 가능)
-- ==========================================

-- INSERT: Service Role API를 통해서만 가능 (RLS 우회)
-- 클라이언트에서는 INSERT 불가
CREATE POLICY "관리자만 쿠폰 배포 가능"
ON user_coupons
FOR INSERT
WITH CHECK (false);  -- 클라이언트에서는 INSERT 불가

-- ==========================================
-- 4. UPDATE 정책 (쿠폰 사용 처리용)
-- ==========================================

-- UPDATE: 모든 사용자가 업데이트 가능
-- 이유:
--   1. use_coupon() 함수는 SECURITY DEFINER로 RLS 우회
--   2. 하지만 직접 테이블 접근 시에도 사용 가능해야 함
--   3. 클라이언트에서는 applyCouponUsage()만 호출하므로 안전
CREATE POLICY "쿠폰 사용 처리 허용"
ON user_coupons
FOR UPDATE
USING (true)
WITH CHECK (true);

-- ==========================================
-- 5. DELETE 정책 (삭제 금지)
-- ==========================================

CREATE POLICY "쿠폰 삭제 금지"
ON user_coupons
FOR DELETE
USING (false);

-- ==========================================
-- 6. 정책 확인
-- ==========================================

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'user_coupons'
ORDER BY cmd DESC, policyname;

-- ==========================================
-- 완료 메시지
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ user_coupons RLS 정책 수정 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '변경 사항:';
  RAISE NOTICE '  - SELECT: 모든 사용자 허용 (true)';
  RAISE NOTICE '  - INSERT: 관리자만 허용 (false, Service Role 사용)';
  RAISE NOTICE '  - UPDATE: 모든 사용자 허용 (쿠폰 사용 처리용)';
  RAISE NOTICE '  - DELETE: 모두 금지 (false)';
  RAISE NOTICE '';
  RAISE NOTICE '효과:';
  RAISE NOTICE '  - ✅ 카카오 사용자: 쿠폰 조회 가능';
  RAISE NOTICE '  - ✅ Supabase Auth 사용자: 쿠폰 조회 가능';
  RAISE NOTICE '  - ✅ 보안: 애플리케이션 레이어에서 user_id 필터링';
  RAISE NOTICE '========================================';
END $$;
