# FEATURE_CONNECTIVITY_MAP_PART1.md - 주문 + 상품 시스템

**⚠️ 이 파일은 전체 문서의 Part 1입니다**
- **Part 1**: 주문 시스템 + 상품 시스템 ← **현재 파일**
- **Part 2**: 쿠폰 시스템 + 배송 시스템
- **Part 3**: 관리자 시스템 + 발주 시스템

**생성일**: 2025-10-08
**버전**: 1.0
**목적**: 주문 및 상품 관련 기능의 연결성과 데이터 흐름 파악

---

## 📋 목차

1. [주문 생성 시스템 전체 연결성](#1-주문-생성-시스템-전체-연결성)
2. [상품 관리 시스템 전체 연결성](#2-상품-관리-시스템-전체-연결성)
3. [Variant 재고 시스템 전체 연결성](#3-variant-재고-시스템-전체-연결성)
4. [데이터베이스 테이블 연결 다이어그램](#4-데이터베이스-테이블-연결-다이어그램)
5. [함수 체인 (Function Call Chain)](#5-함수-체인-function-call-chain)

---

## 1. 주문 생성 시스템 전체 연결성

### 1.1 주문 생성 전체 흐름 (시작 → 종료)

```
┌─────────────────────────────────────────────────────────────┐
│ 시작: 홈 페이지 (/) - 상품 카드 클릭                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 1단계: BuyBottomSheet 옵션 선택                              │
│                                                              │
│ 입력: product, selectedOptions                               │
│ 처리:                                                        │
│  ├── getProductVariants(productId) - Variant 조회           │
│  ├── findVariant(selectedOptions) - 옵션 매칭               │
│  └── checkVariantInventory(variantId) - 재고 확인           │
│                                                              │
│ 출력: variantId, quantity, availableInventory                │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2단계: 체크아웃 페이지 (/checkout)                           │
│                                                              │
│ 입력: sessionStorage.checkoutItem                            │
│ 처리 (병렬):                                                 │
│  ├── UserProfileManager.getCurrentUser() - 프로필 조회      │
│  ├── loadUserCouponsOptimized() - 쿠폰 목록 조회            │
│  └── formatShippingInfo(baseShipping, postalCode)           │
│      └── calculateShippingSurcharge(postalCode)             │
│          └── 도서산간 배송비 계산                            │
│                                                              │
│ 상호작용:                                                    │
│  ├── AddressManager - 배송지 선택 (우편번호 필수)           │
│  ├── handleApplyCoupon() - 쿠폰 선택                         │
│  │   └── validateCoupon(code, userId, productAmount)        │
│  │       └── DB 함수: validate_coupon() (7단계 검증)        │
│  └── 입금자명 선택 모달                                      │
│                                                              │
│ 출력:                                                        │
│  ├── shippingInfo {baseShipping, surcharge, totalShipping}  │
│  ├── discountAmount (쿠폰 할인)                              │
│  └── finalAmount = productAmount - discount + shipping      │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3단계: 주문 데이터 저장 (createOrder)                        │
│                                                              │
│ DB 작업 순서 (트랜잭션):                                      │
│  1. product_variants (FOR UPDATE) - 재고 잠금               │
│  2. orders (INSERT)                                          │
│     ├── customer_order_number: 'S251003-1234'               │
│     ├── user_id: UUID (일반) or NULL (카카오)               │
│     ├── order_type: 'direct:KAKAO:1234567890'               │
│     ├── status: 'pending'                                    │
│     ├── total_amount: 상품금액 + 배송비                      │
│     └── discount_amount: 쿠폰 할인 금액                      │
│                                                              │
│  3. order_items (INSERT)                                     │
│     ├── title: 주문 시점 상품명 (스냅샷)                     │
│     ├── variant_id: UUID (재고 관리용)                       │
│     ├── selected_options: JSONB (스냅샷)                     │
│     ├── price, unit_price: 단가 (양쪽 모두)                  │
│     └── total, total_price: 총액 (양쪽 모두)                 │
│                                                              │
│  4. order_shipping (INSERT)                                  │
│     ├── postal_code: 우편번호 (필수)                         │
│     └── address, detail_address, name, phone                │
│                                                              │
│  5. order_payments (INSERT)                                  │
│     ├── method: 'bank_transfer'                              │
│     ├── amount: finalAmount                                  │
│     └── depositor_name: 입금자명                             │
│                                                              │
│  6. product_variants (UPDATE) - 재고 차감                    │
│     └── inventory = inventory - quantity                     │
│                                                              │
│  7. products (자동 UPDATE) - 트리거 실행                     │
│     └── inventory = SUM(variant.inventory)                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4단계: 쿠폰 사용 처리 (쿠폰 선택 시)                         │
│                                                              │
│ applyCouponUsage(userId, couponId, orderId, discountAmount) │
│  ↓ calls DB function                                         │
│ use_coupon(p_user_id, p_coupon_id, p_order_id, ...)         │
│  ↓ updates                                                   │
│ user_coupons:                                                │
│  ├── is_used = true                                          │
│  ├── used_at = NOW()                                         │
│  ├── order_id = orderId                                      │
│  └── discount_amount = discountAmount                        │
│  ↓ trigger                                                   │
│ coupons.total_used_count++ (자동)                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 종료: 주문 완료 페이지 (/orders/[id]/complete)              │
│                                                              │
│ 데이터 로딩:                                                 │
│  ├── getOrder(orderId) - 주문 데이터 조회                    │
│  └── formatShippingInfo(4000, postalCode) - 배송비 재계산   │
│                                                              │
│ ⚠️ 중요: DB 저장값 직접 사용 금지!                           │
│  ❌ orderData.payment?.amount (DB 저장값)                    │
│  ✅ OrderCalculations.calculateFinalOrderAmount()           │
│     └── 상품금액 - 쿠폰할인 + 배송비 (정확한 재계산)         │
│                                                              │
│ 표시 내용:                                                   │
│  ├── 주문번호                                                │
│  ├── 주문 상품 (title, quantity, price)                     │
│  ├── 상품 금액 (SUM of items)                                │
│  ├── 쿠폰 할인 (orderData.discount_amount)                   │
│  ├── 배송비 (기본 + 도서산간, formatShippingInfo 사용)       │
│  ├── 최종 결제 금액 (orderCalc.finalAmount) ⭐ 필수          │
│  └── 배송지 정보                                             │
│                                                              │
│ 🐛 2025-10-08 수정: 총 결제금액 계산 오류 해결              │
│  - 문제: DB 저장값 직접 표시 → 잘못된 금액 (₩373,000)       │
│  - 해결: OrderCalculations 사용 → 정확한 금액 (₩1,485,000)  │
│  - 위치: /app/orders/[id]/complete/page.js:788-840          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 주문 조회 흐름 (사용자)

```
┌─────────────────────────────────────────────────────────────┐
│ 시작: 주문 내역 페이지 (/orders)                             │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 1단계: 사용자 인증 확인                                      │
│                                                              │
│ UserProfileManager.getCurrentUser()                          │
│  ↓ checks                                                    │
│ sessionStorage.getItem('user') (카카오 우선)                 │
│  ↓ or                                                        │
│ supabase.auth.getUser() (일반 사용자)                        │
│  ↓ returns                                                   │
│ { id, kakao_id, is_kakao, ... }                              │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2단계: 주문 목록 조회 (RLS 자동 처리)                        │
│                                                              │
│ getOrders()                                                  │
│  ↓ RLS SELECT 정책 자동 적용                                 │
│ 일반 사용자: user_id = auth.uid()                            │
│ 카카오 사용자:                                               │
│  └── order_type LIKE '%KAKAO:' || kakao_id || '%'           │
│  └── get_current_user_kakao_id() 함수 캐싱                   │
│                                                              │
│ JOIN:                                                        │
│  ├── order_items                                             │
│  ├── products                                                │
│  ├── order_shipping (postal_code ⭐ 필수)                    │
│  └── order_payments                                          │
│                                                              │
│ 데이터 매핑:                                                 │
│  └── shipping.postal_code = order_shipping[0].postal_code   │
│      (배송비 계산용, 2025-10-08 추가)                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3단계: 주문 상태별 그룹화 및 표시                            │
│                                                              │
│ 필터링:                                                      │
│  ├── payment_group_id 기준 그룹화 (일괄결제)                 │
│  └── 상태별 필터 (pending/verifying/paid/delivered)         │
│                                                              │
│ ⚠️ 중요: 주문 카드 금액 계산 (각 주문마다)                  │
│  1. formatShippingInfo(4000, order.shipping.postal_code)    │
│     └── 도서산간 배송비 포함 계산                            │
│  2. OrderCalculations.calculateFinalOrderAmount()           │
│     └── 상품 - 쿠폰 + 배송비 = 정확한 총액                   │
│                                                              │
│ 표시:                                                        │
│  ├── 주문번호, 상품명, 수량                                  │
│  ├── 총 입금 금액 (finalAmount) ⭐ DB 저장값 사용 금지!      │
│  ├── 주문 상태 (pending → delivered)                        │
│  └── 타임스탬프 (created_at, paid_at, delivered_at)         │
│                                                              │
│ 🐛 2025-10-08 수정: 주문 카드 금액 계산 오류 해결           │
│  - 문제: 상품 금액만 표시 (배송비 제외)                      │
│  - 해결: OrderCalculations 사용 (배송비 포함)                │
│  - 위치: /app/orders/page.js:600-610, 719                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 상품 관리 시스템 전체 연결성

### 2.1 상품 등록 전체 흐름 (옵션 없는 경우)

```
┌─────────────────────────────────────────────────────────────┐
│ 시작: 관리자 상품 등록 페이지 (/admin/products/new)         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 1단계: 상품 기본 정보 입력                                   │
│                                                              │
│ 입력:                                                        │
│  ├── title: 상품명                                           │
│  ├── price: 가격                                             │
│  ├── inventory: 재고 (옵션 없으면 여기서 관리)               │
│  ├── description: 설명                                       │
│  ├── thumbnail_url: 이미지 URL                               │
│  ├── category_id: 카테고리                                   │
│  └── supplier_id: 공급업체                                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2단계: DB 저장                                               │
│                                                              │
│ addProduct(productData)                                      │
│  ↓ inserts                                                   │
│ products (INSERT)                                            │
│  ├── id: gen_random_uuid()                                   │
│  ├── product_number: 자동 생성 또는 수동 입력               │
│  ├── status: 'active'                                        │
│  ├── is_live: false (기본값)                                 │
│  ├── is_live_active: false (기본값)                          │
│  └── created_at: NOW()                                       │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 종료: 관리자 상품 목록 (/admin/products)                     │
│                                                              │
│ 표시:                                                        │
│  ├── 상품명, 가격, 재고                                      │
│  ├── 카테고리, 공급업체                                      │
│  ├── 라이브 상태 (is_live, is_live_active)                  │
│  └── 상태 (active/inactive/deleted)                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 상품 등록 전체 흐름 (옵션 있는 경우)

```
┌─────────────────────────────────────────────────────────────┐
│ 시작: 관리자 상품 등록 페이지 (/admin/products/new)         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 1단계: 옵션 설정                                             │
│                                                              │
│ 입력:                                                        │
│  옵션 1: 색상 → [블랙, 화이트, 레드]                         │
│  옵션 2: 사이즈 → [S, M, L]                                  │
│                                                              │
│ 자동 계산:                                                   │
│  옵션 조합 = 3 x 3 = 9개 Variant 생성 예정                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2단계: DB 저장 (트랜잭션)                                    │
│                                                              │
│ createProductWithOptions(productData, optionsData)           │
│                                                              │
│ 1. products (INSERT)                                         │
│    └── 상품 마스터 데이터 생성                               │
│                                                              │
│ 2. product_options (INSERT) - 2개                            │
│    ├── { name: '색상', position: 1 }                         │
│    └── { name: '사이즈', position: 2 }                       │
│                                                              │
│ 3. product_option_values (INSERT) - 6개                      │
│    ├── { option_id: 색상, value: '블랙', position: 1 }       │
│    ├── { option_id: 색상, value: '화이트', position: 2 }     │
│    ├── { option_id: 색상, value: '레드', position: 3 }       │
│    ├── { option_id: 사이즈, value: 'S', position: 1 }        │
│    ├── { option_id: 사이즈, value: 'M', position: 2 }        │
│    └── { option_id: 사이즈, value: 'L', position: 3 }        │
│                                                              │
│ 4. generateVariantCombinations() - 옵션 조합 생성            │
│    데카르트 곱 알고리즘:                                     │
│    [블랙, 화이트, 레드] x [S, M, L] = 9개 조합               │
│                                                              │
│ 5. product_variants (INSERT) - 9개                           │
│    ├── { sku: '0005-블랙-S', inventory: 10, options: {...} } │
│    ├── { sku: '0005-블랙-M', inventory: 10, options: {...} } │
│    ├── { sku: '0005-블랙-L', inventory: 10, options: {...} } │
│    ├── { sku: '0005-화이트-S', inventory: 10, ... }          │
│    ├── { sku: '0005-화이트-M', inventory: 10, ... }          │
│    ├── { sku: '0005-화이트-L', inventory: 10, ... }          │
│    ├── { sku: '0005-레드-S', inventory: 10, ... }            │
│    ├── { sku: '0005-레드-M', inventory: 10, ... }            │
│    └── { sku: '0005-레드-L', inventory: 10, ... }            │
│                                                              │
│ 6. variant_option_values (INSERT) - 18개 (9 x 2)            │
│    각 Variant마다 2개의 매핑 레코드:                         │
│    ├── { variant_id: v1, option_value_id: 블랙 }            │
│    ├── { variant_id: v1, option_value_id: S }               │
│    ├── { variant_id: v2, option_value_id: 블랙 }            │
│    ├── { variant_id: v2, option_value_id: M }               │
│    └── ... (총 18개)                                         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 종료: 관리자 상품 상세 페이지 (/admin/products/[id])        │
│                                                              │
│ 표시:                                                        │
│  ├── 상품 기본 정보                                          │
│  ├── 옵션 목록 (색상, 사이즈)                                │
│  ├── Variant 목록 (9개)                                      │
│  │   └── 각 Variant별 SKU, 재고, 가격 표시                  │
│  └── 총 재고: 90개 (10 x 9)                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 상품 노출 (홈 페이지)

```
┌─────────────────────────────────────────────────────────────┐
│ 시작: 관리자가 라이브 활성화                                 │
│                                                              │
│ updateProductLiveStatus(productId, true)                     │
│  ↓ updates                                                   │
│ products:                                                    │
│  ├── is_live = true                                          │
│  └── is_live_active = true                                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 홈 페이지 (/) - useRealtimeProducts hook                     │
│                                                              │
│ getProducts()                                                │
│  ↓ filters                                                   │
│ SELECT * FROM products                                       │
│ WHERE status = 'active'                                      │
│   AND is_live = true                                         │
│   AND is_live_active = true                                  │
│ ORDER BY live_priority ASC, created_at DESC                  │
│                                                              │
│  ↓ parallel (병렬 로드)                                      │
│ 각 상품마다:                                                 │
│  └── getProductVariants(productId)                           │
│      └── 모든 Variant 조회                                   │
│      └── 총 재고 계산 (SUM)                                  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 종료: 홈 페이지 상품 카드 표시                               │
│                                                              │
│ 표시:                                                        │
│  ├── 이미지 (thumbnail_url)                                  │
│  ├── 상품명 (title)                                          │
│  ├── 가격 (price)                                            │
│  ├── 총 재고 (모든 Variant 합계)                             │
│  └── 옵션 정보 (색상 3가지, 사이즈 3가지)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Variant 재고 시스템 전체 연결성

### 3.1 재고 확인 → 차감 → 복원 전체 흐름

```
┌─────────────────────────────────────────────────────────────┐
│ 1단계: 재고 확인 (BuyBottomSheet)                            │
│                                                              │
│ 입력: selectedOptions = { 색상: '블랙', 사이즈: 'M' }        │
│                                                              │
│ checkVariantInventory(productId, selectedOptions)            │
│  ↓ finds                                                     │
│ SELECT v.* FROM product_variants v                           │
│ JOIN variant_option_values vov ON v.id = vov.variant_id     │
│ JOIN product_option_values pov ON vov.option_value_id = ... │
│ WHERE v.product_id = productId                               │
│   AND pov.value IN ('블랙', 'M')                             │
│   AND v.is_active = true                                     │
│ GROUP BY v.id                                                │
│ HAVING COUNT(*) = 2  -- 2개 옵션 모두 일치                   │
│                                                              │
│ 출력:                                                        │
│  ├── available: true                                         │
│  ├── inventory: 50 (재고)                                    │
│  └── variantId: UUID                                         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2단계: 재고 차감 (주문 생성 시)                              │
│                                                              │
│ updateVariantInventory(variantId, -3)  -- 3개 구매          │
│                                                              │
│ DB 작업 (트랜잭션):                                           │
│                                                              │
│ BEGIN;                                                       │
│                                                              │
│ -- 1. 재고 잠금 (동시성 제어)                                │
│ SELECT inventory FROM product_variants                       │
│ WHERE id = variantId                                         │
│ FOR UPDATE;  -- ⭐ 락 획득 (다른 트랜잭션 대기)               │
│                                                              │
│ -- 2. 재고 부족 체크                                         │
│ IF (currentInventory < 3) THEN                               │
│   ROLLBACK;                                                  │
│   RETURN ERROR '재고가 부족합니다';                          │
│ END IF;                                                      │
│                                                              │
│ -- 3. 재고 차감                                              │
│ UPDATE product_variants                                      │
│ SET inventory = inventory - 3                                │
│ WHERE id = variantId;                                        │
│ -- 결과: 50 → 47                                             │
│                                                              │
│ -- 4. 트리거 자동 실행                                       │
│ -- products.inventory = SUM(variant.inventory) 재계산       │
│                                                              │
│ COMMIT;  -- ⭐ 락 해제                                       │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3단계: 재고 복원 (주문 취소 시)                              │
│                                                              │
│ cancelOrder(orderId)                                         │
│  ↓ selects                                                   │
│ order_items 조회 → variant_id, quantity 확인                 │
│  ↓ calls                                                     │
│ updateVariantInventory(variantId, +3)  -- 3개 복원          │
│                                                              │
│ DB 작업 (동일 프로세스):                                      │
│ BEGIN;                                                       │
│ SELECT ... FOR UPDATE;  -- 락 획득                           │
│ UPDATE product_variants SET inventory = inventory + 3;       │
│ -- 결과: 47 → 50                                             │
│ COMMIT;                                                      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 주문 수량 변경 시 재고 처리 (2025-10-07 업데이트)

```
┌─────────────────────────────────────────────────────────────┐
│ 시작: 주문 내역 페이지 - 수량 조정 버튼 클릭                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 1단계: 현재 수량 및 variant_id 조회                          │
│                                                              │
│ SELECT quantity, variant_id                                  │
│ FROM order_items                                             │
│ WHERE id = itemId;                                           │
│                                                              │
│ 출력:                                                        │
│  ├── currentQuantity: 2                                      │
│  └── variantId: UUID (있을 수도 없을 수도)                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2단계: Variant 재고 검증 (variantId가 있는 경우만)           │
│                                                              │
│ IF (variantId) THEN                                          │
│   SELECT inventory FROM product_variants                     │
│   WHERE id = variantId;                                      │
│                                                              │
│   quantityDifference = newQuantity - currentQuantity         │
│   -- 예: 5 - 2 = 3 (3개 더 필요)                             │
│                                                              │
│   IF (quantityDifference > 0) THEN  -- 수량 증가            │
│     IF (inventory < quantityDifference) THEN                 │
│       RETURN ERROR '재고가 부족합니다';                      │
│     END IF;                                                  │
│   END IF;                                                    │
│ END IF;                                                      │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3단계: 재고 업데이트 (variantId가 있는 경우만)               │
│                                                              │
│ updateVariantInventory(variantId, -quantityDifference)       │
│                                                              │
│ 경우 1: 수량 증가 (2 → 5)                                    │
│  └── quantityDifference = 3                                  │
│  └── inventory -= 3 (재고 차감)                              │
│                                                              │
│ 경우 2: 수량 감소 (2 → 1)                                    │
│  └── quantityDifference = -1                                 │
│  └── inventory -= (-1) = inventory + 1 (재고 복구)           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4단계: order_items 업데이트                                  │
│                                                              │
│ UPDATE order_items                                           │
│ SET quantity = newQuantity,                                  │
│     total = price * newQuantity,                             │
│     total_price = price * newQuantity                        │
│ WHERE id = itemId;                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 데이터베이스 테이블 연결 다이어그램

### 4.1 주문 시스템 테이블 관계

```
profiles (사용자)
    ├── id (UUID)
    ├── kakao_id (TEXT)  -- 카카오 사용자 식별
    └── is_admin (BOOLEAN)
        ↓
        │ (FK: user_id, NULL 가능)
        ↓
    orders (주문)
        ├── id (UUID)
        ├── user_id (UUID, NULL 가능)
        ├── order_type (VARCHAR) -- 'direct:KAKAO:1234567890'
        ├── status (VARCHAR) -- 'pending' → 'paid' → 'delivered'
        ├── total_amount (NUMERIC)
        └── discount_amount (NUMERIC) -- 쿠폰 할인
            ↓
            ├───────────────────────────────────┐
            │                                   │
            ↓                                   ↓
        order_items (주문 상품)          order_payments (결제)
            ├── id                           ├── id
            ├── order_id (FK)                ├── order_id (FK)
            ├── product_id (FK)              ├── method
            ├── variant_id (FK) ⭐           ├── amount
            ├── title (스냅샷)                └── depositor_name
            ├── quantity
            ├── price, unit_price
            └── total, total_price
            ↓
            │ (FK: variant_id)
            ↓
        product_variants (변형)          order_shipping (배송)
            ├── id                           ├── id
            ├── product_id (FK)              ├── order_id (FK)
            ├── sku                          ├── postal_code ⭐
            ├── inventory ⭐ (실제 재고)     ├── address
            └── is_active                    └── tracking_number
                ↓
                │ (FK: product_id)
                ↓
            products (상품)
                ├── id
                ├── title
                ├── price
                ├── inventory (참고용)
                ├── is_live
                ├── is_live_active
                ├── category_id (FK)
                └── supplier_id (FK)
```

### 4.2 Variant 시스템 테이블 관계

```
products (상품)
    ├── id (UUID)
    ├── product_number (VARCHAR)
    └── inventory (NUMERIC) -- 참고용 (트리거로 자동 업데이트)
        ↓
        │ (FK: product_id)
        ↓
    product_options (옵션)
        ├── id (UUID)
        ├── product_id (FK)
        ├── name (TEXT) -- '색상', '사이즈'
        └── position (INT)
            ↓
            │ (FK: option_id)
            ↓
        product_option_values (옵션값)
            ├── id (UUID)
            ├── option_id (FK)
            ├── value (TEXT) -- '블랙', 'M'
            └── position (INT)
                ↓
                │ (매핑)
                ↓
            variant_option_values (매핑 테이블)
                ├── variant_id (FK)
                └── option_value_id (FK)
                    ↓
                    │ (FK: variant_id)
                    ↓
                product_variants (변형 상품)
                    ├── id (UUID)
                    ├── product_id (FK)
                    ├── sku (VARCHAR) -- '0005-블랙-M'
                    ├── inventory (INT) ⭐ 실제 재고
                    ├── price_adjustment (NUMERIC)
                    └── is_active (BOOLEAN)
```

---

## 5. 함수 체인 (Function Call Chain)

### 5.1 주문 생성 함수 체인

```javascript
// 프론트엔드 (BuyBottomSheet)
handleBuyNow()
  ↓ calls
  getProductVariants(productId)
    ↓ returns
    [ { id, sku, inventory, options: {...} }, ... ]
  ↓ calls
  findVariant(selectedOptions)
    ↓ returns
    { variantId, inventory, sku }
  ↓ calls
  checkVariantInventory(variantId, quantity)
    ↓ returns
    { available: true/false, inventory: number }
  ↓ if (available)
  sessionStorage.setItem('checkoutItem', { variantId, quantity, ... })
  ↓
  router.push('/checkout')

// 프론트엔드 (체크아웃 페이지)
useEffect(() => {
  loadCheckoutData()
    ↓ parallel
    ├── UserProfileManager.getCurrentUser()
    ├── loadUserCouponsOptimized()
    └── formatShippingInfo(baseShipping, postalCode)
})

handleCheckout()
  ↓ calls
  createOrder(orderData, userProfile, depositName)
    ↓ DB (트랜잭션)
    ├── BEGIN
    ├── product_variants FOR UPDATE (재고 잠금)
    ├── orders INSERT
    ├── order_items INSERT (variant_id, title, price 등)
    ├── order_shipping INSERT (postal_code 필수)
    ├── order_payments INSERT (depositor_name)
    ├── product_variants UPDATE (재고 차감)
    └── COMMIT
  ↓ if (couponId)
  applyCouponUsage(userId, couponId, orderId, discountAmount)
    ↓ calls DB function
    use_coupon(p_user_id, p_coupon_id, p_order_id, p_discount_amount)
      ↓ updates
      user_coupons (is_used=true, used_at, order_id)
      ↓ trigger
      coupons.total_used_count++
  ↓
  router.push(`/orders/${orderId}/complete`)
```

### 5.2 상품 등록 함수 체인 (옵션 있는 경우)

```javascript
// 프론트엔드 (관리자 상품 등록)
handleSubmit()
  ↓ calls
  createProductWithOptions(productData, optionsData)
    ↓ DB (트랜잭션)
    ├── BEGIN
    ├── products INSERT → productId
    ├── product_options INSERT (여러 개) → optionIds[]
    ├── product_option_values INSERT (각 옵션의 값들) → optionValueIds[]
    ├── generateVariantCombinations(optionsData)
    │     ↓ 데카르트 곱 알고리즘
    │     [ [블랙, S], [블랙, M], [블랙, L], ... ]
    ├── product_variants INSERT (각 조합마다)
    │     ├── { sku: '0005-블랙-S', inventory: 10 }
    │     ├── { sku: '0005-블랙-M', inventory: 10 }
    │     └── ... (9개)
    ├── variant_option_values INSERT (매핑, 18개)
    │     ├── { variant_id: v1, option_value_id: 블랙 }
    │     ├── { variant_id: v1, option_value_id: S }
    │     └── ... (총 18개 = 9 variants x 2 옵션)
    └── COMMIT
  ↓
  router.push(`/admin/products/${productId}`)
```

### 5.3 재고 확인 및 차감 함수 체인

```javascript
// 재고 확인
checkVariantInventory(productId, selectedOptions)
  ↓ queries DB
  SELECT v.*, v.inventory
  FROM product_variants v
  JOIN variant_option_values vov ON v.id = vov.variant_id
  JOIN product_option_values pov ON vov.option_value_id = pov.id
  WHERE v.product_id = productId
    AND pov.value IN (selectedOptions.values)
    AND v.is_active = true
  GROUP BY v.id
  HAVING COUNT(*) = optionsCount
  ↓ returns
  { available: boolean, inventory: number, variantId: UUID }

// 재고 차감
updateVariantInventory(variantId, -quantity)
  ↓ DB (트랜잭션)
  BEGIN;
    ↓ 1. 재고 잠금
    SELECT inventory FROM product_variants
    WHERE id = variantId
    FOR UPDATE;  -- ⭐ 다른 트랜잭션 대기
    ↓ 2. 재고 부족 체크
    IF (currentInventory < quantity) THEN
      ROLLBACK;
      THROW ERROR '재고가 부족합니다';
    END IF;
    ↓ 3. 재고 차감
    UPDATE product_variants
    SET inventory = inventory - quantity
    WHERE id = variantId;
    ↓ 4. 트리거 자동 실행
    -- products.inventory 재계산
  COMMIT;  -- ⭐ 락 해제
```

---

## 🎯 Claude용 체크리스트

### 주문 생성 시 필수 확인 사항

```
✅ Variant 재고 확인 (checkVariantInventory)
✅ FOR UPDATE 잠금 사용 (updateVariantInventory)
✅ order_items 컬럼:
   ├── title (주문 시점 상품명 스냅샷)
   ├── variant_id (재고 관리 참조)
   ├── selected_options (JSONB 스냅샷)
   ├── price, unit_price (양쪽 모두 저장)
   └── total, total_price (양쪽 모두 저장)
✅ orders 컬럼:
   ├── order_type ('direct:KAKAO:1234567890' 형식)
   ├── discount_amount (쿠폰 할인)
   └── total_amount (상품 + 배송비)
✅ order_shipping.postal_code (도서산간 배송비 필수)
✅ order_payments.depositor_name (입금자명)
✅ 쿠폰 사용 처리 (applyCouponUsage)
✅ 트랜잭션 사용 (전체 성공 또는 전체 롤백)
```

### 주문 금액 계산 시 필수 확인 사항 ⚠️ 중요!

```
✅ OrderCalculations 모듈 사용 (필수!)
   ├── import OrderCalculations from '@/lib/orderCalculations'
   └── OrderCalculations.calculateFinalOrderAmount(items, options)

✅ DB 저장값 직접 사용 금지!
   ❌ orderData.payment?.amount (저장 시점 금액, 변경 가능)
   ❌ orderData.total_amount (저장 시점 금액, 변경 가능)
   ✅ OrderCalculations로 재계산 (항상 정확)

✅ 금액 표시 페이지:
   ├── /orders/[id]/complete (주문 완료)
   ├── /orders (주문 내역)
   ├── /admin/orders (관리자 주문 목록)
   └── /admin/orders/[id] (관리자 주문 상세)

✅ 계산 요소:
   ├── 상품 금액: SUM(items.total_price)
   ├── 쿠폰 할인: orderData.discount_amount
   ├── 배송비: formatShippingInfo(baseShipping, postalCode).totalShipping
   └── 최종 금액: 상품 - 쿠폰 + 배송비

⚠️ 2025-10-08 버그 수정 사례:
   - 문제: 주문 완료 페이지에서 DB 저장값(payment.amount) 직접 표시
   - 증상: 총 결제금액 ₩373,000 (실제: ₩1,485,000)
   - 해결: OrderCalculations.calculateFinalOrderAmount() 사용
   - 영향: /app/orders/[id]/complete/page.js:788-840
```

### 옵션 상품 등록 시 필수 확인 사항

```
✅ product_options 생성 (name, position)
✅ product_option_values 생성 (value, position)
✅ 옵션 조합 자동 생성 (데카르트 곱)
✅ product_variants 생성 (각 조합마다)
   ├── sku 자동 생성 ('제품번호-옵션값1-옵션값2')
   ├── inventory 초기값 설정
   └── is_active = true
✅ variant_option_values 매핑 (각 variant마다 옵션값 개수만큼)
✅ 트랜잭션 사용
✅ 조합 수 검증 (너무 많으면 경고)
```

### Variant 재고 관리 시 필수 확인 사항

```
✅ FOR UPDATE 잠금 사용 (동시성 제어)
✅ 재고 부족 체크 (currentInventory >= quantity)
✅ 음수 재고 방지
✅ 재고 차감 로직:
   ├── 주문 생성: updateVariantInventory(variantId, -quantity)
   ├── 주문 취소: updateVariantInventory(variantId, +quantity)
   └── 수량 변경: updateVariantInventory(variantId, -quantityDifference)
✅ 트리거 자동 실행 (products.inventory 재계산)
✅ 에러 처리 및 사용자 알림
```

---

## 📝 최근 수정 이력

### 2025-10-08 (오후 - 최신)
- **주문 내역 페이지 금액 표시 버그 수정** ⭐
  - 문제: 주문 카드에 상품 금액만 표시 (배송비 제외)
  - 증상: ₩1,476,000 표시 (실제 입금 필요: ₩1,485,000)
  - 해결: `OrderCalculations + formatShippingInfo` 사용
  - 영향:
    - `/app/orders/page.js:600-610, 719` (주문 카드 금액 계산)
    - `/lib/supabaseApi.js:1272` (shipping.postal_code 추가)

- **주문 완료 페이지 금액 계산 버그 수정**
  - 문제: DB 저장값(`payment.amount`) 직접 표시 → 잘못된 금액 표시
  - 해결: `OrderCalculations.calculateFinalOrderAmount()` 사용
  - 영향: `/app/orders/[id]/complete/page.js:788-840`
  - 체크리스트 추가: "주문 금액 계산 시 필수 확인 사항" 섹션

### 2025-10-08 (오전)
- 문서 생성
  - 주문 생성 시스템 전체 연결성
  - 상품 관리 시스템 전체 연결성
  - Variant 재고 시스템 전체 연결성
  - 데이터베이스 테이블 연결 다이어그램
  - 함수 체인 (Function Call Chain)

---

**마지막 업데이트**: 2025-10-08 (오후 - 최신)
**작성자**: Claude (AI Assistant)
**버전**: 1.2
