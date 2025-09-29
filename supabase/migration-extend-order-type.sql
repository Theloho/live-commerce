-- order_type 필드 varchar 길이 제한 확장
-- 현재 varchar(20) → varchar(200)으로 변경

ALTER TABLE orders
ALTER COLUMN order_type TYPE varchar(200);

-- 인덱스 재생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_order_type ON orders(user_id, order_type);

-- 코멘트 추가
COMMENT ON COLUMN orders.order_type IS '주문 타입: direct, bulk_payment, direct:KAKAO:user_id 등';