# FEATURE_CONNECTIVITY_MAP_PART2.md - 쿠폰 + 배송 시스템

**⚠️ 이 파일은 전체 문서의 Part 2입니다**
- **Part 1**: 주문 시스템 + 상품 시스템
- **Part 2**: 쿠폰 시스템 + 배송 시스템 ← **현재 파일**
- **Part 3**: 관리자 시스템 + 발주 시스템

**생성일**: 2025-10-08
**버전**: 1.0
**목적**: 쿠폰, 배송비, 카카오 로그인 시스템의 연결성과 데이터 흐름 파악

---

## 📋 목차

1. [쿠폰 시스템 전체 연결성](#1-쿠폰-시스템-전체-연결성)
2. [배송비 계산 시스템 전체 연결성](#2-배송비-계산-시스템-전체-연결성)
3. [카카오 로그인 시스템 전체 연결성](#3-카카오-로그인-시스템-전체-연결성)
4. [데이터베이스 테이블 연결 다이어그램](#4-데이터베이스-테이블-연결-다이어그램)
5. [함수 체인 (Function Call Chain)](#5-함수-체인-function-call-chain)

---

## 1. 쿠폰 시스템 전체 연결성

### 1.1 쿠폰 생성 → 배포 → 사용 전체 흐름

```
┌─────────────────────────────────────────────────────────────┐
│ 1단계: 쿠폰 생성 (관리자)                                    │
│                                                              │
│ 시작: /admin/coupons/new                                     │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 입력:                                                        │
│  ├── code: 'WELCOME10' (자동 대문자)                         │
│  ├── name: '신규 가입 쿠폰'                                  │
│  ├── discount_type: 'percentage' or 'fixed_amount'           │
│  ├── discount_value: 10 (10% 또는 10,000원)                  │
│  ├── min_purchase_amount: 50000 (최소 구매 금액)             │
│  ├── max_discount_amount: 5000 (percentage 타입 필수)        │
│  ├── valid_from, valid_until: 유효 기간                     │
│  ├── usage_limit_per_user: 1 (사용자당 횟수)                 │
│  └── total_usage_limit: 100 (선착순 100명, NULL=무제한)     │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ createCoupon(couponData) - Service Role API 사용             │
│                                                              │
│ ⭐ 2025-10-07 변경: 클라이언트 직접 INSERT → API Route      │
│                                                              │
│ 프론트엔드 (lib/couponApi.js):                               │
│  ↓ calls                                                     │
│ POST /api/admin/coupons/create                               │
│  ↓ with                                                      │
│ { adminEmail: localStorage.adminEmail, ...couponData }       │
│                                                              │
│ 서버 사이드 (app/api/admin/coupons/create/route.js):        │
│  ↓ validates                                                 │
│ verifyAdminAuth(adminEmail)                                  │
│  ├── process.env.ADMIN_EMAILS 확인                          │
│  └── 관리자 아니면 403 에러                                  │
│  ↓ validates                                                 │
│ 쿠폰 데이터 검증:                                            │
│  ├── percentage 타입은 max_discount_amount 필수              │
│  ├── valid_until > valid_from                                │
│  ├── discount_value > 0                                      │
│  └── 쿠폰 코드 중복 확인                                     │
│  ↓ creates (Service Role Key)                                │
│ supabaseAdmin.from('coupons').insert({ ... })                │
│  └── RLS 정책 우회 (SUPABASE_SERVICE_ROLE_KEY)              │
│  ↓ returns                                                   │
│ { success: true, coupon: {...} }                             │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2단계: 쿠폰 배포 (관리자)                                    │
│                                                              │
│ 시작: /admin/coupons/[id] (쿠폰 상세 페이지)                │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 배포 방식 선택:                                              │
│  1) 개별 배포: distributeCoupon(couponId, [userId1, ...])   │
│  2) 전체 배포: distributeToAllCustomers(couponId)           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ distributeCoupon() - Service Role API 사용                   │
│                                                              │
│ 프론트엔드:                                                  │
│  ↓ calls                                                     │
│ POST /api/admin/coupons/distribute                           │
│  ↓ with                                                      │
│ { adminEmail, couponId, userIds: [...] }                     │
│                                                              │
│ 서버 사이드:                                                 │
│  ↓ validates                                                 │
│ verifyAdminAuth(adminEmail)                                  │
│  ↓ validates                                                 │
│ 쿠폰 활성화 상태 확인 (is_active = true)                     │
│  ↓ distributes (Service Role Key)                            │
│ supabaseAdmin.from('user_coupons').upsert([                  │
│   { user_id: userId1, coupon_id: couponId, ... },           │
│   { user_id: userId2, coupon_id: couponId, ... },           │
│   ...                                                        │
│ ])                                                           │
│  └── RLS 정책 우회                                           │
│  └── 중복 배포 허용 (UNIQUE 제약 제거됨, 2025-10-06)        │
│  ↓ trigger                                                   │
│ coupons.total_issued_count += userIds.length                 │
│  ↓ returns                                                   │
│ { success, distributedCount, requestedCount }                │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3단계: 쿠폰 조회 (사용자)                                    │
│                                                              │
│ 시작: /mypage/coupons                                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ getUserCoupons(userId)                                       │
│  ↓ queries (RLS 자동 적용)                                   │
│ SELECT uc.*, c.*                                             │
│ FROM user_coupons uc                                         │
│ JOIN coupons c ON uc.coupon_id = c.id                        │
│ WHERE uc.user_id = userId                                    │
│ ORDER BY c.valid_until ASC;                                  │
│                                                              │
│ 탭 필터링:                                                   │
│  ├── 사용 가능: is_used=false AND valid_until > NOW()       │
│  ├── 사용 완료: is_used=true                                 │
│  └── 기간 만료: is_used=false AND valid_until < NOW()       │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4단계: 쿠폰 검증 (체크아웃)                                  │
│                                                              │
│ 시작: /checkout - 쿠폰 선택                                  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ handleApplyCoupon(couponCode)                                │
│  ↓ calls                                                     │
│ validateCoupon(couponCode, userId, productAmount)            │
│  ↓ calls DB function (PostgreSQL)                            │
│ SELECT * FROM validate_coupon(                               │
│   p_coupon_code := 'WELCOME10',                              │
│   p_user_id := userId,                                       │
│   p_product_amount := 50000  -- ⭐ 배송비 제외!             │
│ );                                                           │
│                                                              │
│ DB 함수 내부 검증 순서 (7단계):                               │
│  1. 쿠폰 존재 및 활성화 여부 (is_active = true)              │
│  2. 유효 기간 시작 전 (NOW() < valid_from)                   │
│  3. 유효 기간 만료 (NOW() > valid_until)                     │
│  4. 최소 구매 금액 (productAmount >= min_purchase_amount)    │
│  5. 전체 사용 한도 (total_used_count < total_usage_limit)   │
│  6. 사용자 보유 여부 (user_coupons.user_id = p_user_id)     │
│  7. 사용 이력 (is_used = false)                              │
│                                                              │
│ 할인 금액 계산:                                              │
│  IF discount_type = 'fixed_amount' THEN                      │
│    discount := LEAST(discount_value, productAmount)          │
│  ELSE -- percentage                                          │
│    discount := productAmount * (discount_value / 100)        │
│    IF max_discount_amount IS NOT NULL THEN                   │
│      discount := LEAST(discount, max_discount_amount)        │
│    END IF                                                    │
│  END IF                                                      │
│                                                              │
│ 출력:                                                        │
│  ├── is_valid: true/false                                    │
│  ├── error_message: '재고 부족' 등                           │
│  ├── coupon_id: UUID                                         │
│  └── discount_amount: 5000 (계산된 할인 금액)                │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5단계: 쿠폰 사용 처리 (주문 생성 후)                         │
│                                                              │
│ 주문 생성 완료 후 즉시 호출                                  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ applyCouponUsage(userId, couponId, orderId, discountAmount)  │
│  ↓ calls DB function (PostgreSQL)                            │
│ SELECT use_coupon(                                           │
│   p_user_id := userId,                                       │
│   p_coupon_id := couponId,                                   │
│   p_order_id := orderId,                                     │
│   p_discount_amount := 5000                                  │
│ );                                                           │
│                                                              │
│ DB 함수 내부 (SECURITY DEFINER - RLS 우회):                 │
│  ↓ updates                                                   │
│ UPDATE user_coupons                                          │
│ SET is_used = true,                                          │
│     used_at = NOW(),                                         │
│     order_id = p_order_id,                                   │
│     discount_amount = p_discount_amount                      │
│ WHERE user_id = p_user_id                                    │
│   AND coupon_id = p_coupon_id                                │
│   AND is_used = false  -- ⭐ 중복 사용 방지                  │
│ RETURNING *;                                                 │
│                                                              │
│  ↓ trigger (자동 실행)                                       │
│ UPDATE coupons                                               │
│ SET total_used_count = total_used_count + 1                  │
│ WHERE id = p_coupon_id;                                      │
│                                                              │
│ 출력: true/false (성공 여부)                                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 종료: 주문 완료 페이지 (/orders/[id]/complete)              │
│                                                              │
│ 표시:                                                        │
│  ├── 상품 금액: 50,000원                                     │
│  ├── 쿠폰 할인: -5,000원 ⭐                                  │
│  ├── 배송비: +4,000원                                        │
│  └── 최종 결제: 49,000원                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 배송비 계산 시스템 전체 연결성

### 2.1 우편번호 입력 → 배송비 계산 전체 흐름

```
┌─────────────────────────────────────────────────────────────┐
│ 1단계: 주소 입력 (AddressManager)                            │
│                                                              │
│ 시작: /mypage 또는 /checkout                                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ Daum 우편번호 검색 API                                       │
│                                                              │
│ new daum.Postcode({                                          │
│   oncomplete: function(data) {                               │
│     postalCode = data.zonecode;  // '63000' (제주)          │
│     address = data.address;                                  │
│   }                                                          │
│ });                                                          │
│                                                              │
│ 저장:                                                        │
│  ├── profiles.postal_code (기본 배송지)                      │
│  └── profiles.addresses JSONB (여러 배송지)                  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2단계: 배송비 계산 (체크아웃 또는 주문 조회)                 │
│                                                              │
│ formatShippingInfo(baseShipping, postalCode)                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ calculateShippingSurcharge(postalCode)                       │
│                                                              │
│ 입력: postalCode = '63100' (제주)                            │
│                                                              │
│ 검증:                                                        │
│  ├── 우편번호 형식 확인 (5자리 숫자)                         │
│  └── parseInt(postalCode)                                    │
│                                                              │
│ 지역 판정:                                                   │
│  IF (63000 <= postalCode <= 63644) THEN                      │
│    region = '제주'                                           │
│    surcharge = 3000                                          │
│    isRemote = true                                           │
│                                                              │
│  ELSE IF (40200 <= postalCode <= 40240) THEN                 │
│    region = '울릉도'                                         │
│    surcharge = 5000                                          │
│    isRemote = true                                           │
│                                                              │
│  ELSE IF (기타 도서산간 - 향후 확장) THEN                    │
│    region = '기타 도서산간'                                  │
│    surcharge = 5000                                          │
│    isRemote = true                                           │
│                                                              │
│  ELSE                                                        │
│    region = '일반'                                           │
│    surcharge = 0                                             │
│    isRemote = false                                          │
│  END IF                                                      │
│                                                              │
│ 출력:                                                        │
│  ├── isRemote: true                                          │
│  ├── region: '제주'                                          │
│  └── surcharge: 3000                                         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ formatShippingInfo() 반환값                                  │
│                                                              │
│ {                                                            │
│   baseShipping: 4000,     // 기본 배송비                     │
│   surcharge: 3000,         // 도서산간 추가비                │
│   totalShipping: 7000,     // 총 배송비                      │
│   isRemote: true,          // 도서산간 여부                  │
│   region: '제주'           // 지역명                         │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3단계: DB 저장 (주문 생성 시)                                │
│                                                              │
│ order_shipping (INSERT)                                      │
│  ├── postal_code: '63100' (필수)                             │
│  ├── shipping_cost: 7000 (기본 + 도서산간)                   │
│  └── address, detail_address, ...                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4단계: 주문 조회 시 배송비 재계산                            │
│                                                              │
│ 목적: DB 저장값과 실시간 계산값 비교 (관리자 페이지)         │
│                                                              │
│ getOrderById(orderId)                                        │
│  ↓ fetches                                                   │
│ order_shipping.postal_code, order_shipping.shipping_cost     │
│  ↓ calculates                                                │
│ formatShippingInfo(4000, postalCode)                         │
│  ↓ compares                                                  │
│ IF (calculated !== stored) THEN                              │
│   logger.warn('배송비 불일치')                               │
│ END IF                                                       │
│  ↓ uses                                                      │
│ 저장된 값 우선 사용 (DB 저장값 신뢰)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 카카오 로그인 시스템 전체 연결성

### 3.1 카카오 OAuth → 프로필 저장 → 주문 조회 전체 흐름

```
┌─────────────────────────────────────────────────────────────┐
│ 1단계: 카카오 OAuth 인증                                     │
│                                                              │
│ 시작: /login - 카카오 로그인 버튼 클릭                       │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 카카오 인증 서버 리다이렉트                                  │
│                                                              │
│ https://kauth.kakao.com/oauth/authorize                      │
│  ├── client_id: KAKAO_APP_KEY                                │
│  ├── redirect_uri: /auth/callback                            │
│  └── response_type: code                                     │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2단계: 콜백 처리 (/auth/callback)                            │
│                                                              │
│ 입력: code (인증 코드)                                       │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 토큰 발급 및 사용자 정보 조회                                │
│                                                              │
│ POST https://kauth.kakao.com/oauth/token                     │
│  ↓ returns                                                   │
│ { access_token, refresh_token }                              │
│  ↓ calls                                                     │
│ GET https://kapi.kakao.com/v2/user/me                        │
│  ↓ returns                                                   │
│ {                                                            │
│   id: '1234567890',  -- ⭐ kakao_id                          │
│   kakao_account: {                                           │
│     profile: { nickname: '홍길동' },                         │
│     email: 'hong@example.com',                               │
│     phone_number: '+82 10-1234-5678'                         │
│   }                                                          │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3단계: profiles 테이블 확인 및 저장                          │
│                                                              │
│ SELECT * FROM profiles                                       │
│ WHERE kakao_id = '1234567890';                               │
│                                                              │
│ IF (NOT FOUND) THEN  -- 신규 사용자                          │
│   INSERT INTO profiles (                                     │
│     kakao_id,                                                │
│     email,                                                   │
│     name,                                                    │
│     nickname,                                                │
│     phone,                                                   │
│     provider                                                 │
│   ) VALUES (                                                 │
│     '1234567890',                                            │
│     'hong@example.com',                                      │
│     '홍길동',                                                │
│     '홍길동',                                                │
│     '010-1234-5678',                                         │
│     'kakao'                                                  │
│   );                                                         │
│ ELSE  -- 기존 사용자                                         │
│   -- 프로필 정보 업데이트 (선택적)                           │
│ END IF                                                       │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4단계: sessionStorage 저장                                   │
│                                                              │
│ sessionStorage.setItem('user', JSON.stringify({              │
│   kakao_id: '1234567890',  -- ⭐ 핵심                        │
│   email: 'hong@example.com',                                 │
│   name: '홍길동',                                            │
│   nickname: '홍길동',                                        │
│   phone: '010-1234-5678',                                    │
│   is_kakao: true  -- ⭐ 플래그                               │
│ }));                                                         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5단계: 주문 생성 시 order_type 저장                          │
│                                                              │
│ createOrder(orderData, userProfile, depositName)             │
│  ↓ checks                                                    │
│ IF (userProfile.is_kakao) THEN                               │
│   order_type = `direct:KAKAO:${userProfile.kakao_id}`       │
│   user_id = NULL  -- ⭐ auth.users에 없음                    │
│ ELSE                                                         │
│   order_type = 'direct'                                      │
│   user_id = auth.uid()                                       │
│ END IF                                                       │
│                                                              │
│ INSERT INTO orders (                                         │
│   user_id,        -- NULL (카카오) or UUID (일반)           │
│   order_type,     -- 'direct:KAKAO:1234567890'              │
│   ...                                                        │
│ );                                                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 6단계: 주문 조회 (RLS 정책 자동 적용)                        │
│                                                              │
│ getOrders()                                                  │
│  ↓ RLS SELECT 정책                                           │
│ SELECT * FROM orders                                         │
│ WHERE (                                                      │
│   -- 일반 사용자                                             │
│   user_id = auth.uid()                                       │
│   OR                                                         │
│   -- 카카오 사용자 (헬퍼 함수 사용)                          │
│   order_type LIKE '%KAKAO:' ||                               │
│                  get_current_user_kakao_id() || '%'          │
│   OR                                                         │
│   -- 관리자                                                  │
│   (SELECT is_admin FROM profiles                             │
│    WHERE id = auth.uid()) = true                             │
│ );                                                           │
│                                                              │
│ 성능 최적화 (2025-10-05):                                    │
│  ├── get_current_user_kakao_id() 함수 캐싱 (STABLE)         │
│  ├── idx_orders_order_type_gin (GIN 인덱스)                 │
│  └── idx_profiles_id_kakao_id (복합 인덱스)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 데이터베이스 테이블 연결 다이어그램

### 4.1 쿠폰 시스템 테이블 관계

```
profiles (사용자)
    ├── id (UUID) - auth.users 연결
    └── is_admin (BOOLEAN)
        ↓
        │ (FK: created_by)
        ↓
    coupons (쿠폰 마스터)
        ├── id (UUID)
        ├── code (VARCHAR) UNIQUE - 'WELCOME10'
        ├── discount_type (VARCHAR) - 'fixed_amount' | 'percentage'
        ├── discount_value (DECIMAL) - 10% 또는 10000원
        ├── min_purchase_amount (DECIMAL) - 최소 구매 금액
        ├── max_discount_amount (DECIMAL) - 퍼센트 최대 할인
        ├── valid_from, valid_until (TIMESTAMPTZ) - 유효 기간
        ├── usage_limit_per_user (INT) - 사용자당 횟수
        ├── total_usage_limit (INT) - 전체 사용 한도
        ├── total_issued_count (INT) - 총 발급 수 (트리거 자동)
        ├── total_used_count (INT) - 총 사용 수 (트리거 자동)
        └── is_active (BOOLEAN) - 활성화 여부
            ↓
            │ (FK: coupon_id)
            ↓
        user_coupons (사용자별 쿠폰)
            ├── id (UUID)
            ├── user_id (UUID) FK → profiles
            ├── coupon_id (UUID) FK → coupons
            ├── is_used (BOOLEAN) - 사용 여부
            ├── used_at (TIMESTAMPTZ) - 사용 시점
            ├── order_id (UUID) FK → orders - 어떤 주문에 사용?
            ├── discount_amount (DECIMAL) - 실제 할인 금액 (스냅샷)
            └── issued_by (UUID) FK → profiles - 배포자
                ↓
                │ (FK: order_id)
                ↓
            orders (주문)
                ├── id (UUID)
                ├── discount_amount (DECIMAL) - 쿠폰 할인 (2025-10-04)
                └── total_amount (DECIMAL) - 상품금액 + 배송비
```

### 4.2 배송비 계산 테이블 관계

```
profiles (사용자)
    ├── postal_code (VARCHAR) - 기본 배송지 우편번호 (2025-10-03)
    └── addresses (JSONB) - 여러 배송지 배열
        [
          {
            postal_code: '63100',
            address: '제주시...',
            is_default: true
          }
        ]
        ↓
        │ (주문 생성 시 복사)
        ↓
    order_shipping (배송 정보)
        ├── id (UUID)
        ├── order_id (UUID) FK → orders
        ├── postal_code (VARCHAR) - 주문 시점 우편번호 ⭐
        ├── address (TEXT)
        ├── detail_address (TEXT)
        ├── shipping_cost (NUMERIC) - 저장된 배송비
        ├── name (TEXT)
        ├── phone (TEXT)
        └── tracking_number (VARCHAR) - 송장번호 (optional)
```

### 4.3 카카오 로그인 테이블 관계

```
Kakao OAuth Server
    ↓ (인증 성공)
    kakao_id: '1234567890'
    email, name, nickname, phone
    ↓
profiles (사용자)
    ├── id (UUID) - NULL 또는 Supabase UUID
    ├── kakao_id (TEXT) - '1234567890' ⭐ 핵심
    ├── email (TEXT)
    ├── name (TEXT)
    ├── nickname (TEXT)
    ├── phone (TEXT)
    ├── provider (TEXT) - 'kakao'
    └── is_admin (BOOLEAN)
        ↓
        │ (주문 생성 시)
        ↓
    orders (주문)
        ├── id (UUID)
        ├── user_id (UUID) - NULL (카카오) | UUID (일반)
        ├── order_type (VARCHAR) - 'direct:KAKAO:1234567890' ⭐
        └── ...
            ↓
            │ (RLS 정책)
            ↓
        SELECT 정책:
            user_id = auth.uid()  -- 일반 사용자
            OR
            order_type LIKE '%KAKAO:' ||
                get_current_user_kakao_id() || '%'  -- 카카오 사용자
```

---

## 5. 함수 체인 (Function Call Chain)

### 5.1 쿠폰 생성 → 배포 → 사용 함수 체인

```javascript
// ========================================
// 1. 쿠폰 생성 (관리자)
// ========================================

// 프론트엔드 (lib/couponApi.js)
createCoupon(couponData)
  ↓ calls API Route
  POST /api/admin/coupons/create
  ↓ with body
  {
    adminEmail: localStorage.getItem('adminEmail'),
    code: 'WELCOME10',
    discount_type: 'percentage',
    discount_value: 10,
    max_discount_amount: 5000,
    ...
  }

// 서버 사이드 (app/api/admin/coupons/create/route.js)
export async function POST(request) {
  const { adminEmail, ...couponData } = await request.json()

  ↓ validates
  verifyAdminAuth(adminEmail)
    ├── process.env.ADMIN_EMAILS.split(',').includes(adminEmail)
    └── IF (false) THEN return 403

  ↓ validates data
  validateCouponData(couponData)
    ├── percentage 타입은 max_discount_amount 필수
    ├── valid_until > valid_from
    └── discount_value > 0

  ↓ creates (Service Role)
  const { data, error } = await supabaseAdmin
    .from('coupons')
    .insert({
      code: couponData.code.toUpperCase(),
      ...couponData,
      created_by: adminUserId
    })
    .select()

  ↓ returns
  return NextResponse.json({ success: true, coupon: data })
}

// ========================================
// 2. 쿠폰 배포 (관리자)
// ========================================

// 프론트엔드
distributeCoupon(couponId, userIds)
  ↓ calls API Route
  POST /api/admin/coupons/distribute
  ↓ with body
  { adminEmail, couponId, userIds: [...] }

// 서버 사이드
export async function POST(request) {
  const { adminEmail, couponId, userIds } = await request.json()

  ↓ validates
  verifyAdminAuth(adminEmail)

  ↓ validates coupon
  const { data: coupon } = await supabaseAdmin
    .from('coupons')
    .select('is_active')
    .eq('id', couponId)
    .single()

  IF (!coupon.is_active) THEN
    return 400 '비활성화된 쿠폰'

  ↓ distributes (Service Role)
  const userCoupons = userIds.map(userId => ({
    user_id: userId,
    coupon_id: couponId,
    issued_by: adminUserId,
    issued_at: new Date().toISOString()
  }))

  const { data, error } = await supabaseAdmin
    .from('user_coupons')
    .upsert(userCoupons)  -- 중복 허용 (2025-10-06)

  ↓ trigger (DB)
  UPDATE coupons
  SET total_issued_count = total_issued_count + userIds.length
  WHERE id = couponId

  ↓ returns
  return NextResponse.json({
    success: true,
    distributedCount: data.length,
    requestedCount: userIds.length
  })
}

// ========================================
// 3. 쿠폰 검증 (체크아웃)
// ========================================

// 프론트엔드
handleApplyCoupon(couponCode)
  ↓ calls
  validateCoupon(couponCode, userId, productAmount)
    ↓ calls DB function
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_coupon_code: couponCode,
      p_user_id: userId,
      p_product_amount: productAmount  -- 배송비 제외!
    })

    ↓ returns
    {
      is_valid: true,
      error_message: null,
      coupon_id: 'uuid',
      discount_amount: 5000
    }

  ↓ if (is_valid)
  setAppliedCoupon({ code, discountAmount })

  ↓ calculates
  finalAmount = productAmount - discountAmount + shippingFee

// DB 함수 (validate_coupon)
CREATE OR REPLACE FUNCTION validate_coupon(
    p_coupon_code VARCHAR(50),
    p_user_id UUID,
    p_product_amount DECIMAL(12, 2)
)
RETURNS TABLE (...) AS $$
DECLARE
    v_coupon coupons%ROWTYPE;
    v_discount DECIMAL(12, 2);
BEGIN
    -- 1. 쿠폰 조회
    SELECT * INTO v_coupon
    FROM coupons
    WHERE code = UPPER(p_coupon_code)
      AND is_active = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, '존재하지 않는 쿠폰', NULL, 0;
        RETURN;
    END IF;

    -- 2. 유효 기간 확인
    IF NOW() < v_coupon.valid_from THEN
        RETURN QUERY SELECT false, '아직 사용할 수 없는 쿠폰', NULL, 0;
        RETURN;
    END IF;

    IF NOW() > v_coupon.valid_until THEN
        RETURN QUERY SELECT false, '유효 기간이 만료된 쿠폰', NULL, 0;
        RETURN;
    END IF;

    -- 3. 최소 구매 금액
    IF p_product_amount < v_coupon.min_purchase_amount THEN
        RETURN QUERY SELECT false,
            '최소 구매 금액 ' || v_coupon.min_purchase_amount || '원 이상',
            NULL, 0;
        RETURN;
    END IF;

    -- 4. 전체 사용 한도
    IF v_coupon.total_usage_limit IS NOT NULL THEN
        IF v_coupon.total_used_count >= v_coupon.total_usage_limit THEN
            RETURN QUERY SELECT false, '쿠폰 사용 가능 횟수 초과', NULL, 0;
            RETURN;
        END IF;
    END IF;

    -- 5. 사용자 보유 확인
    IF NOT EXISTS (
        SELECT 1 FROM user_coupons
        WHERE user_id = p_user_id
          AND coupon_id = v_coupon.id
    ) THEN
        RETURN QUERY SELECT false, '보유하지 않은 쿠폰', NULL, 0;
        RETURN;
    END IF;

    -- 6. 사용 이력 확인
    IF EXISTS (
        SELECT 1 FROM user_coupons
        WHERE user_id = p_user_id
          AND coupon_id = v_coupon.id
          AND is_used = true
    ) THEN
        RETURN QUERY SELECT false, '이미 사용한 쿠폰', NULL, 0;
        RETURN;
    END IF;

    -- 7. 할인 금액 계산
    IF v_coupon.discount_type = 'fixed_amount' THEN
        v_discount := LEAST(v_coupon.discount_value, p_product_amount);
    ELSE -- percentage
        v_discount := p_product_amount * (v_coupon.discount_value / 100);
        IF v_coupon.max_discount_amount IS NOT NULL THEN
            v_discount := LEAST(v_discount, v_coupon.max_discount_amount);
        END IF;
    END IF;

    -- 성공 반환
    RETURN QUERY SELECT true, NULL::TEXT, v_coupon.id, v_discount;
END;
$$ LANGUAGE plpgsql;

// ========================================
// 4. 쿠폰 사용 처리 (주문 생성 후)
// ========================================

// 프론트엔드
createOrder(...)
  ↓ after success
  applyCouponUsage(userId, couponId, orderId, discountAmount)
    ↓ calls DB function
    const { data, error } = await supabase.rpc('use_coupon', {
      p_user_id: userId,
      p_coupon_id: couponId,
      p_order_id: orderId,
      p_discount_amount: discountAmount
    })

    ↓ returns
    true/false (성공 여부)

// DB 함수 (use_coupon)
CREATE OR REPLACE FUNCTION use_coupon(
    p_user_id UUID,
    p_coupon_id UUID,
    p_order_id UUID,
    p_discount_amount DECIMAL(12, 2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- RLS 우회
AS $$
DECLARE
    v_affected_rows INT;
BEGIN
    -- user_coupons 업데이트
    UPDATE user_coupons
    SET is_used = true,
        used_at = NOW(),
        order_id = p_order_id,
        discount_amount = p_discount_amount
    WHERE user_id = p_user_id
      AND coupon_id = p_coupon_id
      AND is_used = false;  -- 중복 사용 방지

    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

    IF v_affected_rows = 0 THEN
        RETURN false;  -- 이미 사용됨
    END IF;

    -- 트리거 자동 실행: coupons.total_used_count++

    RETURN true;
END;
$$;
```

### 5.2 배송비 계산 함수 체인

```javascript
// ========================================
// 배송비 계산 (체크아웃)
// ========================================

// 프론트엔드
useEffect(() => {
  loadShippingInfo()
}, [postalCode])

loadShippingInfo()
  ↓ calls
  formatShippingInfo(baseShipping, postalCode)
    ↓ calls (lib/shippingUtils.js)
    calculateShippingSurcharge(postalCode)
      ↓ validates
      IF (!postalCode || postalCode.length !== 5) THEN
        return { isRemote: false, region: '일반', surcharge: 0 }

      ↓ converts
      const postalNum = parseInt(postalCode, 10)

      ↓ checks
      IF (63000 <= postalNum && postalNum <= 63644) THEN
        return {
          isRemote: true,
          region: '제주',
          surcharge: 3000
        }
      ELSE IF (40200 <= postalNum && postalNum <= 40240) THEN
        return {
          isRemote: true,
          region: '울릉도',
          surcharge: 5000
        }
      ELSE
        return {
          isRemote: false,
          region: '일반',
          surcharge: 0
        }

    ↓ returns (formatShippingInfo)
    {
      baseShipping: 4000,
      surcharge: 3000,
      totalShipping: 7000,
      isRemote: true,
      region: '제주'
    }

  ↓ updates UI
  setShippingInfo(shippingInfo)

  ↓ calculates final amount
  finalAmount = productAmount - discountAmount + shippingInfo.totalShipping
```

### 5.3 카카오 로그인 함수 체인

```javascript
// ========================================
// 카카오 로그인 전체 흐름
// ========================================

// 1. 로그인 버튼 클릭
handleKakaoLogin()
  ↓ redirects
  window.location.href = `https://kauth.kakao.com/oauth/authorize?
    client_id=${KAKAO_APP_KEY}&
    redirect_uri=${REDIRECT_URI}&
    response_type=code`

// 2. 콜백 처리 (/auth/callback)
useEffect(() => {
  const code = searchParams.get('code')
  if (code) {
    handleKakaoCallback(code)
  }
}, [])

handleKakaoCallback(code)
  ↓ calls
  getKakaoToken(code)
    ↓ POST
    fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_APP_KEY,
        redirect_uri: REDIRECT_URI,
        code: code
      })
    })
    ↓ returns
    { access_token, refresh_token }

  ↓ calls
  getKakaoUserInfo(accessToken)
    ↓ GET
    fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    ↓ returns
    {
      id: '1234567890',  -- kakao_id
      kakao_account: {
        profile: { nickname },
        email,
        phone_number
      }
    }

  ↓ saves to DB
  upsertKakaoProfile(kakaoUserInfo)
    ↓ queries
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('kakao_id', kakaoUserInfo.id)
      .single()

    ↓ if not exists
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({
        kakao_id: kakaoUserInfo.id,
        email: kakaoUserInfo.kakao_account.email,
        name: kakaoUserInfo.kakao_account.profile.nickname,
        nickname: kakaoUserInfo.kakao_account.profile.nickname,
        phone: kakaoUserInfo.kakao_account.phone_number,
        provider: 'kakao'
      })
      .select()

    ↓ returns
    profile (existing or new)

  ↓ saves to sessionStorage
  sessionStorage.setItem('user', JSON.stringify({
    kakao_id: profile.kakao_id,
    email: profile.email,
    name: profile.name,
    nickname: profile.nickname,
    phone: profile.phone,
    is_kakao: true  -- 플래그
  }))

  ↓ redirects
  router.push('/')

// 3. 주문 조회 (RLS 자동 처리)
getOrders()
  ↓ calls
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*),
      order_shipping(*),
      order_payments(*)
    `)

  ↓ RLS SELECT 정책 자동 적용
  WHERE (
    user_id = auth.uid()  -- 일반 사용자
    OR
    order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'
    OR
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  )

  ↓ returns
  카카오 사용자의 모든 주문 (order_type 매칭)
```

---

## 🎯 Claude용 체크리스트

### 쿠폰 생성 시 필수 확인 사항

```
✅ percentage 타입은 max_discount_amount 필수
✅ valid_until > valid_from (날짜 범위 검증)
✅ discount_value > 0
✅ Service Role API 사용 (/api/admin/coupons/create)
✅ 관리자 권한 검증 (verifyAdminAuth)
✅ 쿠폰 코드 자동 대문자 (code.toUpperCase())
```

### 쿠폰 검증 시 필수 확인 사항

```
✅ validateCoupon() DB 함수 호출
✅ p_product_amount는 배송비 제외 상품 금액만
✅ 7단계 검증 순서 준수
   1. 쿠폰 존재/활성화
   2. 유효 기간 시작 전
   3. 유효 기간 만료
   4. 최소 구매 금액
   5. 전체 사용 한도
   6. 사용자 보유
   7. 사용 이력
✅ 할인 금액 계산:
   - fixed_amount: LEAST(discount_value, productAmount)
   - percentage: LEAST(amount * value / 100, max_discount_amount)
```

### 쿠폰 사용 처리 시 필수 확인 사항

```
✅ 주문 생성 후 즉시 applyCouponUsage() 호출
✅ use_coupon() DB 함수 (SECURITY DEFINER)
✅ is_used = false 조건 (중복 사용 방지)
✅ 트리거 자동 실행 (coupons.total_used_count++)
✅ 실패해도 주문 취소 안 함 (쿠폰은 재발행 가능)
```

### 배송비 계산 시 필수 확인 사항

```
✅ postal_code 필수 (profiles, order_shipping)
✅ formatShippingInfo(baseShipping, postalCode) 사용
✅ calculateShippingSurcharge(postalCode) 호출
✅ 도서산간 규칙:
   - 제주 (63000-63644): +3,000원
   - 울릉도 (40200-40240): +5,000원
   - 기타 도서산간: +5,000원 (향후 확장)
✅ pending 상태에서는 배송비 0원
✅ DB 저장값과 계산값 비교 (관리자 페이지)
```

### 카카오 로그인 시 필수 확인 사항

```
✅ profiles.kakao_id 저장
✅ orders.user_id = NULL (auth.users 없음)
✅ orders.order_type = 'direct:KAKAO:${kakao_id}'
✅ sessionStorage에 사용자 정보 저장
✅ is_kakao 플래그 설정
✅ RLS 정책 자동 매칭:
   - order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'
✅ 성능 최적화:
   - get_current_user_kakao_id() 함수 캐싱
   - idx_orders_order_type_gin (GIN 인덱스)
   - idx_profiles_id_kakao_id (복합 인덱스)
```

---

**마지막 업데이트**: 2025-10-08
**작성자**: Claude (AI Assistant)
**버전**: 1.0
