# 🎯 옵션별 재고 관리 시스템 - 완전 설계서

**작성일**: 2025-10-01
**목적**: 옵션별 재고 관리 시스템의 안정적이고 근본적인 구현
**중요도**: 🔥🔥🔥 매우 높음 (판매/재고 관리의 핵심)

---

## 📋 목차

1. [현재 시스템 분석](#1-현재-시스템-분석)
2. [문제점 정의](#2-문제점-정의)
3. [안정적인 설계 방안](#3-안정적인-설계-방안)
4. [구현 계획](#4-구현-계획)
5. [테스트 시나리오](#5-테스트-시나리오)
6. [리스크 관리](#6-리스크-관리)

---

## 1. 현재 시스템 분석

### 1.1 DB 스키마 (✅ 구조는 올바름)

#### products 테이블
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    inventory INTEGER DEFAULT 0,  -- ⭐ 전체 재고 (옵션 없는 상품용)
    status TEXT DEFAULT 'active',
    -- ... 기타 컬럼
);
```

#### product_options 테이블
```sql
CREATE TABLE product_options (
    id UUID PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- '색상', '사이즈' 등
    values JSONB NOT NULL,        -- ⭐ 옵션별 재고 저장
    required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**values JSONB 구조**:
```json
[
  {
    "name": "블랙",
    "inventory": 10,           -- ⭐ 옵션별 재고
    "price_adjustment": 0
  },
  {
    "name": "화이트",
    "inventory": 5,
    "price_adjustment": 1000
  }
]
```

#### order_items 테이블
```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    product_id UUID REFERENCES products(id),
    title TEXT,
    options JSONB,              -- ⚠️ 선택한 옵션 저장 (현재 미사용)
    quantity INTEGER,
    price DECIMAL(10, 2),
    -- ...
);
```

**options JSONB 예상 구조** (현재 미구현):
```json
{
  "색상": "블랙",
  "사이즈": "M"
}
```

---

### 1.2 현재 코드 흐름 분석

#### A. 상품 조회 (✅ 옵션 데이터 로딩은 정상)

**파일**: `lib/supabaseApi.js` - `getProducts()`
```javascript
const { data, error } = await supabase
  .from('products')
  .select(`
    *,
    product_options (
      id,
      name,
      values
    )
  `)
```
**결과**: ✅ `product.product_options`에 옵션 데이터 포함됨

---

#### B. 홈페이지 재고 표시 (❌ 옵션 무시)

**파일**: `app/components/product/ProductCard.jsx:21-30`
```javascript
// 현재 코드
const [currentInventory, setCurrentInventory] = useState(
  product.stock_quantity || product.inventory || 0
)

// 품절 체크
if (currentInventory <= 0) {
  toast.error('품절되었습니다')
}
```

**문제점**:
- `products.inventory`만 확인 (전체 재고)
- `product_options[].values[].inventory` 완전 무시
- 옵션별 품절 상태를 알 수 없음

**예시 문제**:
```
상품: 티셔츠
- products.inventory: 100개

옵션:
- 블랙/S: 5개
- 블랙/M: 0개  ← 품절
- 화이트/L: 10개

현재 표시: "100개 재고 있음" ← 잘못됨!
올바른 표시: "블랙/M 품절"
```

---

#### C. 구매 모달 (⚠️ 코드는 있으나 미작동)

**파일**: `app/components/product/BuyBottomSheet.jsx:137-150`
```javascript
// 137줄: 함수는 존재
const getSelectedOptionInventory = () => {
  if (!options || options.length === 0) {
    return stock  // 옵션 없으면 전체 재고
  }

  // ⚠️ 여기서부터 로직이 복잡하고 불안정
  // 실제로 재고 검증에 사용되지 않음
}
```

**문제점**:
- 함수는 존재하지만 실제 검증에 미사용
- 옵션 선택 시 재고 확인 없음
- 품절된 옵션도 선택 가능

---

#### D. 주문 생성 (❌ 옵션 재고 차감 없음)

**파일**: `lib/supabaseApi.js:346-550`
```javascript
export const createOrder = async (orderData, userProfile, depositName) => {
  // ... 주문 생성 로직

  // ❌ 문제: 재고 차감이 전혀 없음!
  // updateProductInventory() 호출 자체가 없음
}
```

**파일**: `lib/supabaseApi.js:233-267`
```javascript
export const updateProductInventory = async (productId, quantityChange) => {
  // 현재: products.inventory만 차감
  const { data, error } = await supabase
    .from('products')
    .update({ inventory: newQuantity })
    .eq('id', productId)

  // ❌ 문제: 옵션별 재고 차감 로직 전혀 없음
}
```

**문제점**:
1. 주문 생성 시 재고 차감 자체가 없음
2. `updateProductInventory()`는 전체 재고만 차감
3. 옵션별 재고는 전혀 건드리지 않음

**심각한 시나리오**:
```
상품: 티셔츠
- products.inventory: 100개
- 블랙/M: 3개 재고

사용자: 블랙/M 10개 주문
시스템: ✅ 주문 생성 성공 (재고 검증 없음)
결과: 블랙/M 재고 여전히 3개 (차감 안됨)
      실제로는 -7개 필요한 상황!
```

---

#### E. 관리자 재고 관리 (❌ 옵션별 관리 불가)

**파일**: `app/admin/products/page.js:106-123`
```javascript
const updateInventory = async (productId, newQuantity) => {
  // 현재: products.inventory만 업데이트
  const { error } = await supabase
    .from('products')
    .update({ inventory: newQuantity })
    .eq('id', productId)
}
```

**문제점**:
- 옵션이 있는 상품도 전체 재고만 수정 가능
- 옵션별 재고 증감 UI 없음
- 관리자가 "블랙/M" 재고를 따로 관리할 수 없음

---

## 2. 문제점 정의

### 🔥 치명적인 문제 (Critical)

#### 2.1 재고 오버셀링 (Overselling)
**위험도**: ⚠️⚠️⚠️ 매우 높음

**시나리오**:
```
1. 상품: 티셔츠 (블랙/M: 3개 재고)
2. 사용자 A: 블랙/M 2개 주문
3. 사용자 B: 블랙/M 2개 주문 (거의 동시)
4. 시스템: 두 주문 모두 허용 ❌
5. 결과: 4개 판매했으나 실제 재고는 3개
```

**영향**:
- 배송 불가능한 주문 발생
- 고객 불만 및 환불 요청
- 브랜드 신뢰도 하락
- 법적 문제 가능성

---

#### 2.2 재고 데이터 불일치
**위험도**: ⚠️⚠️ 높음

**문제**:
```
products.inventory (전체 재고)
  vs
product_options[].values[].inventory (옵션별 재고)

두 값의 관계가 정의되지 않음!
```

**예시**:
```sql
products.inventory = 100

product_options.values:
- 블랙/S: 20개
- 블랙/M: 30개
- 화이트/L: 40개
합계: 90개

100 ≠ 90 ← 데이터 불일치!
```

---

#### 2.3 옵션 정보 손실
**위험도**: ⚠️⚠️ 높음

**문제**:
- `order_items.options` 컬럼이 있지만 사용되지 않음
- 주문 후 "어떤 옵션"을 주문했는지 알 수 없음
- 배송/교환/환불 시 혼란

**예시**:
```
주문 상세:
- 상품: 티셔츠
- 수량: 2개
- 옵션: ??? ← 알 수 없음!

관리자: "블랙/M 2개? 화이트/L 2개?"
```

---

### ⚠️ 주요 문제 (Major)

#### 2.4 사용자 경험 저하
- 품절된 옵션을 선택할 수 있음
- 장바구니 담기 후 품절 발견
- 결제 시도 시점에 실패

#### 2.5 관리자 운영 불편
- 옵션별 재고를 수동으로 관리 불가
- 재고 현황 파악 어려움
- 엑셀 등 외부 툴 필요

---

## 3. 안정적인 설계 방안

### 3.1 핵심 설계 원칙

#### ✅ 원칙 1: 단일 진실 공급원 (Single Source of Truth)

**결정**: `product_options.values[].inventory`를 유일한 재고 데이터로 사용

**이유**:
- 옵션별 재고가 실제 판매 단위
- `products.inventory`는 계산된 값으로 취급

**구현**:
```javascript
// products.inventory = 옵션별 재고의 합계 (자동 계산)
products.inventory = SUM(product_options.values[].inventory)

// 옵션이 없는 상품인 경우에만 products.inventory 직접 사용
```

---

#### ✅ 원칙 2: 낙관적 락 (Optimistic Locking) 대신 트랜잭션

**결정**: 재고 차감 시 JSONB 업데이트 + 트랜잭션 사용

**이유**:
- Supabase는 RPC 함수로 트랜잭션 지원
- Race condition 방지

**구현**:
```sql
-- Supabase RPC 함수 생성
CREATE OR REPLACE FUNCTION update_option_inventory(
  p_product_id UUID,
  p_option_name TEXT,
  p_option_value TEXT,
  p_quantity_change INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_options JSONB;
  v_updated_options JSONB;
BEGIN
  -- 1. 현재 옵션 데이터 조회 (FOR UPDATE로 락)
  SELECT values INTO v_current_options
  FROM product_options
  WHERE product_id = p_product_id
    AND name = p_option_name
  FOR UPDATE;

  -- 2. JSONB 업데이트 (옵션 재고 차감)
  v_updated_options := (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'name' = p_option_value
        THEN jsonb_set(
          elem,
          '{inventory}',
          to_jsonb((elem->>'inventory')::int + p_quantity_change)
        )
        ELSE elem
      END
    )
    FROM jsonb_array_elements(v_current_options) elem
  );

  -- 3. 업데이트 실행
  UPDATE product_options
  SET values = v_updated_options
  WHERE product_id = p_product_id
    AND name = p_option_name;

  RETURN v_updated_options;
END;
$$;
```

---

#### ✅ 원칙 3: 주문 생성 전 재고 검증 (Pre-validation)

**결정**: 주문 생성 전에 반드시 재고 확인

**이유**:
- 오버셀링 방지
- 사용자 경험 개선 (빠른 피드백)

**구현 흐름**:
```
1. 사용자: 구매 버튼 클릭
2. 프론트엔드: 선택한 옵션 재고 확인
3. 재고 부족 → 즉시 에러 메시지
4. 재고 충분 → 주문 생성 API 호출
5. 백엔드: 다시 한번 재고 확인 (이중 검증)
6. 재고 충분 → 주문 생성 + 재고 차감 (트랜잭션)
7. 재고 부족 → 주문 실패 + 에러 반환
```

---

#### ✅ 원칙 4: 주문 시 옵션 정보 저장

**결정**: `order_items.options`에 선택한 옵션 명시적 저장

**구조**:
```json
{
  "색상": "블랙",
  "사이즈": "M"
}
```

**이유**:
- 주문 이력 추적
- 교환/환불 시 정확한 옵션 식별
- 데이터 분석 (어떤 옵션이 잘 팔리는지)

---

### 3.2 시스템 아키텍처

```
┌─────────────────────────────────────────────────┐
│              사용자 화면                         │
├─────────────────────────────────────────────────┤
│ 1. ProductCard (홈페이지)                       │
│    - 전체 재고 표시                              │
│    - 옵션별 품절 여부 표시                       │
│                                                  │
│ 2. BuyBottomSheet (구매 모달)                   │
│    - 옵션 선택 UI                                │
│    - 선택한 옵션의 재고 실시간 표시              │
│    - 재고 부족 시 구매 버튼 비활성화             │
│                                                  │
│ 3. Checkout (체크아웃)                          │
│    - 주문 생성 전 최종 재고 확인                 │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│              API Layer                           │
├─────────────────────────────────────────────────┤
│ supabaseApi.js                                   │
│                                                  │
│ 1. getProducts()                                 │
│    - 상품 + 옵션 조회                            │
│    - 옵션별 재고 포함                            │
│                                                  │
│ 2. checkOptionInventory()        ← 신규          │
│    - 특정 옵션의 재고 확인                       │
│    - 실시간 재고 조회                            │
│                                                  │
│ 3. createOrderWithOptions()      ← 수정          │
│    - 재고 검증                                   │
│    - 주문 생성                                   │
│    - 옵션 재고 차감 (트랜잭션)                   │
│    - order_items.options 저장                    │
│                                                  │
│ 4. updateOptionInventory()       ← 신규          │
│    - 옵션별 재고 증감                            │
│    - Supabase RPC 호출                           │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│              Database Layer                      │
├─────────────────────────────────────────────────┤
│ Supabase Database                                │
│                                                  │
│ 1. products 테이블                               │
│    - inventory: 전체 재고 (계산된 값)            │
│                                                  │
│ 2. product_options 테이블                        │
│    - values: JSONB                               │
│      [                                           │
│        {                                         │
│          "name": "블랙",                         │
│          "inventory": 10  ← 진실의 재고          │
│        }                                         │
│      ]                                           │
│                                                  │
│ 3. order_items 테이블                            │
│    - options: JSONB                              │
│      { "색상": "블랙", "사이즈": "M" }           │
│                                                  │
│ 4. RPC Functions                                 │
│    - update_option_inventory()   ← 신규          │
│    - calculate_total_inventory() ← 신규          │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│              관리자 화면                         │
├─────────────────────────────────────────────────┤
│ 1. AdminProductsPage                             │
│    - 옵션이 없는 상품: 기존 +/- 버튼             │
│    - 옵션이 있는 상품: 옵션별 +/- 버튼 표시      │
│                                                  │
│ 2. ProductCatalogPage                            │
│    - 상세 재고 관리 UI                           │
│    - 옵션별 재고 현황 표시                       │
└─────────────────────────────────────────────────┘
```

---

## 4. 구현 계획

### 4.1 Phase 1: DB 및 API 기반 구축 (우선순위: 최고)

#### Step 1-1: Supabase RPC 함수 생성
**예상 시간**: 30분

**파일**: Supabase SQL Editor

```sql
-- 1. 옵션별 재고 업데이트 함수
CREATE OR REPLACE FUNCTION update_option_inventory(
  p_product_id UUID,
  p_option_name TEXT,
  p_option_value TEXT,
  p_quantity_change INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_options JSONB;
  v_updated_options JSONB;
  v_current_inventory INTEGER;
BEGIN
  -- 현재 옵션 데이터 조회 (FOR UPDATE로 락)
  SELECT values INTO v_current_options
  FROM product_options
  WHERE product_id = p_product_id
    AND name = p_option_name
  FOR UPDATE;

  IF v_current_options IS NULL THEN
    RAISE EXCEPTION 'Option not found';
  END IF;

  -- 현재 재고 확인
  SELECT (elem->>'inventory')::int INTO v_current_inventory
  FROM jsonb_array_elements(v_current_options) elem
  WHERE elem->>'name' = p_option_value;

  -- 재고 부족 체크
  IF v_current_inventory + p_quantity_change < 0 THEN
    RAISE EXCEPTION 'Insufficient inventory';
  END IF;

  -- JSONB 업데이트 (옵션 재고 차감)
  v_updated_options := (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'name' = p_option_value
        THEN jsonb_set(
          elem,
          '{inventory}',
          to_jsonb((elem->>'inventory')::int + p_quantity_change)
        )
        ELSE elem
      END
    )
    FROM jsonb_array_elements(v_current_options) elem
  );

  -- 업데이트 실행
  UPDATE product_options
  SET values = v_updated_options
  WHERE product_id = p_product_id
    AND name = p_option_name;

  RETURN v_updated_options;
END;
$$;

-- 2. 전체 재고 계산 함수
CREATE OR REPLACE FUNCTION calculate_total_inventory(p_product_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total INTEGER := 0;
  v_option RECORD;
BEGIN
  -- 모든 옵션의 재고 합계 계산
  FOR v_option IN
    SELECT values
    FROM product_options
    WHERE product_id = p_product_id
  LOOP
    SELECT v_total + SUM((elem->>'inventory')::int) INTO v_total
    FROM jsonb_array_elements(v_option.values) elem;
  END LOOP;

  RETURN v_total;
END;
$$;

-- 3. products.inventory 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_product_total_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- product_options 변경 시 products.inventory 자동 계산
  UPDATE products
  SET inventory = calculate_total_inventory(NEW.product_id)
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_product_inventory
AFTER INSERT OR UPDATE ON product_options
FOR EACH ROW
EXECUTE FUNCTION update_product_total_inventory();
```

---

#### Step 1-2: supabaseApi.js - 옵션 재고 관리 함수 추가
**예상 시간**: 1시간

**파일**: `lib/supabaseApi.js`

```javascript
/**
 * 옵션별 재고 확인
 * @param {string} productId - 상품 ID
 * @param {object} selectedOptions - 선택한 옵션 { "색상": "블랙", "사이즈": "M" }
 * @returns {number} - 선택한 옵션 조합의 재고
 */
export const checkOptionInventory = async (productId, selectedOptions) => {
  try {
    // 1. 상품의 모든 옵션 조회
    const { data: productOptions, error } = await supabase
      .from('product_options')
      .select('name, values')
      .eq('product_id', productId)

    if (error) throw error

    // 2. 옵션이 없는 상품인 경우
    if (!productOptions || productOptions.length === 0) {
      const { data: product } = await supabase
        .from('products')
        .select('inventory')
        .eq('id', productId)
        .single()

      return product?.inventory || 0
    }

    // 3. 선택한 옵션별 재고 확인
    let minInventory = Infinity

    for (const option of productOptions) {
      const selectedValue = selectedOptions[option.name]
      if (!selectedValue) continue

      const valueData = option.values.find(v => v.name === selectedValue)
      if (!valueData) {
        throw new Error(`옵션 "${option.name}: ${selectedValue}"를 찾을 수 없습니다`)
      }

      minInventory = Math.min(minInventory, valueData.inventory || 0)
    }

    return minInventory === Infinity ? 0 : minInventory
  } catch (error) {
    console.error('옵션 재고 확인 오류:', error)
    return 0
  }
}

/**
 * 옵션별 재고 업데이트
 * @param {string} productId - 상품 ID
 * @param {string} optionName - 옵션명 (예: "색상")
 * @param {string} optionValue - 옵션값 (예: "블랙")
 * @param {number} quantityChange - 재고 증감 (+5, -2 등)
 */
export const updateOptionInventory = async (
  productId,
  optionName,
  optionValue,
  quantityChange
) => {
  try {
    // Supabase RPC 함수 호출 (트랜잭션 보장)
    const { data, error } = await supabase.rpc('update_option_inventory', {
      p_product_id: productId,
      p_option_name: optionName,
      p_option_value: optionValue,
      p_quantity_change: quantityChange
    })

    if (error) throw error

    logger.info('✅ 옵션 재고 업데이트 성공:', {
      productId,
      optionName,
      optionValue,
      quantityChange
    })

    return data
  } catch (error) {
    console.error('❌ 옵션 재고 업데이트 실패:', error)
    throw error
  }
}

/**
 * 주문 생성 (옵션 재고 차감 포함)
 * 기존 createOrder() 함수 수정
 */
export const createOrderWithOptions = async (orderData, userProfile, depositName = null) => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('로그인이 필요합니다')

    logger.debug('📦 옵션 재고 관리 주문 생성 시작')

    // 1. 재고 검증 (주문 생성 전)
    if (orderData.options && Object.keys(orderData.options).length > 0) {
      const availableStock = await checkOptionInventory(
        orderData.productId,
        orderData.options
      )

      if (availableStock < orderData.quantity) {
        throw new Error(
          `재고가 부족합니다. (요청: ${orderData.quantity}개, 재고: ${availableStock}개)`
        )
      }
    } else {
      // 옵션 없는 상품
      const { data: product } = await supabase
        .from('products')
        .select('inventory')
        .eq('id', orderData.productId)
        .single()

      if (product.inventory < orderData.quantity) {
        throw new Error(
          `재고가 부족합니다. (요청: ${orderData.quantity}개, 재고: ${product.inventory}개)`
        )
      }
    }

    // 2. 주문 생성 (기존 로직)
    const orderId = crypto.randomUUID()
    const customerOrderNumber = generateCustomerOrderNumber()

    // ... (기존 주문 생성 로직)

    // 3. order_items 생성 (옵션 정보 포함)
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .insert([{
        id: crypto.randomUUID(),
        order_id: orderId,
        product_id: orderData.productId,
        title: orderData.title,
        options: orderData.options || null, // ⭐ 옵션 저장
        quantity: orderData.quantity,
        price: orderData.price,
        unit_price: orderData.price,
        total: orderData.price * orderData.quantity,
        total_price: orderData.price * orderData.quantity
      }])
      .select()

    if (itemError) throw itemError

    // 4. 재고 차감
    if (orderData.options && Object.keys(orderData.options).length > 0) {
      // 옵션별 재고 차감
      for (const [optionName, optionValue] of Object.entries(orderData.options)) {
        await updateOptionInventory(
          orderData.productId,
          optionName,
          optionValue,
          -orderData.quantity // 음수로 차감
        )
      }
    } else {
      // 전체 재고 차감 (옵션 없는 상품)
      await updateProductInventory(orderData.productId, -orderData.quantity)
    }

    logger.info('✅ 주문 생성 및 재고 차감 완료')

    return order[0]
  } catch (error) {
    console.error('❌ 주문 생성 실패:', error)
    throw error
  }
}
```

---

### 4.2 Phase 2: 관리자 화면 (우선순위: 높음)

#### Step 2-1: 관리자 상품관리 - 옵션별 재고 UI
**예상 시간**: 1.5시간

**파일**: `app/admin/products/page.js`

**UI 구조**:
```
┌──────────────────────────────────────────┐
│ 상품: 티셔츠                              │
│                                          │
│ [옵션 펼치기 ▼]                          │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ 색상: 블랙                            │ │
│ │ 재고: [-] 10 [+]                      │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ 색상: 화이트                          │ │
│ │ 재고: [-] 5 [+]                       │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ 사이즈: M                             │ │
│ │ 재고: [-] 8 [+]                       │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ 전체 재고: 23개 (자동 계산)              │
└──────────────────────────────────────────┘
```

**코드**:
```javascript
// 옵션별 재고 증감 함수
const updateOptionInventoryUI = async (
  productId,
  optionName,
  optionValue,
  change
) => {
  try {
    await updateOptionInventory(productId, optionName, optionValue, change)
    toast.success('옵션 재고가 업데이트되었습니다')
    loadProducts()
  } catch (error) {
    console.error('옵션 재고 업데이트 실패:', error)
    toast.error('재고 업데이트에 실패했습니다')
  }
}

// JSX 렌더링
{product.options && product.options.length > 0 ? (
  <div className="mt-4">
    <button
      onClick={() => setExpandedProduct(
        expandedProduct === product.id ? null : product.id
      )}
      className="text-sm text-indigo-600 hover:text-indigo-800"
    >
      옵션별 재고 관리 {expandedProduct === product.id ? '▲' : '▼'}
    </button>

    {expandedProduct === product.id && (
      <div className="mt-3 space-y-2 bg-gray-50 p-3 rounded-lg">
        {product.options.map(option => (
          <div key={option.id}>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              {option.name}
            </h4>
            {option.values.map(value => (
              <div
                key={value.name}
                className="flex items-center justify-between bg-white p-2 rounded mb-2"
              >
                <span className="text-sm">{value.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateOptionInventoryUI(
                      product.id,
                      option.name,
                      value.name,
                      -1
                    )}
                    className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-medium">
                    {value.inventory}
                  </span>
                  <button
                    onClick={() => updateOptionInventoryUI(
                      product.id,
                      option.name,
                      value.name,
                      +1
                    )}
                    className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-600 rounded hover:bg-green-200"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            전체 재고: <span className="font-bold">{product.inventory}개</span>
            <span className="text-xs text-gray-500 ml-2">(자동 계산)</span>
          </p>
        </div>
      </div>
    )}
  </div>
) : (
  // 옵션 없는 상품: 기존 UI
  <div className="flex items-center gap-2">
    <button
      onClick={() => updateInventory(product.id, product.inventory - 1)}
      className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
    >
      -
    </button>
    <span className="w-16 text-center font-semibold">
      {product.inventory}
    </span>
    <button
      onClick={() => updateInventory(product.id, product.inventory + 1)}
      className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
    >
      +
    </button>
  </div>
)}
```

---

### 4.3 Phase 3: 사용자 화면 (우선순위: 높음)

#### Step 3-1: 홈페이지 - 옵션별 품절 표시
**예상 시간**: 45분

**파일**: `app/components/product/ProductCard.jsx`

**수정 사항**:
```javascript
// 현재 재고 계산 로직 개선
const calculateAvailableStock = (product) => {
  // 옵션이 있는 경우
  if (product.options && product.options.length > 0) {
    let totalStock = 0
    let hasOutOfStock = false

    product.options.forEach(option => {
      option.values.forEach(value => {
        totalStock += value.inventory || 0
        if (value.inventory === 0) {
          hasOutOfStock = true
        }
      })
    })

    return {
      total: totalStock,
      hasOutOfStock
    }
  }

  // 옵션이 없는 경우
  return {
    total: product.inventory || 0,
    hasOutOfStock: false
  }
}

const stockInfo = calculateAvailableStock(product)

// 품절 배지 표시
{stockInfo.total <= 0 && (
  <span className="inline-flex items-center px-2 py-1 bg-gray-500 text-white text-xs font-bold rounded">
    품절
  </span>
)}

{stockInfo.hasOutOfStock && stockInfo.total > 0 && (
  <span className="inline-flex items-center px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded">
    일부 옵션 품절
  </span>
)}
```

---

#### Step 3-2: 구매 모달 - 옵션 선택 시 재고 검증
**예상 시간**: 1시간

**파일**: `app/components/product/BuyBottomSheet.jsx`

**수정 사항**:
```javascript
// 선택한 옵션의 재고 확인
const [selectedOptionStock, setSelectedOptionStock] = useState(null)
const [isCheckingStock, setIsCheckingStock] = useState(false)

useEffect(() => {
  if (selectedOptions && Object.keys(selectedOptions).length > 0) {
    checkSelectedOptionStock()
  }
}, [selectedOptions])

const checkSelectedOptionStock = async () => {
  setIsCheckingStock(true)
  try {
    const stock = await checkOptionInventory(product.id, selectedOptions)
    setSelectedOptionStock(stock)
  } catch (error) {
    console.error('재고 확인 실패:', error)
    setSelectedOptionStock(0)
  } finally {
    setIsCheckingStock(false)
  }
}

// 구매 버튼 활성화 조건
const canPurchase = selectedOptionStock !== null
  && selectedOptionStock > 0
  && quantity <= selectedOptionStock

// UI 표시
{selectedOptionStock !== null && (
  <div className={`mt-3 p-3 rounded-lg ${
    selectedOptionStock > 0 ? 'bg-blue-50' : 'bg-red-50'
  }`}>
    <p className={`text-sm font-medium ${
      selectedOptionStock > 0 ? 'text-blue-700' : 'text-red-700'
    }`}>
      {selectedOptionStock > 0
        ? `재고: ${selectedOptionStock}개`
        : '⚠️ 선택한 옵션이 품절되었습니다'
      }
    </p>
  </div>
)}

<button
  onClick={handleBuyNow}
  disabled={!canPurchase || isCheckingStock}
  className={`w-full py-4 rounded-lg font-bold ${
    canPurchase
      ? 'bg-red-500 text-white hover:bg-red-600'
      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
  }`}
>
  {isCheckingStock ? '재고 확인 중...' : '구매하기'}
</button>
```

---

#### Step 3-3: 주문 생성 - 재고 검증 및 차감
**예상 시간**: 30분

**파일**: `app/checkout/page.js`

**수정 사항**:
```javascript
// 기존 createOrder() 대신 createOrderWithOptions() 사용
const handleCreateOrder = async () => {
  try {
    setIsProcessing(true)

    const orderData = {
      productId: product.id,
      title: product.title,
      price: product.price,
      quantity: quantity,
      options: selectedOptions, // ⭐ 옵션 정보 추가
      totalPrice: totalAmount
    }

    // 옵션 재고 관리가 포함된 주문 생성
    const order = await createOrderWithOptions(
      orderData,
      userProfile,
      depositName
    )

    toast.success('주문이 생성되었습니다')
    router.push(`/orders/${order.id}/complete`)
  } catch (error) {
    console.error('주문 생성 실패:', error)

    if (error.message.includes('재고가 부족')) {
      toast.error(error.message)
      // 재고 부족 시 모달 닫고 상품 페이지로 이동
      router.push('/')
    } else {
      toast.error('주문 생성에 실패했습니다')
    }
  } finally {
    setIsProcessing(false)
  }
}
```

---

## 5. 테스트 시나리오

### 5.1 단위 테스트

#### Test 1: 옵션별 재고 확인
```javascript
describe('checkOptionInventory', () => {
  it('선택한 옵션의 재고를 정확히 반환', async () => {
    const stock = await checkOptionInventory(productId, {
      '색상': '블랙',
      '사이즈': 'M'
    })
    expect(stock).toBe(10)
  })

  it('옵션이 없는 상품은 전체 재고 반환', async () => {
    const stock = await checkOptionInventory(productId, {})
    expect(stock).toBe(100)
  })

  it('존재하지 않는 옵션 선택 시 0 반환', async () => {
    const stock = await checkOptionInventory(productId, {
      '색상': '존재하지않는색'
    })
    expect(stock).toBe(0)
  })
})
```

---

#### Test 2: 옵션별 재고 차감
```javascript
describe('updateOptionInventory', () => {
  it('재고 차감이 정상 작동', async () => {
    // Before
    const before = await checkOptionInventory(productId, { '색상': '블랙' })

    // 재고 -2
    await updateOptionInventory(productId, '색상', '블랙', -2)

    // After
    const after = await checkOptionInventory(productId, { '색상': '블랙' })

    expect(after).toBe(before - 2)
  })

  it('재고 부족 시 에러 발생', async () => {
    await expect(
      updateOptionInventory(productId, '색상', '블랙', -1000)
    ).rejects.toThrow('Insufficient inventory')
  })
})
```

---

### 5.2 통합 테스트

#### Test 3: 주문 생성 및 재고 차감
```javascript
describe('createOrderWithOptions', () => {
  it('주문 생성 시 옵션 재고 차감', async () => {
    // Before
    const before = await checkOptionInventory(productId, {
      '색상': '블랙',
      '사이즈': 'M'
    })

    // 주문 생성 (수량: 2)
    await createOrderWithOptions({
      productId,
      options: { '색상': '블랙', '사이즈': 'M' },
      quantity: 2
    }, userProfile)

    // After
    const after = await checkOptionInventory(productId, {
      '색상': '블랙',
      '사이즈': 'M'
    })

    expect(after).toBe(before - 2)
  })

  it('재고 부족 시 주문 생성 실패', async () => {
    await expect(
      createOrderWithOptions({
        productId,
        options: { '색상': '블랙', '사이즈': 'M' },
        quantity: 1000 // 재고보다 많음
      }, userProfile)
    ).rejects.toThrow('재고가 부족')
  })

  it('order_items.options에 옵션 정보 저장', async () => {
    const order = await createOrderWithOptions({
      productId,
      options: { '색상': '블랙', '사이즈': 'M' },
      quantity: 1
    }, userProfile)

    const { data: orderItem } = await supabase
      .from('order_items')
      .select('options')
      .eq('order_id', order.id)
      .single()

    expect(orderItem.options).toEqual({
      '색상': '블랙',
      '사이즈': 'M'
    })
  })
})
```

---

### 5.3 동시성 테스트

#### Test 4: Race Condition 테스트
```javascript
describe('Concurrent Orders', () => {
  it('동시 주문 시 오버셀링 방지', async () => {
    // 재고: 3개
    // 사용자 A, B가 동시에 2개씩 주문

    const promises = [
      createOrderWithOptions({
        productId,
        options: { '색상': '블랙' },
        quantity: 2
      }, userA),
      createOrderWithOptions({
        productId,
        options: { '색상': '블랙' },
        quantity: 2
      }, userB)
    ]

    const results = await Promise.allSettled(promises)

    // 하나는 성공, 하나는 실패해야 함
    const success = results.filter(r => r.status === 'fulfilled')
    const failed = results.filter(r => r.status === 'rejected')

    expect(success.length).toBe(1)
    expect(failed.length).toBe(1)
    expect(failed[0].reason.message).toContain('재고가 부족')
  })
})
```

---

## 6. 리스크 관리

### 6.1 기술적 리스크

#### Risk 1: JSONB 성능
**위험**: JSONB 업데이트가 느릴 수 있음

**완화 방안**:
- RPC 함수 사용으로 DB 레벨 처리
- 인덱스 추가: `CREATE INDEX idx_product_options_product_id ON product_options(product_id)`
- 모니터링: 쿼리 성능 추적

---

#### Risk 2: 트랜잭션 실패
**위험**: RPC 함수 실행 중 에러

**완화 방안**:
- Try-catch 블록으로 에러 처리
- 트랜잭션 롤백 자동 처리
- 사용자에게 명확한 에러 메시지

---

#### Risk 3: 데이터 마이그레이션
**위험**: 기존 주문 데이터에 `options` 정보 없음

**완화 방안**:
- 새 주문부터 적용 (기존 데이터는 그대로)
- 관리자가 수동으로 옵션 정보 입력 가능한 UI 제공
- 데이터 정리 스크립트 작성

---

### 6.2 운영 리스크

#### Risk 4: 관리자 교육 필요
**위험**: 관리자가 새 UI를 모를 수 있음

**완화 방안**:
- 툴팁 추가
- 도움말 페이지 작성
- 사용자 가이드 영상 제작

---

#### Risk 5: 재고 데이터 불일치
**위험**: 트리거 실패 시 `products.inventory` 불일치

**완화 방안**:
- 정기적인 재고 동기화 스크립트
- 관리자 페이지에 "재고 재계산" 버튼 추가
- 모니터링 및 알림

```sql
-- 재고 재계산 스크립트
UPDATE products p
SET inventory = (
  SELECT calculate_total_inventory(p.id)
)
WHERE EXISTS (
  SELECT 1 FROM product_options WHERE product_id = p.id
);
```

---

## 7. 배포 계획

### 7.1 배포 순서

1. **DB 변경** (Supabase SQL Editor)
   - RPC 함수 생성
   - 트리거 생성
   - 인덱스 추가

2. **API 레이어** (`lib/supabaseApi.js`)
   - 새 함수 추가
   - 기존 함수 수정

3. **관리자 화면** (`app/admin/products/page.js`)
   - 옵션별 재고 UI 추가
   - 테스트

4. **사용자 화면**
   - 홈페이지 수정
   - 구매 모달 수정
   - 체크아웃 수정

5. **통합 테스트**
   - 전체 플로우 테스트
   - 동시성 테스트

6. **프로덕션 배포**
   - 점진적 롤아웃 (canary deployment)
   - 모니터링

---

### 7.2 롤백 계획

**문제 발생 시 롤백 순서**:
```
1. 사용자 화면 롤백 (가장 먼저)
2. 관리자 화면 롤백
3. API 레이어 롤백
4. DB 변경은 유지 (데이터 손실 방지)
```

**롤백 트리거**:
- 주문 실패율 > 5%
- 재고 불일치 발견
- 성능 저하 (응답 시간 > 2초)

---

## 8. 성공 지표 (KPI)

### 8.1 기술적 지표
- ✅ 오버셀링 발생률: 0%
- ✅ 재고 데이터 정확도: 99.9%
- ✅ 주문 생성 성공률: > 99%
- ✅ API 응답 시간: < 500ms

### 8.2 비즈니스 지표
- ✅ 고객 불만 감소: -80%
- ✅ 환불 요청 감소: -50%
- ✅ 재고 관리 효율성: +70%

---

## 9. 향후 개선 사항

### 9.1 Phase 4: 고급 기능 (선택사항)

1. **재고 알림**
   - 특정 옵션 재고 < 10개 시 관리자에게 알림
   - 품절 시 자동 상태 변경

2. **재입고 알림**
   - 사용자가 품절 옵션에 대해 재입고 알림 신청
   - 재고 추가 시 자동 알림

3. **재고 예약 시스템**
   - 장바구니 담기 시 5분간 재고 예약
   - 결제 완료 or 시간 초과 시 예약 해제

4. **재고 분석 대시보드**
   - 옵션별 판매량 통계
   - 재고 회전율
   - 품절 빈도 분석

---

## 10. 체크리스트

### 구현 전 확인사항
- [ ] Supabase 프로젝트 백업 완료
- [ ] 테스트 환경 준비 완료
- [ ] 관리자 교육 자료 준비

### 구현 중 확인사항
- [ ] DB RPC 함수 정상 작동 확인
- [ ] 트랜잭션 정상 처리 확인
- [ ] 에러 핸들링 완료

### 배포 후 확인사항
- [ ] 실제 주문 생성 테스트
- [ ] 재고 차감 확인
- [ ] 동시 주문 테스트
- [ ] 성능 모니터링
- [ ] 에러 로그 확인

---

**최종 검토자**: Claude Code
**승인 대기**: 사용자 확인 필요
**예상 총 작업 시간**: 6-8시간
**우선순위**: 🔥🔥🔥 최고 (즉시 시작 권장)
