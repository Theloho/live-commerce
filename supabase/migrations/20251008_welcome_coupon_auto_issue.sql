-- ============================================
-- 회원가입 시 자동 웰컴 쿠폰 지급 기능
-- 작성일: 2025-10-08
-- ============================================

-- 1. coupons 테이블에 is_welcome_coupon 컬럼 추가
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS is_welcome_coupon BOOLEAN DEFAULT false;

-- 인덱스 추가 (웰컴 쿠폰 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_coupons_welcome
ON coupons(is_welcome_coupon, is_active)
WHERE is_welcome_coupon = true;

COMMENT ON COLUMN coupons.is_welcome_coupon IS '회원가입 시 자동 지급되는 웰컴 쿠폰 플래그';

-- ============================================
-- 2. 회원가입 시 웰컴 쿠폰 자동 지급 함수
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  welcome_coupon RECORD;
  issued_count INTEGER;
BEGIN
  -- 활성화된 웰컴 쿠폰 찾기 (유효기간 내, 발급 제한 확인)
  FOR welcome_coupon IN
    SELECT id, total_usage_limit, total_issued_count
    FROM coupons
    WHERE is_welcome_coupon = true
      AND is_active = true
      AND (valid_from IS NULL OR valid_from <= NOW())
      AND (valid_until IS NULL OR valid_until > NOW())
    ORDER BY created_at DESC
  LOOP
    -- 발급 제한 확인 (total_usage_limit이 NULL이면 무제한)
    IF welcome_coupon.total_usage_limit IS NULL OR
       welcome_coupon.total_issued_count < welcome_coupon.total_usage_limit THEN

      -- 웰컴 쿠폰 발급
      INSERT INTO user_coupons (user_id, coupon_id, issued_by)
      VALUES (NEW.id, welcome_coupon.id, 'system')
      ON CONFLICT DO NOTHING; -- 중복 발급 방지

      -- coupons 테이블 발급 카운트 증가
      UPDATE coupons
      SET total_issued_count = total_issued_count + 1,
          updated_at = NOW()
      WHERE id = welcome_coupon.id;

      -- 로그 출력 (개발 환경)
      RAISE NOTICE '✅ 웰컴 쿠폰 자동 발급: user_id=%, coupon_id=%', NEW.id, welcome_coupon.id;
    ELSE
      RAISE NOTICE '⚠️ 웰컴 쿠폰 발급 제한 초과: coupon_id=%', welcome_coupon.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user_signup() IS '회원가입 시 웰컴 쿠폰 자동 발급 (system)';

-- ============================================
-- 3. 트리거 생성 (profiles INSERT 시 실행)
-- ============================================
DROP TRIGGER IF EXISTS trigger_new_user_signup ON profiles;

CREATE TRIGGER trigger_new_user_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_signup();

COMMENT ON TRIGGER trigger_new_user_signup ON profiles IS '신규 회원가입 시 웰컴 쿠폰 자동 지급';

-- ============================================
-- 4. 테스트 데이터 (선택사항)
-- ============================================
-- 웰컴 쿠폰 예시 (주석 해제하여 사용)
-- INSERT INTO coupons (
--   code,
--   name,
--   description,
--   discount_type,
--   discount_value,
--   min_purchase_amount,
--   valid_from,
--   valid_until,
--   usage_limit_per_user,
--   is_active,
--   is_welcome_coupon
-- ) VALUES (
--   'WELCOME2025',
--   '신규가입 환영 쿠폰',
--   '첫 구매 시 사용 가능한 5,000원 할인 쿠폰',
--   'fixed_amount',
--   5000,
--   30000, -- 3만원 이상 구매 시
--   NOW(),
--   NOW() + INTERVAL '1 year',
--   1, -- 1회 사용 가능
--   true,
--   true -- 웰컴 쿠폰
-- );
