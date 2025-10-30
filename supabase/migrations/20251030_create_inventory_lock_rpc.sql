-- =====================================================
-- Migration: 일반 상품 재고 Lock RPC 함수 생성
-- 목적: Race Condition 방지 (500명 동시 구매 시 재고 초과 판매 방지)
-- 작성일: 2025-10-30
-- 작성자: Claude
-- =====================================================

-- 기존 함수 삭제 (있다면)
DROP FUNCTION IF EXISTS update_inventory_with_lock(UUID, INT);

-- RPC 함수 생성: 일반 상품 재고 업데이트 (Row-Level Lock)
CREATE OR REPLACE FUNCTION update_inventory_with_lock(
  p_product_id UUID,
  p_quantity_change INT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_inventory INT;
  v_new_inventory INT;
BEGIN
  -- 🔒 Row-Level Lock (Race Condition 방지)
  -- FOR UPDATE NOWAIT: 다른 트랜잭션이 Lock 중이면 즉시 에러 (대기 안 함)
  SELECT inventory INTO v_current_inventory
  FROM products
  WHERE id = p_product_id
  FOR UPDATE NOWAIT;

  -- 상품이 없으면 에러
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- 새 재고 계산
  v_new_inventory := v_current_inventory + p_quantity_change;

  -- ⚠️ 재고 부족 검증 (음수 방지)
  IF v_new_inventory < 0 THEN
    RAISE EXCEPTION 'Insufficient inventory: current=%, requested=%, result=%',
      v_current_inventory,
      p_quantity_change,
      v_new_inventory;
  END IF;

  -- ✅ 재고 업데이트 (Lock 중이므로 안전)
  UPDATE products
  SET
    inventory = v_new_inventory,
    updated_at = NOW()
  WHERE id = p_product_id;

  -- 성공 응답 (새 재고 포함)
  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'old_inventory', v_current_inventory,
    'quantity_change', p_quantity_change,
    'new_inventory', v_new_inventory
  );

EXCEPTION
  -- Lock 타임아웃 (다른 고객이 구매 중)
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'concurrent_update: 다른 고객이 구매 중입니다';

  -- 기타 에러
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- 함수 설명 추가
COMMENT ON FUNCTION update_inventory_with_lock(UUID, INT) IS
'일반 상품 재고 업데이트 (Row-Level Lock으로 Race Condition 방지)
- FOR UPDATE NOWAIT: 동시 구매 시 Lock으로 순차 처리
- Variant 상품은 update_variant_inventory_with_lock 사용
- 작성일: 2025-10-30';

-- =====================================================
-- 테스트 케이스
-- =====================================================

-- 1. 정상 케이스: 재고 차감 (-1)
-- SELECT update_inventory_with_lock(
--   '상품ID'::UUID,
--   -1
-- );

-- 2. 정상 케이스: 재고 복원 (+1)
-- SELECT update_inventory_with_lock(
--   '상품ID'::UUID,
--   +1
-- );

-- 3. 에러 케이스: 재고 부족
-- SELECT update_inventory_with_lock(
--   '상품ID'::UUID,
--   -100  -- 현재 재고보다 많이 차감
-- );
-- → 에러: Insufficient inventory

-- 4. 동시성 테스트 (2개 트랜잭션 동시 실행)
-- Transaction A:
--   BEGIN;
--   SELECT update_inventory_with_lock('상품ID'::UUID, -1);
--   -- 10초 대기
--   COMMIT;
--
-- Transaction B (동시 실행):
--   SELECT update_inventory_with_lock('상품ID'::UUID, -1);
--   → 에러: concurrent_update (A가 Lock 중)
