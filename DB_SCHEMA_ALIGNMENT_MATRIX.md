# 🗄️ DB 스키마 - 코드 정렬 매트릭스

**최종 업데이트**: 2025-10-23
**목적**: DB 컬럼명과 코드 사용 필드명의 불일치를 사전에 방지
**작성자**: Claude (사용자 요청)

---

## 📋 목차

1. [목적 및 사용법](#1-목적-및-사용법)
2. [현재 상태 요약](#2-현재-상태-요약)
3. [테이블별 매핑 테이블](#3-테이블별-매핑-테이블)
4. [Legacy 컬럼명 주의사항](#4-legacy-컬럼명-주의사항)
5. [신규 기능 추가 시 체크리스트](#5-신규-기능-추가-시-체크리스트)
6. [최근 버그 사례](#6-최근-버그-사례)

---

## 1. 목적 및 사용법

### 1.1 목적

- ✅ **사전 예방**: DB 컬럼명 불일치 버그를 코딩 전에 방지
- ✅ **빠른 참조**: 특정 테이블의 정확한 컬럼명을 빠르게 확인
- ✅ **버그 추적**: 과거 발생한 컬럼명 불일치 버그 사례 기록
- ✅ **정기 검증**: 신규 코드 추가 시 참조 문서

### 1.2 사용 시점

**모든 DB 작업 전에 이 문서를 먼저 확인하세요!**

1. ✅ **주문 생성/수정** → orders, order_items, order_shipping, order_payments 섹션 확인
2. ✅ **상품 관리** → products, product_variants 섹션 확인
3. ✅ **사용자 프로필** → profiles 섹션 확인
4. ✅ **새로운 DB 테이블 추가** → DB_REFERENCE_GUIDE.md 먼저 업데이트 후, 이 문서에 추가

---

## 2. 현재 상태 요약

### 2.1 ✅ Clean Architecture 파일 (100% 정렬됨)

**2025-10-23 검수 완료**:

| 레이어 | 파일 | 상태 | 검수일 |
|--------|------|------|--------|
| **Repository** | OrderRepository.js | ✅ 100% 일치 | 2025-10-23 |
| **Repository** | ProductRepository.js | ✅ 100% 일치 (.select('*')) | 2025-10-23 |
| **Repository** | UserRepository.js | ✅ 100% 일치 (.select('*')) | 2025-10-23 |
| **Use Case** | CreateOrderUseCase.js | ✅ 100% 일치 | 2025-10-23 |
| **Use Case** | GetOrdersUseCase.js | ✅ 100% 일치 (변환 레이어) | 2025-10-23 |

**핵심 포인트**:
- **OrderRepository**: 2025-10-23 세션에서 3개 버그 수정 완료
- **ProductRepository, UserRepository**: `.select('*')` 사용으로 자동 정렬
- **CreateOrderUseCase**: DB 저장 시 정확한 컬럼명 사용
- **GetOrdersUseCase**: DB → UI 변환 레이어 (의도된 네이밍 차이)

### 2.2 ⚠️ 주의 필요 영역

| 영역 | 파일 패턴 | 주의사항 |
|------|----------|----------|
| **Legacy 코드** | `docs/archive/legacy-use-cases/` | ❌ 사용 금지, 참조만 |
| **Deprecated** | `deprecated/` | ❌ 사용 금지 |
| **관리자 페이지** | `app/admin/` | ⚠️ 일부 수정됨 (2025-10-17) |

---

## 3. 테이블별 매핑 테이블

### 3.1 orders 테이블 (주문)

| DB 컬럼명 | 타입 | NULL | 기본값 | 설명 | 사용 위치 | 일치 여부 |
|-----------|------|------|--------|------|----------|-----------|
| `id` | UUID | ✅ | gen_random_uuid() | 주문 ID | OrderRepository, CreateOrderUseCase | ✅ 일치 |
| `user_id` | UUID | ✅ NULL 가능 | - | 사용자 ID (카카오 사용자는 NULL) | OrderRepository:92 | ✅ 일치 |
| `customer_order_number` | VARCHAR(50) | ✅ | - | 주문번호 (S251023-1234) | OrderRepository:94 | ✅ 일치 |
| `status` | VARCHAR(20) | ✅ | 'pending' | 주문 상태 (pending/verifying/paid/delivered/cancelled) | OrderRepository:95 | ✅ 일치 |
| `order_type` | VARCHAR(20) | ✅ | 'direct' | 주문 타입 (direct, cart, direct:KAKAO:123) | CreateOrderUseCase:93 | ✅ 일치 |
| `total_amount` | NUMERIC(10,2) | ✅ | - | 총 금액 | CreateOrderUseCase:96 | ✅ 일치 |
| `discount_amount` | NUMERIC(12,2) | ✅ | 0 | 쿠폰 할인 금액 | CreateOrderUseCase:97 | ✅ 일치 |
| `is_free_shipping` | BOOLEAN | ✅ | false | 무료배송 플래그 | CreateOrderUseCase:98 | ✅ 일치 |
| `payment_group_id` | VARCHAR(50) | ✅ NULL | - | 일괄결제 그룹 ID | - | ✅ 일치 |
| `verifying_at` | TIMESTAMPTZ | ✅ NULL | - | 결제 확인중 시각 | OrderRepository:246 | ✅ 일치 |
| `paid_at` | TIMESTAMPTZ | ✅ NULL | - | 결제 완료 시각 ⭐ (deposited_at ❌) | OrderRepository:247-248 | ✅ 일치 |
| `delivered_at` | TIMESTAMPTZ | ✅ NULL | - | 발송 완료 시각 | OrderRepository:249 | ✅ 일치 |
| `cancelled_at` | TIMESTAMPTZ | ✅ NULL | - | 취소 시각 | OrderRepository:250 | ✅ 일치 |
| `created_at` | TIMESTAMPTZ | ✅ | NOW() | 생성 시각 | - | ✅ 일치 |
| `updated_at` | TIMESTAMPTZ | ✅ | NOW() | 수정 시각 | - | ✅ 일치 |

**⚠️ 주의사항**:
- ❌ `deposited_at`는 **legacy 컬럼명**입니다. 실제 DB 컬럼명은 **`paid_at`** 사용!
- ✅ `paid_at` = 입금 확인 완료 시각 (2025-10-20 명확화)
- ✅ 실제 사용하는 상태: pending, verifying, paid, delivered, cancelled (deposited는 사용 안 함)

---

### 3.2 order_items 테이블 (주문 상품)

| DB 컬럼명 | 타입 | NULL | 기본값 | 설명 | 사용 위치 | 일치 여부 |
|-----------|------|------|--------|------|----------|-----------|
| `id` | UUID | ✅ | gen_random_uuid() | 주문 상품 ID | - | ✅ 일치 |
| `order_id` | UUID | ✅ | - | 주문 ID (FK) | CreateOrderUseCase:81 | ✅ 일치 |
| `product_id` | UUID | ✅ | - | 상품 ID (FK) | CreateOrderUseCase:101 | ✅ 일치 |
| `variant_id` | UUID | ✅ NULL | - | Variant ID (FK) ⭐ 재고 관리 | CreateOrderUseCase:102 | ✅ 일치 |
| `title` | TEXT | ✅ | - | 상품명 (주문 시점 스냅샷) | CreateOrderUseCase:103 | ✅ 일치 |
| `thumbnail_url` | TEXT | ✅ NULL | - | 썸네일 URL (2025-10-22 추가) | - | ✅ 일치 |
| `product_number` | VARCHAR(20) | ✅ NULL | - | 제품번호 (2025-10-22 추가) | - | ✅ 일치 |
| `quantity` | INTEGER | ✅ | 1 | 수량 | CreateOrderUseCase:104 | ✅ 일치 |
| `price` | NUMERIC(10,2) | ✅ | - | 단가 (신규) | CreateOrderUseCase:105 | ✅ 일치 |
| `unit_price` | NUMERIC(10,2) | ✅ | - | 단가 (기존) ⚠️ 중복 | CreateOrderUseCase:106 | ✅ 일치 |
| `total` | NUMERIC(10,2) | ✅ | - | 총액 (신규) | CreateOrderUseCase:107 | ✅ 일치 |
| `total_price` | NUMERIC(10,2) | ✅ | - | 총액 (기존) ⚠️ 중복 | CreateOrderUseCase:108 | ✅ 일치 |
| `selected_options` | JSONB | ✅ | {} | 선택 옵션 (스냅샷) | - | ✅ 일치 |
| `variant_title` | TEXT | ✅ NULL | - | Variant 제목 | - | ✅ 일치 |
| `sku` | TEXT | ✅ NULL | - | SKU | - | ✅ 일치 |
| `product_snapshot` | JSONB | ✅ | {} | 상품 스냅샷 | - | ✅ 일치 |
| `created_at` | TIMESTAMPTZ | ✅ | NOW() | 생성 시각 | - | ✅ 일치 |

**⚠️ 중복 컬럼 전략**:
- `price` + `unit_price` → **양쪽 모두 저장** (호환성)
- `total` + `total_price` → **양쪽 모두 저장** (호환성)
- 조회 시: `const unitPrice = item.unit_price || item.price` (fallback)

**⭐ 성능 최적화 (2025-10-22)**:
- `thumbnail_url`, `product_number`: order_items에 스냅샷 저장 → products JOIN 제거
- **효과**: 주문 조회 시 20배 빠름 (타임아웃 → 0.5초)

---

### 3.3 order_shipping 테이블 (배송 정보)

| DB 컬럼명 | 타입 | NULL | 기본값 | 설명 | 사용 위치 | 일치 여부 |
|-----------|------|------|--------|------|----------|-----------|
| `id` | UUID | ✅ | gen_random_uuid() | 배송 정보 ID | - | ✅ 일치 |
| `order_id` | UUID | ✅ | - | 주문 ID (FK) | OrderRepository:97 | ✅ 일치 |
| `name` | VARCHAR(100) | ✅ | - | 수령인명 ⭐ (recipient_name ❌) | CreateOrderUseCase:111 | ✅ 일치 |
| `phone` | VARCHAR(20) | ✅ | - | 연락처 | CreateOrderUseCase:112 | ✅ 일치 |
| `address` | TEXT | ✅ | - | 주소 | CreateOrderUseCase:113 | ✅ 일치 |
| `detail_address` | TEXT | ✅ NULL | - | 상세 주소 | - | ✅ 일치 |
| `postal_code` | VARCHAR(10) | ✅ NULL | - | 우편번호 (도서산간 배송비 계산 필수) | CreateOrderUseCase:114 | ✅ 일치 |
| `memo` | TEXT | ✅ NULL | - | 배송 메모 | - | ✅ 일치 |
| `shipping_fee` | NUMERIC(10,2) | ✅ | 4000 | 배송비 (도서산간 추가 포함) | CreateOrderUseCase:115 | ✅ 일치 |
| `shipping_method` | VARCHAR(50) | ✅ | 'standard' | 배송 방법 | - | ✅ 일치 |
| `tracking_number` | VARCHAR(100) | ✅ NULL | - | 송장 번호 | - | ✅ 일치 |
| `tracking_company` | VARCHAR(50) | ✅ NULL | - | 택배사명 (CJ대한통운, 한진택배 등) | - | ✅ 일치 |
| `shipped_at` | TIMESTAMPTZ | ✅ NULL | - | 출고 시각 | - | ✅ 일치 |
| `delivered_at` | TIMESTAMPTZ | ✅ NULL | - | 배송 완료 시각 | - | ✅ 일치 |
| `created_at` | TIMESTAMPTZ | ✅ | NOW() | 생성 시각 | - | ✅ 일치 |

**⚠️ 주의사항**:
- ❌ `recipient_name`는 **legacy 컬럼명**입니다. 실제 DB 컬럼명은 **`name`** 사용!
- ✅ 2025-10-23 세션에서 수정 완료 (커밋: 8729ed9)

---

### 3.4 order_payments 테이블 (결제 정보)

| DB 컬럼명 | 타입 | NULL | 기본값 | 설명 | 사용 위치 | 일치 여부 |
|-----------|------|------|--------|------|----------|-----------|
| `id` | UUID | ✅ | gen_random_uuid() | 결제 정보 ID | - | ✅ 일치 |
| `order_id` | UUID | ✅ | - | 주문 ID (FK) | OrderRepository:109 | ✅ 일치 |
| `method` | VARCHAR(50) | ✅ | - | 결제 방법 ⭐ (payment_method ❌) | CreateOrderUseCase:118 | ✅ 일치 |
| `amount` | NUMERIC(10,2) | ✅ | - | 결제 금액 | CreateOrderUseCase:119 | ✅ 일치 |
| `status` | VARCHAR(20) | ✅ | 'pending' | 결제 상태 | - | ✅ 일치 |
| `transaction_id` | VARCHAR(100) | ✅ NULL | - | 거래 ID | - | ✅ 일치 |
| `paid_at` | TIMESTAMPTZ | ✅ NULL | - | 결제 완료 시각 | - | ✅ 일치 |
| `bank_name` | VARCHAR(50) | ✅ NULL | - | 은행명 (무통장입금) | - | ✅ 일치 |
| `account_number` | VARCHAR(50) | ✅ NULL | - | 계좌번호 | - | ✅ 일치 |
| `depositor_name` | VARCHAR(100) | ✅ NULL | - | 입금자명 | CreateOrderUseCase:120 | ✅ 일치 |
| `created_at` | TIMESTAMPTZ | ✅ | NOW() | 생성 시각 | - | ✅ 일치 |

**⚠️ 주의사항**:
- ❌ `payment_method`는 **legacy 컬럼명**입니다. 실제 DB 컬럼명은 **`method`** 사용!
- ✅ 2025-10-23 세션에서 수정 완료 (커밋: 6c6d6e2)

---

### 3.5 products 테이블 (상품)

| DB 컬럼명 | 타입 | NULL | 기본값 | 설명 | 사용 위치 | 일치 여부 |
|-----------|------|------|--------|------|----------|-----------|
| `id` | UUID | ✅ | gen_random_uuid() | 상품 ID | ProductRepository (select *) | ✅ 일치 |
| `title` | VARCHAR(255) | ✅ | - | 상품명 | ProductRepository (select *) | ✅ 일치 |
| `description` | TEXT | ✅ NULL | - | 상품 설명 | ProductRepository (select *) | ✅ 일치 |
| `product_number` | VARCHAR(20) | ✅ NULL | - | 제품번호 (0001~9999) | ProductRepository (select *) | ✅ 일치 |
| `price` | NUMERIC(10,2) | ✅ | - | 가격 | ProductRepository (select *) | ✅ 일치 |
| `compare_price` | NUMERIC(10,2) | ✅ NULL | - | 비교 가격 | ProductRepository (select *) | ✅ 일치 |
| `discount_rate` | INTEGER | ✅ | 0 | 할인율 (%) | ProductRepository (select *) | ✅ 일치 |
| `purchase_price` | NUMERIC(10,2) | ✅ NULL | - | 매입가 (발주서에서 사용) | ProductRepository (select *) | ✅ 일치 |
| `thumbnail_url` | TEXT | ✅ NULL | - | 썸네일 URL ⭐ (image_url ❌) | ProductRepository (select *) | ✅ 일치 |
| `images` | JSONB | ✅ | [] | 이미지 배열 | ProductRepository (select *) | ✅ 일치 |
| `category` | VARCHAR(100) | ✅ NULL | - | 카테고리명 | ProductRepository (select *) | ✅ 일치 |
| `sub_category` | VARCHAR(100) | ✅ NULL | - | 서브 카테고리명 | ProductRepository (select *) | ✅ 일치 |
| `category_id` | UUID | ✅ NULL | - | 카테고리 ID (FK) | ProductRepository (select *) | ✅ 일치 |
| `supplier_id` | UUID | ✅ NULL | - | 업체 ID (FK) | ProductRepository (select *) | ✅ 일치 |
| `supplier_sku` | TEXT | ✅ NULL | - | 업체 SKU | ProductRepository (select *) | ✅ 일치 |
| `model_number` | TEXT | ✅ NULL | - | 모델 번호 | ProductRepository (select *) | ✅ 일치 |
| `inventory` | INTEGER | ✅ | 0 | 재고 (참고용, 실제는 variant.inventory) | ProductRepository (select *) | ✅ 일치 |
| `sku` | TEXT | ✅ NULL | - | SKU | ProductRepository (select *) | ✅ 일치 |
| `option_count` | INTEGER | ✅ | 0 | 옵션 개수 | ProductRepository (select *) | ✅ 일치 |
| `variant_count` | INTEGER | ✅ | 0 | Variant 개수 | ProductRepository (select *) | ✅ 일치 |
| `status` | TEXT | ✅ | 'active' | 상태 (active/draft/deleted) | ProductRepository (select *) | ✅ 일치 |
| `is_visible` | BOOLEAN | ✅ | true | 노출 여부 | ProductRepository (select *) | ✅ 일치 |
| `is_featured` | BOOLEAN | ✅ | false | 추천 상품 여부 | ProductRepository (select *) | ✅ 일치 |
| `is_live` | BOOLEAN | ✅ | false | 라이브 방송 여부 | ProductRepository (select *) | ✅ 일치 |
| `is_live_active` | BOOLEAN | ✅ | false | 라이브 방송 활성화 | ProductRepository (select *) | ✅ 일치 |
| `created_at` | TIMESTAMPTZ | ✅ | NOW() | 생성 시각 | ProductRepository (select *) | ✅ 일치 |
| `updated_at` | TIMESTAMPTZ | ✅ | NOW() | 수정 시각 | ProductRepository (select *) | ✅ 일치 |

**⚠️ 주의사항**:
- ❌ `image_url`는 **legacy 컬럼명**입니다. 실제 DB 컬럼명은 **`thumbnail_url`** 사용!
- ✅ 2025-10-17 세션에서 관리자 페이지 수정 완료 (7개 API 수정)
- ✅ ProductRepository는 `.select('*')`를 사용하므로 자동 정렬됨

---

### 3.6 product_variants 테이블 (Variant)

| DB 컬럼명 | 타입 | NULL | 기본값 | 설명 | 사용 위치 | 일치 여부 |
|-----------|------|------|--------|------|----------|-----------|
| `id` | UUID | ✅ | gen_random_uuid() | Variant ID | ProductRepository (select *) | ✅ 일치 |
| `product_id` | UUID | ✅ | - | 상품 ID (FK) | ProductRepository (select *) | ✅ 일치 |
| `sku` | VARCHAR(100) | ✅ UNIQUE | - | SKU (제품번호-옵션값1-옵션값2) | ProductRepository (select *) | ✅ 일치 |
| `inventory` | INTEGER | ✅ | 0 | **실제 재고** ⭐ (여기서 관리) | ProductRepository (select *) | ✅ 일치 |
| `price_adjustment` | NUMERIC(10,2) | ✅ | 0 | 가격 조정 | ProductRepository (select *) | ✅ 일치 |
| `is_active` | BOOLEAN | ✅ | true | 활성화 여부 | ProductRepository (select *) | ✅ 일치 |
| `created_at` | TIMESTAMPTZ | ✅ | NOW() | 생성 시각 | ProductRepository (select *) | ✅ 일치 |
| `updated_at` | TIMESTAMPTZ | ✅ | NOW() | 수정 시각 | ProductRepository (select *) | ✅ 일치 |

**⚠️ 주의사항**:
- ⭐ **실제 재고는 `product_variants.inventory`에서 관리**
- `products.inventory`는 참고용 (모든 variant 재고 합계, 트리거로 자동 업데이트)

---

### 3.7 profiles 테이블 (사용자 프로필)

| DB 컬럼명 | 타입 | NULL | 기본값 | 설명 | 사용 위치 | 일치 여부 |
|-----------|------|------|--------|------|----------|-----------|
| `id` | UUID | ✅ | - | 사용자 ID (auth.users와 동일) | UserRepository (select *) | ✅ 일치 |
| `email` | TEXT | ✅ NULL | - | 이메일 | UserRepository (select *) | ✅ 일치 |
| `name` | TEXT | ✅ NULL | - | 이름 | UserRepository (select *) | ✅ 일치 |
| `nickname` | TEXT | ✅ NULL | - | 닉네임 | UserRepository (select *) | ✅ 일치 |
| `avatar_url` | TEXT | ✅ NULL | - | 프로필 이미지 URL | UserRepository (select *) | ✅ 일치 |
| `phone` | TEXT | ✅ NULL | - | 연락처 | UserRepository (select *) | ✅ 일치 |
| `address` | TEXT | ✅ NULL | - | 주소 | UserRepository (select *) | ✅ 일치 |
| `detail_address` | TEXT | ✅ | '' | 상세 주소 | UserRepository (select *) | ✅ 일치 |
| `postal_code` | VARCHAR(10) | ✅ NULL | - | 우편번호 (도서산간 배송비 계산 필수) | UserRepository (select *) | ✅ 일치 |
| `addresses` | JSONB | ✅ | [] | 배송지 배열 | UserRepository (select *) | ✅ 일치 |
| `provider` | TEXT | ✅ | 'email' | 로그인 방식 (email/kakao/google) | UserRepository (select *) | ✅ 일치 |
| `kakao_id` | TEXT | ✅ NULL | - | 카카오 사용자 식별 ID | UserRepository (select *) | ✅ 일치 |
| `kakao_link` | TEXT | ✅ NULL | - | 카카오 링크 | UserRepository (select *) | ✅ 일치 |
| `tiktok_id` | TEXT | ✅ NULL | - | 틱톡 ID | UserRepository (select *) | ✅ 일치 |
| `youtube_id` | TEXT | ✅ NULL | - | 유튜브 ID | UserRepository (select *) | ✅ 일치 |
| `is_admin` | BOOLEAN | ✅ | false | 관리자 플래그 (2025-10-05 추가) | UserRepository (select *) | ✅ 일치 |
| `created_at` | TIMESTAMPTZ | ✅ | NOW() | 생성 시각 | UserRepository (select *) | ✅ 일치 |
| `updated_at` | TIMESTAMPTZ | ✅ | NOW() | 수정 시각 | UserRepository (select *) | ✅ 일치 |

**⚠️ 주의사항**:
- ✅ UserRepository는 `.select('*')`를 사용하므로 자동 정렬됨
- ⭐ `postal_code`: 도서산간 배송비 계산에 필수 (2025-10-03 추가)

---

## 4. Legacy 컬럼명 주의사항

### 4.1 ❌ 절대 사용 금지 (DB에 존재하지 않음)

| Legacy 컬럼명 | ✅ 올바른 DB 컬럼명 | 테이블 | 수정일 | 커밋 |
|--------------|-------------------|--------|--------|------|
| `recipient_name` | **`name`** | order_shipping | 2025-10-23 | 8729ed9 |
| `payment_method` | **`method`** | order_payments | 2025-10-23 | 6c6d6e2 |
| `deposited_at` | **`paid_at`** | orders | 2025-10-20 | - |
| `image_url` | **`thumbnail_url`** | products | 2025-10-17 | 37c57e1 |
| `supplier_sku` | ❌ 삭제됨 | products (관리자 페이지) | 2025-10-17 | - |

### 4.2 ⚠️ UI 호환성을 위한 변환 (허용됨)

**GetOrdersUseCase에서 DB → UI 변환 시에만 사용**:

| DB 컬럼명 | UI 필드명 | 목적 | 위치 |
|----------|----------|------|------|
| `method` | `payment_method` | 프론트엔드 호환성 | GetOrdersUseCase:173 |
| `paid_at` | `deposited_at` | 프론트엔드 호환성 | GetOrdersUseCase:127 |

**핵심 원칙**:
- ✅ **DB 저장 시**: 반드시 실제 DB 컬럼명 사용 (CreateOrderUseCase, OrderRepository)
- ✅ **DB 조회 후 UI 변환**: UI 호환성을 위해 변환 가능 (GetOrdersUseCase)

---

## 5. 신규 기능 추가 시 체크리스트

### 5.1 DB 작업 전 (필수!)

```
□ 1. DB_REFERENCE_GUIDE.md에서 정확한 컬럼명 확인
□ 2. 이 문서 (DB_SCHEMA_ALIGNMENT_MATRIX.md)에서 Legacy 컬럼명 확인
□ 3. 관련 Repository 코드 확인 (실제 사용 예시)
```

### 5.2 코드 작성 시

```
□ 1. Repository 패턴 사용 (직접 supabase 호출 금지)
   - OrderRepository, ProductRepository, UserRepository 사용
□ 2. DB 저장 시 실제 DB 컬럼명 사용
   - ✅ name (not recipient_name)
   - ✅ method (not payment_method)
   - ✅ paid_at (not deposited_at)
   - ✅ thumbnail_url (not image_url)
□ 3. 중복 컬럼 양쪽 모두 저장
   - price + unit_price
   - total + total_price
```

### 5.3 작업 완료 후

```
□ 1. npm run build 성공 확인
□ 2. 관련 테스트 작성 및 실행
□ 3. 이 문서 업데이트 (새로운 테이블 추가 시)
□ 4. DB_REFERENCE_GUIDE.md 업데이트 (새로운 테이블 추가 시)
```

---

## 6. 최근 버그 사례

### 6.1 버그 #1: create() 파라미터 구조 불일치 (2025-10-23)

**문제**:
```javascript
// ❌ 잘못된 방식 (구조 불일치)
await OrderRepository.create(orderData, orderItems, payment, shipping)
```

**원인**:
- OrderRepository.create()는 **객체 구조 파라미터** 받음
- 하지만 4개 인자를 따로 전달함

**해결**:
```javascript
// ✅ 올바른 방식
await OrderRepository.create({
  orderData: { ... },
  orderItems: [ ... ],
  payment: { ... },
  shipping: { ... }
})
```

**커밋**: `76df3a5`

---

### 6.2 버그 #2: recipient_name 컬럼 불일치 (2025-10-23)

**문제**:
```javascript
// ❌ 잘못된 DB 컬럼명
shipping: {
  recipient_name: shipping.name  // ❌ DB에 없음
}
```

**원인**:
- DB 스키마: `name` (정확한 컬럼명)
- 코드: `recipient_name` (legacy 컬럼명 사용)

**해결**:
```javascript
// ✅ 올바른 DB 컬럼명
shipping: {
  name: shipping.name  // ✅ DB 스키마와 일치
}
```

**영향**: CreateOrderUseCase:111
**커밋**: `8729ed9`

---

### 6.3 버그 #3: payment_method 컬럼 불일치 (2025-10-23)

**문제**:
```javascript
// ❌ 잘못된 DB 컬럼명
payment: {
  payment_method: payment.paymentMethod  // ❌ DB에 없음
}
```

**원인**:
- DB 스키마: `method` (정확한 컬럼명)
- 코드: `payment_method` (legacy 컬럼명 사용)

**해결**:
```javascript
// ✅ 올바른 DB 컬럼명
payment: {
  method: payment.paymentMethod  // ✅ DB 스키마와 일치
}
```

**영향**: CreateOrderUseCase:118
**커밋**: `6c6d6e2`

---

## 📌 빠른 참조

### 핵심 원칙

1. ✅ **DB 작업 전 항상 확인**: DB_REFERENCE_GUIDE.md + 이 문서
2. ✅ **Repository 패턴 사용**: 직접 supabase 호출 금지
3. ✅ **Legacy 컬럼명 금지**: recipient_name, payment_method, deposited_at, image_url
4. ✅ **중복 컬럼 양쪽 저장**: price/unit_price, total/total_price
5. ✅ **Clean Architecture 준수**: OrderRepository, CreateOrderUseCase는 이미 100% 정렬됨

### 문서 관리

- **이 문서 업데이트**: 새로운 테이블 추가 시
- **DB_REFERENCE_GUIDE.md 우선 업데이트**: 스키마 변경 시
- **정기 검증**: 매 세션 시작 시 현재 상태 요약 섹션 확인

---

**마지막 업데이트**: 2025-10-23
**검수 완료**: Repository 3개, Use Case 2개
**상태**: ✅ 100% 정렬 완료 (Clean Architecture 파일)
**다음 검수**: Phase 9 작업 후 (필요 시)
