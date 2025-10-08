# FEATURE_CONNECTIVITY_MAP_PART3.md - 관리자 + 발주 시스템

**⚠️ 이 파일은 전체 문서의 Part 3입니다**
- **Part 1**: 주문 시스템 + 상품 시스템
- **Part 2**: 쿠폰 시스템 + 배송 시스템
- **Part 3**: 관리자 시스템 + 발주 시스템 ← **현재 파일**

**생성일**: 2025-10-08
**버전**: 1.0
**목적**: 관리자 권한 및 발주 시스템의 연결성과 데이터 흐름 파악

---

## 📋 목차

1. [관리자 인증 시스템 전체 연결성](#1-관리자-인증-시스템-전체-연결성)
2. [발주 시스템 전체 연결성](#2-발주-시스템-전체-연결성)
3. [데이터베이스 테이블 연결 다이어그램](#3-데이터베이스-테이블-연결-다이어그램)
4. [함수 체인 (Function Call Chain)](#4-함수-체인-function-call-chain)

---

## 1. 관리자 인증 시스템 전체 연결성

### 1.1 관리자 로그인 → Service Role API → RLS 우회 전체 흐름

```
┌─────────────────────────────────────────────────────────────┐
│ 1단계: 관리자 로그인                                         │
│                                                              │
│ 시작: /admin/login                                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 입력:                                                        │
│  ├── email: 'master@allok.world'                             │
│  └── password: '********'                                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 방법 1: Supabase Auth 로그인 (일반 사용자 → 관리자 플래그)  │
│                                                              │
│ supabase.auth.signInWithPassword({ email, password })       │
│  ↓ success                                                   │
│ { user, session }                                            │
│  ↓ checks                                                    │
│ SELECT is_admin FROM profiles WHERE id = user.id            │
│  ↓ if (is_admin = true)                                      │
│ localStorage.setItem('adminEmail', email)                    │
│ router.push('/admin')                                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 방법 2: 별도 관리자 시스템 로그인 (2025-10-05 추가)         │
│                                                              │
│ POST /api/admin/auth/login                                   │
│  ↓ queries (admins 테이블, RLS 비활성화)                     │
│ SELECT * FROM admins                                         │
│ WHERE email = email AND is_active = true                     │
│  ↓ validates                                                 │
│ bcrypt.compare(password, password_hash)                      │
│  ↓ if (valid)                                                │
│ 세션 토큰 생성 (admin_sessions INSERT)                       │
│ localStorage.setItem('adminToken', token)                    │
│ router.push('/admin')                                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2단계: 관리자 권한이 필요한 API 호출                         │
│                                                              │
│ 예: 쿠폰 생성, 쿠폰 배포, 프로필 조회                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ Service Role API Route 구조                                  │
│                                                              │
│ 프론트엔드 (lib/couponApi.js):                               │
│  ↓ calls                                                     │
│ POST /api/admin/coupons/create                               │
│  ↓ with headers                                              │
│ {                                                            │
│   'Content-Type': 'application/json',                        │
│   'Authorization': `Bearer ${accessToken}` (optional)        │
│ }                                                            │
│  ↓ with body                                                 │
│ {                                                            │
│   adminEmail: localStorage.getItem('adminEmail'),            │
│   ...apiData                                                 │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 서버 사이드 (app/api/admin/*/route.js)                       │
│                                                              │
│ export async function POST(request) {                        │
│   const { adminEmail, ...data } = await request.json()      │
│                                                              │
│   // 1. 관리자 권한 검증                                     │
│   ↓ calls                                                    │
│   verifyAdminAuth(adminEmail)                                │
│     ↓ checks (lib/supabaseAdmin.js)                          │
│     const adminEmails = process.env.ADMIN_EMAILS             │
│       .split(',')                                            │
│       .map(e => e.trim())                                    │
│                                                              │
│     IF (!adminEmails.includes(adminEmail)) THEN              │
│       throw new Error('관리자 권한이 없습니다')              │
│     END IF                                                   │
│                                                              │
│   // 2. Service Role 클라이언트 사용                         │
│   ↓ uses                                                     │
│   supabaseAdmin (lib/supabaseAdmin.js)                       │
│     ├── createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)│
│     └── RLS 정책 완전 우회                                   │
│                                                              │
│   // 3. DB 작업 (RLS 우회)                                   │
│   ↓ queries                                                  │
│   const { data, error } = await supabaseAdmin               │
│     .from('coupons')                                         │
│     .insert({ ... })  -- RLS INSERT 정책 무시               │
│     .select()                                                │
│                                                              │
│   // 4. 결과 반환                                            │
│   ↓ returns                                                  │
│   return NextResponse.json({ success: true, data })          │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3단계: RLS 정책 우회 확인                                    │
│                                                              │
│ Service Role Key 권한:                                       │
│  ✅ 모든 RLS 정책 우회                                       │
│  ✅ 모든 테이블 접근 가능                                    │
│  ✅ SELECT, INSERT, UPDATE, DELETE 제한 없음                 │
│                                                              │
│ 보안 장치:                                                   │
│  ✅ 환경변수 (SUPABASE_SERVICE_ROLE_KEY)                     │
│  ✅ 서버 사이드에서만 사용                                   │
│  ✅ 관리자 이메일 검증 (ADMIN_EMAILS)                        │
│  ✅ API Route에서 verifyAdminAuth() 호출 필수                │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 관리자 권한 확인 흐름 (profiles.is_admin 기반)

```
┌─────────────────────────────────────────────────────────────┐
│ 시작: 관리자 페이지 접근 또는 관리자 기능 호출              │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 방법 1: RLS 정책에서 is_admin 확인 (DB 레벨)                │
│                                                              │
│ RLS SELECT 정책 예시 (orders):                               │
│ CREATE POLICY "Users view own orders"                        │
│ ON orders FOR SELECT                                         │
│ USING (                                                      │
│   user_id = auth.uid()  -- 본인 주문                         │
│   OR                                                         │
│   order_type LIKE '%KAKAO:' || get_current_user_kakao_id()  │
│   OR                                                         │
│   (SELECT is_admin FROM profiles                             │
│    WHERE id = auth.uid()) = true  -- ⭐ 관리자 플래그        │
│ );                                                           │
│                                                              │
│ 결과:                                                        │
│  ├── is_admin = true → 모든 주문 조회 가능                   │
│  └── is_admin = false → 본인 주문만 조회                     │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 방법 2: API Route에서 verifyAdminAuth() 호출 (앱 레벨)      │
│                                                              │
│ verifyAdminAuth(adminEmail)                                  │
│  ↓ checks environment variable                               │
│ const adminEmails = process.env.ADMIN_EMAILS.split(',')      │
│ // 예: 'master@allok.world,admin@allok.world'               │
│                                                              │
│  ↓ validates                                                 │
│ IF (!adminEmails.includes(adminEmail)) THEN                  │
│   throw new Error('관리자 권한이 없습니다')                  │
│ END IF                                                       │
│                                                              │
│  ↓ optionally checks DB                                      │
│ const { data: profile } = await supabaseAdmin               │
│   .from('profiles')                                          │
│   .select('is_admin')                                        │
│   .eq('email', adminEmail)                                   │
│   .single()                                                  │
│                                                              │
│ IF (!profile?.is_admin) THEN                                 │
│   throw new Error('관리자 플래그가 false입니다')             │
│ END IF                                                       │
│                                                              │
│ return true  -- 검증 통과                                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 관리자 권한 설정 (DB 플래그)

```
┌─────────────────────────────────────────────────────────────┐
│ 관리자 플래그 설정 방법                                      │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 방법 1: SQL 직접 실행 (Supabase Dashboard)                   │
│                                                              │
│ UPDATE profiles                                              │
│ SET is_admin = true                                          │
│ WHERE email = 'master@allok.world';                          │
│                                                              │
│ 결과: ✅ 즉시 적용                                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 방법 2: 마이그레이션 파일 (자동화)                           │
│                                                              │
│ -- supabase/migrations/20251007_set_master_admin.sql        │
│ UPDATE profiles                                              │
│ SET is_admin = true                                          │
│ WHERE email = 'master@allok.world';                          │
│                                                              │
│ 배포 시 자동 실행: ✅                                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 방법 3: API Route (관리자 권한 설정 API)                     │
│                                                              │
│ POST /api/admin/set-admin                                    │
│  ↓ with body                                                 │
│ {                                                            │
│   masterEmail: 'master@allok.world',  -- 마스터 권한 필요    │
│   targetEmail: 'new-admin@allok.world',                      │
│   isAdmin: true                                              │
│ }                                                            │
│                                                              │
│ 서버 사이드:                                                 │
│  ↓ validates                                                 │
│ verifyMasterAuth(masterEmail)  -- 마스터 관리자만 가능       │
│  ↓ updates                                                   │
│ await supabaseAdmin                                          │
│   .from('profiles')                                          │
│   .update({ is_admin: isAdmin })                             │
│   .eq('email', targetEmail)                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 발주 시스템 전체 연결성

### 2.1 입금확인 → 발주서 생성 → 중복 방지 전체 흐름

```
┌─────────────────────────────────────────────────────────────┐
│ 1단계: 입금 확인 완료 (관리자)                               │
│                                                              │
│ 시작: /admin/deposits - 입금 관리 페이지                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 입금 확인 프로세스:                                          │
│  1. 엑셀 업로드 (은행 거래 내역)                             │
│  2. 입금자명 자동 매칭 (depositor_name)                      │
│  3. 수동 확인 (관리자)                                       │
│  4. updateOrderStatus(orderId, 'verifying')                  │
│     └── verifying_at = NOW()                                 │
│  5. updateOrderStatus(orderId, 'paid')                       │
│     └── paid_at = NOW()                                      │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2단계: 발주 대상 주문 조회                                   │
│                                                              │
│ 시작: /admin/purchase-orders - 발주 관리 페이지             │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ getPurchaseOrdersBySupplier(startDate, endDate)              │
│                                                              │
│ 조회 조건:                                                   │
│  ├── status = 'paid' (결제완료만)                            │
│  ├── paid_at BETWEEN startDate AND endDate                   │
│  └── supplier_id 별로 그룹화                                 │
│                                                              │
│ JOIN:                                                        │
│  ├── orders                                                  │
│  ├── order_items                                             │
│  ├── products (supplier_id)                                  │
│  └── suppliers                                               │
│                                                              │
│ 중복 발주 확인:                                              │
│  ↓ queries                                                   │
│ SELECT order_ids FROM purchase_order_batches                 │
│ WHERE status = 'completed'                                   │
│   AND supplier_id = supplierId                               │
│                                                              │
│  ↓ filters                                                   │
│ const completedOrderIds = new Set()                          │
│ batches?.forEach(batch => {                                  │
│   batch.order_ids?.forEach(id => completedOrderIds.add(id)) │
│ })                                                           │
│                                                              │
│ const pendingOrders = allOrders.filter(o =>                  │
│   !completedOrderIds.has(o.id)                               │
│ )                                                            │
│                                                              │
│ 출력:                                                        │
│  ├── 공급업체별 그룹화 데이터                                │
│  ├── 미발주 주문 목록                                        │
│  └── 상품별 수량 집계                                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3단계: 발주서 생성 및 Excel 다운로드                         │
│                                                              │
│ 클릭: "발주서 다운로드" 버튼                                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ generatePurchaseOrderExcel(supplierId, orders)               │
│                                                              │
│ 1. 상품별 수량 집계                                          │
│    ↓                                                         │
│    const itemsByProduct = {}                                 │
│    orders.forEach(order => {                                 │
│      order.order_items.forEach(item => {                     │
│        if (!itemsByProduct[item.product_id]) {               │
│          itemsByProduct[item.product_id] = {                 │
│            productName: item.title,                          │
│            totalQuantity: 0,                                 │
│            orders: []                                        │
│          }                                                   │
│        }                                                     │
│        itemsByProduct[item.product_id].totalQuantity +=      │
│          item.quantity                                       │
│      })                                                      │
│    })                                                        │
│                                                              │
│ 2. Excel 워크시트 생성 (XLSX.js)                             │
│    ↓                                                         │
│    const worksheet = XLSX.utils.json_to_sheet([              │
│      { 상품명: '상품A', 수량: 10, 단가: 5000, 총액: 50000 }, │
│      { 상품명: '상품B', 수량: 5, 단가: 3000, 총액: 15000 },  │
│      ...                                                     │
│    ])                                                        │
│                                                              │
│ 3. 발주 이력 저장 (DB)                                       │
│    ↓                                                         │
│    INSERT INTO purchase_order_batches (                      │
│      supplier_id,                                            │
│      order_ids,  -- UUID[] 배열                             │
│      adjusted_quantities,  -- JSONB {item_id: qty}          │
│      total_items,                                            │
│      total_amount,                                           │
│      status,                                                 │
│      created_by                                              │
│    ) VALUES (                                                │
│      supplierId,                                             │
│      [order1_id, order2_id, ...],  -- ⭐ UUID 배열          │
│      { item1_id: 10, item2_id: 5 },  -- ⭐ JSONB           │
│      15,                                                     │
│      65000,                                                  │
│      'completed',                                            │
│      adminEmail                                              │
│    );                                                        │
│                                                              │
│ 4. Excel 파일 다운로드                                       │
│    ↓                                                         │
│    XLSX.writeFile(workbook,                                  │
│      `발주서_${supplierName}_${date}.xlsx`)                  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4단계: 중복 발주 방지 (GIN 인덱스 활용)                      │
│                                                              │
│ GIN 인덱스:                                                  │
│ CREATE INDEX idx_purchase_order_batches_order_ids            │
│ ON purchase_order_batches USING GIN(order_ids);              │
│                                                              │
│ 중복 확인 쿼리:                                              │
│ SELECT * FROM purchase_order_batches                         │
│ WHERE order_ids @> ARRAY['order-uuid-1']::uuid[]             │
│   -- @> 연산자: 배열에 해당 UUID 포함 여부                  │
│                                                              │
│ 결과:                                                        │
│  ├── 이미 발주된 주문은 자동 제외                            │
│  └── 미발주 주문만 발주서에 포함                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 수량 조정 기능 (adjusted_quantities)

```
┌─────────────────────────────────────────────────────────────┐
│ 수량 조정 시나리오                                           │
│                                                              │
│ 예: 주문 A(상품1 x 10개), 주문 B(상품1 x 5개)               │
│     → 발주서: 상품1 x 15개                                   │
│     → 관리자가 13개로 조정 (재고 부족 등)                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. UI에서 수량 입력                                          │
│                                                              │
│ <input                                                       │
│   type="number"                                              │
│   value={15}                                                 │
│   onChange={(e) => handleAdjustQuantity(itemId, e.value)}    │
│ />                                                           │
│                                                              │
│ adjustedQuantities = {                                       │
│   'item-uuid-1': 13  -- 15 → 13으로 조정                    │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. DB 저장 (JSONB)                                           │
│                                                              │
│ INSERT INTO purchase_order_batches (                         │
│   ...,                                                       │
│   adjusted_quantities                                        │
│ ) VALUES (                                                   │
│   ...,                                                       │
│   '{"item-uuid-1": 13}'::jsonb  -- ⭐ JSONB 형식            │
│ );                                                           │
│                                                              │
│ 조회:                                                        │
│ SELECT adjusted_quantities->'item-uuid-1' AS adjusted        │
│ FROM purchase_order_batches                                  │
│ WHERE id = batchId;                                          │
│ -- 결과: 13                                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 데이터베이스 테이블 연결 다이어그램

### 3.1 관리자 권한 테이블 관계

```
auth.users (Supabase Auth)
    ├── id (UUID)
    ├── email (TEXT)
    └── encrypted_password
        ↓
        │ (FK: id)
        ↓
    profiles (사용자 프로필)
        ├── id (UUID) - auth.users와 동일
        ├── email (TEXT)
        ├── is_admin (BOOLEAN) ⭐ 관리자 플래그
        └── kakao_id (TEXT)
            ↓
            │ (RLS 정책에서 확인)
            ↓
        orders (모든 주문 조회 가능)
        coupons (생성/수정/삭제 가능)
        user_coupons (배포 가능)
        ...

┌─────────────────────────────────────────────────────────────┐
│ 별도 관리자 시스템 (2025-10-05 추가)                         │
└─────────────────────────────────────────────────────────────┘

    admins (관리자 계정)
        ├── id (UUID)
        ├── email (TEXT) UNIQUE
        ├── password_hash (TEXT) - bcrypt
        ├── name (TEXT)
        ├── is_master (BOOLEAN) - 마스터 관리자
        └── is_active (BOOLEAN)
            ↓
            │ (FK: admin_id)
            ↓
        admin_sessions (관리자 세션)
            ├── id (UUID)
            ├── admin_id (UUID) FK → admins
            ├── token (TEXT) - 세션 토큰
            ├── expires_at (TIMESTAMPTZ)
            └── created_at (TIMESTAMPTZ)
```

### 3.2 발주 시스템 테이블 관계

```
suppliers (공급업체)
    ├── id (UUID)
    ├── name (TEXT)
    ├── code (VARCHAR) UNIQUE
    ├── phone (TEXT)
    └── email (TEXT)
        ↓
        │ (FK: supplier_id)
        ↓
    products (상품)
        ├── id (UUID)
        ├── supplier_id (UUID) FK → suppliers
        ├── product_number (VARCHAR)
        └── ...
            ↓
            │ (FK: product_id)
            ↓
        order_items (주문 상품)
            ├── id (UUID)
            ├── product_id (UUID) FK → products
            ├── order_id (UUID) FK → orders
            └── quantity (INT)
                ↓
                │ (FK: order_id)
                ↓
            orders (주문)
                ├── id (UUID)
                ├── status (VARCHAR) - 'paid' (발주 대상)
                ├── paid_at (TIMESTAMPTZ)
                └── ...
                    ↓
                    │ (발주 완료 시)
                    ↓
                purchase_order_batches (발주 이력)
                    ├── id (UUID)
                    ├── supplier_id (UUID) FK → suppliers
                    ├── order_ids (UUID[]) ⭐ 배열
                    ├── adjusted_quantities (JSONB) ⭐
                    ├── total_items (INT)
                    ├── total_amount (INT)
                    ├── status (VARCHAR)
                    ├── download_date (TIMESTAMPTZ)
                    └── created_by (VARCHAR)
```

---

## 4. 함수 체인 (Function Call Chain)

### 4.1 관리자 권한 검증 함수 체인

```javascript
// ========================================
// 관리자 로그인 (Supabase Auth 방식)
// ========================================

// 프론트엔드 (app/admin/login/page.js)
handleLogin(email, password)
  ↓ calls
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  ↓ if (success)
  const { user } = data

  ↓ checks admin flag
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  ↓ if (profile.is_admin)
  localStorage.setItem('adminEmail', email)
  router.push('/admin')

// ========================================
// Service Role API 호출 (쿠폰 생성 예시)
// ========================================

// 프론트엔드 (lib/couponApi.js)
createCoupon(couponData)
  ↓ calls
  const response = await fetch('/api/admin/coupons/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      adminEmail: localStorage.getItem('adminEmail'),
      ...couponData
    })
  })

// 서버 사이드 (app/api/admin/coupons/create/route.js)
export async function POST(request) {
  const { adminEmail, ...couponData } = await request.json()

  ↓ validates
  verifyAdminAuth(adminEmail)
    ↓ implementation (lib/supabaseAdmin.js)
    function verifyAdminAuth(adminEmail) {
      const adminEmails = process.env.ADMIN_EMAILS
        .split(',')
        .map(e => e.trim())

      IF (!adminEmails.includes(adminEmail)) {
        throw new Error('관리자 권한이 없습니다')
      }

      // Optional: DB 플래그 확인
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('email', adminEmail)
        .single()

      IF (!profile?.is_admin) {
        throw new Error('관리자 플래그가 false입니다')
      }

      return true
    }

  ↓ if (verified)
  const { data, error } = await supabaseAdmin
    .from('coupons')
    .insert(couponData)  -- RLS 우회
    .select()

  ↓ returns
  return NextResponse.json({ success: true, coupon: data })
}

// ========================================
// RLS 정책에서 is_admin 확인
// ========================================

// DB 레벨 (RLS 정책)
CREATE POLICY "Users view own orders"
ON orders FOR SELECT
USING (
  user_id = auth.uid()
  OR
  order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'
  OR
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

// 프론트엔드 (자동 적용)
const { data: orders } = await supabase
  .from('orders')
  .select('*')

// RLS 정책 자동 실행:
// - is_admin = true → 모든 주문 반환
// - is_admin = false → 본인 주문만 반환
```

### 4.2 발주 시스템 함수 체인

```javascript
// ========================================
// 발주 대상 주문 조회
// ========================================

// 프론트엔드 (app/admin/purchase-orders/page.js)
useEffect(() => {
  loadPurchaseOrders()
}, [])

loadPurchaseOrders()
  ↓ calls
  getPurchaseOrdersBySupplier(startDate, endDate)
    ↓ queries (lib/supabaseApi.js)
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          product:products(
            id,
            title,
            supplier_id,
            supplier:suppliers(*)
          )
        )
      `)
      .eq('status', 'paid')
      .gte('paid_at', startDate)
      .lte('paid_at', endDate)

    ↓ checks for completed batches
    const { data: batches } = await supabase
      .from('purchase_order_batches')
      .select('order_ids')
      .eq('status', 'completed')

    ↓ filters out completed orders
    const completedOrderIds = new Set()
    batches?.forEach(batch => {
      batch.order_ids?.forEach(id => completedOrderIds.add(id))
    })

    const pendingOrders = orders.filter(o =>
      !completedOrderIds.has(o.id)
    )

    ↓ groups by supplier
    const ordersBySupplier = {}
    pendingOrders.forEach(order => {
      order.order_items.forEach(item => {
        const supplierId = item.product.supplier_id
        if (!ordersBySupplier[supplierId]) {
          ordersBySupplier[supplierId] = {
            supplier: item.product.supplier,
            orders: []
          }
        }
        ordersBySupplier[supplierId].orders.push(order)
      })
    })

    ↓ returns
    return ordersBySupplier

// ========================================
// 발주서 생성 및 다운로드
// ========================================

// 프론트엔드
handleDownloadPurchaseOrder(supplierId)
  ↓ calls
  generatePurchaseOrderExcel(supplierId, orders)
    ↓ aggregates items
    const itemsByProduct = {}
    orders.forEach(order => {
      order.order_items.forEach(item => {
        if (!itemsByProduct[item.product_id]) {
          itemsByProduct[item.product_id] = {
            productName: item.title,
            totalQuantity: 0,
            unitPrice: item.price,
            orders: []
          }
        }
        itemsByProduct[item.product_id].totalQuantity += item.quantity
        itemsByProduct[item.product_id].orders.push({
          orderId: order.id,
          quantity: item.quantity
        })
      })
    })

    ↓ creates Excel worksheet
    const worksheetData = Object.values(itemsByProduct).map(item => ({
      '상품명': item.productName,
      '총 수량': item.totalQuantity,
      '단가': item.unitPrice,
      '총액': item.totalQuantity * item.unitPrice,
      '주문 건수': item.orders.length
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '발주서')

    ↓ saves batch to DB
    const { data: batch } = await supabase
      .from('purchase_order_batches')
      .insert({
        supplier_id: supplierId,
        order_ids: orders.map(o => o.id),  -- UUID[] 배열
        adjusted_quantities: adjustedQuantities || null,  -- JSONB
        total_items: Object.values(itemsByProduct).length,
        total_amount: Object.values(itemsByProduct).reduce(
          (sum, item) => sum + (item.totalQuantity * item.unitPrice), 0
        ),
        status: 'completed',
        created_by: adminEmail
      })
      .select()

    ↓ downloads Excel file
    XLSX.writeFile(
      workbook,
      `발주서_${supplierName}_${new Date().toISOString().split('T')[0]}.xlsx`
    )

    ↓ updates UI
    loadPurchaseOrders()  -- 완료된 주문 제외하고 다시 로드

// ========================================
// 중복 발주 방지 (GIN 인덱스 활용)
// ========================================

// DB 쿼리
SELECT * FROM purchase_order_batches
WHERE order_ids @> ARRAY['order-uuid-1']::uuid[]
  -- @> 연산자: order_ids 배열에 'order-uuid-1' 포함 여부
  AND status = 'completed'

// GIN 인덱스로 빠른 검색
CREATE INDEX idx_purchase_order_batches_order_ids
ON purchase_order_batches USING GIN(order_ids);
```

---

## 🎯 Claude용 체크리스트

### 관리자 권한 확인 시 필수 사항

```
✅ verifyAdminAuth(adminEmail) 호출 (API Route)
✅ process.env.ADMIN_EMAILS 확인
✅ profiles.is_admin 플래그 확인 (DB)
✅ Service Role Key 사용 (supabaseAdmin)
✅ RLS 정책 우회 확인
✅ 환경변수 설정:
   - SUPABASE_SERVICE_ROLE_KEY
   - ADMIN_EMAILS (쉼표 구분)
```

### Service Role API 작성 시 필수 사항

```
✅ app/api/admin/*/route.js 파일 생성
✅ verifyAdminAuth() 호출 (첫 번째 단계)
✅ supabaseAdmin 클라이언트 사용
✅ RLS 우회 확인 (모든 데이터 접근 가능)
✅ 에러 처리 (403 Forbidden)
✅ NextResponse.json() 반환
```

### 발주 시스템 작업 시 필수 사항

```
✅ status = 'paid' 주문만 조회
✅ purchase_order_batches 중복 확인
✅ order_ids 배열 (UUID[])
✅ GIN 인덱스 활용 (@> 연산자)
✅ adjusted_quantities (JSONB)
✅ XLSX.js 라이브러리 사용
✅ 상품별 수량 집계
✅ 발주 이력 저장 (batch INSERT)
```

### 관리자 플래그 설정 시 필수 사항

```
✅ profiles.is_admin = true 설정 (SQL)
✅ 마이그레이션 파일 생성 (자동화)
✅ 환경변수 ADMIN_EMAILS 업데이트
✅ Vercel 환경변수 배포 확인
✅ RLS 정책 확인 (is_admin 조건)
```

---

**마지막 업데이트**: 2025-10-08
**작성자**: Claude (AI Assistant)
**버전**: 1.0
