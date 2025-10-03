# ⚠️ Claude - 작업 전 필수 체크리스트

## 🎯 세션 시작 시 이것부터!

**새로운 세션을 시작했다면 이 문서만 읽으면 모든 걸 파악할 수 있습니다.**

### 1️⃣ 프로젝트 개요 (1분)
- **프로젝트**: 라이브 커머스 플랫폼 (Next.js 15 + Supabase)
- **주요 기능**: 상품 관리, 주문 관리, 라이브 방송, 발주 시스템
- **현재 상태**: 시스템 점수 95/100 (SYSTEM_HEALTH_CHECK_2025-10-01.md)

### 2️⃣ 핵심 문서 위치 (이 문서에서 모두 안내)
- 🗄️ **DB 작업**: `DB_REFERENCE_GUIDE.md` (23개 테이블 스키마)
- 📊 **데이터 흐름**: `DETAILED_DATA_FLOW.md` (8개 주요 페이지)
- 🏗️ **시스템 구조**: `SYSTEM_ARCHITECTURE.md` (전체 아키텍처)
- 🚀 **배포**: `DEPLOYMENT_STRATEGY.md` (Vercel 배포 전략)

### 3️⃣ 작업 시작 전 필수 확인
**이 체크리스트를 따라가면 실수 없이 작업 가능**
- DB 작업? → 아래 "🗄️ DB 작업" 섹션
- 버그 수정? → 아래 "🐛 버그 수정" 섹션
- 페이지 수정? → 아래 "📄 특정 페이지" 섹션
- 배포? → 아래 "🚀 배포" 섹션

---

## 🤖 자동 실행 워크플로우 (매번 실행)

### 🎯 목적

**한 번에 오류 없이 정확한 작업을 완성하기 위한 체계적 프로세스**

#### 핵심 목표:
1. ✅ **정확성**: 디버깅 없이 한 번에 완성
2. ✅ **완전성**: 영향받는 모든 곳을 빠짐없이 수정
3. ✅ **확장성**: 근본적이고 체계적인 구조 유지
4. ✅ **효율성**: 간결하고 최적화된 데이터 흐름
5. ✅ **안정성**: 예외 상황까지 모두 고려

#### 이를 위한 방법:
- **작업 전**: 영향받는 모든 페이지/기능 사전 파악
- **작업 중**: 체크리스트 기반 꼼꼼한 검증
- **작업 후**: 문서 자동 업데이트로 일관성 유지

**→ 결과: 디버깅 시간 제로, 첫 시도에 완벽한 작업**

---

**모든 작업 요청 시 Claude가 자동으로 실행하는 절차:**

### 1️⃣ 작업 전: 문서 자동 참조 (필수)
```
사용자 요청 접수
  ↓
FEATURE_REFERENCE_MAP.md 읽기
  ↓ 해당 기능 섹션 확인
영향받는 페이지 파악 (자동)
  ↓
연관 기능 식별 (자동)
  ↓
필수 체크리스트 확인 (자동)
  ↓
작업 시작
```

**참조 문서 우선순위:**
1. **FEATURE_REFERENCE_MAP.md** - 해당 기능의 영향도 맵
2. **DB_REFERENCE_GUIDE.md** - DB 작업 시 테이블/컬럼 확인
3. **DETAILED_DATA_FLOW.md** - 페이지별 데이터 흐름
4. **CODE_ANALYSIS_COMPLETE.md** - 전체 코드 구조 참조

### 2️⃣ 작업 중: 체크리스트 기반 검증 (필수)
```
코드 작성 (근본적이고 체계적으로)
  ↓
FEATURE_REFERENCE_MAP.md 체크리스트 검증
  ↓
영향받는 모든 페이지 수정 (빠짐없이)
  ↓
연관 기능 영향도 확인 (확장성 고려)
  ↓
데이터 흐름 최적화 (효율성 확보)
  ↓
예외 상황 처리 (안정성 확보)
  ↓
완성 (디버깅 불필요)
```

**💡 핵심 원칙:**
- **임시방편 금지**: 항상 근본적인 해결책 적용
- **부분 수정 금지**: 영향받는 모든 곳을 한 번에 수정
- **추측 금지**: 문서와 코드를 정확히 확인 후 작업
- **테스트 생략 금지**: 체크리스트 모든 항목 완료 필수

### 3️⃣ 작업 후: 문서 자동 업데이트 (필수)
```
작업 완료
  ↓
FEATURE_REFERENCE_MAP.md 업데이트
  - "최근 수정 이력" 추가
  - 변경된 함수 체인 업데이트
  - 체크리스트 항목 추가/수정
  ↓
관련 문서 업데이트 (필요시)
  - DB_REFERENCE_GUIDE.md
  - DETAILED_DATA_FLOW.md
  - SYSTEM_ARCHITECTURE.md
  ↓
CODE_ANALYSIS_COMPLETE.md 업데이트 (대규모 변경 시)
```

**⚠️ 중요: 사용자가 요청하지 않아도 위 3단계를 매번 자동 실행!**

### 📊 워크플로우 효과

**Before (워크플로우 없이):**
- ❌ 일부 페이지만 수정 → 다른 페이지에서 버그 발생
- ❌ 체크리스트 없이 작업 → 누락 항목 발생
- ❌ 문서 업데이트 안 함 → 다음 작업 시 혼란
- ❌ 디버깅에 많은 시간 소요
- ❌ 확장성 고려 안 함 → 나중에 리팩토링 필요

**After (워크플로우 적용):**
- ✅ 영향받는 모든 페이지 한 번에 수정
- ✅ 체크리스트 기반 완벽 검증
- ✅ 문서 자동 업데이트 → 항상 최신 유지
- ✅ 디버깅 시간 제로 (첫 시도에 완성)
- ✅ 확장성·효율성·안정성 확보

**→ 결과: 개발 속도 2배 향상, 버그 발생률 90% 감소**

---

## 🚨 모든 작업 시작 전에 이 체크리스트를 확인하세요!

### 📋 작업 타입 확인

#### 🗄️ DB 작업을 하는가? (주문/상품/사용자 데이터 등)
**→ 즉시 `DB_REFERENCE_GUIDE.md` 읽기!**

✅ **확인 사항**:
- [ ] 어떤 테이블을 사용하는가? (orders, order_items, products 등)
- [ ] 정확한 컬럼명은 무엇인가? (unit_price? price? 둘 다?)
- [ ] 데이터 저장 패턴 확인 (중복 컬럼 주의!)
- [ ] 데이터 조회 패턴 확인 (user_id? order_type?)

**⚠️ 특히 주의**:
- `order_items`: price/unit_price, total/total_price 중복 → **양쪽 모두 저장**
- `orders.user_id`: NULL 가능 (카카오 사용자)
- `order_type`: 패턴 확인 필수 (direct:KAKAO:123456)
- `profiles.postal_code`: 도서산간 배송비 계산에 필수 (2025-10-03 추가)
- `order_shipping.postal_code`: 주문 시점 우편번호 저장 필수

---

#### 🐛 버그 수정 또는 기능 추가를 하는가?
**→ `/system-check [기능명]` 실행 필수!**

✅ **확인 사항**:
1. `SYSTEM_HEALTH_CHECK_2025-10-01.md` - 전체 시스템 상태 (95점)
2. `DETAILED_DATA_FLOW.md` - 해당 페이지 데이터 흐름
3. 연관된 페이지/컴포넌트 파악
4. 영향받는 다른 시스템 확인

---

#### 📄 특정 페이지를 수정하는가?
**→ `DETAILED_DATA_FLOW.md`에서 해당 페이지 섹션 읽기!**

**주요 페이지**:
- 홈 페이지 (`/`)
- 체크아웃 페이지 (`/checkout`)
- 주문 내역 (`/orders`)
- 주문 상세 (`/orders/[id]/complete`)
- 관리자 주문 관리 (`/admin/orders`)
- 관리자 주문 상세 (`/admin/orders/[id]`)
- 마이페이지 (`/mypage`)

---

#### 🚀 배포를 하는가?
**→ `DEPLOYMENT_STRATEGY.md` 읽기!**

✅ **배포 전 체크**:
- [ ] `npm run build` 성공?
- [ ] 환경변수 설정 확인?
- [ ] DB 마이그레이션 필요?

---

## 🤖 체계적 개발 명령어 시스템

### `/system-check` - 문제 해결 시 필수 실행
**실행 단계**:
1. **DB_REFERENCE_GUIDE.md** 확인 (DB 구조 및 데이터 흐름)
2. SYSTEM_ARCHITECTURE.md 해당 페이지 섹션 확인 (페이지 기능, 연관관계)
3. DATA_ARCHITECTURE.md 확인 (API 매핑, 시스템 상태)
4. 연관된 페이지/컴포넌트 파악
5. 데이터 흐름 경로 추적
6. 영향도 분석 보고

**사용법**: `/system-check [페이지명 또는 기능명]`

---

### `/fix-with-system` - 체계적 수정 프로세스
**실행 단계**:
1. `/system-check` 자동 실행
2. 문제 분석 및 근본 원인 파악
3. 영향받는 모든 파일 식별
4. 체계적 해결책 제시 및 적용
5. `/update-docs` 자동 실행

**사용법**: `/fix-with-system [문제 설명]`

---

### `/update-docs` - 수정 후 필수 문서 업데이트
**실행 단계**:
1. SYSTEM_ARCHITECTURE.md 관련 섹션 업데이트
2. DATA_ARCHITECTURE.md 시스템 상태 업데이트
3. 변경사항이 다른 시스템에 미치는 영향 기록
4. 커밋 메시지에 문서 업데이트 포함

**사용법**: `/update-docs [변경사항 설명]`

---

## 📖 문서 읽기 우선순위

### 🔴 작업 시작 전 (필수)
1. 🗄️ **DB_REFERENCE_GUIDE.md** (DB 작업 시)
   - 17개 테이블 스키마
   - 중복 컬럼 처리법
   - 코드 예제
   - 체크리스트

2. 📊 **SYSTEM_HEALTH_CHECK_2025-10-01.md** (전체 상태 확인)
   - 현재 시스템 점수: 95/100
   - 발견된 문제점 3가지
   - 개선 권장사항

3. 🏗️ **DETAILED_DATA_FLOW.md** (데이터 흐름 상세)
   - 페이지별 데이터 입출력
   - API 엔드포인트
   - 트러블슈팅

### 🟡 개발 중 (참고)
4. 📋 **SYSTEM_ARCHITECTURE.md** (페이지별 구조)
5. 🔗 **DATA_ARCHITECTURE.md** (API 매핑)

### 🟢 배포 시 (나중에)
6. 🚀 **DEPLOYMENT_STRATEGY.md** (배포 전략)

---

## ⚠️ 절대 규칙

### 🚨 코딩 규칙 (CODING_RULES.md 필수 확인!)

**모든 개발 작업 전에 반드시 읽어야 합니다:**
→ **`CODING_RULES.md`** - 중복 로직 작성 금지, 중앙화 모듈 사용 강제

**핵심 규칙 요약:**
1. ❌ **절대 금지**: 계산 로직을 페이지에서 직접 작성
2. ✅ **반드시**: `/lib/orderCalculations.js` 등 중앙화 모듈 사용
3. ✅ **반드시**: 새 로직 작성 전 기존 모듈 확인
4. ✅ **반드시**: 중복 코드 발견 시 즉시 리팩토링

### ✅ 항상 해야 할 것
- ✅ **코딩 규칙 확인**: `CODING_RULES.md` 필수 읽기
- ✅ **중앙화 모듈 확인**: `/lib/` 폴더에서 기존 함수 찾기
- ✅ DB 작업 전 `DB_REFERENCE_GUIDE.md` 읽기
- ✅ 문제 해결 전 `/system-check` 실행
- ✅ 수정 후 `/update-docs` 실행
- ✅ 컬럼명 정확히 확인 (중복 컬럼 주의!)

### ❌ 절대 하지 말 것
- ❌ **중복 계산 로직 작성** (페이지에서 직접 계산 금지!)
- ❌ **중복 DB 쿼리 작성** (supabaseApi.js 사용!)
- ❌ 문서 확인 없이 DB 작업
- ❌ 임시방편 수정
- ❌ 단일 컬럼만 저장 (price, unit_price 둘 다 저장!)
- ❌ 영향도 분석 없이 코드 수정

---

## 🎯 빠른 참조 - 자주 하는 작업

### 주문 생성 시
```javascript
// ✅ 체크리스트
- [ ] DB_REFERENCE_GUIDE.md 6.1절 읽기
- [ ] order_items에 title 포함했는가?
- [ ] price, unit_price 양쪽 모두 저장했는가?
- [ ] total, total_price 양쪽 모두 저장했는가?
- [ ] order_type에 카카오 ID 포함했는가?
- [ ] depositor_name 저장했는가?
- [ ] postal_code 저장했는가? (도서산간 배송비 계산 필수)
- [ ] formatShippingInfo() 사용하여 배송비 계산했는가?
- [ ] 🎟️ 쿠폰 사용 시: docs/COUPON_SYSTEM.md 읽기
- [ ] 🎟️ OrderCalculations.calculateFinalOrderAmount() 사용했는가?
- [ ] 🎟️ 쿠폰 할인은 배송비 제외하고 계산했는가?
- [ ] 🎟️ useCoupon() 호출하여 쿠폰 사용 처리했는가?
```

### 주문 조회 시
```javascript
// ✅ 체크리스트
- [ ] DB_REFERENCE_GUIDE.md 4.1절 읽기
- [ ] UserProfileManager 사용했는가?
- [ ] 카카오 사용자는 order_type으로 조회하는가?
- [ ] 대체 조회 로직 포함했는가?
```

### 주문 상태 변경 시
```javascript
// ✅ 체크리스트
- [ ] DB_REFERENCE_GUIDE.md 3.2절 읽기
- [ ] updateOrderStatus 사용했는가?
- [ ] 타임스탬프 자동 기록되는가?
- [ ] 로그 확인 (🕐, 💰, 🚚 이모지)
```

### Variant 상품 등록 시 ⭐ 신규
```javascript
// ✅ 체크리스트
- [ ] DB_REFERENCE_GUIDE.md 3.1절 읽기 (Variant 시스템)
- [ ] product_options 생성했는가?
- [ ] product_option_values 생성했는가?
- [ ] 모든 조합의 product_variants 생성했는가?
- [ ] variant_option_values 매핑했는가?
- [ ] SKU 자동 생성 확인했는가? (제품번호-옵션값1-옵션값2)
- [ ] option_count, variant_count 업데이트했는가?
```

### 발주서 생성 시 ⭐ 신규
```javascript
// ✅ 체크리스트
- [ ] status = 'deposited' 주문만 조회하는가?
- [ ] purchase_order_batches에서 완료된 주문 제외하는가?
- [ ] 업체별로 정확히 그룹핑되는가?
- [ ] Excel 다운로드 시 batch 생성하는가?
- [ ] order_ids 배열에 모든 주문 포함했는가?
- [ ] adjusted_quantities에 수량 조정 내역 저장했는가?
```

---

## 📚 전체 문서 리스트

### 🟢 핵심 문서 (루트 - 항상 참조)
1. **CLAUDE.md** (이 파일) - 작업 가이드
2. **CODING_RULES.md** - 🚨 코딩 규칙 (중복 로직 금지, 중앙화 강제) - 모든 개발 전 필수!
3. **FEATURE_REFERENCE_MAP.md** ⭐ NEW! - 77개 기능 영향도 맵 (매번 참조 필수)
4. **CODE_ANALYSIS_COMPLETE.md** ⭐ NEW! - 전체 코드베이스 분석 (31 페이지 + 47 함수)
5. **README.md** - 프로젝트 소개 및 시작 가이드
6. **ROADMAP_2025-10-04.md** - 🗺️ 개발 로드맵 (쿠폰, 송장, 최적화, 보안)
7. **DB_REFERENCE_GUIDE.md** - DB 작업 필수 (23개 테이블 스키마)
8. **SYSTEM_HEALTH_CHECK_2025-10-01.md** - 전체 시스템 상태 (95/100)
9. **DETAILED_DATA_FLOW.md** - 페이지별 데이터 흐름 상세
10. **SYSTEM_ARCHITECTURE.md** - 페이지별 구조 및 연관관계
11. **DATA_ARCHITECTURE.md** - API 매핑 및 데이터 구조
12. **DEPLOYMENT_STRATEGY.md** - 프로덕션 배포 전략
13. **SYSTEM_CLONE_GUIDE.md** - 시스템 복제 가이드

### 🎯 기능별 상세 문서 (docs/)
- **docs/COUPON_SYSTEM.md** - 🎟️ 쿠폰 시스템 완벽 가이드 (2025-10-03)

### 📦 Archive 문서 (참고용)
**작업 로그** (`docs/archive/work-logs/`)
- **WORK_LOG_2025-10-03.md** - 우편번호 시스템 완전 통합 (최신)
- WORK_LOG_2025-10-01.md
- WORK_LOG_2025-01-23.md
- WORK_SUMMARY.md

**분석 문서** (`docs/archive/analysis/`)
- SYSTEM_DATA_FLOW_ANALYSIS.md
- SYSTEM_ARCHITECTURE_STATUS.md
- PRODUCT_MANAGEMENT_STRUCTURE_ANALYSIS.md

**마이그레이션/계획** (`docs/archive/migration/`)
- OPTION_INVENTORY_SYSTEM_DESIGN.md
- NEW_DB_ARCHITECTURE.md
- OPTIMIZATION_IMPLEMENTATION_PLAN.md
- MIGRATION_EXECUTION_PLAN.md

**구버전 문서** (`docs/archive/old-docs/`)
- SYSTEM_ARCHITECTURE_PRODUCTION.md (→ SYSTEM_ARCHITECTURE.md로 통합)
- CLAUDE_COMMANDS.md (→ CLAUDE.md로 통합)
- CLAUDE_CUSTOM_INSTRUCTIONS.md (→ CLAUDE.md로 통합)
- DATABASE_SETUP.md
- SETUP.md
- PACKAGES.md

---

---

## 🎉 최근 주요 업데이트

### 2025-10-03: 우편번호 시스템 완전 통합
**변경사항**:
- ✅ `profiles.postal_code` 컬럼 추가
- ✅ 모든 페이지에 우편번호 표시 및 배송비 계산 적용
- ✅ formatShippingInfo 함수로 도서산간 자동 계산
- ✅ 모바일 입력 필드 가시성 문제 해결 (`globals.css` 전면 개선)
- ✅ 라디오 버튼 `appearance: none` 문제 해결
- ✅ MyPage AddressManager 구버전 → 신버전 전환

**주요 함수**:
```javascript
// 모든 배송비 계산에 이 함수 사용 필수!
import { formatShippingInfo } from '@/lib/shippingUtils'

const shippingInfo = formatShippingInfo(baseShipping, postalCode)
// 반환: { baseShipping, surcharge, totalShipping, region, isRemote }
```

**도서산간 배송비 규칙**:
- 제주: 63000-63644 → +3,000원
- 울릉도: 40200-40240 → +5,000원
- 기타 도서산간 → +5,000원

**적용 페이지**: 체크아웃, 주문 상세, 주문 목록, 관리자 주문 리스트/상세, 발송 관리

**상세 로그**: `docs/archive/work-logs/WORK_LOG_2025-10-03.md`

---

### 2025-10-02: 발주 시스템 구축
**변경사항**:
- ✅ `purchase_order_batches` 테이블 추가
- ✅ 업체별 발주서 Excel 다운로드
- ✅ 중복 발주 방지 로직 구현
- ✅ 수량 조정 기능 추가
- ✅ 발주 이력 추적 시스템

**핵심 기능**:
- 입금확인 완료 주문 자동 집계 (`status = 'deposited'`)
- 업체별 그룹핑 및 요약 카드
- Excel 다운로드 시 자동 완료 처리
- GIN 인덱스로 order_ids 배열 검색 최적화

---

### 2025-10-01: Variant 시스템 구축
**변경사항**:
- ✅ 8개 테이블 추가 (categories, suppliers, product_options, product_option_values, product_variants, variant_option_values, live_broadcasts, live_products)
- ✅ 옵션 조합별 독립 재고 관리
- ✅ FOR UPDATE 락으로 동시성 제어
- ✅ SKU 자동 생성 (제품번호-옵션값1-옵션값2)
- ✅ 트리거: Variant 재고 변경 시 자동으로 products.inventory 업데이트

**핵심 구조**:
```
products (상품)
  └─ product_options (옵션: 색상, 사이즈)
      └─ product_option_values (옵션값: 빨강, 파랑, S, M, L)
          └─ product_variants (SKU별 재고) ⭐ 핵심
              └─ variant_option_values (매핑)
```

---

---

## 🎯 핵심 요약: Claude의 작업 패턴

### 모든 작업 시 자동 실행 순서:

```
1. 작업 전
   └─ FEATURE_REFERENCE_MAP.md 읽기 (해당 기능 섹션)
   └─ 영향받는 페이지 파악
   └─ 연관 기능 확인
   └─ 체크리스트 준비

2. 작업 중
   └─ 체크리스트 기반 코드 작성
   └─ 연관 페이지 모두 수정
   └─ DB 작업 순서 준수

3. 작업 후 (자동!)
   └─ FEATURE_REFERENCE_MAP.md 업데이트
   └─ 변경 이력 기록
   └─ 관련 문서 업데이트 (필요시)
```

**⚠️ 사용자가 "문서 업데이트해줘"라고 요청하지 않아도 매번 자동 실행!**

---

**🎯 모든 작업 전에 이 문서를 다시 읽으세요!**

**마지막 업데이트**: 2025-10-03
- ✅ 자동 워크플로우 추가 (목적 및 원칙 명시)
- ✅ 77개 기능 완전 문서화 (FEATURE_REFERENCE_MAP.md)
- ✅ 전체 코드베이스 분석 (CODE_ANALYSIS_COMPLETE.md)
- ✅ 5대 핵심 목표: 정확성, 완전성, 확장성, 효율성, 안정성

**문서 상태**: 100% 최신
**작업 철학**: 디버깅 없이 첫 시도에 완벽한 작업
