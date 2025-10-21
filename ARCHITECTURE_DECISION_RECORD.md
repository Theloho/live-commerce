# 🏛️ 아키텍처 결정 기록 (Architecture Decision Record)

**버전**: 1.0
**작성일**: 2025-10-21
**목적**: 주요 아키텍처 결정 사항을 기록하여 향후 참조 및 유지보수 용이성 확보

---

## 📖 ADR 형식

각 결정 사항은 다음 형식을 따릅니다:

```
## ADR-XXX: [결정 제목]

**날짜**: YYYY-MM-DD
**상태**: [제안됨 | 승인됨 | 폐기됨 | 대체됨]
**결정자**: [이름]

### 맥락 (Context)
- 왜 이 결정이 필요했는가?
- 어떤 문제를 해결하려고 하는가?

### 결정 (Decision)
- 무엇을 선택했는가?
- 어떻게 구현할 것인가?

### 대안 (Alternatives)
- 고려했던 다른 옵션들
- 왜 선택하지 않았는가?

### 결과 (Consequences)
- 긍정적 효과
- 부정적 효과 (트레이드오프)

### 참조 (References)
- 관련 문서, 이슈, PR
```

---

## 📚 결정 사항 목록

### ADR-001: Clean Architecture 도입

**날짜**: 2025-10-21
**상태**: 승인됨
**결정자**: 개발팀

#### 맥락 (Context)

현재 시스템의 문제점:
- `lib/supabaseApi.js` 2,673 lines - God Object 패턴
- UI 컴포넌트에서 DB 직접 접근 (레이어 경계 위반)
- 중복 로직 다수 (배송비 계산, 주문 생성 등)
- 테스트 불가능한 구조 (의존성 주입 없음)
- 1000명 동시 접속 대응 불가 (Race Condition)

#### 결정 (Decision)

4-Layer Clean Architecture 적용:

```
Presentation Layer (app/)
  ↓ 의존
Application Layer (lib/use-cases/)
  ↓ 의존
Domain Layer (lib/domain/)
  ↓ 의존
Infrastructure Layer (lib/repositories/, lib/services/)
```

**핵심 원칙**:
1. 의존성은 항상 안쪽(Domain)을 향함
2. Domain Layer는 다른 레이어를 알지 못함
3. Infrastructure는 Domain 인터페이스를 구현

#### 대안 (Alternatives)

**1. MVC 패턴**
- 장점: 간단함, Next.js App Router와 잘 맞음
- 단점: 비즈니스 로직이 Controller에 집중됨, 테스트 어려움
- 선택 안 한 이유: 대규모 시스템에 부적합

**2. Hexagonal Architecture**
- 장점: Port/Adapter 명확히 분리
- 단점: 러닝 커브 높음, 보일러플레이트 많음
- 선택 안 한 이유: 팀 규모 대비 과도함

**3. 현재 구조 유지 + 리팩토링만**
- 장점: 변경 최소화
- 단점: 근본적 문제 해결 안 됨
- 선택 안 한 이유: 기술 부채 누적

#### 결과 (Consequences)

**긍정적 효과**:
- ✅ 테스트 가능한 구조 (의존성 주입)
- ✅ 비즈니스 로직 중앙화 (중복 제거)
- ✅ 레이어 경계 명확 (ESLint 검증 가능)
- ✅ 확장성 확보 (새 기능 추가 용이)
- ✅ 동시성 제어 구현 가능 (Repository 레벨)

**부정적 효과**:
- ❌ 초기 개발 시간 증가 (15-18시간 예상)
- ❌ 파일 개수 증가 (80+ 새 파일 생성)
- ❌ 팀 학습 필요 (Clean Architecture 이해)

**마이그레이션 전략**:
- Phase별 점진적 마이그레이션 (7 Phases)
- 기존 코드 유지하며 새 레이어 구축
- 완료 후 레거시 코드 제거

#### 참조 (References)

- DEVELOPMENT_PRINCIPLES.md - Rule 2 (레이어 경계)
- REFACTORING_MASTER_CHECKLIST.md - Phase 0-7
- FUNCTION_QUERY_REFERENCE.md - 84개 함수 마이그레이션 계획

---

### ADR-002: Repository 패턴 적용

**날짜**: 2025-10-21
**상태**: 승인됨
**결정자**: 개발팀

#### 맥락 (Context)

현재 데이터 접근 문제점:
- Supabase 클라이언트 직접 사용 (app/ 레이어에서)
- 쿼리 로직 중복 (동일한 JOIN이 여러 곳에)
- 트랜잭션 관리 어려움
- 테스트 시 실제 DB 필요 (Mock 불가)

#### 결정 (Decision)

Repository 패턴 도입:

```javascript
// lib/repositories/OrderRepository.js
export class OrderRepository extends BaseRepository {
  tableName = 'orders'

  async findByUser(userId) {
    return this.executeQuery(async () => {
      return await supabaseAdmin
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
    })
  }
}
```

**핵심 기능**:
1. BaseRepository - 공통 CRUD 로직
2. executeQuery - 에러 핸들링 일원화
3. Service Role 사용 - RLS 우회 (성능)

#### 대안 (Alternatives)

**1. Active Record 패턴**
- 장점: 코드 간결, ORM과 유사
- 단점: 도메인 모델과 DB 강결합
- 선택 안 한 이유: Clean Architecture 위배

**2. Data Mapper 패턴**
- 장점: 도메인 모델 완전 분리
- 단점: 매핑 로직 복잡, 보일러플레이트 많음
- 선택 안 한 이유: JavaScript에서 과도함

**3. Query Builder (Prisma 등)**
- 장점: 타입 안정성, 마이그레이션 자동화
- 단점: Supabase RLS와 충돌, 러닝 커브
- 선택 안 한 이유: 기존 Supabase 인프라 활용

#### 결과 (Consequences)

**긍정적 효과**:
- ✅ 쿼리 로직 중앙화 (중복 제거)
- ✅ 테스트 용이 (Mock Repository 가능)
- ✅ 에러 핸들링 일원화 (DatabaseError)
- ✅ Service Role 사용으로 성능 향상 (RLS 우회)
- ✅ 트랜잭션 관리 용이

**부정적 효과**:
- ❌ 추상화 레이어 추가 (약간의 오버헤드)
- ❌ Repository 클래스 10+ 개 생성 필요

#### 참조 (References)

- lib/repositories/BaseRepository.js (270 lines)
- REFACTORING_MASTER_CHECKLIST.md - Phase 1 (Infrastructure Layer)

---

### ADR-003: BullMQ + Upstash Redis 도입 (동시성 제어)

**날짜**: 2025-10-21
**상태**: 승인됨
**결정자**: 개발팀

#### 맥락 (Context)

동시성 문제:
- **Race Condition**: 재고 차감 시 동시 주문 발생
- **현재 상황**: 1000명 동시 접속 시 재고 오류 발생 가능
- **요구사항**: 1000명 동시 접속 대응

#### 결정 (Decision)

2단계 동시성 제어:

**1단계: FOR UPDATE NOWAIT (Phase 1.7)**
```sql
SELECT * FROM products WHERE id = $1 FOR UPDATE NOWAIT
```
- 행 레벨 락으로 동시 재고 차감 방지
- NOWAIT: 대기 없이 즉시 에러 반환

**2단계: BullMQ Queue (Phase 5.3)**
```javascript
// lib/queue/orderQueue.js
export const orderQueue = new Queue('orders', {
  connection: upstashRedis
})
```
- 주문 요청을 Queue에 적재
- Worker가 순차 처리 (FIFO)
- Vercel Serverless 환경에서 작동

#### 대안 (Alternatives)

**1. Optimistic Locking (낙관적 락)**
- 장점: 락 오버헤드 없음
- 단점: 충돌 시 재시도 필요, 사용자 경험 나쁨
- 선택 안 한 이유: 1000명 동시 접속 시 충돌률 높음

**2. Redis Distributed Lock**
- 장점: 분산 환경에 적합
- 단점: Redis 추가 비용, 복잡도 증가
- 선택 안 한 이유: FOR UPDATE로 충분

**3. AWS SQS + Lambda**
- 장점: 완전 관리형, 확장성 무한
- 단점: AWS 종속, 비용 증가
- 선택 안 한 이유: Vercel + Upstash 조합 충분

#### 결과 (Consequences)

**긍정적 효과**:
- ✅ Race Condition 완전 해결
- ✅ 1000명 동시 접속 대응 가능
- ✅ Upstash 무료 플랜 사용 가능 (월 10,000 요청)
- ✅ Vercel Serverless와 호환

**부정적 효과**:
- ❌ Queue 처리 시 약간의 지연 발생
- ❌ Redis 인프라 추가 (모니터링 필요)
- ❌ Worker 프로세스 관리 필요

**롤백 전략**:
- Phase 1.7만 적용하고 Phase 5.3은 필요 시 추가
- FOR UPDATE NOWAIT만으로도 100-200명 동시 접속 가능

#### 참조 (References)

- REFACTORING_MASTER_CHECKLIST.md - Phase 1.7, Phase 5.3
- package.json - bullmq v5.61.0, @upstash/redis v1.35.6

---

### ADR-004: ESLint Boundaries 플러그인 (레이어 경계 강제)

**날짜**: 2025-10-21
**상태**: 승인됨
**결정자**: 개발팀

#### 맥락 (Context)

레이어 경계 위반 문제:
- UI에서 DB 직접 접근 (app/checkout/page.js → supabase.from())
- Use Case에서 UI 상태 접근
- 수동 코드 리뷰로만 검증 (자동화 부족)

#### 결정 (Decision)

ESLint 플러그인으로 레이어 경계 자동 검증:

```javascript
// eslint.config.mjs
{
  plugins: ['boundaries'],
  settings: {
    'boundaries/elements': [
      { type: 'app', pattern: 'app/*' },
      { type: 'use-cases', pattern: 'lib/use-cases/*' },
      { type: 'domain', pattern: 'lib/domain/*' },
      { type: 'infrastructure', pattern: 'lib/repositories/*' }
    ]
  },
  rules: {
    'boundaries/element-types': [2, {
      default: 'disallow',
      rules: [
        { from: 'app', allow: ['use-cases'] },
        { from: 'use-cases', allow: ['domain', 'infrastructure'] },
        { from: 'domain', allow: [] },
        { from: 'infrastructure', allow: ['domain'] }
      ]
    }]
  }
}
```

#### 대안 (Alternatives)

**1. 수동 코드 리뷰만**
- 장점: 설정 불필요
- 단점: 실수 발생 가능, 일관성 부족
- 선택 안 한 이유: 자동화 필요

**2. TypeScript Path Mapping**
- 장점: import 경로 제한 가능
- 단점: 런타임 검증 불가
- 선택 안 한 이유: ESLint가 더 강력

#### 결과 (Consequences)

**긍정적 효과**:
- ✅ 레이어 경계 위반 시 빌드 실패
- ✅ 개발 중 즉시 피드백 (IDE 경고)
- ✅ 아키텍처 일관성 보장

**부정적 효과**:
- ❌ 초기 설정 복잡도 증가
- ❌ 일부 합법적인 패턴도 막힐 수 있음

#### 참조 (References)

- DEVELOPMENT_PRINCIPLES.md - Rule 2
- package.json - eslint-plugin-boundaries v5.1.0

---

### ADR-005: 점진적 마이그레이션 전략 (7 Phases)

**날짜**: 2025-10-21
**상태**: 승인됨
**결정자**: 개발팀

#### 맥락 (Context)

리팩토링 위험:
- 전체 시스템 2,673 lines + 84개 함수
- 운영 중인 서비스 (중단 불가)
- 버그 발생 시 롤백 어려움

#### 결정 (Decision)

7 Phase 점진적 마이그레이션:

```
Phase 0: 문서 + 아키텍처 설계 (2시간) ✅ 진행 중
Phase 1: Infrastructure Layer (3시간)
Phase 2: Domain Layer (2.5시간)
Phase 3: Application Layer (3시간)
Phase 4: Presentation Layer (3.5시간)
Phase 5: 성능 + 동시성 (1.5시간)
Phase 6: 테스트 + 검증 (2시간)
Phase 7: 배포 + 모니터링 (1시간)

총 18.5시간 (약 3일)
```

**핵심 원칙**:
1. 기존 코드 유지하며 새 레이어 구축
2. 각 Phase마다 Git 커밋
3. 각 Phase마다 검증 (테스트 실행)
4. 레거시 코드는 마지막에 제거

#### 대안 (Alternatives)

**1. Big Bang 리팩토링**
- 장점: 빠름
- 단점: 위험도 극대 높음, 롤백 어려움
- 선택 안 한 이유: 운영 중인 서비스

**2. Strangler Fig 패턴 (긴 기간)**
- 장점: 위험도 최소
- 단점: 6개월+ 소요, 중복 코드 오래 유지
- 선택 안 한 이유: 시간 제약

#### 결과 (Consequences)

**긍정적 효과**:
- ✅ 각 단계마다 검증 가능
- ✅ 롤백 용이 (Git 커밋 단위)
- ✅ 팀원 학습 시간 확보
- ✅ 운영 중단 없음

**부정적 효과**:
- ❌ 일시적으로 중복 코드 존재 (레거시 + 새 코드)
- ❌ Phase 완료까지 3일 소요

#### 참조 (References)

- REFACTORING_MASTER_CHECKLIST.md - 전체 216개 항목
- MIGRATION_GUIDE.md - 마이그레이션 세부 가이드

---

## 📝 ADR 작성 가이드

### 언제 ADR을 작성하는가?

다음 경우에 ADR을 작성합니다:
- ✅ 새로운 라이브러리/프레임워크 도입
- ✅ 아키텍처 패턴 변경
- ✅ 주요 인프라 결정 (DB, Queue, Cache 등)
- ✅ 성능/보안/확장성에 영향을 주는 결정

### ADR 번호 부여 규칙

- `ADR-001`, `ADR-002` ... 순차적으로 증가
- 폐기된 ADR도 번호 유지 (재사용 금지)
- 대체된 경우 "대체됨" 상태 + 새 ADR 참조 추가

### ADR 상태 변경

```
제안됨 (Proposed)
  ↓
승인됨 (Accepted) → 폐기됨 (Deprecated) → 대체됨 (Superseded by ADR-XXX)
```

---

**마지막 업데이트**: 2025-10-21
**다음 리뷰**: Phase 1 완료 후
