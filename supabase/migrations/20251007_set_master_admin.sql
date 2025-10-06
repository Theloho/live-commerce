/**
 * 마스터 관리자 계정 권한 설정
 *
 * 목적:
 * - master@allok.world 계정에 is_admin = true 설정
 * - 쿠폰 배포 및 관리자 기능 활성화
 *
 * 작성일: 2025-10-07
 */

-- master@allok.world 계정 관리자 권한 설정
UPDATE profiles
SET is_admin = true
WHERE email = 'master@allok.world';

-- 확인
SELECT email, is_admin, created_at
FROM profiles
WHERE email = 'master@allok.world';
