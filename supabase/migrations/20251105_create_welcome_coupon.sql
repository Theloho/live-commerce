-- ============================================
-- 웰컴 쿠폰 생성 (is_welcome_coupon=true)
-- 작성일: 2025-11-05
-- 목적: 회원가입 시 자동 지급되는 웰컴 쿠폰
-- ============================================

-- 1. 기존 WELCOME 쿠폰 확인 및 정리
DELETE FROM coupons WHERE code = 'WELCOME';

-- 2. 웰컴 쿠폰 생성
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
  30000, -- 3만원 이상 구매 시
  NOW(),
  NOW() + INTERVAL '1 year', -- 1년간 유효
  1, -- 사용자당 1회만 사용 가능
  NULL, -- 무제한 발급
  true, -- 활성화
  true, -- 웰컴 쿠폰
  NOW(),
  NOW()
) ON CONFLICT (code) DO UPDATE SET
  is_welcome_coupon = true,
  is_active = true,
  updated_at = NOW();

-- 3. 확인 쿼리
SELECT id, code, name, is_welcome_coupon, is_active, discount_value, min_purchase_amount
FROM coupons
WHERE code = 'WELCOME';

COMMENT ON COLUMN coupons.is_welcome_coupon IS '회원가입 시 자동 지급되는 웰컴 쿠폰 플래그 (트리거: handle_new_user_signup)';
