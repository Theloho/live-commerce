# 테스트 토큰 얻는 방법

**목적**: Playwright 실제 버그 탐지 테스트를 위한 액세스 토큰 얻기

---

## 🔑 방법 1: 브라우저 DevTools 사용 (가장 쉬움)

### 1단계: 브라우저에서 로그인

```bash
# 브라우저 열기
open https://allok.shop
```

1. **카카오 로그인** 버튼 클릭
2. 카카오 계정으로 로그인
3. 홈페이지로 리다이렉트 확인

---

### 2단계: 개발자 도구에서 토큰 찾기

**Chrome/Edge**:
1. `F12` 또는 `Cmd+Option+I` (Mac) 눌러 DevTools 열기
2. **Application** 탭 클릭
3. 왼쪽 메뉴: **Storage** → **Cookies** → `https://allok.shop`
4. 쿠키 목록에서 찾기:
   - `sb-access-token` → 값 복사 ✅
   - `sb-refresh-token` → 값 복사 ✅

**Firefox**:
1. `F12` 눌러 DevTools 열기
2. **Storage** 탭 클릭
3. **Cookies** → `https://allok.shop`
4. `sb-access-token` 값 복사

---

### 3단계: LocalStorage/SessionStorage 확인 (선택)

**DevTools Console에서 실행**:
```javascript
// SessionStorage 확인
JSON.parse(sessionStorage.getItem('userProfile'))

// 출력 예시:
// {
//   id: "abc-123-def",
//   kakao_id: "3456789012",
//   name: "홍길동",
//   phone: "01012345678"
// }
```

**카카오 ID 복사**: `kakao_id` 값 (예: `3456789012`)

---

## 🔧 방법 2: Supabase Dashboard 사용

### 1단계: Supabase Dashboard 접속

```bash
# Supabase 프로젝트 대시보드
https://supabase.com/dashboard/project/YOUR_PROJECT_ID
```

---

### 2단계: 사용자 찾기

1. **Authentication** 메뉴 클릭
2. **Users** 탭 클릭
3. 테스트할 사용자 찾기 (이메일 또는 카카오 ID로 검색)

---

### 3단계: 액세스 토큰 생성 (수동)

**주의**: Supabase Dashboard에는 직접적인 "토큰 복사" 기능이 없습니다.

**대안**:
- 방법 1 (브라우저 DevTools) 사용 추천 ✅

---

## 📝 .env.test 파일 생성

### 1단계: 파일 복사

```bash
cp .env.test.example .env.test
```

---

### 2단계: 토큰 입력

`.env.test` 파일 편집:

```bash
# 일반 사용자 토큰 (브라우저 DevTools에서 복사)
TEST_USER_TOKEN=eyJhbGciOiJIUzI1NiIsImtpZCI6IkI...실제토큰...

# 카카오 ID (sessionStorage에서 복사)
TEST_USER_KAKAO_ID=3456789012

# 관리자 토큰 (관리자 계정으로 로그인 후 동일 방법)
ADMIN_TOKEN=eyJhbGciOiJIUzI1NiIsImtpZCI6IkI...관리자토큰...
```

---

## 🚀 테스트 실행

```bash
# 환경변수 확인
cat .env.test

# 테스트 실행
npm run test:bugs:headed
```

---

## 🔍 토큰 검증

### 올바른 토큰인지 확인

**방법 1: API 호출 테스트**
```bash
# 브라우저 Console에서 실행
fetch('https://allok.shop/api/test', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
}).then(r => r.json()).then(console.log)
```

**방법 2: Playwright 테스트로 확인**
```bash
npm run test:bugs -- --grep "세션 유지"
```

성공하면 토큰이 올바른 것입니다!

---

## ⚠️ 주의사항

### 1. 토큰 보안

```bash
# .env.test는 절대 커밋하지 마세요!
# .gitignore에 이미 추가되어 있습니다

# 확인:
cat .gitignore | grep .env.test
```

### 2. 토큰 만료

**Supabase 액세스 토큰은 1시간 후 만료됩니다.**

만료 시 증상:
```
Error: JWT expired
```

해결 방법:
1. 브라우저에서 다시 로그인
2. 새 토큰 복사
3. `.env.test` 업데이트
4. 테스트 재실행

### 3. 관리자 토큰

**관리자 계정으로 로그인한 상태**에서 토큰을 가져와야 합니다.

확인 방법:
```javascript
// 브라우저 Console
sessionStorage.getItem('userProfile')
// is_admin: true 확인
```

---

## 📊 토큰 형식

### 올바른 형식

```
eyJhbGciOiJIUzI1NiIsImtpZCI6IkIxNjhCRkQ3...
```

- `eyJ`로 시작
- 매우 긴 문자열 (200+ 자)
- 점(.)으로 구분된 3개 부분

### 잘못된 형식

```
❌ undefined
❌ null
❌ ""
❌ 짧은 문자열 (50자 미만)
```

---

## 🎯 전체 프로세스 요약

```bash
# 1. 브라우저 로그인
open https://allok.shop
# → 카카오 로그인

# 2. DevTools 열기 (F12)
# → Application → Cookies → sb-access-token 복사

# 3. .env.test 파일 생성
cp .env.test.example .env.test

# 4. 토큰 입력
# TEST_USER_TOKEN=복사한토큰

# 5. 테스트 실행
npm run test:bugs:headed

# 6. 결과 확인
# ✅ 통과: 버그 수정됨
# ❌ 실패: 버그 탐지!
```

---

**소요 시간**: 2-3분

**난이도**: ⭐⭐☆☆☆ (쉬움)

---

**작성일**: 2025-10-06
