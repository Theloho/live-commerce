-- ===============================
-- 기존 테이블 정리 및 새 스키마 생성
-- ===============================

-- 1단계: 기존 테이블들 삭제 (순서 중요 - 외래키 제약 조건 때문에)
DROP TABLE IF EXISTS public.inventory_logs CASCADE;
DROP TABLE IF EXISTS public.order_payments CASCADE;
DROP TABLE IF EXISTS public.order_shipping CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.product_options CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.live_broadcasts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2단계: 기존 함수들 삭제
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.log_inventory_change() CASCADE;

-- ===============================
-- 새 스키마 생성 시작
-- ===============================

-- 1. 사용자 테이블 (Supabase Auth 확장)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname TEXT,
  name TEXT,
  phone TEXT,
  address TEXT,
  detail_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 상품 테이블
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2),
  thumbnail_url TEXT,
  review_rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  badge TEXT,
  free_shipping BOOLEAN DEFAULT FALSE,
  seller TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  inventory_quantity INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 상품 옵션 테이블
CREATE TABLE public.product_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  values JSONB NOT NULL, -- ['블랙', '화이트', '실버']
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 주문 테이블
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'paid', 'delivered', 'cancelled')),
  order_type TEXT DEFAULT 'direct' CHECK (order_type IN ('cart', 'direct')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 주문 아이템 테이블
CREATE TABLE public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  selected_options JSONB, -- {"1001": "블랙", "1002": "일반형"}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 배송 정보 테이블
CREATE TABLE public.order_shipping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  detail_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 결제 정보 테이블
CREATE TABLE public.order_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
  method TEXT NOT NULL CHECK (method IN ('cart', 'bank_transfer', 'card')),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  deposit_name TEXT, -- 무통장입금시 입금자명
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 라이브 방송 테이블
CREATE TABLE public.live_broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  viewer_count INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  broadcaster_name TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 재고 이력 테이블 (재고 변동 추적)
CREATE TABLE public.inventory_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('increase', 'decrease', 'set')),
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================
-- 인덱스 생성
-- ===============================

-- 상품 검색 최적화
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_is_live ON public.products(is_live);
CREATE INDEX idx_products_created_at ON public.products(created_at DESC);

-- 주문 최적화
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

-- 주문 아이템 최적화
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);

-- ===============================
-- RLS (Row Level Security) 정책
-- ===============================

-- 사용자 프로필: 본인만 수정 가능
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 상품: 모두 읽기 가능, 관리자만 쓰기 가능
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT USING (status = 'active');

-- 상품 옵션: 상품과 동일한 정책
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product options" ON public.product_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_options.product_id
      AND products.status = 'active'
    )
  );

-- 주문: 본인 주문만 조회 가능
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);

-- 주문 아이템: 본인 주문의 아이템만 조회 가능
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 배송 정보: 본인 주문의 배송 정보만 조회 가능
ALTER TABLE public.order_shipping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shipping info" ON public.order_shipping
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_shipping.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own shipping info" ON public.order_shipping
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_shipping.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own shipping info" ON public.order_shipping
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_shipping.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 결제 정보: 본인 주문의 결제 정보만 조회 가능
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment info" ON public.order_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_payments.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own payment info" ON public.order_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_payments.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 라이브 방송: 모두 읽기 가능
ALTER TABLE public.live_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live broadcasts" ON public.live_broadcasts
  FOR SELECT USING (true);

-- ===============================
-- 트리거 함수 (자동 업데이트)
-- ===============================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 설정
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_order_shipping
  BEFORE UPDATE ON public.order_shipping
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_order_payments
  BEFORE UPDATE ON public.order_payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_live_broadcasts
  BEFORE UPDATE ON public.live_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===============================
-- 재고 관리 트리거
-- ===============================

-- 재고 변경 로그 함수
CREATE OR REPLACE FUNCTION public.log_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
  -- UPDATE일 때만 실행
  IF TG_OP = 'UPDATE' AND OLD.inventory_quantity != NEW.inventory_quantity THEN
    INSERT INTO public.inventory_logs (
      product_id,
      change_type,
      quantity_change,
      previous_quantity,
      new_quantity,
      reason
    ) VALUES (
      NEW.id,
      CASE
        WHEN NEW.inventory_quantity > OLD.inventory_quantity THEN 'increase'
        WHEN NEW.inventory_quantity < OLD.inventory_quantity THEN 'decrease'
        ELSE 'set'
      END,
      NEW.inventory_quantity - OLD.inventory_quantity,
      OLD.inventory_quantity,
      NEW.inventory_quantity,
      'System update'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 재고 로그 트리거 설정
CREATE TRIGGER log_product_inventory_changes
  AFTER UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_inventory_change();

-- ===============================
-- 초기 데이터 삽입
-- ===============================

-- 테스트 상품 데이터
INSERT INTO public.products (
  title, description, price, compare_price, thumbnail_url,
  review_rating, review_count, is_featured, badge, seller,
  inventory_quantity, is_live
) VALUES
  (
    '프리미엄 무선 이어폰',
    '최신 블루투스 5.0 기술을 적용한 프리미엄 무선 이어폰입니다. 노이즈 캔슬링 기능으로 깨끗한 음질을 제공하며, 최대 8시간 연속 재생이 가능합니다.',
    89000, 129000, 'https://picsum.photos/400/500?random=1',
    4.5, 324, true, 'BEST', '테크스토어',
    3, false
  ),
  (
    '스마트 워치 프로',
    '건강 관리와 스마트 기능을 한 번에! GPS, 심박수 측정, 수면 분석 등 다양한 기능을 제공합니다.',
    245000, 299000, 'https://picsum.photos/400/500?random=2',
    4.3, 187, false, 'NEW', '스마트기어',
    15, true
  ),
  (
    '노트북 스탠드',
    '인체공학적 설계로 목과 어깨 부담을 줄여주는 알루미늄 노트북 스탠드입니다.',
    35000, NULL, 'https://picsum.photos/400/500?random=3',
    4.1, 92, false, NULL, '오피스몰',
    25, false
  );

-- 첫 번째 상품의 옵션 데이터 (프리미엄 무선 이어폰)
INSERT INTO public.product_options (product_id, name, values)
SELECT
  p.id,
  '색상',
  '["블랙", "화이트", "실버"]'::jsonb
FROM public.products p
WHERE p.title = '프리미엄 무선 이어폰';

INSERT INTO public.product_options (product_id, name, values)
SELECT
  p.id,
  '사이즈',
  '["일반형", "소형"]'::jsonb
FROM public.products p
WHERE p.title = '프리미엄 무선 이어폰';

-- 두 번째 상품의 옵션 데이터 (스마트 워치 프로)
INSERT INTO public.product_options (product_id, name, values)
SELECT
  p.id,
  '색상',
  '["블랙", "실버", "골드"]'::jsonb
FROM public.products p
WHERE p.title = '스마트 워치 프로';

INSERT INTO public.product_options (product_id, name, values)
SELECT
  p.id,
  '밴드',
  '["스포츠밴드", "가죽밴드", "메탈밴드"]'::jsonb
FROM public.products p
WHERE p.title = '스마트 워치 프로';

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '=== 라이브 커머스 데이터베이스 설정 완료 ===';
    RAISE NOTICE '- 기존 테이블 정리: 완료';
    RAISE NOTICE '- 새 테이블 생성: 완료';
    RAISE NOTICE '- 인덱스 생성: 완료';
    RAISE NOTICE '- RLS 정책 설정: 완료';
    RAISE NOTICE '- 트리거 설정: 완료';
    RAISE NOTICE '- 초기 데이터 삽입: 완료';
    RAISE NOTICE '=======================================';
END $$;