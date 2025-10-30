-- =====================================================
-- 동시성 테스트 SQL (Supabase SQL Editor에서 실행)
-- =====================================================

-- 1️⃣ 테스트용 상품 생성 (재고 1개)
INSERT INTO products (id, title, product_number, price, inventory, thumbnail_url)
VALUES (
  gen_random_uuid(),
  'Lock Test Product',
  'TEST-LOCK-001',
  10000,
  1,  -- 재고 1개!
  'https://via.placeholder.com/400'
)
RETURNING id, title, inventory;

-- 위에서 반환된 ID를 복사 → 아래 YOUR_PRODUCT_ID에 붙여넣기

-- =====================================================
-- 2️⃣ 동시성 시뮬레이션 (2개 트랜잭션)
-- =====================================================

-- 🪟 Tab 1: Transaction A (성공해야 함)
BEGIN;
SELECT update_inventory_with_lock(
  'YOUR_PRODUCT_ID'::UUID,
  -1
);
-- ⏰ 여기서 10초 대기 (커밋하지 말고!)
-- 그 동안 Tab 2 실행 →
COMMIT;

-- =====================================================

-- 🪟 Tab 2: Transaction B (실패해야 함)
-- Tab 1이 대기 중일 때 이것을 실행!
SELECT update_inventory_with_lock(
  'YOUR_PRODUCT_ID'::UUID,
  -1
);
-- 예상 결과: ERROR - concurrent_update: 다른 고객이 구매 중입니다

-- =====================================================
-- 3️⃣ 결과 확인
-- =====================================================

-- 재고 확인 (0이어야 함)
SELECT id, title, inventory
FROM products
WHERE product_number = 'TEST-LOCK-001';

-- =====================================================
-- 4️⃣ 정리 (테스트 후)
-- =====================================================

DELETE FROM products WHERE product_number = 'TEST-LOCK-001';
