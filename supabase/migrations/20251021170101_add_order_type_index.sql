-- ⚡ order_type 컬럼에 GIN 인덱스 추가 (LIKE 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_orders_order_type_gin ON orders USING gin(order_type gin_trgm_ops);

-- ✅ user_id 인덱스도 추가 (Auth 사용자용)
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- ✅ created_at 인덱스 (정렬 최적화)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ✅ status 인덱스 (필터링 최적화)
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
