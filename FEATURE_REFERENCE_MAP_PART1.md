# FEATURE_REFERENCE_MAP.md - Part 1 (주문 + 상품)

**⚠️ 이 파일은 전체 문서의 Part 1입니다**
- **Part 1**: 개요 + 주문 관련 + 상품 관련 ← **현재 파일**
- **Part 2**: Variant + 사용자 + 인증 + 공급업체
- **Part 3**: 배송 + 쿠폰 + 통계

**⚠️ 파일 크기 제한 주의:**
- **이 파일은 25,000 토큰을 초과하지 않아야 합니다** (Claude 읽기 제한)
- 내용 추가 시 파일 크기 확인 필수
- 25,000 토큰 근접 시 → **기능을 PART4로 분리**하고 인덱스 파일 업데이트

**목적**: 모든 기능의 영향도와 연관성을 한눈에 파악
**업데이트**: 2025-10-08
**기준**: 본서버 코드 (main 브랜치) - CODEBASE_STRUCTURE_REPORT.md 반영
**버전**: 2.0
**실제 코드베이스**: 128개 파일, 36개 페이지, 67개 API 엔드포인트

---

## 📖 사용 방법

### 개발자용
1. 기능 수정 전 해당 섹션 읽기
2. "영향받는 페이지" 모두 확인
3. "연관 기능" 테스트 필요
4. "필수 체크리스트" 완료

### Claude용
1. `/system-check` 실행 시 이 문서 참조
2. 수정 전 자동으로 영향도 분석
3. 체크리스트 기반 검증

---

## 🎯 기능 분류

### 1. 주문 관련 (20개 기능)
- 1.1 주문 생성 ⭐ [주요]
- 1.2 주문 조회 (사용자) [일반]
- 1.3 주문 조회 (관리자) [일반]
- 1.4 주문 상세 조회 [일반]
- 1.5 주문 상태 변경 ⭐ [주요]
- 1.6 일괄 상태 변경 ⭐ [주요]
- 1.7 주문 취소 ⭐ [주요]
- 1.8 환불 처리 [일반]
- 1.9 주문 아이템 수량 변경 [일반]
- 1.10 주문번호 생성 [일반]
- 1.11 그룹 주문번호 생성 [일반]
- 1.12 입금 확인 [일반]
- 1.13 배송 처리 [일반]
- 1.14 배송 완료 [일반]
- 1.15 주문 검색 [일반]
- 1.16 주문 필터링 [일반]
- 1.17 주문 통계 [일반]
- 1.18 주문 엑셀 다운로드 [일반]
- 1.19 일괄결제 처리 ⭐ [주요]
- 1.20 결제 수단 변경 [일반]

### 2. 상품 관련 (18개 기능)
- 2.1 상품 등록 ⭐ [주요]
- 2.2 상품 수정 ⭐ [주요]
- 2.3 상품 삭제 [일반]
- 2.4 상품 조회 (사용자) [일반]
- 2.5 상품 조회 (관리자) [일반]
- 2.6 상품 단일 조회 [일반]
- 2.7 상품 검색 [일반]
- 2.8 상품 필터링 [일반]
- 2.9 카테고리 관리 [일반]
- 2.10 상품 이미지 업로드 [일반]
- 2.11 상품 노출 설정 [일반]
- 2.12 상품 정렬 [일반]
- 2.13 라이브 상태 변경 [일반]
- 2.14 라이브 등록 [일반]
- 2.15 라이브 해제 [일반]
- 2.16 라이브 우선순위 변경 [일반]
- 2.17 상품 재고 관리 [일반]
- 2.18 옵션 포함 상품 생성 ⭐ [주요]

### 3. Variant/옵션 관련 (12개 기능)
- 3.1 Variant 생성 ⭐ [주요]
- 3.2 Variant 재고 관리 ⭐ [주요]
- 3.3 Variant 재고 확인 ⭐ [주요]
- 3.4 옵션 조합 생성 [일반]
- 3.5 SKU 자동 생성 [일반]
- 3.6 옵션별 가격 설정 [일반]
- 3.7 옵션별 재고 입력 [일반]
- 3.8 옵션 추가 [일반]
- 3.9 옵션 삭제 [일반]
- 3.10 옵션 값 수정 [일반]
- 3.11 옵션 조회 [일반]
- 3.12 옵션값 생성 [일반]

### 4. 사용자/프로필 관련 (10개 기능)
- 4.1 프로필 조회 [일반]
- 4.2 프로필 수정 ⭐ [주요]
- 4.3 프로필 정규화 ⭐ [주요]
- 4.4 프로필 유효성 검사 [일반]
- 4.5 주소 관리 ⭐ [주요]
- 4.6 우편번호 검색 [일반]
- 4.7 배송지 저장 [일반]
- 4.8 고객 목록 조회 [일반]
- 4.9 고객 검색 [일반]
- 4.10 고객 주문 이력 [일반]

### 5. 인증 관련 (6개 기능)
- 5.1 로그인 (일반) [일반]
- 5.2 로그인 (카카오) ⭐ [주요]
- 5.3 회원가입 [일반]
- 5.4 로그아웃 [일반]
- 5.5 비밀번호 재설정 [일반]
- 5.6 세션 관리 [일반]

### 6. 공급업체/발주 관련 (6개 기능)
- 6.1 발주서 생성 ⭐ [주요]
- 6.2 발주서 다운로드 [일반]
- 6.3 업체 관리 [일반]
- 6.4 업체별 주문 조회 [일반]
- 6.5 발주 이력 조회 [일반]
- 6.6 중복 발주 방지 [일반]

### 7. 배송 관련 (5개 기능)
- 7.1 배송비 계산 ⭐ [주요]
- 7.2 도서산간 배송비 추가 ⭐ [주요]
- 7.3 배송 상태 조회 [일반]
- 7.4 배송 추적 [일반]
- 7.5 배송 알림 [일반]

### 8. 쿠폰 관련 (10개 기능)
- 8.1 쿠폰 발행 ⭐ [주요]
- 8.2 쿠폰 배포 (개별) ⭐ [주요]
- 8.3 쿠폰 배포 (전체) ⭐ [주요]
- 8.4 쿠폰 유효성 검증 ⭐ [주요]
- 8.5 쿠폰 사용 처리 ⭐ [주요]
- 8.6 쿠폰 목록 조회 (관리자) [일반]
- 8.7 쿠폰 목록 조회 (사용자) [일반]
- 8.8 쿠폰 상세 조회 [일반]
- 8.9 쿠폰 활성화/비활성화 [일반]
- 8.10 쿠폰 통계 조회 [일반]

---

## 1. 주문 관련 기능

### 1.1 주문 생성 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/checkout` - 주문 생성 페이지
2. `/orders` - 주문 내역 (새 주문 표시)
3. `/orders/[id]/complete` - 주문 완료 페이지
4. `/admin/orders` - 관리자 주문 목록 (새 주문 알림)
5. `/admin/purchase-orders` - 발주 시스템 (입금확인 후)

#### 🔧 핵심 함수 체인
```javascript
createOrder(orderData, userProfile, depositName)
  ↓ validates
  checkVariantInventory(variantId, quantity)
  ↓ creates
  orders, order_items, order_shipping, order_payments (INSERT)
  ↓ updates
  product_variants.inventory (UPDATE - FOR UPDATE)
  ↓ triggers
  products.inventory 자동 업데이트 (DB trigger)
  ↓ sends (optional)
  sendOrderConfirmationEmail(orderId)
```

#### 🗄️ DB 작업 순서 (데드락 방지)
1. `product_variants` (FOR UPDATE) - 재고 잠금
2. `orders` (INSERT) - 주문 생성
3. `order_items` (INSERT) - 주문 항목 생성
4. `order_shipping` (INSERT) - 배송 정보 생성
5. `order_payments` (INSERT) - 결제 정보 생성
6. `product_variants` (UPDATE) - 재고 차감
7. `products` (자동 업데이트) - 트리거 실행

#### 📊 데이터 흐름
```
BuyBottomSheet (옵션 선택)
  ↓
checkVariantInventory() - 재고 확인
  ↓
updateVariantInventory() - 재고 차감 (FOR UPDATE)
  ↓
sessionStorage.setItem('checkoutItem')
  ↓
router.push('/checkout')
  ↓
사용자 프로필 및 주소 로드 (병렬)
  ↓
AddressManager - 배송지 선택
  ↓
입금자명 선택 모달
  ↓
createOrder() 호출
  ├── orders INSERT
  ├── order_items INSERT (title, price, total, variant_id)
  ├── order_shipping INSERT (postal_code 필수)
  └── order_payments INSERT (depositor_name)
  ↓
sessionStorage.setItem('recentOrder')
  ↓
router.replace(`/orders/${orderId}/complete`)
```

#### ⚠️ 필수 체크리스트
- [ ] Variant 재고 확인 (checkVariantInventory)
- [ ] FOR UPDATE 잠금 사용 (동시성 제어)
- [ ] order_items에 title, price, unit_price, total, total_price 모두 저장
- [ ] order_type에 카카오 ID 포함 (카카오 사용자 시: `direct:KAKAO:${kakao_id}`)
- [ ] depositor_name 저장 (우선순위: 직접입력 > 닉네임 > 고객명)
- [ ] postal_code 저장 및 배송비 계산 (formatShippingInfo)
- [ ] payment_group_id 저장 (일괄결제 시)
- [ ] 트랜잭션 사용 (실패 시 롤백)
- [ ] 재고 부족 시 에러 처리 및 사용자 알림
- [ ] 이메일 발송 (선택적)
- [ ] sessionStorage에 checkoutItem, recentOrder 저장

#### 🔗 연관 기능
- **Variant 재고 관리** (재고 차감)
- **배송비 계산** (도서산간 추가비)
- **발주 시스템** (입금확인 완료 주문)
- **이메일 발송** (주문 확인 메일)
- **프로필 관리** (사용자 정보 조회)
- **주소 관리** (배송지 선택)

#### 💡 특이사항
- **중복 컬럼**: price/unit_price, total/total_price 양쪽 모두 저장 필수
- **카카오 사용자**: user_id는 NULL, order_type에 kakao_id 저장
- **재고 차감 시점**: 주문 생성 전 (체크아웃 진입 시)
- **배송비 0원**: pending 상태에서는 배송비 미계산 (결제 확인 시 계산)

#### 📝 최근 수정 이력
- 2025-10-07: 장바구니 주문 생성 버그 수정 (supabase.raw() → 직접 쿼리로 변경, 커밋: 0c1d41a)
- 2025-10-03: 우편번호 시스템 통합 (배송비 자동 계산)
- 2025-10-02: 발주 시스템 연동
- 2025-10-01: Variant 시스템으로 전환

#### 🎓 상세 문서 위치
- **DB**: DB_REFERENCE_GUIDE.md § 6.1
- **데이터 흐름**: DETAILED_DATA_FLOW.md § 체크아웃 페이지
- **코드**: lib/supabaseApi.js - createOrder(), createOrderWithOptions()
- **페이지**: app/checkout/page.js

---

### 1.2 주문 조회 (사용자) [일반]

#### 📍 영향받는 페이지
1. `/orders` - 주문 내역 페이지
2. `/orders/[id]/complete` - 주문 상세 페이지
3. `/mypage` - 마이페이지 (최근 주문)

#### 🔧 핵심 함수 체인
```javascript
getUserOrders(userId)
  ↓ or (카카오 사용자)
getUserOrdersByOrderType(orderType)
  ↓ joins
  orders + order_items + products + order_shipping
  ↓ calculates
  formatShippingInfo(baseShipping, postalCode)
```

#### 🗄️ DB 작업 순서
1. `orders` (SELECT) - 사용자 주문 조회
2. `order_items` (SELECT) - 주문 항목 조회
3. `products` (SELECT) - 상품 정보 조회
4. `order_shipping` (SELECT) - 배송 정보 조회

#### ⚠️ 필수 체크리스트
- [ ] UserProfileManager 사용 (카카오/일반 사용자 구분)
- [ ] order_type으로 대체 조회 (카카오 사용자: `LIKE '%KAKAO:${kakao_id}%'`)
- [ ] payment_group_id 기준 그룹화 (일괄결제 주문)
- [ ] postal_code 기반 배송비 계산 (formatShippingInfo)
- [ ] 타임스탬프 표시 (created_at, deposited_at, shipped_at 등)
- [ ] 상태별 필터링 (pending/verifying/paid/delivered)

#### 🔗 연관 기능
- **사용자 인증** (카카오/일반 사용자 구분)
- **배송비 계산** (도서산간 추가비)
- **주문 상태 변경** (취소, 수량 조절)

#### 🎓 상세 문서 위치
- **DB**: DB_REFERENCE_GUIDE.md § 4.1
- **데이터 흐름**: DETAILED_DATA_FLOW.md § 주문 내역 페이지
- **코드**: lib/supabaseApi.js - getOrders()
- **페이지**: app/orders/page.js

---

### 1.3 주문 조회 (관리자) [일반]

#### 📍 영향받는 페이지
1. `/admin/orders` - 관리자 주문 목록
2. `/admin/orders/[id]` - 관리자 주문 상세

#### 🔧 핵심 함수
- `getAllOrders()` - 전체 주문 조회 (profiles JOIN)

#### 🗄️ DB 작업
- `orders`, `order_items`, `order_shipping`, `order_payments`, `profiles` JOIN

#### 🎓 상세 문서 위치
- **데이터 흐름**: DETAILED_DATA_FLOW.md § 관리자 주문 관리
- **코드**: lib/supabaseApi.js - getAllOrders()

---

### 1.4 주문 상세 조회 [일반]

#### 📍 영향받는 페이지
1. `/orders/[id]/complete` - 주문 완료 페이지
2. `/admin/orders/[id]` - 관리자 주문 상세

#### 🔧 핵심 함수
- `getOrderById(orderId)` - 주문 단일 조회

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getOrderById()

---

### 1.5 주문 상태 변경 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/admin/orders` - 관리자 주문 목록 (상태 변경 버튼)
2. `/admin/orders/[id]` - 관리자 주문 상세 (상태 변경 액션)
3. `/admin/deposits` - 입금 관리 (pending → verifying)
4. `/admin/shipping` - 발송 관리 (paid → delivered)

#### 🔧 핵심 함수 체인
```javascript
updateOrderStatus(orderId, status, paymentData)
  ↓ updates
  orders.status (UPDATE)
  ↓ records
  타임스탬프 자동 기록 (verifying_at, paid_at, delivered_at, cancelled_at)
  ↓ updates (optional)
  order_payments (UPDATE)
  ↓ logs
  logger.info() - 이모지 포함 로그
```

#### 🗄️ DB 작업 순서
1. `orders` (UPDATE) - status 변경
2. 타임스탬프 컬럼 자동 업데이트 (상태별)
3. `order_payments` (UPDATE - optional) - 결제 정보 업데이트

#### 📊 상태 전환 흐름
```
pending (결제대기)
  ↓ 입금 확인
verifying (결제확인중)
  ↓ 결제 확인
paid (결제완료)
  ↓ 발송 처리
delivered (발송완료)

또는

pending/verifying/paid
  ↓ 취소
cancelled (취소됨)
```

#### ⚠️ 필수 체크리스트
- [ ] 타임스탬프 자동 기록 확인
  - `pending → verifying`: verifying_at 기록
  - `verifying → paid`: paid_at 기록
  - `paid → delivered`: delivered_at 기록
  - `→ cancelled`: cancelled_at 기록
- [ ] 로그 확인 (🕐, 💰, 🚚 이모지)
- [ ] order_payments 업데이트 (optional)
- [ ] 발주 시스템 연동 (paid 상태 전환 시)
- [ ] 재고 복원 (cancelled 상태 전환 시)

#### 🔗 연관 기능
- **발주 시스템** (paid 상태 주문 자동 발주)
- **재고 복원** (주문 취소 시)
- **이메일 발송** (상태 변경 알림)
- **일괄 상태 변경** (그룹 주문)

#### 💡 특이사항
- **타임스탬프 추적**: 모든 상태 전환 시점 기록
- **로그 이모지**: 🕐(시간), 💰(결제), 🚚(배송), ✅(성공), ❌(실패)
- **발주 연동**: paid 상태로 전환 시 발주서 자동 생성 가능

#### 📝 최근 수정 이력
- 2025-10-02: 발주 시스템 연동 추가
- 2025-10-01: 타임스탬프 자동 기록 로직 개선

#### 🎓 상세 문서 위치
- **DB**: DB_REFERENCE_GUIDE.md § 3.2
- **코드**: lib/supabaseApi.js - updateOrderStatus()

---

### 1.6 일괄 상태 변경 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/admin/orders` - 관리자 주문 목록 (그룹 주문 상태 변경)

#### 🔧 핵심 함수 체인
```javascript
updateMultipleOrderStatus(orderIds, status, paymentData)
  ↓ loops
  orderIds.forEach(orderId => updateOrderStatus(orderId, status, paymentData))
  ↓ updates
  order_shipping (일괄 업데이트 - optional)
```

#### 🗄️ DB 작업 순서
1. `orders` (UPDATE) - 여러 주문 ID에 대해 순차 업데이트
2. `order_payments` (UPDATE - optional)
3. `order_shipping` (UPDATE - optional)

#### ⚠️ 필수 체크리스트
- [ ] orderIds 배열 검증
- [ ] 각 주문에 대해 updateOrderStatus 호출
- [ ] 실패한 주문 ID 추적 및 에러 처리
- [ ] 일괄 배송 정보 업데이트 (optional)
- [ ] 트랜잭션 사용 (전체 성공 또는 전체 롤백)

#### 🔗 연관 기능
- **주문 상태 변경** (개별 주문)
- **일괄결제 처리** (payment_group_id 주문들)
- **발주 시스템** (paid 상태 전환 시)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - updateMultipleOrderStatus()

---

### 1.7 주문 취소 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/orders` - 주문 내역 페이지 (취소 버튼)
2. `/admin/orders` - 관리자 주문 목록 (취소 버튼)
3. `/admin/orders/[id]` - 관리자 주문 상세 (취소 액션)

#### 🔧 핵심 함수 체인
```javascript
cancelOrder(orderId)
  ↓ updates
  orders.status = 'cancelled'
  orders.cancelled_at = NOW()
  ↓ restores (필요 시)
  product_variants.inventory (재고 복원)
  ↓ logs
  logger.info('주문 취소됨', orderId)
```

#### 🗄️ DB 작업 순서
1. `orders` (SELECT) - 주문 정보 조회
2. `order_items` (SELECT) - 주문 항목 조회
3. `product_variants` (UPDATE) - 재고 복원 (FOR UPDATE)
4. `orders` (UPDATE) - status='cancelled', cancelled_at 기록

#### ⚠️ 필수 체크리스트
- [ ] 취소 가능한 상태인지 확인 (pending, verifying만 취소 가능)
- [ ] 재고 복원 로직 실행 (updateVariantInventory)
- [ ] cancelled_at 타임스탬프 기록
- [ ] 트랜잭션 사용 (재고 복원 실패 시 롤백)
- [ ] 이메일 발송 (주문 취소 알림)
- [ ] 환불 처리 (결제 완료 후 취소 시)

#### 🔗 연관 기능
- **재고 복원** (Variant 재고 증가)
- **환불 처리** (결제 완료 후 취소)
- **이메일 발송** (취소 알림)
- **주문 상태 변경** (cancelled)

#### 💡 특이사항
- **재고 복원**: FOR UPDATE 잠금 사용 (동시성 제어)
- **취소 가능 상태**: pending, verifying만 취소 가능 (paid, delivered는 환불 처리)
- **타임스탬프**: cancelled_at 자동 기록

#### 📝 최근 수정 이력
- 2025-10-01: Variant 재고 복원 로직 추가

#### 🎓 상세 문서 위치
- **DB**: DB_REFERENCE_GUIDE.md § 6.2
- **코드**: lib/supabaseApi.js - cancelOrder()

---

### 1.8 환불 처리 [일반]

#### 📍 영향받는 페이지
1. `/admin/orders/[id]` - 관리자 주문 상세 (환불 처리 버튼)

#### 🔧 핵심 함수
- 현재 별도 함수 없음 (주문 취소 + 수동 환불 처리)

#### ⚠️ 필수 체크리스트
- [ ] 환불 가능 상태 확인 (paid, delivered)
- [ ] 환불 금액 계산 (상품금액 + 배송비)
- [ ] 재고 복원 여부 결정
- [ ] 환불 사유 기록
- [ ] 고객 알림 (이메일/SMS)

#### 💡 특이사항
- **미구현**: 현재 수동 환불 처리 (자동화 예정)
- **환불 방법**: 계좌이체 역입금

#### 🔗 연관 기능
- **주문 취소** (cancelled 상태 전환)
- **재고 복원** (선택적)

---

### 1.9 주문 아이템 수량 변경 ⭐ [주요] (2025-10-07 업데이트)

#### 📍 영향받는 페이지
1. `/orders` - 주문 내역 페이지 (수량 조절 버튼)

#### 🔧 핵심 함수 체인
```javascript
updateOrderItemQuantity(itemId, newQuantity)
  ↓ selects
  order_items (variant_id 포함) - 현재 수량 조회
  ↓ validates (2025-10-07 추가)
  variant 재고 확인 (variant_id가 있는 경우)
  ↓ calculates
  quantityDifference = newQuantity - currentQuantity
  ↓ updates (variant가 있는 경우)
  product_variants.inventory -= quantityDifference
  ↓ updates
  order_items.quantity, total, total_price
```

#### 🗄️ DB 작업 순서
1. `order_items` (SELECT) - 현재 수량 및 variant_id 조회
2. `product_variants` (SELECT) - Variant 재고 확인 (있는 경우)
3. `product_variants` (UPDATE) - 재고 차감 또는 복구
4. `order_items` (UPDATE) - quantity, total, total_price

#### ⚠️ 필수 체크리스트
- [ ] pending 상태에서만 수량 변경 가능
- [ ] **variant_id가 있으면 variant 재고 검증 필수** (2025-10-07 추가)
- [ ] 재고 부족 시 에러 처리 및 사용자 알림
- [ ] price 기준으로 total_price 재계산
- [ ] total, total_price 양쪽 모두 업데이트
- [ ] 옵티미스틱 업데이트 (UI 즉시 반영)
- [ ] 수량 1 미만 방지

#### 💡 특이사항
- **Variant 재고 검증**: variant_id가 있으면 재고 확인 후 수량 변경
- **재고 복구/차감**: 수량 감소 시 재고 복구, 수량 증가 시 재고 차감
- **옵티미스틱 업데이트**: UI 먼저 업데이트, 서버 동기화
- **총 금액 자동 재계산**: quantity × price

#### 📝 최근 수정 이력
- 2025-10-07: Variant 재고 검증 추가 (커밋: 0c1d41a)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - updateOrderItemQuantity() (lines 2416, 2465-2491)
- **페이지**: app/orders/page.js (lines 311-364)

---

### 1.10 주문번호 생성 [일반]

#### 📍 영향받는 페이지
1. `/checkout` - 체크아웃 페이지 (주문 생성 시)

#### 🔧 핵심 함수
```javascript
generateCustomerOrderNumber()
  ↓ returns
  'YYYYMMDD-XXXX' (날짜 + 랜덤 4자리)
```

#### ⚠️ 필수 체크리스트
- [ ] 날짜 형식: YYYYMMDD
- [ ] 랜덤 4자리: 0000~9999
- [ ] 중복 체크 (필요 시)

#### 💡 특이사항
- **형식**: `20251003-1234`
- **중복 가능성**: 매우 낮음 (날짜 + 랜덤)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - generateCustomerOrderNumber()

---

### 1.11 그룹 주문번호 생성 [일반]

#### 📍 영향받는 페이지
1. `/checkout` - 체크아웃 페이지 (일괄결제 시)

#### 🔧 핵심 함수
```javascript
generateGroupOrderNumber(paymentGroupId)
  ↓ returns
  'GROUP-{UUID}' 형식
```

#### ⚠️ 필수 체크리스트
- [ ] payment_group_id 기반 생성
- [ ] GROUP- 접두어 필수
- [ ] UUID 형식 유지

#### 🔗 연관 기능
- **일괄결제 처리** (payment_group_id)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - generateGroupOrderNumber()

---

### 1.12 입금 확인 [일반]

#### 📍 영향받는 페이지
1. `/admin/deposits` - 입금 관리 페이지
2. `/admin/orders` - 관리자 주문 목록

#### 🔧 핵심 함수 체인
```javascript
getAllOrders()
  ↓ filters
  payment.method='bank_transfer' && status IN ('pending', 'verifying')
  ↓ calls
  updateOrderStatus(orderId, 'verifying')
  ↓ or
  updateOrderStatus(orderId, 'paid')
```

#### 🗄️ DB 작업
- `orders` (SELECT) - 계좌이체 주문 조회
- `orders` (UPDATE) - status 변경 (pending → verifying → paid)

#### 📊 데이터 흐름
```
입금 관리 페이지
  ↓
계좌이체 주문 목록 조회
  ↓
엑셀 업로드 (은행 거래 내역)
  ↓
입금자명 매칭 (자동 + 수동)
  ↓
pending → verifying (입금 확인)
  ↓
verifying → paid (결제 확인)
```

#### ⚠️ 필수 체크리스트
- [ ] 엑셀 파일 파싱 (XLSX)
- [ ] 입금자명 매칭 (depositor_name)
- [ ] 금액 검증 (order.total_amount)
- [ ] 빠른 검색 기능 (주문번호/고객명/입금자명)
- [ ] 타임스탬프 기록 (verifying_at, paid_at)

#### 💡 특이사항
- **엑셀 업로드**: XLSX.js 사용
- **입금자명 우선순위**: payment.depositor_name > nickname > name
- **수동 검증**: 관리자가 최종 확인

#### 🎓 상세 문서 위치
- **페이지**: app/admin/deposits/page.js
- **데이터 흐름**: DETAILED_DATA_FLOW.md § 입금 관리

---

### 1.13 배송 처리 [일반]

#### 📍 영향받는 페이지
1. `/admin/shipping` - 발송 관리 페이지
2. `/admin/orders` - 관리자 주문 목록

#### 🔧 핵심 함수
```javascript
updateOrderStatus(orderId, 'delivered', { tracking_number })
  ↓ updates
  orders.status = 'delivered'
  orders.delivered_at = NOW()
  order_shipping.tracking_number
```

#### 🗄️ DB 작업
- `orders` (UPDATE) - status='delivered', delivered_at
- `order_shipping` (UPDATE) - tracking_number (optional)

#### 📊 데이터 흐름
```
발송 관리 페이지
  ↓
결제완료 주문 목록 (status='paid')
  ↓
송장번호 입력 (optional)
  ↓
일괄 발송 처리 또는 개별 발송
  ↓
paid → delivered
```

#### ⚠️ 필수 체크리스트
- [ ] paid 상태만 발송 가능
- [ ] 송장번호 입력 (optional)
- [ ] 배송지 정보 확인
- [ ] delivered_at 타임스탬프 기록
- [ ] 고객 알림 (이메일/SMS)

#### 💡 특이사항
- **송장번호**: 선택적 입력
- **일괄 처리**: 여러 주문 동시 발송 가능

#### 🎓 상세 문서 위치
- **페이지**: app/admin/shipping/page.js

---

### 1.14 배송 완료 [일반]

#### 📍 영향받는 페이지
1. `/admin/shipping` - 발송 관리 페이지
2. `/orders/[id]/complete` - 주문 상세 페이지

#### 🔧 핵심 함수
- updateOrderStatus(orderId, 'delivered')

#### 💡 특이사항
- **현재 시스템**: delivered 상태가 최종 상태
- **향후 확장**: 배송 완료(confirmed) 상태 추가 가능

#### 🔗 연관 기능
- **배송 처리** (1.13)

---

### 1.15 주문 검색 [일반]

#### 📍 영향받는 페이지
1. `/admin/orders` - 관리자 주문 목록
2. `/admin/deposits` - 입금 관리
3. `/admin/shipping` - 발송 관리

#### 🔧 핵심 기능
```javascript
// 검색 필터링
orders.filter(order =>
  order.customer_order_number.includes(searchTerm) ||
  order.user?.name.includes(searchTerm) ||
  order.order_items.some(item => item.title.includes(searchTerm)) ||
  order.payment?.depositor_name?.includes(searchTerm)
)
```

#### ⚠️ 필수 체크리스트
- [ ] 주문번호 검색
- [ ] 고객명 검색
- [ ] 상품명 검색
- [ ] 입금자명 검색 (계좌이체)
- [ ] 실시간 검색 (onChange)

#### 💡 특이사항
- **클라이언트 필터링**: 메모리 내 검색 (빠름)
- **대소문자 구분 없음**: toLowerCase() 사용

---

### 1.16 주문 필터링 [일반]

#### 📍 영향받는 페이지
1. `/admin/orders` - 관리자 주문 목록

#### 🔧 핵심 기능
```javascript
// 결제 방법별 탭 필터링
- 결제대기 (pending)
- 계좌이체 (bank_transfer + verifying)
- 카드결제 (card + verifying)
- 결제완료 (paid)
- 발송완료 (delivered)
```

#### ⚠️ 필수 체크리스트
- [ ] 상태별 필터 (status)
- [ ] 결제 방법별 필터 (payment.method)
- [ ] 날짜 범위 필터 (선택적)
- [ ] 복합 필터 지원

#### 💡 특이사항
- **탭 방식**: 상태 + 결제 방법 조합
- **실시간 업데이트**: 필터 변경 시 즉시 반영

---

### 1.17 주문 통계 [일반]

#### 📍 영향받는 페이지
1. `/admin` - 관리자 대시보드 (예정)

#### 💡 특이사항
- **미구현**: 현재 기본 통계만 표시
- **향후 기능**:
  - 일별/주별/월별 주문 통계
  - 매출 통계
  - 상품별 판매 통계
  - 결제 방법별 통계

---

### 1.18 주문 엑셀 다운로드 [일반]

#### 📍 영향받는 페이지
1. `/admin/orders` - 관리자 주문 목록 (예정)

#### 💡 특이사항
- **미구현**: 엑셀 다운로드 기능 예정
- **라이브러리**: XLSX.js 사용 예정
- **포함 정보**:
  - 주문번호, 주문일시
  - 고객명, 연락처, 주소
  - 상품명, 수량, 금액
  - 결제 방법, 입금자명
  - 배송 상태

---

### 1.19 일괄결제 처리 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/orders` - 주문 내역 페이지 (일괄결제 버튼)
2. `/checkout` - 체크아웃 페이지 (일괄결제 모드)

#### 🔧 핵심 함수 체인
```javascript
// 체크아웃 페이지에서
updateMultipleOrderStatus(orderIds, 'verifying', paymentData)
  ↓ updates
  각 주문의 status 변경
  payment_group_id 저장
  ↓ generates
  GROUP-${paymentGroupId} 주문번호
```

#### 📊 데이터 흐름
```
/orders 페이지
  ↓
결제대기 주문들의 총 금액 계산
  ├── 상품금액 합계
  └── 배송비 (4,000원 고정)
  ↓
일괄결제 버튼 클릭
  ↓
sessionStorage에 간소화된 데이터 저장
  {
    isBulkPayment: true,
    originalOrderIds: [...],
    items: [...],
    totalAmount,
    shippingFee
  }
  ↓
router.push('/checkout?mode=bulk')
  ↓
체크아웃 페이지
  ↓
updateMultipleOrderStatus(originalOrderIds, 'verifying', paymentData)
```

#### ⚠️ 필수 체크리스트
- [ ] sessionStorage 용량 제한 대응 (간소화된 데이터만 저장)
- [ ] payment_group_id 생성 및 저장
- [ ] 모든 주문의 상태 일괄 변경
- [ ] GROUP-${paymentGroupId} 형식 주문번호 생성
- [ ] 총 결제금액 정확성 검증
- [ ] 배송비 계산 (4,000원 고정 또는 도서산간 추가)
- [ ] 트랜잭션 사용 (전체 성공 또는 전체 롤백)

#### 🔗 연관 기능
- **주문 조회** (그룹 주문 표시)
- **일괄 상태 변경** (updateMultipleOrderStatus)
- **배송비 계산** (formatShippingInfo)
- **주문 상태 변경** (개별 주문)

#### 💡 특이사항
- **sessionStorage 용량**: 간소화된 데이터만 저장 (이미지 URL 제외)
- **payment_group_id**: UUID 생성 후 모든 주문에 저장
- **그룹 주문번호**: `GROUP-${paymentGroupId}` 형식
- **배송비**: 일괄결제 시 4,000원 고정 (향후 개선 필요)

#### 📝 최근 수정 이력
- 2025-10-01: sessionStorage 용량 문제 해결 (간소화된 데이터)
- 2025-09-30: 일괄결제 기능 추가

#### 🎓 상세 문서 위치
- **데이터 흐름**: DETAILED_DATA_FLOW.md § 주문 내역 페이지
- **코드**: lib/supabaseApi.js - updateMultipleOrderStatus(), generateGroupOrderNumber()
- **페이지**: app/orders/page.js, app/checkout/page.js

---

### 1.20 결제 수단 변경 [일반]

---

## 2. 상품 관련 기능

### 2.1 상품 등록 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/admin/products/new` - 신규 상품 등록 페이지
2. `/admin/products` - 상품 목록 (새 상품 표시)
3. `/` - 홈 페이지 (라이브 활성화 시)

#### 🔧 핵심 함수 체인
```javascript
addProduct(productData)
  ↓ inserts
  products (INSERT)
  ↓ inserts (옵션 있는 경우)
  product_options, product_option_values (INSERT)
  ↓ creates (옵션 있는 경우)
  product_variants (createVariant)
  ↓ maps
  variant_option_values (매핑 테이블 INSERT)
```

#### 🗄️ DB 작업 순서
1. `products` (INSERT) - 상품 기본 정보 생성
2. `product_options` (INSERT - optional) - 옵션 생성
3. `product_option_values` (INSERT - optional) - 옵션값 생성
4. `product_variants` (INSERT - optional) - Variant 생성
5. `variant_option_values` (INSERT - optional) - Variant-옵션값 매핑

#### ⚠️ 필수 체크리스트
- [ ] 필수 필드 검증 (title, price, description)
- [ ] 이미지 업로드 (Supabase Storage)
- [ ] 옵션 조합 생성 (옵션 있는 경우)
- [ ] Variant 자동 생성 (옵션 있는 경우)
- [ ] SKU 자동 생성 또는 수동 입력
- [ ] 초기 재고 설정
- [ ] 카테고리 연결
- [ ] 공급업체 연결
- [ ] 트랜잭션 사용 (전체 성공 또는 전체 롤백)

#### 🔗 연관 기능
- **Variant 생성** (옵션 있는 경우)
- **옵션 관리** (옵션 생성)
- **이미지 업로드** (Supabase Storage)
- **카테고리 관리** (카테고리 연결)
- **공급업체 관리** (공급업체 연결)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - addProduct(), createProductWithOptions()
- **페이지**: app/admin/products/new/page.js

---

### 2.2 상품 수정 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/admin/products/[id]` - 상품 상세 수정 페이지
2. `/admin/products` - 상품 목록 (수정된 상품 표시)

#### 🔧 핵심 함수 체인
```javascript
updateProduct(productId, productData)
  ↓ updates
  products (UPDATE)
  ↓ recreates (옵션 변경 시)
  product_options (DELETE → INSERT)
  product_option_values (DELETE → INSERT)
```

#### 🗄️ DB 작업 순서
1. `products` (UPDATE) - 상품 정보 수정
2. `product_options` (DELETE) - 기존 옵션 삭제
3. `product_options` (INSERT) - 새 옵션 생성
4. `product_option_values` (DELETE) - 기존 옵션값 삭제
5. `product_option_values` (INSERT) - 새 옵션값 생성

#### ⚠️ 필수 체크리스트
- [ ] 옵션 변경 시 기존 Variant 처리 (삭제 또는 비활성화)
- [ ] 재고 변경 시 Variant 재고 동기화
- [ ] 이미지 변경 시 기존 이미지 삭제 (Supabase Storage)
- [ ] 가격 변경 시 Variant 가격 동기화 (optional)
- [ ] 트랜잭션 사용

#### 🔗 연관 기능
- **Variant 관리** (옵션 변경 시 Variant 재생성)
- **이미지 업로드** (이미지 변경)
- **재고 관리** (재고 동기화)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - updateProduct()

---

### 2.3 상품 삭제 [일반]

#### 📍 영향받는 페이지
1. `/admin/products` - 관리자 상품 목록
2. `/admin/products/[id]` - 관리자 상품 상세

#### 🔧 핵심 함수
```javascript
deleteProduct(productId)
  ↓ updates (soft delete)
  products.status = 'deleted'
```

#### 🗄️ DB 작업
- `products` (UPDATE) - status='deleted' (soft delete)

#### ⚠️ 필수 체크리스트
- [ ] Soft delete 사용 (복구 가능)
- [ ] 관련 주문 확인 (삭제 가능 여부)
- [ ] Variant도 함께 비활성화
- [ ] 라이브에서 자동 제거

#### 💡 특이사항
- **Soft Delete**: 실제 삭제 대신 status='deleted'
- **복구 가능**: deleted 상태에서 active로 변경 가능

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - deleteProduct()

---

### 2.4 상품 조회 (사용자) [일반]

#### 📍 영향받는 페이지
1. `/` - 홈 페이지

#### 🔧 핵심 함수
```javascript
getProducts(filters)
  ↓ filters
  status='active' AND is_live=true AND is_live_active=true
  ↓ joins
  product_variants (병렬 로드)
```

#### 🗄️ DB 작업
- `products` (SELECT) - 활성 + 라이브 노출 상품
- `product_variants` (SELECT) - 각 상품의 Variant

#### ⚠️ 필수 체크리스트
- [ ] 활성 상품만 표시 (status='active')
- [ ] 라이브 활성화 상품만 (is_live_active=true)
- [ ] Variant 정보 병렬 로드
- [ ] 총 재고 계산 (모든 Variant 합계)
- [ ] 옵션 정보 추출

#### 💡 특이사항
- **실시간 업데이트**: useRealtimeProducts hook 사용
- **병렬 로딩**: 모든 상품의 Variant 동시 로드

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getProducts()
- **Hook**: hooks/useRealtimeProducts.js

---

### 2.5 상품 조회 (관리자) [일반]

#### 📍 영향받는 페이지
1. `/admin/products` - 관리자 상품 목록
2. `/admin/products/catalog` - 상품 카탈로그

#### 🔧 핵심 함수
```javascript
getAllProducts(filters)
  ↓ filters
  status='active' (또는 전체)
  ↓ joins
  suppliers, product_variants
```

#### 🗄️ DB 작업
- `products` (SELECT) - 모든 상품
- `suppliers` (JOIN) - 공급업체 정보
- `product_variants` (SELECT) - Variant 정보

#### ⚠️ 필수 체크리스트
- [ ] 모든 상태 표시 (active, inactive, deleted)
- [ ] 공급업체 정보 표시
- [ ] Variant 재고 합계 표시
- [ ] 라이브 상태 표시
- [ ] 검색/필터 기능

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getAllProducts()

---

### 2.6 상품 단일 조회 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/[id]` - 관리자 상품 상세
2. 상품 상세 모달 (BuyBottomSheet)

#### 🔧 핵심 함수
```javascript
getProductById(productId)
  ↓ selects
  products (단일 조회)
  ↓ calls
  getProductVariants(productId)
```

#### 🗄️ DB 작업
- `products` (SELECT) - 단일 상품
- `product_variants` (SELECT) - 모든 Variant

#### ⚠️ 필수 체크리스트
- [ ] Variant 정보 포함
- [ ] 옵션 정보 추출
- [ ] 총 재고 계산
- [ ] NULL 체크 (상품 없음 처리)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getProductById()

---

### 2.7 상품 검색 [일반]

#### 📍 영향받는 페이지
1. `/admin/products` - 관리자 상품 목록

#### 🔧 핵심 기능
```javascript
// 검색 쿼리
products
  .select()
  .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
  .eq('status', 'active')
```

#### ⚠️ 필수 체크리스트
- [ ] 제목 검색 (ilike - 대소문자 구분 없음)
- [ ] 설명 검색
- [ ] 판매자 검색 (seller)
- [ ] 실시간 검색

#### 💡 특이사항
- **Supabase 검색**: ilike 연산자 사용
- **OR 조건**: 여러 필드 동시 검색

---

### 2.8 상품 필터링 [일반]

#### 📍 영향받는 페이지
1. `/admin/products` - 관리자 상품 목록

#### 🔧 핵심 기능
```javascript
// 필터 옵션
- 공급업체별 (supplier_id)
- 카테고리별 (category)
- 상태별 (status)
- 라이브 여부 (is_live, is_live_active)
```

#### ⚠️ 필수 체크리스트
- [ ] 공급업체 필터
- [ ] 카테고리 필터
- [ ] 상태 필터 (active/inactive/deleted)
- [ ] 라이브 상태 필터
- [ ] 복합 필터 지원

#### 💡 특이사항
- **클라이언트 필터링**: 메모리 내 필터링 사용
- **서버 필터링**: Supabase 쿼리 필터 조합 가능

---

### 2.9 카테고리 관리 [일반]

#### 📍 영향받는 페이지
1. `/admin/categories` - 카테고리 관리 페이지

#### 🗄️ DB 작업
- `categories` (SELECT, INSERT, UPDATE, DELETE)

#### ⚠️ 필수 체크리스트
- [ ] 카테고리 생성/수정/삭제
- [ ] 계층 구조 지원 (parent_id)
- [ ] slug 자동 생성
- [ ] 상품 개수 표시

#### 💡 특이사항
- **계층 구조**: parent_id로 트리 구조 지원
- **slug**: URL-friendly 카테고리 식별자

#### 🎓 상세 문서 위치
- **페이지**: app/admin/categories/page.js

---

### 2.10 상품 이미지 업로드 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/new` - 신규 상품 등록
2. `/admin/products/[id]` - 상품 수정

#### 🔧 핵심 기능
```javascript
// Supabase Storage 업로드
supabase.storage
  .from('products')
  .upload(path, file)
  ↓
저장된 URL을 products.thumbnail_url에 저장
```

#### ⚠️ 필수 체크리스트
- [ ] Supabase Storage 사용
- [ ] 이미지 크기 제한 (2MB 권장)
- [ ] 파일 형식 검증 (jpg, png, webp)
- [ ] 미리보기 표시
- [ ] 기존 이미지 삭제 (수정 시)

#### 💡 특이사항
- **Storage**: products 버킷 사용
- **Public URL**: 자동 생성된 URL 저장

---

### 2.11 상품 노출 설정 [일반]

#### 📍 영향받는 페이지
1. `/admin/products` - 관리자 상품 목록

#### 🔧 핵심 함수
```javascript
updateProductLiveStatus(productId, isLiveActive)
  ↓ updates
  products.is_live_active = true/false
```

#### 🗄️ DB 작업
- `products` (UPDATE) - is_live_active

#### ⚠️ 필수 체크리스트
- [ ] is_live와 is_live_active 구분
- [ ] 토글 버튼 UI
- [ ] 즉시 반영 (홈 페이지)

#### 💡 특이사항
- **is_live**: 라이브 목록 등록 여부
- **is_live_active**: 사용자 노출 활성화 여부
- **조합**: is_live=true AND is_live_active=true → 홈 페이지 표시

---

### 2.12 상품 정렬 [일반]

#### 📍 영향받는 페이지
1. `/` - 홈 페이지
2. `/admin/products` - 관리자 상품 목록

#### 🔧 핵심 기능
```javascript
// 정렬 옵션
- 최신순 (created_at DESC) - 기본
- 가격 낮은 순 (price ASC)
- 가격 높은 순 (price DESC)
- 재고 많은 순 (inventory DESC)
```

#### ⚠️ 필수 체크리스트
- [ ] created_at 기준 정렬
- [ ] price 기준 정렬
- [ ] inventory 기준 정렬
- [ ] 정렬 버튼 UI

---

### 2.13 라이브 상태 변경 [일반]

#### 📍 영향받는 페이지
1. `/admin/broadcasts` - 라이브 방송 관리
2. `/admin/products` - 관리자 상품 목록

#### 🔧 핵심 함수
```javascript
updateProductLiveStatus(productId, isLive)
  ↓ updates
  products.is_live = true/false
```

#### 🗄️ DB 작업
- `products` (UPDATE) - is_live

#### ⚠️ 필수 체크리스트
- [ ] is_live 토글
- [ ] 라이브 목록 자동 업데이트
- [ ] 우선순위 설정 (live_priority)

#### 🔗 연관 기능
- **라이브 등록** (2.14)
- **라이브 해제** (2.15)

---

### 2.14 라이브 등록 [일반]

#### 📍 영향받는 페이지
1. `/admin/broadcasts` - 라이브 방송 관리

#### 🔧 핵심 함수
```javascript
addToLive(productId, priority)
  ↓ updates
  products.is_live = true
  products.live_priority = priority
```

#### 🗄️ DB 작업
- `products` (UPDATE) - is_live, live_priority

#### ⚠️ 필수 체크리스트
- [ ] 우선순위 설정 (낮은 숫자 = 높은 우선순위)
- [ ] 중복 등록 방지
- [ ] 라이브 목록 자동 갱신

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - addToLive()

---

### 2.15 라이브 해제 [일반]

#### 📍 영향받는 페이지
1. `/admin/broadcasts` - 라이브 방송 관리

#### 🔧 핵심 함수
```javascript
removeFromLive(productId)
  ↓ updates
  products.is_live = false
  products.is_live_active = false
```

#### 🗄️ DB 작업
- `products` (UPDATE) - is_live, is_live_active

#### ⚠️ 필수 체크리스트
- [ ] is_live, is_live_active 모두 false
- [ ] 홈 페이지에서 즉시 제거
- [ ] live_priority 초기화

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - removeFromLive()

---

### 2.16 라이브 우선순위 변경 [일반]

#### 📍 영향받는 페이지
1. `/admin/broadcasts` - 라이브 방송 관리

#### 🔧 핵심 함수
```javascript
updateLivePriority(productId, priority)
  ↓ updates
  products.live_priority = priority
```

#### 🗄️ DB 작업
- `products` (UPDATE) - live_priority

#### ⚠️ 필수 체크리스트
- [ ] 우선순위 숫자 (1, 2, 3, ...)
- [ ] 정렬 반영 (낮은 숫자 우선)
- [ ] 드래그 앤 드롭 UI (선택적)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - updateLivePriority()

---

### 2.17 상품 재고 관리 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/[id]` - 관리자 상품 상세

#### 🔧 핵심 함수
```javascript
updateProductInventory(productId, quantityChange)
  ↓ updates
  products.inventory (Variant 없는 경우)
```

#### 🗄️ DB 작업
- `products` (UPDATE) - inventory

#### ⚠️ 필수 체크리스트
- [ ] Variant 있으면 Variant 재고 사용
- [ ] Variant 없으면 products.inventory 사용
- [ ] 음수 재고 방지
- [ ] 재고 변경 로그

#### 💡 특이사항
- **Variant 시스템**: Variant가 있으면 products.inventory 무시
- **레거시 지원**: Variant 없는 상품은 products.inventory 사용

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - updateProductInventory()

---

### 2.18 옵션 포함 상품 생성 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/admin/products/new` - 신규 상품 등록 페이지

#### 🔧 핵심 함수 체인
```javascript
createProductWithOptions(productData, optionsData)
  ↓ creates
  addProduct(productData)
  ↓ creates
  product_options, product_option_values
  ↓ generates
  옵션 조합 배열 (색상 x 사이즈 = Variants)
  ↓ creates
  product_variants (각 조합마다)
  ↓ maps
  variant_option_values (Variant-옵션값 매핑)
```

#### 🗄️ DB 작업 순서
1. `products` (INSERT)
2. `product_options` (INSERT) - 여러 옵션
3. `product_option_values` (INSERT) - 각 옵션의 값들
4. `product_variants` (INSERT) - 모든 옵션 조합
5. `variant_option_values` (INSERT) - 매핑 테이블

#### 📊 옵션 조합 예시
```javascript
// 옵션: 색상(블랙, 화이트), 사이즈(S, M, L)
옵션 조합 = [
  { 색상: 블랙, 사이즈: S },
  { 색상: 블랙, 사이즈: M },
  { 색상: 블랙, 사이즈: L },
  { 색상: 화이트, 사이즈: S },
  { 색상: 화이트, 사이즈: M },
  { 색상: 화이트, 사이즈: L },
]
// 총 6개 Variant 생성
```

#### ⚠️ 필수 체크리스트
- [ ] 옵션 조합 자동 생성
- [ ] 각 Variant에 SKU 할당
- [ ] 초기 재고 설정 (Variant별)
- [ ] 가격 설정 (Variant별 또는 상품 기본가)
- [ ] 트랜잭션 사용 (전체 성공 또는 전체 롤백)
- [ ] 옵션 순서 관리 (position)

#### 🔗 연관 기능
- **상품 등록** (addProduct)
- **Variant 생성** (createVariant)
- **옵션 관리** (옵션 생성)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - createProductWithOptions()

---

