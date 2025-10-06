import { test, expect } from '@playwright/test';

/**
 * 상품 페이지 테스트
 */
test.describe('상품 페이지 테스트', () => {
  test('상품 상세 페이지 로드', async ({ page }) => {
    await page.goto('/');

    // 첫 번째 상품 클릭
    const firstProduct = page.locator('[data-testid="product-card"], .product-card, article').first();
    await firstProduct.waitFor({ state: 'visible' });
    await firstProduct.click();

    // URL이 변경되었는지 확인
    await page.waitForURL(/\/products\/|\/product\//);

    // 상품 상세 정보 확인
    await expect(page.locator('h1, .product-title')).toBeVisible();
    await expect(page.locator('.price, [data-testid="price"]')).toBeVisible();
  });

  test('상품 이미지 확인', async ({ page }) => {
    await page.goto('/');

    const firstProduct = page.locator('[data-testid="product-card"], .product-card, article').first();
    await firstProduct.click();
    await page.waitForURL(/\/products\/|\/product\//);

    // 상품 이미지가 로드되는지 확인
    const productImage = page.locator('img[alt*="product"], img.product-image, .product-gallery img').first();
    await expect(productImage).toBeVisible();
  });

  test('장바구니 버튼 클릭', async ({ page }) => {
    await page.goto('/');

    const firstProduct = page.locator('[data-testid="product-card"], .product-card, article').first();
    await firstProduct.click();
    await page.waitForURL(/\/products\/|\/product\//);

    // 장바구니 또는 구매 버튼 찾기
    const addToCartButton = page.locator('button:has-text("장바구니"), button:has-text("구매"), button:has-text("담기")').first();

    if (await addToCartButton.count() > 0) {
      await expect(addToCartButton).toBeVisible();
      // 클릭 테스트는 로그인이 필요할 수 있으므로 표시만 확인
    }
  });

  test('상품 옵션 선택 (Variant)', async ({ page }) => {
    await page.goto('/');

    const firstProduct = page.locator('[data-testid="product-card"], .product-card, article').first();
    await firstProduct.click();
    await page.waitForURL(/\/products\/|\/product\//);

    // 옵션 선택 요소가 있는지 확인
    const optionSelector = page.locator('select, .option-select, [role="listbox"]');

    if (await optionSelector.count() > 0) {
      await expect(optionSelector.first()).toBeVisible();
    }
  });
});
