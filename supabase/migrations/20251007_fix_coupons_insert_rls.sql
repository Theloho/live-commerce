/**
 * 쿠폰 테이블 INSERT RLS 정책 수정
 *
 * 문제:
 * - 관리자가 coupons 테이블에 INSERT 시 403 Forbidden 발생
 * - 기존 "FOR ALL USING" 정책은 INSERT에 제대로 작동하지 않음
 *
 * 해결:
 * - INSERT 전용 정책 추가 (WITH CHECK 사용)
 * - 관리자 권한 확인 함수 적용
 *
 * 작성일: 2025-10-07
 */

-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "인증된 사용자 쿠폰 관리 가능" ON coupons;

-- 2. 개별 정책 생성

-- 2-1. SELECT: 모든 사용자 조회 가능 (기존 유지)
-- "모든 사용자 쿠폰 조회 가능" 정책 이미 존재

-- 2-2. INSERT: 관리자만 쿠폰 생성 가능
CREATE POLICY "관리자만 쿠폰 생성 가능" ON coupons
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND is_admin = true
        )
    );

-- 2-3. UPDATE: 관리자만 쿠폰 수정 가능
CREATE POLICY "관리자만 쿠폰 수정 가능" ON coupons
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND is_admin = true
        )
    );

-- 2-4. DELETE: 관리자만 쿠폰 삭제 가능
CREATE POLICY "관리자만 쿠폰 삭제 가능" ON coupons
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND is_admin = true
        )
    );

COMMENT ON POLICY "관리자만 쿠폰 생성 가능" ON coupons IS '관리자 권한 확인 후 쿠폰 생성 허용';
COMMENT ON POLICY "관리자만 쿠폰 수정 가능" ON coupons IS '관리자 권한 확인 후 쿠폰 수정 허용';
COMMENT ON POLICY "관리자만 쿠폰 삭제 가능" ON coupons IS '관리자 권한 확인 후 쿠폰 삭제 허용';
