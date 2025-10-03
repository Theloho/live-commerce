-- =========================================
-- 관리자 RLS 정책 설정 (존재하는 테이블만)
-- =========================================
-- Supabase SQL Editor에서 실행
-- 날짜: 2025-10-03
-- =========================================

-- ==========================================
-- 1. user_coupons 테이블
-- ==========================================

DROP POLICY IF EXISTS "Admin full access on user_coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users can view own coupons" ON user_coupons;
DROP POLICY IF EXISTS "Authenticated can insert coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users can update own coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users can delete own coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users view own coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users update own coupons" ON user_coupons;

ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on user_coupons" ON user_coupons
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Users view own coupons" ON user_coupons
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own coupons" ON user_coupons
FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- 2. coupons 테이블
-- ==========================================

DROP POLICY IF EXISTS "Admin full access on coupons" ON coupons;
DROP POLICY IF EXISTS "Users view active coupons" ON coupons;

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on coupons" ON coupons
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Users view active coupons" ON coupons
FOR SELECT USING (is_active = true);

-- ==========================================
-- 3. profiles 테이블
-- ==========================================

DROP POLICY IF EXISTS "Admin full access on profiles" ON profiles;
DROP POLICY IF EXISTS "Users own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on profiles" ON profiles
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Users own profile" ON profiles
FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- ==========================================
-- 4. orders 테이블
-- ==========================================

DROP POLICY IF EXISTS "Admin full access on orders" ON orders;
DROP POLICY IF EXISTS "Users own orders" ON orders;
DROP POLICY IF EXISTS "Users view own orders" ON orders;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on orders" ON orders
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Users view own orders" ON orders
FOR SELECT USING (
  auth.uid() = user_id OR
  order_type LIKE '%' || auth.uid()::text || '%'
);

-- ==========================================
-- 5. order_items 테이블
-- ==========================================

DROP POLICY IF EXISTS "Admin full access on order_items" ON order_items;
DROP POLICY IF EXISTS "Users view own order_items" ON order_items;

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on order_items" ON order_items
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Users view own order_items" ON order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (orders.user_id = auth.uid() OR orders.order_type LIKE '%' || auth.uid()::text || '%')
  )
);

-- ==========================================
-- 6. products 테이블
-- ==========================================

DROP POLICY IF EXISTS "Admin full access on products" ON products;
DROP POLICY IF EXISTS "Public can view active products" ON products;
DROP POLICY IF EXISTS "Public view active products" ON products;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on products" ON products
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Public view active products" ON products
FOR SELECT USING (is_visible = true);

-- ==========================================
-- 7. order_shipping 테이블
-- ==========================================

DROP POLICY IF EXISTS "Admin full access on order_shipping" ON order_shipping;
DROP POLICY IF EXISTS "Users view own shipping" ON order_shipping;

ALTER TABLE order_shipping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on order_shipping" ON order_shipping
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Users view own shipping" ON order_shipping
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_shipping.order_id
    AND (orders.user_id = auth.uid() OR orders.order_type LIKE '%' || auth.uid()::text || '%')
  )
);

-- ==========================================
-- 8. order_payments 테이블
-- ==========================================

DROP POLICY IF EXISTS "Admin full access on order_payments" ON order_payments;
DROP POLICY IF EXISTS "Users view own payments" ON order_payments;

ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on order_payments" ON order_payments
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Users view own payments" ON order_payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_payments.order_id
    AND (orders.user_id = auth.uid() OR orders.order_type LIKE '%' || auth.uid()::text || '%')
  )
);

-- ==========================================
-- 확인: 생성된 정책 목록 조회
-- ==========================================
SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN policyname LIKE '%Admin%' THEN '🔴 관리자'
    WHEN policyname LIKE '%Users%' THEN '🟢 사용자'
    WHEN policyname LIKE '%Public%' THEN '🔵 공개'
    ELSE '⚪ 기타'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_coupons', 'coupons', 'profiles', 'orders', 'order_items', 'products', 'order_shipping', 'order_payments')
ORDER BY tablename, policyname;
