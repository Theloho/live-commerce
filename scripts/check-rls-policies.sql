-- ==========================================
-- RLS 정책 확인 스크립트
-- 목적: orders, order_shipping 테이블의 UPDATE 정책 확인
-- ==========================================

-- 1. orders 테이블 RLS 정책 확인
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY cmd;

-- 2. order_shipping 테이블 RLS 정책 확인
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'order_shipping'
ORDER BY cmd;

-- 3. orders 테이블 RLS 활성화 여부 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('orders', 'order_shipping');
