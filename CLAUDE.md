# ⚠️ Claude - 작업 전 필수 체크리스트

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

### ✅ 항상 해야 할 것
- ✅ DB 작업 전 `DB_REFERENCE_GUIDE.md` 읽기
- ✅ 문제 해결 전 `/system-check` 실행
- ✅ 수정 후 `/update-docs` 실행
- ✅ 컬럼명 정확히 확인 (중복 컬럼 주의!)

### ❌ 절대 하지 말 것
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

---

## 📚 전체 문서 리스트

### 필수 문서 (항상 참조)
1. **DB_REFERENCE_GUIDE.md** - DB 작업 필수
2. **SYSTEM_HEALTH_CHECK_2025-10-01.md** - 시스템 상태
3. **DETAILED_DATA_FLOW.md** - 데이터 흐름
4. **CLAUDE.md** (이 파일) - 작업 가이드

### 참고 문서
5. **SYSTEM_ARCHITECTURE.md** - 페이지 구조
6. **DATA_ARCHITECTURE.md** - API 매핑
7. **DEPLOYMENT_STRATEGY.md** - 배포 전략
8. **WORK_LOG_2025-10-01.md** - 작업 로그

---

**🎯 모든 작업 전에 이 문서를 다시 읽으세요!**

**마지막 업데이트**: 2025-10-01
