-- ✅ 2025-11-03 Bug #17-4: 무제한 쿠폰 재배포 허용
--
-- 목적: 동일 사용자가 동일 쿠폰을 여러 번 받을 수 있도록 허용
--
-- 변경 사항:
-- - user_coupons 테이블의 UNIQUE 제약 조건 제거
-- - (user_id, coupon_id) 조합이 중복 가능하도록 변경
--
-- 사용자 요구사항:
-- "나는 내가 또 주고싶으면 또 몇번이고 줄수있길를 원해"
-- - 이전에 한번 보유한 적이 있어도
-- - 이미 사용했어도
-- - 관리자가 원하면 다시 배포 가능

-- UNIQUE 제약 조건 제거
ALTER TABLE user_coupons DROP CONSTRAINT IF EXISTS user_coupons_user_id_coupon_id_key;

-- 확인 쿼리 (제약 조건이 제거되었는지 확인)
-- SELECT conname as constraint_name
-- FROM pg_constraint
-- WHERE conrelid = 'user_coupons'::regclass
--   AND contype = 'u'
--   AND conname LIKE '%user_id%coupon_id%';
-- 결과: 0 rows (제약 조건이 제거됨)
