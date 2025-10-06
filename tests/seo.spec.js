import { test, expect } from '@playwright/test';

/**
 * SEO (검색엔진 최적화) 테스트
 */
test.describe('SEO 테스트', () => {
  test('메타 태그 확인', async ({ page }) => {
    await page.goto('/');

    // Title 태그
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThan(60); // SEO 권장 길이

    // Meta description
    const metaDescription = page.locator('meta[name="description"]');
    if (await metaDescription.count() > 0) {
      const content = await metaDescription.getAttribute('content');
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(50);
      expect(content.length).toBeLessThan(160); // SEO 권장 길이
    }
  });

  test('Open Graph 메타 태그', async ({ page }) => {
    await page.goto('/');

    // OG 태그 확인
    const ogTitle = page.locator('meta[property="og:title"]');
    const ogDescription = page.locator('meta[property="og:description"]');
    const ogImage = page.locator('meta[property="og:image"]');

    if (await ogTitle.count() > 0) {
      const titleContent = await ogTitle.getAttribute('content');
      expect(titleContent).toBeTruthy();
    }

    if (await ogDescription.count() > 0) {
      const descContent = await ogDescription.getAttribute('content');
      expect(descContent).toBeTruthy();
    }

    if (await ogImage.count() > 0) {
      const imageContent = await ogImage.getAttribute('content');
      expect(imageContent).toBeTruthy();
    }
  });

  test('구조화된 데이터 (JSON-LD) 확인', async ({ page }) => {
    await page.goto('/');

    // JSON-LD 스크립트 확인
    const jsonLdScript = page.locator('script[type="application/ld+json"]');

    if (await jsonLdScript.count() > 0) {
      const jsonContent = await jsonLdScript.first().textContent();
      expect(jsonContent).toBeTruthy();

      // JSON 파싱 테스트
      expect(() => JSON.parse(jsonContent)).not.toThrow();
    }
  });

  test('Canonical URL 확인', async ({ page }) => {
    await page.goto('/');

    // Canonical link 태그
    const canonical = page.locator('link[rel="canonical"]');

    if (await canonical.count() > 0) {
      const href = await canonical.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toContain('allok.shop');
    }
  });

  test('Robots meta 태그', async ({ page }) => {
    await page.goto('/');

    // robots meta 태그 (있는 경우)
    const robots = page.locator('meta[name="robots"]');

    if (await robots.count() > 0) {
      const content = await robots.getAttribute('content');
      expect(content).toBeTruthy();
      // 일반적으로 "index, follow" 또는 유사한 값
    }
  });

  test('H1 태그 확인', async ({ page }) => {
    await page.goto('/');

    // H1 태그가 있어야 함 (페이지당 하나)
    const h1 = page.locator('h1');
    const h1Count = await h1.count();

    expect(h1Count).toBeGreaterThanOrEqual(1);

    // H1 텍스트 확인
    const h1Text = await h1.first().textContent();
    expect(h1Text.trim().length).toBeGreaterThan(0);
  });

  test('상품 페이지 SEO', async ({ page }) => {
    await page.goto('/');

    // 첫 번째 상품 클릭
    const firstProduct = page.locator('[data-testid="product-card"], .product-card, article').first();
    if (await firstProduct.count() > 0) {
      await firstProduct.click();
      await page.waitForURL(/\/products\/|\/product\//);

      // 상품 페이지 title 확인
      const productTitle = await page.title();
      expect(productTitle).toBeTruthy();
      expect(productTitle).toContain('allok' || '상품');

      // 상품 이미지 alt 확인
      const productImage = page.locator('img').first();
      const alt = await productImage.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });
});
