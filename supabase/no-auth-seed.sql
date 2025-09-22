-- ==========================================
-- Live Commerce Test Data (No Auth Dependencies)
-- ==========================================

-- 기존 데이터 삭제 (조심스럽게!)
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

-- Auth 의존성을 제거하고 profiles 테이블 임시 수정
-- 기존 profiles 테이블 백업 후 새로 생성
DROP TABLE IF EXISTS profiles_backup;
CREATE TABLE profiles_backup AS SELECT * FROM profiles;

-- 외래키 제약조건 제거된 임시 profiles 테이블 생성
DROP TABLE IF EXISTS profiles CASCADE;
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  nickname VARCHAR(50) UNIQUE,
  phone VARCHAR(20),
  birth_date DATE,
  gender VARCHAR(10),
  role VARCHAR(20) DEFAULT 'customer',
  status VARCHAR(20) DEFAULT 'active',

  -- Profile details
  avatar_url TEXT,
  bio TEXT,
  website VARCHAR(255),

  -- Business info (for sellers)
  business_name VARCHAR(255),
  business_number VARCHAR(50),
  business_address TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- UUID 생성
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

    -- Demo seller
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
    -- 카테고리
    -- ==========================================

    INSERT INTO categories (id, parent_id, name, slug, description, sort_order, is_active) VALUES
    -- 메인 카테고리
    (cat_fashion, NULL, '패션', 'fashion', '의류, 신발, 액세서리', 1, true),
    (cat_beauty, NULL, '뷰티', 'beauty', '화장품, 스킨케어', 2, true),
    (cat_lifestyle, NULL, '라이프스타일', 'lifestyle', '홈데코, 키친용품', 3, true),
    (cat_electronics, NULL, '전자기기', 'electronics', '스마트폰, 가전제품', 4, true),
    (cat_sports, NULL, '스포츠', 'sports', '운동용품, 헬스', 5, true),

    -- 서브카테고리
    (cat_womens, cat_fashion, '여성의류', 'womens-clothing', '드레스, 블라우스', 1, true),
    (cat_mens, cat_fashion, '남성의류', 'mens-clothing', '셔츠, 바지', 2, true),
    (cat_skincare, cat_beauty, '스킨케어', 'skincare', '세럼, 크림', 1, true),
    (cat_makeup, cat_beauty, '메이크업', 'makeup', '파운데이션, 립스틱', 2, true),
    (cat_kitchen, cat_lifestyle, '키친용품', 'kitchen', '팬, 조리도구', 1, true);

    -- ==========================================
    -- 데모 판매자 프로필
    -- ==========================================

    INSERT INTO profiles (id, email, name, nickname, role, status, business_name) VALUES
    (demo_seller, 'demo@example.com', '데모 스토어', 'demo', 'seller', 'active', '데모 스토어');

    -- ==========================================
    -- 상품 (10개)
    -- ==========================================

    INSERT INTO products (id, seller_id, category_id, title, slug, description, short_description, price, compare_price, sku, stock_quantity, status, is_featured, thumbnail_url, images, min_order_quantity, view_count, like_count, review_count, review_rating, sales_count) VALUES

    -- 패션 상품 (4개)
    (prod_1, demo_seller, cat_womens,
     '겨울 니트 원피스', 'winter-knit-dress',
     '따뜻하고 부드러운 겨울 니트 원피스입니다. 세련된 디자인으로 데일리룩에 완벽해요.', '겨울 원피스',
     89000, 129000, 'DRESS001', 50, 'active', true,
     'https://picsum.photos/400/400?random=1',
     '["https://picsum.photos/400/400?random=1"]',
     1, 120, 15, 8, 4.5, 25),

    (prod_2, demo_seller, cat_mens,
     '남성 캐주얼 셔츠', 'mens-casual-shirt',
     '편안한 착용감의 캐주얼 셔츠입니다. 데일리웨어로 완벽한 아이템이에요.', '캐주얼 셔츠',
     45000, 65000, 'SHIRT001', 30, 'active', false,
     'https://picsum.photos/400/400?random=2',
     '["https://picsum.photos/400/400?random=2"]',
     1, 80, 8, 5, 4.2, 12),

    (prod_3, demo_seller, cat_fashion,
     '프리미엄 레더 핸드백', 'leather-handbag',
     '고급 가죽으로 제작된 핸드백입니다. 세련된 디자인과 실용성을 겸비했어요.', '레더 핸드백',
     180000, 250000, 'BAG001', 20, 'active', true,
     'https://picsum.photos/400/400?random=3',
     '["https://picsum.photos/400/400?random=3"]',
     1, 95, 18, 12, 4.7, 8),

    (prod_4, demo_seller, cat_fashion,
     '데일리 운동화', 'daily-sneakers',
     '편안한 일상 운동화입니다. 어떤 스타일에도 잘 어울려요.', '데일리 운동화',
     120000, 160000, 'SHOES001', 40, 'active', false,
     'https://picsum.photos/400/400?random=4',
     '["https://picsum.photos/400/400?random=4"]',
     1, 150, 22, 18, 4.4, 35),

    -- 뷰티 상품 (3개)
    (prod_5, demo_seller, cat_skincare,
     '비타민C 브라이트닝 세럼', 'vitamin-c-serum',
     '브라이트닝 효과가 뛰어난 비타민C 세럼입니다. 피부 톤업과 잡티 개선에 도움을 줘요.', '비타민C 세럼',
     35000, 50000, 'SERUM001', 100, 'active', true,
     'https://picsum.photos/400/400?random=5',
     '["https://picsum.photos/400/400?random=5"]',
     1, 200, 45, 32, 4.6, 89),

    (prod_6, demo_seller, cat_makeup,
     '올데이 쿠션 파운데이션', 'cushion-foundation',
     '24시간 지속되는 쿠션 파운데이션입니다. 완벽한 커버력과 자연스러운 광채를 연출해요.', '쿠션 파운데이션',
     28000, 35000, 'FOUNDATION001', 60, 'active', false,
     'https://picsum.photos/400/400?random=6',
     '["https://picsum.photos/400/400?random=6"]',
     1, 160, 25, 20, 4.3, 45),

    (prod_7, demo_seller, cat_beauty,
     '컬러풀 립스틱 3종 세트', 'lipstick-set',
     '다양한 컬러의 립스틱 3종 세트입니다. 각기 다른 매력을 연출할 수 있어요.', '립스틱 세트',
     42000, 60000, 'LIP001', 80, 'active', true,
     'https://picsum.photos/400/400?random=7',
     '["https://picsum.photos/400/400?random=7"]',
     1, 110, 30, 15, 4.4, 28),

    -- 라이프스타일 상품 (2개)
    (prod_8, demo_seller, cat_kitchen,
     '독일 기술 프리미엄 팬 세트', 'premium-pan-set',
     '독일 기술의 논스틱 팬 3종 세트입니다. 요리가 즐거워지는 고품질 조리도구예요.', '프리미엄 팬 세트',
     125000, 180000, 'PAN001', 25, 'active', true,
     'https://picsum.photos/400/400?random=8',
     '["https://picsum.photos/400/400?random=8"]',
     1, 75, 12, 8, 4.5, 15),

    (prod_9, demo_seller, cat_lifestyle,
     '북유럽 스타일 아로마 디퓨저', 'aroma-diffuser',
     '인테리어 소품 겸용 아로마 디퓨저입니다. 공간을 더욱 향긋하고 아늑하게 만들어 줘요.', '아로마 디퓨저',
     68000, 85000, 'DIFFUSER001', 35, 'active', false,
     'https://picsum.photos/400/400?random=9',
     '["https://picsum.photos/400/400?random=9"]',
     1, 90, 20, 10, 4.2, 22),

    -- 전자기기 상품 (1개)
    (prod_10, demo_seller, cat_electronics,
     '프리미엄 노이즈 캔슬링 이어폰', 'wireless-earbuds',
     '최신 노이즈 캔슬링 기술이 적용된 무선 이어폰입니다. 완벽한 음질을 경험해 보세요.', '무선 이어폰',
     150000, 200000, 'EARBUDS001', 50, 'active', true,
     'https://picsum.photos/400/400?random=10',
     '["https://picsum.photos/400/400?random=10"]',
     1, 180, 35, 25, 4.5, 42);

    -- ==========================================
    -- 방송 (3개)
    -- ==========================================

    INSERT INTO broadcasts (id, broadcaster_id, title, description, scheduled_at, started_at, status, stream_key, chat_enabled, reactions_enabled, max_viewers, current_viewers, total_views, tags) VALUES

    -- 라이브 중인 방송
    (broadcast_live, demo_seller,
     '🔥 겨울 패션 특가 라이브 🔥',
     '겨울 신상품 최대 50% 할인! 원피스, 핸드백, 운동화까지 모든 패션 아이템을 특가로 만나보세요!',
     NOW() - INTERVAL '1 hour', NOW() - INTERVAL '45 minutes', 'live',
     'stream_key_001', true, true, 1200, 850, 2500,
     '["fashion", "winter", "sale", "discount", "live"]'),

    -- 예정된 방송들
    (broadcast_scheduled_1, demo_seller,
     '✨ 뷰티 신제품 런칭 파티 ✨',
     '새로 출시되는 스킨케어와 메이크업 제품들을 가장 먼저 만나보세요! 런칭 기념 특가도 준비했어요.',
     NOW() + INTERVAL '3 hours', NULL, 'scheduled',
     'stream_key_002', true, true, 0, 0, 0,
     '["beauty", "skincare", "makeup", "new", "launch"]'),

    (broadcast_scheduled_2, demo_seller,
     '🏠 홈 리빙 쇼핑 가이드 🏠',
     '집을 더 아늑하고 멋지게 만들어줄 라이프스타일 제품들을 소개합니다. 요리부터 인테리어까지!',
     NOW() + INTERVAL '1 day', NULL, 'scheduled',
     'stream_key_003', true, true, 0, 0, 0,
     '["lifestyle", "home", "living", "interior", "kitchen"]');

    -- ==========================================
    -- 방송-상품 연결 관계
    -- ==========================================

    INSERT INTO broadcast_products (id, broadcast_id, product_id, display_order, is_featured, live_price, discount_percentage, promotion_text, limited_quantity, sold_quantity) VALUES

    -- 라이브 방송 상품들 (패션 특가)
    (gen_random_uuid(), broadcast_live, prod_1, 1, true, 79000, 38.8, '라이브 한정 특가! 🔥', 30, 18),
    (gen_random_uuid(), broadcast_live, prod_3, 2, true, 150000, 40.0, '오늘만 이 가격! ⚡', 15, 6),
    (gen_random_uuid(), broadcast_live, prod_4, 3, false, 99000, 37.5, '추가 할인! 💥', 25, 12),

    -- 뷰티 런칭 방송 상품들
    (gen_random_uuid(), broadcast_scheduled_1, prod_5, 1, true, 29000, 42.0, '런칭 기념 특가! 🎉', 50, 0),
    (gen_random_uuid(), broadcast_scheduled_1, prod_6, 2, true, 23000, 34.3, '세트 할인 혜택! 🎁', 40, 0),
    (gen_random_uuid(), broadcast_scheduled_1, prod_7, 3, false, 35000, 41.7, '선착순 한정! ⏰', 30, 0),

    -- 라이프스타일 방송 상품들
    (gen_random_uuid(), broadcast_scheduled_2, prod_8, 1, true, 110000, 38.9, '방송 전용 특가! 🏆', 20, 0),
    (gen_random_uuid(), broadcast_scheduled_2, prod_9, 2, false, 58000, 31.8, '리빙 특가! 🏠', 25, 0);

    RAISE NOTICE '✅ 테스트 데이터 생성이 완료되었습니다!';
    RAISE NOTICE '📊 생성된 데이터:';
    RAISE NOTICE '   - 카테고리: 10개 (메인 5개 + 서브 5개)';
    RAISE NOTICE '   - 상품: 10개 (패션 4개, 뷰티 3개, 라이프스타일 2개, 전자기기 1개)';
    RAISE NOTICE '   - 방송: 3개 (라이브 1개, 예정 2개)';
    RAISE NOTICE '   - 방송-상품 관계: 8개';
    RAISE NOTICE '   - 판매자 프로필: 1개';

END $$;