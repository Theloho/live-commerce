-- =========================================
-- 주문 상태별 타임스탬프 컬럼 추가
-- =========================================
-- 목적: 각 주문 상태 변경 시점을 정확히 기록
-- 영향: orders 테이블에 4개의 새 컬럼 추가 (NULL 허용, 기존 데이터 영향 없음)

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS verifying_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 컬럼 설명 추가
COMMENT ON COLUMN orders.verifying_at IS '결제 확인중 상태로 변경된 시간';
COMMENT ON COLUMN orders.paid_at IS '결제 완료 상태로 변경된 시간';
COMMENT ON COLUMN orders.delivered_at IS '발송 완료 상태로 변경된 시간';
COMMENT ON COLUMN orders.cancelled_at IS '주문 취소된 시간';

-- 인덱스 추가 (상태별 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_orders_verifying_at ON orders(verifying_at) WHERE verifying_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at) WHERE paid_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at) WHERE delivered_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at ON orders(cancelled_at) WHERE cancelled_at IS NOT NULL;

-- 마이그레이션 완료 확인
SELECT
    'orders 테이블 타임스탬프 컬럼 추가 완료' as message,
    COUNT(*) as total_orders
FROM orders;
