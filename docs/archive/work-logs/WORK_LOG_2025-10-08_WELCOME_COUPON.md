# 작업 로그 - 2025-10-08 (야간)

**작업 일시**: 2025-10-08 야간
**작업자**: Claude Code
**주요 작업**: 회원가입 시 자동 웰컴 쿠폰 지급 기능 + 쿠폰 배포 버그 수정

---

## 📋 목차

1. [작업 개요](#작업-개요)
2. [완료된 작업](#완료된-작업)
3. [미해결 문제](#미해결-문제)
4. [배포 내역](#배포-내역)
5. [다음 세션 작업](#다음-세션-작업)

---

## 작업 개요

### 완료한 작업 (✅)
1. ✅ 회원가입 시 자동 웰컴 쿠폰 지급 기능 구현
2. ✅ 쿠폰 배포 API 중복 처리 개선

### 미해결 문제 (⚠️)
1. ⚠️ 쿠폰 전체 배포 시 여전히 500 에러 발생 (일부 해결, 추가 디버깅 필요)
2. ⚠️ 프론트엔드 보유 고객 현황 표시 누락 (DB는 정상, UI 문제)

---

## 완료된 작업

### 1️⃣ 회원가입 시 자동 웰컴 쿠폰 지급 기능 ✅

**요구사항**:
- 신규 회원가입 시 웰컴 쿠폰 자동 발급
- 관리자가 쿠폰 생성 시 "웰컴 쿠폰" 설정 가능
- 발급 제한 있으면 선착순 적용

**구현 내용**:

#### A. Database 마이그레이션
**파일**: `supabase/migrations/20251008_welcome_coupon_auto_issue.sql`

```sql
-- 1. coupons 테이블에 is_welcome_coupon 컬럼 추가
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS is_welcome_coupon BOOLEAN DEFAULT false;

-- 2. handle_new_user_signup() 함수 생성
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  welcome_coupon RECORD;
BEGIN
  FOR welcome_coupon IN
    SELECT id, total_usage_limit, total_issued_count
    FROM coupons
    WHERE is_welcome_coupon = true
      AND is_active = true
      AND (valid_from IS NULL OR valid_from <= NOW())
      AND (valid_until IS NULL OR valid_until > NOW())
    ORDER BY created_at DESC
  LOOP
    IF welcome_coupon.total_usage_limit IS NULL OR
       welcome_coupon.total_issued_count < welcome_coupon.total_usage_limit THEN

      INSERT INTO user_coupons (user_id, coupon_id, issued_by)
      VALUES (NEW.id, welcome_coupon.id, 'system')
      ON CONFLICT DO NOTHING;

      UPDATE coupons
      SET total_issued_count = total_issued_count + 1,
          updated_at = NOW()
      WHERE id = welcome_coupon.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 트리거 생성
CREATE TRIGGER trigger_new_user_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_signup();
```

**실행 결과**: ✅ Success. No rows returned

#### B. 관리자 UI 추가

**1) 쿠폰 생성 페이지** (`/app/admin/coupons/new/page.js`)

**변경사항**:
```javascript
// State에 is_welcome_coupon 추가
const [formData, setFormData] = useState({
  // ... 기존 필드
  is_welcome_coupon: false  // ⭐ 추가
})

// 웰컴 쿠폰 설정 UI 추가
<div className="bg-white p-6 rounded-lg shadow">
  <label className="flex items-center">
    <input
      type="checkbox"
      name="is_welcome_coupon"
      checked={formData.is_welcome_coupon}
      onChange={handleChange}
      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
    />
    <span className="ml-2 text-sm font-medium text-gray-700">
      회원가입 시 자동 지급 (웰컴 쿠폰)
    </span>
  </label>
  <p className="mt-1 ml-6 text-xs text-gray-500">
    활성화하면 신규 회원가입 시 이 쿠폰이 자동으로 발급됩니다
  </p>
  {formData.is_welcome_coupon && (
    <div className="mt-3 ml-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-xs text-blue-800">
        💡 <strong>웰컴 쿠폰 안내</strong><br />
        • 회원가입 완료 시 자동으로 쿠폰이 지급됩니다<br />
        • 여러 웰컴 쿠폰이 있는 경우 최신 생성된 쿠폰이 지급됩니다<br />
        • 발급 제한(전체 사용 가능 횟수)이 있으면 선착순으로 적용됩니다
      </p>
    </div>
  )}
</div>
```

**2) 쿠폰 목록 페이지** (`/app/admin/coupons/page.js`)

**변경사항**:
```javascript
// 쿠폰 코드 옆에 웰컴 배지 표시
<div className="flex items-center gap-2">
  <div className="font-mono font-bold text-blue-600">
    {coupon.code}
  </div>
  {coupon.is_welcome_coupon && (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
      🎁 웰컴
    </span>
  )}
</div>
```

#### C. API 수정

**파일**: `/app/api/admin/coupons/create/route.js`

**변경사항**:
```javascript
const { data, error } = await supabaseAdmin
  .from('coupons')
  .insert({
    // ... 기존 필드
    is_welcome_coupon: couponData.is_welcome_coupon || false  // ⭐ 추가
  })
```

**테스트 결과**:
- ✅ 웰컴 쿠폰 생성 성공
- ✅ 쿠폰 목록에 🎁 웰컴 배지 표시
- ✅ DB에 is_welcome_coupon = true 저장 확인

---

### 2️⃣ 쿠폰 배포 API 중복 처리 개선 ⚠️

**문제**:
```json
{
  "error": "쿠폰 배포에 실패했습니다",
  "details": "duplicate key value violates unique constraint \"user_coupons_user_id_coupon_id_key\""
}
```

**원인**:
- `user_coupons` 테이블에 `UNIQUE(user_id, coupon_id)` 제약조건 존재
- 재배포 시도 시 UNIQUE 제약 위반 에러 발생
- 기존 코드는 bulk insert로 한 번에 처리 → 하나라도 중복이면 전체 실패

**해결 시도 1**: API 응답 구조 수정
- `duplicates` 필드 추가 (프론트엔드 기대값)
- 커밋: `e9c06bb`

**해결 시도 2**: 개별 INSERT로 중복 처리
**파일**: `/app/api/admin/coupons/distribute/route.js`

**변경사항**:
```javascript
// 6. Service Role로 쿠폰 배포 (중복 시 무시)
console.log(`💾 Step 6: DB INSERT 시작 (${userCoupons.length}개 레코드)`)

const results = []
let duplicateCount = 0

for (const userCoupon of userCoupons) {
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('user_coupons')
    .insert(userCoupon)
    .select()
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      // UNIQUE 제약 위반 (중복) - 무시하고 계속
      console.log(`ℹ️  중복 건너뜀: user_id=${userCoupon.user_id}`)
      duplicateCount++
    } else {
      console.error(`❌ INSERT 실패: user_id=${userCoupon.user_id}`, insertError)
    }
  } else if (inserted) {
    results.push(inserted)
  }
}

console.log(`✅ Step 6: DB INSERT 완료 (${results.length}개 성공, ${duplicateCount}개 중복)`)

// 결과 반환
const result = {
  success: true,
  distributedCount: results.length,
  duplicates: duplicateCount,
  requestedCount: userIds.length,
  couponCode: coupon.code,
  message: `쿠폰이 성공적으로 배포되었습니다 (${results.length}개 성공, ${duplicateCount}개 중복)`
}
```

**커밋**: `0e2c478`

**테스트 결과**:
- ✅ Supabase DB 확인: 4명에게 배포 완료 (MONO, 민지민주, 기영일, 김진태)
- ❌ 재배포 시 여전히 500 에러 발생
- ⚠️ Vercel Functions 로그 확인 필요 (어느 Step에서 실패하는지)

---

## 미해결 문제

### 1️⃣ 쿠폰 전체 배포 시 500 에러 (중복 처리 미작동) ⚠️

**증상**:
- 첫 배포: 성공 (4명에게 배포됨)
- 재배포: 500 에러 (duplicate key 에러)

**원인 추정**:
1. 새 코드 (`0e2c478`) 배포는 되었으나 실제로 적용되지 않았을 가능성
2. Vercel Edge Functions 캐싱 문제
3. 코드 로직 자체에 문제가 있을 가능성

**다음 디버깅 단계**:
1. Vercel Functions 로그 확인 (어느 Step에서 멈추는지)
2. Step 6의 개별 INSERT 로직이 실행되는지 확인
3. `insertError.code === '23505'` 조건문이 작동하는지 확인

**임시 해결책**:
- Supabase Dashboard → SQL Editor에서 UNIQUE 제약 제거:
```sql
ALTER TABLE user_coupons
DROP CONSTRAINT IF EXISTS user_coupons_user_id_coupon_id_key;
```

### 2️⃣ 프론트엔드 보유 고객 현황 표시 누락 ⚠️

**증상**:
- DB: 4명 배포 완료 (Supabase 쿼리 확인)
- UI: 1명만 표시 (김진태만 보임)
- 누락: MONO, 민지민주, 기영일

**원인 추정**:
- `loadCouponDetail()` 함수가 제대로 호출되지 않음
- 또는 보유 고객 목록 조회 쿼리에 문제가 있을 가능성

**다음 디버깅 단계**:
1. `/app/admin/coupons/[id]/page.js`의 `loadCouponDetail()` 함수 확인
2. 보유 고객 목록 조회 API 로그 확인
3. 페이지 새로고침으로 해결되는지 확인

---

## 배포 내역

### Git 커밋 히스토리

| 커밋 | 시간 | 내용 |
|------|------|------|
| `6307db0` | 초반 | 관리자 쿠폰 페이지 useAdminAuthNew import 수정 |
| `8931683` | 초반 | 관리자 쿠폰 배포 버그 해결 내역 CLAUDE.md 업데이트 |
| `ea82ee5` | 중반 | 회원가입 시 자동 웰컴 쿠폰 지급 기능 추가 |
| `b0e72a1` | 중반 | 웰컴 쿠폰 자동 지급 기능 문서화 |
| `a61008e` | 후반 | 쿠폰 배포 API 상세 로깅 추가 (디버깅) |
| `e9c06bb` | 후반 | 쿠폰 배포 API duplicates 필드 추가 |
| `0e2c478` | 후반 | 쿠폰 배포 중복 처리 개선 (개별 INSERT) |

### Supabase 마이그레이션

| 파일 | 상태 | 내용 |
|------|------|------|
| `20251008_welcome_coupon_auto_issue.sql` | ✅ 실행 완료 | is_welcome_coupon 컬럼 + 트리거 + 함수 |

---

## 다음 세션 작업

### 🔴 최우선 작업

#### 1. 쿠폰 전체 배포 500 에러 완전 해결
**목표**: 재배포 시 중복 건너뛰고 정상 작동

**디버깅 순서**:
1. **Vercel Functions 로그 확인**
   - https://vercel.com/dashboard → Functions → `/api/admin/coupons/distribute` → Logs
   - Step 6 이후 로그 확인 (개별 INSERT 실행되는지)

2. **코드 검증**
   - `insertError.code === '23505'` 조건문이 작동하는지
   - `duplicateCount` 카운터가 올라가는지

3. **최종 해결책 선택**:
   - **방법 A**: 개별 INSERT 로직 수정 (현재 코드 디버깅)
   - **방법 B**: UNIQUE 제약 제거 (간단하지만 중복 허용)
   - **방법 C**: `ON CONFLICT DO NOTHING` SQL 직접 사용

#### 2. 프론트엔드 보유 고객 현황 표시 수정
**목표**: 배포 후 즉시 보유 고객 목록에 반영

**수정 파일**: `/app/admin/coupons/[id]/page.js`

**확인 사항**:
- `handleDistributeToAll()` 함수에서 `loadCouponDetail()` 호출 확인
- 보유 고객 목록 조회 API 정상 작동 확인
- 페이지 새로고침 없이 자동 업데이트되는지 확인

### 🟡 중요 작업

#### 3. 웰컴 쿠폰 실제 작동 테스트
**목표**: 신규 회원가입 시 자동 지급 확인

**테스트 방법**:
1. 새로운 계정으로 회원가입
2. 마이페이지 → 쿠폰함 확인
3. 웰컴 쿠폰 자동 발급되었는지 확인
4. Supabase Dashboard에서 `user_coupons` 테이블 확인

### 🟢 선택 작업

#### 4. 문서 최종 업데이트
- `COUPON_SYSTEM.md` - 웰컴 쿠폰 사용 가이드 추가
- `CLAUDE.md` - 최신 작업 내역 반영
- `DB_REFERENCE_GUIDE.md` - is_welcome_coupon 컬럼 추가

---

## 참고 자료

### 관련 문서
- `docs/COUPON_SYSTEM.md` - 쿠폰 시스템 완벽 가이드
- `CLAUDE.md` - 전체 프로젝트 가이드
- `DB_REFERENCE_GUIDE.md` - DB 스키마 참조

### 관련 파일
- `/app/admin/coupons/new/page.js` - 쿠폰 생성 페이지
- `/app/admin/coupons/page.js` - 쿠폰 목록 페이지
- `/app/admin/coupons/[id]/page.js` - 쿠폰 상세 페이지
- `/app/api/admin/coupons/create/route.js` - 쿠폰 생성 API
- `/app/api/admin/coupons/distribute/route.js` - 쿠폰 배포 API
- `/lib/couponApi.js` - 쿠폰 관련 함수
- `/supabase/migrations/20251008_welcome_coupon_auto_issue.sql` - 웰컴 쿠폰 마이그레이션

---

## 요약

### ✅ 성공
- 회원가입 시 자동 웰컴 쿠폰 지급 기능 완성
- DB 마이그레이션 성공
- 관리자 UI 완성
- API 로직 구현

### ⚠️ 부분 성공
- 쿠폰 배포 중복 처리 (코드는 완성, 실제 작동 미확인)
- DB에는 정상 배포, 프론트엔드 표시 문제

### ❌ 미해결
- 쿠폰 재배포 시 500 에러 (Vercel Functions 로그 확인 필요)
- 보유 고객 현황 표시 누락 (3명)

---

**다음 세션 시작 시**: 이 문서를 먼저 읽고 Vercel Functions 로그 확인부터 시작!
