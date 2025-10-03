# 🚨 코딩 규칙 - 절대 위반 금지

**이 문서는 개발 중 반복되는 실수를 방지하기 위한 강제 규칙입니다.**

---

## ⚠️ 이 문서가 생긴 이유

### 실제 발생한 문제 (2025-10-03)

**문제**: 쿠폰 계산 로직이 중앙화 모듈(`OrderCalculations.js`)에 완벽하게 구현되어 있었지만, **실제 페이지들은 이를 사용하지 않고 각자 수동으로 계산**하고 있었음.

**결과**:
- ❌ 체크아웃 페이지: 수동 계산
- ❌ 주문 완료 페이지: 수동 계산
- ❌ 관리자 주문 상세: 수동 계산
- ❌ 관리자 주문 리스트: 수동 계산 (쿠폰 할인 누락!)

**왜 발생했나?**
1. 중앙화 모듈을 만들었지만 **강제 사용 규칙이 없었음**
2. 각 페이지를 만들 때 **중앙화 모듈 존재를 확인하지 않음**
3. 코드 리뷰나 검증 과정에서 **중복 로직을 감지하지 못함**

**이런 일이 다시 발생하면 안 됩니다!**

---

## 🛡️ 절대 규칙 (NEVER DO)

### 규칙 1: 중복 계산 로직 작성 금지

#### ❌ 절대 금지
```javascript
// 페이지에서 직접 계산
const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
const shippingFee = 4000
const discount = coupon ? coupon.value : 0
const finalAmount = itemsTotal + shippingFee - discount
```

#### ✅ 반드시 이렇게
```javascript
// 중앙화된 모듈 사용
import { OrderCalculations } from '@/lib/orderCalculations'

const orderCalc = OrderCalculations.calculateFinalOrderAmount(items, {
  region: shippingInfo.region,
  coupon: selectedCoupon,
  paymentMethod: 'transfer'
})
const finalAmount = orderCalc.finalAmount
```

#### 🔍 확인 방법
**새로운 계산 로직을 작성하기 전에 반드시:**
1. `/lib/orderCalculations.js` 파일 확인
2. 필요한 계산 메서드가 이미 있는지 확인
3. 없다면 **새 메서드를 추가**하고, 모든 페이지가 이를 사용하도록 수정

---

### 규칙 2: 데이터 조회 로직 중복 작성 금지

#### ❌ 절대 금지
```javascript
// 페이지에서 직접 Supabase 쿼리
const { data } = await supabase
  .from('orders')
  .select('*, items(*), shipping(*)')
  .eq('id', orderId)
  .single()
```

#### ✅ 반드시 이렇게
```javascript
// 중앙화된 API 사용
import { getOrderById } from '@/lib/supabaseApi'

const order = await getOrderById(orderId)
```

#### 🔍 확인 방법
**새로운 데이터 조회를 작성하기 전에 반드시:**
1. `/lib/supabaseApi.js` 파일 확인
2. 필요한 조회 함수가 이미 있는지 확인
3. 없다면 **새 함수를 추가**하고, 모든 페이지가 이를 사용하도록 수정

---

### 규칙 3: 유틸리티 함수 중복 작성 금지

#### ❌ 절대 금지
```javascript
// 페이지에서 배송비 직접 계산
const postalCode = address.postal_code
let shippingFee = 4000
if (postalCode.startsWith('63')) {
  shippingFee += 3000
}
```

#### ✅ 반드시 이렇게
```javascript
// 중앙화된 유틸리티 사용
import { formatShippingInfo } from '@/lib/shippingUtils'

const shippingInfo = formatShippingInfo(4000, address.postal_code)
const shippingFee = shippingInfo.totalShipping
```

---

## 🎯 필수 워크플로우

### 새로운 기능/페이지 개발 시

```
1. 요구사항 파악
   ↓
2. 🔍 기존 중앙화 모듈 확인 (필수!)
   - /lib/orderCalculations.js (주문 계산)
   - /lib/supabaseApi.js (DB 조회/수정)
   - /lib/shippingUtils.js (배송 관련)
   - /lib/userProfileManager.js (사용자 프로필)
   - /lib/couponApi.js (쿠폰 관련)
   ↓
3. 필요한 기능이 있나?
   YES → 해당 함수 사용
   NO → 중앙화 모듈에 추가 후 사용
   ↓
4. 절대 페이지에서 직접 작성 금지!
```

### 기존 코드 수정 시

```
1. 수정 요구사항 파악
   ↓
2. 🔍 영향받는 모든 페이지 검색
   예: grep -r "calculateTotal" app/
   ↓
3. 중앙화 모듈 사용 여부 확인
   사용 중 → 모듈 수정
   미사용 → 모듈로 마이그레이션
   ↓
4. 모든 페이지 일괄 업데이트
```

---

## 📋 중앙화 모듈 목록

### 1. `/lib/orderCalculations.js` - 주문 계산

**언제 사용**: 주문 금액, 배송비, 쿠폰 할인, 부가세 등 **모든 금액 계산**

**주요 메서드**:
- `calculateItemsTotal(items)` - 상품 총액
- `calculateShippingFee(itemsTotal, region)` - 배송비
- `calculateFinalOrderAmount(items, options)` - 최종 주문 금액 (쿠폰 포함)
- `applyCouponDiscount(itemsTotal, coupon)` - 쿠폰 할인

**사용 예시**:
```javascript
import { OrderCalculations } from '@/lib/orderCalculations'

// ✅ 올바른 사용
const orderCalc = OrderCalculations.calculateFinalOrderAmount(items, {
  region: 'normal',
  coupon: selectedCoupon,
  paymentMethod: 'transfer'
})

console.log('상품금액:', orderCalc.itemsTotal)
console.log('배송비:', orderCalc.shippingFee)
console.log('쿠폰할인:', orderCalc.couponDiscount)
console.log('최종금액:', orderCalc.finalAmount)
```

---

### 2. `/lib/supabaseApi.js` - 데이터베이스 조회/수정

**언제 사용**: Supabase 데이터베이스와 **모든 상호작용**

**주요 함수**:
- `getOrderById(orderId)` - 주문 조회
- `createOrder(orderItem, userProfile, depositName)` - 주문 생성
- `updateOrderStatus(orderId, status, data)` - 주문 상태 변경
- `getAllOrders()` - 전체 주문 조회

**⚠️ 절대 금지**:
```javascript
// ❌ 페이지에서 직접 supabase 호출
const { data } = await supabase.from('orders').select('*')
```

**✅ 반드시 이렇게**:
```javascript
// ✅ 중앙화된 API 사용
import { getAllOrders } from '@/lib/supabaseApi'
const orders = await getAllOrders()
```

---

### 3. `/lib/shippingUtils.js` - 배송 관련

**언제 사용**: 배송비 계산, 도서산간 지역 확인

**주요 함수**:
- `formatShippingInfo(baseShipping, postalCode)` - 배송비 계산 (도서산간 포함)

**사용 예시**:
```javascript
import { formatShippingInfo } from '@/lib/shippingUtils'

const shippingInfo = formatShippingInfo(4000, '63000')
// 반환: { baseShipping, surcharge, totalShipping, region, isRemote }
```

---

### 4. `/lib/couponApi.js` - 쿠폰 관련

**언제 사용**: 쿠폰 조회, 검증, 사용

**주요 함수**:
- `getUserCoupons(userId)` - 사용자 쿠폰 목록
- `validateCoupon(code, userId, productAmount)` - 쿠폰 검증 (DB 함수 호출)
- `useCoupon(userId, couponId, orderId, discountAmount)` - 쿠폰 사용 처리

---

### 5. `/lib/userProfileManager.js` - 사용자 프로필

**언제 사용**: 사용자 정보 정규화, 완성도 체크

**주요 메서드**:
- `UserProfileManager.normalizeProfile(profile)` - 프로필 정규화
- `UserProfileManager.checkCompleteness(profile)` - 완성도 확인

---

## 🔍 코드 작성 전 체크리스트

### ✅ 새로운 코드를 작성하기 전에 반드시 확인

```markdown
□ 이 계산/조회 로직이 중앙화 모듈에 이미 있는가?
  → /lib/ 폴더의 모든 파일 확인

□ 비슷한 기능을 하는 코드가 다른 페이지에 있는가?
  → grep -r "함수명" app/ 로 검색

□ 이 로직을 여러 페이지에서 사용할 가능성이 있는가?
  → YES: 반드시 중앙화 모듈에 추가
  → NO: 정말로 한 페이지에서만 사용? 다시 확인!

□ DB 스키마/컬럼명을 정확히 확인했는가?
  → DB_REFERENCE_GUIDE.md 필수 확인

□ 영향받는 모든 페이지를 파악했는가?
  → DETAILED_DATA_FLOW.md 확인
```

---

## 🚨 코드 리뷰 체크리스트

### 작업 완료 후 자가 검증

```markdown
□ 중앙화 모듈을 사용했는가?
  → 페이지에서 직접 계산/조회하지 않았는가?

□ 중복 코드가 없는가?
  → grep으로 비슷한 로직 검색했는가?

□ 모든 영향받는 페이지를 수정했는가?
  → 한 곳만 고치고 끝내지 않았는가?

□ 콘솔 로그를 추가했는가?
  → 디버깅을 위한 로그가 충분한가?

□ DB 컬럼명이 정확한가?
  → price vs unit_price, total vs total_price 등

□ 쿠폰 할인 계산 시 배송비를 제외했는가?
  → 퍼센트 할인은 상품 금액에만 적용!
```

---

## 📝 강제 커밋 메시지 규칙

### 중앙화 위반 시 반드시 표기

```bash
# ❌ 잘못된 커밋 메시지
git commit -m "fix: 쿠폰 할인 계산 수정"

# ✅ 올바른 커밋 메시지
git commit -m "refactor: 쿠폰 할인 계산을 OrderCalculations로 중앙화

- 체크아웃 페이지 중앙화 모듈 사용
- 주문 완료 페이지 중앙화 모듈 사용
- 관리자 페이지 중앙화 모듈 사용
- 중복 계산 로직 제거"
```

---

## 🎯 자주 발생하는 실수 패턴

### 1. "빨리 만들어야 해서 임시로..."

**❌ 문제**:
```javascript
// "임시로" 페이지에서 직접 계산
const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0) + 4000
```

**✅ 해결**:
```javascript
// 처음부터 올바르게
import { OrderCalculations } from '@/lib/orderCalculations'
const orderCalc = OrderCalculations.calculateFinalOrderAmount(items, {})
const total = orderCalc.finalAmount
```

**💡 교훈**: **임시방편은 영원히 남습니다.** 처음부터 올바르게 하는 게 더 빠릅니다.

---

### 2. "이 페이지는 특별해서..."

**❌ 문제**:
```javascript
// "이 페이지는 특별하니까 직접 계산해도 돼"
const adminTotal = calculateAdminTotal(items) // 중복 로직
```

**✅ 해결**:
```javascript
// 특별한 페이지도 중앙화 모듈 사용
const orderCalc = OrderCalculations.calculateFinalOrderAmount(items, {})
```

**💡 교훈**: **특별한 페이지는 없습니다.** 모든 페이지가 동일한 규칙을 따릅니다.

---

### 3. "복사-붙여넣기가 빠르니까..."

**❌ 문제**:
```javascript
// 다른 페이지에서 복사
const itemsTotal = order.items.reduce((sum, item) => {
  return sum + ((item.price || 0) * (item.quantity || 1))
}, 0)
```

**✅ 해결**:
```javascript
// 중앙화된 메서드 호출
const itemsTotal = OrderCalculations.calculateItemsTotal(order.items)
```

**💡 교훈**: **복사-붙여넣기는 기술 부채의 시작입니다.** 중앙화 모듈을 사용하세요.

---

## 🛠️ 리팩토링 가이드

### 중복 로직 발견 시 즉시 실행

```
1. 중복 로직 확인
   grep -r "계산패턴" app/
   ↓
2. 중앙화 모듈에 메서드 추가
   /lib/orderCalculations.js
   ↓
3. 모든 페이지 일괄 수정
   - 체크아웃 페이지
   - 주문 완료 페이지
   - 관리자 페이지
   - 모바일 뷰
   ↓
4. 테스트 및 검증
   ↓
5. 커밋 (명확한 메시지)
```

---

## 📚 참고 문서

- **DB_REFERENCE_GUIDE.md**: 모든 DB 작업 시 필수 확인
- **DETAILED_DATA_FLOW.md**: 페이지별 데이터 흐름
- **CLAUDE.md**: 전체 개발 가이드

---

## 🎉 성공 사례

### 올바른 중앙화 예시 (2025-10-03 리팩토링 후)

**모든 페이지가 동일한 계산 모듈 사용:**

```javascript
// ✅ app/checkout/page.js
const orderCalc = OrderCalculations.calculateFinalOrderAmount(items, options)

// ✅ app/orders/[id]/complete/page.js
const orderCalc = OrderCalculations.calculateFinalOrderAmount(items, options)

// ✅ app/admin/orders/[id]/page.js
const orderCalc = OrderCalculations.calculateFinalOrderAmount(items, options)

// ✅ app/admin/orders/page.js
const orderCalc = OrderCalculations.calculateFinalOrderAmount(items, options)
```

**결과**:
- ✅ 일관된 계산 로직
- ✅ 유지보수 용이
- ✅ 버그 발생 시 한 곳만 수정
- ✅ 테스트 용이

---

## 🚀 앞으로 나아가기

### 새로운 기능 추가 시

1. **먼저 생각**: 이 로직이 여러 곳에서 사용될까?
2. **먼저 확인**: 비슷한 로직이 이미 있을까?
3. **먼저 중앙화**: 새로운 로직은 `/lib/`에 추가
4. **그 다음 사용**: 페이지에서 import해서 사용

### 기억하세요

> **"중복은 악의 근원이다"**
>
> 동일한 로직이 2곳 이상에 있다면, 그것은 버그의 시작입니다.

---

**마지막 업데이트**: 2025-10-03
**작성 이유**: 쿠폰 계산 로직 중복 문제 발생 후 재발 방지
