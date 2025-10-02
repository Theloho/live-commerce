-- 1. profiles 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. 실제 데이터 샘플 (우편번호 포함)
SELECT id, name, address, detail_address, postal_code, 
       addresses::text as addresses_json
FROM profiles
WHERE id = '8542d1dd-e5ca-4434-b486-7ef4ed91da21';

-- 3. order_shipping 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'order_shipping'
ORDER BY ordinal_position;

-- 4. 최근 주문의 배송 정보 (우편번호 포함)
SELECT 
  o.customer_order_number,
  os.name,
  os.address,
  os.detail_address,
  os.postal_code,
  o.created_at
FROM orders o
LEFT JOIN order_shipping os ON o.id = os.order_id
WHERE o.customer_order_number = 'S251003-7JX8';
