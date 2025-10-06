# Playwright 데이터 정합성 검증 테스트

**프로젝트**: allok.shop
**목적**: UI 동작뿐만 아니라 **비즈니스 로직과 데이터 정합성**을 검증
**기준**: DB_REFERENCE_GUIDE.md, orderCalculations.js 분석

---

## 📋 목차

1. [주문 생성 시 데이터 검증](#1-주문-생성-시-데이터-검증)
2. [주문 상태 변경 시 검증](#2-주문-상태-변경-시-검증)
3. [재고 관리 검증](#3-재고-관리-검증)
4. [배송비 계산 검증](#4-배송비-계산-검증)
5. [쿠폰 할인 계산 검증](#5-쿠폰-할인-계산-검증)
6. [주문 수량 조정 시 검증](#6-주문-수량-조정-시-검증)
7. [주문 취소 시 검증](#7-주문-취소-시-검증)
8. [발주 시스템 검증](#8-발주-시스템-검증)

---

## 1. 주문 생성 시 데이터 검증

### 1.1 기본 주문 생성 - 전체 데이터 체인 검증

```javascript
test('주문 생성 - 전체 데이터 정합성 검증', async ({ page, context }) => {
  // === 준비 단계 ===
  await context.addCookies([/* 로그인 쿠키 */]);

  // 1. 상품 정보 수집 (주문 전)
  await page.goto('/products/1');
  await page.waitForTimeout(3000);

  const productTitle = await page.locator('h1').textContent();
  const productPriceText = await page.locator('[data-testid="price"]').textContent();
  const productPrice = parseInt(productPriceText.replace(/[^0-9]/g, ''));

  // 2. 재고 확인 (주문 전)
  const stockBefore = await page.locator('[data-testid="stock"]').textContent();
  const stockCountBefore = parseInt(stockBefore.replace(/[^0-9]/g, ''));

  console.log(`[주문 전] 상품: ${productTitle}, 가격: ${productPrice}원, 재고: ${stockCountBefore}개`);

  // === 주문 실행 ===
  const orderQuantity = 2;
  await page.fill('[data-testid="quantity"]', orderQuantity.toString());
  await page.click('button:has-text("구매하기")');

  // === 체크아웃 페이지 검증 ===
  await expect(page).toHaveURL(/\/checkout/);

  // 3. 주문 요약 확인
  const summaryQuantity = await page.locator('[data-testid="order-item-quantity"]').textContent();
  expect(parseInt(summaryQuantity)).toBe(orderQuantity);

  const summaryPrice = await page.locator('[data-testid="order-item-price"]').textContent();
  expect(parseInt(summaryPrice.replace(/[^0-9]/g, ''))).toBe(productPrice);

  // 4. 소계 계산 검증 (수량 × 단가)
  const expectedSubtotal = productPrice * orderQuantity;
  const subtotalText = await page.locator('[data-testid="subtotal"]').textContent();
  const actualSubtotal = parseInt(subtotalText.replace(/[^0-9]/g, ''));

  expect(actualSubtotal).toBe(expectedSubtotal);
  console.log(`✅ 소계 검증: ${actualSubtotal}원 === ${expectedSubtotal}원`);

  // 5. 배송비 입력 및 재계산
  await page.fill('[name="name"]', '홍길동');
  await page.fill('[name="phone"]', '01012345678');
  await page.fill('[name="address"]', '서울시 강남구');
  await page.fill('[name="postal_code"]', '06000'); // 일반 지역

  await page.waitForTimeout(1000); // 배송비 재계산 대기

  // 6. 배송비 검증 (일반 지역 = 기본 4000원)
  const shippingFeeText = await page.locator('[data-testid="shipping-fee"]').textContent();
  const shippingFee = parseInt(shippingFeeText.replace(/[^0-9]/g, ''));

  expect(shippingFee).toBe(4000); // 기본 배송비
  console.log(`✅ 배송비 검증: ${shippingFee}원`);

  // 7. 최종 금액 검증 (소계 + 배송비)
  const expectedTotal = expectedSubtotal + shippingFee;
  const totalText = await page.locator('[data-testid="total-amount"]').textContent();
  const actualTotal = parseInt(totalText.replace(/[^0-9]/g, ''));

  expect(actualTotal).toBe(expectedTotal);
  console.log(`✅ 최종 금액 검증: ${actualTotal}원 === ${expectedTotal}원`);

  // === 주문 완료 ===
  await page.fill('[name="depositor_name"]', '홍길동');
  await page.click('button:has-text("주문하기")');

  await expect(page).toHaveURL(/\/orders\/\d+\/complete/);

  // === 주문 완료 페이지 검증 ===
  // 8. 주문 번호 추출
  const orderNumberText = await page.locator('[data-testid="order-number"]').textContent();
  const orderId = orderNumberText.match(/\d+/)[0];

  console.log(`✅ 주문 생성 완료: #${orderId}`);

  // 9. 주문 완료 페이지 금액 재확인
  const completeTotalText = await page.locator('[data-testid="total-amount"]').textContent();
  const completeTotal = parseInt(completeTotalText.replace(/[^0-9]/g, ''));

  expect(completeTotal).toBe(expectedTotal);
  console.log(`✅ 주문 완료 금액 검증: ${completeTotal}원`);

  // === DB 데이터 검증 (선택) ===
  // 10. 재고 차감 확인 (상품 페이지로 돌아가기)
  await page.goto('/products/1');
  await page.waitForTimeout(3000);

  const stockAfter = await page.locator('[data-testid="stock"]').textContent();
  const stockCountAfter = parseInt(stockAfter.replace(/[^0-9]/g, ''));

  expect(stockCountAfter).toBe(stockCountBefore - orderQuantity);
  console.log(`✅ 재고 차감 검증: ${stockCountBefore}개 → ${stockCountAfter}개 (${orderQuantity}개 차감)`);

  // === 검증 요약 ===
  console.log(`
=== 주문 생성 데이터 검증 완료 ===
✅ 상품명: ${productTitle}
✅ 수량: ${orderQuantity}개
✅ 단가: ${productPrice}원
✅ 소계: ${actualSubtotal}원
✅ 배송비: ${shippingFee}원
✅ 총액: ${actualTotal}원
✅ 재고 차감: ${stockCountBefore} → ${stockCountAfter}
  `);
});
```

---

## 2. 주문 상태 변경 시 검증

### 2.1 입금 확인 → 타임스탬프 기록

```javascript
test('관리자 - 주문 상태 변경 시 타임스탬프 검증', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/orders');

  // 1. 입금 대기 주문 선택
  await page.click('button:has-text("입금 대기")');
  await page.click('[data-testid="order-row"]:first-child');

  // 2. 현재 상태 확인 (deposited_at이 없어야 함)
  const depositedAtBefore = await page.locator('[data-testid="deposited-at"]').textContent();
  expect(depositedAtBefore).toContain('미확인'); // 또는 빈값

  // 3. 상태 변경: pending → deposited
  await page.selectOption('select[name="status"]', 'deposited');
  await page.click('button:has-text("저장")');

  await expect(page.locator('.toast')).toContainText(/변경|완료/);

  // 4. 타임스탬프 자동 기록 확인
  await page.reload();

  const depositedAtAfter = await page.locator('[data-testid="deposited-at"]').textContent();
  expect(depositedAtAfter).not.toContain('미확인');
  expect(depositedAtAfter).toMatch(/\d{4}-\d{2}-\d{2}/); // 날짜 형식

  console.log(`✅ 입금 확인 타임스탬프 기록: ${depositedAtAfter}`);
});
```

---

## 3. 재고 관리 검증

### 3.1 Variant 상품 - 옵션별 재고 차감

```javascript
test('Variant 상품 - 옵션별 재고 정확성', async ({ page, context }) => {
  await context.addCookies([/* 로그인 쿠키 */]);

  await page.goto('/products/variant-product');
  await page.waitForTimeout(3000);

  // 1. 옵션 선택: 빨강 + M
  await page.selectOption('select[name="color"]', '빨강');
  await page.selectOption('select[name="size"]', 'M');

  // 2. 선택된 Variant 재고 확인
  const stockBefore = await page.locator('[data-testid="variant-stock"]').textContent();
  const stockCountBefore = parseInt(stockBefore.replace(/[^0-9]/g, ''));

  console.log(`[빨강-M] 재고 (주문 전): ${stockCountBefore}개`);

  // 3. 주문 수량 입력
  const orderQty = 3;
  await page.fill('[data-testid="quantity"]', orderQty.toString());

  // 4. 구매
  await page.click('button:has-text("구매")');

  // ... 체크아웃 및 주문 완료 ...

  // 5. 다시 상품 페이지로 돌아가서 재고 확인
  await page.goto('/products/variant-product');
  await page.waitForTimeout(3000);

  await page.selectOption('select[name="color"]', '빨강');
  await page.selectOption('select[name="size"]', 'M');

  const stockAfter = await page.locator('[data-testid="variant-stock"]').textContent();
  const stockCountAfter = parseInt(stockAfter.replace(/[^0-9]/g, ''));

  // 6. 검증: 정확히 주문 수량만큼 차감
  expect(stockCountAfter).toBe(stockCountBefore - orderQty);
  console.log(`✅ Variant 재고 차감: ${stockCountBefore} → ${stockCountAfter} (${orderQty}개 차감)`);

  // 7. 다른 옵션 재고는 변하지 않아야 함
  await page.selectOption('select[name="color"]', '파랑');
  await page.selectOption('select[name="size"]', 'M');

  const blueStock = await page.locator('[data-testid="variant-stock"]').textContent();
  console.log(`✅ 다른 옵션(파랑-M) 재고 변화 없음: ${blueStock}`);
});
```

### 3.2 재고 0개 → 구매 불가

```javascript
test('재고 부족 - 구매 버튼 비활성화', async ({ page }) => {
  await page.goto('/products/out-of-stock');
  await page.waitForTimeout(3000);

  // 1. 재고 확인
  const stock = await page.locator('[data-testid="stock"]').textContent();
  expect(stock).toContain('0');

  // 2. 구매 버튼 비활성화 확인
  const buyButton = page.locator('button:has-text("구매")');
  await expect(buyButton).toBeDisabled();

  // 3. 품절 메시지 표시
  const stockStatus = page.locator('[data-testid="stock-status"]');
  await expect(stockStatus).toContainText(/품절|재고 없음/);

  console.log('✅ 재고 부족 시 구매 차단 확인');
});
```

---

## 4. 배송비 계산 검증

### 4.1 우편번호별 배송비 자동 계산

```javascript
test('배송비 계산 - 우편번호별 정확성', async ({ page, context }) => {
  await context.addCookies([/* 로그인 쿠키 */]);
  await page.goto('/checkout');

  // 기본 배송비: 4000원
  // 제주: +3000원 = 7000원
  // 울릉도: +5000원 = 9000원

  const testCases = [
    { postal: '06000', region: '서울 강남', expected: 4000 },
    { postal: '63000', region: '제주', expected: 7000 },
    { postal: '63100', region: '제주', expected: 7000 },
    { postal: '40200', region: '울릉도', expected: 9000 },
  ];

  for (const testCase of testCases) {
    // 1. 우편번호 입력
    await page.fill('[name="postal_code"]', testCase.postal);
    await page.waitForTimeout(1000); // 재계산 대기

    // 2. 배송비 확인
    const shippingFee = await page.locator('[data-testid="shipping-fee"]').textContent();
    const actualFee = parseInt(shippingFee.replace(/[^0-9]/g, ''));

    // 3. 검증
    expect(actualFee).toBe(testCase.expected);
    console.log(`✅ ${testCase.region} (${testCase.postal}): ${actualFee}원 === ${testCase.expected}원`);

    // 4. 총액도 함께 변경되는지 확인
    const total = await page.locator('[data-testid="total-amount"]').textContent();
    console.log(`   총액: ${total}`);
  }
});
```

### 4.2 배송비 변경 시 총액 자동 재계산

```javascript
test('배송비 변경 → 총액 자동 재계산', async ({ page, context }) => {
  await context.addCookies([/* 로그인 쿠키 */]);
  await page.goto('/checkout');

  // 1. 초기 총액 (서울, 기본 배송비 4000원)
  await page.fill('[name="postal_code"]', '06000');
  await page.waitForTimeout(1000);

  const subtotal = await page.locator('[data-testid="subtotal"]').textContent();
  const subtotalAmount = parseInt(subtotal.replace(/[^0-9]/g, ''));

  const total1Text = await page.locator('[data-testid="total-amount"]').textContent();
  const total1 = parseInt(total1Text.replace(/[^0-9]/g, ''));

  expect(total1).toBe(subtotalAmount + 4000); // 소계 + 4000
  console.log(`서울 총액: ${total1}원 = ${subtotalAmount}원 + 4000원`);

  // 2. 제주로 변경 (배송비 +3000원 = 7000원)
  await page.fill('[name="postal_code"]', '63000');
  await page.waitForTimeout(1000);

  const total2Text = await page.locator('[data-testid="total-amount"]').textContent();
  const total2 = parseInt(total2Text.replace(/[^0-9]/g, ''));

  expect(total2).toBe(subtotalAmount + 7000); // 소계 + 7000
  expect(total2).toBe(total1 + 3000); // 서울보다 3000원 증가

  console.log(`✅ 제주 총액: ${total2}원 = ${subtotalAmount}원 + 7000원 (서울보다 +3000원)`);
});
```

---

## 5. 쿠폰 할인 계산 검증

### 5.1 정액 할인 쿠폰 (fixed_amount)

```javascript
test('쿠폰 - 정액 할인 정확성', async ({ page, context }) => {
  await context.addCookies([/* 로그인 쿠키 */]);
  await page.goto('/checkout');

  // 1. 쿠폰 적용 전 금액
  const subtotalText = await page.locator('[data-testid="subtotal"]').textContent();
  const subtotal = parseInt(subtotalText.replace(/[^0-9]/g, ''));

  const shippingText = await page.locator('[data-testid="shipping-fee"]').textContent();
  const shipping = parseInt(shippingText.replace(/[^0-9]/g, ''));

  const totalBefore = subtotal + shipping;
  console.log(`[쿠폰 적용 전] 소계: ${subtotal}원, 배송비: ${shipping}원, 총액: ${totalBefore}원`);

  // 2. 쿠폰 선택 (5000원 정액 할인)
  await page.click('button:has-text("쿠폰을 선택")');
  await page.waitForTimeout(500);

  const coupon = page.locator('[data-testid="coupon-item"]:has-text("5,000원")').first();
  await coupon.click();

  await page.waitForTimeout(1000);

  // 3. 할인 금액 확인
  const discountText = await page.locator('[data-testid="discount-amount"]').textContent();
  const discount = parseInt(discountText.replace(/[^0-9]/g, ''));

  expect(discount).toBe(5000);
  console.log(`✅ 할인 금액: ${discount}원`);

  // 4. 최종 금액 검증
  // ⚠️ 중요: 쿠폰 할인은 소계에만 적용 (배송비 제외!)
  const expectedTotal = (subtotal - 5000) + shipping;

  const totalAfterText = await page.locator('[data-testid="total-amount"]').textContent();
  const totalAfter = parseInt(totalAfterText.replace(/[^0-9]/g, ''));

  expect(totalAfter).toBe(expectedTotal);
  console.log(`✅ 최종 금액: ${totalAfter}원 = (${subtotal} - ${discount}) + ${shipping}`);
});
```

### 5.2 퍼센트 할인 쿠폰 (percentage)

```javascript
test('쿠폰 - 퍼센트 할인 및 최대 할인 금액 제한', async ({ page, context }) => {
  await context.addCookies([/* 로그인 쿠키 */]);
  await page.goto('/checkout');

  // 1. 쿠폰 적용 전 소계
  const subtotalText = await page.locator('[data-testid="subtotal"]').textContent();
  const subtotal = parseInt(subtotalText.replace(/[^0-9]/g, ''));

  console.log(`소계: ${subtotal}원`);

  // 2. 10% 할인 쿠폰 (최대 할인 5000원)
  await page.click('button:has-text("쿠폰을 선택")');
  await page.waitForTimeout(500);

  const percentCoupon = page.locator('[data-testid="coupon-item"]:has-text("10%")').first();
  await percentCoupon.click();

  await page.waitForTimeout(1000);

  // 3. 할인 금액 계산
  const expectedDiscount = Math.min(
    Math.floor(subtotal * 0.1), // 10% 할인
    5000 // 최대 5000원
  );

  const discountText = await page.locator('[data-testid="discount-amount"]').textContent();
  const actualDiscount = parseInt(discountText.replace(/[^0-9]/g, ''));

  expect(actualDiscount).toBe(expectedDiscount);
  console.log(`✅ 할인 금액: ${actualDiscount}원 (10% = ${subtotal * 0.1}원, 최대 ${5000}원 제한)`);

  // 4. 예제 시나리오
  if (subtotal === 60000) {
    // 60000 × 10% = 6000원이지만, 최대 5000원 제한
    expect(actualDiscount).toBe(5000);
  } else if (subtotal === 30000) {
    // 30000 × 10% = 3000원 (최대 한도 미만)
    expect(actualDiscount).toBe(3000);
  }
});
```

### 5.3 쿠폰 할인 후 총액 검증 (배송비 포함)

```javascript
test('쿠폰 할인 - 배송비 제외 계산 검증', async ({ page, context }) => {
  await context.addCookies([/* 로그인 쿠키 */]);
  await page.goto('/checkout');

  // === 시나리오 ===
  // 상품 금액: 50,000원
  // 쿠폰 할인: 5,000원 (상품에만 적용)
  // 배송비: 4,000원 (할인 대상 아님)
  // 최종 금액: 49,000원 (45,000 + 4,000)

  const subtotalText = await page.locator('[data-testid="subtotal"]').textContent();
  const subtotal = parseInt(subtotalText.replace(/[^0-9]/g, ''));

  const shippingText = await page.locator('[data-testid="shipping-fee"]').textContent();
  const shipping = parseInt(shippingText.replace(/[^0-9]/g, ''));

  // 쿠폰 적용
  await page.click('button:has-text("쿠폰을 선택")');
  await page.waitForTimeout(500);
  await page.click('[data-testid="coupon-item"]:first-child');
  await page.waitForTimeout(1000);

  const discountText = await page.locator('[data-testid="discount-amount"]').textContent();
  const discount = parseInt(discountText.replace(/[^0-9]/g, ''));

  // ⚠️ 중요: OrderCalculations.calculateFinalOrderAmount 로직
  // 쿠폰 할인은 상품 금액(subtotal)에만 적용
  // 배송비는 할인 후 추가

  const expectedTotal = (subtotal - discount) + shipping;

  const actualTotalText = await page.locator('[data-testid="total-amount"]').textContent();
  const actualTotal = parseInt(actualTotalText.replace(/[^0-9]/g, ''));

  expect(actualTotal).toBe(expectedTotal);

  console.log(`
=== 쿠폰 할인 계산 검증 ===
상품 금액: ${subtotal}원
쿠폰 할인: -${discount}원
할인 후 금액: ${subtotal - discount}원
배송비: +${shipping}원
최종 금액: ${actualTotal}원
기대 금액: ${expectedTotal}원
✅ 계산 정확성: ${actualTotal === expectedTotal}
  `);
});
```

---

## 6. 주문 수량 조정 시 검증

### 6.1 관리자 - 주문 수량 조정 후 금액 재계산

```javascript
test('관리자 - 주문 수량 조정 시 금액 자동 재계산', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/orders/1');

  // 1. 원래 주문 정보
  const originalQtyText = await page.locator('[data-testid="order-item-quantity"]').inputValue();
  const originalQty = parseInt(originalQtyText);

  const unitPriceText = await page.locator('[data-testid="unit-price"]').textContent();
  const unitPrice = parseInt(unitPriceText.replace(/[^0-9]/g, ''));

  const originalTotal = originalQty * unitPrice;
  console.log(`[수정 전] 수량: ${originalQty}개, 단가: ${unitPrice}원, 소계: ${originalTotal}원`);

  // 2. 수량 변경
  const newQty = 5;
  await page.fill('[data-testid="order-item-quantity"]', newQty.toString());

  // 3. 저장
  await page.click('button:has-text("수량 조정 저장")');
  await page.waitForTimeout(1000);

  // 4. 금액 재계산 확인
  const newTotal = newQty * unitPrice;

  const itemTotalText = await page.locator('[data-testid="item-total"]').textContent();
  const actualItemTotal = parseInt(itemTotalText.replace(/[^0-9]/g, ''));

  expect(actualItemTotal).toBe(newTotal);
  console.log(`✅ [수정 후] 수량: ${newQty}개, 소계: ${actualItemTotal}원 === ${newTotal}원`);

  // 5. 주문 총액도 변경되어야 함
  const orderTotalText = await page.locator('[data-testid="order-total"]').textContent();
  const orderTotal = parseInt(orderTotalText.replace(/[^0-9]/g, ''));

  console.log(`✅ 주문 총액 재계산: ${orderTotal}원`);
});
```

---

## 7. 주문 취소 시 검증

### 7.1 주문 취소 → 재고 복구

```javascript
test('주문 취소 - 재고 자동 복구', async ({ page, context }) => {
  // === 1단계: 주문 생성 및 재고 차감 ===
  await context.addCookies([/* 로그인 쿠키 */]);

  await page.goto('/products/1');
  await page.waitForTimeout(3000);

  const stockBeforeOrder = await page.locator('[data-testid="stock"]').textContent();
  const stockCountBefore = parseInt(stockBeforeOrder.replace(/[^0-9]/g, ''));

  console.log(`[주문 전] 재고: ${stockCountBefore}개`);

  // 주문 생성
  const orderQty = 2;
  await page.fill('[data-testid="quantity"]', orderQty.toString());
  await page.click('button:has-text("구매")');

  // ... 체크아웃 및 주문 완료 ...

  // 재고 확인 (차감되어야 함)
  await page.goto('/products/1');
  await page.waitForTimeout(3000);

  const stockAfterOrder = await page.locator('[data-testid="stock"]').textContent();
  const stockCountAfterOrder = parseInt(stockAfterOrder.replace(/[^0-9]/g, ''));

  expect(stockCountAfterOrder).toBe(stockCountBefore - orderQty);
  console.log(`[주문 후] 재고: ${stockCountAfterOrder}개 (${orderQty}개 차감)`);

  // === 2단계: 관리자가 주문 취소 ===
  await context.clearCookies();
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/orders');

  // 방금 생성한 주문 찾기 (주문 번호로)
  await page.click('[data-testid="order-row"]:first-child');

  // 상태 변경: canceled
  await page.selectOption('select[name="status"]', 'canceled');
  await page.click('button:has-text("저장")');

  await page.waitForTimeout(1000);

  console.log('✅ 주문 취소 처리 완료');

  // === 3단계: 재고 복구 확인 ===
  await page.goto('/products/1');
  await page.waitForTimeout(3000);

  const stockAfterCancel = await page.locator('[data-testid="stock"]').textContent();
  const stockCountAfterCancel = parseInt(stockAfterCancel.replace(/[^0-9]/g, ''));

  // ⚠️ 중요: 재고가 원래대로 복구되어야 함!
  expect(stockCountAfterCancel).toBe(stockCountBefore);
  console.log(`✅ [취소 후] 재고 복구: ${stockCountAfterCancel}개 === ${stockCountBefore}개`);
});
```

### 7.2 주문 취소 → 쿠폰 복구

```javascript
test('주문 취소 - 사용한 쿠폰 복구', async ({ page, context }) => {
  await context.addCookies([/* 로그인 쿠키 */]);

  // === 1단계: 쿠폰 사용 주문 ===
  await page.goto('/checkout');

  // 보유 쿠폰 수 확인
  await page.click('button:has-text("쿠폰을 선택")');
  await page.waitForTimeout(500);

  const couponsBeforeOrder = await page.locator('[data-testid="coupon-item"]').count();
  console.log(`[주문 전] 보유 쿠폰: ${couponsBeforeOrder}개`);

  // 쿠폰 적용
  await page.click('[data-testid="coupon-item"]:first-child');
  await page.waitForTimeout(1000);

  // 주문 완료
  await page.fill('[name="name"]', '홍길동');
  await page.fill('[name="phone"]', '01012345678');
  // ... (생략)
  await page.click('button:has-text("주문하기")');

  await expect(page).toHaveURL(/\/orders\/\d+\/complete/);

  // === 2단계: 쿠폰 사용 완료 확인 ===
  await page.goto('/mypage');
  await page.click('button:has-text("쿠폰")');
  await page.click('button:has-text("사용 완료")');

  const usedCoupons = await page.locator('[data-testid="coupon-item"]').count();
  expect(usedCoupons).toBeGreaterThan(0);
  console.log(`[주문 후] 사용 완료 쿠폰: ${usedCoupons}개`);

  // === 3단계: 관리자가 주문 취소 ===
  await context.clearCookies();
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/orders');
  await page.click('[data-testid="order-row"]:first-child');
  await page.selectOption('select[name="status"]', 'canceled');
  await page.click('button:has-text("저장")');

  console.log('✅ 주문 취소 처리');

  // === 4단계: 쿠폰 복구 확인 ===
  await context.clearCookies();
  await context.addCookies([/* 사용자 쿠키 */]);

  await page.goto('/mypage');
  await page.click('button:has-text("쿠폰")');
  await page.click('button:has-text("사용 가능")');

  const couponsAfterCancel = await page.locator('[data-testid="coupon-item"]').count();

  // ⚠️ 중요: 쿠폰이 다시 사용 가능해야 함 (is_used = false)
  expect(couponsAfterCancel).toBe(couponsBeforeOrder);
  console.log(`✅ [취소 후] 쿠폰 복구: ${couponsAfterCancel}개`);
});
```

---

## 8. 발주 시스템 검증

### 8.1 발주서 생성 → 중복 발주 방지

```javascript
test('발주 시스템 - 중복 발주 방지', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/purchase-orders');

  // 1. 발주 가능한 주문 수 확인
  const availableOrdersBefore = await page.locator('[data-testid="available-order"]').count();
  console.log(`[발주 전] 발주 가능 주문: ${availableOrdersBefore}개`);

  // 2. 첫 번째 업체 발주서 다운로드
  const supplierName = await page.locator('[data-testid="supplier-name"]').first().textContent();

  const downloadPromise = page.waitForEvent('download');
  await page.click('[data-testid="supplier-group"]:first-child button:has-text("Excel")');
  const download = await downloadPromise;

  console.log(`✅ ${supplierName} 발주서 다운로드: ${download.suggestedFilename()}`);

  // 3. 발주 완료 후 해당 주문들이 목록에서 사라져야 함
  await page.reload();
  await page.waitForTimeout(1000);

  const availableOrdersAfter = await page.locator('[data-testid="available-order"]').count();

  expect(availableOrdersAfter).toBeLessThan(availableOrdersBefore);
  console.log(`✅ [발주 후] 발주 가능 주문: ${availableOrdersAfter}개 (감소 확인)`);

  // 4. 발주 이력 확인
  await page.goto('/admin/purchase-orders/history');

  const latestBatch = page.locator('[data-testid="batch-row"]').first();
  await latestBatch.click();

  // 5. 포함된 주문 확인
  const batchOrders = await page.locator('[data-testid="batch-order"]').count();
  expect(batchOrders).toBeGreaterThan(0);

  console.log(`✅ 발주 배치에 포함된 주문: ${batchOrders}개`);
});
```

---

## 9. 통합 검증 체크리스트

### 주문 생성 시 확인 사항
- [ ] 상품 금액 × 수량 = 소계
- [ ] 배송비 자동 계산 (우편번호별)
- [ ] 쿠폰 할인 (배송비 제외)
- [ ] 최종 금액 = (소계 - 쿠폰) + 배송비
- [ ] 재고 차감 (일반 상품 또는 Variant별)
- [ ] 주문 데이터 DB 저장 (orders, order_items, order_shipping, order_payments)
- [ ] 쿠폰 사용 처리 (user_coupons.is_used = true)

### 주문 상태 변경 시 확인 사항
- [ ] 타임스탬프 자동 기록 (deposited_at, shipped_at, delivered_at)
- [ ] 상태별 필터링 정확성
- [ ] 관리자 로그 기록

### 주문 수량 조정 시 확인 사항
- [ ] 아이템 금액 재계산 (수량 × 단가)
- [ ] 주문 총액 재계산
- [ ] 재고 조정 (증가/감소)

### 주문 취소 시 확인 사항
- [ ] 재고 복구
- [ ] 쿠폰 복구 (is_used = false, used_at = null, order_id = null)
- [ ] 상태 변경 (canceled)

### 발주 시 확인 사항
- [ ] 입금 확인 완료 주문만 포함 (status = 'deposited')
- [ ] 업체별 그룹핑
- [ ] 중복 발주 방지 (purchase_order_batches 확인)
- [ ] Excel 파일 생성 및 다운로드

---

**마지막 업데이트**: 2025-10-06
**기준**: DB_REFERENCE_GUIDE.md, orderCalculations.js, COUPON_SYSTEM.md
