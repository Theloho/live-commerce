-- ============================================
-- 웰컴 쿠폰 즉시 생성 (런칭용)
-- 실행: Supabase SQL Editor에서 복사 붙여넣기
-- ============================================

-- 기존 WELCOME 쿠폰 삭제 (있으면)
DELETE FROM coupons WHERE code = 'WELCOME';

-- 웰컴 쿠폰 생성
INSERT INTO coupons (
  code,
  name,
  description,
  discount_type,
  discount_value,
  min_purchase_amount,
  valid_from,
  valid_until,
  usage_limit_per_user,
  total_usage_limit,
  total_issued_count,
  is_active,
  is_welcome_coupon,
  created_at,
  updated_at
) VALUES (
  'WELCOME',
  '신규가입 환영 쿠폰',
  '첫 구매 시 사용 가능한 5,000원 할인 쿠폰 (3만원 이상 구매 시)',
  'fixed_amount',
  5000,
  30000,
  NOW(),
  NOW() + INTERVAL '1 year',
  1,
  NULL,
  0,
  true,
  true,
  NOW(),
  NOW()
);

-- 확인
SELECT
  id,
  code,
  name,
  is_welcome_coupon,
  is_active,
  discount_value,
  min_purchase_amount,
  valid_until
FROM coupons
WHERE code = 'WELCOME';

-- ✅ 결과 예상:
-- id | code    | name               | is_welcome_coupon | is_active | discount_value | min_purchase_amount | valid_until
-- ---+---------+--------------------+-------------------+-----------+---------------+--------------------+-------------
--  X | WELCOME | 신규가입 환영 쿠폰  | true              | true      | 5000          | 30000              | 2026-11-05
