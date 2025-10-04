# 쿠폰 시스템 완전 수정 (3건)

**작업일**: 2025-10-04
**상태**: ✅ 완료
**작업 타입**: 버그 수정 (PostgreSQL Function + JS API + 체크아웃)

---

## 📋 문제 요약

### 문제 1: PostgreSQL 함수 에러 (42702)

**증상**:
- 에러 메시지: `column reference "coupon_id" is ambiguous`
- PostgreSQL 에러 코드: 42702

**원인**:
`validate_coupon` PostgreSQL 함수에서 WHERE 절의 `coupon_id`가 테이블 컬럼인지 변수인지 모호함

```sql
-- ❌ 문제 코드
SELECT * INTO v_user_coupon
FROM user_coupons
WHERE user_id = p_user_id AND coupon_id = v_coupon.id;
-- PostgreSQL이 coupon_id가 user_coupons.coupon_id인지 변수인지 알 수 없음
```

---

### 문제 2: JS API 파라미터 불일치 (404)

**증상**:
- HTTP 상태: `404 Not Found`
- 에러 코드: `PGRST202`
- 메시지: `Could not find the function public.validate_coupon(p_coupon_code, p_order_amount, p_user_id)`

**원인**:
JS API 호출 시 `p_order_amount` 사용, SQL 함수는 `p_product_amount` 기대

```javascript
// ❌ 문제 코드 (lib/couponApi.js)
await supabase.rpc('validate_coupon', {
  p_coupon_code: couponCode.toUpperCase(),
  p_user_id: userId,
  p_order_amount: orderAmount  // ❌ SQL 함수는 p_product_amount 기대
})
```

---

### 문제 3: user_id 우선순위 불일치

**증상**:
- 쿠폰 목록에 쿠폰이 보임
- 쿠폰 적용 시 "보유하지 않은 쿠폰입니다" 토스트 에러

**원인**:
쿠폰 목록 조회와 검증에서 user_id 우선순위가 달라서 다른 user_id로 조회/검증

```javascript
// ❌ 문제 코드 (app/checkout/page.js)
// 쿠폰 목록 조회
const currentUser = sessionUser || user  // sessionUser 우선
getUserCoupons(currentUser.id)

// 쿠폰 검증
validateCoupon(code, user?.id || userSession?.id, amount)  // user 우선 ❌
// → 카카오 사용자는 userSession에만 존재하므로 다른 user_id로 검증됨
```

**근본 원인**:
- 카카오 로그인: `userSession`에만 존재, `user`는 null
- Supabase Auth: `user`에만 존재, `userSession`은 null
- 우선순위가 다르면 조회/검증이 다른 user_id로 실행됨

---

## 🔧 해결 방법

### 1. SQL 함수 수정 (문제 1 해결)

**파일**: `/supabase/migrations/fix_validate_coupon.sql`

```sql
-- 기존 함수 삭제 (파라미터 변경 시 필수)
DROP FUNCTION IF EXISTS validate_coupon(character varying, uuid, numeric);

CREATE OR REPLACE FUNCTION validate_coupon(
    p_coupon_code VARCHAR(50),
    p_user_id UUID,
    p_product_amount DECIMAL(12, 2)
)
RETURNS TABLE (...) AS $$
DECLARE
    v_coupon RECORD;
    v_user_coupon RECORD;
    v_discount DECIMAL(12, 2);
BEGIN
    -- ... (검증 로직) ...

    -- ✅ 수정: 테이블 prefix 추가
    SELECT * INTO v_user_coupon
    FROM user_coupons
    WHERE user_coupons.user_id = p_user_id
      AND user_coupons.coupon_id = v_coupon.id;

    -- ... (나머지 로직) ...
END;
$$ LANGUAGE plpgsql;
```

**적용 방법 (Supabase Dashboard)**:
1. https://supabase.com/dashboard 접속
2. SQL Editor → 파일 내용 복사/붙여넣기 → Run

**결과**: "Success. No rows returned" (정상) ✅

---

### 2. JS API 파라미터 수정 (문제 2 해결)

**파일**: `/lib/couponApi.js`

```javascript
// ✅ 수정: p_order_amount → p_product_amount
const { data, error } = await supabase.rpc('validate_coupon', {
  p_coupon_code: couponCode.toUpperCase(),
  p_user_id: userId,
  p_product_amount: orderAmount  // ✅ SQL 함수 시그니처와 일치
})
```

**적용 방법**:
```bash
git add lib/couponApi.js
git commit -m "fix: 쿠폰 검증 파라미터 이름 수정 (p_product_amount)"
git push
```

**결과**: Vercel 자동 배포 ✅

---

### 3. 체크아웃 user_id 우선순위 통일 (문제 3 해결)

**파일**: `/app/checkout/page.js`

```javascript
// ✅ 수정: 쿠폰 목록 조회와 동일한 우선순위 사용
const handleApplyCoupon = async (userCoupon) => {
  try {
    const coupon = userCoupon.coupon

    // ✅ userSession 우선 (목록 조회와 동일)
    const currentUser = userSession || user

    // DB 함수로 쿠폰 검증
    const result = await validateCoupon(coupon.code, currentUser?.id, orderItem.totalPrice)

    // ...
  }
}
```

**적용 방법**:
```bash
git add app/checkout/page.js
git commit -m "fix: 쿠폰 검증 user_id 불일치 수정"
git push
```

**결과**: "보유하지 않은 쿠폰" 에러 해결 ✅

---

## 📝 변경 파일 목록

### 코드 수정
1. ✅ `lib/couponApi.js` - validateCoupon() 파라미터 수정 (p_product_amount)
2. ✅ `app/checkout/page.js` - handleApplyCoupon() user_id 우선순위 통일 (userSession || user)

### SQL 마이그레이션
1. ✅ `/supabase/migrations/fix_validate_coupon.sql` - ⭐ 새 파일
2. ✅ `/supabase/migrations/20251003_coupon_system.sql` - 주석 추가

### 문서 업데이트
1. ✅ `FEATURE_REFERENCE_MAP.md`
   - § 8.4 쿠폰 유효성 검증 - 최근 수정 이력 추가 (3건)

2. ✅ `docs/COUPON_SYSTEM.md`
   - § 트러블슈팅 - 문제 6 추가 (2건: ambiguous + 404)
   - § 트러블슈팅 - 문제 7 추가 (user_id 우선순위 불일치)

3. ✅ `docs/archive/work-logs/WORK_LOG_2025-10-04_COUPON_FIX.md`
   - 작업 로그 상세 기록 (3건 완료)

### 보조 파일 (참고용)
1. `/scripts/apply-coupon-fix.js` - 자동 적용 스크립트 (미사용)
2. `/app/api/admin/migrate-coupon-fix/route.js` - API Route (미사용)

---

## ✅ 테스트 결과

### 테스트 환경
- **브라우저**: 프로덕션 환경
- **페이지**: `/checkout`
- **쿠폰**: 사용자 보유 쿠폰

### 테스트 시나리오
1. ✅ 체크아웃 페이지 접속
2. ✅ 쿠폰 선택 버튼 클릭
3. ✅ 쿠폰 적용 버튼 클릭
4. ✅ 할인 금액 정상 표시
5. ✅ 에러 없이 정상 작동

**결과**: 쿠폰 적용 정상 작동 확인 ✅

---

## 🎓 배운 점

### 1. PostgreSQL Function 작성 시 주의사항

**테이블 컬럼 명시**:
- 변수명과 컬럼명이 같을 경우 반드시 테이블 prefix 사용
- 예: `user_coupons.coupon_id`, `user_coupons.user_id`

**함수 파라미터 변경**:
- `CREATE OR REPLACE FUNCTION`으로는 파라미터 이름을 변경할 수 없음
- 반드시 `DROP FUNCTION` 먼저 실행 필요
- 시그니처 정확히 명시: `DROP FUNCTION func_name(arg_types)`

**에러 코드 의미**:
- `42702`: column reference is ambiguous
- `42P13`: cannot change name of input parameter

---

### 2. Supabase RPC 파라미터 매칭

**Named Parameter 사용**:
- Supabase RPC는 **파라미터 이름**으로 함수 시그니처를 찾음
- 순서가 아닌 **이름**이 일치해야 함

**잘못된 예**:
```javascript
// SQL: validate_coupon(p_coupon_code, p_user_id, p_product_amount)
// JS: p_order_amount ❌
await supabase.rpc('validate_coupon', {
  p_coupon_code: 'ABC',
  p_user_id: 'uuid',
  p_order_amount: 10000  // ❌ 404 Not Found
})
```

**올바른 예**:
```javascript
// SQL과 정확히 일치
await supabase.rpc('validate_coupon', {
  p_coupon_code: 'ABC',
  p_user_id: 'uuid',
  p_product_amount: 10000  // ✅ 정상 작동
})
```

**디버깅 팁**:
- Supabase 에러 메시지의 `hint` 필드 확인
- 힌트에 올바른 시그니처가 표시됨
- 예: `Perhaps you meant to call the function public.validate_coupon(p_coupon_code, p_product_amount, p_user_id)`

---

### 3. 다중 인증 시스템에서 user_id 일관성 유지

**배경**:
- 카카오 로그인: sessionStorage의 `userSession` 사용
- Supabase Auth: Supabase의 `user` 사용
- 두 시스템은 상호 배타적 (동시에 존재하지 않음)

**문제**:
- 기능 A: `sessionUser || user` (sessionUser 우선)
- 기능 B: `user?.id || userSession?.id` (user 우선)
- → 같은 사용자인데 다른 user_id로 인식됨

**해결책**:
```javascript
// ✅ 전체 앱에서 일관된 우선순위 사용
const currentUser = userSession || user  // 항상 동일한 순서

// 모든 API 호출에 동일한 user_id 사용
getUserCoupons(currentUser?.id)
validateCoupon(code, currentUser?.id, amount)
applyCouponUsage(currentUser?.id, couponId, orderId, discount)
```

**교훈**:
- 다중 인증 시스템에서는 **우선순위 통일** 필수
- 전역 상수로 정의하거나 유틸 함수로 추상화 권장
- 예: `const getCurrentUserId = () => (userSession || user)?.id`

---

## 🔗 관련 문서

- **COUPON_SYSTEM.md** - § 트러블슈팅 문제 6
- **FEATURE_REFERENCE_MAP.md** - § 8.4 쿠폰 유효성 검증
- **DB_REFERENCE_GUIDE.md** - § coupons, user_coupons 테이블

---

## 📊 영향도

### 영향받는 기능 (3건 모두 해결)
1. ✅ **쿠폰 검증** - ambiguous 에러 해결 (PostgreSQL 함수)
2. ✅ **쿠폰 API 호출** - 404 에러 해결 (파라미터 이름 일치)
3. ✅ **쿠폰 적용** - "보유하지 않은 쿠폰" 에러 해결 (user_id 우선순위 통일)

### 영향받지 않는 기능
- ✅ 쿠폰 발행
- ✅ 쿠폰 배포
- ✅ 쿠폰 사용 처리 (use_coupon 함수는 별개)
- ✅ 쿠폰 목록 조회

---

**작업 완료**: 2025-10-04
**작업자**: Claude Code
**승인**: 사용자 테스트 완료 (3건 모두 해결)
