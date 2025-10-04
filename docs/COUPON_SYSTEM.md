# 🎟️ 쿠폰 시스템 완벽 가이드

**작성일**: 2025-10-03
**상태**: ✅ 완료 및 프로덕션 적용

---

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [데이터베이스 구조](#데이터베이스-구조)
3. [쿠폰 할인 규칙](#쿠폰-할인-규칙)
4. [API 함수](#api-함수)
5. [중앙화된 계산 모듈](#중앙화된-계산-모듈)
6. [UI 적용 현황](#ui-적용-현황)
7. [사용 예제](#사용-예제)
8. [트러블슈팅](#트러블슈팅)

---

## 시스템 개요

### 쿠폰 시스템 플로우

```
1. 관리자가 쿠폰 생성
   ↓
2. 사용자에게 쿠폰 발급
   ↓
3. 사용자가 체크아웃에서 쿠폰 선택
   ↓
4. DB 함수로 쿠폰 검증 및 할인 금액 계산
   ↓
5. 주문 생성 시 쿠폰 사용 처리
   ↓
6. 쿠폰 상태 업데이트 (is_used = true)
```

### 핵심 특징

- ✅ **배송비 제외 할인**: 퍼센트 할인은 상품 금액에만 적용
- ✅ **최대 할인 금액**: 퍼센트 쿠폰에 최대 할인액 제한 가능
- ✅ **중앙화된 계산**: OrderCalculations.js에서 일관된 계산
- ✅ **DB 레벨 검증**: PostgreSQL 함수로 안전한 검증
- ✅ **사용 이력 추적**: user_coupons 테이블에 모든 사용 기록

---

## 데이터베이스 구조

### 1. `coupons` 테이블 (마스터)

관리자가 생성하는 쿠폰 마스터 테이블

```sql
CREATE TABLE coupons (
    id UUID PRIMARY KEY,

    -- 기본 정보
    code VARCHAR(50) UNIQUE NOT NULL,           -- 쿠폰 코드 (예: WELCOME, PERCENT10)
    name VARCHAR(255) NOT NULL,                  -- 쿠폰 이름
    description TEXT,                            -- 설명

    -- 할인 규칙
    discount_type VARCHAR(20) NOT NULL,          -- 'fixed_amount' | 'percentage'
    discount_value DECIMAL(12, 2) NOT NULL,      -- 할인 값 (4000 또는 10)

    -- 사용 조건
    min_purchase_amount DECIMAL(12, 2),          -- 최소 구매 금액
    max_discount_amount DECIMAL(12, 2),          -- 최대 할인 금액 (percentage 타입)

    -- 유효 기간
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,

    -- 사용 제한
    usage_limit_per_user INTEGER DEFAULT 1,     -- 사용자당 사용 가능 횟수
    total_usage_limit INTEGER,                   -- 전체 사용 가능 횟수 (선착순)
    total_issued_count INTEGER DEFAULT 0,        -- 총 발급된 수
    total_used_count INTEGER DEFAULT 0,          -- 총 사용된 수

    -- 상태
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. `user_coupons` 테이블 (발급 및 사용 이력)

사용자별 쿠폰 보유 및 사용 이력

```sql
CREATE TABLE user_coupons (
    id UUID PRIMARY KEY,

    -- 관계
    user_id UUID NOT NULL REFERENCES profiles(id),
    coupon_id UUID NOT NULL REFERENCES coupons(id),

    -- 사용 정보
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    order_id UUID REFERENCES orders(id),
    discount_amount DECIMAL(12, 2),              -- 실제 할인된 금액 (스냅샷)

    -- 배포 정보
    issued_by UUID REFERENCES profiles(id),      -- 누가 배포했는지
    issued_at TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 중복 방지 (사용자당 동일 쿠폰 1회만 보유)
    UNIQUE(user_id, coupon_id)
);
```

### 3. `orders` 테이블 (쿠폰 사용 기록)

주문에 쿠폰 할인 금액 저장

```sql
ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(12, 2) DEFAULT 0;
```

---

## 쿠폰 할인 규칙

### 🎯 핵심 원칙

> **쿠폰 할인은 상품 금액에만 적용되며, 배송비는 할인 대상이 아닙니다!**

### 할인 타입별 계산 방법

#### 1. 금액 할인 (fixed_amount)

**규칙**: 쿠폰 금액과 상품 금액 중 작은 값을 할인

```javascript
할인금액 = MIN(쿠폰금액, 상품금액)
```

**예시**:
```
쿠폰: WELCOME (4,000원 할인)
상품금액: 40,000원
배송비: 4,000원

계산:
- 할인금액 = MIN(4,000원, 40,000원) = 4,000원
- 최종 결제금액 = 40,000원 - 4,000원 + 4,000원 = 40,000원
```

---

#### 2. 퍼센트 할인 (percentage)

**규칙**: 상품 금액의 X% 할인 (배송비 제외, 최대 할인 금액 제한)

```javascript
기본할인 = 상품금액 × (퍼센트 / 100)
최종할인 = MIN(기본할인, 최대할인금액)
```

**예시 1**: 최대 할인 제한 미적용
```
쿠폰: PERCENT10 (10% 할인, 최대 5,000원)
상품금액: 40,000원
배송비: 4,000원

계산:
- 기본할인 = 40,000원 × 10% = 4,000원
- 최종할인 = MIN(4,000원, 5,000원) = 4,000원 (제한 미적용)
- 최종 결제금액 = 40,000원 - 4,000원 + 4,000원 = 40,000원
```

**예시 2**: 최대 할인 제한 적용
```
쿠폰: PERCENT10 (10% 할인, 최대 5,000원)
상품금액: 100,000원
배송비: 4,000원

계산:
- 기본할인 = 100,000원 × 10% = 10,000원
- 최종할인 = MIN(10,000원, 5,000원) = 5,000원 (제한 적용!)
- 최종 결제금액 = 100,000원 - 5,000원 + 4,000원 = 99,000원
```

---

### 🚨 중요: 배송비는 할인 대상이 아님!

**잘못된 계산** (❌):
```javascript
// 배송비 포함해서 계산 (잘못됨!)
const totalAmount = productAmount + shippingFee
const discount = totalAmount * 0.1  // 배송비까지 할인됨 ❌
```

**올바른 계산** (✅):
```javascript
// 상품 금액만 할인 계산
const discount = productAmount * 0.1  // 배송비 제외 ✅
const finalAmount = productAmount - discount + shippingFee
```

---

## API 함수

### `/lib/couponApi.js`

쿠폰 관련 모든 API 함수

#### 1. `getUserCoupons(userId)`

사용자가 보유한 미사용 쿠폰 목록 조회

```javascript
import { getUserCoupons } from '@/lib/couponApi'

const coupons = await getUserCoupons(userId)
// 반환: [{ id, coupon_id, is_used, coupon: { code, name, ... } }]
```

**반환 데이터 구조**:
```javascript
[
  {
    id: "user-coupon-uuid",
    user_id: "user-uuid",
    coupon_id: "coupon-uuid",
    is_used: false,
    issued_at: "2025-10-03T...",
    coupon: {
      code: "WELCOME",
      name: "첫가입 웰컴 쿠폰",
      description: "첫 주문 배송비 무료!",
      discount_type: "fixed_amount",
      discount_value: 4000,
      min_purchase_amount: 0,
      max_discount_amount: null,
      valid_until: "2026-04-03T..."
    }
  }
]
```

---

#### 2. `validateCoupon(code, userId, productAmount)`

쿠폰 유효성 검증 및 할인 금액 계산

```javascript
import { validateCoupon } from '@/lib/couponApi'

const result = await validateCoupon('WELCOME', userId, 40000)
// productAmount는 배송비 제외한 상품 금액만!

if (result.is_valid) {
  console.log('할인금액:', result.discount_amount)
} else {
  console.error('오류:', result.error_message)
}
```

**반환 데이터 구조**:
```javascript
// 성공
{
  is_valid: true,
  error_message: null,
  coupon_id: "coupon-uuid",
  discount_amount: 4000
}

// 실패
{
  is_valid: false,
  error_message: "최소 구매 금액 30,000원 이상이어야 합니다.",
  coupon_id: null,
  discount_amount: 0
}
```

**검증 항목**:
- ✅ 쿠폰 존재 여부
- ✅ 활성화 상태
- ✅ 유효 기간
- ✅ 최소 구매 금액
- ✅ 전체 사용 한도
- ✅ 사용자 보유 여부
- ✅ 이미 사용 여부

---

#### 3. `applyCouponUsage(userId, couponId, orderId, discountAmount)`

쿠폰 사용 처리 (주문 생성 시 호출)

```javascript
import { applyCouponUsage } from '@/lib/couponApi'

const success = await applyCouponUsage(userId, couponId, orderId, 4000)
if (success) {
  console.log('쿠폰 사용 완료')
}
```

**처리 내용**:
- ✅ `user_coupons.is_used = true`
- ✅ `user_coupons.used_at = NOW()`
- ✅ `user_coupons.order_id = orderId`
- ✅ `user_coupons.discount_amount = discountAmount`
- ✅ `coupons.total_used_count += 1` (트리거)

---

## 중앙화된 계산 모듈

### `/lib/orderCalculations.js`

모든 주문 금액 계산은 이 모듈을 사용 (강제!)

#### 1. `applyCouponDiscount(itemsTotal, coupon)`

쿠폰 할인만 계산

```javascript
import { OrderCalculations } from '@/lib/orderCalculations'

const couponResult = OrderCalculations.applyCouponDiscount(40000, {
  type: 'percentage',
  value: 10,
  maxDiscount: 5000,
  code: 'PERCENT10'
})

console.log(couponResult)
// {
//   itemsTotal: 40000,
//   discountAmount: 4000,
//   itemsTotalAfterDiscount: 36000,
//   couponApplied: true,
//   couponInfo: { ... }
// }
```

---

#### 2. `calculateFinalOrderAmount(items, options)`

완전한 주문 금액 계산 (쿠폰 포함)

```javascript
import { OrderCalculations } from '@/lib/orderCalculations'

const orderCalc = OrderCalculations.calculateFinalOrderAmount(items, {
  region: 'normal',              // 배송 지역
  coupon: {
    type: 'percentage',
    value: 10,
    maxDiscount: 5000,
    code: 'PERCENT10'
  },
  paymentMethod: 'transfer'      // 'transfer' | 'card'
})

console.log(orderCalc)
// {
//   itemsTotal: 40000,           // 상품금액
//   couponDiscount: 4000,        // 쿠폰할인
//   itemsTotalAfterDiscount: 36000,  // 할인후상품금액
//   shippingFee: 4000,           // 배송비
//   subtotal: 40000,             // 소계 (할인후 + 배송비)
//   vat: 0,                      // 부가세 (카드결제 시만)
//   finalAmount: 40000,          // 최종결제금액
//   paymentMethod: 'transfer',
//   couponApplied: true,
//   breakdown: {
//     상품금액: 40000,
//     쿠폰할인: 4000,
//     할인후상품금액: 36000,
//     배송비: 4000,
//     부가세: 0,
//     최종결제금액: 40000
//   }
// }
```

---

### 계산 플로우

```
items (주문 아이템)
  ↓
1. calculateItemsTotal(items)
   → itemsTotal (상품 총액)
  ↓
2. applyCouponDiscount(itemsTotal, coupon)
   → couponDiscount (쿠폰 할인)
   → itemsTotalAfterDiscount (할인 후 상품금액)
  ↓
3. calculateShippingFee(itemsTotal, region)
   → shippingFee (배송비)
  ↓
4. subtotal = itemsTotalAfterDiscount + shippingFee
  ↓
5. if (paymentMethod === 'card')
     vat = subtotal × 10%
     finalAmount = subtotal + vat
   else
     finalAmount = subtotal
```

---

## UI 적용 현황

### ✅ 적용 완료된 페이지

#### 1. 체크아웃 페이지 (`/app/checkout/page.js`)

**기능**:
- 사용자 보유 쿠폰 목록 표시
- 쿠폰 선택 및 적용
- 할인 금액 실시간 표시
- 최종 결제금액 계산

**UI 요소**:
```javascript
// 쿠폰 섹션
{availableCoupons.length > 0 && (
  <div>
    <h2>쿠폰</h2>
    <span>{availableCoupons.length}개 보유</span>

    {/* 선택된 쿠폰 */}
    {selectedCoupon && (
      <div>
        <span>{selectedCoupon.coupon.code}</span>
        <span>-₩{couponDiscount.toLocaleString()} 할인</span>
      </div>
    )}

    {/* 쿠폰 리스트 */}
    {showCouponList && availableCoupons.map(coupon => ...)}
  </div>
)}

// 결제 금액
<div>
  <div>상품 금액: ₩{orderCalc.itemsTotal.toLocaleString()}</div>
  <div>배송비: ₩{orderCalc.shippingFee.toLocaleString()}</div>
  {orderCalc.couponApplied && (
    <div>쿠폰 할인: -₩{orderCalc.couponDiscount.toLocaleString()}</div>
  )}
  <div>총 결제금액: ₩{orderCalc.finalAmount.toLocaleString()}</div>
</div>
```

---

#### 2. 주문 완료 페이지 (`/app/orders/[id]/complete/page.js`)

**기능**:
- 주문 완료 후 쿠폰 할인 내역 표시
- 카드결제/계좌이체 구분 표시

**카드결제 표시**:
```javascript
<div>
  <div>상품금액: ₩{orderCalc.itemsTotal.toLocaleString()}</div>
  {orderCalc.couponApplied && (
    <div>쿠폰 할인: -₩{orderCalc.couponDiscount.toLocaleString()}</div>
  )}
  <div>배송비: ₩{orderCalc.shippingFee.toLocaleString()}</div>
  <div>부가세 (10%): ₩{orderCalc.vat.toLocaleString()}</div>
  <div>카드 결제금액: ₩{orderCalc.finalAmount.toLocaleString()}</div>
</div>
```

**계좌이체 표시**:
```javascript
<div>
  <div>상품 금액: ₩{orderCalc.itemsTotal.toLocaleString()}</div>
  <div>배송비: ₩{orderCalc.shippingFee.toLocaleString()}</div>
  {orderCalc.couponApplied && (
    <div>쿠폰 할인: -₩{orderCalc.couponDiscount.toLocaleString()}</div>
  )}
  <div>입금금액: ₩{orderCalc.finalAmount.toLocaleString()}</div>
</div>
```

---

#### 3. 관리자 주문 상세 (`/app/admin/orders/[id]/page.js`)

**기능**:
- 주문의 쿠폰 할인 내역 표시
- 카드결제 시 부가세 표시
- DB 저장값과 계산값 비교

**표시 내용**:
```javascript
<div>
  <div>상품 금액: ₩{orderCalc.itemsTotal.toLocaleString()}</div>
  <div>배송비: ₩{orderCalc.shippingFee.toLocaleString()}</div>
  {orderCalc.couponApplied && (
    <div>쿠폰 할인: -₩{orderCalc.couponDiscount.toLocaleString()}</div>
  )}
  {order.payment?.method === 'card' && (
    <div>부가세 (10%): ₩{orderCalc.vat.toLocaleString()}</div>
  )}
  <div>최종 결제 금액: ₩{orderCalc.finalAmount.toLocaleString()}</div>
</div>
```

---

#### 4. 관리자 주문 리스트 (`/app/admin/orders/page.js`)

**기능**:
- 주문 목록에서 쿠폰 할인 표시
- 데스크톱/모바일 뷰 모두 적용

**표시 내용**:
```javascript
// 데스크톱 테이블
<td>
  <div>₩{orderCalc.finalAmount.toLocaleString()}</div>
  {orderCalc.couponApplied && (
    <div>(쿠폰 -₩{orderCalc.couponDiscount.toLocaleString()})</div>
  )}
</td>

// 모바일 카드
<div>
  <div>₩{orderCalc.finalAmount.toLocaleString()}</div>
  {orderCalc.couponApplied && (
    <div>(쿠폰 -₩{orderCalc.couponDiscount.toLocaleString()})</div>
  )}
</div>
```

---

## 사용 예제

### 예제 1: 체크아웃에서 쿠폰 적용

```javascript
// 1. 사용자 쿠폰 목록 불러오기
const availableCoupons = await getUserCoupons(userId)

// 2. 쿠폰 선택 시 검증
const handleApplyCoupon = async (coupon) => {
  const result = await validateCoupon(
    coupon.code,
    userId,
    orderItem.totalPrice  // 상품 금액만 (배송비 제외!)
  )

  if (!result.is_valid) {
    toast.error(result.error_message)
    return
  }

  setSelectedCoupon(coupon)
  setCouponDiscount(result.discount_amount)
  toast.success(`${coupon.name} 쿠폰이 적용되었습니다`)
}

// 3. 최종 금액 계산
const orderCalc = OrderCalculations.calculateFinalOrderAmount(items, {
  region: shippingInfo.region,
  coupon: selectedCoupon ? {
    type: selectedCoupon.coupon.discount_type,
    value: selectedCoupon.coupon.discount_value,
    maxDiscount: selectedCoupon.coupon.max_discount_amount,
    code: selectedCoupon.coupon.code
  } : null,
  paymentMethod: 'transfer'
})

// 4. 주문 생성 시 쿠폰 사용 처리
const newOrder = await createOrder(orderItemWithCoupon, userProfile, depositName)

if (selectedCoupon && couponDiscount > 0) {
  await applyCouponUsage(userId, selectedCoupon.coupon_id, newOrder.id, couponDiscount)
}
```

---

### 예제 2: 주문 상세 페이지에서 쿠폰 정보 표시

```javascript
// 주문 데이터에서 쿠폰 할인 확인
const orderData = await getOrderById(orderId)

// 중앙화된 계산 모듈로 재계산
const orderCalc = OrderCalculations.calculateFinalOrderAmount(orderData.items, {
  region: shippingInfo.region,
  coupon: orderData.discount_amount > 0 ? {
    type: 'fixed_amount',  // DB에서 discount_amount만 저장됨
    value: orderData.discount_amount
  } : null,
  paymentMethod: orderData.payment?.method === 'card' ? 'card' : 'transfer'
})

// UI 렌더링
{orderCalc.couponApplied && (
  <div className="text-blue-600">
    쿠폰 할인: -₩{orderCalc.couponDiscount.toLocaleString()}
  </div>
)}
```

---

### 예제 3: 관리자가 쿠폰 생성

```sql
-- 금액 할인 쿠폰 (WELCOME)
INSERT INTO coupons (
    code, name, description,
    discount_type, discount_value,
    min_purchase_amount, max_discount_amount,
    valid_from, valid_until,
    usage_limit_per_user, total_usage_limit,
    is_active
) VALUES (
    'WELCOME',
    '첫가입 웰컴 쿠폰',
    '첫 주문 배송비 무료! (4,000원 할인)',
    'fixed_amount', 4000,
    0, NULL,
    NOW(), NOW() + INTERVAL '1 year',
    1, NULL,
    true
);

-- 퍼센트 할인 쿠폰 (PERCENT10)
INSERT INTO coupons (
    code, name, description,
    discount_type, discount_value,
    min_purchase_amount, max_discount_amount,
    valid_from, valid_until,
    usage_limit_per_user, total_usage_limit,
    is_active
) VALUES (
    'PERCENT10',
    '10% 할인 쿠폰',
    '전 상품 10% 할인! (최대 5,000원)',
    'percentage', 10,
    30000, 5000,
    NOW(), NOW() + INTERVAL '6 months',
    1, 100,
    true
);
```

---

### 예제 4: 사용자에게 쿠폰 발급

```sql
-- 특정 사용자에게 WELCOME 쿠폰 발급
INSERT INTO user_coupons (user_id, coupon_id, issued_by)
SELECT
    'user-uuid',
    id,
    'admin-uuid'
FROM coupons
WHERE code = 'WELCOME';
```

---

## 트러블슈팅

### 문제 1: "보유하지 않은 쿠폰입니다"

**원인**: `user_coupons` 테이블에 해당 쿠폰이 발급되지 않음

**해결**:
```sql
-- 쿠폰 발급 확인
SELECT * FROM user_coupons
WHERE user_id = 'user-uuid' AND coupon_id = 'coupon-uuid';

-- 없다면 발급
INSERT INTO user_coupons (user_id, coupon_id)
VALUES ('user-uuid', 'coupon-uuid');
```

---

### 문제 2: "최소 구매 금액 X원 이상이어야 합니다"

**원인**: 상품 금액이 쿠폰의 `min_purchase_amount`보다 작음

**해결**:
- 최소 구매 금액을 충족하도록 상품 추가
- 또는 쿠폰의 `min_purchase_amount` 조정

---

### 문제 3: "이미 사용한 쿠폰입니다"

**원인**: `user_coupons.is_used = true`

**해결**:
```sql
-- 쿠폰 사용 내역 확인
SELECT * FROM user_coupons
WHERE user_id = 'user-uuid' AND coupon_id = 'coupon-uuid';

-- 테스트 환경에서 재사용 필요 시 (주의!)
UPDATE user_coupons
SET is_used = false, used_at = NULL, order_id = NULL
WHERE id = 'user-coupon-uuid';
```

---

### 문제 4: 쿠폰 할인이 배송비에도 적용됨

**원인**: `validateCoupon` 함수에 배송비 포함된 금액 전달

**잘못된 코드**:
```javascript
// ❌ 배송비 포함해서 전달
const totalAmount = productAmount + shippingFee
await validateCoupon(code, userId, totalAmount)
```

**올바른 코드**:
```javascript
// ✅ 상품 금액만 전달
await validateCoupon(code, userId, productAmount)
```

---

### 문제 5: 퍼센트 할인이 최대 금액을 초과함

**원인**: `max_discount_amount` 설정 누락 또는 계산 로직 오류

**해결**:
```javascript
// OrderCalculations.applyCouponDiscount에서 자동 처리
if (coupon.type === 'percentage') {
  discountAmount = Math.floor(itemsTotal * (coupon.value / 100))

  // 최대 할인 금액 제한
  if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
    discountAmount = coupon.maxDiscount
  }
}
```

---

### 문제 6: "column reference 'coupon_id' is ambiguous" (PostgreSQL 에러 42702)

**원인**: validate_coupon 함수에서 WHERE 절의 `coupon_id`가 테이블 컬럼인지 변수인지 모호함

**증상**:
```javascript
// 쿠폰 적용 시 에러 발생
{
  code: '42702',
  message: 'column reference "coupon_id" is ambiguous',
  hint: 'It could refer to either a PL/pgSQL variable or a table column.'
}
```

**해결**:
```sql
-- ❌ 잘못된 코드
SELECT * INTO v_user_coupon
FROM user_coupons
WHERE user_id = p_user_id AND coupon_id = v_coupon.id;

-- ✅ 올바른 코드 (테이블 prefix 추가)
SELECT * INTO v_user_coupon
FROM user_coupons
WHERE user_coupons.user_id = p_user_id AND user_coupons.coupon_id = v_coupon.id;
```

**적용 방법**:
1. Supabase Dashboard → SQL Editor
2. `/supabase/migrations/fix_validate_coupon.sql` 파일 내용 복사
3. Run 클릭

**주의**: `CREATE OR REPLACE FUNCTION`으로 파라미터 이름을 변경할 수 없으므로 먼저 `DROP FUNCTION` 필수

```sql
DROP FUNCTION IF EXISTS validate_coupon(character varying, uuid, numeric);
CREATE OR REPLACE FUNCTION validate_coupon(...) ...
```

---

## 🎯 체크리스트

### 쿠폰 생성 시

- [ ] `discount_type` 정확한가? (fixed_amount | percentage)
- [ ] `discount_value` 정확한가? (금액 또는 퍼센트)
- [ ] `min_purchase_amount` 설정했는가?
- [ ] `max_discount_amount` 설정했는가? (percentage 타입 시 필수)
- [ ] `valid_until` 설정했는가?
- [ ] `usage_limit_per_user` 설정했는가?
- [ ] `total_usage_limit` 설정했는가? (선착순 제한)

### 쿠폰 적용 시

- [ ] `validateCoupon`에 상품 금액만 전달하는가? (배송비 제외!)
- [ ] `OrderCalculations.calculateFinalOrderAmount` 사용하는가?
- [ ] 쿠폰 할인 후 배송비를 더하는가?
- [ ] 주문 생성 시 `applyCouponUsage` 호출하는가?
- [ ] `order.discount_amount`에 할인 금액 저장하는가?

### UI 표시 시

- [ ] 쿠폰 할인 금액이 표시되는가?
- [ ] 최종 결제금액이 정확한가?
- [ ] 카드결제 시 부가세가 표시되는가?
- [ ] 모바일 뷰에도 적용되었는가?

---

## 📚 관련 문서

- **DB_REFERENCE_GUIDE.md** - coupons, user_coupons 테이블 스키마
- **CODING_RULES.md** - OrderCalculations 사용 강제 규칙
- **WORK_LOG_2025-10-03_COUPON_CENTRALIZATION.md** - 중앙화 리팩토링 작업 로그

---

**마지막 업데이트**: 2025-10-03
**작성자**: Claude Code
**상태**: ✅ 프로덕션 적용 완료
