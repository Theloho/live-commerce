-- 사용자의 addresses 배열 상세 확인
-- 사용자 ID: 8542d1dd-e5ca-4434-b486-7ef4ed91da21

SELECT
  id,
  name,
  email,
  address,
  detail_address,
  postal_code,
  addresses,
  jsonb_array_length(COALESCE(addresses, '[]'::jsonb)) as addresses_count,
  created_at,
  updated_at
FROM profiles
WHERE id = '8542d1dd-e5ca-4434-b486-7ef4ed91da21';

-- addresses 배열의 각 항목 상세 출력
SELECT
  id,
  name,
  jsonb_array_elements(addresses) as address_item
FROM profiles
WHERE id = '8542d1dd-e5ca-4434-b486-7ef4ed91da21'
  AND addresses IS NOT NULL
  AND jsonb_array_length(addresses) > 0;
