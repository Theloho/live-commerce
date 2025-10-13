# 페이지-기능 매트릭스 PART2 (관리자 운영 페이지)

**⚠️ 이 파일은 전체 문서의 Part 2입니다**
- **PART1**: 사용자 페이지 (홈, 체크아웃, 주문, 마이페이지, 인증)
- **PART2**: 관리자 운영 페이지 (주문 관리, 입금, 발송, 발주, 쿠폰) ← **현재 파일**
- **PART3**: 관리자 시스템 페이지 (상품, 방송, 공급업체, 설정)

**업데이트**: 2025-10-14
**기준**: 실제 프로덕션 코드 (main 브랜치)
**버전**: 1.1
**변경사항**: 5개 관리자 페이지 Service Role API 전환 (모바일 RLS 문제 해결)

---

## 🛡️ 관리자 운영 페이지 목록

### 주문 운영 (5개)
1. `/admin` - 대시보드
2. `/admin/orders` - 주문 관리 (목록)
3. `/admin/orders/[id]` - 주문 상세
4. `/admin/deposits` - 입금 관리
5. `/admin/shipping` - 발송 관리

### 발주 시스템 (2개)
6. `/admin/purchase-orders` - 발주 관리
7. `/admin/purchase-orders/[supplierId]` - 업체별 발주

### 고객 관리 (2개)
8. `/admin/customers` - 고객 목록
9. `/admin/customers/[id]` - 고객 상세

### 쿠폰 관리 (3개)
10. `/admin/coupons` - 쿠폰 목록
11. `/admin/coupons/new` - 쿠폰 생성
12. `/admin/coupons/[id]` - 쿠폰 상세/배포

---

## 1. `/admin` - 대시보드

### 📋 주요 기능
1. ✅ 주문 통계 (일/월/전체)
2. ✅ 매출 통계 (일/월/전체)
3. ✅ 최근 주문 리스트 (최대 10개)
4. ✅ 시스템 알림 (선택적)
5. ✅ 빠른 액션 버튼 (주문 관리, 입금 확인, 발송 관리)

### 🔧 사용 컴포넌트
- 통계 카드 (커스텀)
- 최근 주문 테이블
- 빠른 액션 버튼

### 📞 호출 함수/API
- `getAllOrders()` - 전체 주문 조회
- 주문 통계 집계 (클라이언트 사이드)
- 매출 통계 집계 (클라이언트 사이드)

### 💾 사용 DB 테이블
- **SELECT**:
  - `orders` - 전체 주문 (통계용)
  - `order_items` - 주문 항목 (매출 계산)
  - `order_payments` - 결제 정보

### 🔗 연결된 페이지
- **다음**: `/admin/orders` (주문 관리)
- **다음**: `/admin/deposits` (입금 관리)
- **다음**: `/admin/shipping` (발송 관리)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 1.17 주문 통계 (PART1)

### 📝 체크리스트 (Claude용)
- [ ] 일/월/전체 통계 집계
- [ ] 매출 계산 (상품금액 + 배송비)
- [ ] 최근 주문 정렬 (created_at DESC)
- [ ] 통계 캐싱 (성능 최적화)

---

## 2. `/admin/orders` - 주문 관리 (목록)

### 📋 주요 기능
1. ✅ 전체 주문 목록 조회
2. ✅ 상태별 필터 (결제대기/계좌이체/카드결제/결제완료/발송완료)
3. ✅ 주문 검색 (주문번호, 고객명, 상품명, 입금자명)
4. ✅ 주문 상태 변경 (개별/일괄)
5. ✅ Excel 다운로드 (예정)
6. ✅ 배송비 계산 표시 (도서산간 포함)

### 🔧 사용 컴포넌트
- 주문 테이블 (커스텀)
- 상태 드롭다운
- 검색 필터
- 일괄 선택 체크박스

### 📞 호출 함수/API
- `getAllOrders()` - 전체 주문 조회
- `updateOrderStatus(orderId, status, paymentData)` - 개별 상태 변경
- `updateMultipleOrderStatus(orderIds, status, paymentData)` - 일괄 상태 변경
- `formatShippingInfo(baseShipping, postalCode)` - 배송비 계산

### 💾 사용 DB 테이블
- **SELECT**:
  - `orders` - 전체 주문
  - `order_items` - 주문 항목 (상품명)
  - `order_shipping` - 배송 정보 (postal_code)
  - `order_payments` - 결제 정보 (depositor_name)
  - `products` - 상품 정보 (title, thumbnail_url)
- **UPDATE**:
  - `orders` - 상태 변경 (status, 타임스탬프)
  - `order_payments` - 결제 정보 업데이트 (선택적)

### 🔗 연결된 페이지
- **다음**: `/admin/orders/[id]` (주문 상세)
- **다음**: `/admin/deposits` (입금 관리)
- **다음**: `/admin/shipping` (발송 관리)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 1.3 주문 조회 (관리자) (PART1)
- 1.5 주문 상태 변경 (PART1)
- 1.6 일괄 상태 변경 (PART1)
- 1.15 주문 검색 (PART1)
- 1.16 주문 필터링 (PART1)

### 📝 체크리스트 (Claude용)
- [ ] 관리자 권한 확인 (is_admin)
- [ ] 상태별 탭 필터링
- [ ] 검색 기능 (주문번호, 고객명, 상품명, 입금자명)
- [ ] 타임스탬프 자동 기록 (verifying_at, paid_at, delivered_at)
- [ ] 배송비 계산 (postal_code 기반)

---

## 3. `/admin/orders/[id]` - 주문 상세

### 📋 주요 기능
1. ✅ 주문 상세 정보 표시
2. ✅ 주문 아이템 목록
3. ✅ 배송 정보 (도서산간 배송비 포함)
4. ✅ 결제 정보 (입금자명 포함)
5. ✅ 주문 상태 변경 (드롭다운)
6. ✅ 쿠폰 할인 표시 (discount_amount)

### 🔧 사용 컴포넌트
- 주문 상세 카드
- 상태 변경 드롭다운
- 배송/결제 정보 테이블

### 📞 호출 함수/API
- `getOrderById(orderId)` - 주문 상세 조회
- `updateOrderStatus(orderId, status, paymentData)` - 상태 변경
- `OrderCalculations.calculateFinalOrderAmount()` - 금액 재계산
- `formatShippingInfo(baseShipping, postalCode)` - 배송비 계산

### 💾 사용 DB 테이블
- **SELECT**:
  - `orders` - 주문 정보 (discount_amount)
  - `order_items` - 주문 항목
  - `order_shipping` - 배송 정보 (postal_code)
  - `order_payments` - 결제 정보 (depositor_name)
  - `products` - 상품 정보
- **UPDATE**:
  - `orders` - 상태 변경

### 🔗 연결된 페이지
- **이전**: `/admin/orders` (주문 목록)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 1.4 주문 상세 조회 (PART1)
- 1.5 주문 상태 변경 (PART1)

### 📝 체크리스트 (Claude용)
- [ ] discount_amount 쿠폰 할인 표시
- [ ] 배송비 계산 (도서산간 포함)
- [ ] 입금자명 우선순위 (payment > depositName > shipping.name)
- [ ] 상태 전환 로그 (🕐, 💰, 🚚 이모지)

---

## 4. `/admin/deposits` - 입금 관리

### 📋 주요 기능
1. ✅ 입금 대기 주문 조회 (status='pending')
2. ✅ 엑셀 업로드 (은행 거래 내역)
3. ✅ 입금자명 매칭 (자동 + 수동)
4. ✅ 입금 확인 처리 (status='verifying' → 'paid')
5. ✅ 빠른 검색 (주문번호, 고객명, 입금자명)

### 🔧 사용 컴포넌트
- 입금 대기 주문 테이블
- 엑셀 업로드 버튼
- 입금자명 매칭 UI
- 검색 필터

### 📞 호출 함수/API
- ✅ **Service Role API** (2025-10-14 전환)
  - `GET /api/admin/orders?adminEmail={email}` - 전체 주문 조회
  - `useAdminAuth` hook - 관리자 인증 상태
- `updateOrderStatus(orderId, 'verifying')` - 입금 확인
- `updateOrderStatus(orderId, 'paid')` - 결제 확인
- XLSX.js - 엑셀 파싱

**보안 패턴**:
```javascript
const { adminUser } = useAdminAuth()
const response = await fetch(`/api/admin/orders?adminEmail=${adminUser.email}`)
// 서버: verifyAdminAuth(adminEmail) → supabaseAdmin (Service Role)
```

### 💾 사용 DB 테이블
- **SELECT**:
  - `orders` - 입금 대기 (status='pending')
  - `order_payments` - 결제 정보 (depositor_name)
  - `profiles` - 사용자 정보 (API에서 JOIN)
- **UPDATE**:
  - `orders` - 상태 변경 (verifying, paid)
  - `order_payments` - 결제 정보 업데이트

### 🔗 연결된 페이지
- **이전**: `/admin/orders` (주문 목록)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 1.12 입금 확인 (PART1)

### 🐛 알려진 이슈
- ✅ 모바일에서 데이터 표시 안 됨 해결 (2025-10-14 Service Role API 전환)
- ✅ depositName 필드 매핑 추가 (deposit_name, depositor_name, order_payments.depositor_name)

### 📝 체크리스트 (Claude용)
- [ ] adminEmail 파라미터로 Service Role API 호출
- [ ] status='pending' 또는 'verifying' 필터링
- [ ] 엑셀 파일 파싱 (XLSX.js)
- [ ] 입금자명 매칭 (depositName 다중 fallback)
- [ ] 금액 검증 (order.total_amount)
- [ ] 타임스탬프 기록 (verifying_at, paid_at)

---

## 5. `/admin/shipping` - 발송 관리

### 📋 주요 기능
1. ✅ 입금 완료 주문 조회 (status='paid')
2. ✅ 송장번호 입력 (개별/일괄)
3. ✅ 발송 완료 처리 (status='delivered')
4. ✅ 배송지 정보 표시

### 🔧 사용 컴포넌트
- 발송 대기 주문 테이블
- 송장번호 입력 필드
- 일괄 발송 버튼

### 📞 호출 함수/API
- ✅ **Service Role API** (2025-10-14 전환)
  - `GET /api/admin/orders?adminEmail={email}` - 전체 주문 조회
  - `useAdminAuth` hook - 관리자 인증 상태
- `updateOrderStatus(orderId, 'delivered', { tracking_number })` - 발송 처리

**보안 패턴**:
```javascript
const { adminUser } = useAdminAuth()
const response = await fetch(`/api/admin/orders?adminEmail=${adminUser.email}`)
// 서버: verifyAdminAuth(adminEmail) → supabaseAdmin (Service Role)
```

### 💾 사용 DB 테이블
- **SELECT**:
  - `orders` - 발송 대기 (status='paid', 'shipping', 'delivered')
  - `order_shipping` - 배송 정보 (name, phone, address)
  - `profiles` - 사용자 정보 (API에서 JOIN)
- **UPDATE**:
  - `orders` - 상태 변경 (delivered)
  - `order_shipping` - 송장번호 (tracking_number)

### 🔗 연결된 페이지
- **이전**: `/admin/orders` (주문 목록)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 1.13 배송 처리 (PART1)

### 🐛 알려진 이슈
- ✅ 모바일에서 데이터 표시 안 됨 해결 (2025-10-14 Service Role API 전환)
- ✅ 배송 정보 필드 매핑 추가 (shipping_*, order_shipping.* 우선순위 처리)

### 📝 체크리스트 (Claude용)
- [ ] adminEmail 파라미터로 Service Role API 호출
- [ ] status='paid', 'shipping', 'delivered' 필터링
- [ ] 송장번호 입력 (optional)
- [ ] 배송지 정보 확인 (name, phone, address, detail_address)
- [ ] 타임스탬프 기록 (delivered_at)
- [ ] 고객 알림 (이메일/SMS) (선택적)

---

## 6. `/admin/purchase-orders` - 발주 관리

### 📋 주요 기능
1. ✅ 입금 완료 주문 조회 (status='deposited')
2. ✅ 공급업체별 그룹핑 및 집계
3. ✅ 발주 대기 주문 표시 (완료된 발주 제외)
4. ✅ 발주서 Excel 다운로드
5. ✅ 중복 발주 방지 (purchase_order_batches)

### 🔧 사용 컴포넌트
- 공급업체별 발주 카드
- Excel 다운로드 버튼
- 발주 완료 플래그

### 📞 호출 함수/API
- ✅ **Service Role API** (2025-10-14 전환)
  - `GET /api/admin/purchase-orders?adminEmail={email}&showCompleted={bool}` - 발주 데이터 조회
  - `useAdminAuth` hook - 관리자 인증 상태
- XLSX.js - Excel 생성

**보안 패턴**:
```javascript
const { adminUser } = useAdminAuth()
const response = await fetch(
  `/api/admin/purchase-orders?adminEmail=${adminUser.email}&showCompleted=${showCompleted}`
)
const { orders, completedBatches } = await response.json()
// 서버: verifyAdminAuth(adminEmail) → supabaseAdmin (Service Role)
```

### 💾 사용 DB 테이블
- **SELECT**:
  - `orders` - 입금 완료 (status='deposited')
  - `order_items` - 주문 항목 (variant_id 포함)
  - `products` - 상품 정보 (supplier_id, purchase_price)
  - `suppliers` - 공급업체 정보 (name, code, contact_person)
  - `product_variants` - Variant 정보 (sku, option_values)
  - `purchase_order_batches` - 발주 완료 이력 (order_ids)
- **INSERT**:
  - `purchase_order_batches` - 발주 완료 기록 (Excel 다운로드 시) → API 사용

### 🔗 연결된 페이지
- **다음**: `/admin/purchase-orders/[supplierId]` (업체별 발주 상세)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 6.1 발주서 생성 (PART2)
- 6.4 업체별 주문 조회 (PART2)
- 6.6 중복 발주 방지 (PART2)

### 🐛 알려진 이슈
- ✅ 모바일에서 데이터 표시 안 됨 해결 (2025-10-14 Service Role API 전환)
- ✅ 복잡한 nested query도 Service Role API에서 정상 처리

### 📝 체크리스트 (Claude용)
- [ ] adminEmail 파라미터로 Service Role API 호출
- [ ] status='deposited' 필터링
- [ ] 공급업체별 그룹핑
- [ ] 완료된 발주 제외 (GIN 인덱스 활용)
- [ ] Excel 다운로드는 클라이언트에서 생성
- [ ] order_ids 배열 저장 (purchase_order_batches)

---

## 7. `/admin/purchase-orders/[supplierId]` - 업체별 발주

### 📋 주요 기능
1. ✅ 특정 공급업체 발주 내역
2. ✅ 상품별 수량 집계
3. ✅ 수량 조정 기능
4. ✅ 발주서 Excel 다운로드
5. ✅ 발주 완료 처리 (batch 생성)

### 🔧 사용 컴포넌트
- 발주 상품 테이블
- 수량 조정 입력
- Excel 다운로드 버튼

### 📞 호출 함수/API
- ✅ **Service Role API** (2025-10-14 전환)
  - `GET /api/admin/purchase-orders/{supplierId}?adminEmail={email}` - 업체별 발주 상세 조회
  - `POST /api/admin/purchase-orders/batch` - 발주 배치 생성
  - `useAdminAuth` hook - 관리자 인증 상태
- XLSX.js - Excel 생성

**보안 패턴**:
```javascript
const { adminUser } = useAdminAuth()

// 데이터 조회
const response = await fetch(
  `/api/admin/purchase-orders/${supplierId}?adminEmail=${adminUser.email}`
)
const { supplier, orders, completedBatches } = await response.json()

// 배치 생성 (Excel 다운로드 시)
const batchResponse = await fetch('/api/admin/purchase-orders/batch', {
  method: 'POST',
  body: JSON.stringify({
    adminEmail: adminUser.email,
    supplierId,
    orderIds,
    adjustedQuantities,
    totalItems,
    totalAmount
  })
})
// 서버: verifyAdminAuth(adminEmail) → supabaseAdmin (Service Role)
```

### 💾 사용 DB 테이블
- **SELECT**:
  - `orders` - 업체별 주문 (status='deposited')
  - `order_items` - 주문 항목 (variant_id 포함)
  - `products` - 상품 정보 (supplier_id)
  - `suppliers` - 공급업체 정보
  - `product_variants` - Variant 정보
  - `purchase_order_batches` - 완료된 발주 이력
- **INSERT**:
  - `purchase_order_batches` - 발주 완료 기록 (API 사용)

### 🔗 연결된 페이지
- **이전**: `/admin/purchase-orders` (발주 관리)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 6.2 발주서 다운로드 (PART2)

### 🐛 알려진 이슈
- ✅ 모바일에서 데이터 표시 안 됨 해결 (2025-10-14 Service Role API 전환)
- ✅ Excel 다운로드 후 batch 생성도 Service Role API로 전환

### 📝 체크리스트 (Claude용)
- [ ] adminEmail 파라미터로 Service Role API 호출
- [ ] 상품별 수량 집계
- [ ] 수량 조정 내역 저장 (adjusted_quantities)
- [ ] Excel 파일 생성 (발주서 형식) - 클라이언트
- [ ] batch 생성 API 호출 (order_ids, total_items, total_amount)

---

## 8. `/admin/customers` - 고객 목록

### 📋 주요 기능
1. ✅ 전체 고객 조회
2. ✅ 고객 검색 (이름, 전화번호, 이메일, 닉네임)
3. ✅ 주문 횟수 표시
4. ✅ 카카오/일반 사용자 구분
5. ✅ 고객별 총 구매 금액 (선택적)

### 🔧 사용 컴포넌트
- 고객 테이블
- 검색 필터

### 📞 호출 함수/API
- ✅ **Service Role API** (2025-10-14 전환)
  - `GET /api/admin/customers?adminEmail={email}` - 전체 고객 조회
  - `useAdminAuth` hook - 관리자 인증 상태

**보안 패턴**:
```javascript
const { adminUser } = useAdminAuth()
const response = await fetch(`/api/admin/customers?adminEmail=${adminUser.email}`)
const { customers: customersData } = await response.json()
// 서버: verifyAdminAuth(adminEmail) → supabaseAdmin (Service Role)
// API에서 주문 통계 집계 (orderCount, totalSpent) 포함
```

### 💾 사용 DB 테이블
- **SELECT**:
  - `profiles` - 고객 정보 (name, nickname, phone, email, kakao_id)
  - `orders` - 주문 횟수 + 총 구매 금액 집계
  - `order_payments` - 결제 금액 (amount)

**특이사항**: API에서 각 고객의 주문 통계를 병렬로 집계하여 반환

### 🔗 연결된 페이지
- **다음**: `/admin/customers/[id]` (고객 상세)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 4.8 고객 목록 조회 (PART2)
- 4.9 고객 검색 (PART2)

### 🐛 알려진 이슈
- ✅ 모바일에서 데이터 표시 안 됨 해결 (2025-10-14 Service Role API 전환)
- ✅ 카카오 사용자 주문 매칭 (order_type LIKE %KAKAO:{kakao_id}%)

### 📝 체크리스트 (Claude용)
- [ ] adminEmail 파라미터로 Service Role API 호출
- [ ] 카카오/일반 사용자 구분 (kakao_id 존재 여부)
- [ ] 주문 횟수 집계 (API에서 처리)
- [ ] 검색 필터 (이름, 전화번호, 이메일) - 클라이언트
- [ ] 총 구매 금액 계산 (API에서 처리)

---

## 9. `/admin/customers/[id]` - 고객 상세

### 📋 주요 기능
1. ✅ 고객 정보 표시
2. ✅ 전체 주문 내역
3. ✅ 주문 상태별 통계
4. ✅ 총 구매 금액 계산
5. ✅ 최근 주문 먼저 표시

### 🔧 사용 컴포넌트
- 고객 정보 카드
- 주문 이력 테이블
- 통계 카드

### 📞 호출 함수/API
- `getUserById(userId)` - 고객 정보 조회
- `getOrders(userId)` - 고객 주문 조회

### 💾 사용 DB 테이블
- **SELECT**:
  - `profiles` - 고객 정보
  - `orders` - 고객 주문
  - `order_items` - 주문 항목

### 🔗 연결된 페이지
- **이전**: `/admin/customers` (고객 목록)
- **다음**: `/admin/orders/[id]` (주문 상세)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 4.10 고객 주문 이력 (PART2)

### 📝 체크리스트 (Claude용)
- [ ] 전체 주문 이력 표시
- [ ] 상태별 주문 통계
- [ ] 총 구매 금액 계산
- [ ] 최근 주문 먼저 (created_at DESC)

---

## 10. `/admin/coupons` - 쿠폰 목록

### 📋 주요 기능
1. ✅ 전체 쿠폰 조회
2. ✅ 쿠폰 활성화/비활성화
3. ✅ 검색 (코드, 이름)
4. ✅ 필터 (상태, 타입)
5. ✅ 통계 (전체/활성/발급/사용)

### 🔧 사용 컴포넌트
- 쿠폰 테이블
- 검색 필터
- 통계 카드

### 📞 호출 함수/API
- `getCoupons(filters)` - 쿠폰 조회
- `toggleCouponStatus(couponId, isActive)` - 활성화 토글

### 💾 사용 DB 테이블
- **SELECT**:
  - `coupons` - 쿠폰 정보
  - `user_coupons` - 발급/사용 통계 (COUNT)
- **UPDATE**:
  - `coupons` - 활성화 상태 (is_active)

### 🔗 연결된 페이지
- **다음**: `/admin/coupons/new` (쿠폰 생성)
- **다음**: `/admin/coupons/[id]` (쿠폰 상세)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 8.6 쿠폰 목록 조회 (관리자) (PART3)
- 8.9 쿠폰 활성화/비활성화 (PART3)

### 📝 체크리스트 (Claude용)
- [ ] 검색 필터 (코드, 이름)
- [ ] 상태 필터 (전체/활성/비활성)
- [ ] 타입 필터 (전체/금액/퍼센트)
- [ ] 통계 집계 (발급 수, 사용 수)

---

## 11. `/admin/coupons/new` - 쿠폰 생성

### 📋 주요 기능
1. ✅ 쿠폰 정보 입력 (코드, 이름, 설명)
2. ✅ 할인 타입 선택 (fixed_amount, percentage)
3. ✅ 유효 기간 설정 (valid_from, valid_until)
4. ✅ 최소 주문 금액 설정
5. ✅ 최대 할인 금액 설정 (percentage 필수)
6. ✅ 사용 한도 설정 (전체, 사용자당)

### 🔧 사용 컴포넌트
- 쿠폰 생성 폼 (커스텀)
- 날짜 선택기

### 📞 호출 함수/API
- `createCoupon(couponData)` - 쿠폰 생성 (Service Role API)
- `POST /api/admin/coupons/create` - API Route

### 💾 사용 DB 테이블
- **INSERT**:
  - `coupons` - 쿠폰 정보

### 🔗 연결된 페이지
- **이전**: `/admin/coupons` (쿠폰 목록)
- **다음**: `/admin/coupons/[id]` (생성 완료 → 배포 페이지)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 8.1 쿠폰 발행 (PART3)

### 🐛 알려진 이슈
- ✅ RLS INSERT 정책 차단 해결 (2025-10-07 Service Role API 전환)

### 📝 체크리스트 (Claude용)
- [ ] 쿠폰 코드 영문+숫자만 허용
- [ ] percentage 타입은 max_discount_amount 필수
- [ ] valid_until > valid_from 검증
- [ ] discount_value > 0 검증
- [ ] Service Role API 호출 (RLS 우회)

---

## 12. `/admin/coupons/[id]` - 쿠폰 상세/배포

### 📋 주요 기능
1. ✅ 쿠폰 상세 정보 표시
2. ✅ 통계 (총 발급, 사용 완료, 사용률, 남은 수량)
3. ✅ 보유 고객 목록 (미사용/사용완료 탭)
4. ✅ 쿠폰 배포 (개별 선택/전체 발송)

### 🔧 사용 컴포넌트
- 쿠폰 정보 카드
- 통계 카드
- 고객 탭 (미사용/사용완료)
- 배포 버튼

### 📞 호출 함수/API
- `getCouponDetail(couponId)` - 쿠폰 상세
- `distributeCoupon(couponId, userIds)` - 개별 배포 (Service Role API)
- `distributeToAllCustomers(couponId)` - 전체 배포
- `getCouponStats(couponId)` - 통계 조회

### 💾 사용 DB 테이블
- **SELECT**:
  - `coupons` - 쿠폰 정보
  - `user_coupons` - 보유 고객 목록
  - `profiles` - 고객 정보 (JOIN)
- **INSERT**:
  - `user_coupons` - 쿠폰 배포 (UPSERT)

### 🔗 연결된 페이지
- **이전**: `/admin/coupons` (쿠폰 목록)
- **이전**: `/admin/coupons/new` (쿠폰 생성 완료)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 8.2 쿠폰 배포 (개별) (PART3)
- 8.3 쿠폰 배포 (전체) (PART3)
- 8.8 쿠폰 상세 조회 (PART3)
- 8.10 쿠폰 통계 조회 (PART3)

### 🐛 알려진 이슈
- ❌ 쿠폰 배포 403 에러 (2025-10-07 미해결)

### 📝 체크리스트 (Claude용)
- [ ] 통계 집계 (발급 수, 사용 수, 사용률)
- [ ] 중복 배포 방지 (UNIQUE 제약)
- [ ] Service Role API 호출 (RLS 우회)
- [ ] 배포 결과 피드백 (성공 X건, 중복 Y건)

---

## 📊 PART2 통계

### 페이지 수: 12개
- 주문 운영: 5개
- 발주 시스템: 2개
- 고객 관리: 2개
- 쿠폰 관리: 3개

### 주요 기능 영역
- 주문 상태 변경
- 입금 확인
- 발송 처리
- 발주서 생성
- 쿠폰 발행/배포
- 고객 관리

### 사용 DB 테이블
- `orders`, `order_items`, `order_shipping`, `order_payments`
- `products`, `suppliers`
- `purchase_order_batches`
- `coupons`, `user_coupons`
- `profiles`

---

**마지막 업데이트**: 2025-10-14
**상태**: 완료 (12개 페이지 상세 문서화, 5개 페이지 Service Role API 전환 반영)
**다음**: PART3 (관리자 시스템 페이지)
