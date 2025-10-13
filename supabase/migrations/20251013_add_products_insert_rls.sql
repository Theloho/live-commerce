-- ==========================================
-- Products 테이블 INSERT RLS 정책 추가
-- 생성일: 2025-10-13
-- 문제: 관리자가 빠른 상품 등록 시 403 Forbidden 에러 발생
-- 해결: 관리자 전용 INSERT 정책 추가
-- ==========================================

-- ==========================================
-- 1. products 테이블 INSERT 정책
-- ==========================================

DROP POLICY IF EXISTS "Admins can insert products" ON products;

CREATE POLICY "Admins can insert products"
ON products
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- ==========================================
-- 2. product_options 테이블 INSERT 정책
-- ==========================================

DROP POLICY IF EXISTS "Admins can insert product options" ON product_options;

CREATE POLICY "Admins can insert product options"
ON product_options
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- ==========================================
-- 3. product_option_values 테이블 INSERT 정책
-- ==========================================

DROP POLICY IF EXISTS "Admins can insert product option values" ON product_option_values;

CREATE POLICY "Admins can insert product option values"
ON product_option_values
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- ==========================================
-- 4. product_variants 테이블 INSERT 정책
-- ==========================================

DROP POLICY IF EXISTS "Admins can insert product variants" ON product_variants;

CREATE POLICY "Admins can insert product variants"
ON product_variants
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- ==========================================
-- 5. variant_option_values 테이블 INSERT 정책
-- ==========================================

DROP POLICY IF EXISTS "Admins can insert variant option values" ON variant_option_values;

CREATE POLICY "Admins can insert variant option values"
ON variant_option_values
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- ==========================================
-- 6. UPDATE 정책도 추가 (상품 수정 기능)
-- ==========================================

-- products UPDATE
DROP POLICY IF EXISTS "Admins can update products" ON products;

CREATE POLICY "Admins can update products"
ON products
FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- product_options UPDATE
DROP POLICY IF EXISTS "Admins can update product options" ON product_options;

CREATE POLICY "Admins can update product options"
ON product_options
FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- product_option_values UPDATE
DROP POLICY IF EXISTS "Admins can update product option values" ON product_option_values;

CREATE POLICY "Admins can update product option values"
ON product_option_values
FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- product_variants UPDATE
DROP POLICY IF EXISTS "Admins can update product variants" ON product_variants;

CREATE POLICY "Admins can update product variants"
ON product_variants
FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- variant_option_values UPDATE
DROP POLICY IF EXISTS "Admins can update variant option values" ON variant_option_values;

CREATE POLICY "Admins can update variant option values"
ON variant_option_values
FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- ==========================================
-- 7. DELETE 정책도 추가 (상품 삭제 기능)
-- ==========================================

-- products DELETE
DROP POLICY IF EXISTS "Admins can delete products" ON products;

CREATE POLICY "Admins can delete products"
ON products
FOR DELETE
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- product_options DELETE
DROP POLICY IF EXISTS "Admins can delete product options" ON product_options;

CREATE POLICY "Admins can delete product options"
ON product_options
FOR DELETE
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- product_option_values DELETE
DROP POLICY IF EXISTS "Admins can delete product option values" ON product_option_values;

CREATE POLICY "Admins can delete product option values"
ON product_option_values
FOR DELETE
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- product_variants DELETE
DROP POLICY IF EXISTS "Admins can delete product variants" ON product_variants;

CREATE POLICY "Admins can delete product variants"
ON product_variants
FOR DELETE
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- variant_option_values DELETE
DROP POLICY IF EXISTS "Admins can delete variant option values" ON variant_option_values;

CREATE POLICY "Admins can delete variant option values"
ON variant_option_values
FOR DELETE
TO authenticated
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- ==========================================
-- 8. 정책 확인 (결과 확인용)
-- ==========================================

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN qual IS NULL THEN 'N/A'
    ELSE LEFT(qual, 100)
  END as condition
FROM pg_policies
WHERE tablename IN ('products', 'product_options', 'product_option_values', 'product_variants', 'variant_option_values')
ORDER BY tablename, cmd, policyname;
