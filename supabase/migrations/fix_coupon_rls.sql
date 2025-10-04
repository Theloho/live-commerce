-- ==========================================
-- 쿠폰 RLS 정책 수정
-- 문제: getUserCoupons JOIN 시 coupon 데이터가 null로 반환됨
-- 원인: coupons 테이블에 SELECT 정책이 없어서 일반 사용자가 조회 불가
-- 해결: 사용자가 보유한 쿠폰은 조회 가능하도록 정책 추가
-- ==========================================

-- 기존 정책 확인 및 삭제 (있을 경우)
DROP POLICY IF EXISTS "Users can view their coupons" ON coupons;
DROP POLICY IF EXISTS "Anyone can view active coupons" ON coupons;

-- 사용자가 보유한 쿠폰만 조회 가능 (보안 강화)
CREATE POLICY "Users can view their coupons"
ON coupons
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT coupon_id
    FROM user_coupons
    WHERE user_id = auth.uid()
  )
);

-- 확인 쿼리
-- 실행 후 user_coupons JOIN 시 coupon 데이터가 정상 반환되는지 확인
SELECT
  uc.id,
  uc.is_used,
  c.code,
  c.name,
  c.discount_type,
  c.discount_value,
  c.max_discount_amount
FROM user_coupons uc
JOIN coupons c ON uc.coupon_id = c.id
WHERE uc.user_id = '8542d1dd-e5ca-4434-b486-7ef4ed91da21'
  AND uc.is_used = false
LIMIT 5;
