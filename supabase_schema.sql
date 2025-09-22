-- =========================================
-- SUPABASE DATABASE SCHEMA FOR LIVE COMMERCE
-- =========================================
-- 이 SQL을 Supabase SQL Editor에서 실행하여 데이터베이스를 설정합니다.
-- https://app.supabase.com/project/xoinislnaxllijlnjeue/sql/new

-- =========================================
-- 1. USERS & PROFILES (사용자 및 프로필)
-- =========================================

-- profiles 테이블 (사용자 프로필 정보)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255),
    name VARCHAR(255),
    nickname VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    detail_address TEXT,
    is_admin BOOLEAN DEFAULT false,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 2. PRODUCTS (상품)
-- =========================================

-- products 테이블 (상품 정보)
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    compare_price DECIMAL(10, 2),
    discount_rate INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    images JSONB DEFAULT '[]',
    category VARCHAR(100),
    sub_category VARCHAR(100),
    tags TEXT[],
    inventory INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- product_options 테이블 (상품 옵션)
CREATE TABLE IF NOT EXISTS product_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    values JSONB NOT NULL,
    required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 3. ORDERS (주문)
-- =========================================

-- orders 테이블 (주문 정보)
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_order_number VARCHAR(50) UNIQUE,
    user_id UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, verifying, paid, delivered, cancelled
    order_type VARCHAR(20) DEFAULT 'direct', -- direct, cart
    total_amount DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- order_items 테이블 (주문 상품)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2),
    total_price DECIMAL(10, 2) NOT NULL,
    selected_options JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- order_shipping 테이블 (배송 정보)
CREATE TABLE IF NOT EXISTS order_shipping (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    detail_address TEXT,
    postal_code VARCHAR(10),
    memo TEXT,
    shipping_fee DECIMAL(10, 2) DEFAULT 4000,
    shipping_method VARCHAR(50) DEFAULT 'standard',
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- order_payments 테이블 (결제 정보)
CREATE TABLE IF NOT EXISTS order_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL, -- bank_transfer, card, etc
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, cancelled
    transaction_id VARCHAR(100),
    paid_at TIMESTAMPTZ,
    bank_name VARCHAR(50),
    account_number VARCHAR(50),
    depositor_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 4. LIVE BROADCASTS (라이브 방송)
-- =========================================

-- live_broadcasts 테이블 (라이브 방송)
CREATE TABLE IF NOT EXISTS live_broadcasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    stream_url TEXT,
    host_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, live, ended
    viewer_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- live_products 테이블 (라이브 상품 연결)
CREATE TABLE IF NOT EXISTS live_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    broadcast_id UUID REFERENCES live_broadcasts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    special_price DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 5. CART (장바구니)
-- =========================================

-- cart_items 테이블 (장바구니 아이템)
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    selected_options JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- =========================================
-- 6. REVIEWS & RATINGS (리뷰 및 평점)
-- =========================================

-- reviews 테이블 (리뷰)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    order_item_id UUID REFERENCES order_items(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,
    images JSONB DEFAULT '[]',
    is_verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 7. WISHLIST (찜하기)
-- =========================================

-- wishlist 테이블 (찜 목록)
CREATE TABLE IF NOT EXISTS wishlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- =========================================
-- 8. COUPONS (쿠폰)
-- =========================================

-- coupons 테이블 (쿠폰)
CREATE TABLE IF NOT EXISTS coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL, -- percentage, fixed
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2),
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_coupons 테이블 (사용자별 쿠폰)
CREATE TABLE IF NOT EXISTS user_coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
    used_at TIMESTAMPTZ,
    order_id UUID REFERENCES orders(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, coupon_id)
);

-- =========================================
-- 9. NOTIFICATIONS (알림)
-- =========================================

-- notifications 테이블 (알림)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- order, shipping, promotion, system
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 10. INDEXES (인덱스)
-- =========================================

-- 성능 최적화를 위한 인덱스
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_visible ON products(is_visible);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- =========================================
-- 11. ROW LEVEL SECURITY (RLS)
-- =========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_shipping ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- profiles: 사용자는 자신의 프로필만 보고 수정할 수 있음
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- products: 모든 사용자가 볼 수 있음, 관리자만 수정
CREATE POLICY "Anyone can view products" ON products
    FOR SELECT USING (true);
CREATE POLICY "Only admin can insert products" ON products
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    ));
CREATE POLICY "Only admin can update products" ON products
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    ));

-- orders: 사용자는 자신의 주문만 볼 수 있음
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id);

-- order_items: 사용자는 자신의 주문 아이템만 볼 수 있음
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    ));
CREATE POLICY "Users can create order items" ON order_items
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    ));
CREATE POLICY "Users can update own order items" ON order_items
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    ));

-- cart_items: 사용자는 자신의 장바구니만 관리할 수 있음
CREATE POLICY "Users can manage own cart" ON cart_items
    FOR ALL USING (auth.uid() = user_id);

-- wishlist: 사용자는 자신의 찜 목록만 관리할 수 있음
CREATE POLICY "Users can manage own wishlist" ON wishlist
    FOR ALL USING (auth.uid() = user_id);

-- notifications: 사용자는 자신의 알림만 볼 수 있음
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- =========================================
-- 12. TRIGGERS & FUNCTIONS
-- =========================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 설정
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- 13. SAMPLE DATA (샘플 데이터)
-- =========================================

-- 샘플 상품 데이터
INSERT INTO products (title, description, price, compare_price, discount_rate, thumbnail_url, category, inventory, is_visible) VALUES
('프리미엄 한우 등심', '최고급 1++ 한우 등심 500g', 89000, 120000, 26, 'https://images.unsplash.com/photo-1558030006-450675393462', '육류', 50, true),
('제주 흑돼지 삼겹살', '제주산 흑돼지 삼겹살 600g', 45000, 55000, 18, 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6', '육류', 100, true),
('노르웨이 연어', '신선한 노르웨이산 연어 300g', 28000, 35000, 20, 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6', '수산물', 80, true),
('유기농 채소 세트', '신선한 유기농 채소 모음', 25000, 30000, 17, 'https://images.unsplash.com/photo-1540420773420-3366772f4999', '채소', 120, true),
('프리미엄 과일 선물세트', '엄선된 제철 과일 모음', 65000, 80000, 19, 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b', '과일', 60, true);

-- 샘플 라이브 방송 데이터
INSERT INTO live_broadcasts (title, description, thumbnail_url, stream_url, host_name, status, viewer_count) VALUES
('🔴 LIVE: 한우 특가 라이브!', '오늘만 이 가격! 1++ 한우 대방출', 'https://images.unsplash.com/photo-1558030006-450675393462', 'https://example.com/stream1', '김미식', 'live', 1250),
('제주 직송 특별 라이브', '제주에서 바로 전해드리는 신선함', 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6', 'https://example.com/stream2', '이제주', 'scheduled', 0);

-- =========================================
-- 14. GRANT PERMISSIONS (권한 설정)
-- =========================================

-- anon과 authenticated 역할에 필요한 권한 부여
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =========================================
-- 실행 완료 메시지
-- =========================================
-- 모든 테이블과 설정이 성공적으로 생성되었습니다.
-- Supabase 대시보드의 Table Editor에서 확인할 수 있습니다.