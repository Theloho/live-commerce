-- 주문 S251003-7XZW의 배송 정보 확인
SELECT
  o.customer_order_number,
  o.status,
  os.name,
  os.phone,
  os.address,
  os.detail_address,
  os.postal_code,
  o.created_at
FROM orders o
LEFT JOIN order_shipping os ON o.id = os.order_id
WHERE o.customer_order_number = 'S251003-7XZW';
