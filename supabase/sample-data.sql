-- 실제 Supabase 프로젝트용 샘플 데이터

-- 1. 카테고리 데이터
INSERT INTO public.categories (id, name, slug, description, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', '전자기기', 'electronics', '스마트폰, 태블릿, 노트북 등', true),
('550e8400-e29b-41d4-a716-446655440002', '패션', 'fashion', '의류, 신발, 액세서리', true),
('550e8400-e29b-41d4-a716-446655440003', '뷰티', 'beauty', '화장품, 스킨케어, 향수', true),
('550e8400-e29b-41d4-a716-446655440004', '홈&리빙', 'home-living', '가구, 홈데코, 생활용품', true),
('550e8400-e29b-41d4-a716-446655440005', '스포츠', 'sports', '운동용품, 아웃도어, 피트니스', true)
ON CONFLICT (id) DO NOTHING;

-- 2. 더미 판매자 프로필 (실제로는 회원가입 시 생성됨)
-- 주의: 실제 auth.users와 연결되지 않은 더미 데이터이므로 인증 없이는 사용 불가

-- 3. 상품 데이터 (seller_id는 나중에 실제 사용자 ID로 업데이트 필요)
INSERT INTO public.products (
  id, title, description, price, compare_price, thumbnail_url,
  status, is_featured, badge, category_id, seller_id, inventory_quantity
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440101',
  '프리미엄 무선 이어폰',
  '고품질 사운드와 긴 배터리 수명을 자랑하는 무선 이어폰입니다. 노이즈 캔슬링 기능 탑재.',
  89000,
  129000,
  'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400&h=500&fit=crop',
  'active',
  true,
  'BEST',
  '550e8400-e29b-41d4-a716-446655440001',
  '00000000-0000-0000-0000-000000000000', -- 더미 seller_id
  50
),
(
  '550e8400-e29b-41d4-a716-446655440102',
  '스마트워치 프로',
  '건강 관리와 피트니스 트래킹이 가능한 프리미엄 스마트워치입니다.',
  299000,
  399000,
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=500&fit=crop',
  'active',
  false,
  'NEW',
  '550e8400-e29b-41d4-a716-446655440001',
  '00000000-0000-0000-0000-000000000000',
  30
),
(
  '550e8400-e29b-41d4-a716-446655440103',
  '무선 충전패드',
  'Qi 호환 무선 충전패드로 편리하게 충전하세요.',
  35000,
  NULL,
  'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=500&fit=crop',
  'active',
  false,
  NULL,
  '550e8400-e29b-41d4-a716-446655440001',
  '00000000-0000-0000-0000-000000000000',
  100
),
(
  '550e8400-e29b-41d4-a716-446655440104',
  '블루투스 스피커',
  '360도 사운드와 방수 기능을 갖춘 휴대용 블루투스 스피커입니다.',
  149000,
  199000,
  'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=500&fit=crop',
  'active',
  true,
  'HOT',
  '550e8400-e29b-41d4-a716-446655440001',
  '00000000-0000-0000-0000-000000000000',
  25
),
(
  '550e8400-e29b-41d4-a716-446655440105',
  '프리미엄 백팩',
  '비즈니스와 여행에 완벽한 멀티 기능 백팩입니다.',
  79000,
  99000,
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=500&fit=crop',
  'active',
  false,
  NULL,
  '550e8400-e29b-41d4-a716-446655440002',
  '00000000-0000-0000-0000-000000000000',
  40
),
(
  '550e8400-e29b-41d4-a716-446655440106',
  '미니멀 시계',
  '심플하고 세련된 디자인의 미니멀 손목시계입니다.',
  159000,
  NULL,
  'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=500&fit=crop',
  'active',
  false,
  'PREMIUM',
  '550e8400-e29b-41d4-a716-446655440002',
  '00000000-0000-0000-0000-000000000000',
  20
),
(
  '550e8400-e29b-41d4-a716-446655440107',
  '보습 크림 세트',
  '자연 성분으로 만든 프리미엄 보습 크림 3종 세트입니다.',
  59000,
  79000,
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=500&fit=crop',
  'active',
  false,
  NULL,
  '550e8400-e29b-41d4-a716-446655440003',
  '00000000-0000-0000-0000-000000000000',
  60
),
(
  '550e8400-e29b-41d4-a716-446655440108',
  '아로마 디퓨저',
  '집 안 분위기를 바꿔주는 스마트 아로마 디퓨저입니다.',
  89000,
  119000,
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=500&fit=crop',
  'active',
  true,
  'SALE',
  '550e8400-e29b-41d4-a716-446655440004',
  '00000000-0000-0000-0000-000000000000',
  35
)
ON CONFLICT (id) DO NOTHING;

-- 4. 라이브 방송 데이터
INSERT INTO public.broadcasts (
  id, title, description, thumbnail_url, status, viewer_count,
  started_at, host_id
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440201',
  '🔴 라이브 특가세일',
  '지금까지 이런 할인은 없었다! 최대 70% 할인 혜택을 놓치지 마세요!',
  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop',
  'live',
  1247,
  NOW(),
  '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (id) DO NOTHING;

-- 5. 방송 상품 연결
INSERT INTO public.broadcast_products (
  broadcast_id, product_id, special_price, is_featured, sort_order
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440201',
  '550e8400-e29b-41d4-a716-446655440101',
  79000, -- 특가 가격
  true,
  1
),
(
  '550e8400-e29b-41d4-a716-446655440201',
  '550e8400-e29b-41d4-a716-446655440104',
  129000, -- 특가 가격
  true,
  2
),
(
  '550e8400-e29b-41d4-a716-446655440201',
  '550e8400-e29b-41d4-a716-446655440108',
  69000, -- 특가 가격
  false,
  3
)
ON CONFLICT (broadcast_id, product_id) DO NOTHING;

-- 6. 상품 이미지 추가
INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=600&h=600&fit=crop', '무선 이어폰 메인 이미지', 0),
('550e8400-e29b-41d4-a716-446655440101', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop', '무선 이어폰 측면', 1),
('550e8400-e29b-41d4-a716-446655440102', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop', '스마트워치 메인', 0),
('550e8400-e29b-41d4-a716-446655440103', 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600&h=600&fit=crop', '무선 충전패드', 0),
('550e8400-e29b-41d4-a716-446655440104', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&h=600&fit=crop', '블루투스 스피커', 0)
ON CONFLICT DO NOTHING;

-- 업데이트 함수 실행으로 updated_at 필드 설정
UPDATE public.categories SET updated_at = NOW();
UPDATE public.products SET updated_at = NOW();
UPDATE public.broadcasts SET updated_at = NOW();