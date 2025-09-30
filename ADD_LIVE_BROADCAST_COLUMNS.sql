-- Add live broadcast related columns to products table
-- 라이브 방송 상품 관리를 위한 컬럼 추가

-- 라이브 방송 관련 컬럼들 추가
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_live_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS live_priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS live_start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS live_end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS category_id UUID,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 라이브 방송 관련 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_products_live_active ON products(is_live_active);
CREATE INDEX IF NOT EXISTS idx_products_live_priority ON products(live_priority) WHERE is_live_active = true;
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- 카테고리 테이블 생성
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 카테고리 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);

-- 기본 카테고리 데이터 삽입
INSERT INTO categories (name, sort_order) VALUES
  ('전자제품', 1),
  ('생활용품', 2),
  ('패션/뷰티', 3),
  ('식품', 4),
  ('도서/문화', 5)
ON CONFLICT DO NOTHING;

-- products 테이블에 카테고리 외래키 제약조건 추가
ALTER TABLE products
ADD CONSTRAINT fk_products_category
FOREIGN KEY (category_id) REFERENCES categories(id);

-- 컬럼 코멘트 추가
COMMENT ON COLUMN products.is_live_active IS '현재 라이브 방송 중인 상품 여부';
COMMENT ON COLUMN products.live_priority IS '라이브 방송에서의 표시 순서 (낮을수록 먼저 표시)';
COMMENT ON COLUMN products.live_start_time IS '라이브 방송 시작 시간';
COMMENT ON COLUMN products.live_end_time IS '라이브 방송 종료 시간';
COMMENT ON COLUMN products.category_id IS '상품 카테고리 ID';
COMMENT ON COLUMN products.tags IS '상품 태그 배열';
COMMENT ON COLUMN products.status IS '상품 상태 (active: 활성, draft: 임시저장, archived: 보관)';
COMMENT ON COLUMN products.sku IS '상품 고유 코드';
COMMENT ON COLUMN products.notes IS '관리자 메모';