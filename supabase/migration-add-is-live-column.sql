-- =========================================
-- Migration: Add is_live column to products
-- Date: 2025-10-02
-- Purpose: 라이브 상품 관리 시스템 구축
-- =========================================

-- 1. products 테이블에 is_live 컬럼 추가
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;

-- 2. 기존 is_live_active가 true인 상품은 is_live도 true로 설정 (데이터 정합성)
UPDATE products
SET is_live = true
WHERE is_live_active = true;

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_products_is_live ON products(is_live);
CREATE INDEX IF NOT EXISTS idx_products_is_live_active ON products(is_live_active);

-- 4. 복합 인덱스 추가 (사용자 홈 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_products_live_status ON products(is_live, is_live_active, status);

-- 5. 확인
COMMENT ON COLUMN products.is_live IS '라이브 상품 관리 페이지에 리스팅 여부';
COMMENT ON COLUMN products.is_live_active IS '사용자 페이지에 실제 노출 여부';
