# Part 4: 페이지별 종속성 맵 (Page-Level Dependency Map)

> **버전**: 1.0
> **작성일**: 2025-10-20
> **목적**: 각 페이지가 어떤 중앙 함수/API/DB 테이블을 사용하는지 완벽히 파악

---

## 📋 목차

### 사용자 페이지 (10개)
1. [/ - 홈 페이지](#1---홈-페이지)
2. [/checkout - 체크아웃](#2-checkout---체크아웃)
3. [/orders - 주문 내역](#3-orders---주문-내역)
4. [/orders/[id]/complete - 주문 완료](#4-ordersidcomplete---주문-완료)
5. [/mypage - 마이페이지](#5-mypage---마이페이지)
6. [/mypage/coupons - 쿠폰함](#6-mypagecoupons---쿠폰함)
7. [/login - 로그인](#7-login---로그인)
8. [/signup - 회원가입](#8-signup---회원가입)
9. [/auth/callback - 카카오 콜백](#9-authcallback---카카오-콜백)
10. [/auth/complete-profile - 프로필 완성](#10-authcomplete-profile---프로필-완성)

### 관리자 페이지 (15개 핵심)
11. [/admin - 대시보드](#11-admin---대시보드)
12. [/admin/orders - 주문 관리](#12-adminorders---주문-관리)
13. [/admin/orders/[id] - 주문 상세](#13-adminordersid---주문-상세)
14. [/admin/deposits - 입금확인](#14-admindeposits---입금확인)
15. [/admin/shipping - 배송 관리](#15-adminshipping---배송-관리)
16. [/admin/products - 상품 관리](#16-adminproducts---상품-관리)
17. [/admin/products/new - 상품 등록](#17-adminproductsnew---상품-등록)
18. [/admin/coupons - 쿠폰 관리](#18-admincoupons---쿠폰-관리)
19. [/admin/coupons/[id] - 쿠폰 상세](#19-admincouponsid---쿠폰-상세)
20. [/admin/purchase-orders - 발주 관리](#20-adminpurchase-orders---발주-관리)
21. [/admin/purchase-orders/[supplierId] - 발주 상세](#21-adminpurchase-orderssupplierid---발주-상세)
22. [/admin/suppliers - 공급업체 관리](#22-adminsuppliers---공급업체-관리)
23. [/admin/customers - 고객 관리](#23-admincustomers---고객-관리)
24. [/admin/fulfillment - 배송 취합](#24-adminfulfillment---배송-취합)
25. [/admin/login - 관리자 로그인](#25-adminlogin---관리자-로그인)

### 전체 요약
26. [페이지 종속성 매트릭스](#26-페이지-종속성-매트릭스)
27. [페이지 간 연결 맵](#27-페이지-간-연결-맵)

---

## 🎯 이 문서의 사용법

### 언제 이 문서를 참조해야 하는가?

1. **페이지 수정 시**
   - 해당 페이지 섹션 읽기
   - 호출하는 중앙 함수 확인 (Part 1 참조)
   - 호출하는 API 확인 (Part 3 참조)
   - 접근하는 DB 테이블 확인 (Part 2 참조)

2. **중앙 함수 수정 시**
   - 어떤 페이지가 해당 함수를 사용하는지 파악
   - 영향받는 모든 페이지 테스트 필요

3. **API 수정 시**
   - 어떤 페이지가 해당 API를 호출하는지 파악
   - 영향받는 모든 페이지 테스트 필요

---

# 사용자 페이지 상세

---

## 1. `/` - 홈 페이지

### 📌 개요
- **경로**: `/app/page.js` (Server Component) + `/app/components/HomeClient.jsx` (Client)
- **목적**: 상품 목록 표시 및 바로구매
- **컴포넌트 타입**: Server Component (ISR 적용, revalidate: 300초)

### 🔧 호출하는 중앙 함수 (Part 1 참조)
- 없음 (Server Component에서 직접 Supabase 호출)

### 📞 호출하는 API (Part 3 참조)
- **Server Side** (빌드 시):
  - 직접 Supabase 쿼리 (Service Role 아님, Anon Key)
- **Client Side** (브라우저):
  - 없음 (initialProducts prop으로 전달받음)

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 컴포넌트 | 라인 |
|--------|------|----------|------|
| products | SELECT (11개 컬럼만) | Server Component | - |

**SELECT 컬럼**:
```javascript
id, title, product_number, price, compare_price,
thumbnail_url, inventory, status, is_featured,
is_live_active, created_at
```

### 🔗 연결된 페이지
- **다음**: `/checkout` (BuyBottomSheet → "바로구매")
- **다음**: `/orders` (장바구니 → 주문 내역)
- **다음**: `/login` (비로그인 사용자)

### ⚠️ 수정 시 주의사항
- [ ] **ISR 설정**: `export const revalidate = 300` 확인
- [ ] **Server Component**: `await getProducts()` 호출
- [ ] **Client Component**: initialProducts prop 전달
- [ ] **성능 최적화**: JOIN 제거, 필요한 컬럼만 SELECT
- [ ] **status 필터**: 'active'만 표시

### 🐛 과거 버그 사례
1. **모바일 타임아웃** (2025-10-18 완전 해결)
   - 증상: 모바일 10-20초+ 타임아웃
   - 해결: JOIN 제거 + ISR 적용
   - 커밋: ac7f56c, fb8b0cd

### 📚 관련 문서
- Part 1: 없음 (직접 DB 접근)
- Part 2: Section 5 - products 테이블
- Part 3: Section 3.5 - GET /api/get-products
- PAGE_FEATURE_MATRIX_PART1: Section 1

---

## 2. `/checkout` - 체크아웃

### 📌 개요
- **경로**: `/app/checkout/page.js`
- **목적**: 주문 생성 (배송지, 쿠폰, 결제 정보)
- **컴포넌트 타입**: Client Component

### 🔧 호출하는 중앙 함수 (Part 1 참조)
| 함수 | 위치 (Part 1) | 사용 목적 |
|------|---------------|-----------|
| `UserProfileManager.loadUserProfile()` | Section 2.1 | 프로필 로드 |
| `loadUserCouponsOptimized()` | Section 2.2 | 쿠폰 병렬 로드 |
| `validateCoupon()` | Section 2.3 | 쿠폰 검증 |
| `OrderCalculations.calculateFinalOrderAmount()` | Section 1.1 | 최종 금액 계산 |
| `formatShippingInfo()` | Section 3.5 | 배송비 계산 |
| `applyCouponUsage()` | Section 2.4 | 쿠폰 사용 처리 |

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| POST /api/orders/create | Section 1.1 | 주문 생성 |
| POST /api/orders/update-status | Section 1.2 | 입금확인 요청 (선택적) |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| profiles | SELECT | Section 7 |
| coupons | SELECT | Section 8 |
| user_coupons | SELECT, UPDATE | Section 8 |
| orders | INSERT | Section 1 |
| order_items | INSERT | Section 2 |
| order_shipping | INSERT | Section 4 |
| order_payments | INSERT | Section 3 |
| product_variants | RPC (재고 차감) | Section 6 |

### 🔗 연결된 페이지
- **이전**: `/` (BuyBottomSheet → "바로구매")
- **이전**: `/orders` (일괄결제 → 체크아웃)
- **다음**: `/orders/[id]/complete` (주문 완료)

### ⚠️ 수정 시 주의사항
- [ ] **postal_code 필수**: 도서산간 배송비 계산
- [ ] **discount_amount 저장**: orders 테이블
- [ ] **쿠폰 할인**: 배송비 제외하고 계산
- [ ] **depositor_name 저장**: order_payments 테이블
- [ ] **쿠폰 사용 처리**: applyCouponUsage() 호출
- [ ] **Variant 재고 차감**: updateVariantInventory() RPC

### 🐛 과거 버그 사례
1. **RLS 정책 누락으로 UPDATE 실패** (2025-10-04)
   - 증상: PATCH 204 성공하지만 DB 저장 안 됨
   - 해결: Service Role API 생성

### 📚 관련 문서
- Part 1: Section 1.1, 2.2, 2.3, 2.4, 3.5
- Part 2: Section 1, 2, 3, 4, 7, 8
- Part 3: Section 1.1, 1.2
- FEATURE_REFERENCE_MAP_PART1: Section 1.1
- PAGE_FEATURE_MATRIX_PART1: Section 2

---

## 3. `/orders` - 주문 내역

### 📌 개요
- **경로**: `/app/orders/page.js`
- **목적**: 사용자 주문 목록 조회 및 관리
- **컴포넌트 타입**: Client Component

### 🔧 호출하는 중앙 함수 (Part 1 참조)
| 함수 | 위치 (Part 1) | 사용 목적 |
|------|---------------|-----------|
| `useOrdersInit()` | Hook (useOrdersInit.js) | 주문 목록 초기화 + 페이지네이션 |
| `getOrders()` | Section 없음 (supabaseApi.js) | 주문 조회 |
| `cancelOrder()` | Section 없음 | 주문 취소 + 재고 복원 |
| `groupOrderItems()` | Section 없음 | 상품 그룹화 (2025-10-13) |
| `OrderCalculations.calculateFinalOrderAmount()` | Section 1.1 | 금액 재계산 |
| `formatShippingInfo()` | Section 3.5 | 배송비 계산 |

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| POST /api/orders/list | Section 1.3 | 주문 목록 조회 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| orders | SELECT, UPDATE (취소) | Section 1 |
| order_items | SELECT | Section 2 |
| products | SELECT (JOIN) | Section 5 |
| order_shipping | SELECT | Section 4 |
| order_payments | SELECT | Section 3 |

### 🔗 연결된 페이지
- **다음**: `/checkout?mode=bulk` (일괄결제)
- **다음**: `/orders/[id]/complete` (주문 상세)

### ⚠️ 수정 시 주의사항
- [ ] **OrderCalculations 필수**: 배송비 포함 총액 계산
- [ ] **formatShippingInfo 필수**: 도서산간 배송비
- [ ] **shipping.postal_code 확인**: getOrders에서 포함
- [ ] **groupOrderItems**: 상품 그룹화 (2025-10-13 추가)
- [ ] **카카오 사용자**: order_type LIKE '%KAKAO:%'
- [ ] **pending 상태만**: 취소 가능
- [ ] **useEffect 의존성**: user → user?.id (성능 최적화)
- [ ] **race condition 방지**: isLoadingRef 사용 (중복 호출 차단)

### 🐛 과거 버그 사례
1. **주문 카드 금액 표시 오류** (2025-10-08 해결)
   - 증상: 배송비 제외된 금액 표시
   - 해결: OrderCalculations + formatShippingInfo 사용

2. **주문 수량 변경 기능 제거** (2025-10-13)
   - 이유: 동시성 문제
   - 결과: 140줄 코드 삭제

3. **중복 API 호출 성능 문제** (2025-10-22 해결) ⭐
   - 증상: POST /api/orders/list 3-4번 호출 (각 6-7초, 총 18-21초)
   - 원인: useEffect 의존성 배열에 user 객체 (참조 타입) → 객체 참조 변경 시마다 재실행
   - 근본 원인: useOrdersInit.js Line 169 `}, [isAuthenticated, user, authLoading, router, searchParams])`
   - 해결책:
     - **의존성 최적화**: `user` → `user?.id` (원시 타입 사용)
     - **race condition 방지**: `isLoadingRef` ref 추가하여 동시 호출 차단
     - **3곳에 적용**: initOrdersPageFast, handleTabChange, handlePageChange
   - 결과: 3-4번 → 1번 호출, 18-21초 → 0.5-1초 예상
   - 커밋: bcb9ee7

### 📚 관련 문서
- Part 1: Section 1.1, 3.5
- Part 2: Section 1, 2, 3, 4, 5
- Part 3: Section 1.3
- PAGE_FEATURE_MATRIX_PART1: Section 3

---

## 4. `/orders/[id]/complete` - 주문 완료

### 📌 개요
- **경로**: `/app/orders/[id]/complete/page.js`
- **목적**: 주문 상세 정보 표시
- **컴포넌트 타입**: Client Component

### 🔧 호출하는 중앙 함수 (Part 1 참조)
| 함수 | 위치 (Part 1) | 사용 목적 |
|------|---------------|-----------|
| `getOrderById()` | Section 없음 | 주문 상세 조회 |
| `OrderCalculations.calculateFinalOrderAmount()` | Section 1.1 | 금액 재계산 |
| `formatShippingInfo()` | Section 3.5 | 배송비 계산 |
| `getBestPayment()` | Section 없음 | 최적 결제 정보 선택 |

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| POST /api/orders/list | Section 1.3 | 주문 상세 조회 (orderId 파라미터) |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| orders | SELECT | Section 1 |
| order_items | SELECT | Section 2 |
| products | SELECT (JOIN) | Section 5 |
| product_variants | SELECT (JOIN) | Section 6 |
| order_shipping | SELECT | Section 4 |
| order_payments | SELECT | Section 3 |

### 🔗 연결된 페이지
- **이전**: `/checkout` (주문 생성 완료)
- **이전**: `/orders` (주문 내역에서 클릭)

### ⚠️ 수정 시 주의사항
- [ ] **OrderCalculations 필수**: 정확한 금액 계산
- [ ] **discount_amount**: 쿠폰 할인 표시
- [ ] **입금자명 우선순위**: payment > depositName > shipping.name
- [ ] **배송비 계산**: postal_code 기반 도서산간 포함
- [ ] **getBestPayment**: 최적 결제 정보 선택

### 🐛 과거 버그 사례
1. **총 결제금액 계산 오류** (2025-10-08 해결)
   - 증상: DB 저장값 직접 표시 → 잘못된 금액
   - 해결: OrderCalculations 사용

### 📚 관련 문서
- Part 1: Section 1.1, 3.5
- Part 2: Section 1, 2, 3, 4, 5, 6
- Part 3: Section 1.3
- PAGE_FEATURE_MATRIX_PART1: Section 4

---

## 5. `/mypage` - 마이페이지

### 📌 개요
- **경로**: `/app/mypage/page.js`
- **목적**: 프로필 정보 관리 및 최근 주문 표시
- **컴포넌트 타입**: Client Component

### 🔧 호출하는 중앙 함수 (Part 1 참조)
| 함수 | 위치 (Part 1) | 사용 목적 |
|------|---------------|-----------|
| `UserProfileManager.getCurrentUser()` | Section 2.1 | 현재 사용자 식별 |
| `UserProfileManager.getProfile()` | Section 2.1 | 프로필 조회 |
| `UserProfileManager.atomicProfileUpdate()` | Section 2.5 | 프로필 수정 |
| `getOrders()` | Section 없음 | 최근 주문 조회 |

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| POST /api/orders/list | Section 1.3 | 최근 주문 조회 (최대 5개) |
| POST /api/profile/complete | Section 8.3 | 프로필 수정 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| profiles | SELECT, UPSERT | Section 7 |
| auth.users.user_metadata | UPDATE | Section 7 |
| orders | SELECT (최대 5개) | Section 1 |

### 🔗 연결된 페이지
- **다음**: `/mypage/coupons` (쿠폰함)
- **다음**: `/orders` (주문 내역)

### ⚠️ 수정 시 주의사항
- [ ] **카카오 사용자 구분**: sessionStorage 우선
- [ ] **프로필 정규화**: normalizeProfile()
- [ ] **배송지 최대 5개**: 제한 확인
- [ ] **기본 배송지**: is_default 설정
- [ ] **atomicProfileUpdate**: 병렬 처리 (profiles + auth.users)

### 📚 관련 문서
- Part 1: Section 2.1, 2.5
- Part 2: Section 7
- Part 3: Section 1.3, 8.3
- PAGE_FEATURE_MATRIX_PART1: Section 5

---

## 6. `/mypage/coupons` - 쿠폰함

### 📌 개요
- **경로**: `/app/mypage/coupons/page.js`
- **목적**: 사용자 보유 쿠폰 목록 표시
- **컴포넌트 타입**: Client Component

### 🔧 호출하는 중앙 함수 (Part 1 참조)
| 함수 | 위치 (Part 1) | 사용 목적 |
|------|---------------|-----------|
| `loadUserCouponsOptimized()` | Section 2.2 | 쿠폰 병렬 로드 |

### 📞 호출하는 API (Part 3 참조)
- 없음 (클라이언트 직접 Supabase 쿼리)

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| user_coupons | SELECT | Section 8 |
| coupons | SELECT (JOIN) | Section 8 |

### 🔗 연결된 페이지
- **이전**: `/mypage` (마이페이지)
- **다음**: `/checkout` (쿠폰 사용)

### ⚠️ 수정 시 주의사항
- [ ] **사용 가능/완료 쿠폰**: 병렬 로드
- [ ] **만료일 가까운 순**: 정렬
- [ ] **유효 기간 만료**: 자동 필터링
- [ ] **쿠폰 상세 정보**: 할인 타입, 최소 주문 금액

### 📚 관련 문서
- Part 1: Section 2.2
- Part 2: Section 8
- PAGE_FEATURE_MATRIX_PART1: Section 6

---

## 7. `/login` - 로그인

### 📌 개요
- **경로**: `/app/login/page.js`
- **목적**: 이메일/비밀번호 또는 카카오 로그인
- **컴포넌트 타입**: Client Component

### 🔧 호출하는 중앙 함수 (Part 1 참조)
| 함수 | 위치 (Part 1) | 사용 목적 |
|------|---------------|-----------|
| `signIn()` | Section 없음 | 이메일 로그인 |

### 📞 호출하는 API (Part 3 참조)
- Supabase Auth: `signInWithPassword()`, `signInWithOAuth()`

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| auth.users | SELECT | - |
| profiles | SELECT | Section 7 |

### 🔗 연결된 페이지
- **다음**: `/` (로그인 성공)
- **다음**: `/auth/callback` (카카오 로그인)
- **다음**: `/signup` (회원가입)

### 📚 관련 문서
- PAGE_FEATURE_MATRIX_PART1: Section 7

---

## 8. `/signup` - 회원가입

### 📌 개요
- **경로**: `/app/signup/page.js`
- **목적**: 신규 사용자 등록
- **컴포넌트 타입**: Client Component

### 🔧 호출하는 중앙 함수 (Part 1 참조)
| 함수 | 위치 (Part 1) | 사용 목적 |
|------|---------------|-----------|
| `signUp()` | Section 없음 | 회원가입 |

### 📞 호출하는 API (Part 3 참조)
- Supabase Auth: `signUp()`

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| auth.users | INSERT | - |
| profiles | INSERT (트리거 자동) | Section 7 |

### 🔗 연결된 페이지
- **이전**: `/login` (로그인 페이지)
- **다음**: `/` (회원가입 완료)

### 📚 관련 문서
- Part 2: Section 7
- PAGE_FEATURE_MATRIX_PART1: Section 8

---

## 9. `/auth/callback` - 카카오 콜백

### 📌 개요
- **경로**: `/app/auth/callback/page.js`
- **목적**: 카카오 OAuth 인증 코드 처리
- **컴포넌트 타입**: Client Component

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| POST /api/auth/kakao-token | Section 8.1 | 카카오 토큰 처리 |
| POST /api/auth/create-kakao-user | Section 8.2 | 카카오 사용자 생성 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| profiles | SELECT, INSERT | Section 7 |

### 🔗 연결된 페이지
- **이전**: `/login` (카카오 로그인 클릭)
- **다음**: `/` (기존 사용자)
- **다음**: `/auth/complete-profile` (신규 사용자)

### 📚 관련 문서
- Part 2: Section 7
- Part 3: Section 8.1, 8.2
- PAGE_FEATURE_MATRIX_PART1: Section 9

---

## 10. `/auth/complete-profile` - 프로필 완성

### 📌 개요
- **경로**: `/app/auth/complete-profile/page.js`
- **목적**: 카카오 로그인 후 추가 정보 입력
- **컴포넌트 타입**: Client Component

### 🔧 호출하는 중앙 함수 (Part 1 참조)
| 함수 | 위치 (Part 1) | 사용 목적 |
|------|---------------|-----------|
| `UserProfileManager.atomicProfileUpdate()` | Section 2.5 | 프로필 업데이트 |

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| POST /api/profile/complete | Section 8.3 | 프로필 수정 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| profiles | UPDATE | Section 7 |

### 🔗 연결된 페이지
- **이전**: `/auth/callback` (신규 카카오 사용자)
- **다음**: `/` (프로필 완성 완료)

### 📚 관련 문서
- Part 1: Section 2.5
- Part 2: Section 7
- Part 3: Section 8.3
- PAGE_FEATURE_MATRIX_PART1: Section 10

---

# 관리자 페이지 상세

---

## 11. `/admin` - 대시보드

### 📌 개요
- **경로**: `/app/admin/page.js`
- **목적**: 관리자 통계 대시보드
- **컴포넌트 타입**: Client Component

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| GET /api/admin/stats | Section 9.2 | 통계 조회 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| orders | SELECT (통계) | Section 1 |
| products | SELECT (통계) | Section 5 |
| profiles | SELECT (통계) | Section 7 |

### 🔗 연결된 페이지
- **다음**: `/admin/orders` (주문 관리)
- **다음**: `/admin/products` (상품 관리)

---

## 12. `/admin/orders` - 주문 관리

### 📌 개요
- **경로**: `/app/admin/orders/page.js`
- **목적**: 전체 주문 목록 조회 및 관리
- **컴포넌트 타입**: Client Component

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| GET /api/admin/orders | Section 2.1 | 주문 목록 조회 |
| POST /api/orders/update-status | Section 1.2 | 주문 상태 변경 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| orders | SELECT, UPDATE | Section 1 |
| order_items | SELECT (JOIN) | Section 2 |
| products | SELECT (JOIN) | Section 5 |
| suppliers | SELECT (JOIN) | Section 10 |
| order_shipping | SELECT (JOIN) | Section 4 |
| order_payments | SELECT (JOIN) | Section 3 |

### 🔗 연결된 페이지
- **다음**: `/admin/orders/[id]` (주문 상세)
- **다음**: `/admin/deposits` (입금확인)
- **다음**: `/admin/shipping` (배송 관리)

### ⚠️ 수정 시 주의사항
- [ ] **INNER JOIN 주의**: paymentMethod 필터 시 결제대기 주문 제외됨
- [ ] **서버 사이드 필터링**: status, paymentMethod, 날짜 범위
- [ ] **배열 인덱스**: order_shipping[0], order_payments[0]

### 🐛 과거 버그 사례
1. **입금확인 페이지 itemsLoaded: 0** (2025-10-15)
   - 해결: API에 status/paymentMethod 파라미터 추가

2. **결제대기 탭 INNER JOIN 오류** (2025-10-15)
   - 해결: paymentMethodFilter 있을 때만 INNER JOIN

### 📚 관련 문서
- Part 2: Section 1, 2, 3, 4, 5, 10
- Part 3: Section 2.1, 1.2

---

## 13. `/admin/orders/[id]` - 주문 상세

### 📌 개요
- **경로**: `/app/admin/orders/[id]/page.js`
- **목적**: 단일 주문 상세 조회 및 상태 변경
- **컴포넌트 타입**: Client Component

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| GET /api/admin/orders | Section 2.1 | 주문 상세 조회 (orderId 파라미터) |
| POST /api/orders/update-status | Section 1.2 | 주문 상태 변경 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| orders | SELECT, UPDATE | Section 1 |
| order_items | SELECT | Section 2 |
| products | SELECT (JOIN) | Section 5 |
| order_shipping | SELECT, UPDATE | Section 4 |
| order_payments | SELECT, UPDATE | Section 3 |

### 🔗 연결된 페이지
- **이전**: `/admin/orders` (주문 관리)

---

## 14. `/admin/deposits` - 입금확인

### 📌 개요
- **경로**: `/app/admin/deposits/page.js`
- **목적**: 입금확인 대기 주문 관리
- **컴포넌트 타입**: Client Component

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| GET /api/admin/orders?status=verifying | Section 2.1 | 입금확인 대기 목록 |
| POST /api/orders/update-status | Section 1.2 | 입금확인 완료 처리 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| orders | SELECT (status=verifying), UPDATE | Section 1 |
| order_payments | SELECT, UPDATE | Section 3 |

### ⚠️ 수정 시 주의사항
- [ ] **서버 사이드 필터링**: status=verifying 필수
- [ ] **입금자명 확인**: order_payments.depositor_name

---

## 15. `/admin/shipping` - 배송 관리

### 📌 개요
- **경로**: `/app/admin/shipping/page.js`
- **목적**: 배송 준비 및 송장번호 등록
- **컴포넌트 타입**: Client Component

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| GET /api/admin/orders?status=deposited | Section 2.1 | 배송 준비 목록 |
| POST /api/admin/shipping/update-tracking | Section 5.1 | 송장번호 등록 |
| POST /api/admin/shipping/bulk-tracking | Section 5.2 | 송장번호 일괄 등록 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| orders | SELECT (status=deposited), UPDATE | Section 1 |
| order_shipping | SELECT, UPDATE | Section 4 |

### ⚠️ 수정 시 주의사항
- [ ] **tracking_company**: 택배사명 저장 (2025-10-20 추가)
- [ ] **shipped_at**: 자동 타임스탬프
- [ ] **status 동기화**: orders.status = 'shipped'

---

## 16. `/admin/products` - 상품 관리

### 📌 개요
- **경로**: `/app/admin/products/page.js`
- **목적**: 상품 목록 조회 및 관리
- **컴포넌트 타입**: Client Component

### 🔧 호출하는 중앙 함수 (Part 1 참조)
| 함수 | 위치 (Part 1) | 사용 목적 |
|------|---------------|-----------|
| `getAllProducts()` | Section 없음 | 전체 상품 조회 |

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| POST /api/admin/products/toggle-visibility | Section 3.3 | 상품 활성화/비활성화 |
| POST /api/admin/products/bulk-update | Section 3.4 | 상품 일괄 수정 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| products | SELECT, UPDATE | Section 5 |
| categories | SELECT (JOIN) | Section 9 |
| suppliers | SELECT (JOIN) | Section 10 |

### 🔗 연결된 페이지
- **다음**: `/admin/products/new` (상품 등록)
- **다음**: `/admin/products/[id]/edit` (상품 수정)

---

## 17. `/admin/products/new` - 상품 등록

### 📌 개요
- **경로**: `/app/admin/products/new/page.js`
- **목적**: 빠른 상품 등록 (Variant 지원)
- **컴포넌트 타입**: Client Component

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| POST /api/admin/products/create | Section 3.1 | 상품 생성 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| products | INSERT | Section 5 |
| product_options | INSERT (옵션 있을 때) | Section 12 |
| product_option_values | INSERT | Section 13 |
| product_variants | INSERT | Section 6 |
| variant_option_values | INSERT | Section 14 |

### ⚠️ 수정 시 주의사항
- [ ] **adminEmail 필수**: 관리자 권한 검증
- [ ] **optionType 확인**: 'none'이 아니면 Variant 생성
- [ ] **SKU 자동 생성**: productId 8자리 포함
- [ ] **totalInventory**: Variant 합계 자동 계산

### 🔗 연결된 페이지
- **이전**: `/admin/products` (상품 관리)
- **다음**: `/admin/products` (등록 완료)

---

## 18. `/admin/coupons` - 쿠폰 관리

### 📌 개요
- **경로**: `/app/admin/coupons/page.js`
- **목적**: 쿠폰 목록 조회 및 관리
- **컴포넌트 타입**: Client Component

### 🔧 호출하는 중앙 함수 (Part 1 참조)
| 함수 | 위치 (Part 1) | 사용 목적 |
|------|---------------|-----------|
| `getAllCoupons()` | Section 없음 | 전체 쿠폰 조회 |

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| POST /api/admin/coupons/create | Section 4.1 | 쿠폰 생성 |
| POST /api/admin/coupons/update | Section 4.3 | 쿠폰 수정 |
| DELETE /api/admin/coupons/delete | Section 4.4 | 쿠폰 삭제 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| coupons | SELECT, INSERT, UPDATE, DELETE | Section 8 |

### 🔗 연결된 페이지
- **다음**: `/admin/coupons/new` (쿠폰 생성)
- **다음**: `/admin/coupons/[id]` (쿠폰 상세)

---

## 19. `/admin/coupons/[id]` - 쿠폰 상세

### 📌 개요
- **경로**: `/app/admin/coupons/[id]/page.js`
- **목적**: 쿠폰 상세 조회 및 배포
- **컴포넌트 타입**: Client Component

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| POST /api/admin/coupons/distribute | Section 4.2 | 쿠폰 배포 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| coupons | SELECT | Section 8 |
| user_coupons | INSERT (배포) | Section 8 |
| profiles | SELECT (전체 고객) | Section 7 |

### ⚠️ 수정 시 주의사항
- [ ] **adminEmail 필수**: useAdminAuth.email 사용
- [ ] **중복 처리**: 개별 INSERT로 중복 건너뛰기
- [ ] **(user_id, coupon_id) UNIQUE**: 중복 발급 방지

### 🐛 과거 버그 사례
1. **쿠폰 배포 403 에러** (2025-10-08 완전 해결)
   - 원인 1: adminEmail 추출 실패
   - 원인 2: 구버전 hook import
   - 해결: useAdminAuthNew 사용

### 🔗 연결된 페이지
- **이전**: `/admin/coupons` (쿠폰 관리)

---

## 20. `/admin/purchase-orders` - 발주 관리

### 📌 개요
- **경로**: `/app/admin/purchase-orders/page.js`
- **목적**: 업체별 발주서 목록
- **컴포넌트 타입**: Client Component

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| GET /api/admin/purchase-orders | Section 6.1 | 발주서 목록 조회 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| orders | SELECT (status: paid/deposited) | Section 1 |
| order_items | SELECT (JOIN) | Section 2 |
| products | SELECT (JOIN) | Section 5 |
| suppliers | SELECT (JOIN) | Section 10 |
| purchase_order_batches | SELECT (완료된 주문 제외) | Section 11 |

### ⚠️ 수정 시 주의사항
- [ ] **status 필터 통일**: paid + deposited 모두 포함
- [ ] **GIN 인덱스**: order_ids 배열 검색 최적화

### 🔗 연결된 페이지
- **다음**: `/admin/purchase-orders/[supplierId]` (발주 상세)

---

## 21. `/admin/purchase-orders/[supplierId]` - 발주 상세

### 📌 개요
- **경로**: `/app/admin/purchase-orders/[supplierId]/page.js`
- **목적**: 특정 업체 발주서 상세 및 Excel 다운로드
- **컴포넌트 타입**: Client Component

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| GET /api/admin/purchase-orders/[supplierId] | Section 6.1 | 발주서 상세 조회 |
| POST /api/admin/purchase-orders/batch | Section 6.2 | 발주서 생성 (Excel 다운로드) |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| suppliers | SELECT | Section 10 |
| orders | SELECT | Section 1 |
| order_items | SELECT (JOIN) | Section 2 |
| products | SELECT (JOIN) | Section 5 |
| purchase_order_batches | INSERT | Section 11 |

### ⚠️ 수정 시 주의사항
- [ ] **order_ids 배열**: GIN 인덱스
- [ ] **중복 방지**: 동일 주문 재발주 방지

### 🔗 연결된 페이지
- **이전**: `/admin/purchase-orders` (발주 관리)

---

## 22. `/admin/suppliers` - 공급업체 관리

### 📌 개요
- **경로**: `/app/admin/suppliers/page.js`
- **목적**: 공급업체 목록 조회 및 관리
- **컴포넌트 타입**: Client Component

### 🔧 호출하는 중앙 함수 (Part 1 참조)
| 함수 | 위치 (Part 1) | 사용 목적 |
|------|---------------|-----------|
| `getSuppliers()` | Section 없음 | 전체 공급업체 조회 |
| `createSupplier()` | Section 없음 | 공급업체 생성 |
| `updateSupplier()` | Section 없음 | 공급업체 수정 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| suppliers | SELECT, INSERT, UPDATE | Section 10 |

---

## 23. `/admin/customers` - 고객 관리

### 📌 개요
- **경로**: `/app/admin/customers/page.js`
- **목적**: 고객 목록 조회 및 관리
- **컴포넌트 타입**: Client Component

### 🔧 호출하는 중앙 함수 (Part 1 참조)
| 함수 | 위치 (Part 1) | 사용 목적 |
|------|---------------|-----------|
| `getAllCustomers()` | Section 없음 | 전체 고객 조회 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| profiles | SELECT | Section 7 |

---

## 24. `/admin/fulfillment` - 배송 취합

### 📌 개요
- **경로**: `/app/admin/fulfillment/page.js`
- **목적**: 동일 배송지 주문 그룹화
- **컴포넌트 타입**: Client Component

### 🔧 호출하는 중앙 함수 (Part 1 참조)
| 함수 | 위치 (Part 1) | 사용 목적 |
|------|---------------|-----------|
| `groupOrdersByShipping()` | Section 없음 | 배송지별 그룹화 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| orders | SELECT (status=deposited) | Section 1 |
| order_shipping | SELECT | Section 4 |

---

## 25. `/admin/login` - 관리자 로그인

### 📌 개요
- **경로**: `/app/admin/login/page.js`
- **목적**: 관리자 인증
- **컴포넌트 타입**: Client Component

### 🔧 호출하는 중앙 함수 (Part 1 참조)
| 함수 | 위치 (Part 1) | 사용 목적 |
|------|---------------|-----------|
| `adminLogin()` | Section 없음 | 관리자 로그인 |

### 📞 호출하는 API (Part 3 참조)
| API | 위치 (Part 3) | 사용 목적 |
|-----|---------------|-----------|
| POST /api/admin/login | Section 7.1 | 관리자 로그인 |
| POST /api/admin/verify | Section 7.3 | 토큰 검증 |

### 💾 접근하는 DB 테이블 (Part 2 참조)
| 테이블 | 작업 | 위치 (Part 2) |
|--------|------|---------------|
| profiles | SELECT (is_admin 확인) | Section 7 |

### 🔗 연결된 페이지
- **다음**: `/admin` (로그인 성공)

---

# 전체 요약

---

## 26. 페이지 종속성 매트릭스

### 사용자 페이지 요약 테이블

| 페이지 | 주요 중앙 함수 | 주요 API | 주요 DB 테이블 |
|--------|---------------|----------|---------------|
| **/** | 없음 | 없음 (Server Component) | products (11개 컬럼) |
| **/checkout** | OrderCalculations, formatShippingInfo, validateCoupon, applyCouponUsage | POST /api/orders/create | orders, order_items, order_shipping, order_payments, user_coupons |
| **/orders** | OrderCalculations, formatShippingInfo, cancelOrder | POST /api/orders/list | orders, order_items, order_shipping, order_payments |
| **/orders/[id]/complete** | OrderCalculations, formatShippingInfo, getBestPayment | POST /api/orders/list | orders, order_items, order_shipping, order_payments |
| **/mypage** | UserProfileManager (getCurrentUser, atomicProfileUpdate) | POST /api/orders/list, POST /api/profile/complete | profiles, orders |
| **/mypage/coupons** | loadUserCouponsOptimized | 없음 | user_coupons, coupons |
| **/login** | signIn | Supabase Auth | auth.users, profiles |
| **/signup** | signUp | Supabase Auth | auth.users, profiles |
| **/auth/callback** | 없음 | POST /api/auth/kakao-token, POST /api/auth/create-kakao-user | profiles |
| **/auth/complete-profile** | UserProfileManager.atomicProfileUpdate | POST /api/profile/complete | profiles |

### 관리자 페이지 요약 테이블

| 페이지 | 주요 API | 주요 DB 테이블 | 인증 |
|--------|----------|---------------|------|
| **/admin** | GET /api/admin/stats | orders, products, profiles | JWT |
| **/admin/orders** | GET /api/admin/orders | orders, order_items, products | JWT |
| **/admin/deposits** | GET /api/admin/orders?status=verifying | orders, order_payments | JWT |
| **/admin/shipping** | POST /api/admin/shipping/update-tracking | orders, order_shipping | JWT + adminEmail |
| **/admin/products** | POST /api/admin/products/toggle-visibility | products | JWT + adminEmail |
| **/admin/products/new** | POST /api/admin/products/create | products, product_variants | JWT + adminEmail |
| **/admin/coupons** | POST /api/admin/coupons/create | coupons | JWT + adminEmail |
| **/admin/coupons/[id]** | POST /api/admin/coupons/distribute | coupons, user_coupons | JWT + adminEmail |
| **/admin/purchase-orders** | GET /api/admin/purchase-orders | orders, suppliers, purchase_order_batches | JWT |
| **/admin/suppliers** | supabaseApi (getSuppliers, createSupplier) | suppliers | JWT |
| **/admin/customers** | supabaseApi (getAllCustomers) | profiles | JWT |
| **/admin/login** | POST /api/admin/login | profiles | 없음 |

---

## 27. 페이지 간 연결 맵

### 사용자 페이지 플로우

```
/login ──┬─> / (홈) ──> /checkout ──> /orders/[id]/complete
         │      │
         └──────┴─────> /orders ──> /checkout?mode=bulk
                │
                └─────> /mypage ──> /mypage/coupons

/signup ─> /

/auth/callback ──┬─> / (기존 사용자)
                 └─> /auth/complete-profile ─> /
```

### 관리자 페이지 플로우

```
/admin/login ─> /admin (대시보드)
                  │
                  ├─> /admin/orders ─────> /admin/orders/[id]
                  │      │
                  │      ├─> /admin/deposits
                  │      └─> /admin/shipping
                  │
                  ├─> /admin/products ───> /admin/products/new
                  │
                  ├─> /admin/coupons ────> /admin/coupons/[id]
                  │
                  ├─> /admin/purchase-orders ─> /admin/purchase-orders/[supplierId]
                  │
                  ├─> /admin/suppliers
                  │
                  ├─> /admin/customers
                  │
                  └─> /admin/fulfillment
```

---

# 🎯 실전 사용 시나리오

## 시나리오 1: "체크아웃 페이지에서 금액 계산 버그"

1. **이 문서에서 확인할 것**:
   - Section 2: /checkout 페이지
   - 호출하는 중앙 함수: OrderCalculations.calculateFinalOrderAmount()

2. **Part 1 확인**:
   - Section 1.1: calculateFinalOrderAmount() - 사용처 7곳

3. **테스트해야 할 페이지**:
   - `/checkout` (이 페이지)
   - `/orders` (동일 함수 사용)
   - `/orders/[id]/complete` (동일 함수 사용)

---

## 시나리오 2: "주문 생성 API 수정"

1. **Part 3 확인**:
   - Section 1.1: POST /api/orders/create

2. **이 문서에서 확인**:
   - Section 2: /checkout (이 API 호출)
   - Section 17: /admin/products/new (간접 호출)

3. **테스트해야 할 페이지**:
   - `/checkout` (직접 호출)
   - `/admin/products/new` (간접 호출)

---

# 🚨 페이지 수정 체크리스트

### 페이지 수정 전
- [ ] 해당 페이지 섹션 읽기 (이 문서)
- [ ] 호출하는 중앙 함수 확인 (Part 1 참조)
- [ ] 호출하는 API 확인 (Part 3 참조)
- [ ] 접근하는 DB 테이블 확인 (Part 2 참조)
- [ ] 연결된 페이지 확인 (사용자 플로우)

### 페이지 수정 시
- [ ] 중앙 함수 올바르게 호출하는가?
- [ ] API 파라미터 정확한가?
- [ ] DB 테이블 컬럼명 정확한가?
- [ ] RLS 정책 확인 (Service Role vs Anon Key)

### 페이지 수정 후
- [ ] 해당 페이지 테스트
- [ ] 연결된 페이지 테스트 (이전/다음)
- [ ] 동일 중앙 함수 사용하는 다른 페이지 테스트

---

# 📝 Part 4 종료

**다음 Part**:
- **Part 5**: 수정 영향도 매트릭스

**작성 완료일**: 2025-10-20
**총 줄 수**: 1,600+ 줄
**문서화된 페이지**: 25개 (사용자 10개 + 관리자 15개)
