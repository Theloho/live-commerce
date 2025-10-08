# 다음 세션 작업 가이드 (2025-10-08 이후)

**이전 세션**: 2025-10-08 야간
**상태**: 웰컴 쿠폰 기능 완료, 쿠폰 배포 버그 부분 해결

---

## 🚨 최우선 작업 (즉시 해결 필요)

### 1️⃣ 쿠폰 전체 배포 500 에러 해결

**현상**:
- 첫 배포: 성공 (4명 배포됨)
- 재배포: 500 에러 (`duplicate key violates unique constraint`)

**문제**:
```json
{
  "error": "쿠폰 배포에 실패했습니다",
  "details": "duplicate key value violates unique constraint \"user_coupons_user_id_coupon_id_key\""
}
```

**배포된 코드** (커밋: `0e2c478`):
- 개별 INSERT로 중복 건너뛰기 로직 구현
- 에러 코드 `23505` 감지하면 무시하고 계속

**하지만**: 여전히 500 에러 발생 ❌

**디버깅 순서**:

#### Step 1: Vercel Functions 로그 확인 (필수!)
```
1. https://vercel.com/dashboard 접속
2. 프로젝트 선택
3. Functions 탭 클릭
4. /api/admin/coupons/distribute 선택
5. Logs 탭에서 최근 로그 확인
```

**확인할 내용**:
```
🚀 쿠폰 배포 API 시작
✅ Step 0: supabaseAdmin 클라이언트 확인 완료
✅ Step 1: 요청 바디 파싱 완료
✅ Step 2: 필수 파라미터 검증 완료
🔐 Step 3: 관리자 권한 확인 시작
✅ Step 3: 관리자 권한 확인 완료
📋 Step 4: 쿠폰 조회 시작
✅ Step 4: 쿠폰 조회 완료
📝 Step 5: 사용자 쿠폰 데이터 생성 시작
✅ Step 5: 사용자 쿠폰 데이터 생성 완료
💾 Step 6: DB INSERT 시작 (X개 레코드)
```

**질문**:
- Step 6 이후에 `ℹ️  중복 건너뜀` 메시지가 나오는가?
- `✅ Step 6: DB INSERT 완료` 메시지가 나오는가?
- 아니면 다른 에러가 나오는가?

#### Step 2: 코드 검증
**파일**: `/app/api/admin/coupons/distribute/route.js`

**확인할 부분** (lines 115-145):
```javascript
for (const userCoupon of userCoupons) {
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('user_coupons')
    .insert(userCoupon)
    .select()
    .single()

  if (insertError) {
    if (insertError.code === '23505') {  // ⭐ 이 조건이 작동하는가?
      console.log(`ℹ️  중복 건너뜀: user_id=${userCoupon.user_id}`)
      duplicateCount++
    } else {
      console.error(`❌ INSERT 실패: user_id=${userCoupon.user_id}`, insertError)
    }
  } else if (inserted) {
    results.push(inserted)
  }
}
```

#### Step 3: 해결 방법 선택

**방법 A**: 코드 수정 (insertError.code 확인 로직 개선)
```javascript
// insertError 구조 확인
console.log('insertError 전체:', JSON.stringify(insertError, null, 2))
console.log('insertError.code:', insertError.code)
console.log('insertError.details:', insertError.details)

// 더 안전한 체크
if (insertError.message?.includes('duplicate key') ||
    insertError.code === '23505' ||
    insertError.details?.includes('user_coupons_user_id_coupon_id_key')) {
  // 중복 처리
}
```

**방법 B**: UNIQUE 제약조건 제거 (가장 간단)
```sql
-- Supabase Dashboard → SQL Editor
ALTER TABLE user_coupons
DROP CONSTRAINT IF EXISTS user_coupons_user_id_coupon_id_key;
```

**장단점**:
- 방법 A: 안전하지만 디버깅 필요
- 방법 B: 즉시 해결되지만 중복 발급 허용됨

**추천**: 일단 **방법 B**로 빠르게 해결 후, 나중에 필요하면 제약조건 다시 추가

---

### 2️⃣ 프론트엔드 보유 고객 현황 표시 누락

**현상**:
- **DB**: 4명 배포 완료 (MONO, 민지민주, 기영일, 김진태)
- **UI**: 1명만 표시 (김진태)
- **누락**: 3명 (MONO, 민지민주, 기영일)

**확인 방법**:
```sql
-- Supabase Dashboard → SQL Editor
SELECT
  uc.*,
  p.name,
  p.email
FROM user_coupons uc
LEFT JOIN profiles p ON uc.user_id = p.id
WHERE uc.coupon_id = '133ebf5e-6614-4c3c-a658-a9f14bf130bf'
ORDER BY uc.created_at DESC;
```

**해결 방법**:
1. **페이지 새로고침**: 가장 간단한 방법
2. **loadCouponDetail() 함수 확인**: `/app/admin/coupons/[id]/page.js`
   - 배포 후 자동으로 호출되는지 확인
   - API 응답에 모든 데이터가 포함되는지 확인

---

## ✅ 완료된 작업 (확인만 필요)

### 웰컴 쿠폰 자동 지급 기능

**테스트 방법**:
1. 새로운 계정으로 회원가입
2. 마이페이지 → 쿠폰함 확인
3. 웰컴 쿠폰 자동 발급되었는지 확인

**확인 쿼리**:
```sql
-- 최근 발급된 웰컴 쿠폰 확인
SELECT
  uc.*,
  p.name,
  p.email,
  c.code,
  c.name as coupon_name
FROM user_coupons uc
LEFT JOIN profiles p ON uc.user_id = p.id
LEFT JOIN coupons c ON uc.coupon_id = c.id
WHERE uc.issued_by = 'system'
ORDER BY uc.created_at DESC
LIMIT 10;
```

---

## 📚 참고 자료

### 관련 문서
- `docs/archive/work-logs/WORK_LOG_2025-10-08_WELCOME_COUPON.md` - 상세 작업 로그
- `docs/COUPON_SYSTEM.md` - 쿠폰 시스템 가이드
- `CLAUDE.md` - 전체 프로젝트 가이드

### 주요 파일
- `/app/api/admin/coupons/distribute/route.js` - 쿠폰 배포 API (중복 처리 로직)
- `/app/admin/coupons/[id]/page.js` - 쿠폰 상세 페이지
- `/supabase/migrations/20251008_welcome_coupon_auto_issue.sql` - 웰컴 쿠폰 마이그레이션

### 배포 커밋
- `0e2c478` - 쿠폰 배포 중복 처리 개선 (최신)
- `ea82ee5` - 회원가입 시 자동 웰컴 쿠폰 지급 기능 추가

---

## 🎯 작업 순서 추천

1. **Vercel Functions 로그 확인** (5분)
2. **UNIQUE 제약조건 제거** (1분) - 빠른 해결
3. **재배포 테스트** (2분) - 정상 작동 확인
4. **프론트엔드 표시 수정** (10분) - 보유 고객 현황
5. **웰컴 쿠폰 실제 테스트** (5분) - 회원가입 테스트
6. **문서 최종 업데이트** (5분)

**총 예상 시간**: 30분

---

**다음 세션 시작 시 이 문서부터 읽으세요!**
