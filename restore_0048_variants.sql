-- ==========================================
-- 제품 0048 Variant 복구 SQL
-- Product ID: e86c978c-ca13-4c0c-bb85-9c1f4772a470
-- 색상 옵션: 블랙(18), 아이보리(20), 카멜(20)
-- ==========================================

BEGIN;

-- 1. 제품 총 재고 업데이트
UPDATE products
SET inventory = 58
WHERE id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470';

-- 2. product_options 생성 (색상)
INSERT INTO product_options (id, product_id, name, position)
VALUES (gen_random_uuid(), 'e86c978c-ca13-4c0c-bb85-9c1f4772a470', '색상', 0)
ON CONFLICT DO NOTHING
RETURNING id;

-- ⚠️ 위 쿼리 실행 후 반환된 UUID를 복사하여 아래 <OPTION_ID>에 붙여넣으세요
-- 예: SET @option_id = '12345678-1234-1234-1234-123456789abc';

-- 3. product_option_values 생성
DO $$
DECLARE
  v_option_id uuid;
  v_value_black_id uuid := gen_random_uuid();
  v_value_ivory_id uuid := gen_random_uuid();
  v_value_camel_id uuid := gen_random_uuid();
BEGIN
  -- option_id 조회
  SELECT id INTO v_option_id
  FROM product_options
  WHERE product_id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470'
  AND name = '색상'
  LIMIT 1;

  -- 옵션값 생성
  INSERT INTO product_option_values (id, option_id, value)
  VALUES
    (v_value_black_id, v_option_id, '블랙'),
    (v_value_ivory_id, v_option_id, '아이보리'),
    (v_value_camel_id, v_option_id, '카멜')
  ON CONFLICT DO NOTHING;

  -- 4. product_variants 생성
  INSERT INTO product_variants (id, product_id, sku, inventory, price_adjustment)
  VALUES
    (gen_random_uuid(), 'e86c978c-ca13-4c0c-bb85-9c1f4772a470', '0048-블랙-e86c978c', 18, 0),
    (gen_random_uuid(), 'e86c978c-ca13-4c0c-bb85-9c1f4772a470', '0048-아이보리-e86c978c', 20, 0),
    (gen_random_uuid(), 'e86c978c-ca13-4c0c-bb85-9c1f4772a470', '0048-카멜-e86c978c', 20, 0)
  ON CONFLICT DO NOTHING;

  -- 5. variant_option_values 매핑
  -- 블랙
  INSERT INTO variant_option_values (variant_id, option_value_id)
  SELECT pv.id, v_value_black_id
  FROM product_variants pv
  WHERE pv.product_id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470'
  AND pv.sku = '0048-블랙-e86c978c'
  ON CONFLICT DO NOTHING;

  -- 아이보리
  INSERT INTO variant_option_values (variant_id, option_value_id)
  SELECT pv.id, v_value_ivory_id
  FROM product_variants pv
  WHERE pv.product_id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470'
  AND pv.sku = '0048-아이보리-e86c978c'
  ON CONFLICT DO NOTHING;

  -- 카멜
  INSERT INTO variant_option_values (variant_id, option_value_id)
  SELECT pv.id, v_value_camel_id
  FROM product_variants pv
  WHERE pv.product_id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470'
  AND pv.sku = '0048-카멜-e86c978c'
  ON CONFLICT DO NOTHING;

END $$;

COMMIT;

-- 6. 확인 쿼리
SELECT
  pv.sku,
  pv.inventory as variant_inventory,
  pov.value as color
FROM product_variants pv
LEFT JOIN variant_option_values vov ON vov.variant_id = pv.id
LEFT JOIN product_option_values pov ON pov.id = vov.option_value_id
WHERE pv.product_id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470'
ORDER BY pov.value;
