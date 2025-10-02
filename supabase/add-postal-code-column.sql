-- Add postal_code column to order_shipping table for island surcharge calculation
ALTER TABLE order_shipping
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_shipping_postal_code ON order_shipping(postal_code);

-- Add comment
COMMENT ON COLUMN order_shipping.postal_code IS '우편번호 (도서산간 지역 판별용)';
