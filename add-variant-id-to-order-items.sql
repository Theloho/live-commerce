-- order_items 테이블에 variant_id 컬럼 추가

-- 1. variant_id 컬럼 추가 (이미 있으면 스킵)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'order_items' AND column_name = 'variant_id'
    ) THEN
        ALTER TABLE order_items ADD COLUMN variant_id UUID;
        RAISE NOTICE 'Added column: variant_id';
    ELSE
        RAISE NOTICE 'Column variant_id already exists';
    END IF;
END $$;

-- 2. 외래 키 추가 (옵션 - variant 삭제 시 NULL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'order_items_variant_id_fkey'
        AND table_name = 'order_items'
    ) THEN
        ALTER TABLE order_items
        ADD CONSTRAINT order_items_variant_id_fkey
        FOREIGN KEY (variant_id)
        REFERENCES product_variants(id)
        ON DELETE SET NULL;
        RAISE NOTICE 'Added FK: order_items_variant_id_fkey';
    ELSE
        RAISE NOTICE 'FK order_items_variant_id_fkey already exists';
    END IF;
END $$;

-- 3. 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);

-- 4. 확인
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'order_items'
AND tc.constraint_type = 'FOREIGN KEY'
AND kcu.column_name = 'variant_id';

SELECT '✅ order_items.variant_id 추가 완료!' AS result;
