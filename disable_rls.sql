-- RLS 정책 완전 비활성화 (개발 단계)
-- Supabase SQL Editor에서 실행: https://app.supabase.com/project/xoinislnaxllijlnjeue/sql/new

-- 1. 모든 테이블 RLS 비활성화
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_shipping DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE live_broadcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE live_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons DISABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Only admin can insert products" ON products;
DROP POLICY IF EXISTS "Only admin can update products" ON products;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can create order items" ON order_items;
DROP POLICY IF EXISTS "Users can update own order items" ON order_items;
DROP POLICY IF EXISTS "Users can manage own cart" ON cart_items;
DROP POLICY IF EXISTS "Users can manage own wishlist" ON wishlist;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

-- 3. 권한 재설정
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 확인 메시지
SELECT 'RLS 완전 비활성화 완료 - 개발 단계에서만 사용' as status;