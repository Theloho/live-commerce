# SYSTEM_DEPENDENCY_COMPLETE - Part 1_2: 중앙 함수 종속성 맵 (Repository)

**목적**: 임기응변 코드 작성 방지 - 중앙 함수 수정 시 영향받는 모든 곳을 명확히 파악

**작성일**: 2025-10-21
**버전**: 2.0 (PART1에서 분할)
**총 5개 Part 중 Part 1_2 (Infrastructure Layer - Repository)**

---

## 📚 문서 구조

- **Part 1**: 중앙 함수 종속성 맵 - **유틸리티 함수** ([PART1.md](./SYSTEM_DEPENDENCY_COMPLETE_PART1.md))
- **Part 1_2 (현재)**: 중앙 함수 종속성 맵 - **Infrastructure Layer** (Repository 메서드)
- **Part 2**: DB 테이블 사용처 맵 - 22개 테이블별 CRUD 위치
- **Part 3**: API 엔드포인트 종속성 맵 - 67개 API의 호출처와 중앙 함수
- **Part 4**: 페이지별 종속성 맵 - 36개 페이지가 사용하는 함수/DB/API
- **Part 5**: 수정 영향도 매트릭스 - X 수정 시 Y, Z 확인 체크리스트

---

## 📋 목차

### 7. OrderRepository.js (7개 메서드) ✅ NEW (Phase 1.1)
- [7.1 findByUser()](#71-findbyuser)
- [7.2 findById()](#72-findbyid)
- [7.3 create()](#73-create)
- [7.4 update()](#74-update)
- [7.5 updateStatus()](#75-updatestatus)
- [7.6 updateMultipleStatus()](#76-updatemultiplestatus)
- [7.7 cancel()](#77-cancel)

### 11. QueueService.js (2개 메서드) ✅ NEW (Phase 1.5)
- [11.1 addJob()](#111-addjob)
- [11.2 getQueuePosition()](#112-getqueueposition)

---

# 7. OrderRepository.js ✅ NEW (Phase 1.1 - 2025-10-21)

**파일 위치**: `/lib/repositories/OrderRepository.js`
**목적**: 주문 데이터 접근 레이어 (Infrastructure Layer) - Service Role 클라이언트로 RLS 우회
**클래스**: `OrderRepository extends BaseRepository`
**마이그레이션**: Phase 1.1 (lib/supabaseApi.js 함수들을 Repository로 이동)

---

## 7.1 findByUser()

**목적**: 사용자 주문 목록 조회 (카카오/Supabase 통합)

**함수 시그니처**:
```javascript
async findByUser(userId = null, orderType = null)
```

**파라미터**:
- `userId` (string | null): Supabase Auth User ID
- `orderType` (string | null): 카카오 주문 타입 (예: 'direct:KAKAO:123456')

**반환값**: `Promise<Array>` - 주문 목록 (order_items, order_shipping, order_payments JOIN)

**사용처** (예정):
- `/app/orders/page.js` - 주문 내역 페이지 (Phase 4.2에서 마이그레이션)
- `/app/mypage/page.js` - 마이페이지 주문 요약 (Phase 4.3에서 마이그레이션)

**연관 DB 테이블**:
- `orders` (SELECT *)
- `order_items` (JOIN)
- `order_shipping` (JOIN)
- `order_payments` (JOIN)

---

## 7.2 findById()

**목적**: 주문 상세 조회 (단일 주문 + 모든 관계 데이터)

**함수 시그니처**:
```javascript
async findById(orderId)
```

**사용처** (예정):
- `/app/orders/[id]/complete/page.js` - 주문 완료 페이지 (Phase 4.2)
- `/app/admin/orders/[id]/page.js` - 관리자 주문 상세 (Phase 4.3)

**연관 DB 테이블**: 7.1과 동일

---

## 7.3 create()

**목적**: 새 주문 생성 (4개 테이블 INSERT)

**함수 시그니처**:
```javascript
async create({ orderData, orderItems, payment, shipping })
```

**파라미터**:
- `orderData` (Object): orders 테이블 데이터
- `orderItems` (Array): order_items 배열
- `payment` (Object): order_payments 데이터
- `shipping` (Object): order_shipping 데이터

**반환값**: `Promise<Object>` - 생성된 주문 (ID 포함)

**사용처** (예정):
- `lib/use-cases/order/CreateOrderUseCase.js` (Phase 3.3에서 생성)

**연관 DB 테이블**:
- `orders` (INSERT)
- `order_items` (INSERT)
- `order_shipping` (INSERT)
- `order_payments` (INSERT)

**⚠️ 주의사항**:
- 현재 트랜잭션 미구현 - Phase 3.3에서 Use Case로 이동 시 추가 필요
- 재고 감소는 Use Case에서 처리

---

## 7.4 update()

**목적**: 주문 정보 수정 (범용 메서드)

**함수 시그니처**:
```javascript
async update(orderId, data)
```

**사용처**: 현재 미사용 (향후 확장용)

---

## 7.5 updateStatus()

**목적**: 주문 상태 변경 (타임스탬프 자동 기록)

**함수 시그니처**:
```javascript
async updateStatus(orderId, status)
```

**파라미터**:
- `orderId` (string): 주문 ID
- `status` (string): 'pending' | 'deposited' | 'shipped' | 'delivered' | 'cancelled'

**자동 기록 타임스탬프**:
- `deposited` → `deposited_at`
- `shipped` → `shipped_at`
- `delivered` → `delivered_at`
- `cancelled` → `cancelled_at`

**사용처** (예정):
- `/app/admin/orders/page.js` - 관리자 상태 변경 (Phase 4.3)
- `/app/admin/deposits/page.js` - 입금확인 (Phase 4.3)

**연관 DB 테이블**:
- `orders` (UPDATE: status, {status}_at)

**로깅**:
- 🕐 pending
- 💰 deposited
- 🚚 shipped
- ✅ delivered
- ❌ cancelled

---

## 7.6 updateMultipleStatus()

**목적**: 여러 주문 일괄 상태 변경 (입금확인 시 사용)

**함수 시그니처**:
```javascript
async updateMultipleStatus(orderIds, status)
```

**파라미터**:
- `orderIds` (Array<string>): 주문 ID 배열
- `status` (string): 변경할 상태

**반환값**: `Promise<number>` - 수정된 주문 개수

**사용처** (예정):
- `/app/admin/deposits/page.js` - 일괄 입금확인 (Phase 4.3)

**연관 DB 테이블**:
- `orders` (UPDATE: status, WHERE id IN (orderIds))

---

## 7.7 cancel()

**목적**: 주문 취소 (상태만 변경, 재고/쿠폰 복구는 Use Case에서 처리)

**함수 시그니처**:
```javascript
async cancel(orderId)
```

**사용처** (예정):
- `/app/orders/page.js` - 주문 내역 취소 버튼 (Phase 4.2)
- `lib/use-cases/order/CancelOrderUseCase.js` (Phase 3.4에서 생성)

**연관 DB 테이블**:
- `orders` (UPDATE: status = 'cancelled', cancelled_at)

**⚠️ 주의사항**:
- 재고 복원, 쿠폰 복구는 Phase 3.4 CancelOrderUseCase에서 처리 예정
- Repository는 단순 상태 변경만 담당

---

**OrderRepository 수정 시 전체 체크리스트**:
- [ ] Service Role 클라이언트(supabaseAdmin) 사용하는가?
- [ ] DatabaseError로 에러 처리하는가?
- [ ] 파일 크기 250줄 이하 유지하는가? (Rule 1)
- [ ] JSDoc 주석 완료되었는가?
- [ ] 트랜잭션이 필요한 작업인가? (Phase 3에서 Use Case로 이동)

---

## ✅ Part 1 작성 완료

**다음 작업**: Part 2 (DB 테이블 사용처 맵) 작성

**Part 1 요약**:
- 총 48개 중앙 함수/메서드 문서화 (41개 유틸 함수 + 7개 OrderRepository)
- 사용처 파일 경로 + 라인 번호 명시
- 내부 호출 함수, 연관 DB 테이블, 수정 체크리스트 포함
- 테스트 시나리오, 과거 버그 사례 포함
- ✅ Phase 1.1 완료: OrderRepository 추가 (2025-10-21)

**문서 크기**: 약 2,000 줄 (적정 크기)

---

## ✅ Part 1_2 작성 완료

**이전 문서**: [SYSTEM_DEPENDENCY_COMPLETE_PART1.md](./SYSTEM_DEPENDENCY_COMPLETE_PART1.md) - 유틸리티 함수

**Part 1_2 요약**:
- 총 7개 OrderRepository 메서드 문서화 (Phase 1.1 완료)
- 사용처 파일 경로 + 라인 번호 명시
- 연관 DB 테이블, 수정 체크리스트 포함
- Service Role 클라이언트로 RLS 우회

**문서 크기**: 약 240 줄 (적정 크기 ✅)

**다음 추가 예정**:
- Phase 1.2: ProductRepository (4개 메서드)
- Phase 1.3: UserRepository (2개 메서드)
- Phase 1.4: CouponRepository (4개 메서드)
- ✅ Phase 1.5: QueueService (2개 메서드) - 추가 완료 (2025-10-21)

---

# 11. QueueService.js ✅ NEW (Phase 1.5 - 2025-10-21)

**파일 위치**: `/lib/services/QueueService.js`
**목적**: Queue 작업 관리 레이어 (Infrastructure Layer) - BullMQ + Upstash Redis 기반
**클래스**: `QueueService` (static 메서드만 포함)
**마이그레이션**: Phase 1.5 (신규 생성, 기존 함수 없음)

---

## 11.1 addJob()

**목적**: Queue에 비동기 작업 추가 (이메일, 알림, 배치 처리 등)

**함수 시그니처**:
```javascript
static async addJob(queueName, data, options = {})
```

**파라미터**:
- `queueName` (string): Queue 이름 (예: 'email', 'notification', 'order-processing')
- `data` (Object): 작업 데이터
- `options` (Object): BullMQ 작업 옵션
  - `priority` (number): 우선순위 (1 = 최고, 낮을수록 우선)
  - `delay` (number): 지연 시간 (ms)

**반환값**: `Promise<{jobId: string, position: number}>` - 작업 ID 및 Queue 내 위치

**사용처** (예정):
- `lib/use-cases/notification/SendEmailUseCase.js` (Phase 3.x)
- `lib/use-cases/order/ProcessOrderUseCase.js` (Phase 3.x)

**연관 시스템**:
- Redis (Upstash Redis REST API)
- BullMQ Queue 인스턴스

**내부 호출 함수**:
- `getQueue(queueName)` - Queue 인스턴스 조회 (캐시 사용)
- `queue.add('process', data, options)` - BullMQ 작업 추가
- `getQueuePosition(queueName, jobId)` - 작업 위치 조회

**수정 시 체크리스트**:
- [ ] Redis 연결 정보 (환경변수) 확인하는가?
- [ ] try-catch로 에러 처리하는가?
- [ ] 로깅 추가했는가? (✅/❌ 이모지)
- [ ] Queue 옵션 기본값 적절한가? (attempts: 3, backoff: exponential)

---

## 11.2 getQueuePosition()

**목적**: Queue 내 작업 위치 조회 (사용자 대기 순서 표시용)

**함수 시그니처**:
```javascript
static async getQueuePosition(queueName, jobId)
```

**파라미터**:
- `queueName` (string): Queue 이름
- `jobId` (string): 작업 ID

**반환값**: `Promise<number>` - Queue 내 위치 (0 = 다음 실행, -1 = 완료/실패)

**사용처** (예정):
- `/app/api/queue-status/route.js` (Phase 3.x) - Queue 상태 API

**내부 호출 함수**:
- `queue.getJob(jobId)` - BullMQ 작업 조회
- `queue.getWaiting()` - 대기 중인 작업 목록
- `waitingJobs.findIndex()` - 위치 계산

**수정 시 체크리스트**:
- [ ] 작업 없음 케이스 처리 (-1 반환)
- [ ] try-catch로 에러 처리
- [ ] 로깅 추가 (⚠️ 작업 없음)

---

**QueueService 수정 시 전체 체크리스트**:
- [ ] Redis 연결 정보 환경변수 확인 (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
- [ ] 파일 크기 100줄 이하 유지 (Rule 1) - 현재 91줄 ✅
- [ ] JSDoc 주석 완료
- [ ] try-catch로 모든 에러 처리
- [ ] Queue 인스턴스 캐싱 유지 (성능 최적화)
- [ ] BullMQ 기본 옵션 확인 (attempts, backoff, removeOnComplete, removeOnFail)

