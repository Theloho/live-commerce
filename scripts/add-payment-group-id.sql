-- orders 테이블에 payment_group_id 컬럼 추가
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_group_id VARCHAR(50) DEFAULT NULL;

-- 기존 데이터에 대해 NULL로 초기화 (개별 주문들)
UPDATE orders
SET payment_group_id = NULL
WHERE payment_group_id IS NULL;

-- payment_group_id에 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_orders_payment_group_id ON orders(payment_group_id);