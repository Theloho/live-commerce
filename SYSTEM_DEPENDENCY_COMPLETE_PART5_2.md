# SYSTEM_DEPENDENCY_COMPLETE_PART5_2 - DB 테이블 수정 시나리오

**작성일**: 2025-10-20
**버전**: 1.0
**목적**: DB 테이블 수정 시 영향받는 모든 요소를 체크리스트로 관리

---

## 📋 목차

### Section 1: orders 테이블 수정 시나리오
- 1.1 컬럼 추가
- 1.2 컬럼 삭제
- 1.3 컬럼 타입 변경
- 1.4 마이그레이션 작성

### Section 2: order_items 테이블 수정 시나리오
- 2.1 컬럼 추가
- 2.2 컬럼 삭제
- 2.3 중복 컬럼 처리

### Section 3: order_payments 테이블 수정 시나리오
- 3.1 컬럼 추가
- 3.2 결제 수단 추가

### Section 4: order_shipping 테이블 수정 시나리오
- 4.1 컬럼 추가
- 4.2 배송 상태 추가

### Section 5: products 테이블 수정 시나리오
- 5.1 컬럼 추가
- 5.2 성능 최적화

### Section 6: product_variants 테이블 수정 시나리오
- 6.1 재고 관리 로직 변경
- 6.2 SKU 생성 로직 변경

### Section 7: profiles 테이블 수정 시나리오
- 7.1 컬럼 추가
- 7.2 Kakao 사용자 통합

### Section 8: coupons / user_coupons 테이블 수정 시나리오
- 8.1 쿠폰 타입 추가
- 8.2 쿠폰 조건 추가

### Section 9: RLS 정책 수정 시나리오
- 9.1 SELECT 정책 수정
- 9.2 INSERT/UPDATE/DELETE 정책 추가
- 9.3 Service Role API 전환

### Section 10: DB 인덱스 수정 시나리오
- 10.1 인덱스 추가
- 10.2 복합 인덱스 생성
- 10.3 GIN 인덱스 생성

---

## Section 1: orders 테이블 수정 시나리오

### 📌 개요
- **테이블 목적**: 주문 정보 저장
- **현재 상태**: Part 2 Section 1 참조
- **핵심 컬럼**: id, customer_order_number, user_id, order_type, total_amount, discount_amount, is_free_shipping, status
- **INSERT 위치**: 3곳 (주문 생성 API, 직접 구매, 장바구니)
- **SELECT 위치**: 8곳 (주문 목록, 주문 상세, 관리자 3곳)
- **UPDATE 위치**: 4곳 (상태 변경, 수량 변경, 취소)

### 🔍 현재 상태 (Part 2에서 확인)
```sql
-- Part 2 Section 1 참조
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_order_number TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  order_type TEXT,  -- 'direct:KAKAO:123456', 'cart:KAKAO:123456:timestamp'
  total_amount DECIMAL(12,2),
  discount_amount DECIMAL(12,2),
  is_free_shipping BOOLEAN DEFAULT false,
  status TEXT,  -- 'pending', 'verifying', 'deposited', 'shipped', 'delivered', 'cancelled'
  payment_group_id UUID,  -- 일괄결제용
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 1.1 컬럼 추가 시나리오

#### 📋 컬럼 추가 전 체크리스트

- [ ] **1. 컬럼 필요성 확인**
  - 왜 이 컬럼이 필요한가?
  - 기존 컬럼으로 해결 불가능한가?
  - 중복 저장이 아닌가? (정규화 위반?)

- [ ] **2. 컬럼 명세 정의**
  ```sql
  -- 예: point_discount 컬럼 추가
  ALTER TABLE orders
  ADD COLUMN point_discount DECIMAL(12,2) DEFAULT 0 NOT NULL;
  ```
  - 컬럼명: point_discount (명확한 이름)
  - 타입: DECIMAL(12,2) (금액은 항상 DECIMAL)
  - 기본값: 0 (NULL 허용? NOT NULL?)
  - 제약조건: CHECK (point_discount >= 0)

- [ ] **3. Part 2 Section 1에서 영향 확인**
  - INSERT 위치 3곳 → 모두 새 컬럼 포함해야 하는가?
  - SELECT 위치 8곳 → 모두 새 컬럼 조회해야 하는가?
  - UPDATE 위치 4곳 → 새 컬럼 업데이트 필요한가?

- [ ] **4. Part 1에서 중앙 함수 영향 확인**
  - calculateFinalOrderAmount() 수정 필요?
  - breakdown 객체에 포함 필요?

- [ ] **5. Part 3에서 API 영향 확인**
  - POST /api/orders/create → 새 컬럼 저장?
  - GET /api/orders/list → 새 컬럼 조회?

- [ ] **6. Part 4에서 페이지 영향 확인**
  - /checkout → UI에 표시?
  - /orders → 주문 목록에 표시?
  - /orders/[id]/complete → 주문 상세에 표시?

- [ ] **7. RLS 정책 영향 확인**
  - SELECT 정책: 새 컬럼 조회 가능?
  - INSERT 정책: 새 컬럼 저장 가능?
  - UPDATE 정책: 새 컬럼 업데이트 가능?

#### 🔧 마이그레이션 작성 체크리스트

- [ ] **8. 마이그레이션 파일 생성**
  ```bash
  # 파일명: supabase/migrations/20251020_add_point_discount_to_orders.sql
  ```

- [ ] **9. 마이그레이션 스크립트 작성**
  ```sql
  -- 20251020_add_point_discount_to_orders.sql

  -- 1. 컬럼 추가
  ALTER TABLE orders
  ADD COLUMN point_discount DECIMAL(12,2) DEFAULT 0 NOT NULL
  CHECK (point_discount >= 0);

  -- 2. 기존 데이터 처리 (필요 시)
  UPDATE orders
  SET point_discount = 0
  WHERE point_discount IS NULL;

  -- 3. 인덱스 추가 (필요 시)
  CREATE INDEX idx_orders_point_discount ON orders(point_discount);

  -- 4. 주석 추가
  COMMENT ON COLUMN orders.point_discount IS '포인트 할인 금액 (2025-10-20 추가)';
  ```

- [ ] **10. RLS 정책 업데이트** (필요 시)
  ```sql
  -- SELECT 정책에 point_discount 포함되는지 확인
  -- UPDATE 정책에서 point_discount 수정 가능한지 확인
  ```

- [ ] **11. 롤백 스크립트 작성**
  ```sql
  -- rollback.sql
  ALTER TABLE orders DROP COLUMN IF EXISTS point_discount;
  ```

#### ✅ 마이그레이션 후 검증 체크리스트

- [ ] **12. 로컬 DB 적용**
  ```bash
  supabase migration up
  ```

- [ ] **13. 스키마 확인**
  ```sql
  \d orders
  -- point_discount 컬럼 존재하는지 확인
  ```

- [ ] **14. INSERT 테스트**
  ```sql
  INSERT INTO orders (id, total_amount, point_discount, ...)
  VALUES (gen_random_uuid(), 10000, 1000, ...);
  ```

- [ ] **15. SELECT 테스트**
  ```sql
  SELECT id, total_amount, point_discount FROM orders LIMIT 1;
  ```

- [ ] **16. UPDATE 테스트**
  ```sql
  UPDATE orders SET point_discount = 500 WHERE id = '...';
  ```

- [ ] **17. 코드 수정 - INSERT 위치 3곳**
  - `/app/api/orders/create/route.js` (line 190-194)
    ```javascript
    const { data: order } = await supabaseAdmin
      .from('orders')
      .insert({
        ...
        point_discount: pointDiscount || 0
      })
    ```
  - 다른 2곳도 동일하게 수정

- [ ] **18. 코드 수정 - SELECT 위치 8곳**
  - `/app/api/orders/list/route.js`
    ```javascript
    .select(`
      *,
      order_items(*)
    `)
    // point_discount는 *에 포함됨
    ```

- [ ] **19. 코드 수정 - UI 표시**
  - `/app/checkout/page.js` - 포인트 입력 UI 추가
  - `/app/orders/[id]/complete/page.js` - 포인트 할인 표시
    ```jsx
    {orderData.point_discount > 0 && (
      <div>
        <span>포인트 할인</span>
        <span>-₩{orderData.point_discount.toLocaleString()}</span>
      </div>
    )}
    ```

- [ ] **20. E2E 테스트**
  - 체크아웃 → 포인트 입력 → 주문 생성 → DB 저장 확인
  - 주문 완료 페이지 → 포인트 할인 표시 확인
  - 주문 목록 → 포인트 할인 표시 확인

- [ ] **21. 프로덕션 배포**
  ```bash
  git add supabase/migrations/20251020_add_point_discount_to_orders.sql
  git commit -m "feat: orders 테이블에 point_discount 컬럼 추가"
  git push
  ```

- [ ] **22. Supabase Dashboard 마이그레이션**
  - Supabase Dashboard → Database → Migrations
  - 마이그레이션 SQL 실행

- [ ] **23. 문서 업데이트**
  - Part 2 Section 1 - orders 테이블 스키마 업데이트
  - Part 5-2 Section 1.1 - 과거 사례에 추가

---

### 1.2 컬럼 삭제 시나리오

#### 📋 컬럼 삭제 전 체크리스트

- [ ] **1. 컬럼 사용처 확인** (Part 2 Section 1)
  - INSERT 위치: 어디서 이 컬럼을 저장하는가?
  - SELECT 위치: 어디서 이 컬럼을 조회하는가?
  - UPDATE 위치: 어디서 이 컬럼을 수정하는가?

- [ ] **2. 모든 사용처 제거**
  - INSERT 코드 모두 제거
  - SELECT 코드 모두 제거
  - UPDATE 코드 모두 제거
  - UI 표시 코드 모두 제거

- [ ] **3. 다른 테이블 의존성 확인**
  - FOREIGN KEY로 참조하는 테이블 있는가?
  - JOIN에서 사용하는가?

- [ ] **4. 백업 필요성 확인**
  - 이 컬럼 데이터를 보관해야 하는가?
  - 다른 테이블로 마이그레이션 필요?

#### 🔧 마이그레이션 작성 체크리스트

- [ ] **5. 백업 (필요 시)**
  ```sql
  -- 백업 테이블 생성
  CREATE TABLE orders_backup_20251020 AS
  SELECT id, deleted_column FROM orders;
  ```

- [ ] **6. 컬럼 삭제**
  ```sql
  ALTER TABLE orders DROP COLUMN IF EXISTS deleted_column;
  ```

- [ ] **7. 관련 인덱스 삭제**
  ```sql
  DROP INDEX IF EXISTS idx_orders_deleted_column;
  ```

#### ✅ 마이그레이션 후 검증 체크리스트

- [ ] **8. 스키마 확인**
  ```sql
  \d orders
  -- deleted_column 없는지 확인
  ```

- [ ] **9. 전체 애플리케이션 테스트**
  - 주문 생성 정상 작동?
  - 주문 조회 에러 없음?

- [ ] **10. 문서 업데이트**
  - Part 2 Section 1 - 삭제된 컬럼 제거

---

### 1.3 컬럼 타입 변경 시나리오

#### 📋 컬럼 타입 변경 전 체크리스트

- [ ] **1. 변경 이유 확인**
  - 왜 타입을 변경해야 하는가?
  - 데이터 손실 가능성은?

- [ ] **2. 기존 데이터 호환성 확인**
  - TEXT → INTEGER: 변환 가능한 데이터인가?
  - VARCHAR(50) → VARCHAR(100): 안전한 변경
  - DECIMAL(10,2) → DECIMAL(12,2): 안전한 변경
  - INTEGER → TEXT: 항상 가능

- [ ] **3. 애플리케이션 코드 영향 확인**
  - 타입 캐스팅 필요?
  - 검증 로직 변경 필요?

#### 🔧 마이그레이션 작성 체크리스트

- [ ] **4. 안전한 타입 변경**
  ```sql
  -- 예: total_amount DECIMAL(10,2) → DECIMAL(12,2)
  ALTER TABLE orders
  ALTER COLUMN total_amount TYPE DECIMAL(12,2);
  ```

- [ ] **5. 위험한 타입 변경 (데이터 변환 필요)**
  ```sql
  -- 예: order_type TEXT → INTEGER (위험!)
  -- Step 1: 새 컬럼 추가
  ALTER TABLE orders ADD COLUMN order_type_new INTEGER;

  -- Step 2: 데이터 변환
  UPDATE orders SET order_type_new = CAST(order_type AS INTEGER);

  -- Step 3: 기존 컬럼 삭제
  ALTER TABLE orders DROP COLUMN order_type;

  -- Step 4: 컬럼 이름 변경
  ALTER TABLE orders RENAME COLUMN order_type_new TO order_type;
  ```

#### ✅ 마이그레이션 후 검증 체크리스트

- [ ] **6. 데이터 검증**
  ```sql
  SELECT * FROM orders WHERE total_amount IS NULL;  -- NULL 체크
  SELECT * FROM orders LIMIT 10;  -- 샘플 확인
  ```

- [ ] **7. 애플리케이션 테스트**
  - 주문 생성/조회/수정 모두 정상 작동?

- [ ] **8. 문서 업데이트**
  - Part 2 Section 1 - 타입 변경 기록

---

### 1.4 마이그레이션 작성 Best Practices

#### 📌 마이그레이션 파일 명명 규칙
```
supabase/migrations/YYYYMMDD_HHMMSS_description.sql

예:
20251020_101530_add_point_discount_to_orders.sql
20251020_141200_remove_deprecated_columns.sql
20251020_180000_add_rls_policies_for_orders.sql
```

#### 📌 마이그레이션 템플릿
```sql
-- 20251020_description.sql
-- 작성자: Claude
-- 목적: orders 테이블에 XXX 추가

-- ============================================
-- Step 1: 스키마 변경
-- ============================================
ALTER TABLE orders
ADD COLUMN new_column TEXT;

-- ============================================
-- Step 2: 기존 데이터 처리 (필요 시)
-- ============================================
UPDATE orders
SET new_column = 'default_value'
WHERE new_column IS NULL;

-- ============================================
-- Step 3: 제약조건 추가 (필요 시)
-- ============================================
ALTER TABLE orders
ADD CONSTRAINT check_new_column CHECK (new_column IN ('value1', 'value2'));

-- ============================================
-- Step 4: 인덱스 추가 (필요 시)
-- ============================================
CREATE INDEX idx_orders_new_column ON orders(new_column);

-- ============================================
-- Step 5: RLS 정책 업데이트 (필요 시)
-- ============================================
-- (Section 9 참조)

-- ============================================
-- Step 6: 주석 추가
-- ============================================
COMMENT ON COLUMN orders.new_column IS '설명 (2025-10-20 추가)';
```

#### 🐛 과거 버그 사례

**사례 1: discount_amount 컬럼 추가 시 RLS UPDATE 정책 누락 (2025-10-04)**
- **증상**: PATCH 요청 204 성공하지만 DB에 저장 안 됨
- **원인**:
  - ALTER TABLE로 컬럼 추가 완료
  - 하지만 RLS UPDATE 정책에 discount_amount 포함 안 함
  - Anon Key로 UPDATE 시도 → RLS 차단 → 0 rows updated
- **해결**: RLS UPDATE 정책 수정 마이그레이션 추가
  ```sql
  -- 기존 정책 삭제
  DROP POLICY IF EXISTS "Users can update their own orders" ON orders;

  -- 새 정책 생성 (discount_amount 포함)
  CREATE POLICY "Users can update their own orders" ON orders
  FOR UPDATE USING (auth.uid() = user_id OR is_admin(auth.uid()));
  ```
- **재발 방지**: 컬럼 추가 시 RLS 정책도 함께 확인 필수!

**사례 2: is_free_shipping 컬럼 추가 시 기본값 누락 (2025-10-16)**
- **증상**: 기존 주문 조회 시 is_free_shipping = null
- **원인**: ALTER TABLE에 DEFAULT 설정 안 함
- **해결**:
  ```sql
  ALTER TABLE orders
  ADD COLUMN is_free_shipping BOOLEAN DEFAULT false NOT NULL;

  -- 기존 데이터 업데이트
  UPDATE orders SET is_free_shipping = false WHERE is_free_shipping IS NULL;
  ```
- **재발 방지**: 새 컬럼 추가 시 항상 DEFAULT 및 NOT NULL 설정

**사례 3: customer_order_number G/S 구분 제거 시 영향도 분석 부족 (2025-10-15)**
- **증상**: UI에서 G 접두사 제거했는데 검색 기능 깨짐
- **원인**:
  - DB에는 S251015-XXXX 저장
  - UI에서 동적으로 G251015-XXXX 표시
  - 검색 시 G 주문번호로 검색 → 매칭 실패
- **해결**: G/S 구분 완전 제거, DB 저장값 그대로 표시
- **재발 방지**:
  - UI 로직 변경 시 검색/필터링 기능 영향 확인 필수
  - DB 저장값과 UI 표시값을 일치시킬 것

#### 📚 크로스 레퍼런스

- **Part 2 Section 1**: orders 테이블 스키마 및 사용처
- **Part 1 Section 1.1**: calculateFinalOrderAmount() (total_amount 계산)
- **Part 3 Section 1.1**: POST /api/orders/create (INSERT)
- **Part 3 Section 2**: POST /api/orders/list (SELECT)
- **Part 3 Section 3**: PATCH /api/orders/update-status (UPDATE)
- **Part 4 Section 2**: /checkout 페이지 (주문 생성)
- **Part 4 Section 5**: /orders 페이지 (주문 목록)
- **Part 5-1 Section 1.1**: calculateFinalOrderAmount() 수정 시나리오
- **Part 5-2 Section 9**: RLS 정책 수정 시나리오

---

## Section 2: order_items 테이블 수정 시나리오

### 📌 개요
- **테이블 목적**: 주문 상품 목록 저장
- **현재 상태**: Part 2 Section 2 참조
- **핵심 컬럼**: id, order_id, product_id, variant_id, title, price, unit_price, quantity, total, total_price
- **⚠️ 중복 컬럼 주의**: price/unit_price, total/total_price → 양쪽 모두 저장!
- **INSERT 위치**: 2곳 (주문 생성 API)
- **SELECT 위치**: 8곳 (주문 조회 시 항상 JOIN)
- **UPDATE 위치**: 2곳 (수량 변경, 재고 관리)

### 🔍 현재 상태 (Part 2에서 확인)
```sql
-- Part 2 Section 2 참조
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  selected_options JSONB,  -- {"색상": "빨강", "사이즈": "L"}

  -- ⚠️ 중복 컬럼 (양쪽 모두 저장!)
  price DECIMAL(12,2),
  unit_price DECIMAL(12,2),
  quantity INTEGER NOT NULL,
  total DECIMAL(12,2),
  total_price DECIMAL(12,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 2.1 컬럼 추가 시나리오

#### 📋 컬럼 추가 전 체크리스트

- [ ] **1. 컬럼 필요성 확인**
  - 예: `supplier_price` (매입가) 컬럼 추가

- [ ] **2. Part 2 Section 2에서 영향 확인**
  - INSERT 위치 2곳 확인
  - SELECT 위치 8곳 확인

- [ ] **3. 중복 컬럼 패턴 확인** ⚠️ 중요!
  - 새 컬럼이 기존 컬럼과 유사한가?
  - 예: supplier_price vs cost_price
  - **양쪽 모두 저장하는가? 아니면 하나만?**

- [ ] **4. 마이그레이션 작성**
  ```sql
  ALTER TABLE order_items
  ADD COLUMN supplier_price DECIMAL(12,2) DEFAULT 0 NOT NULL;

  COMMENT ON COLUMN order_items.supplier_price IS '매입가 (발주서용, 2025-10-20 추가)';
  ```

#### ✅ 마이그레이션 후 검증 체크리스트

- [ ] **5. INSERT 코드 수정** (2곳)
  - `/app/api/orders/create/route.js`
    ```javascript
    const orderItems = items.map(item => ({
      ...
      supplier_price: item.supplier_price || 0
    }))
    ```

- [ ] **6. SELECT 코드 확인** (8곳)
  - 새 컬럼이 필요한 곳만 SELECT에 추가
  - 또는 `SELECT *` 사용 중이면 자동 포함

- [ ] **7. UI 표시 확인**
  - 관리자 페이지에서 매입가 표시 필요?

- [ ] **8. 문서 업데이트**
  - Part 2 Section 2 업데이트

---

### 2.2 컬럼 삭제 시나리오

#### 📋 컬럼 삭제 전 체크리스트

- [ ] **1. 삭제 가능한가 확인** ⚠️ 신중!
  - 중복 컬럼 패턴인가? (price vs unit_price)
  - **양쪽 중 하나만 삭제하면 안 됨!**
  - 사용처 모두 확인 후 결정

- [ ] **2. 사용처 제거** (Part 2 Section 2 참조)
  - INSERT 2곳
  - SELECT 8곳
  - UPDATE 2곳

- [ ] **3. 마이그레이션 작성**
  ```sql
  -- ⚠️ 중복 컬럼 삭제 시 양쪽 모두 삭제하거나, 양쪽 모두 유지!
  -- 절대 한쪽만 삭제하지 말 것!

  -- 잘못된 예:
  ALTER TABLE order_items DROP COLUMN price;
  -- unit_price는 남음 → 혼란!

  -- 올바른 예:
  -- price/unit_price 양쪽 모두 유지
  -- 또는 양쪽 모두 삭제하고 새로운 하나의 컬럼으로 통합
  ```

---

### 2.3 중복 컬럼 처리 시나리오

#### 📌 개요
order_items 테이블의 중복 컬럼 패턴:
- `price` ⇄ `unit_price` (단가)
- `total` ⇄ `total_price` (합계)

**현재 전략**: **양쪽 모두 저장** (DB_REFERENCE_GUIDE.md 6.1절)

#### 📋 중복 컬럼 유지 체크리스트

- [ ] **1. 양쪽 모두 저장 확인**
  - INSERT 시 price = unit_price = 상품 단가
  - INSERT 시 total = total_price = 상품 단가 × 수량

- [ ] **2. 조회 시 우선순위 확인**
  ```javascript
  // 조회 시 price 우선, unit_price 폴백
  const itemPrice = item.price || item.unit_price || 0
  const itemTotal = item.total_price || item.total || 0
  ```

- [ ] **3. INSERT 코드 패턴**
  ```javascript
  const orderItems = items.map(item => ({
    ...
    price: item.price,
    unit_price: item.price,  // 같은 값 저장
    quantity: item.quantity,
    total: item.totalPrice,
    total_price: item.totalPrice  // 같은 값 저장
  }))
  ```

#### 🐛 과거 버그 사례

**사례 1: price만 저장하고 unit_price 누락 (2025-10-05)**
- **증상**: 관리자 페이지에서 상품 단가 0원 표시
- **원인**:
  - INSERT 시 price만 저장
  - 관리자 페이지는 unit_price 사용
  - unit_price = NULL → 0원 표시
- **해결**: 양쪽 모두 저장하도록 수정
- **재발 방지**: **DB_REFERENCE_GUIDE.md 6.1절 필수 확인!**

**사례 2: 중복 컬럼 하나만 삭제 시도 (2025-10-06)**
- **증상**: price 컬럼 삭제 후 체크아웃 페이지 깨짐
- **원인**:
  - ALTER TABLE DROP COLUMN price 실행
  - 하지만 일부 코드는 price 사용
- **해결**: 마이그레이션 롤백, price 컬럼 복원
- **재발 방지**: 중복 컬럼은 **양쪽 모두 유지** 또는 **양쪽 모두 삭제**

#### 📚 크로스 레퍼런스

- **Part 2 Section 2**: order_items 테이블 스키마 (중복 컬럼 패턴)
- **DB_REFERENCE_GUIDE.md 6.1절**: 중복 컬럼 처리 규칙
- **Part 3 Section 1.1**: POST /api/orders/create (INSERT 패턴)
- **Part 4 Section 2**: /checkout 페이지 (주문 생성)
- **Part 4 Section 13**: /admin/orders/[id] 페이지 (관리자 조회)

---

## Section 3: order_payments 테이블 수정 시나리오

### 📌 개요
- **테이블 목적**: 주문 결제 정보 저장
- **현재 상태**: Part 2 Section 3 참조
- **핵심 컬럼**: id, order_id, method, amount, status, depositor_name
- **INSERT 위치**: 2곳 (주문 생성 API, 결제 완료 API)
- **SELECT 위치**: 8곳 (주문 조회 시 항상 JOIN)
- **UPDATE 위치**: 2곳 (결제 상태 변경, 입금자명 변경)

### 🔍 현재 상태 (Part 2에서 확인)
```sql
-- Part 2 Section 3 참조
CREATE TABLE order_payments (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT,  -- 'bank_transfer', 'card', 'kakaopay'
  amount DECIMAL(12,2) NOT NULL,
  status TEXT,  -- 'pending', 'completed', 'failed'
  depositor_name TEXT,  -- 입금자명 (무통장 입금 시)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 3.1 컬럼 추가 시나리오

#### 📋 컬럼 추가 전 체크리스트

- [ ] **1. 컬럼 필요성 확인**
  - 예: `transaction_id` (결제 거래 ID) 컬럼 추가
  - 예: `paid_at` (결제 완료 시각) 컬럼 추가

- [ ] **2. Part 2 Section 3에서 영향 확인**
  - INSERT 위치 2곳
  - SELECT 위치 8곳
  - UPDATE 위치 2곳

- [ ] **3. 마이그레이션 작성**
  ```sql
  ALTER TABLE order_payments
  ADD COLUMN transaction_id TEXT,
  ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;

  CREATE INDEX idx_order_payments_transaction_id ON order_payments(transaction_id);
  ```

#### ✅ 마이그레이션 후 검증 체크리스트

- [ ] **4. INSERT 코드 수정**
  - `/app/api/orders/create/route.js`
    ```javascript
    const payment = {
      ...
      transaction_id: paymentResult.transaction_id,
      paid_at: paymentResult.paid_at
    }
    ```

- [ ] **5. UI 표시 확인**
  - 주문 상세 페이지에 거래 ID 표시

- [ ] **6. 문서 업데이트**
  - Part 2 Section 3 업데이트

---

### 3.2 결제 수단 추가 시나리오

#### 📋 결제 수단 추가 전 체크리스트

- [ ] **1. 새로운 결제 수단 정의**
  - 예: `toss` (토스페이) 추가
  - method 컬럼에 'toss' 값 추가

- [ ] **2. CHECK 제약조건 수정** (있다면)
  ```sql
  ALTER TABLE order_payments
  DROP CONSTRAINT IF EXISTS check_payment_method;

  ALTER TABLE order_payments
  ADD CONSTRAINT check_payment_method
  CHECK (method IN ('bank_transfer', 'card', 'kakaopay', 'toss'));
  ```

- [ ] **3. 코드 수정**
  - 결제 수단 선택 UI 추가
  - 결제 로직 추가
  - 결제 수수료 계산 추가 (필요 시)

#### ✅ 마이그레이션 후 검증 체크리스트

- [ ] **4. 결제 수단 테스트**
  - 새로운 결제 수단으로 주문 생성
  - DB에 'toss' 저장 확인

- [ ] **5. UI 확인**
  - 체크아웃: 토스페이 선택 가능
  - 주문 상세: 결제 수단 정확히 표시

- [ ] **6. 문서 업데이트**
  - Part 2 Section 3 업데이트

---

## Section 4: order_shipping 테이블 수정 시나리오

### 📌 개요
- **테이블 목적**: 주문 배송 정보 저장
- **현재 상태**: Part 2 Section 4 참조
- **핵심 컬럼**: id, order_id, recipient_name, phone, address, postal_code, base_shipping_fee, surcharge, total_shipping_fee, tracking_number, tracking_company
- **INSERT 위치**: 2곳 (주문 생성 API)
- **SELECT 위치**: 8곳 (주문 조회 시 항상 JOIN)
- **UPDATE 위치**: 2곳 (배송 정보 변경, 송장 번호 입력)

### 🔍 현재 상태 (Part 2에서 확인)
```sql
-- Part 2 Section 4 참조
CREATE TABLE order_shipping (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  postal_code TEXT,  -- 도서산간 배송비 계산용
  base_shipping_fee DECIMAL(12,2),
  surcharge DECIMAL(12,2),  -- 도서산간 추가 요금
  total_shipping_fee DECIMAL(12,2),
  tracking_number TEXT,  -- 송장 번호
  tracking_company TEXT,  -- 택배사 (2025-10-20 확인)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 4.1 컬럼 추가 시나리오

#### 📋 컬럼 추가 전 체크리스트

- [ ] **1. 컬럼 필요성 확인**
  - 예: `delivery_message` (배송 메시지) 컬럼 추가
  - 예: `shipping_status` (배송 상태) 컬럼 추가

- [ ] **2. Part 2 Section 4에서 영향 확인**
  - INSERT 위치 2곳
  - SELECT 위치 8곳
  - UPDATE 위치 2곳

- [ ] **3. formatShippingInfo() 영향 확인** (Part 1 Section 3.5)
  - 배송비 계산 로직 변경 필요?

- [ ] **4. 마이그레이션 작성**
  ```sql
  ALTER TABLE order_shipping
  ADD COLUMN delivery_message TEXT,
  ADD COLUMN shipping_status TEXT DEFAULT 'pending';

  COMMENT ON COLUMN order_shipping.delivery_message IS '배송 메시지 (2025-10-20 추가)';
  COMMENT ON COLUMN order_shipping.shipping_status IS '배송 상태 (pending, in_transit, delivered)';
  ```

#### ✅ 마이그레이션 후 검증 체크리스트

- [ ] **5. INSERT 코드 수정**
  - `/app/api/orders/create/route.js`
    ```javascript
    const shipping = {
      ...
      delivery_message: shippingInfo.deliveryMessage || '',
      shipping_status: 'pending'
    }
    ```

- [ ] **6. UI 표시 확인**
  - 체크아웃: 배송 메시지 입력란 추가
  - 주문 상세: 배송 메시지 표시

- [ ] **7. 문서 업데이트**
  - Part 2 Section 4 업데이트

---

### 4.2 배송 상태 추가 시나리오

#### 📋 배송 상태 추가 전 체크리스트

- [ ] **1. 배송 상태 정의**
  - pending: 배송 준비 중
  - in_transit: 배송 중
  - delivered: 배송 완료
  - returned: 반품
  - cancelled: 배송 취소

- [ ] **2. CHECK 제약조건 추가**
  ```sql
  ALTER TABLE order_shipping
  ADD CONSTRAINT check_shipping_status
  CHECK (shipping_status IN ('pending', 'in_transit', 'delivered', 'returned', 'cancelled'));
  ```

- [ ] **3. orders.status와 연동**
  - orders.status = 'shipped' → shipping_status = 'in_transit'
  - orders.status = 'delivered' → shipping_status = 'delivered'

#### ✅ 마이그레이션 후 검증 체크리스트

- [ ] **4. 상태 변경 테스트**
  - 송장 번호 입력 → shipping_status = 'in_transit'
  - 배송 완료 → shipping_status = 'delivered'

- [ ] **5. UI 확인**
  - 관리자 배송 관리: 상태 변경 버튼
  - 사용자 주문 상세: 배송 상태 표시

- [ ] **6. 문서 업데이트**
  - Part 2 Section 4 업데이트

---

## Section 5: products 테이블 수정 시나리오

### 📌 개요
- **테이블 목적**: 상품 정보 저장
- **현재 상태**: Part 2 Section 5 참조
- **핵심 컬럼**: id, product_number, title, price, compare_price, thumbnail_url, inventory, status, is_featured, is_live_active
- **⚠️ 주의**: thumbnail_url (O), image_url (X) - 과거 버그 주의!
- **INSERT 위치**: 4곳 (상품 등록 페이지 2곳, 라이브 방송 상품 등록 2곳)
- **SELECT 위치**: 12곳 (홈, 상품 목록, 상품 상세, 관리자 5곳, 라이브 2곳)
- **UPDATE 위치**: 5곳 (상품 수정, 재고 수정, 상태 변경, 라이브 활성화 2곳)

### 🔍 현재 상태 (Part 2에서 확인)
```sql
-- Part 2 Section 5 참조
CREATE TABLE products (
  id UUID PRIMARY KEY,
  product_number TEXT UNIQUE,
  title TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  compare_price DECIMAL(12,2),
  thumbnail_url TEXT,  -- ⚠️ image_url 아님!
  inventory INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,
  is_live_active BOOLEAN DEFAULT false,
  option_count INTEGER DEFAULT 0,  -- Variant 개수
  variant_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 5.1 컬럼 추가 시나리오

#### 📋 컬럼 추가 전 체크리스트

- [ ] **1. 컬럼 필요성 확인**
  - 예: `discount_rate` (할인율) 컬럼 추가
  - 예: `category_id` (카테고리) 컬럼 추가

- [ ] **2. Part 2 Section 5에서 영향 확인**
  - INSERT 위치 4곳
  - SELECT 위치 12곳
  - UPDATE 위치 5곳

- [ ] **3. 홈페이지 성능 영향 확인** ⚠️ 중요!
  - `getProducts()` 함수는 11개 컬럼만 SELECT (Part 1 Section 2.1)
  - 새 컬럼이 홈페이지에 필요한가?
  - 필요하면 SELECT에 추가 → 데이터 전송량 증가
  - 불필요하면 SELECT에 추가하지 말 것 → 성능 유지

- [ ] **4. 마이그레이션 작성**
  ```sql
  ALTER TABLE products
  ADD COLUMN discount_rate DECIMAL(5,2) DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate <= 100);

  COMMENT ON COLUMN products.discount_rate IS '할인율 (%, 2025-10-20 추가)';
  ```

#### ✅ 마이그레이션 후 검증 체크리스트

- [ ] **5. INSERT 코드 수정** (4곳)
  - `/app/admin/products/new/page.js`
  - `/app/admin/products/[id]/page.js`
  - 라이브 방송 상품 등록 2곳

- [ ] **6. SELECT 코드 확인** (12곳)
  - 홈페이지: 필요하면 추가, 불필요하면 생략
  - 관리자 페이지: 추가

- [ ] **7. UI 표시 확인**
  - 상품 카드: 할인율 표시
  - 상품 상세: 할인율 표시

- [ ] **8. 성능 테스트**
  - 홈페이지 로딩 시간 변화 확인
  - 데이터 전송량 변화 확인

- [ ] **9. 문서 업데이트**
  - Part 2 Section 5 업데이트

---

### 5.2 성능 최적화 시나리오

#### 📋 성능 최적화 전 체크리스트

- [ ] **1. 현재 문제 파악**
  - 예: 홈페이지 상품 로딩 10초+ 타임아웃 (2025-10-18)
  - 원인: 4단계 JOIN (product_variants까지)
  - 데이터 전송량: 200KB

- [ ] **2. 최적화 전략 결정**
  - **전략 1**: JOIN 제거
    - product_variants JOIN 제거
    - 필요한 컬럼만 SELECT
  - **전략 2**: 인덱스 추가
    - 자주 조회하는 컬럼에 인덱스
  - **전략 3**: 캐싱 추가
    - ISR (Incremental Static Regeneration)
    - Redis 캐싱

- [ ] **3. Part 1 Section 2.1 확인**
  - getProducts() 함수 현재 쿼리
  - 어떤 JOIN을 제거할 수 있는가?

#### 🔧 최적화 작업 체크리스트

- [ ] **4. 쿼리 간소화**
  ```javascript
  // BEFORE: 4단계 JOIN, SELECT *, 200KB
  .select(`
    *,
    product_variants(
      *,
      variant_option_values(
        *,
        product_option_values(*)
      )
    )
  `)

  // AFTER: JOIN 제거, 11개 컬럼만, 20KB
  .select(`
    id, title, product_number, price, compare_price,
    thumbnail_url, inventory, status, is_featured,
    is_live_active, created_at
  `)
  ```

- [ ] **5. 인덱스 추가** (필요 시)
  ```sql
  CREATE INDEX idx_products_status_featured ON products(status, is_featured);
  CREATE INDEX idx_products_created_at ON products(created_at DESC);
  ```

- [ ] **6. ISR 적용** (Next.js 15)
  ```javascript
  // app/page.js
  export const revalidate = 300  // 5분마다 재생성
  ```

#### ✅ 최적화 후 검증 체크리스트

- [ ] **7. 성능 측정**
  - 쿼리 시간: 10-20초 → 0.5초 (20배 향상)
  - 데이터 전송량: 200KB → 20KB (90% 감소)
  - 타임아웃 에러: 제거

- [ ] **8. 기능 확인**
  - 홈페이지 상품 목록 정상 표시
  - 상품 카드 모든 정보 정확
  - 모바일 즉시 로딩

- [ ] **9. 문서 업데이트**
  - Part 2 Section 5 최적화 기록
  - Part 1 Section 2.1 업데이트

#### 🐛 과거 버그 사례

**사례 1: 홈페이지 모바일 타임아웃 (2025-10-18)**
- **증상**: 모바일(LTE/4G) 첫 로딩 10-20초+ 타임아웃
- **원인**:
  - getProducts() 4단계 JOIN (product_variants까지)
  - 데이터 전송량 200KB
  - 모바일 네트워크 + Supabase Cold Start
- **해결 1단계**: 쿼리 간소화 (커밋 ac7f56c)
  - JOIN 제거, 11개 컬럼만 SELECT
  - 데이터 전송량 90% 감소 (200KB → 20KB)
- **해결 2단계**: ISR 적용 (커밋 fb8b0cd)
  - Server Component로 전환
  - revalidate: 300 (5분마다 재생성)
  - HTML pre-render → 즉시 표시
- **결과**: 모바일 첫 로딩 즉시 표시 ⚡
- **재발 방지**:
  - 홈페이지 쿼리는 최소한으로 유지
  - ProductCard에서 사용하지 않는 데이터는 조회하지 말 것
  - 성능 테스트 필수 (모바일 LTE 환경)

**사례 2: image_url 컬럼 사용 오류 (2025-10-17)**
- **증상**: `column products_2.image_url does not exist` 500 에러
- **원인**:
  - DB에는 thumbnail_url 컬럼만 존재
  - 코드에서 image_url 참조
- **해결**: 모든 image_url → thumbnail_url 변경
- **재발 방지**: **DB_REFERENCE_GUIDE.md 필수 확인!**

#### 📚 크로스 레퍼런스

- **Part 2 Section 5**: products 테이블 스키마
- **Part 1 Section 2.1**: getProducts() 함수 (홈페이지 성능)
- **Part 3 Section 4**: GET /api/admin/products (관리자 상품 목록)
- **Part 4 Section 1**: / (홈페이지)
- **Part 4 Section 10**: /admin/products (관리자 상품 관리)
- **Part 5-2 Section 10**: 인덱스 추가 시나리오

---

## Section 6: product_variants 테이블 수정 시나리오

### 📌 개요
- **테이블 목적**: 상품 옵션별 재고 관리 (SKU 단위)
- **현재 상태**: Part 2 Section 6 참조
- **핵심 컬럼**: id, product_id, sku, inventory, price
- **재고 관리**: `update_variant_inventory` RPC 함수 사용 (FOR UPDATE 락)
- **트리거**: 재고 변경 시 products.inventory 자동 업데이트

### 🔍 현재 상태 (Part 2에서 확인)
```sql
-- Part 2 Section 6 참조
CREATE TABLE product_variants (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE,  -- 예: "상품번호-빨강-L"
  inventory INTEGER DEFAULT 0,
  price DECIMAL(12,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RPC 함수 (재고 관리)
CREATE OR REPLACE FUNCTION update_variant_inventory(
  p_variant_id UUID,
  p_quantity_change INTEGER
)
RETURNS JSONB AS $$
-- FOR UPDATE 락으로 동시성 제어
-- products.inventory도 함께 업데이트
$$ LANGUAGE plpgsql;
```

---

### 6.1 재고 관리 로직 변경 시나리오

#### 📋 재고 관리 로직 변경 전 체크리스트

- [ ] **1. 현재 로직 이해**
  - `update_variant_inventory` RPC 함수 사용
  - FOR UPDATE 락으로 동시성 제어
  - 재고 부족 시 에러 반환
  - products.inventory 자동 업데이트 (트리거)

- [ ] **2. Part 2 Section 6 확인**
  - RPC 함수 호출 위치 4곳
  - 주문 생성, 주문 취소, 재고 수정

- [ ] **3. 변경하려는 로직 정의**
  - 예: 재고 부족 시 부분 주문 허용
  - 예: 재고 예약 시스템 추가
  - 예: 재고 알림 기능 추가

#### 🔧 RPC 함수 수정 체크리스트

- [ ] **4. RPC 함수 백업**
  ```sql
  -- 기존 함수 백업
  CREATE OR REPLACE FUNCTION update_variant_inventory_backup_20251020(...)
  RETURNS JSONB AS $$
  -- 기존 로직
  $$ LANGUAGE plpgsql;
  ```

- [ ] **5. 새로운 RPC 함수 작성**
  ```sql
  CREATE OR REPLACE FUNCTION update_variant_inventory(
    p_variant_id UUID,
    p_quantity_change INTEGER
  )
  RETURNS JSONB AS $$
  DECLARE
    v_variant RECORD;
    v_product_id UUID;
  BEGIN
    -- FOR UPDATE 락
    SELECT * INTO v_variant
    FROM product_variants
    WHERE id = p_variant_id
    FOR UPDATE;

    -- 재고 부족 확인
    IF v_variant.inventory + p_quantity_change < 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', '재고가 부족합니다'
      );
    END IF;

    -- 재고 업데이트
    UPDATE product_variants
    SET inventory = inventory + p_quantity_change
    WHERE id = p_variant_id
    RETURNING product_id INTO v_product_id;

    -- products.inventory도 업데이트 (트리거 or 직접)
    UPDATE products
    SET inventory = (
      SELECT COALESCE(SUM(inventory), 0)
      FROM product_variants
      WHERE product_id = v_product_id
    )
    WHERE id = v_product_id;

    RETURN jsonb_build_object(
      'success', true,
      'variant_id', p_variant_id,
      'old_inventory', v_variant.inventory,
      'new_inventory', v_variant.inventory + p_quantity_change
    );
  END;
  $$ LANGUAGE plpgsql;
  ```

- [ ] **6. 마이그레이션 생성**
  ```sql
  -- 20251020_update_variant_inventory_logic.sql
  ```

#### ✅ RPC 함수 수정 후 검증 체크리스트

- [ ] **7. RPC 함수 테스트**
  ```sql
  -- 재고 감소 테스트
  SELECT update_variant_inventory('variant-uuid', -1);

  -- 재고 부족 테스트
  SELECT update_variant_inventory('variant-uuid', -100);

  -- 재고 증가 테스트 (주문 취소)
  SELECT update_variant_inventory('variant-uuid', 1);
  ```

- [ ] **8. 동시성 테스트**
  - 동시에 2개 주문 생성
  - 재고 정확히 감소하는가?
  - 재고 부족 시 에러 처리

- [ ] **9. products.inventory 동기화 확인**
  - variant 재고 변경 → products.inventory 업데이트?

- [ ] **10. 코드 영향 확인** (4곳)
  - 주문 생성 API: 정상 작동?
  - 주문 취소 API: 재고 복원?

- [ ] **11. 문서 업데이트**
  - Part 2 Section 6 업데이트

#### 🐛 과거 버그 사례

**사례 1: 주문 취소 시 재고 복원 실패 (2025-10-16)**
- **증상**: 주문 취소했는데 재고 복원 안 됨
- **원인**:
  - `updateVariantInventory` RPC는 JSONB 반환 (variant_id, old_inventory, new_inventory)
  - 코드에서 `!result.success` 검증 → 항상 true (result.success 필드 없음)
  - 검증 실패로 판정 → 에러 throw → 재고 복원 중단
- **해결**: 검증 로직 `!result.success` → `!result.variant_id`로 수정
- **재발 방지**: RPC 반환값 구조 정확히 확인!

#### 📚 크로스 레퍼런스

- **Part 2 Section 6**: product_variants 테이블 (RPC 함수 정의)
- **Part 3 Section 1.1**: POST /api/orders/create (재고 감소)
- **Part 3 Section 3**: PATCH /api/orders/update-status (재고 복원)
- **Part 5-1 Section 1.1**: calculateFinalOrderAmount() (재고 검증)

---

### 6.2 SKU 생성 로직 변경 시나리오

#### 📋 SKU 생성 로직 변경 전 체크리스트

- [ ] **1. 현재 로직 이해**
  - SKU 형식: "제품번호-옵션값1-옵션값2"
  - 예: "P001-빨강-L"

- [ ] **2. 변경하려는 로직 정의**
  - 예: 숫자만 사용 (P001-001-002)
  - 예: 해시 사용 (P001-a1b2c3)

#### 🔧 SKU 생성 로직 수정 체크리스트

- [ ] **3. SKU 생성 함수 수정**
  - 관리자 상품 등록 페이지 수정

- [ ] **4. 기존 SKU 마이그레이션**
  - 기존 상품의 SKU도 변경해야 하는가?

#### ✅ SKU 생성 로직 수정 후 검증 체크리스트

- [ ] **5. 새 상품 등록 테스트**
  - 새로운 SKU 형식으로 생성되는가?

- [ ] **6. UNIQUE 제약 확인**
  - SKU 중복 발생하지 않는가?

- [ ] **7. 문서 업데이트**
  - Part 2 Section 6 업데이트

---

## Section 7: profiles 테이블 수정 시나리오

### 📌 개요
- **테이블 목적**: 사용자 프로필 정보 저장
- **현재 상태**: Part 2 Section 7 참조
- **핵심 컬럼**: id, kakao_id, name, phone, address, postal_code, is_admin
- **특징**: Kakao 사용자 + Supabase Auth 사용자 통합

### 🔍 현재 상태 (Part 2에서 확인)
```sql
-- Part 2 Section 7 참조
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,  -- Supabase UUID 또는 'kakao_3782927171'
  kakao_id TEXT UNIQUE,  -- Kakao 사용자 ID
  name TEXT,
  phone TEXT,
  address TEXT,
  postal_code TEXT,  -- 도서산간 배송비 계산용 (2025-10-03 추가)
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_profiles_kakao_id ON profiles(kakao_id);
CREATE INDEX idx_profiles_id_kakao_id ON profiles(id, kakao_id);  -- 복합 인덱스 (2025-10-05 추가)
```

---

### 7.1 컬럼 추가 시나리오

#### 📋 컬럼 추가 전 체크리스트

- [ ] **1. 컬럼 필요성 확인**
  - 예: `point` (포인트) 컬럼 추가
  - 예: `birth_date` (생년월일) 컬럼 추가

- [ ] **2. Part 2 Section 7에서 영향 확인**
  - INSERT 위치: 회원가입 API, Kakao 로그인 API
  - SELECT 위치: UserProfileManager, 마이페이지
  - UPDATE 위치: atomicProfileUpdate()

- [ ] **3. Kakao 사용자 영향 확인**
  - sessionStorage 동기화 필요? (atomicProfileUpdate)
  - Kakao API에서 제공하는 정보인가?

- [ ] **4. 마이그레이션 작성**
  ```sql
  ALTER TABLE profiles
  ADD COLUMN point DECIMAL(12,2) DEFAULT 0 CHECK (point >= 0);

  COMMENT ON COLUMN profiles.point IS '보유 포인트 (2025-10-20 추가)';
  ```

#### ✅ 마이그레이션 후 검증 체크리스트

- [ ] **5. UserProfileManager 수정**
  - `getCurrentUser()` - 포인트 포함해서 반환
  - `atomicProfileUpdate()` - 포인트 업데이트 지원

- [ ] **6. UI 표시 확인**
  - 마이페이지: 포인트 잔액 표시
  - 체크아웃: 포인트 사용 가능

- [ ] **7. 문서 업데이트**
  - Part 2 Section 7 업데이트

---

### 7.2 Kakao 사용자 통합 시나리오

#### 📋 Kakao 사용자 통합 체크리스트

- [ ] **1. 현재 통합 방식 이해**
  - profiles.id = 'kakao_3782927171'
  - profiles.kakao_id = '3782927171'
  - sessionStorage에 사용자 정보 저장

- [ ] **2. 동기화 지점 확인**
  - Kakao 로그인 시: syncKakaoProfile()
  - 프로필 수정 시: atomicProfileUpdate()
  - sessionStorage → profiles 테이블 → auth.users.user_metadata

- [ ] **3. RLS 정책 확인** (Part 2 Section 7)
  - SELECT: kakao_id 기반 조회
  - UPDATE: kakao_id 기반 업데이트

#### 🔧 통합 로직 수정 체크리스트

- [ ] **4. syncKakaoProfile() 수정** (필요 시)
  - Part 5-1 Section 3.3 참조

- [ ] **5. atomicProfileUpdate() 수정** (필요 시)
  - Part 5-1 Section 3.2 참조

#### ✅ 통합 로직 검증 체크리스트

- [ ] **6. Kakao 로그인 테스트**
  - 첫 로그인 → profiles 생성
  - 재로그인 → profiles 업데이트

- [ ] **7. 프로필 수정 테스트**
  - 마이페이지 → 정보 수정 → 3곳 동기화 확인

- [ ] **8. 문서 업데이트**
  - Part 2 Section 7 업데이트

#### 🐛 과거 버그 사례

**사례 1: postal_code 컬럼 누락 (2025-10-03)**
- **증상**: 배송비 계산 시 undefined 전달
- **원인**: profiles.postal_code 컬럼 DB에 없음
- **해결**: 마이그레이션 생성, 컬럼 추가
- **재발 방지**: DB 스키마 확인 필수

**사례 2: RLS 정책 순환 참조 (2025-10-03)**
- **증상**: profiles 조회 10초+ 타임아웃, 무한루프
- **원인**:
  - RLS 정책에서 `is_admin()` 함수 호출
  - `is_admin()` 함수 내에서 profiles 조회
  - profiles → RLS → is_admin() → profiles → 무한
- **해결**: Service Role API Route 생성 (`/api/admin/check-profile`)
- **재발 방지**: RLS 정책에서 같은 테이블 조회 금지

#### 📚 크로스 레퍼런스

- **Part 2 Section 7**: profiles 테이블 스키마
- **Part 1 Section 4.6**: getCurrentUser() (프로필 조회)
- **Part 1 Section 4.7**: atomicProfileUpdate() (3곳 동시 업데이트)
- **Part 4 Section 8**: /mypage (프로필 편집)
- **Part 5-1 Section 3**: UserProfileManager 수정 시나리오

---

## Section 8: coupons / user_coupons 테이블 수정 시나리오

### 📌 개요
- **테이블 목적**: 쿠폰 정보 및 사용자 보유 쿠폰 저장
- **현재 상태**: Part 2 Section 11, 12 참조
- **핵심 컬럼** (coupons): id, code, type, value, min_purchase_amount, max_discount, valid_from, valid_to, is_welcome_coupon
- **핵심 컬럼** (user_coupons): id, user_id, coupon_id, is_used, used_at, order_id

### 🔍 현재 상태 (Part 2에서 확인)
```sql
-- Part 2 Section 11 참조
CREATE TABLE coupons (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,  -- 'percentage', 'fixed_amount'
  value DECIMAL(12,2) NOT NULL,
  min_purchase_amount DECIMAL(12,2) DEFAULT 0,
  max_discount DECIMAL(12,2),
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_to TIMESTAMP WITH TIME ZONE,
  is_welcome_coupon BOOLEAN DEFAULT false,  -- 웰컴 쿠폰 (2025-10-08 추가)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Part 2 Section 12 참조
CREATE TABLE user_coupons (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, coupon_id)  -- 중복 배포 방지
);
```

---

### 8.1 쿠폰 타입 추가 시나리오

#### 📋 쿠폰 타입 추가 전 체크리스트

- [ ] **1. 새로운 쿠폰 타입 정의**
  - 예: `buy_x_get_y` (N개 구매 시 M개 증정)
  - 예: `free_shipping` (무료배송 쿠폰)
  - 예: `category_discount` (특정 카테고리 할인)

- [ ] **2. Part 1 Section 4.1 확인**
  - validateCoupon() 함수 수정 필요
  - applyCouponDiscount() 함수 수정 필요

- [ ] **3. 추가 컬럼 필요?**
  ```sql
  ALTER TABLE coupons
  ADD COLUMN buy_x INTEGER,  -- N개 구매
  ADD COLUMN get_y INTEGER,  -- M개 증정
  ADD COLUMN category_id UUID;  -- 특정 카테고리
  ```

#### 🔧 쿠폰 타입 추가 작업 체크리스트

- [ ] **4. 마이그레이션 작성**
  ```sql
  -- 컬럼 추가
  ALTER TABLE coupons
  ADD COLUMN type_metadata JSONB;  -- 타입별 추가 정보

  -- 예시 데이터
  INSERT INTO coupons (code, type, value, type_metadata)
  VALUES (
    'BUY2GET1',
    'buy_x_get_y',
    0,
    '{"buy_x": 2, "get_y": 1}'::jsonb
  );
  ```

- [ ] **5. validateCoupon() 수정**
  ```javascript
  // /lib/couponApi.js
  if (coupon.type === 'buy_x_get_y') {
    const { buy_x, get_y } = coupon.type_metadata
    // 검증 로직
  }
  ```

- [ ] **6. applyCouponDiscount() 수정**
  ```javascript
  // /lib/orderCalculations.js
  if (coupon.type === 'buy_x_get_y') {
    // 할인 계산 로직
  }
  ```

#### ✅ 쿠폰 타입 추가 후 검증 체크리스트

- [ ] **7. 쿠폰 생성 테스트**
  - 관리자 페이지에서 새 타입 쿠폰 생성

- [ ] **8. 쿠폰 적용 테스트**
  - 체크아웃에서 새 타입 쿠폰 적용
  - 할인 정확히 계산되는가?

- [ ] **9. 문서 업데이트**
  - Part 2 Section 11 업데이트
  - Part 1 Section 4.1 업데이트

---

### 8.2 쿠폰 조건 추가 시나리오

#### 📋 쿠폰 조건 추가 전 체크리스트

- [ ] **1. 새로운 조건 정의**
  - 예: `max_usage_per_user` (1인당 사용 제한)
  - 예: `applicable_products` (특정 상품만 적용)
  - 예: `day_of_week` (특정 요일에만 사용)

- [ ] **2. 컬럼 추가**
  ```sql
  ALTER TABLE coupons
  ADD COLUMN max_usage_per_user INTEGER DEFAULT 1,
  ADD COLUMN applicable_products JSONB,  -- ["product-id-1", "product-id-2"]
  ADD COLUMN day_of_week INTEGER[];  -- [0, 6] (일요일, 토요일)
  ```

#### 🔧 쿠폰 조건 추가 작업 체크리스트

- [ ] **3. validateCoupon() 수정**
  ```javascript
  // 1인당 사용 제한 확인
  const { data: usageCount } = await supabase
    .from('user_coupons')
    .select('id')
    .eq('coupon_id', coupon.id)
    .eq('user_id', userId)
    .eq('is_used', true)

  if (usageCount.length >= coupon.max_usage_per_user) {
    return { valid: false, error: '사용 횟수 초과' }
  }

  // 요일 확인
  const dayOfWeek = new Date().getDay()
  if (coupon.day_of_week && !coupon.day_of_week.includes(dayOfWeek)) {
    return { valid: false, error: '오늘은 사용 불가' }
  }
  ```

#### ✅ 쿠폰 조건 추가 후 검증 체크리스트

- [ ] **4. 조건별 테스트**
  - 1인당 1회 사용 → 2번째 사용 시 에러
  - 특정 요일 → 다른 요일에 사용 시 에러

- [ ] **5. 문서 업데이트**
  - Part 2 Section 11 업데이트

#### 🐛 과거 버그 사례

**사례 1: 웰컴 쿠폰 자동 발급 (2025-10-08)**
- **기능**: 신규 회원가입 시 웰컴 쿠폰 자동 발급
- **구현**:
  - is_welcome_coupon = true 컬럼 추가
  - DB 트리거 생성 (profiles INSERT → user_coupons INSERT)
- **결과**: 회원가입 즉시 쿠폰 발급 완료

**사례 2: 쿠폰 중복 배포 (2025-10-08)**
- **증상**: 재배포 시 "duplicate key violates unique constraint" 500 에러
- **원인**: UNIQUE(user_id, coupon_id) 제약
- **해결**: 개별 INSERT로 중복 건너뛰기 로직 구현
  ```javascript
  for (const userCoupon of userCoupons) {
    const { error } = await supabaseAdmin
      .from('user_coupons')
      .insert(userCoupon)

    if (error && error.code === '23505') {
      // 중복 건너뛰기
      duplicateCount++
    }
  }
  ```
- **재발 방지**: 대량 배포 시 개별 INSERT + 중복 처리

#### 📚 크로스 레퍼런스

- **Part 2 Section 11**: coupons 테이블
- **Part 2 Section 12**: user_coupons 테이블
- **Part 1 Section 4.1**: validateCoupon() 함수
- **Part 1 Section 4.3**: applyCouponUsage() 함수
- **Part 4 Section 2**: /checkout (쿠폰 적용)
- **Part 4 Section 17**: /admin/coupons/[id] (쿠폰 관리)
- **Part 5-1 Section 4**: Coupon API 수정 시나리오

---

## Section 9: RLS 정책 수정 시나리오

### 📌 개요
- **RLS (Row Level Security)**: Supabase 보안 정책
- **목적**: 사용자별 데이터 접근 제어
- **정책 타입**: SELECT, INSERT, UPDATE, DELETE
- **인증 방식**:
  - Anon Key (RLS 적용)
  - Service Role Key (RLS 우회)

### 🔍 RLS 정책 기본 구조
```sql
-- SELECT 정책 예시
CREATE POLICY "policy_name" ON table_name
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT 정책 예시
CREATE POLICY "policy_name" ON table_name
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE 정책 예시
CREATE POLICY "policy_name" ON table_name
FOR UPDATE
USING (auth.uid() = user_id);
```

---

### 9.1 SELECT 정책 수정 시나리오

#### 📋 SELECT 정책 수정 전 체크리스트

- [ ] **1. 현재 정책 확인**
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'orders';
  ```

- [ ] **2. 보안 위험 확인**
  - "Anyone can view" 정책 있는가? → 즉시 제거!
  - 모든 사용자가 모든 데이터 조회 가능한가?

- [ ] **3. Kakao 사용자 정책 확인**
  - `auth.uid()` 사용? → Kakao ID 매칭 실패!
  - `get_current_user_kakao_id()` 헬퍼 함수 사용?

- [ ] **4. 성능 영향 확인**
  - 서브쿼리 중복 실행?
  - 인덱스 부족?

#### 🔧 SELECT 정책 수정 작업 체크리스트

- [ ] **5. 보안 위험 정책 제거**
  ```sql
  -- ❌ 위험한 정책 제거
  DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
  ```

- [ ] **6. 헬퍼 함수 생성** (성능 최적화)
  ```sql
  -- STABLE 함수 (결과 캐싱)
  CREATE OR REPLACE FUNCTION get_current_user_kakao_id()
  RETURNS TEXT AS $$
    SELECT kakao_id FROM profiles WHERE id = auth.uid()
  $$ LANGUAGE sql STABLE;
  ```

- [ ] **7. 새로운 SELECT 정책 생성**
  ```sql
  -- Supabase Auth 사용자 + Kakao 사용자 + 관리자
  CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT
  USING (
    auth.uid() = user_id  -- Supabase Auth
    OR order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'  -- Kakao
    OR is_admin(auth.uid())  -- 관리자
  );
  ```

- [ ] **8. 인덱스 추가** (성능)
  ```sql
  CREATE INDEX idx_profiles_id_kakao_id ON profiles(id, kakao_id);  -- 복합 인덱스
  CREATE INDEX idx_orders_order_type ON orders USING GIN(order_type);  -- GIN 인덱스
  ```

#### ✅ SELECT 정책 수정 후 검증 체크리스트

- [ ] **9. Supabase Auth 사용자 테스트**
  - 로그인 → 자기 주문만 조회되는가?
  - 다른 사용자 주문은 안 보이는가?

- [ ] **10. Kakao 사용자 테스트**
  - 로그인 → 자기 주문 조회되는가?
  - order_type 패턴 3가지 모두 확인
    - `direct:KAKAO:kakao_id`
    - `cart:KAKAO:kakao_id:timestamp`
    - `%KAKAO:user.id%`

- [ ] **11. 관리자 테스트**
  - 관리자 로그인 → 모든 주문 조회되는가?

- [ ] **12. 성능 테스트**
  - 쿼리 시간 측정 (Before/After)
  - 서브쿼리 실행 횟수 확인

- [ ] **13. 문서 업데이트**
  - DB_SCHEMA_ANALYSIS_COMPLETE.md 업데이트

---

### 9.2 INSERT/UPDATE/DELETE 정책 추가 시나리오

#### 📋 정책 추가 전 체크리스트

- [ ] **1. 정책 누락 확인**
  - INSERT 정책 있는가?
  - UPDATE 정책 있는가?
  - DELETE 정책 있는가?

- [ ] **2. 증상 확인**
  - PATCH 요청 204 성공하지만 DB 저장 안 됨?
  - → UPDATE 정책 누락!

#### 🔧 정책 추가 작업 체크리스트

- [ ] **3. INSERT 정책 추가**
  ```sql
  CREATE POLICY "Users can insert their own orders" ON orders
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'
  );
  ```

- [ ] **4. UPDATE 정책 추가**
  ```sql
  CREATE POLICY "Users can update their own orders" ON orders
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'
    OR is_admin(auth.uid())  -- 관리자도 수정 가능
  );
  ```

- [ ] **5. DELETE 정책 추가** (필요 시)
  ```sql
  CREATE POLICY "Users can delete their own orders" ON orders
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
  );
  ```

#### ✅ 정책 추가 후 검증 체크리스트

- [ ] **6. INSERT 테스트**
  - 주문 생성 → DB에 저장되는가?

- [ ] **7. UPDATE 테스트**
  - 주문 수정 → DB에 반영되는가?
  - PATCH 204 성공 + DB 저장 확인

- [ ] **8. DELETE 테스트** (필요 시)
  - 주문 삭제 → DB에서 삭제되는가?

- [ ] **9. 문서 업데이트**
  - DB_SCHEMA_ANALYSIS_COMPLETE.md 업데이트

#### 🐛 과거 버그 사례

**사례 1: discount_amount 컬럼 추가 시 UPDATE 정책 누락 (2025-10-04)**
- **증상**: PATCH 204 성공하지만 discount_amount = 0으로 저장
- **원인**: UPDATE 정책 없음 → 0 rows updated
- **해결**: UPDATE 정책 추가 마이그레이션
- **재발 방지**: 컬럼 추가 시 RLS 정책도 함께 확인!

**사례 2: 관리자 UPDATE 정책 누락 (2025-10-05)**
- **증상**: 관리자 로그인 불가 (UPDATE 실패)
- **원인**: UPDATE 정책이 `auth.uid() = user_id`만 확인 → 관리자 제외
- **해결**: UPDATE 정책에 `OR is_admin(auth.uid())` 추가
- **재발 방지**: 관리자 예외 처리 필수!

---

### 9.3 Service Role API 전환 시나리오

#### 📌 개요
RLS 정책이 복잡하거나 성능 문제 발생 시 Service Role API로 전환

#### 📋 Service Role API 전환 전 체크리스트

- [ ] **1. 전환 필요성 확인**
  - RLS 정책이 너무 복잡한가?
  - 성능 문제 발생하는가?
  - Kakao 사용자 매칭 실패하는가?

- [ ] **2. 보안 확인**
  - Service Role API는 RLS 우회
  - 서버 사이드에서 권한 검증 필수!

#### 🔧 Service Role API 전환 작업 체크리스트

- [ ] **3. Service Role API Route 생성**
  ```javascript
  // /app/api/admin/check-profile/route.js
  import { createClient } from '@supabase/supabase-js'

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  export async function POST(request) {
    const { userId } = await request.json()

    // 권한 검증 (필수!)
    // ...

    // RLS 우회 조회
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    return NextResponse.json({ profile })
  }
  ```

- [ ] **4. 클라이언트 코드 수정**
  ```javascript
  // /hooks/useAdminAuth.js
  // Anon Key 대신 Service Role API 호출
  const response = await fetch('/api/admin/check-profile', {
    method: 'POST',
    body: JSON.stringify({ userId })
  })
  ```

- [ ] **5. 환경변수 설정**
  ```bash
  # .env.local
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```

#### ✅ Service Role API 전환 후 검증 체크리스트

- [ ] **6. API 테스트**
  - 조회 성공?
  - 권한 없는 사용자 접근 차단?

- [ ] **7. 성능 테스트**
  - 쿼리 시간 개선?
  - RLS 서브쿼리 제거로 빨라졌는가?

- [ ] **8. 보안 확인**
  - 서버 사이드 권한 검증 확인
  - Service Role Key 노출 안 됨

- [ ] **9. 문서 업데이트**
  - Part 3에 새 API 추가

#### 🐛 과거 버그 사례

**사례 1: 관리자 RLS 순환 참조 (2025-10-03)**
- **증상**: profiles 조회 10초+ 타임아웃, 무한루프
- **원인**:
  - RLS 정책 → is_admin() 함수 호출
  - is_admin() → profiles 조회
  - profiles → RLS → is_admin() → 무한
- **해결**: Service Role API Route 생성 (`/api/admin/check-profile`)
- **결과**: 10초+ → **1초 이내** (타임아웃 완전 해결)

**사례 2: Kakao 사용자 주문 조회 0개 (2025-10-05)**
- **증상**: 모바일에서 주문 목록 빈 화면
- **원인**:
  - RLS SELECT 정책: `order_type LIKE '%' || auth.uid() || '%'`
  - auth.uid() = Supabase UUID
  - order_type = 'direct:KAKAO:3782927171'
  - → 매칭 실패!
- **해결**: Service Role API 전환 (`/api/orders/list`)
  - 3개 패턴으로 조회
  - 중복 제거 후 병합
- **결과**: 주문 목록 정상 표시

#### 📚 크로스 레퍼런스

- **DB_SCHEMA_ANALYSIS_COMPLETE.md**: 모든 테이블의 RLS 정책
- **Part 3 Section 1.1**: POST /api/orders/create (Service Role 예시)
- **Part 3 Section 2**: POST /api/orders/list (Service Role 예시)
- **Part 5-2 Section 1**: orders 테이블 수정 시나리오

---

## Section 10: DB 인덱스 수정 시나리오

### 📌 개요
- **인덱스 목적**: 쿼리 성능 최적화
- **인덱스 타입**:
  - 기본 인덱스 (B-Tree)
  - 복합 인덱스 (여러 컬럼)
  - GIN 인덱스 (JSONB, 배열, LIKE 검색)

### 🔍 현재 인덱스 확인
```sql
-- 테이블의 모든 인덱스 확인
SELECT * FROM pg_indexes WHERE tablename = 'orders';

-- 인덱스 사용 통계
SELECT * FROM pg_stat_user_indexes WHERE relname = 'orders';
```

---

### 10.1 인덱스 추가 시나리오

#### 📋 인덱스 추가 전 체크리스트

- [ ] **1. 성능 문제 파악**
  - 어떤 쿼리가 느린가?
  - EXPLAIN ANALYZE로 확인
    ```sql
    EXPLAIN ANALYZE
    SELECT * FROM orders WHERE status = 'pending';
    ```

- [ ] **2. 인덱스 필요성 확인**
  - WHERE 절에 자주 사용하는 컬럼?
  - JOIN에 사용하는 컬럼?
  - ORDER BY에 사용하는 컬럼?

- [ ] **3. 기존 인덱스 확인**
  - 이미 있는 인덱스?
  - 중복 인덱스 방지

#### 🔧 인덱스 추가 작업 체크리스트

- [ ] **4. 기본 인덱스 추가**
  ```sql
  CREATE INDEX idx_orders_status ON orders(status);
  CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
  ```

- [ ] **5. 복합 인덱스 추가** (여러 컬럼)
  ```sql
  -- status + created_at (WHERE status = ... ORDER BY created_at)
  CREATE INDEX idx_orders_status_created_at ON orders(status, created_at DESC);
  ```

- [ ] **6. 부분 인덱스 추가** (조건부)
  ```sql
  -- pending 주문만 인덱스
  CREATE INDEX idx_orders_pending ON orders(created_at)
  WHERE status = 'pending';
  ```

#### ✅ 인덱스 추가 후 검증 체크리스트

- [ ] **7. EXPLAIN ANALYZE 재실행**
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM orders WHERE status = 'pending';
  -- Index Scan 사용하는지 확인
  ```

- [ ] **8. 성능 측정**
  - 쿼리 시간 Before/After
  - 예: 5초 → 0.5초 (10배 향상)

- [ ] **9. 인덱스 사용 확인**
  ```sql
  SELECT * FROM pg_stat_user_indexes WHERE indexrelname = 'idx_orders_status';
  -- idx_scan > 0 확인
  ```

- [ ] **10. 문서 업데이트**
  - DB_SCHEMA_ANALYSIS_COMPLETE.md 업데이트

---

### 10.2 복합 인덱스 생성 시나리오

#### 📋 복합 인덱스 생성 전 체크리스트

- [ ] **1. 쿼리 패턴 확인**
  ```sql
  -- 이런 쿼리가 자주 실행되는가?
  SELECT * FROM orders
  WHERE status = 'pending'
  ORDER BY created_at DESC;
  ```

- [ ] **2. 컬럼 순서 결정** ⚠️ 중요!
  - WHERE 절 컬럼 먼저
  - ORDER BY 컬럼 나중
  - 예: (status, created_at) → O
  - 예: (created_at, status) → X

#### 🔧 복합 인덱스 생성 작업 체크리스트

- [ ] **3. 복합 인덱스 생성**
  ```sql
  CREATE INDEX idx_orders_status_created_at ON orders(status, created_at DESC);
  ```

- [ ] **4. 기존 단일 인덱스 제거** (필요 시)
  ```sql
  -- idx_orders_status는 이제 불필요 (복합 인덱스가 커버)
  DROP INDEX IF EXISTS idx_orders_status;
  ```

#### ✅ 복합 인덱스 생성 후 검증 체크리스트

- [ ] **5. EXPLAIN ANALYZE 확인**
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM orders
  WHERE status = 'pending'
  ORDER BY created_at DESC;
  -- idx_orders_status_created_at 사용하는지 확인
  ```

- [ ] **6. 성능 개선 확인**
  - 쿼리 시간 감소?

- [ ] **7. 문서 업데이트**
  - DB_SCHEMA_ANALYSIS_COMPLETE.md 업데이트

---

### 10.3 GIN 인덱스 생성 시나리오

#### 📌 개요
GIN 인덱스는 다음 경우에 사용:
- JSONB 컬럼 (@>, ? 연산자)
- 배열 컬럼 (ANY, ALL 연산자)
- 텍스트 LIKE 검색 (% 와일드카드)

#### 📋 GIN 인덱스 생성 전 체크리스트

- [ ] **1. GIN 인덱스 필요성 확인**
  - LIKE '%keyword%' 검색?
  - JSONB 필드 검색?
  - 배열 컬럼 검색?

- [ ] **2. 쿼리 패턴 확인**
  ```sql
  -- order_type LIKE 검색 (Kakao 사용자)
  SELECT * FROM orders
  WHERE order_type LIKE '%KAKAO:3782927171%';
  ```

#### 🔧 GIN 인덱스 생성 작업 체크리스트

- [ ] **3. GIN 인덱스 생성**
  ```sql
  -- 텍스트 LIKE 검색용
  CREATE INDEX idx_orders_order_type ON orders USING GIN(order_type gin_trgm_ops);

  -- JSONB 검색용
  CREATE INDEX idx_order_items_selected_options ON order_items USING GIN(selected_options);

  -- 배열 검색용
  CREATE INDEX idx_purchase_order_batches_order_ids ON purchase_order_batches USING GIN(order_ids);
  ```

- [ ] **4. Extension 설치** (필요 시)
  ```sql
  -- LIKE 검색용 extension
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```

#### ✅ GIN 인덱스 생성 후 검증 체크리스트

- [ ] **5. EXPLAIN ANALYZE 확인**
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM orders
  WHERE order_type LIKE '%KAKAO:3782927171%';
  -- Index Scan 사용하는지 확인
  ```

- [ ] **6. 성능 개선 확인**
  - LIKE 검색 속도 향상?

- [ ] **7. 문서 업데이트**
  - DB_SCHEMA_ANALYSIS_COMPLETE.md 업데이트

#### 🐛 과거 버그 사례

**사례 1: RLS 성능 최적화 (2025-10-05)**
- **증상**: 모바일 환경에서 주문 조회 느림 (5-10초)
- **원인**:
  - RLS 정책에서 profiles.kakao_id 서브쿼리 중복 실행
  - order_type LIKE 검색에 인덱스 없음
- **해결**:
  1. 헬퍼 함수 생성 (get_current_user_kakao_id) - STABLE로 결과 캐싱
  2. 복합 인덱스 추가 (profiles.id, kakao_id)
  3. GIN 인덱스 추가 (orders.order_type)
- **결과**: 성능 **2-5배 향상**

#### 📚 크로스 레퍼런스

- **DB_SCHEMA_ANALYSIS_COMPLETE.md**: 모든 테이블의 인덱스 목록
- **Part 5-2 Section 5.2**: products 테이블 성능 최적화
- **Part 5-2 Section 9**: RLS 정책 수정 (헬퍼 함수 + 인덱스)

---

## 📊 전체 요약

### DB 테이블 수정 시 반드시 확인할 것

1. **Part 2에서 사용처 확인** (INSERT/SELECT/UPDATE 어디서?)
2. **Part 1에서 중앙 함수 영향 확인** (어떤 함수가 이 테이블 사용?)
3. **Part 3에서 API 영향 확인** (어떤 API가 이 테이블 접근?)
4. **Part 4에서 페이지 영향 확인** (어떤 페이지가 영향받는?)
5. **RLS 정책 확인** (SELECT/INSERT/UPDATE 정책 필요?)
6. **인덱스 확인** (성능 최적화 필요?)
7. **마이그레이션 작성** (롤백 스크립트 포함)
8. **과거 버그 사례 학습** (같은 실수 반복 방지)

### 마이그레이션 후 반드시 할 것

1. **로컬 DB 적용 테스트**
2. **INSERT/SELECT/UPDATE 테스트**
3. **모든 사용처 코드 수정** (Part 2 참조)
4. **E2E 테스트**
5. **프로덕션 배포**
6. **문서 업데이트** (Part 2, Part 5-2)

---

**다음 단계**: Part 5-3 (API 엔드포인트 수정 시나리오) 읽기

**작성 완료**: 2025-10-20
