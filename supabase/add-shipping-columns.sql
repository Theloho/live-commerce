-- orders 테이블에 배송지 정보 컬럼 추가
-- 이미 있는 컬럼은 IF NOT EXISTS로 인해 무시됩니다

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_name TEXT,
ADD COLUMN IF NOT EXISTS shipping_phone TEXT,
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS shipping_detail_address TEXT;

-- 컬럼에 대한 설명 추가
COMMENT ON COLUMN orders.shipping_name IS '수령인 이름';
COMMENT ON COLUMN orders.shipping_phone IS '수령인 연락처';
COMMENT ON COLUMN orders.shipping_address IS '배송지 주소';
COMMENT ON COLUMN orders.shipping_detail_address IS '배송지 상세 주소';