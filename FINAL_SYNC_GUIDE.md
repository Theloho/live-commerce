# 🔄 최종 동기화 가이드 (Final Data Sync)

**목적**: 도메인 전환 직전 신규 데이터 동기화
**타이밍**: Day 7 새벽 2시 (트래픽 최소)
**소요 시간**: 30분 - 1시간

---

## 📋 전체 프로세스

### 타임라인

```
01:00 - 준비 시작
01:30 - 기존 사이트 점검 모드
01:35 - 신규 데이터 추출
01:45 - 새 DB에 삽입
01:55 - 데이터 검증
02:00 - 도메인 전환
02:05 - 서비스 재개
```

---

## Step 1: 체크포인트 확인 (01:00)

### 1-1. Day 1 백업 시점 확인

```sql
-- Day 1에 기록한 체크포인트
SELECT * FROM sync_checkpoint;

-- 결과 예시:
-- table_name | last_timestamp
-- -----------|------------------------
-- orders     | 2025-11-18 10:00:00+00
-- profiles   | 2025-11-18 10:00:00+00
-- products   | 2025-11-18 10:00:00+00
```

**이 시각 이후의 데이터만 동기화!**

---

## Step 2: 점검 모드 활성화 (01:30)

### 2-1. Vercel 환경 변수 설정

```bash
# 기존 사이트 점검 모드
vercel env add MAINTENANCE_MODE true --project live-commerce
vercel --prod
```

### 2-2. Middleware 적용

```javascript
// middleware.js
export function middleware(request) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>서비스 점검 중</title>
        <meta charset="utf-8">
        <style>
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: sans-serif;
            background: #f5f5f5;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #333; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔧 서비스 업데이트 중입니다</h1>
          <p>더 나은 서비스 제공을 위해 잠시 점검 중입니다.</p>
          <p>약 30분 후 정상화될 예정입니다.</p>
          <p>불편을 드려 죄송합니다.</p>
        </div>
      </body>
      </html>
    `, {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': '1800'  // 30분
      }
    })
  }
}
```

---

## Step 3: 신규 데이터 추출 (01:35)

### 3-1. 신규 프로필 (회원)

```sql
-- 기존 DB에서 실행
COPY (
  SELECT * FROM profiles
  WHERE created_at > '2025-11-18 10:00:00+00'
  ORDER BY created_at
) TO '/tmp/new_profiles.csv' WITH CSV HEADER;
```

### 3-2. 신규 주문

```sql
-- 주문 마스터
COPY (
  SELECT * FROM orders
  WHERE created_at > '2025-11-18 10:00:00+00'
  ORDER BY created_at
) TO '/tmp/new_orders.csv' WITH CSV HEADER;

-- 주문 상품
COPY (
  SELECT oi.* FROM order_items oi
  INNER JOIN orders o ON oi.order_id = o.id
  WHERE o.created_at > '2025-11-18 10:00:00+00'
  ORDER BY oi.created_at
) TO '/tmp/new_order_items.csv' WITH CSV HEADER;

-- 배송 정보
COPY (
  SELECT os.* FROM order_shipping os
  INNER JOIN orders o ON os.order_id = o.id
  WHERE o.created_at > '2025-11-18 10:00:00+00'
) TO '/tmp/new_order_shipping.csv' WITH CSV HEADER;

-- 결제 정보
COPY (
  SELECT op.* FROM order_payments op
  INNER JOIN orders o ON op.order_id = o.id
  WHERE o.created_at > '2025-11-18 10:00:00+00'
) TO '/tmp/new_order_payments.csv' WITH CSV HEADER;
```

### 3-3. 신규 상품 (있는 경우)

```sql
COPY (
  SELECT * FROM products
  WHERE created_at > '2025-11-18 10:00:00+00'
  ORDER BY created_at
) TO '/tmp/new_products.csv' WITH CSV HEADER;

COPY (
  SELECT pv.* FROM product_variants pv
  INNER JOIN products p ON pv.product_id = p.id
  WHERE p.created_at > '2025-11-18 10:00:00+00'
) TO '/tmp/new_product_variants.csv' WITH CSV HEADER;
```

### 3-4. 재고 변동

```sql
-- Day 1 시점 재고 (백업에서)
CREATE TEMP TABLE stock_snapshot_day1 AS
SELECT id, stock_quantity FROM products;

-- 현재 재고
CREATE TEMP TABLE stock_current AS
SELECT id, stock_quantity FROM products;

-- 변동량 계산
COPY (
  SELECT
    c.id,
    c.stock_quantity AS current_stock,
    COALESCE(s.stock_quantity, 0) AS day1_stock,
    c.stock_quantity - COALESCE(s.stock_quantity, 0) AS diff
  FROM stock_current c
  LEFT JOIN stock_snapshot_day1 s ON c.id = s.id
  WHERE c.stock_quantity != COALESCE(s.stock_quantity, 0)
) TO '/tmp/stock_changes.csv' WITH CSV HEADER;
```

### 3-5. 쿠폰 발급/사용

```sql
COPY (
  SELECT * FROM user_coupons
  WHERE created_at > '2025-11-18 10:00:00+00'
  ORDER BY created_at
) TO '/tmp/new_user_coupons.csv' WITH CSV HEADER;
```

### 3-6. 장바구니 변경

```sql
COPY (
  SELECT * FROM cart_items
  WHERE created_at > '2025-11-18 10:00:00+00'
  OR updated_at > '2025-11-18 10:00:00+00'
) TO '/tmp/new_cart_items.csv' WITH CSV HEADER;
```

---

## Step 4: 테스트 데이터 삭제 (01:40)

### 4-1. 새 DB에서 테스트 주문 삭제

```sql
-- 새 DB에서 실행
-- 테스트 주문 삭제
DELETE FROM order_items
WHERE order_id IN (
  SELECT id FROM orders
  WHERE customer_order_number LIKE 'TEST-%'
);

DELETE FROM order_shipping
WHERE order_id IN (
  SELECT id FROM orders
  WHERE customer_order_number LIKE 'TEST-%'
);

DELETE FROM order_payments
WHERE order_id IN (
  SELECT id FROM orders
  WHERE customer_order_number LIKE 'TEST-%'
);

DELETE FROM orders
WHERE customer_order_number LIKE 'TEST-%';
```

---

## Step 5: 신규 데이터 삽입 (01:45)

### 5-1. 순서 중요! (FK 제약 때문)

```bash
# 1. 프로필 먼저 (FK: orders.user_id → profiles.id)
psql $NEW_DATABASE_URL <<EOF
\COPY profiles FROM '/tmp/new_profiles.csv' WITH CSV HEADER;
EOF

# 2. 상품 (FK: order_items.product_id → products.id)
psql $NEW_DATABASE_URL <<EOF
\COPY products FROM '/tmp/new_products.csv' WITH CSV HEADER;
\COPY product_variants FROM '/tmp/new_product_variants.csv' WITH CSV HEADER;
EOF

# 3. 주문 마스터
psql $NEW_DATABASE_URL <<EOF
\COPY orders FROM '/tmp/new_orders.csv' WITH CSV HEADER;
EOF

# 4. 주문 세부 정보
psql $NEW_DATABASE_URL <<EOF
\COPY order_items FROM '/tmp/new_order_items.csv' WITH CSV HEADER;
\COPY order_shipping FROM '/tmp/new_order_shipping.csv' WITH CSV HEADER;
\COPY order_payments FROM '/tmp/new_order_payments.csv' WITH CSV HEADER;
EOF

# 5. 쿠폰
psql $NEW_DATABASE_URL <<EOF
\COPY user_coupons FROM '/tmp/new_user_coupons.csv' WITH CSV HEADER;
EOF

# 6. 장바구니 (UPSERT 필요)
psql $NEW_DATABASE_URL <<EOF
-- 기존 장바구니 항목 삭제 후 재삽입
DELETE FROM cart_items
WHERE user_id IN (
  SELECT DISTINCT user_id FROM cart_items_new
);

\COPY cart_items FROM '/tmp/new_cart_items.csv' WITH CSV HEADER;
EOF
```

### 5-2. 재고 조정

```sql
-- 재고 변동 반영
UPDATE products p
SET stock_quantity = p.stock_quantity + sc.diff
FROM (
  SELECT id, diff FROM stock_changes
) sc
WHERE p.id = sc.id;

-- Variant 재고도 동일
UPDATE product_variants pv
SET stock_quantity = pv.stock_quantity + vsc.diff
FROM (
  SELECT id, diff FROM variant_stock_changes
) vsc
WHERE pv.id = vsc.id;
```

---

## Step 6: 데이터 검증 (01:55)

### 6-1. 개수 확인

```sql
-- 새 DB에서 실행
SELECT
  'profiles' AS table_name,
  COUNT(*) AS new_db_count,
  (SELECT COUNT(*) FROM profiles WHERE created_at <= '2025-11-18 10:00:00') AS day1_count,
  (SELECT COUNT(*) FROM profiles WHERE created_at > '2025-11-18 10:00:00') AS synced_count
UNION ALL
SELECT
  'orders',
  COUNT(*),
  (SELECT COUNT(*) FROM orders WHERE created_at <= '2025-11-18 10:00:00'),
  (SELECT COUNT(*) FROM orders WHERE created_at > '2025-11-18 10:00:00')
UNION ALL
SELECT
  'products',
  COUNT(*),
  (SELECT COUNT(*) FROM products WHERE created_at <= '2025-11-18 10:00:00'),
  (SELECT COUNT(*) FROM products WHERE created_at > '2025-11-18 10:00:00');

-- 예상 결과:
-- table_name | new_db_count | day1_count | synced_count
-- -----------|--------------|------------|-------------
-- profiles   | 1050         | 1000       | 50
-- orders     | 2150         | 2000       | 150
-- products   | 520          | 500        | 20
```

**기존 DB와 비교:**
```sql
-- 기존 DB에서 실행
SELECT COUNT(*) FROM profiles;  -- 1050 (일치!)
SELECT COUNT(*) FROM orders;    -- 2150 (일치!)
SELECT COUNT(*) FROM products;  -- 520 (일치!)
```

### 6-2. 고아 데이터 체크

```sql
-- 주문 상품 중 주문이 없는 것
SELECT COUNT(*) FROM order_items
WHERE order_id NOT IN (SELECT id FROM orders);
-- 결과: 0 (없어야 정상!)

-- 주문 중 사용자가 없는 것 (카카오 제외)
SELECT COUNT(*) FROM orders
WHERE user_id IS NOT NULL
  AND user_id NOT IN (SELECT id FROM profiles);
-- 결과: 0 (없어야 정상!)
```

### 6-3. 재고 음수 체크

```sql
-- 재고가 음수인 상품 (문제!)
SELECT id, title, stock_quantity
FROM products
WHERE stock_quantity < 0;

SELECT pv.id, pv.sku, pv.stock_quantity, p.title
FROM product_variants pv
INNER JOIN products p ON pv.product_id = p.id
WHERE pv.stock_quantity < 0;

-- 결과: 0건 (없어야 정상!)
-- 있다면 재고 동기화 오류 → 수동 조정 필요
```

### 6-4. 최신 주문 확인

```sql
-- 최신 주문 10건
SELECT
  customer_order_number,
  total_amount,
  status,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- 기존 DB와 비교 (일치해야 함!)
```

---

## Step 7: 도메인 전환 (02:00)

### 7-1. Vercel 도메인 설정

**구 프로젝트 (live-commerce):**
```
Vercel Dashboard > live-commerce > Settings > Domains
yourdomain.com 제거
```

**신 프로젝트 (live-commerce-v2):**
```
Vercel Dashboard > live-commerce-v2 > Settings > Domains
Add Domain: yourdomain.com
```

### 7-2. DNS 전파 확인

```bash
# DNS 전파 확인 (1-5분)
dig yourdomain.com

# 또는
nslookup yourdomain.com

# Vercel IP 확인
# 76.76.21.21 (Vercel)
```

---

## Step 8: 서비스 재개 (02:05)

### 8-1. 점검 모드 해제

```bash
# 신 프로젝트에서 점검 모드 비활성화
vercel env rm MAINTENANCE_MODE --project live-commerce-v2
```

### 8-2. 최종 확인

```bash
# 1. 홈페이지 접속
curl -I https://yourdomain.com

# 2. API 응답 확인
curl https://yourdomain.com/api/products

# 3. 로그인 테스트
# 브라우저에서 실제 로그인

# 4. 주문 생성 테스트
# 소액 테스트 주문 (1,000원)

# 5. 신 DB에 저장 확인
psql $NEW_DATABASE_URL -c "
  SELECT * FROM orders
  ORDER BY created_at DESC
  LIMIT 1
"
```

### 8-3. 에러 모니터링

```bash
# Vercel 로그 실시간 확인
vercel logs --follow --project live-commerce-v2

# Supabase 로그
# Dashboard > Database > Logs
# Dashboard > API > Logs
```

---

## 🚨 문제 발생 시 롤백

### 긴급 롤백 (5분 안에)

```bash
# 1. 신 프로젝트 도메인 제거
# Vercel Dashboard > live-commerce-v2 > Settings > Domains
# yourdomain.com 제거

# 2. 구 프로젝트 도메인 재설정
# Vercel Dashboard > live-commerce > Settings > Domains
# yourdomain.com 추가

# 3. 점검 모드 해제
vercel env rm MAINTENANCE_MODE --project live-commerce

# 4. DNS 전파 대기 (1-5분)

# 5. 서비스 정상화 확인
```

**⚠️ 주의:** 롤백 후 신 DB의 테스트 주문은 손실!

---

## 📊 체크리스트

### 사전 준비
- [ ] Day 1 체크포인트 확인
- [ ] 백업 스크립트 준비
- [ ] 테스트 주문 식별 방법 확인

### 동기화 실행
- [ ] 점검 모드 활성화 (01:30)
- [ ] 신규 데이터 추출 (01:35)
- [ ] 테스트 데이터 삭제 (01:40)
- [ ] 신규 데이터 삽입 (01:45)
- [ ] 재고 조정 (01:50)

### 검증
- [ ] 데이터 개수 일치 확인 (01:55)
- [ ] 고아 데이터 체크
- [ ] 재고 음수 체크
- [ ] 최신 주문 확인

### 전환
- [ ] Vercel 도메인 설정 (02:00)
- [ ] DNS 전파 확인 (02:05)
- [ ] 점검 모드 해제 (02:05)
- [ ] 최종 서비스 확인 (02:10)

### 모니터링
- [ ] 에러 로그 확인 (지속)
- [ ] 주문 생성 확인 (지속)
- [ ] 고객 문의 대응 (지속)

---

## 🎯 자동화 스크립트

```bash
#!/bin/bash
# final-sync.sh

set -e

CHECKPOINT_DATE="2025-11-18 10:00:00+00"
OLD_DB=$PROD_DATABASE_URL
NEW_DB=$NEW_DATABASE_URL

echo "🔄 최종 동기화 시작: $(date)"

# 1. 점검 모드
echo "🔒 점검 모드 활성화"
vercel env add MAINTENANCE_MODE true --project live-commerce

# 2. 신규 데이터 추출
echo "📦 신규 데이터 추출 중..."
psql $OLD_DB -c "
  COPY (SELECT * FROM profiles WHERE created_at > '$CHECKPOINT_DATE')
  TO '/tmp/new_profiles.csv' WITH CSV HEADER;

  COPY (SELECT * FROM orders WHERE created_at > '$CHECKPOINT_DATE')
  TO '/tmp/new_orders.csv' WITH CSV HEADER;

  -- ... (모든 테이블)
"

# 3. 테스트 데이터 삭제
echo "🗑️  테스트 데이터 삭제 중..."
psql $NEW_DB -c "
  DELETE FROM orders WHERE customer_order_number LIKE 'TEST-%';
"

# 4. 신규 데이터 삽입
echo "➕ 신규 데이터 삽입 중..."
psql $NEW_DB <<EOF
\COPY profiles FROM '/tmp/new_profiles.csv' WITH CSV HEADER;
\COPY orders FROM '/tmp/new_orders.csv' WITH CSV HEADER;
-- ... (모든 테이블)
EOF

# 5. 검증
echo "✅ 데이터 검증 중..."
psql $NEW_DB -c "
  SELECT COUNT(*) FROM orders;
"

echo "✅ 최종 동기화 완료: $(date)"
echo "👉 이제 수동으로 도메인 전환하세요!"
```

**실행:**
```bash
chmod +x final-sync.sh
./final-sync.sh
```

---

**작성자**: Claude
**최종 업데이트**: 2025-11-18
**버전**: 1.0
