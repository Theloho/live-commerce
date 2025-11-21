# 🔄 증분 동기화 가이드 (Incremental Sync)

**목적**: 테스트 환경에서 개발 후 운영 환경 덮어쓰기 시 신규 데이터 보존
**시나리오**: 테스트 중 실제 주문이 계속 들어오는 경우

---

## 📋 전체 프로세스

### Step 1: 백업 시점 기록 (T0)

```sql
-- 1. 현재 시각 기록
SELECT NOW() AS backup_timestamp;
-- 결과: 2025-11-18 14:00:00+00

-- 2. 각 테이블의 현재 최대 ID 기록
CREATE TABLE sync_checkpoint (
  table_name TEXT PRIMARY KEY,
  last_id UUID,
  last_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 주요 테이블 체크포인트 저장
INSERT INTO sync_checkpoint (table_name, last_id, last_timestamp)
SELECT 'orders', MAX(id), MAX(created_at) FROM orders;

INSERT INTO sync_checkpoint (table_name, last_id, last_timestamp)
SELECT 'profiles', MAX(id), MAX(created_at) FROM profiles;

INSERT INTO sync_checkpoint (table_name, last_id, last_timestamp)
SELECT 'products', MAX(id), MAX(created_at) FROM products;
```

**💾 체크포인트를 별도 파일로 저장:**
```bash
psql $DATABASE_URL -c "SELECT * FROM sync_checkpoint" > checkpoint_T0.txt
```

---

### Step 2: 운영 DB → 테스트 환경 복사

```bash
# 전체 덤프
pg_dump $PROD_DATABASE_URL > prod_backup_T0.sql

# 테스트 환경에 복원
psql $TEST_DATABASE_URL < prod_backup_T0.sql
```

---

### Step 3: 테스트 환경에서 개발 (2-3일)

**⚠️ 이 시간 동안 운영 환경은 계속 운영됨!**
- 실제 주문 계속 발생
- 신규 회원 가입
- 상품 재고 변동

---

### Step 4: 신규 데이터 추출 (덮어쓰기 직전)

#### 4.1 신규 주문 추출

```sql
-- T0 이후 생성된 주문
COPY (
  SELECT * FROM orders
  WHERE created_at > (
    SELECT last_timestamp FROM sync_checkpoint WHERE table_name = 'orders'
  )
  ORDER BY created_at
) TO '/tmp/new_orders.csv' WITH CSV HEADER;

-- 신규 주문의 order_items
COPY (
  SELECT oi.* FROM order_items oi
  INNER JOIN orders o ON oi.order_id = o.id
  WHERE o.created_at > (
    SELECT last_timestamp FROM sync_checkpoint WHERE table_name = 'orders'
  )
  ORDER BY oi.created_at
) TO '/tmp/new_order_items.csv' WITH CSV HEADER;

-- 신규 주문의 배송 정보
COPY (
  SELECT os.* FROM order_shipping os
  INNER JOIN orders o ON os.order_id = o.id
  WHERE o.created_at > (
    SELECT last_timestamp FROM sync_checkpoint WHERE table_name = 'orders'
  )
) TO '/tmp/new_order_shipping.csv' WITH CSV HEADER;

-- 신규 주문의 결제 정보
COPY (
  SELECT op.* FROM order_payments op
  INNER JOIN orders o ON op.order_id = o.id
  WHERE o.created_at > (
    SELECT last_timestamp FROM sync_checkpoint WHERE table_name = 'orders'
  )
) TO '/tmp/new_order_payments.csv' WITH CSV HEADER;
```

#### 4.2 신규 회원 추출

```sql
COPY (
  SELECT * FROM profiles
  WHERE created_at > (
    SELECT last_timestamp FROM sync_checkpoint WHERE table_name = 'profiles'
  )
  ORDER BY created_at
) TO '/tmp/new_profiles.csv' WITH CSV HEADER;
```

#### 4.3 재고 변동 추출

```sql
-- 상품 재고 변동
CREATE TEMP TABLE stock_changes AS
SELECT
  p_new.id,
  p_new.stock_quantity AS new_stock,
  p_old.stock_quantity AS old_stock,
  p_new.stock_quantity - p_old.stock_quantity AS diff
FROM products p_new
INNER JOIN products_backup_T0 p_old ON p_new.id = p_old.id
WHERE p_new.stock_quantity != p_old.stock_quantity;

-- Variant 재고 변동
CREATE TEMP TABLE variant_stock_changes AS
SELECT
  v_new.id,
  v_new.stock_quantity AS new_stock,
  v_old.stock_quantity AS old_stock,
  v_new.stock_quantity - v_old.stock_quantity AS diff
FROM product_variants v_new
INNER JOIN product_variants_backup_T0 v_old ON v_new.id = v_old.id
WHERE v_new.stock_quantity != v_old.stock_quantity;
```

#### 4.4 신규 쿠폰 발급/사용 추출

```sql
-- 신규 쿠폰 발급
COPY (
  SELECT * FROM user_coupons
  WHERE created_at > (
    SELECT last_timestamp FROM sync_checkpoint WHERE table_name = 'orders'
  )
  ORDER BY created_at
) TO '/tmp/new_user_coupons.csv' WITH CSV HEADER;
```

---

### Step 5: 운영 환경 점검 모드 (10분)

```javascript
// Vercel 환경 변수로 점검 모드 활성화
MAINTENANCE_MODE=true

// middleware.js
export function middleware(request) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return new Response('서비스 업데이트 중입니다. 잠시만 기다려주세요.', {
      status: 503
    })
  }
}
```

---

### Step 6: 테스트 환경 → 운영 환경 덮어쓰기

```bash
# 1. 운영 DB 최종 백업 (안전장치)
pg_dump $PROD_DATABASE_URL > prod_final_backup_before_overwrite.sql

# 2. 운영 DB 초기화 + 테스트 환경 데이터 복원
psql $PROD_DATABASE_URL <<EOF
-- 모든 데이터 삭제 (스키마는 유지)
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE products CASCADE;
-- ... (모든 테이블)
EOF

# 3. 테스트 환경 데이터 덤프
pg_dump $TEST_DATABASE_URL --data-only > test_data.sql

# 4. 운영 환경에 삽입
psql $PROD_DATABASE_URL < test_data.sql
```

---

### Step 7: 신규 데이터 재삽입 (중요!)

```bash
# 7.1 신규 프로필 먼저 (FK 제약 때문에)
psql $PROD_DATABASE_URL <<EOF
\COPY profiles FROM '/tmp/new_profiles.csv' WITH CSV HEADER;
EOF

# 7.2 신규 주문
psql $PROD_DATABASE_URL <<EOF
\COPY orders FROM '/tmp/new_orders.csv' WITH CSV HEADER;
\COPY order_items FROM '/tmp/new_order_items.csv' WITH CSV HEADER;
\COPY order_shipping FROM '/tmp/new_order_shipping.csv' WITH CSV HEADER;
\COPY order_payments FROM '/tmp/new_order_payments.csv' WITH CSV HEADER;
EOF

# 7.3 재고 변동 반영
psql $PROD_DATABASE_URL <<EOF
-- 상품 재고 조정
UPDATE products p
SET stock_quantity = p.stock_quantity + sc.diff
FROM stock_changes sc
WHERE p.id = sc.id;

-- Variant 재고 조정
UPDATE product_variants pv
SET stock_quantity = pv.stock_quantity + vsc.diff
FROM variant_stock_changes vsc
WHERE pv.id = vsc.id;
EOF

# 7.4 신규 쿠폰
psql $PROD_DATABASE_URL <<EOF
\COPY user_coupons FROM '/tmp/new_user_coupons.csv' WITH CSV HEADER;
EOF
```

---

### Step 8: 데이터 검증

```sql
-- 8.1 주문 개수 확인
SELECT
  (SELECT COUNT(*) FROM orders) AS total_orders,
  (SELECT COUNT(*) FROM orders WHERE created_at <= '2025-11-18 14:00:00') AS old_orders,
  (SELECT COUNT(*) FROM orders WHERE created_at > '2025-11-18 14:00:00') AS new_orders;

-- 8.2 회원 수 확인
SELECT COUNT(*) FROM profiles;

-- 8.3 재고 음수 체크 (문제 확인)
SELECT id, title, stock_quantity
FROM products
WHERE stock_quantity < 0;

SELECT pv.id, pv.sku, pv.stock_quantity, p.title
FROM product_variants pv
INNER JOIN products p ON pv.product_id = p.id
WHERE pv.stock_quantity < 0;

-- 8.4 고아 데이터 체크
SELECT COUNT(*) FROM order_items
WHERE order_id NOT IN (SELECT id FROM orders);
-- 결과: 0이어야 함!
```

---

### Step 9: 서비스 재개

```bash
# Vercel 환경 변수 제거
MAINTENANCE_MODE=false

# 배포
vercel --prod
```

---

## 🚨 주의사항

### 1. ID 충돌 가능성

**문제:**
```
테스트 환경: 새 주문 ID = abc-123
동시에
운영 환경:  새 주문 ID = abc-123  (같은 ID!)

덮어쓰면 충돌!
```

**해결:**
```sql
-- UUID는 충돌 확률이 극히 낮지만, 안전을 위해 체크
SELECT id, COUNT(*)
FROM (
  SELECT id FROM orders_test
  UNION ALL
  SELECT id FROM orders_prod
) AS combined
GROUP BY id
HAVING COUNT(*) > 1;
```

### 2. 재고 음수 방지

**문제:**
```
테스트 환경: 재고 100개
운영 환경:  실제 판매 50개 → 재고 50개

덮어쓰면: 재고 100개로 복원 (잘못됨!)
신규 주문 재삽입: 재고 -50개 차감
최종: 50개 (정확!)
```

**검증:**
```sql
-- 재고 음수 체크
SELECT * FROM products WHERE stock_quantity < 0;
SELECT * FROM product_variants WHERE stock_quantity < 0;

-- 음수가 있다면 데이터 불일치!
```

### 3. 쿠폰 중복 사용

**문제:**
```
테스트 환경: 쿠폰 A 미사용
운영 환경:  쿠폰 A 사용됨 (신규 주문)

덮어쓰면: 쿠폰 A 미사용으로 리셋
신규 주문 재삽입: 쿠폰 A 사용 기록 복원

최종: 정확!
```

### 4. 결제 정보 민감 데이터

**⚠️ 매우 중요!**
```sql
-- 결제 정보는 절대 테스트 환경으로 복사하지 말 것!
-- 개인정보 보호법 위반!

-- 테스트 환경 복사 시 마스킹
UPDATE order_payments
SET
  card_number = 'MASKED',
  card_holder = 'MASKED';

UPDATE profiles
SET
  phone = REGEXP_REPLACE(phone, '\d{4}$', '****'),
  email = REGEXP_REPLACE(email, '^(.{3}).*(@.*)', '\1***\2');
```

---

## 🎯 완전 자동화 스크립트

```bash
#!/bin/bash
# incremental-sync.sh

set -e  # 에러 시 중단

echo "🚀 증분 동기화 시작"

# 1. 신규 데이터 추출
echo "📦 신규 데이터 추출 중..."
psql $PROD_DATABASE_URL -f extract_new_data.sql

# 2. 점검 모드 활성화
echo "🔒 점검 모드 활성화"
vercel env add MAINTENANCE_MODE true

# 3. 최종 백업
echo "💾 최종 백업 중..."
pg_dump $PROD_DATABASE_URL > final_backup_$(date +%Y%m%d_%H%M%S).sql

# 4. 덮어쓰기
echo "🔄 데이터 덮어쓰기 중..."
psql $PROD_DATABASE_URL -f truncate_all.sql
pg_dump $TEST_DATABASE_URL --data-only | psql $PROD_DATABASE_URL

# 5. 신규 데이터 재삽입
echo "➕ 신규 데이터 재삽입 중..."
psql $PROD_DATABASE_URL -f insert_new_data.sql

# 6. 검증
echo "✅ 데이터 검증 중..."
psql $PROD_DATABASE_URL -f validate_data.sql

# 7. 서비스 재개
echo "🎉 서비스 재개"
vercel env rm MAINTENANCE_MODE
vercel --prod

echo "✅ 완료!"
```

---

## 📊 예상 다운타임

```
Step 5: 점검 모드 활성화     - 0분
Step 6: 덮어쓰기             - 5분 (데이터 크기에 따라)
Step 7: 신규 데이터 재삽입   - 2분
Step 8: 검증                - 1분
Step 9: 배포                - 2분
-----------------------------------
총 다운타임:                ~10분
```

---

## 🎯 결론

**증분 동기화는:**
- ✅ 신규 데이터 보존
- ✅ 다운타임 최소화 (10분)
- ✅ 안전함 (검증 단계 포함)
- ⚠️ 복잡함 (자동화 스크립트 필요)

**추천:** 자동화 스크립트를 만들어두고 리허설 필수!
