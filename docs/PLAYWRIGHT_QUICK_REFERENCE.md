# Playwright 빠른 참조 가이드

**프로젝트**: allok.shop
**목적**: 빠르게 테스트를 작성하고 실행하기 위한 참조 자료

---

## ⚡ 빠른 시작

### 1. 테스트 실행
```bash
npm test                    # 전체 테스트 (헤드리스)
npm run test:ui             # UI 모드 (추천)
npm run test:headed         # 브라우저 보며 실행
npm run test:chromium       # Chrome만
npm run test:report         # 리포트 확인
```

### 2. 특정 테스트만 실행
```bash
npm test tests/homepage.spec.js
npm test tests/admin.spec.js
npm test -- --grep "로그인"
```

---

## 📋 자주 사용하는 패턴

### 로딩 대기 (중요!)
```javascript
// ❌ 잘못된 방법
await page.goto('/');
await page.click('[data-testid="product-card"]'); // 에러 발생 가능

// ✅ 올바른 방법
await page.goto('/');
await page.waitForTimeout(3000); // 로딩 대기
await page.click('[data-testid="product-card"]');

// ✅ 더 나은 방법
await page.goto('/');
await page.waitForSelector('[data-testid="product-card"]', { timeout: 5000 });
await page.click('[data-testid="product-card"]');
```

### 로그인 세션
```javascript
test('로그인 필요한 테스트', async ({ page, context }) => {
  // 테스트용 쿠키 설정
  await context.addCookies([
    {
      name: 'sb-access-token',
      value: 'your-test-token',
      domain: 'allok.shop',
      path: '/',
    }
  ]);

  await page.goto('/mypage');
  // 로그인된 상태로 테스트 진행
});
```

### 요소 찾기 우선순위
```javascript
// 1순위: data-testid (가장 안정적)
page.locator('[data-testid="product-card"]')

// 2순위: 의미있는 role
page.locator('button[aria-label="구매하기"]')

// 3순위: 텍스트
page.locator('button:has-text("구매하기")')

// 4순위: CSS 선택자 (최후의 수단)
page.locator('.product-card')
```

---

## 🎯 테스트 시나리오 체크리스트

### 사용자 테스트 (필수)
- [ ] 홈페이지 로드
- [ ] 상품 목록 조회
- [ ] 상품 상세 페이지
- [ ] 옵션 선택 (Variant)
- [ ] 장바구니 추가
- [ ] 즉시 구매
- [ ] 체크아웃 (배송정보 입력)
- [ ] 쿠폰 적용
- [ ] 주문 완료
- [ ] 주문 내역 조회
- [ ] 마이페이지

### 관리자 테스트 (필수)
- [ ] 관리자 로그인
- [ ] 상품 등록
- [ ] Variant 상품 등록
- [ ] 주문 목록 조회
- [ ] 주문 상태 변경
- [ ] 송장 번호 입력
- [ ] 발주서 생성
- [ ] 쿠폰 생성
- [ ] 통계 조회

### Edge Cases (권장)
- [ ] 재고 부족 처리
- [ ] 잘못된 쿠폰 코드
- [ ] 최소 주문 금액 미달
- [ ] 네트워크 에러
- [ ] 동시 주문 처리
- [ ] SQL Injection 방어
- [ ] XSS 방어

### 성능 (권장)
- [ ] 페이지 로드 시간
- [ ] 네트워크 요청 수
- [ ] 이미지 최적화
- [ ] Console 에러 확인

---

## 📝 테스트 템플릿

### 기본 테스트
```javascript
import { test, expect } from '@playwright/test';

test('테스트 이름', async ({ page }) => {
  // 1. 페이지 이동
  await page.goto('/');

  // 2. 로딩 대기 (allok.shop은 CSR이므로 필수!)
  await page.waitForTimeout(3000);

  // 3. 요소 찾기
  const element = page.locator('[data-testid="element"]');

  // 4. 검증
  await expect(element).toBeVisible();
  await expect(element).toContainText('텍스트');
});
```

### 로그인 필요 테스트
```javascript
test('로그인 후 테스트', async ({ page, context }) => {
  // 로그인 쿠키 설정
  await context.addCookies([
    {
      name: 'sb-access-token',
      value: 'test-token',
      domain: 'allok.shop',
      path: '/',
    }
  ]);

  await page.goto('/mypage');
  // 테스트 진행...
});
```

### E2E (전체 플로우)
```javascript
test('전체 주문 플로우', async ({ page, context }) => {
  // 1. 로그인
  await context.addCookies([/* ... */]);

  // 2. 상품 선택
  await page.goto('/');
  await page.waitForTimeout(3000);
  await page.click('[data-testid="product-card"]');

  // 3. 옵션 선택 (있는 경우)
  const optionSelect = page.locator('select').first();
  if (await optionSelect.count() > 0) {
    await optionSelect.selectOption({ index: 1 });
  }

  // 4. 구매
  await page.click('button:has-text("구매")');

  // 5. 체크아웃
  await expect(page).toHaveURL(/\/checkout/);
  await page.fill('[name="name"]', '홍길동');
  await page.fill('[name="phone"]', '01012345678');
  await page.fill('[name="address"]', '서울시 강남구');

  // 6. 주문하기
  await page.click('button:has-text("주문하기")');

  // 7. 주문 완료
  await expect(page).toHaveURL(/\/orders\/\d+\/complete/);
});
```

---

## 🐛 자주 발생하는 문제 해결

### 문제 1: "요소를 찾을 수 없습니다"
```javascript
// ❌ 문제
await page.click('[data-testid="product-card"]');
// Error: No element found

// ✅ 해결책 1: 로딩 대기
await page.waitForTimeout(3000);
await page.click('[data-testid="product-card"]');

// ✅ 해결책 2: waitForSelector
await page.waitForSelector('[data-testid="product-card"]');
await page.click('[data-testid="product-card"]');
```

### 문제 2: "Timeout 에러"
```javascript
// ❌ 문제
await page.click('button'); // Timeout 30초

// ✅ 해결책: 타임아웃 연장
await page.click('button', { timeout: 60000 }); // 60초

// ✅ 더 나은 해결책: 정확한 선택자
await page.click('button:has-text("구매하기")');
```

### 문제 3: "페이지 로딩이 끝나지 않음"
```javascript
// ❌ 문제
await page.goto('/'); // 무한 로딩

// ✅ 해결책: waitUntil 옵션
await page.goto('/', { waitUntil: 'domcontentloaded' });

// 또는
await page.goto('/', { waitUntil: 'networkidle' });
```

### 문제 4: "CSR 앱 데이터 로딩 실패"
```javascript
// allok.shop은 CSR이므로 특별 처리 필요

// ✅ 해결책
await page.goto('/');

// 로딩 스피너 대기
const spinner = page.locator('.animate-spin');
if (await spinner.count() > 0) {
  await spinner.waitFor({ state: 'hidden', timeout: 10000 });
}

// 또는 고정 시간 대기
await page.waitForTimeout(3000);

// 이제 데이터가 로드됨
```

---

## 📊 Assertion (검증) 치트시트

### 요소 존재/표시
```javascript
await expect(element).toBeVisible();           // 보임
await expect(element).toBeHidden();            // 숨김
await expect(element).toBeEnabled();           // 활성화
await expect(element).toBeDisabled();          // 비활성화
await expect(element).toBeChecked();           // 체크됨 (checkbox)
```

### 텍스트 검증
```javascript
await expect(element).toHaveText('정확한 텍스트');
await expect(element).toContainText('포함된 텍스트');
await expect(element).toHaveText(/정규식/);
```

### 속성 검증
```javascript
await expect(element).toHaveAttribute('href', '/link');
await expect(element).toHaveClass('active');
await expect(element).toHaveValue('value');
```

### URL 검증
```javascript
await expect(page).toHaveURL('/exact-url');
await expect(page).toHaveURL(/\/regex/);
await expect(page).toHaveTitle('페이지 타이틀');
```

### 개수 검증
```javascript
const elements = page.locator('[data-testid="item"]');
expect(await elements.count()).toBe(5);
expect(await elements.count()).toBeGreaterThan(0);
```

---

## 🎬 Actions (동작) 치트시트

### 클릭
```javascript
await page.click('button');                    // 일반 클릭
await element.click();                         // 요소 클릭
await element.dblclick();                      // 더블 클릭
await element.click({ button: 'right' });     // 우클릭
```

### 입력
```javascript
await page.fill('input', '텍스트');            // 입력 (기존 내용 삭제)
await page.type('input', '텍스트');            // 타이핑 (느림)
await element.clear();                         // 내용 삭제
await element.press('Enter');                  // 키 입력
```

### 선택
```javascript
await page.selectOption('select', 'value');    // value로 선택
await page.selectOption('select', { label: '라벨' }); // 라벨로 선택
await page.selectOption('select', { index: 1 }); // 인덱스로 선택
await page.check('input[type="checkbox"]');    // 체크박스 체크
await page.uncheck('input[type="checkbox"]'); // 체크 해제
```

### 스크롤
```javascript
await page.evaluate(() => window.scrollTo(0, 0));              // 최상단
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); // 최하단
await element.scrollIntoViewIfNeeded();        // 요소가 보이도록 스크롤
```

### 파일 업로드
```javascript
await page.setInputFiles('input[type="file"]', './file.jpg');
await page.setInputFiles('input[type="file"]', ['./file1.jpg', './file2.jpg']); // 여러 파일
```

---

## 🔍 Locator (선택자) 치트시트

### CSS 선택자
```javascript
page.locator('#id')                            // ID
page.locator('.class')                         // Class
page.locator('button')                         // 태그
page.locator('[data-testid="test"]')          // 속성
page.locator('button.primary')                 // 조합
page.locator('div > button')                   // 자식
page.locator('div button')                     // 자손
```

### 텍스트 기반
```javascript
page.locator('text=정확한 텍스트')
page.locator('button:has-text("부분 텍스트")')
page.locator('button >> text="버튼 내부 텍스트"')
```

### XPath (필요시)
```javascript
page.locator('xpath=//button[@id="submit"]')
```

### 조합 및 필터
```javascript
page.locator('button').first()                 // 첫 번째
page.locator('button').last()                  // 마지막
page.locator('button').nth(2)                  // n번째 (0부터 시작)
page.locator('button').filter({ hasText: '텍스트' }) // 필터
```

---

## ⚙️ 설정

### 타임아웃
```javascript
// 전역 설정 (playwright.config.js)
timeout: 30000,

// 테스트별 설정
test('...', async ({ page }) => {
  test.setTimeout(60000); // 60초
});

// 액션별 설정
await page.click('button', { timeout: 5000 });
```

### 재시도
```javascript
// playwright.config.js
retries: 2, // 실패 시 2번 재시도
```

---

## 📸 디버깅

### 스크린샷
```javascript
await page.screenshot({ path: 'screenshot.png' });
await element.screenshot({ path: 'element.png' });
```

### 비디오
```javascript
// playwright.config.js
video: 'on', // 모든 테스트 녹화
video: 'retain-on-failure', // 실패 시만
```

### 느린 모드
```javascript
// 각 액션 사이에 지연 추가 (디버깅용)
const browser = await chromium.launch({ slowMo: 1000 }); // 1초
```

### Trace
```javascript
// playwright.config.js
trace: 'on-first-retry', // 첫 재시도 시 trace 생성

// Trace Viewer로 확인
npx playwright show-trace trace.zip
```

---

## 🚀 CI/CD

### GitHub Actions 기본 설정
```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run tests
  run: npm test

- name: Upload report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

---

## 📚 참고 자료

- [Playwright 공식 문서](https://playwright.dev/)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
- 프로젝트 상세 가이드: `docs/PLAYWRIGHT_TESTING_GUIDE.md`

---

**마지막 업데이트**: 2025-10-06
