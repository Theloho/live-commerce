-- ==========================================
-- 쿠폰 시스템 마이그레이션
-- 생성일: 2025-10-03
-- 목적: 완전한 쿠폰 발행/배포/사용 시스템
-- ==========================================

-- 1. 기존 테이블 삭제 (있다면)
DROP TABLE IF EXISTS user_coupons CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;

-- 2. 쿠폰 테이블 (관리자가 생성)
CREATE TABLE coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- 기본 정보
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- 할인 규칙
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed_amount', 'percentage')),
    discount_value DECIMAL(12, 2) NOT NULL CHECK (discount_value > 0),

    -- 사용 조건
    min_purchase_amount DECIMAL(12, 2) DEFAULT 0,
    max_discount_amount DECIMAL(12, 2), -- percentage 타입일 때 최대 할인 금액

    -- 유효 기간
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,

    -- 사용 제한
    usage_limit_per_user INTEGER DEFAULT 1, -- 사용자당 사용 가능 횟수
    total_usage_limit INTEGER, -- 전체 사용 가능 횟수 (선착순)
    total_issued_count INTEGER DEFAULT 0, -- 총 발급된 수
    total_used_count INTEGER DEFAULT 0, -- 총 사용된 수

    -- 상태
    is_active BOOLEAN DEFAULT true,

    -- 생성자 정보
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 제약조건
    CONSTRAINT valid_date_range CHECK (valid_until > valid_from),
    CONSTRAINT valid_max_discount CHECK (
        discount_type = 'fixed_amount' OR max_discount_amount IS NOT NULL
    )
);

-- 3. 사용자 쿠폰 테이블 (쿠폰 배포 및 사용 이력)
CREATE TABLE user_coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- 관계
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,

    -- 사용 정보
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

    -- 할인 금액 (사용 시 스냅샷)
    discount_amount DECIMAL(12, 2),

    -- 배포 정보
    issued_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- 누가 배포했는지
    issued_at TIMESTAMPTZ DEFAULT NOW(),

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 중복 방지 (사용자당 동일 쿠폰 1회만 보유)
    UNIQUE(user_id, coupon_id)
);

-- 4. 인덱스 생성 (성능 최적화)
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_is_active ON coupons(is_active);
CREATE INDEX idx_coupons_valid_until ON coupons(valid_until);
CREATE INDEX idx_coupons_created_at ON coupons(created_at DESC);

CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX idx_user_coupons_is_used ON user_coupons(is_used);
CREATE INDEX idx_user_coupons_used_at ON user_coupons(used_at DESC);
CREATE INDEX idx_user_coupons_order_id ON user_coupons(order_id);

-- 5. 트리거: updated_at 자동 업데이트
CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. 트리거: 쿠폰 사용 시 통계 업데이트
CREATE OR REPLACE FUNCTION update_coupon_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_used = true AND OLD.is_used = false THEN
        -- 사용 완료 시 카운트 증가
        UPDATE coupons
        SET total_used_count = total_used_count + 1
        WHERE id = NEW.coupon_id;

        -- used_at 자동 설정
        NEW.used_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coupon_usage_stats
    BEFORE UPDATE ON user_coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_coupon_usage_stats();

-- 7. 트리거: 쿠폰 발급 시 통계 업데이트
CREATE OR REPLACE FUNCTION update_coupon_issued_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE coupons
    SET total_issued_count = total_issued_count + 1
    WHERE id = NEW.coupon_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coupon_issued_count
    AFTER INSERT ON user_coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_coupon_issued_count();

-- 8. 함수: 쿠폰 유효성 검증
-- 주의: p_product_amount는 상품 금액만 포함 (배송비 제외)
-- 퍼센트 할인은 상품 금액에만 적용됨
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

    -- 사용자 보유 확인 (✅ 2025-10-04 수정: 테이블 prefix 추가로 ambiguous 에러 해결)
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

-- 9. 함수: 쿠폰 사용 처리
CREATE OR REPLACE FUNCTION use_coupon(
    p_user_id UUID,
    p_coupon_id UUID,
    p_order_id UUID,
    p_discount_amount DECIMAL(12, 2)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE user_coupons
    SET
        is_used = true,
        used_at = NOW(),
        order_id = p_order_id,
        discount_amount = p_discount_amount
    WHERE user_id = p_user_id
        AND coupon_id = p_coupon_id
        AND is_used = false;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN v_updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- 10. RLS 정책 (Row Level Security)
-- 일단 RLS 비활성화 (개발 단계)
-- 프로덕션 배포 시 활성화 필요
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 쿠폰 조회 가능 (임시)
CREATE POLICY "모든 사용자 쿠폰 조회 가능" ON coupons
    FOR SELECT
    USING (true);

-- 인증된 사용자는 쿠폰 생성/수정 가능 (임시)
CREATE POLICY "인증된 사용자 쿠폰 관리 가능" ON coupons
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- 사용자는 자신의 쿠폰만 조회 가능
CREATE POLICY "사용자는 자신의 쿠폰만 조회" ON user_coupons
    FOR SELECT
    USING (user_id = auth.uid() OR auth.uid() IS NOT NULL);

-- 인증된 사용자는 user_coupons 관리 가능 (임시)
CREATE POLICY "인증된 사용자 user_coupons 관리 가능" ON user_coupons
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- ==========================================
-- 완료
-- ==========================================
COMMENT ON TABLE coupons IS '쿠폰 마스터 테이블 - 관리자가 생성';
COMMENT ON TABLE user_coupons IS '사용자별 쿠폰 보유 및 사용 이력';
COMMENT ON FUNCTION validate_coupon IS '쿠폰 유효성 검증 및 할인 금액 계산';
COMMENT ON FUNCTION use_coupon IS '쿠폰 사용 처리 (주문 생성 시 호출)';
