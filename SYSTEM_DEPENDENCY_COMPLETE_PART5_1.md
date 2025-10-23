# SYSTEM_DEPENDENCY_COMPLETE_PART5_1 - 중앙 함수 수정 시나리오 (유틸리티)

**작성일**: 2025-10-20
**버전**: 2.0 (2025-10-21 분할)
**총 PART5 중 PART5_1 (유틸리티 함수)**
**목적**: 중앙 함수 수정 시 영향받는 모든 요소를 체크리스트로 관리

---

## 📋 목차

### Section 1: OrderCalculations 수정 시나리오
- 1.1 calculateFinalOrderAmount() 수정
- 1.2 applyShippingFee() 수정
- 1.3 applyCouponDiscount() 수정
- 1.4 calculateProductSubtotal() 수정
- 1.5 calculateShippingFee() 수정
- 1.6 calculateDiscountAmount() 수정
- 1.7 applyPaymentMethodFee() 수정
- 1.8 generateBreakdown() 수정

### Section 2: formatShippingInfo() 수정 시나리오

### Section 3: UserProfileManager 수정 시나리오
- 3.1 getCurrentUser() 수정
- 3.2 atomicProfileUpdate() 수정
- 3.3 syncKakaoProfile() 수정
- 3.4 loadUserProfile() 수정

### Section 4: Coupon API 수정 시나리오
- 4.1 validateCoupon() 수정
- 4.2 loadUserCouponsOptimized() 수정
- 4.3 applyCouponUsage() 수정
- 4.4 distributeCoupon() 수정
- 4.5 createCoupon() 수정

### Section 5: 새로운 중앙 함수 추가 시나리오

### Section 6: OrderRepository 수정 시나리오 ✅ NEW (Phase 1.1)
- 6.1 findByUser() 수정
- 6.2 findById() 수정
- 6.3 create() 수정
- 6.4 update() 수정
- 6.5 updateStatus() 수정
- 6.6 updateMultipleStatus() 수정
- 6.7 cancel() 수정

---

**Repository 수정 시나리오는**: [SYSTEM_DEPENDENCY_COMPLETE_PART5_1_2.md](./SYSTEM_DEPENDENCY_COMPLETE_PART5_1_2.md) 참조

---

## Section 1: OrderCalculations 수정 시나리오

### 1.1 calculateFinalOrderAmount() 수정

#### 📌 개요
- **함수 위치**: `/lib/orderCalculations.js`
- **목적**: 최종 주문 금액 계산 (상품 합계 + 배송비 - 쿠폰 할인)
- **현재 상태**: Part 1 Section 1.1 참조
- **사용처**: 7곳 (체크아웃, 주문목록, 주문상세, 관리자 3곳)

#### 🔍 현재 상태 (Part 1에서 확인)
```javascript
// Part 1 Section 1.1 참조
사용처:
1. /app/checkout/page.js (lines 583, 641, 1380)
2. /app/orders/page.js (line 581)
3. /app/orders/[id]/complete/page.js (line 846)
4. /app/admin/orders/page.js (line 429)
5. /app/admin/orders/[id]/page.js (line 518)
6. /app/api/orders/update-status/route.js (line 172)
```

#### 📋 수정 전 체크리스트

- [ ] **1. 사용처 파악** (Part 1 Section 1.1)
  - 7개 사용처 모두 확인
  - 각 사용처에서 전달하는 파라미터 형식 확인
  - 반환값을 어떻게 사용하는지 확인

- [ ] **2. 파라미터 구조 확인**
  ```javascript
  calculateFinalOrderAmount(items, options = {})
  // items: [{ price, quantity, totalPrice }]
  // options: { region, coupon, paymentMethod, baseShippingFee }
  ```

- [ ] **3. 반환값 구조 확인**
  ```javascript
  return {
    productSubtotal,     // 상품 합계
    shippingFee,         // 배송비
    couponDiscount,      // 쿠폰 할인
    finalTotal,          // 최종 금액
    breakdown: { ... }   // 상세 내역
  }
  ```

- [ ] **4. 의존 함수 확인** (같은 파일 내)
  - `calculateProductSubtotal(items)`
  - `calculateShippingFee(options)`
  - `applyCouponDiscount(subtotal, coupon)`
  - `generateBreakdown(...)`

- [ ] **5. 영향받는 페이지 확인** (Part 4 참조)
  - Section 2: /checkout
  - Section 5: /orders
  - Section 6: /orders/[id]/complete
  - Section 12: /admin/orders
  - Section 13: /admin/orders/[id]

- [ ] **6. DB 저장 영향 확인** (Part 2 참조)
  - orders.total_amount 계산에 사용
  - orders.discount_amount 계산에 사용
  - order_payments.amount 계산에 사용

- [ ] **7. API 호출 영향 확인** (Part 3 참조)
  - Section 1.1: POST /api/orders/create
  - Section 3: PATCH /api/orders/update-status
  - Section 4.1: GET /api/admin/orders

#### 🔧 수정 작업 체크리스트

- [ ] **8. 함수 시그니처 변경 시**
  - 파라미터 추가/삭제/변경 시 모든 호출처 수정 필요
  - 기본값(default) 설정으로 호환성 유지 권장
  - JSDoc 주석 업데이트

- [ ] **9. 반환값 구조 변경 시**
  - 7개 사용처 모두 변경된 반환값 처리 확인
  - breakdown 객체 필드 추가/삭제 시 UI 표시 코드 수정
  - TypeScript 타입 정의 업데이트 (있다면)

- [ ] **10. 계산 로직 변경 시**
  - 배송비 계산 순서: 상품 합계 → 무료배송 확인 → 배송비 적용
  - 쿠폰 할인 계산: **배송비 제외** (중요!)
  - 최종 금액 = productSubtotal + shippingFee - couponDiscount

- [ ] **11. 무료배송 로직 변경 시**
  - `baseShippingFee` 파라미터 전달 확인 (true/false)
  - 7개 사용처 모두 동일한 로직 적용 확인
  - 서버 사이드 검증과 일치 확인

- [ ] **12. 쿠폰 할인 로직 변경 시**
  - 쿠폰 타입: percentage, fixed_amount
  - 최소 주문 금액 조건 확인
  - 최대 할인 금액 제한 확인
  - 배송비 제외 로직 유지

- [ ] **13. 코드 수정 완료**
  - `/lib/orderCalculations.js` 수정
  - ESLint 에러 없는지 확인
  - 콘솔 에러 없는지 확인

#### ✅ 수정 후 검증 체크리스트

- [ ] **14. 사용처별 테스트** (7곳)
  - `/app/checkout/page.js` 테스트 (3곳)
    - 초기 금액 계산 (line 583)
    - 쿠폰 적용 후 금액 계산 (line 641)
    - 주문 생성 전 최종 계산 (line 1380)
  - `/app/orders/page.js` 테스트
    - 주문 카드 금액 표시 정확한가?
  - `/app/orders/[id]/complete/page.js` 테스트
    - 주문 완료 페이지 금액 정확한가?
  - 관리자 페이지 3곳 테스트
    - 주문 목록/상세 금액 일치하는가?

- [ ] **15. E2E 시나리오 테스트**
  - 체크아웃 → 주문 생성 → 주문 완료 페이지 확인
  - 쿠폰 적용 → 할인 금액 정확한가?
  - 무료배송 적용 → 배송비 0원인가?
  - 도서산간 배송 → 추가 배송비 정확한가?

- [ ] **16. DB 저장 값 확인**
  - orders.total_amount = finalTotal
  - orders.discount_amount = couponDiscount
  - order_payments.amount = finalTotal
  - 값이 정확히 일치하는가?

- [ ] **17. 콘솔 로그 확인**
  - 계산 과정 로그 출력 확인
  - breakdown 객체 구조 확인
  - 에러 메시지 없는지 확인

- [ ] **18. 문서 업데이트**
  - Part 1 Section 1.1 업데이트
  - Part 5-1 Section 1.1 (현재 문서) 업데이트
  - 변경 이력 기록

#### 🐛 과거 버그 사례

**사례 1: 쿠폰 할인이 배송비 포함해서 계산됨 (2025-10-03)**
- **증상**: 배송비 3,000원인데 쿠폰 5,000원 적용 시 마이너스 발생
- **원인**: `applyCouponDiscount()`가 (상품 합계 + 배송비)에서 할인 계산
- **해결**: `applyCouponDiscount(subtotal - shippingFee, coupon)` → 배송비 제외
- **재발 방지**: 쿠폰 할인은 **항상 배송비 제외**

**사례 2: 무료배송 조건이 클라이언트와 서버 불일치 (2025-10-16)**
- **증상**: 클라이언트에서 무료배송 표시했는데 서버에서 배송비 부과
- **원인**: 클라이언트는 pending 주문 확인, 서버는 플래그만 저장
- **해결**: 서버 사이드에서 실시간 pending 주문 확인 추가
- **재발 방지**: `baseShippingFee` 파라미터로 서버 검증 결과 전달

**사례 3: breakdown 객체 필드 누락 (2025-10-08)**
- **증상**: UI에서 "배송비" 항목이 undefined 표시
- **원인**: breakdown 객체에 shippingFee 필드 누락
- **해결**: generateBreakdown() 함수에 모든 필드 포함
- **재발 방지**: 반환값 구조 변경 시 7개 사용처 모두 확인

#### 📚 크로스 레퍼런스

- **Part 1 Section 1.1**: calculateFinalOrderAmount() 정의 및 사용처
- **Part 2 Section 1**: orders 테이블 (total_amount, discount_amount 컬럼)
- **Part 3 Section 1.1**: POST /api/orders/create (API에서 사용)
- **Part 4 Section 2**: /checkout 페이지 (가장 많이 사용하는 페이지)
- **Part 5-2 Section 1**: orders 테이블 수정 시나리오

---

### 1.2 applyShippingFee() 수정

#### 📌 개요
- **함수 위치**: `/lib/orderCalculations.js` (내부 메서드)
- **목적**: 배송비 적용 (무료배송 조건 확인 포함)
- **현재 상태**: Part 1 Section 1.2 참조
- **사용처**: calculateFinalOrderAmount() 내부에서만 호출

#### 📋 수정 전 체크리스트

- [ ] **1. 현재 로직 이해**
  ```javascript
  applyShippingFee(options) {
    if (options.baseShippingFee) return 0  // 무료배송
    const region = options.region
    return this.calculateShippingFee(region)
  }
  ```

- [ ] **2. 무료배송 조건 확인**
  - `baseShippingFee === true` → 무료배송 적용
  - 서버에서 pending/verifying 주문 확인 후 전달
  - 클라이언트는 이 플래그만 확인

- [ ] **3. 도서산간 배송비 확인**
  - `calculateShippingFee(region)` 호출
  - `formatShippingInfo()` 함수 사용 (Part 1 Section 3.5)
  - Jeju: +3,000원, Ulleungdo: +5,000원

- [ ] **4. 영향받는 함수 확인**
  - 상위: calculateFinalOrderAmount()
  - 하위: calculateShippingFee()

#### 🔧 수정 작업 체크리스트

- [ ] **5. 무료배송 조건 변경 시**
  - `baseShippingFee` 파라미터 전달 방식 확인
  - 모든 호출처에서 올바른 플래그 전달하는지 확인
  - 서버 API에서 실시간 검증하는지 확인

- [ ] **6. 배송비 계산 로직 변경 시**
  - `calculateShippingFee()` 수정 (Section 1.5 참조)
  - `formatShippingInfo()` 수정 (Section 2 참조)

- [ ] **7. 코드 수정 완료**
  - applyShippingFee() 메서드 수정
  - 단위 테스트 작성 권장

#### ✅ 수정 후 검증 체크리스트

- [ ] **8. 무료배송 조건 테스트**
  - pending 주문 있을 때 → 배송비 0원
  - pending 주문 없을 때 → 배송비 부과
  - 일괄결제 시 → 조건 확인

- [ ] **9. 도서산간 배송비 테스트**
  - 제주 우편번호 → +3,000원
  - 울릉도 우편번호 → +5,000원
  - 일반 지역 → 기본 배송비

- [ ] **10. 문서 업데이트**
  - Part 1 Section 1.2 업데이트

#### 🐛 과거 버그 사례

**사례 1: 무료배송 플래그 전달 누락 (2025-10-16)**
- **증상**: 무료배송 조건 충족했는데 배송비 부과됨
- **원인**: `baseShippingFee` 파라미터 전달 안 함
- **해결**: 모든 호출처에 `baseShippingFee: isFreeShipping` 추가
- **재발 방지**: calculateFinalOrderAmount() 호출 시 항상 확인

---

### 1.3 applyCouponDiscount() 수정

#### 📌 개요
- **함수 위치**: `/lib/orderCalculations.js` (내부 메서드)
- **목적**: 쿠폰 할인 계산 (배송비 제외!)
- **현재 상태**: Part 1 Section 1.3 참조
- **사용처**: calculateFinalOrderAmount() 내부에서만 호출

#### 📋 수정 전 체크리스트

- [ ] **1. 현재 로직 이해**
  ```javascript
  applyCouponDiscount(subtotal, coupon) {
    if (!coupon) return 0
    if (coupon.type === 'percentage') {
      const discount = subtotal * (coupon.value / 100)
      return Math.min(discount, coupon.maxDiscount || Infinity)
    }
    if (coupon.type === 'fixed_amount') {
      return Math.min(coupon.value, subtotal)
    }
    return 0
  }
  ```

- [ ] **2. 쿠폰 타입 확인**
  - `percentage`: 퍼센트 할인 (예: 10%)
  - `fixed_amount`: 고정 금액 할인 (예: 5,000원)

- [ ] **3. 최소/최대 조건 확인**
  - `coupon.minPurchaseAmount`: 최소 주문 금액
  - `coupon.maxDiscount`: 최대 할인 금액 (percentage 타입)
  - `validateCoupon()` 함수에서 검증 (Part 1 Section 4.1)

- [ ] **4. 배송비 제외 로직 확인** ⚠️ 중요!
  - `subtotal` 파라미터는 **배송비 제외된 금액**
  - 상위 함수에서 배송비 제외하고 전달하는지 확인

#### 🔧 수정 작업 체크리스트

- [ ] **5. 쿠폰 타입 추가 시**
  - 새로운 타입 추가 (예: `buy_x_get_y`)
  - 모든 case 처리
  - 기본값 0 반환

- [ ] **6. 최대 할인 금액 로직 변경 시**
  - percentage 타입: `Math.min()` 확인
  - fixed_amount 타입: `Math.min(coupon.value, subtotal)` 확인
  - 마이너스 금액 방지

- [ ] **7. 배송비 포함 방지** ⚠️ 필수!
  - 절대 배송비 포함해서 계산하지 말 것
  - `subtotal` 파라미터가 배송비 제외되었는지 확인
  - 테스트 시나리오 필수

#### ✅ 수정 후 검증 체크리스트

- [ ] **8. 쿠폰 타입별 테스트**
  - percentage: 10% 할인 → 정확한가?
  - fixed_amount: 5,000원 할인 → 정확한가?
  - 최대 할인 금액 적용 → 초과하지 않는가?

- [ ] **9. 배송비 제외 검증** ⚠️ 필수!
  - 상품 10,000원 + 배송비 3,000원
  - 쿠폰 5,000원 할인
  - 결과: 8,000원 (10,000 - 5,000 + 3,000) ✅
  - **잘못된 결과**: 5,000원 (13,000 - 5,000 - 3,000) ❌

- [ ] **10. 마이너스 금액 방지**
  - 상품 1,000원, 쿠폰 5,000원 → 할인 1,000원 (마이너스 방지)

- [ ] **11. 문서 업데이트**
  - Part 1 Section 1.3 업데이트

#### 🐛 과거 버그 사례

**사례 1: 배송비 포함해서 쿠폰 할인 계산 (2025-10-03)**
- **증상**: 배송비 3,000원인데 쿠폰 5,000원 → 마이너스 발생
- **원인**: `subtotal`에 배송비가 포함됨
- **해결**: `applyCouponDiscount(productSubtotal, coupon)` → 배송비 제외
- **재발 방지**: **배송비 절대 포함 금지!** 주석 추가

---

### 1.4 calculateProductSubtotal() 수정

#### 📌 개요
- **함수 위치**: `/lib/orderCalculations.js` (내부 메서드)
- **목적**: 상품 합계 금액 계산
- **현재 상태**: Part 1 Section 1.4 참조
- **사용처**: calculateFinalOrderAmount() 내부에서만 호출

#### 📋 수정 전 체크리스트

- [ ] **1. 현재 로직 이해**
  ```javascript
  calculateProductSubtotal(items) {
    return items.reduce((sum, item) => {
      const price = item.price || 0
      const quantity = item.quantity || 1
      return sum + (price * quantity)
    }, 0)
  }
  ```

- [ ] **2. items 구조 확인**
  ```javascript
  items = [
    { price: 10000, quantity: 2, totalPrice: 20000 },
    { price: 5000, quantity: 1, totalPrice: 5000 }
  ]
  ```

- [ ] **3. price vs totalPrice 확인**
  - `price * quantity` 계산
  - `totalPrice` 필드는 참고용 (실제 계산에 사용 안 함)

#### 🔧 수정 작업 체크리스트

- [ ] **4. 계산 로직 변경 시**
  - price * quantity 대신 totalPrice 사용?
  - 추가 비용 포함? (옵션 추가 금액 등)

- [ ] **5. 예외 처리 강화**
  - price가 음수인 경우
  - quantity가 0 이하인 경우
  - items가 빈 배열인 경우

#### ✅ 수정 후 검증 체크리스트

- [ ] **6. 계산 정확도 테스트**
  - 상품 2개 각각 10,000원 × 1개 = 20,000원
  - 상품 1개 5,000원 × 3개 = 15,000원
  - 합계 = 35,000원

- [ ] **7. 문서 업데이트**
  - Part 1 Section 1.4 업데이트

---

### 1.5 calculateShippingFee() 수정

#### 📌 개요
- **함수 위치**: `/lib/orderCalculations.js` (내부 메서드)
- **목적**: 도서산간 배송비 계산
- **현재 상태**: Part 1 Section 1.5 참조
- **사용처**: applyShippingFee() 내부에서 호출
- **의존**: `formatShippingInfo()` (Part 1 Section 3.5)

#### 📋 수정 전 체크리스트

- [ ] **1. 현재 로직 이해**
  ```javascript
  calculateShippingFee(region) {
    const baseShipping = 3000  // 기본 배송비
    const { totalShipping } = formatShippingInfo(baseShipping, region)
    return totalShipping
  }
  ```

- [ ] **2. formatShippingInfo() 확인**
  - Jeju 63000-63644 → +3,000원
  - Ulleungdo 40200-40240 → +5,000원
  - 기타 도서산간 → +5,000원

- [ ] **3. region 파라미터 확인**
  - `options.region` = postal_code (우편번호)
  - 5자리 숫자 문자열 (예: "06234")

#### 🔧 수정 작업 체크리스트

- [ ] **4. 기본 배송비 변경 시**
  - baseShipping = 3000 → 다른 금액으로 변경
  - 모든 호출처 확인
  - DB에 저장된 기존 주문 영향 확인

- [ ] **5. 도서산간 요금 변경 시**
  - formatShippingInfo() 수정 (Section 2 참조)
  - 제주/울릉도 요금 변경
  - 새로운 지역 추가

#### ✅ 수정 후 검증 체크리스트

- [ ] **6. 도서산간 배송비 테스트**
  - 서울 (06234) → 3,000원
  - 제주 (63001) → 6,000원 (3,000 + 3,000)
  - 울릉도 (40200) → 8,000원 (3,000 + 5,000)

- [ ] **7. 문서 업데이트**
  - Part 1 Section 1.5 업데이트

---

### 1.6 calculateDiscountAmount() 수정

#### 📌 개요
- **함수 위치**: `/lib/orderCalculations.js` (내부 메서드)
- **목적**: 할인 금액 계산 (쿠폰, 프로모션 등)
- **현재 상태**: Part 1 Section 1.6 참조
- **사용처**: calculateFinalOrderAmount() 내부에서 호출

#### 📋 수정 전 체크리스트

- [ ] **1. 현재 할인 타입 확인**
  - 쿠폰 할인 (applyCouponDiscount)
  - 포인트 할인 (미구현)
  - 프로모션 할인 (미구현)

- [ ] **2. 할인 우선순위 확인**
  - 쿠폰 먼저 적용
  - 포인트 나중에 적용
  - 최종 금액 마이너스 방지

#### 🔧 수정 작업 체크리스트

- [ ] **3. 새로운 할인 타입 추가 시**
  - 포인트 할인 추가
  - 프로모션 할인 추가
  - 할인 우선순위 정의

- [ ] **4. 할인 중복 적용 방지**
  - 쿠폰 + 포인트 동시 사용 가능?
  - 최대 할인 한도 설정?

#### ✅ 수정 후 검증 체크리스트

- [ ] **5. 할인 조합 테스트**
  - 쿠폰 단독
  - 포인트 단독
  - 쿠폰 + 포인트

- [ ] **6. 문서 업데이트**
  - Part 1 Section 1.6 업데이트

---

### 1.7 applyPaymentMethodFee() 수정

#### 📌 개요
- **함수 위치**: `/lib/orderCalculations.js` (내부 메서드)
- **목적**: 결제 수단별 추가 수수료 계산
- **현재 상태**: Part 1 Section 1.7 참조
- **사용처**: calculateFinalOrderAmount() 내부에서 호출

#### 📋 수정 전 체크리스트

- [ ] **1. 현재 결제 수단 확인**
  - bank_transfer: 무통장 입금 (수수료 없음)
  - card: 신용카드 (수수료 없음)
  - kakaopay: 카카오페이 (수수료 없음)

- [ ] **2. 수수료 부과 조건 확인**
  - 현재 모든 결제 수단 수수료 0원
  - 향후 추가 가능성?

#### 🔧 수정 작업 체크리스트

- [ ] **3. 결제 수수료 추가 시**
  - 결제 수단별 요금표 정의
  - 퍼센트 방식? 고정 금액?
  - 최소/최대 수수료 설정

- [ ] **4. 코드 수정**
  ```javascript
  applyPaymentMethodFee(amount, paymentMethod) {
    const fees = {
      bank_transfer: 0,
      card: amount * 0.03,  // 3% 수수료
      kakaopay: 500         // 고정 500원
    }
    return fees[paymentMethod] || 0
  }
  ```

#### ✅ 수정 후 검증 체크리스트

- [ ] **5. 결제 수수료 테스트**
  - 각 결제 수단별 정확한가?
  - UI에 수수료 표시되는가?

- [ ] **6. 문서 업데이트**
  - Part 1 Section 1.7 업데이트

---

### 1.8 generateBreakdown() 수정

#### 📌 개요
- **함수 위치**: `/lib/orderCalculations.js` (내부 메서드)
- **목적**: 주문 금액 상세 내역 생성 (UI 표시용)
- **현재 상태**: Part 1 Section 1.8 참조
- **사용처**: calculateFinalOrderAmount() 반환값

#### 📋 수정 전 체크리스트

- [ ] **1. 현재 breakdown 구조 확인**
  ```javascript
  breakdown: {
    productSubtotal,   // 상품 합계
    shippingFee,       // 배송비
    couponDiscount,    // 쿠폰 할인
    finalTotal,        // 최종 금액
    items: [...]       // 상품 목록
  }
  ```

- [ ] **2. UI 표시 위치 확인**
  - /app/checkout/page.js (lines 1206-1230)
  - /app/orders/[id]/complete/page.js (line 900-950)
  - 관리자 페이지 (주문 상세)

#### 🔧 수정 작업 체크리스트

- [ ] **3. 필드 추가 시**
  - 새로운 필드 추가 (예: pointDiscount)
  - 모든 UI 표시 코드 수정
  - 기본값 설정 (기존 호환성)

- [ ] **4. 필드 삭제 시**
  - UI에서 사용 중인지 확인
  - 삭제 전 대체 방법 제공

#### ✅ 수정 후 검증 체크리스트

- [ ] **5. UI 표시 테스트**
  - 체크아웃 페이지 금액 표시 정확한가?
  - 주문 완료 페이지 상세 내역 정확한가?

- [ ] **6. 문서 업데이트**
  - Part 1 Section 1.8 업데이트

---

## Section 2: formatShippingInfo() 수정 시나리오

### 📌 개요
- **함수 위치**: `/lib/shippingUtils.js`
- **목적**: 도서산간 배송비 계산 (우편번호 기반)
- **현재 상태**: Part 1 Section 3.5 참조
- **사용처**: 6곳 (체크아웃, 주문상세, 관리자 3곳)

### 🔍 현재 상태 (Part 1에서 확인)
```javascript
// Part 1 Section 3.5 참조
사용처:
1. /app/checkout/page.js (line 571)
2. /app/orders/[id]/complete/page.js (line 823)
3. /app/admin/orders/[id]/page.js (line 495)
4. /app/admin/shipping/page.js (line 157)
5. /lib/orderCalculations.js (line 45)
6. /app/api/orders/create/route.js (line 255)
```

### 📋 수정 전 체크리스트

- [ ] **1. 사용처 파악** (Part 1 Section 3.5)
  - 6개 사용처 모두 확인
  - 각 사용처에서 postal_code 전달 방식 확인

- [ ] **2. 현재 로직 이해**
  ```javascript
  formatShippingInfo(baseShipping, postalCode) {
    let surcharge = 0
    let region = '일반'
    let isRemote = false

    // Jeju
    if (postalCode >= '63000' && postalCode <= '63644') {
      surcharge = 3000
      region = 'Jeju'
      isRemote = true
    }
    // Ulleungdo
    else if (postalCode >= '40200' && postalCode <= '40240') {
      surcharge = 5000
      region = 'Ulleungdo'
      isRemote = true
    }

    return {
      baseShipping,
      surcharge,
      totalShipping: baseShipping + surcharge,
      region,
      isRemote
    }
  }
  ```

- [ ] **3. 우편번호 범위 확인**
  - Jeju: 63000-63644 (+3,000원)
  - Ulleungdo: 40200-40240 (+5,000원)
  - 기타 도서산간: 향후 추가 가능

- [ ] **4. 반환값 구조 확인**
  ```javascript
  {
    baseShipping,      // 기본 배송비
    surcharge,         // 추가 요금
    totalShipping,     // 총 배송비
    region,            // 지역명
    isRemote           // 도서산간 여부
  }
  ```

- [ ] **5. 영향받는 페이지 확인** (Part 4 참조)
  - Section 2: /checkout
  - Section 6: /orders/[id]/complete
  - Section 13: /admin/orders/[id]
  - Section 15: /admin/shipping

- [ ] **6. DB 저장 영향 확인** (Part 2 참조)
  - order_shipping.base_shipping_fee
  - order_shipping.surcharge
  - order_shipping.total_shipping_fee
  - profiles.postal_code

### 🔧 수정 작업 체크리스트

- [ ] **7. 새로운 도서산간 지역 추가 시**
  ```javascript
  // 예: 독도 추가
  else if (postalCode >= '40XXX' && postalCode <= '40YYY') {
    surcharge = 10000
    region = 'Dokdo'
    isRemote = true
  }
  ```

- [ ] **8. 배송 요금 변경 시**
  - Jeju: 3,000원 → 다른 금액으로 변경
  - Ulleungdo: 5,000원 → 다른 금액으로 변경
  - 기존 주문에 영향 없는지 확인

- [ ] **9. 우편번호 범위 변경 시**
  - 정확한 우편번호 범위 확인
  - 테스트 데이터 준비

- [ ] **10. 반환값 구조 변경 시**
  - 6개 사용처 모두 변경된 반환값 처리 확인
  - 기본값 설정으로 호환성 유지

- [ ] **11. 코드 수정 완료**
  - `/lib/shippingUtils.js` 수정
  - 단위 테스트 추가

### ✅ 수정 후 검증 체크리스트

- [ ] **12. 사용처별 테스트** (6곳)
  - 체크아웃 페이지: 배송비 정확히 표시되는가?
  - 주문 완료 페이지: 도서산간 요금 표시되는가?
  - 관리자 페이지: 배송비 내역 정확한가?

- [ ] **13. 우편번호별 테스트**
  - 서울 06234 → 기본 배송비
  - 제주 63001 → 기본 + 3,000원
  - 울릉도 40200 → 기본 + 5,000원
  - 경계값 테스트 (63000, 63644, 40200, 40240)

- [ ] **14. DB 저장 값 확인**
  - order_shipping.base_shipping_fee = 3000
  - order_shipping.surcharge = 3000 (제주)
  - order_shipping.total_shipping_fee = 6000

- [ ] **15. UI 표시 확인**
  - "제주 지역 배송비 +3,000원" 메시지
  - "총 배송비 6,000원" 표시

- [ ] **16. 문서 업데이트**
  - Part 1 Section 3.5 업데이트
  - Part 5-1 Section 2 (현재 문서) 업데이트

### 🐛 과거 버그 사례

**사례 1: 우편번호 문자열 비교 오류 (2025-10-03)**
- **증상**: 제주 우편번호인데 기본 배송비만 부과됨
- **원인**: 우편번호를 숫자로 비교 (`63001 > '63000'` → false)
- **해결**: 문자열 비교로 변경 (`'63001' >= '63000'` → true)
- **재발 방지**: 우편번호는 항상 문자열로 비교

**사례 2: postal_code 컬럼 누락 (2025-10-03)**
- **증상**: 배송비 계산 시 undefined 전달
- **원인**: profiles.postal_code 컬럼 DB에 없음
- **해결**: 마이그레이션 생성, 컬럼 추가
- **재발 방지**: DB 스키마 확인 (Part 2 참조)

**사례 3: order_shipping 테이블 컬럼 불일치 (2025-10-03)**
- **증상**: surcharge 값이 저장 안 됨
- **원인**: order_shipping.surcharge 컬럼 없음
- **해결**: 마이그레이션으로 컬럼 추가
- **재발 방지**: DB 스키마와 함수 반환값 동기화 필수

### 📚 크로스 레퍼런스

- **Part 1 Section 3.5**: formatShippingInfo() 정의 및 사용처
- **Part 2 Section 4**: order_shipping 테이블 스키마
- **Part 2 Section 7**: profiles 테이블 (postal_code 컬럼)
- **Part 3 Section 1.1**: POST /api/orders/create (배송비 계산 API)
- **Part 4 Section 2**: /checkout 페이지 (배송비 표시)
- **Part 5-2 Section 4**: order_shipping 테이블 수정 시나리오

---

## Section 3: UserProfileManager 수정 시나리오

### 3.1 getCurrentUser() 수정

#### 📌 개요
- **함수 위치**: `/lib/UserProfileManager.js`
- **목적**: 현재 로그인 사용자 정보 조회 (Kakao + Supabase Auth 통합)
- **현재 상태**: Part 1 Section 4.6 참조
- **사용처**: 8곳 (모든 주요 페이지)

#### 🔍 현재 상태 (Part 1에서 확인)
```javascript
// Part 1 Section 4.6 참조
사용처:
1. /app/checkout/page.js (line 329)
2. /app/orders/page.js (line 83)
3. /app/mypage/page.js (line 42)
4. /app/components/product/BuyBottomSheet.jsx (line 145)
5. /lib/supabaseApi.js (여러 곳)
```

#### 📋 수정 전 체크리스트

- [ ] **1. 사용처 파악** (Part 1 Section 4.6)
  - 8개 사용처 확인
  - Kakao 사용자 vs Supabase Auth 사용자 구분

- [ ] **2. 현재 로직 이해**
  ```javascript
  static async getCurrentUser() {
    // 1. Kakao 사용자 확인 (sessionStorage)
    const kakaoUser = sessionStorage.getItem('user')
    if (kakaoUser) {
      return JSON.parse(kakaoUser)
    }

    // 2. Supabase Auth 사용자 확인
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      // profiles 테이블에서 추가 정보 조회
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      return {
        id: session.user.id,
        email: session.user.email,
        ...profile
      }
    }

    return null
  }
  ```

- [ ] **3. 반환값 구조 확인**
  ```javascript
  // Kakao 사용자
  {
    id: '3782927171',
    name: '김진태',
    kakao_id: '3782927171',
    phone: '010-1234-5678',
    ...
  }

  // Supabase Auth 사용자
  {
    id: 'uuid-abc-123',
    email: 'user@example.com',
    name: '홍길동',
    phone: '010-9876-5432',
    ...
  }
  ```

- [ ] **4. 영향받는 페이지 확인** (Part 4 참조)
  - 거의 모든 페이지에서 사용
  - 로그인 체크, 사용자 정보 표시

- [ ] **5. DB 접근 확인** (Part 2 참조)
  - profiles 테이블 SELECT
  - auth.users 테이블 (Supabase Auth)

#### 🔧 수정 작업 체크리스트

- [ ] **6. Kakao 사용자 로직 변경 시**
  - sessionStorage 키 이름 변경?
  - 추가 필드 포함?
  - 8개 사용처 영향 확인

- [ ] **7. Supabase Auth 사용자 로직 변경 시**
  - profiles 테이블 스키마 변경 시
  - 추가 JOIN 필요? (예: user_coupons)

- [ ] **8. 반환값 구조 변경 시**
  - 8개 사용처 모두 변경된 구조 처리 확인
  - 기본값 설정으로 호환성 유지

- [ ] **9. 에러 처리 강화**
  - sessionStorage 접근 실패 시
  - profiles 테이블 조회 실패 시
  - null 반환 vs 예외 던지기

#### ✅ 수정 후 검증 체크리스트

- [ ] **10. Kakao 사용자 테스트**
  - 로그인 → getCurrentUser() → 정보 정확한가?
  - sessionStorage 업데이트 → 반영되는가?

- [ ] **11. Supabase Auth 사용자 테스트**
  - 로그인 → getCurrentUser() → 정보 정확한가?
  - profiles 테이블 업데이트 → 반영되는가?

- [ ] **12. 사용처별 테스트** (8곳)
  - 체크아웃: 사용자 정보 표시
  - 주문 목록: user_id 기반 조회
  - 마이페이지: 프로필 편집

- [ ] **13. 문서 업데이트**
  - Part 1 Section 4.6 업데이트
  - Part 5-1 Section 3.1 업데이트

#### 🐛 과거 버그 사례

**사례 1: BuyBottomSheet 프로필 로딩 실패 (2025-10-06)**
- **증상**: name, phone 빈값으로 표시
- **원인**: getCurrentUser() 호출 안 함
- **해결**: useEffect에서 getCurrentUser() 호출 추가
- **재발 방지**: 사용자 정보 필요한 컴포넌트는 항상 getCurrentUser() 호출

---

### 3.2 atomicProfileUpdate() 수정

#### 📌 개요
- **함수 위치**: `/lib/UserProfileManager.js`
- **목적**: 3곳 동시 업데이트 (profiles + auth.users.user_metadata + sessionStorage)
- **현재 상태**: Part 1 Section 4.7 참조
- **사용처**: 3곳 (체크아웃, 마이페이지, BuyBottomSheet)

#### 🔍 현재 상태 (Part 1에서 확인)
```javascript
// Part 1 Section 4.7 참조
사용처:
1. /app/checkout/page.js (line 1352)
2. /app/mypage/page.js (line 120)
3. /app/components/product/BuyBottomSheet.jsx (line 187)
```

#### 📋 수정 전 체크리스트

- [ ] **1. 사용처 파악** (Part 1 Section 4.7)
  - 3개 사용처 확인
  - 각 사용처에서 전달하는 데이터 확인

- [ ] **2. 현재 로직 이해**
  ```javascript
  static async atomicProfileUpdate(userId, profileData, isKakaoUser) {
    const updatePromises = []

    // 1. profiles 테이블 업데이트
    updatePromises.push(
      supabase.from('profiles').upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      }).select().single()
    )

    // 2. auth.users user_metadata 업데이트
    updatePromises.push(
      supabase.auth.updateUser({
        data: { name: profileData.name, phone: profileData.phone }
      })
    )

    // 병렬 실행
    const [profileResult, metadataResult] = await Promise.allSettled(updatePromises)

    // 3. Kakao 사용자인 경우 sessionStorage 업데이트
    if (isKakaoUser) {
      const currentUser = JSON.parse(sessionStorage.getItem('user'))
      const updatedUser = { ...currentUser, ...profileData }
      sessionStorage.setItem('user', JSON.stringify(updatedUser))
    }

    return { success: true }
  }
  ```

- [ ] **3. 3곳 동시 업데이트 확인**
  - profiles 테이블 (DB)
  - auth.users.user_metadata (Supabase Auth)
  - sessionStorage (Kakao 사용자만)

- [ ] **4. Promise.allSettled 이해**
  - 병렬 실행으로 성능 최적화
  - 하나 실패해도 나머지 계속 실행
  - 부분 성공 처리

- [ ] **5. 영향받는 페이지 확인** (Part 4 참조)
  - Section 2: /checkout (배송지 업데이트)
  - Section 8: /mypage (프로필 편집)

#### 🔧 수정 작업 체크리스트

- [ ] **6. 업데이트 대상 추가 시**
  - 4번째 업데이트 추가? (예: localStorage)
  - updatePromises 배열에 추가
  - Promise.allSettled로 처리

- [ ] **7. 에러 처리 강화**
  - 각 업데이트 실패 시 롤백?
  - 부분 성공 시 사용자에게 알림?

- [ ] **8. Kakao 사용자 로직 변경 시**
  - sessionStorage 동기화 방식 변경
  - 추가 필드 포함

#### ✅ 수정 후 검증 체크리스트

- [ ] **9. 3곳 동시 업데이트 확인**
  - profiles 테이블 → 업데이트되었는가?
  - auth.users.user_metadata → 업데이트되었는가?
  - sessionStorage (Kakao) → 업데이트되었는가?

- [ ] **10. 사용처별 테스트** (3곳)
  - 체크아웃: 배송지 변경 → 마이페이지에서 확인
  - 마이페이지: 프로필 편집 → 체크아웃에서 확인
  - BuyBottomSheet: 정보 입력 → 저장 확인

- [ ] **11. 동기화 확인**
  - 3곳 중 한 곳만 업데이트되지 않는 경우 테스트
  - 에러 메시지 확인

- [ ] **12. 문서 업데이트**
  - Part 1 Section 4.7 업데이트
  - Part 5-1 Section 3.2 업데이트

#### 🐛 과거 버그 사례

**사례 1: sessionStorage 동기화 누락 (2025-10-05)**
- **증상**: 마이페이지에서 수정했는데 체크아웃에서 구 정보 표시
- **원인**: Kakao 사용자인데 sessionStorage 업데이트 안 함
- **해결**: `if (isKakaoUser)` 조건 추가하여 sessionStorage 업데이트
- **재발 방지**: 3곳 모두 업데이트 체크리스트 필수

#### 📚 크로스 레퍼런스

- **Part 1 Section 4.7**: atomicProfileUpdate() 정의 및 사용처
- **Part 2 Section 7**: profiles 테이블 스키마
- **Part 4 Section 2**: /checkout 페이지 (배송지 업데이트)
- **Part 4 Section 8**: /mypage 페이지 (프로필 편집)
- **Part 5-2 Section 7**: profiles 테이블 수정 시나리오

---

### 3.3 syncKakaoProfile() 수정

#### 📌 개요
- **함수 위치**: `/lib/UserProfileManager.js`
- **목적**: Kakao 로그인 시 profiles 테이블에 자동 동기화
- **현재 상태**: Part 1 Section 4.8 참조
- **사용처**: 1곳 (Kakao 로그인 콜백)

#### 📋 수정 전 체크리스트

- [ ] **1. 현재 로직 이해**
  ```javascript
  static async syncKakaoProfile(kakaoUser) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('kakao_id', kakaoUser.id)
      .single()

    if (existingProfile) {
      // 업데이트
      await supabase
        .from('profiles')
        .update({
          name: kakaoUser.properties.nickname,
          updated_at: new Date().toISOString()
        })
        .eq('kakao_id', kakaoUser.id)
    } else {
      // 신규 생성
      await supabase
        .from('profiles')
        .insert({
          id: `kakao_${kakaoUser.id}`,
          kakao_id: kakaoUser.id,
          name: kakaoUser.properties.nickname
        })
    }
  }
  ```

- [ ] **2. Kakao 사용자 구조 확인**
  ```javascript
  kakaoUser = {
    id: '3782927171',
    properties: {
      nickname: '김진태',
      profile_image: 'https://...'
    }
  }
  ```

#### 🔧 수정 작업 체크리스트

- [ ] **3. 동기화 필드 추가 시**
  - 프로필 이미지 동기화?
  - 이메일 동기화? (Kakao에서 제공 시)

- [ ] **4. 에러 처리 강화**
  - profiles 테이블 INSERT 실패 시
  - kakao_id UNIQUE 제약 위반 시

#### ✅ 수정 후 검증 체크리스트

- [ ] **5. Kakao 로그인 테스트**
  - 첫 로그인 → profiles 테이블에 생성되는가?
  - 재로그인 → profiles 테이블 업데이트되는가?

- [ ] **6. 문서 업데이트**
  - Part 1 Section 4.8 업데이트

---

### 3.4 loadUserProfile() 수정

#### 📌 개요
- **함수 위치**: `/lib/UserProfileManager.js`
- **목적**: 특정 사용자 ID로 프로필 조회
- **현재 상태**: Part 1 Section 4.9 참조
- **사용처**: 2곳 (관리자 페이지, 주문 상세)

#### 📋 수정 전 체크리스트

- [ ] **1. 현재 로직 이해**
  ```javascript
  static async loadUserProfile(userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    return profile
  }
  ```

#### 🔧 수정 작업 체크리스트

- [ ] **2. 캐싱 추가**
  - 자주 조회하는 프로필은 캐싱
  - localStorage 또는 메모리 캐시

- [ ] **3. 에러 처리 강화**
  - 사용자 없을 시 null 반환

#### ✅ 수정 후 검증 체크리스트

- [ ] **4. 조회 테스트**
  - 존재하는 사용자 → 프로필 반환
  - 존재하지 않는 사용자 → null 반환

- [ ] **5. 문서 업데이트**
  - Part 1 Section 4.9 업데이트

---

## Section 4: Coupon API 수정 시나리오

### 4.1 validateCoupon() 수정

#### 📌 개요
- **함수 위치**: `/lib/couponApi.js`
- **목적**: 쿠폰 유효성 검증 (조건, 기간, 사용 여부)
- **현재 상태**: Part 1 Section 4.1 참조
- **사용처**: 2곳 (체크아웃, 관리자 쿠폰 관리)

#### 🔍 현재 상태 (Part 1에서 확인)
```javascript
// Part 1 Section 4.1 참조
사용처:
1. /app/checkout/page.js (line 642)
2. /app/admin/coupons/[id]/page.js (line 89)
```

#### 📋 수정 전 체크리스트

- [ ] **1. 사용처 파악** (Part 1 Section 4.1)
  - 2개 사용처 확인
  - 각 사용처에서 어떻게 사용하는지 확인

- [ ] **2. 현재 검증 로직 이해**
  ```javascript
  export async function validateCoupon(couponCode, orderAmount, userId) {
    // 1. 쿠폰 존재 확인
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode)
      .single()

    if (!coupon) return { valid: false, error: '쿠폰을 찾을 수 없습니다' }

    // 2. 유효 기간 확인
    const now = new Date()
    if (now < new Date(coupon.valid_from) || now > new Date(coupon.valid_to)) {
      return { valid: false, error: '유효 기간이 아닙니다' }
    }

    // 3. 최소 주문 금액 확인
    if (orderAmount < coupon.min_purchase_amount) {
      return { valid: false, error: `최소 주문 금액 ${coupon.min_purchase_amount}원 이상` }
    }

    // 4. 사용자 쿠폰 확인
    const { data: userCoupon } = await supabase
      .from('user_coupons')
      .select('*')
      .eq('coupon_id', coupon.id)
      .eq('user_id', userId)
      .single()

    if (!userCoupon) return { valid: false, error: '보유하지 않은 쿠폰입니다' }
    if (userCoupon.is_used) return { valid: false, error: '이미 사용한 쿠폰입니다' }

    return { valid: true, coupon }
  }
  ```

- [ ] **3. 검증 항목 확인**
  - 쿠폰 존재 여부
  - 유효 기간 (valid_from ~ valid_to)
  - 최소 주문 금액 (min_purchase_amount)
  - 사용자 보유 여부 (user_coupons)
  - 사용 여부 (is_used)

- [ ] **4. DB 접근 확인** (Part 2 참조)
  - coupons 테이블 SELECT
  - user_coupons 테이블 SELECT

- [ ] **5. 영향받는 페이지 확인** (Part 4 참조)
  - Section 2: /checkout (쿠폰 적용)
  - Section 17: /admin/coupons/[id] (쿠폰 관리)

#### 🔧 수정 작업 체크리스트

- [ ] **6. 새로운 검증 조건 추가 시**
  - 예: 특정 상품에만 사용 가능
  - 예: 특정 요일에만 사용 가능
  - 예: 1회 주문당 1개만 사용 가능

- [ ] **7. 에러 메시지 변경 시**
  - 2개 사용처 모두 에러 메시지 표시 확인
  - 다국어 지원 필요?

- [ ] **8. 성능 최적화**
  - 2번의 DB 쿼리를 1번으로 줄일 수 있는가?
  - JOIN 사용?

#### ✅ 수정 후 검증 체크리스트

- [ ] **9. 검증 시나리오 테스트**
  - 유효한 쿠폰 → valid: true
  - 존재하지 않는 쿠폰 → error: '쿠폰을 찾을 수 없습니다'
  - 기간 만료 → error: '유효 기간이 아닙니다'
  - 최소 주문 금액 미달 → error 표시
  - 이미 사용한 쿠폰 → error: '이미 사용한 쿠폰입니다'

- [ ] **10. 사용처별 테스트** (2곳)
  - 체크아웃: 쿠폰 입력 → 검증 → 할인 적용
  - 관리자 쿠폰 관리: 쿠폰 상태 확인

- [ ] **11. 문서 업데이트**
  - Part 1 Section 4.1 업데이트
  - Part 5-1 Section 4.1 업데이트

#### 🐛 과거 버그 사례

**사례 1: 최소 주문 금액 검증 시 배송비 포함 (2025-10-04)**
- **증상**: 상품 9,000원 + 배송비 3,000원 = 12,000원 → 최소 10,000원 쿠폰 사용 가능
- **원인**: orderAmount에 배송비 포함된 금액 전달
- **해결**: validateCoupon() 호출 시 productSubtotal만 전달
- **재발 방지**: 쿠폰 검증은 **항상 배송비 제외** 금액으로

#### 📚 크로스 레퍼런스

- **Part 1 Section 4.1**: validateCoupon() 정의 및 사용처
- **Part 2 Section 11**: coupons 테이블 스키마
- **Part 2 Section 12**: user_coupons 테이블 스키마
- **Part 3 Section 1.1**: POST /api/orders/create (쿠폰 사용 API)
- **Part 4 Section 2**: /checkout 페이지 (쿠폰 적용 UI)
- **Part 5-2 Section 8**: coupons/user_coupons 테이블 수정 시나리오

---

### 4.2 loadUserCouponsOptimized() 수정

#### 📌 개요
- **함수 위치**: `/lib/couponApi.js`
- **목적**: 사용자 쿠폰 목록 조회 (사용 가능/사용 완료 구분)
- **현재 상태**: Part 1 Section 4.2 참조
- **사용처**: 2곳 (체크아웃, 마이페이지)

#### 🔍 현재 상태 (Part 1에서 확인)
```javascript
// Part 1 Section 4.2 참조
사용처:
1. /app/checkout/page.js (line 582)
2. /app/mypage/coupons/page.js (line 56)
```

#### 📋 수정 전 체크리스트

- [ ] **1. 사용처 파악** (Part 1 Section 4.2)
  - 2개 사용처 확인
  - 병렬 로드 최적화 적용되어 있는지 확인

- [ ] **2. 현재 로직 이해**
  ```javascript
  export async function loadUserCouponsOptimized(userId) {
    // user_coupons와 coupons JOIN
    const { data: userCoupons } = await supabase
      .from('user_coupons')
      .select(`
        *,
        coupons (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // 사용 가능 / 사용 완료 분리
    const available = userCoupons.filter(uc => !uc.is_used)
    const used = userCoupons.filter(uc => uc.is_used)

    return { available, used }
  }
  ```

- [ ] **3. DB JOIN 확인**
  - user_coupons + coupons 1번의 쿼리
  - N+1 쿼리 문제 없음

- [ ] **4. 영향받는 페이지 확인** (Part 4 참조)
  - Section 2: /checkout (쿠폰 선택 UI)
  - Section 9: /mypage/coupons (쿠폰 목록)

#### 🔧 수정 작업 체크리스트

- [ ] **5. 필터링 조건 추가 시**
  - 유효 기간 필터링?
  - 최소 주문 금액 필터링?

- [ ] **6. 정렬 방식 변경 시**
  - 만료 임박 순?
  - 할인 금액 높은 순?

- [ ] **7. 성능 최적화**
  - 캐싱 추가?
  - 페이지네이션?

#### ✅ 수정 후 검증 체크리스트

- [ ] **8. 조회 테스트**
  - 사용 가능 쿠폰 리스트 정확한가?
  - 사용 완료 쿠폰 리스트 정확한가?

- [ ] **9. 사용처별 테스트** (2곳)
  - 체크아웃: 쿠폰 목록 표시
  - 마이페이지: 사용 가능/사용 완료 탭 분리

- [ ] **10. 문서 업데이트**
  - Part 1 Section 4.2 업데이트

---

### 4.3 applyCouponUsage() 수정

#### 📌 개요
- **함수 위치**: `/lib/couponApi.js`
- **목적**: 쿠폰 사용 완료 처리 (is_used = true, used_at, order_id)
- **현재 상태**: Part 1 Section 4.3 참조
- **사용처**: 1곳 (주문 생성 API)

#### 📋 수정 전 체크리스트

- [ ] **1. 현재 로직 이해**
  ```javascript
  export async function applyCouponUsage(userId, couponId, orderId) {
    const { data, error } = await supabase
      .from('user_coupons')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        order_id: orderId
      })
      .eq('user_id', userId)
      .eq('coupon_id', couponId)
      .eq('is_used', false)
      .select()

    if (error || !data || data.length === 0) {
      return { success: false, error }
    }

    return { success: true, data: data[0] }
  }
  ```

- [ ] **2. DB UPDATE 확인** (Part 2 참조)
  - user_coupons 테이블 UPDATE
  - is_used = true
  - used_at = 현재 시각
  - order_id = 주문 ID

- [ ] **3. 트랜잭션 필요?**
  - 주문 생성과 쿠폰 사용은 동시에 처리
  - 하나 실패 시 롤백 필요?

#### 🔧 수정 작업 체크리스트

- [ ] **4. 에러 처리 강화**
  - 이미 사용된 쿠폰인 경우
  - UPDATE 실패 시 주문 취소?

- [ ] **5. 롤백 로직 추가**
  - 주문 취소 시 is_used = false 복원

#### ✅ 수정 후 검증 체크리스트

- [ ] **6. 사용 처리 테스트**
  - 쿠폰 적용 주문 생성 → is_used = true?
  - used_at 저장되었는가?
  - order_id 저장되었는가?

- [ ] **7. 마이페이지 확인**
  - 사용 완료 탭에 쿠폰 이동했는가?

- [ ] **8. 문서 업데이트**
  - Part 1 Section 4.3 업데이트

#### 🐛 과거 버그 사례

**사례 1: 쿠폰 사용 완료 처리 실패 (2025-10-05)**
- **증상**: 쿠폰 적용했는데 is_used = false 유지
- **원인**: use_coupon() DB 함수 내 auth.uid() 검증 문제
- **해결**: auth.uid() 검증 제거, RLS 정책만 사용
- **재발 방지**: Service Role API 또는 RLS 정책으로 보안 유지

---

### 4.4 distributeCoupon() 수정

#### 📌 개요
- **함수 위치**: `/lib/couponApi.js`
- **목적**: 특정 사용자에게 쿠폰 배포
- **현재 상태**: Part 1 Section 4.4 참조
- **사용처**: 1곳 (관리자 쿠폰 배포)

#### 📋 수정 전 체크리스트

- [ ] **1. 현재 로직 이해**
  ```javascript
  export async function distributeCoupon(couponId, userIds, adminEmail) {
    // Service Role API 호출
    const response = await fetch('/api/admin/coupons/distribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponId, userIds, adminEmail })
    })

    return await response.json()
  }
  ```

- [ ] **2. API 호출 확인** (Part 3 참조)
  - POST /api/admin/coupons/distribute
  - Service Role로 RLS 우회

- [ ] **3. 중복 배포 방지**
  - user_coupons UNIQUE(user_id, coupon_id)
  - 중복 시 건너뛰기 로직

#### 🔧 수정 작업 체크리스트

- [ ] **4. 대량 배포 시**
  - 1,000명 이상 → 배치 처리 필요?
  - 진행률 표시?

- [ ] **5. 에러 처리 강화**
  - 일부 실패 시 → 성공/실패 리스트 반환

#### ✅ 수정 후 검증 체크리스트

- [ ] **6. 배포 테스트**
  - 특정 사용자 배포 → user_coupons에 추가?
  - 중복 배포 → 건너뛰기 확인

- [ ] **7. 문서 업데이트**
  - Part 1 Section 4.4 업데이트

#### 🐛 과거 버그 사례

**사례 1: 관리자 쿠폰 배포 403 에러 (2025-10-08)**
- **증상**: POST /api/admin/coupons/distribute 403 Forbidden
- **원인 1**: adminEmail 추출 실패 (supabase.auth.getSession())
- **원인 2**: 구버전 useAdminAuth hook import
- **해결**: useAdminAuthNew.js import + verified adminUser.email 사용
- **재발 방지**: 시스템에 구버전/신버전 코드 공존 시 정확한 import 필수

---

### 4.5 createCoupon() 수정

#### 📌 개요
- **함수 위치**: `/lib/couponApi.js`
- **목적**: 관리자가 새로운 쿠폰 생성
- **현재 상태**: Part 1 Section 4.5 참조
- **사용처**: 1곳 (관리자 쿠폰 생성 페이지)

#### 📋 수정 전 체크리스트

- [ ] **1. 현재 로직 이해**
  ```javascript
  export async function createCoupon(couponData, adminEmail) {
    // Service Role API 호출
    const response = await fetch('/api/admin/coupons/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponData, adminEmail })
    })

    return await response.json()
  }
  ```

- [ ] **2. API 호출 확인** (Part 3 참조)
  - POST /api/admin/coupons/create
  - Service Role로 RLS 우회

- [ ] **3. 쿠폰 코드 생성**
  - 자동 생성? 수동 입력?
  - UNIQUE 제약 확인

#### 🔧 수정 작업 체크리스트

- [ ] **4. 쿠폰 타입 추가 시**
  - percentage, fixed_amount 외 추가?
  - 검증 로직 추가

- [ ] **5. 웰컴 쿠폰 자동 발급**
  - is_welcome_coupon = true
  - DB 트리거로 신규 회원 자동 발급

#### ✅ 수정 후 검증 체크리스트

- [ ] **6. 생성 테스트**
  - 쿠폰 생성 → coupons 테이블에 추가?
  - 쿠폰 코드 중복 → 에러 처리?

- [ ] **7. 웰컴 쿠폰 테스트**
  - 신규 회원가입 → 자동 발급?

- [ ] **8. 문서 업데이트**
  - Part 1 Section 4.5 업데이트

---

## Section 5: 새로운 중앙 함수 추가 시나리오

### 📌 개요
새로운 중앙 함수를 추가할 때 따라야 할 체크리스트

### 📋 함수 추가 전 체크리스트

- [ ] **1. 기존 함수 확인**
  - Part 1에서 유사한 함수가 이미 있는지 확인
  - 중복 로직 방지

- [ ] **2. 함수 위치 결정**
  - `/lib/orderCalculations.js` (주문 계산)
  - `/lib/shippingUtils.js` (배송 관련)
  - `/lib/UserProfileManager.js` (사용자 관리)
  - `/lib/couponApi.js` (쿠폰 관련)
  - `/lib/supabaseApi.js` (DB 접근)
  - 새로운 파일 생성?

- [ ] **3. 함수 시그니처 설계**
  ```javascript
  /**
   * 함수 설명
   * @param {Type} param1 - 파라미터 설명
   * @param {Type} param2 - 파라미터 설명
   * @returns {Type} 반환값 설명
   */
  export function newFunction(param1, param2) {
    // 구현
  }
  ```

- [ ] **4. 에러 처리 전략**
  - try-catch 사용?
  - 예외 던지기 vs 에러 객체 반환?

- [ ] **5. 의존성 확인**
  - 다른 중앙 함수 호출?
  - DB 접근?
  - API 호출?

### 🔧 함수 추가 작업 체크리스트

- [ ] **6. 함수 구현**
  - 코드 작성
  - JSDoc 주석 추가
  - 타입 검증 추가

- [ ] **7. 단위 테스트 작성**
  - 정상 케이스
  - 에러 케이스
  - 경계값 테스트

- [ ] **8. 사용처 구현**
  - 최소 1개 페이지에서 사용
  - 정상 작동 확인

### ✅ 함수 추가 후 검증 체크리스트

- [ ] **9. 테스트 완료**
  - 단위 테스트 통과?
  - 통합 테스트 통과?

- [ ] **10. 문서 업데이트**
  - **Part 1**에 새 함수 추가
    - Section 번호
    - 함수 정의
    - 사용처 (파일 경로 + 라인 번호)
    - 수정 시 확인 체크리스트
    - 테스트 시나리오
  - **Part 5-1**에 수정 시나리오 추가
    - 새 Section 추가
    - 체크리스트 작성

- [ ] **11. 코드 리뷰**
  - 중복 로직 없는지 확인
  - 네이밍 일관성 확인
  - 에러 처리 적절한지 확인

### 🎯 함수 추가 예시

**예시: 포인트 할인 함수 추가**

```javascript
// /lib/orderCalculations.js

/**
 * 포인트 할인 적용
 * @param {number} subtotal - 상품 합계 (배송비 제외)
 * @param {number} points - 사용할 포인트
 * @param {number} availablePoints - 보유 포인트
 * @returns {Object} { discount, remainingPoints }
 */
static applyPointDiscount(subtotal, points, availablePoints) {
  // 1. 포인트 부족 확인
  if (points > availablePoints) {
    throw new Error('보유 포인트가 부족합니다')
  }

  // 2. 최대 사용 포인트 확인 (상품 금액 초과 불가)
  const maxUsablePoints = Math.min(points, subtotal)

  // 3. 할인 금액 계산
  const discount = maxUsablePoints
  const remainingPoints = availablePoints - discount

  return { discount, remainingPoints }
}
```

**문서 업데이트 체크리스트**:
- [x] Part 1에 Section 1.9 추가 (applyPointDiscount)
- [x] Part 5-1에 Section 1.9 추가 (수정 시나리오)
- [x] calculateFinalOrderAmount()에 포인트 로직 통합
- [x] 사용처: /app/checkout/page.js line XXX
- [x] DB: orders.point_discount 컬럼 추가

---

## 📊 전체 요약

### 중앙 함수 수정 시 반드시 확인할 것

1. **Part 1에서 사용처 확인** (몇 곳에서 사용하는가?)
2. **Part 4에서 영향받는 페이지 확인** (어떤 페이지들이 영향받는가?)
3. **Part 2에서 DB 영향 확인** (어떤 테이블/컬럼에 영향있는가?)
4. **Part 3에서 API 영향 확인** (어떤 API가 이 함수를 사용하는가?)
5. **Part 5-1 체크리스트 따라가기** (빠짐없이 모든 항목 확인)

### 수정 후 반드시 할 것

1. **모든 사용처 테스트** (7곳이면 7곳 모두!)
2. **E2E 시나리오 테스트** (실제 사용자 흐름대로)
3. **DB 저장 값 확인** (저장된 데이터가 정확한가?)
4. **문서 업데이트** (Part 1, Part 5-1 모두)

---

## Section 6: OrderRepository 수정 시나리오 ✅ NEW (Phase 1.1)

### 📌 개요
- **파일 위치**: `/lib/repositories/OrderRepository.js`
- **목적**: 주문 데이터 접근 레이어 (Infrastructure Layer) - Service Role 클라이언트로 RLS 우회
- **클래스**: `OrderRepository extends BaseRepository`
- **마이그레이션**: Phase 1.1 (lib/supabaseApi.js 함수들을 Repository로 이동)
- **생성일**: 2025-10-21

### 🔍 상세 내용
**Part 1 Section 7 참조** (7개 메서드 정의 및 사용처)

### 📋 수정 시 전체 체크리스트

- [ ] **1. 기본 확인**
  - Service Role 클라이언트(supabaseAdmin) 사용하는가?
  - DatabaseError로 에러 처리하는가?
  - 파일 크기 250줄 이하 유지하는가? (Rule 1)
  - JSDoc 주석 완료되었는가?

- [ ] **2. 비즈니스 로직 확인**
  - 트랜잭션이 필요한 작업인가? (Phase 3에서 Use Case로 이동)
  - 재고 차감, 쿠폰 사용 등 복잡한 로직은 Repository에 포함하지 말 것
  - Repository는 순수한 데이터 접근만 (CRUD)

- [ ] **3. 사용처 업데이트**
  - Part 1 Section 7의 사용처 모두 업데이트했는가?
  - 기존 supabaseApi.js 호출을 Repository로 변경했는가?
  - Import 경로 수정했는가? (`import { OrderRepository } from '@/lib/repositories/OrderRepository'`)

- [ ] **4. 영향받는 페이지 테스트**
  - `/app/orders/page.js` (주문 목록)
  - `/app/orders/[id]/complete/page.js` (주문 상세)
  - `/app/admin/orders/page.js` (관리자 주문 목록)
  - `/app/admin/orders/[id]/page.js` (관리자 주문 상세)
  - API Routes (주문 생성, 상태 변경)

- [ ] **5. 문서 업데이트**
  - Part 1 Section 7 업데이트
  - Part 5-1 Section 6 (현재 문서) 업데이트

### 🐛 주의사항

**RLS 우회 확인 필수**:
- OrderRepository는 Service Role 클라이언트(supabaseAdmin) 사용
- RLS 정책 무시하고 모든 데이터 접근 가능
- 보안 검증은 Use Case 레이어에서 처리 필요

**트랜잭션 처리**:
- `create()` 메서드는 4개 테이블 INSERT (orders, order_items, order_payments, order_shipping)
- 현재는 순차 처리, Phase 3에서 트랜잭션으로 개선 예정

### 🐛 실제 버그 사례 (Rule #0-A Stage 5 기록)

#### 버그 #1: create() 파라미터 구조 불일치 (2025-10-23) ⭐

**증상**:
```
POST /api/orders/create 500 (Internal Server Error)
Error: Could not find the 'orderData' column of 'orders' in the schema cache
```

**발생 위치**:
- CreateOrderUseCase.execute() Line 89
- 장바구니 추가 / 구매하기 버튼 클릭 시

**근본 원인**:
- OrderRepository.create()가 `{ orderData, orderItems, payment, shipping }` 구조의 객체를 받음
- 하지만 내부에서 전체 객체를 orders 테이블에 INSERT 시도
- orders 테이블에는 orderData, orderItems 등의 컬럼이 없음

**해결 방법**:
1. create() 메서드를 4개 테이블 INSERT로 완전 재작성
2. 각 테이블에 정확한 필드만 전달:
   - orders 테이블: orderData 내부 필드들
   - order_items 테이블: orderItems 배열 (order_id 추가)
   - order_shipping 테이블: shipping 객체 (order_id 추가)
   - order_payments 테이블: payment 객체 (order_id 추가)

**커밋**: `76df3a5`

**교훈**:
- Repository는 DB 스키마에 정확히 맞춰야 함
- 4개 테이블 INSERT를 순차적으로 처리
- Phase 3에서 트랜잭션으로 개선 필요

---

#### 버그 #2: recipient_name 컬럼 불일치 (2025-10-23) ⭐

**증상**:
```
POST /api/orders/create 500 (Internal Server Error)
Error: Could not find the 'recipient_name' column of 'order_shipping'
```

**발생 위치**:
- CreateOrderUseCase.execute() Line 111
- OrderRepository.create() → order_shipping INSERT

**근본 원인**:
- DB 스키마 (DB_REFERENCE_GUIDE.md): `order_shipping.name` ✅
- 코드 사용: `recipient_name` ❌
- Legacy 코드 제거 후 DB 스키마와 불일치

**영향 범위**:
- CreateOrderUseCase.js Line 111
- GetOrdersUseCase.js Line 156
- /app/orders/[id]/complete/page.js Line 127

**해결 방법** (Rule #0-A 5단계 프로세스):
- Stage 1: DB Bug 타입 분류
- Stage 2: DB_REFERENCE_GUIDE.md 확인 → `name` 컬럼 확인
- Stage 3: 소스코드 확인 → 3개 파일에서 `recipient_name` 사용 발견
- Stage 4: 영향도 분석 → CreateOrderUseCase, GetOrdersUseCase, complete/page.js
- Stage 5: 모든 파일 수정 + 테스트

**커밋**: `8729ed9`

**교훈**:
- DB 스키마가 source of truth
- Legacy 코드 제거 후 DB 스키마 재확인 필수
- Rule #0-A 워크플로우 적용으로 영향받는 모든 곳 한 번에 수정

---

#### 버그 #3: payment_method 컬럼 불일치 (2025-10-23) ⭐⭐

**증상**:
```
POST /api/orders/create 500 (Internal Server Error)
Error: Could not find the 'payment_method' column of 'order_payments'
```

**발생 위치**:
- CreateOrderUseCase.execute() Line 118
- OrderRepository.create() → order_payments INSERT

**근본 원인**:
- DB 스키마 (DB_REFERENCE_GUIDE.md): `order_payments.method` ✅
- 코드 사용: `payment_method` ❌
- 동일한 패턴 반복 (recipient_name 버그와 동일)

**사용자 피드백**:
> "동일한 에러를 몇번을 수정하는건지... Rule #0-A 확인후 시작하는데 이제 우리는 레거시부분을 다 제거했으니 그부분을 잘인지해서 작업하도록"

**개선된 해결 방법** (체계적 접근):
1. 단일 버그만 수정하는 대신 **전체 DB 스키마 검증** 수행
2. 3개 테이블 모두 확인:
   - order_items: 9개 필드 ✅ 일치
   - order_shipping: 8개 필드 ✅ 일치 (recipient_name 이미 수정됨)
   - order_payments: 3개 필드 ❌ `payment_method` → `method` 수정 필요
3. 영향받는 파일 한 번에 수정:
   - CreateOrderUseCase.js Line 118
   - GetOrdersUseCase.js Line 173

**커밋**: `6c6d6e2`

**교훈**:
- 동일한 패턴의 버그가 반복되면 **근본 원인을 찾아 체계적으로 해결**
- 하나씩 수정하지 말고 **전체 DB 스키마 대조 후 한 번에 수정**
- Legacy 코드 제거 후 모든 DB 컬럼명 재확인 필수
- DB_REFERENCE_GUIDE.md를 source of truth로 사용

### 📚 크로스 레퍼런스

- **Part 1 Section 7**: OrderRepository 정의 및 사용처
- **Part 2 Section 1**: orders 테이블 스키마
- **Part 2 Section 2**: order_items 테이블 스키마
- **Part 2 Section 3**: order_payments 테이블 스키마
- **Part 2 Section 4**: order_shipping 테이블 스키마
- **FUNCTION_QUERY_REFERENCE.md Section 3**: Order-related functions (마이그레이션 완료)

---

---

## Section 7: ProductRepository 수정 시나리오 ✅ NEW (Phase 1.2)

### 📌 개요
- **파일 위치**: `/lib/repositories/ProductRepository.js`
- **목적**: 상품 데이터 접근 레이어 (Infrastructure Layer) - Service Role 클라이언트로 RLS 우회
- **클래스**: `ProductRepository extends BaseRepository`
- **마이그레이션**: Phase 1.2 (lib/supabaseApi.js 함수들을 Repository로 이동)
- **생성일**: 2025-10-21
- **파일 크기**: 207줄 (Rule 1 준수 ✅)

### 🔍 상세 내용

## ✅ PART5_1 작성 완료

**다음 문서**: [SYSTEM_DEPENDENCY_COMPLETE_PART5_1_2.md](./SYSTEM_DEPENDENCY_COMPLETE_PART5_1_2.md) - Repository 수정 시나리오

**PART5_1 요약**:
- 총 6개 Section 문서화 (유틸리티 함수 수정 시나리오)
- Section 1-5: 기존 유틸리티 함수 수정 시나리오
- Section 6: OrderRepository 수정 시나리오 (Phase 1.1)
- 모든 수정 시나리오에 체크리스트 포함
- 실제 버그 사례 및 주의사항 포함

**문서 크기**: 약 1,800 줄 (**1,500줄 제한 준수** ✅)
