# FEATURE_CONNECTIVITY_MAP.md - 인덱스 및 가이드

**목적**: 기능 간 연결성과 데이터 흐름을 빠르게 파악하기 위한 맵

**생성일**: 2025-10-08
**버전**: 1.0

---

## 📚 문서 구조

이 문서는 3개의 PART 파일로 분할되어 있습니다:

- **PART 1**: 주문 시스템 + 상품 시스템
- **PART 2**: 쿠폰 시스템 + 배송 시스템
- **PART 3**: 관리자 시스템 + 발주 시스템

각 PART는 25,000 토큰 이하로 유지됩니다.

---

## 🎯 8개 주요 시스템 개요

### 1. 주문 생성 시스템 (PART 1)
**시작점**: BuyBottomSheet 또는 체크아웃
**종료점**: 주문 완료 페이지
**핵심 DB**: `orders`, `order_items`, `order_payments`, `order_shipping`, `product_variants`
**핵심 함수**: `createOrder()`, `updateVariantInventory()`, `applyCouponUsage()`

### 2. 상품 관리 시스템 (PART 1)
**시작점**: 관리자 상품 등록
**종료점**: 홈 페이지 노출
**핵심 DB**: `products`, `product_options`, `product_option_values`, `product_variants`, `variant_option_values`
**핵심 함수**: `createProductWithOptions()`, `createVariant()`

### 3. Variant 재고 시스템 (PART 1)
**시작점**: 상품 옵션 선택
**종료점**: 재고 차감 또는 복원
**핵심 DB**: `product_variants`
**핵심 함수**: `checkVariantInventory()`, `updateVariantInventory()` (FOR UPDATE)

### 4. 쿠폰 시스템 (PART 2)
**시작점**: 관리자 쿠폰 생성
**종료점**: 체크아웃 할인 적용
**핵심 DB**: `coupons`, `user_coupons`, `orders.discount_amount`
**핵심 함수**: `validateCoupon()`, `use_coupon()` (DB 함수)

### 5. 배송비 계산 시스템 (PART 2)
**시작점**: 주소 입력 (우편번호)
**종료점**: 총 결제 금액 계산
**핵심 DB**: `profiles.postal_code`, `order_shipping.postal_code`
**핵심 함수**: `formatShippingInfo()`, `calculateShippingSurcharge()`

### 6. 카카오 로그인 시스템 (PART 2)
**시작점**: 카카오 OAuth 인증
**종료점**: sessionStorage 사용자 정보 저장
**핵심 DB**: `profiles.kakao_id`, `orders.order_type`
**핵심 함수**: `UserProfileManager.normalizeProfile()`

### 7. 관리자 권한 시스템 (PART 3)
**시작점**: 관리자 로그인
**종료점**: Service Role API 호출
**핵심 DB**: `profiles.is_admin`, `admins`, `admin_sessions`
**핵심 함수**: `verifyAdminAuth()`, `supabaseAdmin` (Service Role)

### 8. 발주 시스템 (PART 3)
**시작점**: 입금확인 완료 주문
**종료점**: Excel 발주서 다운로드
**핵심 DB**: `purchase_order_batches`, `orders.status = 'deposited'`
**핵심 함수**: `getPurchaseOrderBySupplier()`

---

## 🗺️ 시스템 간 연결성 맵

```
┌─────────────────────────────────────────────────────────────┐
│                     홈 페이지 (/)                            │
│                        ↓                                     │
│              BuyBottomSheet (옵션 선택)                       │
└─────────────────────────────────────────────────────────────┘
                        ↓
         ┌──────────────┴──────────────┐
         ↓                             ↓
┌────────────────┐           ┌────────────────┐
│ Variant 재고   │           │  카카오 로그인 │
│  확인 시스템   │←──────────│    시스템      │
└────────────────┘           └────────────────┘
         ↓                             ↓
         ↓                    sessionStorage
         ↓                             ↓
┌─────────────────────────────────────────────────────────────┐
│              체크아웃 페이지 (/checkout)                     │
│    ┌──────────┬──────────┬──────────┬──────────┐           │
│    ↓          ↓          ↓          ↓          ↓           │
│  프로필    주소관리   쿠폰검증   배송비계산  입금자명       │
└─────────────────────────────────────────────────────────────┘
         ↓          ↓          ↓          ↓          ↓
         └──────────┴──────────┴──────────┴──────────┘
                        ↓
         ┌──────────────┴──────────────┐
         ↓                             ↓
┌────────────────┐           ┌────────────────┐
│  주문 생성     │           │  재고 차감     │
│   시스템       │──────────→│   시스템       │
└────────────────┘           └────────────────┘
         ↓                             ↓
         ↓                    product_variants
         ↓                       (FOR UPDATE)
         ↓
┌─────────────────────────────────────────────────────────────┐
│                주문 완료 페이지 (/orders/[id]/complete)     │
│         (쿠폰 사용 처리 + 배송비 표시)                       │
└─────────────────────────────────────────────────────────────┘
         ↓
         ↓ (status = 'deposited')
         ↓
┌─────────────────────────────────────────────────────────────┐
│           관리자 발주 시스템 (/admin/purchase-orders)       │
│         (업체별 그룹화 + Excel 다운로드)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📖 PART 파일 가이드

### PART 1: 주문 + 상품 + Variant
**파일**: `FEATURE_CONNECTIVITY_MAP_PART1.md`

**포함 내용**:
1. **주문 생성 전체 흐름** (BuyBottomSheet → 체크아웃 → 주문 완료)
2. **상품 등록 전체 흐름** (옵션 포함 상품 → Variant 생성 → 홈 노출)
3. **Variant 재고 관리 전체 흐름** (재고 확인 → 차감 → 복원)
4. **데이터베이스 연결 다이어그램**
5. **함수 체인 (Function Call Chain)**
6. **Claude용 체크리스트**

**언제 읽어야 하는가**:
- 주문 생성 기능 수정 시
- 재고 관리 로직 변경 시
- 옵션 상품 등록 기능 작업 시
- 장바구니 주문 처리 시

---

### PART 2: 쿠폰 + 배송 + 카카오
**파일**: `FEATURE_CONNECTIVITY_MAP_PART2.md`

**포함 내용**:
1. **쿠폰 전체 흐름** (생성 → 배포 → 검증 → 사용)
2. **배송비 계산 전체 흐름** (우편번호 → 도서산간 판정 → 배송비)
3. **카카오 로그인 전체 흐름** (OAuth → profiles → sessionStorage → RLS)
4. **데이터베이스 연결 다이어그램**
5. **함수 체인 (Function Call Chain)**
6. **Claude용 체크리스트**

**언제 읽어야 하는가**:
- 쿠폰 기능 수정 시
- 배송비 계산 로직 변경 시
- 카카오 로그인 문제 해결 시
- RLS 정책 수정 시

---

### PART 3: 관리자 + 발주
**파일**: `FEATURE_CONNECTIVITY_MAP_PART3.md`

**포함 내용**:
1. **관리자 인증 전체 흐름** (로그인 → Service Role API → RLS 우회)
2. **발주 시스템 전체 흐름** (입금확인 → 그룹화 → Excel 생성 → 중복 방지)
3. **데이터베이스 연결 다이어그램**
4. **함수 체인 (Function Call Chain)**
5. **Claude용 체크리스트**

**언제 읽어야 하는가**:
- 관리자 권한 문제 해결 시
- 발주 시스템 수정 시
- Service Role API 작업 시
- RLS 정책 우회 필요 시

---

## 🚀 빠른 참조 - 자주 하는 작업

### 주문 생성 문제 해결
1. **PART 1** 읽기 → "주문 생성 전체 흐름"
2. 체크리스트 확인 (variant_id, postal_code, discount_amount)
3. 함수 체인 추적 (createOrder → applyCouponUsage → updateVariantInventory)
4. DB 연결 다이어그램 확인

### 쿠폰 할인 안 됨 문제
1. **PART 2** 읽기 → "쿠폰 전체 흐름"
2. validateCoupon() 함수 체인 확인
3. 검증 순서 확인 (7단계)
4. use_coupon() DB 함수 확인

### 카카오 사용자 주문 조회 안 됨 문제
1. **PART 2** 읽기 → "카카오 로그인 전체 흐름"
2. RLS 정책 확인 (order_type LIKE '%KAKAO:${kakao_id}%')
3. UserProfileManager 확인
4. sessionStorage 데이터 확인

### 관리자 권한 에러 (403 Forbidden)
1. **PART 3** 읽기 → "관리자 인증 전체 흐름"
2. verifyAdminAuth() 함수 확인
3. Service Role API 확인 (SUPABASE_SERVICE_ROLE_KEY)
4. profiles.is_admin 플래그 확인

### 발주서 중복 생성 문제
1. **PART 3** 읽기 → "발주 시스템 전체 흐름"
2. purchase_order_batches.order_ids 배열 확인
3. GIN 인덱스 활용 쿼리 확인
4. 중복 방지 로직 확인

---

## 🔗 연관 문서

### 기능별 상세 참조
- **FEATURE_REFERENCE_MAP_PART1.md** - 주문/상품 기능 영향도 맵
- **FEATURE_REFERENCE_MAP_PART2.md** - Variant/사용자/인증 영향도 맵
- **FEATURE_REFERENCE_MAP_PART3.md** - 배송/쿠폰 영향도 맵

### 데이터 구조 참조
- **DB_REFERENCE_GUIDE.md** - 16개 테이블 상세 스키마
- **DB_SCHEMA_ANALYSIS_COMPLETE.md** - 본서버 DB 완전 분석

### 코드 구조 참조
- **CODE_ANALYSIS_COMPLETE.md** - 31개 페이지 + 80+ 함수
- **DETAILED_DATA_FLOW.md** - 8개 주요 페이지 데이터 흐름

### 시스템 구조 참조
- **SYSTEM_ARCHITECTURE.md** - 전체 아키텍처
- **CLAUDE.md** - 작업 가이드

---

## 🎯 이 문서의 목적

### 일반 개발자용
- 기능 수정 시 영향받는 다른 기능 즉시 파악
- 데이터 흐름 전체 경로 추적
- 필수 체크리스트 확인

### Claude용
- 문제 해결 시 전체 연결성 자동 분석
- 함수 체인 따라 근본 원인 추적
- 영향도 분석 자동화

---

**마지막 업데이트**: 2025-10-08
**작성자**: Claude (AI Assistant)
**버전**: 1.0
