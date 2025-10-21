# 📊 함수/쿼리 참조 매트릭스 - PART3

**버전**: 1.1
**파일**: PART3 (중앙화 모듈 + 레거시)
**작성일**: 2025-10-21

---

## ⚠️ 안내

이 파일은 `FUNCTION_QUERY_REFERENCE.md` (인덱스)의 일부입니다.

**파일 구조**:
- INDEX (FUNCTION_QUERY_REFERENCE.md) - 전체 목차 및 사용법
- PART1 - 섹션 1-2 (상품 + Variant)
- PART2 - 섹션 3-8 (주문 + 사용자 + 기타)
- **PART3 (이 파일)** - 섹션 9-11 (중앙화 모듈 + 레거시)
- PART4 - 섹션 12-15 (통계 + Domain + Use Cases)

**⚠️ 파일 크기 제한**: 25,000 토큰 이하 유지

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

