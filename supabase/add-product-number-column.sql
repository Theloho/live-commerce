-- Add product_number column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS product_number VARCHAR(20);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_product_number ON products(product_number);

-- Add comment
COMMENT ON COLUMN products.product_number IS '상품번호 (P-0001 형식)';
