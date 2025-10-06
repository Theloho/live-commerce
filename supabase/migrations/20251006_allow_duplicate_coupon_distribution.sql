/**
 * 쿠폰 중복 배포 허용
 *
 * 변경 사항:
 * - user_coupons 테이블의 UNIQUE(user_id, coupon_id) 제약 제거
 * - 같은 사용자에게 같은 쿠폰을 여러 번 배포 가능
 *
 * 비즈니스 요구사항:
 * - 고객에게 쿠폰을 여러 번 지급할 수 있어야 함
 * - 예: 이벤트 보상, 재구매 혜택 등
 *
 * 작성일: 2025-10-06
 */

-- 1. 기존 UNIQUE 제약 제거
ALTER TABLE user_coupons
DROP CONSTRAINT IF EXISTS user_coupons_user_id_coupon_id_key;

-- 2. 확인 쿼리 (실행 후 확인용)
-- SELECT conname, contype FROM pg_constraint
-- WHERE conrelid = 'user_coupons'::regclass;

COMMENT ON TABLE user_coupons IS '사용자별 쿠폰 보유 및 사용 이력 (중복 배포 허용)';
