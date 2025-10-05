# 관리자/고객 인증 시스템 분리 작업 계획서

**작성일**: 2025-10-05
**목적**: 관리자와 고객 인증 시스템을 근본적으로 분리하여 세션 충돌, RLS 복잡도, 보안 문제 해결

---

## 📋 목차
1. [현재 문제점](#1-현재-문제점)
2. [해결 방안](#2-해결-방안)
3. [전체 작업 순서](#3-전체-작업-순서)
4. [영향받는 파일 목록](#4-영향받는-파일-목록)
5. [DB 마이그레이션 계획](#5-db-마이그레이션-계획)
6. [상세 작업 체크리스트](#6-상세-작업-체크리스트)
7. [테스트 계획](#7-테스트-계획)
8. [롤백 계획](#8-롤백-계획)

---

## 1. 현재 문제점

### 1.1 세션 충돌
```
관리자 로그인 (master@allok.world)
  ↓ localStorage 저장 (Supabase Auth)
카카오 사용자 로그인
  ↓ localStorage 덮어쓰기 시도
  ↓ 세션 충돌 ❌
```

**문제:**
- Supabase Auth는 브라우저당 하나의 세션만 지원
- localStorage 공유로 관리자/고객 동시 로그인 불가능
- 탭마다 다른 사용자 로그인 불가능

### 1.2 RLS 정책 복잡도
```sql
-- 현재: 관리자/고객 혼재
CREATE POLICY "Users view own orders"
ON orders FOR SELECT TO authenticated
USING (
  user_id = auth.uid()  -- 관리자용
  OR
  order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'  -- 카카오 고객용
);
```

**문제:**
- 고객/관리자 구분 복잡
- get_current_user_kakao_id() 함수 순환 참조 (auth.uid() → profiles → RLS → auth.uid()...)
- 카카오 사용자는 auth.uid() = NULL → RLS 적용 안 됨

### 1.3 고객 리스트에 관리자 포함
```sql
SELECT * FROM profiles WHERE is_admin = false;  -- 고객만 조회
```

**문제:**
- 비즈니스 로직 오염 (고객 목록에 관리자 제외 필요)
- 데이터 구조 혼재 (관리자 ≠ 고객)

---

## 2. 해결 방안

### 2.1 최종 구조

```
┌─────────────────────────────────────────────────────────────┐
│ 관리자 시스템 (완전 분리)                                     │
├─────────────────────────────────────────────────────────────┤
│ - admins 테이블 (profiles와 분리)                             │
│ - JWT 직접 발급 또는 별도 세션 관리                           │
│ - localStorage 키: admin_session                              │
│ - RLS 없음 (관리자는 모든 데이터 접근)                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 고객 시스템 (Supabase Auth 통합)                              │
├─────────────────────────────────────────────────────────────┤
│ - profiles 테이블 (순수 고객만)                               │
│ - Supabase Auth (카카오 포함)                                 │
│ - localStorage 키: supabase-auth-token                        │
│ - RLS: user_id = auth.uid() (단순!)                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 장점

1. ✅ **세션 충돌 원천 차단** (완전히 다른 시스템)
2. ✅ **탭 독립성 완벽 유지** (관리자: 별도 세션, 고객: Supabase)
3. ✅ **RLS 정책 초단순화** (고객만 고려)
4. ✅ **고객 리스트에서 관리자 자동 제외**
5. ✅ **보안 강화** (테이블/인증 완전 분리)

---

## 3. 전체 작업 순서

### Phase 1: 관리자 분리 (우선 작업)
1. `admins` 테이블 생성
2. 관리자 인증 시스템 별도 구현
3. `/admin` 페이지 모두 수정
4. `profiles`에서 `is_admin` 제거

### Phase 2: 카카오 Supabase Auth 디버깅 및 완성
5. 카카오 로그인 localStorage 토큰 저장 문제 해결
6. sessionStorage → auth.uid() 전환 완료
7. UserProfileManager 카카오 플래그 제거

### Phase 3: 테스트 및 마이그레이션
8. 기존 카카오 사용자 마이그레이션
9. 기존 관리자 admins 테이블로 이동
10. RLS 정책 업데이트
11. 문서 업데이트

---

## 4. 영향받는 파일 목록

### 4.1 관리자 인증 관련 (7개)
```
hooks/useAdminAuth.js          - 관리자 인증 훅 (전면 재작성)
lib/adminAuth.js               - 관리자 권한 체크 (전면 재작성)
app/admin/layout.js            - 관리자 레이아웃 (인증 체크 수정) ⭐ useAdminAuth 사용
app/admin/login/page.js        - 관리자 로그인 (인증 방식 변경) ⭐ useAdminAuth 사용
app/admin/admins/page.js       - 관리자 관리 (admins 테이블 사용) ⭐ useAdminAuth 사용
app/api/admin/check-profile/route.js  - Service Role API (삭제)
app/api/admin/login/route.js   - 신규 생성 (관리자 로그인 API)
app/api/admin/logout/route.js  - 신규 생성 (관리자 로그아웃 API)
app/api/admin/verify/route.js  - 신규 생성 (토큰 검증 API)
```

### 4.2 관리자 페이지 - useAdminAuth 사용 (13개 확인됨)
```
✅ app/admin/layout.js                           - 레이아웃 (useAdminAuth 사용)
✅ app/admin/login/page.js                       - 로그인 (useAdminAuth 사용)
✅ app/admin/admins/page.js                      - 관리자 관리 (useAdminAuth 사용)
✅ app/admin/products/page.js                    - 라이브 상품 (useAdminAuth 사용)
✅ app/admin/products/new/page.js                - 신규 상품 (useAdminAuth 사용)
✅ app/admin/products/catalog/page.js            - 전체 상품 (useAdminAuth 사용)
✅ app/admin/products/catalog/[id]/page.js       - 상품 상세 (useAdminAuth 사용)
✅ app/admin/products/catalog/[id]/edit/page.js  - 상품 수정 (useAdminAuth 사용)
✅ app/admin/products/catalog/new/page.js        - 신규 상품 카탈로그 (useAdminAuth 사용)
✅ app/admin/categories/page.js                  - 카테고리 (useAdminAuth 사용)
✅ app/admin/suppliers/page.js                   - 업체 관리 (useAdminAuth 사용)
✅ app/admin/purchase-orders/page.js             - 발주 관리 (useAdminAuth 사용)
✅ app/admin/purchase-orders/[supplierId]/page.js - 발주 상세 (useAdminAuth 사용)
```

### 4.3 관리자 페이지 - useAdminAuth 미사용 (11개)
```
app/admin/page.js              - 대시보드 (확인 필요)
app/admin/orders/page.js       - 주문 관리 (확인 필요)
app/admin/orders/[id]/page.js  - 주문 상세 (확인 필요)
app/admin/deposits/page.js     - 입금 확인 (확인 필요)
app/admin/shipping/page.js     - 발송 관리 (확인 필요)
app/admin/broadcasts/page.js   - 방송 관리 (확인 필요)
app/admin/customers/page.js    - 고객 관리 (확인 필요)
app/admin/customers/[id]/page.js  - 고객 상세 (확인 필요)
app/admin/coupons/page.js      - 쿠폰 관리 (확인 필요)
app/admin/coupons/[id]/page.js  - 쿠폰 상세 (is_admin 사용 - 수정 필요)
app/admin/coupons/new/page.js  - 쿠폰 생성 (확인 필요)
app/admin/settings/page.js     - 시스템 설정 (확인 필요)
app/admin/test/page.js         - 테스트 페이지 (확인 필요)
```

**총 관리자 페이지: 24개**
- useAdminAuth 사용: 13개 (확인됨)
- 사용 여부 확인 필요: 11개

### 4.4 is_admin 컬럼 사용 파일 (3개)
```
app/admin/admins/page.js                - is_admin 필터링 (admins 테이블로 전환)
app/admin/coupons/[id]/page.js          - is_admin 필터링 (제거 필요)
app/api/admin/check-profile/route.js    - is_admin 조회 (삭제)
```

### 4.5 카카오 인증 관련 (2개) - ⚠️ 이미 Supabase Auth 구현됨, localStorage 저장만 안 됨
```
app/auth/callback/page.js      - 카카오 콜백 (signUp/signInWithPassword 이미 구현)
                                 ✅ Line 155: signUp() 호출
                                 ✅ Line 234: signInWithPassword() 호출
                                 ❌ Line 354: localStorage.setItem() 실행되지만 토큰 저장 안 됨
lib/userProfileManager.js      - 프로필 관리 (sessionStorage 제거 필요)
                                 ❌ Line 17: sessionStorage.getItem('user')
```

**Phase 2는 "통합"이 아닌 "디버깅"입니다!**

### 4.6 DB 마이그레이션 (신규 생성)
```
supabase/migrations/20251005_create_admins_table.sql  - admins 테이블 생성
supabase/migrations/20251005_migrate_admin_data.sql   - 관리자 데이터 이동
supabase/migrations/20251005_remove_is_admin.sql      - profiles is_admin 제거
supabase/migrations/20251005_simplify_rls.sql         - RLS 정책 단순화
```

---

## 5. DB 마이그레이션 계획

### 5.1 admins 테이블 생성

```sql
-- 관리자 전용 테이블 (profiles와 완전 분리)
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  -- bcrypt
  name TEXT NOT NULL,
  is_master BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 관리자 권한 테이블 (기존 유지)
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_id, permission)
);

-- 관리자 세션 테이블 (JWT 대신 사용 가능)
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);
```

### 5.2 기존 관리자 데이터 마이그레이션

```sql
-- profiles에서 is_admin=true인 사용자 → admins로 복사
INSERT INTO admins (id, email, name, is_master, created_at)
SELECT
  id,
  email,
  name,
  COALESCE(is_master, false),
  created_at
FROM profiles
WHERE is_admin = true;

-- 주의: password는 별도로 설정 필요 (초기 패스워드 발급)
```

### 5.3 profiles 테이블 정리

```sql
-- is_admin, is_master 컬럼 제거 (Phase 3에서 실행)
ALTER TABLE profiles
  DROP COLUMN IF EXISTS is_admin,
  DROP COLUMN IF EXISTS is_master;

-- 이제 profiles는 순수 고객만
```

### 5.4 RLS 정책 단순화

```sql
-- 기존 복잡한 정책 삭제
DROP POLICY IF EXISTS "Users view own orders" ON orders;

-- 새로운 단순 정책
CREATE POLICY "Users view own orders"
ON orders FOR SELECT
TO authenticated
USING (user_id = auth.uid());  -- 끝!

-- get_current_user_kakao_id() 함수 삭제 (불필요)
DROP FUNCTION IF EXISTS get_current_user_kakao_id();
```

---

## 6. 상세 작업 체크리스트

### Phase 1: 관리자 분리

#### 1.1 DB 마이그레이션
- [ ] `20251005_create_admins_table.sql` 작성
- [ ] `admins` 테이블 생성
- [ ] `admin_sessions` 테이블 생성
- [ ] 인덱스 생성
- [ ] Supabase에 마이그레이션 적용
- [ ] 기존 관리자 데이터 백업

#### 1.2 관리자 인증 시스템 구현
- [ ] `/lib/adminAuthNew.js` 작성
  - [ ] `hashPassword(password)` - bcrypt
  - [ ] `verifyPassword(password, hash)`
  - [ ] `generateToken(adminId)` - JWT 또는 UUID
  - [ ] `verifyToken(token)`
  - [ ] `getAdminByToken(token)`
  - [ ] `createAdminSession(adminId)`
  - [ ] `revokeAdminSession(token)`

- [ ] `/app/api/admin/login/route.js` 생성
  - [ ] POST: 이메일/비밀번호 검증
  - [ ] 토큰 발급
  - [ ] admin_sessions에 저장
  - [ ] 반환: { token, admin: { id, email, name, is_master } }

- [ ] `/app/api/admin/logout/route.js` 생성
  - [ ] POST: 토큰 무효화
  - [ ] admin_sessions에서 삭제

- [ ] `/app/api/admin/verify/route.js` 생성
  - [ ] POST: 토큰 검증
  - [ ] 반환: admin 정보

#### 1.3 관리자 훅 재작성
- [ ] `/hooks/useAdminAuthNew.js` 작성
  - [ ] localStorage 키: `admin_session` (Supabase와 분리)
  - [ ] `adminLogin(email, password)` - API 호출
  - [ ] `adminLogout()` - 토큰 무효화
  - [ ] `getAdminUser()` - 토큰으로 admin 정보 조회
  - [ ] `isAdminAuthenticated` 상태
  - [ ] `loading` 상태
  - [ ] `adminUser` 상태

#### 1.4 관리자 페이지 수정
- [ ] `/app/admin/layout.js` 수정
  - [ ] `useAdminAuthNew` 사용
  - [ ] localStorage 키 변경 (`admin_session`)
  - [ ] 로그인 체크 로직 변경

- [ ] `/app/admin/login/page.js` 수정
  - [ ] 새 adminLogin API 호출
  - [ ] 토큰 localStorage 저장

- [ ] `/app/admin/admins/page.js` 전면 재작성
  - [ ] `admins` 테이블 조회
  - [ ] 관리자 생성/수정/삭제
  - [ ] 초기 패스워드 발급

- [ ] 기타 24개 관리자 페이지 확인
  - [ ] `useAdminAuth` → `useAdminAuthNew` 변경 (전체 검색)

#### 1.5 기존 파일 정리
- [ ] `/app/api/admin/check-profile/route.js` 삭제
- [ ] `/lib/adminAuth.js` → `/lib/adminAuthNew.js` 교체
- [ ] `/hooks/useAdminAuth.js` → `/hooks/useAdminAuthNew.js` 교체

---

### Phase 2: 카카오 Supabase Auth 디버깅 및 완성

#### 2.1 카카오 localStorage 토큰 저장 문제 해결
- [ ] `/app/auth/callback/page.js` 디버깅
  - [x] `signUp()` 구현 확인 (Line 155) ✅
  - [x] `signInWithPassword()` 구현 확인 (Line 234) ✅
  - [ ] localStorage 토큰 저장 안 되는 이유 파악
  - [ ] 디버그 로그 분석 (배포된 로그 확인)
  - [ ] Supabase 설정 확인 (persistSession, autoRefreshToken)
  - [ ] 토큰 저장 시점 확인
  - [ ] 세션 확인 루프 수정 (필요 시)

#### 2.2 UserProfileManager 수정
- [ ] `/lib/userProfileManager.js` 수정
  - [ ] `getCurrentUser()` - sessionStorage 제거, auth.uid() 사용
  - [ ] `getUserOrderQuery()` - order_type 제거, user_id만 사용
  - [ ] 카카오 플래그 제거 (모두 Supabase Auth)

#### 2.3 주문 조회 로직 단순화
- [ ] `lib/supabaseApi.js - getOrders()` 수정
  - [ ] order_type LIKE 로직 제거
  - [ ] user_id 매칭만 사용

---

### Phase 3: RLS 정책 단순화

#### 3.1 RLS 정책 재작성
- [ ] `20251005_simplify_rls.sql` 작성
  - [ ] orders: `user_id = auth.uid()`
  - [ ] order_items: orders JOIN
  - [ ] order_shipping: orders JOIN
  - [ ] order_payments: orders JOIN
  - [ ] profiles: `id = auth.uid()`
  - [ ] user_coupons: `user_id = auth.uid()`

- [ ] Supabase에 마이그레이션 적용

#### 3.2 profiles 정리
- [ ] `20251005_remove_is_admin.sql` 작성
  - [ ] is_admin 컬럼 제거
  - [ ] is_master 컬럼 제거

- [ ] Supabase에 마이그레이션 적용

---

## 7. 테스트 계획

### 7.1 관리자 시스템 테스트
- [ ] 관리자 로그인 (email/password)
- [ ] 관리자 로그아웃
- [ ] 관리자 생성 (초기 패스워드 발급)
- [ ] 관리자 권한 관리
- [ ] 관리자/고객 동시 로그인 (다른 탭)
- [ ] 관리자 세션 만료 처리

### 7.2 고객 시스템 테스트
- [ ] 카카오 로그인 (신규)
- [ ] 카카오 로그인 (기존 사용자)
- [ ] 주문 생성
- [ ] 주문 조회 (auth.uid() 기반)
- [ ] 프로필 수정
- [ ] 쿠폰 사용

### 7.3 통합 테스트
- [ ] 관리자 탭 + 고객 탭 동시 사용
- [ ] 관리자 → 고객 리스트 조회 (관리자 제외 확인)
- [ ] 관리자 → 주문 관리 (모든 주문 조회)
- [ ] 고객 → 주문 내역 (자기 주문만)
- [ ] RLS 정책 동작 확인

---

## 8. 롤백 계획

### 8.1 Phase 1 롤백
```sql
-- admins 테이블 삭제
DROP TABLE IF EXISTS admin_sessions CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- 기존 코드 복원
git checkout HEAD^ -- hooks/useAdminAuth.js
git checkout HEAD^ -- lib/adminAuth.js
git checkout HEAD^ -- app/admin/layout.js
```

### 8.2 Phase 2 롤백
```sql
-- RLS 정책 복원
-- (기존 백업에서 복원)
```

### 8.3 Phase 3 롤백
```sql
-- profiles에 is_admin 컬럼 재추가
ALTER TABLE profiles
  ADD COLUMN is_admin BOOLEAN DEFAULT false,
  ADD COLUMN is_master BOOLEAN DEFAULT false;
```

---

## 9. 예상 소요 시간

| Phase | 작업 | 예상 시간 |
|-------|------|----------|
| 1 | 관리자 분리 | 4-6시간 |
| 2 | 카카오 디버깅 | 1-2시간 (대부분 구현됨) |
| 3 | RLS 단순화 | 1-2시간 |
| 테스트 | 통합 테스트 | 2-3시간 |
| **총계** | | **8-13시간** |

---

## 10. 주의사항

### 10.1 데이터 손실 방지
- 모든 마이그레이션 전 백업 필수
- 롤백 계획 준비

### 10.2 프로덕션 배포
- 단계별 배포 (Phase 1 → 테스트 → Phase 2 → 테스트 → Phase 3)
- 각 Phase마다 사용자 영향도 확인

### 10.3 기존 사용자
- 카카오 사용자: 재로그인 필요 (Supabase Auth 계정 생성)
- 관리자: 초기 패스워드 발급 필요

---

## 11. 성공 기준

### 11.1 기능
- ✅ 관리자/고객 동시 로그인 가능 (다른 탭)
- ✅ 고객 리스트에 관리자 자동 제외
- ✅ RLS 정책 단순화 (auth.uid() 만 사용)
- ✅ 세션 충돌 없음

### 11.2 성능
- ✅ 관리자 로그인 1초 이내
- ✅ 고객 주문 조회 1초 이내
- ✅ RLS 정책 성능 개선

### 11.3 보안
- ✅ 관리자 패스워드 bcrypt 암호화
- ✅ 토큰 만료 처리
- ✅ RLS 정책 정상 작동

---

**작성자**: Claude
**검토자**: (검토 필요)
**승인자**: (승인 필요)
