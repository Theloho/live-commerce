# FEATURE_REFERENCE_MAP.md

**목적**: 모든 기능의 영향도와 연관성을 한눈에 파악
**업데이트**: 2025-10-03
**기준**: 본서버 코드 (main 브랜치)
**버전**: 1.0 (초안)

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

### 1.9 주문 아이템 수량 변경 [일반]

#### 📍 영향받는 페이지
1. `/orders` - 주문 내역 페이지 (수량 조절 버튼)

#### 🔧 핵심 함수
```javascript
updateOrderItemQuantity(itemId, quantity)
  ↓ updates
  order_items.quantity, total_price
```

#### 🗄️ DB 작업
- `order_items` (UPDATE) - quantity, total, total_price

#### ⚠️ 필수 체크리스트
- [ ] pending 상태에서만 수량 변경 가능
- [ ] price 기준으로 total_price 재계산
- [ ] total, total_price 양쪽 모두 업데이트
- [ ] 옵티미스틱 업데이트 (UI 즉시 반영)
- [ ] 수량 1 미만 방지

#### 💡 특이사항
- **옵티미스틱 업데이트**: UI 먼저 업데이트, 서버 동기화
- **총 금액 자동 재계산**: quantity × price

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - updateOrderItemQuantity()

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

## 3. Variant/옵션 관련 기능

### 3.1 Variant 생성 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/admin/products/[id]` - 상품 상세 페이지 (Variant 관리)
2. `/admin/products/new` - 신규 상품 등록 (옵션 있는 경우)

#### 🔧 핵심 함수 체인
```javascript
createVariant(variantData, optionValueIds)
  ↓ inserts
  product_variants (INSERT)
  ↓ maps
  variant_option_values (INSERT - 매핑 테이블)
  ↓ returns
  생성된 Variant 객체
```

#### 🗄️ DB 작업 순서
1. `product_variants` (INSERT)
   - product_id, sku, inventory, price, is_active, options (JSONB)
2. `variant_option_values` (INSERT)
   - variant_id, option_value_id (여러 행)

#### 📊 Variant 데이터 구조
```javascript
{
  id: UUID,
  product_id: UUID,
  sku: 'PROD-BLK-M',
  inventory: 100,
  price: 29000,
  is_active: true,
  options: {
    색상: '블랙',
    사이즈: 'M'
  }
}
```

#### ⚠️ 필수 체크리스트
- [ ] SKU 자동 생성 또는 수동 입력 (중복 체크)
- [ ] 초기 재고 설정
- [ ] 가격 설정 (상품 기본가 또는 개별 가격)
- [ ] is_active 기본값 true
- [ ] options JSONB 형식 저장
- [ ] optionValueIds 배열로 매핑 테이블 저장
- [ ] 트랜잭션 사용

#### 🔗 연관 기능
- **옵션 포함 상품 생성** (createProductWithOptions)
- **Variant 재고 관리** (updateVariantInventory)
- **주문 생성** (재고 차감)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - createVariant()

---

### 3.2 Variant 재고 관리 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/checkout` - 체크아웃 페이지 (재고 차감)
2. `/admin/products/[id]` - 상품 상세 페이지 (재고 수정)
3. `/admin/orders` - 관리자 주문 관리 (취소 시 재고 복원)

#### 🔧 핵심 함수 체인
```javascript
updateVariantInventory(variantId, quantityChange)
  ↓ locks
  FOR UPDATE 잠금 (동시성 제어)
  ↓ selects
  SELECT inventory WHERE id = variantId FOR UPDATE
  ↓ validates
  재고 부족 체크 (newInventory < 0)
  ↓ updates
  UPDATE inventory = newInventory
  ↓ commits
  트랜잭션 커밋 (잠금 해제)
```

#### 🗄️ DB 작업 순서
1. `BEGIN TRANSACTION`
2. `SELECT inventory FROM product_variants WHERE id = variantId FOR UPDATE`
3. 재고 부족 체크
4. `UPDATE product_variants SET inventory = newInventory WHERE id = variantId`
5. `COMMIT` (또는 `ROLLBACK`)

#### ⚠️ 필수 체크리스트
- [ ] FOR UPDATE 잠금 사용 (데드락 방지)
- [ ] 재고 부족 시 에러 처리 및 사용자 알림
- [ ] 음수 재고 방지
- [ ] 트랜잭션 사용 (실패 시 롤백)
- [ ] 로그 기록 (재고 변경 이력)

#### 🔗 연관 기능
- **주문 생성** (재고 차감: quantityChange = -quantity)
- **주문 취소** (재고 복원: quantityChange = +quantity)
- **Variant 생성** (초기 재고 설정)

#### 💡 특이사항
- **FOR UPDATE 잠금**: 동시에 여러 사용자가 같은 Variant 주문 시 데이터 정합성 보장
- **재고 부족 시**: 주문 생성 차단, 사용자에게 알림
- **음수 재고 방지**: newInventory < 0 체크

#### 📝 최근 수정 이력
- 2025-10-01: FOR UPDATE 잠금 추가 (동시성 제어)
- 2025-09-30: 재고 부족 에러 처리 개선

#### 🎓 상세 문서 위치
- **DB**: DB_REFERENCE_GUIDE.md § 5.1
- **코드**: lib/supabaseApi.js - updateVariantInventory()

---

### 3.3 Variant 재고 확인 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/checkout` - 체크아웃 페이지 (주문 생성 전)
2. `/` - 홈 페이지 (상품 상세 모달 - BuyBottomSheet)

#### 🔧 핵심 함수 체인
```javascript
checkVariantInventory(productId, selectedOptions)
  ↓ finds
  Variant 검색 (옵션 조합 일치)
  ↓ selects
  SELECT inventory FROM product_variants
  ↓ returns
  { available: true/false, inventory: number, variantId: UUID }
```

#### 🗄️ DB 작업
1. `product_variants` (SELECT)
2. `variant_option_values` (JOIN)
3. `product_option_values` (JOIN)
4. 옵션 조합 일치 Variant 검색

#### 📊 데이터 흐름
```
사용자 옵션 선택
  ↓
selectedOptions = { 색상: '블랙', 사이즈: 'M' }
  ↓
checkVariantInventory(productId, selectedOptions)
  ↓
Variant 검색 (옵션 조합 일치)
  ↓
재고 확인
  ↓
반환: { available: true, inventory: 50, variantId: UUID }
```

#### ⚠️ 필수 체크리스트
- [ ] 옵션 조합 정확히 일치하는 Variant 검색
- [ ] 재고 0 이하면 available: false
- [ ] Variant 없으면 available: false
- [ ] is_active: false인 Variant 제외

#### 🔗 연관 기능
- **주문 생성** (재고 확인 후 차감)
- **Variant 재고 관리** (재고 정보 조회)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - checkVariantInventory(), checkOptionInventory()

---

### 3.4 옵션 조합 생성 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/new` - 신규 상품 등록
2. `/admin/products/[id]` - 상품 수정

#### 🔧 핵심 기능
```javascript
// 옵션 조합 생성
generateVariantCombinations(options)
  예: 색상[블랙, 화이트] x 사이즈[S, M, L]
  → 6개 조합 생성
```

#### ⚠️ 필수 체크리스트
- [ ] 데카르트 곱 알고리즘 사용
- [ ] 최대 옵션 개수 제한 (3개 권장)
- [ ] 조합 수 미리 계산 및 표시
- [ ] 각 조합마다 Variant 생성

#### 💡 특이사항
- **조합 폭발**: 옵션값 많으면 조합 수 급증 주의
- **예시**: 3개 옵션 x 5개 값 = 125개 Variant

---

### 3.5 SKU 자동 생성 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/new` - 신규 상품 등록

#### 🔧 핵심 기능
```javascript
// SKU 생성 규칙
SKU = 상품코드-옵션1-옵션2...
예: PROD-BLK-M, PROD-WHT-L
```

#### ⚠️ 필수 체크리스트
- [ ] 고유성 보장
- [ ] 옵션값 약어 사용
- [ ] 중복 체크
- [ ] 수동 입력 허용

#### 💡 특이사항
- **자동 생성**: 기본 규칙 적용
- **수동 입력**: 관리자가 직접 입력 가능

---

### 3.6 옵션별 가격 설정 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/new` - 신규 상품 등록
2. `/admin/products/[id]` - 상품 수정

#### 🔧 핵심 기능
- Variant별 개별 가격 설정
- 또는 상품 기본 가격 사용

#### 🗄️ DB 작업
- `product_variants` (UPDATE) - price

#### ⚠️ 필수 체크리스트
- [ ] 기본 가격 상속 (선택적)
- [ ] Variant별 개별 가격 입력
- [ ] 가격 0 방지

#### 💡 특이사항
- **기본 가격**: products.price 상속
- **개별 가격**: variant.price 우선 사용

---

### 3.7 옵션별 재고 입력 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/new` - 신규 상품 등록
2. `/admin/products/[id]` - 상품 수정

#### 🗄️ DB 작업
- `product_variants` (UPDATE) - inventory

#### ⚠️ 필수 체크리스트
- [ ] 각 Variant별 재고 입력
- [ ] 일괄 재고 설정 기능
- [ ] 총 재고 자동 계산
- [ ] 음수 재고 방지

---

### 3.8 옵션 추가 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/[id]` - 상품 수정

#### 🔧 핵심 함수
- createProductOption(optionData)

#### 🗄️ DB 작업
- `product_options` (INSERT)
- `product_option_values` (INSERT)

#### ⚠️ 필수 체크리스트
- [ ] 옵션명 중복 방지
- [ ] 옵션값 최소 1개
- [ ] 기존 Variant 처리 (재생성 필요)

#### 💡 특이사항
- **Variant 재생성**: 옵션 추가 시 기존 Variant 무효화

---

### 3.9 옵션 삭제 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/[id]` - 상품 수정

#### 🗄️ DB 작업
- `product_options` (DELETE)
- `product_option_values` (CASCADE DELETE)
- `variant_option_values` (CASCADE DELETE)

#### ⚠️ 필수 체크리스트
- [ ] 옵션 삭제 경고 (Variant 영향)
- [ ] CASCADE 삭제 확인
- [ ] 관련 Variant 비활성화

#### 💡 특이사항
- **CASCADE**: 옵션 삭제 시 관련 데이터 자동 삭제

---

### 3.10 옵션 값 수정 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/[id]` - 상품 수정

#### 🗄️ DB 작업
- `product_option_values` (UPDATE)

#### ⚠️ 필수 체크리스트
- [ ] 옵션값 변경 시 Variant 업데이트
- [ ] 기존 주문 영향 없음 확인
- [ ] 옵션값 중복 방지

---

### 3.11 옵션 조회 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/[id]` - 관리자 상품 상세
2. `/` - 홈 페이지 (상품 상세 모달)

#### 🔧 핵심 함수
- getProductOptions(productId)

#### 🗄️ DB 작업
- `product_options` (SELECT)
- `product_option_values` (SELECT)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getProductOptions()

---

### 3.12 옵션값 생성 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/new` - 신규 상품 등록

#### 🔧 핵심 함수
- createOptionValue(valueData)

#### 🗄️ DB 작업
- `product_option_values` (INSERT)

#### ⚠️ 필수 체크리스트
- [ ] option_id 필수
- [ ] value 중복 체크 (동일 옵션 내)
- [ ] position 자동 설정

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - createOptionValue()

---

## 4. 사용자/프로필 관련 기능

### 4.1 프로필 조회 [일반]

#### 📍 영향받는 페이지
1. `/mypage` - 마이페이지
2. `/checkout` - 체크아웃 페이지
3. `/admin/customers/[id]` - 관리자 고객 상세

#### 🔧 핵심 함수
```javascript
UserProfileManager.getCurrentUser()
  ↓ checks
  sessionStorage.getItem('user')
  ↓ or
  supabase.auth.getUser()
  ↓ normalizes
  UserProfileManager.normalizeProfile(user)
```

#### 🗄️ DB 작업
- `profiles` (SELECT)
- `auth.users` (SELECT via Supabase Auth)

#### ⚠️ 필수 체크리스트
- [ ] sessionStorage 우선 확인 (카카오 사용자)
- [ ] DB 조회 (일반 사용자)
- [ ] 프로필 정규화 (normalizeProfile)
- [ ] NULL 처리

#### 💡 특이사항
- **카카오 사용자**: sessionStorage 우선
- **일반 사용자**: DB 우선
- **정규화**: 두 방식 모두 동일한 형식으로 반환

#### 🎓 상세 문서 위치
- **코드**: lib/userProfileManager.js - getCurrentUser()

---

### 4.2 프로필 수정 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/mypage` - 마이페이지 (프로필 수정)
2. `/checkout` - 체크아웃 페이지 (주소 선택)

#### 🔧 핵심 함수 체인
```javascript
UserProfileManager.atomicProfileUpdate(userId, profileData, isKakaoUser)
  ↓ updates (병렬)
  Promise.allSettled([
    profiles UPSERT,
    auth.users.user_metadata UPDATE
  ])
  ↓ updates (카카오 사용자만)
  sessionStorage.setItem('user', updatedData)
  ↓ returns
  업데이트된 프로필
```

#### 🗄️ DB 작업 순서
1. `profiles` (UPSERT)
   - name, phone, nickname, address, detail_address, postal_code, addresses (JSONB)
2. `auth.users.user_metadata` (UPDATE - RPC)
   - 관리자 페이지에서 사용자 정보 표시용

#### 📊 데이터 흐름
```
마이페이지 필드 수정
  ↓
atomicProfileUpdate(userId, { name: '홍길동' }, isKakaoUser)
  ↓
병렬 업데이트
  ├── profiles UPSERT
  └── auth.users.user_metadata UPDATE
  ↓
카카오 사용자인 경우
  └── sessionStorage 업데이트
  ↓
UI 상태 업데이트
```

#### ⚠️ 필수 체크리스트
- [ ] profiles 테이블 UPSERT (존재하지 않으면 INSERT)
- [ ] auth.users.user_metadata 동기화 (관리자 페이지용)
- [ ] sessionStorage 업데이트 (카카오 사용자만)
- [ ] Promise.allSettled 사용 (병렬 처리, 일부 실패 허용)
- [ ] 에러 처리 (profiles 실패 시 재시도, user_metadata 실패 시 무시)

#### 🔗 연관 기능
- **프로필 정규화** (normalizeProfile)
- **프로필 유효성 검사** (validateProfile)
- **주소 관리** (addresses JSONB 업데이트)

#### 💡 특이사항
- **병렬 처리**: profiles + auth.users 동시 업데이트 (성능 최적화)
- **카카오 사용자**: sessionStorage 우선 사용 (auth.users 없음)
- **일반 사용자**: DB 우선 사용 (auth.users 있음)

#### 📝 최근 수정 이력
- 2025-10-03: 우편번호 저장 추가 (postal_code)
- 2025-10-01: atomicProfileUpdate 병렬 처리 개선

#### 🎓 상세 문서 위치
- **코드**: lib/userProfileManager.js - UserProfileManager.atomicProfileUpdate()
- **페이지**: app/mypage/page.js

---

### 4.3 프로필 정규화 ⭐ [주요]

#### 📍 영향받는 페이지
1. 모든 페이지 (사용자 정보 조회 시)

#### 🔧 핵심 함수
```javascript
UserProfileManager.normalizeProfile(user)
  ↓ returns
  {
    id, kakao_id, is_kakao,
    name, phone, nickname,
    address, detail_address, postal_code,
    addresses: []  // 자동 생성
  }
```

#### 💡 특이사항
- **카카오/일반 사용자 통합**: 동일한 형식으로 반환
- **addresses 배열**: 없으면 빈 배열 자동 생성
- **is_kakao 플래그**: 카카오 사용자 여부 판별

#### 🔗 연관 기능
- **프로필 조회** (모든 페이지)
- **주문 생성** (배송 정보)

#### 🎓 상세 문서 위치
- **코드**: lib/userProfileManager.js - UserProfileManager.normalizeProfile()

---

### 4.4 프로필 유효성 검사 [일반]

#### 📍 영향받는 페이지
1. `/mypage` - 마이페이지
2. `/checkout` - 체크아웃 페이지

#### 🔧 핵심 함수
```javascript
UserProfileManager.validateProfile(profile)
  ↓ checks
  필수 필드: name, phone, address
  ↓ returns
  { isValid: boolean, missingFields: [...] }
```

#### ⚠️ 필수 체크리스트
- [ ] 필수 필드 검증 (name, phone, address)
- [ ] 전화번호 형식 검증
- [ ] 이메일 형식 검증 (선택적)
- [ ] 우편번호 형식 검증

#### 💡 특이사항
- **선택적 필드**: nickname, detail_address
- **필수 필드**: name, phone, address (주문 시)

#### 🎓 상세 문서 위치
- **코드**: lib/userProfileManager.js - validateProfile()

---

### 4.5 주소 관리 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/mypage` - 마이페이지 (주소 관리)
2. `/checkout` - 체크아웃 페이지 (주소 선택)

#### 🔧 핵심 컴포넌트
- **AddressManager** - 주소 관리 컴포넌트

#### 📊 주소 데이터 구조
```javascript
addresses: [
  {
    id: Date.now(),
    label: '기본 배송지',
    address: '서울시 강남구...',
    detail_address: '101동 202호',
    postal_code: '06000',
    is_default: true,
    created_at: '2025-10-03T...'
  }
]
```

#### ⚠️ 필수 체크리스트
- [ ] 최대 5개 배송지 제한
- [ ] 기본 배송지 설정 (is_default: true)
- [ ] 우편번호 필수 (도서산간 배송비 계산용)
- [ ] 다음 주소 API 사용 (우편번호 검색)
- [ ] profiles.addresses JSONB 업데이트
- [ ] 배송비 자동 계산 (formatShippingInfo)

#### 🔗 연관 기능
- **프로필 수정** (addresses JSONB 업데이트)
- **배송비 계산** (postal_code 기반)
- **주문 생성** (배송지 선택)

#### 💡 특이사항
- **최대 5개**: 배송지 개수 제한
- **is_default**: 하나만 true (나머지 false)
- **postal_code**: 도서산간 배송비 계산 필수

#### 📝 최근 수정 이력
- 2025-10-04: AddressManager 마이그레이션 로직 완전 수정 (postal_code 포함, 빈 배열 체크, 즉시 DB 저장)
- 2025-10-03: 우편번호 시스템 통합 (배송비 자동 계산)
- 2025-10-01: AddressManager 컴포넌트 신버전 전환

#### 🎓 상세 문서 위치
- **컴포넌트**: app/components/address/AddressManager.js
- **데이터 흐름**: DETAILED_DATA_FLOW.md § 마이페이지

---

### 4.6 우편번호 검색 [일반]

#### 📍 영향받는 페이지
1. `/mypage` - 마이페이지 (AddressManager)
2. `/checkout` - 체크아웃 페이지 (AddressManager)

#### 🔧 핵심 기능
```javascript
// Daum 우편번호 서비스 사용
new daum.Postcode({
  oncomplete: function(data) {
    // data.zonecode (우편번호)
    // data.address (주소)
  }
})
```

#### ⚠️ 필수 체크리스트
- [ ] Daum Postcode API 로드
- [ ] 팝업 또는 embed 방식
- [ ] 우편번호, 주소 자동 입력
- [ ] 모바일 대응

#### 💡 특이사항
- **Daum API**: 무료 우편번호 검색 서비스
- **반환값**: zonecode (우편번호), address (기본 주소)

---

### 4.7 배송지 저장 [일반]

#### 📍 영향받는 페이지
1. `/mypage` - 마이페이지 (AddressManager)

#### 🔧 핵심 기능
- AddressManager 컴포넌트 사용
- profiles.addresses JSONB 배열 저장

#### 🗄️ DB 작업
- `profiles` (UPDATE) - addresses JSONB

#### ⚠️ 필수 체크리스트
- [ ] 최대 5개 배송지 제한
- [ ] 기본 배송지 설정 (is_default)
- [ ] 우편번호 필수 (도서산간 배송비)
- [ ] JSONB 배열 형식

#### 🔗 연관 기능
- **주소 관리** (4.5)
- **우편번호 검색** (4.6)

---

### 4.8 고객 목록 조회 [일반]

#### 📍 영향받는 페이지
1. `/admin/customers` - 고객 관리 페이지

#### 🔧 핵심 함수
- getAllCustomers()

#### 🗄️ DB 작업
- `profiles` (SELECT)
- `auth.users` (JOIN - optional)

#### ⚠️ 필수 체크리스트
- [ ] 모든 고객 조회
- [ ] 카카오/일반 사용자 구분
- [ ] 주문 횟수 표시 (optional)
- [ ] 검색/필터 기능

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getAllCustomers()
- **페이지**: app/admin/customers/page.js

---

### 4.9 고객 검색 [일반]

#### 📍 영향받는 페이지
1. `/admin/customers` - 고객 관리 페이지
2. `/admin/deposits` - 입금 관리 (입금자명 검색)

#### 🔧 핵심 기능
```javascript
// 검색 필드
- name (고객명)
- phone (전화번호)
- nickname (닉네임)
- email (이메일)
```

#### ⚠️ 필수 체크리스트
- [ ] 여러 필드 동시 검색
- [ ] 실시간 검색
- [ ] 대소문자 구분 없음

---

### 4.10 고객 주문 이력 [일반]

#### 📍 영향받는 페이지
1. `/admin/customers/[id]` - 고객 상세 페이지

#### 🔧 핵심 함수
```javascript
getOrders(userId)
  ↓ or (카카오 사용자)
getUserOrdersByOrderType(orderType)
```

#### 🗄️ DB 작업
- `orders` (SELECT) - 고객별 주문 조회
- `order_items`, `order_shipping`, `order_payments` (JOIN)

#### ⚠️ 필수 체크리스트
- [ ] 전체 주문 이력 표시
- [ ] 주문 상태별 통계
- [ ] 총 구매 금액 계산
- [ ] 최근 주문 먼저

---

## 5. 인증 관련 기능

### 5.1 로그인 (일반) [일반]

#### 📍 영향받는 페이지
1. `/login` - 로그인 페이지

#### 🔧 핵심 함수
```javascript
signIn(email, password)
  ↓ calls
  supabase.auth.signInWithPassword({ email, password })
  ↓ creates session
  supabase.auth.session
```

#### 🗄️ DB 작업
- `auth.users` (SELECT via Supabase Auth)
- `profiles` (SELECT)

#### ⚠️ 필수 체크리스트
- [ ] 이메일/비밀번호 검증
- [ ] 세션 생성
- [ ] 로그인 실패 처리
- [ ] 리다이렉트 (홈 또는 이전 페이지)

#### 💡 특이사항
- **Supabase Auth**: 내장 인증 시스템 사용
- **세션 관리**: 자동 토큰 갱신

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - signIn()
- **페이지**: app/login/page.js

---

### 5.2 로그인 (카카오) ⭐ [주요]

#### 📍 영향받는 페이지
1. `/login` - 로그인 페이지 (카카오 로그인 버튼)
2. `/auth/callback` - 카카오 OAuth 콜백

#### 📊 데이터 흐름
```
카카오 로그인 버튼 클릭
  ↓
카카오 OAuth 인증
  ↓
/auth/callback 리다이렉트
  ↓
카카오 사용자 정보 조회
  ↓
profiles 테이블 확인 (kakao_id)
  ├── 없으면 INSERT
  └── 있으면 SELECT
  ↓
sessionStorage.setItem('user', {
  kakao_id,
  name,
  nickname,
  phone,
  ...
})
  ↓
홈 페이지 리다이렉트
```

#### ⚠️ 필수 체크리스트
- [ ] profiles 테이블에 kakao_id 저장
- [ ] user_id는 NULL (auth.users 없음)
- [ ] sessionStorage에 사용자 정보 저장
- [ ] is_kakao 플래그 설정
- [ ] 주문 조회 시 order_type 사용

#### 🔗 연관 기능
- **프로필 관리** (sessionStorage 기반)
- **주문 조회** (order_type LIKE '%KAKAO:${kakao_id}%')
- **프로필 수정** (atomicProfileUpdate)

#### 💡 특이사항
- **user_id NULL**: auth.users 테이블에 존재하지 않음
- **sessionStorage**: 카카오 사용자 정보 저장 (로그인 상태 유지)
- **order_type**: `direct:KAKAO:${kakao_id}` 형식으로 저장

#### 🎓 상세 문서 위치
- **DB**: DB_REFERENCE_GUIDE.md § 4.2
- **페이지**: app/login/page.js, app/auth/callback/page.js

---

### 5.3 회원가입 [일반]

#### 📍 영향받는 페이지
1. `/signup` - 회원가입 페이지

#### 🔧 핵심 함수
```javascript
signUp(email, password, userData)
  ↓ calls
  supabase.auth.signUp({ email, password })
  ↓ creates
  auth.users (자동 생성)
  ↓ inserts
  profiles (INSERT)
```

#### 🗄️ DB 작업
- `auth.users` (INSERT via Supabase Auth)
- `profiles` (INSERT)

#### ⚠️ 필수 체크리스트
- [ ] 이메일 중복 체크
- [ ] 비밀번호 강도 검증
- [ ] 이메일 인증 발송 (optional)
- [ ] profiles 테이블 자동 생성
- [ ] 가입 완료 후 자동 로그인

#### 💡 특이사항
- **이메일 인증**: Supabase 설정에 따라 선택적
- **자동 프로필 생성**: auth.users 생성 시 trigger로 profiles INSERT

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - signUp()
- **페이지**: app/signup/page.js

---

### 5.4 로그아웃 [일반]

#### 📍 영향받는 페이지
1. 모든 페이지 (헤더 - 로그아웃 버튼)

#### 🔧 핵심 함수
```javascript
signOut()
  ↓ calls
  supabase.auth.signOut()
  ↓ clears
  sessionStorage.clear()
  ↓ redirects
  router.push('/')
```

#### ⚠️ 필수 체크리스트
- [ ] Supabase Auth 세션 종료
- [ ] sessionStorage 클리어
- [ ] 홈 페이지로 리다이렉트
- [ ] UI 상태 업데이트

#### 💡 특이사항
- **세션 클리어**: 카카오 사용자도 sessionStorage 클리어 필수

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - signOut()

---

### 5.5 비밀번호 재설정 [일반]

#### 📍 영향받는 페이지
1. `/login` - 로그인 페이지 (비밀번호 찾기 링크)
2. `/reset-password` - 비밀번호 재설정 페이지 (예정)

#### 🔧 핵심 기능
```javascript
// 비밀번호 재설정 이메일 발송
supabase.auth.resetPasswordForEmail(email)
  ↓
이메일로 재설정 링크 발송
  ↓
/reset-password?token=xxx
  ↓
새 비밀번호 입력 및 업데이트
```

#### ⚠️ 필수 체크리스트
- [ ] 이메일 발송
- [ ] 토큰 검증
- [ ] 새 비밀번호 강도 검증
- [ ] 비밀번호 업데이트

#### 💡 특이사항
- **미구현**: 현재 기본 페이지만 존재 (기능 예정)
- **Supabase Auth**: 내장 비밀번호 재설정 기능 사용

---

### 5.6 세션 관리 [일반]

#### 📍 영향받는 페이지
1. 모든 페이지 (useAuth hook)

#### 🔧 핵심 기능
```javascript
// useAuth hook
const { user, loading } = useAuth()
  ↓ checks
  supabase.auth.getSession()
  ↓ listens
  supabase.auth.onAuthStateChange()
```

#### ⚠️ 필수 체크리스트
- [ ] 세션 자동 확인
- [ ] 세션 만료 시 자동 로그아웃
- [ ] 토큰 자동 갱신
- [ ] 상태 변경 리스너

#### 💡 특이사항
- **자동 갱신**: Supabase Auth 자동 토큰 갱신
- **상태 동기화**: 모든 탭 간 세션 동기화

#### 🎓 상세 문서 위치
- **Hook**: hooks/useAuth.js

---

## 6. 공급업체/발주 관련 기능

### 6.1 발주서 생성 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/admin/purchase-orders` - 발주 관리 페이지
2. `/admin/purchase-orders/[supplierId]` - 공급업체별 발주 상세

#### 📊 데이터 흐름
```
관리자 → 발주 관리 페이지
  ↓
결제완료 주문 조회 (status='paid')
  ↓
공급업체별 그룹화
  ↓
발주서 생성 버튼 클릭
  ↓
getPurchaseOrderBySupplier(supplierId, startDate, endDate)
  ↓
주문 항목 집계 (상품별)
  ↓
엑셀 다운로드 (발주서)
```

#### ⚠️ 필수 체크리스트
- [ ] paid 상태 주문만 포함
- [ ] 공급업체별 그룹화
- [ ] 상품별 수량 집계
- [ ] 중복 발주 방지
- [ ] 발주 이력 기록

#### 🔗 연관 기능
- **주문 상태 변경** (paid 상태 전환 시)
- **공급업체 관리** (공급업체 정보)
- **상품 관리** (상품 정보)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getPurchaseOrderBySupplier()

---

### 6.2 발주서 다운로드 [일반]

#### 📍 영향받는 페이지
1. `/admin/purchase-orders` - 발주 관리 페이지
2. `/admin/purchase-orders/[supplierId]` - 공급업체별 발주 상세

#### 🔧 핵심 기능
```javascript
// 엑셀 다운로드
XLSX.utils.book_new()
  ↓ creates
  워크시트 생성 (상품별 수량 집계)
  ↓ downloads
  발주서_{공급업체명}_{날짜}.xlsx
```

#### ⚠️ 필수 체크리스트
- [ ] XLSX.js 라이브러리 사용
- [ ] 상품별 수량 집계
- [ ] 공급업체 정보 포함
- [ ] 날짜 범위 표시
- [ ] 파일명 자동 생성

#### 💡 특이사항
- **엑셀 형식**: 공급업체에게 전송 가능한 표준 형식
- **포함 정보**: 상품명, 수량, 단가, 총액

---

### 6.3 업체 관리 [일반]

#### 📍 영향받는 페이지
1. `/admin/suppliers` - 공급업체 관리 페이지

#### 🔧 핵심 함수
```javascript
getSuppliers() - 목록 조회
createSupplier(supplierData) - 생성
updateSupplier(supplierId, supplierData) - 수정
```

#### 🗄️ DB 작업
- `suppliers` (SELECT, INSERT, UPDATE)

#### ⚠️ 필수 체크리스트
- [ ] 업체명, 연락처, 주소
- [ ] 담당자 정보
- [ ] 업체 코드 (code) 고유성
- [ ] is_active 상태 관리
- [ ] 메모 기능

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getSuppliers(), createSupplier(), updateSupplier()
- **페이지**: app/admin/suppliers/page.js

---

### 6.4 업체별 주문 조회 [일반]

#### 📍 영향받는 페이지
1. `/admin/purchase-orders/[supplierId]` - 공급업체별 발주 상세

#### 🔧 핵심 함수
```javascript
getPurchaseOrderBySupplier(supplierId, startDate, endDate)
  ↓ filters
  orders (status='paid')
  ↓ filters
  products.supplier_id = supplierId
  ↓ aggregates
  상품별 수량 집계
```

#### 🗄️ DB 작업
- `orders` (SELECT) - paid 상태
- `order_items` (SELECT) - JOIN
- `products` (SELECT) - supplier_id 필터

#### ⚠️ 필수 체크리스트
- [ ] 결제완료 주문만 (status='paid')
- [ ] 날짜 범위 필터
- [ ] 상품별 수량 집계
- [ ] 총 발주 금액 계산

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getPurchaseOrderBySupplier()

---

### 6.5 발주 이력 조회 [일반]

#### 📍 영향받는 페이지
1. `/admin/purchase-orders` - 발주 관리 페이지

#### 🔧 핵심 함수
- getPurchaseOrdersBySupplier(startDate, endDate)

#### 🗄️ DB 작업
- `orders` (SELECT) - paid 상태
- 공급업체별 그룹화

#### ⚠️ 필수 체크리스트
- [ ] 전체 발주 이력 표시
- [ ] 공급업체별 그룹화
- [ ] 날짜 범위 필터
- [ ] 발주 상태 (생성/다운로드/완료)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getPurchaseOrdersBySupplier()

---

### 6.6 중복 발주 방지 [일반]

#### 📍 영향받는 페이지
1. `/admin/purchase-orders` - 발주 관리 페이지

#### 🔧 핵심 기능
- 날짜 범위 내 발주 여부 확인
- 이미 발주된 주문 표시

#### ⚠️ 필수 체크리스트
- [ ] 발주 완료 플래그 (is_purchased)
- [ ] 발주 날짜 기록 (purchased_at)
- [ ] 중복 발주 경고 UI
- [ ] 강제 재발주 옵션

#### 💡 특이사항
- **현재 구현**: 클라이언트 필터링
- **향후 개선**: DB 플래그 추가 (is_purchased)

---

## 7. 배송 관련 기능

### 7.1 배송비 계산 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/checkout` - 체크아웃 페이지
2. `/orders/[id]/complete` - 주문 완료 페이지
3. `/admin/orders` - 관리자 주문 목록
4. `/admin/orders/[id]` - 관리자 주문 상세

#### 🔧 핵심 함수 체인
```javascript
formatShippingInfo(baseShipping, postalCode)
  ↓ calls
  calculateShippingSurcharge(postalCode)
  ↓ returns
  {
    baseShipping: 4000,
    surcharge: 3000,  // 제주
    totalShipping: 7000,
    isRemote: true,
    region: '제주'
  }
```

#### 📊 도서산간 배송비 규칙
```javascript
제주: 63000-63644 → +3,000원
울릉도: 40200-40240 → +5,000원
기타 도서산간 → +5,000원
```

#### ⚠️ 필수 체크리스트
- [ ] postal_code 필수 (profiles, order_shipping)
- [ ] 기본 배송비 4,000원
- [ ] 도서산간 추가비 자동 계산
- [ ] pending 상태에서는 배송비 0원
- [ ] DB 저장값과 계산값 비교 (관리자 페이지)

#### 🔗 연관 기능
- **도서산간 배송비 추가** (calculateShippingSurcharge)
- **주소 관리** (postal_code 저장)
- **주문 생성** (배송비 계산 후 저장)

#### 💡 특이사항
- **우편번호 필수**: postal_code 없으면 기본 배송비만 적용
- **pending 상태**: 배송비 0원 (아직 결제 전)
- **DB 저장값 우선**: order_shipping에 저장된 배송비 우선 사용

#### 📝 최근 수정 이력
- 2025-10-03: 우편번호 시스템 완전 통합 (모든 페이지 적용)
- 2025-10-02: 도서산간 배송비 규칙 추가

#### 🎓 상세 문서 위치
- **코드**: lib/shippingUtils.js - formatShippingInfo(), calculateShippingSurcharge()
- **데이터 흐름**: DETAILED_DATA_FLOW.md § 체크아웃 페이지

---

### 7.2 도서산간 배송비 추가 ⭐ [주요]

#### 🔧 핵심 함수
```javascript
calculateShippingSurcharge(postalCode)
  ↓ validates
  우편번호 형식 확인
  ↓ checks
  도서산간 지역 매칭
  ↓ returns
  {
    isRemote: true/false,
    region: '제주/울릉도/기타',
    surcharge: 3000/5000
  }
```

#### 📊 우편번호 범위
```javascript
제주: 63000-63644 → surcharge: 3000
울릉도: 40200-40240 → surcharge: 5000
기타 도서산간: → surcharge: 5000
```

#### ⚠️ 필수 체크리스트
- [ ] 우편번호 형식 검증 (5자리 숫자)
- [ ] 범위 체크 (제주, 울릉도)
- [ ] 기타 도서산간 처리 (향후 확장 가능)
- [ ] 반환값: { isRemote, region, surcharge }

#### 🔗 연관 기능
- **배송비 계산** (formatShippingInfo)

#### 🎓 상세 문서 위치
- **코드**: lib/shippingUtils.js - calculateShippingSurcharge()

---

### 7.3 배송 상태 조회 [일반]

#### 📍 영향받는 페이지
1. `/orders/[id]/complete` - 주문 상세 페이지
2. `/admin/shipping` - 발송 관리 페이지

#### 🔧 핵심 기능
```javascript
// 주문 상태 확인
orders.status
  - pending: 결제대기
  - verifying: 결제확인중
  - paid: 결제완료
  - delivered: 발송완료
  - cancelled: 취소됨
```

#### ⚠️ 필수 체크리스트
- [ ] 현재 배송 상태 표시
- [ ] 상태별 타임스탬프 표시
- [ ] 송장번호 표시 (있는 경우)
- [ ] 배송 단계 UI (진행 바)

#### 💡 특이사항
- **타임스탬프**: created_at, verifying_at, paid_at, delivered_at
- **상태 전환**: 순차적 전환 (pending → verifying → paid → delivered)

---

### 7.4 배송 추적 [일반]

#### 📍 영향받는 페이지
1. `/orders/[id]/complete` - 주문 상세 페이지
2. `/admin/shipping` - 발송 관리 페이지

#### 🔧 핵심 기능
- 송장번호 기반 배송 추적
- 택배사 API 연동 (예정)

#### 🗄️ DB 작업
- `order_shipping` (SELECT) - tracking_number

#### ⚠️ 필수 체크리스트
- [ ] 송장번호 저장 (tracking_number)
- [ ] 택배사 코드 (carrier)
- [ ] 외부 API 연동 (optional)
- [ ] 배송 추적 링크 생성

#### 💡 특이사항
- **미구현**: 현재 송장번호만 저장
- **향후 기능**: 택배사 API 연동 (실시간 배송 조회)
- **링크 생성**: 택배사별 추적 URL 자동 생성

---

### 7.5 배송 알림 [일반]

#### 📍 영향받는 페이지
1. 백그라운드 작업 (예정)

#### 🔧 핵심 기능
- 배송 상태 변경 시 자동 알림
- 이메일/SMS 발송

#### ⚠️ 필수 체크리스트
- [ ] 발송 완료 알림 (delivered 상태)
- [ ] 이메일 템플릿
- [ ] SMS 발송 (optional)
- [ ] 알림 발송 이력 기록

#### 💡 특이사항
- **미구현**: 현재 수동 알림만 가능
- **향후 기능**:
  - 자동 이메일 발송
  - SMS 알림 (선택적)
  - 배송 전 알림
  - 배송 완료 알림

---

## 📋 기능 문서화 완료 통계

### ✅ 상세 문서화 완료 (77개 전체)

#### 주요 기능 (20개)
1. 주문 생성
2. 주문 조회 (사용자)
3. 주문 조회 (관리자)
4. 주문 상세 조회
5. 주문 상태 변경
6. 일괄 상태 변경
7. 주문 취소
8. 일괄결제 처리
9. 상품 등록
10. 상품 수정
11. 옵션 포함 상품 생성
12. Variant 생성
13. Variant 재고 관리
14. Variant 재고 확인
15. 프로필 수정
16. 프로필 정규화
17. 주소 관리
18. 로그인 (카카오)
19. 발주서 생성
20. 배송비 계산
21. 도서산간 배송비 추가

#### 일반 기능 (57개)
- 주문 관련: 11개 (1.8~1.18)
- 상품 관련: 15개 (2.3~2.17)
- Variant/옵션 관련: 9개 (3.4~3.12)
- 사용자/프로필 관련: 6개 (4.1, 4.4, 4.6~4.10)
- 인증 관련: 5개 (5.1, 5.3~5.6)
- 공급업체/발주 관련: 5개 (6.2~6.6)
- 배송 관련: 3개 (7.3~7.5)

### 📊 문서화 수준

**완전 문서화 (77개 전체)**:
- 영향받는 페이지 명시
- 핵심 함수 체인 설명
- DB 작업 순서 명시
- 필수 체크리스트 제공
- 연관 기능 링크
- 특이사항 및 주의점
- 상세 문서 위치

---

## 📋 주요 기능 목록 (상세 문서화 완료 - 21개)

### 주문 관련 (7개)
1. ✅ 주문 생성 - createOrder()
2. ✅ 주문 조회 (사용자) - getOrders()
3. ✅ 주문 상태 변경 - updateOrderStatus()
4. ✅ 일괄 상태 변경 - updateMultipleOrderStatus()
5. ✅ 주문 취소 - cancelOrder()
6. ✅ 일괄결제 처리 - payment_group_id

### 상품 관련 (3개)
7. ✅ 상품 등록 - addProduct()
8. ✅ 상품 수정 - updateProduct()
9. ✅ 옵션 포함 상품 생성 - createProductWithOptions()

### Variant/옵션 관련 (3개)
10. ✅ Variant 생성 - createVariant()
11. ✅ Variant 재고 관리 - updateVariantInventory()
12. ✅ Variant 재고 확인 - checkVariantInventory()

### 사용자/프로필 관련 (3개)
13. ✅ 프로필 수정 - atomicProfileUpdate()
14. ✅ 프로필 정규화 - normalizeProfile()
15. ✅ 주소 관리 - AddressManager

### 인증 관련 (1개)
16. ✅ 로그인 (카카오) - 카카오 OAuth

### 공급업체/발주 관련 (1개)
17. ✅ 발주서 생성 - getPurchaseOrderBySupplier()

### 배송 관련 (2개)
18. ✅ 배송비 계산 - formatShippingInfo()
19. ✅ 도서산간 배송비 추가 - calculateShippingSurcharge()

---

## 📝 문서화 완료 현황

1. ✅ 모든 기능 기본 구조 생성 (완료)
2. ✅ 주요 기능 21개 상세 문서화 (완료)
3. ✅ 일반 기능 57개 상세 문서화 (완료)
4. ✅ 총 77개 전체 기능 문서화 (완료 - 2025-10-03)

### 📈 문서화 통계
- **총 기능 개수**: 77개
- **상세 문서화 완료**: 77개 (100%)
- **분석한 페이지**: 31개
- **분석한 함수**: 47개 (lib/supabaseApi.js)
- **참조한 문서**: CODE_ANALYSIS_COMPLETE.md, DB_REFERENCE_GUIDE.md, DETAILED_DATA_FLOW.md

### 🎯 문서화 품질
**모든 기능 포함 항목**:
- ✅ 영향받는 페이지 (1~5개)
- ✅ 핵심 함수 체인 (코드 예시)
- ✅ DB 작업 순서 (테이블 + 작업 유형)
- ✅ 필수 체크리스트 (3~10개 항목)
- ✅ 연관 기능 링크
- ✅ 특이사항 및 주의점
- ✅ 상세 문서 위치

---

## 🎓 사용 예시

### 예시 1: 주문 생성 기능 수정 시
```
1. FEATURE_REFERENCE_MAP.md § 1.1 주문 생성 읽기
2. 영향받는 페이지 5개 확인
3. 필수 체크리스트 15개 항목 확인
4. 연관 기능 6개 테스트 필요
5. DB_REFERENCE_GUIDE.md § 6.1 참조
6. DETAILED_DATA_FLOW.md § 체크아웃 페이지 참조
```

### 예시 2: Variant 재고 관리 기능 수정 시
```
1. FEATURE_REFERENCE_MAP.md § 3.2 Variant 재고 관리 읽기
2. 영향받는 페이지 3개 확인
3. FOR UPDATE 잠금 사용 확인
4. 연관 기능: 주문 생성, 주문 취소 테스트
5. DB_REFERENCE_GUIDE.md § 5.1 참조
```

---

**마지막 업데이트**: 2025-10-03
**상태**: 완전 문서화 완료 (전체 77개 기능 상세 문서화)
**총 기능**: 77개 (주요: 21개, 일반: 56개)
## 8. 쿠폰 관련 기능

### 8.1 쿠폰 발행 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/admin/coupons` - 쿠폰 목록 (새 쿠폰 표시)
2. `/admin/coupons/new` - 쿠폰 발행 페이지
3. `/admin/coupons/[id]` - 쿠폰 상세/배포 페이지

#### 🔧 핵심 함수 체인
```javascript
createCoupon(couponData)
  ↓ validates
  - 쿠폰 코드 중복 확인
  - 할인 타입별 필수 필드 검증 (max_discount_amount)
  - 날짜 범위 검증 (valid_until > valid_from)
  ↓ creates
  coupons (INSERT)
  ↓ returns
  새로 생성된 쿠폰 객체
```

#### 🗄️ 관련 테이블
- `coupons` (main)

#### ⚠️ 주요 필드
- `code`: VARCHAR(50) UNIQUE - 쿠폰 코드 (자동 대문자)
- `discount_type`: 'fixed_amount' | 'percentage'
- `discount_value`: 할인 금액 또는 비율
- `min_purchase_amount`: 최소 구매 금액 (기본 0)
- `max_discount_amount`: 최대 할인 금액 (percentage 타입 필수)
- `valid_from`, `valid_until`: 유효 기간
- `usage_limit_per_user`: 사용자당 사용 횟수 (기본 1)
- `total_usage_limit`: 전체 사용 한도 (선착순, NULL=무제한)

#### ✅ 필수 체크리스트
- [ ] 쿠폰 코드 영문+숫자만 사용
- [ ] percentage 타입은 max_discount_amount 필수
- [ ] valid_until > valid_from 검증
- [ ] discount_value > 0 검증

---

### 8.2 쿠폰 배포 (개별) ⭐ [주요]

#### 📍 영향받는 페이지
1. `/admin/coupons/[id]` - 쿠폰 배포 페이지
2. `/mypage/coupons` - 사용자 쿠폰함 (새 쿠폰 표시)

#### 🔧 핵심 함수 체인
```javascript
// 프론트엔드 (lib/couponApi.js)
distributeCoupon(couponId, userIds)
  ↓ calls API Route
  POST /api/admin/coupons/distribute
  ↓ validates (서버 사이드)
  - 관리자 이메일 검증 (verifyAdminAuth)
  - 쿠폰 활성화 상태 확인
  - 사용자 ID 배열 유효성 검증
  ↓ distributes (Service Role Key 사용)
  user_coupons (INSERT with upsert, RLS 우회)
  ↓ triggers
  coupons.total_issued_count 자동 증가 (DB trigger)
  ↓ returns
  { success, distributedCount, requestedCount, duplicates, couponCode }
```

#### 🗄️ 관련 파일
- **프론트엔드**: `lib/couponApi.js` - distributeCoupon()
- **API Route**: `app/api/admin/coupons/distribute/route.js`
- **Admin Client**: `lib/supabaseAdmin.js` - Service Role 클라이언트
- **RLS 정책**: `supabase_user_coupons_rls.sql`

#### 🗄️ 관련 테이블
- `user_coupons` (main)
- `coupons` (통계 업데이트)

#### ⚠️ 주요 특징
- **보안**: Service Role Key 사용 + 관리자 이메일 검증
- **RLS 우회**: supabaseAdmin 클라이언트로 RLS 정책 우회
- 중복 배포 방지: UNIQUE(user_id, coupon_id)
- upsert 사용으로 중복 시 조용히 무시
- 배포자 정보 저장 (issued_by)

#### 🔒 보안 구조 (2025-10-03 업데이트)
```
관리자 UI
  ↓ localStorage (admin_email)
  ↓
API Route (서버 사이드)
  ↓ verifyAdminAuth(adminEmail)
  ↓ process.env.ADMIN_EMAILS 확인
  ↓
supabaseAdmin (Service Role)
  ↓ SUPABASE_SERVICE_ROLE_KEY
  ↓ RLS 정책 우회
  ↓
user_coupons 테이블 INSERT
```

#### ✅ 필수 체크리스트
- [x] 활성화된 쿠폰만 배포 가능
- [x] 이미 보유한 사용자는 중복 제외
- [x] 배포 결과 피드백 (성공 X건, 중복 Y건)
- [x] 관리자 권한 검증 (ADMIN_EMAILS)
- [x] Service Role Key로 안전한 배포

---

### 8.3 쿠폰 배포 (전체) ⭐ [주요]

#### 📍 영향받는 페이지
1. `/admin/coupons/[id]` - 전체 고객에게 배포
2. `/mypage/coupons` - 모든 사용자 쿠폰함

#### 🔧 핵심 함수 체인
```javascript
distributeToAllCustomers(couponId)
  ↓ fetches
  모든 고객 목록 (is_admin = false)
  ↓ calls
  distributeCoupon(couponId, allUserIds)
  ↓ returns
  전체 배포 결과
```

#### ⚠️ 주요 특징
- 일반 고객만 대상 (관리자 제외)
- 대량 배포 최적화 (upsert 사용)
- 기존 보유자 자동 제외

#### ✅ 필수 체크리스트
- [ ] 확인 모달로 실수 방지
- [ ] 배포 진행 상황 표시
- [ ] 완료 후 통계 갱신

---

### 8.4 쿠폰 유효성 검증 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/checkout` - 쿠폰 적용 시 검증

#### 🔧 핵심 함수 체인
```javascript
validateCoupon(couponCode, userId, orderAmount)
  ↓ calls DB function
  validate_coupon(p_coupon_code, p_user_id, p_order_amount)
  ↓ validates
  1. 쿠폰 존재 및 활성화 여부
  2. 유효 기간 (NOW() BETWEEN valid_from AND valid_until)
  3. 최소 구매 금액
  4. 전체 사용 한도
  5. 사용자 보유 여부
  6. 사용 이력 (is_used = false)
  ↓ calculates
  할인 금액 (fixed_amount 또는 percentage)
  ↓ returns
  { is_valid, error_message, coupon_id, discount_amount }
```

#### 🗄️ 관련 함수 (DB)
- `validate_coupon()` - PostgreSQL 함수

#### ⚠️ 검증 순서 (중요!)
1. 쿠폰 존재/활성화 → "존재하지 않거나 비활성화된 쿠폰"
2. 유효 기간 (시작 전) → "아직 사용할 수 없는 쿠폰"
3. 유효 기간 (만료) → "유효 기간이 만료된 쿠폰"
4. 최소 구매 금액 → "최소 구매 금액 X원 이상"
5. 전체 사용 한도 → "쿠폰 사용 가능 횟수 초과"
6. 사용자 보유 → "보유하지 않은 쿠폰"
7. 사용 이력 → "이미 사용한 쿠폰"

#### 할인 금액 계산 로직
```sql
-- fixed_amount
v_discount := LEAST(v_coupon.discount_value, p_order_amount)

-- percentage
v_discount := p_order_amount * (v_coupon.discount_value / 100)
IF v_coupon.max_discount_amount IS NOT NULL THEN
    v_discount := LEAST(v_discount, v_coupon.max_discount_amount)
END IF
```

#### ✅ 필수 체크리스트
- [ ] 모든 검증 단계 통과 확인
- [ ] 에러 메시지 사용자 친화적으로 표시
- [ ] 할인 금액 계산 정확성 확인

---

### 8.5 쿠폰 사용 처리 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/checkout` - 주문 완료 후 쿠폰 사용 처리
2. `/orders/[id]/complete` - 주문 완료 페이지
3. `/admin/coupons/[id]` - 사용 통계 업데이트

#### 🔧 핵심 함수 체인
```javascript
applyCouponUsage(userId, couponId, orderId, discountAmount)
  ↓ calls DB function
  use_coupon(p_user_id, p_coupon_id, p_order_id, p_discount_amount)
  ↓ updates
  user_coupons.is_used = true
  user_coupons.used_at = NOW()
  user_coupons.order_id = orderId
  user_coupons.discount_amount = discountAmount
  ↓ triggers
  coupons.total_used_count 자동 증가 (DB trigger)
  ↓ returns
  boolean (성공 여부)
```

#### 🗄️ 관련 트리거
- `trigger_update_coupon_usage_stats` - 사용 통계 자동 업데이트

#### ⚠️ 주의사항
- WHERE 조건: `is_used = false` (중복 사용 방지)
- 트랜잭션 안전성: 주문 생성과 함께 처리
- 실패 시에도 주문은 진행 (쿠폰은 재발행 가능)

#### ✅ 필수 체크리스트
- [ ] 주문 생성 후 즉시 호출
- [ ] 쿠폰 사용 실패해도 주문 취소 안 됨
- [ ] 사용 내역 로그 기록 (logger)

---

### 8.6 쿠폰 목록 조회 (관리자) [일반]

#### 📍 영향받는 페이지
1. `/admin/coupons` - 쿠폰 관리 페이지

#### 🔧 핵심 함수
```javascript
getCoupons()
  ↓ fetches
  모든 쿠폰 + 통계 (join user_coupons)
  ↓ returns
  쿠폰 배열 (total_issued_count, total_used_count 포함)
```

#### 🎨 UI 기능
- 검색: 코드, 이름
- 필터: 상태 (전체/활성/비활성), 타입 (전체/금액/퍼센트)
- 정렬: 생성일 내림차순
- 통계 카드: 전체/활성/발급/사용

---

### 8.7 쿠폰 목록 조회 (사용자) [일반]

#### 📍 영향받는 페이지
1. `/mypage/coupons` - 내 쿠폰함
2. `/checkout` - 쿠폰 선택

#### 🔧 핵심 함수
```javascript
getUserCoupons(userId)
  ↓ fetches
  user_coupons + coupons (join)
  WHERE user_id = userId
  ↓ returns
  사용자 쿠폰 배열 (쿠폰 정보 포함)
```

#### 🎨 UI 기능
- 탭: 사용 가능 / 사용 완료 / 기간 만료
- 쿠폰 디자인: 티켓 스타일 (좌측 할인 금액, 우측 정보)
- 정렬: 만료일 가까운 순

---

### 8.8 쿠폰 상세 조회 [일반]

#### 📍 영향받는 페이지
1. `/admin/coupons/[id]` - 쿠폰 상세 및 배포

#### 🔧 핵심 함수
```javascript
getCouponDetail(couponId)
  ↓ fetches
  쿠폰 기본 정보
  ↓ parallel fetches
  - 보유 고객 목록 (미사용)
  - 사용 완료 고객 목록
  - 통계 (usage_rate 등)
  ↓ returns
  쿠폰 상세 + 고객 리스트
```

#### 🎨 UI 기능
- 통계: 총 발급 / 사용 완료 / 사용률 / 남은 수량
- 고객 탭: 미사용 / 사용완료
- 배포: 개별 선택 / 전체 발송

---

### 8.9 쿠폰 활성화/비활성화 [일반]

#### 📍 영향받는 페이지
1. `/admin/coupons` - 쿠폰 목록

#### 🔧 핵심 함수
```javascript
toggleCouponStatus(couponId, isActive)
  ↓ updates
  coupons.is_active = isActive
  ↓ affects
  - 비활성화 시 신규 배포 불가
  - 기존 보유자는 사용 가능
```

---

### 8.10 쿠폰 통계 조회 [일반]

#### 📍 영향받는 페이지
1. `/admin/coupons/[id]` - 쿠폰 상세

#### 🔧 핵심 함수
```javascript
getCouponStats(couponId)
  ↓ aggregates
  - total_issued: 총 발급 수
  - total_used: 총 사용 수
  - usage_rate: 사용률 (%)
  - remaining: 남은 수량 (total_usage_limit - total_used)
  ↓ returns
  통계 객체
```

---

## 📊 쿠폰 시스템 전체 흐름

### 1. 쿠폰 발행 (관리자)
```
관리자 → /admin/coupons/new
  ↓ createCoupon()
쿠폰 생성 완료
  ↓ redirect
/admin/coupons/[id] (배포 페이지)
```

### 2. 쿠폰 배포 (관리자)
```
관리자 → /admin/coupons/[id]
  ↓ 고객 선택 (개별 or 전체)
  ↓ distributeCoupon() or distributeToAllCustomers()
user_coupons 레코드 생성
  ↓ trigger
coupons.total_issued_count 증가
```

### 3. 쿠폰 사용 (고객)
```
고객 → /checkout
  ↓ 쿠폰 선택
  ↓ validateCoupon()
할인 금액 계산 및 표시
  ↓ 주문 생성
  ↓ applyCouponUsage()
user_coupons.is_used = true
  ↓ trigger
coupons.total_used_count 증가
```

### 4. 쿠폰 조회 (고객)
```
고객 → /mypage/coupons
  ↓ getUserCoupons()
내 쿠폰 목록 표시
  ↓ 필터 (사용가능/사용완료/만료)
상태별 분류 표시
```

---

## 🔗 쿠폰 시스템 연관 관계

### 쿠폰 → 주문
- 체크아웃 페이지에서 쿠폰 선택 시 할인 적용
- 주문 생성 후 쿠폰 사용 처리
- user_coupons.order_id에 주문 ID 저장

### 쿠폰 → 사용자
- user_coupons 테이블로 사용자별 쿠폰 보유 관리
- 중복 보유 방지 (UNIQUE 제약)
- 사용 이력 추적

### 쿠폰 → 통계
- DB 트리거로 자동 통계 업데이트
- 발급 시: total_issued_count++
- 사용 시: total_used_count++

---

**문서화 완료율**: 100%
