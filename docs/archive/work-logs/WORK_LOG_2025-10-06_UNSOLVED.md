# 🚨 미해결 문제 리스트 (2025-10-06)

## 날짜: 2025-10-06
**작업 시간**: 2시간+
**해결**: 0개
**상태**: 전부 실패

---

## 1. ❌ BuyBottomSheet 프로필 로딩 실패

**증상:**
```javascript
사용자 프로필: {name: '사용자', phone: '', address: '', detail_address: '', postal_code: ''}
```

**시도한 해결책:**
- [x] BuyBottomSheet.jsx DB 직접 조회 추가 (line 35-86)
- [x] name, phone, nickname 필드 추가
- [x] sessionStorage 동기화

**결과:** 실패 - 여전히 빈값

**근본 원인 (추정):**
- sessionStorage에 phone/address 필드가 없음
- useEffect 타이밍 문제
- DB 조회는 되지만 state 업데이트 안됨

**파일:**
- `/app/components/product/BuyBottomSheet.jsx` (line 28-90)

---

## 2. ❌ 주문 수량 조정 실패 ("주문 아이템을 찾을 수 없습니다")

**증상:**
```
주문 수량 업데이트 오류: Error: 주문 아이템을 찾을 수 없습니다
```

**시도한 해결책:**
- [x] order_items UPDATE RLS 정책 추가
- [x] 정책 확인: `Users can update their order items` 존재 확인

**결과:** 실패 - RLS 정책 있어도 여전히 실패

**근본 원인 (추정):**
- RLS USING 조건 불일치
- auth.uid() NULL 가능성
- order_id 매칭 실패

**마이그레이션:**
- `/supabase/migrations/20251006_add_order_items_update_policy.sql`

**Supabase 정책 상태:**
```
| tablename   | policyname                         | cmd    |
| ----------- | ---------------------------------- | ------ |
| order_items | Users can update their order items | UPDATE |
```

---

## 3. ❌ 체크아웃 검증 실패 ("연락처" 에러)

**증상:**
```javascript
🔍 검증 실패: {userProfile: {…}, selectedAddress: {…}, missing: Array(1)}
다음 정보를 입력해주세요: 연락처
```

**시도한 해결책:**
- [x] 체크아웃 페이지 DB 직접 조회 (line 163-241)
- [x] auth/callback 페이지 sessionStorage 완전 저장
- [x] useAuth 이벤트 리스너 sessionStorage 업데이트

**결과:** 실패 - userProfile.phone 여전히 빈값

**근본 원인 (추정):**
- 카카오 로그인 시 DB에 phone 저장 안됨
- profiles 테이블에 phone 컬럼 NULL
- sessionStorage 동기화 타이밍 문제

**파일:**
- `/app/checkout/page.js` (line 163-241, 729-752)
- `/app/auth/callback/page.js` (line 342-361)
- `/app/hooks/useAuth.js` (line 36-52)

---

## 4. ❌ 배송비 계산 오류

**증상:**
```
결제 금액에 도서산간 비용 계산 안됨
₩2,952,000 + ₩4,000 + ₩5,000 = ₩2,956,000 (틀림, 2,961,000이어야 함)
```

**시도한 해결책:**
- [x] 기본 배송비 3000 → 4000 원 변경
- [x] calculateShippingFee 우편번호 직접 전달
- [x] formatShippingInfo(4000, postalCode) 모든 곳 적용

**결과:** 실패 - 도서산간 추가 비용 계산 안됨

**근본 원인 (추정):**
- postalCode가 함수까지 전달 안됨
- shippingInfo.region이 NULL
- 계산 로직 자체 오류

**파일:**
- `/lib/orderCalculations.js` (line 36-83)
- `/app/checkout/page.js` (line 624, 1433)

---

## 5. ❌ 장바구니 주문 중복 생성 (→ 병합 로직 추가 후 더 악화)

**초기 증상:**
```
동일 상품 3개 선택 → 3개 별도 주문 생성
(이전: 1개 주문 + 여러 아이템)
```

**시도한 해결책:**
- [x] createOrder 장바구니 병합 로직 추가 (line 827-858)
- [x] createOrderWithOptions 동일 로직 추가 (line 553-582)
- [x] 기존 pending 주문 검색 → 아이템만 추가

**결과:** 더 악화 - 사용자 보고 "더 이상해졌음"

**근본 원인:**
- 병합 로직 자체가 문제
- 이전 코드로 돌려야 함
- 아니면 완전히 다른 접근 필요

**파일:**
- `/lib/supabaseApi.js` (createOrder: line 810-1100, createOrderWithOptions: line 523-780)
- `/app/components/product/BuyBottomSheet.jsx` (line 480-537)

---

## 6. ❌ 주문 생성 실패

**증상:**
- 주문 생성 자체가 실패
- RLS 정책 문제 가능성

**시도한 해결책:**
- [x] orders INSERT 정책 확인
- [x] 카카오 사용자 패턴 매칭 확인

**결과:** 미테스트 - 다른 문제들로 확인 못함

---

## 7. ❌ 관리자 쿠폰 배포 실패

**증상:**
- 권한 에러 발생

**시도한 해결책:**
- [x] user_coupons INSERT 정책 확인

**결과:** 미테스트

---

## 8. ❌ Auth 세션 디버깅 로그 추가 (배포 안됨)

**시도한 해결책:**
- [x] 체크아웃/주문목록 페이지에 auth.uid() 확인 로그 추가

**결과:** 배포 안됨 - Vercel 빌드 대기 중?

**파일:**
- `/app/checkout/page.js` (line 32-45)
- `/app/orders/page.js` (line 36-50)

---

## 📊 요약

| 문제 | 시도 | 결과 | 우선순위 |
|------|------|------|----------|
| BuyBottomSheet 프로필 | 3회 | 실패 | 🔴 HIGH |
| 주문 수량 조정 | 2회 | 실패 | 🔴 HIGH |
| 체크아웃 검증 | 3회 | 실패 | 🔴 HIGH |
| 배송비 계산 | 3회 | 실패 | 🟡 MED |
| 장바구니 병합 | 1회 | 악화 | 🔴 HIGH |
| 주문 생성 | 1회 | 미확인 | 🟡 MED |
| 쿠폰 배포 | 1회 | 미확인 | 🟢 LOW |
| Auth 디버깅 | 1회 | 배포안됨 | 🔴 HIGH |

**해결률: 0/8 (0%)**

---

## 🔍 핵심 문제

### 1. Auth 세션 상태 불명확
- `auth.uid()`가 NULL인지 확인 필요
- RLS 정책이 모두 `auth.uid()` 기반
- NULL이면 모든 정책 실패

### 2. 카카오 로그인 프로필 데이터 누락
- sessionStorage에 phone/address 없음
- DB에도 저장 안됨 가능성
- 초기 회원가입 시점부터 문제

### 3. 장바구니 로직 근본적 문제
- 이전 코드도 for loop로 여러 주문 생성
- 병합 로직 추가했지만 더 악화
- 완전히 다른 접근 필요

---

## 🚨 다음 세션 우선순위

1. **Auth 세션 확인** (최우선)
   - Supabase Dashboard에서 auth.users 확인
   - 카카오 사용자 실제 세션 상태 확인
   - `auth.uid()` NULL 여부 확인

2. **프로필 데이터 확인**
   - profiles 테이블 직접 확인
   - phone, address 컬럼 데이터 존재 여부
   - 카카오 회원가입 플로우 검증

3. **장바구니 로직 롤백**
   - 병합 로직 제거
   - 이전 버전으로 복구
   - 또는 완전히 새로운 설계

---

## 📝 작업 이력

### 커밋 로그
```
66cfb80 - fix: BuyBottomSheet 프로필 로딩 수정 (name, phone 정보 추가) [실패]
a14acd6 - fix: order_items UPDATE RLS 정책 추가 (주문 수량 조정 활성화) [실패]
decab29 - debug: Auth 세션 상태 확인 로그 추가 (RLS 디버깅) [배포안됨]
43d4abd - fix: 장바구니 주문 병합 로직 구현 (1주문+여러아이템) [악화]
```

### 수정 파일 (전부 실패)
- `/app/components/product/BuyBottomSheet.jsx`
- `/app/checkout/page.js`
- `/app/orders/page.js`
- `/app/auth/callback/page.js`
- `/app/hooks/useAuth.js`
- `/lib/supabaseApi.js`
- `/lib/orderCalculations.js`
- `/supabase/migrations/20251006_add_order_items_update_policy.sql`

---

**마지막 업데이트**: 2025-10-06
**작성자**: Claude Code (실패 문서화)
