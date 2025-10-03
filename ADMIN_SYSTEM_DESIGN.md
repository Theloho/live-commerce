# 🔐 관리자 시스템 설계 문서

**날짜**: 2025-10-03
**목적**: 마스터/하위 관리자 구조 + 메뉴별 권한 관리 시스템

---

## 📋 목차

1. [시스템 개요](#1-시스템-개요)
2. [DB 스키마](#2-db-스키마)
3. [권한 체계](#3-권한-체계)
4. [RLS 정책](#4-rls-정책)
5. [API 설계](#5-api-설계)
6. [UI 구조](#6-ui-구조)
7. [구현 체크리스트](#7-구현-체크리스트)

---

## 1. 시스템 개요

### 1.1 관리자 구조

```
👑 마스터 관리자 (is_master = true)
    ├─ 하위 관리자 생성/삭제
    ├─ 권한 부여/회수
    └─ 모든 메뉴 접근 (무제한)

🔧 일반 관리자 (is_admin = true)
    ├─ 마스터가 부여한 권한만 접근
    └─ admin_permissions 테이블로 권한 제어
```

### 1.2 권한 부여 방식

- **마스터 관리자**: 모든 권한 자동 (`is_master = true`)
- **일반 관리자**: `admin_permissions` 테이블에 명시적 권한 저장
- **와일드카드 지원**: `customers.*` = customers 메뉴 모든 권한

---

## 2. DB 스키마

### 2.1 profiles 테이블 (수정)

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.is_admin IS '관리자 여부';
COMMENT ON COLUMN profiles.is_master IS '마스터 관리자 여부 (하위 관리자 생성 권한)';
```

### 2.2 admin_permissions 테이블 (신규)

```sql
CREATE TABLE admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 관리자
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- 권한 정보
    permission VARCHAR(100) NOT NULL,  -- 예: 'customers.view', 'orders.*', 'products.edit'

    -- 메타 정보
    granted_by UUID REFERENCES profiles(id),  -- 권한 부여한 마스터
    granted_at TIMESTAMPTZ DEFAULT NOW(),

    -- 유니크 제약
    UNIQUE(admin_id, permission)
);

CREATE INDEX idx_admin_permissions_admin_id ON admin_permissions(admin_id);
CREATE INDEX idx_admin_permissions_permission ON admin_permissions(permission);

COMMENT ON TABLE admin_permissions IS '관리자별 메뉴 접근 권한';
```

---

## 3. 권한 체계

### 3.1 권한 명명 규칙

```
{메뉴}.{액션}

메뉴:
- customers (고객 관리)
- orders (주문 관리)
- products (상품 관리)
- coupons (쿠폰 관리)
- broadcasts (라이브 방송)
- shipping (배송 관리)
- suppliers (업체 관리)
- categories (카테고리 관리)
- purchase-orders (발주 관리)
- admins (관리자 관리) ← 마스터 전용

액션:
- view (조회)
- create (생성)
- edit (수정)
- delete (삭제)
- * (모든 액션)
```

### 3.2 권한 예시

| 권한 코드 | 설명 |
|-----------|------|
| `customers.view` | 고객 목록 조회만 |
| `customers.*` | 고객 모든 권한 (조회/수정) |
| `orders.view` | 주문 목록 조회만 |
| `orders.edit` | 주문 상태 변경 가능 |
| `products.*` | 상품 전체 관리 |
| `admins.*` | 관리자 관리 (마스터 전용) |

### 3.3 기본 권한 프리셋

**읽기 전용 관리자**:
```javascript
[
  'customers.view',
  'orders.view',
  'products.view',
  'coupons.view'
]
```

**일반 관리자**:
```javascript
[
  'customers.*',
  'orders.*',
  'products.*',
  'coupons.*',
  'broadcasts.*',
  'shipping.*'
]
```

**슈퍼 관리자** (마스터 제외 모든 권한):
```javascript
[
  'customers.*',
  'orders.*',
  'products.*',
  'coupons.*',
  'broadcasts.*',
  'shipping.*',
  'suppliers.*',
  'categories.*',
  'purchase-orders.*'
]
```

---

## 4. RLS 정책

### 4.1 권한 체크 함수

```sql
-- 현재 사용자가 관리자인지 확인
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM profiles
  WHERE id = auth.uid();

  RETURN COALESCE(admin_status, false);
END;
$$;

-- 현재 사용자가 마스터 관리자인지 확인
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  master_status BOOLEAN;
BEGIN
  SELECT is_master INTO master_status
  FROM profiles
  WHERE id = auth.uid();

  RETURN COALESCE(master_status, false);
END;
$$;

-- 현재 사용자가 특정 권한을 가지고 있는지 확인
CREATE OR REPLACE FUNCTION public.has_permission(required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  is_master_admin BOOLEAN;
  has_exact_permission BOOLEAN;
  has_wildcard_permission BOOLEAN;
  permission_prefix TEXT;
BEGIN
  -- 마스터는 모든 권한
  SELECT is_master INTO is_master_admin
  FROM profiles
  WHERE id = auth.uid();

  IF COALESCE(is_master_admin, false) THEN
    RETURN true;
  END IF;

  -- 정확한 권한 체크
  SELECT EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE admin_id = auth.uid()
    AND permission = required_permission
  ) INTO has_exact_permission;

  IF has_exact_permission THEN
    RETURN true;
  END IF;

  -- 와일드카드 권한 체크 (예: 'customers.*')
  permission_prefix := split_part(required_permission, '.', 1) || '.*';

  SELECT EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE admin_id = auth.uid()
    AND permission = permission_prefix
  ) INTO has_wildcard_permission;

  RETURN COALESCE(has_wildcard_permission, false);
END;
$$;
```

### 4.2 profiles 테이블 RLS

```sql
-- 기존 정책 제거
DROP POLICY IF EXISTS "Admin full access on profiles" ON profiles;
DROP POLICY IF EXISTS "Users own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 관리자는 모든 프로필 조회/수정
CREATE POLICY "Admin full access on profiles"
ON profiles
FOR ALL
USING (is_admin());

-- 일반 사용자는 자기 프로필만
CREATE POLICY "Users own profile"
ON profiles
FOR ALL
USING (auth.uid() = id);

-- 신규 사용자 프로필 생성
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);
```

### 4.3 admin_permissions 테이블 RLS

```sql
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- 마스터는 모든 권한 조회/수정
CREATE POLICY "Master can manage all permissions"
ON admin_permissions
FOR ALL
USING (is_master());

-- 일반 관리자는 자기 권한만 조회 가능
CREATE POLICY "Admins can view own permissions"
ON admin_permissions
FOR SELECT
USING (admin_id = auth.uid());
```

---

## 5. API 설계

### 5.1 관리자 관리 API

#### `POST /api/admin/admins/create`
**목적**: 하위 관리자 생성 (마스터 전용)

**요청**:
```json
{
  "email": "admin@example.com",
  "password": "secure_password",
  "name": "김관리",
  "permissions": ["customers.*", "orders.view"]
}
```

**응답**:
```json
{
  "success": true,
  "admin": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "김관리",
    "is_admin": true,
    "is_master": false,
    "created_at": "2025-10-03T..."
  }
}
```

#### `GET /api/admin/admins`
**목적**: 관리자 목록 조회 (마스터 전용)

**응답**:
```json
{
  "admins": [
    {
      "id": "uuid",
      "email": "master@allok.world",
      "name": "Master Admin",
      "is_master": true,
      "is_admin": true,
      "permissions": ["*"],
      "created_at": "2025-10-03T..."
    },
    {
      "id": "uuid2",
      "email": "admin@example.com",
      "name": "김관리",
      "is_master": false,
      "is_admin": true,
      "permissions": ["customers.*", "orders.view"],
      "created_at": "2025-10-03T..."
    }
  ]
}
```

#### `PATCH /api/admin/admins/[id]/permissions`
**목적**: 관리자 권한 수정 (마스터 전용)

**요청**:
```json
{
  "permissions": ["customers.*", "orders.*", "products.view"]
}
```

#### `DELETE /api/admin/admins/[id]`
**목적**: 관리자 삭제 (마스터 전용)

### 5.2 권한 체크 API

#### `GET /api/admin/permissions/check`
**목적**: 현재 관리자의 권한 확인

**요청**:
```json
{
  "permission": "customers.edit"
}
```

**응답**:
```json
{
  "hasPermission": true
}
```

#### `GET /api/admin/permissions/me`
**목적**: 현재 관리자의 전체 권한 목록

**응답**:
```json
{
  "isMaster": false,
  "isAdmin": true,
  "permissions": ["customers.*", "orders.view", "products.view"]
}
```

---

## 6. UI 구조

### 6.1 관리자 관리 페이지 (`/admin/admins`)

**마스터 전용**

```
┌─────────────────────────────────────────┐
│ 👥 관리자 관리                           │
├─────────────────────────────────────────┤
│ [+ 새 관리자 추가]            [검색...]  │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 👑 Master Admin                     │ │
│ │ master@allok.world                  │ │
│ │ 모든 권한 | 생성일: 2025-10-03      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🔧 김관리                           │ │
│ │ admin@example.com                   │ │
│ │ 권한: 고객 관리, 주문 조회          │ │
│ │ [권한 수정] [삭제]                  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 6.2 관리자 생성 모달

```
┌─────────────────────────────────────────┐
│ 새 관리자 추가                           │
├─────────────────────────────────────────┤
│ 이메일: [                    ]          │
│ 비밀번호: [                  ]          │
│ 이름: [                      ]          │
│                                         │
│ 권한 설정:                              │
│ ┌─────────────────────────────────────┐ │
│ │ ☑ 고객 관리 (customers.*)          │ │
│ │   ☑ 조회  ☑ 수정                   │ │
│ │                                     │ │
│ │ ☑ 주문 관리 (orders.*)             │ │
│ │   ☑ 조회  ☐ 수정  ☐ 삭제          │ │
│ │                                     │ │
│ │ ☐ 상품 관리 (products.*)           │ │
│ │ ☐ 쿠폰 관리 (coupons.*)            │ │
│ │ ☐ 라이브 방송 (broadcasts.*)       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 또는 프리셋:                            │
│ [읽기 전용] [일반 관리자] [슈퍼 관리자] │
│                                         │
│         [취소]  [관리자 생성]           │
└─────────────────────────────────────────┘
```

### 6.3 메뉴별 권한 체크

각 관리자 페이지에서 권한 체크:

```javascript
// app/admin/customers/page.js
export default function AdminCustomersPage() {
  const { hasPermission } = useAdminPermissions()

  useEffect(() => {
    if (!hasPermission('customers.view')) {
      toast.error('접근 권한이 없습니다')
      router.push('/admin')
    }
  }, [])

  const canEdit = hasPermission('customers.edit')

  return (
    <div>
      <h1>고객 관리</h1>
      {/* 목록 표시 */}

      {canEdit && (
        <button>수정</button>
      )}
    </div>
  )
}
```

---

## 7. 구현 체크리스트

### 7.1 DB 스키마
- [ ] profiles 테이블에 is_master 컬럼 추가
- [ ] admin_permissions 테이블 생성
- [ ] is_admin(), is_master(), has_permission() 함수 생성
- [ ] RLS 정책 업데이트 (profiles, admin_permissions, 기타 테이블)
- [ ] 마스터 관리자 설정 (master@allok.world)

### 7.2 API 구현
- [ ] POST /api/admin/admins/create
- [ ] GET /api/admin/admins
- [ ] PATCH /api/admin/admins/[id]/permissions
- [ ] DELETE /api/admin/admins/[id]
- [ ] GET /api/admin/permissions/check
- [ ] GET /api/admin/permissions/me

### 7.3 프론트엔드
- [ ] hooks/useAdminPermissions.js 생성
- [ ] app/admin/admins/page.js (관리자 목록)
- [ ] 관리자 생성 모달 컴포넌트
- [ ] 권한 수정 모달 컴포넌트
- [ ] 기존 관리자 페이지에 권한 체크 추가

### 7.4 테스트
- [ ] 마스터 관리자로 하위 관리자 생성 테스트
- [ ] 권한별 페이지 접근 테스트
- [ ] 일반 관리자로 권한 없는 페이지 접근 차단 확인
- [ ] RLS 정책 무한 재귀 해결 확인

---

**다음 단계**: SQL 파일 생성 및 실행
