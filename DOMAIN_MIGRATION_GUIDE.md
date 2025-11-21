# 🌐 도메인 이동 방식 마이그레이션 가이드

**목적**: 새 환경을 완전히 구축한 후 도메인만 이동
**방식**: Blue-Green 배포 + 도메인 스위칭
**다운타임**: 0분 (DNS 전파 시간만)

---

## 📋 전체 타임라인 (7일)

```
Day 0: 준비 단계
Day 1-5: 새 환경 구축 + 개발
Day 6: 최종 테스트
Day 7: 도메인 전환 (D-Day)
Day 8-14: 모니터링 + 구 환경 유지
Day 15: 구 환경 정리
```

---

## 🔧 Day 0: 준비 단계

### 1. 현재 환경 정보 기록

```bash
# 현재 도메인 확인
echo "현재 도메인: yourdomain.com"

# Vercel 프로젝트 확인
vercel whoami
vercel ls

# Supabase 프로젝트 확인
# Project Settings > General > Reference ID 복사
echo "Supabase Project: abc123def456"

# 환경 변수 백업
vercel env pull .env.production.backup
```

### 2. Git 브랜치 전략 결정

**추천: v2 브랜치 사용**

```bash
# 현재 브랜치 확인
git branch

# v2 브랜치 생성
git checkout -b v2
git push origin v2
```

---

## 🏗️ Day 1: 새 환경 생성

### Step 1-1: 새 Supabase 프로젝트 생성

```
1. https://supabase.com/dashboard 접속
2. "New project" 클릭
3. 프로젝트명: live-commerce-v2
4. 플랜: Pro ($25/월)
5. Region: Northeast Asia (Seoul)
6. Database Password 설정 (안전하게 저장!)
```

**생성 완료 후:**
```bash
# 연결 정보 복사
Project URL: https://xyz789.supabase.co
Anon Key: eyJhb...
Service Role Key: eyJhb... (비밀!)
```

### Step 1-2: 새 Vercel 프로젝트 생성

```bash
# v2 브랜치에서 새 프로젝트 배포
git checkout v2
vercel --prod

# 프로젝트명: live-commerce-v2
# Framework: Next.js
# Git 연결: v2 브랜치
```

**생성 완료 후:**
```
Preview URL: https://live-commerce-v2.vercel.app
Project ID: prj_xyz123
```

### Step 1-3: 새 환경 변수 설정

```bash
# Vercel 환경 변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
# 입력: https://xyz789.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# 입력: eyJhb...

vercel env add SUPABASE_SERVICE_ROLE_KEY
# 입력: eyJhb...

# 기타 필요한 환경 변수
vercel env add NEXT_PUBLIC_IAMPORT_ID
vercel env add NEXT_PUBLIC_KAKAO_JS_KEY
# ... (기존 환경 변수 모두 복사)
```

---

## 📦 Day 2: 데이터 마이그레이션

### Step 2-1: 구 DB 백업

```bash
# 구 Supabase에서 전체 백업
pg_dump \
  -h db.OLD_PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  > old_db_backup_$(date +%Y%m%d).sql
```

### Step 2-2: 스키마 생성 (신 DB)

```bash
# 1. 스키마만 먼저 복원
pg_dump \
  -h db.OLD_PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --schema-only \
  > schema_only.sql

# 2. 신 DB에 스키마 생성
psql \
  -h db.NEW_PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  < schema_only.sql
```

### Step 2-3: 데이터 복사

```bash
# 방법 1: 전체 복사 (작은 DB - 1GB 이하)
pg_dump \
  -h db.OLD_PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --data-only \
  | psql \
  -h db.NEW_PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres

# 방법 2: 테이블별 복사 (큰 DB - 1GB 이상)
# profiles
pg_dump -t profiles --data-only [OLD] | psql [NEW]

# orders
pg_dump -t orders --data-only [OLD] | psql [NEW]

# products
pg_dump -t products --data-only [OLD] | psql [NEW]

# ... (모든 테이블 반복)
```

### Step 2-4: RLS 정책 복사

```sql
-- 구 DB에서 RLS 정책 추출
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
ORDER BY tablename, policyname;

-- 결과를 복사해서 신 DB에 적용
```

### Step 2-5: Storage 파일 복사

**Supabase Storage 파일 다운로드/업로드:**

```javascript
// download-storage.js
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const oldSupabase = createClient(OLD_URL, OLD_KEY)
const newSupabase = createClient(NEW_URL, NEW_KEY)

async function migrateStorage() {
  const buckets = ['products', 'categories', 'profiles']

  for (const bucket of buckets) {
    // 1. 구 Storage에서 파일 목록 가져오기
    const { data: files } = await oldSupabase.storage
      .from(bucket)
      .list()

    for (const file of files) {
      console.log(`Migrating ${bucket}/${file.name}...`)

      // 2. 파일 다운로드
      const { data: blob } = await oldSupabase.storage
        .from(bucket)
        .download(file.name)

      // 3. 신 Storage에 업로드
      await newSupabase.storage
        .from(bucket)
        .upload(file.name, blob, {
          contentType: file.metadata.mimetype,
          upsert: true
        })
    }
  }

  console.log('✅ Storage migration complete!')
}

migrateStorage()
```

**실행:**
```bash
node download-storage.js
```

---

## 🧪 Day 3-5: 개발 및 테스트

### Step 3-1: 새 환경에서 개발

```bash
# v2 브랜치에서 작업
git checkout v2

# 개발
npm run dev

# 커밋
git add .
git commit -m "feat: 새 기능 추가"
git push origin v2

# Vercel 자동 배포 (Preview)
# https://live-commerce-v2-git-v2-your.vercel.app
```

### Step 3-2: 내부 테스트 URL

```
Preview URL: https://live-commerce-v2.vercel.app
환경: 신 Supabase (복사된 데이터)
용도: 내부 테스트 전용
```

**⚠️ 주의:** 이 URL로 실제 주문하면 구 DB가 아닌 신 DB에 저장됨!

### Step 3-3: 테스트 시나리오

```
✅ 로그인 (이메일/카카오)
✅ 상품 조회
✅ 장바구니 추가
✅ 주문 생성 (테스트 결제)
✅ 배송비 계산
✅ 쿠폰 사용
✅ 관리자 페이지
✅ 주문 내역 조회
✅ 재고 차감
```

---

## 🔍 Day 6: 최종 검증

### Step 4-1: 데이터 일치 확인

```sql
-- 구 DB vs 신 DB 데이터 개수 비교
-- 구 DB
SELECT
  'profiles' AS table_name,
  COUNT(*) AS count
FROM profiles
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'products', COUNT(*) FROM products;

-- 신 DB (같은 쿼리 실행)
-- 결과가 일치해야 함!
```

### Step 4-2: 최신 데이터 재동기화 (옵션)

**⚠️ 중요:** Day 2에 복사한 이후 신규 주문이 있다면?

```bash
# 최근 3일 데이터만 재복사
pg_dump \
  -h db.OLD_PROJECT_REF.supabase.co \
  -U postgres \
  -d postgres \
  --data-only \
  -t "orders" \
  --where="created_at >= NOW() - INTERVAL '3 days'" \
  | psql -h db.NEW_PROJECT_REF.supabase.co -U postgres -d postgres

# 주의: 중복 데이터 체크 필요!
```

**더 안전한 방법:** 도메인 전환 직전에 최종 동기화

### Step 4-3: 성능 테스트

```bash
# Lighthouse 점수 확인
npx lighthouse https://live-commerce-v2.vercel.app

# API 응답 속도 확인
curl -w "@curl-format.txt" -o /dev/null -s https://live-commerce-v2.vercel.app/api/products
```

---

## 🚀 Day 7: 도메인 전환 (D-Day)

### 타이밍: 새벽 2-3시 (트래픽 최소)

### Step 5-1: 최종 데이터 동기화 (1시간 전)

```bash
# 1. 구 사이트 점검 모드 활성화
vercel env add MAINTENANCE_MODE true --project live-commerce-old

# 2. 최종 데이터 복사
pg_dump [OLD_DB] --data-only | psql [NEW_DB]

# 3. 검증
psql [NEW_DB] -c "SELECT COUNT(*) FROM orders"
```

### Step 5-2: Vercel 도메인 설정 변경

**구 Vercel 프로젝트 (live-commerce):**
```
1. Vercel Dashboard > live-commerce > Settings > Domains
2. yourdomain.com 제거 (또는 old.yourdomain.com으로 변경)
```

**신 Vercel 프로젝트 (live-commerce-v2):**
```
1. Vercel Dashboard > live-commerce-v2 > Settings > Domains
2. "Add Domain" 클릭
3. yourdomain.com 입력
4. DNS 설정 확인 (이미 설정되어 있으면 자동)
```

### Step 5-3: DNS 전파 대기

```bash
# DNS 전파 확인 (1-5분 소요)
dig yourdomain.com
# 또는
nslookup yourdomain.com

# Vercel IP로 변경되었는지 확인
# 76.76.21.21 (Vercel)
```

### Step 5-4: SSL 인증서 자동 갱신

```
Vercel이 자동으로 Let's Encrypt SSL 인증서 발급
1-2분 소요
```

### Step 5-5: 서비스 확인

```bash
# 1. 도메인 접속 확인
curl -I https://yourdomain.com

# 2. DB 연결 확인
# 브라우저에서 yourdomain.com 접속
# 로그인 테스트

# 3. 주문 테스트
# 실제 소액 주문 (1,000원) 생성
# 신 DB에 저장되는지 확인

# 4. 에러 로그 확인
vercel logs --project live-commerce-v2
```

---

## 📊 Day 8-14: 모니터링 기간

### 모니터링 항목

```bash
# 1. 에러 로그
vercel logs --follow

# 2. Supabase 대시보드
# Database > Logs
# API > Logs

# 3. 주문 생성 확인
psql [NEW_DB] -c "
  SELECT COUNT(*), DATE(created_at)
  FROM orders
  WHERE created_at >= NOW() - INTERVAL '7 days'
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at) DESC
"

# 4. 에러율 확인
# Sentry / Vercel Analytics
```

### 구 환경 유지 (백업용)

```
구 Vercel: old.yourdomain.com (서브도메인)
구 Supabase: 읽기 전용 유지
용도: 긴급 롤백 대비
기간: 2주
```

### 긴급 롤백 방법 (만약의 경우)

```bash
# 1. 신 Vercel에서 도메인 제거
# Vercel Dashboard > live-commerce-v2 > Settings > Domains
# yourdomain.com 제거

# 2. 구 Vercel에 도메인 재설정
# Vercel Dashboard > live-commerce > Settings > Domains
# yourdomain.com 추가

# 3. DNS 전파 대기 (1-5분)

# ⚠️ 주의: 신규 주문 데이터는 신 DB에만 있음!
# 롤백 시 데이터 동기화 필요
```

---

## 🗑️ Day 15: 구 환경 정리

### Step 6-1: 최종 확인

```
✅ 신 환경 안정적 운영 (2주)
✅ 주요 버그 없음
✅ 고객 문의 없음
✅ 성능 정상
```

### Step 6-2: 구 Supabase 다운그레이드 또는 삭제

```
옵션 1: Free 플랜으로 다운그레이드
- 비용 절감: $25/월 → $0
- 백업 유지
- Pause 가능

옵션 2: 완전 삭제
- 최종 백업 후 삭제
- 비용 완전 제거
```

**최종 백업:**
```bash
pg_dump [OLD_DB] > final_backup_before_delete_$(date +%Y%m%d).sql
```

### Step 6-3: 구 Vercel 프로젝트 삭제

```
Vercel Dashboard > live-commerce (old) > Settings > General
"Delete Project" 클릭
```

### Step 6-4: Git 정리 (옵션)

```bash
# main 브랜치를 v2로 교체 (옵션)
git checkout v2
git branch -D main
git branch -m main
git push origin main --force

# 또는 v2 브랜치 유지 (추천)
# main: 구 버전 (아카이브)
# v2: 신 버전 (운영)
```

---

## 💰 비용 계산

### 마이그레이션 기간 (Day 1-15)

```
구 환경 (유지):
- Vercel Pro:      $20/월
- Supabase Pro:    $25/월

신 환경 (추가):
- Vercel Pro:      $20/월
- Supabase Pro:    $25/월

총 비용 (15일):    $90/월 × 0.5 = $45 추가
```

### 마이그레이션 완료 후 (Day 16~)

```
신 환경만 유지:
- Vercel Pro:      $20/월
- Supabase Pro:    $25/월

총 비용:           $45/월 (기존과 동일)
```

**추가 비용: $45 (2주치)**

---

## 🎯 장단점 비교

### ✅ 장점

1. **다운타임 0분**
   - DNS 전파만 1-5분
   - 사용자는 눈치 못챔

2. **안전한 롤백**
   - 구 환경 2주 유지
   - 문제 시 즉시 복구

3. **충분한 테스트**
   - 2주 동안 철저히 테스트
   - 실제 데이터로 검증

4. **데이터 손실 0%**
   - 마지막에 최종 동기화
   - 증분 동기화 불필요

5. **Git 관리 깔끔**
   - v2 브랜치로 명확히 구분
   - 히스토리 보존

### ⚠️ 단점

1. **추가 비용**
   - 2주간 $45 추가
   - 하지만 안전성 대비 저렴

2. **데이터 동기화 1회 필요**
   - 도메인 전환 직전
   - 점검 모드 1시간 필요

---

## 📋 최종 체크리스트

### 사전 준비 (Day 0)
- [ ] 현재 환경 정보 백업
- [ ] Git v2 브랜치 생성
- [ ] 환경 변수 목록 정리

### 새 환경 구축 (Day 1-2)
- [ ] Supabase Pro 프로젝트 생성
- [ ] Vercel Pro 프로젝트 생성
- [ ] 환경 변수 설정
- [ ] DB 스키마 복사
- [ ] 데이터 마이그레이션
- [ ] Storage 파일 복사

### 개발 및 테스트 (Day 3-6)
- [ ] 새 기능 개발
- [ ] 내부 테스트 (주요 시나리오)
- [ ] 성능 테스트
- [ ] 최종 데이터 동기화

### 도메인 전환 (Day 7)
- [ ] 구 사이트 점검 모드
- [ ] 최종 데이터 복사
- [ ] Vercel 도메인 설정 변경
- [ ] DNS 전파 확인
- [ ] SSL 인증서 확인
- [ ] 서비스 정상 확인

### 모니터링 (Day 8-14)
- [ ] 에러 로그 모니터링
- [ ] 주문 생성 확인
- [ ] 고객 문의 대응
- [ ] 구 환경 백업 유지

### 정리 (Day 15)
- [ ] 최종 백업
- [ ] 구 Supabase 삭제/다운그레이드
- [ ] 구 Vercel 삭제
- [ ] Git 정리 (옵션)

---

## 🎉 결론

**도메인 이동 방식이 가장 안전하고 현실적입니다!**

- ✅ 다운타임 0분
- ✅ 안전한 롤백
- ✅ 충분한 테스트
- ✅ 데이터 손실 0%
- ✅ Git 관리 깔끔

**추가 비용: $45 (2주)**

**작성자**: Claude
**최종 업데이트**: 2025-11-18
**버전**: 1.0
