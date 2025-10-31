# 📝 문서 관리 규칙

## 🚨 FEATURE_REFERENCE_MAP 파일 크기 제한 (필수!)

**모든 PART 파일은 25,000 토큰을 초과하지 않아야 합니다**

### 내용 추가 시 체크리스트:
- [ ] 파일 크기 확인 (Read 툴 사용 시 토큰 수 표시됨)
- [ ] 25,000 토큰 근접 시 → 새로운 PART 파일로 분리
- [ ] 새 PART 파일 생성 시:
  1. `FEATURE_REFERENCE_MAP_PARTX.md` 파일 생성 (X는 숫자)
  2. 파일 상단에 분할 안내 및 크기 제한 경고 추가
  3. `FEATURE_REFERENCE_MAP.md` 인덱스에 새 PART 추가
  4. `CLAUDE.md`의 문서 리스트 업데이트
  5. 워크플로우에 새 PART 반영

### 분할 기준:
- PART1: 주문 + 상품 (1.x, 2.x)
- PART2: Variant + 사용자 + 인증 + 공급업체 (3.x~6.x)
- PART3: 배송 + 쿠폰 + 통계 (7.x~10.x)
- **PART4 이후**: 새로운 대규모 기능 추가 시 (예: 결제, 알림, 리뷰 등)

### ⚠️ 중요:
- 기존 PART 파일이 가득 찬 경우 **절대 무리하게 추가하지 말 것**
- Claude가 읽을 수 없으면 모든 워크플로우가 작동하지 않음
- 파일 분할은 **예방이 치료보다 쉬움** → 여유 있게 분리

---

## 🚨 FUNCTION_QUERY_REFERENCE 파일 크기 제한 (필수!)

**2025-10-21**: FUNCTION_QUERY_REFERENCE.md가 27,117 토큰으로 25,000 초과 → **인덱스 + 4개 PART로 분할 완료** ✅

### 현재 구조:
```
FUNCTION_QUERY_REFERENCE.md (163줄) - 인덱스만
├─ FUNCTION_QUERY_REFERENCE_PART1.md (312줄) - 상품 + Variant
├─ FUNCTION_QUERY_REFERENCE_PART2.md (456줄) - 주문 + 사용자 + 기타
├─ FUNCTION_QUERY_REFERENCE_PART3.md (272줄) - 중앙화 모듈 + 레거시
└─ FUNCTION_QUERY_REFERENCE_PART4.md (447줄) - 통계 + Domain + Use Cases
```

### 내용 추가 시 체크리스트:
- [ ] 파일 크기 확인 (Read 툴 사용 시 토큰 수 표시됨)
- [ ] 25,000 토큰 근접 시 → 새로운 PART 파일로 분리
- [ ] 새 PART 파일 생성 시:
  1. `FUNCTION_QUERY_REFERENCE_PARTX.md` 파일 생성 (X는 숫자)
  2. 파일 상단에 분할 안내 및 크기 제한 경고 추가
  3. `FUNCTION_QUERY_REFERENCE.md` 인덱스에 새 PART 추가
  4. `CLAUDE.md`의 문서 리스트 업데이트

### 분할 기준:
- PART1: 상품 + Variant (섹션 1-2)
- PART2: 주문 + 사용자 + 기타 (섹션 3-8)
- PART3: 중앙화 모듈 + 레거시 (섹션 9-11)
- PART4: 통계 + Domain + Use Cases (섹션 12-15)
- **PART5 이후**: 새로운 대규모 함수 카테고리 추가 시 (예: API Routes, Workers 등)

### ⚠️ 중요:
- Domain Entity나 Use Case 추가 시 PART4에 추가 (섹션 12.3, 12.4)
- PART4가 25,000 토큰 근접 시 PART5로 분할 (Domain + Use Cases 전용)

---

## 🚨 WORK_LOG 파일 관리 (2025-10-22 신규 추가) ⭐⭐⭐

**목적**: CLAUDE.md 파일 크기 제한 유지 (1500-2000줄 이하)

### 원칙:
1. ✅ **CLAUDE.md**: 목차 + 간략한 요약만 (3-5줄)
2. ✅ **상세 로그**: `docs/work-logs/WORK_LOG_YYYY-MM-DD.md`에 작성
3. ✅ **링크 연결**: CLAUDE.md에서 WORK_LOG로 링크

### 작업 로그 작성 규칙:

#### A. 새로운 작업 세션 시작 시:
- [ ] 오늘 날짜의 WORK_LOG 파일이 있는지 확인
- [ ] 없으면 `docs/work-logs/WORK_LOG_YYYY-MM-DD.md` 생성
- [ ] 파일 헤더 작성 (작업 시간, 작업자, 주요 작업)

#### B. 버그 수정/기능 추가 완료 시:
- [ ] WORK_LOG에 상세 내용 작성:
  - 문제 상황
  - 근본 원인 분석
  - 해결 방법
  - 성능 개선 결과
  - 영향 파일
  - 커밋 해시
- [ ] CLAUDE.md에 간략한 요약만 추가:
  ```markdown
  ### YYYY-MM-DD: 제목 ⭐⭐⭐

  **문제**: 한 줄 요약
  **원인**: 한 줄 요약
  **해결**: 한 줄 요약
  **커밋**: `해시`

  **📝 상세 로그**: [WORK_LOG_YYYY-MM-DD.md](docs/work-logs/WORK_LOG_YYYY-MM-DD.md#앵커)
  ```

#### C. CLAUDE.md 업데이트 규칙:
- [ ] "최근 주요 업데이트" 섹션에 추가 (최신이 위)
- [ ] 각 항목은 3-5줄 이내로 제한
- [ ] 상세 내용은 링크로 대체
- [ ] 오래된 업데이트(1달 이상)는 archive로 이동

### 파일 크기 관리:
- **CLAUDE.md**: 1500-2000줄 초과 시 오래된 업데이트를 `docs/archive/CLAUDE_UPDATES_ARCHIVE_YYYY-MM-DD.md`로 이동
- **WORK_LOG**: 날짜별로 자동 분리되므로 크기 제한 없음

### 예시:

#### ❌ 잘못된 방식 (CLAUDE.md에 상세 내용 전부 작성):
```markdown
### 2025-10-22: 타임아웃 해결

**문제 상황**:
- 주문 목록 조회 시 DB 타임아웃 500 에러
- 에러: canceling statement due to statement timeout
- API: POST /api/orders/list → 500

**근본 원인**:
1. 전체 주문 조회 (GetOrdersUseCase.js:20)
   - statusCounts 계산을 위해...
   [50줄 이상 계속...]
```

#### ✅ 올바른 방식 (CLAUDE.md는 간략하게, WORK_LOG에 상세):

**CLAUDE.md:**
```markdown
### 2025-10-22: ⚡ 주문 조회 API 타임아웃 완전 해결 ⭐⭐⭐

**문제**: DB 타임아웃 500 에러 (15-20초)
**원인**: 전체 주문 조회 + products JOIN (3-way)
**해결**: DB COUNT 쿼리 + products JOIN 제거 + 페이지네이션
**성능**: 타임아웃 → 0.5-1초 (20배 빠름)
**커밋**: `8762b88`

**📝 상세 로그**: [WORK_LOG_2025-10-22.md](docs/work-logs/WORK_LOG_2025-10-22.md#2-주문-조회-api-타임아웃-완전-해결)
```

**WORK_LOG_2025-10-22.md:**
```markdown
## ⚡ 2. 주문 조회 API 타임아웃 완전 해결

### 문제 상황
[상세한 에러 로그, 스크린샷 등...]

### 근본 원인 분석 (Rule #0-A Stage 3)
[50줄 이상의 상세 분석...]

### 해결 방법
[코드 예제, 설명 등...]
```

### ⚠️ 중요:
- 모든 작업 완료 시 반드시 WORK_LOG 먼저 작성
- 그 다음 CLAUDE.md에 링크와 함께 간략한 요약 추가
- 절대 CLAUDE.md에 상세 내용 작성 금지 (파일 크기 폭발)

---

## 🚨 CLAUDE.md 파일 크기 제한 (2025-10-31 신규 추가) ⭐⭐⭐

**현재 상태**: 1704줄, 42.4k characters (40k 권장 초과)

### 문제점:
- 파일이 너무 커서 성능 저하 발생
- Claude가 읽는 데 시간이 오래 걸림
- 토큰 사용량 증가

### 해결 방법:
- **문서 분산**: 주요 섹션을 별도 파일로 분리
- **목차 중심**: CLAUDE.md는 목차 + 간략한 요약만
- **링크 연결**: 상세 내용은 링크로 연결

### 분산된 문서:
1. `docs/guidelines/BUG_FIX_WORKFLOW.md` - Rule #0 버그 수정 워크플로우
2. `docs/guidelines/AUTO_WORKFLOW.md` - 자동 실행 워크플로우
3. `docs/guidelines/DOCUMENT_MANAGEMENT.md` - 문서 관리 규칙 (이 파일)
4. `docs/quick-reference/QUICK_CHECKLISTS.md` - 빠른 참조 체크리스트

### 목표:
- CLAUDE.md: 1000-1200줄 이하 (현재 1704줄 → 500줄 감소)
- 40k characters 이하 (현재 42.4k → 2.4k 감소)

---

**📌 참고**: 이 문서는 [CLAUDE.md](../../CLAUDE.md)의 문서 관리 규칙입니다.
