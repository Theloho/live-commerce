# 📊 함수/쿼리 참조 매트릭스 (FUNCTION_QUERY_REFERENCE)

**버전**: 1.0
**작성일**: 2025-10-21
**목적**: 전체 시스템의 모든 함수, 쿼리, DB 접근을 한눈에 파악하고 리팩토링 시 참조

---

## 📖 이 문서의 사용법

### 리팩토링 시 참조 순서

1. **함수 찾기**: Ctrl+F로 함수명 검색
2. **사용처 확인**: "사용 페이지" 섹션에서 영향 범위 파악
3. **DB 확인**: "DB 접근" 섹션에서 테이블 및 쿼리 확인
4. **마이그레이션 계획**: "목표 레이어" 확인 후 해당 Phase에서 작업

### 표 해석 방법

| 컬럼 | 의미 |
|------|------|
| **함수명** | 현재 파일명과 함수 시그니처 |
| **목적** | 이 함수가 하는 일 |
| **사용 페이지** | 이 함수를 호출하는 모든 페이지 (파일명:라인) |
| **DB 접근** | 접근하는 테이블 및 쿼리 타입 (SELECT/INSERT/UPDATE/DELETE) |
| **목표 레이어** | 리팩토링 후 이동할 위치 |
| **마이그레이션** | 리팩토링 체크리스트의 Phase 번호 |

---

## 🏗️ 레이어 구조 (목표 아키텍처)

```
Presentation Layer (app/)
  ↓ 호출
Application Layer (lib/use-cases/)
  ↓ 호출
Domain Layer (lib/domain/)
  ↓ 호출
Infrastructure Layer (lib/repositories/, lib/services/)
  ↓ 접근
Database (Supabase PostgreSQL)
```

---

## 📦 1. 상품(Product) 관련 함수

### 1.1 getProducts → ✅ ProductRepository.findAll

| 항목 | 내용 |
|------|------|
| **✅ 마이그레이션 완료** | `lib/repositories/ProductRepository.js:28` |
| **시그니처** | `async findAll(filters = {})` |
| **목적** | 활성 상품 목록 조회 (최대 50개, 최신순) |
| **사용 페이지** | - `app/page.js:64` (홈페이지)<br>- `app/components/HomeClient.jsx` (useRealtimeProducts 경유) |
| **DB 접근** | `products` (SELECT: id, title, product_number, price, compare_price, thumbnail_url, inventory, status, is_featured, is_live_active, created_at) |
| **특징** | ⚡ 모바일 최적화: JOIN 제거, 필요한 컬럼만 SELECT<br>featuredOnly 필터 추가 (추천 상품 전용 조회) |
| **완료 레이어** | `Infrastructure` → `lib/repositories/ProductRepository.js` |
| **완료 일자** | 2025-10-21 (Phase 1.2) |

---

### 1.2 getProductById → ✅ ProductRepository.findById

| 항목 | 내용 |
|------|------|
| **✅ 마이그레이션 완료** | `lib/repositories/ProductRepository.js:64` |
| **시그니처** | `async findById(productId)` |
| **목적** | 특정 상품 상세 조회 (Variant 포함) |
| **사용 페이지** | - `app/products/catalog/[id]/page.js`<br>- `app/products/catalog/[id]/edit/page.js`<br>- `app/admin/products/new/page.js` (복사 기능) |
| **DB 접근** | `products` (SELECT *)<br>`product_variants` (JOIN, Variant 정보)<br>`product_options` (JOIN)<br>`product_option_values` (JOIN) |
| **특징** | 4단계 중첩 JOIN (성능 이슈 가능)<br>404 에러 시 null 반환 (PGRST116 처리) |
| **완료 레이어** | `Infrastructure` → `lib/repositories/ProductRepository.js` |
| **완료 일자** | 2025-10-21 (Phase 1.2) |

---

### 1.3 addProduct

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:167` |
| **시그니처** | `addProduct(productData)` |
| **목적** | 새 상품 등록 |
| **사용 페이지** | - `app/admin/products/new/page.js:XXX` (빠른 등록) |
| **DB 접근** | `products` (INSERT) |
| **특징** | 기본 필드만 저장, Variant는 별도 함수 사용 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/ProductRepository.js` |
| **마이그레이션** | Phase 1.2 (Step 1.2.3) |

---

### 1.4 updateProduct

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:211` |
| **시그니처** | `updateProduct(productId, productData)` |
| **목적** | 상품 정보 수정 |
| **사용 페이지** | - `app/products/catalog/[id]/edit/page.js`<br>- `app/admin/products/new/page.js` (상세 등록 시 수정) |
| **DB 접근** | `products` (UPDATE) |
| **특징** | inventory는 별도 함수로 관리 (updateProductInventory) |
| **목표 레이어** | `Infrastructure` → `lib/repositories/ProductRepository.js` |
| **마이그레이션** | Phase 1.2 (Step 1.2.4) |

---

### 1.5 updateProductLiveStatus

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:265` |
| **시그니처** | `updateProductLiveStatus(productId, isLive)` |
| **목적** | 상품 라이브 활성화/비활성화 |
| **사용 페이지** | - `app/admin/products/page.js` (라이브 토글 버튼)<br>- `app/products/catalog/[id]/edit/page.js` |
| **DB 접근** | `products` (UPDATE: is_live_active) |
| **특징** | 트리거로 live_products 테이블 자동 동기화 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/ProductRepository.js` |
| **마이그레이션** | Phase 1.2 (Step 1.2.5) |

---

### 1.6 updateProductInventory → ✅ ProductRepository.updateInventory

| 항목 | 내용 |
|------|------|
| **✅ 마이그레이션 완료** | `lib/repositories/ProductRepository.js:150` |
| **시그니처** | `async updateInventory(productId, change)` |
| **목적** | 상품 전체 재고 증감 (주문 취소 시 복원용) |
| **사용 페이지** | - `lib/supabaseApi.js:1456` (cancelOrder 내부)<br>- 직접 호출 없음 (내부 함수) |
| **DB 접근** | `products` (SELECT: inventory, UPDATE: inventory) |
| **특징** | ⚠️ **Race Condition 위험** - 동시 주문 시 재고 부정합 가능<br>→ Phase 1.7에서 FOR UPDATE NOWAIT로 교체 필요<br>현재: SELECT → 계산 → UPDATE (2단계) |
| **완료 레이어** | `Infrastructure` → `lib/repositories/ProductRepository.js` |
| **완료 일자** | 2025-10-21 (Phase 1.2) |

---

### 1.6A ✅ ProductRepository.findByIds (신규)

| 항목 | 내용 |
|------|------|
| **✅ 신규 생성** | `lib/repositories/ProductRepository.js:115` |
| **시그니처** | `async findByIds(productIds)` |
| **목적** | 여러 상품 배치 조회 (IN 쿼리) |
| **사용 페이지** | - Phase 3.x Use Cases에서 활용 예정<br>- 장바구니 상품 일괄 조회 최적화 |
| **DB 접근** | `products` (SELECT *, WHERE id IN (productIds)) |
| **특징** | N+1 문제 해결 (단일 쿼리로 여러 상품 조회)<br>빈 배열 입력 시 빈 배열 반환 |
| **완료 레이어** | `Infrastructure` → `lib/repositories/ProductRepository.js` |
| **완료 일자** | 2025-10-21 (Phase 1.2) |

---

### 1.7 getAllProducts

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2018` |
| **시그니처** | `getAllProducts(filters = {})` |
| **목적** | 관리자용 전체 상품 조회 (비활성 포함) |
| **사용 페이지** | - `app/admin/products/page.js` (상품 관리 페이지) |
| **DB 접근** | `products` (SELECT *)<br>`suppliers` (LEFT JOIN) |
| **특징** | status 필터 없음, 모든 상태 조회 가능 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/ProductRepository.js` |
| **마이그레이션** | Phase 1.2 (Step 1.2.7) |

---

### 1.8 deleteProduct

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:612` |
| **시그니처** | `deleteProduct(productId)` |
| **목적** | 상품 소프트 삭제 (status = 'deleted') |
| **사용 페이지** | - `app/admin/products/page.js` (삭제 버튼) |
| **DB 접근** | `products` (UPDATE: status = 'deleted') |
| **특징** | 소프트 삭제 방식, 실제 DELETE 사용 안 함 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/ProductRepository.js` |
| **마이그레이션** | Phase 1.2 (Step 1.2.8) |

---

## 📦 2. 상품 옵션/Variant 관련 함수

### 2.1 checkVariantInventory

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2383` |
| **시그니처** | `checkVariantInventory(productId, selectedOptions)` |
| **목적** | 선택한 옵션 조합의 재고 확인 |
| **사용 페이지** | - `app/components/product/BuyBottomSheet.jsx` (구매 수량 검증)<br>- `app/checkout/page.js` (체크아웃 시 재고 재검증) |
| **DB 접근** | `product_variants` (SELECT)<br>`variant_option_values` (JOIN)<br>`product_option_values` (JOIN) |
| **특징** | 복잡한 JOIN 쿼리, 옵션 조합 매칭 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/VariantRepository.js` |
| **마이그레이션** | Phase 1.3 (Step 1.3.1) |

---

### 2.2 updateVariantInventory

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2317` |
| **시그니처** | `updateVariantInventory(variantId, quantityChange)` |
| **목적** | Variant 재고 증감 (주문 생성/취소) |
| **사용 페이지** | - `lib/supabaseApi.js:637` (createOrder 내부)<br>- `lib/supabaseApi.js:1456` (cancelOrder 내부)<br>- `app/orders/page.js` (수량 변경) |
| **DB 접근** | RPC `update_variant_inventory_rpc(variant_id, quantity_change)` |
| **특징** | ⚠️ **RPC 함수 사용 (FOR UPDATE 락 없음)**<br>→ Phase 1.7에서 FOR UPDATE NOWAIT 추가 필요 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/VariantRepository.js` |
| **마이그레이션** | Phase 1.3 (Step 1.3.2) + Phase 1.7 (동시성 제어) |

---

### 2.3 getProductVariants

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2235` |
| **시그니처** | `getProductVariants(productId)` |
| **목적** | 특정 상품의 모든 Variant 조회 |
| **사용 페이지** | - `app/products/catalog/[id]/edit/page.js` (Variant 관리 섹션) |
| **DB 접근** | `product_variants` (SELECT *)<br>`variant_option_values` (JOIN)<br>`product_option_values` (JOIN) |
| **특징** | SKU, 재고, 옵션값 포함 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/VariantRepository.js` |
| **마이그레이션** | Phase 1.3 (Step 1.3.3) |

---

### 2.4 createVariant

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2281` |
| **시그니처** | `createVariant(variantData, optionValueIds)` |
| **목적** | 새 Variant 등록 (옵션 조합별 SKU/재고) |
| **사용 페이지** | - `app/admin/products/new/page.js` (상세 등록)<br>- `app/products/catalog/[id]/edit/page.js` (Variant 추가) |
| **DB 접근** | `product_variants` (INSERT)<br>`variant_option_values` (INSERT, 매핑 테이블) |
| **특징** | SKU 자동 생성 (제품번호-옵션값1-옵션값2) |
| **목표 레이어** | `Infrastructure` → `lib/repositories/VariantRepository.js` |
| **마이그레이션** | Phase 1.3 (Step 1.3.4) |

---

### 2.5 updateVariant

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2339` |
| **시그니처** | `updateVariant(variantId, variantData)` |
| **목적** | Variant 정보 수정 (재고, 가격 등) |
| **사용 페이지** | - `app/products/catalog/[id]/edit/page.js` (Variant 편집) |
| **DB 접근** | `product_variants` (UPDATE) |
| **특징** | 재고는 updateVariantInventory 권장 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/VariantRepository.js` |
| **마이그레이션** | Phase 1.3 (Step 1.3.5) |

---

### 2.6 deleteVariant

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2364` |
| **시그니처** | `deleteVariant(variantId)` |
| **목적** | Variant 삭제 (CASCADE로 variant_option_values도 삭제) |
| **사용 페이지** | - `app/products/catalog/[id]/edit/page.js` (Variant 삭제) |
| **DB 접근** | `product_variants` (DELETE)<br>`variant_option_values` (CASCADE DELETE) |
| **특징** | 하드 삭제 (주문 이력 있는 경우 주의) |
| **목표 레이어** | `Infrastructure` → `lib/repositories/VariantRepository.js` |
| **마이그레이션** | Phase 1.3 (Step 1.3.6) |

---

### 2.7 getProductOptions

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2426` |
| **시그니처** | `getProductOptions(productId)` |
| **목적** | 상품의 옵션 및 옵션값 조회 (색상, 사이즈 등) |
| **사용 페이지** | - `app/components/product/BuyBottomSheet.jsx` (옵션 선택 UI)<br>- `app/products/catalog/[id]/edit/page.js` (옵션 관리) |
| **DB 접근** | `product_options` (SELECT *)<br>`product_option_values` (JOIN) |
| **특징** | 옵션별 옵션값 배열로 반환 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/ProductOptionRepository.js` |
| **마이그레이션** | Phase 1.3 (Step 1.3.7) |

---

### 2.8 createProductOption

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2462` |
| **시그니처** | `createProductOption(optionData)` |
| **목적** | 새 옵션 생성 (색상, 사이즈 등) |
| **사용 페이지** | - `app/admin/products/new/page.js` (상세 등록) |
| **DB 접근** | `product_options` (INSERT) |
| **특징** | 옵션값은 createOptionValue로 별도 생성 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/ProductOptionRepository.js` |
| **마이그레이션** | Phase 1.3 (Step 1.3.8) |

---

### 2.9 createOptionValue

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2483` |
| **시그니처** | `createOptionValue(valueData)` |
| **목적** | 옵션값 생성 (빨강, 파랑, S, M, L 등) |
| **사용 페이지** | - `app/admin/products/new/page.js` (상세 등록) |
| **DB 접근** | `product_option_values` (INSERT) |
| **특징** | option_id와 함께 저장 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/ProductOptionRepository.js` |
| **마이그레이션** | Phase 1.3 (Step 1.3.9) |

---

### 2.10 createProductWithOptions

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2504` |
| **시그니처** | `createProductWithOptions(productData, optionsData)` |
| **목적** | 상품 + 옵션 + Variant 한 번에 생성 (트랜잭션) |
| **사용 페이지** | - `app/admin/products/new/page.js` (상세 등록 완료 시) |
| **DB 접근** | `products` (INSERT)<br>`product_options` (INSERT)<br>`product_option_values` (INSERT)<br>`product_variants` (INSERT)<br>`variant_option_values` (INSERT) |
| **특징** | ⚠️ **트랜잭션 필요** (현재 미구현)<br>옵션 조합 자동 생성 (2x3 = 6개 Variant) |
| **목표 레이어** | `Application` → `lib/use-cases/product/CreateProductWithOptionsUseCase.js` |
| **마이그레이션** | Phase 3.2 (Step 3.2.1) |

---

## 🛒 3. 주문(Order) 관련 함수

### 3.1 createOrder

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:637` |
| **시그니처** | `createOrder(orderData, userProfile, depositName = null)` |
| **목적** | 새 주문 생성 (단일 상품 또는 장바구니) |
| **사용 페이지** | - `app/checkout/page.js:XXX` (체크아웃 완료)<br>- `app/components/product/BuyBottomSheet.jsx` (바로구매) |
| **DB 접근** | `orders` (INSERT)<br>`order_items` (INSERT)<br>`order_shipping` (INSERT)<br>`order_payments` (INSERT)<br>`products` (UPDATE: inventory)<br>`product_variants` (RPC: update_variant_inventory_rpc) |
| **특징** | ⚠️ **Race Condition 위험** - 재고 감소 시 락 없음<br>⚠️ **복잡도 과다** - 5개 테이블 접근, 200+ 줄<br>→ Phase 3.3에서 CreateOrderUseCase로 분리 필요 |
| **목표 레이어** | `Application` → `lib/use-cases/order/CreateOrderUseCase.js` |
| **마이그레이션** | Phase 3.3 (Step 3.3.1) + Phase 1.7 (동시성 제어) |

---

### 3.2 getOrders → ✅ OrderRepository.findByUser

| 항목 | 내용 |
|------|------|
| **✅ 마이그레이션 완료** | `lib/repositories/OrderRepository.js:22` |
| **시그니처** | `async findByUser(userId = null, orderType = null)` |
| **목적** | 사용자 주문 목록 조회 (order_type으로 카카오 사용자 매칭) |
| **사용 페이지** | - `app/orders/page.js` (주문 내역 페이지)<br>- `app/mypage/page.js` (마이페이지 주문 요약) |
| **DB 접근** | `orders` (SELECT *)<br>`order_items` (JOIN)<br>`order_shipping` (JOIN)<br>`order_payments` (JOIN) |
| **특징** | Service Role 클라이언트 사용 (RLS 우회)<br>카카오: orderType, Supabase: userId |
| **완료 레이어** | `Infrastructure` → `lib/repositories/OrderRepository.js` |
| **완료 일자** | 2025-10-21 (Phase 1.1) |

---

### 3.3 getAllOrders

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:774` |
| **시그니처** | `getAllOrders()` |
| **목적** | 관리자 전체 주문 조회 (products JOIN 포함) |
| **사용 페이지** | - `app/admin/orders/page.js` (관리자 주문 관리)<br>- `app/admin/deposits/page.js` (입금확인 페이지)<br>- `app/admin/fulfillment-groups/page.js` (배송 취합) |
| **DB 접근** | ⚠️ **성능 이슈** - API Route로 이동 완료 (`/api/admin/orders`)<br>이 함수는 레거시, 사용 안 함 |
| **특징** | products JOIN으로 성능 저하 (13-15초)<br>→ API Route에서 named FK 사용 중 |
| **목표 레이어** | `Infrastructure` → 삭제 예정 (API Route로 대체됨) |
| **마이그레이션** | Phase 0.6 (Step 0.6.2 - 레거시 파일 관리) |

---

### 3.4 getOrderById → ✅ OrderRepository.findById

| 항목 | 내용 |
|------|------|
| **✅ 마이그레이션 완료** | `lib/repositories/OrderRepository.js:47` |
| **시그니처** | `async findById(orderId)` |
| **목적** | 특정 주문 상세 조회 (주문 완료 페이지용) |
| **사용 페이지** | - `app/orders/[id]/complete/page.js` (주문 완료 페이지)<br>- `app/admin/orders/[id]/page.js` (관리자 주문 상세) |
| **DB 접근** | `orders` (SELECT *)<br>`order_items` (JOIN)<br>`order_shipping` (JOIN)<br>`order_payments` (JOIN) |
| **특징** | Service Role 클라이언트 사용 (RLS 우회) |
| **완료 레이어** | `Infrastructure` → `lib/repositories/OrderRepository.js` |
| **완료 일자** | 2025-10-21 (Phase 1.1) |

---

### 3.5 updateOrderStatus → ✅ OrderRepository.updateStatus

| 항목 | 내용 |
|------|------|
| **✅ 마이그레이션 완료** | `lib/repositories/OrderRepository.js:127` |
| **시그니처** | `async updateStatus(orderId, status)` |
| **목적** | 주문 상태 변경 (pending → deposited → shipped → delivered → cancelled) |
| **사용 페이지** | - `app/admin/orders/page.js` (관리자 상태 변경)<br>- `app/admin/orders/[id]/page.js` (관리자 주문 상세)<br>- `app/admin/deposits/page.js` (입금확인) |
| **DB 접근** | `orders` (UPDATE: status, {status}_at 타임스탬프) |
| **특징** | 타임스탬프 자동 기록 (deposited_at, shipped_at, delivered_at, cancelled_at)<br>로깅: 🕐 pending, 💰 deposited, 🚚 shipped, ✅ delivered, ❌ cancelled |
| **완료 레이어** | `Infrastructure` → `lib/repositories/OrderRepository.js` |
| **완료 일자** | 2025-10-21 (Phase 1.1) |

---

### 3.6 updateMultipleOrderStatus → ✅ OrderRepository.updateMultipleStatus

| 항목 | 내용 |
|------|------|
| **✅ 마이그레이션 완료** | `lib/repositories/OrderRepository.js:164` |
| **시그니처** | `async updateMultipleStatus(orderIds, status)` |
| **목적** | 여러 주문 일괄 상태 변경 (입금확인 시 사용) |
| **사용 페이지** | - `app/admin/deposits/page.js` (일괄 입금확인) |
| **DB 접근** | `orders` (UPDATE: status, WHERE id IN (orderIds)) |
| **특징** | 단일 쿼리로 일괄 업데이트<br>deposited 상태는 타임스탬프 자동 기록 |
| **완료 레이어** | `Infrastructure` → `lib/repositories/OrderRepository.js` |
| **완료 일자** | 2025-10-21 (Phase 1.1) |

---

### 3.7 cancelOrder → ✅ OrderRepository.cancel (부분 완료)

| 항목 | 내용 |
|------|------|
| **✅ 마이그레이션 완료** | `lib/repositories/OrderRepository.js:190` |
| **시그니처** | `async cancel(orderId)` |
| **목적** | 주문 취소 (상태만 변경) |
| **사용 페이지** | - `app/orders/page.js` (주문 내역 취소 버튼)<br>- `app/admin/orders/[id]/page.js` (관리자 취소) |
| **DB 접근** | `orders` (UPDATE: status = 'cancelled', cancelled_at) |
| **특징** | ⚠️ **재고 복원, 쿠폰 복구는 Phase 3.4 CancelOrderUseCase에서 처리 예정**<br>Repository는 단순 상태 변경만 담당 |
| **완료 레이어** | `Infrastructure` → `lib/repositories/OrderRepository.js` (부분) |
| **완료 일자** | 2025-10-21 (Phase 1.1) |

---

### 3.7A ✅ OrderRepository.create (신규)

| 항목 | 내용 |
|------|------|
| **✅ 신규 생성** | `lib/repositories/OrderRepository.js:68` |
| **시그니처** | `async create({ orderData, orderItems, payment, shipping })` |
| **목적** | 새 주문 생성 (4개 테이블 INSERT) |
| **사용 페이지** | - Phase 3.3 CreateOrderUseCase에서 호출 예정 |
| **DB 접근** | `orders` (INSERT)<br>`order_items` (INSERT)<br>`order_shipping` (INSERT)<br>`order_payments` (INSERT) |
| **특징** | ⚠️ **트랜잭션 미구현** - Phase 3.3에서 Use Case로 이동 시 추가<br>재고 감소는 Use Case에서 처리 |
| **완료 레이어** | `Infrastructure` → `lib/repositories/OrderRepository.js` |
| **완료 일자** | 2025-10-21 (Phase 1.1) |

---

### 3.7B ✅ OrderRepository.update (신규)

| 항목 | 내용 |
|------|------|
| **✅ 신규 생성** | `lib/repositories/OrderRepository.js:104` |
| **시그니처** | `async update(orderId, data)` |
| **목적** | 주문 정보 수정 (일반 필드) |
| **사용 페이지** | - 현재 미사용 (향후 확장용) |
| **DB 접근** | `orders` (UPDATE) |
| **특징** | 범용 수정 메서드 (상태 변경은 updateStatus 권장) |
| **완료 레이어** | `Infrastructure` → `lib/repositories/OrderRepository.js` |
| **완료 일자** | 2025-10-21 (Phase 1.1) |

---

### 3.8 updateOrderItemQuantity

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:1592` |
| **시그니처** | `updateOrderItemQuantity(orderItemId, newQuantity)` |
| **목적** | 주문 수량 변경 (pending/verifying 상태만 가능) |
| **사용 페이지** | - `app/orders/page.js` (주문 내역 수량 변경) |
| **DB 접근** | `order_items` (SELECT, UPDATE: quantity, total, total_price)<br>`orders` (SELECT: 상태 확인, UPDATE: total_amount)<br>`products` (UPDATE: inventory 조정)<br>`product_variants` (RPC: update_variant_inventory_rpc, variant 재고 조정) |
| **특징** | ⚠️ **Race Condition 위험** - 재고 조정 시 락 없음<br>⚠️ **복잡도 과다** - 178줄, 재고/금액 계산 중복<br>→ Phase 3.3에서 UpdateOrderQuantityUseCase로 분리 필요 |
| **목표 레이어** | `Application` → `lib/use-cases/order/UpdateOrderQuantityUseCase.js` |
| **마이그레이션** | Phase 3.3 (Step 3.3.3) + Phase 1.7 (동시성 제어) |

---

### 3.9 generateCustomerOrderNumber

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:1883` |
| **시그니처** | `generateCustomerOrderNumber()` |
| **목적** | 고객 주문번호 생성 (S251021-1234 형식) |
| **사용 페이지** | - `lib/supabaseApi.js:637` (createOrder 내부) |
| **DB 접근** | 없음 (순수 계산 함수) |
| **특징** | S + YYMMDD + 랜덤4자리 |
| **목표 레이어** | `Domain` → `lib/domain/order/OrderNumber.js` |
| **마이그레이션** | Phase 2.1 (Step 2.1.1) |

---

### 3.10 generateGroupOrderNumber

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:1893` |
| **시그니처** | `generateGroupOrderNumber(paymentGroupId)` |
| **목적** | 그룹 주문번호 생성 (G251021-5678 형식) |
| **사용 페이지** | - `lib/supabaseApi.js:762` (getOrders 내부, 그룹 주문 표시용)<br>- `lib/supabaseApi.js:1024` (getAllOrders 내부) |
| **DB 접근** | 없음 (순수 계산 함수) |
| **특징** | ⚠️ **문제**: DB에는 S로 저장, UI에서 G로 표시 → 검색 불일치<br>→ Phase 0.6에서 제거 예정 (S 통일) |
| **목표 레이어** | 삭제 예정 (2025-10-15 이슈) |
| **마이그레이션** | Phase 0.6 (Step 0.6.3 - 레거시 함수 제거) |

---

## 👤 4. 사용자(User) 관련 함수

### 4.1 getCurrentUser

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:1770` |
| **시그니처** | `getCurrentUser()` |
| **목적** | 현재 로그인 사용자 정보 조회 (프로필 포함) |
| **사용 페이지** | - 거의 사용 안 함 (useAuth hook으로 대체됨)<br>- 일부 레거시 컴포넌트에서만 사용 |
| **DB 접근** | `supabase.auth.getSession()`<br>`profiles` (SELECT *, WHERE id = user.id) |
| **특징** | ⚠️ **레거시 함수** - useAuth, UserProfileManager로 대체됨 |
| **목표 레이어** | 삭제 예정 (useAuth로 통합) |
| **마이그레이션** | Phase 0.6 (Step 0.6.2 - 레거시 함수 제거) |

---

### 4.2 getUserById → ✅ UserRepository.findById

| 항목 | 내용 |
|------|------|
| **✅ 마이그레이션 완료** | `lib/repositories/UserRepository.js:22` |
| **시그니처** | `async findById(userId)` |
| **목적** | 특정 사용자 프로필 조회 |
| **사용 페이지** | - `app/admin/orders/[id]/page.js` (주문 상세에서 고객 정보 표시) |
| **DB 접근** | `profiles` (SELECT *, WHERE id = userId) |
| **특징** | 404 에러 시 null 반환 (PGRST116 처리) |
| **완료 레이어** | `Infrastructure` → `lib/repositories/UserRepository.js` |
| **완료 일자** | 2025-10-21 (Phase 1.3) |

---

### 4.2A ✅ UserRepository.updateProfile (신규)

| 항목 | 내용 |
|------|------|
| **✅ 신규 생성** | `lib/repositories/UserRepository.js:58` |
| **시그니처** | `async updateProfile(userId, profile)` |
| **목적** | 사용자 프로필 업데이트 |
| **사용 페이지** | - `app/mypage/page.js` (Phase 4.x에서 마이그레이션)<br>- Phase 3.x Use Cases에서 활용 예정 |
| **DB 접근** | `profiles` (UPDATE, WHERE id = userId) |
| **파라미터** | name, phone, address, address_detail, postal_code |
| **특징** | Service Role로 RLS 우회, 모든 필드 업데이트 가능 |
| **완료 레이어** | `Infrastructure` → `lib/repositories/UserRepository.js` |
| **완료 일자** | 2025-10-21 (Phase 1.3) |

---

### 4.3 getAllCustomers

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:1067` |
| **시그니처** | `getAllCustomers()` |
| **목적** | 전체 고객 목록 조회 (관리자용) |
| **사용 페이지** | - `app/admin/customers/page.js` (고객 관리 페이지, 존재 여부 불명) |
| **DB 접근** | `profiles` (SELECT *) |
| **특징** | 정렬 없음, 페이지네이션 없음 (성능 이슈 가능) |
| **목표 레이어** | `Infrastructure` → `lib/repositories/UserRepository.js` |
| **마이그레이션** | Phase 1.4 (Step 1.4.2) |

---

### 4.4 signIn / signUp / signOut

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:1813, 1828, 1867` |
| **시그니처** | `signIn(email, password)` / `signUp(email, password, userData)` / `signOut()` |
| **목적** | 인증 관련 함수 (Supabase Auth) |
| **사용 페이지** | - ⚠️ **사용 안 함** (hooks/useAuth.js로 대체됨) |
| **DB 접근** | `supabase.auth.signInWithPassword()` / `supabase.auth.signUp()` / `supabase.auth.signOut()` |
| **특징** | 레거시 함수, 제거 예정 |
| **목표 레이어** | 삭제 예정 (useAuth로 통합) |
| **마이그레이션** | Phase 0.6 (Step 0.6.2 - 레거시 함수 제거) |

---

## 🏢 5. 공급업체(Supplier) 관련 함수

### 5.1 getSuppliers

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2164` |
| **시그니처** | `getSuppliers()` |
| **목적** | 전체 공급업체 목록 조회 |
| **사용 페이지** | - `app/admin/suppliers/page.js` (공급업체 관리)<br>- `app/admin/products/new/page.js` (상품 등록 시 업체 선택)<br>- `app/admin/purchase-orders/page.js` (발주 관리) |
| **DB 접근** | `suppliers` (SELECT *) |
| **특징** | 정렬 없음 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/SupplierRepository.js` |
| **마이그레이션** | Phase 1.5 (Step 1.5.1) |

---

### 5.2 createSupplier

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2185` |
| **시그니처** | `createSupplier(supplierData)` |
| **목적** | 새 공급업체 등록 |
| **사용 페이지** | - `app/admin/suppliers/page.js` (업체 추가 모달) |
| **DB 접근** | `suppliers` (INSERT) |
| **특징** | 없음 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/SupplierRepository.js` |
| **마이그레이션** | Phase 1.5 (Step 1.5.2) |

---

### 5.3 updateSupplier

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2206` |
| **시그니처** | `updateSupplier(supplierId, supplierData)` |
| **목적** | 공급업체 정보 수정 |
| **사용 페이지** | - `app/admin/suppliers/page.js` (업체 편집) |
| **DB 접근** | `suppliers` (UPDATE) |
| **특징** | 없음 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/SupplierRepository.js` |
| **마이그레이션** | Phase 1.5 (Step 1.5.3) |

---

## 📦 6. 발주(Purchase Order) 관련 함수

### 6.1 getPurchaseOrdersBySupplier

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2565` |
| **시그니처** | `getPurchaseOrdersBySupplier(startDate = null, endDate = null)` |
| **목적** | 업체별 발주 대상 주문 집계 |
| **사용 페이지** | - `app/admin/purchase-orders/page.js` (발주 관리 메인) |
| **DB 접근** | `orders` (SELECT, status = 'deposited')<br>`order_items` (JOIN)<br>`products` (JOIN, supplier_id 필터링)<br>`suppliers` (JOIN)<br>`purchase_order_batches` (LEFT JOIN, 완료 제외) |
| **특징** | 업체별 그룹핑, 중복 발주 방지 (batch 제외) |
| **목표 레이어** | `Application` → `lib/use-cases/purchase-order/GetPurchaseOrdersUseCase.js` |
| **마이그레이션** | Phase 3.4 (Step 3.4.1) |

---

### 6.2 getPurchaseOrderBySupplier

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2665` |
| **시그니처** | `getPurchaseOrderBySupplier(supplierId, startDate = null, endDate = null)` |
| **목적** | 특정 업체의 발주 상세 조회 |
| **사용 페이지** | - `app/admin/purchase-orders/[supplierId]/page.js` (발주 상세) |
| **DB 접근** | `orders` (SELECT, status = 'deposited')<br>`order_items` (JOIN)<br>`products` (JOIN, WHERE supplier_id = supplierId)<br>`order_shipping` (JOIN) |
| **특징** | Excel 다운로드용 데이터 제공 |
| **목표 레이어** | `Application` → `lib/use-cases/purchase-order/GetPurchaseOrderDetailUseCase.js` |
| **마이그레이션** | Phase 3.4 (Step 3.4.2) |

---

## 📊 7. 카테고리 관련 함수

### 7.1 getCategories

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2140` |
| **시그니처** | `getCategories()` |
| **목적** | 전체 카테고리 목록 조회 |
| **사용 페이지** | - `app/admin/products/new/page.js` (상품 등록 시 카테고리 선택)<br>- 현재 거의 사용 안 함 |
| **DB 접근** | `categories` (SELECT *) |
| **특징** | 정렬 없음 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/CategoryRepository.js` |
| **마이그레이션** | Phase 1.6 (Step 1.6.1) |

---

## 🔥 8. 라이브 방송 관련 함수

### 8.1 getLiveBroadcasts

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:1915` |
| **시그니처** | `getLiveBroadcasts()` |
| **목적** | 활성 라이브 방송 조회 (status = 'active') |
| **사용 페이지** | - 현재 사용 안 함 (라이브 기능 미구현) |
| **DB 접근** | `live_broadcasts` (SELECT *) |
| **특징** | 라이브 기능 추후 구현 예정 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/LiveBroadcastRepository.js` |
| **마이그레이션** | Phase 4.7 (라이브 기능 구현 시) |

---

### 8.2 getLiveProducts

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:1991` |
| **시그니처** | `getLiveProducts()` |
| **목적** | 라이브 중인 상품 목록 조회 |
| **사용 페이지** | - 현재 사용 안 함 (라이브 기능 미구현) |
| **DB 접근** | `live_products` (SELECT *)<br>`products` (JOIN) |
| **특징** | priority 순서대로 정렬 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/LiveProductRepository.js` |
| **마이그레이션** | Phase 4.7 (라이브 기능 구현 시) |

---

### 8.3 addToLive

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2060` |
| **시그니처** | `addToLive(productId, priority = 0)` |
| **목적** | 상품을 라이브 방송에 추가 |
| **사용 페이지** | - 현재 사용 안 함 (라이브 기능 미구현) |
| **DB 접근** | `live_products` (INSERT) |
| **특징** | 라이브 기능 추후 구현 예정 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/LiveProductRepository.js` |
| **마이그레이션** | Phase 4.7 (라이브 기능 구현 시) |

---

### 8.4 removeFromLive

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2086` |
| **시그니처** | `removeFromLive(productId)` |
| **목적** | 상품을 라이브 방송에서 제거 |
| **사용 페이지** | - 현재 사용 안 함 (라이브 기능 미구현) |
| **DB 접근** | `live_products` (DELETE) |
| **특징** | 라이브 기능 추후 구현 예정 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/LiveProductRepository.js` |
| **마이그레이션** | Phase 4.7 (라이브 기능 구현 시) |

---

### 8.5 updateLivePriority

| 항목 | 내용 |
|------|------|
| **현재 위치** | `lib/supabaseApi.js:2111` |
| **시그니처** | `updateLivePriority(productId, priority)` |
| **목적** | 라이브 상품 우선순위 변경 |
| **사용 페이지** | - 현재 사용 안 함 (라이브 기능 미구현) |
| **DB 접근** | `live_products` (UPDATE: priority) |
| **특징** | 라이브 기능 추후 구현 예정 |
| **목표 레이어** | `Infrastructure` → `lib/repositories/LiveProductRepository.js` |
| **마이그레이션** | Phase 4.7 (라이브 기능 구현 시) |

---

## 🧮 9. 중앙화 모듈 (lib/) - 이미 분리된 함수들

### 9.1 OrderCalculations (lib/orderCalculations.js)

| 함수명 | 목적 | 사용 페이지 |
|--------|------|-------------|
| `calculateItemTotal(item)` | 개별 아이템 금액 계산 | checkout, orders, admin |
| `calculateSubtotal(items)` | 전체 아이템 소계 | checkout, orders |
| `calculateShipping(items, postalCode)` | 배송비 계산 (도서산간 포함) | checkout, orders |
| `calculateDiscount(subtotal, coupon)` | 쿠폰 할인 계산 | checkout, orders |
| `calculateFinalOrderAmount(orderData)` | 최종 결제 금액 계산 | checkout, orders, admin |

**특징**: ✅ 이미 중앙화됨, Clean Architecture 준수
**목표 레이어**: `Domain` → `lib/domain/order/OrderCalculations.js`
**마이그레이션**: Phase 2.2 (Step 2.2.1 - 위치만 이동)

---

### 9.2 UserProfileManager (lib/userProfileManager.js)

| 함수명 | 목적 | 사용 페이지 |
|--------|------|-------------|
| `getProfile(user)` | 카카오/Supabase 통합 프로필 조회 | checkout, orders, mypage |
| `saveProfile(user, profileData)` | 프로필 저장 (카카오/Supabase 분기) | mypage |

**특징**: ✅ 이미 중앙화됨, 카카오 sessionStorage 처리 포함
**목표 레이어**: `Infrastructure` → `lib/repositories/UserRepository.js`
**마이그레이션**: Phase 1.4 (Step 1.4.3 - UserRepository에 통합)

---

### 9.3A ✅ CouponRepository (마이그레이션 완료)

| 항목 | 내용 |
|------|------|
| **✅ 마이그레이션 완료** | `lib/repositories/CouponRepository.js` (139줄) |
| **목적** | 쿠폰 데이터 접근 레이어 - Service Role로 RLS 우회 |
| **메서드** | `findById(couponId)` - 쿠폰 상세 조회<br>`findUserCoupons(userId, filters)` - 사용자 쿠폰 목록 (user_coupons JOIN)<br>`validateCoupon(couponCode, userId, orderAmount)` - RPC: validate_coupon<br>`useCoupon(userId, couponId, orderId, discountAmount)` - RPC: use_coupon |
| **사용 페이지** | - checkout/page.js (쿠폰 선택, 검증, 사용)<br>- mypage/page.js (보유 쿠폰 확인)<br>- Phase 3.x Use Cases에서 호출 예정 |
| **RPC 함수** | `validate_coupon` - 쿠폰 유효성 검증 및 할인 계산<br>`use_coupon` - 쿠폰 사용 처리 (is_used = true, used_at, order_id 업데이트) |
| **완료 레이어** | `Infrastructure` → `lib/repositories/CouponRepository.js` |
| **완료 일자** | 2025-10-21 (Phase 1.4) |

---

### 9.3B couponApi - 관리자 함수 (향후 마이그레이션)

| 함수명 | 목적 | 목표 레이어 | 마이그레이션 |
|--------|------|-------------|--------------|
| `createCoupon(couponData)` | 관리자 쿠폰 생성 | Use Case | Phase 3.x |
| `updateCoupon(couponId, updates)` | 쿠폰 수정 | Use Case | Phase 3.x |
| `deleteCoupon(couponId)` | 쿠폰 삭제 | Use Case | Phase 3.x |
| `distributeCoupon(couponId, userIds, adminEmail)` | 쿠폰 배포 | Use Case | Phase 3.x |
| `distributeToAllCustomers(couponId, adminEmail)` | 전체 고객 배포 | Use Case | Phase 3.x |
| `getCouponHolders(couponId, filters)` | 보유 고객 목록 | Repository | Phase 1.4 (추후) |
| `getCouponStats(couponId)` | 쿠폰 통계 조회 | Use Case | Phase 3.x |

**특징**: 관리자 함수는 API Route(/api/admin/coupons/*) 사용 (Service Role)

---

### 9.4 shippingUtils (lib/shippingUtils.js)

| 함수명 | 목적 | 사용 페이지 |
|--------|------|-------------|
| `calculateShippingSurcharge(postalCode)` | 도서산간 추가비 계산 | checkout, orders, admin |
| `formatShippingInfo(baseShipping, postalCode)` | 배송비 정보 포맷팅 | checkout, orders, admin |

**특징**: ✅ 이미 중앙화됨, 제주/울릉도 우편번호 패턴 매칭
**목표 레이어**: `Domain` → `lib/domain/shipping/ShippingCalculator.js`
**마이그레이션**: Phase 2.3 (Step 2.3.1 - 위치만 이동)

---

### 9.5 logisticsAggregation (lib/logisticsAggregation.js)

| 함수명 | 목적 | 사용 페이지 |
|--------|------|-------------|
| `aggregateProductsForLogistics(orders)` | 물류팀용 상품 집계 | admin/logistics |
| `generateLogisticsCSV(products)` | 물류팀 CSV 생성 | admin/logistics |
| `getSupplierSummary(products)` | 업체별 요약 통계 | admin/logistics |

**특징**: ✅ 이미 중앙화됨, 순수 함수 (DB 접근 없음)
**목표 레이어**: `Domain` → `lib/domain/logistics/LogisticsAggregator.js`
**마이그레이션**: Phase 2.4 (Step 2.4.1 - 위치만 이동)

---

### 9.6 fulfillmentGrouping (lib/fulfillmentGrouping.js)

| 함수명 | 목적 | 사용 페이지 |
|--------|------|-------------|
| `groupOrdersByShipping(orders)` | 배송지별 주문 그룹핑 | admin/fulfillment-groups |
| `generateGroupCSV(groups, selectedOrderIds)` | 배송 취합 CSV 생성 | admin/fulfillment-groups |

**특징**: ✅ 이미 중앙화됨, 순수 함수
**목표 레이어**: `Domain` → `lib/domain/fulfillment/FulfillmentGrouper.js`
**마이그레이션**: Phase 2.5 (Step 2.5.1 - 위치만 이동)

---

### 9.7 trackingNumberUtils (lib/trackingNumberUtils.js)

| 함수명 | 목적 | 사용 페이지 |
|--------|------|-------------|
| `updateTrackingNumber(params)` | 송장번호 단일 등록 | admin/tracking |
| `bulkUpdateTrackingNumbers(params)` | 송장번호 일괄 등록 | admin/tracking |
| `parseTrackingExcel(file)` | Excel 파싱 | admin/tracking |
| `validateTrackingNumber(trackingNumber)` | 송장번호 유효성 검증 | admin/tracking |
| `getCarrierName(carrier)` | 택배사 한글명 조회 | admin/tracking |
| `getTrackingUrl(carrier, trackingNumber)` | 배송 추적 URL 생성 | orders |

**특징**: ✅ 이미 중앙화됨, 10개 택배사 지원
**목표 레이어**: `Infrastructure` → `lib/services/TrackingService.js`
**마이그레이션**: Phase 1.8 (Step 1.8.1)

---

### 9.8 productNumberGenerator (lib/productNumberGenerator.js)

| 함수명 | 목적 | 사용 페이지 |
|--------|------|-------------|
| `generateProductNumber()` | 상품번호 자동 생성 (P0001-P9999) | admin/products/new |

**특징**: ✅ 이미 중앙화됨, DB 최댓값 조회 후 +1
**목표 레이어**: `Domain` → `lib/domain/product/ProductNumber.js`
**마이그레이션**: Phase 2.6 (Step 2.6.1 - 위치만 이동)

---

### 9.9 ✅ QueueService (마이그레이션 완료)

| 항목 | 내용 |
|------|------|
| **✅ 마이그레이션 완료** | `lib/services/QueueService.js` (91줄) |
| **목적** | Queue 작업 관리 - BullMQ + Upstash Redis 기반 |
| **메서드** | `addJob(queueName, data, options)` - Queue에 작업 추가<br>`getQueuePosition(queueName, jobId)` - 작업 위치 조회 |
| **사용 페이지** | - Phase 3.x Use Cases에서 활용 예정<br>- 이메일, 알림, 배치 처리 등 비동기 작업 |
| **특징** | BullMQ Queue 인스턴스 캐싱<br>재시도 로직 내장 (3회, exponential backoff)<br>완료/실패 작업 자동 제거 (100/50개 유지) |
| **완료 레이어** | `Infrastructure` → `lib/services/QueueService.js` |
| **완료 일자** | 2025-10-21 (Phase 1.5) |

---

### 9.10 ✅ CacheService (마이그레이션 완료)

| 항목 | 내용 |
|------|------|
| **✅ 마이그레이션 완료** | `lib/services/CacheService.js` (72줄) |
| **목적** | 캐시 관리 - Upstash Redis 기반 캐시 시스템 |
| **메서드** | `get(key)` - 캐시 조회<br>`set(key, value, ttl)` - 캐시 저장 (TTL 설정)<br>`invalidate(key)` - 캐시 무효화 |
| **사용 페이지** | - Phase 3.x Use Cases에서 활용 예정<br>- 상품 목록, 사용자 프로필, API 응답 캐싱 |
| **특징** | Upstash Redis REST API 사용<br>기본 TTL: 3600초 (1시간)<br>서버리스 환경 최적화 |
| **완료 레이어** | `Infrastructure` → `lib/services/CacheService.js` |
| **완료 일자** | 2025-10-21 (Phase 1.6) |

---

## 📋 10. 레거시 함수 목록 (삭제 예정)

### 10.1 레거시 파일 - supabaseApi.js.bak / supabaseApi.js.bak2

| 파일명 | 상태 | 조치 |
|--------|------|------|
| `lib/supabaseApi.js.bak` | 백업 파일 (2025-10-15 이전) | Phase 0.6: `/deprecated/` 이동 |
| `lib/supabaseApi.js.bak2` | 백업 파일 (2025-10-10 이전) | Phase 0.6: `/deprecated/` 이동 |

---

### 10.2 레거시 함수 - supabaseApi.js 내부

| 함수명 | 사용 여부 | 대체 함수 | 조치 |
|--------|-----------|-----------|------|
| `getOrders` (line 673) | ❌ 사용 안 함 | `/api/orders/list` API | Phase 0.6: 삭제 |
| `getAllOrders` (line 774) | ❌ 사용 안 함 | `/api/admin/orders` API | Phase 0.6: 삭제 |
| `getCurrentUser` (line 1770) | ❌ 사용 안 함 | `useAuth` hook | Phase 0.6: 삭제 |
| `signIn` (line 1813) | ❌ 사용 안 함 | `useAuth` hook | Phase 0.6: 삭제 |
| `signUp` (line 1828) | ❌ 사용 안 함 | `useAuth` hook | Phase 0.6: 삭제 |
| `signOut` (line 1867) | ❌ 사용 안 함 | `useAuth` hook | Phase 0.6: 삭제 |
| `generateGroupOrderNumber` (line 1893) | ⚠️ 문제 있음 | 삭제 예정 (S 통일) | Phase 0.6: 삭제 |
| `checkOptionInventory` (line 330) | ⚠️ 레거시 | `checkVariantInventory` | Phase 0.6: 삭제 |
| `updateOptionInventory` (line 533) | ⚠️ 레거시 | `updateVariantInventory` | Phase 0.6: 삭제 |
| `updateOptionInventoryRPC` (line 454) | ⚠️ 레거시 | `updateVariantInventory` | Phase 0.6: 삭제 |
| `createOrderWithOptions` (line 482) | ❌ 사용 안 함 | `createOrder` | Phase 0.6: 삭제 |

**총 11개 레거시 함수 → Phase 0.6에서 일괄 제거**

---

## 🔍 11. Race Condition 위험 함수 (동시성 제어 필요)

### 11.1 재고 감소 함수 ✅ (Phase 1.7 완료 - 2025-10-21)

| 함수명 | 구현 방식 | 상태 | 비고 |
|--------|-----------|------|------|
| `update_product_inventory_with_lock` | FOR UPDATE NOWAIT | ✅ 완료 | RPC 함수 (Phase 1.7) |
| `update_variant_inventory_with_lock` | FOR UPDATE NOWAIT | ✅ 완료 | RPC 함수 (Phase 1.7) |
| `updateProductInventory` (레거시) | SELECT → UPDATE | ⚠️ Deprecated | Phase 3.x에서 제거 예정 |
| `updateVariantInventory` (레거시) | RPC (락 없음) | ⚠️ Deprecated | Phase 3.x에서 제거 예정 |

**마이그레이션**: ✅ Phase 1.7 완료 (2025-10-21)
**마이그레이션 파일**: `supabase/migrations/20251021223007_inventory_lock.sql`

#### update_product_inventory_with_lock

| 항목 | 내용 |
|------|------|
| **타입** | RPC 함수 (PostgreSQL) |
| **시그니처** | `update_product_inventory_with_lock(p_product_id UUID, p_change INTEGER)` |
| **반환값** | JSONB: `{product_id, old_inventory, new_inventory, change}` |
| **Lock 방식** | FOR UPDATE NOWAIT (락 획득 실패 시 즉시 에러) |
| **검증 로직** | 재고 부족 시 `insufficient_inventory` 에러 반환 |
| **에러 타입** | `lock_not_available`, `insufficient_inventory`, `product_not_found` |
| **사용처** | ProductRepository.updateInventory (Phase 3.x에서 마이그레이션) |
| **권한** | Service Role 전용 (SECURITY DEFINER) |

#### update_variant_inventory_with_lock

| 항목 | 내용 |
|------|------|
| **타입** | RPC 함수 (PostgreSQL) |
| **시그니처** | `update_variant_inventory_with_lock(p_variant_id UUID, p_change INTEGER)` |
| **반환값** | JSONB: `{variant_id, product_id, old_inventory, new_inventory, change}` |
| **Lock 방식** | FOR UPDATE NOWAIT (Variant + Product 모두 락) |
| **검증 로직** | 재고 부족 시 `insufficient_inventory` 에러 반환 |
| **Product 동기화** | Variant 재고 변경 시 Product 재고도 자동 업데이트 |
| **데드락 방지** | 항상 Variant → Product 순서로 락 획득 |
| **에러 타입** | `lock_not_available`, `insufficient_inventory`, `variant_not_found` |
| **사용처** | VariantRepository.updateInventory (Phase 3.x에서 마이그레이션) |
| **권한** | Service Role 전용 (SECURITY DEFINER) |

**Race Condition 해결 방식**:
```sql
-- Before (Race Condition 위험)
SELECT inventory FROM products WHERE id = product_id;  -- 동시 접속 시 같은 값 읽음
UPDATE products SET inventory = inventory - change WHERE id = product_id;

-- After (FOR UPDATE NOWAIT)
SELECT inventory FROM products WHERE id = product_id FOR UPDATE NOWAIT;  -- 락 획득 (실패 시 즉시 에러)
UPDATE products SET inventory = inventory - change WHERE id = product_id;  -- 안전한 업데이트
```

**Phase 3.x 마이그레이션 계획**:
- `ProductRepository.updateInventory` → `update_product_inventory_with_lock` RPC 호출로 변경
- `VariantRepository.updateInventory` → `update_variant_inventory_with_lock` RPC 호출로 변경
- `createOrder`, `updateOrderItemQuantity` → Use Case에서 RPC 함수 사용

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

**총 메서드 개수**: **101개** (91 + 10 Domain)
**레거시 함수**: 11개 (삭제 예정)
**유효 메서드**: **90개** (80 + 10 Domain)

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
| **주문 도메인 (Order Domain)** | **10개** | - | - | **Order Entity (10)** |

**총 90개 메서드 → 27개 파일로 분산 예정** (26 + 1 Domain Entity)

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
