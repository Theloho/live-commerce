-- ========================================
-- 재고 동시성 제어 RPC 함수
-- Phase 1.7 - FOR UPDATE NOWAIT
-- ========================================
-- 작성일: 2025-10-21
-- 목적: Race Condition 방지 + 재고 부족 검증
-- ========================================

-- ========================================
-- 1. Product 재고 업데이트 (WITH LOCK)
-- ========================================

CREATE OR REPLACE FUNCTION update_product_inventory_with_lock(
  p_product_id UUID,
  p_change INTEGER  -- 양수: 증가, 음수: 감소
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_inventory INTEGER;
  v_new_inventory INTEGER;
BEGIN
  -- FOR UPDATE NOWAIT: 락 획득 실패 시 즉시 에러
  SELECT inventory INTO v_current_inventory
  FROM products
  WHERE id = p_product_id
  FOR UPDATE NOWAIT;

  -- 상품 없음 체크
  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found: Product % not found', p_product_id;
  END IF;

  -- 새 재고 계산
  v_new_inventory := v_current_inventory + p_change;

  -- 재고 부족 검증 (감소 시에만)
  IF p_change < 0 AND v_new_inventory < 0 THEN
    RAISE EXCEPTION 'insufficient_inventory: Current=%, Requested=%',
      v_current_inventory, ABS(p_change);
  END IF;

  -- 재고 업데이트
  UPDATE products
  SET inventory = v_new_inventory,
      updated_at = NOW()
  WHERE id = p_product_id;

  -- 결과 반환
  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'old_inventory', v_current_inventory,
    'new_inventory', v_new_inventory,
    'change', p_change
  );

EXCEPTION
  WHEN lock_not_available THEN
    -- 다른 트랜잭션이 락 보유 중
    RAISE EXCEPTION 'lock_not_available: Product % is locked by another transaction', p_product_id;
  WHEN OTHERS THEN
    -- 기타 에러 (insufficient_inventory, product_not_found 포함)
    RAISE;
END;
$$;

-- ========================================
-- 2. Variant 재고 업데이트 (WITH LOCK)
-- ========================================

CREATE OR REPLACE FUNCTION update_variant_inventory_with_lock(
  p_variant_id UUID,
  p_change INTEGER  -- 양수: 증가, 음수: 감소
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_inventory INTEGER;
  v_new_inventory INTEGER;
  v_product_id UUID;
  v_product_inventory INTEGER;
BEGIN
  -- FOR UPDATE NOWAIT: 락 획득 실패 시 즉시 에러
  SELECT inventory, product_id INTO v_current_inventory, v_product_id
  FROM product_variants
  WHERE id = p_variant_id
  FOR UPDATE NOWAIT;

  -- Variant 없음 체크
  IF NOT FOUND THEN
    RAISE EXCEPTION 'variant_not_found: Variant % not found', p_variant_id;
  END IF;

  -- 새 재고 계산
  v_new_inventory := v_current_inventory + p_change;

  -- 재고 부족 검증 (감소 시에만)
  IF p_change < 0 AND v_new_inventory < 0 THEN
    RAISE EXCEPTION 'insufficient_inventory: Current=%, Requested=%',
      v_current_inventory, ABS(p_change);
  END IF;

  -- Variant 재고 업데이트
  UPDATE product_variants
  SET inventory = v_new_inventory,
      updated_at = NOW()
  WHERE id = p_variant_id;

  -- Product 재고도 동기화 (트리거가 자동으로 처리하지만 명시적 업데이트)
  -- Product 테이블도 락 획득 (데드락 방지 위해 항상 같은 순서로 락 획득)
  SELECT inventory INTO v_product_inventory
  FROM products
  WHERE id = v_product_id
  FOR UPDATE NOWAIT;

  UPDATE products
  SET inventory = inventory + p_change,
      updated_at = NOW()
  WHERE id = v_product_id;

  -- 결과 반환
  RETURN jsonb_build_object(
    'variant_id', p_variant_id,
    'product_id', v_product_id,
    'old_inventory', v_current_inventory,
    'new_inventory', v_new_inventory,
    'change', p_change
  );

EXCEPTION
  WHEN lock_not_available THEN
    -- 다른 트랜잭션이 락 보유 중
    RAISE EXCEPTION 'lock_not_available: Variant % or Product % is locked', p_variant_id, v_product_id;
  WHEN OTHERS THEN
    -- 기타 에러 (insufficient_inventory, variant_not_found 포함)
    RAISE;
END;
$$;

-- ========================================
-- 함수 권한 설정
-- ========================================

-- Service Role만 실행 가능 (SECURITY DEFINER)
-- Anon/Authenticated 유저는 호출 불가 (Repository에서만 호출)
GRANT EXECUTE ON FUNCTION update_product_inventory_with_lock TO service_role;
GRANT EXECUTE ON FUNCTION update_variant_inventory_with_lock TO service_role;

-- ========================================
-- 주석 (함수 설명)
-- ========================================

COMMENT ON FUNCTION update_product_inventory_with_lock IS
'Product 재고 업데이트 (FOR UPDATE NOWAIT 락 사용)
- Race Condition 방지
- 재고 부족 시 에러 반환
- 락 획득 실패 시 즉시 에러 반환 (대기 없음)';

COMMENT ON FUNCTION update_variant_inventory_with_lock IS
'Variant 재고 업데이트 (FOR UPDATE NOWAIT 락 사용)
- Race Condition 방지
- Product 재고도 동기화 (트리거 보조)
- 재고 부족 시 에러 반환
- 락 획득 실패 시 즉시 에러 반환 (대기 없음)';
