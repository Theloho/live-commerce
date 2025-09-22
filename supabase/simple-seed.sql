-- ==========================================
-- Live Commerce Simple Test Data
-- Core business data only (no users)
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

-- Generate UUIDs for data consistency
DO $$
DECLARE
    -- Categories
    cat_fashion UUID := gen_random_uuid();
    cat_beauty UUID := gen_random_uuid();
    cat_lifestyle UUID := gen_random_uuid();
    cat_electronics UUID := gen_random_uuid();
    cat_sports UUID := gen_random_uuid();

    -- Subcategories
    cat_womens UUID := gen_random_uuid();
    cat_mens UUID := gen_random_uuid();
    cat_skincare UUID := gen_random_uuid();
    cat_makeup UUID := gen_random_uuid();
    cat_kitchen UUID := gen_random_uuid();

    -- Demo seller (for products without user dependency)
    demo_seller UUID := gen_random_uuid();

    -- Products
    prod_1 UUID := gen_random_uuid();
    prod_2 UUID := gen_random_uuid();
    prod_3 UUID := gen_random_uuid();
    prod_4 UUID := gen_random_uuid();
    prod_5 UUID := gen_random_uuid();
    prod_6 UUID := gen_random_uuid();
    prod_7 UUID := gen_random_uuid();
    prod_8 UUID := gen_random_uuid();
    prod_9 UUID := gen_random_uuid();
    prod_10 UUID := gen_random_uuid();

    -- Broadcasts
    broadcast_live UUID := gen_random_uuid();
    broadcast_scheduled_1 UUID := gen_random_uuid();
    broadcast_scheduled_2 UUID := gen_random_uuid();

BEGIN
    -- ==========================================
    -- Categories
    -- ==========================================

    INSERT INTO categories (id, parent_id, name, slug, description, sort_order, is_active) VALUES
    -- Main categories
    (cat_fashion, NULL, '패션', 'fashion', '의류, 신발, 액세서리', 1, true),
    (cat_beauty, NULL, '뷰티', 'beauty', '화장품, 스킨케어', 2, true),
    (cat_lifestyle, NULL, '라이프스타일', 'lifestyle', '홈데코, 키친용품', 3, true),
    (cat_electronics, NULL, '전자기기', 'electronics', '스마트폰, 가전제품', 4, true),
    (cat_sports, NULL, '스포츠', 'sports', '운동용품, 헬스', 5, true),

    -- Subcategories
    (cat_womens, cat_fashion, '여성의류', 'womens-clothing', '드레스, 블라우스', 1, true),
    (cat_mens, cat_fashion, '남성의류', 'mens-clothing', '셔츠, 바지', 2, true),
    (cat_skincare, cat_beauty, '스킨케어', 'skincare', '세럼, 크림', 1, true),
    (cat_makeup, cat_beauty, '메이크업', 'makeup', '파운데이션, 립스틱', 2, true),
    (cat_kitchen, cat_lifestyle, '키친용품', 'kitchen', '팬, 조리도구', 1, true);

    -- ==========================================
    -- Demo Seller Profile (minimal for products)
    -- ==========================================

    INSERT INTO profiles (id, email, name, nickname, role, status, business_name) VALUES
    (demo_seller, 'demo@example.com', 'Demo Store', 'demo', 'seller', 'active', 'Demo Store');

    -- ==========================================
    -- Products (10 items)
    -- ==========================================

    INSERT INTO products (id, seller_id, category_id, title, slug, description, short_description, price, compare_price, sku, stock_quantity, status, is_featured, thumbnail_url, images, min_order_quantity, view_count, like_count, review_count, review_rating, sales_count) VALUES

    -- Fashion Products (4)
    (prod_1, demo_seller, cat_womens,
     '겨울 니트 원피스', 'winter-knit-dress',
     '따뜻하고 부드러운 겨울 니트 원피스', '겨울 원피스',
     89000, 129000, 'DRESS001', 50, 'active', true,
     'https://picsum.photos/400/400?random=1',
     '["https://picsum.photos/400/400?random=1"]',
     1, 120, 15, 8, 4.5, 25),

    (prod_2, demo_seller, cat_mens,
     '남성 캐주얼 셔츠', 'mens-casual-shirt',
     '편안한 착용감의 캐주얼 셔츠', '캐주얼 셔츠',
     45000, 65000, 'SHIRT001', 30, 'active', false,
     'https://picsum.photos/400/400?random=2',
     '["https://picsum.photos/400/400?random=2"]',
     1, 80, 8, 5, 4.2, 12),

    (prod_3, demo_seller, cat_fashion,
     '레더 핸드백', 'leather-handbag',
     '고급 가죽으로 제작된 핸드백', '레더 핸드백',
     180000, 250000, 'BAG001', 20, 'active', true,
     'https://picsum.photos/400/400?random=3',
     '["https://picsum.photos/400/400?random=3"]',
     1, 95, 18, 12, 4.7, 8),

    (prod_4, demo_seller, cat_fashion,
     '운동화', 'sneakers',
     '편안한 일상 운동화', '데일리 운동화',
     120000, 160000, 'SHOES001', 40, 'active', false,
     'https://picsum.photos/400/400?random=4',
     '["https://picsum.photos/400/400?random=4"]',
     1, 150, 22, 18, 4.4, 35),

    -- Beauty Products (3)
    (prod_5, demo_seller, cat_skincare,
     '비타민C 세럼', 'vitamin-c-serum',
     '브라이트닝 효과의 비타민C 세럼', '비타민C 세럼',
     35000, 50000, 'SERUM001', 100, 'active', true,
     'https://picsum.photos/400/400?random=5',
     '["https://picsum.photos/400/400?random=5"]',
     1, 200, 45, 32, 4.6, 89),

    (prod_6, demo_seller, cat_makeup,
     '쿠션 파운데이션', 'cushion-foundation',
     '24시간 지속되는 쿠션 파운데이션', '쿠션 파운데이션',
     28000, 35000, 'FOUNDATION001', 60, 'active', false,
     'https://picsum.photos/400/400?random=6',
     '["https://picsum.photos/400/400?random=6"]',
     1, 160, 25, 20, 4.3, 45),

    (prod_7, demo_seller, cat_beauty,
     '립스틱 세트', 'lipstick-set',
     '다양한 컬러의 립스틱 3종 세트', '립스틱 세트',
     42000, 60000, 'LIP001', 80, 'active', true,
     'https://picsum.photos/400/400?random=7',
     '["https://picsum.photos/400/400?random=7"]',
     1, 110, 30, 15, 4.4, 28),

    -- Lifestyle Products (2)
    (prod_8, demo_seller, cat_kitchen,
     '프리미엄 팬 세트', 'premium-pan-set',
     '독일 기술의 논스틱 팬 3종 세트', '팬 세트',
     125000, 180000, 'PAN001', 25, 'active', true,
     'https://picsum.photos/400/400?random=8',
     '["https://picsum.photos/400/400?random=8"]',
     1, 75, 12, 8, 4.5, 15),

    (prod_9, demo_seller, cat_lifestyle,
     '아로마 디퓨저', 'aroma-diffuser',
     '인테리어 소품 겸용 아로마 디퓨저', '아로마 디퓨저',
     68000, 85000, 'DIFFUSER001', 35, 'active', false,
     'https://picsum.photos/400/400?random=9',
     '["https://picsum.photos/400/400?random=9"]',
     1, 90, 20, 10, 4.2, 22),

    -- Electronics Product (1)
    (prod_10, demo_seller, cat_electronics,
     '무선 이어폰', 'wireless-earbuds',
     '노이즈 캔슬링 무선 이어폰', '무선 이어폰',
     150000, 200000, 'EARBUDS001', 50, 'active', true,
     'https://picsum.photos/400/400?random=10',
     '["https://picsum.photos/400/400?random=10"]',
     1, 180, 35, 25, 4.5, 42);

    -- ==========================================
    -- Broadcasts (3 total)
    -- ==========================================

    INSERT INTO broadcasts (id, broadcaster_id, title, description, scheduled_at, started_at, status, stream_key, chat_enabled, reactions_enabled, max_viewers, current_viewers, total_views, tags) VALUES

    -- 1 Live broadcast (현재 진행중)
    (broadcast_live, demo_seller,
     '🔥 겨울 패션 특가 라이브 🔥',
     '겨울 신상품 최대 50% 할인! 원피스, 핸드백, 운동화까지!',
     NOW() - INTERVAL '1 hour', NOW() - INTERVAL '45 minutes', 'live',
     'stream_key_001', true, true, 1200, 850, 2500,
     '["fashion", "winter", "sale", "discount"]'),

    -- 2 Scheduled broadcasts (예정)
    (broadcast_scheduled_1, demo_seller,
     '✨ 뷰티 신제품 런칭 ✨',
     '새로 출시되는 스킨케어 제품들을 가장 먼저 만나보세요!',
     NOW() + INTERVAL '3 hours', NULL, 'scheduled',
     'stream_key_002', true, true, 0, 0, 0,
     '["beauty", "skincare", "new", "launch"]'),

    (broadcast_scheduled_2, demo_seller,
     '🏠 홈 리빙 쇼핑 가이드 🏠',
     '집을 더 아늑하게 만들어줄 라이프스타일 제품들을 소개합니다',
     NOW() + INTERVAL '1 day', NULL, 'scheduled',
     'stream_key_003', true, true, 0, 0, 0,
     '["lifestyle", "home", "living", "interior"]');

    -- ==========================================
    -- Broadcast Products (방송-상품 연결)
    -- ==========================================

    INSERT INTO broadcast_products (id, broadcast_id, product_id, display_order, is_featured, live_price, discount_percentage, promotion_text, limited_quantity, sold_quantity) VALUES

    -- Live broadcast products (패션 라이브)
    (gen_random_uuid(), broadcast_live, prod_1, 1, true, 79000, 38.8, '라이브 한정 특가!', 30, 18),
    (gen_random_uuid(), broadcast_live, prod_3, 2, true, 150000, 40.0, '오늘만 이 가격!', 15, 6),
    (gen_random_uuid(), broadcast_live, prod_4, 3, false, 99000, 37.5, '추가 할인!', 25, 12),

    -- Scheduled broadcast 1 products (뷰티 런칭)
    (gen_random_uuid(), broadcast_scheduled_1, prod_5, 1, true, 29000, 42.0, '런칭 기념가!', 50, 0),
    (gen_random_uuid(), broadcast_scheduled_1, prod_6, 2, true, 23000, 34.3, '세트 할인!', 40, 0),
    (gen_random_uuid(), broadcast_scheduled_1, prod_7, 3, false, 35000, 41.7, '선착순 할인!', 30, 0),

    -- Scheduled broadcast 2 products (라이프스타일)
    (gen_random_uuid(), broadcast_scheduled_2, prod_8, 1, true, 110000, 38.9, '방송 특가!', 20, 0),
    (gen_random_uuid(), broadcast_scheduled_2, prod_9, 2, false, 58000, 31.8, '리빙 특가!', 25, 0);

    -- Update stats
    UPDATE products SET
        review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = products.id AND NOT is_hidden),
        review_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = products.id AND NOT is_hidden);

    UPDATE broadcasts SET
        current_viewers = CASE
            WHEN status = 'live' THEN 850
            ELSE 0
        END;

END $$;

COMMIT;