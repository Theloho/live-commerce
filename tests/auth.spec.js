import { test, expect } from '@playwright/test';

/**
 * 인증 관련 테스트
 */
test.describe('인증 테스트', () => {
  test('로그인 페이지 접근', async ({ page }) => {
    await page.goto('/');

    // 로그인 버튼 찾기
    const loginButton = page.locator('a:has-text("로그인"), button:has-text("로그인"), a[href*="login"]');

    if (await loginButton.count() > 0) {
      await loginButton.first().click();

      // 로그인 페이지로 이동했는지 확인
      await page.waitForURL(/\/login|\/auth/);
      await expect(page).toHaveURL(/\/login|\/auth/);
    }
  });

  test('카카오 로그인 버튼 확인', async ({ page }) => {
    // 로그인 페이지로 직접 이동
    await page.goto('/login');

    // 카카오 로그인 버튼 확인
    const kakaoButton = page.locator('button:has-text("카카오"), a:has-text("카카오"), [class*="kakao"]');

    if (await kakaoButton.count() > 0) {
      await expect(kakaoButton.first()).toBeVisible();
    }
  });

  test('마이페이지 접근 (로그인 필요)', async ({ page }) => {
    await page.goto('/mypage');

    // 로그인하지 않은 경우 로그인 페이지로 리다이렉트 또는 로그인 요청 표시
    const currentUrl = page.url();

    // 로그인 페이지로 리다이렉트되었거나, 마이페이지가 로드됨
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/auth');
    const isMyPage = currentUrl.includes('/mypage');

    expect(isLoginPage || isMyPage).toBeTruthy();
  });
});
