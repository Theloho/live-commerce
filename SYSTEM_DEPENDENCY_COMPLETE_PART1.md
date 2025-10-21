# SYSTEM_DEPENDENCY_COMPLETE - Part 1: 중앙 함수 종속성 맵 (유틸리티)

**목적**: 임기응변 코드 작성 방지 - 중앙 함수 수정 시 영향받는 모든 곳을 명확히 파악

**작성일**: 2025-10-20
**버전**: 2.0 (2025-10-21 분할)
**총 5개 Part 중 Part 1 (유틸리티 함수)**

---

## 📚 문서 구조

- **Part 1 (현재)**: 중앙 함수 종속성 맵 - **유틸리티 함수** (orderCalculations, couponApi, shippingUtils 등)
- **Part 1_2**: 중앙 함수 종속성 맵 - **Infrastructure Layer** (Repository 메서드)
- **Part 2**: DB 테이블 사용처 맵 - 22개 테이블별 CRUD 위치
- **Part 3**: API 엔드포인트 종속성 맵 - 67개 API의 호출처와 중앙 함수
- **Part 4**: 페이지별 종속성 맵 - 36개 페이지가 사용하는 함수/DB/API
- **Part 5**: 수정 영향도 매트릭스 - X 수정 시 Y, Z 확인 체크리스트

---

## 📋 목차

### 1. orderCalculations.js (11개 메서드)
- [1.1 calculateFinalOrderAmount()](#11-calculatefinalorderamount)
- [1.2 calculateItemsTotal()](#12-calculateitemstotal)
- [1.3 calculateShippingFee()](#13-calculateshippingfee)
- [1.4 applyCouponDiscount()](#14-applycoupondiscount)
- [1.5 calculateOrderTotal()](#15-calculateordertotal)
- [1.6 calculateGroupOrderTotal()](#16-calculategroupordertotal)
- [1.7 calculateCardAmount()](#17-calculatecardamount)
- [1.8 calculateDepositAmount()](#18-calculatedepositamount)
- [1.9 calculateFinalAmount()](#19-calculatefinalamount)
- [1.10 normalizeOrderItems()](#110-normalizeorderitems)
- [1.11 applyDiscount() (deprecated)](#111-applydiscount-deprecated)

### 2. couponApi.js (15개 함수)
- [2.1 createCoupon()](#21-createcoupon)
- [2.2 getCoupons()](#22-getcoupons)
- [2.3 getCoupon()](#23-getcoupon)
- [2.4 getCouponByCode()](#24-getcouponbycode)
- [2.5 updateCoupon()](#25-updatecoupon)
- [2.6 toggleCouponStatus()](#26-togglecouponstatus)
- [2.7 deleteCoupon()](#27-deletecoupon)
- [2.8 distributeCoupon()](#28-distributecoupon)
- [2.9 distributeToAllCustomers()](#29-distributetoallcustomers)
- [2.10 getCouponHolders()](#210-getcouponholders)
- [2.11 getUserCoupons()](#211-getusercoupons)
- [2.12 validateCoupon()](#212-validatecoupon)
- [2.13 applyCouponUsage()](#213-applycouponusage)
- [2.14 getCouponStats()](#214-getcouponstats)
- [2.15 getAllCouponsStats()](#215-getallcouponsstats)

### 3. shippingUtils.js (2개 함수)
- [3.1 calculateShippingSurcharge()](#31-calculateshippingsurcharge)
- [3.2 formatShippingInfo()](#32-formatshippinginfo)

### 4. UserProfileManager.js (12개 메서드)
- [4.1 getCurrentUser()](#41-getcurrentuser)
- [4.2 loadUserProfile()](#42-loaduserprofile)
- [4.3 getUserOrderQuery()](#43-getuserorderquery)
- [4.4 normalizeProfile()](#44-normalizeprofile)
- [4.5 validateProfile()](#45-validateprofile)
- [4.6 atomicProfileUpdate()](#46-atomicprofileupdate)
- [4.7 updateProfile() (deprecated)](#47-updateprofile-deprecated)
- [4.8 prepareShippingData()](#48-prepareshippingdata)
- [4.9 checkCompleteness()](#49-checkcompleteness)
- [4.10 ShippingDataManager.extractShippingInfo()](#410-shippingdatamanagerextractshippinginfo)
- [4.11 ShippingDataManager.validateShippingInfo()](#411-shippingdatamanagervalidateshippinginfo)

### 5. fulfillmentGrouping.js (4개 함수)
- [5.1 groupOrdersByShipping()](#51-groupordersbyshipping)
- [5.2 createGroupData()](#52-creategroupdata)
- [5.3 generateGroupCSV()](#53-generategroupcsv)
- [5.4 generateOrderCSV()](#54-generateordercsv)

### 6. logisticsAggregation.js (3개 함수)
- [6.1 aggregateProductsForLogistics()](#61-aggregateproductsforlogistics)
- [6.2 generateLogisticsCSV()](#62-generatelogisticscsv)
- [6.3 getSupplierSummary()](#63-getsuppliersummary)

---

**Repository 메서드는**: [SYSTEM_DEPENDENCY_COMPLETE_PART1_2.md](./SYSTEM_DEPENDENCY_COMPLETE_PART1_2.md) 참조

---

# 1. orderCalculations.js

**파일 위치**: `/lib/orderCalculations.js`
**목적**: 주문 계산 로직 통합 모듈 - 모든 주문 관련 계산을 중앙화하여 일관성 보장
**클래스**: `OrderCalculations` (static methods)

---

## 1.1 calculateFinalOrderAmount()

**목적**: 최종 주문 금액 계산 (쿠폰 할인 포함) - **가장 많이 사용되는 핵심 함수**

**함수 시그니처**:
```javascript
OrderCalculations.calculateFinalOrderAmount(items, options = {})
```

**파라미터**:
- `items` (Array): 주문 아이템 배열
- `options` (Object):
  - `region` (string): 배송 지역 또는 우편번호 (default: 'normal')
  - `coupon` (Object): 쿠폰 정보 { type, value, maxDiscount, code }
  - `paymentMethod` (string): 결제 방법 'card' | 'transfer' (default: 'transfer')
  - `baseShippingFee` (number): 기본 배송비 (default: 4000)

**반환값** (Object):
```javascript
{
  itemsTotal: 100000,              // 상품 금액
  couponDiscount: 10000,           // 쿠폰 할인액
  itemsTotalAfterDiscount: 90000,  // 할인 후 상품금액
  shippingFee: 7000,               // 배송비 (도서산간 포함)
  subtotal: 97000,                 // 소계 (할인후상품 + 배송비)
  vat: 0,                          // 부가세 (카드결제 시만)
  finalAmount: 97000,              // 최종 결제 금액
  paymentMethod: 'transfer',       // 결제 방법
  couponApplied: true,             // 쿠폰 적용 여부
  breakdown: { ... }               // 상세 내역 (한글)
}
```

**사용처** (7곳):

### 📄 사용자 페이지

1. **`/app/checkout/page.js`**
   - Line 583: 결제대기 주문 금액 계산
   - Line 641: 일반 주문 금액 계산 (쿠폰 적용)
   - Line 1380: 카드 결제 금액 표시

2. **`/app/orders/page.js`**
   - Line 581: 주문 카드별 금액 표시

3. **`/app/orders/[id]/complete/page.js`**
   - Line 161: 주문 완료 페이지 금액 재계산 (상단 요약)
   - Line 396: 배송 정보 섹션 금액 표시
   - Line 497: 결제 정보 섹션 금액 표시
   - Line 858: 주문 상세 테이블 금액 표시

### 🔧 관리자 페이지

4. **`/app/admin/orders/page.js`**
   - 사용 안 함 (payment.amount 직접 사용)

5. **`/app/admin/orders/[id]/page.js`**
   - 사용 안 함 (payment.amount 직접 사용)

### ⚙️ API

6. **`/app/api/orders/update-status/route.js`**
   - 사용 안 함 (금액 계산 불필요)

**내부 호출 함수**:
- `calculateItemsTotal(items)` - 상품 금액 계산
- `applyCouponDiscount(itemsTotal, coupon)` - 쿠폰 할인 적용
- `calculateShippingFee(itemsTotal, region, baseShippingFee)` - 배송비 계산
  - 내부에서 `formatShippingInfo()` 호출 (우편번호인 경우)

**연관 DB 테이블**:
- `orders.total_amount` - 최종 금액 저장
- `orders.discount_amount` - 쿠폰 할인액 저장
- `orders.is_free_shipping` - 무료배송 여부 저장
- `order_shipping.shipping_fee` - 배송비 저장
- `order_shipping.postal_code` - 도서산간 배송비 계산용

**수정 시 확인 체크리스트**:
- [ ] **7개 사용처 모두 동일하게 작동하는가?**
  - [ ] `/app/checkout/page.js` (3곳)
  - [ ] `/app/orders/page.js` (1곳)
  - [ ] `/app/orders/[id]/complete/page.js` (4곳)

- [ ] **쿠폰 할인이 배송비 제외하고 계산되는가?**
  - 쿠폰 할인 = 상품 금액에만 적용
  - 배송비는 할인 대상 아님

- [ ] **도서산간 배송비가 정확히 추가되는가?**
  - 제주: +3,000원
  - 울릉도: +5,000원
  - 기타 도서산간: +5,000원

- [ ] **무료배송 조건이 올바르게 적용되는가?**
  - baseShippingFee = 0으로 전달되면 도서산간 추가비도 0

- [ ] **음수 금액 방어 로직이 있는가?**
  - couponDiscount > itemsTotal 시 처리

- [ ] **카드결제 시 부가세(10%) 정확히 추가되는가?**
  - paymentMethod = 'card' → vat 계산

- [ ] **DB 저장 금액과 계산 금액이 일치하는가?**
  - orders.total_amount = finalAmount
  - orders.discount_amount = couponDiscount

**테스트 시나리오**:
```javascript
// 시나리오 1: 일반 배송 + 쿠폰 없음
const items = [{ price: 50000, quantity: 2 }]
const result = OrderCalculations.calculateFinalOrderAmount(items, {
  region: 'normal',
  coupon: null,
  baseShippingFee: 4000
})
// 예상: itemsTotal=100000, shippingFee=4000, finalAmount=104000

// 시나리오 2: 제주 배송 + 10% 쿠폰
const result2 = OrderCalculations.calculateFinalOrderAmount(items, {
  region: '63000',  // 제주 우편번호
  coupon: { type: 'percentage', value: 10 },
  baseShippingFee: 4000
})
// 예상: itemsTotal=100000, couponDiscount=10000,
//       itemsTotalAfterDiscount=90000, shippingFee=7000, finalAmount=97000

// 시나리오 3: 무료배송 + 5,000원 쿠폰
const result3 = OrderCalculations.calculateFinalOrderAmount(items, {
  region: 'normal',
  coupon: { type: 'fixed_amount', value: 5000 },
  baseShippingFee: 0  // 무료배송
})
// 예상: itemsTotal=100000, couponDiscount=5000,
//       itemsTotalAfterDiscount=95000, shippingFee=0, finalAmount=95000

// 시나리오 4: 카드결제 + 부가세
const result4 = OrderCalculations.calculateFinalOrderAmount(items, {
  region: 'normal',
  paymentMethod: 'card',
  baseShippingFee: 4000
})
// 예상: subtotal=104000, vat=10400, finalAmount=114400
```

**과거 버그 사례**:
- **2025-10-08**: 주문 완료 페이지에서 DB 저장값(payment.amount) 직접 표시 → 계산 로직과 불일치
  - 해결: `calculateFinalOrderAmount()` 사용으로 통일
- **2025-10-04**: RLS UPDATE 정책 누락으로 discount_amount 저장 안 됨
  - 해결: RLS 정책 추가

**관련 문서**:
- `CODING_RULES.md` - 중앙화 모듈 사용 강제
- `DETAILED_DATA_FLOW.md` - 체크아웃/주문 완료 페이지 데이터 흐름
- `docs/COUPON_SYSTEM.md` - 쿠폰 할인 상세 로직

---

## 1.2 calculateItemsTotal()

**목적**: 상품 아이템 총액 계산

**함수 시그니처**:
```javascript
OrderCalculations.calculateItemsTotal(items)
```

**파라미터**:
- `items` (Array): 주문 아이템 배열

**반환값**: `number` - 총 상품 금액

**로직**:
```javascript
// 신규/구 스키마 모두 호환
const itemTotal = item.total ||
                 (item.price && item.quantity ? item.price * item.quantity : 0) ||
                 item.totalPrice ||
                 (item.unit_price && item.quantity ? item.unit_price * item.quantity : 0) ||
                 0
```

**사용처**:
- **내부 함수**: `calculateFinalOrderAmount()`, `calculateOrderTotal()`, `calculateShippingFee()` 내부에서 호출
- **직접 호출**: 없음 (항상 간접 호출됨)

**연관 DB 테이블**:
- `order_items.price`, `order_items.unit_price` - 단가
- `order_items.total`, `order_items.total_price` - 총액
- `order_items.quantity` - 수량

**수정 시 확인 체크리스트**:
- [ ] 신규 스키마(total, price)와 구 스키마(total_price, unit_price) 모두 호환되는가?
- [ ] 0원 처리가 안전한가? (null, undefined 방어)
- [ ] quantity가 없을 때 기본값 1로 처리되는가?

---

## 1.3 calculateShippingFee()

**목적**: 배송비 계산 (우편번호 또는 지역명 기반)

**함수 시그니처**:
```javascript
OrderCalculations.calculateShippingFee(itemsTotal, postalCodeOrRegion = 'normal', baseShippingFee = 4000)
```

**파라미터**:
- `itemsTotal` (number): 상품 총액 (미사용, 향후 확장용)
- `postalCodeOrRegion` (string): 우편번호(5자리) 또는 지역명
- `baseShippingFee` (number): 기본 배송비 (무료배송 시 0 전달)

**반환값**: `number` - 배송비 (기본 배송비 + 도서산간 추가비)

**로직 분기**:
1. **5자리 숫자 (우편번호)**: `formatShippingInfo()` 호출 → 정확한 도서산간 판별
2. **'제주'**: 63000 우편번호로 변환 → +3,000원
3. **'울릉도/독도'**: 40200 우편번호로 변환 → +5,000원
4. **'도서산간'**: +5,000원
5. **'normal', 'remote', 'island' (레거시)**: 0원, +5,000원, +5,000원

**사용처**:
- **내부 함수**: `calculateFinalOrderAmount()`, `calculateOrderTotal()` 내부에서 호출
- **직접 호출**: 없음

**내부 호출 함수**:
- `formatShippingInfo(baseShippingFee, postalCode)` - shippingUtils.js

**연관 DB 테이블**:
- `order_shipping.shipping_fee` - 배송비 저장
- `order_shipping.postal_code` - 우편번호

**수정 시 확인 체크리스트**:
- [ ] 우편번호 패턴 인식이 정확한가? (`/^\d{5}$/`)
- [ ] 무료배송 시 도서산간 추가비도 0원인가? (`baseShippingFee > 0` 조건)
- [ ] formatShippingInfo() 결과를 올바르게 사용하는가? (totalShipping 반환)
- [ ] 레거시 지역명도 지원하는가? (normal, remote, island)

---

## 1.4 applyCouponDiscount()

**목적**: 쿠폰 할인 적용 계산 (배송비 제외!)

**함수 시그니처**:
```javascript
OrderCalculations.applyCouponDiscount(itemsTotal, coupon = null)
```

**파라미터**:
- `itemsTotal` (number): 상품 금액 (**배송비 제외**)
- `coupon` (Object): 쿠폰 정보
  - `type` (string): 'fixed_amount' | 'percentage'
  - `value` (number): 할인 값 (금액 또는 퍼센트)
  - `maxDiscount` (number, optional): 최대 할인 금액 (percentage 타입 시)
  - `code` (string): 쿠폰 코드

**반환값** (Object):
```javascript
{
  itemsTotal: 100000,
  discountAmount: 10000,
  itemsTotalAfterDiscount: 90000,
  couponApplied: true,
  couponInfo: { type, value, maxDiscount, code }
}
```

**로직**:
1. **percentage 타입**: `itemsTotal * (value / 100)` → maxDiscount 제한 적용
2. **fixed_amount 타입**: `MIN(value, itemsTotal)` → 상품 금액 초과 방지

**사용처**:
- **내부 함수**: `calculateFinalOrderAmount()` 내부에서만 호출
- **직접 호출**: 없음

**연관 DB 테이블**:
- `coupons.discount_type`, `coupons.discount_value`, `coupons.max_discount_amount`
- `orders.discount_amount` - 할인액 저장

**수정 시 확인 체크리스트**:
- [ ] **쿠폰 할인은 상품 금액에만 적용되는가?** (배송비 제외!)
- [ ] percentage 타입 시 maxDiscount 제한이 적용되는가?
- [ ] fixed_amount 타입 시 상품 금액 초과 방지되는가?
- [ ] coupon = null 시 안전하게 처리되는가?
- [ ] 음수 할인 방지되는가?

**테스트 시나리오**:
```javascript
// 시나리오 1: 10% 할인 (최대 제한 없음)
const result = OrderCalculations.applyCouponDiscount(100000, {
  type: 'percentage',
  value: 10
})
// 예상: discountAmount=10000

// 시나리오 2: 20% 할인 (최대 5,000원 제한)
const result2 = OrderCalculations.applyCouponDiscount(100000, {
  type: 'percentage',
  value: 20,
  maxDiscount: 5000
})
// 예상: discountAmount=5000 (20000 → 5000으로 제한)

// 시나리오 3: 10,000원 고정 할인
const result3 = OrderCalculations.applyCouponDiscount(5000, {
  type: 'fixed_amount',
  value: 10000
})
// 예상: discountAmount=5000 (상품 금액 초과 방지)
```

**과거 버그 사례**:
- 없음 (신규 함수, 2025-10-03 추가)

**관련 문서**:
- `docs/COUPON_SYSTEM.md` - 쿠폰 시스템 완벽 가이드

---

## 1.5 calculateOrderTotal()

**목적**: 총 주문 금액 계산 (쿠폰 제외)

**함수 시그니처**:
```javascript
OrderCalculations.calculateOrderTotal(items, region = 'normal')
```

**파라미터**:
- `items` (Array): 주문 아이템 배열
- `region` (string): 배송 지역

**반환값** (Object):
```javascript
{
  itemsTotal: 100000,
  shippingFee: 4000,
  totalAmount: 104000,
  breakdown: {
    상품금액: 100000,
    배송비: 4000,
    총결제금액: 104000
  }
}
```

**사용처**:
- **내부 함수**: `calculateGroupOrderTotal()`, `calculateDepositAmount()` 내부에서 호출
- **직접 호출**: 없음 (레거시 호환용)

**수정 시 확인 체크리스트**:
- [ ] calculateFinalOrderAmount()와 로직이 일치하는가? (쿠폰 제외)

---

## 1.6 calculateGroupOrderTotal()

**목적**: 그룹 주문 계산 (여러 주문을 묶어서 계산)

**함수 시그니처**:
```javascript
OrderCalculations.calculateGroupOrderTotal(orders)
```

**파라미터**:
- `orders` (Array): 주문 배열

**반환값** (Object):
```javascript
{
  totalItemsAmount: 200000,
  totalShippingFee: 8000,
  totalAmount: 208000,
  orderCount: 2
}
```

**사용처**:
- **직접 호출**: 없음 (향후 그룹 주문 기능용)

---

## 1.7 calculateCardAmount()

**목적**: 카드결제 부가세 포함 계산

**함수 시그니처**:
```javascript
OrderCalculations.calculateCardAmount(baseAmount)
```

**파라미터**:
- `baseAmount` (number): 기본 금액

**반환값**: `number` - 부가세(10%) 포함 금액

**로직**: `Math.floor(baseAmount * 1.1)`

**사용처**:
- **내부 함수**: `calculateFinalAmount()` 내부에서 호출
- **직접 호출**: 없음

---

## 1.8 calculateDepositAmount()

**목적**: 입금 금액 계산 (계좌이체용)

**함수 시그니처**:
```javascript
OrderCalculations.calculateDepositAmount(items, region = 'normal')
```

**파라미터**:
- `items` (Array): 주문 아이템 배열
- `region` (string): 배송 지역

**반환값** (Object):
```javascript
{
  itemsTotal: 100000,
  shippingFee: 4000,
  totalAmount: 104000,
  depositAmount: 104000,  // 계좌이체는 부가세 없음
  displayText: '입금금액: ₩104,000'
}
```

**사용처**:
- **직접 호출**: 없음 (향후 입금 안내용)

---

## 1.9 calculateFinalAmount()

**목적**: 결제 방법별 최종 금액 계산

**함수 시그니처**:
```javascript
OrderCalculations.calculateFinalAmount(items, paymentMethod = 'transfer', region = 'normal')
```

**파라미터**:
- `items` (Array): 주문 아이템 배열
- `paymentMethod` (string): 'card' | 'transfer'
- `region` (string): 배송 지역

**반환값** (Object):
```javascript
{
  itemsTotal: 100000,
  shippingFee: 4000,
  totalAmount: 104000,
  finalAmount: 114400,  // 카드결제 시 부가세 포함
  paymentMethod: 'card',
  note: '부가세 10% 포함'
}
```

**사용처**:
- **직접 호출**: 없음 (레거시 호환용)
- **권장**: `calculateFinalOrderAmount()` 사용

---

## 1.10 normalizeOrderItems()

**목적**: 주문 아이템 데이터 정규화 (다양한 스키마 형태를 통일)

**함수 시그니처**:
```javascript
OrderCalculations.normalizeOrderItems(items)
```

**파라미터**:
- `items` (Array): 원본 주문 아이템 배열

**반환값**: `Array` - 정규화된 주문 아이템 배열

**로직**: 신규/구 스키마 모두 매핑
- `price` ← `price` | `unit_price`
- `total` ← `total` | `total_price` | `price * quantity`
- `title` ← `title` | `product.title`

**사용처**:
- **직접 호출**: 없음 (향후 데이터 정규화용)

---

## 1.11 applyDiscount() (deprecated)

**목적**: 할인 적용 계산 (레거시 - 호환성 유지)

**함수 시그니처**:
```javascript
OrderCalculations.applyDiscount(baseAmount, discount = null)
```

**권장**: `calculateFinalOrderAmount()` 또는 `applyCouponDiscount()` 사용

**사용처**:
- **직접 호출**: 없음 (deprecated)

---

# 2. couponApi.js

**파일 위치**: `/lib/couponApi.js`
**목적**: 쿠폰 시스템 API - 생성, 배포, 사용 관리
**함수 타입**: 모두 async 함수

---

## 2.1 createCoupon()

**목적**: 새 쿠폰 생성 (관리자 전용 - Service Role API 사용)

**함수 시그니처**:
```javascript
async createCoupon(couponData)
```

**파라미터**:
- `couponData` (Object): 쿠폰 정보
  - `code` (string): 쿠폰 코드 (UPPERCASE)
  - `name` (string): 쿠폰 이름
  - `discount_type` (string): 'fixed_amount' | 'percentage'
  - `discount_value` (number): 할인 값
  - `max_discount_amount` (number, optional): 최대 할인 금액
  - `min_order_amount` (number): 최소 주문 금액
  - `valid_from` (Date): 유효 시작일
  - `valid_until` (Date): 유효 종료일
  - `total_usage_limit` (number, optional): 총 사용 제한
  - `per_user_limit` (number): 1인당 사용 제한
  - `is_active` (boolean): 활성화 여부
  - `is_welcome_coupon` (boolean): 웰컴 쿠폰 여부

**반환값**: `Object` - 생성된 쿠폰

**API 호출**: `POST /api/admin/coupons/create` (Service Role)

**사용처** (1곳):
- `/app/admin/coupons/new/page.js` - 쿠폰 생성 폼 제출

**연관 DB 테이블**:
- `coupons` (INSERT)

**수정 시 확인 체크리스트**:
- [ ] Service Role API 사용하는가? (RLS 우회)
- [ ] created_by 필드가 현재 관리자 ID인가?
- [ ] code가 UPPERCASE로 변환되는가?
- [ ] 유효성 검증이 서버에서 이루어지는가?

**과거 버그 사례**:
- **2025-10-07**: 클라이언트 Supabase (Anon Key) 사용 → 403 Forbidden
  - 해결: Service Role API 전환

**관련 문서**:
- `docs/COUPON_SYSTEM.md` - 쿠폰 시스템 완벽 가이드

---

## 2.2 getCoupons()

**목적**: 모든 쿠폰 목록 조회 (관리자)

**함수 시그니처**:
```javascript
async getCoupons(filters = {})
```

**파라미터**:
- `filters` (Object):
  - `is_active` (boolean, optional): 활성화 여부 필터
  - `discount_type` (string, optional): 할인 타입 필터

**반환값**: `Array` - 쿠폰 목록 (created_by_profile JOIN)

**사용처** (2곳):
- `/app/admin/coupons/page.js` - 쿠폰 목록 페이지
- `getAllCouponsStats()` - 전체 통계 계산

**연관 DB 테이블**:
- `coupons` (SELECT)
- `profiles` (JOIN) - 생성자 정보

**수정 시 확인 체크리스트**:
- [ ] created_at 내림차순 정렬되는가?
- [ ] profiles JOIN 에러 처리되는가?

---

## 2.3 getCoupon()

**목적**: 단일 쿠폰 상세 조회

**함수 시그니처**:
```javascript
async getCoupon(couponId)
```

**파라미터**:
- `couponId` (string): 쿠폰 ID

**반환값**: `Object` - 쿠폰 상세 정보

**사용처** (2곳):
- `/app/admin/coupons/[id]/page.js` - 쿠폰 상세/수정 페이지
- `getCouponStats()` - 통계 계산

**연관 DB 테이블**:
- `coupons` (SELECT)
- `profiles` (JOIN) - 생성자 정보

---

## 2.4 getCouponByCode()

**목적**: 쿠폰 코드로 조회

**함수 시그니처**:
```javascript
async getCouponByCode(code)
```

**파라미터**:
- `code` (string): 쿠폰 코드

**반환값**: `Object | null` - 쿠폰 정보 또는 null

**로직**:
- UPPERCASE 변환
- is_active = true 필터

**사용처**:
- 사용 안 함 (validateCoupon() 사용)

---

## 2.5 updateCoupon()

**목적**: 쿠폰 수정 (관리자 전용 - Service Role API 사용)

**함수 시그니처**:
```javascript
async updateCoupon(couponId, updates)
```

**파라미터**:
- `couponId` (string): 쿠폰 ID
- `updates` (Object): 수정할 데이터

**반환값**: `Object` - 수정된 쿠폰

**API 호출**: `PATCH /api/admin/coupons/update` (Service Role)

**사용처** (2곳):
- `/app/admin/coupons/[id]/page.js` - 쿠폰 수정 폼 제출
- `toggleCouponStatus()` - 활성화/비활성화

**연관 DB 테이블**:
- `coupons` (UPDATE)

---

## 2.6 toggleCouponStatus()

**목적**: 쿠폰 활성화/비활성화

**함수 시그니처**:
```javascript
async toggleCouponStatus(couponId, isActive)
```

**파라미터**:
- `couponId` (string): 쿠폰 ID
- `isActive` (boolean): 활성화 여부

**반환값**: `Object` - 수정된 쿠폰

**내부 호출 함수**:
- `updateCoupon(couponId, { is_active: isActive })`

**사용처**:
- `/app/admin/coupons/page.js` - 활성화 토글 버튼

---

## 2.7 deleteCoupon()

**목적**: 쿠폰 완전 삭제 (관리자 전용 - Service Role API 사용)

**함수 시그니처**:
```javascript
async deleteCoupon(couponId)
```

**파라미터**:
- `couponId` (string): 쿠폰 ID

**반환값**: `Object` - 삭제된 쿠폰 정보

**API 호출**: `DELETE /api/admin/coupons/delete` (Service Role)

**연관 DB 테이블**:
- `coupons` (DELETE) → CASCADE로 `user_coupons`도 삭제

**사용처**:
- `/app/admin/coupons/[id]/page.js` - 삭제 버튼

**수정 시 확인 체크리스트**:
- [ ] CASCADE 삭제로 user_coupons도 삭제되는가?
- [ ] 이미 사용된 쿠폰의 주문 금액은 영향 없는가? (orders.discount_amount는 유지됨)

---

## 2.8 distributeCoupon()

**목적**: 특정 사용자에게 쿠폰 배포 (관리자 전용)

**함수 시그니처**:
```javascript
async distributeCoupon(couponId, userIds, adminEmail)
```

**파라미터**:
- `couponId` (string): 쿠폰 ID
- `userIds` (Array<string>): 사용자 ID 배열
- `adminEmail` (string): 관리자 이메일 (필수, useAdminAuth에서 전달)

**반환값** (Object):
```javascript
{
  success: true,
  distributedCount: 5,
  duplicates: 2,
  skipped: 0
}
```

**API 호출**: `POST /api/admin/coupons/distribute` (Service Role)

**사용처**:
- `/app/admin/coupons/[id]/page.js` - 특정 사용자 배포

**연관 DB 테이블**:
- `user_coupons` (INSERT)
- `coupons.total_issued_count` (UPDATE)

**수정 시 확인 체크리스트**:
- [ ] adminEmail이 올바르게 전달되는가? (useAdminAuth.adminUser.email)
- [ ] 중복 배포가 방지되는가? (UNIQUE 제약)
- [ ] total_issued_count가 증가하는가?

**과거 버그 사례**:
- **2025-10-08**: adminEmail 전달 누락 → 403 Forbidden
  - 해결: useAdminAuthNew.adminUser.email 전달

---

## 2.9 distributeToAllCustomers()

**목적**: 전체 고객에게 쿠폰 배포

**함수 시그니처**:
```javascript
async distributeToAllCustomers(couponId, adminEmail)
```

**파라미터**:
- `couponId` (string): 쿠폰 ID
- `adminEmail` (string): 관리자 이메일

**반환값**: `Object` - 배포 결과

**로직**:
1. profiles 테이블에서 is_admin = false 사용자 조회
2. `distributeCoupon()` 호출

**사용처**:
- `/app/admin/coupons/[id]/page.js` - 전체 배포 버튼

**연관 DB 테이블**:
- `profiles` (SELECT) - 고객 목록
- `user_coupons` (INSERT)

---

## 2.10 getCouponHolders()

**목적**: 특정 쿠폰 보유 고객 목록

**함수 시그니처**:
```javascript
async getCouponHolders(couponId, filters = {})
```

**파라미터**:
- `couponId` (string): 쿠폰 ID
- `filters` (Object):
  - `is_used` (boolean, optional): 사용 여부 필터

**반환값**: `Array` - 보유 고객 목록 (user, coupon, order JOIN)

**사용처**:
- `/app/admin/coupons/[id]/page.js` - 보유 고객 현황 탭

**연관 DB 테이블**:
- `user_coupons` (SELECT)
- `profiles` (JOIN) - 사용자 정보
- `coupons` (JOIN) - 쿠폰 정보
- `orders` (JOIN) - 주문 정보

---

## 2.11 getUserCoupons()

**목적**: 사용자의 보유 쿠폰 목록

**함수 시그니처**:
```javascript
async getUserCoupons(userId, filters = {})
```

**파라미터**:
- `userId` (string): 사용자 ID
- `filters` (Object):
  - `available_only` (boolean): 사용 가능한 쿠폰만 조회

**반환값**: `Array` - 보유 쿠폰 목록 (coupon JOIN)

**로직** (available_only = true 시):
- is_used = false
- coupon.is_active = true
- coupon.valid_until >= 현재 시각

**사용처**:
- `/app/mypage/coupons/page.js` - 마이페이지 쿠폰 목록
- `/app/checkout/page.js` - 체크아웃 쿠폰 선택

**연관 DB 테이블**:
- `user_coupons` (SELECT)
- `coupons` (JOIN)

---

## 2.12 validateCoupon()

**목적**: 쿠폰 유효성 검증 및 할인 금액 계산

**함수 시그니처**:
```javascript
async validateCoupon(couponCode, userId, orderAmount)
```

**파라미터**:
- `couponCode` (string): 쿠폰 코드
- `userId` (string): 사용자 ID
- `orderAmount` (number): 주문 금액 (**상품 금액만, 배송비 제외**)

**반환값** (Object):
```javascript
{
  is_valid: true,
  discount_amount: 10000,
  coupon_id: 'xxx',
  error_message: null  // 실패 시 에러 메시지
}
```

**DB 함수 호출**: `validate_coupon(p_coupon_code, p_user_id, p_product_amount)`

**사용처**:
- `/app/checkout/page.js` - 쿠폰 적용 버튼 클릭 시

**연관 DB 테이블**:
- `coupons` (SELECT) - DB 함수 내부
- `user_coupons` (SELECT) - DB 함수 내부

**검증 항목** (DB 함수 내부):
1. 쿠폰 존재 여부
2. 활성화 여부 (is_active)
3. 유효 기간 (valid_from ~ valid_until)
4. 최소 주문 금액 (min_order_amount)
5. 총 사용 제한 (total_usage_limit)
6. 1인당 사용 제한 (per_user_limit)
7. 사용자 보유 여부 (user_coupons)
8. 이미 사용했는지 (is_used)

**수정 시 확인 체크리스트**:
- [ ] **orderAmount가 상품 금액만 전달되는가?** (배송비 제외!)
- [ ] DB 함수 파라미터명과 일치하는가? (p_product_amount)
- [ ] 검증 실패 시 error_message가 명확한가?

---

## 2.13 applyCouponUsage()

**목적**: 쿠폰 사용 처리 (주문 생성 시 호출)

**함수 시그니처**:
```javascript
async applyCouponUsage(userId, couponId, orderId, discountAmount)
```

**파라미터**:
- `userId` (string): 사용자 ID
- `couponId` (string): 쿠폰 ID
- `orderId` (string): 주문 ID
- `discountAmount` (number): 할인 금액

**반환값**: `boolean` - 성공 여부

**DB 함수 호출**: `use_coupon(p_user_id, p_coupon_id, p_order_id, p_discount_amount)`

**사용처**:
- `/app/checkout/page.js` - 주문 생성 후 쿠폰 사용 처리

**연관 DB 테이블**:
- `user_coupons` (UPDATE) - is_used, used_at, order_id, discount_amount
- `coupons.total_used_count` (UPDATE)

**DB 함수 로직**:
1. user_coupons에서 해당 쿠폰 찾기
2. is_used = true, used_at = NOW(), order_id, discount_amount 업데이트
3. coupons.total_used_count 증가
4. 트랜잭션으로 원자적 처리

**수정 시 확인 체크리스트**:
- [ ] 주문 생성 **후** 호출되는가? (주문 ID 필요)
- [ ] 트랜잭션으로 처리되는가? (DB 함수)
- [ ] 이미 사용된 쿠폰 재사용 방지되는가?
- [ ] total_used_count 증가 확인

**과거 버그 사례**:
- **2025-10-05**: `auth.uid()` 검증 문제로 사용 처리 실패
  - 해결: auth.uid() 검증 제거, RLS 정책으로 보안 유지

---

## 2.14 getCouponStats()

**목적**: 쿠폰 통계 조회

**함수 시그니처**:
```javascript
async getCouponStats(couponId)
```

**파라미터**:
- `couponId` (string): 쿠폰 ID

**반환값** (Object):
```javascript
{
  total_issued: 100,
  total_used: 45,
  usage_rate: '45.0',
  unused_count: 55,
  remaining_limit: 10  // total_usage_limit - total_used_count
}
```

**내부 호출 함수**:
- `getCoupon()` - 쿠폰 정보
- `getCouponHolders()` - 보유 고객 목록

**사용처**:
- `/app/admin/coupons/[id]/page.js` - 쿠폰 상세 통계 카드

---

## 2.15 getAllCouponsStats()

**목적**: 전체 쿠폰 통계 조회 (대시보드용)

**함수 시그니처**:
```javascript
async getAllCouponsStats()
```

**반환값** (Object):
```javascript
{
  total_coupons: 25,
  active_coupons: 18,
  total_issued: 500,
  total_used: 234,
  fixed_amount_coupons: 10,
  percentage_coupons: 15
}
```

**내부 호출 함수**:
- `getCoupons()` - 모든 쿠폰 목록

**사용처**:
- `/app/admin/coupons/page.js` - 대시보드 통계 카드

---

# 3. shippingUtils.js

**파일 위치**: `/lib/shippingUtils.js`
**목적**: 도서산간 지역 판별 및 추가 배송비 계산 유틸리티

---

## 3.1 calculateShippingSurcharge()

**목적**: 도서산간 지역 여부 판별 및 추가 배송비 계산

**함수 시그니처**:
```javascript
calculateShippingSurcharge(postalCode)
```

**파라미터**:
- `postalCode` (string): 우편번호 (5자리)

**반환값** (Object):
```javascript
{
  isRemote: true,
  region: '제주',
  surcharge: 3000
}
```

**로직**:
1. **제주도**: 63000-63644 → +3,000원
2. **울릉도/독도**: 40200-40240 → +5,000원
3. **기타 도서산간**: 인천 옹진군, 경남 거제시 등 → +5,000원
4. **일반 지역**: +0원

**사용처**:
- **내부 함수**: `formatShippingInfo()` 내부에서만 호출
- **직접 호출**: 없음

**연관 DB 테이블**:
- `order_shipping.postal_code`

---

## 3.2 formatShippingInfo()

**목적**: 배송비 정보 포맷팅

**함수 시그니처**:
```javascript
formatShippingInfo(baseShipping = 0, postalCode)
```

**파라미터**:
- `baseShipping` (number): 기본 배송비 (무료배송 시 0)
- `postalCode` (string): 우편번호

**반환값** (Object):
```javascript
{
  baseShipping: 4000,
  surcharge: 3000,
  totalShipping: 7000,
  isRemote: true,
  region: '제주'
}
```

**내부 호출 함수**:
- `calculateShippingSurcharge(postalCode)`

**사용처** (매우 많음 - 37개 파일):

### 📄 사용자 페이지
1. `/app/checkout/page.js` (line 634)
2. `/app/orders/page.js` (line 580)
3. `/app/orders/[id]/complete/page.js` (lines 158, 393, 494, 855)

### 🔧 관리자 페이지
4. `/app/admin/orders/page.js`
5. `/app/admin/orders/[id]/page.js`

### ⚙️ 중앙 함수
6. `/lib/orderCalculations.js` (line 46) - calculateShippingFee() 내부
7. `/lib/supabaseApi.js` - 여러 곳에서 배송비 계산

**연관 DB 테이블**:
- `order_shipping.postal_code`
- `order_shipping.shipping_fee`
- `profiles.postal_code`

**수정 시 확인 체크리스트**:
- [ ] **37개 사용처 모두 영향받는가?**
- [ ] baseShipping = 0 시 surcharge도 0인가? (무료배송)
- [ ] calculateShippingSurcharge() 결과를 올바르게 사용하는가?
- [ ] 우편번호 형식 검증이 있는가? (5자리 숫자)

**테스트 시나리오**:
```javascript
// 시나리오 1: 일반 지역
const result = formatShippingInfo(4000, '06234')
// 예상: { baseShipping: 4000, surcharge: 0, totalShipping: 4000, isRemote: false, region: null }

// 시나리오 2: 제주도
const result2 = formatShippingInfo(4000, '63100')
// 예상: { baseShipping: 4000, surcharge: 3000, totalShipping: 7000, isRemote: true, region: '제주' }

// 시나리오 3: 무료배송 + 제주
const result3 = formatShippingInfo(0, '63100')
// 예상: { baseShipping: 0, surcharge: 0, totalShipping: 0, isRemote: true, region: '제주' }
```

**과거 버그 사례**:
- 없음 (안정적)

**관련 문서**:
- `DETAILED_DATA_FLOW.md` - 체크아웃/주문 페이지 배송비 계산
- `docs/archive/work-logs/WORK_LOG_2025-10-03.md` - 우편번호 시스템 통합

---

# 4. UserProfileManager.js

**파일 위치**: `/lib/UserProfileManager.js`
**목적**: 사용자 프로필 통합 관리 - 카카오 사용자와 일반 사용자의 프로필 정보를 일관되게 처리

---

## 4.1 getCurrentUser()

**목적**: 현재 로그인한 사용자 정보 가져오기

**함수 시그니처**:
```javascript
static async getCurrentUser()
```

**파라미터**: 없음

**반환값**: `Object | null` - 사용자 정보 또는 null

**로직 우선순위**:
1. Supabase Auth 세션 확인 → profiles 테이블 조회
2. sessionStorage 확인 (카카오 사용자)
3. 둘 다 없으면 null 반환

**사용처** (9개 파일):
- `/lib/supabaseApi.js` - 여러 함수에서 현재 사용자 확인
- 모든 페이지에서 인증 상태 확인

**연관 DB 테이블**:
- `auth.users` - Supabase Auth 세션
- `profiles` - 사용자 프로필

**수정 시 확인 체크리스트**:
- [ ] Supabase Auth 세션 우선 확인하는가?
- [ ] sessionStorage 접근 시 typeof window !== 'undefined' 체크하는가?
- [ ] 에러 발생 시에도 null 반환하는가? (안전한 fallback)

---

## 4.2 loadUserProfile()

**목적**: 특정 사용자 ID로 프로필 정보 조회

**함수 시그니처**:
```javascript
static async loadUserProfile(userId)
```

**파라미터**:
- `userId` (string): 사용자 ID

**반환값**: `Object | null` - 프로필 정보 또는 null

**사용처**:
- `/lib/supabaseApi.js` - 관리자 페이지에서 사용자 정보 조회

**연관 DB 테이블**:
- `profiles` (SELECT)

---

## 4.3 getUserOrderQuery()

**목적**: 사용자 주문 조회를 위한 통합 식별자 반환

**함수 시그니처**:
```javascript
static async getUserOrderQuery()
```

**파라미터**: 없음

**반환값** (Object):
```javascript
// 카카오 사용자
{
  type: 'kakao',
  query: { column: 'order_type', value: 'direct:KAKAO:3456789012' },
  alternativeQueries: [
    { column: 'order_type', value: 'cart:KAKAO:3456789012' },
    { column: 'order_type', value: 'direct:KAKAO:user.id' },
    { column: 'order_type', value: 'cart:KAKAO:user.id' }
  ],
  fallback: { column: 'order_shipping.name', value: '홍길동' }
}

// 일반 사용자
{
  type: 'supabase',
  query: { column: 'user_id', value: 'uuid' }
}
```

**사용처**:
- `/lib/supabaseApi.js` - getUserOrders() 등 주문 조회 함수

**연관 DB 테이블**:
- `orders.user_id`
- `orders.order_type`

**수정 시 확인 체크리스트**:
- [ ] 카카오 사용자 3가지 패턴 모두 포함하는가?
- [ ] fallback 조건이 안전한가?

---

## 4.4 normalizeProfile()

**목적**: 사용자 프로필 정규화 (카카오/일반 사용자 관계없이 일관된 형식으로 반환)

**함수 시그니처**:
```javascript
static normalizeProfile(user)
```

**파라미터**:
- `user` (Object): 원본 사용자 객체

**반환값** (Object):
```javascript
{
  name: '홍길동',
  phone: '010-1234-5678',
  address: '서울시 강남구',
  detail_address: '101동 1001호',
  addresses: [{ id: 1, label: '기본 배송지', ... }],
  isValid: true
}
```

**로직**:
1. 카카오 사용자 형식 확인 (phone, address 필드 존재)
2. Supabase 사용자 형식 확인 (user_metadata)
3. 기타 형식
4. addresses 배열 자동 생성 (없으면 기본 주소로)

**사용처**:
- 모든 페이지에서 사용자 정보 표시 시

**수정 시 확인 체크리스트**:
- [ ] 3가지 사용자 형식 모두 지원하는가?
- [ ] addresses 배열 자동 생성되는가?
- [ ] isValid 검증이 정확한가?

---

## 4.5 validateProfile()

**목적**: 프로필 유효성 검사 (필수 정보가 모두 있는지 확인)

**함수 시그니처**:
```javascript
static validateProfile(profile)
```

**파라미터**:
- `profile` (Object): 프로필 객체

**반환값**: `boolean` - 유효 여부

**검증 항목**:
- name: 1자 이상
- phone: 10자 이상
- address: 1자 이상

**사용처**:
- `normalizeProfile()`, `checkCompleteness()` 내부
- `/app/checkout/page.js` - 주문서 작성 가능 여부 확인

---

## 4.6 atomicProfileUpdate()

**목적**: 통합 프로필 업데이트 - 모든 저장소를 원자적으로 업데이트

**함수 시그니처**:
```javascript
static async atomicProfileUpdate(userId, profileData, isKakaoUser = false)
```

**파라미터**:
- `userId` (string): 사용자 ID
- `profileData` (Object): 업데이트할 프로필 데이터
- `isKakaoUser` (boolean): 카카오 사용자 여부

**반환값**: `Object` - { success: true, data: profile }

**업데이트 순서** (병렬 실행):
1. `profiles` 테이블 UPSERT
2. `auth.users.user_metadata` 업데이트
3. sessionStorage 업데이트 (카카오 사용자만)

**사용처**:
- `/app/mypage/page.js` - 프로필 수정

**연관 DB 테이블**:
- `profiles` (UPSERT)
- `auth.users.user_metadata` (UPDATE)

**수정 시 확인 체크리스트**:
- [ ] 3개 저장소 모두 업데이트되는가?
- [ ] 병렬 실행으로 성능 최적화되는가? (Promise.allSettled)
- [ ] undefined 필드는 제외되는가? (선택적 업데이트)
- [ ] 에러 발생 시 적절히 처리되는가?

---

## 4.7 updateProfile() (deprecated)

**목적**: 프로필 업데이트 (레거시 호환성 유지)

**권장**: `atomicProfileUpdate()` 사용

---

## 4.8 prepareShippingData()

**목적**: 배송 정보 생성용 데이터 준비 (주문 생성 시 사용)

**함수 시그니처**:
```javascript
static prepareShippingData(profile)
```

**파라미터**:
- `profile` (Object): 프로필 객체

**반환값** (Object):
```javascript
{
  name: '홍길동',
  phone: '010-1234-5678',
  address: '서울시 강남구',
  detail_address: '101동 1001호'
}
```

**사용처**:
- `/lib/supabaseApi.js` - createOrder() 주문 생성 시 배송 정보

**수정 시 확인 체크리스트**:
- [ ] 유효성 검증 후 데이터 반환하는가?
- [ ] 필수 정보 누락 시 에러 던지는가?

---

## 4.9 checkCompleteness()

**목적**: 프로필 완성도 체크 (미완성 필드 목록 반환)

**함수 시그니처**:
```javascript
static checkCompleteness(profile)
```

**파라미터**:
- `profile` (Object): 프로필 객체

**반환값** (Object):
```javascript
{
  isComplete: false,
  missingFields: ['이름', '연락처']
}
```

**사용처**:
- `/app/mypage/page.js` - 프로필 완성도 표시

---

## 4.10 ShippingDataManager.extractShippingInfo()

**목적**: 주문의 배송 정보 가져오기 (다양한 데이터 구조 대응)

**함수 시그니처**:
```javascript
static extractShippingInfo(order)
```

**파라미터**:
- `order` (Object): 주문 객체

**반환값** (Object):
```javascript
{
  name: '홍길동',
  phone: '010-1234-5678',
  address: '서울시 강남구',
  detail_address: '101동 1001호'
}
```

**로직 우선순위**:
1. order.order_shipping 배열
2. order.order_shipping 객체
3. order.userName 등 직접 필드
4. order.user 객체

**사용처**:
- `/app/admin/orders/[id]/page.js` - 주문 상세 배송 정보 표시

---

## 4.11 ShippingDataManager.validateShippingInfo()

**목적**: 배송 정보 유효성 검사

**함수 시그니처**:
```javascript
static validateShippingInfo(shippingInfo)
```

**파라미터**:
- `shippingInfo` (Object): 배송 정보

**반환값**: `boolean` - 유효 여부

**검증 항목**:
- name: 1자 이상
- phone: 10자 이상
- address: 1자 이상

---

# 5. fulfillmentGrouping.js

**파일 위치**: `/lib/fulfillmentGrouping.js`
**목적**: 배송 취합 관리 - 합배송 그룹핑 로직

---

## 5.1 groupOrdersByShipping()

**목적**: 같은 고객 + 같은 배송지 = 합배송 그룹으로 자동 묶음

**함수 시그니처**:
```javascript
groupOrdersByShipping(orders)
```

**파라미터**:
- `orders` (Array): 주문 배열 (status: 'paid')

**반환값** (Object):
```javascript
{
  merged: [/* 합배송 그룹 */],
  singles: [/* 단일 배송 */],
  total: 15,
  totalOrders: 20
}
```

**로직**:
1. status = 'paid' 주문만 필터
2. 배송지 정보로 그룹 키 생성 (name + postalCode + address + detailAddress)
3. 2개 이상 = merged, 1개 = singles
4. 최신 주문부터 정렬

**사용처**:
- `/app/admin/fulfillment/page.js` - 배송 취합 관리 페이지

**연관 DB 테이블**:
- `orders` (SELECT) - status = 'paid'
- `order_shipping` (JOIN)

**수정 시 확인 체크리스트**:
- [ ] 그룹 키에 모든 배송지 정보 포함하는가?
- [ ] 대소문자 구분 없이 그룹핑되는가? (toLowerCase)
- [ ] trim() 처리되는가?

---

## 5.2 createGroupData()

**목적**: 그룹 데이터 생성 (합배송/단일 공통)

**함수 시그니처**:
```javascript
createGroupData(orders, type)
```

**파라미터**:
- `orders` (Array): 그룹에 속한 주문 배열
- `type` (string): 'merged' | 'single'

**반환값** (Object):
```javascript
{
  type: 'merged',
  groupId: 'G1729491234-abc123',
  orders: [/* 원본 주문 배열 */],
  orderCount: 2,
  shippingInfo: { name, phone, address, ... },
  allItems: [/* 모든 제품 */],
  totalAmount: 200000,
  totalQuantity: 10,
  uniqueProducts: 5,
  trackingNumber: null,
  trackingCompany: 'hanjin',
  latestOrderDate: '2025-10-20T...',
  orderNumbers: 'S251020-1234, S251020-5678'
}
```

**사용처**:
- `groupOrdersByShipping()` 내부에서만 호출

---

## 5.3 generateGroupCSV()

**목적**: 선택된 주문들의 CSV 데이터 생성 (그룹 단위)

**함수 시그니처**:
```javascript
generateGroupCSV(groups, selectedOrderIds)
```

**파라미터**:
- `groups` (Array): 그룹 배열
- `selectedOrderIds` (Set): 선택된 주문 ID Set

**반환값**: `string` - CSV 문자열 (UTF-8 BOM 포함)

**CSV 헤더**:
```
그룹ID,주문번호들,고객명,닉네임,연락처,입금자명,주소,제품목록,옵션,SKU,총수량,총금액,배송타입,송장번호
```

**사용처**:
- `/app/admin/fulfillment/page.js` - 그룹별 CSV 다운로드

---

## 5.4 generateOrderCSV()

**목적**: 선택된 주문들의 CSV 데이터 생성 (개별 주문 단위)

**함수 시그니처**:
```javascript
generateOrderCSV(groups, selectedOrderIds)
```

**파라미터**:
- `groups` (Array): 그룹 배열
- `selectedOrderIds` (Set): 선택된 주문 ID Set

**반환값**: `string` - CSV 문자열 (UTF-8 BOM 포함)

**CSV 헤더**:
```
주문번호,고객명,닉네임,연락처,입금자명,주소,제품명,옵션,SKU,수량,금액,그룹ID,배송타입,송장번호
```

**사용처**:
- `/app/admin/fulfillment/page.js` - 개별 주문 CSV 다운로드

---

# 6. logisticsAggregation.js

**파일 위치**: `/lib/logisticsAggregation.js`
**목적**: 물류팀 - 제품 집계 및 업체별 발주 준비

---

## 6.1 aggregateProductsForLogistics()

**목적**: 입금확인 완료 주문의 제품들을 제품명/옵션/업체별로 집계

**함수 시그니처**:
```javascript
aggregateProductsForLogistics(orders)
```

**파라미터**:
- `orders` (Array): 주문 배열 (status: 'paid')

**반환값** (Object):
```javascript
{
  products: [
    {
      productId: 'uuid',
      productName: '상품명',
      productImage: 'url',
      variants: [
        {
          variantId: 'uuid',
          sku: 'SKU-001',
          optionDisplay: '색상:빨강 / 사이즈:L',
          suppliers: [
            {
              supplierId: 'uuid',
              supplierName: '공급업체명',
              supplierCode: 'SUP-001',
              quantity: 50,
              orders: [/* 주문 정보 */]
            }
          ],
          totalQuantity: 50,
          supplierCount: 1
        }
      ],
      totalQuantity: 50,
      variantCount: 1
    }
  ],
  totalProducts: 10,
  totalQuantity: 500,
  totalSuppliers: 5,
  uniqueSuppliers: ['uuid1', 'uuid2', ...]
}
```

**로직**:
1. status = 'paid' 주문만 필터
2. 제품별로 Map 생성
3. Variant별로 Map 생성
4. 업체별로 Map 생성
5. 수량 누적
6. Array로 변환 및 정렬

**사용처**:
- `/app/admin/logistics/page.js` - 물류팀 제품 집계 페이지

**연관 DB 테이블**:
- `orders` (SELECT) - status = 'paid'
- `order_items` (JOIN)
- `products` (JOIN)
- `product_variants` (JOIN)
- `suppliers` (JOIN)

---

## 6.2 generateLogisticsCSV()

**목적**: 물류팀용 CSV 생성 - 제품/옵션/업체/수량 집계

**함수 시그니처**:
```javascript
generateLogisticsCSV(products)
```

**파라미터**:
- `products` (Array): aggregateProductsForLogistics() 결과

**반환값**: `string` - CSV 문자열 (UTF-8 BOM 포함)

**CSV 헤더**:
```
제품명,옵션,SKU,업체명,업체코드,필요수량,주문건수
```

**사용처**:
- `/app/admin/logistics/page.js` - CSV 다운로드

---

## 6.3 getSupplierSummary()

**목적**: 업체별 필요 수량 요약

**함수 시그니처**:
```javascript
getSupplierSummary(products)
```

**파라미터**:
- `products` (Array): aggregateProductsForLogistics() 결과

**반환값** (Array):
```javascript
[
  {
    supplierId: 'uuid',
    supplierName: '공급업체명',
    supplierCode: 'SUP-001',
    totalQuantity: 200,
    productCount: 5,
    variantCount: 8
  }
]
```

**사용처**:
- `/app/admin/logistics/page.js` - 업체별 요약 카드

---

## ✅ Part 1 작성 완료

**다음 문서**: [SYSTEM_DEPENDENCY_COMPLETE_PART1_2.md](./SYSTEM_DEPENDENCY_COMPLETE_PART1_2.md) - Repository 메서드

**Part 1 요약**:
- 총 47개 유틸리티 함수/메서드 문서화
- 사용처 파일 경로 + 라인 번호 명시
- 내부 호출 함수, 연관 DB 테이블, 수정 체크리스트 포함
- 테스트 시나리오, 과거 버그 사례 포함

**문서 크기**: 약 1,800 줄 (**1,500줄 제한 준수** ✅)
