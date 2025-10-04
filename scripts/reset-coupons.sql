-- 쿠폰 리셋 (테스트용)
-- 사용일: 2025-10-04
-- 목적: 사용한 쿠폰 재사용 가능하도록 리셋

UPDATE user_coupons
SET
  is_used = false,
  used_at = NULL,
  order_id = NULL,
  discount_amount = NULL
WHERE user_id = '8542d1dd-e5ca-4434-b486-7ef4ed91da21'
  AND coupon_id IN (
    SELECT id FROM coupons
    WHERE code IN ('BEST10', 'PERCENT10')
  );

-- 확인 쿼리
SELECT
  uc.id,
  c.code,
  c.name,
  uc.is_used,
  uc.used_at
FROM user_coupons uc
JOIN coupons c ON uc.coupon_id = c.id
WHERE uc.user_id = '8542d1dd-e5ca-4434-b486-7ef4ed91da21'
  AND c.code IN ('BEST10', 'PERCENT10');
