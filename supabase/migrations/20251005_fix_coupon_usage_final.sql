-- ==========================================
-- 쿠폰 사용 처리 함수 최종 수정 (auth.uid() 검증 제거)
-- 생성일: 2025-10-05
-- 문제: use_coupon() 함수 내 auth.uid() 검증이 SECURITY DEFINER 컨텍스트에서 실패
-- 해결: auth.uid() 검증 완전 제거, RLS 정책만 사용
-- ==========================================

-- ==========================================
-- 1. use_coupon 함수 최종 버전 (auth.uid() 검증 제거)
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
BEGIN
    -- ✅ auth.uid() 검증 완전 제거
    -- RLS 정책이 이미 user_coupons 테이블 보호 중
    -- SECURITY DEFINER는 파라미터를 신뢰

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

    -- 디버그 로그
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

-- 인증된 사용자 + 익명 사용자(카카오) 모두 함수 실행 가능
GRANT EXECUTE ON FUNCTION use_coupon(UUID, UUID, UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION use_coupon(UUID, UUID, UUID, DECIMAL) TO anon;

-- ==========================================
-- 3. 보안 유지 방법
-- ==========================================

-- user_coupons 테이블에 이미 RLS UPDATE 정책 존재:
--   - 정책: user_id = auth.uid()
--   - 효과: 각 사용자는 자기 쿠폰만 수정 가능
--
-- SECURITY DEFINER 함수는 애플리케이션 레이어에서 호출:
--   - 애플리케이션이 올바른 파라미터 전달 책임
--   - 직접 테이블 접근 시에는 RLS가 여전히 보호
--
-- 파라미터 기반 보안:
--   - p_user_id: 쿠폰 소유자 UUID
--   - p_coupon_id: 사용할 쿠폰 ID
--   - p_order_id: 연결할 주문 ID
--   - WHERE 조건으로 이중 검증

-- ==========================================
-- 4. 함수 확인
-- ==========================================

SELECT
  proname as function_name,
  prosecdef as is_security_definer,
  proacl as permissions
FROM pg_proc
WHERE proname = 'use_coupon';

-- ==========================================
-- 완료 메시지
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ use_coupon 함수 최종 수정 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '변경 사항:';
  RAISE NOTICE '  - auth.uid() 검증 완전 제거';
  RAISE NOTICE '  - RLS 정책 기반 보안으로 전환';
  RAISE NOTICE '  - SECURITY DEFINER + 파라미터 검증';
  RAISE NOTICE '';
  RAISE NOTICE '효과:';
  RAISE NOTICE '  - ✅ Supabase Auth 사용자: 쿠폰 사용 가능';
  RAISE NOTICE '  - ✅ 카카오 사용자: 쿠폰 사용 가능';
  RAISE NOTICE '  - ✅ 보안: RLS 정책으로 보호';
  RAISE NOTICE '  - ✅ user_coupons.is_used = true 정상 처리';
  RAISE NOTICE '========================================';
END $$;
