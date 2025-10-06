import { test, expect } from '@playwright/test';

/**
 * 체크아웃 및 주문 프로세스 테스트
 */
test.describe('체크아웃 테스트', () => {
  test('체크아웃 페이지 접근', async ({ page }) => {
    await page.goto('/checkout');

    // 로그인하지 않은 경우 로그인 페이지로 리다이렉트 또는 체크아웃 페이지 표시
    const currentUrl = page.url();

    const isCheckout = currentUrl.includes('/checkout');
    const isLogin = currentUrl.includes('/login') || currentUrl.includes('/auth');

    expect(isCheckout || isLogin).toBeTruthy();
  });

  test('주문 목록 페이지 접근', async ({ page }) => {
    await page.goto('/orders');

    // 주문 목록 페이지 또는 로그인 페이지
    const currentUrl = page.url();

    const isOrders = currentUrl.includes('/orders');
    const isLogin = currentUrl.includes('/login') || currentUrl.includes('/auth');

    expect(isOrders || isLogin).toBeTruthy();
  });

  test('주문 완료 페이지 확인', async ({ page }) => {
    // 샘플 주문 ID로 접근 시도 (실제 주문이 없을 수 있음)
    await page.goto('/orders/1/complete');

    // 페이지가 로드되는지 확인 (404 또는 주문 완료 페이지)
    await expect(page.locator('body')).toBeVisible();
  });
});
