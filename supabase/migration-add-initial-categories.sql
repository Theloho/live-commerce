-- =============================================
-- 카테고리 초기 데이터 마이그레이션
-- 실행일: 2025-10-02
-- =============================================

-- 1. is_active 컬럼 추가 (없으면)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ is_active 컬럼 추가 완료';
  ELSE
    RAISE NOTICE 'ℹ️ is_active 컬럼 이미 존재';
  END IF;
END $$;

-- 2. 기존 데이터 확인 (있으면 스킵)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categories LIMIT 1) THEN

    -- 대분류 카테고리 삽입
    INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
      ('아동화', 'kids-shoes', NULL, '유아 및 아동용 신발', true),
      ('성인화', 'adult-shoes', NULL, '성인용 신발', true),
      ('의류', 'clothing', NULL, '상의, 하의, 아우터 등', true),
      ('액세서리', 'accessories', NULL, '모자, 가방, 양말 등 소품', true),
      ('유아용품', 'baby-products', NULL, '유아 및 영아용 제품', true),
      ('가방/잡화', 'bags', NULL, '가방, 지갑, 파우치 등', true),
      ('스포츠용품', 'sports', NULL, '운동용품 및 스포츠 장비', true),
      ('완구/취미', 'toys', NULL, '장난감, 교구, 취미용품', true);

    -- 아동화 서브 카테고리
    INSERT INTO categories (name, slug, parent_id, description, is_active)
    SELECT '운동화', 'kids-sneakers', id, '아동 운동화', true FROM categories WHERE slug='kids-shoes'
    UNION ALL
    SELECT '구두', 'kids-dress-shoes', id, '아동 구두', true FROM categories WHERE slug='kids-shoes'
    UNION ALL
    SELECT '샌들', 'kids-sandals', id, '아동 샌들', true FROM categories WHERE slug='kids-shoes'
    UNION ALL
    SELECT '슬리퍼', 'kids-slippers', id, '아동 슬리퍼', true FROM categories WHERE slug='kids-shoes'
    UNION ALL
    SELECT '부츠', 'kids-boots', id, '아동 부츠', true FROM categories WHERE slug='kids-shoes'
    UNION ALL
    SELECT '실내화', 'kids-indoor', id, '아동 실내화', true FROM categories WHERE slug='kids-shoes';

    -- 성인화 서브 카테고리
    INSERT INTO categories (name, slug, parent_id, description, is_active)
    SELECT '운동화', 'adult-sneakers', id, '성인 운동화', true FROM categories WHERE slug='adult-shoes'
    UNION ALL
    SELECT '구두', 'adult-dress-shoes', id, '성인 구두', true FROM categories WHERE slug='adult-shoes'
    UNION ALL
    SELECT '샌들', 'adult-sandals', id, '성인 샌들', true FROM categories WHERE slug='adult-shoes'
    UNION ALL
    SELECT '슬리퍼', 'adult-slippers', id, '성인 슬리퍼', true FROM categories WHERE slug='adult-shoes'
    UNION ALL
    SELECT '부츠', 'adult-boots', id, '성인 부츠', true FROM categories WHERE slug='adult-shoes'
    UNION ALL
    SELECT '하이힐', 'adult-heels', id, '하이힐', true FROM categories WHERE slug='adult-shoes';

    -- 의류 서브 카테고리
    INSERT INTO categories (name, slug, parent_id, description, is_active)
    SELECT '상의', 'tops', id, '티셔츠, 셔츠, 블라우스 등', true FROM categories WHERE slug='clothing'
    UNION ALL
    SELECT '하의', 'bottoms', id, '바지, 치마, 반바지 등', true FROM categories WHERE slug='clothing'
    UNION ALL
    SELECT '아우터', 'outerwear', id, '재킷, 점퍼, 코트 등', true FROM categories WHERE slug='clothing'
    UNION ALL
    SELECT '원피스', 'dresses', id, '원피스, 드레스', true FROM categories WHERE slug='clothing'
    UNION ALL
    SELECT '속옷', 'underwear', id, '내의, 속옷', true FROM categories WHERE slug='clothing'
    UNION ALL
    SELECT '잠옷', 'sleepwear', id, '파자마, 잠옷', true FROM categories WHERE slug='clothing';

    -- 액세서리 서브 카테고리
    INSERT INTO categories (name, slug, parent_id, description, is_active)
    SELECT '모자', 'hats', id, '모자, 캡, 비니 등', true FROM categories WHERE slug='accessories'
    UNION ALL
    SELECT '양말', 'socks', id, '양말, 스타킹', true FROM categories WHERE slug='accessories'
    UNION ALL
    SELECT '벨트', 'belts', id, '벨트', true FROM categories WHERE slug='accessories'
    UNION ALL
    SELECT '스카프', 'scarves', id, '스카프, 목도리', true FROM categories WHERE slug='accessories'
    UNION ALL
    SELECT '장갑', 'gloves', id, '장갑', true FROM categories WHERE slug='accessories'
    UNION ALL
    SELECT '헤어액세서리', 'hair-accessories', id, '머리핀, 머리띠 등', true FROM categories WHERE slug='accessories';

    -- 유아용품 서브 카테고리
    INSERT INTO categories (name, slug, parent_id, description, is_active)
    SELECT '기저귀/물티슈', 'diapers', id, '기저귀, 물티슈', true FROM categories WHERE slug='baby-products'
    UNION ALL
    SELECT '수유용품', 'feeding', id, '젖병, 이유식 용기 등', true FROM categories WHERE slug='baby-products'
    UNION ALL
    SELECT '유아의류', 'baby-clothing', id, '유아복', true FROM categories WHERE slug='baby-products'
    UNION ALL
    SELECT '유아신발', 'baby-shoes', id, '유아용 신발', true FROM categories WHERE slug='baby-products'
    UNION ALL
    SELECT '목욕용품', 'bath', id, '욕조, 샴푸 등', true FROM categories WHERE slug='baby-products';

    -- 가방/잡화 서브 카테고리
    INSERT INTO categories (name, slug, parent_id, description, is_active)
    SELECT '백팩', 'backpacks', id, '백팩, 책가방', true FROM categories WHERE slug='bags'
    UNION ALL
    SELECT '숄더백', 'shoulder-bags', id, '숄더백, 크로스백', true FROM categories WHERE slug='bags'
    UNION ALL
    SELECT '토트백', 'tote-bags', id, '토트백', true FROM categories WHERE slug='bags'
    UNION ALL
    SELECT '지갑', 'wallets', id, '지갑', true FROM categories WHERE slug='bags'
    UNION ALL
    SELECT '파우치', 'pouches', id, '파우치, 필통', true FROM categories WHERE slug='bags';

    -- 스포츠용품 서브 카테고리
    INSERT INTO categories (name, slug, parent_id, description, is_active)
    SELECT '축구용품', 'soccer', id, '축구공, 축구화 등', true FROM categories WHERE slug='sports'
    UNION ALL
    SELECT '농구용품', 'basketball', id, '농구공, 농구화 등', true FROM categories WHERE slug='sports'
    UNION ALL
    SELECT '야구용품', 'baseball', id, '야구공, 배트, 글러브 등', true FROM categories WHERE slug='sports'
    UNION ALL
    SELECT '수영용품', 'swimming', id, '수영복, 수경, 튜브 등', true FROM categories WHERE slug='sports'
    UNION ALL
    SELECT '자전거용품', 'cycling', id, '자전거, 헬멧 등', true FROM categories WHERE slug='sports';

    -- 완구/취미 서브 카테고리
    INSERT INTO categories (name, slug, parent_id, description, is_active)
    SELECT '블록/레고', 'blocks', id, '블록, 레고 등', true FROM categories WHERE slug='toys'
    UNION ALL
    SELECT '인형/피규어', 'dolls', id, '인형, 피규어', true FROM categories WHERE slug='toys'
    UNION ALL
    SELECT '보드게임', 'board-games', id, '보드게임, 퍼즐', true FROM categories WHERE slug='toys'
    UNION ALL
    SELECT '미술용품', 'art-supplies', id, '크레파스, 물감 등', true FROM categories WHERE slug='toys'
    UNION ALL
    SELECT '악기', 'instruments', id, '키보드, 기타 등', true FROM categories WHERE slug='toys';

    RAISE NOTICE '✅ 카테고리 초기 데이터 삽입 완료 (8개 대분류, 다수 소분류)';
  ELSE
    RAISE NOTICE '⚠️ 카테고리 데이터가 이미 존재합니다. 스킵합니다.';
  END IF;
END $$;

-- 인덱스 확인 및 생성
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- 통계 출력
DO $$
DECLARE
  main_count INT;
  sub_count INT;
BEGIN
  SELECT COUNT(*) INTO main_count FROM categories WHERE parent_id IS NULL;
  SELECT COUNT(*) INTO sub_count FROM categories WHERE parent_id IS NOT NULL;

  RAISE NOTICE '📊 카테고리 통계: 대분류 %개, 소분류 %개, 총 %개', main_count, sub_count, (main_count + sub_count);
END $$;
