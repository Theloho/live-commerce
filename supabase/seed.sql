-- ==========================================
-- Live Commerce Test Data Seeds (Core Data Only)
-- ==========================================

-- Clear existing data (be careful in production!)
TRUNCATE TABLE broadcast_messages CASCADE;
TRUNCATE TABLE broadcast_viewers CASCADE;
TRUNCATE TABLE broadcast_products CASCADE;
TRUNCATE TABLE broadcasts CASCADE;
TRUNCATE TABLE coupon_usages CASCADE;
TRUNCATE TABLE coupons CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE reviews CASCADE;
TRUNCATE TABLE wishlists CASCADE;
TRUNCATE TABLE carts CASCADE;
TRUNCATE TABLE product_variants CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE profiles CASCADE;

-- Note: User profiles will be created through Supabase Auth registration
-- This seed file focuses on core business data only

-- Create variables to store generated UUIDs for referencing
DO $$
DECLARE
    cat_fashion UUID := gen_random_uuid();
    cat_beauty UUID := gen_random_uuid();
    cat_lifestyle UUID := gen_random_uuid();
    cat_electronics UUID := gen_random_uuid();
    cat_sports UUID := gen_random_uuid();
    cat_womens_clothing UUID := gen_random_uuid();
    cat_mens_clothing UUID := gen_random_uuid();
    cat_shoes UUID := gen_random_uuid();
    cat_bags UUID := gen_random_uuid();
    cat_skincare UUID := gen_random_uuid();
    cat_makeup UUID := gen_random_uuid();
    cat_haircare UUID := gen_random_uuid();

    demo_seller_id UUID := gen_random_uuid();

    prod_dress UUID := gen_random_uuid();
    prod_coat UUID := gen_random_uuid();
    prod_boots UUID := gen_random_uuid();
    prod_serum UUID := gen_random_uuid();
    prod_foundation UUID := gen_random_uuid();
    prod_pan_set UUID := gen_random_uuid();
    prod_airfryer UUID := gen_random_uuid();
    prod_earbuds UUID := gen_random_uuid();
    prod_yoga_mat UUID := gen_random_uuid();

    broadcast_fashion UUID := gen_random_uuid();
    broadcast_beauty UUID := gen_random_uuid();
    broadcast_cooking UUID := gen_random_uuid();
BEGIN
    -- ==========================================
    -- Categories
    -- ==========================================

    INSERT INTO categories (id, parent_id, name, slug, description, sort_order, is_active) VALUES
    -- Top level categories
    (cat_fashion, NULL, '패션', 'fashion', '의류, 신발, 액세서리', 1, true),
    (cat_beauty, NULL, '뷰티', 'beauty', '화장품, 스킨케어, 헤어케어', 2, true),
    (cat_lifestyle, NULL, '라이프스타일', 'lifestyle', '홈데코, 키친, 생활용품', 3, true),
    (cat_electronics, NULL, '전자기기', 'electronics', '스마트폰, 노트북, 가전제품', 4, true),
    (cat_sports, NULL, '스포츠', 'sports', '운동용품, 아웃도어', 5, true),

    -- Fashion subcategories
    (cat_womens_clothing, cat_fashion, '여성의류', 'womens-clothing', '드레스, 블라우스, 바지', 1, true),
    (cat_mens_clothing, cat_fashion, '남성의류', 'mens-clothing', '셔츠, 정장, 캐주얼웨어', 2, true),
    (cat_shoes, cat_fashion, '신발', 'shoes', '운동화, 구두, 부츠', 3, true),
    (cat_bags, cat_fashion, '가방', 'bags', '핸드백, 백팩, 지갑', 4, true),

    -- Beauty subcategories
    (cat_skincare, cat_beauty, '스킨케어', 'skincare', '클렌징, 토너, 세럼, 크림', 1, true),
    (cat_makeup, cat_beauty, '메이크업', 'makeup', '베이스, 아이, 립', 2, true),
    (cat_haircare, cat_beauty, '헤어케어', 'haircare', '샴푸, 트리트메nt', 3, true);

    -- ==========================================
    -- Sample Products (without seller dependency)
    -- Note: In production, sellers will be created through Auth and products will reference real seller IDs
    -- ==========================================

    -- Create a dummy seller profile for demo products
    INSERT INTO profiles (id, email, name, nickname, role, status, business_name) VALUES
    (demo_seller_id, 'demo@livecommerce.com', 'Demo Store', 'demostore', 'seller', 'active', 'Demo Store');

    INSERT INTO products (id, seller_id, category_id, title, slug, description, short_description, price, compare_price, sku, stock_quantity, status, is_featured, thumbnail_url, images, min_order_quantity, view_count, like_count, review_count, review_rating, sales_count) VALUES

    -- Fashion products
    (prod_dress, demo_seller_id, cat_womens_clothing,
     '겨울 니트 원피스', 'winter-knit-dress',
     '부드러운 터치감의 겨울 니트 원피스입니다. 따뜻하면서도 스타일리시한 디자인으로 데일리룩으로 완벽합니다.',
     '부드러운 겨울 니트 원피스, 데일리룩 추천',
     89000, 129000, 'DRESS-001', 50, 'active', true,
     'https://picsum.photos/400/400?random=1',
     '["https://picsum.photos/400/400?random=1", "https://picsum.photos/400/400?random=2"]',
     1, 245, 23, 15, 4.5, 32),

    (prod_coat, demo_seller_id, cat_mens_clothing,
     '남성 캐시미어 코트', 'mens-cashmere-coat',
     '고급 캐시미어 100% 소재의 남성용 롱코트입니다. 클래식한 디자인으로 비즈니스 룩에 완벽합니다.',
     '캐시미어 100% 남성 롱코트',
     320000, 450000, 'COAT-M-001', 25, 'active', true,
     'https://picsum.photos/400/400?random=3',
     '["https://picsum.photos/400/400?random=3", "https://picsum.photos/400/400?random=4"]',
     1, 156, 18, 8, 4.8, 12),

    (prod_boots, demo_seller_id, cat_shoes,
     '프리미엄 가죽 부츠', 'premium-leather-boots',
     '이탈리아 최고급 가죽으로 제작된 수제 부츠입니다. 편안한 착용감과 세련된 디자인을 자랑합니다.',
     '이탈리아 수제 가죽 부츠',
     280000, 380000, 'BOOTS-001', 30, 'active', false,
     'https://picsum.photos/400/400?random=5',
     '["https://picsum.photos/400/400?random=5", "https://picsum.photos/400/400?random=6"]',
     1, 89, 12, 5, 4.6, 8),

    -- Beauty products
    (prod_serum, demo_seller_id, cat_skincare,
     '비타민C 세럼 30ml', 'vitamin-c-serum-30ml',
     '순수 비타민C 20% 고농축 세럼으로 브라이트닝과 안티에이징에 효과적입니다. 민감한 피부도 사용 가능합니다.',
     '비타민C 20% 고농축 브라이트닝 세럼',
     45000, 65000, 'SERUM-VC-001', 100, 'active', true,
     'https://picsum.photos/400/400?random=7',
     '["https://picsum.photos/400/400?random=7", "https://picsum.photos/400/400?random=8"]',
     1, 432, 56, 28, 4.7, 85),

    (prod_foundation, demo_seller_id, cat_makeup,
     '올데이 쿠션 파운데이션', 'all-day-cushion-foundation',
     '24시간 지속되는 커버력과 수분감을 동시에! SPF50+ PA+++ 자외선 차단 기능까지.',
     '24시간 지속 쿠션, SPF50+ PA+++',
     28000, 35000, 'FOUNDATION-001', 75, 'active', true,
     'https://picsum.photos/400/400?random=9',
     '["https://picsum.photos/400/400?random=9", "https://picsum.photos/400/400?random=10"]',
     1, 298, 34, 18, 4.4, 52),

    -- Lifestyle products
    (prod_pan_set, demo_seller_id, cat_lifestyle,
     '프리미엄 논스틱 팬 세트', 'premium-nonstick-pan-set',
     '독일 기술로 제작된 프리미엄 논스틱 팬 3종 세트입니다. 인덕션, 가스레인지 모두 사용 가능합니다.',
     '독일 기술 논스틱 팬 3종 세트',
     125000, 180000, 'PAN-SET-001', 40, 'active', true,
     'https://picsum.photos/400/400?random=11',
     '["https://picsum.photos/400/400?random=11", "https://picsum.photos/400/400?random=12"]',
     1, 167, 21, 12, 4.6, 28),

    (prod_airfryer, demo_seller_id, cat_lifestyle,
     '스마트 에어프라이어 5L', 'smart-air-fryer-5l',
     '앱으로 제어 가능한 스마트 에어프라이어입니다. 200가지 레시피 내장으로 누구나 쉽게 요리할 수 있습니다.',
     '앱 제어 스마트 에어프라이어, 200가지 레시피',
     89000, 120000, 'AIRFRYER-001', 60, 'active', false,
     'https://picsum.photos/400/400?random=13',
     '["https://picsum.photos/400/400?random=13", "https://picsum.photos/400/400?random=14"]',
     1, 234, 29, 16, 4.3, 41),

    -- Electronics
    (prod_earbuds, demo_seller_id, cat_electronics,
     '블루투스 무선 이어폰', 'bluetooth-wireless-earbuds',
     '최신 블루투스 5.0 기술과 노이즈 캔슬링 기능을 탑재한 프리미엄 무선 이어폰입니다.',
     '노이즈 캔슬링 블루투스 이어폰',
     150000, 200000, 'EARBUDS-001', 80, 'active', true,
     'https://picsum.photos/400/400?random=15',
     '["https://picsum.photos/400/400?random=15", "https://picsum.photos/400/400?random=16"]',
     1, 356, 42, 24, 4.5, 67),

    -- Sports
    (prod_yoga_mat, demo_seller_id, cat_sports,
     '요가 매트 프리미엄', 'yoga-mat-premium',
     '친환경 TPE 소재로 제작된 프리미엄 요가 매트입니다. 뛰어난 쿠셔닝과 미끄럼 방지 기능을 제공합니다.',
     '친환경 TPE 소재 프리미엄 요가 매트',
     45000, 60000, 'YOGA-MAT-001', 120, 'active', false,
     'https://picsum.photos/400/400?random=17',
     '["https://picsum.photos/400/400?random=17", "https://picsum.photos/400/400?random=18"]',
     1, 189, 25, 11, 4.4, 38);

    -- ==========================================
    -- Product Variants
    -- ==========================================

    INSERT INTO product_variants (id, product_id, title, sku, price, stock_quantity, option1_name, option1_value, option2_name, option2_value) VALUES
    -- Dress variants (colors and sizes)
    (gen_random_uuid(), prod_dress, '겨울 니트 원피스 - 블랙/S', 'DRESS-001-BK-S', NULL, 15, 'Color', 'Black', 'Size', 'S'),
    (gen_random_uuid(), prod_dress, '겨울 니트 원피스 - 블랙/M', 'DRESS-001-BK-M', NULL, 20, 'Color', 'Black', 'Size', 'M'),
    (gen_random_uuid(), prod_dress, '겨울 니트 원피스 - 블랙/L', 'DRESS-001-BK-L', NULL, 10, 'Color', 'Black', 'Size', 'L'),
    (gen_random_uuid(), prod_dress, '겨울 니트 원피스 - 네이비/S', 'DRESS-001-NV-S', NULL, 8, 'Color', 'Navy', 'Size', 'S'),
    (gen_random_uuid(), prod_dress, '겨울 니트 원피스 - 네이비/M', 'DRESS-001-NV-M', NULL, 12, 'Color', 'Navy', 'Size', 'M'),

    -- Coat variants (colors and sizes)
    (gen_random_uuid(), prod_coat, '캐시미어 코트 - 차콜/95', 'COAT-M-001-CH-95', NULL, 8, 'Color', 'Charcoal', 'Size', '95'),
    (gen_random_uuid(), prod_coat, '캐시미어 코트 - 차콜/100', 'COAT-M-001-CH-100', NULL, 10, 'Color', 'Charcoal', 'Size', '100'),
    (gen_random_uuid(), prod_coat, '캐시미어 코트 - 네이비/95', 'COAT-M-001-NV-95', NULL, 5, 'Color', 'Navy', 'Size', '95'),
    (gen_random_uuid(), prod_coat, '캐시미어 코트 - 네이비/100', 'COAT-M-001-NV-100', NULL, 7, 'Color', 'Navy', 'Size', '100'),

    -- Foundation variants (shades)
    (gen_random_uuid(), prod_foundation, '쿠션 파운데이션 - 21호', 'FOUNDATION-001-21', NULL, 25, 'Shade', '21 Light Beige', NULL, NULL),
    (gen_random_uuid(), prod_foundation, '쿠션 파운데이션 - 23호', 'FOUNDATION-001-23', NULL, 30, 'Shade', '23 Natural Beige', NULL, NULL),
    (gen_random_uuid(), prod_foundation, '쿠션 파운데이션 - 25호', 'FOUNDATION-001-25', NULL, 20, 'Shade', '25 Deep Beige', NULL, NULL),

    -- Earbuds variants (colors)
    (gen_random_uuid(), prod_earbuds, '블루투스 이어폰 - 화이트', 'EARBUDS-001-WHITE', NULL, 40, 'Color', 'White', NULL, NULL),
    (gen_random_uuid(), prod_earbuds, '블루투스 이어폰 - 블랙', 'EARBUDS-001-BLACK', NULL, 40, 'Color', 'Black', NULL, NULL),

    -- Yoga mat variants (colors)
    (gen_random_uuid(), prod_yoga_mat, '요가 매트 - 퍼플', 'YOGA-MAT-001-PURPLE', NULL, 40, 'Color', 'Purple', NULL, NULL),
    (gen_random_uuid(), prod_yoga_mat, '요가 매트 - 핑크', 'YOGA-MAT-001-PINK', NULL, 40, 'Color', 'Pink', NULL, NULL),
    (gen_random_uuid(), prod_yoga_mat, '요가 매트 - 블루', 'YOGA-MAT-001-BLUE', NULL, 40, 'Color', 'Blue', NULL, NULL);

    -- ==========================================
    -- Sample Broadcasts (without broadcaster dependency)
    -- ==========================================

    INSERT INTO broadcasts (id, broadcaster_id, title, description, scheduled_at, started_at, status, stream_key, chat_enabled, reactions_enabled, max_viewers, current_viewers, total_views, tags) VALUES
    -- Live broadcasts
    (broadcast_fashion, demo_seller_id,
     '🔥겨울 신상 50% 할인 특가전🔥',
     '따뜻하고 스타일리시한 겨울 아이템들을 특가로 만나보세요! 원피스, 코트, 부츠까지!',
     NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 30 minutes', 'live',
     'live_stream_key_001', true, true, 1245, 892, 3421,
     '["fashion", "winter", "discount", "sale"]'),

    (broadcast_beauty, demo_seller_id,
     '✨뷰티 신제품 런칭쇼✨',
     '새로 출시된 비타민C 세럼과 쿠션 파운데이션을 가장 먼저 만나보세요!',
     NOW() - INTERVAL '1 hour', NOW() - INTERVAL '45 minutes', 'live',
     'live_stream_key_002', true, true, 567, 445, 1234,
     '["beauty", "skincare", "makeup", "new"]'),

    -- Scheduled broadcasts
    (broadcast_cooking, demo_seller_id,
     '🍳홈쿡 마스터클래스 - 에어프라이어 활용법',
     '에어프라이어로 만드는 간단하고 맛있는 요리법을 알려드립니다. 라이브 쿠킹쇼!',
     NOW() + INTERVAL '2 hours', NULL, 'scheduled',
     'live_stream_key_003', true, true, 0, 0, 0,
     '["cooking", "airfryer", "recipe", "kitchen"]');

    -- ==========================================
    -- Broadcast Products
    -- ==========================================

    INSERT INTO broadcast_products (id, broadcast_id, product_id, display_order, is_featured, live_price, discount_percentage, promotion_text, limited_quantity, sold_quantity) VALUES
    -- Products in fashion live broadcast
    (gen_random_uuid(), broadcast_fashion, prod_dress, 1, true, 79000, 38.8, '라이브 전용 특가! 지금만!', 20, 12),
    (gen_random_uuid(), broadcast_fashion, prod_coat, 2, true, 280000, 37.8, '오늘만 특가!', 10, 5),
    (gen_random_uuid(), broadcast_fashion, prod_boots, 3, false, 250000, 34.2, '라이브 할인가', 15, 3),

    -- Products in beauty live broadcast
    (gen_random_uuid(), broadcast_beauty, prod_serum, 1, true, 35000, 46.2, '런칭 기념 특가!', 50, 28),
    (gen_random_uuid(), broadcast_beauty, prod_foundation, 2, true, 24000, 31.4, '세트 구매시 추가할인!', 30, 18);

    -- ==========================================
    -- Sample Coupons
    -- ==========================================

    INSERT INTO coupons (id, code, title, description, discount_type, discount_value, max_discount_amount, min_order_amount, usage_limit, usage_count, valid_from, valid_until, is_active) VALUES
    (gen_random_uuid(), 'WELCOME2024', '신규회원 환영 쿠폰', '신규 회원가입 축하 10% 할인 쿠폰', 'percentage', 10, 10000, 50000, 1000, 156, NOW() - INTERVAL '1 month', NOW() + INTERVAL '2 months', true),
    (gen_random_uuid(), 'LIVE50', '라이브 방송 특가 쿠폰', '라이브 방송 시청자 전용 5만원 할인', 'fixed_amount', 50000, NULL, 200000, 500, 89, NOW() - INTERVAL '1 week', NOW() + INTERVAL '1 week', true),
    (gen_random_uuid(), 'FREESHIP', '무료배송 쿠폰', '모든 상품 무료배송', 'free_shipping', 0, NULL, 0, NULL, 234, NOW() - INTERVAL '2 weeks', NOW() + INTERVAL '1 month', true),
    (gen_random_uuid(), 'WINTER30', '겨울 시즌 특가', '겨울 상품 30% 할인 쿠폰', 'percentage', 30, 100000, 100000, 100, 23, NOW() - INTERVAL '1 week', NOW() + INTERVAL '3 weeks', true);

    -- Update product stats
    UPDATE products SET
        review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = products.id AND NOT is_hidden),
        review_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = products.id AND NOT is_hidden);

    -- Update broadcast current viewers (simulated)
    UPDATE broadcasts SET
        current_viewers = CASE
            WHEN status = 'live' THEN FLOOR(RANDOM() * 1000) + 100
            ELSE 0
        END;
END $$;

COMMIT;