SELECT
  o.customer_order_number,
  o.status,
  os.name,
  os.phone,
  os.address,
  os.detail_address,
  os.postal_code,
  op.amount as payment_amount,
  o.created_at
FROM orders o
LEFT JOIN order_shipping os ON o.id = os.order_id
LEFT JOIN order_payments op ON o.id = op.order_id
WHERE o.customer_order_number = 'S251003-W205';
