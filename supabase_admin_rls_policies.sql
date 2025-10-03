-- =========================================
-- 관리자 RLS 정책 통합 설정
-- =========================================
-- Supabase SQL Editor에서 실행:
-- https://app.supabase.com/project/xoinislnaxllijlnjeue/sql/new
--
-- 목적: 관리자는 모든 데이터 조회/수정 가능, 일반 사용자는 자신의 데이터만
-- 날짜: 2025-10-03
-- =========================================

-- ==========================================
-- 1. user_coupons 테이블
-- ==========================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "Admin can manage all user_coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users can view own coupons" ON user_coupons;
DROP POLICY IF EXISTS "Authenticated can insert coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users can update own coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users can delete own coupons" ON user_coupons;

-- RLS 활성화
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 권한
CREATE POLICY "Admin full access on user_coupons" ON user_coupons
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 사용자는 자신의 쿠폰만 조회
CREATE POLICY "Users view own coupons" ON user_coupons
FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 쿠폰만 업데이트 (사용 처리)
CREATE POLICY "Users update own coupons" ON user_coupons
FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- 2. coupons 테이블
-- ==========================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "Admin full access on coupons" ON coupons;
DROP POLICY IF EXISTS "Users view active coupons" ON coupons;

-- RLS 활성화
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 권한
CREATE POLICY "Admin full access on coupons" ON coupons
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 일반 사용자는 활성 쿠폰만 조회
CREATE POLICY "Users view active coupons" ON coupons
FOR SELECT USING (is_active = true);

-- ==========================================
-- 3. profiles 테이블 (고객 관리)
-- ==========================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "Admin full access on profiles" ON profiles;
DROP POLICY IF EXISTS "Users own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 권한
CREATE POLICY "Admin full access on profiles" ON profiles
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 사용자는 자신의 프로필만 조회/수정
CREATE POLICY "Users own profile" ON profiles
FOR ALL USING (auth.uid() = id);

-- 신규 사용자 프로필 생성 허용
CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- ==========================================
-- 4. orders 테이블 (주문 관리)
-- ==========================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "Admin full access on orders" ON orders;
DROP POLICY IF EXISTS "Users own orders" ON orders;

-- RLS 활성화
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 권한
CREATE POLICY "Admin full access on orders" ON orders
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 사용자는 자신의 주문만 조회
CREATE POLICY "Users view own orders" ON orders
FOR SELECT USING (
  auth.uid() = user_id OR
  order_type LIKE '%' || auth.uid()::text || '%'
);

-- ==========================================
-- 5. order_items 테이블
-- ==========================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "Admin full access on order_items" ON order_items;
DROP POLICY IF EXISTS "Users view own order_items" ON order_items;

-- RLS 활성화
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 권한
CREATE POLICY "Admin full access on order_items" ON order_items
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 사용자는 자신의 주문 아이템만 조회
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

-- 기존 정책 제거
DROP POLICY IF EXISTS "Admin full access on products" ON products;
DROP POLICY IF EXISTS "Public can view active products" ON products;

-- RLS 활성화
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 권한
CREATE POLICY "Admin full access on products" ON products
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 공개된 상품은 모두 조회 가능
CREATE POLICY "Public view active products" ON products
FOR SELECT USING (is_visible = true);

-- ==========================================
-- 7. addresses 테이블
-- ==========================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "Admin full access on addresses" ON addresses;
DROP POLICY IF EXISTS "Users own addresses" ON addresses;

-- RLS 활성화
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 권한
CREATE POLICY "Admin full access on addresses" ON addresses
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 사용자는 자신의 주소만 조회/수정
CREATE POLICY "Users own addresses" ON addresses
FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 8. order_shipping 테이블
-- ==========================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "Admin full access on order_shipping" ON order_shipping;
DROP POLICY IF EXISTS "Users view own shipping" ON order_shipping;

-- RLS 활성화
ALTER TABLE order_shipping ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 권한
CREATE POLICY "Admin full access on order_shipping" ON order_shipping
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 사용자는 자신의 배송 정보만 조회
CREATE POLICY "Users view own shipping" ON order_shipping
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_shipping.order_id
    AND (orders.user_id = auth.uid() OR orders.order_type LIKE '%' || auth.uid()::text || '%')
  )
);

-- ==========================================
-- 9. payment_methods 테이블
-- ==========================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "Admin full access on payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "Users view own payments" ON payment_methods;

-- RLS 활성화
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 권한
CREATE POLICY "Admin full access on payment_methods" ON payment_methods
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 사용자는 자신의 결제 정보만 조회
CREATE POLICY "Users view own payments" ON payment_methods
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = payment_methods.order_id
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
    WHEN policyname LIKE '%Admin%' THEN '🔴 관리자 정책'
    WHEN policyname LIKE '%Users%' THEN '🟢 사용자 정책'
    WHEN policyname LIKE '%Public%' THEN '🔵 공개 정책'
    ELSE '⚪ 기타'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_coupons', 'coupons', 'profiles', 'orders', 'order_items', 'products', 'addresses', 'order_shipping', 'payment_methods')
ORDER BY tablename, policyname;

-- ==========================================
-- 완료 메시지
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '✅ 관리자 RLS 정책 설정 완료!';
  RAISE NOTICE '📋 9개 테이블에 정책 적용됨';
  RAISE NOTICE '🔴 관리자: 모든 데이터 접근 가능';
  RAISE NOTICE '🟢 일반 사용자: 자신의 데이터만 접근 가능';
END $$;
