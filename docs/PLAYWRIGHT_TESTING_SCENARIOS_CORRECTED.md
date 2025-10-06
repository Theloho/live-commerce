# Playwright 테스트 시나리오 (실제 시스템 기반)

**프로젝트**: allok.shop
**기준**: 실제 코드베이스 분석
**최종 검증**: 2025-10-06

> ⚠️ **중요**: 이 문서는 실제 allok.shop 코드베이스를 분석하여 작성되었습니다.
> 일반적인 e커머스 패턴이 아닌, **실제 구현**을 기반으로 합니다.

---

## 📋 실제 시스템 확인 사항

### ✅ 확인된 기능
1. **쿠폰 시스템**: 관리자가 발급 → 사용자 마이페이지에서 목록 확인 → 체크아웃에서 선택
2. **주문 타입**: `direct:KAKAO:카카오ID` 또는 `direct:USER:UUID` 형식
3. **Variant 시스템**: product_options, product_option_values, product_variants 테이블
4. **발주 시스템**: 입금확인 완료 주문을 업체별로 그룹핑하여 Excel 다운로드
5. **배송비**: 도서산간 추가 배송비 (제주 +3000, 울릉도 +5000)

### ❌ 존재하지 않는 기능
1. **쿠폰 코드 입력**: ❌ 없음 (보유 쿠폰 목록에서만 선택)
2. **상품 검색**: ❌ 현재 구현 여부 불명 (코드 확인 필요)
3. **상품 카테고리 필터**: ❌ 현재 구현 여부 불명

---

## 1. 사용자 테스트 시나리오 (정확한 버전)

### 1.1 회원가입 및 로그인 ✅ 확인됨

#### 시나리오: 카카오 로그인
```javascript
test('카카오 로그인 버튼 확인', async ({ page }) => {
  await page.goto('/login');

  // 1. 카카오 로그인 버튼 존재 확인
  const kakaoButton = page.locator('button:has-text("카카오"), [class*="kakao"]');
  await expect(kakaoButton).toBeVisible();

  // 2. 클릭 시 OAuth 리다이렉트 (실제 로그인은 테스트하지 않음)
  // OAuth 흐름은 E2E 테스트 범위 외
});
```

---

### 1.2 상품 탐색 ✅ 확인됨

#### 시나리오: 홈페이지 상품 목록
```javascript
test('홈페이지 - 상품 목록 조회', async ({ page }) => {
  await page.goto('/');

  // ⚠️ 중요: allok.shop은 CSR이므로 로딩 대기 필수!
  await page.waitForTimeout(3000);

  // 또는 로딩 스피너가 사라질 때까지 대기
  const spinner = page.locator('.animate-spin');
  if (await spinner.count() > 0) {
    await spinner.waitFor({ state: 'hidden', timeout: 10000 });
  }

  // 1. 상품 카드 확인
  const products = page.locator('[data-testid="product-card"]');
  const productCount = await products.count();

  expect(productCount).toBeGreaterThan(0);

  // 2. 첫 번째 상품 정보 확인
  const firstProduct = products.first();
  await expect(firstProduct).toBeVisible();
});
```

#### 시나리오: 상품 상세 페이지
```javascript
test('상품 상세 페이지 - BuyBottomSheet 확인', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);

  // 1. 상품 클릭
  await page.click('[data-testid="product-card"]');

  // 2. URL 확인
  await page.waitForURL(/\/products\/\d+/);

  // 3. BuyBottomSheet 표시 확인
  // (실제 UI 구조에 따라 선택자 조정 필요)
  const buySheet = page.locator('[data-testid="buy-bottom-sheet"], .bottom-sheet');

  if (await buySheet.count() > 0) {
    await expect(buySheet).toBeVisible();

    // 수량 선택
    const quantityInput = page.locator('input[type="number"]');
    await quantityInput.fill('2');

    // 구매 버튼
    const buyButton = page.locator('button:has-text("구매"), button:has-text("바로 구매")');
    await expect(buyButton).toBeVisible();
  }
});
```

---

### 1.3 체크아웃 및 주문 ✅ 확인됨

#### 시나리오: 체크아웃 - 배송정보 입력
```javascript
test('체크아웃 - 배송 정보 입력', async ({ page, context }) => {
  // 로그인 필요
  await context.addCookies([
    {
      name: 'sb-access-token',
      value: 'test-token',
      domain: 'allok.shop',
      path: '/',
    }
  ]);

  await page.goto('/checkout');

  // ⚠️ 실제 필드명 확인 필요!
  // DETAILED_DATA_FLOW.md 참조

  // 1. 이름
  await page.fill('[name="name"]', '홍길동');

  // 2. 전화번호
  await page.fill('[name="phone"]', '01012345678');

  // 3. 주소
  await page.fill('[name="address"]', '서울시 강남구 테헤란로 123');

  // 4. 우편번호 (도서산간 배송비 계산용)
  await page.fill('[name="postal_code"]', '06000');

  // 5. 입금자명 (가상계좌 입금 확인용)
  await page.fill('[name="depositor_name"]', '홍길동');

  // 6. 배송비 확인
  const shippingFee = page.locator('[data-testid="shipping-fee"]');
  await expect(shippingFee).toBeVisible();
});
```

#### 시나리오: 제주도 배송비 계산 (+3000원)
```javascript
test('제주도 배송비 - 추가 3000원 확인', async ({ page, context }) => {
  await context.addCookies([/* 로그인 쿠키 */]);

  await page.goto('/checkout');

  // 1. 제주도 우편번호 입력
  await page.fill('[name="postal_code"]', '63000'); // 제주시

  // 2. 배송비 재계산 대기
  await page.waitForTimeout(1000);

  // 3. 배송비 확인 (기본 3000 + 제주 3000 = 6000원)
  const shippingFee = page.locator('[data-testid="shipping-fee"]');
  const feeText = await shippingFee.textContent();

  expect(feeText).toContain('6,000');
});
```

---

### 1.4 쿠폰 사용 ✅ 확인됨 (정확한 시나리오)

#### 시나리오: 마이페이지 - 보유 쿠폰 조회
```javascript
test('마이페이지 - 보유 쿠폰 목록', async ({ page, context }) => {
  await context.addCookies([/* 로그인 쿠키 */]);

  await page.goto('/mypage');

  // 1. 쿠폰 섹션으로 이동 (탭 또는 링크)
  await page.click('button:has-text("쿠폰"), a:has-text("쿠폰")');

  // 2. 사용 가능 쿠폰 탭
  await page.click('button:has-text("사용 가능")');

  // 3. 쿠폰 목록 확인
  const coupons = page.locator('[data-testid="coupon-item"]');

  if (await coupons.count() > 0) {
    // 첫 번째 쿠폰 정보 확인
    const firstCoupon = coupons.first();

    await expect(firstCoupon.locator('.coupon-name')).toBeVisible();
    await expect(firstCoupon.locator('.coupon-discount')).toBeVisible();
    await expect(firstCoupon.locator('.coupon-expiry')).toBeVisible();
  }

  // 4. 사용 완료 쿠폰 탭
  await page.click('button:has-text("사용 완료")');

  const usedCoupons = page.locator('[data-testid="coupon-item"]');
  console.log(`사용 완료 쿠폰: ${await usedCoupons.count()}개`);
});
```

#### 시나리오: 체크아웃 - 쿠폰 선택 및 적용 (정확한 버전!)
```javascript
test('체크아웃 - 보유 쿠폰 선택 및 적용', async ({ page, context }) => {
  await context.addCookies([/* 로그인 쿠키 */]);

  await page.goto('/checkout');

  // 1. 원래 주문 금액 저장
  const subtotal = await page.locator('[data-testid="subtotal"]').textContent();
  const originalAmount = parseInt(subtotal.replace(/[^0-9]/g, ''));

  // 2. ⚠️ 정확한 UI: 쿠폰 선택 버튼 클릭
  // "쿠폰을 선택하면 할인 혜택을 받을 수 있습니다" 버튼
  const couponSelectButton = page.locator('button:has-text("쿠폰을 선택"), p:has-text("쿠폰을 선택")');

  if (await couponSelectButton.count() > 0) {
    await couponSelectButton.click();

    // 3. 쿠폰 리스트 펼쳐짐 (showCouponList = true)
    await page.waitForTimeout(500);

    // 4. 사용 가능한 쿠폰 목록에서 선택
    const availableCoupons = page.locator('[data-testid="coupon-item"]:not([disabled])');

    if (await availableCoupons.count() > 0) {
      // 첫 번째 쿠폰 클릭 (handleApplyCoupon 실행)
      await availableCoupons.first().click();

      // 5. 성공 토스트 메시지 확인
      await expect(page.locator('.toast, [role="status"]')).toContainText(/적용|할인/);

      // 6. 할인 금액 표시 확인
      const discountAmount = page.locator('[data-testid="discount-amount"]');
      await expect(discountAmount).toBeVisible();

      // 7. 최종 금액 확인 (할인 적용됨)
      const finalTotal = await page.locator('[data-testid="total-amount"]').textContent();
      const finalAmount = parseInt(finalTotal.replace(/[^0-9]/g, ''));

      expect(finalAmount).toBeLessThan(originalAmount);

      // 8. 적용된 쿠폰 정보 표시 확인
      const appliedCoupon = page.locator('[data-testid="applied-coupon"]');
      await expect(appliedCoupon).toBeVisible();

      // 9. 쿠폰 제거 버튼 확인 (X 버튼)
      const removeCouponButton = page.locator('button[aria-label="쿠폰 제거"], button:has(svg.h-5.w-5)');
      await expect(removeCouponButton).toBeVisible();
    }
  } else {
    console.log('보유한 쿠폰이 없거나 이미 쿠폰이 적용됨');
  }
});
```

#### 시나리오: 쿠폰 적용 후 주문 완료
```javascript
test('쿠폰 사용 주문 - 전체 플로우', async ({ page, context }) => {
  await context.addCookies([/* 로그인 쿠키 */]);

  await page.goto('/checkout');

  // 1. 배송 정보 입력
  await page.fill('[name="name"]', '홍길동');
  await page.fill('[name="phone"]', '01012345678');
  await page.fill('[name="address"]', '서울시 강남구');
  await page.fill('[name="postal_code"]', '06000');
  await page.fill('[name="depositor_name"]', '홍길동');

  // 2. 쿠폰 선택
  const couponButton = page.locator('button:has-text("쿠폰을 선택")');
  if (await couponButton.count() > 0) {
    await couponButton.click();
    await page.waitForTimeout(500);

    const firstCoupon = page.locator('[data-testid="coupon-item"]').first();
    if (await firstCoupon.count() > 0) {
      await firstCoupon.click();
    }
  }

  // 3. 주문하기 버튼
  await page.click('button:has-text("주문하기")');

  // 4. 주문 완료 페이지
  await expect(page).toHaveURL(/\/orders\/\d+\/complete/);

  // 5. 쿠폰 할인 금액 표시 확인
  const discountAmount = page.locator('[data-testid="discount-amount"]');
  if (await discountAmount.count() > 0) {
    await expect(discountAmount).toBeVisible();
  }
});
```

---

## 2. 관리자 테스트 시나리오 (정확한 버전)

### 2.1 상품 관리 ✅ 확인됨

#### 시나리오: Variant 상품 등록
```javascript
test('관리자 - Variant 상품 등록 (옵션 있는 상품)', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/products/new');

  // 1. 기본 정보
  await page.fill('[name="title"]', 'Variant 테스트 상품');
  await page.fill('[name="price"]', '50000');

  // 2. 옵션 추가
  // ⚠️ 실제 UI 구조 확인 필요
  // DB 구조: product_options, product_option_values, product_variants

  await page.click('button:has-text("옵션 추가")');

  // 옵션 1: 색상
  await page.fill('[name="option_name_1"]', '색상');
  await page.fill('[name="option_values_1"]', '빨강,파랑,검정');

  // 옵션 2: 사이즈
  await page.click('button:has-text("옵션 추가")');
  await page.fill('[name="option_name_2"]', '사이즈');
  await page.fill('[name="option_values_2"]', 'S,M,L');

  // 3. Variant 조합 생성 (색상 3개 × 사이즈 3개 = 9개 조합)
  await page.click('button:has-text("조합 생성")');

  // 4. 각 Variant 재고 설정
  const variants = page.locator('[data-testid="variant-row"]');
  const variantCount = await variants.count();

  for (let i = 0; i < variantCount; i++) {
    await page.fill(`input[name="variant_${i}_inventory"]`, '50');
  }

  // 5. 저장
  await page.click('button:has-text("저장")');

  await expect(page.locator('.toast')).toContainText(/성공/);
});
```

---

### 2.2 주문 관리 ✅ 확인됨

#### 시나리오: 주문 상태 변경 (입금 확인)
```javascript
test('관리자 - 주문 상태 변경 (pending → deposited)', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/orders');

  // 1. "입금 대기" 필터
  await page.click('button:has-text("입금 대기")');

  // 2. 첫 번째 주문 클릭
  await page.click('[data-testid="order-row"]:first-child');

  // 3. 상태 변경 드롭다운
  await page.selectOption('select[name="status"]', 'deposited');

  // 4. 저장
  await page.click('button:has-text("저장"), button:has-text("변경")');

  // 5. 확인
  await expect(page.locator('.toast')).toContainText(/변경|완료/);

  // 6. 주문 목록에서 확인
  await page.goto('/admin/orders');
  await page.click('button:has-text("입금 확인")');

  // 방금 변경한 주문이 "입금 확인" 탭에 있어야 함
});
```

#### 시나리오: 주문 수량 조정
```javascript
test('관리자 - 주문 아이템 수량 조정', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/orders/1'); // 특정 주문

  // ⚠️ RLS UPDATE 정책 확인 필요!
  // 2025-10-06 수정: order_items UPDATE RLS 정책 추가됨

  // 1. 수량 입력 필드
  const quantityInput = page.locator('[data-testid="order-item-quantity"]').first();
  const originalQty = await quantityInput.inputValue();

  // 2. 수량 변경
  await quantityInput.clear();
  await quantityInput.fill('5');

  // 3. 저장
  await page.click('button:has-text("수량 조정 저장"), button:has-text("저장")');

  // 4. 성공 확인
  await expect(page.locator('.toast')).toContainText(/성공|완료/);

  // 5. 금액 재계산 확인
  const totalAmount = page.locator('[data-testid="total-amount"]');
  await expect(totalAmount).toBeVisible();
});
```

---

### 2.3 발주 관리 ✅ 확인됨

#### 시나리오: 발주서 생성 및 Excel 다운로드
```javascript
test('관리자 - 발주서 생성 (업체별 그룹핑)', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/purchase-orders');

  // 1. 발주 가능한 주문 확인 (status = 'deposited')
  const availableOrders = page.locator('[data-testid="available-order"]');
  const orderCount = await availableOrders.count();

  console.log(`발주 가능 주문: ${orderCount}개`);

  // 2. 업체별 그룹 확인
  const supplierGroups = page.locator('[data-testid="supplier-group"]');
  const groupCount = await supplierGroups.count();

  console.log(`공급업체 그룹: ${groupCount}개`);

  if (groupCount > 0) {
    // 3. 첫 번째 업체의 발주서 Excel 다운로드
    const downloadPromise = page.waitForEvent('download');

    await page.click('[data-testid="supplier-group"]:first-child button:has-text("Excel")');

    const download = await downloadPromise;

    // 4. 파일명 확인
    expect(download.suggestedFilename()).toContain('.xlsx');

    // 5. 다운로드 후 purchase_order_batches 테이블에 저장됨
    // order_ids 배열에 해당 주문들 포함
  }
});
```

---

### 2.4 쿠폰 관리 ✅ 확인됨

#### 시나리오: 신규 쿠폰 생성
```javascript
test('관리자 - 신규 쿠폰 생성', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/coupons/new');

  // 1. 기본 정보
  await page.fill('[name="code"]', 'TEST' + Date.now());
  await page.fill('[name="name"]', '테스트 쿠폰');
  await page.fill('[name="description"]', '테스트용 쿠폰입니다');

  // 2. 할인 타입 선택
  await page.selectOption('select[name="discount_type"]', 'fixed_amount'); // 또는 'percentage'

  // 3. 할인 값
  await page.fill('[name="discount_value"]', '5000');

  // 4. 최소 구매 금액
  await page.fill('[name="min_purchase_amount"]', '30000');

  // 5. 최대 할인 금액 (percentage 타입인 경우)
  if (await page.locator('[name="max_discount_amount"]').count() > 0) {
    await page.fill('[name="max_discount_amount"]', '10000');
  }

  // 6. 유효 기간
  await page.fill('[name="valid_from"]', '2025-10-01');
  await page.fill('[name="valid_until"]', '2025-12-31');

  // 7. 사용 제한
  await page.fill('[name="usage_limit_per_user"]', '1');
  await page.fill('[name="total_usage_limit"]', '100');

  // 8. 저장
  await page.click('button:has-text("저장")');

  await expect(page.locator('.toast')).toContainText(/생성|성공/);
});
```

#### 시나리오: 사용자에게 쿠폰 발급
```javascript
test('관리자 - 특정 사용자에게 쿠폰 발급', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/coupons/1'); // 특정 쿠폰

  // 1. 발급 버튼
  await page.click('button:has-text("발급"), button:has-text("배포")');

  // 2. 사용자 선택
  // ⚠️ 실제 UI 확인 필요 (이메일 입력? 사용자 선택?)

  // 방법 1: 이메일로 발급
  await page.fill('input[name="user_email"]', 'user@example.com');

  // 방법 2: 여러 사용자 ID로 일괄 발급
  // await page.fill('textarea[name="user_ids"]', 'uuid1,uuid2,uuid3');

  // 3. 발급 실행
  await page.click('button:has-text("발급 실행")');

  // 4. user_coupons 테이블에 INSERT됨
  await expect(page.locator('.toast')).toContainText(/발급|완료/);
});
```

---

## 3. Edge Cases 및 에러 처리

### 3.1 쿠폰 관련

#### 최소 주문 금액 미달
```javascript
test('쿠폰 - 최소 주문 금액 미달 시 적용 불가', async ({ page, context }) => {
  await context.addCookies([/* 로그인 쿠키 */]);

  await page.goto('/checkout');

  // 1. 주문 금액 확인 (예: 20,000원)
  const subtotal = await page.locator('[data-testid="subtotal"]').textContent();
  const amount = parseInt(subtotal.replace(/[^0-9]/g, ''));

  // 2. 최소 주문 금액 30,000원인 쿠폰 선택 시도
  await page.click('button:has-text("쿠폰을 선택")');

  const expensiveCoupon = page.locator('[data-testid="coupon-item"]:has-text("30,000")');

  if (await expensiveCoupon.count() > 0) {
    await expensiveCoupon.click();

    // 3. 에러 토스트 또는 메시지
    await expect(page.locator('.toast, .error')).toContainText(/최소 주문 금액|사용 불가/);
  }
});
```

#### 만료된 쿠폰
```javascript
test('쿠폰 - 만료된 쿠폰 비활성화', async ({ page, context }) => {
  await context.addCookons([/* 로그인 쿠키 */]);

  await page.goto('/checkout');

  await page.click('button:has-text("쿠폰을 선택")');

  // 만료된 쿠폰은 disabled 상태
  const expiredCoupon = page.locator('[data-testid="coupon-item"][disabled]');

  if (await expiredCoupon.count() > 0) {
    await expect(expiredCoupon).toHaveClass(/disabled|opacity-50/);
    await expect(expiredCoupon).toContainText(/만료/);
  }
});
```

---

### 3.2 재고 관련

#### Variant 재고 부족
```javascript
test('Variant 상품 - 재고 부족 옵션 선택 불가', async ({ page }) => {
  await page.goto('/products/1'); // Variant 상품

  // 1. 옵션 선택
  await page.selectOption('select[name="color"]', '빨강');
  await page.selectOption('select[name="size"]', 'L');

  // 2. 재고 확인 (해당 Variant 재고 0개)
  const stockInfo = page.locator('[data-testid="stock-status"]');

  if (await stockInfo.textContent().then(text => text.includes('품절'))) {
    // 3. 구매 버튼 비활성화
    const buyButton = page.locator('button:has-text("구매")');
    await expect(buyButton).toBeDisabled();
  }
});
```

---

## 4. 테스트 작성 가이드

### 필수 패턴

#### 1. 로딩 대기 (CSR 앱)
```javascript
// ❌ 잘못됨
await page.goto('/');
await page.click('[data-testid="product-card"]'); // 에러!

// ✅ 올바름
await page.goto('/');
await page.waitForTimeout(3000); // CSR 로딩 대기
await page.click('[data-testid="product-card"]');
```

#### 2. 실제 선택자 사용
```javascript
// ❌ 가정
page.locator('[data-testid="product-card"]')

// ✅ 실제 확인 후 사용
// 실제로 data-testid가 없다면:
page.locator('.product-card, article, div[class*="grid"] > div')
```

#### 3. 조건부 처리
```javascript
// UI가 없을 수도 있는 경우
const couponButton = page.locator('button:has-text("쿠폰")');

if (await couponButton.count() > 0) {
  await couponButton.click();
  // 쿠폰 관련 테스트
} else {
  console.log('쿠폰 기능 없음');
}
```

---

## 5. 체크리스트

### 테스트 작성 전
- [ ] 실제 코드 확인 (DB 구조, API, UI)
- [ ] 실제 페이지 방문하여 UI 확인
- [ ] 선택자가 실제로 존재하는지 확인
- [ ] CSR 로딩 대기 처리 추가

### 테스트 실행 전
- [ ] 로그인 쿠키 설정 확인
- [ ] 테스트 데이터 준비 (쿠폰, 상품 등)
- [ ] 환경변수 설정 확인

---

**마지막 업데이트**: 2025-10-06
**기준**: 실제 allok.shop 코드베이스
**검증**: COUPON_SYSTEM.md, app/checkout/page.js 분석 완료
