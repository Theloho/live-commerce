import { test, expect } from '@playwright/test';

/**
 * 성능 및 최적화 테스트
 */
test.describe('성능 테스트', () => {
  test('홈페이지 로드 시간 측정', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    const loadTime = Date.now() - startTime;

    // 5초 이내에 로드되어야 함
    expect(loadTime).toBeLessThan(5000);

    console.log(`홈페이지 로드 시간: ${loadTime}ms`);
  });

  test('이미지 Lazy Loading 확인', async ({ page }) => {
    await page.goto('/');

    // 스크롤하기 전 이미지 개수
    const initialImages = await page.locator('img[loading="lazy"]').count();

    // 페이지 하단으로 스크롤
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // 스크롤 후 이미지 개수
    const afterScrollImages = await page.locator('img[loading="lazy"]').count();

    console.log(`초기 Lazy 이미지: ${initialImages}, 스크롤 후: ${afterScrollImages}`);
  });

  test('네트워크 요청 최적화 확인', async ({ page }) => {
    let requestCount = 0;

    page.on('request', () => {
      requestCount++;
    });

    await page.goto('/');

    console.log(`총 네트워크 요청 수: ${requestCount}`);

    // 과도한 요청이 없는지 확인 (예: 100개 이하)
    expect(requestCount).toBeLessThan(100);
  });

  test('Console 에러 확인', async ({ page }) => {
    const consoleErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // 콘솔 에러가 없어야 함
    expect(consoleErrors.length).toBe(0);

    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    }
  });
});
