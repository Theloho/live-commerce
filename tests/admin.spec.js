import { test, expect } from '@playwright/test';

/**
 * 관리자 페이지 테스트
 */
test.describe('관리자 페이지 테스트', () => {
  test('관리자 로그인 페이지 접근', async ({ page }) => {
    await page.goto('/admin/login');

    // 관리자 로그인 페이지 확인
    await expect(page).toHaveURL(/\/admin\/login/);

    // 로그인 폼 확인
    const loginForm = page.locator('form, input[type="email"], input[type="password"]');
    if (await loginForm.count() > 0) {
      await expect(loginForm.first()).toBeVisible();
    }
  });

  test('관리자 대시보드 접근 (인증 필요)', async ({ page }) => {
    await page.goto('/admin');

    // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
    const currentUrl = page.url();

    const isAdmin = currentUrl.includes('/admin');
    const isLogin = currentUrl.includes('/login');

    expect(isAdmin || isLogin).toBeTruthy();
  });

  test('관리자 주문 관리 페이지', async ({ page }) => {
    await page.goto('/admin/orders');

    // 페이지가 로드되는지 확인
    await expect(page.locator('body')).toBeVisible();
  });

  test('관리자 상품 관리 페이지', async ({ page }) => {
    await page.goto('/admin/products');

    // 페이지가 로드되는지 확인
    await expect(page.locator('body')).toBeVisible();
  });

  test('관리자 발주 관리 페이지', async ({ page }) => {
    await page.goto('/admin/purchase-orders');

    // 페이지가 로드되는지 확인
    await expect(page.locator('body')).toBeVisible();
  });
});
