# 🗺️ USER_JOURNEY_MAP.md

**목적**: Claude가 사용자 관점에서 전체 프로세스를 이해하기 위한 시나리오 기반 가이드

**작성일**: 2025-10-08
**최종 업데이트**: 2025-10-08
**기반 문서**: DETAILED_DATA_FLOW.md, CODEBASE_STRUCTURE_REPORT.md, FEATURE_REFERENCE_MAP.md

---

## 📖 문서 개요

이 문서는 **실제 사용자 경험 관점**에서 시스템의 모든 데이터 흐름을 추적합니다.

### 각 시나리오에 포함된 정보:
- ✅ **페이지 경로** - 사용자가 방문하는 실제 URL
- ✅ **호출 함수** - 실제 코드에서 실행되는 함수명
- ✅ **DB 테이블** - 실제로 읽기/쓰기되는 테이블
- ✅ **데이터 흐름** - Step by Step 데이터 변환
- ✅ **다음 액션** - 사용자가 할 수 있는 행동

### 시나리오 목록:
1. 🛒 일반 사용자 상품 구매 (Supabase Auth)
2. 🥕 카카오 사용자 구매 (Kakao OAuth)
3. 👨‍💼 관리자 주문 관리 (입금확인 → 발송)
4. 🎟️ 쿠폰 발급 → 사용 전체 흐름
5. 📦 발주 프로세스 (입금확인 → 발주서 다운로드)
6. 🎨 Variant 상품 등록 → 판매 → 재고 관리

---

## 🛒 시나리오 1: 일반 사용자 상품 구매 (Supabase Auth)

### 전체 흐름 요약
```
홈페이지 상품 탐색
  ↓
상품 선택 (Variant 옵션 선택)
  ↓
바로구매 (BuyBottomSheet)
  ↓
체크아웃 (배송지 + 쿠폰 + 결제)
  ↓
주문 생성 (DB 저장)
  ↓
주문 완료 페이지
```

---

### Step 1: 상품 탐색

**페이지**: `/` (홈)
**파일**: `/app/page.js`

**기능**:
- 라이브 방송 배너 표시 (LiveBanner)
- 라이브 노출 상품 그리드 표시 (ProductGrid)

**호출 함수**:
```javascript
// 1. 실시간 상품 조회
useRealtimeProducts()
  → supabaseApi.getProducts(filters)
  → Supabase Realtime 구독 (products 테이블 변경 감지)

// 2. 각 상품의 Variant 정보 병렬 로드
Promise.all(products.map(async (product) => {
  const variants = await getProductVariants(product.id)
  return { ...product, variants }
}))
```

**DB 작업**:
- **SELECT** `products` 테이블
  - WHERE: `is_live_active = true AND status = 'active'`
  - ORDER BY: `created_at DESC`
  - JOIN: `categories`, `suppliers`
- **SELECT** `product_variants` 테이블 (각 상품별)
  - WHERE: `product_id = ?`

**사용자 화면**:
- 상품 이미지, 상품명, 가격, 재고 상태
- "구매하기" 버튼

**다음 액션**: ProductCard 클릭 → BuyBottomSheet 열림

---

### Step 2: 상품 선택 (Variant 옵션)

**페이지**: `BuyBottomSheet` (모달)
**파일**: `/app/components/product/BuyBottomSheet.jsx`

**기능**:
1. 사용자 프로필 로드 (배송지 정보)
2. Variant 옵션 선택 (색상, 사이즈 등)
3. 수량 조절 (재고 검증)
4. 배송비 계산 (우편번호 기반)
5. 최종 금액 미리보기

**호출 함수**:
```javascript
// 1. 프로필 로드 (병렬 로드 최적화)
UserProfileManager.loadUserProfile(currentUser)
  → profiles 테이블 조회 (id 또는 kakao_id)
  → postal_code 로드

// 2. Variant 조회
getProductVariants(product.id)
  → product_variants 테이블 조회
  → variant_option_values 매핑

// 3. 옵션 선택 → SKU 매칭
findVariant(selectedOptions)
  → SKU 생성: '0005-66-블랙'
  → variant 재고 확인

// 4. 배송비 계산
formatShippingInfo(4000, profile.postal_code)
  → 제주: +3,000원
  → 울릉도: +5,000원
  → 일반: +0원

// 5. 최종 금액 계산
OrderCalculations.calculateOrderTotal(items, region)
  → 상품금액 + 배송비
```

**DB 작업**:
- **SELECT** `profiles` (user_id 또는 kakao_id)
- **SELECT** `product_variants` (product_id)
- **SELECT** `variant_option_values` (variant_id)

**사용자 화면**:
- 옵션 선택 드롭다운 (색상, 사이즈)
- 수량 증감 버튼
- 재고 표시: "재고 10개"
- 배송비: "배송비 +7,000원 (제주)"
- 최종 금액: "총 37,000원"
- "바로구매" 버튼 / "장바구니" 버튼

**다음 액션**: "바로구매" 클릭 → 체크아웃 페이지

---

### Step 3: 체크아웃

**페이지**: `/checkout`
**파일**: `/app/checkout/page.js`

**기능**:
1. 사용자 정보 로드 (프로필, 주소, 쿠폰)
2. 배송지 정보 확인/수정
3. 쿠폰 선택 및 적용
4. 결제 수단 선택 (계좌이체/카드)
5. 입금자명 입력 (계좌이체 시)

**호출 함수** (병렬 최적화):
```javascript
// 1. 병렬 데이터 로드 (Promise.allSettled)
await Promise.allSettled([
  loadUserProfileOptimized(currentUser),
  loadUserAddressesOptimized(currentUser),
  loadUserCouponsOptimized(currentUser)  // 쿠폰
])

// 2. 쿠폰 적용 핸들러
handleApplyCoupon(userCoupon)
  → validateCoupon(couponCode, userId, orderTotal)
  → DB 함수: validate_coupon()
  → 유효기간, 최소 주문 금액, 사용 가능 여부 검증

// 3. 최종 금액 계산 (쿠폰 포함)
OrderCalculations.calculateFinalOrderAmount(items, {
  region: shippingInfo.region,
  coupon: selectedCoupon ? {
    type: selectedCoupon.coupon.discount_type,
    value: selectedCoupon.coupon.discount_value,
    maxDiscount: selectedCoupon.coupon.max_discount_amount,
    code: selectedCoupon.coupon.code
  } : null,
  paymentMethod: 'transfer'
})
// 반환: {
//   itemsTotal: 30000,
//   couponDiscount: 5000,  // 배송비 제외!
//   shippingFee: 7000,
//   finalAmount: 32000  // 30000 - 5000 + 7000
// }
```

**DB 작업**:
- **SELECT** `profiles` (user_id 또는 kakao_id)
- **SELECT** `user_coupons` (is_used = false)
- **SELECT** `coupons` (JOIN user_coupons)
- **RPC** `validate_coupon(p_coupon_code, p_user_id, p_product_amount)`

**사용자 화면**:
- 주문 상품 정보 (이미지, 상품명, 수량, 금액)
- 배송지 입력 (우편번호 검색, 주소, 상세주소)
- 쿠폰 선택 드롭다운: "웰컴 쿠폰 (10% 할인)"
- 결제 수단: 라디오 버튼 (계좌이체/카드)
- 입금자명 입력 필드
- 결제 금액 요약:
  ```
  상품금액: 30,000원
  쿠폰 할인: -5,000원
  배송비: +7,000원
  ────────────────
  최종 결제: 32,000원
  ```
- "주문하기" 버튼

**다음 액션**: "주문하기" 클릭 → 주문 생성

---

### Step 4: 주문 생성

**페이지**: `/checkout` (서버 처리)
**파일**: `/lib/supabaseApi.js` - `createOrder()` 함수

**기능**:
1. 주문 데이터 DB 저장
2. 재고 차감 (Variant 또는 Product)
3. 쿠폰 사용 처리 (user_coupons 업데이트)

**호출 함수**:
```javascript
// 1. createOrder API 호출
const newOrder = await createOrder(
  orderItemWithCoupon,  // 쿠폰 할인 포함
  orderProfile,
  depositName
)

// 2. createOrder 내부 로직 (/lib/supabaseApi.js:627-770)
export async function createOrder(orderData, userProfile, depositName) {
  // 2-1. 사용자 식별
  const user = await UserProfileManager.getCurrentUser()

  // 2-2. order_type 결정
  let order_type = 'direct'
  if (user.kakao_id) {
    order_type = `direct:KAKAO:${user.kakao_id}`  // 카카오 사용자
  }

  // 2-3. orders 테이블 INSERT
  const { data: order } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      customer_order_number: generateCustomerOrderNumber(),
      user_id: user.id || null,  // 카카오 사용자는 NULL
      status: 'pending',
      order_type: order_type,  // 'direct:KAKAO:123456'
      total_amount: totalAmount,
      discount_amount: orderData.couponDiscount || 0  // 쿠폰 할인
    })
    .select()
    .single()

  // 2-4. order_items 테이블 INSERT
  await supabase.from('order_items').insert({
    order_id: orderId,
    product_id: orderData.id,
    variant_id: orderData.selectedVariantId || null,
    title: orderData.title,  // ⭐ 상품명 저장 (필수)
    quantity: orderData.quantity,
    price: orderData.price,
    unit_price: orderData.price,  // 중복 컬럼 양쪽 저장
    total: orderData.totalPrice,
    total_price: orderData.totalPrice,  // 중복 컬럼 양쪽 저장
    sku: orderData.sku || null,
    variant_title: orderData.variantTitle || null,
    selected_options: orderData.options || {}
  })

  // 2-5. order_shipping 테이블 INSERT
  await supabase.from('order_shipping').insert({
    order_id: orderId,
    name: profile.name,
    phone: profile.phone,
    address: profile.address,
    detail_address: profile.detail_address,
    postal_code: profile.postal_code || '',  // 우편번호
    shipping_fee: 4000
  })

  // 2-6. order_payments 테이블 INSERT
  await supabase.from('order_payments').insert({
    order_id: orderId,
    method: 'bank_transfer',
    amount: totalAmount,
    status: 'pending',
    depositor_name: depositName  // ⭐ 입금자명
  })

  // 2-7. 재고 차감 (Variant 또는 Product)
  if (orderData.selectedVariantId) {
    await updateVariantInventory(orderData.selectedVariantId, -orderData.quantity)
  } else {
    await updateProductInventory(orderData.id, -orderData.quantity)
  }

  return order
}

// 3. 쿠폰 사용 처리
if (selectedCoupon && orderCalc.couponDiscount > 0) {
  await applyCouponUsage(
    currentUserId,
    selectedCoupon.coupon_id,
    orderId,
    orderCalc.couponDiscount
  )
}
```

**DB 작업** (트랜잭션 필수):
- **INSERT** `orders` 테이블
  - `id`, `customer_order_number`, `user_id`, `status`, `order_type`, `total_amount`, `discount_amount`
- **INSERT** `order_items` 테이블
  - `order_id`, `product_id`, `variant_id`, `title`, `quantity`, `price`, `unit_price`, `total`, `total_price`, `sku`, `variant_title`, `selected_options`
- **INSERT** `order_shipping` 테이블
  - `order_id`, `name`, `phone`, `address`, `detail_address`, `postal_code`, `shipping_fee`
- **INSERT** `order_payments` 테이블
  - `order_id`, `method`, `amount`, `status`, `depositor_name`
- **UPDATE** `product_variants` 또는 `products` 테이블 (재고 차감)
  - `inventory = inventory - quantity`
- **RPC** `use_coupon()` (쿠폰 사용 처리)
  - **UPDATE** `user_coupons`
  - `is_used = true`, `used_at = NOW()`, `order_id = ?`, `discount_amount = ?`

**주문 상태 변경**:
```javascript
await updateOrderStatus(orderId, 'verifying')
// orders.status = 'verifying'
// orders.verifying_at = NOW()
```

**다음 액션**: 리다이렉트 → `/orders/${orderId}/complete`

---

### Step 5: 주문 완료

**페이지**: `/orders/[id]/complete`
**파일**: `/app/orders/[id]/complete/page.js`

**기능**:
1. 주문 상세 정보 표시
2. 배송 정보 표시 (도서산간 배송비 포함)
3. 결제 정보 표시 (입금자명)
4. 쿠폰 할인 표시

**호출 함수**:
```javascript
// 1. 주문 조회
const orderData = await getOrderById(orderId)

// 2. getOrderById 내부 (/lib/supabaseApi.js:1270-1347)
const { data } = await supabase
  .from('orders')
  .select(`
    *,
    order_items (
      *,
      products (id, title, thumbnail_url),
      product_variants (id, sku, variant_title)
    ),
    order_shipping (*),
    order_payments (*)
  `)
  .eq('id', orderId)
  .single()

// 3. 데이터 변환
return {
  ...data,
  items: data.order_items.map(item => ({
    ...item,
    title: item.title || item.products?.title,  // order_items.title 우선
    thumbnail_url: item.products?.thumbnail_url,
    price: item.price || item.unit_price,  // price 우선
    totalPrice: item.total || item.total_price  // total 우선
  })),
  shipping: data.order_shipping?.[0],
  payment: getBestPayment(data.order_payments)
}

// 4. 최종 금액 재계산 (쿠폰 할인 포함)
const orderCalc = OrderCalculations.calculateFinalOrderAmount(
  orderData.items.map(item => ({
    price: item.price,
    quantity: item.quantity,
    title: item.title
  })),
  {
    region: shippingRegion,
    coupon: orderData.discount_amount > 0 ? {
      type: 'fixed_amount',  // DB에 타입 저장 안 됨
      value: orderData.discount_amount
    } : null,
    paymentMethod: orderData.payment?.method || 'bank_transfer'
  }
)
```

**DB 작업**:
- **SELECT** `orders` 테이블 (id = ?)
- **JOIN** `order_items`, `products`, `product_variants`
- **JOIN** `order_shipping`
- **JOIN** `order_payments`

**사용자 화면**:
- 주문번호: "C-20251008-0001"
- 주문 상태: "입금 대기 중" (status = 'verifying')
- 상품 정보:
  - 상품 이미지
  - 상품명: "프리미엄 티셔츠"
  - 옵션: "빨강/M"
  - 수량: 1개
  - 금액: 30,000원
- 배송 정보:
  - 수령인: "홍길동"
  - 연락처: "010-1234-5678"
  - 배송지: "제주특별자치도 제주시..."
  - 우편번호: "63000"
- 결제 정보:
  - 결제 수단: "계좌이체"
  - 입금자명: "홍길동"
  - 상품금액: 30,000원
  - 쿠폰 할인: -5,000원 (파란색)
  - 배송비: +7,000원 (제주)
  - **최종 결제**: 32,000원 (굵은 글씨)

**다음 액션**:
- "주문 내역" 버튼 → `/orders`
- "홈으로" 버튼 → `/`

---

### 데이터 흐름 요약

```
products (상품 조회)
  ↓
product_variants (옵션별 재고 확인)
  ↓
profiles (배송지 정보)
  ↓
user_coupons (쿠폰 조회)
  ↓
orders (주문 생성)
  ↓
order_items (주문 아이템)
  ↓
order_shipping (배송 정보)
  ↓
order_payments (결제 정보)
  ↓
user_coupons (쿠폰 사용 처리)
  ↓
product_variants (재고 차감)
```

---

### 관련 기능 (FEATURE_REFERENCE_MAP)

- **1.1 주문 생성** (PART1)
- **3.2 Variant 재고 확인** (PART2)
- **7.1 배송비 계산** (PART3)
- **8.4 쿠폰 검증** (PART3)
- **8.5 쿠폰 사용 처리** (PART3)

---

## 🥕 시나리오 2: 카카오 사용자 구매 (Kakao OAuth)

### 전체 흐름 요약
```
카카오 로그인
  ↓
프로필 완성 (추가 정보 입력)
  ↓
홈페이지 상품 탐색
  ↓
[시나리오 1과 동일: Step 1~5]
  ↓
주문 완료
```

---

### Step 1: 카카오 로그인

**페이지**: `/login`
**파일**: `/app/login/page.js`

**기능**:
- "카카오로 시작하기" 버튼 클릭

**호출 함수**:
```javascript
// 1. 카카오 OAuth 리디렉션
signInWithKakao()
  → window.location.href = `https://kauth.kakao.com/oauth/authorize?...`
  → client_id: 25369ebb145320aed6a888a721f088a9
  → redirect_uri: https://allok.shop/auth/callback
```

**다음 액션**: 카카오 로그인 페이지 → 인증 → 콜백

---

### Step 2: 카카오 콜백 처리

**페이지**: `/auth/callback`
**파일**: `/app/auth/callback/page.js`

**기능**:
1. 카카오 인증 코드 수신
2. Access Token 교환
3. 카카오 사용자 정보 조회
4. 기존 사용자 확인 또는 신규 생성

**호출 함수**:
```javascript
// 1. URL에서 code 추출
const searchParams = new URLSearchParams(window.location.search)
const code = searchParams.get('code')

// 2. Access Token 교환
const tokenResponse = await fetch('/api/auth/kakao-token', {
  method: 'POST',
  body: JSON.stringify({ code })
})
const { access_token } = await tokenResponse.json()

// 3. 카카오 사용자 정보 조회
const userResponse = await fetch('/api/auth/kakao-user', {
  method: 'POST',
  body: JSON.stringify({ access_token })
})
const kakaoUser = await userResponse.json()

// 4. 기존 사용자 확인
const existingUserResponse = await fetch('/api/auth/check-kakao-user', {
  method: 'POST',
  body: JSON.stringify({ kakao_id: kakaoUser.id })
})
const { exists, user } = await existingUserResponse.json()

// 5-1. 기존 사용자: 바로 로그인
if (exists) {
  sessionStorage.setItem('user', JSON.stringify(user))
  window.location.href = '/'
}

// 5-2. 신규 사용자: 프로필 완성 페이지로
else {
  sessionStorage.setItem('kakaoTempUser', JSON.stringify(kakaoUser))
  window.location.href = '/auth/complete-profile'
}
```

**DB 작업**:
- **SELECT** `profiles` (kakao_id = ?)
- 존재 여부 확인

**다음 액션**:
- 기존 사용자 → 홈페이지 (`/`)
- 신규 사용자 → 프로필 완성 (`/auth/complete-profile`)

---

### Step 3: 프로필 완성 (신규 사용자만)

**페이지**: `/auth/complete-profile`
**파일**: `/app/auth/complete-profile/page.js`

**기능**:
- 추가 정보 입력 (이름, 전화번호)

**호출 함수**:
```javascript
// 1. 임시 저장된 카카오 정보 불러오기
const kakaoTempUser = JSON.parse(sessionStorage.getItem('kakaoTempUser'))

// 2. 프로필 완성 폼 제출
const completeProfileResponse = await fetch('/api/auth/create-kakao-user', {
  method: 'POST',
  body: JSON.stringify({
    kakao_id: kakaoTempUser.id,
    email: kakaoTempUser.kakao_account.email,
    name: formData.name,
    phone: formData.phone,
    nickname: kakaoTempUser.kakao_account.profile.nickname
  })
})
const { user } = await completeProfileResponse.json()

// 3. 세션 저장
sessionStorage.setItem('user', JSON.stringify(user))

// 4. 홈페이지로 이동
window.location.href = '/'
```

**DB 작업**:
- **INSERT** `profiles` 테이블
  - `id` (UUID 생성)
  - `kakao_id` (카카오 고유 ID)
  - `email`, `name`, `phone`, `nickname`

**다음 액션**: 홈페이지 (`/`)

---

### Step 4~8: 상품 구매 (시나리오 1과 동일)

**차이점**:

#### Step 4: 주문 생성 시
```javascript
// order_type에 카카오 ID 포함
const order_type = `direct:KAKAO:${user.kakao_id}`

// orders.user_id는 NULL (카카오 사용자는 Supabase UUID 없음)
const { data: order } = await supabase
  .from('orders')
  .insert({
    user_id: null,  // ⭐ NULL
    order_type: 'direct:KAKAO:3456789012'  // ⭐ 카카오 ID
  })
```

#### RLS 정책 매칭:
```sql
-- SELECT 정책 (카카오 사용자 매칭)
CREATE POLICY "Users can view their own orders"
ON orders FOR SELECT
USING (
  user_id = auth.uid()  -- Supabase 사용자
  OR
  order_type LIKE '%KAKAO:' || get_current_user_kakao_id() || '%'  -- 카카오 사용자
)

-- get_current_user_kakao_id() 함수:
-- profiles 테이블에서 현재 세션의 kakao_id 조회
```

---

### 데이터 흐름 요약 (카카오 특화)

```
카카오 OAuth (외부 API)
  ↓
profiles (kakao_id 조회 또는 생성)
  ↓
sessionStorage (user 세션 저장)
  ↓
products (상품 조회)
  ↓
orders (order_type: 'direct:KAKAO:123456')
  ↓
[나머지 동일]
```

---

### 관련 기능 (FEATURE_REFERENCE_MAP)

- **5.2 로그인 (카카오)** (PART2)
- **4.3 프로필 정규화** (PART2)
- **1.2 주문 조회 (사용자)** (PART1) - 카카오 매칭

---

## 👨‍💼 시나리오 3: 관리자 주문 관리 (입금확인 → 발송)

### 전체 흐름 요약
```
관리자 로그인
  ↓
입금 확인 페이지
  ↓
입금 확인 처리 (status: pending → deposited)
  ↓
발송 관리 페이지
  ↓
송장번호 입력
  ↓
발송 완료 처리 (status: deposited → shipped)
```

---

### Step 1: 관리자 로그인

**페이지**: `/admin/login`
**파일**: `/app/admin/login/page.js`

**기능**:
- 이메일/비밀번호 입력
- bcrypt 검증 (환경변수)

**호출 함수**:
```javascript
// 1. 관리자 로그인
adminLogin({ email, password })
  → POST /api/admin/login
  → bcrypt.compare(password, ADMIN_PASSWORD_HASH)

// 2. 세션 저장
localStorage.setItem('adminUser', JSON.stringify({ email }))

// 3. 리다이렉트
window.location.href = '/admin'
```

**DB 작업**: 없음 (환경변수 검증)

**다음 액션**: 관리자 대시보드 (`/admin`)

---

### Step 2: 입금 확인 페이지

**페이지**: `/admin/deposits`
**파일**: `/app/admin/deposits/page.js`

**기능**:
- 입금 대기 주문 조회 (status = 'pending' 또는 'verifying')
- 일괄 입금 확인

**호출 함수**:
```javascript
// 1. 입금 대기 주문 조회
const { data: orders } = await supabase
  .from('orders')
  .select(`
    *,
    order_items (
      *,
      products (title, thumbnail_url)
    ),
    order_shipping (*),
    order_payments (*)
  `)
  .in('status', ['pending', 'verifying'])
  .order('created_at', { ascending: false })

// 2. 데이터 변환
const depositOrders = orders.map(order => ({
  ...order,
  items: order.order_items,
  shipping: order.order_shipping?.[0],
  payment: getBestPayment(order.order_payments),
  depositorName: getBestPayment(order.order_payments)?.depositor_name
}))
```

**DB 작업**:
- **SELECT** `orders` (status IN ('pending', 'verifying'))
- **JOIN** `order_items`, `products`, `order_shipping`, `order_payments`

**사용자 화면** (관리자):
- 주문 목록 테이블
  - 주문번호, 고객명, 입금자명, 주문금액, 주문일시
- 체크박스 (일괄 선택)
- "일괄 입금 확인" 버튼

**다음 액션**: 체크박스 선택 → "일괄 입금 확인" 클릭

---

### Step 3: 입금 확인 처리

**페이지**: `/admin/deposits` (서버 처리)
**파일**: `/lib/supabaseApi.js` - `updateOrderStatus()` 또는 `updateMultipleOrderStatus()`

**기능**:
- 주문 상태 변경: `pending` → `deposited`
- 타임스탬프 자동 기록: `paid_at`

**호출 함수**:
```javascript
// 1. 일괄 상태 변경
await updateMultipleOrderStatus(selectedOrderIds, 'deposited')

// 2. updateMultipleOrderStatus 내부 (/lib/supabaseApi.js:1454-1491)
export async function updateMultipleOrderStatus(orderIds, newStatus, paymentData = null) {
  const updateData = { status: newStatus }

  // 타임스탬프 자동 설정
  if (newStatus === 'deposited' || newStatus === 'paid') {
    updateData.paid_at = new Date().toISOString()
    console.log('💰 입금 확인 완료')
  }

  // orders 테이블 일괄 업데이트
  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .in('id', orderIds)

  return { error }
}
```

**DB 작업**:
- **UPDATE** `orders` 테이블 (id IN (...))
  - `status = 'deposited'`
  - `paid_at = NOW()`

**화면 변화**:
- 주문 상태: "입금 대기 중" → "입금 완료"
- 선택된 주문이 목록에서 사라짐 (status ≠ 'pending')

**다음 액션**: 발송 관리 페이지 (`/admin/shipping`)

---

### Step 4: 발송 관리 페이지

**페이지**: `/admin/shipping`
**파일**: `/app/admin/shipping/page.js`

**기능**:
- 입금 완료 주문 조회 (status = 'deposited')
- 송장번호 일괄 입력
- 발송 완료 처리

**호출 함수**:
```javascript
// 1. 입금 완료 주문 조회
const { data: orders } = await supabase
  .from('orders')
  .select(`
    *,
    order_items (*),
    order_shipping (*),
    order_payments (*)
  `)
  .eq('status', 'deposited')
  .order('paid_at', { ascending: true })  // 입금 일시 순
```

**DB 작업**:
- **SELECT** `orders` (status = 'deposited')
- **JOIN** `order_items`, `order_shipping`, `order_payments`

**사용자 화면** (관리자):
- 주문 목록 테이블
  - 주문번호, 고객명, 배송지, 입금일시
  - 송장번호 입력 필드 (각 주문별)
- "일괄 발송 완료" 버튼

**다음 액션**: 송장번호 입력 → "일괄 발송 완료" 클릭

---

### Step 5: 발송 완료 처리

**페이지**: `/admin/shipping` (서버 처리)
**파일**: `/lib/supabaseApi.js` - `updateOrderStatus()`

**기능**:
- 송장번호 저장 (order_shipping 테이블)
- 주문 상태 변경: `deposited` → `shipped`
- 타임스탬프 자동 기록: `delivered_at`

**호출 함수**:
```javascript
// 1. 송장번호 업데이트
const trackingUpdates = selectedOrders.map(async (order) => {
  await supabase
    .from('order_shipping')
    .update({
      tracking_number: trackingNumbers[order.id],  // 송장번호
      shipped_at: new Date().toISOString()
    })
    .eq('order_id', order.id)
})
await Promise.all(trackingUpdates)

// 2. 주문 상태 변경
await updateMultipleOrderStatus(selectedOrderIds, 'shipped')

// 3. updateOrderStatus 내부 타임스탬프 처리
if (newStatus === 'shipped' || newStatus === 'delivered') {
  updateData.delivered_at = new Date().toISOString()
  console.log('🚚 발송 완료')
}
```

**DB 작업**:
- **UPDATE** `order_shipping` 테이블 (order_id IN (...))
  - `tracking_number = ?`
  - `shipped_at = NOW()`
- **UPDATE** `orders` 테이블 (id IN (...))
  - `status = 'shipped'`
  - `delivered_at = NOW()`

**화면 변화**:
- 주문 상태: "입금 완료" → "발송 완료"
- 선택된 주문이 목록에서 사라짐 (status ≠ 'deposited')

**다음 액션**: 관리자 주문 관리 페이지 (`/admin/orders`)

---

### 데이터 흐름 요약

```
orders (status = 'pending')
  ↓ 입금 확인
orders.status = 'deposited'
orders.paid_at = NOW()
  ↓
order_shipping.tracking_number = '123456789'
order_shipping.shipped_at = NOW()
  ↓ 발송 완료
orders.status = 'shipped'
orders.delivered_at = NOW()
```

---

### 관련 기능 (FEATURE_REFERENCE_MAP)

- **1.5 주문 상태 변경** (PART1)
- **1.6 일괄 상태 변경** (PART1)
- **1.3 주문 조회 (관리자)** (PART1)

---

## 🎟️ 시나리오 4: 쿠폰 발급 → 사용 전체 흐름

### 전체 흐름 요약
```
관리자: 쿠폰 생성
  ↓
관리자: 쿠폰 배포 (특정 사용자)
  ↓
사용자: 마이페이지 쿠폰함 확인
  ↓
사용자: 체크아웃 시 쿠폰 적용
  ↓
주문 생성 (쿠폰 사용 처리)
  ↓
사용자: 쿠폰 "사용 완료" 탭 이동
```

---

### Step 1: 관리자 - 쿠폰 생성

**페이지**: `/admin/coupons/new`
**파일**: `/app/admin/coupons/new/page.js`

**기능**:
- 쿠폰 정보 입력 (코드, 이름, 할인 타입, 할인 금액)
- 유효기간 설정
- 최소 주문 금액 설정

**호출 함수** (Service Role API):
```javascript
// 1. 쿠폰 생성 폼 제출
const newCoupon = await createCoupon({
  code: 'WELCOME10',
  name: '웰컴 쿠폰',
  description: '신규 회원 환영 쿠폰',
  discount_type: 'fixed_amount',  // or 'percentage'
  discount_value: 10000,  // 10,000원 또는 10%
  min_purchase_amount: 30000,  // 최소 30,000원 이상
  max_discount_amount: null,  // percentage 타입만
  valid_from: '2025-01-01T00:00:00Z',
  valid_until: '2025-12-31T23:59:59Z',
  usage_limit_per_user: 1,  // 사용자당 1회
  total_usage_limit: 100,  // 전체 100개
  is_active: true
})

// 2. createCoupon 내부 (/lib/couponApi.js:28-61)
export async function createCoupon(couponData) {
  // Service Role API 호출 (RLS 우회)
  const response = await fetch('/api/admin/coupons/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(couponData)
  })
  return await response.json()
}

// 3. API Route (/app/api/admin/coupons/create/route.js)
export async function POST(request) {
  // Service Role 클라이언트 (RLS 우회)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY  // ⭐ Service Role Key
  )

  const couponData = await request.json()

  const { data, error } = await supabaseAdmin
    .from('coupons')
    .insert(couponData)
    .select()
    .single()

  return NextResponse.json(data)
}
```

**DB 작업**:
- **INSERT** `coupons` 테이블 (Service Role)
  - `code`, `name`, `description`, `discount_type`, `discount_value`
  - `min_purchase_amount`, `max_discount_amount`
  - `valid_from`, `valid_until`
  - `usage_limit_per_user`, `total_usage_limit`
  - `is_active`, `created_by`

**관리자 화면**:
- 쿠폰 생성 폼 (입력 필드 10개)
- "쿠폰 생성" 버튼

**다음 액션**: 쿠폰 목록 (`/admin/coupons`)

---

### Step 2: 관리자 - 쿠폰 배포 (특정 사용자)

**페이지**: `/admin/coupons/[id]`
**파일**: `/app/admin/coupons/[id]/page.js`

**기능**:
- 쿠폰 상세 정보 표시
- 사용자 검색
- 쿠폰 배포

**호출 함수**:
```javascript
// 1. 고객 목록 조회
const { data: customers } = await supabase
  .from('profiles')
  .select('id, name, email, phone')
  .order('created_at', { ascending: false })

// 2. 특정 고객에게 쿠폰 배포
const distributedCoupon = await distributeCoupon(couponId, userId)

// 3. distributeCoupon 내부 (/lib/couponApi.js:119-150)
export async function distributeCoupon(couponId, userId) {
  const { data, error } = await supabase
    .from('user_coupons')
    .insert({
      user_id: userId,
      coupon_id: couponId,
      is_used: false,
      issued_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// 4. DB 트리거 자동 실행 (increment_coupon_issued_count)
// coupons.total_issued_count++
```

**DB 작업**:
- **INSERT** `user_coupons` 테이블
  - `user_id`, `coupon_id`, `is_used = false`, `issued_at`
- **UPDATE** `coupons` 테이블 (트리거 자동)
  - `total_issued_count = total_issued_count + 1`

**관리자 화면**:
- 쿠폰 상세 정보
- 고객 목록 (검색 가능)
- "쿠폰 배포" 버튼 (각 고객별)

**다음 액션**: 배포 완료 메시지

---

### Step 3: 사용자 - 마이페이지 쿠폰함

**페이지**: `/mypage/coupons`
**파일**: `/app/mypage/coupons/page.js`

**기능**:
- 사용 가능 쿠폰 목록
- 사용 완료 쿠폰 목록

**호출 함수**:
```javascript
// 1. 사용자 쿠폰 조회
const availableCoupons = await getUserCoupons(userId, { is_used: false })
const usedCoupons = await getUserCoupons(userId, { is_used: true })

// 2. getUserCoupons 내부 (/lib/couponApi.js:152-190)
export async function getUserCoupons(userId, filters = {}) {
  let query = supabase
    .from('user_coupons')
    .select(`
      *,
      coupons (*)
    `)
    .eq('user_id', userId)

  if (filters.is_used !== undefined) {
    query = query.eq('is_used', filters.is_used)
  }

  const { data } = await query.order('issued_at', { ascending: false })
  return data
}
```

**DB 작업**:
- **SELECT** `user_coupons` (user_id = ?)
- **JOIN** `coupons` (coupon_id)
- **WHERE** `is_used = false` (사용 가능) 또는 `is_used = true` (사용 완료)

**사용자 화면**:
- 탭: "사용 가능" / "사용 완료"
- 쿠폰 카드:
  - 쿠폰 이름: "웰컴 쿠폰"
  - 할인 금액: "10,000원 할인"
  - 최소 주문 금액: "30,000원 이상"
  - 유효기간: "2025.12.31까지"
- "사용하기" 버튼 (체크아웃 페이지로 이동)

**다음 액션**: "사용하기" 클릭 → 체크아웃 페이지

---

### Step 4: 사용자 - 체크아웃 쿠폰 적용

**페이지**: `/checkout`
**파일**: `/app/checkout/page.js`

**기능**:
- 쿠폰 선택 드롭다운
- 쿠폰 유효성 검증
- 할인 금액 계산 (배송비 제외!)

**호출 함수** (Step 3 참조 - 시나리오 1):
```javascript
// 1. 쿠폰 병렬 로드
await loadUserCouponsOptimized(currentUser)

// 2. 쿠폰 적용
handleApplyCoupon(userCoupon)
  → validateCoupon(couponCode, userId, orderTotal)
  → DB 함수: validate_coupon()

// 3. 최종 금액 계산
OrderCalculations.calculateFinalOrderAmount(items, {
  region: shippingRegion,
  coupon: {
    type: 'fixed_amount',
    value: 10000
  },
  paymentMethod: 'transfer'
})
// 반환: {
//   itemsTotal: 35000,
//   couponDiscount: 10000,  // 배송비 제외!
//   shippingFee: 7000,
//   finalAmount: 32000  // 35000 - 10000 + 7000
// }
```

**DB 작업**:
- **RPC** `validate_coupon(p_coupon_code, p_user_id, p_product_amount)`
  - 활성화 여부, 유효기간, 최소 주문 금액, 사용 가능 여부 검증
  - 할인 금액 계산

**사용자 화면**:
- 쿠폰 선택 드롭다운: "웰컴 쿠폰 (10,000원 할인)"
- 결제 금액 요약:
  ```
  상품금액: 35,000원
  쿠폰 할인: -10,000원 (파란색)
  배송비: +7,000원
  ────────────────
  최종 결제: 32,000원
  ```

**다음 액션**: "주문하기" 클릭 → 주문 생성

---

### Step 5: 주문 생성 (쿠폰 사용 처리)

**페이지**: `/checkout` (서버 처리)
**파일**: `/lib/supabaseApi.js` - `createOrder()`, `/lib/couponApi.js` - `applyCouponUsage()`

**기능** (Step 4 참조 - 시나리오 1):
```javascript
// 1. 주문 생성 (discount_amount 포함)
const newOrder = await createOrder(orderItemWithCoupon, orderProfile, depositName)

// 2. 쿠폰 사용 처리
if (selectedCoupon && orderCalc.couponDiscount > 0) {
  await applyCouponUsage(
    currentUserId,
    selectedCoupon.coupon_id,
    orderId,
    orderCalc.couponDiscount
  )
}

// 3. applyCouponUsage 내부 (/lib/couponApi.js:220-242)
export async function applyCouponUsage(userId, couponId, orderId, discountAmount) {
  // DB 함수 호출: use_coupon()
  const { data, error } = await supabase.rpc('use_coupon', {
    p_user_id: userId,
    p_coupon_id: couponId,
    p_order_id: orderId,
    p_discount_amount: discountAmount
  })

  return data === true
}

// 4. DB 함수 내부 (supabase/migrations/20251003_coupon_system.sql)
CREATE FUNCTION use_coupon(
  p_user_id UUID,
  p_coupon_id UUID,
  p_order_id UUID,
  p_discount_amount DECIMAL
) RETURNS BOOLEAN AS $$
BEGIN
  -- user_coupons 업데이트
  UPDATE user_coupons
  SET is_used = true,
      used_at = NOW(),
      order_id = p_order_id,
      discount_amount = p_discount_amount
  WHERE user_id = p_user_id
    AND coupon_id = p_coupon_id
    AND is_used = false;

  -- coupons.total_used_count 증가
  UPDATE coupons
  SET total_used_count = total_used_count + 1
  WHERE id = p_coupon_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

**DB 작업**:
- **INSERT** `orders` (discount_amount = 10000)
- **RPC** `use_coupon()`:
  - **UPDATE** `user_coupons`
    - `is_used = true`
    - `used_at = NOW()`
    - `order_id = ?`
    - `discount_amount = ?`
  - **UPDATE** `coupons`
    - `total_used_count = total_used_count + 1`

**다음 액션**: 주문 완료 페이지 (`/orders/[id]/complete`)

---

### Step 6: 사용자 - 쿠폰함 "사용 완료" 탭

**페이지**: `/mypage/coupons`
**파일**: `/app/mypage/coupons/page.js`

**기능**:
- 사용 완료 쿠폰 목록 (is_used = true)

**호출 함수**:
```javascript
const usedCoupons = await getUserCoupons(userId, { is_used: true })
```

**DB 작업**:
- **SELECT** `user_coupons` (user_id = ?, is_used = true)
- **JOIN** `coupons`

**사용자 화면**:
- "사용 완료" 탭
- 쿠폰 카드:
  - 쿠폰 이름: "웰컴 쿠폰"
  - 할인 금액: "10,000원 할인"
  - 사용 일시: "2025.10.08 15:30"
  - 주문번호: "C-20251008-0001"
- "주문 보기" 버튼 (주문 상세로 이동)

---

### 데이터 흐름 요약

```
coupons (쿠폰 생성 - 관리자)
  ↓
user_coupons (쿠폰 배포 - INSERT)
  ↓
coupons.total_issued_count++ (트리거)
  ↓
user_coupons (사용자 쿠폰함 조회 - is_used = false)
  ↓
validate_coupon() (RPC - 검증)
  ↓
orders.discount_amount (주문 생성)
  ↓
use_coupon() (RPC - 사용 처리)
  ↓
user_coupons.is_used = true
user_coupons.used_at = NOW()
user_coupons.order_id = ?
  ↓
coupons.total_used_count++ (UPDATE)
```

---

### 관련 기능 (FEATURE_REFERENCE_MAP)

- **8.1 쿠폰 생성** (PART3)
- **8.2 쿠폰 배포 (개별)** (PART3)
- **8.4 쿠폰 검증** (PART3)
- **8.5 쿠폰 사용 처리** (PART3)

---

## 📦 시나리오 5: 발주 프로세스 (입금확인 → 발주서 다운로드)

### 전체 흐름 요약
```
관리자: 입금 확인 완료 (status = 'deposited')
  ↓
발주 관리 페이지 (업체별 집계)
  ↓
특정 업체 발주 상세 페이지
  ↓
수량 조정 (옵션)
  ↓
Excel 발주서 다운로드
  ↓
purchase_order_batches 생성 (중복 발주 방지)
```

---

### Step 1: 입금 확인 완료 (사전 작업)

**페이지**: `/admin/deposits`
**기능**: 시나리오 3 Step 3 참조

**결과**: 주문 상태 `pending` → `deposited`

---

### Step 2: 발주 관리 페이지 (업체별 집계)

**페이지**: `/admin/purchase-orders`
**파일**: `/app/admin/purchase-orders/page.js`

**기능**:
1. 입금 완료 주문 조회 (status = 'deposited')
2. 완료된 발주 제외 (purchase_order_batches)
3. 업체별 그룹핑 및 집계

**호출 함수**:
```javascript
// 1. 입금 완료 주문 조회
const { data: depositedOrders } = await supabase
  .from('orders')
  .select(`
    *,
    order_items (
      *,
      products (
        *,
        suppliers (*)
      )
    )
  `)
  .eq('status', 'deposited')
  .order('created_at', { ascending: false })

// 2. 완료된 발주 조회 (GIN 인덱스 활용)
const { data: completedBatches } = await supabase
  .from('purchase_order_batches')
  .select('order_ids')
  .eq('status', 'completed')

// 3. 완료된 주문 필터링
const completedOrderIds = new Set()
completedBatches?.forEach(batch => {
  batch.order_ids?.forEach(id => completedOrderIds.add(id))
})

const pendingOrders = depositedOrders.filter(
  order => !completedOrderIds.has(order.id)
)

// 4. 업체별 그룹핑
const supplierOrders = {}
pendingOrders.forEach(order => {
  order.order_items.forEach(item => {
    const supplier = item.products?.suppliers
    if (supplier) {
      if (!supplierOrders[supplier.id]) {
        supplierOrders[supplier.id] = {
          supplier: supplier,
          orders: [],
          totalItems: 0,
          totalQuantity: 0,
          totalAmount: 0
        }
      }
      supplierOrders[supplier.id].orders.push({
        orderId: order.id,
        customerOrderNumber: order.customer_order_number,
        item: item
      })
      supplierOrders[supplier.id].totalItems++
      supplierOrders[supplier.id].totalQuantity += item.quantity
      supplierOrders[supplier.id].totalAmount += item.total_price
    }
  })
})
```

**DB 작업**:
- **SELECT** `orders` (status = 'deposited')
- **JOIN** `order_items`, `products`, `suppliers`
- **SELECT** `purchase_order_batches` (status = 'completed')
- GIN 인덱스 사용: `order_ids` 배열 검색

**관리자 화면**:
- 업체별 요약 카드:
  - 업체명: "ABC 의류"
  - 주문 개수: 15개
  - 총 수량: 45개
  - 총 금액: 1,350,000원
- "발주서 보기" 버튼 (각 업체별)

**다음 액션**: "발주서 보기" 클릭 → 업체별 발주 상세

---

### Step 3: 특정 업체 발주 상세

**페이지**: `/admin/purchase-orders/[supplierId]`
**파일**: `/app/admin/purchase-orders/[supplierId]/page.js`

**기능**:
1. 특정 업체 발주 내역 상세
2. 수량 조정 기능
3. Excel 다운로드

**호출 함수**:
```javascript
// 1. 특정 업체의 발주 대기 주문 조회
const supplierData = supplierOrders[supplierId]

// 2. 주문 아이템 리스트 생성
const orderItems = supplierData.orders.map(order => ({
  id: order.item.id,
  orderId: order.orderId,
  customerOrderNumber: order.customerOrderNumber,
  productTitle: order.item.products.title,
  variantSku: order.item.sku,
  variantTitle: order.item.variant_title,
  quantity: order.item.quantity,
  unitPrice: order.item.unit_price,
  totalPrice: order.item.total_price,
  shipping: order.item.order_shipping
}))
```

**관리자 화면**:
- 업체 정보:
  - 업체명: "ABC 의류"
  - 담당자: "김영희"
  - 연락처: "02-1234-5678"
- 주문 아이템 테이블:
  - 주문번호, 상품명, SKU, 수량, 단가, 합계
  - 수량 조정 입력 필드 (각 아이템별)
  - 수령인, 연락처, 배송지
- "Excel 다운로드" 버튼

**다음 액션**: 수량 조정 (옵션) → "Excel 다운로드" 클릭

---

### Step 4: Excel 발주서 다운로드 + 발주 완료 처리

**페이지**: `/admin/purchase-orders/[supplierId]` (클라이언트 처리)
**파일**: `/app/admin/purchase-orders/[supplierId]/page.js`

**기능**:
1. Excel 파일 생성 (xlsx)
2. purchase_order_batches 생성 (중복 발주 방지)
3. 파일 다운로드

**호출 함수**:
```javascript
const handleExcelDownload = async () => {
  try {
    // 1. purchase_order_batches 생성
    const batchId = uuidv4()
    const { error: batchError } = await supabase
      .from('purchase_order_batches')
      .insert({
        id: batchId,
        supplier_id: supplierId,
        order_ids: orderItems.map(i => i.orderId),  // UUID 배열
        adjusted_quantities: adjustedQuantities,  // JSONB: { itemId: newQuantity }
        total_items: orderItems.length,
        total_amount: totalAmount,
        status: 'completed',
        download_date: new Date().toISOString()
      })

    if (batchError) throw batchError

    // 2. Excel 파일 생성 (xlsx)
    const workbook = XLSX.utils.book_new()
    const worksheetData = orderItems.map(item => ({
      '주문번호': item.customerOrderNumber,
      '상품명': item.productTitle,
      'SKU': item.variantSku || '-',
      '수량': adjustedQuantities[item.id] || item.quantity,
      '단가': item.unitPrice.toLocaleString(),
      '합계': ((adjustedQuantities[item.id] || item.quantity) * item.unitPrice).toLocaleString(),
      '수령인': item.shipping?.name,
      '연락처': item.shipping?.phone,
      '배송지': `${item.shipping?.address} ${item.shipping?.detail_address || ''}`
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    XLSX.utils.book_append_sheet(workbook, worksheet, '발주서')

    // 3. 파일 다운로드
    const fileName = `발주서_${supplier.name}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)

    // 4. 성공 메시지
    alert('발주서가 다운로드되었습니다.')
    router.push('/admin/purchase-orders')
  } catch (error) {
    console.error('Excel 다운로드 오류:', error)
    alert('발주서 생성 중 오류가 발생했습니다.')
  }
}
```

**DB 작업**:
- **INSERT** `purchase_order_batches` 테이블
  - `id` (UUID)
  - `supplier_id` (UUID)
  - `order_ids` (UUID[] - 배열)
  - `adjusted_quantities` (JSONB - { itemId: newQuantity })
  - `total_items`, `total_amount`
  - `status = 'completed'`
  - `download_date = NOW()`

**Excel 파일 내용**:
```
주문번호 | 상품명 | SKU | 수량 | 단가 | 합계 | 수령인 | 연락처 | 배송지
C-20251008-0001 | 프리미엄 티셔츠 | 0005-66-블랙 | 2 | 30,000 | 60,000 | 홍길동 | 010-1234-5678 | 서울시...
C-20251008-0002 | 프리미엄 티셔츠 | 0005-66-화이트 | 1 | 30,000 | 30,000 | 김영희 | 010-9876-5432 | 경기도...
```

**다음 액션**: 발주 관리 페이지 돌아가기 (완료된 주문 제외됨)

---

### Step 5: 중복 발주 방지 확인

**페이지**: `/admin/purchase-orders` (재방문)

**기능**:
- 이전에 발주서를 다운로드한 주문은 목록에서 제외됨

**로직**:
```javascript
// completedBatches에 order_ids 포함된 주문은 필터링
const completedOrderIds = new Set()
completedBatches?.forEach(batch => {
  batch.order_ids?.forEach(id => completedOrderIds.add(id))
})

const pendingOrders = depositedOrders.filter(
  order => !completedOrderIds.has(order.id)
)
```

**GIN 인덱스 활용**:
```sql
-- purchase_order_batches.order_ids에 GIN 인덱스 생성
CREATE INDEX idx_purchase_order_batches_order_ids
ON purchase_order_batches USING GIN (order_ids);

-- 빠른 배열 검색
SELECT * FROM purchase_order_batches
WHERE order_ids @> ARRAY['uuid1', 'uuid2'];
```

---

### 데이터 흐름 요약

```
orders (status = 'deposited')
  ↓ JOIN
order_items + products + suppliers
  ↓ 업체별 그룹핑
supplierOrders = {
  supplierId1: { orders: [...], totalItems: 15 },
  supplierId2: { orders: [...], totalItems: 8 }
}
  ↓ Excel 다운로드
purchase_order_batches (INSERT)
  - order_ids: [uuid1, uuid2, ...]
  - status: 'completed'
  ↓ 중복 발주 방지
completedOrderIds = Set(order_ids from batches)
pendingOrders = orders.filter(not in completedOrderIds)
```

---

### 관련 기능 (FEATURE_REFERENCE_MAP)

- **6.1 발주서 생성** (PART2)
- **1.3 주문 조회 (관리자)** (PART1)

---

## 🎨 시나리오 6: Variant 상품 등록 → 판매 → 재고 관리

### 전체 흐름 요약
```
관리자: 상품 등록 (기본 정보)
  ↓
관리자: Variant 옵션 생성 (색상, 사이즈)
  ↓
관리자: Variant 조합 생성 (SKU별 재고)
  ↓
사용자: 상품 구매 (Variant 선택)
  ↓
재고 차감 (product_variants.inventory)
  ↓
관리자: 재고 확인 및 보충
```

---

### Step 1: 관리자 - 상품 기본 정보 등록

**페이지**: `/admin/products/catalog/new`
**파일**: `/app/admin/products/catalog/new/page.js`

**기능**:
- 상품 기본 정보 입력 (상품명, 가격, 설명 등)

**호출 함수**:
```javascript
// 1. 상품 등록
const newProduct = await addProduct({
  title: '프리미엄 티셔츠',
  product_number: 'P-20251008-0001',
  price: 30000,
  compare_price: 35000,
  discount_rate: 14,
  description: '고급 면 소재 티셔츠',
  category_id: categoryId,
  supplier_id: supplierId,
  inventory: 0,  // 참고용 (실제는 Variant)
  is_visible: true,
  is_featured: false,
  is_live: false,
  is_live_active: false,
  status: 'active',
  option_count: 0,  // 옵션 추가 시 업데이트
  variant_count: 0  // Variant 생성 시 업데이트
})
```

**DB 작업**:
- **INSERT** `products` 테이블
  - `id` (UUID)
  - `product_number`, `title`, `price`, `description`
  - `category_id`, `supplier_id`
  - `inventory = 0`, `option_count = 0`, `variant_count = 0`

**관리자 화면**:
- 상품 등록 폼 (입력 필드 15개)
- "저장" 버튼

**다음 액션**: 상품 상세 페이지 → Variant 관리

---

### Step 2: 관리자 - Variant 옵션 생성

**페이지**: `/admin/products/catalog/[id]` (VariantBottomSheet)
**파일**: `/app/components/admin/VariantBottomSheet.jsx`

**기능**:
1. 옵션 추가 (색상, 사이즈)
2. 옵션값 추가 (빨강, 파랑, S, M, L)

**호출 함수**:
```javascript
// 1. 옵션 생성 (색상)
const { data: colorOption } = await supabase
  .from('product_options')
  .insert({
    product_id: productId,
    name: '색상',
    display_order: 1
  })
  .select()
  .single()

// 2. 옵션값 생성 (색상: 빨강, 파랑, 화이트)
const colorValues = ['빨강', '파랑', '화이트']
await supabase
  .from('product_option_values')
  .insert(colorValues.map((value, index) => ({
    option_id: colorOption.id,
    value: value,
    display_order: index + 1
  })))

// 3. 옵션 생성 (사이즈)
const { data: sizeOption } = await supabase
  .from('product_options')
  .insert({
    product_id: productId,
    name: '사이즈',
    display_order: 2
  })
  .select()
  .single()

// 4. 옵션값 생성 (사이즈: S, M, L)
const sizeValues = ['S', 'M', 'L']
await supabase
  .from('product_option_values')
  .insert(sizeValues.map((value, index) => ({
    option_id: sizeOption.id,
    value: value,
    display_order: index + 1
  })))

// 5. products.option_count 업데이트
await supabase
  .from('products')
  .update({ option_count: 2 })
  .eq('id', productId)
```

**DB 작업**:
- **INSERT** `product_options` 테이블 (2개: 색상, 사이즈)
- **INSERT** `product_option_values` 테이블 (6개: 빨강, 파랑, 화이트, S, M, L)
- **UPDATE** `products.option_count = 2`

**관리자 화면**:
- 옵션 리스트:
  - 색상: 빨강, 파랑, 화이트
  - 사이즈: S, M, L
- "옵션 추가" 버튼
- "Variant 생성" 버튼

**다음 액션**: "Variant 생성" 클릭 → 모든 조합 자동 생성

---

### Step 3: 관리자 - Variant 조합 생성 (SKU별 재고)

**페이지**: `/admin/products/catalog/[id]` (VariantBottomSheet)
**파일**: `/app/components/admin/VariantBottomSheet.jsx`

**기능**:
1. 옵션 조합 생성 (3 × 3 = 9개 Variant)
2. SKU 자동 생성 (제품번호-옵션값1-옵션값2)
3. 각 Variant별 재고 입력

**호출 함수**:
```javascript
// 1. 모든 옵션값 조회
const { data: colorValues } = await supabase
  .from('product_option_values')
  .select('*')
  .eq('option_id', colorOption.id)

const { data: sizeValues } = await supabase
  .from('product_option_values')
  .select('*')
  .eq('option_id', sizeOption.id)

// 2. 모든 조합 생성 (3 × 3 = 9개)
const variants = []
for (const color of colorValues) {
  for (const size of sizeValues) {
    const sku = `${product.product_number}-${color.value}-${size.value}`
    // 예: 'P-20251008-0001-빨강-S'

    variants.push({
      product_id: productId,
      sku: sku,
      variant_title: `${color.value}/${size.value}`,
      inventory: 10,  // 각 Variant 재고 10개 (관리자 입력)
      price_adjustment: 0,
      is_active: true
    })
  }
}

// 3. Variant 일괄 생성
const { data: createdVariants } = await supabase
  .from('product_variants')
  .insert(variants)
  .select()

// 4. variant_option_values 매핑 (각 Variant별 옵션값 연결)
const variantOptionValues = []
createdVariants.forEach(variant => {
  // SKU에서 옵션값 추출
  const [_, color, size] = variant.sku.split('-')

  // 색상 옵션값 매핑
  const colorValue = colorValues.find(v => v.value === color)
  variantOptionValues.push({
    variant_id: variant.id,
    option_value_id: colorValue.id
  })

  // 사이즈 옵션값 매핑
  const sizeValue = sizeValues.find(v => v.value === size)
  variantOptionValues.push({
    variant_id: variant.id,
    option_value_id: sizeValue.id
  })
})

await supabase
  .from('variant_option_values')
  .insert(variantOptionValues)

// 5. products.variant_count, inventory 업데이트
const totalInventory = variants.reduce((sum, v) => sum + v.inventory, 0)
await supabase
  .from('products')
  .update({
    variant_count: variants.length,  // 9개
    inventory: totalInventory  // 90개 (참고용)
  })
  .eq('id', productId)
```

**DB 작업**:
- **INSERT** `product_variants` 테이블 (9개)
  - `id`, `product_id`, `sku`, `variant_title`, `inventory`, `price_adjustment`, `is_active`
- **INSERT** `variant_option_values` 테이블 (18개: 9 Variant × 2 옵션)
  - `variant_id`, `option_value_id`
- **UPDATE** `products.variant_count = 9`, `products.inventory = 90`

**생성된 Variant 예시**:
```
SKU: P-20251008-0001-빨강-S, 재고: 10개
SKU: P-20251008-0001-빨강-M, 재고: 10개
SKU: P-20251008-0001-빨강-L, 재고: 10개
SKU: P-20251008-0001-파랑-S, 재고: 10개
SKU: P-20251008-0001-파랑-M, 재고: 10개
SKU: P-20251008-0001-파랑-L, 재고: 10개
SKU: P-20251008-0001-화이트-S, 재고: 10개
SKU: P-20251008-0001-화이트-M, 재고: 10개
SKU: P-20251008-0001-화이트-L, 재고: 10개
```

**관리자 화면**:
- Variant 테이블:
  - SKU, 옵션, 재고, 상태
- 재고 입력 필드 (각 Variant별)
- "저장" 버튼

**다음 액션**: 라이브 상품 노출 → 사용자 구매

---

### Step 4: 사용자 - 상품 구매 (Variant 선택)

**페이지**: `/` (홈) → `BuyBottomSheet`
**파일**: `/app/components/product/BuyBottomSheet.jsx`

**기능**: 시나리오 1 Step 2 참조

**Variant 선택 로직**:
```javascript
// 1. Variant 조회
const variants = await getProductVariants(productId)

// 2. 사용자가 옵션 선택: 색상=빨강, 사이즈=M
const selectedOptions = { 색상: '빨강', 사이즈: 'M' }

// 3. SKU 매칭
const findVariant = (selectedOptions) => {
  return variants.find(variant => {
    // variant_option_values 매핑 확인
    const variantOptions = variant.variant_option_values

    return Object.keys(selectedOptions).every(optionName => {
      const matchingOption = variantOptions.find(
        vo => vo.option_name === optionName && vo.option_value === selectedOptions[optionName]
      )
      return !!matchingOption
    })
  })
}

const selectedVariant = findVariant(selectedOptions)
// 결과: { id: uuid, sku: 'P-20251008-0001-빨강-M', inventory: 10 }

// 4. 재고 확인
if (selectedVariant.inventory < quantity) {
  alert('재고가 부족합니다')
  return
}
```

**DB 작업**:
- **SELECT** `product_variants` (product_id = ?)
- **JOIN** `variant_option_values`, `product_option_values`, `product_options`

**사용자 화면**:
- 옵션 선택:
  - 색상: [빨강] (드롭다운)
  - 사이즈: [M] (드롭다운)
- 재고 표시: "재고 10개"
- 수량: 1개
- "바로구매" 버튼

**다음 액션**: "바로구매" 클릭 → 주문 생성

---

### Step 5: 재고 차감 (product_variants.inventory)

**페이지**: `/checkout` (서버 처리)
**파일**: `/lib/supabaseApi.js` - `createOrder()`, `updateVariantInventory()`

**기능**:
- 주문 생성 시 Variant 재고 차감

**호출 함수**:
```javascript
// 1. createOrder 내부 (시나리오 1 Step 4 참조)
if (orderData.selectedVariantId) {
  await updateVariantInventory(orderData.selectedVariantId, -orderData.quantity)
} else {
  await updateProductInventory(orderData.id, -orderData.quantity)
}

// 2. updateVariantInventory 내부 (/lib/supabaseApi.js)
export async function updateVariantInventory(variantId, quantityChange) {
  // FOR UPDATE 락 (동시성 제어)
  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, inventory, product_id')
    .eq('id', variantId)
    .single()

  const newInventory = variant.inventory + quantityChange

  // Variant 재고 업데이트
  const { error } = await supabase
    .from('product_variants')
    .update({ inventory: newInventory })
    .eq('id', variantId)

  if (error) throw error

  // ⭐ DB 트리거 자동 실행: update_product_total_inventory()
  // products.inventory = SUM(product_variants.inventory)
}

// 3. DB 트리거 (supabase/migrations/20251001_variant_system.sql)
CREATE FUNCTION update_product_total_inventory()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET inventory = (
    SELECT COALESCE(SUM(inventory), 0)
    FROM product_variants
    WHERE product_id = NEW.product_id
  )
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_inventory
AFTER INSERT OR UPDATE OR DELETE ON product_variants
FOR EACH ROW
EXECUTE FUNCTION update_product_total_inventory();
```

**DB 작업**:
- **UPDATE** `product_variants` (id = ?)
  - `inventory = inventory - 1`
- **트리거 자동 실행**: `products.inventory` 재계산
  - `products.inventory = SUM(product_variants.inventory WHERE product_id = ?)`

**재고 변화**:
```
Before:
- product_variants (빨강/M): inventory = 10
- products: inventory = 90

After:
- product_variants (빨강/M): inventory = 9
- products: inventory = 89 (트리거 자동 업데이트)
```

---

### Step 6: 관리자 - 재고 확인 및 보충

**페이지**: `/admin/products/catalog/[id]`
**파일**: `/app/admin/products/catalog/[id]/page.js`

**기능**:
1. Variant별 재고 현황 조회
2. 재고 보충

**호출 함수**:
```javascript
// 1. Variant 재고 조회
const { data: variants } = await supabase
  .from('product_variants')
  .select(`
    *,
    variant_option_values (
      option_value:product_option_values (
        value,
        option:product_options (name)
      )
    )
  `)
  .eq('product_id', productId)
  .order('sku', { ascending: true })

// 2. 재고 보충 (관리자 입력)
await supabase
  .from('product_variants')
  .update({ inventory: variant.inventory + addQuantity })
  .eq('id', variantId)

// 트리거 자동 실행: products.inventory 재계산
```

**DB 작업**:
- **SELECT** `product_variants` (product_id = ?)
- **JOIN** `variant_option_values`, `product_option_values`, `product_options`
- **UPDATE** `product_variants.inventory` (재고 보충)

**관리자 화면**:
- Variant 재고 테이블:
  ```
  SKU | 옵션 | 재고 | 상태
  P-20251008-0001-빨강-S | 빨강/S | 10개 | 활성
  P-20251008-0001-빨강-M | 빨강/M | 9개 | 활성 (판매됨)
  P-20251008-0001-빨강-L | 빨강/L | 10개 | 활성
  ...
  ```
- 재고 보충 버튼 (각 Variant별)

---

### 데이터 흐름 요약

```
products (기본 정보)
  ↓
product_options (색상, 사이즈)
  ↓
product_option_values (빨강, 파랑, S, M, L)
  ↓
product_variants (9개 조합, SKU별 재고)
  ↓
variant_option_values (Variant ↔ 옵션값 매핑)
  ↓ 사용자 구매
orders + order_items (variant_id, sku)
  ↓ 재고 차감
product_variants.inventory = inventory - 1
  ↓ 트리거
products.inventory = SUM(product_variants.inventory)
```

---

### 관련 기능 (FEATURE_REFERENCE_MAP)

- **3.1 Variant 생성** (PART2)
- **3.2 Variant 재고 관리** (PART2)
- **3.3 Variant 재고 확인** (PART2)
- **2.1 상품 등록** (PART1)

---

## 📊 전체 시스템 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                    사용자 경험 레이어                        │
├─────────────────────────────────────────────────────────────┤
│ 홈페이지 → 상품 선택 → 체크아웃 → 주문 생성 → 주문 완료      │
│    ↓         ↓          ↓          ↓          ↓              │
│ products  variants  coupons   orders    order_items          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   관리자 관리 레이어                         │
├─────────────────────────────────────────────────────────────┤
│ 입금 확인 → 발주 생성 → 발송 처리                           │
│    ↓          ↓          ↓                                   │
│ deposited  batches   shipped                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    데이터베이스 레이어                       │
├─────────────────────────────────────────────────────────────┤
│ products → product_variants → orders → order_items           │
│    ↓            ↓                ↓         ↓                 │
│ suppliers → purchase_batches   coupons  user_coupons         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 핵심 요약

### 각 시나리오의 핵심 데이터 흐름:

1. **일반 사용자 구매**:
   ```
   products → variants → profiles → orders → user_coupons (사용)
   ```

2. **카카오 사용자 구매**:
   ```
   kakao_oauth → profiles (kakao_id) → orders (order_type: KAKAO) → user_coupons
   ```

3. **관리자 주문 관리**:
   ```
   orders (pending) → deposited → shipped → delivered
   ```

4. **쿠폰 전체 흐름**:
   ```
   coupons → user_coupons (배포) → validate → use_coupon → orders.discount_amount
   ```

5. **발주 프로세스**:
   ```
   orders (deposited) → suppliers → purchase_batches → Excel 다운로드
   ```

6. **Variant 재고 관리**:
   ```
   product_options → product_variants (SKU) → orders (재고 차감) → products.inventory (트리거)
   ```

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-10-08
**작성자**: Claude Code
**기반 코드베이스**: 128개 파일, 36개 페이지, 16개 DB 테이블
