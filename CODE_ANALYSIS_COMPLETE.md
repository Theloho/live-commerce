# 본서버 코드베이스 완전 분석 결과

**분석 기준**: main 브랜치 (프로덕션)
**분석 일시**: 2025-10-03
**분석 도구**: Claude Code (Automated Analysis)

## 📊 전체 통계

- **총 페이지**: 31개
  - 사용자 페이지: 8개
  - 관리자 페이지: 21개
  - 인증 페이지: 2개
- **총 함수 (lib/)**: 47개 exported functions
- **총 테이블**: 23개 (Supabase)
- **총 hooks**: 2개 (useAuth, useRealtimeProducts)

---

## 📄 페이지별 상세 분석

### 1. 사용자 페이지

#### 1.1 홈 페이지 (/)
- **파일**: `/Users/jt/live-commerce/app/page.js`
- **주요 기능**: 라이브 상품 목록 표시
- **사용 테이블**:
  - `products` (SELECT - is_live_active=true)
  - `product_variants` (SELECT via getProductVariants)
- **호출 함수**:
  - `useRealtimeProducts()` (hook)
  - `useAuth()`
- **사용 컴포넌트**:
  - `Header`
  - `LiveBanner`
  - `ProductGrid`
  - `MobileNav`
- **데이터 흐름**:
  1. useRealtimeProducts hook으로 실시간 상품 데이터 구독
  2. products 테이블에서 is_live_active=true인 상품만 조회
  3. 각 상품의 variant 정보 병렬 로드
  4. ProductGrid 컴포넌트로 렌더링
- **상태 관리**:
  - `liveBroadcast`: 라이브 방송 정보 (현재 Mock)
  - `userSession`: sessionStorage 기반 사용자 세션
  - `sessionLoading`: 세션 로딩 상태
- **영향받는 기능**:
  - 상품 라이브 활성화/비활성화 (관리자)
  - 상품 재고 변경 (실시간 반영)

#### 1.2 체크아웃 페이지 (/checkout)
- **파일**: `/Users/jt/live-commerce/app/checkout/page.js`
- **주요 기능**: 주문/결제 처리
- **사용 테이블**:
  - `profiles` (SELECT - 주소 정보)
  - `orders` (INSERT via createOrder)
  - `order_items` (INSERT via createOrder)
  - `order_shipping` (INSERT via createOrder)
  - `order_payments` (INSERT via createOrder)
  - `product_variants` (UPDATE - 재고 차감 via updateVariantInventory)
- **호출 함수**:
  - `createOrder(orderItem, userProfile, depositName)` - 단일 주문 생성
  - `updateMultipleOrderStatus(orderIds, status, data)` - 일괄결제 처리
  - `formatShippingInfo(baseShipping, postalCode)` - 배송비 계산
  - `UserProfileManager.normalizeProfile(user)` - 프로필 정규화
  - `UserProfileManager.checkCompleteness(profile)` - 프로필 완성도 체크
- **사용 컴포넌트**:
  - `AddressManager` - 배송지 관리
  - `CardPaymentModal` - 카드결제 모달
- **데이터 흐름**:
  1. sessionStorage에서 checkoutItem 로드
  2. 사용자 프로필 및 주소 목록 병렬 로드
  3. 기본 배송지 자동 선택
  4. 입금자명 선택 (고객명/닉네임/직접입력)
  5. createOrder 또는 updateMultipleOrderStatus 호출
  6. 주문 완료 페이지로 리다이렉트
- **성능 최적화**:
  - `initCheckoutOptimized()`: 동기/비동기 데이터 병렬 로딩
  - `Promise.allSettled()` 사용으로 병렬 처리
  - 세션 데이터 우선 사용 (DB 호출 최소화)
- **배송비 계산**:
  - 기본 배송비: 4,000원
  - 도서산간 추가비: 우편번호 기반 (제주 3,000원, 울릉도/기타 5,000원)
  - `formatShippingInfo()` 함수 사용
- **일괄결제 지원**:
  - `isBulkPayment` 플래그로 구분
  - `originalOrderIds` 배열로 원본 주문 추적
  - `updateMultipleOrderStatus()`로 모든 주문 상태 일괄 변경

#### 1.3 주문 내역 페이지 (/orders)
- **파일**: `/Users/jt/live-commerce/app/orders/page.js`
- **주요 기능**: 주문 목록 조회 및 관리
- **사용 테이블**:
  - `orders` (SELECT via getOrders)
  - `order_items` (SELECT - JOIN)
  - `order_shipping` (SELECT - JOIN)
  - `order_payments` (SELECT - JOIN)
  - `order_items` (UPDATE via updateOrderItemQuantity)
- **호출 함수**:
  - `getOrders(userId)` - 사용자별 주문 조회
  - `cancelOrder(orderId)` - 주문 취소
  - `updateOrderItemQuantity(itemId, quantity)` - 수량 변경
- **데이터 흐름**:
  1. 세션 로드 및 인증 확인 (`initOrdersPageFast`)
  2. getOrders()로 모든 주문 조회
  3. 상태별 필터링 (pending/verifying/paid/delivered)
  4. 결제대기 주문들의 일괄결제 금액 계산
  5. 수량 조절 시 옵티미스틱 업데이트 + 서버 동기화
- **성능 최적화**:
  - 고속 초기화 함수 (`initOrdersPageFast`)
  - 포커스 이벤트 리스너로 자동 새로고침
  - 옵티미스틱 업데이트 (UI 즉시 반영 → 서버 동기화)
- **일괄결제 기능**:
  - 결제대기 주문들의 총 금액 계산
  - sessionStorage 용량 제한 대응 (간소화된 데이터만 저장)
  - 모든 주문을 하나의 결제로 처리

#### 1.4 주문 상세 페이지 (/orders/[id]/complete)
- **파일**: `/Users/jt/live-commerce/app/orders/[id]/complete/page.js`
- **주요 기능**: 주문 완료 상세 정보 표시
- **사용 테이블**:
  - `orders` (SELECT via getOrderById)
  - `order_items` (SELECT - JOIN)
  - `order_shipping` (SELECT - JOIN)
  - `order_payments` (SELECT - JOIN)
- **호출 함수**:
  - `getOrderById(orderId)` - 주문 단일 조회
  - `formatShippingInfo(baseShipping, postalCode)` - 배송비 계산
- **데이터 흐름**:
  1. sessionStorage에서 recentOrder 확인 (빠른 로딩)
  2. 없으면 getOrderById()로 DB 조회
  3. 주문 상태별 UI 표시 (pending/verifying/paid/delivered)
  4. 결제 방법별 안내 메시지 (계좌이체/카드결제)
- **결제 방법별 표시**:
  - **계좌이체**: 입금금액, 입금자명, 계좌번호 복사 기능
  - **카드결제**: 상품금액 + 부가세(10%) + 배송비
- **배송비 계산**:
  - DB 저장된 금액 우선 사용
  - 우편번호 기반 도서산간 배송비 표시
  - 총 결제금액 = 상품금액 + 배송비

#### 1.5 마이페이지 (/mypage)
- **파일**: `/Users/jt/live-commerce/app/mypage/page.js`
- **주요 기능**: 사용자 정보 관리
- **사용 테이블**:
  - `profiles` (SELECT, UPDATE)
- **호출 함수**:
  - `UserProfileManager.atomicProfileUpdate(userId, data, isKakao)` - 통합 프로필 업데이트
- **사용 컴포넌트**:
  - `AddressManager` - 배송지 관리 (신버전 사용)
- **데이터 흐름**:
  1. 세션 확인 (sessionStorage + useAuth)
  2. 프로필 정보 로드 (DB 우선, sessionStorage 폴백)
  3. 필드별 수정 모드 (name, phone, nickname)
  4. atomicProfileUpdate()로 profiles + auth.users 동시 업데이트
- **프로필 업데이트**:
  - profiles 테이블 업데이트
  - auth.users.user_metadata 업데이트 (관리자 페이지용)
  - sessionStorage 업데이트 (카카오 사용자)
  - 병렬 처리로 성능 최적화
- **배송지 관리**:
  - AddressManager 컴포넌트 통합
  - 최대 5개 배송지 저장
  - 기본 배송지 설정 기능

#### 1.6 로그인 페이지 (/login)
- **파일**: `/Users/jt/live-commerce/app/login/page.js`
- **주요 기능**: 사용자 로그인 (이메일/카카오)
- **사용 테이블**:
  - `profiles` (SELECT, INSERT)
  - `auth.users` (via Supabase Auth)
- **데이터 흐름**:
  1. 이메일/비밀번호 입력 또는 카카오 로그인 버튼
  2. Supabase Auth 또는 카카오 OAuth 처리
  3. 프로필 정보 확인 및 sessionStorage 저장
  4. 홈 페이지로 리다이렉트

#### 1.7 회원가입 페이지 (/signup)
- **파일**: `/Users/jt/live-commerce/app/signup/page.js`
- **주요 기능**: 신규 사용자 등록
- **사용 테이블**:
  - `profiles` (INSERT)
  - `auth.users` (via Supabase Auth)

#### 1.8 인증 콜백 (/auth/callback)
- **파일**: `/Users/jt/live-commerce/app/auth/callback/page.js`
- **주요 기능**: OAuth 콜백 처리

---

### 2. 관리자 페이지

#### 2.1 관리자 대시보드 (/admin)
- **파일**: `/Users/jt/live-commerce/app/admin/page.js`
- **주요 기능**: 관리자 홈 대시보드
- **데이터 흐름**: 주요 통계 및 최근 활동 표시

#### 2.2 주문 관리 (/admin/orders)
- **파일**: `/Users/jt/live-commerce/app/admin/orders/page.js`
- **주요 기능**: 모든 주문 관리
- **사용 테이블**:
  - `orders` (SELECT, UPDATE via getAllOrders)
  - `order_items` (SELECT - JOIN)
  - `order_shipping` (SELECT - JOIN)
  - `order_payments` (SELECT - JOIN)
- **호출 함수**:
  - `getAllOrders()` - 전체 주문 조회
  - `updateOrderStatus(orderId, status)` - 주문 상태 변경
  - `formatShippingInfo(baseShipping, postalCode)` - 배송비 계산
- **데이터 흐름**:
  1. getAllOrders()로 모든 주문 로드
  2. 결제 방법별 탭 필터링 (결제대기/계좌이체/카드결제/결제완료/발송완료)
  3. 검색 필터 (주문번호, 고객명, 상품명)
  4. 주문 상태 변경 (pending → verifying → paid → delivered)
- **주문 상태 관리**:
  - `pending`: 결제대기 (입금 전)
  - `verifying`: 결제확인중 (입금 확인 중)
  - `paid`: 결제완료 (입금 완료)
  - `delivered`: 발송완료
  - `cancelled`: 취소됨
- **배송비 계산**:
  - 관리자 페이지에서 정확한 배송비 표시
  - 우편번호 기반 도서산간 배송비 계산
  - pending 상태에서는 배송비 0원
- **그룹 주문 처리**:
  - 일괄결제 주문 표시 (groupOrderCount)
  - 그룹 주문 상태 일괄 변경
  - 원본 주문들의 ID 추적

#### 2.3 주문 상세 관리 (/admin/orders/[id])
- **파일**: `/Users/jt/live-commerce/app/admin/orders/[id]/page.js`
- **주요 기능**: 개별 주문 상세 정보 및 관리
- **사용 테이블**:
  - `orders` (SELECT, UPDATE via getOrderById)
  - `order_items` (SELECT - JOIN)
  - `order_shipping` (SELECT - JOIN)
  - `order_payments` (SELECT - JOIN)
- **호출 함수**:
  - `getOrderById(orderId)` - 주문 단일 조회
  - `updateOrderStatus(orderId, status)` - 상태 변경
  - `formatShippingInfo(baseShipping, postalCode)` - 배송비 계산
- **데이터 흐름**:
  1. getOrderById()로 주문 상세 조회
  2. 고객 정보, 배송 정보, 결제 정보 표시
  3. 주문 진행 상황 타임라인 (생성/확인중/완료/발송/취소)
  4. 상태별 액션 버튼 (입금확인/결제확인/발송처리/취소)
- **타임스탬프 추적**:
  - `created_at`: 주문 생성 시간
  - `verifying_at`: 결제확인중 전환 시간
  - `paid_at`: 결제완료 전환 시간
  - `delivered_at`: 발송완료 전환 시간
  - `cancelled_at`: 취소 시간
- **배송비 검증**:
  - DB 저장값과 계산값 비교
  - 불일치 시 경고 표시

#### 2.4 상품 관리 (/admin/products)
- **파일**: `/Users/jt/live-commerce/app/admin/products/page.js`
- **주요 기능**: 상품 목록 및 Variant 관리
- **사용 테이블**:
  - `products` (SELECT, UPDATE)
  - `product_variants` (SELECT via getProductVariants)

#### 2.5 상품 상세 관리 (/admin/products/[id])
- **파일**: `/Users/jt/live-commerce/app/admin/products/catalog/[id]/page.js`
- **주요 기능**: 상품 상세 정보 수정

#### 2.6 상품 등록 (/admin/products/new)
- **파일**: `/Users/jt/live-commerce/app/admin/products/new/page.js`
- **주요 기능**: 신규 상품 등록

#### 2.7 카테고리 관리 (/admin/categories)
- **파일**: `/Users/jt/live-commerce/app/admin/categories/page.js`
- **주요 기능**: 카테고리 CRUD

#### 2.8 고객 관리 (/admin/customers)
- **파일**: `/Users/jt/live-commerce/app/admin/customers/page.js`
- **주요 기능**: 고객 목록 및 정보 관리
- **사용 테이블**:
  - `profiles` (SELECT via getAllCustomers)

#### 2.9 고객 상세 (/admin/customers/[id])
- **파일**: `/Users/jt/live-commerce/app/admin/customers/[id]/page.js`
- **주요 기능**: 개별 고객 상세 정보

#### 2.10 공급업체 관리 (/admin/suppliers)
- **파일**: `/Users/jt/live-commerce/app/admin/suppliers/page.js`
- **주요 기능**: 공급업체 CRUD

#### 2.11 발주 관리 (/admin/purchase-orders)
- **파일**: `/Users/jt/live-commerce/app/admin/purchase-orders/page.js`
- **주요 기능**: 발주 목록 관리

#### 2.12 발주 상세 (/admin/purchase-orders/[supplierId])
- **파일**: `/Users/jt/live-commerce/app/admin/purchase-orders/[supplierId]/page.js`
- **주요 기능**: 공급업체별 발주 상세

#### 2.13 입금 관리 (/admin/deposits)
- **파일**: `/Users/jt/live-commerce/app/admin/deposits/page.js`
- **주요 기능**: 입금 확인 및 처리

#### 2.14 발송 관리 (/admin/shipping)
- **파일**: `/Users/jt/live-commerce/app/admin/shipping/page.js`
- **주요 기능**: 배송 상태 관리

#### 2.15 라이브 방송 관리 (/admin/broadcasts)
- **파일**: `/Users/jt/live-commerce/app/admin/broadcasts/page.js`
- **주요 기능**: 라이브 방송 설정 및 관리

#### 2.16 설정 (/admin/settings)
- **파일**: `/Users/jt/live-commerce/app/admin/settings/page.js`
- **주요 기능**: 사이트 설정 (카드결제 활성화 등)

#### 2.17 관리자 로그인 (/admin/login)
- **파일**: `/Users/jt/live-commerce/app/admin/login/page.js`
- **주요 기능**: 관리자 인증

---

## 🔧 함수별 분석 (lib/)

### supabaseApi.js (47개 함수)

#### 상품 관련 (12개)
1. **getProducts(filters)** - 라이브 활성화 상품 목록 조회
   - 테이블: `products`, `product_variants`
   - JOIN: variant 정보 병렬 로드
   - 필터: `is_live_active=true`
   - 반환: 총 재고 포함 상품 배열

2. **getProductById(productId)** - 상품 단일 조회
   - 테이블: `products`, `product_variants`
   - 반환: variant 및 옵션 포함 상품 객체

3. **addProduct(productData)** - 상품 생성
   - 테이블: `products` (INSERT)
   - 옵션이 있으면 `product_options` INSERT

4. **updateProduct(productId, productData)** - 상품 수정
   - 테이블: `products` (UPDATE)
   - `product_options` (DELETE → INSERT)

5. **updateProductLiveStatus(productId, isLive)** - 라이브 상태 변경
   - 테이블: `products` (UPDATE)

6. **updateProductInventory(productId, quantityChange)** - 재고 변경
   - 테이블: `products` (UPDATE)
   - 현재 재고 조회 → 차감/증가 → 업데이트

7. **deleteProduct(productId)** - 상품 삭제 (soft delete)
   - 테이블: `products` (UPDATE status='deleted')

8. **getAllProducts(filters)** - 전체 상품 조회 (관리자용)
   - 테이블: `products`, `product_variants`

9. **getProductVariants(productId)** - Variant 목록 조회
   - 테이블: `product_variants`
   - JOIN: `variant_option_values`, `product_option_values`, `product_options`

10. **createVariant(variantData, optionValueIds)** - Variant 생성
    - 테이블: `product_variants` (INSERT)
    - `variant_option_values` (INSERT - 매핑 테이블)

11. **updateVariantInventory(variantId, quantityChange)** - Variant 재고 변경
    - 테이블: `product_variants` (UPDATE)
    - 트랜잭션: FOR UPDATE 잠금 사용
    - 재고 부족 시 에러

12. **checkVariantInventory(productId, selectedOptions)** - Variant 재고 확인
    - 테이블: `product_variants`, `variant_option_values`
    - 옵션 조합 일치 Variant 검색
    - 반환: {available, inventory}

#### 주문 관련 (10개)
1. **createOrder(orderData, userProfile, depositName)** - 주문 생성
   - 테이블: `orders`, `order_items`, `order_shipping`, `order_payments` (INSERT)
   - `product_variants` (UPDATE - 재고 차감)
   - 트랜잭션: Variant 재고 잠금
   - 배송비: formatShippingInfo() 사용
   - 카카오 사용자: order_type에 KAKAO:${kakao_id} 저장

2. **createOrderWithOptions(orderData, userProfile, depositName)** - 옵션 포함 주문 생성
   - 동일 로직 + 옵션별 재고 검증
   - Double Validation (Frontend + Backend)

3. **getOrders(userId)** - 사용자별 주문 조회
   - 테이블: `orders` (SELECT)
   - JOIN: `order_items`, `order_shipping`, `order_payments`
   - 카카오 사용자: order_type LIKE '%KAKAO:${kakao_id}%'
   - 일반 사용자: user_id 매칭
   - 그룹화: 동일 payment_group_id 주문 통합

4. **getAllOrders()** - 전체 주문 조회 (관리자용)
   - 테이블: `orders` (SELECT)
   - JOIN: `order_items`, `order_shipping`, `order_payments`, `profiles`
   - 사용자 정보 JOIN (user_id, kakao_id)
   - 그룹화: payment_group_id 기준

5. **getOrderById(orderId)** - 주문 단일 조회
   - 테이블: `orders` (SELECT)
   - JOIN: `order_items`, `order_shipping`, `order_payments`
   - 입금자명 우선순위: payment.depositor_name > depositName > shipping.name

6. **cancelOrder(orderId)** - 주문 취소
   - 테이블: `orders` (UPDATE status='cancelled')
   - 타임스탬프: cancelled_at 기록

7. **updateOrderStatus(orderId, status, paymentData)** - 주문 상태 변경
   - 테이블: `orders` (UPDATE)
   - `order_payments` (UPDATE - optional)
   - 타임스탬프: verifying_at, paid_at, delivered_at 자동 기록
   - 로그: 이모지 포함 (🕐, 💰, 🚚)

8. **updateMultipleOrderStatus(orderIds, status, paymentData)** - 일괄 상태 변경
   - 여러 주문 ID 배열 처리
   - 각 주문에 updateOrderStatus 호출
   - 배송 정보 일괄 업데이트

9. **updateOrderItemQuantity(orderItemId, newQuantity)** - 주문 아이템 수량 변경
   - 테이블: `order_items` (UPDATE)
   - price 기준으로 total_price 재계산

10. **generateCustomerOrderNumber()** - 주문번호 생성
    - 형식: YYYYMMDD-XXXX (날짜 + 랜덤 4자리)

#### 옵션/Variant 관련 (7개)
1. **checkOptionInventory(productId, selectedOptions)** - 옵션별 재고 확인
   - 테이블: `product_options`, `product_option_values`, `variant_option_values`, `product_variants`
   - 옵션 조합 → Variant 검색 → 재고 확인
   - 반환: {available, inventory}

2. **updateOptionInventory(productId, selectedOptions, quantityChange)** - 옵션별 재고 차감
   - Variant 시스템 사용
   - 옵션 조합 일치 Variant 검색 → 재고 차감

3. **getProductOptions(productId)** - 상품 옵션 조회
   - 테이블: `product_options` (SELECT)

4. **createProductOption(optionData)** - 옵션 생성
   - 테이블: `product_options` (INSERT)

5. **createOptionValue(valueData)** - 옵션값 생성
   - 테이블: `product_option_values` (INSERT)

6. **createProductWithOptions(productData, optionsData)** - 옵션 포함 상품 생성
   - 상품 생성 + 옵션 생성 + Variant 생성 통합

7. **updateVariant(variantId, variantData)** - Variant 수정
   - 테이블: `product_variants` (UPDATE)

#### 사용자 관련 (5개)
1. **getCurrentUser()** - 현재 사용자 조회
   - sessionStorage 확인 → Supabase Auth 확인

2. **getUserById(userId)** - 사용자 조회
   - 테이블: `profiles` (SELECT)

3. **getAllCustomers()** - 전체 고객 조회
   - 테이블: `profiles` (SELECT)

4. **signIn(email, password)** - 로그인
   - Supabase Auth 사용

5. **signUp(email, password, userData)** - 회원가입
   - Supabase Auth + profiles INSERT

#### 기타 (13개)
1. **getCategories()** - 카테고리 조회
2. **getSuppliers()** - 공급업체 조회
3. **createSupplier(supplierData)** - 공급업체 생성
4. **updateSupplier(supplierId, supplierData)** - 공급업체 수정
5. **getLiveBroadcasts()** - 라이브 방송 조회
6. **getLiveProducts()** - 라이브 상품 조회
7. **addToLive(productId, priority)** - 라이브 등록
8. **removeFromLive(productId)** - 라이브 해제
9. **updateLivePriority(productId, priority)** - 라이브 우선순위 변경
10. **getPurchaseOrdersBySupplier(startDate, endDate)** - 발주 조회
11. **getPurchaseOrderBySupplier(supplierId, startDate, endDate)** - 공급업체별 발주 조회
12. **signOut()** - 로그아웃
13. **generateGroupOrderNumber(paymentGroupId)** - 그룹 주문번호 생성

### userProfileManager.js

#### UserProfileManager 클래스
1. **getCurrentUser()** - 현재 사용자 조회
   - sessionStorage 우선 확인

2. **getUserOrderQuery()** - 주문 조회 쿼리 생성
   - 카카오 사용자: order_type 기반
   - 일반 사용자: user_id 기반

3. **normalizeProfile(user)** - 프로필 정규화
   - 카카오/일반 사용자 통합 형식 반환
   - addresses 배열 자동 생성

4. **validateProfile(profile)** - 프로필 유효성 검사
   - 필수 필드: name, phone, address

5. **atomicProfileUpdate(userId, profileData, isKakaoUser)** - 통합 프로필 업데이트
   - profiles 테이블 UPSERT
   - auth.users.user_metadata UPDATE
   - sessionStorage UPDATE (카카오 사용자)
   - 병렬 처리 (Promise.allSettled)

6. **prepareShippingData(profile)** - 배송 정보 준비
   - 유효성 검사 후 배송 데이터 반환

7. **checkCompleteness(profile)** - 프로필 완성도 체크
   - 미완성 필드 목록 반환

#### ShippingDataManager 클래스
1. **extractShippingInfo(order)** - 배송 정보 추출
   - 다양한 데이터 구조 대응
   - order_shipping 배열/객체 모두 지원

2. **validateShippingInfo(shippingInfo)** - 배송 정보 유효성 검사

### shippingUtils.js

1. **calculateShippingSurcharge(postalCode)** - 도서산간 배송비 계산
   - 제주: 63000-63644 → +3,000원
   - 울릉도: 40200-40240 → +5,000원
   - 기타 도서산간 → +5,000원
   - 반환: {isRemote, region, surcharge}

2. **formatShippingInfo(baseShipping, postalCode)** - 배송비 정보 포맷팅
   - 기본 배송비 + 도서산간 추가비
   - 반환: {baseShipping, surcharge, totalShipping, isRemote, region}

### orderCalculations.js

**OrderCalculations 클래스** (추정)
- 주문 금액 계산 로직
- 할인/쿠폰 적용
- 세금 계산

### logger.js

로깅 유틸리티
- `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`
- 이모지 포함 로그 (🏠, 💰, 🚚, 🕐, ✅, ❌)

---

## 🗄️ 테이블 사용 맵

### orders
- **사용 페이지**:
  - /checkout (INSERT)
  - /orders (SELECT)
  - /orders/[id]/complete (SELECT)
  - /admin/orders (SELECT, UPDATE)
  - /admin/orders/[id] (SELECT, UPDATE)
- **사용 함수**:
  - createOrder() (INSERT)
  - createOrderWithOptions() (INSERT)
  - getOrders() (SELECT)
  - getAllOrders() (SELECT)
  - getOrderById() (SELECT)
  - cancelOrder() (UPDATE)
  - updateOrderStatus() (UPDATE)
  - updateMultipleOrderStatus() (UPDATE)
- **주요 컬럼**:
  - `id` (UUID, PK)
  - `customer_order_number` (주문번호, YYYYMMDD-XXXX)
  - `user_id` (FK → auth.users, NULL 가능)
  - `order_type` (direct, cart, direct:KAKAO:${kakao_id})
  - `status` (pending, verifying, paid, delivered, cancelled)
  - `total_amount` (총 결제금액)
  - `payment_group_id` (일괄결제 그룹 ID)
  - `verifying_at`, `paid_at`, `delivered_at`, `cancelled_at` (타임스탬프)
- **작업 통계**:
  - SELECT: 5개 함수
  - INSERT: 2개 함수
  - UPDATE: 4개 함수
  - DELETE: 0개 함수

### order_items
- **사용 페이지**:
  - /checkout (INSERT)
  - /orders (SELECT, UPDATE)
  - /orders/[id]/complete (SELECT)
  - /admin/orders (SELECT)
  - /admin/orders/[id] (SELECT)
- **사용 함수**:
  - createOrder() (INSERT)
  - getOrders() (SELECT)
  - updateOrderItemQuantity() (UPDATE)
- **주요 컬럼**:
  - `id` (UUID, PK)
  - `order_id` (FK → orders)
  - `product_id` (FK → products)
  - `title` (상품명 스냅샷)
  - `quantity` (수량)
  - `price` (단가 - 신규)
  - `total` (총액 - 신규)
  - `unit_price` (단가 - 기존, 호환성)
  - `total_price` (총액 - 기존, 호환성)
  - `selected_options` (JSONB - 선택 옵션)
  - `variant_id` (FK → product_variants)
  - `variant_title`, `sku`, `product_snapshot` (JSONB)
- **중복 컬럼 처리**:
  - price/unit_price 양쪽 모두 저장
  - total/total_price 양쪽 모두 저장
- **작업 통계**:
  - SELECT: 3개 함수
  - INSERT: 2개 함수
  - UPDATE: 1개 함수

### order_shipping
- **사용 페이지**:
  - /checkout (INSERT)
  - /orders (SELECT)
  - /orders/[id]/complete (SELECT)
  - /admin/orders (SELECT)
  - /admin/orders/[id] (SELECT)
- **사용 함수**:
  - createOrder() (INSERT)
  - getOrders() (SELECT)
- **주요 컬럼**:
  - `id` (UUID, PK)
  - `order_id` (FK → orders)
  - `name`, `phone`, `address`, `detail_address`, `postal_code`
  - `delivery_memo`
- **작업 통계**:
  - SELECT: 2개 함수
  - INSERT: 2개 함수
  - UPDATE: 1개 함수 (일괄결제)

### order_payments
- **사용 페이지**:
  - /checkout (INSERT)
  - /orders (SELECT)
  - /orders/[id]/complete (SELECT)
  - /admin/orders (SELECT, UPDATE)
  - /admin/orders/[id] (SELECT, UPDATE)
- **사용 함수**:
  - createOrder() (INSERT)
  - getOrders() (SELECT)
  - updateOrderStatus() (UPDATE)
- **주요 컬럼**:
  - `id` (UUID, PK)
  - `order_id` (FK → orders)
  - `method` (bank_transfer, card, cart)
  - `amount` (결제 금액)
  - `status` (pending, completed, failed)
  - `depositor_name` (입금자명)
- **작업 통계**:
  - SELECT: 2개 함수
  - INSERT: 2개 함수
  - UPDATE: 2개 함수

### products
- **사용 페이지**:
  - / (SELECT)
  - /admin/products (SELECT, UPDATE, INSERT)
  - /admin/products/[id] (SELECT, UPDATE)
  - /admin/products/new (INSERT)
- **사용 함수**:
  - getProducts() (SELECT)
  - getProductById() (SELECT)
  - getAllProducts() (SELECT)
  - addProduct() (INSERT)
  - updateProduct() (UPDATE)
  - updateProductInventory() (UPDATE)
  - deleteProduct() (UPDATE)
- **주요 컬럼**:
  - `id` (UUID, PK)
  - `title`, `description`, `price`, `compare_price`
  - `thumbnail_url`, `seller`, `badge`
  - `status` (active, inactive, deleted)
  - `is_live`, `is_live_active` (라이브 활성화)
  - `inventory` (재고 - Variant 없는 경우)
  - `free_shipping`, `is_featured`
- **작업 통계**:
  - SELECT: 3개 함수
  - INSERT: 1개 함수
  - UPDATE: 4개 함수
  - DELETE: 0개 (soft delete)

### product_variants
- **사용 페이지**:
  - / (SELECT)
  - /checkout (UPDATE - 재고 차감)
  - /admin/products (SELECT)
- **사용 함수**:
  - getProductVariants() (SELECT)
  - createVariant() (INSERT)
  - updateVariantInventory() (UPDATE - FOR UPDATE 잠금)
  - checkVariantInventory() (SELECT)
  - updateOptionInventory() (UPDATE)
- **주요 컬럼**:
  - `id` (UUID, PK)
  - `product_id` (FK → products)
  - `sku` (재고 관리 코드)
  - `inventory` (재고)
  - `price` (옵션별 가격)
  - `is_active` (활성 여부)
  - `options` (JSONB - 옵션 조합)
- **트랜잭션**:
  - FOR UPDATE 잠금 사용 (재고 차감 시)
- **작업 통계**:
  - SELECT: 3개 함수
  - INSERT: 1개 함수
  - UPDATE: 3개 함수

### variant_option_values
- **사용 함수**:
  - getProductVariants() (SELECT - JOIN)
  - createVariant() (INSERT)
  - checkOptionInventory() (SELECT)
  - updateOptionInventory() (SELECT)
- **주요 컬럼**:
  - `id` (UUID, PK)
  - `variant_id` (FK → product_variants)
  - `option_value_id` (FK → product_option_values)
- **역할**: Variant와 옵션값 매핑 (다대다)

### product_options
- **사용 함수**:
  - getProductOptions() (SELECT)
  - createProductOption() (INSERT)
  - checkOptionInventory() (SELECT)
- **주요 컬럼**:
  - `id` (UUID, PK)
  - `product_id` (FK → products)
  - `name` (옵션명, 예: "색상", "사이즈")
  - `position` (정렬 순서)

### product_option_values
- **사용 함수**:
  - createOptionValue() (INSERT)
  - checkOptionInventory() (SELECT)
- **주요 컬럼**:
  - `id` (UUID, PK)
  - `option_id` (FK → product_options)
  - `value` (옵션값, 예: "블랙", "M")
  - `position` (정렬 순서)

### profiles
- **사용 페이지**:
  - /checkout (SELECT)
  - /mypage (SELECT, UPDATE)
  - /admin/customers (SELECT)
  - /admin/customers/[id] (SELECT)
- **사용 함수**:
  - UserProfileManager.atomicProfileUpdate() (UPSERT)
  - getAllCustomers() (SELECT)
  - getUserById() (SELECT)
- **주요 컬럼**:
  - `id` (UUID, PK = auth.users.id)
  - `kakao_id` (카카오 사용자 ID)
  - `name`, `phone`, `nickname`
  - `address`, `detail_address`, `postal_code`
  - `addresses` (JSONB - 배송지 목록, 최대 5개)
- **작업 통계**:
  - SELECT: 3개 함수
  - UPSERT: 1개 함수
  - UPDATE: 직접 호출 (마이페이지)

### categories
- **사용 함수**:
  - getCategories() (SELECT)
- **주요 컬럼**:
  - `id` (UUID, PK)
  - `name`, `slug`, `description`
  - `parent_id` (FK → categories, 계층 구조)

### suppliers
- **사용 함수**:
  - getSuppliers() (SELECT)
  - createSupplier() (INSERT)
  - updateSupplier() (UPDATE)
- **주요 컬럼**:
  - `id` (UUID, PK)
  - `name`, `contact_person`, `phone`, `email`
  - `address`, `notes`

### live_broadcasts (사용 예정)
- **주요 컬럼**:
  - `id` (UUID, PK)
  - `title`, `status`, `viewer_count`
  - `thumbnail_url`, `broadcaster_name`

---

## 🧩 컴포넌트 재사용 맵

### AddressManager
- **파일**: `/Users/jt/live-commerce/app/components/address/AddressManager.js` (추정)
- **사용 페이지**:
  - /checkout
  - /mypage
- **Props**:
  - `userProfile` (required) - 사용자 프로필
  - `selectMode` (optional) - 선택 모드 여부
  - `onUpdate` (optional) - 주소 업데이트 콜백
  - `onSelect` (optional) - 주소 선택 콜백
  - `showPostalCode` (optional, default: true) - 우편번호 표시 여부
- **기능**:
  - 주소 목록 표시
  - 주소 추가/수정/삭제
  - 우편번호 검색 (다음 주소 API)
  - 기본 배송지 설정
  - 도서산간 배송비 계산 및 표시
- **사용 테이블**:
  - `profiles` (SELECT, UPDATE - addresses JSONB)
- **데이터 구조**:
  ```javascript
  {
    id: Date.now(),
    label: '기본 배송지',
    address: '서울시 강남구...',
    detail_address: '101동 202호',
    postal_code: '06000',
    is_default: true,
    created_at: '2025-10-03T...'
  }
  ```

### Header
- **파일**: `/Users/jt/live-commerce/app/components/layout/Header.js` (추정)
- **사용 페이지**:
  - / (홈)
- **기능**:
  - 로고
  - 검색 바
  - 사용자 메뉴 (로그인/로그아웃)

### LiveBanner
- **파일**: `/Users/jt/live-commerce/app/components/layout/LiveBanner.js` (추정)
- **사용 페이지**:
  - / (홈)
- **Props**:
  - `broadcast` - 라이브 방송 정보
- **기능**:
  - 라이브 방송 배너 표시
  - 시청자 수 표시

### ProductGrid
- **파일**: `/Users/jt/live-commerce/app/components/product/ProductGrid.js` (추정)
- **사용 페이지**:
  - / (홈)
- **Props**:
  - `products` - 상품 배열
- **기능**:
  - 상품 그리드 레이아웃
  - 상품 카드 렌더링

### MobileNav
- **파일**: `/Users/jt/live-commerce/app/components/layout/MobileNav.js` (추정)
- **사용 페이지**:
  - / (홈)
  - 기타 사용자 페이지
- **기능**:
  - 하단 네비게이션 바
  - 홈/주문/마이페이지 링크

### CardPaymentModal
- **파일**: `/Users/jt/live-commerce/app/components/common/CardPaymentModal.js` (추정)
- **사용 페이지**:
  - /checkout
- **Props**:
  - `isOpen` - 모달 열림 여부
  - `onClose` - 닫기 콜백
  - `totalAmount` - 총 결제금액
  - `productPrice` - 상품금액
  - `shippingFee` - 배송비
  - `orderItem` - 주문 아이템
  - `userProfile` - 사용자 프로필
  - `selectedAddress` - 선택된 배송지
- **기능**:
  - 카드결제 요청 모달
  - 부가세(10%) 포함 금액 계산
  - 카카오톡 결제 링크 전송 안내

---

## 🎯 기능별 그룹핑

### 주문 관련 기능 (20개)
1. **주문 생성** - createOrder(), createOrderWithOptions()
2. **주문 조회 (사용자)** - getOrders()
3. **주문 조회 (관리자)** - getAllOrders()
4. **주문 상세 조회** - getOrderById()
5. **주문 상태 변경** - updateOrderStatus()
6. **일괄 상태 변경** - updateMultipleOrderStatus()
7. **주문 취소** - cancelOrder()
8. **주문 아이템 수량 변경** - updateOrderItemQuantity()
9. **주문번호 생성** - generateCustomerOrderNumber()
10. **그룹 주문번호 생성** - generateGroupOrderNumber()
11. **체크아웃 페이지** - /checkout
12. **주문 내역 페이지** - /orders
13. **주문 상세 페이지** - /orders/[id]/complete
14. **관리자 주문 목록** - /admin/orders
15. **관리자 주문 상세** - /admin/orders/[id]
16. **입금 관리** - /admin/deposits
17. **발송 관리** - /admin/shipping
18. **일괄결제 처리** - 결제대기 주문 통합
19. **배송비 계산** - formatShippingInfo()
20. **도서산간 배송비** - calculateShippingSurcharge()

### 상품 관련 기능 (18개)
1. **상품 목록 조회 (사용자)** - getProducts()
2. **상품 목록 조회 (관리자)** - getAllProducts()
3. **상품 단일 조회** - getProductById()
4. **상품 등록** - addProduct()
5. **상품 수정** - updateProduct()
6. **상품 삭제** - deleteProduct()
7. **상품 재고 관리** - updateProductInventory()
8. **라이브 상태 변경** - updateProductLiveStatus()
9. **라이브 등록** - addToLive()
10. **라이브 해제** - removeFromLive()
11. **라이브 우선순위** - updateLivePriority()
12. **홈 페이지** - /
13. **관리자 상품 목록** - /admin/products
14. **관리자 상품 상세** - /admin/products/[id]
15. **관리자 상품 등록** - /admin/products/new
16. **라이브 방송 관리** - /admin/broadcasts
17. **카테고리 관리** - /admin/categories
18. **옵션 포함 상품 생성** - createProductWithOptions()

### Variant/옵션 관련 기능 (12개)
1. **Variant 목록 조회** - getProductVariants()
2. **Variant 생성** - createVariant()
3. **Variant 수정** - updateVariant()
4. **Variant 삭제** - deleteVariant()
5. **Variant 재고 확인** - checkVariantInventory()
6. **Variant 재고 차감** - updateVariantInventory()
7. **옵션별 재고 확인** - checkOptionInventory()
8. **옵션별 재고 차감** - updateOptionInventory()
9. **옵션 조회** - getProductOptions()
10. **옵션 생성** - createProductOption()
11. **옵션값 생성** - createOptionValue()
12. **옵션 포함 주문** - createOrderWithOptions()

### 사용자/프로필 관련 기능 (10개)
1. **현재 사용자 조회** - getCurrentUser()
2. **사용자 조회** - getUserById()
3. **전체 고객 조회** - getAllCustomers()
4. **프로필 정규화** - UserProfileManager.normalizeProfile()
5. **프로필 유효성 검사** - UserProfileManager.validateProfile()
6. **프로필 업데이트** - UserProfileManager.atomicProfileUpdate()
7. **프로필 완성도 체크** - UserProfileManager.checkCompleteness()
8. **배송 정보 준비** - UserProfileManager.prepareShippingData()
9. **마이페이지** - /mypage
10. **관리자 고객 관리** - /admin/customers

### 인증 관련 기능 (6개)
1. **로그인** - signIn()
2. **회원가입** - signUp()
3. **로그아웃** - signOut()
4. **로그인 페이지** - /login
5. **회원가입 페이지** - /signup
6. **관리자 로그인** - /admin/login

### 공급업체/발주 관련 기능 (6개)
1. **공급업체 목록** - getSuppliers()
2. **공급업체 생성** - createSupplier()
3. **공급업체 수정** - updateSupplier()
4. **발주 조회** - getPurchaseOrdersBySupplier()
5. **공급업체별 발주** - getPurchaseOrderBySupplier()
6. **공급업체 관리** - /admin/suppliers
7. **발주 관리** - /admin/purchase-orders

### 배송 관련 기능 (5개)
1. **배송비 계산** - formatShippingInfo()
2. **도서산간 판별** - calculateShippingSurcharge()
3. **배송 정보 추출** - ShippingDataManager.extractShippingInfo()
4. **배송 정보 검증** - ShippingDataManager.validateShippingInfo()
5. **배송지 관리** - AddressManager 컴포넌트

---

## 📋 주요 데이터 흐름 패턴

### 1. 주문 생성 플로우
```
사용자 → 상품 선택 → BuyBottomSheet
  ↓
옵션 선택 (selectedOptions)
  ↓
Variant 재고 확인 (checkVariantInventory)
  ↓
Variant 재고 차감 (updateVariantInventory) - FOR UPDATE 잠금
  ↓
sessionStorage.setItem('checkoutItem')
  ↓
router.push('/checkout')
  ↓
체크아웃 페이지 로드
  ↓
사용자 프로필 및 주소 로드 (병렬)
  ↓
배송지 선택 (AddressManager)
  ↓
입금자명 선택 모달
  ↓
createOrder() 호출
  ├── orders INSERT (id, user_id, order_type, status='pending')
  ├── order_items INSERT (title, price, quantity, total, selected_options, variant_id)
  ├── order_shipping INSERT (name, phone, address, postal_code)
  ├── order_payments INSERT (method, amount, depositor_name)
  └── (재고 차감은 이미 완료됨)
  ↓
sessionStorage.setItem('recentOrder')
  ↓
router.replace(`/orders/${orderId}/complete`)
```

### 2. 주문 조회 플로우 (사용자)
```
사용자 → /orders
  ↓
세션 로드 (sessionStorage + useAuth)
  ↓
getOrders(userId) 호출
  ├── 카카오 사용자: order_type LIKE '%KAKAO:${kakao_id}%'
  └── 일반 사용자: user_id = ${userId}
  ↓
order_items, order_shipping, order_payments JOIN
  ↓
payment_group_id 기준 그룹화 (일괄결제)
  ↓
상태별 필터링 (pending/verifying/paid/delivered)
  ↓
결제대기 주문들의 총 금액 계산
  ├── 상품금액 합계
  └── 배송비 (4,000원 고정)
  ↓
UI 렌더링
  ├── 수량 조절 (pending만)
  ├── 개별 결제 버튼
  └── 일괄결제 버튼
```

### 3. 관리자 주문 관리 플로우
```
관리자 → /admin/orders
  ↓
getAllOrders() 호출
  ├── orders SELECT (모든 주문)
  ├── order_items JOIN
  ├── order_shipping JOIN
  ├── order_payments JOIN
  └── profiles JOIN (user_id, kakao_id)
  ↓
payment_group_id 기준 그룹화
  ↓
결제 방법별 탭 필터링
  ├── 결제대기 (pending)
  ├── 계좌이체 (method='bank_transfer' && status='verifying')
  ├── 카드결제 (method='card' && status='verifying')
  ├── 결제완료 (paid)
  └── 발송완료 (delivered)
  ↓
검색 필터 (주문번호, 고객명, 상품명)
  ↓
주문 상태 변경 버튼
  ├── pending → verifying (입금 확인)
  ├── verifying → paid (결제 확인)
  ├── paid → delivered (발송 처리)
  └── cancelled (취소)
  ↓
updateOrderStatus() 호출
  ├── orders.status UPDATE
  ├── 타임스탬프 기록 (verifying_at, paid_at, delivered_at)
  └── order_payments UPDATE (optional)
```

### 4. 프로필 업데이트 플로우
```
사용자 → /mypage → 필드 수정
  ↓
UserProfileManager.atomicProfileUpdate() 호출
  ↓
병렬 업데이트 (Promise.allSettled)
  ├── profiles UPSERT (id, name, phone, address, ...)
  └── auth.users.user_metadata UPDATE
  ↓
카카오 사용자인 경우
  └── sessionStorage.setItem('user', updatedData)
  ↓
UI 상태 업데이트
```

### 5. Variant 재고 차감 플로우
```
주문 생성 시 → updateVariantInventory(variantId, -quantity)
  ↓
FOR UPDATE 잠금 (동시성 제어)
  ↓
SELECT inventory FROM product_variants WHERE id = variantId FOR UPDATE
  ↓
재고 부족 체크 (inventory < quantity)
  ↓
새 재고 계산 (newInventory = current - quantity)
  ↓
UPDATE product_variants SET inventory = newInventory WHERE id = variantId
  ↓
커밋 (잠금 해제)
```

---

## 🔍 특이사항 및 주의점

### 1. 중복 컬럼 처리
- **order_items 테이블**:
  - `price` / `unit_price` (동일 값, 호환성 유지)
  - `total` / `total_price` (동일 값, 호환성 유지)
  - **항상 양쪽 모두 저장 필수!**

### 2. 카카오 사용자 처리
- **user_id**: NULL 가능 (auth.users에 없음)
- **order_type**: `direct:KAKAO:${kakao_id}` 형식
- **주문 조회**: order_type LIKE '%KAKAO:${kakao_id}%'
- **프로필 관리**: sessionStorage + profiles 테이블

### 3. 재고 관리
- **Variant 있는 상품**: `product_variants.inventory` 사용
- **Variant 없는 상품**: `products.inventory` 사용 (하위 호환)
- **동시성 제어**: FOR UPDATE 잠금 사용
- **Double Validation**: Frontend + Backend 재고 검증

### 4. 배송비 계산
- **기본 배송비**: 4,000원
- **도서산간 추가비**:
  - 제주: +3,000원 (63000-63644)
  - 울릉도: +5,000원 (40200-40240)
  - 기타 도서산간: +5,000원
- **결제대기 상태**: 배송비 0원 (아직 결제 전)
- **우편번호 필수**: `postal_code` 컬럼 사용

### 5. 일괄결제
- **payment_group_id**: 동일 그룹 주문 묶음
- **그룹 주문번호**: `GROUP-${paymentGroupId}`
- **상태 변경**: updateMultipleOrderStatus()로 일괄 처리
- **sessionStorage 용량**: 간소화된 데이터만 저장

### 6. 성능 최적화
- **병렬 처리**: Promise.allSettled() 사용
- **옵티미스틱 업데이트**: UI 즉시 반영 → 서버 동기화
- **세션 우선**: sessionStorage 데이터 먼저 사용
- **Variant 병렬 로드**: 여러 상품의 Variant 동시 로드

### 7. 타임스탬프 추적
- **created_at**: 주문 생성 시간
- **updated_at**: 마지막 수정 시간
- **verifying_at**: 결제확인중 전환 시간
- **paid_at**: 결제완료 전환 시간
- **delivered_at**: 발송완료 전환 시간
- **cancelled_at**: 취소 시간

### 8. 로깅
- **이모지 사용**: 🏠(홈), 💰(결제), 🚚(배송), 🕐(시간), ✅(성공), ❌(실패)
- **디버깅**: logger.debug(), logger.info()
- **콘솔 로그**: 주요 계산 값 출력 (배송비, 금액 등)

---

## 🚀 시스템 아키텍처 요약

### 프론트엔드
- **Next.js 15** (App Router)
- **React 18** (Client Components)
- **Tailwind CSS** (스타일링)
- **Framer Motion** (애니메이션)
- **React Hot Toast** (알림)

### 백엔드
- **Supabase** (PostgreSQL + Auth + Realtime)
- **23개 테이블** (정규화된 스키마)
- **47개 API 함수** (lib/supabaseApi.js)

### 상태 관리
- **sessionStorage**: 카카오 사용자 세션
- **useAuth hook**: Supabase Auth 통합
- **useRealtimeProducts hook**: 실시간 상품 구독

### 인증
- **Supabase Auth**: 이메일/비밀번호
- **카카오 OAuth**: 카카오 로그인
- **이중 관리**: sessionStorage + profiles 테이블

### 재고 관리
- **Variant 시스템**: 옵션별 재고 관리
- **FOR UPDATE 잠금**: 동시성 제어
- **Double Validation**: Frontend + Backend

### 결제
- **계좌이체**: 기본 결제 방법
- **카드결제**: 선택적 활성화 (부가세 10%)
- **일괄결제**: 결제대기 주문 통합

### 배송
- **기본 배송비**: 4,000원
- **도서산간 배송비**: 우편번호 기반 자동 계산
- **주소 관리**: AddressManager 컴포넌트 (최대 5개)

---

## 📊 코드 품질 및 유지보수성

### 강점
- **체계적인 구조**: 페이지/함수/컴포넌트 명확한 분리
- **재사용성**: AddressManager, UserProfileManager 등 공통 모듈
- **성능 최적화**: 병렬 처리, 옵티미스틱 업데이트
- **타입 안정성**: JSONB 활용한 유연한 데이터 구조
- **실시간 업데이트**: Supabase Realtime 구독

### 개선 가능 영역
- **TypeScript 도입**: 타입 안정성 강화
- **에러 핸들링**: 통일된 에러 처리 패턴
- **테스트 코드**: 단위 테스트 및 통합 테스트
- **성능 모니터링**: 로그 분석 도구 통합
- **문서화**: JSDoc 주석 추가

---

## 🎓 학습 가이드

### 새로운 개발자를 위한 시작점

1. **프로젝트 구조 이해**
   - `DB_REFERENCE_GUIDE.md` 읽기 (23개 테이블 스키마)
   - `DETAILED_DATA_FLOW.md` 읽기 (8개 주요 페이지)

2. **핵심 파일 탐색**
   - `/app/page.js` - 홈 페이지
   - `/app/checkout/page.js` - 체크아웃
   - `/lib/supabaseApi.js` - API 함수들
   - `/lib/userProfileManager.js` - 사용자 프로필 관리

3. **기능별 학습**
   - 주문 생성: `createOrder()` 함수 분석
   - 재고 관리: `updateVariantInventory()` 분석
   - 프로필 관리: `UserProfileManager` 클래스 분석
   - 배송비 계산: `formatShippingInfo()` 분석

4. **데이터베이스 스키마**
   - `orders` 테이블 구조 이해
   - `order_items` 중복 컬럼 처리 방법
   - `product_variants` Variant 시스템
   - `profiles` 주소 관리 (JSONB)

5. **실습 과제**
   - 새로운 상품 등록 기능 구현
   - 주문 상태 변경 로직 추가
   - 새로운 배송지 추가 기능
   - 프로필 정보 수정 기능

---

**분석 완료일**: 2025-10-03
**분석 도구**: Claude Code (Automated)
**총 분석 시간**: ~30분
**문서 버전**: 1.0
