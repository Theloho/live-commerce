-- Migration: orders.order_type 인덱스 추가
-- Purpose: LIKE '%KAKAO:xxx%' 쿼리 최적화
-- Author: Claude
-- Date: 2025-10-23
-- Issue: 504 Gateway Timeout - LIKE 쿼리 full table scan

-- ============================================================
-- 1. GIN 인덱스 (pattern matching 최적화)
-- ============================================================

-- pg_trgm 확장 활성화 (이미 있으면 무시)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- orders.order_type에 GIN 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_orders_order_type_gin
ON orders
USING gin(order_type gin_trgm_ops);

-- ============================================================
-- 2. status 컬럼 인덱스 (pending/verifying 조회 최적화)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(status);

-- ============================================================
-- 3. Composite 인덱스 (status + order_type 조합 쿼리 최적화)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_status_order_type
ON orders(status, order_type);

-- ============================================================
-- 4. 주석
-- ============================================================

COMMENT ON INDEX idx_orders_order_type_gin IS
'LIKE 쿼리 최적화: order_type LIKE ''%KAKAO:xxx%''';

COMMENT ON INDEX idx_orders_status IS
'status 필터 최적화: pending/verifying';

COMMENT ON INDEX idx_orders_status_order_type IS
'복합 쿼리 최적화: status + order_type';
