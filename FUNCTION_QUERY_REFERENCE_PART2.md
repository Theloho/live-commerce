# 📊 함수/쿼리 참조 매트릭스 - PART2

**버전**: 1.1
**파일**: PART2 (주문 + 사용자 + 기타)
**작성일**: 2025-10-21

---

## ⚠️ 안내

이 파일은 `FUNCTION_QUERY_REFERENCE.md` (인덱스)의 일부입니다.

**파일 구조**:
- INDEX (FUNCTION_QUERY_REFERENCE.md) - 전체 목차 및 사용법
- PART1 - 섹션 1-2 (상품 + Variant)
- **PART2 (이 파일)** - 섹션 3-8 (주문 + 사용자 + 기타)
- PART3 - 섹션 9-11 (중앙화 모듈 + 레거시)
- PART4 - 섹션 12-15 (통계 + Domain + Use Cases)

**⚠️ 파일 크기 제한**: 25,000 토큰 이하 유지

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

