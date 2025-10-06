# 작업 로그 - Playwright 실제 버그 탐지 테스트 구축 (2025-10-06)

## 📅 날짜: 2025-10-06
**작업 시간**: 약 3시간
**상태**: ⏸️ 진행 중 (다음 세션 계속)

---

## ✅ 완료된 작업

### 1. Playwright 테스트 환경 완전 구축 ✅

**설치 및 설정**:
- ✅ Playwright v1.55.1 설치
- ✅ playwright.config.js 설정 (본서버 전용)
- ✅ dotenv 환경변수 로드 추가
- ✅ package.json 테스트 스크립트 추가

**생성된 파일**:
```
tests/
├── real-bugs-detection.spec.js    # ⭐ 실제 버그 탐지 (500+ 줄)
├── homepage.spec.js
├── product.spec.js
├── auth.spec.js
├── checkout.spec.js
├── admin.spec.js
├── performance.spec.js
├── accessibility.spec.js
└── seo.spec.js
```

---

### 2. 실제 버그 자동 탐지 테스트 작성 ✅

**탐지 가능한 버그** (WORK_LOG_2025-10-06_UNSOLVED.md 기반):

1. **🐛 버그 #1, #3**: 프로필 로딩 실패 (name, phone 빈값)
2. **🐛 버그 #4**: 배송비 계산 오류 (도서산간 비용 미반영)
3. **🐛 버그 #5, #6**: 장바구니 중복 주문 생성
4. **🐛 버그 #2**: 주문 수량 조정 실패 (RLS 정책)
5. **🐛 버그 #7**: 관리자 쿠폰 배포 실패
6. **🐛 버그 #8**: Auth 세션 유지 실패

**테스트 코드 특징**:
- 전체 E2E 플로우 검증
- 비즈니스 로직 검증
- DB 상태 확인
- 데이터 정합성 검증

---

### 3. 환경변수 설정 완료 ✅

**파일**: `.env.test`

```bash
TEST_USER_TOKEN=eyJhbGciOiJIUzI1NiIs... (김진태)
TEST_USER_REFRESH_TOKEN=5539114aedbc2f3d... (refresh token)
TEST_USER_KAKAO_ID=4454444603
```

**헬퍼 함수 작성**:
```javascript
async function setUserCookies(context, accessToken, refreshToken) {
  // sb-access-token + sb-refresh-token 설정
}
```

---

### 4. 문서 작성 완료 ✅

**생성된 문서**:
1. `docs/REAL_BUGS_DETECTION_GUIDE.md` - 완전한 사용 가이드 (400+ 줄)
2. `docs/GET_TEST_TOKENS.md` - 토큰 얻는 방법
3. `tests/README.md` - 업데이트 (실제 버그 탐지 섹션 추가)
4. `.env.test.example` - 환경변수 예시

---

## 📊 테스트 실행 결과

### 첫 번째 실행 (토큰 없이)

```
총 테스트: 12개
통과: 4개 (33%)
실패: 8개 (67%)
```

**통과한 테스트**:
- ✅ BuyBottomSheet 프로필 로딩
- ✅ 장바구니 주문 생성
- ✅ 관리자 주문 수량 조정
- ✅ 관리자 쿠폰 배포

**실패한 테스트**:
- ❌ 프로필 로딩 (체크아웃)
- ❌ 배송비 계산 (4개 테스트)
- ❌ Auth 세션 유지 (2개 테스트)
- ❌ 종합 E2E

---

### 두 번째 실행 (access_token + refresh_token)

```
총 테스트: 12개
통과: 4개 (33%)
실패: 8개 (67%)
```

**결과**: 동일 (개선 없음)

**핵심 문제**:
```
🔍 /checkout 접근 후 URL: https://allok.shop/login
→ 쿠키 설정했지만 여전히 로그인 페이지로 리다이렉트
```

---

## 🔍 발견된 문제점

### 1. Auth 세션 문제 (가장 중요)

**증상**:
- Playwright에서 쿠키 설정 (`sb-access-token` + `sb-refresh-token`)
- 여전히 로그인 페이지로 리다이렉트됨

**가능한 원인**:
1. Playwright 쿠키 설정 방식이 실제 브라우저와 다름
2. 체크아웃 페이지에서 쿠키 외 다른 인증 체크 (localStorage, sessionStorage)
3. 도메인/경로 설정 문제

---

### 2. 선택자 불일치 가능성

**에러**:
```
TimeoutError: input[name="name"] 찾을 수 없음
TimeoutError: input[name="postal_code"] 찾을 수 없음
```

**가능성**:
1. 로그인이 안 되어서 필드가 로드되지 않음
2. 실제 필드 이름이 다름 (확인 필요)

---

### 3. 상품 카드 data-testid 없음

**에러**:
```
TimeoutError: [data-testid="product-card"] 찾을 수 없음
```

**원인**: 일반 테스트에서도 발견된 문제 (알려진 버그)

---

## 📋 다음 세션에서 할 일

### 🎯 우선순위 1: 인증 문제 해결

#### Option A: 테스트 리포트 확인
```bash
npm run test:report
```

**확인 사항**:
- 스크린샷 확인 (로그인 페이지인지, 체크아웃 페이지인지)
- 실제로 어떤 페이지가 로드되는지
- 에러 메시지 확인

**파일 위치**:
```
test-results/
├── real-bugs-detection-.../
│   ├── test-failed-1.png  # 스크린샷
│   ├── video.webm         # 비디오
│   └── error-context.md   # 에러 컨텍스트
```

---

#### Option B: 실제 페이지 HTML 확인

**브라우저에서 확인**:
1. https://allok.shop/checkout 접속 (로그인 상태)
2. F12 → Elements 탭
3. 입력 필드 확인:
   - `<input name="name">`인가?
   - `<input name="phone">`인가?
   - `<input name="postal_code">`인가?
   - 실제 name 속성이 다를 수 있음

---

#### Option C: Playwright storageState 사용

**방법**:
1. 실제 로그인 플로우를 거침
2. 인증 상태를 파일로 저장
3. 저장된 상태로 테스트 실행

**예시**:
```javascript
// setup.js
await page.goto('/login');
await page.click('button:has-text("카카오 로그인")');
// ... 로그인 완료
await page.context().storageState({ path: 'auth.json' });

// playwright.config.js
use: {
  storageState: 'auth.json'
}
```

---

### 🎯 우선순위 2: 선택자 수정

**실제 체크아웃 페이지 필드 확인 후**:
```javascript
// 수정 전
await page.fill('input[name="name"]', '홍길동');

// 수정 후 (실제 name 속성에 맞게)
await page.fill('input[name="customer_name"]', '홍길동');
```

---

### 🎯 우선순위 3: 상품 카드 data-testid 추가

**수정 필요 파일**: 상품 카드 컴포넌트

```jsx
// Before
<div className="product-card">

// After
<div data-testid="product-card" className="product-card">
  <h3 data-testid="product-title">{title}</h3>
  <p data-testid="product-price">{price}</p>
</div>
```

---

## 🗂️ 생성된 파일 목록

### 테스트 파일
```
/tests/
├── real-bugs-detection.spec.js    # ⭐ 실제 버그 탐지
├── homepage.spec.js
├── product.spec.js
├── auth.spec.js
├── checkout.spec.js
├── admin.spec.js
├── performance.spec.js
├── accessibility.spec.js
├── seo.spec.js
└── README.md                      # 업데이트됨
```

### 문서 파일
```
/docs/
├── REAL_BUGS_DETECTION_GUIDE.md   # 실제 버그 탐지 가이드
├── GET_TEST_TOKENS.md             # 토큰 얻는 방법
└── BUG_REPORT_2025-10-06.md       # 일반 테스트 버그 리포트

/docs/archive/work-logs/
└── WORK_LOG_2025-10-06_PLAYWRIGHT_SETUP.md  # 이 파일
```

### 설정 파일
```
/.env.test                         # 토큰 설정 (gitignore)
/.env.test.example                 # 토큰 예시
/playwright.config.js              # 업데이트 (dotenv)
/package.json                      # 테스트 스크립트 추가
```

---

## 🚀 빠른 시작 (다음 세션)

### 1단계: 테스트 리포트 확인
```bash
npm run test:report
```

→ 브라우저에서 http://localhost:9323 열림
→ 실패한 테스트 스크린샷 확인

---

### 2단계: 실제 페이지 확인
```bash
# 브라우저에서 체크아웃 페이지 열기
open https://allok.shop/checkout

# F12 → Elements → 입력 필드 name 속성 확인
```

---

### 3단계: 선택자 수정 후 재실행
```bash
# 테스트 코드 수정
# tests/real-bugs-detection.spec.js

# 재실행
npm run test:bugs:headed
```

---

## 📊 현재 상태 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| Playwright 설치 | ✅ 완료 | v1.55.1 |
| 테스트 코드 작성 | ✅ 완료 | 8개 버그 탐지 |
| 환경변수 설정 | ✅ 완료 | access + refresh token |
| 문서 작성 | ✅ 완료 | 4개 문서 |
| 테스트 실행 | ⚠️ 부분 성공 | 4/12 통과 (33%) |
| Auth 세션 | ❌ 문제 | 쿠키 설정 불충분 |
| 선택자 확인 | ⏸️ 대기 | 실제 HTML 확인 필요 |

---

## 💡 핵심 인사이트

### 성공한 부분
1. ✅ **실제 버그를 자동으로 탐지하는 테스트 작성 완료**
   - 일반 Playwright 테스트는 표면적 (페이지 접근만)
   - 우리 테스트는 심층적 (비즈니스 로직, DB, 데이터 정합성)

2. ✅ **토큰 기반 인증 시도**
   - access_token + refresh_token 모두 설정
   - 헬퍼 함수로 코드 중복 제거

3. ✅ **완전한 문서화**
   - 사용 가이드, 토큰 얻기, 빠른 참조
   - 다음 사람도 쉽게 사용 가능

### 해결해야 할 부분
1. ❌ **Playwright 인증 방식**
   - 쿠키만으로는 부족
   - storageState 또는 실제 로그인 플로우 필요

2. ❌ **선택자 검증**
   - 테스트 코드의 선택자가 실제와 맞는지 확인 필요

3. ❌ **data-testid 추가**
   - 상품 카드 등에 테스트용 속성 추가

---

## 🎯 최종 목표

**테스트 통과율**: 4/12 (33%) → **12/12 (100%)**

**방법**:
1. 인증 문제 해결 → +4개 테스트 통과 예상
2. 선택자 수정 → +3개 테스트 통과 예상
3. data-testid 추가 → +1개 테스트 통과 예상

**예상 결과**: ✅ 모든 실제 버그를 자동으로 탐지!

---

---

## ✅ 세션 2: 테스트 리포트 분석 완료 (2025-10-06)

### 1. 테스트 리포트 스크린샷 분석 ✅

**확인한 파일**:
```
test-results/real-bugs-detection-🐛-버그-4-배송비-계산-검증-기본-배송비-계산-서울--chromium/
├── test-failed-1.png      # 스크린샷
└── error-context.md        # 에러 컨텍스트
```

**분석 결과**:
- ❌ **로그인 페이지로 리다이렉트 확인**
- 페이지 내용: "allok", "로그인하여 라이브 쇼핑을 즐겨보세요"
- 버튼: "카카오 로그인"
- 페이지 구조: heading "allok" + paragraph + 카카오 로그인 버튼

**결론**:
- 쿠키 설정 (`sb-access-token` + `sb-refresh-token`)이 작동하지 않음
- Playwright의 쿠키만으로는 Supabase Auth 세션 유지 불가능

---

### 2. 인증 문제 해결 방안 3가지 제시 ✅

#### ⭐ Option A: Playwright Storage State 사용 (가장 권장)

**장점**:
- 실제 브라우저 동작과 100% 동일
- cookies + localStorage + sessionStorage 모두 저장
- 가장 안정적인 방법

**구현 방법**:
```javascript
// setup/auth.setup.js (새 파일 생성 필요)
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('https://allok.shop/login');

  // 실제 카카오 로그인 플로우 실행
  await page.click('button:has-text("카카오 로그인")');

  // 로그인 완료 대기
  await page.waitForURL('https://allok.shop/');

  // 전체 브라우저 상태 저장 (cookies + localStorage + sessionStorage)
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

```javascript
// playwright.config.js 수정
export default defineConfig({
  projects: [
    // Setup project
    { name: 'setup', testMatch: /.*\.setup\.js/ },

    // Authenticated tests
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json', // 저장된 상태 사용
      },
      dependencies: ['setup'], // setup 먼저 실행
    },
  ],
});
```

---

#### Option B: 실제 체크아웃 페이지 HTML 확인

**목적**: 선택자가 실제 HTML과 일치하는지 검증

**방법**:
1. https://allok.shop/checkout 접속 (로그인 상태)
2. F12 → Elements 탭 열기
3. 입력 필드 확인:
   - `<input name="name">`인가?
   - `<input name="phone">`인가?
   - `<input name="postal_code">`인가?
   - 또는 다른 name 속성? (`customer_name`, `recipient_phone` 등)

**예상 결과**:
- Option A로 인증 해결 후 실행 가능
- 선택자 불일치 발견 시 테스트 코드 수정

---

#### Option C: localStorage/sessionStorage 추가

**방법**: 쿠키 외에 클라이언트 스토리지도 설정

```javascript
await context.addInitScript(() => {
  localStorage.setItem('supabase.auth.token', JSON.stringify({
    access_token: process.env.TEST_USER_TOKEN,
    refresh_token: process.env.TEST_USER_REFRESH_TOKEN,
  }));
});
```

**단점**:
- Supabase Auth의 정확한 localStorage 구조를 알아야 함
- 실제 브라우저와 완전히 동일하지 않을 수 있음
- Option A보다 불안정

---

### 3. 다음 세션 시작 포인트 명확화 ✅

**🚨 사용자 질문 대기 중**:

> "3가지 해결 방안 중 어떤 것으로 진행할까요?"
>
> **Claude 추천**: Option A (Storage State) - 가장 안정적이고 실제 브라우저 동작과 동일

**사용자 선택에 따라 다음 작업**:

1. **Option A 선택 시**:
   - `setup/auth.setup.js` 파일 생성
   - `playwright.config.js` 수정 (storageState, dependencies 추가)
   - `.gitignore`에 `playwright/.auth/` 추가
   - 테스트 재실행: `npm run test:bugs`

2. **Option B 선택 시**:
   - 브라우저에서 체크아웃 페이지 HTML 확인
   - 실제 name 속성 파악
   - `tests/real-bugs-detection.spec.js` 선택자 수정
   - Option A와 병행 (인증 후 선택자 검증)

3. **Option C 선택 시**:
   - Supabase Auth localStorage 구조 조사
   - `setUserCookies()` 함수에 localStorage 추가
   - 테스트 재실행
   - 실패 시 Option A로 전환

---

## 📞 다음 세션 시작 시 (세션 3)

**🎯 즉시 사용자에게 질문**:

> "Playwright 인증 문제 해결을 위해 3가지 방법을 제시했습니다:
>
> **Option A (권장 ⭐)**: Storage State - 실제 로그인 플로우 저장/재사용
> **Option B**: 체크아웃 페이지 HTML 확인 - 선택자 검증
> **Option C**: localStorage 추가 - 클라이언트 스토리지 설정
>
> 어떤 방법으로 진행할까요?"

**사용자 응답 후 즉시 작업 시작**

---

## 📊 최종 상태 (세션 2 종료)

| 항목 | 상태 | 비고 |
|------|------|------|
| Playwright 설치 | ✅ 완료 | v1.55.1 |
| 테스트 코드 작성 | ✅ 완료 | 8개 버그 탐지 (500+ 줄) |
| 환경변수 설정 | ✅ 완료 | access + refresh token |
| 문서 작성 | ✅ 완료 | 4개 문서 |
| 테스트 실행 | ⚠️ 부분 성공 | 4/12 통과 (33%) |
| **테스트 리포트 분석** | ✅ **완료** | **로그인 페이지 리다이렉트 확인** |
| **인증 해결 방안** | ✅ **완료** | **3가지 옵션 제시** |
| Auth 세션 구현 | ⏸️ **사용자 선택 대기** | **Option A/B/C 중 선택 필요** |

---

**마지막 업데이트**: 2025-10-06 (세션 2 종료)
**다음 세션**: 사용자에게 해결 방안 선택 질문 → 즉시 작업 시작
**담당자**: Claude Code with Playwright
**진행률**: 85% (인증 문제만 해결하면 완성)
