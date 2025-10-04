# 쿠폰 시스템 DB 함수 에러 수정 (2건)

**작업일**: 2025-10-04
**상태**: ✅ 완료
**작업 타입**: 버그 수정 (PostgreSQL Function + JS API)

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

## 📝 변경 파일 목록

### 코드 수정
1. ✅ `lib/couponApi.js` - validateCoupon() 파라미터 수정 (p_product_amount)

### SQL 마이그레이션
1. ✅ `/supabase/migrations/fix_validate_coupon.sql` - ⭐ 새 파일
2. ✅ `/supabase/migrations/20251003_coupon_system.sql` - 주석 추가

### 문서 업데이트
1. ✅ `FEATURE_REFERENCE_MAP.md`
   - § 8.4 쿠폰 유효성 검증 - 최근 수정 이력 추가 (2건)

2. ✅ `docs/COUPON_SYSTEM.md`
   - § 트러블슈팅 - 문제 6 추가 (2건: ambiguous + 404)

3. ✅ `docs/archive/work-logs/WORK_LOG_2025-10-04_COUPON_FIX.md`
   - 작업 로그 상세 기록

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

## 🔗 관련 문서

- **COUPON_SYSTEM.md** - § 트러블슈팅 문제 6
- **FEATURE_REFERENCE_MAP.md** - § 8.4 쿠폰 유효성 검증
- **DB_REFERENCE_GUIDE.md** - § coupons, user_coupons 테이블

---

## 📊 영향도

### 영향받는 기능
- ✅ 쿠폰 적용 (체크아웃 페이지)
- ✅ 쿠폰 검증 (모든 페이지)

### 영향받지 않는 기능
- ✅ 쿠폰 발행
- ✅ 쿠폰 배포
- ✅ 쿠폰 사용 처리 (use_coupon 함수는 별개)
- ✅ 쿠폰 목록 조회

---

**작업 완료**: 2025-10-04
**작업자**: Claude Code
**승인**: 사용자 테스트 완료
