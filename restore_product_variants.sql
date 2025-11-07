-- ==========================================
-- 제품 Variant 복구 SQL
-- Product ID: e86c978c-ca13-4c0c-bb85-9c1f4772a470
-- ==========================================

-- 1. 먼저 제품 정보 확인
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

-- 2. 기존 옵션 확인 (혹시 남아있는지)
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

-- 3. 기존 Variants 확인 (삭제되었는지)
SELECT COUNT(*) as variant_count
FROM product_variants
WHERE product_id = 'e86c978c-ca13-4c0c-bb85-9c1f4772a470';

-- ==========================================
-- 복구 방법:
-- 관리자 페이지 > 상품 목록 > 해당 제품 편집
-- "상세등록 모드"로 들어가서 옵션 정보를 다시 입력하고 저장
-- ==========================================
