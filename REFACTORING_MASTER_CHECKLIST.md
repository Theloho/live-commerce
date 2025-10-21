# ✅ 리팩토링 마스터 체크리스트

**버전**: 1.0
**작성일**: 2025-10-21
**총 예상 시간**: 15-18시간
**목적**: 근본적이고 체계적인 전체 시스템 리팩토링

---

## 📊 전체 진행 상황

```
Phase 0: 문서 및 아키텍처 설계    [ ] 0/23 (0%)
Phase 1: Infrastructure Layer    [ ] 0/34 (0%)
Phase 2: Domain Layer            [ ] 0/28 (0%)
Phase 3: Application Layer       [ ] 0/31 (0%)
Phase 4: Presentation Layer      [ ] 0/45 (0%)
Phase 5: 성능 + 동시성 최적화    [ ] 0/18 (0%)
Phase 6: 테스트 + 검증           [ ] 0/25 (0%)
Phase 7: 배포 + 모니터링         [ ] 0/12 (0%)

총 진행률: 0/216 (0%)
```

---

## 🎯 Phase 0: 문서 및 아키텍처 설계 (2시간)

### Step 0.1: 핵심 문서 생성 (30분)

- [x] 0.1.1 DEVELOPMENT_PRINCIPLES.md 생성 ✅
- [ ] 0.1.2 REFACTORING_MASTER_CHECKLIST.md 생성 (이 파일)
- [ ] 0.1.3 FUNCTION_QUERY_REFERENCE.md 생성
- [ ] 0.1.4 ARCHITECTURE_DECISION_RECORD.md 생성
- [ ] 0.1.5 MIGRATION_GUIDE.md 생성

**완료 조건:**
- ✅ 모든 문서 파일 생성됨
- ✅ Git 커밋: `docs: Phase 0.1 - 핵심 문서 생성`

---

### Step 0.2: 폴더 구조 생성 (20분)

- [ ] 0.2.1 `/lib/use-cases/` 폴더 생성
- [ ] 0.2.2 `/lib/use-cases/order/` 폴더 생성
- [ ] 0.2.3 `/lib/use-cases/product/` 폴더 생성
- [ ] 0.2.4 `/lib/use-cases/user/` 폴더 생성
- [ ] 0.2.5 `/lib/domain/` 폴더 생성
- [ ] 0.2.6 `/lib/domain/order/` 폴더 생성
- [ ] 0.2.7 `/lib/domain/product/` 폴더 생성
- [ ] 0.2.8 `/lib/repositories/` 폴더 생성
- [ ] 0.2.9 `/lib/services/` 폴더 생성
- [ ] 0.2.10 `/lib/errors/` 폴더 생성

**완료 조건:**
- ✅ 모든 폴더 생성됨
- ✅ Git 커밋: `chore: Phase 0.2 - 폴더 구조 생성`

---

### Step 0.3: 기본 클래스 및 인터페이스 (30분)

- [ ] 0.3.1 `/lib/repositories/BaseRepository.js` 생성
- [ ] 0.3.2 `/lib/use-cases/BaseUseCase.js` 생성
- [ ] 0.3.3 `/lib/domain/Entity.js` 생성 (Base Entity)
- [ ] 0.3.4 `/lib/errors/AppError.js` 생성 (Base Error)
- [ ] 0.3.5 `/lib/errors/DomainError.js` 생성
- [ ] 0.3.6 `/lib/errors/InfrastructureError.js` 생성

**완료 조건:**
- ✅ 모든 Base 클래스 생성
- ✅ JSDoc 주석 완료
- ✅ Git 커밋: `feat: Phase 0.3 - Base 클래스 생성`

---

### Step 0.4: 의존성 설치 (20분)

- [ ] 0.4.1 BullMQ 설치: `npm install bullmq`
- [ ] 0.4.2 ioredis 설치: `npm install ioredis`
- [ ] 0.4.3 ESLint 플러그인 설치: `npm install -D eslint-plugin-boundaries`
- [ ] 0.4.4 `.eslintrc.js` 레이어 경계 규칙 추가
- [ ] 0.4.5 Upstash Redis 계정 생성 (무료 플랜)
- [ ] 0.4.6 `.env` Redis URL 추가

**완료 조건:**
- ✅ package.json 업데이트됨
- ✅ ESLint 레이어 경계 검증 작동
- ✅ Git 커밋: `chore: Phase 0.4 - 의존성 설치`

---

### Step 0.5: FUNCTION_QUERY_REFERENCE.md 초기 작성 (20분)

- [ ] 0.5.1 현재 lib/supabaseApi.js 80개 함수 목록 추출
- [ ] 0.5.2 각 함수의 사용처 페이지 기록
- [ ] 0.5.3 각 함수의 DB 쿼리 기록
- [ ] 0.5.4 각 함수의 마이그레이션 대상 레이어 표시

**완료 조건:**
- ✅ 80개 함수 모두 목록화
- ✅ Git 커밋: `docs: Phase 0.5 - 함수 참조 매트릭스 초안`

---

### Step 0.6: 레거시 파일 관리 전략 (20분)

**목적**: 혼란을 줄 수 있는 불필요한 파일을 별도 관리하여 리팩토링 시 혼동 방지

- [ ] 0.6.1 `/deprecated/` 폴더 생성
- [ ] 0.6.2 레거시 파일 목록 작성
  - `lib/supabaseApi.js.bak` → `/deprecated/lib/`
  - `lib/supabaseApi.js.bak2` → `/deprecated/lib/`
  - 기타 .bak, .backup, .old 파일들
- [ ] 0.6.3 `DEPRECATED_FILES.md` 문서 생성
  - 각 파일의 이동 사유 기록
  - 이동 날짜 기록
  - 대체 파일 경로 안내
- [ ] 0.6.4 DEVELOPMENT_PRINCIPLES.md에 Rule 11 추가 (레거시 파일 관리)
- [ ] 0.6.5 레거시 함수 식별 목록 작성 (FUNCTION_QUERY_REFERENCE.md 섹션 10 참조)
  - `getOrders` (line 673) - `/api/orders/list` API로 대체됨
  - `getAllOrders` (line 774) - `/api/admin/orders` API로 대체됨
  - `getCurrentUser` (line 1770) - `useAuth` hook으로 대체됨
  - `signIn/signUp/signOut` - `useAuth` hook으로 대체됨
  - `generateGroupOrderNumber` - 삭제 예정 (S 통일)
  - 기타 11개 레거시 함수
- [ ] 0.6.6 레거시 함수에 `@deprecated` JSDoc 태그 추가
- [ ] 0.6.7 Git 커밋: `chore: Phase 0.6 - 레거시 파일 관리 전략`

**완료 조건:**
- ✅ `/deprecated/` 폴더 생성 및 파일 이동 완료
- ✅ `DEPRECATED_FILES.md` 생성 완료
- ✅ DEVELOPMENT_PRINCIPLES.md Rule 11 추가
- ✅ 레거시 함수 11개 식별 및 @deprecated 태그 추가
- ✅ 리팩토링 시 참조할 파일만 프로젝트 루트에 존재

**⚠️ 중요**: 이 단계를 먼저 완료해야 리팩토링 시 혼동 없음!

---

## 🏗️ Phase 1: Infrastructure Layer (3시간)

### Step 1.1: Repository - Order (40분)

- [ ] 1.1.1 `/lib/repositories/OrderRepository.js` 생성
- [ ] 1.1.2 `findByUser(userId)` 메서드 구현
- [ ] 1.1.3 `findById(orderId)` 메서드 구현
- [ ] 1.1.4 `create(orderData)` 메서드 구현
- [ ] 1.1.5 `update(orderId, data)` 메서드 구현
- [ ] 1.1.6 `updateStatus(orderId, status)` 메서드 구현
- [ ] 1.1.7 `cancel(orderId)` 메서드 구현
- [ ] 1.1.8 JSDoc 주석 완료
- [ ] 1.1.9 FUNCTION_QUERY_REFERENCE.md 업데이트 (7개 메서드)

**완료 조건:**
- ✅ 파일 크기 250줄 이하
- ✅ 모든 메서드 JSDoc 주석 완료
- ✅ Git 커밋: `feat: Phase 1.1 - OrderRepository 생성`

---

### Step 1.2: Repository - Product (35분)

- [ ] 1.2.1 `/lib/repositories/ProductRepository.js` 생성
- [ ] 1.2.2 `findAll()` 메서드 구현
- [ ] 1.2.3 `findById(productId)` 메서드 구현
- [ ] 1.2.4 `findByIds(productIds)` 메서드 구현 (배치 조회)
- [ ] 1.2.5 `updateInventory(productId, change)` 메서드 구현
- [ ] 1.2.6 JSDoc 주석 완료
- [ ] 1.2.7 FUNCTION_QUERY_REFERENCE.md 업데이트 (5개 메서드)

**완료 조건:**
- ✅ 파일 크기 200줄 이하
- ✅ Git 커밋: `feat: Phase 1.2 - ProductRepository 생성`

---

### Step 1.3: Repository - User (25분)

- [ ] 1.3.1 `/lib/repositories/UserRepository.js` 생성
- [ ] 1.3.2 `findById(userId)` 메서드 구현
- [ ] 1.3.3 `updateProfile(userId, profile)` 메서드 구현
- [ ] 1.3.4 JSDoc 주석 완료
- [ ] 1.3.5 FUNCTION_QUERY_REFERENCE.md 업데이트 (3개 메서드)

**완료 조건:**
- ✅ 파일 크기 150줄 이하
- ✅ Git 커밋: `feat: Phase 1.3 - UserRepository 생성`

---

### Step 1.4: Repository - Coupon (25분)

- [ ] 1.4.1 `/lib/repositories/CouponRepository.js` 생성
- [ ] 1.4.2 `findUserCoupons(userId)` 메서드 구현
- [ ] 1.4.3 `validateCoupon(couponId, userId)` 메서드 구현
- [ ] 1.4.4 `useCoupon(couponId, orderId)` 메서드 구현
- [ ] 1.4.5 JSDoc 주석 완료
- [ ] 1.4.6 FUNCTION_QUERY_REFERENCE.md 업데이트 (4개 메서드)

**완료 조건:**
- ✅ 파일 크기 150줄 이하
- ✅ Git 커밋: `feat: Phase 1.4 - CouponRepository 생성`

---

### Step 1.5: Service - Queue (30분)

- [ ] 1.5.1 `/lib/services/QueueService.js` 생성
- [ ] 1.5.2 Queue 연결 설정 (Redis)
- [ ] 1.5.3 `addJob(queueName, data)` 메서드 구현
- [ ] 1.5.4 `getQueuePosition(jobId)` 메서드 구현
- [ ] 1.5.5 JSDoc 주석 완료
- [ ] 1.5.6 FUNCTION_QUERY_REFERENCE.md 업데이트 (3개 메서드)

**완료 조건:**
- ✅ 파일 크기 100줄 이하
- ✅ Redis 연결 테스트 성공
- ✅ Git 커밋: `feat: Phase 1.5 - QueueService 생성`

---

### Step 1.6: Service - Cache (25분)

- [ ] 1.6.1 `/lib/services/CacheService.js` 생성
- [ ] 1.6.2 `get(key)` 메서드 구현
- [ ] 1.6.3 `set(key, value, ttl)` 메서드 구현
- [ ] 1.6.4 `invalidate(key)` 메서드 구현
- [ ] 1.6.5 JSDoc 주석 완료
- [ ] 1.6.6 FUNCTION_QUERY_REFERENCE.md 업데이트 (4개 메서드)

**완료 조건:**
- ✅ 파일 크기 80줄 이하
- ✅ Git 커밋: `feat: Phase 1.6 - CacheService 생성`

---

### Step 1.7: DB 동시성 제어 RPC 함수 (40분)

- [ ] 1.7.1 `/supabase/migrations/[timestamp]_inventory_lock.sql` 생성
- [ ] 1.7.2 `update_inventory_with_lock` 함수 작성 (FOR UPDATE NOWAIT)
- [ ] 1.7.3 재고 부족 검증 로직
- [ ] 1.7.4 에러 처리 (lock_not_available, insufficient_inventory)
- [ ] 1.7.5 Supabase Dashboard에서 마이그레이션 실행
- [ ] 1.7.6 테스트 (동시 접속 시뮬레이션)

**완료 조건:**
- ✅ 함수 생성 성공
- ✅ 동시 접속 테스트 통과 (10명)
- ✅ Git 커밋: `feat: Phase 1.7 - 재고 락 RPC 함수`

---

## 🎨 Phase 2: Domain Layer (2.5시간)

### Step 2.1: Domain - Order Entity (30분)

- [ ] 2.1.1 `/lib/domain/order/Order.js` 생성
- [ ] 2.1.2 생성자 및 필드 정의
- [ ] 2.1.3 `validate()` 메서드 구현
- [ ] 2.1.4 `toJSON()` 메서드 구현
- [ ] 2.1.5 `fromJSON(data)` 정적 메서드 구현
- [ ] 2.1.6 JSDoc 주석 완료
- [ ] 2.1.7 FUNCTION_QUERY_REFERENCE.md 업데이트

**완료 조건:**
- ✅ 파일 크기 150줄 이하
- ✅ Git 커밋: `feat: Phase 2.1 - Order Entity`

---

### Step 2.2: Domain - OrderCalculator (45min)

- [ ] 2.2.1 `/lib/domain/order/OrderCalculator.js` 생성
- [ ] 2.2.2 `calculateItemsTotal()` 메서드 구현
- [ ] 2.2.3 `calculateShipping()` 메서드 구현 (도서산간 포함)
- [ ] 2.2.4 `calculateDiscount()` 메서드 구현 (쿠폰)
- [ ] 2.2.5 `calculateFinalAmount()` 메서드 구현
- [ ] 2.2.6 `checkFreeShipping()` 메서드 구현
- [ ] 2.2.7 기존 `/lib/orderCalculations.js` 로직 이전
- [ ] 2.2.8 JSDoc 주석 완료
- [ ] 2.2.9 FUNCTION_QUERY_REFERENCE.md 업데이트 (6개 메서드)

**완료 조건:**
- ✅ 파일 크기 200줄 이하
- ✅ 기존 로직과 동일한 결과 보장
- ✅ Git 커밋: `feat: Phase 2.2 - OrderCalculator`

---

### Step 2.3: Domain - OrderValidator (30분)

- [ ] 2.3.1 `/lib/domain/order/OrderValidator.js` 생성
- [ ] 2.3.2 `validateOrderData(data)` 메서드 구현
- [ ] 2.3.3 `validateShipping(shipping)` 메서드 구현
- [ ] 2.3.4 `validatePayment(payment)` 메서드 구현
- [ ] 2.3.5 JSDoc 주석 완료
- [ ] 2.3.6 FUNCTION_QUERY_REFERENCE.md 업데이트 (4개 메서드)

**완료 조건:**
- ✅ 파일 크기 120줄 이하
- ✅ Git 커밋: `feat: Phase 2.3 - OrderValidator`

---

### Step 2.4: Domain - Product Entity (20분)

- [ ] 2.4.1 `/lib/domain/product/Product.js` 생성
- [ ] 2.4.2 생성자 및 필드 정의
- [ ] 2.4.3 `validate()` 메서드 구현
- [ ] 2.4.4 `toJSON()` 메서드 구현
- [ ] 2.4.5 JSDoc 주석 완료
- [ ] 2.4.6 FUNCTION_QUERY_REFERENCE.md 업데이트

**완료 조건:**
- ✅ 파일 크기 100줄 이하
- ✅ Git 커밋: `feat: Phase 2.4 - Product Entity`

---

### Step 2.5: Domain - Inventory (25분)

- [ ] 2.5.1 `/lib/domain/product/Inventory.js` 생성
- [ ] 2.5.2 `checkAvailability(required)` 메서드 구현
- [ ] 2.5.3 `reserve(quantity)` 메서드 구현
- [ ] 2.5.4 `release(quantity)` 메서드 구현
- [ ] 2.5.5 JSDoc 주석 완료
- [ ] 2.5.6 FUNCTION_QUERY_REFERENCE.md 업데이트 (4개 메서드)

**완료 조건:**
- ✅ 파일 크기 100줄 이하
- ✅ Git 커밋: `feat: Phase 2.5 - Inventory`

---

## 🚀 Phase 3: Application Layer (3시간)

### Step 3.1: UseCase - CreateOrder (50분)

- [ ] 3.1.1 `/lib/use-cases/order/CreateOrderUseCase.js` 생성
- [ ] 3.1.2 의존성 주입 (Repository, QueueService)
- [ ] 3.1.3 `execute({ orderData, shipping, coupon, user })` 구현
- [ ] 3.1.4 Order Entity 생성 및 검증
- [ ] 3.1.5 OrderCalculator로 금액 계산
- [ ] 3.1.6 Queue에 작업 추가
- [ ] 3.1.7 에러 처리 (InsufficientInventoryError 등)
- [ ] 3.1.8 JSDoc 주석 완료
- [ ] 3.1.9 FUNCTION_QUERY_REFERENCE.md 업데이트

**완료 조건:**
- ✅ 파일 크기 150줄 이하
- ✅ Git 커밋: `feat: Phase 3.1 - CreateOrderUseCase`

---

### Step 3.2: UseCase - GetOrders (35분)

- [ ] 3.2.1 `/lib/use-cases/order/GetOrdersUseCase.js` 생성
- [ ] 3.2.2 의존성 주입 (OrderRepository, CacheService)
- [ ] 3.2.3 `execute({ user, filters })` 구현
- [ ] 3.2.4 캐시 확인 로직
- [ ] 3.2.5 Repository 조회
- [ ] 3.2.6 캐시 저장 로직
- [ ] 3.2.7 JSDoc 주석 완료
- [ ] 3.2.8 FUNCTION_QUERY_REFERENCE.md 업데이트

**완료 조건:**
- ✅ 파일 크기 120줄 이하
- ✅ Git 커밋: `feat: Phase 3.2 - GetOrdersUseCase`

---

### Step 3.3: UseCase - ApplyCoupon (30분)

- [ ] 3.3.1 `/lib/use-cases/order/ApplyCouponUseCase.js` 생성
- [ ] 3.3.2 의존성 주입 (CouponRepository)
- [ ] 3.3.3 `execute({ couponId, userId, orderData })` 구현
- [ ] 3.3.4 쿠폰 검증 로직
- [ ] 3.3.5 할인 계산
- [ ] 3.3.6 JSDoc 주석 완료
- [ ] 3.3.7 FUNCTION_QUERY_REFERENCE.md 업데이트

**완료 조건:**
- ✅ 파일 크기 100줄 이하
- ✅ Git 커밋: `feat: Phase 3.3 - ApplyCouponUseCase`

---

### Step 3.4: UseCase - CancelOrder (30분)

- [ ] 3.4.1 `/lib/use-cases/order/CancelOrderUseCase.js` 생성
- [ ] 3.4.2 의존성 주입 (OrderRepository, ProductRepository)
- [ ] 3.4.3 `execute({ orderId, user })` 구현
- [ ] 3.4.4 주문 상태 확인 (pending만 취소 가능)
- [ ] 3.4.5 재고 복원 로직
- [ ] 3.4.6 쿠폰 복구 로직
- [ ] 3.4.7 JSDoc 주석 완료
- [ ] 3.4.8 FUNCTION_QUERY_REFERENCE.md 업데이트

**완료 조건:**
- ✅ 파일 크기 120줄 이하
- ✅ Git 커밋: `feat: Phase 3.4 - CancelOrderUseCase`

---

### Step 3.5: Queue Worker - OrderWorker (45분)

- [ ] 3.5.1 `/lib/workers/orderWorker.js` 생성
- [ ] 3.5.2 Worker 초기화 (BullMQ)
- [ ] 3.5.3 `processCreateOrder(job)` 함수 구현
- [ ] 3.5.4 OrderRepository.create() 호출
- [ ] 3.5.5 재고 차감 (update_inventory_with_lock RPC)
- [ ] 3.5.6 쿠폰 사용 처리
- [ ] 3.5.7 에러 처리 및 재시도 로직
- [ ] 3.5.8 JSDoc 주석 완료
- [ ] 3.5.9 FUNCTION_QUERY_REFERENCE.md 업데이트

**완료 조건:**
- ✅ 파일 크기 150줄 이하
- ✅ Worker 실행 테스트 성공
- ✅ Git 커밋: `feat: Phase 3.5 - OrderWorker`

---

## 🎨 Phase 4: Presentation Layer (4시간)

### Step 4.1: Checkout 페이지 리팩토링 (60분)

- [ ] 4.1.1 `/app/checkout/page.js` 분석 (1,592줄 → 목표 200줄)
- [ ] 4.1.2 컴포넌트 분리 계획 수립
- [ ] 4.1.3 `/app/components/checkout/OrderSummary.jsx` 생성 (80줄)
- [ ] 4.1.4 `/app/components/checkout/ShippingForm.jsx` 생성 (100줄)
- [ ] 4.1.5 `/app/components/checkout/CouponSelector.jsx` 생성 (90줄)
- [ ] 4.1.6 `/app/components/checkout/PaymentMethodSelector.jsx` 생성 (70줄)
- [ ] 4.1.7 `checkout/page.js` Use Case 사용으로 변경
- [ ] 4.1.8 직접 supabase 호출 제거
- [ ] 4.1.9 파일 크기 검증 (200줄 이하?)
- [ ] 4.1.10 FUNCTION_QUERY_REFERENCE.md 업데이트
- [ ] 4.1.11 Git 커밋: `refactor: Phase 4.1 - Checkout 페이지 리팩토링`

**완료 조건:**
- ✅ checkout/page.js: 200줄 이하
- ✅ 각 컴포넌트: 100줄 이하
- ✅ Use Case만 사용
- ✅ 빌드 성공

---

### Step 4.2: Orders 페이지 리팩토링 (45분)

- [ ] 4.2.1 `/app/orders/page.js` 분석 (854줄 → 목표 200줄)
- [ ] 4.2.2 `/app/components/orders/OrderCard.jsx` 생성 (100줄)
- [ ] 4.2.3 `/app/components/orders/OrderFilter.jsx` 생성 (60줄)
- [ ] 4.2.4 `/app/components/orders/BulkPaymentModal.jsx` 생성 (80줄)
- [ ] 4.2.5 `orders/page.js` Use Case 사용으로 변경
- [ ] 4.2.6 파일 크기 검증
- [ ] 4.2.7 Git 커밋: `refactor: Phase 4.2 - Orders 페이지 리팩토링`

**완료 조건:**
- ✅ orders/page.js: 200줄 이하
- ✅ 빌드 성공

---

### Step 4.3: Admin Deposits 페이지 리팩토링 (50분)

- [ ] 4.3.1 `/app/admin/deposits/page.js` 분석 (1,375줄 → 목표 250줄)
- [ ] 4.3.2 `/app/components/admin/deposits/DepositTable.jsx` 생성 (150줄)
- [ ] 4.3.3 `/app/components/admin/deposits/DepositFilter.jsx` 생성 (80줄)
- [ ] 4.3.4 `/app/components/admin/deposits/BulkApprovalModal.jsx` 생성 (100줄)
- [ ] 4.3.5 Use Case 사용으로 변경
- [ ] 4.3.6 파일 크기 검증
- [ ] 4.3.7 Git 커밋: `refactor: Phase 4.3 - Admin Deposits 리팩토링`

**완료 조건:**
- ✅ admin/deposits/page.js: 250줄 이하
- ✅ 빌드 성공

---

### Step 4.4: Admin Products 페이지 리팩토링 (55분)

- [ ] 4.4.1 `/app/admin/products/new/page.js` 분석 (1,106줄 → 목표 250줄)
- [ ] 4.4.2 `/app/components/admin/products/ProductForm.jsx` 생성 (150줄)
- [ ] 4.4.3 `/app/components/admin/products/VariantManager.jsx` 생성 (120줄)
- [ ] 4.4.4 `/app/components/admin/products/ImageUploader.jsx` 생성 (80줄)
- [ ] 4.4.5 Use Case 사용으로 변경
- [ ] 4.4.6 파일 크기 검증
- [ ] 4.4.7 Git 커밋: `refactor: Phase 4.4 - Admin Products 리팩토링`

**완료 조건:**
- ✅ admin/products/new/page.js: 250줄 이하
- ✅ 빌드 성공

---

### Step 4.5: BuyBottomSheet 컴포넌트 리팩토링 (40분)

- [ ] 4.5.1 `/app/components/product/BuyBottomSheet.jsx` 분석 (961줄 → 목표 200줄)
- [ ] 4.5.2 `/app/components/product/buy/VariantSelector.jsx` 생성 (100줄)
- [ ] 4.5.3 `/app/components/product/buy/QuantitySelector.jsx` 생성 (50줄)
- [ ] 4.5.4 Use Case 사용으로 변경
- [ ] 4.5.5 파일 크기 검증
- [ ] 4.5.6 Git 커밋: `refactor: Phase 4.5 - BuyBottomSheet 리팩토링`

**완료 조건:**
- ✅ BuyBottomSheet.jsx: 200줄 이하
- ✅ 빌드 성공

---

## ⚡ Phase 5: 성능 + 동시성 최적화 (2시간)

### Step 5.1: 데이터 정규화 (order_items) (30분)

- [ ] 5.1.1 `/app/api/orders/create/route.js` 수정
- [ ] 5.1.2 order_items INSERT 시 모든 필드 저장 (title, thumbnail_url, product_number)
- [ ] 5.1.3 `/app/api/orders/list/route.js` 수정
- [ ] 5.1.4 products JOIN 완전 제거
- [ ] 5.1.5 `/supabase/migrations/[timestamp]_backfill_order_items.sql` 생성
- [ ] 5.1.6 기존 2개 주문 데이터 마이그레이션
- [ ] 5.1.7 테스트 (주문 조회 1-2초?)
- [ ] 5.1.8 Git 커밋: `perf: Phase 5.1 - 데이터 정규화 (13s → 1-2s)`

**완료 조건:**
- ✅ 주문 조회: 1-2초 이내
- ✅ products JOIN 완전 제거

---

### Step 5.2: API Route → Use Case 전환 (40min)

- [ ] 5.2.1 `/app/api/orders/create/route.js` Use Case 사용
- [ ] 5.2.2 `/app/api/orders/list/route.js` Use Case 사용
- [ ] 5.2.3 `/app/api/orders/update-status/route.js` Use Case 사용
- [ ] 5.2.4 직접 supabase 호출 모두 제거
- [ ] 5.2.5 파일 크기 검증 (각 200줄 이하)
- [ ] 5.2.6 Git 커밋: `refactor: Phase 5.2 - API Routes Use Case 전환`

**완료 조건:**
- ✅ 모든 API Route: 200줄 이하
- ✅ 직접 DB 접근 0건

---

### Step 5.3: Queue 시스템 통합 (30분)

- [ ] 5.3.1 `/lib/workers/orderWorker.js` 실행 스크립트 생성
- [ ] 5.3.2 `package.json` scripts 추가: `"worker:order": "node lib/workers/orderWorker.js"`
- [ ] 5.3.3 Vercel에서 Worker 실행 설정 (Background Function)
- [ ] 5.3.4 Queue 테스트 (10개 동시 주문)
- [ ] 5.3.5 Git 커밋: `feat: Phase 5.3 - Queue 시스템 통합`

**완료 조건:**
- ✅ Worker 정상 실행
- ✅ 10개 동시 주문 처리 성공

---

### Step 5.4: 프론트엔드 Rate Limiting (20분)

- [ ] 5.4.1 `/hooks/useRateLimit.js` 생성
- [ ] 5.4.2 localStorage 기반 구현
- [ ] 5.4.3 checkout/page.js에 적용
- [ ] 5.4.4 BuyBottomSheet.jsx에 적용
- [ ] 5.4.5 Git 커밋: `feat: Phase 5.4 - Rate Limiting`

**완료 조건:**
- ✅ 1분에 3회 제한 작동
- ✅ Toast 메시지 표시

---

## 🧪 Phase 6: 테스트 + 검증 (2.5시간)

### Step 6.1: Unit 테스트 - Domain (40분)

- [ ] 6.1.1 `/tests/domain/OrderCalculator.test.js` 생성
- [ ] 6.1.2 배송비 계산 테스트 (제주, 울릉도, 일반)
- [ ] 6.1.3 쿠폰 할인 테스트 (percentage, fixed)
- [ ] 6.1.4 무료배송 조건 테스트
- [ ] 6.1.5 모든 테스트 통과 확인
- [ ] 6.1.6 Git 커밋: `test: Phase 6.1 - Domain 테스트`

**완료 조건:**
- ✅ 테스트 커버리지 90% 이상

---

### Step 6.2: Unit 테스트 - Repository (35분)

- [ ] 6.2.1 `/tests/repositories/OrderRepository.test.js` 생성
- [ ] 6.2.2 CRUD 메서드 테스트
- [ ] 6.2.3 에러 처리 테스트
- [ ] 6.2.4 모든 테스트 통과 확인
- [ ] 6.2.5 Git 커밋: `test: Phase 6.2 - Repository 테스트`

**완료 조건:**
- ✅ 테스트 커버리지 85% 이상

---

### Step 6.3: Integration 테스트 - Use Case (45분)

- [ ] 6.3.1 `/tests/use-cases/CreateOrderUseCase.test.js` 생성
- [ ] 6.3.2 정상 주문 생성 테스트
- [ ] 6.3.3 재고 부족 시 에러 테스트
- [ ] 6.3.4 쿠폰 적용 테스트
- [ ] 6.3.5 모든 테스트 통과 확인
- [ ] 6.3.6 Git 커밋: `test: Phase 6.3 - Use Case 테스트`

**완료 조건:**
- ✅ 테스트 커버리지 80% 이상

---

### Step 6.4: E2E 테스트 - 주문 플로우 (30min)

- [ ] 6.4.1 `/tests/e2e/order-flow.test.js` 생성
- [ ] 6.4.2 Playwright 설정
- [ ] 6.4.3 홈 → 상품 선택 → 체크아웃 → 주문 완료 테스트
- [ ] 6.4.4 쿠폰 적용 플로우 테스트
- [ ] 6.4.5 Git 커밋: `test: Phase 6.4 - E2E 테스트`

**완료 조건:**
- ✅ 전체 플로우 통과

---

### Step 6.5: 부하 테스트 - 1000명 동시 접속 (30분)

- [ ] 6.5.1 `/tests/load/order-creation.yml` 생성 (Artillery)
- [ ] 6.5.2 1000명 동시 주문 시뮬레이션
- [ ] 6.5.3 재고 정확성 검증
- [ ] 6.5.4 응답 시간 측정 (p95 < 3초?)
- [ ] 6.5.5 에러율 확인 (< 1%?)
- [ ] 6.5.6 Git 커밋: `test: Phase 6.5 - 부하 테스트`

**완료 조건:**
- ✅ 재고 정확도 100%
- ✅ p95 응답 시간 < 3초
- ✅ 에러율 < 1%

---

## 🚀 Phase 7: 배포 + 모니터링 (1.5시간)

### Step 7.1: 빌드 검증 (15분)

- [ ] 7.1.1 `npm run build` 실행
- [ ] 7.1.2 빌드 에러 0개 확인
- [ ] 7.1.3 ESLint 경고 0개 확인
- [ ] 7.1.4 파일 크기 메트릭 확인
- [ ] 7.1.5 Git 커밋: `chore: Phase 7.1 - 빌드 검증`

**완료 조건:**
- ✅ 빌드 성공
- ✅ 에러 0개

---

### Step 7.2: 환경 변수 설정 (10분)

- [ ] 7.2.1 Vercel 환경 변수 확인
- [ ] 7.2.2 REDIS_URL 추가
- [ ] 7.2.3 SUPABASE_SERVICE_ROLE_KEY 확인
- [ ] 7.2.4 `.env.example` 업데이트

**완료 조건:**
- ✅ 모든 환경 변수 설정됨

---

### Step 7.3: Vercel 배포 (20분)

- [ ] 7.3.1 Git push to main
- [ ] 7.3.2 Vercel 자동 배포 확인
- [ ] 7.3.3 배포 로그 확인
- [ ] 7.3.4 배포 성공 확인

**완료 조건:**
- ✅ 배포 성공

---

### Step 7.4: 프로덕션 검증 (30분)

- [ ] 7.4.1 홈페이지 로딩 속도 확인
- [ ] 7.4.2 주문 생성 테스트 (실제 주문 1건)
- [ ] 7.4.3 주문 조회 속도 확인 (1-2초?)
- [ ] 7.4.4 관리자 페이지 확인
- [ ] 7.4.5 에러 모니터링 (Sentry)

**완료 조건:**
- ✅ 모든 기능 정상 작동
- ✅ 주문 조회 1-2초

---

### Step 7.5: BullBoard 대시보드 설정 (15min)

- [ ] 7.5.1 `/app/admin/queue/page.js` 생성
- [ ] 7.5.2 BullBoard UI 통합
- [ ] 7.5.3 Queue 상태 실시간 모니터링
- [ ] 7.5.4 관리자만 접근 가능하도록 제한

**완료 조건:**
- ✅ Queue 대시보드 작동

---

### Step 7.6: 최종 문서 업데이트 (20분)

- [ ] 7.6.1 FUNCTION_QUERY_REFERENCE.md 최종 검증
- [ ] 7.6.2 ARCHITECTURE_DECISION_RECORD.md 완성
- [ ] 7.6.3 MIGRATION_GUIDE.md 완성
- [ ] 7.6.4 README.md 업데이트
- [ ] 7.6.5 Git 커밋: `docs: Phase 7.6 - 최종 문서`

**완료 조건:**
- ✅ 모든 문서 최신 상태

---

## 📊 최종 검증 체크리스트

### 성능 메트릭

- [ ] 주문 조회: 1-2초 이내 ✅
- [ ] 주문 생성: 3초 이내 ✅
- [ ] 1000명 동시 접속: 재고 정확도 100% ✅
- [ ] 빌드 시간: 20초 이내 ✅

### 코드 품질

- [ ] 모든 페이지: 300줄 이하 ✅
- [ ] 중복 코드: 5% 이하 ✅
- [ ] 레이어 경계 위반: 0건 ✅
- [ ] 테스트 커버리지: 80% 이상 ✅

### 문서 완성도

- [ ] FUNCTION_QUERY_REFERENCE.md: 모든 함수 등록 ✅
- [ ] DEVELOPMENT_PRINCIPLES.md: 최신 ✅
- [ ] 모든 함수: JSDoc 주석 ✅

---

## 🎉 완료!

**총 작업 시간**: 15-18시간
**체크리스트 완료**: 216/216 (100%)

**다음 단계**: 유지보수 모드 진입

---

**최종 업데이트**: 2025-10-21
**버전**: 1.0
