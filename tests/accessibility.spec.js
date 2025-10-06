import { test, expect } from '@playwright/test';

/**
 * 접근성 (Accessibility) 테스트
 */
test.describe('접근성 테스트', () => {
  test('페이지 언어 속성 확인', async ({ page }) => {
    await page.goto('/');

    // HTML lang 속성 확인
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBeTruthy();
    expect(htmlLang).toMatch(/ko|en/);
  });

  test('이미지 alt 속성 확인', async ({ page }) => {
    await page.goto('/');

    // 모든 이미지에 alt 속성이 있는지 확인
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < Math.min(imageCount, 10); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');

      // alt 속성이 있어야 함 (빈 문자열도 허용)
      expect(alt).not.toBeNull();
    }
  });

  test('키보드 네비게이션 테스트', async ({ page }) => {
    await page.goto('/');

    // Tab 키로 포커스 이동
    await page.keyboard.press('Tab');

    // 포커스된 요소가 있는지 확인
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('버튼 및 링크 접근성', async ({ page }) => {
    await page.goto('/');

    // 클릭 가능한 요소에 적절한 role이나 태그가 있는지 확인
    const buttons = page.locator('button, a, [role="button"]');
    const buttonCount = await buttons.count();

    expect(buttonCount).toBeGreaterThan(0);

    // 첫 번째 버튼이 클릭 가능한지 확인
    await expect(buttons.first()).toBeEnabled();
  });

  test('폼 레이블 확인', async ({ page }) => {
    // 로그인 페이지로 이동 (폼이 있는 페이지)
    await page.goto('/login');

    // input 요소 확인
    const inputs = page.locator('input[type="email"], input[type="password"], input[type="text"]');

    if (await inputs.count() > 0) {
      for (let i = 0; i < await inputs.count(); i++) {
        const input = inputs.nth(i);

        // label, aria-label, placeholder 중 하나가 있어야 함
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const placeholder = await input.getAttribute('placeholder');

        let hasLabel = false;
        if (id) {
          hasLabel = await page.locator(`label[for="${id}"]`).count() > 0;
        }

        expect(hasLabel || ariaLabel || placeholder).toBeTruthy();
      }
    }
  });

  test('색상 대비 확인 (기본 텍스트)', async ({ page }) => {
    await page.goto('/');

    // 텍스트가 보이는지 확인
    const bodyText = page.locator('body');
    await expect(bodyText).toBeVisible();

    // 기본 텍스트 색상 확인
    const color = await bodyText.evaluate((el) => window.getComputedStyle(el).color);
    expect(color).toBeTruthy();
  });
});
