-- ============================================================================
-- 옵션별 재고 관리 시스템 - Supabase RPC 함수
-- 작성일: 2025-10-01
-- 목적: 안전한 옵션별 재고 차감 및 관리
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 옵션별 재고 업데이트 함수 (트랜잭션 보장)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_option_inventory(
  p_product_id UUID,
  p_option_name TEXT,
  p_option_value TEXT,
  p_quantity_change INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_options JSONB;
  v_updated_options JSONB;
  v_current_inventory INTEGER;
  v_option_id UUID;
BEGIN
  -- 현재 옵션 데이터 조회 (FOR UPDATE로 락 걸어서 동시성 제어)
  SELECT id, values INTO v_option_id, v_current_options
  FROM product_options
  WHERE product_id = p_product_id
    AND name = p_option_name
  FOR UPDATE;

  -- 옵션이 없는 경우 에러
  IF v_current_options IS NULL THEN
    RAISE EXCEPTION 'Option "%" not found for product %', p_option_name, p_product_id;
  END IF;

  -- 현재 재고 확인
  SELECT (elem->>'inventory')::int INTO v_current_inventory
  FROM jsonb_array_elements(v_current_options) elem
  WHERE elem->>'name' = p_option_value;

  -- 옵션값이 없는 경우 에러
  IF v_current_inventory IS NULL THEN
    RAISE EXCEPTION 'Option value "%" not found in option "%"', p_option_value, p_option_name;
  END IF;

  -- 재고 부족 체크 (음수 방지)
  IF v_current_inventory + p_quantity_change < 0 THEN
    RAISE EXCEPTION 'Insufficient inventory for "% - %". Current: %, Requested: %',
      p_option_name, p_option_value, v_current_inventory, ABS(p_quantity_change);
  END IF;

  -- JSONB 업데이트 (옵션 재고 차감/증가)
  v_updated_options := (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'name' = p_option_value
        THEN jsonb_set(
          elem,
          '{inventory}',
          to_jsonb((elem->>'inventory')::int + p_quantity_change)
        )
        ELSE elem
      END
    )
    FROM jsonb_array_elements(v_current_options) elem
  );

  -- 업데이트 실행
  UPDATE product_options
  SET values = v_updated_options
  WHERE id = v_option_id;

  -- 업데이트된 옵션 데이터 반환
  RETURN v_updated_options;
END;
$$;

-- 함수 설명 주석
COMMENT ON FUNCTION update_option_inventory IS '옵션별 재고를 안전하게 업데이트합니다. FOR UPDATE 락으로 동시성을 제어하며, 재고 부족 시 예외를 발생시킵니다.';

-- ----------------------------------------------------------------------------
-- 2. 전체 재고 계산 함수
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_total_inventory(p_product_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER := 0;
  v_option RECORD;
  v_value JSONB;
BEGIN
  -- 해당 상품의 모든 옵션 조회
  FOR v_option IN
    SELECT values
    FROM product_options
    WHERE product_id = p_product_id
  LOOP
    -- 각 옵션의 모든 값들의 재고 합산
    FOR v_value IN
      SELECT value
      FROM jsonb_array_elements(v_option.values)
    LOOP
      v_total := v_total + COALESCE((v_value->>'inventory')::int, 0);
    END LOOP;
  END LOOP;

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION calculate_total_inventory IS '상품의 모든 옵션 재고를 합산하여 전체 재고를 계산합니다.';

-- ----------------------------------------------------------------------------
-- 3. products.inventory 자동 업데이트 트리거 함수
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_product_total_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- product_options 변경 시 products.inventory 자동 계산
  UPDATE products
  SET
    inventory = calculate_total_inventory(NEW.product_id),
    updated_at = NOW()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_product_total_inventory IS '옵션 재고 변경 시 상품 전체 재고를 자동으로 재계산하는 트리거 함수입니다.';

-- ----------------------------------------------------------------------------
-- 4. 트리거 생성 (기존 트리거가 있으면 삭제 후 재생성)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_update_product_inventory ON product_options;

CREATE TRIGGER trigger_update_product_inventory
AFTER INSERT OR UPDATE OF values ON product_options
FOR EACH ROW
EXECUTE FUNCTION update_product_total_inventory();

COMMENT ON TRIGGER trigger_update_product_inventory ON product_options IS 'product_options의 values 컬럼이 변경될 때마다 products.inventory를 자동 업데이트합니다.';

-- ----------------------------------------------------------------------------
-- 5. 인덱스 추가 (성능 최적화)
-- ----------------------------------------------------------------------------
-- product_options의 product_id에 인덱스 (이미 FK로 있을 수 있음)
CREATE INDEX IF NOT EXISTS idx_product_options_product_id
ON product_options(product_id);

-- products의 inventory에 인덱스 (재고 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_products_inventory
ON products(inventory) WHERE inventory >= 0;

-- ----------------------------------------------------------------------------
-- 6. 재고 재계산 헬퍼 함수 (관리자용 - 데이터 동기화)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalculate_all_product_inventories()
RETURNS TABLE(product_id UUID, old_inventory INTEGER, new_inventory INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH updated AS (
    UPDATE products p
    SET inventory = calculate_total_inventory(p.id)
    WHERE EXISTS (
      SELECT 1 FROM product_options WHERE product_id = p.id
    )
    RETURNING p.id, p.inventory AS old_inv, calculate_total_inventory(p.id) AS new_inv
  )
  SELECT
    updated.id,
    updated.old_inv,
    updated.new_inv
  FROM updated;
END;
$$;

COMMENT ON FUNCTION recalculate_all_product_inventories IS '모든 상품의 재고를 재계산합니다. 데이터 불일치 해결용 관리자 함수입니다.';

-- ----------------------------------------------------------------------------
-- 7. 테스트 데이터 검증 함수
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_option_inventory_data()
RETURNS TABLE(
  product_id UUID,
  product_title TEXT,
  product_inventory INTEGER,
  calculated_inventory INTEGER,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.inventory,
    calculate_total_inventory(p.id),
    (p.inventory = calculate_total_inventory(p.id)) AS is_valid
  FROM products p
  WHERE EXISTS (
    SELECT 1 FROM product_options WHERE product_id = p.id
  )
  ORDER BY is_valid, p.title;
END;
$$;

COMMENT ON FUNCTION validate_option_inventory_data IS '상품 재고와 옵션별 재고 합계가 일치하는지 검증합니다.';

-- ============================================================================
-- 함수 실행 권한 설정
-- ============================================================================

-- authenticated 사용자에게 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION update_option_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_total_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_all_product_inventories TO authenticated;
GRANT EXECUTE ON FUNCTION validate_option_inventory_data TO authenticated;

-- anon 사용자에게는 읽기 전용 함수만 허용
GRANT EXECUTE ON FUNCTION calculate_total_inventory TO anon;
GRANT EXECUTE ON FUNCTION validate_option_inventory_data TO anon;

-- ============================================================================
-- 설치 완료 메시지
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ 옵션별 재고 관리 시스템 RPC 함수 설치 완료!';
  RAISE NOTICE '';
  RAISE NOTICE '생성된 함수:';
  RAISE NOTICE '  1. update_option_inventory() - 옵션별 재고 업데이트';
  RAISE NOTICE '  2. calculate_total_inventory() - 전체 재고 계산';
  RAISE NOTICE '  3. update_product_total_inventory() - 트리거 함수';
  RAISE NOTICE '  4. recalculate_all_product_inventories() - 재고 재계산';
  RAISE NOTICE '  5. validate_option_inventory_data() - 데이터 검증';
  RAISE NOTICE '';
  RAISE NOTICE '생성된 트리거:';
  RAISE NOTICE '  - trigger_update_product_inventory (product_options)';
  RAISE NOTICE '';
  RAISE NOTICE '생성된 인덱스:';
  RAISE NOTICE '  - idx_product_options_product_id';
  RAISE NOTICE '  - idx_products_inventory';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계: API 함수 추가 (lib/supabaseApi.js)';
END $$;
