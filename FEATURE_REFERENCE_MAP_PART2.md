# FEATURE_REFERENCE_MAP.md - Part 2 (Variant + 사용자 + 인증 + 공급업체)

**⚠️ 이 파일은 전체 문서의 Part 2입니다**
- **Part 1**: 개요 + 주문 관련 + 상품 관련
- **Part 2**: Variant + 사용자 + 인증 + 공급업체 ← **현재 파일**
- **Part 3**: 배송 + 쿠폰 + 통계

---

## 3. Variant/옵션 관련 기능

### 3.1 Variant 생성 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/admin/products/[id]` - 상품 상세 페이지 (Variant 관리)
2. `/admin/products/new` - 신규 상품 등록 (옵션 있는 경우)

#### 🔧 핵심 함수 체인
```javascript
createVariant(variantData, optionValueIds)
  ↓ inserts
  product_variants (INSERT)
  ↓ maps
  variant_option_values (INSERT - 매핑 테이블)
  ↓ returns
  생성된 Variant 객체
```

#### 🗄️ DB 작업 순서
1. `product_variants` (INSERT)
   - product_id, sku, inventory, price, is_active, options (JSONB)
2. `variant_option_values` (INSERT)
   - variant_id, option_value_id (여러 행)

#### 📊 Variant 데이터 구조
```javascript
{
  id: UUID,
  product_id: UUID,
  sku: 'PROD-BLK-M',
  inventory: 100,
  price: 29000,
  is_active: true,
  options: {
    색상: '블랙',
    사이즈: 'M'
  }
}
```

#### ⚠️ 필수 체크리스트
- [ ] SKU 자동 생성 또는 수동 입력 (중복 체크)
- [ ] 초기 재고 설정
- [ ] 가격 설정 (상품 기본가 또는 개별 가격)
- [ ] is_active 기본값 true
- [ ] options JSONB 형식 저장
- [ ] optionValueIds 배열로 매핑 테이블 저장
- [ ] 트랜잭션 사용

#### 🔗 연관 기능
- **옵션 포함 상품 생성** (createProductWithOptions)
- **Variant 재고 관리** (updateVariantInventory)
- **주문 생성** (재고 차감)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - createVariant()

---

### 3.2 Variant 재고 관리 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/checkout` - 체크아웃 페이지 (재고 차감)
2. `/admin/products/[id]` - 상품 상세 페이지 (재고 수정)
3. `/admin/orders` - 관리자 주문 관리 (취소 시 재고 복원)

#### 🔧 핵심 함수 체인
```javascript
updateVariantInventory(variantId, quantityChange)
  ↓ locks
  FOR UPDATE 잠금 (동시성 제어)
  ↓ selects
  SELECT inventory WHERE id = variantId FOR UPDATE
  ↓ validates
  재고 부족 체크 (newInventory < 0)
  ↓ updates
  UPDATE inventory = newInventory
  ↓ commits
  트랜잭션 커밋 (잠금 해제)
```

#### 🗄️ DB 작업 순서
1. `BEGIN TRANSACTION`
2. `SELECT inventory FROM product_variants WHERE id = variantId FOR UPDATE`
3. 재고 부족 체크
4. `UPDATE product_variants SET inventory = newInventory WHERE id = variantId`
5. `COMMIT` (또는 `ROLLBACK`)

#### ⚠️ 필수 체크리스트
- [ ] FOR UPDATE 잠금 사용 (데드락 방지)
- [ ] 재고 부족 시 에러 처리 및 사용자 알림
- [ ] 음수 재고 방지
- [ ] 트랜잭션 사용 (실패 시 롤백)
- [ ] 로그 기록 (재고 변경 이력)

#### 🔗 연관 기능
- **주문 생성** (재고 차감: quantityChange = -quantity)
- **주문 취소** (재고 복원: quantityChange = +quantity)
- **Variant 생성** (초기 재고 설정)

#### 💡 특이사항
- **FOR UPDATE 잠금**: 동시에 여러 사용자가 같은 Variant 주문 시 데이터 정합성 보장
- **재고 부족 시**: 주문 생성 차단, 사용자에게 알림
- **음수 재고 방지**: newInventory < 0 체크

#### 📝 최근 수정 이력
- 2025-10-01: FOR UPDATE 잠금 추가 (동시성 제어)
- 2025-09-30: 재고 부족 에러 처리 개선

#### 🎓 상세 문서 위치
- **DB**: DB_REFERENCE_GUIDE.md § 5.1
- **코드**: lib/supabaseApi.js - updateVariantInventory()

---

### 3.3 Variant 재고 확인 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/checkout` - 체크아웃 페이지 (주문 생성 전)
2. `/` - 홈 페이지 (상품 상세 모달 - BuyBottomSheet)

#### 🔧 핵심 함수 체인
```javascript
checkVariantInventory(productId, selectedOptions)
  ↓ finds
  Variant 검색 (옵션 조합 일치)
  ↓ selects
  SELECT inventory FROM product_variants
  ↓ returns
  { available: true/false, inventory: number, variantId: UUID }
```

#### 🗄️ DB 작업
1. `product_variants` (SELECT)
2. `variant_option_values` (JOIN)
3. `product_option_values` (JOIN)
4. 옵션 조합 일치 Variant 검색

#### 📊 데이터 흐름
```
사용자 옵션 선택
  ↓
selectedOptions = { 색상: '블랙', 사이즈: 'M' }
  ↓
checkVariantInventory(productId, selectedOptions)
  ↓
Variant 검색 (옵션 조합 일치)
  ↓
재고 확인
  ↓
반환: { available: true, inventory: 50, variantId: UUID }
```

#### ⚠️ 필수 체크리스트
- [ ] 옵션 조합 정확히 일치하는 Variant 검색
- [ ] 재고 0 이하면 available: false
- [ ] Variant 없으면 available: false
- [ ] is_active: false인 Variant 제외

#### 🔗 연관 기능
- **주문 생성** (재고 확인 후 차감)
- **Variant 재고 관리** (재고 정보 조회)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - checkVariantInventory(), checkOptionInventory()

---

### 3.4 옵션 조합 생성 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/new` - 신규 상품 등록
2. `/admin/products/[id]` - 상품 수정

#### 🔧 핵심 기능
```javascript
// 옵션 조합 생성
generateVariantCombinations(options)
  예: 색상[블랙, 화이트] x 사이즈[S, M, L]
  → 6개 조합 생성
```

#### ⚠️ 필수 체크리스트
- [ ] 데카르트 곱 알고리즘 사용
- [ ] 최대 옵션 개수 제한 (3개 권장)
- [ ] 조합 수 미리 계산 및 표시
- [ ] 각 조합마다 Variant 생성

#### 💡 특이사항
- **조합 폭발**: 옵션값 많으면 조합 수 급증 주의
- **예시**: 3개 옵션 x 5개 값 = 125개 Variant

---

### 3.5 SKU 자동 생성 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/new` - 신규 상품 등록

#### 🔧 핵심 기능
```javascript
// SKU 생성 규칙
SKU = 상품코드-옵션1-옵션2...
예: PROD-BLK-M, PROD-WHT-L
```

#### ⚠️ 필수 체크리스트
- [ ] 고유성 보장
- [ ] 옵션값 약어 사용
- [ ] 중복 체크
- [ ] 수동 입력 허용

#### 💡 특이사항
- **자동 생성**: 기본 규칙 적용
- **수동 입력**: 관리자가 직접 입력 가능

---

### 3.6 옵션별 가격 설정 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/new` - 신규 상품 등록
2. `/admin/products/[id]` - 상품 수정

#### 🔧 핵심 기능
- Variant별 개별 가격 설정
- 또는 상품 기본 가격 사용

#### 🗄️ DB 작업
- `product_variants` (UPDATE) - price

#### ⚠️ 필수 체크리스트
- [ ] 기본 가격 상속 (선택적)
- [ ] Variant별 개별 가격 입력
- [ ] 가격 0 방지

#### 💡 특이사항
- **기본 가격**: products.price 상속
- **개별 가격**: variant.price 우선 사용

---

### 3.7 옵션별 재고 입력 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/new` - 신규 상품 등록
2. `/admin/products/[id]` - 상품 수정

#### 🗄️ DB 작업
- `product_variants` (UPDATE) - inventory

#### ⚠️ 필수 체크리스트
- [ ] 각 Variant별 재고 입력
- [ ] 일괄 재고 설정 기능
- [ ] 총 재고 자동 계산
- [ ] 음수 재고 방지

---

### 3.8 옵션 추가 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/[id]` - 상품 수정

#### 🔧 핵심 함수
- createProductOption(optionData)

#### 🗄️ DB 작업
- `product_options` (INSERT)
- `product_option_values` (INSERT)

#### ⚠️ 필수 체크리스트
- [ ] 옵션명 중복 방지
- [ ] 옵션값 최소 1개
- [ ] 기존 Variant 처리 (재생성 필요)

#### 💡 특이사항
- **Variant 재생성**: 옵션 추가 시 기존 Variant 무효화

---

### 3.9 옵션 삭제 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/[id]` - 상품 수정

#### 🗄️ DB 작업
- `product_options` (DELETE)
- `product_option_values` (CASCADE DELETE)
- `variant_option_values` (CASCADE DELETE)

#### ⚠️ 필수 체크리스트
- [ ] 옵션 삭제 경고 (Variant 영향)
- [ ] CASCADE 삭제 확인
- [ ] 관련 Variant 비활성화

#### 💡 특이사항
- **CASCADE**: 옵션 삭제 시 관련 데이터 자동 삭제

---

### 3.10 옵션 값 수정 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/[id]` - 상품 수정

#### 🗄️ DB 작업
- `product_option_values` (UPDATE)

#### ⚠️ 필수 체크리스트
- [ ] 옵션값 변경 시 Variant 업데이트
- [ ] 기존 주문 영향 없음 확인
- [ ] 옵션값 중복 방지

---

### 3.11 옵션 조회 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/[id]` - 관리자 상품 상세
2. `/` - 홈 페이지 (상품 상세 모달)

#### 🔧 핵심 함수
- getProductOptions(productId)

#### 🗄️ DB 작업
- `product_options` (SELECT)
- `product_option_values` (SELECT)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getProductOptions()

---

### 3.12 옵션값 생성 [일반]

#### 📍 영향받는 페이지
1. `/admin/products/new` - 신규 상품 등록

#### 🔧 핵심 함수
- createOptionValue(valueData)

#### 🗄️ DB 작업
- `product_option_values` (INSERT)

#### ⚠️ 필수 체크리스트
- [ ] option_id 필수
- [ ] value 중복 체크 (동일 옵션 내)
- [ ] position 자동 설정

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - createOptionValue()

---

## 4. 사용자/프로필 관련 기능

### 4.1 프로필 조회 [일반]

#### 📍 영향받는 페이지
1. `/mypage` - 마이페이지
2. `/checkout` - 체크아웃 페이지
3. `/admin/customers/[id]` - 관리자 고객 상세

#### 🔧 핵심 함수
```javascript
UserProfileManager.getCurrentUser()
  ↓ checks
  sessionStorage.getItem('user')
  ↓ or
  supabase.auth.getUser()
  ↓ normalizes
  UserProfileManager.normalizeProfile(user)
```

#### 🗄️ DB 작업
- `profiles` (SELECT)
- `auth.users` (SELECT via Supabase Auth)

#### ⚠️ 필수 체크리스트
- [ ] sessionStorage 우선 확인 (카카오 사용자)
- [ ] DB 조회 (일반 사용자)
- [ ] 프로필 정규화 (normalizeProfile)
- [ ] NULL 처리

#### 💡 특이사항
- **카카오 사용자**: sessionStorage 우선
- **일반 사용자**: DB 우선
- **정규화**: 두 방식 모두 동일한 형식으로 반환

#### 🎓 상세 문서 위치
- **코드**: lib/userProfileManager.js - getCurrentUser()

---

### 4.2 프로필 수정 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/mypage` - 마이페이지 (프로필 수정)
2. `/checkout` - 체크아웃 페이지 (주소 선택)

#### 🔧 핵심 함수 체인
```javascript
UserProfileManager.atomicProfileUpdate(userId, profileData, isKakaoUser)
  ↓ updates (병렬)
  Promise.allSettled([
    profiles UPSERT,
    auth.users.user_metadata UPDATE
  ])
  ↓ updates (카카오 사용자만)
  sessionStorage.setItem('user', updatedData)
  ↓ returns
  업데이트된 프로필
```

#### 🗄️ DB 작업 순서
1. `profiles` (UPSERT)
   - name, phone, nickname, address, detail_address, postal_code, addresses (JSONB)
2. `auth.users.user_metadata` (UPDATE - RPC)
   - 관리자 페이지에서 사용자 정보 표시용

#### 📊 데이터 흐름
```
마이페이지 필드 수정
  ↓
atomicProfileUpdate(userId, { name: '홍길동' }, isKakaoUser)
  ↓
병렬 업데이트
  ├── profiles UPSERT
  └── auth.users.user_metadata UPDATE
  ↓
카카오 사용자인 경우
  └── sessionStorage 업데이트
  ↓
UI 상태 업데이트
```

#### ⚠️ 필수 체크리스트
- [ ] profiles 테이블 UPSERT (존재하지 않으면 INSERT)
- [ ] auth.users.user_metadata 동기화 (관리자 페이지용)
- [ ] sessionStorage 업데이트 (카카오 사용자만)
- [ ] Promise.allSettled 사용 (병렬 처리, 일부 실패 허용)
- [ ] 에러 처리 (profiles 실패 시 재시도, user_metadata 실패 시 무시)

#### 🔗 연관 기능
- **프로필 정규화** (normalizeProfile)
- **프로필 유효성 검사** (validateProfile)
- **주소 관리** (addresses JSONB 업데이트)

#### 💡 특이사항
- **병렬 처리**: profiles + auth.users 동시 업데이트 (성능 최적화)
- **카카오 사용자**: sessionStorage 우선 사용 (auth.users 없음)
- **일반 사용자**: DB 우선 사용 (auth.users 있음)

#### 📝 최근 수정 이력
- 2025-10-03: 우편번호 저장 추가 (postal_code)
- 2025-10-01: atomicProfileUpdate 병렬 처리 개선

#### 🎓 상세 문서 위치
- **코드**: lib/userProfileManager.js - UserProfileManager.atomicProfileUpdate()
- **페이지**: app/mypage/page.js

---

### 4.3 프로필 정규화 ⭐ [주요]

#### 📍 영향받는 페이지
1. 모든 페이지 (사용자 정보 조회 시)

#### 🔧 핵심 함수
```javascript
UserProfileManager.normalizeProfile(user)
  ↓ returns
  {
    id, kakao_id, is_kakao,
    name, phone, nickname,
    address, detail_address, postal_code,
    addresses: []  // 자동 생성
  }
```

#### 💡 특이사항
- **카카오/일반 사용자 통합**: 동일한 형식으로 반환
- **addresses 배열**: 없으면 빈 배열 자동 생성
- **is_kakao 플래그**: 카카오 사용자 여부 판별

#### 🔗 연관 기능
- **프로필 조회** (모든 페이지)
- **주문 생성** (배송 정보)

#### 🎓 상세 문서 위치
- **코드**: lib/userProfileManager.js - UserProfileManager.normalizeProfile()

---

### 4.4 프로필 유효성 검사 [일반]

#### 📍 영향받는 페이지
1. `/mypage` - 마이페이지
2. `/checkout` - 체크아웃 페이지

#### 🔧 핵심 함수
```javascript
UserProfileManager.validateProfile(profile)
  ↓ checks
  필수 필드: name, phone, address
  ↓ returns
  { isValid: boolean, missingFields: [...] }
```

#### ⚠️ 필수 체크리스트
- [ ] 필수 필드 검증 (name, phone, address)
- [ ] 전화번호 형식 검증
- [ ] 이메일 형식 검증 (선택적)
- [ ] 우편번호 형식 검증

#### 💡 특이사항
- **선택적 필드**: nickname, detail_address
- **필수 필드**: name, phone, address (주문 시)

#### 🎓 상세 문서 위치
- **코드**: lib/userProfileManager.js - validateProfile()

---

### 4.5 주소 관리 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/mypage` - 마이페이지 (주소 관리)
2. `/checkout` - 체크아웃 페이지 (주소 선택)

#### 🔧 핵심 컴포넌트
- **AddressManager** - 주소 관리 컴포넌트

#### 📊 주소 데이터 구조
```javascript
addresses: [
  {
    id: Date.now(),
    label: '기본 배송지',
    address: '서울시 강남구...',
    detail_address: '101동 202호',
    postal_code: '06000',
    is_default: true,
    created_at: '2025-10-03T...'
  }
]
```

#### ⚠️ 필수 체크리스트
- [ ] 최대 5개 배송지 제한
- [ ] 기본 배송지 설정 (is_default: true)
- [ ] 우편번호 필수 (도서산간 배송비 계산용)
- [ ] 다음 주소 API 사용 (우편번호 검색)
- [ ] profiles.addresses JSONB 업데이트
- [ ] 배송비 자동 계산 (formatShippingInfo)

#### 🔗 연관 기능
- **프로필 수정** (addresses JSONB 업데이트)
- **배송비 계산** (postal_code 기반)
- **주문 생성** (배송지 선택)

#### 💡 특이사항
- **최대 5개**: 배송지 개수 제한
- **is_default**: 하나만 true (나머지 false)
- **postal_code**: 도서산간 배송비 계산 필수

#### 📝 최근 수정 이력
- 2025-10-03: 우편번호 시스템 통합 (배송비 자동 계산)
- 2025-10-01: AddressManager 컴포넌트 신버전 전환

#### 🎓 상세 문서 위치
- **컴포넌트**: app/components/address/AddressManager.js
- **데이터 흐름**: DETAILED_DATA_FLOW.md § 마이페이지

---

### 4.6 우편번호 검색 [일반]

#### 📍 영향받는 페이지
1. `/mypage` - 마이페이지 (AddressManager)
2. `/checkout` - 체크아웃 페이지 (AddressManager)

#### 🔧 핵심 기능
```javascript
// Daum 우편번호 서비스 사용
new daum.Postcode({
  oncomplete: function(data) {
    // data.zonecode (우편번호)
    // data.address (주소)
  }
})
```

#### ⚠️ 필수 체크리스트
- [ ] Daum Postcode API 로드
- [ ] 팝업 또는 embed 방식
- [ ] 우편번호, 주소 자동 입력
- [ ] 모바일 대응

#### 💡 특이사항
- **Daum API**: 무료 우편번호 검색 서비스
- **반환값**: zonecode (우편번호), address (기본 주소)

---

### 4.7 배송지 저장 [일반]

#### 📍 영향받는 페이지
1. `/mypage` - 마이페이지 (AddressManager)

#### 🔧 핵심 기능
- AddressManager 컴포넌트 사용
- profiles.addresses JSONB 배열 저장

#### 🗄️ DB 작업
- `profiles` (UPDATE) - addresses JSONB

#### ⚠️ 필수 체크리스트
- [ ] 최대 5개 배송지 제한
- [ ] 기본 배송지 설정 (is_default)
- [ ] 우편번호 필수 (도서산간 배송비)
- [ ] JSONB 배열 형식

#### 🔗 연관 기능
- **주소 관리** (4.5)
- **우편번호 검색** (4.6)

---

### 4.8 고객 목록 조회 [일반]

#### 📍 영향받는 페이지
1. `/admin/customers` - 고객 관리 페이지

#### 🔧 핵심 함수
- getAllCustomers()

#### 🗄️ DB 작업
- `profiles` (SELECT)
- `auth.users` (JOIN - optional)

#### ⚠️ 필수 체크리스트
- [ ] 모든 고객 조회
- [ ] 카카오/일반 사용자 구분
- [ ] 주문 횟수 표시 (optional)
- [ ] 검색/필터 기능

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getAllCustomers()
- **페이지**: app/admin/customers/page.js

---

### 4.9 고객 검색 [일반]

#### 📍 영향받는 페이지
1. `/admin/customers` - 고객 관리 페이지
2. `/admin/deposits` - 입금 관리 (입금자명 검색)

#### 🔧 핵심 기능
```javascript
// 검색 필드
- name (고객명)
- phone (전화번호)
- nickname (닉네임)
- email (이메일)
```

#### ⚠️ 필수 체크리스트
- [ ] 여러 필드 동시 검색
- [ ] 실시간 검색
- [ ] 대소문자 구분 없음

---

### 4.10 고객 주문 이력 [일반]

#### 📍 영향받는 페이지
1. `/admin/customers/[id]` - 고객 상세 페이지

#### 🔧 핵심 함수
```javascript
getOrders(userId)
  ↓ or (카카오 사용자)
getUserOrdersByOrderType(orderType)
```

#### 🗄️ DB 작업
- `orders` (SELECT) - 고객별 주문 조회
- `order_items`, `order_shipping`, `order_payments` (JOIN)

#### ⚠️ 필수 체크리스트
- [ ] 전체 주문 이력 표시
- [ ] 주문 상태별 통계
- [ ] 총 구매 금액 계산
- [ ] 최근 주문 먼저

---

## 5. 인증 관련 기능

### 5.1 로그인 (일반) [일반]

#### 📍 영향받는 페이지
1. `/login` - 로그인 페이지

#### 🔧 핵심 함수
```javascript
signIn(email, password)
  ↓ calls
  supabase.auth.signInWithPassword({ email, password })
  ↓ creates session
  supabase.auth.session
```

#### 🗄️ DB 작업
- `auth.users` (SELECT via Supabase Auth)
- `profiles` (SELECT)

#### ⚠️ 필수 체크리스트
- [ ] 이메일/비밀번호 검증
- [ ] 세션 생성
- [ ] 로그인 실패 처리
- [ ] 리다이렉트 (홈 또는 이전 페이지)

#### 💡 특이사항
- **Supabase Auth**: 내장 인증 시스템 사용
- **세션 관리**: 자동 토큰 갱신

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - signIn()
- **페이지**: app/login/page.js

---

### 5.2 로그인 (카카오) ⭐ [주요]

#### 📍 영향받는 페이지
1. `/login` - 로그인 페이지 (카카오 로그인 버튼)
2. `/auth/callback` - 카카오 OAuth 콜백

#### 📊 데이터 흐름
```
카카오 로그인 버튼 클릭
  ↓
카카오 OAuth 인증
  ↓
/auth/callback 리다이렉트
  ↓
카카오 사용자 정보 조회
  ↓
profiles 테이블 확인 (kakao_id)
  ├── 없으면 INSERT
  └── 있으면 SELECT
  ↓
sessionStorage.setItem('user', {
  kakao_id,
  name,
  nickname,
  phone,
  ...
})
  ↓
홈 페이지 리다이렉트
```

#### ⚠️ 필수 체크리스트
- [ ] profiles 테이블에 kakao_id 저장
- [ ] user_id는 NULL (auth.users 없음)
- [ ] sessionStorage에 사용자 정보 저장
- [ ] is_kakao 플래그 설정
- [ ] 주문 조회 시 order_type 사용

#### 🔗 연관 기능
- **프로필 관리** (sessionStorage 기반)
- **주문 조회** (order_type LIKE '%KAKAO:${kakao_id}%')
- **프로필 수정** (atomicProfileUpdate)

#### 💡 특이사항
- **user_id NULL**: auth.users 테이블에 존재하지 않음
- **sessionStorage**: 카카오 사용자 정보 저장 (로그인 상태 유지)
- **order_type**: `direct:KAKAO:${kakao_id}` 형식으로 저장

#### 🎓 상세 문서 위치
- **DB**: DB_REFERENCE_GUIDE.md § 4.2
- **페이지**: app/login/page.js, app/auth/callback/page.js

---

### 5.3 회원가입 [일반]

#### 📍 영향받는 페이지
1. `/signup` - 회원가입 페이지

#### 🔧 핵심 함수
```javascript
signUp(email, password, userData)
  ↓ calls
  supabase.auth.signUp({ email, password })
  ↓ creates
  auth.users (자동 생성)
  ↓ inserts
  profiles (INSERT)
```

#### 🗄️ DB 작업
- `auth.users` (INSERT via Supabase Auth)
- `profiles` (INSERT)

#### ⚠️ 필수 체크리스트
- [ ] 이메일 중복 체크
- [ ] 비밀번호 강도 검증
- [ ] 이메일 인증 발송 (optional)
- [ ] profiles 테이블 자동 생성
- [ ] 가입 완료 후 자동 로그인

#### 💡 특이사항
- **이메일 인증**: Supabase 설정에 따라 선택적
- **자동 프로필 생성**: auth.users 생성 시 trigger로 profiles INSERT

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - signUp()
- **페이지**: app/signup/page.js

---

### 5.4 로그아웃 [일반]

#### 📍 영향받는 페이지
1. 모든 페이지 (헤더 - 로그아웃 버튼)

#### 🔧 핵심 함수
```javascript
signOut()
  ↓ calls
  supabase.auth.signOut()
  ↓ clears
  sessionStorage.clear()
  ↓ redirects
  router.push('/')
```

#### ⚠️ 필수 체크리스트
- [ ] Supabase Auth 세션 종료
- [ ] sessionStorage 클리어
- [ ] 홈 페이지로 리다이렉트
- [ ] UI 상태 업데이트

#### 💡 특이사항
- **세션 클리어**: 카카오 사용자도 sessionStorage 클리어 필수

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - signOut()

---

### 5.5 비밀번호 재설정 [일반]

#### 📍 영향받는 페이지
1. `/login` - 로그인 페이지 (비밀번호 찾기 링크)
2. `/reset-password` - 비밀번호 재설정 페이지 (예정)

#### 🔧 핵심 기능
```javascript
// 비밀번호 재설정 이메일 발송
supabase.auth.resetPasswordForEmail(email)
  ↓
이메일로 재설정 링크 발송
  ↓
/reset-password?token=xxx
  ↓
새 비밀번호 입력 및 업데이트
```

#### ⚠️ 필수 체크리스트
- [ ] 이메일 발송
- [ ] 토큰 검증
- [ ] 새 비밀번호 강도 검증
- [ ] 비밀번호 업데이트

#### 💡 특이사항
- **미구현**: 현재 기본 페이지만 존재 (기능 예정)
- **Supabase Auth**: 내장 비밀번호 재설정 기능 사용

---

### 5.6 세션 관리 [일반]

#### 📍 영향받는 페이지
1. 모든 페이지 (useAuth hook)

#### 🔧 핵심 기능
```javascript
// useAuth hook
const { user, loading } = useAuth()
  ↓ checks
  supabase.auth.getSession()
  ↓ listens
  supabase.auth.onAuthStateChange()
```

#### ⚠️ 필수 체크리스트
- [ ] 세션 자동 확인
- [ ] 세션 만료 시 자동 로그아웃
- [ ] 토큰 자동 갱신
- [ ] 상태 변경 리스너

#### 💡 특이사항
- **자동 갱신**: Supabase Auth 자동 토큰 갱신
- **상태 동기화**: 모든 탭 간 세션 동기화

#### 🎓 상세 문서 위치
- **Hook**: hooks/useAuth.js

---

## 6. 공급업체/발주 관련 기능

### 6.1 발주서 생성 ⭐ [주요]

#### 📍 영향받는 페이지
1. `/admin/purchase-orders` - 발주 관리 페이지
2. `/admin/purchase-orders/[supplierId]` - 공급업체별 발주 상세

#### 📊 데이터 흐름
```
관리자 → 발주 관리 페이지
  ↓
결제완료 주문 조회 (status='paid')
  ↓
공급업체별 그룹화
  ↓
발주서 생성 버튼 클릭
  ↓
getPurchaseOrderBySupplier(supplierId, startDate, endDate)
  ↓
주문 항목 집계 (상품별)
  ↓
엑셀 다운로드 (발주서)
```

#### ⚠️ 필수 체크리스트
- [ ] paid 상태 주문만 포함
- [ ] 공급업체별 그룹화
- [ ] 상품별 수량 집계
- [ ] 중복 발주 방지
- [ ] 발주 이력 기록

#### 🔗 연관 기능
- **주문 상태 변경** (paid 상태 전환 시)
- **공급업체 관리** (공급업체 정보)
- **상품 관리** (상품 정보)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getPurchaseOrderBySupplier()

---

### 6.2 발주서 다운로드 [일반]

#### 📍 영향받는 페이지
1. `/admin/purchase-orders` - 발주 관리 페이지
2. `/admin/purchase-orders/[supplierId]` - 공급업체별 발주 상세

#### 🔧 핵심 기능
```javascript
// 엑셀 다운로드
XLSX.utils.book_new()
  ↓ creates
  워크시트 생성 (상품별 수량 집계)
  ↓ downloads
  발주서_{공급업체명}_{날짜}.xlsx
```

#### ⚠️ 필수 체크리스트
- [ ] XLSX.js 라이브러리 사용
- [ ] 상품별 수량 집계
- [ ] 공급업체 정보 포함
- [ ] 날짜 범위 표시
- [ ] 파일명 자동 생성

#### 💡 특이사항
- **엑셀 형식**: 공급업체에게 전송 가능한 표준 형식
- **포함 정보**: 상품명, 수량, 단가, 총액

---

### 6.3 업체 관리 [일반]

#### 📍 영향받는 페이지
1. `/admin/suppliers` - 공급업체 관리 페이지

#### 🔧 핵심 함수
```javascript
getSuppliers() - 목록 조회
createSupplier(supplierData) - 생성
updateSupplier(supplierId, supplierData) - 수정
```

#### 🗄️ DB 작업
- `suppliers` (SELECT, INSERT, UPDATE)

#### ⚠️ 필수 체크리스트
- [ ] 업체명, 연락처, 주소
- [ ] 담당자 정보
- [ ] 업체 코드 (code) 고유성
- [ ] is_active 상태 관리
- [ ] 메모 기능

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getSuppliers(), createSupplier(), updateSupplier()
- **페이지**: app/admin/suppliers/page.js

---

### 6.4 업체별 주문 조회 [일반]

#### 📍 영향받는 페이지
1. `/admin/purchase-orders/[supplierId]` - 공급업체별 발주 상세

#### 🔧 핵심 함수
```javascript
getPurchaseOrderBySupplier(supplierId, startDate, endDate)
  ↓ filters
  orders (status='paid')
  ↓ filters
  products.supplier_id = supplierId
  ↓ aggregates
  상품별 수량 집계
```

#### 🗄️ DB 작업
- `orders` (SELECT) - paid 상태
- `order_items` (SELECT) - JOIN
- `products` (SELECT) - supplier_id 필터

#### ⚠️ 필수 체크리스트
- [ ] 결제완료 주문만 (status='paid')
- [ ] 날짜 범위 필터
- [ ] 상품별 수량 집계
- [ ] 총 발주 금액 계산

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getPurchaseOrderBySupplier()

---

### 6.5 발주 이력 조회 [일반]

#### 📍 영향받는 페이지
1. `/admin/purchase-orders` - 발주 관리 페이지

#### 🔧 핵심 함수
- getPurchaseOrdersBySupplier(startDate, endDate)

#### 🗄️ DB 작업
- `orders` (SELECT) - paid 상태
- 공급업체별 그룹화

#### ⚠️ 필수 체크리스트
- [ ] 전체 발주 이력 표시
- [ ] 공급업체별 그룹화
- [ ] 날짜 범위 필터
- [ ] 발주 상태 (생성/다운로드/완료)

#### 🎓 상세 문서 위치
- **코드**: lib/supabaseApi.js - getPurchaseOrdersBySupplier()

---

### 6.6 중복 발주 방지 [일반]

#### 📍 영향받는 페이지
1. `/admin/purchase-orders` - 발주 관리 페이지

#### 🔧 핵심 기능
- 날짜 범위 내 발주 여부 확인
- 이미 발주된 주문 표시

#### ⚠️ 필수 체크리스트
- [ ] 발주 완료 플래그 (is_purchased)
- [ ] 발주 날짜 기록 (purchased_at)
- [ ] 중복 발주 경고 UI
- [ ] 강제 재발주 옵션

#### 💡 특이사항
- **현재 구현**: 클라이언트 필터링
- **향후 개선**: DB 플래그 추가 (is_purchased)

---

