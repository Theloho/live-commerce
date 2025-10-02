-- =============================================
-- 완전한 카테고리 체계 마이그레이션 (2단계)
-- 남성/여성/아동/생활용품 전체 포괄
-- 실행일: 2025-10-02
-- =============================================

-- 기존 카테고리만 삭제 (상품 데이터 보존)
DELETE FROM categories;

-- =============================================
-- 1. 남성 패션
-- =============================================
INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
  ('남성패션', 'men-fashion', NULL, '남성 의류 및 패션 아이템', true);

INSERT INTO categories (name, slug, parent_id, description, is_active)
SELECT '아우터', 'men-outer', id, '재킷, 점퍼, 코트 등', true FROM categories WHERE slug='men-fashion'
UNION ALL
SELECT '상의', 'men-tops', id, '티셔츠, 셔츠, 니트 등', true FROM categories WHERE slug='men-fashion'
UNION ALL
SELECT '바지', 'men-pants', id, '청바지, 면바지, 슬랙스 등', true FROM categories WHERE slug='men-fashion'
UNION ALL
SELECT '신발', 'men-shoes', id, '운동화, 구두, 샌들 등', true FROM categories WHERE slug='men-fashion'
UNION ALL
SELECT '가방', 'men-bags', id, '백팩, 크로스백, 토트백 등', true FROM categories WHERE slug='men-fashion'
UNION ALL
SELECT '액세서리', 'men-accessories', id, '모자, 벨트, 지갑 등', true FROM categories WHERE slug='men-fashion';

-- =============================================
-- 2. 여성 패션
-- =============================================
INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
  ('여성패션', 'women-fashion', NULL, '여성 의류 및 패션 아이템', true);

INSERT INTO categories (name, slug, parent_id, description, is_active)
SELECT '아우터', 'women-outer', id, '재킷, 코트, 가디건 등', true FROM categories WHERE slug='women-fashion'
UNION ALL
SELECT '상의', 'women-tops', id, '블라우스, 티셔츠, 니트 등', true FROM categories WHERE slug='women-fashion'
UNION ALL
SELECT '바지', 'women-pants', id, '청바지, 슬랙스, 레깅스 등', true FROM categories WHERE slug='women-fashion'
UNION ALL
SELECT '스커트/원피스', 'women-skirts-dresses', id, '스커트, 원피스, 드레스', true FROM categories WHERE slug='women-fashion'
UNION ALL
SELECT '신발', 'women-shoes', id, '힐, 플랫, 운동화, 부츠 등', true FROM categories WHERE slug='women-fashion'
UNION ALL
SELECT '가방', 'women-bags', id, '숄더백, 크로스백, 클러치 등', true FROM categories WHERE slug='women-fashion'
UNION ALL
SELECT '액세서리', 'women-accessories', id, '귀걸이, 목걸이, 팔찌 등', true FROM categories WHERE slug='women-fashion'
UNION ALL
SELECT '언더웨어', 'women-underwear', id, '속옷, 란제리, 홈웨어', true FROM categories WHERE slug='women-fashion';

-- =============================================
-- 3. 아동 패션
-- =============================================
INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
  ('아동패션', 'kids-fashion', NULL, '아동 의류 및 용품', true);

INSERT INTO categories (name, slug, parent_id, description, is_active)
SELECT '아동의류', 'kids-clothing', id, '상의, 하의, 아우터', true FROM categories WHERE slug='kids-fashion'
UNION ALL
SELECT '아동신발', 'kids-shoes', id, '운동화, 샌들, 부츠 등', true FROM categories WHERE slug='kids-fashion'
UNION ALL
SELECT '아동가방', 'kids-bags', id, '책가방, 백팩, 크로스백', true FROM categories WHERE slug='kids-fashion'
UNION ALL
SELECT '아동액세서리', 'kids-accessories', id, '모자, 양말, 헤어핀 등', true FROM categories WHERE slug='kids-fashion';

-- =============================================
-- 4. 유아/출산
-- =============================================
INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
  ('유아/출산', 'baby', NULL, '유아 및 출산 용품', true);

INSERT INTO categories (name, slug, parent_id, description, is_active)
SELECT '기저귀/물티슈', 'baby-diapers', id, '기저귀, 물티슈', true FROM categories WHERE slug='baby'
UNION ALL
SELECT '분유/이유식', 'baby-food', id, '분유, 이유식, 간식', true FROM categories WHERE slug='baby'
UNION ALL
SELECT '수유용품', 'baby-feeding', id, '젖병, 수유쿠션, 유축기', true FROM categories WHERE slug='baby'
UNION ALL
SELECT '유아의류', 'baby-clothing', id, '배냇저고리, 우주복, 바디슈트', true FROM categories WHERE slug='baby'
UNION ALL
SELECT '목욕/스킨케어', 'baby-bath', id, '욕조, 샴푸, 로션', true FROM categories WHERE slug='baby'
UNION ALL
SELECT '외출용품', 'baby-outdoor', id, '유모차, 카시트, 아기띠', true FROM categories WHERE slug='baby';

-- =============================================
-- 5. 뷰티
-- =============================================
INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
  ('뷰티', 'beauty', NULL, '화장품 및 미용 용품', true);

INSERT INTO categories (name, slug, parent_id, description, is_active)
SELECT '스킨케어', 'skincare', id, '토너, 로션, 크림 등', true FROM categories WHERE slug='beauty'
UNION ALL
SELECT '메이크업', 'makeup', id, '립스틱, 아이섀도우, 파운데이션', true FROM categories WHERE slug='beauty'
UNION ALL
SELECT '헤어케어', 'haircare', id, '샴푸, 트리트먼트, 스타일링', true FROM categories WHERE slug='beauty'
UNION ALL
SELECT '바디케어', 'bodycare', id, '바디로션, 핸드크림, 향수', true FROM categories WHERE slug='beauty'
UNION ALL
SELECT '남성뷰티', 'men-beauty', id, '남성 스킨케어, 쉐이빙', true FROM categories WHERE slug='beauty'
UNION ALL
SELECT '뷰티툴', 'beauty-tools', id, '브러쉬, 퍼프, 거울 등', true FROM categories WHERE slug='beauty';

-- =============================================
-- 6. 식품
-- =============================================
INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
  ('식품', 'food', NULL, '신선식품 및 가공식품', true);

INSERT INTO categories (name, slug, parent_id, description, is_active)
SELECT '과일', 'fruits', id, '사과, 배, 딸기 등', true FROM categories WHERE slug='food'
UNION ALL
SELECT '채소', 'vegetables', id, '상추, 배추, 무 등', true FROM categories WHERE slug='food'
UNION ALL
SELECT '정육/계란', 'meat-eggs', id, '소고기, 돼지고기, 닭고기, 계란', true FROM categories WHERE slug='food'
UNION ALL
SELECT '수산물', 'seafood', id, '생선, 조개, 해산물', true FROM categories WHERE slug='food'
UNION ALL
SELECT '간편식/냉동', 'instant-frozen', id, '즉석밥, 냉동식품, 레토르트', true FROM categories WHERE slug='food'
UNION ALL
SELECT '과자/간식', 'snacks', id, '과자, 초콜릿, 젤리', true FROM categories WHERE slug='food'
UNION ALL
SELECT '음료', 'beverages', id, '생수, 탄산, 주스, 커피', true FROM categories WHERE slug='food'
UNION ALL
SELECT '건강식품', 'health-food', id, '영양제, 비타민, 건강보조식품', true FROM categories WHERE slug='food';

-- =============================================
-- 7. 생활용품
-- =============================================
INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
  ('생활용품', 'living', NULL, '주방 및 생활 용품', true);

INSERT INTO categories (name, slug, parent_id, description, is_active)
SELECT '주방용품', 'kitchen', id, '냄비, 프라이팬, 식기', true FROM categories WHERE slug='living'
UNION ALL
SELECT '욕실용품', 'bathroom', id, '수건, 샴푸, 비누', true FROM categories WHERE slug='living'
UNION ALL
SELECT '청소용품', 'cleaning', id, '세제, 청소도구, 쓰레기봉투', true FROM categories WHERE slug='living'
UNION ALL
SELECT '세탁용품', 'laundry', id, '세제, 섬유유연제, 빨래건조대', true FROM categories WHERE slug='living'
UNION ALL
SELECT '생활잡화', 'household', id, '휴지, 물티슈, 일회용품', true FROM categories WHERE slug='living'
UNION ALL
SELECT '수납/정리', 'storage', id, '수납함, 옷걸이, 정리용품', true FROM categories WHERE slug='living';

-- =============================================
-- 8. 홈인테리어
-- =============================================
INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
  ('홈인테리어', 'interior', NULL, '가구 및 인테리어 소품', true);

INSERT INTO categories (name, slug, parent_id, description, is_active)
SELECT '가구', 'furniture', id, '침대, 소파, 책상, 의자', true FROM categories WHERE slug='interior'
UNION ALL
SELECT '침구', 'bedding', id, '이불, 베개, 침대커버', true FROM categories WHERE slug='interior'
UNION ALL
SELECT '커튼/블라인드', 'curtains', id, '커튼, 블라인드, 롤스크린', true FROM categories WHERE slug='interior'
UNION ALL
SELECT '조명', 'lighting', id, '스탠드, 무드등, LED등', true FROM categories WHERE slug='interior'
UNION ALL
SELECT '인테리어소품', 'deco', id, '액자, 시계, 방향제', true FROM categories WHERE slug='interior'
UNION ALL
SELECT '러그/카펫', 'rugs', id, '러그, 카펫, 매트', true FROM categories WHERE slug='interior';

-- =============================================
-- 9. 가전/디지털
-- =============================================
INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
  ('가전/디지털', 'electronics', NULL, '가전제품 및 디지털 기기', true);

INSERT INTO categories (name, slug, parent_id, description, is_active)
SELECT '생활가전', 'appliances', id, '청소기, 공기청정기, 선풍기', true FROM categories WHERE slug='electronics'
UNION ALL
SELECT '주방가전', 'kitchen-appliances', id, '전자레인지, 에어프라이어, 믹서기', true FROM categories WHERE slug='electronics'
UNION ALL
SELECT 'PC/노트북', 'computers', id, '데스크탑, 노트북, 모니터', true FROM categories WHERE slug='electronics'
UNION ALL
SELECT '모바일/태블릿', 'mobile', id, '스마트폰, 태블릿, 케이스', true FROM categories WHERE slug='electronics'
UNION ALL
SELECT '카메라', 'cameras', id, 'DSLR, 미러리스, 액션캠', true FROM categories WHERE slug='electronics'
UNION ALL
SELECT '음향기기', 'audio', id, '이어폰, 스피커, 헤드폰', true FROM categories WHERE slug='electronics';

-- =============================================
-- 10. 스포츠/레저
-- =============================================
INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
  ('스포츠/레저', 'sports', NULL, '운동 및 레저 용품', true);

INSERT INTO categories (name, slug, parent_id, description, is_active)
SELECT '운동복', 'sportswear', id, '운동복, 요가복, 레깅스', true FROM categories WHERE slug='sports'
UNION ALL
SELECT '운동화', 'sports-shoes', id, '러닝화, 축구화, 농구화', true FROM categories WHERE slug='sports'
UNION ALL
SELECT '헬스/요가', 'fitness', id, '요가매트, 덤벨, 밴드', true FROM categories WHERE slug='sports'
UNION ALL
SELECT '수영/수상레저', 'swimming', id, '수영복, 수경, 튜브', true FROM categories WHERE slug='sports'
UNION ALL
SELECT '자전거/킥보드', 'cycling', id, '자전거, 킥보드, 헬멧', true FROM categories WHERE slug='sports'
UNION ALL
SELECT '캠핑/등산', 'camping', id, '텐트, 침낭, 등산화', true FROM categories WHERE slug='sports'
UNION ALL
SELECT '구기/라켓', 'ball-sports', id, '축구공, 농구공, 배드민턴', true FROM categories WHERE slug='sports';

-- =============================================
-- 11. 완구/취미
-- =============================================
INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
  ('완구/취미', 'toys-hobbies', NULL, '장난감 및 취미 용품', true);

INSERT INTO categories (name, slug, parent_id, description, is_active)
SELECT '블록/레고', 'blocks', id, '레고, 블록, 조립완구', true FROM categories WHERE slug='toys-hobbies'
UNION ALL
SELECT '인형/피규어', 'dolls', id, '인형, 피규어, 캐릭터', true FROM categories WHERE slug='toys-hobbies'
UNION ALL
SELECT '보드게임/퍼즐', 'board-games', id, '보드게임, 퍼즐, 카드게임', true FROM categories WHERE slug='toys-hobbies'
UNION ALL
SELECT '미술/공예', 'art-craft', id, '크레파스, 점토, 만들기', true FROM categories WHERE slug='toys-hobbies'
UNION ALL
SELECT '악기', 'instruments', id, '키보드, 기타, 우쿨렐레', true FROM categories WHERE slug='toys-hobbies'
UNION ALL
SELECT '교구/학습', 'educational', id, '학습교구, 전자사전, 지구본', true FROM categories WHERE slug='toys-hobbies';

-- =============================================
-- 12. 반려동물
-- =============================================
INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
  ('반려동물', 'pets', NULL, '반려동물 용품', true);

INSERT INTO categories (name, slug, parent_id, description, is_active)
SELECT '강아지용품', 'dog', id, '강아지 사료, 간식, 용품', true FROM categories WHERE slug='pets'
UNION ALL
SELECT '고양이용품', 'cat', id, '고양이 사료, 모래, 장난감', true FROM categories WHERE slug='pets'
UNION ALL
SELECT '목욕/미용', 'pet-grooming', id, '샴푸, 빗, 미용용품', true FROM categories WHERE slug='pets'
UNION ALL
SELECT '의류/액세서리', 'pet-fashion', id, '애견의류, 목줄, 이름표', true FROM categories WHERE slug='pets'
UNION ALL
SELECT '하우스/이동장', 'pet-house', id, '집, 방석, 이동가방', true FROM categories WHERE slug='pets';

-- =============================================
-- 13. 도서/문구
-- =============================================
INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
  ('도서/문구', 'books-stationery', NULL, '책 및 문구류', true);

INSERT INTO categories (name, slug, parent_id, description, is_active)
SELECT '도서', 'books', id, '소설, 자기계발, 에세이', true FROM categories WHERE slug='books-stationery'
UNION ALL
SELECT '잡지/만화', 'magazines', id, '잡지, 만화책, 라이트노벨', true FROM categories WHERE slug='books-stationery'
UNION ALL
SELECT '문구', 'stationery', id, '필기구, 노트, 다이어리', true FROM categories WHERE slug='books-stationery'
UNION ALL
SELECT '오피스용품', 'office', id, '파일, 클립, 스테이플러', true FROM categories WHERE slug='books-stationery'
UNION ALL
SELECT '화방용품', 'art-supplies', id, '물감, 붓, 스케치북', true FROM categories WHERE slug='books-stationery';

-- =============================================
-- 14. 자동차/공구
-- =============================================
INSERT INTO categories (name, slug, parent_id, description, is_active) VALUES
  ('자동차/공구', 'car-tools', NULL, '자동차 용품 및 공구', true);

INSERT INTO categories (name, slug, parent_id, description, is_active)
SELECT '자동차용품', 'car-accessories', id, '방향제, 핸드폰거치대, 선루프', true FROM categories WHERE slug='car-tools'
UNION ALL
SELECT '세차/관리', 'car-care', id, '세차용품, 왁스, 광택제', true FROM categories WHERE slug='car-tools'
UNION ALL
SELECT '블랙박스/네비', 'car-electronics', id, '블랙박스, 내비게이션, HUD', true FROM categories WHERE slug='car-tools'
UNION ALL
SELECT '공구', 'tools', id, '드라이버, 렌치, 전동공구', true FROM categories WHERE slug='car-tools'
UNION ALL
SELECT '안전용품', 'safety', id, '소화기, 구급함, 삼각대', true FROM categories WHERE slug='car-tools';

-- =============================================
-- 인덱스 생성
-- =============================================
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- =============================================
-- 통계 출력
-- =============================================
DO $$
DECLARE
  main_count INT;
  sub_count INT;
BEGIN
  SELECT COUNT(*) INTO main_count FROM categories WHERE parent_id IS NULL;
  SELECT COUNT(*) INTO sub_count FROM categories WHERE parent_id IS NOT NULL;

  RAISE NOTICE '✅ 완전한 카테고리 체계 생성 완료';
  RAISE NOTICE '📊 대분류: %개, 소분류: %개, 총 %개', main_count, sub_count, (main_count + sub_count);
END $$;
