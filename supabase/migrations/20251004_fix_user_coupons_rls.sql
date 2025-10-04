-- ==========================================
-- user_coupons 테이블 UPDATE RLS 정책 추가
-- 생성일: 2025-10-04
-- 목적: 쿠폰 사용 처리 시 is_used, used_at, order_id UPDATE 가능하도록
-- 문제: use_coupon() RPC 호출은 성공하지만 실제 DB UPDATE 안 됨 (RLS 권한 없음)
-- ==========================================

-- ==========================================
-- 1. user_coupons 테이블 UPDATE 정책
-- ==========================================

-- 기존 UPDATE 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can update own coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users can update their coupons" ON user_coupons;

-- 새로운 UPDATE 정책: 사용자는 자기 쿠폰만 업데이트 가능
CREATE POLICY "Users can update their coupons"
ON user_coupons
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ==========================================
-- 2. 정책 확인 (결과 확인용)
-- ==========================================

-- user_coupons 테이블 정책 확인
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_coupons'
ORDER BY cmd;
