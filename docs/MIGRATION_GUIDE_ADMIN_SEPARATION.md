# 관리자/고객 분리 시스템 마이그레이션 가이드

**생성일**: 2025-10-05
**목적**: 관리자와 고객 인증 시스템을 완전히 분리하여 세션 충돌 해결

---

## 🎯 마이그레이션 목표

### 문제점
- ❌ 관리자와 고객이 같은 Supabase Auth 사용 → 세션 충돌
- ❌ profiles 테이블에 관리자와 고객 혼재 → RLS 정책 복잡
- ❌ 고객 리스트에 관리자 계정 노출
- ❌ 브라우저 탭 간 세션 간섭 (localStorage 공유)

### 해결책
- ✅ 관리자: 별도 admins 테이블 + 토큰 기반 인증
- ✅ 고객: profiles 테이블 + Supabase Auth (Kakao 포함)
- ✅ localStorage 네임스페이스 분리
  - 관리자: `admin_session`
  - 고객: `supabase-auth-token`

---

## 📋 마이그레이션 순서

### Phase 1: DB 마이그레이션 (10분)

#### 1-1. Supabase Dashboard 접속
1. https://supabase.com/dashboard 로그인
2. 프로젝트 선택 (live-commerce)
3. 좌측 메뉴 → **SQL Editor** 클릭

#### 1-2. 관리자 테이블 생성
1. SQL Editor에서 **New Query** 클릭
2. `supabase/migrations/20251005_create_admins_table.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기
4. **Run** 클릭
5. 성공 메시지 확인:
   ```
   ✅ admins 테이블 생성 완료!
   생성된 테이블:
     1. admins - 관리자 계정
     2. admin_sessions - 관리자 세션
   ```

#### 1-3. 마스터 관리자 계정 생성
1. SQL Editor에서 **New Query** 클릭
2. `supabase/migrations/20251005_insert_master_admin.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기
4. **Run** 클릭
5. 성공 메시지 확인:
   ```
   ✅ 마스터 관리자 계정 생성 완료!
   이메일: master@allok.world
   패스워드: yi01buddy!!
   ```

#### 1-4. 테이블 생성 확인
SQL Editor에서 다음 쿼리 실행:
```sql
SELECT * FROM admins;
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('admins', 'admin_sessions');
```

예상 결과:
- `admins` 테이블에 마스터 계정 1개
- `admin_sessions` 테이블 존재 (비어있음)

---

### Phase 2: 코드 배포 (자동 완료)

다음 파일들이 이미 생성되어 있습니다:

#### 2-1. 인증 시스템
- ✅ `lib/adminAuthNew.js` - 관리자 인증 로직
- ✅ `hooks/useAdminAuthNew.js` - React 훅

#### 2-2. API Routes
- ✅ `app/api/admin/login/route.js` - 로그인
- ✅ `app/api/admin/logout/route.js` - 로그아웃
- ✅ `app/api/admin/verify/route.js` - 토큰 검증

#### 2-3. 페이지 수정 (진행 중)
- ⏳ `app/admin/layout.js` - useAdminAuthNew 적용
- ⏳ `app/admin/login/page.js` - 새 API 사용
- ⏳ 나머지 admin 페이지들 (24개)

---

### Phase 3: 환경변수 확인

`.env.local` 파일에 다음 환경변수가 있는지 확인:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # 필수!
```

**SUPABASE_SERVICE_ROLE_KEY**가 없다면:
1. Supabase Dashboard → Settings → API
2. Service Role Key 복사
3. `.env.local`에 추가

---

### Phase 4: 테스트 (마이그레이션 완료 후)

#### 4-1. 로컬 서버 재시작
```bash
npm run dev
```

#### 4-2. 관리자 로그인 테스트
1. 브라우저에서 `http://localhost:3000/admin/login` 접속
2. 로그인:
   - 이메일: `master@allok.world`
   - 패스워드: `yi01buddy!!`
3. 로그인 성공 → 관리자 대시보드 표시
4. localStorage 확인 (개발자 도구 → Application → Local Storage):
   - `admin_session` 키에 토큰 저장되어 있어야 함

#### 4-3. 세션 분리 테스트
1. **탭 1**: 관리자 로그인 (`/admin`)
2. **탭 2**: 고객 페이지 (`/`) 접속 후 Kakao 로그인
3. 각 탭에서 새로고침
4. 확인:
   - ✅ 탭 1: 관리자 세션 유지
   - ✅ 탭 2: 고객 세션 유지
   - ✅ 서로 간섭하지 않음

#### 4-4. 고객 리스트 확인
1. 관리자 로그인
2. 고객 관리 페이지 접속
3. 확인:
   - ✅ 관리자 계정이 고객 리스트에 없음
   - ✅ 순수 고객(Kakao 사용자)만 표시

---

## 🔒 보안 체크리스트

- [ ] SUPABASE_SERVICE_ROLE_KEY는 `.env.local`에만 존재 (절대 커밋 금지)
- [ ] 첫 로그인 후 마스터 계정 패스워드 변경
- [ ] admins 테이블 RLS 비활성화 확인 (애플리케이션 레벨 인증)
- [ ] admin_sessions 만료 시간 확인 (기본 7일)

---

## 🐛 트러블슈팅

### 1. "테이블이 이미 존재합니다" 에러
```sql
-- 기존 테이블 확인
SELECT * FROM admins;

-- 이미 존재한다면 마이그레이션 스킵
```

### 2. "SUPABASE_SERVICE_ROLE_KEY 없음" 에러
```bash
# .env.local 확인
cat .env.local | grep SERVICE_ROLE

# 없다면 Supabase Dashboard에서 복사 후 추가
```

### 3. 관리자 로그인 안 됨
```sql
-- 관리자 계정 확인
SELECT email, is_master, is_active FROM admins;

-- 비활성화되었다면 활성화
UPDATE admins SET is_active = true WHERE email = 'master@allok.world';
```

### 4. 토큰 검증 실패
```sql
-- 만료된 세션 삭제
DELETE FROM admin_sessions WHERE expires_at < NOW();
```

---

## 📊 데이터 구조 비교

### Before (혼재)
```
profiles 테이블
├─ 고객 (kakao_id, user_id)
└─ 관리자 (is_admin=true, is_master=true)

Supabase Auth
├─ 고객 (Kakao OAuth)
└─ 관리자 (이메일/패스워드)  ❌ 세션 충돌!
```

### After (분리)
```
admins 테이블
└─ 관리자 (토큰 인증, RLS 없음)

profiles 테이블
└─ 고객만 (Supabase Auth, RLS 적용)

localStorage
├─ admin_session (관리자 토큰)
└─ supabase-auth-token (고객 세션)  ✅ 독립!
```

---

## 📝 다음 작업 (자동 진행 중)

- ⏳ admin 페이지들 useAdminAuthNew로 전환
- ⏳ profiles 테이블에서 is_admin, is_master 컬럼 제거
- ⏳ RLS 정책 단순화
- ⏳ Kakao 로그인 localStorage 저장 버그 수정

---

**마이그레이션 완료 시점**: DB 마이그레이션 (Phase 1) 완료 후 코드 배포 대기 중

**작성자**: Claude Code
**문서 버전**: 1.0
