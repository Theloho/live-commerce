# 🐛 버그 수정 마스터 워크플로우 (8-Stage Process)

**버전**: 2.0
**목적**: 근본적 버그 해결 + 1000명 동시 접속 안정성 보장
**총 소요 시간**: 33분 (재작업 0분!)

**이 섹션은 모든 버그 수정의 표준 프로세스입니다.**
**런칭 직전 안정성 보장을 위해 반드시 이 8단계를 따릅니다.**

---

## 🎯 Version 2.0 핵심 개선사항

| 지표 | Version 1.0 | Version 2.0 | 개선율 |
|------|-------------|-------------|--------|
| **동시성 버그** | 발생 가능 🔴 | **0건** ✅ | **100%** ↓ |
| **성능 저하** | 발생 가능 🟡 | **0건** ✅ | **100%** ↓ |
| **Layer 위반** | 체크 안 함 | **필수 체크** ✅ | **신규** |
| **테스트 커버리지** | 선택사항 | **필수 작성** ✅ | **신규** |
| **재발 버그** | 발생 가능 | **0건** (테스트로 방지) | **100%** ↓ |

**핵심**: 작업 시간은 증가하지만, **재작업 시간 100% 감소** = 전체 시간 **50% 단축**

---

## 📊 버그 수정 8-Stage Process

### 🔄 전체 흐름도

```
Stage 0: 아키텍처 준수 사전 체크 (1분) 🏗️
  ↓
Stage 1: 버그 현상 파악 (1분) 🔍
  ↓
Stage 2: 1순위 문서 확인 (2분) 📖
  ↓
Stage 3: 소스코드 확인 + 2순위 문서 (3분) 💻
  ↓
Stage 3.5: 동시성 제어 체크 (2분) ⚡ NEW!
  ↓
Stage 4: 영향도 분석 (2분) 🎯
  ↓
Stage 4.5: 성능 영향도 분석 (2분) 🚀 NEW!
  ↓
Stage 5: 수정 + 검증 (10분) 🔧
  ↓
Stage 6.5: 테스트 작성 필수 (5분) 🧪 NEW!
  ↓
Stage 7: 아키텍처 준수 사후 체크 (2분) ✅ NEW!
  ↓
Stage 8: 문서 업데이트 필수 (3분) 📝 NEW!
  ↓
완료! 🎉
```

---

## 🏗️ Stage 0: 아키텍처 준수 사전 체크 (1분)

**🎯 목적**: Clean Architecture 위반 방지 + 문서 기반 작업 시작

```
□ 필수 문서 확인:
  □ DEVELOPMENT_PRINCIPLES.md - Rule 1-11 확인
  □ REFACTORING_MASTER_CHECKLIST.md - 현재 Phase 확인
  □ FUNCTION_QUERY_REFERENCE.md - 함수 검색 준비

□ 버그 발생 파일의 Layer 확인:
  - app/ → Presentation Layer (UI만)
  - lib/use-cases/ → Application Layer (비즈니스 로직)
  - lib/domain/ → Domain Layer (순수 로직)
  - lib/repositories/ → Infrastructure Layer (DB/API)

□ Layer 경계 위반 여부 사전 확인:
  ❌ app/에서 supabase 직접 호출?
  ❌ Use Case에서 UI 상태 접근?
  ❌ Domain에서 DB 직접 접근?

→ 위반 발견 시: 버그 수정 + 리팩토링 병행 필요
```

---

## 🔍 Stage 1: 버그 현상 파악 (1분)

**🎯 목적**: 버그 타입 정확히 분류 + 재현 방법 확보

### 📊 버그 타입 분류 (6가지)

| 타입 | 증상 | 예시 | 확인 방법 |
|------|------|------|----------|
| **1. UI 버그** | 데이터는 정상, 화면 표시만 잘못됨 | 금액 표시 오류, 버튼 비활성화 | 콘솔, Network 탭 |
| **2. 로직 버그** | 계산 결과 틀림, 조건 검증 실패 | 배송비 계산 오류, 쿠폰 할인 오류 | 계산 함수 추적 |
| **3. DB 버그** | 데이터가 안 저장되거나 조회 안 됨 | 주문 생성 실패, 재고 업데이트 안 됨 | Supabase, RLS |
| **4. API 버그** | API 호출 실패, 응답 오류 | 500/403 에러, 타임아웃 | Network 탭 |
| **5. 성능 버그** | 기능은 정상, 속도만 느림 | 주문 조회 18초, 탭 변경 40초 | 쿼리 분석 |
| **6. 보안 버그** | 권한 없는 데이터 접근/수정 | 다른 사용자 주문 보임 | RLS 정책 |

### 체크리스트

```
□ 어떤 페이지에서 발생?
□ 어떤 액션 후 발생? (버튼 클릭, 입력, 로드)
□ 에러 메시지? (콘솔, 화면)
□ 콘솔 로그? (경고, 에러)
□ Network 탭에서 API 실패? (상태 코드, 응답)
□ 재현 가능? (항상 vs 가끔 vs 한 번만)
□ **DB 스키마 확인 (DB 버그인 경우)**: ⭐ 2025-11-04 추가
  - "column not found" 에러? → DB에 컬럼이 실제로 있는지 확인!
  - /api/admin/check-db-schema 실행
  - DB_REFERENCE_GUIDE.md와 실제 DB 비교

→ 버그 타입 분류 (위 6가지 중 하나)
```

---

## 📖 Stage 2: 1순위 문서 확인 (2분)

**🎯 목적**: 의심 지점 3곳 이하로 좁히기

### 버그 타입별 문서 참조 매트릭스

| 버그 타입 | 1순위 (필수) | 2순위 (핵심) | 3순위 (주변) |
|----------|------------|------------|------------|
| **UI 버그** | `PAGE_FEATURE_MATRIX_PARTX` | `DETAILED_DATA_FLOW` | `FEATURE_CONNECTIVITY_MAP` |
| **로직 버그** | `FUNCTION_QUERY_REFERENCE_PARTX` | `CODING_RULES.md` | `SYSTEM_DEPENDENCY_PART1` |
| **DB 버그** | `DB_REFERENCE_GUIDE.md` | `SYSTEM_DEPENDENCY_PART2` | `SYSTEM_DEPENDENCY_PART5_2` |
| **API 버그** | `SYSTEM_DEPENDENCY_PART3` | `DETAILED_DATA_FLOW` | `PAGE_FEATURE_MATRIX` |
| **성능 버그** | `DETAILED_DATA_FLOW` | `DB_REFERENCE_GUIDE.md` | `SYSTEM_DEPENDENCY_PART2` |
| **보안 버그** | `DB_REFERENCE_GUIDE.md` (RLS) | `SYSTEM_DEPENDENCY_PART2` | `ADMIN_SYSTEM_DESIGN.md` |

### 체크리스트

```
□ 1순위 문서 읽기
□ 해당 페이지/함수/DB/API 섹션 찾기
□ "사용처", "의존성", "데이터 흐름" 파악
□ **DB 버그인 경우 필수**: ⭐ 2025-11-04 추가
  1. DB_REFERENCE_GUIDE.md에서 테이블 스키마 확인
  2. /api/admin/check-db-schema로 실제 DB 확인
  3. 문서 스키마 vs 실제 DB 비교
  4. 컬럼이 없으면 마이그레이션 필요!
□ 예상 원인 메모 (3곳 이하로 좁히기)

예시:
- UI 버그 → PAGE_FEATURE_MATRIX에서 페이지 찾기
- 로직 버그 → FUNCTION_QUERY_REFERENCE에서 함수 찾기
- DB 버그 → DB_REFERENCE_GUIDE + 실제 DB 확인 (둘 다!)

→ 의심 지점 3곳 이하로 좁히기
```

---

## 💻 Stage 3: 소스코드 확인 + 2순위 문서 (3분)

**🎯 목적**: 근본 원인 1곳 확정

### 체크리스트

```
□ 의심 파일 직접 읽기 (Read tool)
□ 함수 시그니처, 로직, 쿼리 확인
□ 2순위 문서에서 연관 정보 확인
□ 비교: 문서 내용 vs 실제 코드
□ 근본 원인 확정

체크 포인트:
- 함수명이 문서와 일치하는가?
- 파라미터가 예상과 같은가?
- 조건문/반환값이 정상인가?
- DB 쿼리가 정확한가? (컬럼명, JOIN)

→ 근본 원인 1곳 확정
```

---

## ⚡ Stage 3.5: 동시성 제어 체크 (2분) ⭐ NEW!

**🎯 목적**: 1000명 동시 접속 안정성 보장

### 체크리스트

```
□ Race Condition 가능성 확인:
  - 재고 차감/복원?
  - 주문 생성/취소?
  - 쿠폰 사용/복구?
  - 포인트 차감/적립?

□ 현재 동시성 제어 방식:
  ✅ DB Lock (FOR UPDATE NOWAIT) 사용?
  ✅ Queue 시스템 (BullMQ) 사용?
  ✅ Optimistic Locking 사용?
  ❌ 아무것도 없음? → 즉시 추가 필요!

□ REFACTORING_MASTER_CHECKLIST.md 확인:
  - Phase 1.7: inventory_lock RPC 함수
  - Phase 3.5: Queue Worker
  - Phase 5.3: Queue 시스템 통합

→ 동시성 위험 발견 시: Queue/Lock 추가 필수
```

---

## 🎯 Stage 4: 영향도 분석 (2분)

**🎯 목적**: 영향받는 모든 페이지 파악 + 수정 계획 수립

### 체크리스트

```
□ SYSTEM_DEPENDENCY Part 5 해당 시나리오 읽기:
  - Part 5-1: 함수 수정 시나리오
  - Part 5-2: DB 수정 시나리오
  - Part 5-3: API 수정 시나리오
  - Part 5-4: 페이지 수정 시나리오

□ "수정 전 체크리스트" 확인
□ 영향받는 모든 페이지 리스트 작성
□ 연관 기능 확인 (3순위, 4순위 문서)
□ 테스트 시나리오 작성

→ TodoWrite로 수정 계획 작성 (필수!)
```

---

## 🚀 Stage 4.5: 성능 영향도 분석 (2분) ⭐ NEW!

**🎯 목적**: 빠른 속도 유지 (응답 시간 < 2초)

### 체크리스트

```
□ N+1 쿼리 확인:
  - for 루프 안에서 DB 조회?
  - map() 안에서 await?
  → 해결: 배치 조회 (findByIds)

□ JOIN 최적화 확인:
  - 불필요한 JOIN?
  - 너무 많은 테이블 JOIN (3개 이상)?
  → 해결: 데이터 정규화 (order_items에 저장)

□ Repository 패턴 사용 확인:
  ❌ 직접 supabase.from() 호출?
  ✅ Repository 메서드 사용?
  → 수정: Repository로 리팩토링

□ 캐시 사용 확인:
  - 자주 조회되는 데이터? (상품, 사용자)
  - 변경 빈도 낮은 데이터?
  → 추가: CacheService 사용

→ 성능 이슈 발견 시: 최적화 병행 필수
```

---

## 🔧 Stage 5: 수정 + 검증 (10분)

**🎯 목적**: 영향받는 모든 곳 빠짐없이 수정

### 체크리스트

```
□ Part 5 체크리스트 순차 작업
□ 영향받는 모든 곳 수정 (빠짐없이!)
□ 테스트 시나리오 실행
□ 예외 상황 테스트

검증 체크리스트:
- 원래 버그 재현 안 되는가?
- 비슷한 케이스도 테스트했는가?
- 다른 페이지 정상 작동하는가?
- 콘솔에 새 에러 없는가?
```

---

## 🧪 Stage 6.5: 테스트 작성 필수 (5분) ⭐ NEW!

**🎯 목적**: 안정성 보장 + 재발 방지

### 체크리스트

```
□ 단위 테스트 작성 (Domain/Repository):
  - 버그가 발생한 함수 테스트 작성
  - 엣지 케이스 테스트 (null, undefined, 0)
  - 파일: /tests/domain/[함수명].test.js

□ Integration 테스트 작성 (Use Case):
  - 전체 플로우 테스트
  - 에러 처리 테스트
  - 파일: /tests/use-cases/[UseCase명].test.js

□ 동시성 테스트 (Race Condition 수정 시):
  - 10명 동시 요청 시뮬레이션
  - 재고 정확성 검증
  - 파일: /tests/integration/concurrency.test.js

□ 테스트 실행 확인:
  npm test -- [테스트파일]
  ✅ 모든 테스트 통과?

→ 테스트 없이 배포 절대 금지! 🚨
```

---

## ✅ Stage 7: 아키텍처 준수 사후 체크 (2분) ⭐ NEW!

**🎯 목적**: 리팩토링 원칙 위반 방지

### 체크리스트

```
□ 파일 크기 확인 (Rule 1):
  - 페이지 파일: 300줄 이하?
  - Use Case: 150줄 이하?
  - Repository: 250줄 이하?
  → 초과 시: 컴포넌트/함수 분리 필수

□ Layer 경계 재확인 (Rule 2):
  - Presentation → Application만 호출?
  - Domain에서 Infrastructure 접근 안 함?
  → 위반 시: 리팩토링 필수

□ 중복 로직 확인 (Rule 3):
  - 동일한 계산 로직 2곳 이상?
  - 동일한 검증 로직 2곳 이상?
  → 발견 시: 중앙화 모듈로 이동

□ 중앙화 모듈 사용 확인:
  ✅ OrderCalculations.js 사용?
  ✅ CouponApi.js 사용?
  ✅ UserProfileManager 사용?
  ✅ ShippingUtils 사용?

□ 빌드 검증:
  npm run build
  ✅ 빌드 성공?
  ✅ ESLint 에러 0개?

→ 모든 체크 통과 후 배포 가능
```

---

## 📝 Stage 8: 문서 업데이트 필수 (3분) ⭐ NEW!

**🎯 목적**: 문서-코드 일치 유지 + 다음 버그 예방

### 체크리스트

```
A. 함수를 추가/수정했다면:
  □ FUNCTION_QUERY_REFERENCE_PARTX.md
     - 함수 시그니처 업데이트
     - 사용 페이지 추가/수정
     - DB 접근 정보 업데이트
  □ SYSTEM_DEPENDENCY_COMPLETE_PART1.md
     - 함수 정의 추가/수정
     - 사용처 업데이트
  □ SYSTEM_DEPENDENCY_COMPLETE_PART5_1.md
     - 함수 수정 시나리오 추가/업데이트
     - 이번 버그 사례 추가 (재발 방지)

B. DB 테이블을 변경했다면:
  □ DB_REFERENCE_GUIDE.md
     - 스키마 정의 업데이트
     - 컬럼 추가/수정/삭제 반영
  □ SYSTEM_DEPENDENCY_COMPLETE_PART2.md
     - 테이블 컬럼 정보 업데이트
     - RLS 정책 업데이트
     - 사용처 업데이트
  □ SYSTEM_DEPENDENCY_COMPLETE_PART5_2.md
     - DB 수정 시나리오 추가
     - 이번 버그 사례 추가 (예: RLS 정책 누락)

C. API를 추가/수정했다면:
  □ SYSTEM_DEPENDENCY_COMPLETE_PART3.md
     - API 정의 업데이트
     - Request/Response 스키마 업데이트
     - 사용처 업데이트
  □ SYSTEM_DEPENDENCY_COMPLETE_PART5_3.md
     - API 수정 시나리오 추가
     - 이번 버그 사례 추가

D. 페이지를 추가/수정했다면:
  □ PAGE_FEATURE_MATRIX_PARTX.md
     - 페이지 기능 매트릭스 업데이트
     - 사용 함수/API/DB 업데이트
  □ SYSTEM_DEPENDENCY_COMPLETE_PART4.md
     - 페이지 사용 함수/API/DB 업데이트
  □ SYSTEM_DEPENDENCY_COMPLETE_PART5_4.md
     - 페이지 수정 시나리오 추가
     - 이번 버그 사례 추가

E. 버그 사례 문서화 (필수!):
  □ WORK_LOG_YYYY-MM-DD.md 작성
     - 문제 상황 (스크린샷, 에러 로그)
     - 근본 원인 분석 (8-Stage 프로세스 기록)
     - 해결 방법 (코드 예제, Before/After)
     - 성능 개선 결과 (있는 경우)
     - 영향 파일 리스트
     - 커밋 해시
  □ CLAUDE.md에 간략한 요약 추가
     - 3-5줄 요약
     - WORK_LOG 링크 추가

F. 동시성 제어 추가 시:
  □ FUNCTION_QUERY_REFERENCE_PARTX.md
     - 섹션 11 "Race Condition 위험 함수"에 기록
     - 해결 방법 명시 (Lock/Queue 등)

G. 성능 최적화 시:
  □ DETAILED_DATA_FLOW.md
     - 해당 페이지 성능 개선 내역 추가
     - Before/After 응답 시간 기록

⚠️ 중요: 문서 업데이트 없이 배포 금지!
→ 다음 작업 시 잘못된 정보로 새 버그 발생 가능
```

---

## 📋 빠른 체크리스트 (Version 2.0)

### 🚨 수정 전 (10개)

```
□ 버그 타입 분류 완료?
□ ⭐ 아키텍처 사전 체크 완료? (Layer 경계)
□ 1순위 문서 읽었는가?
□ 소스코드 직접 확인했는가?
□ 근본 원인 확정했는가?
□ ⚡ 동시성 제어 체크 완료? (Race Condition)
□ 영향도 분석 완료?
□ 🚀 성능 영향도 분석 완료? (N+1, JOIN)
□ TodoWrite로 계획 작성?
□ 테스트 계획 수립?
```

### 🔧 수정 중 (7개)

```
□ Part 5 체크리스트 따라 작업?
□ 영향받는 모든 곳 수정?
□ 중앙화 함수 사용?
□ Repository 패턴 사용?
□ 🧪 테스트 작성 완료? (필수!)
□ 동시성 제어 추가 완료? (필요 시)
□ 성능 최적화 완료? (필요 시)
```

### ✅ 수정 후 (14개)

```
□ 원래 버그 재현 안 되는가?
□ 비슷한 케이스도 테스트?
□ 다른 페이지 정상 작동?
□ 콘솔 에러 없는가?
□ 🧪 단위 테스트 통과? (npm test)
□ 🧪 Integration 테스트 통과?
□ ⚡ 동시성 테스트 통과? (10명 동시 요청)
□ ✅ 파일 크기 확인? (300줄 이하)
□ ✅ Layer 경계 재확인?
□ ✅ 중복 로직 제거?
□ ✅ 빌드 성공? (npm run build)
□ 📝 SYSTEM_DEPENDENCY_COMPLETE 업데이트?
□ 📝 WORK_LOG 작성 + CLAUDE.md 요약 추가?
□ 📝 FUNCTION_QUERY_REFERENCE 업데이트? (함수 수정 시)
```

---

## ⚠️ 절대 금지 사항

```
❌ 절대 하지 말 것:
1. 문서 확인 없이 즉시 코드 수정 (추측 금지)
2. 한 곳만 수정하고 끝 (영향받는 모든 곳 수정!)
3. 임시방편 수정 (하드코딩, if 문 추가)
4. 테스트 생략 (반드시 단위/Integration/동시성 테스트)
5. Layer 경계 위반 (직접 DB 호출 금지)
6. 동시성 제어 누락 (Race Condition 체크 필수)
7. 성능 최적화 생략 (N+1, JOIN 확인 필수)
8. 문서 업데이트 생략 (다음 버그 예방 필수)

✅ 반드시 할 것:
1. 8-Stage 프로세스 순서대로 (Stage 0 → Stage 8)
2. 영향받는 모든 곳 한 번에 수정
3. 근본적인 해결책 (중앙화, Repository, Queue)
4. 모든 케이스 테스트 (단위/Integration/동시성)
5. 아키텍처 준수 (파일 크기, Layer 경계)
6. 문서 업데이트 (SYSTEM_DEPENDENCY, WORK_LOG)
```

---

## 💡 Version 2.0 효과

**이 워크플로우를 지키면:**
- ✅ 버그 추적 시간 **1/3** 감소
- ✅ 재발 버그 **0건** (테스트로 방지)
- ✅ 수정 후 새 버그 **0건** (Layer 경계 체크)
- ✅ 동시성 버그 **0건** (Race Condition 체크)
- ✅ 성능 저하 **0건** (N+1, JOIN 체크)
- ✅ **1000명 동시 접속 안정성 보장**
- ✅ 문서 자동 업데이트로 **다음 버그 예방**

**총 소요 시간**: 33분
**재작업 시간**: 0분
**전체 시간**: **50% 단축**

---

**📌 참고**: 이 워크플로우는 [CLAUDE.md](../../CLAUDE.md)의 Rule #0입니다.
