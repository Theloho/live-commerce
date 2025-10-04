# 쿠폰 시스템 DB 함수 에러 수정

**작업일**: 2025-10-04
**상태**: ✅ 완료
**작업 타입**: 버그 수정 (PostgreSQL Function)

---

## 📋 문제 요약

### 증상
- 체크아웃 페이지에서 쿠폰 적용 시 에러 발생
- 에러 메시지: `column reference "coupon_id" is ambiguous`
- PostgreSQL 에러 코드: 42702

### 원인
`validate_coupon` PostgreSQL 함수에서 WHERE 절의 `coupon_id`가 테이블 컬럼인지 변수인지 모호함

```sql
-- ❌ 문제 코드
SELECT * INTO v_user_coupon
FROM user_coupons
WHERE user_id = p_user_id AND coupon_id = v_coupon.id;
-- PostgreSQL이 coupon_id가 user_coupons.coupon_id인지 변수인지 알 수 없음
```

---

## 🔧 해결 방법

### 1. SQL 함수 수정

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

### 2. 적용 방법

**Supabase Dashboard SQL Editor에서 실행:**

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. SQL Editor 메뉴 클릭
4. `/supabase/migrations/fix_validate_coupon.sql` 파일 내용 복사/붙여넣기
5. **Run** 클릭

**결과**: "Success. No rows returned" (정상)

---

## 📝 변경 파일 목록

### SQL 마이그레이션
1. `/supabase/migrations/fix_validate_coupon.sql` - ⭐ 새 파일
2. `/supabase/migrations/20251003_coupon_system.sql` - 주석 추가

### 문서 업데이트
1. `FEATURE_REFERENCE_MAP.md`
   - § 8.4 쿠폰 유효성 검증 - 최근 수정 이력 추가

2. `docs/COUPON_SYSTEM.md`
   - § 트러블슈팅 - 문제 6 추가 (ambiguous 에러)

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

### PostgreSQL Function 작성 시 주의사항

1. **테이블 컬럼 명시**
   - 변수명과 컬럼명이 같을 경우 반드시 테이블 prefix 사용
   - 예: `user_coupons.coupon_id`, `user_coupons.user_id`

2. **함수 파라미터 변경**
   - `CREATE OR REPLACE FUNCTION`으로는 파라미터 이름을 변경할 수 없음
   - 반드시 `DROP FUNCTION` 먼저 실행 필요
   - 시그니처 정확히 명시: `DROP FUNCTION func_name(arg_types)`

3. **에러 코드 의미**
   - `42702`: column reference is ambiguous
   - `42P13`: cannot change name of input parameter

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
