-- Migration: Add group_order_index and parent_order_id to orders table
-- Purpose: 대표 주문 명시 + Phase 3 합배 준비
-- Date: 2025-10-29
-- Author: Claude
-- Related: WORK_LOG_2025-10-29.md - Phase 1 통합 마이그레이션

-- =====================================================
-- Step 1: 컬럼 추가
-- =====================================================

-- group_order_index: 그룹 내 순서 (0 = 대표 주문)
-- - 1건 단독 주문: 0 (자기 자신이 대표)
-- - N건 일괄결제: 0, 1, 2, ... (첫 번째가 대표)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS group_order_index INTEGER DEFAULT 0 NOT NULL;

-- parent_order_id: 합배 시 대표 주문 참조 (Phase 3)
-- - NULL = 독립 주문 또는 그룹 대표 주문
-- - NOT NULL = 다른 주문에 합배됨
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES orders(id) DEFAULT NULL;

-- =====================================================
-- Step 2: 인덱스 추가 (성능 최적화)
-- =====================================================

-- parent_order_id 인덱스 (합배 조회 시)
CREATE INDEX IF NOT EXISTS idx_orders_parent_order_id
ON orders(parent_order_id)
WHERE parent_order_id IS NOT NULL;

-- payment_group_id + group_order_index 복합 인덱스 (대표 주문 조회 시)
CREATE INDEX IF NOT EXISTS idx_orders_group_index
ON orders(payment_group_id, group_order_index)
WHERE payment_group_id IS NOT NULL;

-- =====================================================
-- Step 3: 기존 일괄결제 주문 데이터 업데이트 (선택사항)
-- =====================================================
-- 목적: 기존 주문도 group_order_index를 가지도록 (데이터 정합성)
-- created_at 기준으로 정렬하여 index 부여

DO $$
BEGIN
  -- payment_group_id가 있는 주문들에 대해서만 업데이트
  WITH ranked_orders AS (
    SELECT
      id,
      payment_group_id,
      ROW_NUMBER() OVER (
        PARTITION BY payment_group_id
        ORDER BY created_at
      ) - 1 as idx
    FROM orders
    WHERE payment_group_id IS NOT NULL
  )
  UPDATE orders
  SET group_order_index = ranked_orders.idx
  FROM ranked_orders
  WHERE orders.id = ranked_orders.id;

  RAISE NOTICE 'Updated group_order_index for existing orders';
END $$;

-- =====================================================
-- Step 4: 검증 쿼리 (마이그레이션 확인)
-- =====================================================

-- 컬럼 추가 확인
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders'
    AND column_name = 'group_order_index'
  ) THEN
    RAISE NOTICE '✅ group_order_index 컬럼 추가 성공';
  ELSE
    RAISE EXCEPTION '❌ group_order_index 컬럼 추가 실패';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders'
    AND column_name = 'parent_order_id'
  ) THEN
    RAISE NOTICE '✅ parent_order_id 컬럼 추가 성공';
  ELSE
    RAISE EXCEPTION '❌ parent_order_id 컬럼 추가 실패';
  END IF;
END $$;

-- 인덱스 확인
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_orders_parent_order_id'
  ) THEN
    RAISE NOTICE '✅ idx_orders_parent_order_id 인덱스 생성 성공';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_orders_group_index'
  ) THEN
    RAISE NOTICE '✅ idx_orders_group_index 인덱스 생성 성공';
  END IF;
END $$;

-- 기존 데이터 업데이트 결과 확인 (샘플)
DO $$
DECLARE
  group_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT payment_group_id)
  INTO group_count
  FROM orders
  WHERE payment_group_id IS NOT NULL;

  RAISE NOTICE '업데이트된 일괄결제 그룹 개수: %', group_count;
END $$;

-- =====================================================
-- Rollback Script (필요 시)
-- =====================================================
-- DROP INDEX IF EXISTS idx_orders_parent_order_id;
-- DROP INDEX IF EXISTS idx_orders_group_index;
-- ALTER TABLE orders DROP COLUMN IF EXISTS parent_order_id;
-- ALTER TABLE orders DROP COLUMN IF EXISTS group_order_index;
