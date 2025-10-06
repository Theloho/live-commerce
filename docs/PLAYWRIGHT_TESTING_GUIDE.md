# Playwright 테스트 완벽 가이드

**프로젝트**: allok.shop 라이브 커머스 플랫폼
**테스트 대상**: https://allok.shop (본서버)
**도구**: Playwright v1.55.1

---

## 📚 목차

1. [사용자 테스트 시나리오](#1-사용자-테스트-시나리오)
2. [관리자 테스트 시나리오](#2-관리자-테스트-시나리오)
3. [기능적 테스트](#3-기능적-테스트)
4. [상황적 테스트 (Edge Cases)](#4-상황적-테스트-edge-cases)
5. [성능 및 최적화 테스트](#5-성능-및-최적화-테스트)
6. [접근성 및 SEO 테스트](#6-접근성-및-seo-테스트)
7. [테스트 작성 템플릿](#7-테스트-작성-템플릿)
8. [CI/CD 통합](#8-cicd-통합)

---

## 1. 사용자 테스트 시나리오

### 1.1 회원가입 및 로그인

#### 📝 시나리오: 신규 사용자 회원가입
```javascript
test('신규 사용자 - 카카오 로그인 플로우', async ({ page, context }) => {
  await page.goto('/');

  // 1. 로그인 버튼 클릭
  await page.click('a[href*="login"], button:has-text("로그인")');

  // 2. 카카오 로그인 버튼 확인
  const kakaoButton = page.locator('button:has-text("카카오")');
  await expect(kakaoButton).toBeVisible();

  // 3. 카카오 로그인 클릭 (실제 로그인은 하지 않음 - OAuth 리다이렉트 확인)
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    kakaoButton.click()
  ]);

  // 4. 카카오 로그인 팝업 URL 확인
  expect(popup.url()).toContain('kauth.kakao.com');
  await popup.close();
});
```

#### 📝 시나리오: 로그인된 사용자 세션 유지
```javascript
test('로그인 세션 유지 확인', async ({ page, context }) => {
  // 1. 로그인 (테스트용 세션 쿠키 설정)
  await context.addCookies([
    {
      name: 'sb-access-token',
      value: 'test-token',
      domain: 'allok.shop',
      path: '/',
    }
  ]);

  // 2. 페이지 새로고침
  await page.goto('/');
  await page.reload();

  // 3. 로그인 상태 확인 (마이페이지 접근 가능)
  await page.goto('/mypage');
  await expect(page).not.toHaveURL(/login/);
});
```

---

### 1.2 상품 탐색 및 검색

#### 📝 시나리오: 홈페이지에서 상품 브라우징
```javascript
test('홈페이지 상품 목록 탐색', async ({ page }) => {
  await page.goto('/');

  // 로딩 대기
  await page.waitForSelector('[data-testid="product-card"]', { timeout: 5000 });

  // 1. 상품 카드 확인
  const products = page.locator('[data-testid="product-card"]');
  const productCount = await products.count();
  expect(productCount).toBeGreaterThan(0);

  // 2. 첫 번째 상품 정보 확인
  const firstProduct = products.first();
  await expect(firstProduct.locator('.product-title, h2, h3')).toBeVisible();
  await expect(firstProduct.locator('.price, [data-testid="price"]')).toBeVisible();

  // 3. 상품 이미지 로드 확인
  const productImage = firstProduct.locator('img');
  await expect(productImage).toBeVisible();
  await expect(productImage).toHaveAttribute('src', /.+/);
});
```

#### 📝 시나리오: 상품 상세 페이지 조회
```javascript
test('상품 상세 페이지 조회', async ({ page }) => {
  await page.goto('/');

  // 로딩 대기
  await page.waitForTimeout(3000);

  // 1. 상품 클릭
  await page.click('[data-testid="product-card"]');

  // 2. 상품 상세 페이지로 이동 확인
  await expect(page).toHaveURL(/\/products?\/\d+/);

  // 3. 상품 상세 정보 확인
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('[data-testid="price"], .price')).toBeVisible();
  await expect(page.locator('[data-testid="description"], .description')).toBeVisible();

  // 4. 상품 이미지 갤러리 확인
  const images = page.locator('.product-image, .gallery img');
  expect(await images.count()).toBeGreaterThan(0);
});
```

#### 📝 시나리오: 상품 옵션 선택 (Variant)
```javascript
test('상품 옵션 선택 및 변경', async ({ page }) => {
  await page.goto('/products/1'); // Variant 상품

  // 1. 옵션 선택 UI 확인
  const optionSelects = page.locator('select[data-testid="option-select"], .option-select');
  expect(await optionSelects.count()).toBeGreaterThan(0);

  // 2. 첫 번째 옵션 선택 (예: 색상)
  const colorSelect = optionSelects.first();
  await colorSelect.selectOption({ index: 1 });

  // 3. 두 번째 옵션 선택 (예: 사이즈)
  if (await optionSelects.count() > 1) {
    const sizeSelect = optionSelects.nth(1);
    await sizeSelect.selectOption({ index: 1 });
  }

  // 4. 재고 확인
  const stockInfo = page.locator('[data-testid="stock"], .stock-info');
  await expect(stockInfo).toBeVisible();

  // 5. 가격 변경 확인 (옵션에 따라 가격이 달라질 수 있음)
  const price = page.locator('[data-testid="price"]');
  await expect(price).toBeVisible();
});
```

---

### 1.3 장바구니 및 구매 프로세스

#### 📝 시나리오: 장바구니에 상품 추가
```javascript
test('장바구니에 상품 추가', async ({ page, context }) => {
  // 로그인 필요 (테스트 세션)
  await context.addCookies([/* 테스트 쿠키 */]);

  await page.goto('/products/1');

  // 1. 수량 선택
  const quantityInput = page.locator('input[type="number"], [data-testid="quantity"]');
  await quantityInput.fill('2');

  // 2. 장바구니 추가 버튼 클릭
  await page.click('button:has-text("장바구니"), button:has-text("담기")');

  // 3. 성공 메시지 확인
  await expect(page.locator('.toast, .notification')).toContainText(/장바구니|추가/);

  // 4. 장바구니 이동
  await page.goto('/cart');

  // 5. 장바구니에 상품 있는지 확인
  const cartItems = page.locator('[data-testid="cart-item"]');
  expect(await cartItems.count()).toBeGreaterThan(0);
});
```

#### 📝 시나리오: 즉시 구매
```javascript
test('즉시 구매 버튼 클릭', async ({ page, context }) => {
  await context.addCookies([/* 테스트 쿠키 */]);

  await page.goto('/products/1');

  // 1. 수량 선택
  await page.fill('[data-testid="quantity"]', '1');

  // 2. 즉시 구매 버튼 클릭
  await page.click('button:has-text("구매하기"), button:has-text("바로 구매")');

  // 3. 체크아웃 페이지로 이동
  await expect(page).toHaveURL(/\/checkout/);

  // 4. 상품 정보 확인
  const orderSummary = page.locator('[data-testid="order-summary"]');
  await expect(orderSummary).toBeVisible();
});
```

---

### 1.4 체크아웃 및 주문

#### 📝 시나리오: 전체 주문 프로세스 (E2E)
```javascript
test('전체 주문 프로세스 - 상품 선택부터 주문 완료까지', async ({ page, context }) => {
  // 로그인
  await context.addCookies([/* 테스트 쿠키 */]);

  // 1. 홈페이지에서 상품 선택
  await page.goto('/');
  await page.waitForTimeout(3000);
  await page.click('[data-testid="product-card"]');

  // 2. 상품 옵션 선택
  const optionSelect = page.locator('select').first();
  if (await optionSelect.count() > 0) {
    await optionSelect.selectOption({ index: 1 });
  }

  // 3. 구매하기 클릭
  await page.click('button:has-text("구매")');

  // 4. 체크아웃 페이지에서 배송 정보 입력
  await expect(page).toHaveURL(/\/checkout/);

  // 배송지 정보
  await page.fill('[name="name"], input[placeholder*="이름"]', '홍길동');
  await page.fill('[name="phone"], input[placeholder*="전화"]', '01012345678');
  await page.fill('[name="address"], input[placeholder*="주소"]', '서울시 강남구');
  await page.fill('[name="postal_code"]', '06000');

  // 입금자명
  await page.fill('[name="depositor_name"]', '홍길동');

  // 5. 쿠폰 적용 (선택)
  const couponButton = page.locator('button:has-text("쿠폰")');
  if (await couponButton.count() > 0) {
    await couponButton.click();
    // 쿠폰 선택
    const firstCoupon = page.locator('[data-testid="coupon-item"]').first();
    if (await firstCoupon.count() > 0) {
      await firstCoupon.click();
      await page.click('button:has-text("적용")');
    }
  }

  // 6. 주문 금액 확인
  const totalAmount = page.locator('[data-testid="total-amount"]');
  await expect(totalAmount).toBeVisible();

  // 7. 주문하기 버튼 클릭
  await page.click('button:has-text("주문하기"), button:has-text("결제")');

  // 8. 주문 완료 페이지로 이동
  await expect(page).toHaveURL(/\/orders\/\d+\/complete/);

  // 9. 주문 번호 확인
  const orderNumber = page.locator('[data-testid="order-number"]');
  await expect(orderNumber).toBeVisible();
});
```

#### 📝 시나리오: 배송비 계산 확인 (도서산간)
```javascript
test('도서산간 배송비 계산', async ({ page, context }) => {
  await context.addCookies([/* 테스트 쿠키 */]);

  await page.goto('/checkout');

  // 1. 제주도 우편번호 입력
  await page.fill('[name="postal_code"]', '63000');

  // 2. 배송비 확인 (기본 배송비 + 3000원)
  await page.waitForTimeout(1000); // 배송비 계산 대기

  const shippingFee = page.locator('[data-testid="shipping-fee"]');
  const shippingText = await shippingFee.textContent();

  // 제주도 배송비 확인 (기본 3000원 + 3000원 = 6000원)
  expect(shippingText).toContain('6,000');
});
```

---

### 1.5 주문 내역 및 마이페이지

#### 📝 시나리오: 주문 내역 조회
```javascript
test('주문 내역 페이지 조회', async ({ page, context }) => {
  await context.addCookies([/* 테스트 쿠키 */]);

  await page.goto('/orders');

  // 1. 주문 목록 확인
  const orders = page.locator('[data-testid="order-item"]');

  if (await orders.count() > 0) {
    // 2. 첫 번째 주문 정보 확인
    const firstOrder = orders.first();
    await expect(firstOrder.locator('.order-number')).toBeVisible();
    await expect(firstOrder.locator('.order-date')).toBeVisible();
    await expect(firstOrder.locator('.order-status')).toBeVisible();
    await expect(firstOrder.locator('.order-total')).toBeVisible();

    // 3. 주문 상세 보기
    await firstOrder.click();

    // 4. 주문 상세 페이지 확인
    await expect(page).toHaveURL(/\/orders\/\d+/);
    await expect(page.locator('[data-testid="order-items"]')).toBeVisible();
  }
});
```

#### 📝 시나리오: 주문 상태별 필터링
```javascript
test('주문 상태별 필터링', async ({ page, context }) => {
  await context.addCookies([/* 테스트 쿠키 */]);

  await page.goto('/orders');

  // 1. 전체 주문 수 확인
  const allOrders = await page.locator('[data-testid="order-item"]').count();

  // 2. "입금 대기" 필터 적용
  await page.click('button:has-text("입금 대기")');
  await page.waitForTimeout(500);

  const pendingOrders = await page.locator('[data-testid="order-item"]').count();

  // 3. "배송 완료" 필터 적용
  await page.click('button:has-text("배송 완료")');
  await page.waitForTimeout(500);

  const completedOrders = await page.locator('[data-testid="order-item"]').count();

  // 4. 필터 결과 확인
  console.log(`전체: ${allOrders}, 입금대기: ${pendingOrders}, 배송완료: ${completedOrders}`);
});
```

#### 📝 시나리오: 마이페이지 프로필 수정
```javascript
test('마이페이지 - 프로필 정보 수정', async ({ page, context }) => {
  await context.addCookies([/* 테스트 쿠키 */]);

  await page.goto('/mypage');

  // 1. 프로필 정보 확인
  await expect(page.locator('[data-testid="profile-name"]')).toBeVisible();

  // 2. 수정 버튼 클릭
  await page.click('button:has-text("수정"), button:has-text("편집")');

  // 3. 정보 변경
  await page.fill('[name="address"]', '서울시 서초구 테스트동 123');
  await page.fill('[name="postal_code"]', '06789');

  // 4. 저장 버튼 클릭
  await page.click('button:has-text("저장")');

  // 5. 성공 메시지 확인
  await expect(page.locator('.toast, .notification')).toContainText(/저장|완료/);
});
```

---

### 1.6 쿠폰 사용

#### 📝 시나리오: 마이페이지에서 쿠폰 조회
```javascript
test('마이페이지 - 보유 쿠폰 조회', async ({ page, context }) => {
  await context.addCookies([/* 테스트 쿠키 */]);

  await page.goto('/mypage');

  // 1. 쿠폰 탭 클릭
  await page.click('button:has-text("쿠폰"), a:has-text("쿠폰")');

  // 2. 사용 가능 쿠폰 확인
  await page.click('button:has-text("사용 가능")');
  const availableCoupons = page.locator('[data-testid="coupon-item"]');

  if (await availableCoupons.count() > 0) {
    // 3. 쿠폰 정보 확인
    const firstCoupon = availableCoupons.first();
    await expect(firstCoupon.locator('.coupon-name')).toBeVisible();
    await expect(firstCoupon.locator('.coupon-discount')).toBeVisible();
    await expect(firstCoupon.locator('.coupon-expiry')).toBeVisible();
  }

  // 4. 사용 완료 쿠폰 확인
  await page.click('button:has-text("사용 완료")');
  const usedCoupons = page.locator('[data-testid="coupon-item"]');
  console.log(`사용 완료 쿠폰: ${await usedCoupons.count()}개`);
});
```

#### 📝 시나리오: 체크아웃에서 쿠폰 적용
```javascript
test('체크아웃 - 쿠폰 적용 및 할인 확인', async ({ page, context }) => {
  await context.addCookies([/* 테스트 쿠키 */]);

  await page.goto('/checkout');

  // 1. 원래 주문 금액 저장
  const originalTotal = await page.locator('[data-testid="total-amount"]').textContent();
  const originalAmount = parseInt(originalTotal.replace(/[^0-9]/g, ''));

  // 2. 쿠폰 선택 버튼 클릭
  await page.click('button:has-text("쿠폰")');

  // 3. 사용 가능한 쿠폰 선택
  const firstCoupon = page.locator('[data-testid="coupon-item"]').first();
  await firstCoupon.click();

  // 4. 쿠폰 적용
  await page.click('button:has-text("적용")');

  // 5. 할인 금액 확인
  const discountAmount = page.locator('[data-testid="discount-amount"]');
  await expect(discountAmount).toBeVisible();

  // 6. 최종 금액 확인 (할인 적용됨)
  const finalTotal = await page.locator('[data-testid="total-amount"]').textContent();
  const finalAmount = parseInt(finalTotal.replace(/[^0-9]/g, ''));

  expect(finalAmount).toBeLessThan(originalAmount);
});
```

---

### 1.7 모바일 테스트

#### 📝 시나리오: 모바일 반응형 UI
```javascript
test('모바일 - 상품 탐색 및 구매', async ({ page }) => {
  // 모바일 뷰포트 설정
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto('/');

  // 1. 모바일 네비게이션 확인
  const mobileMenu = page.locator('button[aria-label*="menu"], .mobile-menu');
  if (await mobileMenu.count() > 0) {
    await expect(mobileMenu).toBeVisible();
  }

  // 2. 상품 카드 모바일 레이아웃
  await page.waitForTimeout(3000);
  const products = page.locator('[data-testid="product-card"]');
  const firstProduct = products.first();

  // 터치 이벤트로 상품 클릭
  await firstProduct.tap();

  // 3. 모바일 구매 버튼
  const buyButton = page.locator('button:has-text("구매")');
  await expect(buyButton).toBeVisible();

  // 4. 하단 고정 버튼 확인
  const fixedBottom = page.locator('.fixed.bottom-0, .sticky-bottom');
  if (await fixedBottom.count() > 0) {
    await expect(fixedBottom).toBeVisible();
  }
});
```

---

## 2. 관리자 테스트 시나리오

### 2.1 관리자 로그인

#### 📝 시나리오: 관리자 로그인
```javascript
test('관리자 로그인', async ({ page }) => {
  await page.goto('/admin/login');

  // 1. 이메일/비밀번호 입력
  await page.fill('input[type="email"]', 'admin@allok.shop');
  await page.fill('input[type="password"]', 'admin-password');

  // 2. 로그인 버튼 클릭
  await page.click('button[type="submit"]');

  // 3. 관리자 대시보드로 이동
  await expect(page).toHaveURL(/\/admin/);
  await expect(page).not.toHaveURL(/\/admin\/login/);
});
```

---

### 2.2 상품 관리

#### 📝 시나리오: 신규 상품 등록
```javascript
test('관리자 - 신규 상품 등록', async ({ page, context }) => {
  // 관리자 로그인
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/products');

  // 1. 신규 등록 버튼
  await page.click('button:has-text("등록"), a:has-text("등록")');

  // 2. 상품 정보 입력
  await page.fill('[name="title"]', '테스트 상품 ' + Date.now());
  await page.fill('[name="price"]', '50000');
  await page.fill('[name="inventory"]', '100');
  await page.fill('[name="description"]', '테스트 상품 설명입니다.');

  // 3. 카테고리 선택
  await page.selectOption('select[name="category_id"]', { index: 1 });

  // 4. 공급업체 선택
  await page.selectOption('select[name="supplier_id"]', { index: 1 });

  // 5. 이미지 업로드 (선택)
  const fileInput = page.locator('input[type="file"]');
  if (await fileInput.count() > 0) {
    await fileInput.setInputFiles('./test-image.jpg');
  }

  // 6. 저장 버튼
  await page.click('button:has-text("저장"), button[type="submit"]');

  // 7. 성공 메시지 확인
  await expect(page.locator('.toast')).toContainText(/등록|성공/);
});
```

#### 📝 시나리오: Variant 상품 등록 (옵션 있는 상품)
```javascript
test('관리자 - Variant 상품 등록 (옵션 설정)', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/products/new');

  // 1. 기본 정보 입력
  await page.fill('[name="title"]', 'Variant 상품 ' + Date.now());
  await page.fill('[name="price"]', '30000');

  // 2. "옵션 있음" 체크
  await page.check('input[name="has_options"]');

  // 3. 옵션 1 추가 (색상)
  await page.click('button:has-text("옵션 추가")');
  await page.fill('input[name="option_name_1"]', '색상');
  await page.fill('input[name="option_values_1"]', '빨강,파랑,검정');

  // 4. 옵션 2 추가 (사이즈)
  await page.click('button:has-text("옵션 추가")');
  await page.fill('input[name="option_name_2"]', '사이즈');
  await page.fill('input[name="option_values_2"]', 'S,M,L,XL');

  // 5. Variant 조합 생성
  await page.click('button:has-text("조합 생성")');

  // 6. 각 Variant의 재고 및 가격 설정
  const variants = page.locator('[data-testid="variant-row"]');
  const variantCount = await variants.count();

  for (let i = 0; i < variantCount; i++) {
    await page.fill(`input[name="variant_${i}_inventory"]`, '50');
    await page.fill(`input[name="variant_${i}_price"]`, '30000');
  }

  // 7. 저장
  await page.click('button:has-text("저장")');

  // 8. 확인
  await expect(page.locator('.toast')).toContainText(/성공/);
});
```

#### 📝 시나리오: 상품 수정
```javascript
test('관리자 - 기존 상품 수정', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/products');

  // 1. 첫 번째 상품 수정 버튼 클릭
  await page.click('[data-testid="product-row"]:first-child button:has-text("수정")');

  // 2. 가격 변경
  const priceInput = page.locator('input[name="price"]');
  await priceInput.clear();
  await priceInput.fill('55000');

  // 3. 재고 변경
  const inventoryInput = page.locator('input[name="inventory"]');
  await inventoryInput.clear();
  await inventoryInput.fill('150');

  // 4. 저장
  await page.click('button:has-text("저장")');

  // 5. 변경사항 반영 확인
  await page.goto('/admin/products');
  await expect(page.locator('[data-testid="product-row"]:first-child')).toContainText('55,000');
});
```

#### 📝 시나리오: 상품 삭제
```javascript
test('관리자 - 상품 삭제', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/products');

  // 1. 삭제할 상품 개수 확인
  const initialCount = await page.locator('[data-testid="product-row"]').count();

  // 2. 첫 번째 상품 삭제 버튼
  await page.click('[data-testid="product-row"]:first-child button:has-text("삭제")');

  // 3. 확인 다이얼로그
  page.on('dialog', dialog => dialog.accept());

  // 4. 삭제 후 목록 확인
  await page.waitForTimeout(1000);
  const afterCount = await page.locator('[data-testid="product-row"]').count();

  expect(afterCount).toBe(initialCount - 1);
});
```

---

### 2.3 주문 관리

#### 📝 시나리오: 주문 목록 조회 및 필터링
```javascript
test('관리자 - 주문 목록 조회', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/orders');

  // 1. 주문 목록 확인
  const orders = page.locator('[data-testid="order-row"]');
  expect(await orders.count()).toBeGreaterThan(0);

  // 2. 상태별 필터
  await page.click('button:has-text("입금 대기")');
  await page.waitForTimeout(500);

  const pendingOrders = await page.locator('[data-testid="order-row"]').count();
  console.log(`입금 대기 주문: ${pendingOrders}개`);

  // 3. 날짜 범위 필터
  await page.fill('input[type="date"][name="start_date"]', '2025-10-01');
  await page.fill('input[type="date"][name="end_date"]', '2025-10-31');
  await page.click('button:has-text("검색"), button[type="submit"]');

  // 4. 필터 결과 확인
  await page.waitForTimeout(1000);
});
```

#### 📝 시나리오: 주문 상태 변경
```javascript
test('관리자 - 주문 상태 변경 (입금 확인)', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/orders');

  // 1. "입금 대기" 필터
  await page.click('button:has-text("입금 대기")');

  // 2. 첫 번째 주문 선택
  const firstOrder = page.locator('[data-testid="order-row"]').first();
  await firstOrder.click();

  // 3. 주문 상세 페이지에서 상태 변경
  await page.selectOption('select[name="status"]', 'deposited');

  // 4. 저장 버튼
  await page.click('button:has-text("저장"), button:has-text("변경")');

  // 5. 성공 메시지
  await expect(page.locator('.toast')).toContainText(/변경|완료/);

  // 6. 주문 목록에서 상태 확인
  await page.goto('/admin/orders');
  await page.click('button:has-text("입금 확인")');

  // 방금 변경한 주문이 여기에 있어야 함
});
```

#### 📝 시나리오: 송장 번호 입력 (배송 시작)
```javascript
test('관리자 - 송장 번호 입력 및 배송 시작', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/orders');

  // 1. "입금 확인" 상태 필터
  await page.click('button:has-text("입금 확인")');

  // 2. 첫 번째 주문 상세
  await page.click('[data-testid="order-row"]:first-child');

  // 3. 송장 번호 입력
  await page.fill('input[name="tracking_number"]', '1234567890123');

  // 4. 택배사 선택
  await page.selectOption('select[name="shipping_company"]', 'CJ대한통운');

  // 5. 상태를 "배송 중"으로 변경
  await page.selectOption('select[name="status"]', 'shipped');

  // 6. 저장
  await page.click('button:has-text("저장")');

  // 7. 확인
  await expect(page.locator('.toast')).toContainText(/배송|시작/);
});
```

#### 📝 시나리오: 주문 수량 조정
```javascript
test('관리자 - 주문 아이템 수량 조정', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/orders/1'); // 특정 주문 상세

  // 1. 주문 아이템 수량 확인
  const quantityInput = page.locator('[data-testid="order-item-quantity"]').first();
  const originalQuantity = await quantityInput.inputValue();

  // 2. 수량 변경
  await quantityInput.clear();
  await quantityInput.fill('5');

  // 3. 저장
  await page.click('button:has-text("수량 조정 저장")');

  // 4. 금액 재계산 확인
  await page.waitForTimeout(1000);
  const totalAmount = page.locator('[data-testid="total-amount"]');
  await expect(totalAmount).toBeVisible();
});
```

---

### 2.4 발주 관리

#### 📝 시나리오: 발주서 생성 및 Excel 다운로드
```javascript
test('관리자 - 발주서 생성', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/purchase-orders');

  // 1. 발주 대상 주문 확인 (입금 확인 완료 주문)
  const availableOrders = page.locator('[data-testid="available-order"]');
  const orderCount = await availableOrders.count();

  console.log(`발주 가능 주문: ${orderCount}개`);

  // 2. 업체별 그룹 확인
  const supplierGroups = page.locator('[data-testid="supplier-group"]');
  expect(await supplierGroups.count()).toBeGreaterThan(0);

  // 3. 첫 번째 업체 발주서 다운로드
  const downloadPromise = page.waitForEvent('download');
  await page.click('[data-testid="supplier-group"]:first-child button:has-text("Excel")');

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('.xlsx');

  // 4. 발주 완료 후 이력 확인
  await page.goto('/admin/purchase-orders/history');
  const batches = page.locator('[data-testid="batch-row"]');
  expect(await batches.count()).toBeGreaterThan(0);
});
```

#### 📝 시나리오: 발주 이력 조회
```javascript
test('관리자 - 발주 이력 조회', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/purchase-orders/history');

  // 1. 발주 배치 목록
  const batches = page.locator('[data-testid="batch-row"]');

  if (await batches.count() > 0) {
    // 2. 첫 번째 배치 상세
    await batches.first().click();

    // 3. 포함된 주문 확인
    const orders = page.locator('[data-testid="batch-order"]');
    expect(await orders.count()).toBeGreaterThan(0);

    // 4. 수량 조정 내역 확인
    const adjustments = page.locator('[data-testid="quantity-adjustment"]');
    if (await adjustments.count() > 0) {
      console.log('수량 조정 내역이 있습니다');
    }
  }
});
```

---

### 2.5 쿠폰 관리

#### 📝 시나리오: 신규 쿠폰 생성
```javascript
test('관리자 - 신규 쿠폰 생성', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/coupons');

  // 1. 쿠폰 생성 버튼
  await page.click('button:has-text("쿠폰 생성")');

  // 2. 쿠폰 정보 입력
  await page.fill('[name="name"]', '테스트 쿠폰 ' + Date.now());
  await page.fill('[name="code"]', 'TEST' + Date.now());
  await page.fill('[name="discount_amount"]', '5000');
  await page.fill('[name="min_order_amount"]', '30000');

  // 3. 유효기간 설정
  await page.fill('[name="valid_from"]', '2025-10-01');
  await page.fill('[name="valid_until"]', '2025-12-31');

  // 4. 최대 사용 횟수
  await page.fill('[name="max_uses"]', '100');

  // 5. 저장
  await page.click('button:has-text("저장")');

  // 6. 생성 확인
  await expect(page.locator('.toast')).toContainText(/생성|성공/);
});
```

#### 📝 시나리오: 특정 사용자에게 쿠폰 배포
```javascript
test('관리자 - 사용자에게 쿠폰 배포', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/coupons/1'); // 특정 쿠폰

  // 1. 배포 버튼
  await page.click('button:has-text("배포")');

  // 2. 사용자 선택 (이메일 또는 ID)
  await page.fill('input[name="user_email"]', 'user@example.com');

  // 또는 여러 사용자에게 일괄 배포
  await page.fill('textarea[name="user_ids"]', '1,2,3,4,5');

  // 3. 배포 실행
  await page.click('button:has-text("배포 실행")');

  // 4. 배포 완료 확인
  await expect(page.locator('.toast')).toContainText(/배포|완료/);
});
```

---

### 2.6 통계 및 대시보드

#### 📝 시나리오: 관리자 대시보드 조회
```javascript
test('관리자 - 대시보드 통계 확인', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin');

  // 1. 주요 지표 확인
  const totalSales = page.locator('[data-testid="total-sales"]');
  await expect(totalSales).toBeVisible();

  const totalOrders = page.locator('[data-testid="total-orders"]');
  await expect(totalOrders).toBeVisible();

  const pendingOrders = page.locator('[data-testid="pending-orders"]');
  await expect(pendingOrders).toBeVisible();

  // 2. 그래프 확인
  const salesChart = page.locator('[data-testid="sales-chart"]');
  if (await salesChart.count() > 0) {
    await expect(salesChart).toBeVisible();
  }

  // 3. 최근 주문 목록
  const recentOrders = page.locator('[data-testid="recent-order"]');
  expect(await recentOrders.count()).toBeGreaterThan(0);
});
```

#### 📝 시나리오: 매출 통계 조회
```javascript
test('관리자 - 매출 통계 페이지', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/statistics');

  // 1. 기간 선택
  await page.fill('input[name="start_date"]', '2025-10-01');
  await page.fill('input[name="end_date"]', '2025-10-31');
  await page.click('button:has-text("조회")');

  // 2. 통계 데이터 확인
  await page.waitForTimeout(1000);

  const totalRevenue = page.locator('[data-testid="total-revenue"]');
  await expect(totalRevenue).toBeVisible();

  // 3. 상품별 매출
  const productSales = page.locator('[data-testid="product-sales"]');
  if (await productSales.count() > 0) {
    await expect(productSales).toBeVisible();
  }
});
```

---

## 3. 기능적 테스트

### 3.1 검색 기능

#### 📝 시나리오: 상품 검색
```javascript
test('상품 검색 기능', async ({ page }) => {
  await page.goto('/');

  // 1. 검색창에 키워드 입력
  const searchInput = page.locator('input[type="search"], input[placeholder*="검색"]');
  await searchInput.fill('라이브');

  // 2. 검색 버튼 클릭 또는 Enter
  await searchInput.press('Enter');

  // 3. 검색 결과 확인
  await page.waitForTimeout(1000);

  const searchResults = page.locator('[data-testid="product-card"]');
  expect(await searchResults.count()).toBeGreaterThan(0);

  // 4. 검색어가 결과에 포함되는지 확인
  const firstProduct = searchResults.first();
  const productTitle = await firstProduct.locator('.product-title, h2, h3').textContent();

  expect(productTitle.toLowerCase()).toContain('라이브');
});
```

---

### 3.2 정렬 및 필터링

#### 📝 시나리오: 상품 정렬
```javascript
test('상품 정렬 기능', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);

  // 1. 정렬 옵션 선택
  const sortSelect = page.locator('select[name="sort"], [data-testid="sort-select"]');

  if (await sortSelect.count() > 0) {
    // 2. 가격 낮은 순
    await sortSelect.selectOption('price_asc');
    await page.waitForTimeout(1000);

    // 첫 번째와 두 번째 상품 가격 비교
    const prices = await page.locator('[data-testid="price"]').allTextContents();
    const price1 = parseInt(prices[0].replace(/[^0-9]/g, ''));
    const price2 = parseInt(prices[1].replace(/[^0-9]/g, ''));

    expect(price1).toBeLessThanOrEqual(price2);

    // 3. 가격 높은 순
    await sortSelect.selectOption('price_desc');
    await page.waitForTimeout(1000);

    const pricesDesc = await page.locator('[data-testid="price"]').allTextContents();
    const priceDesc1 = parseInt(pricesDesc[0].replace(/[^0-9]/g, ''));
    const priceDesc2 = parseInt(pricesDesc[1].replace(/[^0-9]/g, ''));

    expect(priceDesc1).toBeGreaterThanOrEqual(priceDesc2);
  }
});
```

---

### 3.3 페이지네이션 및 무한 스크롤

#### 📝 시나리오: 무한 스크롤
```javascript
test('무한 스크롤 - 상품 추가 로딩', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);

  // 1. 초기 상품 개수
  const initialCount = await page.locator('[data-testid="product-card"]').count();

  // 2. 페이지 하단으로 스크롤
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  // 3. 추가 로딩 대기
  await page.waitForTimeout(2000);

  // 4. 상품 개수 증가 확인
  const afterScrollCount = await page.locator('[data-testid="product-card"]').count();

  expect(afterScrollCount).toBeGreaterThanOrEqual(initialCount);
});
```

---

### 3.4 라이브 방송 기능

#### 📝 시나리오: 라이브 방송 페이지 접근
```javascript
test('라이브 방송 페이지', async ({ page }) => {
  await page.goto('/live');

  // 1. 라이브 방송 목록 확인
  const liveStreams = page.locator('[data-testid="live-stream"]');

  if (await liveStreams.count() > 0) {
    // 2. 진행 중인 라이브 확인
    const activeLive = page.locator('[data-testid="live-stream"].active, .live-badge');

    if (await activeLive.count() > 0) {
      // 3. 라이브 방송 입장
      await activeLive.first().click();

      // 4. 비디오 플레이어 확인
      const videoPlayer = page.locator('video, iframe[src*="youtube"], iframe[src*="twitch"]');
      await expect(videoPlayer).toBeVisible();

      // 5. 채팅창 확인
      const chatBox = page.locator('[data-testid="chat-box"]');
      if (await chatBox.count() > 0) {
        await expect(chatBox).toBeVisible();
      }

      // 6. 상품 목록 확인 (라이브 중 판매 상품)
      const liveProducts = page.locator('[data-testid="live-product"]');
      if (await liveProducts.count() > 0) {
        await expect(liveProducts.first()).toBeVisible();
      }
    }
  }
});
```

---

## 4. 상황적 테스트 (Edge Cases)

### 4.1 에러 처리

#### 📝 시나리오: 재고 부족 상품 구매 시도
```javascript
test('재고 부족 - 구매 불가 처리', async ({ page }) => {
  await page.goto('/products/out-of-stock'); // 재고 없는 상품

  // 1. 구매 버튼 비활성화 확인
  const buyButton = page.locator('button:has-text("구매")');
  await expect(buyButton).toBeDisabled();

  // 2. 품절 메시지 확인
  const outOfStockMessage = page.locator('.out-of-stock, [data-testid="stock-status"]');
  await expect(outOfStockMessage).toContainText(/품절|재고 없음/);
});
```

#### 📝 시나리오: 잘못된 쿠폰 코드 입력
```javascript
test('잘못된 쿠폰 코드 - 에러 메시지', async ({ page, context }) => {
  await context.addCookies([/* 테스트 쿠키 */]);

  await page.goto('/checkout');

  // 1. 쿠폰 코드 입력
  await page.fill('input[name="coupon_code"]', 'INVALID_CODE_12345');

  // 2. 적용 버튼 클릭
  await page.click('button:has-text("적용")');

  // 3. 에러 메시지 확인
  await expect(page.locator('.error, .toast')).toContainText(/유효하지 않음|존재하지 않음/);
});
```

#### 📝 시나리오: 최소 주문 금액 미달
```javascript
test('최소 주문 금액 미달 - 쿠폰 적용 불가', async ({ page, context }) => {
  await context.addCookies([/* 테스트 쿠키 */]);

  await page.goto('/checkout');

  // 1. 주문 금액 확인 (예: 20,000원)
  const totalAmount = await page.locator('[data-testid="subtotal"]').textContent();
  const amount = parseInt(totalAmount.replace(/[^0-9]/g, ''));

  // 2. 최소 주문 금액 30,000원 쿠폰 선택 시도
  await page.click('button:has-text("쿠폰")');

  // 최소 주문 금액이 높은 쿠폰 선택
  const expensiveCoupon = page.locator('[data-testid="coupon-item"]:has-text("30,000")');

  if (await expensiveCoupon.count() > 0) {
    await expensiveCoupon.click();
    await page.click('button:has-text("적용")');

    // 3. 에러 메시지
    await expect(page.locator('.error')).toContainText(/최소 주문 금액/);
  }
});
```

---

### 4.2 네트워크 에러 처리

#### 📝 시나리오: 네트워크 오프라인
```javascript
test('오프라인 상태 - 에러 처리', async ({ page, context }) => {
  await page.goto('/');

  // 1. 오프라인 설정
  await context.setOffline(true);

  // 2. 페이지 새로고침 시도
  await page.reload().catch(() => {});

  // 3. 오프라인 메시지 또는 캐시된 콘텐츠 확인
  // (Service Worker 구현 여부에 따라 다름)

  // 4. 온라인 복구
  await context.setOffline(false);
  await page.reload();

  // 페이지 정상 로드 확인
  await expect(page.locator('body')).toBeVisible();
});
```

---

### 4.3 동시성 테스트

#### 📝 시나리오: 동시 주문 - 재고 차감 정확성
```javascript
test('동시 주문 - 재고 정확성 (FOR UPDATE 락)', async ({ browser }) => {
  // 여러 브라우저 컨텍스트 생성
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // 동일 상품 페이지 접근
  await Promise.all([
    page1.goto('/products/1'),
    page2.goto('/products/1')
  ]);

  // 동시에 구매 시도
  await Promise.all([
    page1.click('button:has-text("구매")'),
    page2.click('button:has-text("구매")')
  ]);

  // 두 주문 모두 성공하거나, 하나는 재고 부족으로 실패해야 함

  await context1.close();
  await context2.close();
});
```

---

### 4.4 보안 테스트

#### 📝 시나리오: SQL Injection 방어
```javascript
test('SQL Injection 방어 - 검색 기능', async ({ page }) => {
  await page.goto('/');

  // 1. SQL Injection 시도
  const searchInput = page.locator('input[type="search"]');
  await searchInput.fill("' OR '1'='1");
  await searchInput.press('Enter');

  // 2. 정상적인 에러 또는 빈 결과 반환 (SQL 에러 없음)
  await page.waitForTimeout(1000);

  // SQL 에러 메시지가 화면에 표시되지 않아야 함
  const bodyText = await page.locator('body').textContent();
  expect(bodyText).not.toContain('SQL');
  expect(bodyText).not.toContain('syntax error');
});
```

#### 📝 시나리오: XSS 방어
```javascript
test('XSS 방어 - 상품명 스크립트 주입', async ({ page, context }) => {
  await context.addCookies([/* 관리자 쿠키 */]);

  await page.goto('/admin/products/new');

  // 1. 상품명에 스크립트 태그 입력
  await page.fill('[name="title"]', '<script>alert("XSS")</script>테스트');
  await page.fill('[name="price"]', '10000');
  await page.click('button:has-text("저장")');

  // 2. 상품 페이지에서 확인
  await page.goto('/products/최근생성상품ID');

  // 3. 스크립트가 실행되지 않고 텍스트로 표시되어야 함
  const title = await page.locator('h1').textContent();
  expect(title).toContain('<script>');

  // alert가 실행되지 않음 (실행되면 테스트 실패)
});
```

---

### 4.5 브라우저 호환성

#### 📝 시나리오: 다양한 브라우저에서 테스트
```javascript
// playwright.config.js에서 설정된 브라우저별 자동 실행

test('크로스 브라우저 - 상품 구매', async ({ page, browserName }) => {
  console.log(`현재 브라우저: ${browserName}`);

  await page.goto('/');
  await page.waitForTimeout(3000);

  // 모든 브라우저에서 동일하게 작동해야 함
  await page.click('[data-testid="product-card"]');
  await page.click('button:has-text("구매")');

  await expect(page).toHaveURL(/\/checkout/);
});
```

---

## 5. 성능 및 최적화 테스트

### 5.1 로드 시간 측정

#### 📝 시나리오: 페이지 로드 성능
```javascript
test('성능 - 페이지 로드 시간 측정', async ({ page }) => {
  const startTime = Date.now();

  await page.goto('/');

  // 로딩 완료 대기
  await page.waitForLoadState('networkidle');

  const loadTime = Date.now() - startTime;

  console.log(`페이지 로드 시간: ${loadTime}ms`);

  // 3초 이내 로드
  expect(loadTime).toBeLessThan(3000);
});
```

#### 📝 시나리오: Lighthouse 성능 측정
```javascript
test('Lighthouse 성능 측정', async ({ page }) => {
  await page.goto('/');

  // Playwright Lighthouse 플러그인 사용
  // npm install playwright-lighthouse

  const { playAudit } = require('playwright-lighthouse');

  await playAudit({
    page,
    thresholds: {
      performance: 50,
      accessibility: 80,
      'best-practices': 80,
      seo: 80,
    },
  });
});
```

---

### 5.2 네트워크 최적화

#### 📝 시나리오: 네트워크 요청 수 확인
```javascript
test('네트워크 최적화 - 요청 수 제한', async ({ page }) => {
  let requestCount = 0;

  page.on('request', () => {
    requestCount++;
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  console.log(`총 네트워크 요청 수: ${requestCount}`);

  // 50개 이하
  expect(requestCount).toBeLessThan(50);
});
```

#### 📝 시나리오: 이미지 최적화
```javascript
test('이미지 최적화 - WebP 포맷 사용', async ({ page }) => {
  await page.goto('/');

  const images = await page.locator('img').all();

  for (const img of images) {
    const src = await img.getAttribute('src');

    // WebP 또는 최적화된 포맷 사용 확인
    if (src && !src.startsWith('data:')) {
      console.log(`이미지 URL: ${src}`);
      // WebP, AVIF 등 최적화된 포맷 권장
    }
  }
});
```

---

## 6. 접근성 및 SEO 테스트

### 6.1 접근성 (A11y)

#### 📝 시나리오: Axe 접근성 테스트
```javascript
test('접근성 - Axe 자동 테스트', async ({ page }) => {
  await page.goto('/');

  // npm install @axe-core/playwright
  const { injectAxe, checkA11y } = require('axe-playwright');

  await injectAxe(page);
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: {
      html: true,
    },
  });
});
```

---

## 7. 테스트 작성 템플릿

### 기본 템플릿

```javascript
import { test, expect } from '@playwright/test';

test.describe('기능명', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전 실행
    await page.goto('/');
  });

  test('테스트 시나리오 설명', async ({ page }) => {
    // Given (준비)

    // When (실행)

    // Then (검증)
    await expect(page.locator('...')).toBeVisible();
  });
});
```

---

## 8. CI/CD 통합

### GitHub Actions 예제

```yaml
name: E2E Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npm test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📝 테스트 실행 가이드

### 로컬 실행
```bash
# 전체 테스트
npm test

# UI 모드 (추천)
npm run test:ui

# 특정 파일만
npm test tests/user-journey.spec.js

# 디버그 모드
npm run test:debug

# 리포트 확인
npm run test:report
```

---

**마지막 업데이트**: 2025-10-06
**문서 버전**: 1.0.0
