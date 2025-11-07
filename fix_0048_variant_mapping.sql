-- ==========================================
-- 제품 0048 Variant 옵션 매핑 복구 SQL
-- Product ID: e86c978c-ca13-4c0c-bb85-9c1f4772a470
-- 문제: variant_option_values 매핑 누락
-- ==========================================

DO $$
DECLARE
  v_option_id uuid;
  v_value_black_id uuid;
  v_value_ivory_id uuid;
  v_value_camel_id uuid;
  v_variant_black_id uuid;
  v_variant_ivory_id uuid;
  v_variant_camel_id uuid;
BEGIN
  -- 1. 제품 총 재고 업데이트
  UPDATE products
  SET inventory = 58
  WHERE id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470';

  -- 2. product_options 확인 또는 생성 (색상)
  SELECT id INTO v_option_id
  FROM product_options
  WHERE product_id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470'
  AND name = '색상'
  LIMIT 1;

  IF v_option_id IS NULL THEN
    INSERT INTO product_options (product_id, name)
    VALUES ('e86c978c-ca13-4c0c-bb85-9c1f4772a470', '색상')
    RETURNING id INTO v_option_id;
  END IF;

  -- 3. product_option_values 확인 또는 생성
  -- 블랙
  SELECT id INTO v_value_black_id
  FROM product_option_values
  WHERE option_id = v_option_id AND value = '블랙'
  LIMIT 1;

  IF v_value_black_id IS NULL THEN
    INSERT INTO product_option_values (option_id, value)
    VALUES (v_option_id, '블랙')
    RETURNING id INTO v_value_black_id;
  END IF;

  -- 아이보리
  SELECT id INTO v_value_ivory_id
  FROM product_option_values
  WHERE option_id = v_option_id AND value = '아이보리'
  LIMIT 1;

  IF v_value_ivory_id IS NULL THEN
    INSERT INTO product_option_values (option_id, value)
    VALUES (v_option_id, '아이보리')
    RETURNING id INTO v_value_ivory_id;
  END IF;

  -- 카멜
  SELECT id INTO v_value_camel_id
  FROM product_option_values
  WHERE option_id = v_option_id AND value = '카멜'
  LIMIT 1;

  IF v_value_camel_id IS NULL THEN
    INSERT INTO product_option_values (option_id, value)
    VALUES (v_option_id, '카멜')
    RETURNING id INTO v_value_camel_id;
  END IF;

  -- 4. Variant ID 조회
  SELECT id INTO v_variant_black_id
  FROM product_variants
  WHERE product_id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470'
  AND sku = '0048-블랙-e86c978c'
  LIMIT 1;

  SELECT id INTO v_variant_ivory_id
  FROM product_variants
  WHERE product_id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470'
  AND sku = '0048-아이보리-e86c978c'
  LIMIT 1;

  SELECT id INTO v_variant_camel_id
  FROM product_variants
  WHERE product_id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470'
  AND sku = '0048-카멜-e86c978c'
  LIMIT 1;

  -- 5. variant_option_values 매핑 (기존 삭제 후 재생성)
  DELETE FROM variant_option_values
  WHERE variant_id IN (v_variant_black_id, v_variant_ivory_id, v_variant_camel_id);

  -- 블랙
  INSERT INTO variant_option_values (variant_id, option_value_id)
  VALUES (v_variant_black_id, v_value_black_id);

  -- 아이보리
  INSERT INTO variant_option_values (variant_id, option_value_id)
  VALUES (v_variant_ivory_id, v_value_ivory_id);

  -- 카멜
  INSERT INTO variant_option_values (variant_id, option_value_id)
  VALUES (v_variant_camel_id, v_value_camel_id);

  -- 6. 결과 출력
  RAISE NOTICE '복구 완료!';
  RAISE NOTICE 'Option ID: %', v_option_id;
  RAISE NOTICE 'Variant Black: % -> Option Value: %', v_variant_black_id, v_value_black_id;
  RAISE NOTICE 'Variant Ivory: % -> Option Value: %', v_variant_ivory_id, v_value_ivory_id;
  RAISE NOTICE 'Variant Camel: % -> Option Value: %', v_variant_camel_id, v_value_camel_id;

END $$;

-- 7. 확인 쿼리
SELECT
  pv.sku,
  pv.inventory as variant_inventory,
  po.name as option_name,
  pov.value as option_value
FROM product_variants pv
LEFT JOIN variant_option_values vov ON vov.variant_id = pv.id
LEFT JOIN product_option_values pov ON pov.id = vov.option_value_id
LEFT JOIN product_options po ON po.id = pov.option_id
WHERE pv.product_id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470'
ORDER BY pov.value;
