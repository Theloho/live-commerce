-- ==========================================
-- 퍼센트 할인 쿠폰 예제
-- 생성일: 2025-10-03
-- 목적: 퍼센트 할인 쿠폰 테스트용
-- ==========================================

-- 10% 할인 쿠폰 (최대 5,000원 할인)
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
    'PERCENT10',
    '10% 할인 쿠폰',
    '전 상품 10% 할인! (최대 5,000원)',
    'percentage',
    10, -- 10% 할인
    30000, -- 최소 구매 금액 30,000원
    5000, -- 최대 할인 금액 5,000원
    NOW(),
    NOW() + INTERVAL '6 months', -- 6개월간 유효
    1, -- 사용자당 1회만 사용 가능
    100, -- 선착순 100명
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
    total_usage_limit = EXCLUDED.total_usage_limit,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ==========================================
-- 할인 계산 예시:
-- ==========================================
-- 상품 금액 40,000원 + 배송비 4,000원 = 총 44,000원
--
-- WELCOME 쿠폰 (금액할인 4,000원):
--   → 할인: 4,000원
--   → 최종 결제: 40,000원 (배송비 무료!)
--
-- PERCENT10 쿠폰 (10% 할인, 최대 5,000원):
--   → 할인 계산: 40,000원 × 10% = 4,000원
--   → 최대 할인: 5,000원 (제한에 안 걸림)
--   → 할인: 4,000원
--   → 최종 결제: 40,000원 (40,000 - 4,000 + 4,000 배송비)
--
-- 상품 금액 100,000원 + 배송비 4,000원 = 총 104,000원
--
-- PERCENT10 쿠폰 (10% 할인, 최대 5,000원):
--   → 할인 계산: 100,000원 × 10% = 10,000원
--   → 최대 할인: 5,000원으로 제한!
--   → 할인: 5,000원
--   → 최종 결제: 99,000원 (100,000 - 5,000 + 4,000 배송비)
-- ==========================================

-- 확인 쿼리
SELECT
    code,
    name,
    discount_type,
    discount_value,
    CASE
        WHEN discount_type = 'fixed_amount' THEN CONCAT('₩', discount_value::TEXT)
        ELSE CONCAT(discount_value::TEXT, '%')
    END as discount_display,
    min_purchase_amount,
    max_discount_amount,
    valid_until,
    is_active
FROM coupons
WHERE code IN ('WELCOME', 'PERCENT10')
ORDER BY code;
