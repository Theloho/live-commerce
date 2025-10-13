# 작업 로그 - 2025-10-14: 관리자 페이지 Service Role API 전환

**작업 시간**: 2025-10-14 오후
**작업 목표**: 모바일에서 관리자 페이지 데이터 표시 문제 해결

---

## 📋 작업 요약

### 🎯 목표
- **문제**: 모바일에서 관리자 페이지 접속 시 데이터가 표시되지 않음
- **원인**: 클라이언트 Supabase (Anon Key) 사용으로 RLS 정책이 데이터 조회 차단
- **해결**: Service Role API로 전환하여 RLS 우회

### ✅ 완료한 작업 (5개 페이지)

1. **`/admin/deposits`** - 입금 확인
2. **`/admin/shipping`** - 발송 관리
3. **`/admin/purchase-orders`** - 발주 관리 (메인 + 상세)
4. **`/admin/customers`** - 고객 관리
5. **`/admin/suppliers`** - 공급업체 관리 (CRUD)

---

## 🔧 기술적 변경사항

### 생성된 Service Role API (5개)

#### 1. `/api/admin/customers` (신규)
**기능**: 고객 목록 조회 + 주문 통계 집계
```javascript
GET /api/admin/customers?adminEmail={email}

// 응답
{
  success: true,
  customers: [
    {
      id, name, nickname, phone, email,
      orderCount: 5,
      totalSpent: 150000
    }
  ]
}
```

#### 2. `/api/admin/suppliers` (신규)
**기능**: 공급업체 CRUD (GET, POST, PUT)
```javascript
// 조회
GET /api/admin/suppliers?adminEmail={email}

// 생성
POST /api/admin/suppliers
Body: { adminEmail, name, code, contact_person, ... }

// 수정
PUT /api/admin/suppliers
Body: { adminEmail, id, ...updates }
```

#### 3. `/api/admin/purchase-orders` (신규)
**기능**: 발주 데이터 조회
```javascript
GET /api/admin/purchase-orders?adminEmail={email}&showCompleted={bool}

// 응답
{
  success: true,
  orders: [...],
  completedBatches: [...]
}
```

#### 4. `/api/admin/purchase-orders/[supplierId]` (신규)
**기능**: 발주 상세 조회
```javascript
GET /api/admin/purchase-orders/{supplierId}?adminEmail={email}

// 응답
{
  success: true,
  supplier: {...},
  orders: [...],
  completedBatches: [...]
}
```

#### 5. `/api/admin/purchase-orders/batch` (신규)
**기능**: 발주 배치 생성
```javascript
POST /api/admin/purchase-orders/batch
Body: {
  adminEmail,
  supplierId,
  orderIds: [...],
  adjustedQuantities: {...},
  totalItems,
  totalAmount
}
```

---

## 🔐 보안 패턴

**모든 API에서 일관된 검증 적용**:
```javascript
// 1. adminEmail 파라미터로 관리자 식별
const adminEmail = searchParams.get('adminEmail') // GET
const { adminEmail } = await request.json()        // POST/PUT

// 2. 서버 사이드 권한 확인
const isAdmin = await verifyAdminAuth(adminEmail)
if (!isAdmin) {
  return NextResponse.json({ error: '관리자 권한이 없습니다' }, { status: 403 })
}

// 3. Service Role (supabaseAdmin)으로 RLS 우회
const { data } = await supabaseAdmin.from('table').select(...)
```

**장점**:
- ✅ 클라이언트 세션 토큰 독립적
- ✅ 웹/모바일 동일하게 작동
- ✅ RLS 정책과 무관하게 안정적

---

## 📝 페이지별 변경 상세

### 1. `/admin/deposits` - 입금 확인

**변경 전**:
```javascript
const orders = await getAllOrders()
const bankTransferOrders = orders.filter(...)
```

**변경 후**:
```javascript
const { adminUser } = useAdminAuth()
const response = await fetch(`/api/admin/orders?adminEmail=${adminUser.email}`)
const { orders } = await response.json()
```

**추가 개선**:
- `depositName` 필드 매핑 추가 (deposit_name, depositor_name 모두 대응)

---

### 2. `/admin/shipping` - 발송 관리

**변경 전**:
```javascript
const { getAllOrders } = await import('@/lib/supabaseApi')
const allOrders = await getAllOrders()
```

**변경 후**:
```javascript
const { adminUser } = useAdminAuth()
const response = await fetch(`/api/admin/orders?adminEmail=${adminUser.email}`)
const { orders: allOrders } = await response.json()
```

**기능 유지**:
- paid, shipping, delivered 상태 필터링
- 배송 정보 우선순위 (shipping_* 컬럼 우선)

---

### 3. `/admin/purchase-orders` - 발주 관리

**변경 전** (클라이언트 Supabase):
```javascript
const { data: orders } = await supabase.from('orders').select(...)
const { data: completedBatches } = await supabase.from('purchase_order_batches').select(...)
```

**변경 후** (Service Role API):
```javascript
// 메인 페이지
const response = await fetch(`/api/admin/purchase-orders?adminEmail=${adminUser.email}`)
const { orders, completedBatches } = await response.json()

// 상세 페이지
const response = await fetch(`/api/admin/purchase-orders/${supplierId}?adminEmail=${adminUser.email}`)
const { supplier, orders, completedBatches } = await response.json()

// 배치 생성
const response = await fetch('/api/admin/purchase-orders/batch', {
  method: 'POST',
  body: JSON.stringify({ adminEmail, supplierId, orderIds, ... })
})
```

**API 3개 생성**:
- 메인 페이지용
- 상세 페이지용
- 배치 생성용

---

### 4. `/admin/customers` - 고객 관리

**변경 전**:
```javascript
const customersData = await getAllCustomers()
```

**변경 후**:
```javascript
const { adminUser } = useAdminAuth()
const response = await fetch(`/api/admin/customers?adminEmail=${adminUser.email}`)
const { customers: customersData } = await response.json()
```

**API 기능**:
- profiles 전체 조회
- 각 고객의 주문 수 + 총 지출액 집계 (카카오 사용자 포함)

---

### 5. `/admin/suppliers` - 공급업체 관리

**변경 전** (CRUD 모두 클라이언트):
```javascript
// 조회
const { data } = await supabase.from('suppliers').select(...)

// 생성
await supabase.from('suppliers').insert(...)

// 수정
await supabase.from('suppliers').update(...).eq('id', id)

// 활성화 토글
await supabase.from('suppliers').update({ is_active: !is_active })
```

**변경 후** (Service Role API):
```javascript
// 조회
const response = await fetch(`/api/admin/suppliers?adminEmail=${adminUser.email}`)

// 생성
await fetch('/api/admin/suppliers', {
  method: 'POST',
  body: JSON.stringify({ adminEmail, ...formData })
})

// 수정
await fetch('/api/admin/suppliers', {
  method: 'PUT',
  body: JSON.stringify({ adminEmail, id, ...updates })
})
```

**API 기능**:
- GET: 공급업체 목록 + 각 업체의 상품 개수
- POST: 새 공급업체 추가 (코드 자동 생성)
- PUT: 공급업체 정보 수정 또는 활성화 토글

---

## 🐛 디버깅 과정

### 문제: 모바일에서 "데이터가 명확하게 안 보임"

**디버깅 단계**:
1. **로그 추가**: 전체 주문 수, 필터링 조건, 최종 주문 수
2. **원인 파악**: 데이터는 조회되지만 필터링 후 0개
3. **해결**: depositName 필드 매핑 추가

**추가한 로그** (임시):
```javascript
console.log('✅ [입금확인] 전체 주문 조회:', orders?.length)
console.log('🔍 [입금확인] 주문 필터링:', { orderId, paymentMethod, orderStatus })
console.log('✅ [입금확인] 필터링된 주문:', bankTransferOrders.length)
```

**결과**: 데이터 정상 표시 확인 후 로그 제거

---

## 📊 성과

### Before
- ❌ 모바일에서 데이터 안 보임
- ❌ RLS 정책에 의존적
- ❌ 세션 토큰 문제 발생 가능

### After
- ✅ 웹/모바일 모두 데이터 정상 표시
- ✅ RLS 정책 독립적
- ✅ 안정적인 관리자 기능 제공

### 통계
- **전환된 페이지**: 5개
- **생성된 API**: 5개 (엔드포인트 8개)
- **수정된 파일**: 11개 (6개 수정 + 5개 신규)
- **진행률**: 62.5% (5/8 완료)

---

## ⏳ 남은 작업 (3개)

1. **`/admin/categories`** - 카테고리 관리 (중간 난이도, 15분 예상)
2. **`/admin/settings`** - 설정 (낮은 난이도, 5-10분 예상)
3. **`/admin/admins`** - 관리자 관리 (높은 난이도, 30-40분 예상)

**상세 계획**: `TODO_2025-10-14.md` 참고

---

## 💾 커밋 히스토리

### 1. `030d940` - 주요 작업 완료
```
fix: 5개 관리자 페이지 Service Role API로 전환하여 모바일 데이터 표시 문제 해결

- 5개 페이지 전환
- 5개 API 생성
- 일관된 보안 패턴 적용
```

### 2. `75aded2` - 디버깅 로그 추가
```
debug: 입금확인/발송관리 페이지 데이터 필터링 디버깅 로그 추가
```

### 3. `f7e8fcd` - 최종 정리
```
clean: 디버깅 로그 제거 및 코드 정리

- depositName 필드 매핑 추가
- 코드 정리 및 안정화
- 웹/모바일 모두 정상 작동 확인
```

---

## 🎯 다음 단계

**내일 작업**:
1. 나머지 3개 페이지 Service Role API 전환
2. 전체 관리자 페이지 완전 통합 테스트
3. 문서 최종 업데이트

**참고 문서**:
- `TODO_2025-10-14.md` - 내일 작업 체크리스트
- `/tmp/admin_pages_scan.md` - 초기 스캔 결과

---

**작업 종료**: 2025-10-14 오후
**작업자**: Claude Code + 사용자
**상태**: ✅ 완료 (62.5% 진행)
