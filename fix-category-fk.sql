-- products.category_id에 외래 키 추가

-- 1. 먼저 기존 FK가 있으면 삭제 (에러 방지)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'products_category_id_fkey'
        AND table_name = 'products'
    ) THEN
        ALTER TABLE products DROP CONSTRAINT products_category_id_fkey;
        RAISE NOTICE 'Dropped existing FK: products_category_id_fkey';
    END IF;
END $$;

-- 2. category_id 컬럼이 없으면 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE products ADD COLUMN category_id UUID;
        RAISE NOTICE 'Added column: category_id';
    ELSE
        RAISE NOTICE 'Column category_id already exists';
    END IF;
END $$;

-- 3. 외래 키 추가
ALTER TABLE products
ADD CONSTRAINT products_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES categories(id)
ON DELETE SET NULL;

-- 4. 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- 5. 확인
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'products'
AND tc.constraint_type = 'FOREIGN KEY';

SELECT '✅ products.category_id FK 추가 완료!' AS result;
