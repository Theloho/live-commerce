-- ==========================================
-- 쿠폰 사용 처리 함수 수정
-- 생성일: 2025-10-05
-- 문제: use_coupon() 함수에 SECURITY DEFINER 없어 RLS 적용됨 → 쿠폰 사용 실패
-- 해결: SECURITY DEFINER 추가 + 추가 검증 로직
-- ==========================================

-- ==========================================
-- 1. use_coupon 함수 재생성 (SECURITY DEFINER 추가)
-- ==========================================

CREATE OR REPLACE FUNCTION use_coupon(
    p_user_id UUID,
    p_coupon_id UUID,
    p_order_id UUID,
    p_discount_amount DECIMAL(12, 2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ RLS 우회 (함수 소유자 권한으로 실행)
SET search_path = public
AS $$
DECLARE
    v_updated_count INTEGER;
    v_current_user_id UUID;
BEGIN
    -- 현재 로그인한 사용자 확인
    v_current_user_id := auth.uid();

    -- 보안 검증: 자기 쿠폰만 사용 가능
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION '인증되지 않은 사용자입니다';
    END IF;

    IF v_current_user_id != p_user_id THEN
        RAISE EXCEPTION '다른 사용자의 쿠폰을 사용할 수 없습니다';
    END IF;

    -- 쿠폰 사용 처리
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

    -- 디버그 로그 (선택적)
    IF v_updated_count = 0 THEN
        RAISE WARNING '쿠폰 사용 실패: user_id=%, coupon_id=%, 이미 사용되었거나 보유하지 않은 쿠폰', p_user_id, p_coupon_id;
    ELSE
        RAISE NOTICE '✅ 쿠폰 사용 완료: user_id=%, coupon_id=%, order_id=%', p_user_id, p_coupon_id, p_order_id;
    END IF;

    RETURN v_updated_count > 0;
END;
$$;

-- ==========================================
-- 2. 함수 권한 설정
-- ==========================================

-- 인증된 사용자만 함수 실행 가능
GRANT EXECUTE ON FUNCTION use_coupon(UUID, UUID, UUID, DECIMAL) TO authenticated;

-- ==========================================
-- 3. 함수 확인
-- ==========================================

SELECT
  proname as function_name,
  prosecdef as is_security_definer,
  provolatile as volatility
FROM pg_proc
WHERE proname = 'use_coupon';

-- 결과:
-- function_name | is_security_definer | volatility
-- use_coupon    | t (true)            | v (volatile)

-- ==========================================
-- 4. 테스트 (선택적, 주석 처리)
-- ==========================================

-- 현재 사용자의 미사용 쿠폰 확인
-- SELECT
--   uc.id,
--   uc.user_id,
--   uc.coupon_id,
--   uc.is_used,
--   c.code,
--   c.name
-- FROM user_coupons uc
-- JOIN coupons c ON uc.coupon_id = c.id
-- WHERE uc.user_id = auth.uid()
--   AND uc.is_used = false;

-- ==========================================
-- 완료 메시지
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ use_coupon 함수 수정 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '변경 사항:';
  RAISE NOTICE '  - SECURITY DEFINER 추가 (RLS 우회)';
  RAISE NOTICE '  - 보안 검증 추가 (자기 쿠폰만)';
  RAISE NOTICE '  - 디버그 로그 추가';
  RAISE NOTICE '';
  RAISE NOTICE '효과:';
  RAISE NOTICE '  - 쿠폰 사용 처리 정상 작동';
  RAISE NOTICE '  - RLS UPDATE 정책 무관';
  RAISE NOTICE '  - 보안: 자기 쿠폰만 사용 가능';
  RAISE NOTICE '========================================';
END $$;
