-- ==========================================
-- validate_coupon 함수 수정
-- 문제: column reference "coupon_id" is ambiguous
-- 해결: 테이블 prefix 추가 (user_coupons.coupon_id)
-- ==========================================

-- 기존 함수 삭제 (파라미터 변경 시 필수)
DROP FUNCTION IF EXISTS validate_coupon(character varying, uuid, numeric);

CREATE OR REPLACE FUNCTION validate_coupon(
    p_coupon_code VARCHAR(50),
    p_user_id UUID,
    p_product_amount DECIMAL(12, 2)  -- 배송비 제외 상품 금액
)
RETURNS TABLE (
    is_valid BOOLEAN,
    error_message TEXT,
    coupon_id UUID,
    discount_amount DECIMAL(12, 2)
) AS $$
DECLARE
    v_coupon RECORD;
    v_user_coupon RECORD;
    v_discount DECIMAL(12, 2);
BEGIN
    -- 쿠폰 존재 확인
    SELECT * INTO v_coupon
    FROM coupons
    WHERE code = p_coupon_code AND is_active = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, '존재하지 않거나 비활성화된 쿠폰입니다.'::TEXT, NULL::UUID, 0::DECIMAL(12, 2);
        RETURN;
    END IF;

    -- 유효 기간 확인
    IF NOW() < v_coupon.valid_from THEN
        RETURN QUERY SELECT false, '아직 사용할 수 없는 쿠폰입니다.'::TEXT, NULL::UUID, 0::DECIMAL(12, 2);
        RETURN;
    END IF;

    IF NOW() > v_coupon.valid_until THEN
        RETURN QUERY SELECT false, '유효 기간이 만료된 쿠폰입니다.'::TEXT, NULL::UUID, 0::DECIMAL(12, 2);
        RETURN;
    END IF;

    -- 최소 구매 금액 확인 (상품 금액 기준)
    IF p_product_amount < v_coupon.min_purchase_amount THEN
        RETURN QUERY SELECT
            false,
            FORMAT('최소 구매 금액 %s원 이상이어야 합니다.', v_coupon.min_purchase_amount::TEXT),
            NULL::UUID,
            0::DECIMAL(12, 2);
        RETURN;
    END IF;

    -- 전체 사용 한도 확인
    IF v_coupon.total_usage_limit IS NOT NULL AND v_coupon.total_used_count >= v_coupon.total_usage_limit THEN
        RETURN QUERY SELECT false, '쿠폰 사용 가능 횟수를 초과했습니다.'::TEXT, NULL::UUID, 0::DECIMAL(12, 2);
        RETURN;
    END IF;

    -- 사용자 보유 확인 (✅ 수정: 테이블 prefix 추가)
    SELECT * INTO v_user_coupon
    FROM user_coupons
    WHERE user_coupons.user_id = p_user_id AND user_coupons.coupon_id = v_coupon.id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, '보유하지 않은 쿠폰입니다.'::TEXT, NULL::UUID, 0::DECIMAL(12, 2);
        RETURN;
    END IF;

    -- 이미 사용했는지 확인
    IF v_user_coupon.is_used = true THEN
        RETURN QUERY SELECT false, '이미 사용한 쿠폰입니다.'::TEXT, NULL::UUID, 0::DECIMAL(12, 2);
        RETURN;
    END IF;

    -- 할인 금액 계산 (배송비 제외한 상품 금액 기준)
    IF v_coupon.discount_type = 'fixed_amount' THEN
        -- 금액 할인: 쿠폰 금액과 상품 금액 중 작은 값
        v_discount := LEAST(v_coupon.discount_value, p_product_amount);
    ELSE -- percentage
        -- 퍼센트 할인: 상품 금액의 X% (배송비는 할인 대상 아님)
        v_discount := p_product_amount * (v_coupon.discount_value / 100);
        -- 최대 할인 금액 제한
        IF v_coupon.max_discount_amount IS NOT NULL THEN
            v_discount := LEAST(v_discount, v_coupon.max_discount_amount);
        END IF;
    END IF;

    -- 유효한 쿠폰
    RETURN QUERY SELECT true, NULL::TEXT, v_coupon.id, v_discount;
END;
$$ LANGUAGE plpgsql;
