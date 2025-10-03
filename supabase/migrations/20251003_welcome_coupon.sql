-- ==========================================
-- 웰컴 쿠폰 생성 (첫 가입 무배 쿠폰)
-- 생성일: 2025-10-03
-- 목적: 신규 가입 고객 환영 쿠폰 자동 발급
-- ==========================================

-- WELCOME 쿠폰 생성 (배송비 무료 - 4000원 할인)
INSERT INTO coupons (
    code,
    name,
    description,
    discount_type,
    discount_value,
    min_purchase_amount,
    max_discount_amount,
    valid_from,
    valid_until,
    usage_limit_per_user,
    total_usage_limit,
    is_active,
    created_by
) VALUES (
    'WELCOME',
    '신규 가입 환영 쿠폰',
    '첫 주문 무료배송! 신규 회원님을 환영합니다 🎉',
    'fixed_amount',
    4000, -- 배송비 4000원 할인
    0, -- 최소 구매 금액 없음
    NULL, -- 금액 할인이므로 최대 할인 금액 불필요
    NOW(),
    NOW() + INTERVAL '1 year', -- 1년간 유효
    1, -- 사용자당 1회만 사용 가능
    NULL, -- 전체 사용 한도 없음 (모든 신규 가입자에게 발급)
    true, -- 활성화
    NULL -- 시스템 생성
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    min_purchase_amount = EXCLUDED.min_purchase_amount,
    max_discount_amount = EXCLUDED.max_discount_amount,
    valid_until = EXCLUDED.valid_until,
    usage_limit_per_user = EXCLUDED.usage_limit_per_user,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ==========================================
-- 완료
-- ==========================================
COMMENT ON CONSTRAINT coupons_code_key ON coupons IS '웰컴 쿠폰 자동 생성 및 업데이트';

-- 확인 쿼리
SELECT
    code,
    name,
    discount_type,
    discount_value,
    valid_until,
    is_active
FROM coupons
WHERE code = 'WELCOME';
