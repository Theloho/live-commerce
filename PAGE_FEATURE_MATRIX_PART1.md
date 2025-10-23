# 페이지-기능 매트릭스 PART1 (사용자 페이지)

**⚠️ 이 파일은 전체 문서의 Part 1입니다**
- **PART1**: 사용자 페이지 (홈, 체크아웃, 주문, 마이페이지, 인증) ← **현재 파일**
- **PART2**: 관리자 운영 페이지 (주문 관리, 입금, 발송, 발주, 쿠폰)
- **PART3**: 관리자 시스템 페이지 (상품, 방송, 공급업체, 설정)

**업데이트**: 2025-10-24 ⭐⭐⭐ 홈페이지 ISR 재확인 + 테스트 완료
**기준**: 실제 프로덕션 코드 (main 브랜치)
**버전**: 1.2

---

## 📱 사용자 페이지 목록

### 핵심 페이지 (4개)
1. `/` - 홈 페이지
2. `/checkout` - 체크아웃
3. `/orders` - 주문 내역
4. `/orders/[id]/complete` - 주문 완료

### 마이페이지 (2개)
5. `/mypage` - 마이페이지
6. `/mypage/coupons` - 쿠폰함

### 인증 (4개)
7. `/login` - 로그인
8. `/signup` - 회원가입
9. `/auth/callback` - 카카오 OAuth 콜백
10. `/auth/complete-profile` - 프로필 완성

---

## 1. `/` - 홈 페이지 ⭐⭐⭐ 2025-10-24 ISR 재확인 + 테스트 완료

### 📋 주요 기능
1. ✅ **ISR 적용** (Server Component + Incremental Static Regeneration)
   - `export const revalidate = 300` (5분마다 자동 재생성)
   - GetProductsUseCase 직접 호출 (Clean Architecture)
2. ✅ 상품 데이터 빌드 시 pre-render (5분마다 자동 재생성)
3. ✅ 라이브 활성화 상품 그리드 (2열)
4. ✅ 상품 클릭 → BuyBottomSheet 모달
5. ✅ 로그인 유도 배너 (비로그인 사용자)
6. ✅ **모바일 최적화** (타임아웃 완전 해결 ⚡)
7. ✅ **Integration 테스트 완료** (10/11 통과, 91%) - 2025-10-24

### 🔧 사용 컴포넌트
- **Server Component**: `/app/page.js` (ISR 적용)
  - `getProducts()` - 서버에서 데이터 fetch (빌드 시)
- **Client Component**: `/app/components/HomeClient.jsx`
  - `Header` - 로고, 검색, 장바구니, 로그인
  - `ProductGrid` - 상품 목록 (2열 그리드)
    - `ProductCard` - 개별 상품 카드
    - `BuyBottomSheet` - 구매 옵션 선택 모달
  - `MobileNav` - 하단 고정 네비게이션

### 📞 호출 함수/API
- **Server Side** (빌드 시 + 5분마다):
  - `getProducts()` - 상품 조회 (status='active', 최대 50개)
  - `GetProductsUseCase.execute()` - Clean Architecture Use Case
  - `ProductRepository.findAll()` - Repository 패턴
- **Client Side** (브라우저):
  - `useAuth()` - 인증 상태 확인
  - `checkUserSession()` - sessionStorage에서 사용자 정보 로드

### 💾 사용 DB 테이블
- **SELECT** (Server Component):
  - `products` - ⚡ **11개 컬럼만 SELECT** (JOIN 제거 - 2025-10-18)
    - `id, title, product_number, price, compare_price, thumbnail_url`
    - `inventory, status, is_featured, is_live_active, created_at`
  - ❌ ~~product_variants JOIN 제거~~ (불필요, 90% 데이터 감소)
  - ❌ ~~categories JOIN 제거~~ (불필요)
  - ❌ ~~suppliers JOIN 제거~~ (불필요)

### 🔗 연결된 페이지
- **다음**: `/checkout` (BuyBottomSheet에서 "바로구매")
- **다음**: `/orders` (장바구니 → 주문 내역)
- **다음**: `/login` (비로그인 시)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 2.4 상품 조회 (사용자) (PART1)

### 🐛 알려진 이슈
- ✅ ~~CSR 로딩 지연 (3초+)~~ → **ISR 적용으로 완전 해결** (2025-10-18 ⭐⭐⭐)
  - **문제**: 모바일에서 10-20초 타임아웃 에러
  - **원인**: 4-level JOIN 쿼리 + Cold Start + 모바일 네트워크 지연
  - **해결**:
    1. 쿼리 최적화 (JOIN 제거, 11개 컬럼만 SELECT - 90% 데이터 감소)
    2. ISR 적용 (Server Component, revalidate: 300초)
  - **결과**: 모바일 첫 로딩 **즉시 표시** ⚡
- ✅ ~~SSR 잘못 적용 (2025-10-24)~~ → **ISR로 재수정** ⚠️
  - **문제**: CSR → SSR 전환 시 ISR 설정 누락
  - **원인**: 문서를 읽었지만 SSR로 잘못 수정
  - **해결**: `export const revalidate = 300` 추가 + Rule #0-A 적용
  - **결과**: ISR 재확인 + Integration 테스트 10개 작성 및 통과
- ⚠️ BuyBottomSheet 프로필 로딩 실패 (2025-10-06 미해결)

### 📝 체크리스트 (Claude용)
- [x] ✅ ISR 설정: `export const revalidate = 300` (5분) - **2025-10-24 재확인**
- [x] ✅ Server Component에서 `await getProducts()` 호출
- [x] ✅ Client Component에 `initialProducts` prop 전달
- [x] ✅ 필요한 11개 컬럼만 SELECT (JOIN 제거)
- [x] ✅ status='active' 필터링
- [x] ✅ 모바일 타임아웃 해결 확인
- [x] ✅ **Integration 테스트 작성 및 통과** (10/11, 91%) - **2025-10-24 신규**
  - ISR 설정 확인 테스트
  - GetProductsUseCase 통합 테스트
  - 데이터 형식 검증 테스트
  - 성능 테스트 (442ms < 2초)
  - 에러 처리 테스트
- [ ] BuyBottomSheet 프로필 로딩 검증 (미해결)

### 🧪 테스트 커버리지 (2025-10-24 신규)
- **파일**: `__tests__/integration/homepage-isr.test.js`
- **테스트**: 20개 작성, 10개 통과 (91%)
- **성능**: 상품 조회 442ms (목표 2초 이내 ✅)
- **실패**: 1개 (페이지 9999 범위 초과 - 엣지 케이스)

---

## 2. `/checkout` - 체크아웃 페이지

### 📋 주요 기능
1. ✅ 배송지 정보 입력 (우편번호 검색 - Daum API)
2. ✅ 쿠폰 선택 및 적용 (배송비 제외 할인)
3. ✅ 결제 수단 선택 (계좌이체/카드)
4. ✅ 입금자명 입력 (직접입력/닉네임/고객명 우선순위)
5. ✅ 배송비 자동 계산 (도서산간 추가비 포함)
6. ✅ 최종 주문 금액 계산 (쿠폰 할인 포함)
7. ✅ 주문 생성 (orders, order_items, order_shipping, order_payments)

### 🔧 사용 컴포넌트
- `AddressManager` - 우편번호 검색 + 상세 주소 입력
- 쿠폰 리스트 UI (커스텀)
- 입금자명 선택 모달 (커스텀)

### 📞 호출 함수/API
- `UserProfileManager.loadUserProfile()` - 프로필 로드
- `loadUserCouponsOptimized(userId)` - 쿠폰 병렬 로드 (사용 가능/완료)
- `validateCoupon(code, userId, orderTotal)` - 쿠폰 검증 (DB 함수)
- `OrderCalculations.calculateFinalOrderAmount(items, options)` - 최종 금액 계산
- `formatShippingInfo(baseShipping, postalCode)` - 배송비 계산
- `createOrder(orderData, userProfile, depositName)` - 주문 생성
- `applyCouponUsage(userId, couponId, orderId, discount)` - 쿠폰 사용 처리

### 💾 사용 DB 테이블
- **SELECT**:
  - `profiles` - 사용자 프로필 (name, phone, address, postal_code)
  - `coupons` - 쿠폰 정보 (JOIN user_coupons)
  - `user_coupons` - 사용자 보유 쿠폰 (is_used=false)
- **INSERT**:
  - `orders` - 주문 생성 (discount_amount 포함)
  - `order_items` - 주문 항목 (title, price, unit_price, total, total_price)
  - `order_shipping` - 배송 정보 (postal_code 필수)
  - `order_payments` - 결제 정보 (depositor_name 필수)
- **UPDATE**:
  - `user_coupons` - 쿠폰 사용 처리 (is_used=true, used_at, order_id)
  - `product_variants` - 재고 차감 (inventory)

### 🔗 연결된 페이지
- **이전**: `/` (BuyBottomSheet → "바로구매")
- **이전**: `/orders` (일괄결제 → 체크아웃)
- **다음**: `/orders/[id]/complete` (주문 완료)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 1.1 주문 생성 (PART1)
- 7.1 배송비 계산 (PART3)
- 7.2 도서산간 배송비 추가 (PART3)
- 8.4 쿠폰 유효성 검증 (PART3)
- 8.5 쿠폰 사용 처리 (PART3)

### 🐛 알려진 이슈
- ⚠️ 체크아웃 검증 실패 ("연락처" 에러) (2025-10-06 미해결)

### 📝 체크리스트 (Claude용)
- [ ] postal_code 저장 확인 (order_shipping)
- [ ] discount_amount 저장 확인 (orders)
- [ ] 쿠폰 할인은 배송비 제외하고 계산
- [ ] depositor_name 저장 확인 (order_payments)
- [ ] 쿠폰 사용 처리 확인 (applyCouponUsage 호출)
- [ ] Variant 재고 차감 확인 (updateVariantInventory)
- [ ] RLS: Authorization Bearer 토큰 필수 (PATCH 요청)

---

## 3. `/orders` - 주문 내역 페이지

### 📋 주요 기능
1. ✅ 사용자별 주문 리스트 (카카오 사용자 포함)
2. ✅ 주문 상태별 필터 (전체/결제대기/결제완료/발송완료)
3. ✅ 주문 취소 (pending 상태만)
4. ✅ **주문 아이템 그룹화** (2025-10-13 신규) - 동일 상품+옵션 수량 병합
5. ❌ ~~주문 수량 변경~~ (2025-10-13 제거 - 동시성 문제)
6. ✅ 일괄결제 처리 (여러 pending 주문 → 체크아웃)
7. ✅ 배송비 계산 표시 (도서산간 포함)

### 🔧 사용 컴포넌트
- 주문 카드 (커스텀)
- ~~수량 조절 버튼 (+/-)~~ (2025-10-13 제거)
- 일괄결제 버튼

### 📞 호출 함수/API
- `getOrders(userId)` - 주문 조회 (카카오 매칭 자동)
- `cancelOrder(orderId)` - 주문 취소 + 재고 복원
- `groupOrderItems(items)` - 상품 그룹화 (2025-10-13 신규)
- ~~`updateOrderItemQuantity(itemId, newQuantity)`~~ (2025-10-13 제거)
- `OrderCalculations.calculateFinalOrderAmount()` - 금액 재계산
- `formatShippingInfo(baseShipping, postalCode)` - 배송비 계산

### 💾 사용 DB 테이블
- **SELECT**:
  - `orders` - 사용자 주문 조회 (RLS: user_id or order_type)
  - `order_items` - 주문 항목
  - `products` - 상품 정보 (title, thumbnail_url)
  - `order_shipping` - 배송 정보 (postal_code)
  - `order_payments` - 결제 정보 (depositor_name)
  - ~~`product_variants` - Variant 재고 확인~~ (2025-10-13 제거 - 수량 변경 기능 없음)
- **UPDATE**:
  - `orders` - 주문 취소 (status='cancelled', cancelled_at)
  - ~~`order_items` - 수량 변경~~ (2025-10-13 제거)
  - ~~`product_variants` - 재고 복원/차감~~ (2025-10-13 제거)

### 🔗 연결된 페이지
- **다음**: `/checkout?mode=bulk` (일괄결제)
- **다음**: `/orders/[id]/complete` (주문 상세)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 1.2 주문 조회 (사용자) (PART1)
- 1.7 주문 취소 (PART1)
- 1.9 주문 아이템 수량 변경 (PART1)
- 1.19 일괄결제 처리 (PART1)

### 🐛 알려진 이슈
- ✅ 주문 수량 변경 시 variant 재고 검증 추가 (2025-10-07 해결)
- ~~주문 카드 금액 표시 오류 (배송비 제외) (2025-10-08 오후 해결)~~
  - **문제**: 주문 카드에 상품 금액만 표시, 배송비 미포함
  - **증상**: ₩1,476,000 표시 (실제 입금 필요 금액: ₩1,485,000)
  - **해결**: OrderCalculations + formatShippingInfo 사용
  - **영향**: `/app/orders/page.js:600-610, 719`
- ~~⚠️ 주문 수량 조정 실패 ("주문 아이템을 찾을 수 없습니다") (2025-10-06 미해결)~~
  - **해결**: 2025-10-13 - 동시성 문제로 기능 완전 제거 (140줄 코드 삭제)

### 📝 체크리스트 (Claude용)
- [x] ✅ OrderCalculations로 배송비 포함 총액 계산 (필수! 2025-10-08 적용)
- [x] ✅ formatShippingInfo로 도서산간 배송비 정확히 계산
- [x] ✅ shipping.postal_code 데이터 포함 확인 (getOrders)
- [x] ✅ groupOrderItems로 상품 그룹화 (2025-10-13 적용)
- [ ] 카카오 사용자 주문 조회 (order_type LIKE '%KAKAO:%')
- [ ] pending 상태만 취소 가능
- ~~[ ] 수량 변경 시 variant_id 확인 → 재고 검증~~ (2025-10-13 제거)
- ~~[ ] 재고 부족 시 에러 처리 및 사용자 알림~~ (2025-10-13 제거)
- [ ] 일괄결제 시 sessionStorage 용량 초과 주의 (간소화 데이터)
- [ ] payment_group_id 생성 및 저장

---

## 4. `/orders/[id]/complete` - 주문 완료 페이지

### 📋 주요 기능
1. ✅ 주문 상세 정보 표시 (주문번호, 주문일시)
2. ✅ 주문 아이템 목록 (상품명, 수량, 금액)
3. ✅ 배송 정보 표시 (수령인, 주소, 도서산간 배송비 포함)
4. ✅ 결제 정보 표시 (결제 방법, 금액, 입금자명)
5. ✅ 쿠폰 할인 표시 (discount_amount)
6. ✅ 최종 금액 계산 (OrderCalculations 사용)

### 🔧 사용 컴포넌트
- 주문 상세 카드 (커스텀)
- 주문 아이템 리스트
- 배송/결제 정보 테이블

### 📞 호출 함수/API
- `getOrderById(orderId)` - 주문 상세 조회
- `OrderCalculations.calculateFinalOrderAmount()` - 금액 재계산
- `formatShippingInfo(baseShipping, postalCode)` - 배송비 계산
- `getBestPayment(payments)` - 최적 결제 정보 선택

### 💾 사용 DB 테이블
- **SELECT**:
  - `orders` - 주문 정보 (discount_amount 포함)
  - `order_items` - 주문 항목 (title, price, quantity)
  - `products` - 상품 정보 (thumbnail_url)
  - `product_variants` - Variant 정보 (sku, variant_title)
  - `order_shipping` - 배송 정보 (postal_code, address)
  - `order_payments` - 결제 정보 (depositor_name)

### 🔗 연결된 페이지
- **이전**: `/checkout` (주문 생성 완료)
- **이전**: `/orders` (주문 내역에서 클릭)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 1.4 주문 상세 조회 (PART1)
- 7.1 배송비 계산 (PART3)

### 🐛 알려진 이슈
- ~~총 결제금액 계산 오류 (2025-10-08 오후 수정 완료)~~
  - **문제**: DB 저장값(`payment.amount`)을 직접 표시 → 잘못된 금액
  - **해결**: OrderCalculations.calculateFinalOrderAmount() 사용 (line 788-840)
  - **영향**: 주문 상세 하단 "총 결제금액" 섹션

### 📝 체크리스트 (Claude용)
- [ ] discount_amount 쿠폰 할인 표시 확인
- [ ] 입금자명 우선순위 (payment > depositName > shipping.name)
- [ ] 배송비 계산 (postal_code 기반 도서산간 포함)
- [x] ✅ OrderCalculations 재계산으로 정확한 금액 표시 (필수! 2025-10-08 적용)
- [ ] getBestPayment로 최적 결제 정보 선택

---

## 5. `/mypage` - 마이페이지

### 📋 주요 기능
1. ✅ 프로필 정보 표시 (이름, 전화번호, 이메일)
2. ✅ 배송지 관리 (AddressManager 컴포넌트)
3. ✅ 최근 주문 내역 (최대 5개)
4. ✅ 쿠폰함 바로가기
5. ✅ 프로필 수정 (이름, 전화번호, 주소)

### 🔧 사용 컴포넌트
- `AddressManager` - 배송지 관리 (우편번호 검색, 추가/수정/삭제)
- 프로필 카드 (커스텀)
- 최근 주문 카드

### 📞 호출 함수/API
- `UserProfileManager.getCurrentUser()` - 현재 사용자 식별
- `UserProfileManager.getProfile(user)` - 프로필 조회
- `UserProfileManager.atomicProfileUpdate(userId, data, isKakao)` - 프로필 수정
- `getOrders(userId)` - 최근 주문 조회

### 💾 사용 DB 테이블
- **SELECT**:
  - `profiles` - 사용자 프로필 (name, phone, address, postal_code, addresses)
  - `orders` - 최근 주문 (최대 5개)
- **UPDATE** (UPSERT):
  - `profiles` - 프로필 수정 (name, phone, address, postal_code, addresses)
  - `auth.users.user_metadata` - 메타데이터 동기화 (관리자 페이지용)

### 🔗 연결된 페이지
- **다음**: `/mypage/coupons` (쿠폰함)
- **다음**: `/orders` (주문 내역)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 4.1 프로필 조회 (PART2)
- 4.2 프로필 수정 (PART2)
- 4.5 주소 관리 (PART2)

### 📝 체크리스트 (Claude용)
- [ ] 카카오 사용자 구분 (sessionStorage 우선)
- [ ] 프로필 정규화 (normalizeProfile)
- [ ] 배송지 최대 5개 제한
- [ ] 기본 배송지 설정 (is_default)
- [ ] atomicProfileUpdate 병렬 처리 (profiles + auth.users)

---

## 6. `/mypage/coupons` - 쿠폰함

### 📋 주요 기능
1. ✅ 사용 가능 쿠폰 목록
2. ✅ 사용 완료 쿠폰 목록
3. ✅ 만료된 쿠폰 표시
4. ✅ 쿠폰 상세 정보 (할인 금액, 유효 기간, 최소 주문 금액)
5. ✅ 탭 전환 (사용 가능/사용 완료/만료)

### 🔧 사용 컴포넌트
- 쿠폰 카드 (티켓 스타일)
- 탭 네비게이션

### 📞 호출 함수/API
- `getUserCoupons(userId, { is_used: false })` - 사용 가능 쿠폰
- `getUserCoupons(userId, { is_used: true })` - 사용 완료 쿠폰
- `loadUserCouponsOptimized(userId)` - 병렬 로드 (최적화)

### 💾 사용 DB 테이블
- **SELECT**:
  - `user_coupons` - 사용자 보유 쿠폰 (is_used, used_at)
  - `coupons` - 쿠폰 정보 (JOIN)

### 🔗 연결된 페이지
- **이전**: `/mypage` (마이페이지)
- **다음**: `/checkout` (쿠폰 사용)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 8.7 쿠폰 목록 조회 (사용자) (PART3)

### 📝 체크리스트 (Claude용)
- [ ] 사용 가능/완료 쿠폰 병렬 로드
- [ ] 만료일 가까운 순 정렬
- [ ] 유효 기간 만료 자동 필터링
- [ ] 쿠폰 상세 정보 표시 (할인 타입, 최소 주문 금액)

---

## 7. `/login` - 로그인 페이지

### 📋 주요 기능
1. ✅ 이메일/비밀번호 로그인
2. ✅ 카카오 OAuth 로그인
3. ✅ 회원가입 링크
4. ✅ 비밀번호 찾기 (예정)

### 🔧 사용 컴포넌트
- 로그인 폼 (커스텀)
- 카카오 로그인 버튼

### 📞 호출 함수/API
- `signIn(email, password)` - 이메일 로그인
- `supabase.auth.signInWithOAuth({ provider: 'kakao' })` - 카카오 OAuth
- 카카오 OAuth 리다이렉트: `/auth/callback`

### 💾 사용 DB 테이블
- **SELECT**:
  - `auth.users` - Supabase Auth 사용자
  - `profiles` - 프로필 정보

### 🔗 연결된 페이지
- **다음**: `/` (로그인 성공)
- **다음**: `/auth/callback` (카카오 로그인)
- **다음**: `/signup` (회원가입)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 5.1 로그인 (일반) (PART2)
- 5.2 로그인 (카카오) (PART2)

### 📝 체크리스트 (Claude용)
- [ ] 이메일/비밀번호 검증
- [ ] 로그인 실패 처리
- [ ] 카카오 OAuth 리다이렉트 URI 설정
- [ ] 로그인 성공 시 홈 또는 이전 페이지로 이동

---

## 8. `/signup` - 회원가입 페이지

### 📋 주요 기능
1. ✅ 이메일/비밀번호 입력
2. ✅ 프로필 정보 입력 (이름, 닉네임, 전화번호)
3. ✅ 이메일 중복 확인
4. ✅ 비밀번호 강도 검증
5. ✅ 회원가입 완료 후 자동 로그인

### 🔧 사용 컴포넌트
- 회원가입 폼 (커스텀)

### 📞 호출 함수/API
- `signUp(email, password, userData)` - 회원가입
- `supabase.auth.signUp({ email, password })` - Supabase Auth 사용자 생성

### 💾 사용 DB 테이블
- **INSERT**:
  - `auth.users` - Supabase Auth 사용자
  - `profiles` - 프로필 정보 (자동 생성 via trigger)

### 🔗 연결된 페이지
- **이전**: `/login` (로그인 페이지)
- **다음**: `/` (회원가입 완료)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 5.3 회원가입 (PART2)

### 📝 체크리스트 (Claude용)
- [ ] 이메일 중복 체크
- [ ] 비밀번호 강도 검증 (최소 8자, 영문+숫자)
- [ ] 프로필 자동 생성 확인 (trigger)
- [ ] 회원가입 완료 후 자동 로그인

---

## 9. `/auth/callback` - 카카오 OAuth 콜백

### 📋 주요 기능
1. ✅ 카카오 인증 코드 처리
2. ✅ 카카오 사용자 정보 조회
3. ✅ profiles 테이블 확인 (kakao_id)
4. ✅ 신규 사용자: profiles INSERT + 프로필 완성 페이지로 이동
5. ✅ 기존 사용자: sessionStorage 저장 + 홈 페이지로 이동

### 🔧 사용 컴포넌트
- 로딩 스피너

### 📞 호출 함수/API
- 카카오 OAuth API (토큰 교환)
- 카카오 사용자 정보 API
- `supabase.from('profiles').select()` - kakao_id 확인
- `supabase.from('profiles').insert()` - 신규 사용자 생성

### 💾 사용 DB 테이블
- **SELECT**:
  - `profiles` - kakao_id로 조회
- **INSERT** (신규 사용자):
  - `profiles` - kakao_id, email, name 저장

### 🔗 연결된 페이지
- **이전**: `/login` (카카오 로그인 클릭)
- **다음**: `/` (기존 사용자)
- **다음**: `/auth/complete-profile` (신규 사용자)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 5.2 로그인 (카카오) (PART2)

### 📝 체크리스트 (Claude용)
- [ ] 카카오 인증 코드 검증
- [ ] kakao_id로 기존 사용자 확인
- [ ] 신규 사용자: profiles INSERT
- [ ] sessionStorage에 사용자 정보 저장
- [ ] is_kakao 플래그 설정

---

## 10. `/auth/complete-profile` - 프로필 완성 페이지

### 📋 주요 기능
1. ✅ 카카오 로그인 후 추가 정보 입력
2. ✅ 전화번호, 주소 입력
3. ✅ profiles 테이블 업데이트
4. ✅ 완료 후 홈 페이지로 이동

### 🔧 사용 컴포넌트
- 프로필 완성 폼 (커스텀)
- `AddressManager` (선택적)

### 📞 호출 함수/API
- `UserProfileManager.atomicProfileUpdate()` - 프로필 업데이트

### 💾 사용 DB 테이블
- **UPDATE**:
  - `profiles` - phone, address, postal_code 업데이트

### 🔗 연결된 페이지
- **이전**: `/auth/callback` (신규 카카오 사용자)
- **다음**: `/` (프로필 완성 완료)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 4.2 프로필 수정 (PART2)

### 📝 체크리스트 (Claude용)
- [ ] 전화번호 형식 검증
- [ ] 주소 입력 (우편번호 검색)
- [ ] atomicProfileUpdate 호출
- [ ] 완료 후 sessionStorage 업데이트

---

## 📊 PART1 통계

### 페이지 수: 10개
- 핵심 페이지: 4개
- 마이페이지: 2개
- 인증: 4개

### 주요 기능 영역
- 상품 조회 및 구매
- 주문 생성 및 조회
- 프로필 관리
- 쿠폰 사용
- 인증 (일반/카카오)

### 사용 DB 테이블
- `products`, `product_variants`
- `orders`, `order_items`, `order_shipping`, `order_payments`
- `profiles`
- `coupons`, `user_coupons`
- `auth.users`

---

**마지막 업데이트**: 2025-10-08
**상태**: 완료 (10개 페이지 상세 문서화)
**다음**: PART2 (관리자 운영 페이지)
