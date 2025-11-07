-- 제품 기본 정보 확인
SELECT
  id,
  title,
  product_number,
  price,
  inventory,
  status,
  is_live,
  is_live_active
FROM products
WHERE id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470';

-- 제품 옵션 확인
SELECT
  po.id as option_id,
  po.name as option_name,
  po.position,
  pov.id as value_id,
  pov.value as option_value
FROM product_options po
LEFT JOIN product_option_values pov ON pov.option_id = po.id
WHERE po.product_id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470'
ORDER BY po.position, pov.value;

-- 제품 Variants 확인
SELECT
  pv.id as variant_id,
  pv.sku,
  pv.inventory as variant_inventory,
  vov.id as mapping_id,
  pov.value as option_value,
  po.name as option_name
FROM product_variants pv
LEFT JOIN variant_option_values vov ON vov.variant_id = pv.id
LEFT JOIN product_option_values pov ON pov.id = vov.option_value_id
LEFT JOIN product_options po ON po.id = pov.option_id
WHERE pv.product_id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470'
ORDER BY pv.sku, po.position;
