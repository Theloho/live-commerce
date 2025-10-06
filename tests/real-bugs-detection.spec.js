/**
 * 실제 경험한 버그 자동 탐지 테스트
 *
 * 이 테스트는 WORK_LOG_2025-10-06_UNSOLVED.md에 기록된
 * 실제 버그 8개를 자동으로 탐지합니다.
 *
 * 참고: docs/PLAYWRIGHT_DATA_VALIDATION_TESTS.md
 */

import { test, expect } from '@playwright/test';

// 테스트용 카카오 사용자 토큰 (실제 환경에 맞게 수정 필요)
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || '';
const TEST_USER_REFRESH_TOKEN = process.env.TEST_USER_REFRESH_TOKEN || '';
const TEST_USER_KAKAO_ID = process.env.TEST_USER_KAKAO_ID || '';

/**
 * 사용자 세션 설정 헬퍼 함수
 * Supabase localStorage에 세션 직접 주입
 * @param {string} postalCode - 우편번호 (배송비 계산용)
 */
async function setUserSession(page, accessToken = TEST_USER_TOKEN, refreshToken = TEST_USER_REFRESH_TOKEN, postalCode = '06000') {
  if (!accessToken) return;

  // Supabase 세션 객체 생성
  const session = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: '8542d1dd-e5ca-4434-b486-7ef4ed91da21', // TEST_USER_KAKAO_ID에 해당하는 user
      email: 'jay.machine@gmail.com',
      user_metadata: {
        kakao_id: TEST_USER_KAKAO_ID,
        name: '김진태',
        nickname: '기부자',
        provider: 'kakao'
      }
    }
  };

  // localStorage에 Supabase 세션 저장
  await page.addInitScript((sessionData, postal) => {
    const supabaseKey = 'sb-xoinislnaxllijlnjeue-auth-token';
    localStorage.setItem(supabaseKey, JSON.stringify(sessionData));

    // sessionStorage에도 user 정보 저장 (useAuth 호환성)
    const userData = {
      id: sessionData.user.id,
      email: sessionData.user.email,
      name: sessionData.user.user_metadata.name,
      nickname: sessionData.user.user_metadata.nickname,
      phone: '01012345678', // 테스트 데이터
      address: '서울시 강남구',
      detail_address: '테스트동 123호',
      postal_code: postal, // 동적 우편번호
      avatar_url: '',
      provider: 'kakao',
      kakao_id: sessionData.user.user_metadata.kakao_id,
      // AddressManager용 주소 목록
      addresses: [{
        id: 1,
        label: '기본 배송지',
        address: '서울시 강남구',
        detail_address: '테스트동 123호',
        postal_code: postal,
        is_default: true
      }]
    };
    sessionStorage.setItem('user', JSON.stringify(userData));
  }, session, postalCode);
}

/**
 * 🐛 버그 #1, #3: 프로필 로딩 실패 (BuyBottomSheet, 체크아웃)
 *
 * 증상: name, phone 필드가 빈값
 * 원인: sessionStorage 동기화 문제, DB 조회 실패
 * 탐지: 로그인 후 프로필 필드 검증
 */
test.describe('🐛 버그 #1, #3: 프로필 로딩 검증', () => {
  test('로그인 후 프로필 데이터 로딩 확인 (name, phone)', async ({ page }) => {
    // 사용자 세션 설정 (localStorage + sessionStorage)
    await setUserSession(page);

    // 체크아웃 페이지 접근
    await page.goto('/checkout');
    await page.waitForTimeout(3000); // CSR 로딩 대기

    // 🔍 실제 페이지 구조: 프로필 정보는 <p> 태그로 읽기 전용 표시
    // 배송지 정보 섹션에서 이름과 전화번호 찾기
    const deliverySection = page.locator('div:has(> div:has-text("배송지"))');

    // 이름과 전화번호 텍스트 추출
    const nameText = await deliverySection.locator('p.font-medium.text-gray-900').first().textContent();
    const phoneText = await deliverySection.locator('p.text-gray-600').first().textContent();

    console.log('🔍 프로필 데이터:', { name: nameText, phone: phoneText });

    // 🚨 실제 버그 탐지: 값이 비어있으면 실패
    expect(nameText).toBeTruthy();
    expect(nameText).not.toBe('');
    expect(nameText).not.toBe('사용자'); // 기본값이 아닌지
    expect(phoneText).toBeTruthy();
    expect(phoneText).not.toBe('');
    expect(phoneText).toMatch(/010/); // 전화번호 포함 확인
  });

  test('BuyBottomSheet 프로필 로딩 확인', async ({ page }) => {
    await setUserSession(page);

    // 홈페이지 → 상품 클릭 → 구매 버튼
    await page.goto('/');
    await page.waitForTimeout(3000);

    // 상품 카드 클릭
    const productCard = page.locator('[data-testid="product-card"]').first();
    if (await productCard.count() > 0) {
      await productCard.click();
      await page.waitForTimeout(1000);

      // 구매하기 버튼 클릭
      await page.click('button:has-text("구매")');
      await page.waitForTimeout(1000);

      // BuyBottomSheet 프로필 확인
      // (BuyBottomSheet가 sessionStorage에서 프로필 로드)
      const sessionStorage = await page.evaluate(() => {
        return JSON.parse(sessionStorage.getItem('userProfile') || '{}');
      });

      console.log('🔍 SessionStorage 프로필:', sessionStorage);

      // 🚨 버그 탐지: sessionStorage에 phone, address 있는지
      expect(sessionStorage.phone).toBeTruthy();
      expect(sessionStorage.phone).not.toBe('');
    }
  });
});

/**
 * 🐛 버그 #4: 배송비 계산 오류
 *
 * 증상: 도서산간 비용 미반영 (제주 +3000, 울릉도 +5000)
 * 원인: postalCode 전달 안됨, formatShippingInfo 로직 오류
 * 탐지: 우편번호별 배송비 계산 검증
 */
test.describe('🐛 버그 #4: 배송비 계산 검증', () => {
  test('기본 배송비 계산 (서울)', async ({ page }) => {
    // 서울 우편번호로 세션 설정
    await setUserSession(page, TEST_USER_TOKEN, TEST_USER_REFRESH_TOKEN, '06000');

    await page.goto('/checkout');
    await page.waitForTimeout(3000);

    // 🔍 배송비 확인 (자동 계산됨)
    const shippingFeeElement = page.locator('p.font-medium.text-gray-900:has-text("₩")').filter({ hasText: /^₩\d/ }).nth(1);
    const shippingFeeText = await shippingFeeElement.textContent();
    console.log('🔍 서울 배송비:', shippingFeeText);

    // 기본 배송비 4000원
    expect(shippingFeeText).toContain('4,000');
  });

  test('제주 도서산간 배송비 계산 (+3,000원)', async ({ page }) => {
    // 제주 우편번호로 세션 설정
    await setUserSession(page, TEST_USER_TOKEN, TEST_USER_REFRESH_TOKEN, '63000');

    await page.goto('/checkout');
    await page.waitForTimeout(3000);

    // 🚨 버그 탐지: 제주 배송비가 7000원이어야 함
    const shippingFeeElement = page.locator('p.font-medium.text-gray-900:has-text("₩")').filter({ hasText: /^₩\d/ }).nth(1);
    const shippingFeeText = await shippingFeeElement.textContent();
    console.log('🔍 제주 배송비:', shippingFeeText);

    // 기본 4000 + 제주 3000 = 7000원
    expect(shippingFeeText).toContain('7,000');
  });

  test('울릉도 도서산간 배송비 계산 (+5,000원)', async ({ page }) => {
    // 울릉도 우편번호로 세션 설정
    await setUserSession(page, TEST_USER_TOKEN, TEST_USER_REFRESH_TOKEN, '40200');

    await page.goto('/checkout');
    await page.waitForTimeout(3000);

    // 🚨 버그 탐지: 울릉도 배송비가 9000원이어야 함
    const shippingFeeElement = page.locator('p.font-medium.text-gray-900:has-text("₩")').filter({ hasText: /^₩\d/ }).nth(1);
    const shippingFeeText = await shippingFeeElement.textContent();
    console.log('🔍 울릉도 배송비:', shippingFeeText);

    // 기본 4000 + 울릉도 5000 = 9000원
    expect(shippingFeeText).toContain('9,000');
  });

  test('전체 주문 금액 계산 검증 (배송비 포함)', async ({ page }) => {
    // 울릉도 우편번호로 세션 설정
    await setUserSession(page, TEST_USER_TOKEN, TEST_USER_REFRESH_TOKEN, '40200');

    await page.goto('/checkout');
    await page.waitForTimeout(3000);

    // 금액 확인 (체크아웃 페이지 결제 정보 섹션)
    const paymentSection = page.locator('div:has-text("결제 정보")').last();
    const amountTexts = await paymentSection.locator('p.text-gray-900').allTextContents();

    console.log('🔍 금액 계산:', amountTexts);

    // 최소한 배송비가 9000원인지 확인
    const shippingFeeElement = page.locator('p.font-medium.text-gray-900:has-text("₩")').filter({ hasText: /^₩\d/ }).nth(1);
    const shippingFeeText = await shippingFeeElement.textContent();
    expect(shippingFeeText).toContain('9,000'); // 울릉도 배송비
  });
});

/**
 * 🐛 버그 #5, #6: 장바구니 주문 병합 / 주문 생성 실패
 *
 * 증상: 동일 상품 3개 선택 → 3개 별도 주문 생성
 * 원인: 병합 로직 오류
 * 탐지: 장바구니에서 주문 생성 시 주문 개수 확인
 */
test.describe('🐛 버그 #5, #6: 장바구니 주문 생성 검증', () => {
  test('여러 상품 장바구니 담기 → 1개 주문 생성 확인', async ({ page }) => {
    await setUserSession(page);

    // 주문 전 개수 확인
    await page.goto('/orders');
    await page.waitForTimeout(3000);
    const ordersBefore = await page.locator('[data-testid="order-item"]').count();
    console.log('🔍 주문 전 개수:', ordersBefore);

    // 홈페이지에서 상품 3개 장바구니에 담기
    await page.goto('/');
    await page.waitForTimeout(3000);

    const productCards = page.locator('[data-testid="product-card"]');
    const productCount = await productCards.count();

    if (productCount >= 3) {
      // 첫 3개 상품 장바구니 추가
      for (let i = 0; i < 3; i++) {
        await productCards.nth(i).click();
        await page.waitForTimeout(500);
        await page.click('button:has-text("장바구니")');
        await page.waitForTimeout(1000);
        await page.goBack();
        await page.waitForTimeout(1000);
      }

      // 장바구니 페이지로 이동
      await page.goto('/cart');
      await page.waitForTimeout(2000);

      // 전체 선택 후 주문하기
      await page.click('button:has-text("전체선택")');
      await page.click('button:has-text("주문하기")');
      await page.waitForTimeout(3000);

      // 체크아웃 완료
      if (await page.locator('button:has-text("주문하기")').count() > 0) {
        await page.click('button:has-text("주문하기")');
        await page.waitForTimeout(3000);
      }

      // 주문 후 개수 확인
      await page.goto('/orders');
      await page.waitForTimeout(3000);
      const ordersAfter = await page.locator('[data-testid="order-item"]').count();
      console.log('🔍 주문 후 개수:', ordersAfter);

      // 🚨 버그 탐지: 1개 주문만 생성되어야 함 (3개 아님!)
      expect(ordersAfter).toBe(ordersBefore + 1);
      // 만약 3개가 생성되면 실패 → 버그 탐지 성공
    }
  });
});

/**
 * 🐛 버그 #2: 주문 수량 조정 실패
 *
 * 증상: "주문 아이템을 찾을 수 없습니다" 에러
 * 원인: RLS UPDATE 정책 문제, auth.uid() NULL
 * 탐지: 관리자 페이지에서 수량 조정 시도
 */
test.describe('🐛 버그 #2: 주문 수량 조정 검증', () => {
  test('관리자 주문 수량 조정 기능 확인', async ({ page }) => {
    // 관리자 로그인 필요
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
    const ADMIN_REFRESH_TOKEN = process.env.ADMIN_REFRESH_TOKEN || '';
    await setUserSession(page, ADMIN_TOKEN, ADMIN_REFRESH_TOKEN);

    // 관리자 주문 관리 페이지
    await page.goto('/admin/orders');
    await page.waitForTimeout(3000);

    // 첫 번째 주문 클릭
    const firstOrder = page.locator('[data-testid="order-row"]').first();
    if (await firstOrder.count() > 0) {
      await firstOrder.click();
      await page.waitForTimeout(2000);

      // 수량 조정 버튼 클릭
      const quantityInput = page.locator('input[type="number"]').first();
      if (await quantityInput.count() > 0) {
        const currentQuantity = await quantityInput.inputValue();
        console.log('🔍 현재 수량:', currentQuantity);

        // 수량 변경
        await quantityInput.fill((parseInt(currentQuantity) + 1).toString());
        await page.click('button:has-text("수량 변경")');
        await page.waitForTimeout(2000);

        // 🚨 버그 탐지: 에러 메시지 확인
        const errorMessage = await page.locator('text=주문 아이템을 찾을 수 없습니다').count();

        // 에러가 나타나면 버그 탐지 성공
        expect(errorMessage).toBe(0);
      }
    }
  });
});

/**
 * 🐛 버그 #7: 관리자 쿠폰 배포 실패
 *
 * 증상: 권한 에러 발생
 * 원인: user_coupons INSERT RLS 정책 문제
 * 탐지: 관리자 쿠폰 배포 시도
 */
test.describe('🐛 버그 #7: 관리자 쿠폰 배포 검증', () => {
  test('관리자 쿠폰 배포 기능 확인', async ({ page }) => {
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
    const ADMIN_REFRESH_TOKEN = process.env.ADMIN_REFRESH_TOKEN || '';
    if (ADMIN_TOKEN) {
      await setUserSession(page, ADMIN_TOKEN, ADMIN_REFRESH_TOKEN);
    }

    // 관리자 쿠폰 관리 페이지
    await page.goto('/admin/coupons');
    await page.waitForTimeout(3000);

    // 쿠폰 배포 버튼
    const distributeCouponBtn = page.locator('button:has-text("쿠폰 배포")');
    if (await distributeCouponBtn.count() > 0) {
      await distributeCouponBtn.click();
      await page.waitForTimeout(1000);

      // 사용자 선택 후 배포
      // (실제 구현에 따라 선택자 수정 필요)
      await page.click('button:has-text("배포 확인")');
      await page.waitForTimeout(2000);

      // 🚨 버그 탐지: 권한 에러 확인
      const permissionError = await page.locator('text=권한이 없습니다').count();
      const rlsError = await page.locator('text=RLS').count();

      expect(permissionError).toBe(0);
      expect(rlsError).toBe(0);
    }
  });
});

/**
 * 🐛 버그 #8: Auth 세션 상태 불명확
 *
 * 증상: auth.uid() NULL 가능성
 * 원인: 세션 유지 실패
 * 탐지: 로그인 후 세션 확인
 */
test.describe('🐛 버그 #8: Auth 세션 검증', () => {
  test('로그인 후 세션 유지 확인', async ({ page }) => {
    await setUserSession(page);

    // 여러 페이지 이동 후에도 세션 유지되는지 확인
    const pages = ['/', '/checkout', '/orders', '/mypage'];

    for (const path of pages) {
      await page.goto(path);
      await page.waitForTimeout(2000);

      // 🚨 버그 탐지: 로그인 페이지로 리다이렉트되지 않아야 함
      const currentUrl = page.url();
      console.log(`🔍 ${path} 접근 후 URL:`, currentUrl);

      expect(currentUrl).not.toContain('/login');
      expect(currentUrl).not.toContain('/auth/callback');
    }
  });

  test('페이지 새로고침 후에도 세션 유지', async ({ page }) => {
    await setUserSession(page);

    await page.goto('/mypage');
    await page.waitForTimeout(3000);

    // 새로고침
    await page.reload();
    await page.waitForTimeout(3000);

    // 🚨 버그 탐지: 로그인 페이지로 리다이렉트되지 않아야 함
    const currentUrl = page.url();
    console.log('🔍 새로고침 후 URL:', currentUrl);

    expect(currentUrl).toContain('/mypage');
    expect(currentUrl).not.toContain('/login');
  });
});

/**
 * 종합 E2E 테스트: 전체 구매 플로우
 *
 * 모든 실제 버그를 한 번에 검증
 */
test.describe('🎯 종합 E2E: 전체 구매 플로우 (모든 버그 검증)', () => {
  test('상품 선택 → 체크아웃 → 주문 완료 (전체 검증)', async ({ page }) => {
    // 제주 우편번호로 세션 설정
    await setUserSession(page, TEST_USER_TOKEN, TEST_USER_REFRESH_TOKEN, '63000');

    // 1. 홈페이지 접근
    await page.goto('/');
    await page.waitForTimeout(3000);

    // 2. 상품 선택
    const productCard = page.locator('[data-testid="product-card"]').first();
    await productCard.click();
    await page.waitForTimeout(2000);

    // 3. 구매 버튼 클릭
    await page.click('button:has-text("구매")');
    await page.waitForTimeout(2000);

    // 4. 체크아웃 페이지 확인
    await expect(page).toHaveURL(/\/checkout/);

    // 🔍 버그 #1, #3 검증: 프로필 데이터 (읽기 전용 표시)
    const deliverySection = page.locator('div:has(> div:has-text("배송지"))');
    const nameText = await deliverySection.locator('p.font-medium.text-gray-900').first().textContent();
    const phoneText = await deliverySection.locator('p.text-gray-600').first().textContent();
    console.log('✅ 프로필 검증:', { name: nameText, phone: phoneText });
    expect(nameText).toBeTruthy();
    expect(phoneText).toBeTruthy();

    // 5. 배송비는 이미 세션의 우편번호(제주 63000)로 자동 계산됨

    // 🔍 버그 #4 검증: 배송비 계산
    const shippingFeeElement = page.locator('p.font-medium.text-gray-900:has-text("₩")').filter({ hasText: /^₩\d/ }).nth(1);
    const shippingFeeText = await shippingFeeElement.textContent();
    console.log('✅ 배송비 검증:', shippingFeeText);
    expect(shippingFeeText).toContain('7,000'); // 제주 = 4000 + 3000

    // 6. 주문하기 클릭
    await page.click('button:has-text("주문하기")');
    await page.waitForTimeout(3000);

    // 🔍 버그 #6 검증: 주문 생성 성공
    await expect(page).toHaveURL(/\/orders\/\d+\/complete/);
    console.log('✅ 주문 생성 성공');

    // 7. 주문 상세 확인
    const orderNumber = await page.locator('[data-testid="order-number"]').textContent();
    console.log('✅ 주문 번호:', orderNumber);
    expect(orderNumber).toBeTruthy();
  });
});
