-- Migration: create_order_with_relations RPC 함수
-- Purpose: 4개 테이블(orders, order_items, order_shipping, order_payments)
--          한 번의 요청으로 INSERT
-- Author: Claude
-- Date: 2025-10-23
-- Issue: 504 Gateway Timeout (30초) - 4번 네트워크 왕복 문제

-- ============================================================
-- 1. RPC 함수: create_order_with_relations
-- ============================================================

CREATE OR REPLACE FUNCTION create_order_with_relations(
  order_data JSONB,
  order_items_data JSONB,
  shipping_data JSONB,
  payment_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  created_order_id UUID;
  created_order JSONB;
BEGIN
  -- 1. orders 테이블 INSERT
  INSERT INTO orders (
    id,
    user_id,
    order_type,
    customer_order_number,
    status,
    total_amount,
    discount_amount,
    is_free_shipping
  )
  VALUES (
    (order_data->>'id')::UUID,
    NULLIF(order_data->>'user_id', '')::UUID,  -- NULL 가능 (카카오 사용자)
    order_data->>'order_type',
    order_data->>'customer_order_number',
    COALESCE(order_data->>'status', 'pending'),
    (order_data->>'total_amount')::DECIMAL,
    COALESCE((order_data->>'discount_amount')::DECIMAL, 0),
    COALESCE((order_data->>'is_free_shipping')::BOOLEAN, false)
  )
  RETURNING id INTO created_order_id;

  -- 2. order_items 테이블 INSERT (배열)
  IF order_items_data IS NOT NULL AND jsonb_array_length(order_items_data) > 0 THEN
    INSERT INTO order_items (
      order_id,
      product_id,
      variant_id,
      title,
      quantity,
      price,
      unit_price,
      total,
      total_price
    )
    SELECT
      created_order_id,
      (item->>'product_id')::UUID,
      NULLIF(item->>'variant_id', '')::UUID,
      item->>'title',
      (item->>'quantity')::INTEGER,
      (item->>'price')::DECIMAL,
      (item->>'unit_price')::DECIMAL,
      (item->>'total')::DECIMAL,
      (item->>'total_price')::DECIMAL
    FROM jsonb_array_elements(order_items_data) AS item;
  END IF;

  -- 3. order_shipping 테이블 INSERT
  IF shipping_data IS NOT NULL THEN
    INSERT INTO order_shipping (
      order_id,
      name,
      phone,
      address,
      postal_code,
      shipping_fee
    )
    VALUES (
      created_order_id,
      shipping_data->>'name',
      shipping_data->>'phone',
      shipping_data->>'address',
      shipping_data->>'postal_code',
      (shipping_data->>'shipping_fee')::DECIMAL
    );
  END IF;

  -- 4. order_payments 테이블 INSERT
  IF payment_data IS NOT NULL THEN
    INSERT INTO order_payments (
      order_id,
      method,
      amount,
      depositor_name
    )
    VALUES (
      created_order_id,
      payment_data->>'method',
      (payment_data->>'amount')::DECIMAL,
      payment_data->>'depositor_name'
    );
  END IF;

  -- 5. 생성된 주문 반환
  SELECT row_to_json(o.*)::JSONB
  INTO created_order
  FROM orders o
  WHERE o.id = created_order_id;

  RETURN created_order;
END;
$$;

-- ============================================================
-- 2. 권한 설정
-- ============================================================

-- Service Role만 실행 가능 (RLS 우회)
GRANT EXECUTE ON FUNCTION create_order_with_relations TO service_role;

-- ============================================================
-- 3. 주석
-- ============================================================

COMMENT ON FUNCTION create_order_with_relations IS
'4개 테이블(orders, order_items, order_shipping, order_payments) 한 번에 INSERT
- 성능 개선: 4번 네트워크 왕복 → 1번 (75%↓)
- 트랜잭션 보장: 전체 성공 or 전체 실패
- 사용: OrderRepository.create() 메서드';
