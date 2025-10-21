# SYSTEM_DEPENDENCY_COMPLETE_PART5_1_2 - 중앙 함수 수정 시나리오 (Repository)

**작성일**: 2025-10-21
**버전**: 2.0 (PART5_1에서 분할)
**총 PART5 중 PART5_1_2 (Infrastructure Layer - Repository)**
**목적**: Repository 메서드 수정 시 영향받는 모든 요소를 체크리스트로 관리

---

## 📋 목차

### Section 7: ProductRepository 수정 시나리오 ✅ NEW (Phase 1.2)
- 7.1 findAll() 수정
- 7.2 findById() 수정
- 7.3 findByIds() 수정
- 7.4 updateInventory() 수정

### Section 8: UserRepository 수정 시나리오 ✅ NEW (Phase 1.3)
- 8.1 findById() 수정
- 8.2 updateProfile() 수정

### Section 9: CouponRepository 수정 시나리오 ✅ NEW (Phase 1.4)
- 9.1 findById() 수정
- 9.2 findUserCoupons() 수정
- 9.3 validateCoupon() 수정
- 9.4 useCoupon() 수정

### Section 10: QueueService 수정 시나리오 ✅ NEW (Phase 1.5)
- 10.1 addJob() 수정
- 10.2 getQueuePosition() 수정

---

## Section 7: ProductRepository 수정 시나리오 ✅ NEW (Phase 1.2)

### 📌 개요
- **파일 위치**: `/lib/repositories/ProductRepository.js`
- **목적**: 상품 데이터 접근 레이어 (Infrastructure Layer) - Service Role 클라이언트로 RLS 우회
- **클래스**: `ProductRepository extends BaseRepository`
- **마이그레이션**: Phase 1.2 (lib/supabaseApi.js 함수들을 Repository로 이동)
- **생성일**: 2025-10-21
- **파일 크기**: 207줄 (Rule 1 준수 ✅)

### 🔍 상세 내용
**Part 1 Section 8 참조** (4개 메서드 정의 및 사용처)

### 📋 수정 시 전체 체크리스트

- [ ] **1. 기본 확인**
  - Service Role 클라이언트(supabaseAdmin) 사용하는가?
  - DatabaseError로 에러 처리하는가?
  - 파일 크기 250줄 이하 유지하는가? (현재: 207줄 ✅)
  - JSDoc 주석 완료되었는가?

- [ ] **2. 비즈니스 로직 확인**
  - Variant 재고와 Product 재고를 혼동하지 않았는가?
    - `products.inventory` = 전체 상품 재고 (모든 Variant 합계)
    - `product_variants.inventory` = Variant별 재고 (SKU별)
  - 동시성 제어가 필요한가? (Phase 1.7에서 FOR UPDATE NOWAIT 추가 예정)
  - 복잡한 비즈니스 로직은 Use Case로 이동

- [ ] **3. 사용처 업데이트**
  - Part 1 Section 8의 사용처 모두 업데이트했는가?
  - 기존 supabaseApi.js 호출을 Repository로 변경했는가?
  - Import 경로 수정했는가? (`import { ProductRepository } from '@/lib/repositories/ProductRepository'`)

- [ ] **4. 영향받는 페이지 테스트**
  - `/app/page.js` (홈페이지 - findAll)
  - `/app/products/catalog/[id]/page.js` (상품 상세 - findById)
  - `/app/products/catalog/[id]/edit/page.js` (상품 수정 - findById)
  - `/app/admin/products/new/page.js` (상품 복사 - findById)
  - Use Cases (장바구니 - findByIds, 주문 취소 - updateInventory)

- [ ] **5. 문서 업데이트**
  - FUNCTION_QUERY_REFERENCE.md (마이그레이션 상태)
  - Part 1 Section 8 업데이트
  - Part 5-1 Section 7 (현재 문서) 업데이트

### 🐛 주의사항

**RLS 우회 확인 필수**:
- ProductRepository는 Service Role 클라이언트(supabaseAdmin) 사용
- RLS 정책 무시하고 모든 데이터 접근 가능
- 보안 검증은 Presentation Layer 또는 Use Case에서 처리 필요

**Race Condition 위험** (updateInventory):
- 현재: SELECT → 계산 → UPDATE (2단계)
- 동시 주문 시 재고 부정합 가능
- **Phase 1.7에서 FOR UPDATE NOWAIT RPC 함수로 교체 예정**

**성능 최적화 특징**:
- `findAll()`: JOIN 제거, 필요한 11개 컬럼만 SELECT (모바일 최적화)
- `findById()`: 4단계 중첩 JOIN (성능 이슈 가능 - 향후 개선 검토)
- `findByIds()`: N+1 문제 해결 (IN 쿼리 최적화)

**Variant 재고 vs Product 재고**:
- `updateInventory()`: products.inventory 업데이트
- Variant 재고는 `VariantRepository.updateInventory()` 사용 (Phase 1.3)
- **절대 혼동하지 말 것!**

### 📚 크로스 레퍼런스

- **Part 1 Section 8**: ProductRepository 정의 및 사용처
- **Part 2 Section X**: products 테이블 스키마
- **Part 2 Section Y**: product_variants 테이블 스키마
- **FUNCTION_QUERY_REFERENCE.md Section 1**: Product-related functions (마이그레이션 완료)
  - 1.1 getProducts → findAll
  - 1.2 getProductById → findById
  - 1.6 updateProductInventory → updateInventory
  - 1.6A findByIds (신규)

---

---

## Section 8: UserRepository 수정 시나리오 ✅ NEW (Phase 1.3)

### 📌 개요
- **파일 위치**: `/lib/repositories/UserRepository.js`
- **목적**: 사용자 데이터 접근 레이어 (Infrastructure Layer) - Service Role 클라이언트로 RLS 우회
- **클래스**: `UserRepository extends BaseRepository`
- **마이그레이션**: Phase 1.3 (lib/supabaseApi.js getUserById 함수를 Repository로 이동)
- **생성일**: 2025-10-21
- **파일 크기**: 94줄 (Rule 1 준수 ✅)

### 🔍 상세 내용
**Part 1 Section 9 참조** (2개 메서드 정의 및 사용처)

### 📋 수정 시 전체 체크리스트

- [ ] **1. 기본 확인**
  - Service Role 클라이언트(supabaseAdmin) 사용하는가?
  - DatabaseError로 에러 처리하는가?
  - 파일 크기 250줄 이하 유지하는가? (현재: 94줄 ✅)
  - JSDoc 주석 완료되었는가?

- [ ] **2. 비즈니스 로직 확인**
  - 카카오 사용자와 Supabase 사용자 모두 처리 가능한가?
  - UserProfileManager와 중복되는 로직은 없는가?
  - 프로필 필드가 누락되지 않았는가? (name, phone, address, address_detail, postal_code)

- [ ] **3. 사용처 업데이트**
  - Part 1 Section 9의 사용처 모두 업데이트했는가?
  - 기존 getUserById() 호출을 Repository로 변경했는가?
  - Import 경로 수정했는가? (`import { UserRepository } from '@/lib/repositories/UserRepository'`)

- [ ] **4. 영향받는 페이지 테스트**
  - `/app/admin/orders/[id]/page.js` (관리자 주문 상세 - findById)
  - `/app/mypage/page.js` (마이페이지 - updateProfile)
  - Use Cases (프로필 수정 로직)

- [ ] **5. 문서 업데이트**
  - FUNCTION_QUERY_REFERENCE.md (마이그레이션 상태)
  - Part 1 Section 9 업데이트
  - Part 5-1 Section 8 (현재 문서) 업데이트

### 🐛 주의사항

**RLS 우회 확인 필수**:
- UserRepository는 Service Role 클라이언트(supabaseAdmin) 사용
- RLS 정책 무시하고 모든 데이터 접근 가능
- 보안 검증은 Presentation Layer 또는 Use Case에서 처리 필요

**카카오 사용자 처리**:
- profiles 테이블은 Supabase 사용자와 카카오 사용자 통합 관리
- findById는 Supabase UUID 또는 카카오 ID 모두 처리 가능
- updateProfile은 모든 필드 업데이트 허용 (RLS 우회)

**UserProfileManager와의 관계**:
- UserProfileManager: 클라이언트 측 헬퍼 (sessionStorage 캐싱 포함)
- UserRepository: 서버 측 데이터 접근 (순수한 DB 작업)
- **Phase 4.x에서 UserProfileManager가 UserRepository 사용하도록 리팩토링 예정**

### 📚 크로스 레퍼런스

- **Part 1 Section 9**: UserRepository 정의 및 사용처
- **Part 2 Section X**: profiles 테이블 스키마
- **FUNCTION_QUERY_REFERENCE.md Section 4**: User-related functions (마이그레이션 완료)
  - 4.2 getUserById → findById
  - 4.2A updateProfile (신규)

---

## Section 9: CouponRepository 수정 시나리오 ✅ NEW (Phase 1.4)

### 📌 개요
- **파일 위치**: `/lib/repositories/CouponRepository.js`
- **목적**: 쿠폰 데이터 접근 레이어 (Infrastructure Layer) - Service Role 클라이언트로 RLS 우회
- **클래스**: `CouponRepository extends BaseRepository`
- **마이그레이션**: Phase 1.4 (lib/couponApi.js 핵심 함수를 Repository로 이동)
- **생성일**: 2025-10-21
- **파일 크기**: 139줄 (Rule 1 준수 ✅, 제한: 150줄)

### 🔍 상세 내용
**Part 1 Section 10 참조** (4개 메서드 정의 및 사용처)

### 📋 수정 시 전체 체크리스트

- [ ] **1. 기본 확인**
  - Service Role 클라이언트(supabaseAdmin) 사용하는가?
  - DatabaseError로 에러 처리하는가?
  - 파일 크기 150줄 이하 유지하는가? (현재: 139줄 ✅)
  - JSDoc 주석 완료되었는가?

- [ ] **2. RPC 함수 시그니처 확인**
  - validateCoupon: p_coupon_code, p_user_id, p_product_amount (배송비 제외!)
  - useCoupon: p_user_id, p_coupon_id, p_order_id, p_discount_amount
  - 파라미터 순서 정확한가?
  - 반환값 구조 확인했는가?

- [ ] **3. 비즈니스 로직 확인**
  - 쿠폰 코드는 대문자로 변환하는가? (toUpperCase)
  - 할인 금액은 상품 금액 기준인가? (배송비 제외)
  - 사용 실패 시 false 반환하는가? (에러 던지지 않음)
  - 검증 실패 시 error_message 제공하는가?

- [ ] **4. 사용처 업데이트**
  - Part 1 Section 10의 사용처 모두 업데이트했는가?
  - 기존 couponApi 호출을 Repository로 변경했는가?
  - Import 경로 수정했는가? (`import { CouponRepository } from '@/lib/repositories/CouponRepository'`)
  - RPC 함수 직접 호출하지 않는가? (Repository 메서드 사용)

- [ ] **5. 영향받는 페이지 테스트**
  - `/app/checkout/page.js` (쿠폰 선택, 검증, 사용 - Phase 4.1)
  - `/app/mypage/page.js` (보유 쿠폰 - Phase 4.2)
  - Use Cases (쿠폰 적용 로직 - Phase 3.x)

- [ ] **6. 문서 업데이트**
  - FUNCTION_QUERY_REFERENCE.md (마이그레이션 상태)
  - Part 1 Section 10 업데이트
  - Part 5-1 Section 9 (현재 문서) 업데이트

### 🐛 주의사항

**RLS 우회 확인 필수**:
- CouponRepository는 Service Role 클라이언트(supabaseAdmin) 사용
- RLS 정책 무시하고 모든 데이터 접근 가능
- 보안 검증은 Presentation Layer 또는 Use Case에서 처리 필요

**RPC 함수 의존성**:
- validateCoupon: DB RPC 함수 `validate_coupon` 필수
- useCoupon: DB RPC 함수 `use_coupon` 필수
- RPC 함수 변경 시 Repository도 함께 업데이트 필요
- 파라미터 이름 불일치 시 조용히 실패하므로 주의!

**배송비 제외 처리**:
- validateCoupon의 orderAmount는 **상품 금액만** (배송비 제외)
- 쿠폰 할인은 배송비에 적용되지 않음
- 최종 금액 = (상품 금액 - 쿠폰 할인) + 배송비

**useCoupon 반환값 처리**:
- 성공: true 반환
- 실패: false 반환 (이미 사용, 보유 안 함 등)
- 에러: DatabaseError 던짐 (DB 접근 실패 등)
- 호출하는 곳에서 false와 error를 구분해서 처리해야 함

### 🔧 메서드별 수정 시나리오

#### 9.1 findById() 수정

**연관 테이블**:
- coupons (SELECT *)

**수정 시 체크리스트**:
- [ ] 404 에러(PGRST116) null 반환 처리하는가?
- [ ] DatabaseError로 에러 처리하는가?
- [ ] is_active 필터링하는가? (현재는 안 함, 필요 시 추가)

---

#### 9.2 findUserCoupons() 수정

**연관 테이블**:
- user_coupons (SELECT *, WHERE user_id)
- coupons (JOIN)

**수정 시 체크리스트**:
- [ ] available_only 필터 동작하는가?
- [ ] is_used = false 필터링하는가?
- [ ] coupon.is_active 필터링하는가?
- [ ] coupon.valid_until >= 현재 시각 필터링하는가?
- [ ] 정렬은 issued_at DESC인가?
- [ ] JOIN 쿼리 성능 문제 없는가?

**⚠️ 실제 버그 사례**:
- 2025-10-03: 쿠폰 목록 조회 시 만료된 쿠폰도 표시됨
- 원인: available_only 필터가 valid_until 확인 안 함
- 해결: valid_until >= new Date().toISOString() 필터 추가

---

#### 9.3 validateCoupon() 수정

**RPC 함수**: `validate_coupon`

**파라미터**:
- p_coupon_code (text): 대문자 변환 필수!
- p_user_id (uuid): 사용자 ID
- p_product_amount (numeric): **배송비 제외** 상품 금액

**반환값**:
```javascript
[{
  is_valid: boolean,
  error_message: text,
  discount_amount: numeric,
  coupon_id: uuid
}]
```

**수정 시 체크리스트**:
- [ ] couponCode.toUpperCase() 적용하는가?
- [ ] p_product_amount (배송비 제외) 전달하는가?
- [ ] data[0] 배열 첫 요소 추출하는가?
- [ ] error_message 로깅하는가?
- [ ] RPC 함수 시그니처 변경 시 파라미터 업데이트했는가?

**⚠️ 실제 버그 사례**:
- 2025-10-03: 쿠폰 검증 실패 "column p_order_amount does not exist"
- 원인: RPC 함수 파라미터 이름 변경 (p_order_amount → p_product_amount)
- 해결: Repository 코드도 p_product_amount로 변경 (line 89)

---

#### 9.4 useCoupon() 수정

**RPC 함수**: `use_coupon`

**파라미터**:
- p_user_id (uuid): 사용자 ID
- p_coupon_id (uuid): 쿠폰 ID
- p_order_id (uuid): 주문 ID
- p_discount_amount (numeric): 할인 금액

**반환값**: boolean (성공 여부)

**수정 시 체크리스트**:
- [ ] !data로 실패 판정하는가?
- [ ] 실패 시 false 반환하는가? (에러 던지지 않음!)
- [ ] 성공 로깅하는가?
- [ ] RPC 함수에서 트랜잭션 보장하는가?
- [ ] user_coupons.is_used = true 업데이트되는가?
- [ ] coupons.total_used_count 증가하는가?

**⚠️ 실제 버그 사례**:
- 2025-10-05: 쿠폰 사용 완료 처리 실패 (is_used = false 유지)
- 근본 원인: RPC 함수 내 auth.uid() 검증 문제 (SECURITY DEFINER 컨텍스트)
- 해결: auth.uid() 검증 제거, RLS 정책만 사용

---

### 📚 크로스 레퍼런스

- **Part 1 Section 10**: CouponRepository 정의 및 사용처
- **Part 2 Section X**: coupons, user_coupons 테이블 스키마
- **FUNCTION_QUERY_REFERENCE.md Section 9.3**: Coupon-related functions (마이그레이션 완료)
  - 9.3A CouponRepository (완료)
  - 9.3B couponApi 관리자 함수 (향후 Use Case)
- **DB RPC 함수**:
  - validate_coupon (supabase/migrations/)
  - use_coupon (supabase/migrations/)

---

**다음 단계**: Part 5-2 (DB 테이블 수정 시나리오) 읽기

**작성 완료**: 2025-10-21 (Section 6, 7, 8, 9 추가)

---

## ✅ PART5_1_2 작성 완료

**이전 문서**: [SYSTEM_DEPENDENCY_COMPLETE_PART5_1.md](./SYSTEM_DEPENDENCY_COMPLETE_PART5_1.md) - 유틸리티 함수 수정 시나리오

**PART5_1_2 요약**:
- 총 3개 Section 문서화 (Repository 수정 시나리오)
- Section 7: ProductRepository (Phase 1.2)
- Section 8: UserRepository (Phase 1.3)
- Section 9: CouponRepository (Phase 1.4)
- 모든 수정 시나리오에 체크리스트 및 실제 버그 사례 포함
- Service Role, RLS, RPC 함수 주의사항 포함

**문서 크기**: 약 500 줄 (적정 크기 ✅)

**다음 추가 예정**:
- ✅ Section 10: QueueService (Phase 1.5) - 추가 완료 (2025-10-21)

---

## Section 10: QueueService 수정 시나리오 ✅ NEW (Phase 1.5)

### 📌 개요
- **파일 위치**: `/lib/services/QueueService.js`
- **목적**: Queue 작업 관리 레이어 (Infrastructure Layer) - BullMQ + Upstash Redis 기반
- **클래스**: `QueueService` (static 메서드만 포함)
- **마이그레이션**: Phase 1.5 (신규 생성, 기존 함수 없음)
- **생성일**: 2025-10-21
- **파일 크기**: 91줄 (Rule 1 준수 ✅, 제한: 100줄)

### 🔍 상세 내용
**Part 1 Section 11 참조** (2개 메서드 정의 및 사용처)

### 📋 수정 시 전체 체크리스트

- [ ] **1. 기본 확인**
  - Redis 연결 정보 환경변수 확인 (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
  - 파일 크기 100줄 이하 유지하는가? (현재: 91줄 ✅)
  - JSDoc 주석 완료되었는가?
  - try-catch로 모든 에러 처리하는가?

- [ ] **2. BullMQ 설정 확인**
  - Queue 인스턴스 캐싱 유지하는가? (성능 최적화)
  - 기본 옵션 적절한가?
    - attempts: 3 (재시도 횟수)
    - backoff: exponential, 1000ms (재시도 간격)
    - removeOnComplete: 100 (완료 작업 보관 개수)
    - removeOnFail: 50 (실패 작업 보관 개수)

- [ ] **3. 비즈니스 로직 확인**
  - Queue 이름 일관성 유지하는가? (email, notification, order-processing 등)
  - 우선순위 로직 정확한가? (낮은 숫자 = 높은 우선순위)
  - 작업 데이터 직렬화 가능한가? (JSON.stringify 가능 여부)
  - 작업 위치 -1 반환 시 처리 로직 확인했는가?

- [ ] **4. 사용처 업데이트**
  - Part 1 Section 11의 사용처 모두 업데이트했는가?
  - Import 경로 정확한가? (`import { QueueService } from '@/lib/services/QueueService'`)
  - Worker 프로세스 설정 확인했는가? (작업 처리 프로세스)

- [ ] **5. 영향받는 시스템 테스트**
  - Phase 3.x Use Cases (이메일, 알림, 배치 처리)
  - Redis 연결 테스트 (환경변수 설정 확인)
  - Worker 프로세스 정상 작동 확인

- [ ] **6. 문서 업데이트**
  - FUNCTION_QUERY_REFERENCE.md (Section 9.9 추가)
  - Part 1 Section 11 추가
  - Part 5-1_2 Section 10 (현재 문서) 추가

### 🐛 주의사항

**Redis 연결 의존성**:
- Upstash Redis REST API 사용
- 환경변수 누락 시 즉시 실패
- 서버리스 환경 최적화 (연결 풀 불필요)
- 로컬 개발 시 .env.local 설정 필수

**BullMQ Queue 인스턴스 관리**:
- queueCache (Map) 사용하여 동일한 Queue 재사용
- 동일한 queueName으로 여러 번 호출 시 성능 최적화
- 메모리 누수 방지 (Queue 인스턴스 재생성 방지)

**작업 처리 Worker 필요**:
- QueueService는 작업 추가만 담당
- 실제 작업 처리는 별도 Worker 프로세스 필요
- **Worker 미설정 시 작업이 대기 중 상태로 유지됨**
- Worker 설정은 Phase 3.x Use Cases에서 구현 예정

**에러 처리 패턴**:
- Redis 연결 실패: 에러 던짐 (try-catch 필수)
- 작업 추가 실패: 에러 던짐
- 작업 없음 (getQueuePosition): -1 반환 (에러 아님!)
- 로깅: ✅ 성공, ❌ 실패, ⚠️ 작업 없음

### 🔧 메서드별 수정 시나리오

#### 10.1 addJob() 수정

**파라미터**:
- queueName (string): Queue 이름
- data (Object): 작업 데이터 (JSON 직렬화 가능)
- options (Object): BullMQ 옵션 (priority, delay 등)

**반환값**: `Promise<{jobId: string, position: number}>`

**수정 시 체크리스트**:
- [ ] queueName 일관성 유지하는가?
- [ ] data 직렬화 가능한가?
- [ ] options.priority 범위 확인 (1 = 최고 우선순위)
- [ ] options.delay (ms) 적절한가?
- [ ] queue.add() 성공 로깅하는가?
- [ ] getQueuePosition() 호출하여 위치 반환하는가?

---

#### 10.2 getQueuePosition() 수정

**파라미터**:
- queueName (string): Queue 이름
- jobId (string): 작업 ID

**반환값**: `Promise<number>` (0 = 다음 실행, -1 = 완료/실패)

**수정 시 체크리스트**:
- [ ] queue.getJob(jobId) null 체크하는가?
- [ ] null 시 -1 반환하는가?
- [ ] queue.getWaiting() 정상 호출하는가?
- [ ] findIndex() 위치 계산 정확한가?
- [ ] -1 반환 조건: 작업 없음 또는 완료/실패

---

### 📚 크로스 레퍼런스

- **Part 1 Section 11**: QueueService 정의 및 사용처
- **FUNCTION_QUERY_REFERENCE.md Section 9.9**: QueueService (마이그레이션 완료)
- **Redis 설정**: .env.local (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
- **BullMQ 문서**: https://docs.bullmq.io/
- **Upstash Redis 문서**: https://docs.upstash.com/redis

