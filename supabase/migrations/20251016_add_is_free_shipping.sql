-- orders 테이블에 무료배송 플래그 추가
-- 입금대기 주문이 있을 때 무료배송 혜택을 받았는지 기록

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS is_free_shipping BOOLEAN DEFAULT FALSE;

-- 코멘트 추가
COMMENT ON COLUMN orders.is_free_shipping IS '무료배송 혜택 적용 여부 (pending/verifying 주문 존재 시 true)';

-- 기존 주문 중 shipping_fee = 0인 경우 is_free_shipping = true로 업데이트 (선택)
-- UPDATE orders
-- SET is_free_shipping = true
-- WHERE shipping_fee = 0 OR shipping_fee IS NULL;
