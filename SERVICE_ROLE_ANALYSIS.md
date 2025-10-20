# 🔐 Service Role API 사용 분석 리포트

**분석 일자**: 2025-10-20
**현재 상태**: ✅ 올바르게 사용 중 (일부 개선 필요)

---

## 🎯 Service Role API란?

**Supabase Service Role Key**를 사용하는 API로, **RLS(Row Level Security) 정책을 우회**할 수 있습니다.

```javascript
// 일반 클라이언트 (Anon Key)
const supabase = createClient(url, ANON_KEY)
// → RLS 정책 적용 ✅
// → 사용자는 자신의 데이터만 조회 가능

// Service Role 클라이언트
const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY)
// → RLS 정책 우회 ⚠️
// → 모든 데이터 접근 가능 (슈퍼 권한)
```

---

## ✅ 장점 (왜 좋은가?)

### 1️⃣ RLS 정책 우회 가능
```javascript
// ❌ 일반 클라이언트 - RLS 차단
const { data, error } = await supabase
  .from('profiles')
  .select('*') // → 자기 프로필만 조회 가능

// ✅ Service Role - 모든 프로필 조회
const { data, error } = await supabaseAdmin
  .from('profiles')
  .select('*') // → 모든 사용자 프로필 조회 가능 (관리자 기능)
```

### 2️⃣ 복잡한 RLS 정책 불필요
```sql
-- ❌ 복잡한 RLS 정책 작성 필요 (일반 클라이언트)
CREATE POLICY "Admin can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE is_admin = true
  )
);

-- ✅ Service Role 사용 시 불필요
-- API Route에서 관리자 검증만 하면 됨
```

### 3️⃣ 서버 사이드 전용으로 보안 안전
```
❌ 클라이언트에서 Service Role Key 노출 → 위험!
✅ API Route (서버)에서만 사용 → 안전!

브라우저 (클라이언트)
  ↓
  POST /api/admin/coupons/create
  ↓
Next.js API Route (서버)
  ↓ Service Role Key 사용 (클라이언트는 못 봄!)
  ↓
Supabase (RLS 우회)
```

### 4️⃣ 성능 향상
```javascript
// ❌ RLS 정책 실행 (서브쿼리, 함수 호출 등)
// 각 쿼리마다 0.1-0.5초 추가 소요

// ✅ Service Role - RLS 생략
// 쿼리만 실행 → 빠름!
```

---

## ⚠️ 단점 (주의사항)

### 1️⃣ 보안 위험 (잘못 사용 시)

```javascript
// ❌ 위험한 예시: 권한 검증 없이 사용
export async function DELETE(request) {
  const { userId } = await request.json()
  
  // 🚨 누구나 호출 가능! → 모든 사용자 삭제 가능!
  await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', userId)
}

// ✅ 안전한 예시: 권한 검증 필수
export async function DELETE(request) {
  const { userId, adminEmail } = await request.json()
  
  // 1️⃣ 관리자 검증
  const isAdmin = await verifyAdminAuth(adminEmail)
  if (!isAdmin) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }
  
  // 2️⃣ 작업 수행
  await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', userId)
}
```

### 2️⃣ 권한 검증을 애플리케이션 레벨에서 직접 해야 함

```
❌ RLS 정책 사용 시:
  → DB가 자동으로 권한 검증
  → 안전함

⚠️ Service Role 사용 시:
  → 개발자가 직접 권한 검증 코드 작성
  → 실수하면 보안 취약점
```

### 3️⃣ 감사 로그 부족

```javascript
// RLS 정책: auth.uid() 자동 기록
// Service Role: auth.uid() = null

// 해결책: 직접 로깅 추가
console.log('🔐 관리자 작업:', {
  adminEmail,
  action: 'DELETE_USER',
  targetUserId,
  timestamp: new Date()
})
```

---

## 📊 현재 프로젝트 사용 현황

### ✅ 올바른 사용 (58개 파일)

#### 1. 중앙화된 클라이언트 생성
```javascript
// lib/supabaseAdmin.js ✅ 완벽!
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,  // 세션 관리 안 함
    persistSession: false      // 세션 저장 안 함
  }
})

// 관리자 검증 함수 제공 ✅
export async function verifyAdminAuth(adminEmail) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('email', adminEmail)
    .single()
  
  return profile?.is_admin === true
}
```

#### 2. 관리자 전용 기능
```javascript
// ✅ 올바른 사용처
- 쿠폰 생성/배포 (관리자만)
- 상품 관리 (관리자만)
- 주문 관리 (관리자만)
- 통계 조회 (관리자만)
- 사용자 조회 (관리자만)
```

#### 3. RLS 순환 참조 해결
```javascript
// ✅ RLS 정책이 profiles.is_admin 확인
// → profiles 조회 시 순환 참조 발생
// → Service Role로 우회 (정당한 사용)

// app/api/admin/check-profile/route.js
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('is_admin, is_master, email, name')
  .eq('id', userId)
  .single()
```

---

### ⚠️ 개선 필요 (보안 강화)

#### 1. 일부 API에 권한 검증 누락

```javascript
// ❌ 현재 (일부 API): 권한 검증 없음
export async function POST(request) {
  const data = await request.json()
  
  // 바로 Service Role 사용 → 위험!
  await supabaseAdmin.from('coupons').insert(data)
}

// ✅ 개선: 권한 검증 추가
export async function POST(request) {
  const { adminEmail, ...data } = await request.json()
  
  // 1️⃣ 관리자 검증
  const isAdmin = await verifyAdminAuth(adminEmail)
  if (!isAdmin) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }
  
  // 2️⃣ 작업 수행
  await supabaseAdmin.from('coupons').insert(data)
}
```

#### 2. 중복된 Service Role 클라이언트 생성

```javascript
// ❌ 각 API Route에서 개별 생성
// app/api/admin/coupons/create/route.js
const supabaseAdmin = createClient(url, serviceKey) // 중복 1

// app/api/admin/check-profile/route.js
const supabaseAdmin = createClient(url, serviceKey) // 중복 2

// ... 10+ 파일에서 중복

// ✅ 개선: lib/supabaseAdmin.js 사용
import { supabaseAdmin } from '@/lib/supabaseAdmin'
```

---

## 🎯 개선 권장사항

### 1️⃣ 모든 Service Role API에 권한 검증 추가

```javascript
// lib/adminMiddleware.js (신규 생성)
import { verifyAdminAuth } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function withAdminAuth(handler) {
  return async (request) => {
    // 관리자 이메일 추출 (헤더 또는 바디)
    const adminEmail = request.headers.get('x-admin-email') || 
                       (await request.json()).adminEmail
    
    // 권한 검증
    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }
    
    // 핸들러 실행
    return handler(request)
  }
}

// 사용 예시
export const POST = withAdminAuth(async (request) => {
  // 이미 관리자 검증 완료됨!
  const data = await request.json()
  await supabaseAdmin.from('coupons').insert(data)
})
```

### 2️⃣ 중복 클라이언트 제거

```bash
# 검색: 중복된 Service Role 클라이언트 생성
grep -r "createClient.*SERVICE_ROLE" app/api

# 모두 lib/supabaseAdmin.js import로 변경
```

### 3️⃣ 감사 로그 추가

```javascript
// lib/auditLog.js (신규 생성)
export async function logAdminAction(action, adminEmail, details) {
  await supabaseAdmin
    .from('admin_audit_log')
    .insert({
      action,
      admin_email: adminEmail,
      details: JSON.stringify(details),
      timestamp: new Date().toISOString()
    })
  
  console.log('🔐 관리자 작업:', { action, adminEmail, details })
}

// 사용
await logAdminAction('DELETE_COUPON', adminEmail, { couponId })
```

---

## 📋 체크리스트

### ✅ 현재 잘하고 있는 것
- [x] 중앙화된 supabaseAdmin 클라이언트 (`lib/supabaseAdmin.js`)
- [x] 서버 사이드 전용 사용 (API Routes만)
- [x] 환경변수 검증
- [x] verifyAdminAuth() 함수 제공
- [x] 관리자 전용 기능에만 사용
- [x] RLS 순환 참조 해결에 활용

### ⚠️ 개선 필요
- [ ] 모든 API에 권한 검증 추가 (일부 누락)
- [ ] 중복 클라이언트 생성 제거 (10+ 파일)
- [ ] 감사 로그 시스템 구축
- [ ] 미들웨어 패턴 적용 (withAdminAuth)

---

## 🎯 결론

### ✅ Service Role API 사용은 **매우 좋습니다!**

**이유**:
1. 관리자 기능에 필수적
2. RLS 순환 참조 문제 해결
3. 복잡한 RLS 정책 불필요
4. 성능 향상
5. 올바른 패턴으로 사용 중 ✅

**하지만 개선 필요**:
- 권한 검증 강화 (일부 API)
- 중복 코드 제거
- 감사 로그 추가

**개선 작업 소요 시간**: 0.5-1일
**우선순위**: 중간 (보안 강화 차원)

---

**권장사항**: 현재대로 계속 사용하되, 권한 검증을 모든 API에 추가하세요. ✅
