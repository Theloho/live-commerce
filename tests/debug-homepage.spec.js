import { test, expect } from '@playwright/test';

/**
 * 디버그용: 홈페이지 구조 파악
 */
test('홈페이지 HTML 구조 확인', async ({ page }) => {
  await page.goto('/');

  // 로딩 완료 대기 (최대 10초)
  console.log('로딩 대기 중...');
  await page.waitForTimeout(3000); // 3초 대기

  // 로딩 스피너가 사라질 때까지 대기
  const spinner = page.locator('.animate-spin');
  if (await spinner.count() > 0) {
    console.log('로딩 스피너 감지, 완료 대기 중...');
    await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      console.log('로딩 스피너가 사라지지 않음');
    });
  }

  // 페이지 타이틀 확인
  const title = await page.title();
  console.log('페이지 타이틀:', title);

  // 메타 description 확인
  const metaDesc = await page.locator('meta[name="description"]').getAttribute('content').catch(() => null);
  console.log('메타 description:', metaDesc);

  // H1 태그 확인
  const h1Count = await page.locator('h1').count();
  console.log('H1 태그 개수:', h1Count);
  if (h1Count > 0) {
    const h1Text = await page.locator('h1').first().textContent();
    console.log('첫 번째 H1:', h1Text);
  }

  // 상품 카드 찾기 시도
  const selectors = [
    'article',
    '.product-card',
    '[data-testid="product-card"]',
    'div[class*="product"]',
    'a[href*="/product"]',
    'a[href*="/products"]',
    'div[class*="grid"] > div',
    'div[class*="container"] > div > div',
  ];

  for (const selector of selectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`\n✅ 선택자 "${selector}" 발견: ${count}개`);

      // 첫 번째 요소의 클래스명 확인
      const className = await page.locator(selector).first().getAttribute('class').catch(() => null);
      console.log(`   클래스명: ${className}`);

      // 첫 번째 요소의 텍스트 일부
      const text = await page.locator(selector).first().textContent().catch(() => null);
      if (text) {
        console.log(`   텍스트 (처음 100자): ${text.substring(0, 100).trim()}`);
      }
    }
  }

  // 버튼/링크 찾기
  const buttonSelectors = [
    'button',
    'a',
    '[role="button"]',
    'input[type="button"]',
    'input[type="submit"]',
  ];

  console.log('\n=== 버튼/링크 분석 ===');
  for (const selector of buttonSelectors) {
    const count = await page.locator(selector).count();
    console.log(`${selector}: ${count}개`);
  }

  // body 전체 HTML 구조 (일부)
  const bodyHTML = await page.locator('body').innerHTML();
  console.log('\n=== Body HTML (처음 500자) ===');
  console.log(bodyHTML.substring(0, 500));
});
