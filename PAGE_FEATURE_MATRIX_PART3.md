# 페이지-기능 매트릭스 PART3 (관리자 시스템 페이지)

**⚠️ 이 파일은 전체 문서의 Part 3입니다**
- **PART1**: 사용자 페이지 (홈, 체크아웃, 주문, 마이페이지, 인증)
- **PART2**: 관리자 운영 페이지 (주문 관리, 입금, 발송, 발주, 쿠폰)
- **PART3**: 관리자 시스템 페이지 (상품, 방송, 공급업체, 설정) ← **현재 파일**

**업데이트**: 2025-10-08
**기준**: 실제 프로덕션 코드 (main 브랜치)
**버전**: 1.0

---

## ⚙️ 관리자 시스템 페이지 목록

### 상품 관리 (5개)
1. `/admin/products` - 라이브 상품 관리
2. `/admin/products/catalog` - 전체 상품 목록
3. `/admin/products/catalog/new` - 신규 상품 등록
4. `/admin/products/catalog/[id]` - 상품 상세
5. `/admin/products/catalog/[id]/edit` - 상품 수정

### 방송 관리 (1개)
6. `/admin/broadcasts` - 라이브 방송 관리

### 기초 정보 (2개)
7. `/admin/suppliers` - 공급업체 관리
8. `/admin/categories` - 카테고리 관리

### 시스템 (3개)
9. `/admin/admins` - 관리자 계정 관리
10. `/admin/settings` - 시스템 설정
11. `/admin/login` - 관리자 로그인

---

## 1. `/admin/products` - 라이브 상품 관리

### 📋 주요 기능
1. ✅ 라이브 등록 상품 조회 (is_live=true)
2. ✅ 라이브 노출 활성화/비활성화 (is_live_active 토글)
3. ✅ 라이브 우선순위 변경 (live_priority)
4. ✅ Variant 관리 (VariantBottomSheet)
5. ✅ 재고 현황 표시 (Variant 합계)

### 🔧 사용 컴포넌트
- 라이브 상품 테이블
- 활성화 토글 스위치
- VariantBottomSheet (Variant 관리 모달)

### 📞 호출 함수/API
- `getLiveProducts()` - 라이브 등록 상품 조회
- `updateProductLiveStatus(productId, isLiveActive)` - 노출 토글
- `updateLivePriority(productId, priority)` - 우선순위 변경
- `getProductVariants(productId)` - Variant 조회

### 💾 사용 DB 테이블
- **SELECT**:
  - `products` - 라이브 상품 (is_live=true)
  - `product_variants` - Variant 정보
  - `suppliers` - 공급업체 정보
- **UPDATE**:
  - `products` - is_live_active, live_priority

### 🔗 연결된 페이지
- **다음**: `/admin/products/catalog` (전체 상품 목록)
- **다음**: `/admin/broadcasts` (라이브 방송 관리)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 2.11 상품 노출 설정 (PART1)
- 2.13 라이브 상태 변경 (PART1)
- 2.16 라이브 우선순위 변경 (PART1)

### 📝 체크리스트 (Claude용)
- [ ] is_live=true 필터링
- [ ] is_live_active 토글 동작 확인
- [ ] live_priority 정렬 (낮은 숫자 우선)
- [ ] Variant 총 재고 계산

---

## 2. `/admin/products/catalog` - 전체 상품 목록

### 📋 주요 기능
1. ✅ 전체 상품 조회 (활성/비활성/삭제)
2. ✅ 상품 검색 (제목, 설명, 판매자)
3. ✅ 필터 (공급업체, 카테고리, 상태, 라이브 여부)
4. ✅ 정렬 (최신순, 가격순, 재고순)
5. ✅ 상품 삭제 (soft delete: status='deleted')

### 🔧 사용 컴포넌트
- 상품 그리드/테이블
- 검색 필터
- 정렬 드롭다운

### 📞 호출 함수/API
- `getAllProducts(filters)` - 전체 상품 조회
- `deleteProduct(productId)` - 상품 삭제 (soft)

### 💾 사용 DB 테이블
- **SELECT**:
  - `products` - 전체 상품
  - `suppliers` - 공급업체 (JOIN)
  - `product_variants` - Variant 재고
- **UPDATE**:
  - `products` - 삭제 (status='deleted')

### 🔗 연결된 페이지
- **다음**: `/admin/products/catalog/new` (신규 등록)
- **다음**: `/admin/products/catalog/[id]` (상품 상세)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 2.3 상품 삭제 (PART1)
- 2.5 상품 조회 (관리자) (PART1)
- 2.7 상품 검색 (PART1)
- 2.8 상품 필터링 (PART1)

### 📝 체크리스트 (Claude용)
- [ ] 모든 상태 표시 (active/inactive/deleted)
- [ ] 검색 필터 (제목, 설명)
- [ ] 공급업체/카테고리 필터
- [ ] soft delete 사용 (복구 가능)

---

## 3. `/admin/products/catalog/new` - 신규 상품 등록

### 📋 주요 기능
1. ✅ 상품 기본 정보 입력 (제목, 설명, 가격)
2. ✅ 이미지 업로드 (Supabase Storage)
3. ✅ 카테고리 선택
4. ✅ 공급업체 선택
5. ✅ 옵션 추가 (색상, 사이즈 등)
6. ✅ Variant 자동 생성 (옵션 조합)
7. ✅ 초기 재고 설정 (Variant별)

### 🔧 사용 컴포넌트
- 상품 등록 폼 (커스텀)
- 이미지 업로드
- 옵션 관리 UI
- Variant 미리보기

### 📞 호출 함수/API
- `addProduct(productData)` - 상품 등록 (옵션 없는 경우)
- `createProductWithOptions(productData, optionsData)` - 옵션 포함 상품 등록
- `supabase.storage.upload()` - 이미지 업로드

### 💾 사용 DB 테이블
- **INSERT**:
  - `products` - 상품 기본 정보
  - `product_options` - 옵션 (색상, 사이즈 등)
  - `product_option_values` - 옵션값 (빨강, 파랑, S, M, L)
  - `product_variants` - 모든 옵션 조합
  - `variant_option_values` - Variant-옵션값 매핑

### 🔗 연결된 페이지
- **이전**: `/admin/products/catalog` (상품 목록)
- **다음**: `/admin/products/catalog/[id]` (등록 완료 → 상품 상세)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 2.1 상품 등록 (PART1)
- 2.10 상품 이미지 업로드 (PART1)
- 2.18 옵션 포함 상품 생성 (PART1)
- 3.1 Variant 생성 (PART2)
- 3.4 옵션 조합 생성 (PART2)

### 📝 체크리스트 (Claude용)
- [ ] 필수 필드 검증 (제목, 가격, 설명)
- [ ] 이미지 업로드 (Supabase Storage)
- [ ] 옵션 조합 생성 (데카르트 곱)
- [ ] Variant 자동 생성 (모든 조합)
- [ ] SKU 자동 생성 또는 수동 입력
- [ ] 초기 재고 설정 (Variant별)
- [ ] 트랜잭션 사용 (전체 성공 또는 전체 롤백)

---

## 4. `/admin/products/catalog/[id]` - 상품 상세

### 📋 주요 기능
1. ✅ 상품 상세 정보 표시
2. ✅ Variant 목록 및 재고 현황
3. ✅ 옵션 정보 표시
4. ✅ 총 재고 계산 (모든 Variant 합계)
5. ✅ 라이브 상태 표시
6. ✅ 판매 통계 (선택적)

### 🔧 사용 컴포넌트
- 상품 정보 카드
- Variant 테이블
- 옵션 정보

### 📞 호출 함수/API
- `getProductById(productId)` - 상품 상세 조회
- `getProductVariants(productId)` - Variant 조회

### 💾 사용 DB 테이블
- **SELECT**:
  - `products` - 상품 정보
  - `product_variants` - Variant 목록
  - `product_options` - 옵션 정보
  - `product_option_values` - 옵션값
  - `variant_option_values` - 매핑

### 🔗 연결된 페이지
- **이전**: `/admin/products/catalog` (상품 목록)
- **다음**: `/admin/products/catalog/[id]/edit` (상품 수정)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 2.6 상품 단일 조회 (PART1)
- 3.11 옵션 조회 (PART2)

### 📝 체크리스트 (Claude용)
- [ ] Variant 정보 포함
- [ ] 옵션 정보 추출
- [ ] 총 재고 계산
- [ ] NULL 체크 (상품 없음 처리)

---

## 5. `/admin/products/catalog/[id]/edit` - 상품 수정

### 📋 주요 기능
1. ✅ 상품 정보 수정 (제목, 설명, 가격)
2. ✅ 이미지 변경
3. ✅ 카테고리/공급업체 변경
4. ✅ 옵션 수정 (주의: Variant 재생성)
5. ✅ Variant 재고 수정

### 🔧 사용 컴포넌트
- 상품 수정 폼 (커스텀)
- 이미지 업로드
- 옵션 관리 UI

### 📞 호출 함수/API
- `updateProduct(productId, productData)` - 상품 수정

### 💾 사용 DB 테이블
- **UPDATE**:
  - `products` - 상품 정보
  - `product_options` - 옵션 (DELETE → INSERT)
  - `product_option_values` - 옵션값 (DELETE → INSERT)
  - `product_variants` - Variant (재생성 필요)

### 🔗 연결된 페이지
- **이전**: `/admin/products/catalog/[id]` (상품 상세)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 2.2 상품 수정 (PART1)

### 📝 체크리스트 (Claude용)
- [ ] 옵션 변경 시 기존 Variant 처리 (삭제 또는 비활성화)
- [ ] 재고 변경 시 Variant 재고 동기화
- [ ] 이미지 변경 시 기존 이미지 삭제
- [ ] 가격 변경 시 Variant 가격 동기화 (선택적)
- [ ] 트랜잭션 사용

---

## 6. `/admin/broadcasts` - 라이브 방송 관리

### 📋 주요 기능
1. ✅ 라이브 방송 생성/수정/종료
2. ✅ 라이브 상품 연결
3. ✅ 방송 상태 표시 (진행 중/종료)
4. ✅ 실시간 시청자 수 (선택적)
5. ✅ 방송 썸네일 이미지 업로드

### 🔧 사용 컴포넌트
- 방송 목록 카드
- 방송 생성/수정 폼
- 상품 연결 UI

### 📞 호출 함수/API
- `getLiveBroadcasts()` - 방송 목록 조회
- `createBroadcast(broadcastData)` - 방송 생성
- `updateBroadcast(broadcastId, broadcastData)` - 방송 수정
- `addProductToBroadcast(broadcastId, productId)` - 상품 연결

### 💾 사용 DB 테이블
- **SELECT**:
  - `live_broadcasts` - 방송 정보
  - `live_products` - 방송 상품 연결
  - `products` - 상품 정보
- **INSERT/UPDATE**:
  - `live_broadcasts` - 방송 생성/수정
  - `live_products` - 상품 연결

### 🔗 연결된 페이지
- **다음**: `/admin/products` (라이브 상품 관리)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 2.14 라이브 등록 (PART1)
- 2.15 라이브 해제 (PART1)

### 📝 체크리스트 (Claude용)
- [ ] 방송 상태 관리 (진행 중/종료)
- [ ] 상품 연결/해제
- [ ] 썸네일 이미지 업로드
- [ ] 방송 시작/종료 타임스탬프

---

## 7. `/admin/suppliers` - 공급업체 관리

### 📋 주요 기능
1. ✅ 공급업체 목록 조회
2. ✅ 공급업체 등록/수정
3. ✅ 업체 정보 (이름, 연락처, 주소)
4. ✅ 담당자 정보
5. ✅ 업체 코드 (code) 고유성
6. ✅ 활성화/비활성화 (is_active)

### 🔧 사용 컴포넌트
- 공급업체 테이블
- SupplierManageSheet (관리 모달)

### 📞 호출 함수/API
- `getSuppliers()` - 공급업체 목록
- `createSupplier(supplierData)` - 공급업체 등록
- `updateSupplier(supplierId, supplierData)` - 공급업체 수정

### 💾 사용 DB 테이블
- **SELECT**:
  - `suppliers` - 공급업체 정보
- **INSERT/UPDATE**:
  - `suppliers` - 공급업체 등록/수정

### 🔗 연결된 페이지
- **다음**: `/admin/purchase-orders` (발주 관리)
- **다음**: `/admin/purchase-orders/[supplierId]` (업체별 발주)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 6.3 업체 관리 (PART2)

### 📝 체크리스트 (Claude용)
- [ ] 업체명, 연락처, 주소 필수
- [ ] 담당자 정보
- [ ] 업체 코드 (code) 고유성
- [ ] is_active 상태 관리
- [ ] 메모 기능

---

## 8. `/admin/categories` - 카테고리 관리

### 📋 주요 기능
1. ✅ 카테고리 생성/수정/삭제
2. ✅ 계층 구조 관리 (parent_id)
3. ✅ slug 자동 생성
4. ✅ 상품 개수 표시
5. ✅ 순서 관리 (position)

### 🔧 사용 컴포넌트
- 카테고리 트리
- CategoryManageSheet (관리 모달)

### 📞 호출 함수/API
- `getCategories()` - 카테고리 목록
- `createCategory(categoryData)` - 카테고리 생성
- `updateCategory(categoryId, categoryData)` - 카테고리 수정
- `deleteCategory(categoryId)` - 카테고리 삭제

### 💾 사용 DB 테이블
- **SELECT**:
  - `categories` - 카테고리 정보
  - `products` - 상품 개수 (COUNT)
- **INSERT/UPDATE/DELETE**:
  - `categories` - 카테고리 CRUD

### 🔗 연결된 페이지
- **다음**: `/admin/products/catalog` (상품 목록)

### 📚 관련 기능 (FEATURE_REFERENCE_MAP)
- 2.9 카테고리 관리 (PART1)

### 📝 체크리스트 (Claude용)
- [ ] 계층 구조 지원 (parent_id)
- [ ] slug 자동 생성 (URL-friendly)
- [ ] 상품 개수 표시
- [ ] 순서 관리 (position)

---

## 9. `/admin/admins` - 관리자 계정 관리

### 📋 주요 기능
1. ✅ 관리자 계정 조회
2. ✅ 관리자 권한 부여/회수 (profiles.is_admin)
3. ✅ 관리자 이메일 목록 관리 (환경변수)
4. ✅ 관리자 정보 표시

### 🔧 사용 컴포넌트
- 관리자 테이블

### 📞 호출 함수/API
- `getAllCustomers()` - 전체 사용자 조회
- `updateProfile(userId, { is_admin: true/false })` - 권한 변경

### 💾 사용 DB 테이블
- **SELECT**:
  - `profiles` - 관리자 조회 (is_admin=true)
- **UPDATE**:
  - `profiles` - is_admin 플래그

### 📝 체크리스트 (Claude용)
- [ ] is_admin 플래그 확인
- [ ] 환경변수 ADMIN_EMAILS 관리
- [ ] 권한 부여/회수 로그

---

## 10. `/admin/settings` - 시스템 설정

### 📋 주요 기능
1. ✅ 배송비 설정 (기본 배송비)
2. ✅ 도서산간 배송비 설정
3. ✅ 결제 설정 (계좌 정보)
4. ✅ 시스템 환경 변수 (읽기 전용)

### 🔧 사용 컴포넌트
- 설정 폼 (커스텀)

### 📞 호출 함수/API
- `getSettings()` - 설정 조회
- `updateSettings(settingsData)` - 설정 업데이트

### 💾 사용 DB 테이블
- **SELECT/UPDATE**:
  - `settings` - 시스템 설정 (예정)

### 📝 체크리스트 (Claude용)
- [ ] 배송비 설정
- [ ] 도서산간 배송비 설정
- [ ] 결제 계좌 정보
- [ ] 환경 변수 표시 (읽기 전용)

---

## 11. `/admin/login` - 관리자 로그인

### 📋 주요 기능
1. ✅ 이메일/비밀번호 로그인 (bcrypt 검증)
2. ✅ 관리자 권한 확인 (Service Role API)
3. ✅ 세션 저장 (localStorage)
4. ✅ 로그인 성공 시 대시보드로 이동

### 🔧 사용 컴포넌트
- 로그인 폼 (커스텀)

### 📞 호출 함수/API
- `adminLogin(email, password)` - 관리자 로그인
- `POST /api/admin/check-profile` - 프로필 조회 (Service Role API)
- `verifyAdminAuth(adminEmail)` - 관리자 권한 확인

### 💾 사용 DB 테이블
- **SELECT**:
  - `profiles` - 관리자 프로필 (is_admin=true)

### 🔗 연결된 페이지
- **다음**: `/admin` (대시보드)

### 🐛 알려진 이슈
- ✅ RLS 순환 참조 해결 (2025-10-03 Service Role API 전환)

### 📝 체크리스트 (Claude용)
- [ ] 이메일/비밀번호 검증
- [ ] bcrypt 해시 확인
- [ ] Service Role API 호출 (RLS 우회)
- [ ] is_admin 플래그 확인
- [ ] 로그인 성공 시 localStorage 저장
- [ ] 대시보드로 리다이렉트

---

## 📊 PART3 통계

### 페이지 수: 11개
- 상품 관리: 5개
- 방송 관리: 1개
- 기초 정보: 2개
- 시스템: 3개

### 주요 기능 영역
- 상품 CRUD
- Variant 관리
- 라이브 방송 관리
- 공급업체/카테고리 관리
- 관리자 계정 관리
- 시스템 설정

### 사용 DB 테이블
- `products`, `product_variants`, `product_options`, `product_option_values`, `variant_option_values`
- `live_broadcasts`, `live_products`
- `suppliers`, `categories`
- `profiles` (is_admin)
- `settings` (예정)

---

## 🎯 전체 문서 요약

### 총 페이지 수: 36개
- **PART1**: 사용자 페이지 (10개)
- **PART2**: 관리자 운영 페이지 (12개)
- **PART3**: 관리자 시스템 페이지 (11개)
- **기타**: 관리자 레이아웃 (1개), 공용 컴포넌트 (2개)

### 주요 기능 영역 (전체)
1. **사용자 영역**:
   - 상품 조회 및 구매
   - 주문 생성 및 조회
   - 프로필 관리
   - 쿠폰 사용
   - 인증 (일반/카카오)

2. **관리자 운영**:
   - 주문 상태 변경
   - 입금 확인
   - 발송 처리
   - 발주서 생성
   - 쿠폰 발행/배포
   - 고객 관리

3. **관리자 시스템**:
   - 상품 CRUD
   - Variant 관리
   - 라이브 방송 관리
   - 공급업체/카테고리 관리
   - 관리자 계정 관리
   - 시스템 설정

### 사용 DB 테이블 (전체)
- **상품**: products, product_variants, product_options, product_option_values, variant_option_values
- **주문**: orders, order_items, order_shipping, order_payments
- **사용자**: profiles, auth.users
- **쿠폰**: coupons, user_coupons
- **방송**: live_broadcasts, live_products
- **기초**: suppliers, categories
- **발주**: purchase_order_batches
- **시스템**: settings (예정)

---

**마지막 업데이트**: 2025-10-08
**상태**: 완료 (전체 36개 페이지 문서화 완료)
**문서 버전**: 1.0
**작성자**: Claude Code

---

## 🔗 관련 문서

- **PAGE_FEATURE_MATRIX.md** - 인덱스 파일
- **FEATURE_REFERENCE_MAP.md** - 기능 → 페이지 매핑 (기능 중심)
- **DETAILED_DATA_FLOW.md** - 페이지별 데이터 흐름 상세
- **DB_REFERENCE_GUIDE.md** - DB 테이블 스키마
- **CODE_ANALYSIS_COMPLETE.md** - 전체 코드베이스 분석
- **CODEBASE_STRUCTURE_REPORT.md** - 코드베이스 구조 보고서
