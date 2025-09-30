-- 카카오 사용자 주문의 order_type 수정
-- UUID 형식에서 실제 kakao_id로 변경

-- 현재 상태 확인
SELECT
    id,
    order_type,
    customer_order_number,
    created_at
FROM orders
WHERE order_type LIKE '%KAKAO:7f3094fc-0212-40f8-a7af-d126898a3ea8'
ORDER BY created_at DESC;

-- UUID를 kakao_id로 변경
UPDATE orders
SET order_type = REPLACE(order_type, ':KAKAO:7f3094fc-0212-40f8-a7af-d126898a3ea8', ':KAKAO:4454444603')
WHERE order_type LIKE '%KAKAO:7f3094fc-0212-40f8-a7af-d126898a3ea8';

-- 수정 결과 확인
SELECT
    id,
    order_type,
    customer_order_number,
    created_at
FROM orders
WHERE order_type LIKE '%KAKAO:4454444603'
ORDER BY created_at DESC;

-- 전체 결과 확인
SELECT
    order_type,
    COUNT(*) as count
FROM orders
GROUP BY order_type
ORDER BY count DESC;