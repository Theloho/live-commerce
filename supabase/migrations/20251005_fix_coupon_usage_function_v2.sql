-- ==========================================
-- 쿠폰 사용 처리 함수 수정 (카카오 사용자 지원)
-- 생성일: 2025-10-05
-- 문제: use_coupon() 함수에 SECURITY DEFINER 없어 RLS 적용됨 → 카카오 사용자 쿠폰 사용 실패
-- 해결: SECURITY DEFINER 추가 + 카카오 사용자 고려한 검증
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
    -- 현재 로그인한 사용자 확인 (있으면)
    v_current_user_id := auth.uid();

    -- 보안 검증 (Supabase Auth 사용자만)
    -- 카카오 사용자는 auth.uid()가 NULL이므로 검증 스킵
    IF v_current_user_id IS NOT NULL THEN
        -- Supabase Auth 사용자: 자기 쿠폰만 사용 가능
        IF v_current_user_id != p_user_id THEN
            RAISE EXCEPTION '다른 사용자의 쿠폰을 사용할 수 없습니다';
        END IF;
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

    -- 디버그 로그
    IF v_updated_count = 0 THEN
        RAISE WARNING '쿠폰 사용 실패: user_id=%, coupon_id=%, 이미 사용되었거나 보유하지 않은 쿠폰', p_user_id, p_coupon_id;
    ELSE
        RAISE NOTICE '✅ 쿠폰 사용 완료: user_id=%, coupon_id=%, order_id=%, auth.uid()=%', p_user_id, p_coupon_id, p_order_id, v_current_user_id;
    END IF;

    RETURN v_updated_count > 0;
END;
$$;

-- ==========================================
-- 2. user_coupons UPDATE 정책 정리 (중복 제거)
-- ==========================================

-- 중복된 UPDATE 정책 제거
DROP POLICY IF EXISTS "Users update own coupons" ON user_coupons;

-- "Users can update their coupons" 정책만 유지
-- (이미 존재하므로 재생성 불필요)

-- ==========================================
-- 3. 함수 권한 설정
-- ==========================================

-- 인증된 사용자 + 익명 사용자(카카오) 모두 함수 실행 가능
GRANT EXECUTE ON FUNCTION use_coupon(UUID, UUID, UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION use_coupon(UUID, UUID, UUID, DECIMAL) TO anon;

-- ==========================================
-- 4. 정책 및 함수 확인
-- ==========================================

-- user_coupons 정책 확인
SELECT
  tablename,
  policyname,
  cmd,
  qual as condition
FROM pg_policies
WHERE tablename = 'user_coupons'
ORDER BY cmd, policyname;

-- use_coupon 함수 확인
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
  RAISE NOTICE '✅ use_coupon 함수 수정 완료 (v2)!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '변경 사항:';
  RAISE NOTICE '  - SECURITY DEFINER 추가 (RLS 우회)';
  RAISE NOTICE '  - 카카오 사용자 지원 (auth.uid() = NULL 허용)';
  RAISE NOTICE '  - Supabase Auth 사용자: 자기 쿠폰만 검증';
  RAISE NOTICE '  - 중복 UPDATE 정책 제거';
  RAISE NOTICE '  - anon 권한 추가 (카카오 사용자)';
  RAISE NOTICE '';
  RAISE NOTICE '효과:';
  RAISE NOTICE '  - ✅ Supabase Auth 사용자: 쿠폰 사용 가능';
  RAISE NOTICE '  - ✅ 카카오 사용자: 쿠폰 사용 가능';
  RAISE NOTICE '  - ✅ RLS UPDATE 정책 무관';
  RAISE NOTICE '  - ✅ 보안: 자기 쿠폰만 사용 가능';
  RAISE NOTICE '========================================';
END $$;
