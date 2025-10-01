-- 발주서 다운로드 이력 추적 테이블 생성
-- 업체별로 어떤 주문들이 언제 다운로드되었는지 기록

-- 1. purchase_order_batches 테이블 생성
CREATE TABLE IF NOT EXISTS purchase_order_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    download_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    order_ids UUID[] NOT NULL, -- 포함된 주문 ID 배열
    adjusted_quantities JSONB, -- 수량 조정 내역 {order_item_id: adjusted_quantity}
    total_items INT NOT NULL, -- 총 아이템 수
    total_amount INT NOT NULL, -- 총 발주 금액
    status VARCHAR(20) DEFAULT 'completed', -- completed, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255) -- 다운로드한 관리자 이메일
);

-- 2. 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_purchase_order_batches_supplier
ON purchase_order_batches(supplier_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_batches_date
ON purchase_order_batches(download_date DESC);

-- 3. GIN 인덱스 추가 (order_ids 배열 검색 성능)
CREATE INDEX IF NOT EXISTS idx_purchase_order_batches_order_ids
ON purchase_order_batches USING GIN(order_ids);

-- 4. 코멘트 추가
COMMENT ON TABLE purchase_order_batches IS '발주서 다운로드 이력 추적';
COMMENT ON COLUMN purchase_order_batches.order_ids IS '해당 발주서에 포함된 주문 ID 배열';
COMMENT ON COLUMN purchase_order_batches.adjusted_quantities IS '수량 조정 내역 (order_item_id: 조정된 수량)';
COMMENT ON COLUMN purchase_order_batches.status IS 'completed: 발주 완료, cancelled: 취소됨';

-- 5. 확인
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_order_batches'
ORDER BY ordinal_position;

SELECT '✅ purchase_order_batches 테이블 생성 완료!' AS result;
