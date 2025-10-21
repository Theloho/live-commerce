# 📊 함수/쿼리 참조 매트릭스 (FUNCTION_QUERY_REFERENCE) - INDEX

**버전**: 1.1 (분할 완료)
**작성일**: 2025-10-21
**목적**: 전체 시스템의 모든 함수, 쿼리, DB 접근을 한눈에 파악하고 리팩토링 시 참조

---

## ⚠️ 파일 분할 안내

**이 문서는 25,000 토큰 제한 준수를 위해 4개 PART 파일로 분할되었습니다.**

### 📁 파일 구조

```
FUNCTION_QUERY_REFERENCE.md (이 파일 - 인덱스만)
├─ FUNCTION_QUERY_REFERENCE_PART1.md (~6,000 토큰)
│   └─ 상품 + Variant 관련 함수 (섹션 1-2)
├─ FUNCTION_QUERY_REFERENCE_PART2.md (~8,000 토큰)
│   └─ 주문 + 사용자 + 기타 (섹션 3-8)
├─ FUNCTION_QUERY_REFERENCE_PART3.md (~6,000 토큰)
│   └─ 중앙화 모듈 + 레거시 + Race Condition (섹션 9-11)
└─ FUNCTION_QUERY_REFERENCE_PART4.md (~7,000 토큰)
    └─ 통계 + Domain Entities + Use Cases (섹션 12-15)
```

---

## 📖 이 문서의 사용법

### 리팩토링 시 참조 순서

1. **함수 찾기**: Ctrl+F로 함수명 검색 (인덱스에서 PART 찾기)
2. **사용처 확인**: 해당 PART 파일에서 "사용 페이지" 섹션 확인
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

## 📑 전체 섹션 목차

### PART1: 상품 + Variant 관련 (섹션 1-2)
- **1. 상품(Product) 관련 함수** (8개)
  - getProducts, getProductById, addProduct, updateProduct 등
- **2. 상품 옵션/Variant 관련 함수** (10개)
  - checkVariantInventory, updateVariantInventory, createVariant 등

### PART2: 주문 + 사용자 + 기타 (섹션 3-8)
- **3. 주문(Order) 관련 함수** (10개)
  - createOrder, getOrders, updateOrderStatus, cancelOrder 등
- **4. 사용자(User) 관련 함수** (3개)
  - getCurrentUser, updateUserProfile 등
- **5. 공급업체(Supplier) 관련 함수** (3개)
- **6. 발주(Purchase Order) 관련 함수** (2개)
- **7. 카테고리 관련 함수** (1개)
- **8. 라이브 방송 관련 함수** (5개)

### PART3: 중앙화 모듈 + 레거시 (섹션 9-11)
- **9. 중앙화 모듈** (lib/) - 이미 분리된 함수들
  - orderCalculations.js (11개)
  - couponApi.js (15개)
  - userProfileManager.js (2개)
  - shippingUtils.js (2개)
  - logisticsAggregation.js (3개)
  - fulfillmentGrouping.js (2개)
  - trackingNumberUtils.js (6개)
- **10. 레거시 함수 목록** (삭제 예정, 11개)
- **11. Race Condition 위험 함수** (동시성 제어 필요, 3개)

### PART4: 통계 + Domain + Use Cases (섹션 12-15)
- **12. 함수 통계 요약**
  - 12.1 파일별 함수 개수
  - 12.2 카테고리별 함수 분류
  - 12.3 Domain Entities (Order, OrderCalculator, OrderValidator, Product, Inventory)
  - 12.4 Use Cases (CreateOrderUseCase)
- **13. 마이그레이션 우선순위**
- **14. 다음 단계 (Phase 0 완료 후)**
- **15. 이 문서 업데이트 규칙**

---

## 🔍 빠른 검색 가이드

| 찾고 있는 것 | 위치 |
|-------------|------|
| 상품 조회/등록/수정 | PART1 - 섹션 1 |
| Variant/옵션 관리 | PART1 - 섹션 2 |
| 주문 생성/조회/수정 | PART2 - 섹션 3 |
| 사용자 프로필 | PART2 - 섹션 4 |
| 공급업체/발주 | PART2 - 섹션 5-6 |
| 라이브 방송 | PART2 - 섹션 8 |
| 중앙화 모듈 (계산/쿠폰/배송) | PART3 - 섹션 9 |
| 레거시 함수 (삭제 예정) | PART3 - 섹션 10 |
| Race Condition 위험 | PART3 - 섹션 11 |
| 통계 요약 | PART4 - 섹션 12 |
| Domain Entities | PART4 - 섹션 12.3 |
| Use Cases | PART4 - 섹션 12.4 |
| 마이그레이션 우선순위 | PART4 - 섹션 13 |

---

## 📊 전체 통계 (2025-10-21 기준)

- **총 메서드 개수**: **133개**
  - 레거시 (supabaseApi.js): 91개
  - Domain Layer: 38개 (Order 10 + OrderCalculator 6 + OrderValidator 4 + Product 9 + Inventory 9)
  - Application Layer: 4개 (CreateOrderUseCase 1 + GetOrdersUseCase 1 + ApplyCouponUseCase 1 + CancelOrderUseCase 1)
  - Infrastructure Layer (Workers): 1개 (OrderWorker 1)
- **레거시 함수**: 11개 (삭제 예정)
- **유효 메서드**: **122개**

---

## 🔄 업데이트 규칙

1. **새 함수 추가 시**:
   - 해당 PART 파일에 추가
   - 파일 크기 확인 (25,000 토큰 이하 유지)
   - 인덱스(이 파일)의 통계 업데이트

2. **함수 마이그레이션 완료 시**:
   - 해당 함수 섹션에 ✅ 표시
   - "마이그레이션 완료" 행 추가
   - 통계 업데이트 (레거시 개수 감소)

3. **파일 크기 초과 시**:
   - 새 PART 파일 생성 (PART5, PART6...)
   - 인덱스 업데이트 (파일 구조, 섹션 목차)
   - CLAUDE.md에 새 PART 추가

---

**마지막 업데이트**: 2025-10-21 (Phase 3.1 완료 후 분할)
**다음 리뷰**: Phase 3.5 완료 후
