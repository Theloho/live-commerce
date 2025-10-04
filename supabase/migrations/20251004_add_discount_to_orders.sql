-- ==========================================
-- orders 테이블에 discount_amount 컬럼 추가
-- 생성일: 2025-10-04
-- 목적: 쿠폰 할인 금액 저장
-- ==========================================

-- discount_amount 컬럼 추가
ALTER TABLE orders
ADD COLUMN discount_amount DECIMAL(12, 2) DEFAULT 0;

-- 기존 데이터에 대해 기본값 0 설정
UPDATE orders
SET discount_amount = 0
WHERE discount_amount IS NULL;

-- NOT NULL 제약조건 추가
ALTER TABLE orders
ALTER COLUMN discount_amount SET NOT NULL;

-- 인덱스 생성 (할인이 적용된 주문 조회용)
CREATE INDEX idx_orders_discount_amount ON orders(discount_amount) WHERE discount_amount > 0;

-- 코멘트 추가
COMMENT ON COLUMN orders.discount_amount IS '쿠폰 할인 금액 (적용된 할인액)';
