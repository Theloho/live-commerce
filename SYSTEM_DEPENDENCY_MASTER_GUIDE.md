# 🗺️ 시스템 종속성 문서 마스터 가이드

> **목적**: 모든 종속성 문서(Part 1-5)의 완전한 목차와 사용 방법
> **대상**: Claude, 개발자
> **버전**: 1.0
> **최종 업데이트**: 2025-10-20

---

## 📖 문서 구조 개요

```
시스템 종속성 문서 = 5개 Part로 구성

Part 1: 중앙 함수 종속성 맵 (41개 함수)
  ↓ 어떤 함수가 어디서 사용되는가?

Part 2: DB 테이블 사용처 맵 (16개 테이블)
  ↓ 어떤 테이블이 어디서 사용되는가?

Part 3: API 엔드포인트 종속성 맵 (28개 API)
  ↓ 어떤 API가 어디서 사용되는가?

Part 4: 페이지별 종속성 맵 (25개 페이지)
  ↓ 어떤 페이지가 무엇을 사용하는가?

Part 5: 수정 영향도 매트릭스 (79개 시나리오)
  ↓ 무엇을 수정하면 어디를 확인해야 하는가?
```

**핵심 원칙**: "한 곳을 수정하면 영향받는 모든 곳을 찾아서 함께 수정해야 한다"

---

## 🎯 빠른 시작 가이드

### 상황별 문서 선택

| 상황 | 읽어야 할 문서 | 목적 |
|------|---------------|------|
| **특정 함수 수정 전** | Part 1 → Part 5-1 | 함수 사용처 파악 + 수정 체크리스트 |
| **DB 테이블 변경 전** | Part 2 → Part 5-2 | 테이블 사용처 파악 + 마이그레이션 체크리스트 |
| **API 변경 전** | Part 3 → Part 5-3 | API 호출처 파악 + 수정 체크리스트 |
| **페이지 수정 전** | Part 4 → Part 5-4 | 페이지 종속성 파악 + 수정 체크리스트 |
| **버그 발견 시** | Part 4 (문제 페이지) → 역순 추적 | 데이터 흐름 역추적 |
| **신규 기능 추가 시** | Part 1-4 모두 + Part 5 (추가 시나리오) | 유사 기능 패턴 확인 |

### 기본 워크플로우

```
1. 🎯 무엇을 수정하려고 하는가?
   ↓
2. 📚 해당 Part 문서 읽기 (Part 1-4 중 하나)
   ↓ "사용처"와 "종속성" 파악

3. 📋 Part 5 해당 시나리오 읽기
   ↓ 체크리스트 획득

4. ✅ 체크리스트 따라 작업
   ↓ 영향받는 모든 곳 수정

5. ✅ 검증 체크리스트 확인
   ↓ 놓친 곳 없는지 최종 확인

6. ✅ 완료!
```

---

## 📚 전체 목차 (Complete Table of Contents)

### Part 1: 중앙 함수 종속성 맵

**⚠️ 2025-10-21 분할**: Part 1 문서가 크기 제한으로 인해 2개로 분할되었습니다.

#### Part 1 (유틸리티): SYSTEM_DEPENDENCY_COMPLETE_PART1.md
**총 47개 유틸리티 함수** - lib 폴더 중앙화 모듈

- Section 1: orderCalculations.js (11개 메서드)
- Section 2: couponApi.js (15개 함수)
- Section 3: shippingUtils.js (2개 함수)
- Section 4: UserProfileManager.js (12개 메서드)
- Section 5: fulfillmentGrouping.js (4개 함수)
- Section 6: logisticsAggregation.js (3개 함수)

**문서 크기**: ~1,800줄 ✅

#### Part 1_2 (Repository): SYSTEM_DEPENDENCY_COMPLETE_PART1_2.md
**총 7개 Repository 메서드** - Infrastructure Layer

- Section 7: OrderRepository.js (7개 메서드) - Phase 1.1 ✅
- Section 8-10: ProductRepository, UserRepository, CouponRepository (향후 추가 예정)

**문서 크기**: ~250줄 ✅

---

### Part 2: DB 테이블 사용처 맵 (SYSTEM_DEPENDENCY_COMPLETE_PART2.md)

**총 16개 테이블** - Supabase PostgreSQL

#### Section 1: 핵심 주문 테이블
- 1.1 **orders** - 주문 메인 테이블
  - 사용 페이지: 8개 (checkout, orders, admin/orders 등)
  - 사용 API: 6개 (createOrder, getOrders 등)
  - RLS 정책: SELECT, INSERT, UPDATE

- 1.2 **order_items** - 주문 상품 상세
  - 사용 페이지: 6개
  - 사용 API: 4개
  - RLS 정책: SELECT, INSERT, UPDATE

- 1.3 **order_payments** - 주문 결제 정보
  - 사용 페이지: 5개
  - 사용 API: 3개
  - RLS 정책: SELECT, INSERT, UPDATE

- 1.4 **order_shipping** - 주문 배송 정보
  - 사용 페이지: 6개
  - 사용 API: 3개
  - RLS 정책: SELECT, INSERT, UPDATE

#### Section 2: 상품 관리 테이블
- 2.1 **products** - 상품 메인 테이블
- 2.2 **product_variants** - 상품 옵션별 재고
- 2.3 **product_options** - 상품 옵션 (색상, 사이즈)
- 2.4 **product_option_values** - 옵션값 (빨강, M, L)
- 2.5 **variant_option_values** - Variant-옵션 매핑

#### Section 3: 사용자 관리 테이블
- 3.1 **profiles** - 사용자 프로필
- 3.2 **user_coupons** - 사용자별 쿠폰 보유

#### Section 4: 기타 테이블
- 4.1 **coupons** - 쿠폰 마스터
- 4.2 **suppliers** - 공급업체
- 4.3 **purchase_order_batches** - 발주 배치
- 4.4 **categories** - 상품 카테고리
- 4.5 **live_broadcasts** - 라이브 방송

---

### Part 3: API 엔드포인트 종속성 맵 (SYSTEM_DEPENDENCY_COMPLETE_PART3.md)

**총 28개 API** - Next.js App Router API Routes

#### Section 1: 주문 API (app/api/orders/)
- 1.1 **POST /api/orders/create** - 주문 생성
  - 사용 페이지: checkout
  - 사용 DB: orders, order_items, order_payments, order_shipping, user_coupons
  - 사용 함수: createOrder(), applyCouponUsage()

- 1.2 **GET /api/orders** - 주문 목록 조회
  - 사용 페이지: orders, mypage
  - 사용 DB: orders (JOIN order_items, order_shipping, order_payments)
  - 사용 함수: getOrders()

- 1.3 **GET /api/orders/[id]** - 주문 상세 조회
  - 사용 페이지: orders/[id]/complete
  - 사용 DB: orders (JOIN all)
  - 사용 함수: getOrderById()

- 1.4 **PATCH /api/orders/[id]** - 주문 수정 (수량, 배송지)
  - 사용 페이지: orders
  - 사용 DB: orders, order_items, order_shipping
  - 사용 함수: updateOrderQuantity()

- 1.5 **DELETE /api/orders/[id]** - 주문 취소
  - 사용 페이지: orders
  - 사용 DB: orders, product_variants (재고 복원)
  - 사용 함수: cancelOrder()

#### Section 2: 관리자 API (app/api/admin/)
- 2.1 **GET /api/admin/orders** - 관리자 주문 목록
- 2.2 **PATCH /api/admin/orders/[id]/status** - 주문 상태 변경
- 2.3 **GET /api/admin/products** - 상품 목록
- 2.4 **POST /api/admin/products** - 상품 생성
- 2.5 **GET /api/admin/purchase-orders** - 발주 목록
- 2.6 **POST /api/admin/purchase-orders/[supplierId]** - 발주서 생성
- 2.7 **POST /api/admin/coupons/create** - 쿠폰 생성 (Service Role)
- 2.8 **POST /api/admin/coupons/distribute** - 쿠폰 배포 (Service Role)
- 2.9 **POST /api/admin/check-profile** - 관리자 프로필 확인 (Service Role)

#### Section 3: 상품 API (app/api/products/)
- 3.1 **GET /api/products** - 상품 목록
- 3.2 **GET /api/products/[id]** - 상품 상세

#### Section 4: 쿠폰 API (app/api/coupons/)
- 4.1 **GET /api/coupons** - 쿠폰 목록
- 4.2 **POST /api/coupons/validate** - 쿠폰 검증

#### Section 5: 인증 API (app/api/auth/)
- 5.1 **GET /api/auth/callback** - Supabase 콜백
- 5.2 **GET /api/auth/kakao/callback** - 카카오 콜백

(더 많은 API... 총 28개)

---

### Part 4: 페이지별 종속성 맵 (SYSTEM_DEPENDENCY_COMPLETE_PART4.md)

**총 25개 페이지** - Next.js App Router Pages

#### Section 1: 사용자 페이지 (app/)

**1.1 홈페이지 (app/page.js)**
- **사용 DB**: products (ISR로 서버 fetch)
- **사용 함수**: -
- **사용 API**: -
- **종속성**: HomeClient 컴포넌트
- **특징**: ISR 적용 (revalidate: 300초)

**1.2 상품 상세 (app/products/[id]/page.js)**
- **사용 DB**: products, product_variants
- **사용 함수**: -
- **사용 API**: /api/products/[id]
- **종속성**: ProductDetailClient 컴포넌트

**1.3 체크아웃 (app/checkout/page.js)**
- **사용 DB**: orders, order_items, order_payments, order_shipping, user_coupons
- **사용 함수**:
  - OrderCalculations.calculateFinalOrderAmount()
  - formatShippingInfo()
  - validateCoupon()
  - applyCouponUsage()
  - createOrder()
- **사용 API**:
  - POST /api/orders/create
  - POST /api/coupons/validate
- **종속성**: BuyBottomSheet, AddressManager
- **특징**: 가장 복잡한 페이지 (8개 함수 + 2개 API + 5개 DB)

**1.4 주문 목록 (app/orders/page.js)**
- **사용 DB**: orders, order_items
- **사용 함수**:
  - getOrders()
  - updateOrderQuantity()
  - cancelOrder()
  - formatShippingInfo()
- **사용 API**:
  - GET /api/orders
  - PATCH /api/orders/[id]
  - DELETE /api/orders/[id]

**1.5 주문 완료 (app/orders/[id]/complete/page.js)**
- **사용 DB**: orders (JOIN all)
- **사용 함수**:
  - getOrderById()
  - OrderCalculations.calculateFinalOrderAmount()
  - formatShippingInfo()
- **사용 API**: GET /api/orders/[id]

**1.6 마이페이지 (app/mypage/page.js)**
- **사용 DB**: profiles, user_coupons, orders
- **사용 함수**:
  - getUserProfile()
  - updateUserProfile()
  - getOrders()
- **사용 API**:
  - GET /api/auth/session
  - PATCH /api/user/profile

#### Section 2: 관리자 페이지 (app/admin/)

**2.1 관리자 주문 목록 (app/admin/orders/page.js)**
- **사용 DB**: orders (JOIN all)
- **사용 함수**: getOrders() (관리자용)
- **사용 API**: GET /api/admin/orders
- **특징**: 서버 사이드 필터링 (status, paymentMethod)

**2.2 관리자 주문 상세 (app/admin/orders/[id]/page.js)**
- **사용 DB**: orders (JOIN all)
- **사용 함수**:
  - getOrderById()
  - updateOrderStatus()
- **사용 API**:
  - GET /api/admin/orders/[id]
  - PATCH /api/admin/orders/[id]/status

**2.3 입금확인 (app/admin/deposits/page.js)**
- **사용 DB**: orders, order_payments
- **사용 함수**: getOrders() (status=verifying)
- **사용 API**: GET /api/admin/orders?status=verifying

**2.4 발송 관리 (app/admin/fulfillment/page.js)**
- **사용 DB**: orders (status=deposited)
- **사용 함수**: fulfillmentGrouping.js
- **사용 API**: GET /api/admin/orders?status=deposited

**2.5 발주 관리 (app/admin/purchase-orders/page.js)**
- **사용 DB**: orders (status=deposited,paid), suppliers
- **사용 함수**: getPurchaseOrders()
- **사용 API**: GET /api/admin/purchase-orders

**2.6 발주 상세 (app/admin/purchase-orders/[supplierId]/page.js)**
- **사용 DB**: orders (업체별 필터), suppliers
- **사용 함수**: createPurchaseBatch()
- **사용 API**:
  - GET /api/admin/purchase-orders/[supplierId]
  - POST /api/admin/purchase-orders/[supplierId]

**2.7 상품 목록 (app/admin/products/page.js)**
- **사용 DB**: products
- **사용 함수**: getProducts()
- **사용 API**: GET /api/admin/products

**2.8 상품 등록 (app/admin/products/new/page.js)**
- **사용 DB**: products, product_variants, suppliers, categories
- **사용 함수**: createProduct()
- **사용 API**: POST /api/admin/products

**2.9 쿠폰 목록 (app/admin/coupons/page.js)**
- **사용 DB**: coupons, user_coupons
- **사용 함수**: getCoupons()
- **사용 API**: GET /api/admin/coupons

**2.10 쿠폰 생성 (app/admin/coupons/new/page.js)**
- **사용 DB**: coupons
- **사용 함수**: createCoupon()
- **사용 API**: POST /api/admin/coupons/create (Service Role)

**2.11 쿠폰 배포 (app/admin/coupons/[id]/page.js)**
- **사용 DB**: coupons, user_coupons, profiles
- **사용 함수**: distributeCoupon(), distributeToAllCustomers()
- **사용 API**: POST /api/admin/coupons/distribute (Service Role)

(더 많은 페이지... 총 25개)

---

### Part 5: 수정 영향도 매트릭스 (SYSTEM_DEPENDENCY_COMPLETE_PART5.md + Part 5-1 ~ 5-4)

**총 79개 수정 시나리오** - 체크리스트 기반

#### Part 5 INDEX (SYSTEM_DEPENDENCY_COMPLETE_PART5.md)
- 전체 목차
- 사용 방법
- 빠른 참조 테이블
- 수정 작업 4대 원칙

#### Part 5-1: 중앙 함수 수정 시나리오

**⚠️ 2025-10-21 분할**: Part 5-1 문서가 크기 제한으로 인해 2개로 분할되었습니다.

##### Part 5-1 (유틸리티): SYSTEM_DEPENDENCY_COMPLETE_PART5_1.md
**Section 1-6** - 유틸리티 함수 수정 시나리오

- Section 1: OrderCalculations 수정 (8개 시나리오)
- Section 2: formatShippingInfo 수정 (1개 시나리오)
- Section 3: UserProfileManager 수정 (4개 시나리오)
- Section 4: Coupon API 수정 (5개 시나리오)
- Section 5: 신규 함수 추가 시 (1개 시나리오)
- Section 6: OrderRepository 수정 (7개 시나리오) - Phase 1.1 ✅

**문서 크기**: ~1,800줄 ✅

##### Part 5-1_2 (Repository): SYSTEM_DEPENDENCY_COMPLETE_PART5_1_2.md
**Section 7-9** - Repository 수정 시나리오

- Section 7: ProductRepository 수정 (4개 시나리오) - Phase 1.2 ✅
- Section 8: UserRepository 수정 (2개 시나리오) - Phase 1.3 ✅
- Section 9: CouponRepository 수정 (4개 시나리오) - Phase 1.4 ✅

**문서 크기**: ~380줄 ✅

#### Part 5-2: DB 테이블 수정 시나리오 (SYSTEM_DEPENDENCY_COMPLETE_PART5_2.md)

**Section 1: orders 테이블 수정 (3개 시나리오)**
- 1.1 컬럼 추가 시 (예: discount_amount 추가)
- 1.2 컬럼 삭제 시
- 1.3 컬럼 타입 변경 시

**Section 2: order_items 테이블 수정 (3개 시나리오)**
- 2.1 컬럼 추가 시
- 2.2 컬럼 삭제 시
- 2.3 컬럼 타입 변경 시

**Section 3: order_payments 테이블 수정 (3개 시나리오)**
**Section 4: order_shipping 테이블 수정 (3개 시나리오)**
**Section 5: products 테이블 수정 (3개 시나리오)**
**Section 6: product_variants 테이블 수정 (3개 시나리오)**
**Section 7: profiles 테이블 수정 (3개 시나리오)**
**Section 8: user_coupons 테이블 수정 (3개 시나리오)**

**Section 9: RLS 정책 수정 (4개 시나리오)**
- 9.1 SELECT 정책 수정 시
- 9.2 INSERT 정책 수정 시
- 9.3 UPDATE 정책 수정 시
- 9.4 Service Role 전환 시 (RLS 우회)

**Section 10: DB 인덱스 수정 (2개 시나리오)**
- 10.1 인덱스 추가 시 (성능 최적화)
- 10.2 복합 인덱스 추가 시

**총 26개 시나리오**

#### Part 5-3: API 엔드포인트 수정 시나리오 (SYSTEM_DEPENDENCY_COMPLETE_PART5_3.md)

**Section 1: 주문 생성 API 수정 (3개 시나리오)**
- 1.1 Request 파라미터 변경 시
- 1.2 Response 형식 변경 시
- 1.3 비즈니스 로직 변경 시

**Section 2: 주문 조회 API 수정 (3개 시나리오)**
- 2.1 쿼리 파라미터 추가 시
- 2.2 JOIN 로직 변경 시
- 2.3 필터링 로직 변경 시

**Section 3: 주문 상태 변경 API 수정 (2개 시나리오)**
- 3.1 상태 전환 로직 변경 시
- 3.2 타임스탬프 자동 기록 변경 시

**Section 4: 관리자 API 수정 (3개 시나리오)**
- 4.1 권한 검증 로직 변경 시
- 4.2 필터링 로직 추가 시 (서버 사이드)
- 4.3 JOIN 조건 변경 시

**Section 5: Service Role API 추가 (1개 시나리오)**
- 5.1 RLS 우회가 필요한 새 API 추가 시

**Section 6: 인증 API 변경 (2개 시나리오)**
- 6.1 세션 검증 로직 변경 시
- 6.2 카카오 콜백 로직 변경 시

**Section 7: Response 형식 변경 (1개 시나리오)**
- 7.1 API 응답 형식 통일 시

**총 15개 시나리오**

#### Part 5-4: 페이지 수정 시나리오 (SYSTEM_DEPENDENCY_COMPLETE_PART5_4.md)

**Section 1: 체크아웃 페이지 수정 (4개 시나리오)**
- 1.1 주문 생성 로직 변경 시
- 1.2 쿠폰 적용 로직 변경 시
- 1.3 배송비 계산 로직 변경 시
- 1.4 결제 정보 입력 변경 시

**Section 2: 주문 목록/상세 페이지 수정 (4개 시나리오)**
- 2.1 주문 목록 필터링 변경 시
- 2.2 주문 수량 변경 로직 수정 시
- 2.3 주문 취소 로직 수정 시
- 2.4 주문 상세 표시 변경 시

**Section 3: 관리자 주문 관리 수정 (4개 시나리오)**
- 3.1 주문 목록 필터링 변경 시
- 3.2 주문 상태 변경 로직 수정 시
- 3.3 입금확인 프로세스 변경 시
- 3.4 발송 관리 프로세스 변경 시

**Section 4: 상품 관리 수정 (3개 시나리오)**
- 4.1 상품 목록 표시 변경 시
- 4.2 상품 등록 로직 변경 시
- 4.3 상품 수정 로직 변경 시

**Section 5: 새 페이지 추가 (1개 시나리오)**
- 5.1 새로운 페이지 추가 시

**Section 6: 공통 컴포넌트 수정 (2개 시나리오)**
- 6.1 BuyBottomSheet 수정 시
- 6.2 AddressManager 수정 시

**Section 7: 전역 상태 관리 변경 (2개 시나리오)**
- 7.1 Zustand Store 변경 시
- 7.2 Context API 변경 시

**총 20개 시나리오**

---

## 🔍 상세 사용 가이드

### 1. 함수를 수정해야 할 때

#### 예시: calculateFinalOrderAmount() 수정

```
Step 1: Part 1에서 함수 찾기
  → Section 1.1 calculateFinalOrderAmount()
  → 사용처 확인: 7곳 (checkout, orders/complete, admin 등)

Step 2: Part 5-1에서 시나리오 찾기
  → Section 1.1 "calculateFinalOrderAmount() 수정 시"
  → 체크리스트 획득:
    ✅ 1. 사용처 7곳 파악
    ✅ 2. 파라미터 변경 시 모든 호출처 수정
    ✅ 3. 반환값 변경 시 사용처 영향 확인
    ... (15개 항목)

Step 3: 체크리스트 따라 작업
  → checkout/page.js (line 583, 641, 1380) 수정
  → orders/[id]/complete/page.js (line 788) 수정
  ... (7곳 모두 수정)

Step 4: 검증
  → 7개 페이지 모두 테스트
  → 금액 계산 정확성 확인
  → 쿠폰 할인 적용 확인
```

**핵심**: Part 1 (사용처) + Part 5-1 (체크리스트) 조합

---

### 2. DB 테이블을 변경해야 할 때

#### 예시: orders 테이블에 discount_amount 컬럼 추가

```
Step 1: Part 2에서 테이블 찾기
  → Section 1.1 orders 테이블
  → 사용 페이지: 8곳
  → 사용 API: 6곳
  → 사용 함수: createOrder(), getOrders() 등

Step 2: Part 5-2에서 시나리오 찾기
  → Section 1.1 "orders 테이블 컬럼 추가 시"
  → 체크리스트 획득:
    ✅ 1. 마이그레이션 파일 생성
    ✅ 2. RLS 정책 확인 (INSERT, UPDATE에 컬럼 포함?)
    ✅ 3. 기본값 설정
    ✅ 4. createOrder() 함수 수정
    ✅ 5. 사용 페이지 모두 확인 (8곳)
    ... (20개 항목)

Step 3: 체크리스트 따라 작업
  → 마이그레이션: 20251004_add_discount_to_orders.sql
  → RLS 정책: 20251004_fix_rls_update_policies.sql
  → supabaseApi.js - createOrder() 수정
  → checkout/page.js - discount_amount 저장
  → orders/[id]/complete/page.js - 표시 추가
  ... (8개 페이지 확인)

Step 4: 검증
  → DB 마이그레이션 성공 확인
  → 주문 생성 테스트 (discount_amount 저장?)
  → 주문 상세 표시 확인
  → RLS 정책 작동 확인 (UPDATE 시 저장되는가?)
```

**핵심**: Part 2 (사용처) + Part 5-2 (체크리스트) 조합

**⚠️ 주의**: DB 변경은 RLS 정책도 함께 확인 필수!

---

### 3. API를 변경해야 할 때

#### 예시: POST /api/orders/create - Request 파라미터 추가

```
Step 1: Part 3에서 API 찾기
  → Section 1.1 POST /api/orders/create
  → 호출 페이지: checkout/page.js
  → 사용 DB: orders, order_items, order_payments, order_shipping
  → 사용 함수: createOrder()

Step 2: Part 5-3에서 시나리오 찾기
  → Section 1.1 "주문 생성 API - Request 파라미터 변경 시"
  → 체크리스트 획득:
    ✅ 1. API Route 파일 수정
    ✅ 2. Request Body 검증 추가
    ✅ 3. 호출하는 페이지 수정 (checkout)
    ✅ 4. createOrder() 함수 시그니처 확인
    ... (12개 항목)

Step 3: 체크리스트 따라 작업
  → /app/api/orders/create/route.js - 파라미터 추가
  → /lib/supabaseApi.js - createOrder() 파라미터 추가
  → /app/checkout/page.js - API 호출 시 파라미터 전달
  → 타입스크립트 있다면 타입 정의 수정

Step 4: 검증
  → 체크아웃 페이지 테스트
  → Network 탭에서 Request Body 확인
  → API 응답 200 확인
  → DB에 저장 확인
```

**핵심**: Part 3 (사용처) + Part 5-3 (체크리스트) 조합

---

### 4. 페이지를 수정해야 할 때

#### 예시: 체크아웃 페이지 - 쿠폰 적용 로직 변경

```
Step 1: Part 4에서 페이지 찾기
  → Section 1.3 체크아웃 (app/checkout/page.js)
  → 사용 함수: 8개 (calculateFinalOrderAmount, validateCoupon 등)
  → 사용 API: 2개 (POST /api/orders/create, POST /api/coupons/validate)
  → 사용 DB: 5개 (orders, order_items, order_payments, order_shipping, user_coupons)

Step 2: Part 5-4에서 시나리오 찾기
  → Section 1.2 "체크아웃 페이지 - 쿠폰 적용 로직 변경 시"
  → 체크리스트 획득:
    ✅ 1. validateCoupon() 함수 확인 (변경 필요?)
    ✅ 2. applyCouponDiscount() 함수 확인
    ✅ 3. applyCouponUsage() 호출 확인
    ✅ 4. user_coupons 테이블 UPDATE 확인
    ... (18개 항목)

Step 3: 역참조 (필요 시)
  → validateCoupon() 수정 필요? → Part 1 Section 4.3 + Part 5-1 Section 4.1
  → user_coupons 테이블 변경 필요? → Part 2 Section 3.2 + Part 5-2 Section 8

Step 4: 체크리스트 따라 작업
  → /app/checkout/page.js - 쿠폰 적용 로직 수정
  → /lib/couponApi.js - validateCoupon() 수정 (필요 시)
  → /lib/orderCalculations.js - applyCouponDiscount() 수정 (필요 시)

Step 5: 검증
  → 체크아웃 페이지 테스트
  → 쿠폰 적용 → 할인 금액 확인
  → 주문 생성 → user_coupons.is_used = true 확인
  → 마이페이지 → "사용 완료" 탭에 쿠폰 확인
```

**핵심**: Part 4 (종속성) + Part 5-4 (체크리스트) + 역참조 조합

---

### 5. 버그를 발견했을 때 (역추적)

#### 예시: 체크아웃 시 쿠폰 할인이 저장 안 됨

```
Step 1: 문제 페이지 확인
  → 체크아웃 페이지에서 주문 생성
  → DB 확인: orders.discount_amount = 0 (❌ 잘못됨)

Step 2: Part 4에서 페이지 찾기
  → Section 1.3 체크아웃
  → 사용 함수: createOrder(), applyCouponUsage()
  → 사용 API: POST /api/orders/create

Step 3: 역추적 1 - API 확인
  → Part 3 Section 1.1 - POST /api/orders/create
  → API Route 코드 확인: discount_amount 파라미터 전달하는가?
  → 결과: ✅ 전달함

Step 4: 역추적 2 - 함수 확인
  → Part 1 Section 5.1 - createOrder()
  → 함수 코드 확인: discount_amount INSERT 하는가?
  → 결과: ✅ INSERT 함

Step 5: 역추적 3 - DB 확인
  → Part 2 Section 1.1 - orders 테이블
  → discount_amount 컬럼 존재하는가?
  → 결과: ✅ 존재함

Step 6: 역추적 4 - RLS 정책 확인
  → Part 5-2 Section 9.2 - INSERT 정책 확인
  → RLS 정책에 discount_amount 포함되어 있는가?
  → 결과: ❌ 없음! (문제 발견!)

Step 7: 수정
  → Part 5-2 Section 9.2 체크리스트 따라 RLS 정책 수정
  → 마이그레이션: 20251004_fix_rls_update_policies.sql

Step 8: 검증
  → 체크아웃 → 주문 생성
  → DB 확인: orders.discount_amount = 10000 (✅ 성공!)
```

**핵심**: Part 4 (출발점) → Part 3 (API) → Part 1 (함수) → Part 2 (DB) 역추적

---

## 🚀 실전 사용 시나리오

### 시나리오 A: 새로운 기능 추가 (예: 포인트 적립 시스템)

```
Phase 1: 유사 기능 조사 (쿠폰 시스템 참고)
  → Part 1 Section 4 - Coupon API 패턴 확인
  → Part 2 Section 3.2 - user_coupons 테이블 구조 확인
  → Part 3 Section 4 - 쿠폰 API 패턴 확인
  → Part 4 Section 1.2 - 체크아웃 쿠폰 적용 로직 확인

Phase 2: 설계
  → DB: user_points 테이블 추가 (user_coupons 참고)
  → 함수: pointApi.js 생성 (couponApi.js 참고)
  → API: /api/points/* 추가 (쿠폰 API 참고)
  → 페이지: 체크아웃에 포인트 적용 추가

Phase 3: 구현 (Part 5 체크리스트 사용)
  → Part 5-2 Section 10 - 신규 테이블 추가 체크리스트
  → Part 5-1 Section 5 - 신규 함수 추가 체크리스트
  → Part 5-3 Section 5 - 신규 API 추가 체크리스트
  → Part 5-4 Section 1.2 - 체크아웃 로직 변경 체크리스트

Phase 4: 문서 업데이트
  → Part 1에 pointApi.js 추가
  → Part 2에 user_points 테이블 추가
  → Part 3에 포인트 API 추가
  → Part 4 체크아웃 페이지 종속성 추가
  → Part 5에 포인트 관련 시나리오 추가
```

**핵심**: 유사 기능 참고 → 설계 → 체크리스트 따라 구현 → 문서 업데이트

---

### 시나리오 B: 성능 최적화 (예: 주문 목록 로딩 느림)

```
Phase 1: 문제 페이지 분석
  → Part 4 Section 1.4 - 주문 목록 페이지
  → 사용 API: GET /api/orders
  → 사용 함수: getOrders()

Phase 2: API 분석
  → Part 3 Section 1.2 - GET /api/orders
  → 쿼리 로직: orders JOIN order_items JOIN order_shipping JOIN order_payments
  → 의심: N+1 쿼리? 서브쿼리 중복?

Phase 3: DB 분석
  → Part 2 Section 1.1 - orders 테이블
  → RLS 정책 확인: SELECT 정책에 서브쿼리 있는가?
  → 인덱스 확인: user_id, order_type 인덱스 있는가?

Phase 4: 최적화 작업 (Part 5 체크리스트 사용)
  → Part 5-2 Section 9.1 - SELECT 정책 최적화
    - 헬퍼 함수 생성: get_current_user_kakao_id()
    - 인덱스 추가: profiles(id, kakao_id), orders.order_type
  → Part 5-3 Section 2.2 - JOIN 로직 변경
    - N+1 쿼리 제거, 단일 JOIN 쿼리로 변경

Phase 5: 검증
  → 쿼리 시간 측정: 3초 → 0.5초 (6배 향상!)
  → 영향받는 페이지 모두 테스트
    - orders/page.js
    - admin/orders/page.js
    - mypage/page.js
```

**핵심**: Part 4 (페이지) → Part 3 (API) → Part 2 (DB) → Part 5 (최적화 체크리스트)

---

### 시나리오 C: 긴급 버그 수정 (예: RLS 정책 문제)

```
Phase 1: 증상 확인
  → PATCH /api/orders/[id] - 204 성공
  → DB 확인: 실제로 저장 안 됨 (0 rows updated)

Phase 2: API 확인
  → Part 3 Section 1.4 - PATCH /api/orders/[id]
  → 사용 함수: updateOrderQuantity()

Phase 3: 함수 확인
  → Part 1 Section 5.4 - updateOrderQuantity()
  → 코드: .update({ quantity }) 실행
  → 결과: ✅ 코드는 정상

Phase 4: DB RLS 정책 확인 (의심!)
  → Part 2 Section 1.2 - order_items 테이블
  → RLS 정책 확인: UPDATE 정책 있는가?
  → 결과: ❌ UPDATE 정책 없음! (문제 발견!)

Phase 5: 긴급 수정 (Part 5 체크리스트)
  → Part 5-2 Section 9.3 - UPDATE 정책 추가 체크리스트
  → 마이그레이션 생성: 20251004_fix_order_items_rls.sql
  → RLS 정책 추가:
    CREATE POLICY "사용자는 자기 주문의 아이템만 수정 가능"
    ON order_items FOR UPDATE
    USING (is_order_owner(order_id))

Phase 6: 배포 및 검증
  → 마이그레이션 실행
  → 수량 변경 테스트 → ✅ 성공!
  → DB 확인: quantity 변경됨 ✅
```

**핵심**: 증상 → API → 함수 → DB → RLS 정책 순차 확인 + Part 5 체크리스트

---

## 📊 빠른 참조 테이블

### Top 10 자주 수정하는 항목

| 순위 | 항목 | 타입 | 문서 위치 | Part 5 시나리오 |
|------|------|------|----------|----------------|
| 1 | calculateFinalOrderAmount() | 함수 | Part 1-1.1 | Part 5-1-1.1 |
| 2 | orders 테이블 | DB | Part 2-1.1 | Part 5-2-1 |
| 3 | POST /api/orders/create | API | Part 3-1.1 | Part 5-3-1 |
| 4 | checkout/page.js | 페이지 | Part 4-1.3 | Part 5-4-1 |
| 5 | formatShippingInfo() | 함수 | Part 1-2.1 | Part 5-1-2.1 |
| 6 | validateCoupon() | 함수 | Part 1-4.3 | Part 5-1-4.1 |
| 7 | user_coupons 테이블 | DB | Part 2-3.2 | Part 5-2-8 |
| 8 | GET /api/orders | API | Part 3-1.2 | Part 5-3-2 |
| 9 | orders/page.js | 페이지 | Part 4-1.4 | Part 5-4-2 |
| 10 | RLS UPDATE 정책 | DB | Part 2-1 | Part 5-2-9.3 |

### 자주 발생하는 버그 패턴

| 버그 타입 | 원인 | 확인 문서 | 해결 체크리스트 |
|----------|------|----------|----------------|
| **PATCH 204 성공하지만 DB 저장 안 됨** | RLS UPDATE 정책 누락 | Part 2 (해당 테이블) | Part 5-2 Section 9.3 |
| **함수 수정했는데 일부 페이지만 반영** | 사용처 일부만 수정 | Part 1 (해당 함수) | Part 5-1 (해당 함수) |
| **API 파라미터 추가했는데 에러** | 호출하는 페이지 미수정 | Part 3 (해당 API) | Part 5-3 Section 1.1 |
| **DB 컬럼 추가했는데 INSERT 실패** | RLS INSERT 정책 미반영 | Part 2 (해당 테이블) | Part 5-2 Section 9.2 |
| **카카오 사용자 주문 조회 0개** | order_type 매칭 실패 | Part 2-1.1 + Part 5-2-9.1 | RLS SELECT 정책 수정 |
| **쿠폰 사용 완료 처리 안 됨** | applyCouponUsage() 미호출 | Part 1-4.4 + Part 4-1.3 | Part 5-4-1.2 |
| **주문 목록 로딩 느림** | N+1 쿼리, 서브쿼리 중복 | Part 3-1.2 + Part 2-1.1 | Part 5-2-9.1, Part 5-2-10.1 |
| **관리자 로그인 불가** | RLS 정책에 관리자 예외 없음 | Part 2 (profiles) | Part 5-2-9 (관리자 예외 추가) |

---

## 🛠️ 수정 작업 4대 원칙

### 원칙 1: "한 곳을 수정하면 영향받는 모든 곳을 찾아라"

**Bad ❌:**
```javascript
// lib/orderCalculations.js
// calculateFinalOrderAmount()에 파라미터 추가
calculateFinalOrderAmount(items, shipping, coupon, points) { ... }

// checkout/page.js만 수정
const total = calculateFinalOrderAmount(items, shipping, coupon, points)

// ❌ orders/[id]/complete/page.js는 수정 안 함 → 버그 발생!
```

**Good ✅:**
```javascript
// Part 1-1.1에서 사용처 확인: 7곳
// Part 5-1-1.1 체크리스트 따라 모든 사용처 수정

// 1. checkout/page.js
const total = calculateFinalOrderAmount(items, shipping, coupon, points)

// 2. orders/[id]/complete/page.js
const total = calculateFinalOrderAmount(items, shipping, coupon, points)

// ... (7곳 모두 수정) ✅
```

---

### 원칙 2: "DB 변경 시 RLS 정책도 함께 확인하라"

**Bad ❌:**
```sql
-- 마이그레이션: discount_amount 컬럼만 추가
ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(12,2) DEFAULT 0;

-- ❌ RLS UPDATE 정책 수정 안 함 → 저장 안 됨!
```

**Good ✅:**
```sql
-- 마이그레이션 1: 컬럼 추가
ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(12,2) DEFAULT 0;

-- 마이그레이션 2: RLS 정책 확인 및 수정 (Part 5-2 Section 9.3)
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  USING (user_id = auth.uid() OR order_type LIKE '%' || get_current_user_kakao_id() || '%')
  -- ✅ WITH CHECK도 추가하여 discount_amount 저장 허용
  WITH CHECK (user_id = auth.uid() OR order_type LIKE '%' || get_current_user_kakao_id() || '%');
```

---

### 원칙 3: "함수 시그니처 변경 시 모든 호출처를 수정하라"

**Bad ❌:**
```javascript
// lib/shippingUtils.js - 파라미터 추가
export function formatShippingInfo(baseShipping, postalCode, weight) { ... }

// checkout/page.js만 수정
const info = formatShippingInfo(3000, postalCode, weight)

// ❌ orders/page.js는 수정 안 함 → 에러 발생!
const info = formatShippingInfo(3000, postalCode) // weight 누락
```

**Good ✅:**
```javascript
// Part 1-2.1에서 사용처 확인: 6곳
// Part 5-1-2.1 체크리스트 따라 작업

// 1. lib/shippingUtils.js
export function formatShippingInfo(baseShipping, postalCode, weight = 0) { ... }
// ✅ 기본값 설정으로 하위 호환성 유지

// 2. checkout/page.js
const info = formatShippingInfo(3000, postalCode, weight)

// 3. orders/page.js
const info = formatShippingInfo(3000, postalCode, 0) // 기본값 명시

// ... (6곳 모두 확인) ✅
```

---

### 원칙 4: "API 변경 시 호출하는 페이지와 사용하는 DB를 함께 확인하라"

**Bad ❌:**
```javascript
// app/api/orders/create/route.js - Request 파라미터 추가
const { items, shipping, payment, discountAmount } = await req.json()

// ❌ checkout/page.js 수정 안 함 → discountAmount undefined
// ❌ createOrder() 함수 시그니처 수정 안 함 → 파라미터 미전달
```

**Good ✅:**
```javascript
// Part 3-1.1에서 확인:
// - 호출 페이지: checkout/page.js
// - 사용 함수: createOrder()
// - 사용 DB: orders 테이블

// Part 5-3-1.1 체크리스트 따라 작업:

// 1. API Route 수정
const { items, shipping, payment, discountAmount } = await req.json()

// 2. createOrder() 함수 시그니처 수정
await createOrder({ items, shipping, payment, discountAmount })

// 3. checkout/page.js 수정
const response = await fetch('/api/orders/create', {
  body: JSON.stringify({ items, shipping, payment, discountAmount })
})

// 4. orders 테이블 확인 (Part 2-1.1)
// discount_amount 컬럼 존재? ✅
// RLS INSERT 정책 확인? ✅
```

---

## 🔗 문서 간 크로스 레퍼런스 패턴

### 패턴 1: 함수 → 페이지
```
Part 1 Section 1.1: calculateFinalOrderAmount()
  → 사용처: checkout/page.js (lines 583, 641, 1380)

Part 4 Section 1.3: checkout/page.js
  → 사용 함수: calculateFinalOrderAmount() (Part 1 Section 1.1)
```

### 패턴 2: 페이지 → API → 함수 → DB
```
Part 4 Section 1.3: checkout/page.js
  → 사용 API: POST /api/orders/create (Part 3 Section 1.1)

Part 3 Section 1.1: POST /api/orders/create
  → 사용 함수: createOrder() (Part 1 Section 5.1)

Part 1 Section 5.1: createOrder()
  → 사용 DB: orders, order_items, order_payments, order_shipping (Part 2 Section 1)
```

### 패턴 3: DB → RLS → API
```
Part 2 Section 1.1: orders 테이블
  → RLS 정책: SELECT, INSERT, UPDATE

Part 5-2 Section 9.3: UPDATE 정책 수정 시
  → 영향받는 API: PATCH /api/orders/[id] (Part 3 Section 1.4)
  → 영향받는 페이지: orders/page.js (Part 4 Section 1.4)
```

---

## 🎓 학습 경로 (신규 개발자용)

### Step 1: 시스템 구조 이해 (1-2시간)
1. Part 4 먼저 읽기 (페이지별 종속성)
   - 어떤 페이지가 있는지 파악
   - 각 페이지가 무엇을 하는지 이해

2. Part 1 훑어보기 (중앙 함수)
   - 어떤 함수들이 있는지 파악
   - 각 함수의 역할 이해

3. Part 2 훑어보기 (DB 테이블)
   - 어떤 테이블이 있는지 파악
   - 각 테이블의 역할 이해

### Step 2: 데이터 흐름 이해 (2-3시간)
1. 주요 사용자 시나리오 추적
   - 체크아웃 → 주문 생성 (Part 4-1.3 → Part 3-1.1 → Part 1-5.1 → Part 2-1)
   - 주문 목록 조회 (Part 4-1.4 → Part 3-1.2 → Part 1-5.2 → Part 2-1)
   - 주문 상태 변경 (Part 4-2.2 → Part 3-2.2 → Part 1-5.3 → Part 2-1)

### Step 3: Part 5 체크리스트 활용법 익히기 (1-2시간)
1. Part 5 INDEX 읽기 - 전체 구조 파악
2. 간단한 수정 시나리오 연습 (Part 5-1 Section 1.5 - calculateTotalQuantity)
3. 복잡한 수정 시나리오 연습 (Part 5-4 Section 1.2 - 쿠폰 적용 로직)

### Step 4: 실전 적용 (지속적)
1. 실제 버그 수정 시 문서 참조
2. 새 기능 추가 시 유사 기능 참조
3. 문서 업데이트 (새로운 함수/API/페이지 추가 시)

---

## 📝 문서 업데이트 가이드

### 새 함수 추가 시
```
1. Part 1에 함수 추가
   - 섹션 번호 부여 (예: Section 6.1)
   - 함수 정의, 파라미터, 반환값, 사용처 기록

2. Part 5-1에 수정 시나리오 추가
   - 체크리스트 작성 (수정 전, 작업, 수정 후)
   - 크로스 레퍼런스 추가

3. 관련 페이지 Part 4 업데이트
   - 사용 함수 목록에 추가
```

### 새 테이블 추가 시
```
1. Part 2에 테이블 추가
   - 섹션 번호 부여
   - 컬럼, RLS 정책, 사용처 기록

2. Part 5-2에 수정 시나리오 추가
   - 컬럼 추가/삭제/변경 체크리스트
   - RLS 정책 체크리스트

3. 관련 API Part 3 업데이트
   - 사용 DB 목록에 추가
```

### 새 API 추가 시
```
1. Part 3에 API 추가
   - 섹션 번호 부여
   - Request, Response, 사용처 기록

2. Part 5-3에 수정 시나리오 추가
   - 파라미터 변경, 로직 변경 체크리스트

3. 관련 페이지 Part 4 업데이트
   - 사용 API 목록에 추가
```

### 새 페이지 추가 시
```
1. Part 4에 페이지 추가
   - 섹션 번호 부여
   - 사용 함수, API, DB, 컴포넌트 기록

2. Part 5-4에 수정 시나리오 추가
   - 페이지 수정 체크리스트

3. 역참조 업데이트
   - Part 1: 사용되는 함수 사용처에 페이지 추가
   - Part 2: 사용되는 테이블 사용처에 페이지 추가
   - Part 3: 사용되는 API 호출처에 페이지 추가
```

---

## ⚠️ 주의사항

### 1. 문서 크기 제한
- 각 Part 파일: **25,000 토큰 이하** 유지
- Claude가 읽을 수 없으면 문서 의미 없음
- 초과 시 PART 분할 (Part 5처럼)

### 2. 문서 동기화
- 코드 수정 시 **반드시** 문서도 업데이트
- 문서-코드 불일치 = 잘못된 수정 = 버그 발생

### 3. 크로스 레퍼런스 정확성
- 섹션 번호 변경 시 모든 참조 업데이트
- 검색 기능 활용: `Part 1 Section X.X`

### 4. 체크리스트 완성도
- 체크리스트는 실제 작업 경험 기반으로 작성
- 새로운 버그 발견 시 체크리스트에 추가

---

## 🔥 긴급 상황 대응

### 프로덕션 버그 발생 시
```
1. Part 4에서 문제 페이지 찾기 (5초)
2. 사용 API 확인 → Part 3 (10초)
3. 사용 함수 확인 → Part 1 (10초)
4. 사용 DB 확인 → Part 2 (10초)
5. Part 5 해당 시나리오 체크리스트 (30초)
6. 체크리스트 따라 수정 (5-10분)
7. 배포

총 소요 시간: 10-15분
```

### RLS 정책 문제 시
```
1. 증상: API 204 성공하지만 DB 저장 안 됨
2. Part 2에서 해당 테이블 찾기
3. RLS 정책 확인 (SELECT, INSERT, UPDATE, DELETE)
4. Part 5-2 Section 9 체크리스트
5. 마이그레이션 생성 및 배포

총 소요 시간: 5분
```

---

## 📞 지원 및 문의

- **문서 작성자**: Claude (Anthropic)
- **최종 업데이트**: 2025-10-20
- **버전**: 1.0
- **저장소**: /Users/jt/live-commerce

---

## 📚 관련 문서

- **CLAUDE.md** - Claude 작업 가이드
- **CODING_RULES.md** - 코딩 규칙 (중복 로직 금지, 중앙화 강제)
- **DB_REFERENCE_GUIDE.md** - DB 스키마 상세
- **DETAILED_DATA_FLOW.md** - 페이지별 데이터 흐름
- **FEATURE_REFERENCE_MAP_PARTX.md** - 기능별 참조 맵

---

## 🎯 최종 정리

**이 문서의 목적:**
> "임기응변으로 소스 코드를 엉망으로 만드는 것을 방지한다"

**사용 방법:**
1. 무엇을 수정하려고 하는가? → 해당 Part 문서 찾기
2. 사용처와 종속성 파악
3. Part 5 체크리스트 획득
4. 체크리스트 따라 작업 (영향받는 모든 곳 수정)
5. 검증

**핵심 원칙:**
- ✅ 한 곳을 수정하면 영향받는 모든 곳을 함께 수정
- ✅ DB 변경 시 RLS 정책도 함께 확인
- ✅ 함수 시그니처 변경 시 모든 호출처 수정
- ✅ API 변경 시 호출 페이지와 사용 DB 확인

**결과:**
- 🚫 버그 발생률 최소화
- ⚡ 수정 시간 단축 (평균 50%)
- 📚 체계적인 코드베이스 유지
- 🎯 정확한 영향도 분석

---

**이 문서를 읽었다면, 이제 Part 1-5를 자유롭게 탐색할 수 있습니다!** 🎉
