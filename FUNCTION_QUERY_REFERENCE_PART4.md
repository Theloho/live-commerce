# 📊 함수/쿼리 참조 매트릭스 - PART4

**버전**: 1.1
**파일**: PART4 (통계 + Domain + Use Cases)
**작성일**: 2025-10-21

---

## ⚠️ 안내

이 파일은 `FUNCTION_QUERY_REFERENCE.md` (인덱스)의 일부입니다.

**파일 구조**:
- INDEX (FUNCTION_QUERY_REFERENCE.md) - 전체 목차 및 사용법
- PART1 - 섹션 1-2 (상품 + Variant)
- PART2 - 섹션 3-8 (주문 + 사용자 + 기타)
- PART3 - 섹션 9-11 (중앙화 모듈 + 레거시)
- **PART4 (이 파일)** - 섹션 12-15 (통계 + Domain + Use Cases)

**⚠️ 파일 크기 제한**: 25,000 토큰 이하 유지

---

## 📊 12. 함수 통계 요약

### 12.1 파일별 함수 개수

| 파일명 | 함수 개수 | 평균 라인 수 | 상태 |
|--------|-----------|--------------|------|
| `lib/supabaseApi.js` | **43개** | ~62 lines/함수 | ⚠️ God Object |
| `lib/orderCalculations.js` | 11개 | ~15 lines/함수 | ✅ Clean |
| `lib/couponApi.js` | 15개 | ~36 lines/함수 | ✅ Clean |
| `lib/userProfileManager.js` | 2개 | ~259 lines/함수 | ⚠️ 큰 함수 |
| `lib/shippingUtils.js` | 2개 | ~25 lines/함수 | ✅ Clean |
| `lib/logisticsAggregation.js` | 3개 | ~63 lines/함수 | ✅ Clean |
| `lib/fulfillmentGrouping.js` | 2개 | ~80 lines/함수 | ✅ Clean |
| `lib/trackingNumberUtils.js` | 6개 | ~50 lines/함수 | ✅ Clean |
| `lib/services/QueueService.js` | **2개** | ~20 lines/함수 | ✅ Clean |
| `lib/services/CacheService.js` | **3개** | ~15 lines/함수 | ✅ Clean |
| `supabase/migrations/*.sql` (RPC) | **2개** | ~60 lines/함수 | ✅ Clean |
| `lib/domain/order/Order.js` | **10개** | ~8 lines/메서드 | ✅ Clean |
| `lib/domain/order/OrderCalculator.js` | **6개** | ~20 lines/메서드 | ✅ Clean |
| `lib/domain/order/OrderValidator.js` | **4개** | ~30 lines/메서드 | ✅ Clean |
| `lib/domain/product/Product.js` | **9개** | ~10 lines/메서드 | ✅ Clean |
| `lib/domain/product/Inventory.js` | **9개** | ~12 lines/메서드 | ✅ Clean |

**총 메서드 개수**: **130개** (91 + 10 Order Entity + 6 Calculator + 4 Validator + 9 Product Entity + 9 Inventory + 1 CreateOrderUseCase + 1 GetOrdersUseCase)
**레거시 함수**: 11개 (삭제 예정)
**유효 메서드**: **119개** (80 + 10 Order Entity + 6 Calculator + 4 Validator + 9 Product Entity + 9 Inventory + 2 Use Cases)

---

### 12.2 카테고리별 함수 분류

| 카테고리 | 함수 개수 | Repository | Use Case | Domain |
|----------|-----------|------------|----------|--------|
| 상품 (Product) | 8개 | ProductRepository (8) | - | - |
| 옵션/Variant | 10개 | VariantRepository (9) | - | ProductNumber (1) |
| 주문 (Order) | 10개 | OrderRepository (7) | CreateOrder, CancelOrder, UpdateQuantity (3) | OrderNumber (1) |
| 사용자 (User) | 3개 | UserRepository (3) | - | - |
| 공급업체 (Supplier) | 3개 | SupplierRepository (3) | - | - |
| 발주 (PurchaseOrder) | 2개 | - | GetPurchaseOrders, GetDetail (2) | - |
| 카테고리 (Category) | 1개 | CategoryRepository (1) | - | - |
| 라이브 방송 (Live) | 5개 | LiveRepository (5) | - | - |
| 쿠폰 (Coupon) | 6개 | CouponRepository (6) | - | - |
| 배송 (Shipping) | 2개 | - | - | ShippingCalculator (2) |
| 물류 (Logistics) | 3개 | - | - | LogisticsAggregator (3) |
| 배송 취합 (Fulfillment) | 2개 | - | - | FulfillmentGrouper (2) |
| 송장 (Tracking) | 6개 | - | TrackingService (6) | - |
| 주문 계산 (OrderCalc) | 5개 | - | - | OrderCalculations (5) |
| Queue | 2개 | - | QueueService (2) | - |
| Cache | 3개 | - | CacheService (3) | - |
| 동시성 제어 (Concurrency) | 2개 | RPC Functions (2) | - | - |
| **주문 도메인 (Order Domain)** | **20개** | - | - | **Order Entity (10) + OrderCalculator (6) + OrderValidator (4)** |
| **상품 도메인 (Product Domain)** | **18개** | - | - | **Product Entity (9) + Inventory (9)** |
| **Application Layer** | **2개** | - | **CreateOrderUseCase (1) + GetOrdersUseCase (1)** | - |

**총 119개 메서드 → 31개 파일로 분산 예정** (26 + 5 Domain + 2 Application)

---

## 🎨 12.3 Domain Entities (Phase 2 - Domain Layer)

### Order Entity ✅ (Phase 2.1 완료 - 2025-10-21)

| 항목 | 내용 |
|------|------|
| **파일 위치** | `lib/domain/order/Order.js` |
| **목적** | 주문 도메인 모델 (비즈니스 로직 + 검증) |
| **상속** | `Entity` (Base Entity) |
| **파일 크기** | 143줄 (Rule 1 준수 ✅, 제한: 150줄) |
| **마이그레이션** | Phase 2.1 완료 (2025-10-21) |

#### 주문 상태 (OrderStatus)
- PENDING - 입금 대기
- VERIFYING - 입금 확인 중
- DEPOSITED - 입금 완료
- SHIPPED - 발송 완료
- DELIVERED - 배송 완료
- CANCELLED - 취소됨

#### 메서드 목록 (10개)

| 메서드 | 타입 | 목적 | 반환값 |
|--------|------|------|--------|
| `constructor()` | 생성자 | Order Entity 생성 | Order |
| `validate()` | 검증 | 필수 필드 + 상태 + 금액 검증 | void (에러 던짐) |
| `canBeCancelled()` | 비즈니스 규칙 | 취소 가능 여부 (pending/verifying만) | boolean |
| `isPending()` | 상태 확인 | 입금 대기 상태 여부 | boolean |
| `isVerifying()` | 상태 확인 | 입금 확인 중 상태 여부 | boolean |
| `isDeposited()` | 상태 확인 | 입금 완료 상태 여부 | boolean |
| `isDelivered()` | 상태 확인 | 배송 완료 상태 여부 | boolean |
| `isCancelled()` | 상태 확인 | 취소된 상태 여부 | boolean |
| `isKakaoOrder()` | 타입 확인 | 카카오 사용자 주문 여부 | boolean |
| `toJSON()` | 직렬화 | Entity → Plain Object | Object |
| `fromJSON(data)` | 역직렬화 | Plain Object → Entity | Order (static) |

#### 검증 규칙
- ✅ `customer_order_number` 필수
- ✅ `status`는 OrderStatus 값만 허용
- ✅ `total_amount` >= 0
- ✅ `discount_amount` >= 0
- ✅ `shipping_cost` >= 0
- ✅ `user_id` 또는 `order_type` 중 하나는 필수 (카카오 사용자 대응)

#### 비즈니스 규칙
- **취소 가능**: pending 또는 verifying 상태에서만
- **카카오 주문**: `user_id`가 null이고 `order_type`이 'direct:KAKAO:'로 시작

#### 사용처 (예정)
- `lib/use-cases/order/CreateOrderUseCase.js` (Phase 3.3)
- `lib/use-cases/order/CancelOrderUseCase.js` (Phase 3.4)
- `lib/use-cases/order/UpdateOrderUseCase.js` (Phase 3.5)

---

### OrderCalculator ✅ (Phase 2.2 완료 - 2025-10-21)

| 항목 | 내용 |
|------|------|
| **파일 위치** | `lib/domain/order/OrderCalculator.js` |
| **목적** | 주문 금액 계산 도메인 서비스 |
| **파일 크기** | 192줄 (Rule 1 준수 ✅, 제한: 200줄) |
| **마이그레이션** | Phase 2.2 완료 (2025-10-21) |

#### 메서드 목록 (6개)

| 메서드 | 타입 | 목적 | 반환값 |
|--------|------|------|--------|
| `calculateItemsTotal(items)` | 계산 | 상품 아이템 총액 계산 | number |
| `calculateShipping(itemsTotal, postalCodeOrRegion, baseShippingFee)` | 계산 | 배송비 계산 (도서산간 추가비 포함) | number |
| `calculateDiscount(itemsTotal, coupon)` | 계산 | 쿠폰 할인 계산 (배송비 제외) | Object |
| `checkFreeShipping(itemsTotal, freeShippingThreshold)` | 검증 | 무료배송 조건 확인 | boolean |
| `calculateFinalAmount(items, options)` | 계산 | 최종 주문 금액 계산 (쿠폰+배송비+VAT) | Object |
| `normalizeItems(items)` | 유틸 | 주문 아이템 데이터 정규화 | Array |

#### 계산 로직

**상품 금액 계산**:
- 다양한 스키마 지원 (total, price*quantity, totalPrice, unit_price*quantity)
- Fallback 체인으로 호환성 보장

**배송비 계산**:
- 우편번호(5자리) 자동 인식
- 도서산간 추가비 적용 (제주 +3,000, 울릉도/독도 +5,000, 기타 +5,000)
- 무료배송 시 추가비도 무료
- shippingUtils.formatShippingInfo() 사용

**쿠폰 할인**:
- ⚠️ **중요**: 배송비는 할인 대상 제외, 상품 금액에만 적용
- percentage: 상품금액 × (value/100), maxDiscount 제한
- fixed_amount: MIN(쿠폰금액, 상품금액)

**무료배송**:
- 기본 기준: 30,000원 이상
- 기준 금액 커스터마이징 가능

**최종 금액**:
1. 상품 금액 계산
2. 쿠폰 할인 적용 (상품 금액에만)
3. 무료배송 조건 확인
4. 배송비 계산
5. 카드결제 시 부가세 10% 추가

#### 사용처
- `app/checkout/page.js` (체크아웃 금액 계산)
- `app/orders/page.js` (주문 내역 금액 표시)
- `app/orders/[id]/complete/page.js` (주문 완료 페이지)
- `lib/use-cases/order/*` (Phase 3.x Use Cases에서 활용 예정)

#### 레거시 파일
- `lib/orderCalculations.js` (383줄) - Phase 3.x에서 @deprecated 처리 예정
- OrderCalculator로 로직 이전 완료

---

### OrderValidator ✅ (Phase 2.3 완료 - 2025-10-21)

| 항목 | 내용 |
|------|------|
| **파일 위치** | `lib/domain/order/OrderValidator.js` |
| **목적** | 주문 데이터 검증 도메인 서비스 |
| **파일 크기** | 167줄 (Rule 1 준수 ✅, 제한: 200줄) |
| **마이그레이션** | Phase 2.3 완료 (2025-10-21) |

#### 메서드 목록 (4개)

| 메서드 | 타입 | 목적 | 반환값 |
|--------|------|------|--------|
| `validateOrderData(orderData)` | 검증 | 주문 아이템 필수 필드 검증 | { isValid, errors } |
| `validateShipping(shipping)` | 검증 | 배송지 정보 검증 (이름/연락처/주소/우편번호) | { isValid, errors } |
| `validatePayment(payment)` | 검증 | 결제 정보 검증 (결제방법/입금자명) | { isValid, errors } |
| `validateOrder(order)` | 검증 | 전체 주문 검증 (통합 메서드) | { isValid, errors } |

#### 검증 규칙

**주문 데이터 (validateOrderData)**:
- ✅ items 배열 필수, 1개 이상
- ✅ 각 아이템: title, price/unit_price/totalPrice 중 하나
- ✅ 각 아이템: quantity >= 1
- ✅ totalAmount >= 0 (선택적)

**배송 정보 (validateShipping)**:
- ✅ name 필수, 50자 이하
- ✅ phone 필수, 숫자와 하이픈만 허용
- ✅ address 필수
- ✅ postalCode 선택적, 5자리 숫자

**결제 정보 (validatePayment)**:
- ✅ paymentMethod 필수 (card, transfer, bank_transfer, account_transfer)
- ✅ 무통장입금 시 depositorName 필수
- ✅ depositorName 50자 이하

#### 특징
- 순수 검증 로직 (DB 접근 없음, Side Effect 없음)
- 에러 배열 반환 (여러 오류 한 번에 표시)
- Domain Layer 순수 함수

#### 사용처 (예정)
- `lib/use-cases/order/CreateOrderUseCase.js` (Phase 3.3)
- `app/checkout/page.js` (Phase 4.1 - 리팩토링 시)
- `app/orders/page.js` (Phase 4.2 - 수량 변경 검증)

---

### Product Entity ✅ (Phase 2.4 완료 - 2025-10-21)

| 항목 | 내용 |
|------|------|
| **파일 위치** | `lib/domain/product/Product.js` |
| **목적** | 상품 도메인 모델 (비즈니스 로직 + 검증) |
| **상속** | `Entity` (Base Entity) |
| **파일 크기** | 138줄 (Rule 1 준수 ✅, 제한: 200줄) |
| **마이그레이션** | Phase 2.4 완료 (2025-10-21) |

#### 상품 상태 (ProductStatus)
- ACTIVE - 활성 (판매 중)
- INACTIVE - 비활성 (일시 중단)
- DELETED - 삭제됨 (소프트 삭제)

#### 메서드 목록 (9개)

| 메서드 | 타입 | 목적 | 반환값 |
|--------|------|------|--------|
| `constructor()` | 생성자 | Product Entity 생성 | Product |
| `validate()` | 검증 | 필수 필드 + 가격 + 재고 + 상태 검증 | void (에러 던짐) |
| `isActive()` | 상태 확인 | 활성 상품 여부 | boolean |
| `isInactive()` | 상태 확인 | 비활성 상품 여부 | boolean |
| `isDeleted()` | 상태 확인 | 삭제된 상품 여부 | boolean |
| `isFeatured()` | 타입 확인 | 추천 상품 여부 | boolean |
| `isLiveActive()` | 타입 확인 | 라이브 활성 상품 여부 | boolean |
| `toJSON()` | 직렬화 | Entity → Plain Object | Object |
| `fromJSON(data)` | 역직렬화 | Plain Object → Entity | Product (static) |

#### 검증 규칙
- ✅ `title` 필수, 빈 문자열 불가
- ✅ `product_number` 필수
- ✅ `price` >= 0
- ✅ `inventory` >= 0
- ✅ `status`는 ProductStatus 값만 허용

#### 필드 목록
- **id**: UUID (Entity에서 상속)
- **title**: 상품명 (필수)
- **product_number**: 상품 번호 (필수, 예: P0001)
- **price**: 판매 가격 (필수, >= 0)
- **compare_price**: 비교 가격 (선택, 정가 표시용)
- **thumbnail_url**: 썸네일 이미지 URL (선택)
- **inventory**: 재고 수량 (필수, >= 0)
- **status**: 상품 상태 (ACTIVE/INACTIVE/DELETED)
- **is_featured**: 추천 상품 여부 (boolean, 기본값: false)
- **is_live_active**: 라이브 활성 여부 (boolean, 기본값: false)
- **created_at**: 생성 시간
- **updated_at**: 수정 시간

#### 비즈니스 규칙
- **활성 상품**: status = ACTIVE인 상품만 홈페이지에 표시
- **추천 상품**: is_featured = true인 상품을 우선 표시
- **라이브 활성**: is_live_active = true인 상품을 라이브 방송에 표시
- **소프트 삭제**: status = DELETED로 변경, 실제 DELETE 사용 안 함

#### 사용처 (예정)
- `lib/use-cases/product/CreateProductUseCase.js` (Phase 3.x)
- `lib/use-cases/product/UpdateProductUseCase.js` (Phase 3.x)
- `lib/repositories/ProductRepository.js` (Entity 변환용)

---

### Inventory Value Object ✅ (Phase 2.5 완료 - 2025-10-21)

| 항목 | 내용 |
|------|------|
| **파일 위치** | `lib/domain/product/Inventory.js` |
| **목적** | 재고 관리 Value Object (불변성 + 재고 가용성 검증) |
| **패턴** | Value Object (값으로 비교, 불변성, ID 없음) |
| **파일 크기** | 161줄 (JSDoc 포함) |
| **마이그레이션** | Phase 2.5 완료 (2025-10-21) |

#### 메서드 목록 (9개)

| 메서드 | 타입 | 목적 | 반환값 |
|--------|------|------|--------|
| `constructor(quantity)` | 생성자 | Inventory 생성 | Inventory |
| `checkAvailability(required)` | 검증 | 재고 가용성 확인 | boolean |
| `reserve(quantity)` | 변환 | 재고 예약 (감소) - 새 객체 반환 | Inventory |
| `release(quantity)` | 변환 | 재고 해제 (증가) - 새 객체 반환 | Inventory |
| `isAvailable()` | 상태 확인 | 재고가 있는지 확인 (> 0) | boolean |
| `isEmpty()` | 상태 확인 | 재고가 없는지 확인 (= 0) | boolean |
| `equals(other)` | 비교 | 값 비교 (Value Object) | boolean |
| `toString()` | 직렬화 | 문자열 표현 | string |
| `toNumber()` / `fromNumber()` | 변환 | Number ↔ Inventory | number / Inventory |

#### Value Object 특징
- **불변성 (Immutability)**: reserve/release는 원본을 변경하지 않고 새 객체 반환
- **값 비교 (Equality by Value)**: equals()로 quantity 비교
- **고유 ID 없음**: 재고 수량 자체가 값
- **순수 함수**: Side Effect 없음, DB 접근 없음

#### 불변성 예제
```javascript
const inventory = new Inventory(10)
const reserved = inventory.reserve(3)  // Inventory(7)

console.log(inventory.quantity)  // 10 (원본 불변)
console.log(reserved.quantity)   // 7  (새 객체)
```

#### 검증 규칙
- ✅ `quantity` >= 0 (생성 시)
- ✅ `required` >= 0 (checkAvailability 시)
- ✅ `reserve/release` > 0 (수량은 양수)
- ✅ 재고 부족 시 reserve() 에러 던짐

#### 사용처 (예정)
- `lib/use-cases/order/CreateOrderUseCase.js` (Phase 3.x - 주문 시 재고 예약)
- `lib/use-cases/order/CancelOrderUseCase.js` (Phase 3.x - 취소 시 재고 해제)
- `lib/repositories/ProductRepository.js` (재고 관리 로직)

---

## 🚀 12.4 Use Cases (Phase 3 - Application Layer)

### CreateOrderUseCase ✅ (Phase 3.1 완료 - 2025-10-21)

| 항목 | 내용 |
|------|------|
| **파일 위치** | `lib/use-cases/order/CreateOrderUseCase.js` |
| **목적** | 주문 생성 비즈니스 로직 (검증 → 계산 → 재고확인 → 저장 → Queue) |
| **상속** | `BaseUseCase` |
| **파일 크기** | 137줄 (Rule 1 준수 ✅, 제한: 150줄) |
| **마이그레이션** | Phase 3.1 완료 (2025-10-21) |

#### 의존성 주입 (3개)

| 의존성 | 타입 | 목적 |
|--------|------|------|
| `OrderRepository` | Infrastructure | 주문 데이터 저장 |
| `ProductRepository` | Infrastructure | 재고 확인 |
| `QueueService` | Infrastructure | 비동기 작업 (재고 차감) |

#### 실행 흐름 (5단계)

1. **검증** - OrderValidator.validateOrder()
   - 주문 데이터 검증 (items, shipping, payment)
   - ValidationError 던짐 (검증 실패 시)

2. **금액 계산** - OrderCalculator.calculateFinalAmount()
   - 상품 금액 + 배송비 + 쿠폰 할인
   - 도서산간 추가비 자동 계산

3. **재고 확인** - ProductRepository.findByIds()
   - 상품별 재고 수량 확인
   - InsufficientInventoryError 던짐 (재고 부족 시)

4. **DB 저장** - OrderRepository.create()
   - orders, order_items, order_shipping, order_payments 테이블
   - customer_order_number 자동 생성 (SYYMMDD-XXXX)

5. **Queue 추가** - QueueService.addJob()
   - 비동기 재고 차감 작업 등록
   - order-processing 큐

#### 사용처 (예정)

- `app/checkout/page.js` - 체크아웃 페이지에서 주문 생성 시 (Phase 4.1)
- `app/api/orders/create/route.js` - API Route에서 호출 (Phase 4.1)

#### Private 메서드 (3개)

| 메서드 | 목적 |
|--------|------|
| `_validateInput()` | OrderValidator 호출, 검증 실패 시 에러 |
| `_checkInventory()` | ProductRepository 조회, 재고 부족 시 에러 |
| `_generateOrderNumber()` | 주문번호 생성 (SYYMMDD-XXXX) |

---

### GetOrdersUseCase ✅ (Phase 3.2 완료 - 2025-10-21)

| 항목 | 내용 |
|------|------|
| **파일 위치** | `lib/use-cases/order/GetOrdersUseCase.js` |
| **목적** | 주문 목록 조회 (캐시 → Repository → 캐시 저장) |
| **상속** | `BaseUseCase` |
| **파일 크기** | 86줄 (Rule 1 준수 ✅, 제한: 120줄) |
| **마이그레이션** | Phase 3.2 완료 (2025-10-21) |

#### 의존성 주입 (2개)

| 의존성 | 타입 | 목적 |
|--------|------|------|
| `OrderRepository` | Infrastructure | 주문 데이터 조회 |
| `CacheService` | Infrastructure | Redis 캐시 (1시간 TTL) |

#### 실행 흐름 (5단계)

1. **캐시 키 생성** - _generateCacheKey()
   - 형식: `orders:${userId}:${orderType}:${filterStr}`
   - 사용자별 + 필터별 분리

2. **캐시 확인** - CacheService.get()
   - 캐시 히트 시: Order Entity 배열 즉시 반환
   - 로그: "캐시 히트" + 주문 개수

3. **Repository 조회** - OrderRepository.findByUser()
   - 캐시 미스 시 DB 조회
   - user_id 또는 order_type 필터링

4. **캐시 저장** - CacheService.set()
   - JSON 데이터로 변환 후 저장
   - TTL: 3600초 (1시간)

5. **Entity 변환** - Order.fromJSON()
   - Plain Object → Order Entity 변환
   - 배열로 반환

#### Public 메서드 (2개)

| 메서드 | 목적 | 반환값 |
|--------|------|--------|
| `execute({ user, filters })` | 주문 목록 조회 (캐시 우선) | Promise<Order[]> |
| `invalidateCache(user)` | 캐시 무효화 (주문 생성/수정 시) | Promise<void> |

#### 캐시 전략

- **캐시 키**: 사용자 ID + 주문 타입 + 필터 조건
- **TTL**: 1시간 (3600초)
- **무효화**: 주문 생성/수정/취소 시 invalidateCache() 호출
- **캐시 히트 로그**: 디버깅용 로그 출력

#### 사용처 (예정)

- `app/orders/page.js` - 주문 내역 페이지 (Phase 4.2)
- `app/api/orders/route.js` - API Route에서 호출 (Phase 4.2)
- `app/admin/orders/page.js` - 관리자 주문 목록 (Phase 4.3)

#### Private 메서드 (1개)

| 메서드 | 목적 |
|--------|------|
| `_generateCacheKey(user, filters)` | 사용자별 + 필터별 캐시 키 생성 |

---

## 📝 13. 마이그레이션 우선순위

### 13.1 High Priority (Phase 1-3, 필수)

1. **동시성 제어** (Phase 1.7) - Race Condition 방지 최우선
2. **Order Repository** (Phase 1.1) - 가장 많이 사용됨
3. **Product Repository** (Phase 1.2) - 핵심 기능
4. **Variant Repository** (Phase 1.3) - 재고 관리 필수
5. **CreateOrderUseCase** (Phase 3.3) - 복잡도 200+ 줄
6. **레거시 함수 제거** (Phase 0.6) - 혼란 방지

---

### 13.2 Medium Priority (Phase 4-5, 중요)

7. **User Repository** (Phase 1.4) - 프로필 관리
8. **Coupon Repository** (Phase 1.7) - 쿠폰 시스템
9. **Supplier Repository** (Phase 1.5) - 발주 시스템 연계
10. **페이지 리팩토링** (Phase 4) - God Component 분리

---

### 13.3 Low Priority (Phase 6-7, 추후)

11. **Live 기능** (Phase 4.7) - 아직 미사용
12. **Category Repository** (Phase 1.6) - 단순 기능
13. **테스트 작성** (Phase 6) - 리팩토링 완료 후
14. **성능 최적화** (Phase 5) - 안정화 후

---

## 🎯 14. 다음 단계 (Phase 0 완료 후)

### Step 0.3 완료 체크리스트

- [x] 0.3.1 모든 함수 목록 작성 (84개)
- [x] 0.3.2 사용 페이지 매핑 완료
- [x] 0.3.3 DB 접근 패턴 분석 완료
- [x] 0.3.4 목표 레이어 할당 완료
- [x] 0.3.5 마이그레이션 Phase 매핑 완료
- [x] 0.3.6 레거시 함수 식별 완료 (11개)
- [x] 0.3.7 Race Condition 함수 식별 완료 (4개)
- [x] 0.3.8 우선순위 정렬 완료

**완료 조건**: ✅ 모두 완료
**Git 커밋**: `docs: Phase 0.3 - FUNCTION_QUERY_REFERENCE.md 생성 (84개 함수 매핑)`

---

## 🔄 15. 이 문서 업데이트 규칙

### 15.1 함수 추가 시

```markdown
1. 해당 카테고리 섹션에 추가
2. 표 형식으로 작성 (함수명, 목적, 사용 페이지, DB 접근, 목표 레이어, 마이그레이션)
3. "함수 통계 요약" 업데이트
4. Git 커밋: `docs: FUNCTION_QUERY_REFERENCE 업데이트 - {함수명} 추가`
```

---

### 15.2 함수 삭제 시

```markdown
1. 해당 함수 항목에 ~~취소선~~ 추가
2. "레거시 함수 목록"으로 이동
3. "함수 통계 요약" 업데이트
4. Git 커밋: `docs: FUNCTION_QUERY_REFERENCE 업데이트 - {함수명} 레거시 처리`
```

---

### 15.3 함수 마이그레이션 완료 시

```markdown
1. "현재 위치" → "마이그레이션 완료" 상태로 변경
2. 새 파일 경로 추가
3. "함수 통계 요약" 업데이트
4. Git 커밋: `docs: FUNCTION_QUERY_REFERENCE 업데이트 - {함수명} 마이그레이션 완료`
```

---

**최종 업데이트**: 2025-10-21
**다음 리뷰**: Phase 1 시작 전

**이 문서는 리팩토링의 나침반입니다. 항상 최신 상태로 유지하세요!**
