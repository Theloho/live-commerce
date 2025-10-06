# Playwright 테스트 가이드

**⚠️ 본서버 전용 테스트 환경**

이 테스트는 **https://allok.shop 본서버만 테스트**합니다.
로컬 개발서버는 사용하지 않습니다.

---

## 📚 문서 가이드

### ⭐ 필수 문서 (반드시 읽기)

1. **PLAYWRIGHT_TESTING_SCENARIOS_CORRECTED.md**
   - **실제 allok.shop 코드베이스 분석 결과**
   - 정확한 UI, API, DB 구조 반영
   - 쿠폰, Variant, 발주 등 실제 기능 기반
   - **테스트 작성 시 이 문서 기준 사용!**

2. **PLAYWRIGHT_DATA_VALIDATION_TESTS.md**
   - **비즈니스 로직 및 데이터 정합성 검증**
   - 재고 차감/복구 검증
   - 금액 계산 정확성 (배송비, 쿠폰)
   - 주문 상태 변경 시 타임스탬프
   - 주문 취소 시 재고/쿠폰 복구

3. **PLAYWRIGHT_QUICK_REFERENCE.md**
   - 빠른 참조 가이드 (치트시트)
   - 자주 사용하는 패턴
   - 문제 해결 방법

### ⚠️ 참고 문서 (일부 부정확)

4. **PLAYWRIGHT_TESTING_GUIDE.md**
   - 일반적인 Playwright 사용법
   - **주의**: 쿠폰 코드 입력 등 실제 시스템과 다른 부분 있음
   - 참고용으로만 사용

---

## 🚀 빠른 시작

### 1. 기본 테스트 실행
```bash
npm test                    # 전체 테스트 (헤드리스)
npm run test:ui             # UI 모드 (추천 ⭐)
npm run test:headed         # 브라우저 보며 실행
npm run test:chromium       # Chrome만
npm run test:report         # 리포트 확인
```

### 2. ⭐ 실제 버그 탐지 테스트 (NEW!)
```bash
npm run test:bugs           # 실제 경험한 8개 버그 자동 탐지
npm run test:bugs:ui        # UI 모드로 버그 탐지 과정 확인
npm run test:bugs:headed    # 브라우저 보며 실행
```

**실제 버그 탐지 테스트란?**
- WORK_LOG_2025-10-06_UNSOLVED.md에 기록된 실제 버그 8개를 자동으로 탐지
- 프로필 로딩, 배송비 계산, 장바구니 병합 등 비즈니스 로직 검증
- Auth 세션, RLS 정책, DB 상태까지 검증

### 3. 특정 테스트 실행
```bash
npm test tests/homepage.spec.js
npm test tests/admin.spec.js
npm test tests/real-bugs-detection.spec.js  # 실제 버그 탐지
npm test -- --grep "쿠폰"
```

---

## 🎯 테스트 작성 가이드

### 1단계: 실제 시스템 확인
```
실제 allok.shop 방문
  ↓
UI, 선택자 확인
  ↓
PLAYWRIGHT_TESTING_SCENARIOS_CORRECTED.md 확인
  ↓
테스트 작성
```

### 2단계: 데이터 검증 추가
```
PLAYWRIGHT_DATA_VALIDATION_TESTS.md 참조
  ↓
비즈니스 로직 검증 추가
  - 재고 차감/복구
  - 금액 계산
  - 상태 변경
```

---

## ✅ 테스트 체크리스트

### 사용자 테스트
- [ ] 홈페이지 로드 (CSR 로딩 대기 3초!)
- [ ] 상품 목록 조회
- [ ] 상품 상세 페이지
- [ ] Variant 옵션 선택
- [ ] 체크아웃 (배송정보 입력)
- [ ] 배송비 계산 (우편번호별)
- [ ] 쿠폰 선택 (보유 쿠폰 목록에서)
- [ ] 주문 완료

### 데이터 검증
- [ ] 소계 = 단가 × 수량
- [ ] 배송비 = 기본 4000원 + 도서산간
- [ ] 쿠폰 할인 (배송비 제외)
- [ ] 총액 = (소계 - 쿠폰) + 배송비
- [ ] 재고 차감 확인
- [ ] 쿠폰 사용 처리 (is_used = true)

### 관리자 테스트
- [ ] 상품 등록 (Variant 포함)
- [ ] 주문 상태 변경
- [ ] 주문 수량 조정 → 금액 재계산
- [ ] 송장 번호 입력
- [ ] 발주서 생성 (중복 방지)
- [ ] 쿠폰 생성 및 발급

### Edge Cases
- [ ] 재고 부족 → 구매 불가
- [ ] 쿠폰 만료 → 비활성화
- [ ] 최소 주문 금액 미달
- [ ] 주문 취소 → 재고/쿠폰 복구

---

## 📊 테스트 결과 (최근)

**일시**: 2025-10-06
**전체**: 35개 테스트
**통과**: 26개 (74.3%)

| 카테고리 | 통과 | 실패 |
|---------|------|------|
| 관리자 페이지 | 5/5 | ✅ 100% |
| 성능 테스트 | 4/4 | ✅ 100% |
| 인증 시스템 | 3/3 | ✅ 100% |
| 체크아웃 | 3/3 | ✅ 100% |
| 사용자 페이지 | 7/13 | ⚠️ 53.8% |

**주요 이슈**:
- CSR 로딩 지연 (3초 대기 필요)
- 일부 선택자 불일치 (data-testid 추가 필요)
- SEO 메타 태그 부족

**상세 리포트**: `docs/BUG_REPORT_2025-10-06.md`

---

## 🔧 중요 패턴

### CSR 로딩 대기 (필수!)
```javascript
// ❌ 잘못됨
await page.goto('/');
await page.click('[data-testid="product-card"]'); // 에러!

// ✅ 올바름
await page.goto('/');
await page.waitForTimeout(3000); // CSR 로딩 대기
await page.click('[data-testid="product-card"]');
```

### 쿠폰 적용 (실제 구현)
```javascript
// ❌ 잘못됨 (실제로 없는 기능)
await page.fill('input[name="coupon_code"]', 'DISCOUNT10');

// ✅ 올바름 (실제 구현)
await page.click('button:has-text("쿠폰을 선택")');
await page.click('[data-testid="coupon-item"]:first-child');
```

### 금액 계산 검증
```javascript
// 소계 확인
const subtotal = productPrice * quantity;

// 배송비 확인 (우편번호별)
const shipping = postalCode.startsWith('63') ? 7000 : 4000;

// 쿠폰 할인 (배송비 제외!)
const discount = 5000;

// 총액 = (소계 - 쿠폰) + 배송비
const expectedTotal = (subtotal - discount) + shipping;

expect(actualTotal).toBe(expectedTotal);
```

---

## 📁 테스트 파일 구조

```
tests/
├── README.md (이 파일)
├── real-bugs-detection.spec.js  # ⭐ 실제 버그 자동 탐지 (NEW!)
├── homepage.spec.js        # 홈페이지 기본 기능
├── product.spec.js         # 상품 페이지
├── auth.spec.js            # 로그인/인증
├── checkout.spec.js        # 체크아웃/주문
├── admin.spec.js           # 관리자 페이지
├── performance.spec.js     # 성능 테스트
├── accessibility.spec.js   # 접근성
└── seo.spec.js            # SEO
```

### 🎯 실제 버그 탐지 테스트 (real-bugs-detection.spec.js)

**탐지 가능한 버그 (WORK_LOG_2025-10-06_UNSOLVED.md 기준)**:

1. **🐛 버그 #1, #3**: 프로필 로딩 실패
   - BuyBottomSheet, 체크아웃 페이지에서 name, phone 빈값 탐지
   - sessionStorage 동기화 문제 자동 검증

2. **🐛 버그 #4**: 배송비 계산 오류
   - 기본 배송비 4,000원 검증
   - 제주 도서산간 +3,000원 검증
   - 울릉도 도서산간 +5,000원 검증
   - 총액 계산 정확성 검증

3. **🐛 버그 #5, #6**: 장바구니 주문 병합 / 주문 생성
   - 여러 상품 장바구니 담기 → 1개 주문 생성 검증
   - 중복 주문 생성 탐지

4. **🐛 버그 #2**: 주문 수량 조정 실패
   - 관리자 페이지 수량 조정 기능 검증
   - RLS 정책 오류 탐지

5. **🐛 버그 #7**: 관리자 쿠폰 배포 실패
   - 쿠폰 배포 권한 검증
   - RLS INSERT 정책 오류 탐지

6. **🐛 버그 #8**: Auth 세션 상태 불명확
   - 로그인 후 세션 유지 검증
   - 페이지 이동/새로고침 후에도 세션 유지 확인

**환경 설정**:
```bash
# 1. .env.test.example을 .env.test로 복사
cp .env.test.example .env.test

# 2. .env.test 파일 편집
# TEST_USER_TOKEN=실제토큰
# ADMIN_TOKEN=관리자토큰

# 3. 테스트 실행
npm run test:bugs:headed
```

---

## 🐛 디버깅

### UI 모드 (권장)
```bash
npm run test:ui
```
- 테스트 실행 과정을 시각적으로 확인
- 각 단계별 스크린샷
- 실패 지점 확인 용이

### 리포트 확인
```bash
npm run test:report
```
- 브라우저에서 상세 결과 확인
- 실패한 테스트의 스크린샷 및 비디오

---

## 📚 참고 자료

**프로젝트 문서**:
- `docs/PLAYWRIGHT_TESTING_SCENARIOS_CORRECTED.md` - 정확한 테스트 시나리오 ⭐
- `docs/PLAYWRIGHT_DATA_VALIDATION_TESTS.md` - 데이터 검증 테스트 ⭐
- `docs/PLAYWRIGHT_QUICK_REFERENCE.md` - 빠른 참조
- `docs/BUG_REPORT_2025-10-06.md` - 버그 리포트

**Playwright 공식**:
- [Playwright 공식 문서](https://playwright.dev/)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

---

**마지막 업데이트**: 2025-10-06
