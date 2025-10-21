# 🏛️ 개발 원칙 - 절대 위반 금지

**버전**: 1.0
**작성일**: 2025-10-21
**목적**: 근본적이고 체계적인 개발을 위한 강력한 규칙

---

## 📜 핵심 철학

> "임시방편은 기술 부채가 된다. 근본적으로 해결하거나 하지 마라."

### 3가지 절대 원칙

1. **분리의 원칙** (Separation of Concerns)
   - 한 파일은 한 가지 책임만 (Single Responsibility)
   - UI, 비즈니스 로직, 데이터 접근 = 완전히 분리

2. **명시의 원칙** (Explicit is Better Than Implicit)
   - 모든 의존성은 명시적으로 주입
   - 숨겨진 전역 상태 금지
   - 매직 넘버/스트링 금지

3. **문서의 원칙** (Documentation First)
   - 코드 작성 전 체크리스트 확인
   - 코드 수정 후 문서 업데이트
   - 참조 관계 항상 기록

---

## 🚫 절대 금지 규칙 (NEVER)

### Rule 1: 파일 크기 제한 (엄격)

```
❌ 절대 금지:
- 페이지 컴포넌트: 300줄 초과
- Use Case: 150줄 초과
- Repository: 250줄 초과
- 도메인 모델: 200줄 초과

✅ 초과 시:
1. 즉시 분리 (컴포넌트화 또는 함수 분리)
2. REFACTORING_MASTER_CHECKLIST.md 업데이트
3. 리뷰 후 커밋
```

**위반 시**: PR 거부, 즉시 리팩토링 요구

---

### Rule 2: 레이어 경계 위반 금지 (엄격)

```
❌ 절대 금지:
- Presentation → Infrastructure (UI에서 DB 직접 호출)
- Application → Presentation (Use Case에서 UI 상태 접근)
- Domain → Infrastructure (비즈니스 로직에서 DB 접근)

✅ 올바른 의존성:
Presentation → Application → Domain → Infrastructure
    ↓             ↓           ↓            ↓
   UI만      비즈니스 로직   순수 로직   DB/API

예시:
❌ app/checkout/page.js에서 supabase.from('orders').insert()
✅ app/checkout/page.js → CreateOrderUseCase → OrderRepository
```

**위반 시**: 빌드 실패하도록 ESLint 규칙 설정

---

### Rule 3: 중복 로직 금지 (엄격)

```
❌ 절대 금지:
- 동일한 계산 로직이 2곳 이상 존재
- 동일한 검증 로직이 2곳 이상 존재
- 동일한 데이터 조회 로직이 2곳 이상 존재

✅ 발견 시:
1. 즉시 중앙화 (Domain 또는 Use Case로 이동)
2. FUNCTION_QUERY_REFERENCE.md에 등록
3. 모든 호출처 수정

예시:
❌ 3개 페이지에서 각각 배송비 계산
✅ ShippingCalculator.calculate() 한 곳에서만
```

**검증 방법**: `npx jscpd` 실행 → 중복률 5% 이하 유지

---

### Rule 4: God Object 금지 (엄격)

```
❌ 절대 금지:
- 하나의 파일에 10개 이상의 함수
- 하나의 클래스에 15개 이상의 메서드
- 하나의 Repository에 20개 이상의 쿼리

✅ 초과 시:
1. 즉시 분리 (기능별로 파일 분리)
2. 명확한 네이밍 (OrderRepository, ProductRepository)
3. 각 파일은 하나의 Aggregate만 담당

예시:
❌ supabaseApi.js (2,673줄, 80개 함수)
✅ OrderRepository.js (200줄, 8개 메서드)
✅ ProductRepository.js (180줄, 7개 메서드)
```

---

### Rule 5: 직접 DB 접근 금지 (엄격)

```
❌ 절대 금지:
- 페이지에서 supabase.from() 직접 호출
- 컴포넌트에서 SQL 쿼리 실행
- Use Case에서 supabase 직접 사용

✅ 반드시:
- Repository를 통해서만 DB 접근
- Repository는 Infrastructure Layer에만 존재
- 모든 쿼리는 FUNCTION_QUERY_REFERENCE.md에 등록

예시:
❌ const { data } = await supabase.from('orders').select()
✅ const orders = await orderRepository.findByUser(userId)
```

---

### Rule 6: 매직 값 금지 (엄격)

```
❌ 절대 금지:
- 하드코딩된 숫자: if (status === 1)
- 하드코딩된 문자열: if (type === 'pending')
- 하드코딩된 설정: const timeout = 30000

✅ 반드시:
- 상수로 정의: ORDER_STATUS.PENDING
- Enum 사용: OrderStatusEnum.PENDING
- 설정 파일: config.order.timeout

예시:
❌ if (postalCode.startsWith('63')) return 7000
✅ if (PostalCode.isJeju(postalCode)) return SHIPPING_RATES.JEJU
```

---

### Rule 7: 에러 처리 필수 (엄격)

```
❌ 절대 금지:
- try-catch 없는 async 함수
- 에러 무시: catch (e) {}
- 일반 Error: throw new Error('failed')

✅ 반드시:
- 모든 async 함수는 try-catch
- 의미있는 에러: throw new InsufficientInventoryError()
- 에러 로깅: logger.error()

예시:
❌ async function createOrder() { await repo.create() }
✅ async function createOrder() {
     try {
       await repo.create()
     } catch (error) {
       logger.error('Order creation failed', { error, context })
       throw new OrderCreationError(error.message)
     }
   }
```

---

## ✅ 필수 준수 규칙 (MUST)

### Rule 8: 파일명 규칙 (엄격)

```
✅ 반드시 준수:

1. Use Case:
   - 파일명: [동사][명사]UseCase.js
   - 예시: CreateOrderUseCase.js, ApplyCouponUseCase.js

2. Repository:
   - 파일명: [Entity]Repository.js
   - 예시: OrderRepository.js, ProductRepository.js

3. Domain:
   - Entity: [Entity].js (대문자 시작)
   - Service: [Entity]Calculator.js, [Entity]Validator.js

4. Component:
   - 폴더명: kebab-case (order-summary/)
   - 파일명: PascalCase (OrderSummary.jsx)

5. Hook:
   - 파일명: use[기능].js
   - 예시: useOrderCalculation.js
```

---

### Rule 9: Import 순서 (엄격)

```
✅ 반드시 이 순서:

1. React/Next.js
import React from 'react'
import { useRouter } from 'next/navigation'

2. External Libraries
import { toast } from 'react-hot-toast'

3. Internal - Absolute Imports
import { CreateOrderUseCase } from '@/lib/use-cases/order/CreateOrderUseCase'
import { Order } from '@/lib/domain/order/Order'

4. Internal - Relative Imports
import { OrderSummary } from './OrderSummary'

5. Styles/Assets
import styles from './checkout.module.css'

6. Types (if TypeScript)
import type { OrderData } from '@/types'
```

---

### Rule 10: 함수 시그니처 규칙 (엄격)

```
✅ 반드시:

1. 파라미터 3개 초과 시 객체 사용:
   ❌ function create(a, b, c, d, e)
   ✅ function create({ itemA, itemB, itemC, itemD, itemE })

2. 반환값 명시:
   ❌ async function getOrder(id)
   ✅ async function getOrder(id): Promise<Order>

3. JSDoc 주석 (모든 public 함수):
   /**
    * 주문을 생성합니다.
    * @param {OrderData} orderData - 주문 데이터
    * @param {User} user - 사용자 정보
    * @returns {Promise<Order>} 생성된 주문
    * @throws {InsufficientInventoryError} 재고 부족 시
    */
   async function createOrder({ orderData, user })
```

---

### Rule 11: 레거시 파일 관리 (엄격)

```
❌ 절대 금지:
- 사용하지 않는 파일을 app/ 또는 lib/에 방치
- 혼동을 줄 수 있는 구 버전 파일 유지
- .bak, .backup, .old 파일을 프로젝트 루트에 보관
- 레거시 함수를 남겨두고 새 함수와 공존

✅ 반드시:
- 더 이상 사용하지 않는 파일은 /deprecated/ 폴더로 이동
- 파일명에 이동 날짜 추가 (예: supabaseApi.DEPRECATED.20251021.js)
- DEPRECATED_FILES.md에 이동 이유와 날짜 기록
- 대체 파일 경로 명확히 안내
- 레거시 함수에 @deprecated JSDoc 태그 추가

예시:
❌ lib/supabaseApi.js.bak (프로젝트 루트에 백업 파일)
✅ /deprecated/lib/supabaseApi.DEPRECATED.20251021.js

레거시 함수 예시:
/**
 * @deprecated 2025-10-21 - useAuth hook으로 대체됨
 * @see hooks/useAuth.js
 */
export const getCurrentUser = async () => { ... }
```

**위반 시**: 리팩토링 시 혼동 발생, PR 거부

---

## 📋 코드 작성 체크리스트

### 새 기능 추가 시 (순서대로)

```
□ 1. REFACTORING_MASTER_CHECKLIST.md 확인
□ 2. 해당 레이어 체크리스트 확인
□ 3. FUNCTION_QUERY_REFERENCE.md에서 기존 함수 검색
□ 4. 중복 없으면 새 함수 작성
□ 5. 파일 크기 확인 (Rule 1)
□ 6. 레이어 경계 확인 (Rule 2)
□ 7. 테스트 작성
□ 8. FUNCTION_QUERY_REFERENCE.md 업데이트
□ 9. Git 커밋 (체크리스트 번호 포함)
□ 10. 문서 검증
```

---

### 기존 코드 수정 시 (순서대로)

```
□ 1. FUNCTION_QUERY_REFERENCE.md에서 함수 찾기
□ 2. "사용처" 확인 (몇 개 페이지가 영향받는가?)
□ 3. 영향받는 모든 페이지 리스트 작성
□ 4. 수정 전 테스트 실행
□ 5. 함수 수정
□ 6. 영향받는 모든 페이지 확인
□ 7. 수정 후 테스트 실행
□ 8. FUNCTION_QUERY_REFERENCE.md 업데이트
□ 9. Git 커밋
□ 10. 문서 검증
```

---

## 🔍 코드 리뷰 체크리스트

### 리뷰어가 확인할 것 (거부 기준)

```
□ 1. 파일 크기 초과? → 즉시 거부
□ 2. 레이어 경계 위반? → 즉시 거부
□ 3. 중복 로직 존재? → 즉시 거부
□ 4. God Object? → 즉시 거부
□ 5. 직접 DB 접근? → 즉시 거부
□ 6. 매직 값 존재? → 즉시 거부
□ 7. 에러 처리 누락? → 즉시 거부
□ 8. 파일명 규칙 위반? → 경고 후 수정
□ 9. Import 순서 틀림? → 경고 후 수정
□ 10. 문서 업데이트 누락? → 즉시 거부
```

---

## 📊 품질 메트릭 (자동 검증)

### 매 커밋마다 자동 체크

```bash
# 1. 파일 크기 검증
find app -name "*.js" -exec wc -l {} \; | awk '$1 > 300 { print "❌ FAIL: " $2 " (" $1 " lines)" }'

# 2. 중복 코드 검증
npx jscpd --threshold 5

# 3. 복잡도 검증
npx complexity-report --threshold 10

# 4. Import 순서 검증
npx eslint --rule 'import/order: error'

# 5. 미사용 코드 검증
npx unimported
```

**기준:**
- ✅ 파일 크기: 300줄 이하
- ✅ 중복률: 5% 이하
- ✅ 순환 복잡도: 10 이하
- ✅ 미사용 코드: 0개

---

## 🎯 성공 기준

### 리팩토링 완료 판단 기준

```
✅ 모든 페이지 300줄 이하
✅ 레이어 경계 위반 0건
✅ 중복 코드 5% 이하
✅ God Object 0개
✅ 직접 DB 접근 0건
✅ 테스트 커버리지 80% 이상
✅ 모든 함수 FUNCTION_QUERY_REFERENCE.md 등록
✅ 빌드 에러 0개
✅ ESLint 경고 0개
✅ 부하 테스트 통과 (500명 동시 접속)
```

---

## 📚 관련 문서

1. **REFACTORING_MASTER_CHECKLIST.md** - 전체 작업 체크리스트
2. **FUNCTION_QUERY_REFERENCE.md** - 함수/쿼리 참조 매트릭스
3. **LAYER_*_CHECKLIST.md** - 레이어별 상세 체크리스트
4. **CODING_RULES.md** - 기존 코딩 규칙 (이 문서로 흡수됨)

---

## ⚠️ 이 문서 위반 시

1. **PR 자동 거부**
2. **즉시 리팩토링 요구**
3. **문서 업데이트 누락 시 머지 불가**

---

**이 원칙을 지키면 = 유지보수 시간 1/6, 버그 발생률 1/10, 개발 속도 3배**

**최종 업데이트**: 2025-10-21
**다음 리뷰**: 리팩토링 완료 후
