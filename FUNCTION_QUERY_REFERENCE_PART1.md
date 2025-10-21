# 📊 함수/쿼리 참조 매트릭스 - PART1

**버전**: 1.1
**파일**: PART1 (상품 + Variant 관련)
**작성일**: 2025-10-21

---

## ⚠️ 안내

이 파일은 `FUNCTION_QUERY_REFERENCE.md` (인덱스)의 일부입니다.

**파일 구조**:
- INDEX (FUNCTION_QUERY_REFERENCE.md) - 전체 목차 및 사용법
- **PART1 (이 파일)** - 섹션 1-2 (상품 + Variant)
- PART2 - 섹션 3-8 (주문 + 사용자 + 기타)
- PART3 - 섹션 9-11 (중앙화 모듈 + 레거시)
- PART4 - 섹션 12-15 (통계 + Domain + Use Cases)

**⚠️ 파일 크기 제한**: 25,000 토큰 이하 유지

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

