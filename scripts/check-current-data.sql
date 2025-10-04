-- 현재 상태 확인 스크립트
-- 사용자 ID: 8542d1dd-e5ca-4434-b486-7ef4ed91da21

-- 1. 사용자 주소 확인
SELECT
  id,
  name,
  postal_code as "기본_우편번호",
  address as "기본_주소",
  addresses as "주소_배열"
FROM profiles
WHERE id = '8542d1dd-e5ca-4434-b486-7ef4ed91da21';

-- 2. 최근 주문 확인 (쿠폰 포함)
SELECT
  o.id,
  o.customer_order_number,
  o.status,
  o.discount_amount as "쿠폰할인",
  o.total_amount as "총금액",
  o.created_at,
  os.postal_code as "배송우편번호",
  os.address as "배송주소"
FROM orders o
LEFT JOIN order_shipping os ON o.id = os.order_id
WHERE o.user_id = '8542d1dd-e5ca-4434-b486-7ef4ed91da21'
ORDER BY o.created_at DESC
LIMIT 5;

-- 3. 쿠폰 사용 이력
SELECT
  uc.id,
  c.code as "쿠폰코드",
  c.discount_value as "할인값",
  uc.is_used as "사용여부",
  uc.used_at as "사용일시",
  uc.order_id as "주문ID",
  uc.discount_amount as "적용할인금액"
FROM user_coupons uc
JOIN coupons c ON uc.coupon_id = c.id
WHERE uc.user_id = '8542d1dd-e5ca-4434-b486-7ef4ed91da21'
  AND c.code IN ('BEST10', 'PERCENT10')
ORDER BY uc.used_at DESC;
