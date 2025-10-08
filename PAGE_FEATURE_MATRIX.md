# 페이지-기능 매트릭스 (인덱스)

**목적**: Claude가 페이지별 기능을 빠르게 파악하기 위한 참조 문서

**작성일**: 2025-10-08
**최종 업데이트**: 2025-10-08
**버전**: 1.0
**기준**: 실제 프로덕션 코드 (main 브랜치) - CODEBASE_STRUCTURE_REPORT.md

---

## 📋 문서 개요

이 문서는 **페이지 중심**으로 기능을 정리한 참조 가이드입니다.

- **FEATURE_REFERENCE_MAP**: 기능 → 영향받는 페이지 (기능 중심)
- **PAGE_FEATURE_MATRIX**: 페이지 → 사용 가능한 기능 (페이지 중심) ← **이 문서**

### 사용 시나리오

**기능별 접근 (FEATURE_REFERENCE_MAP 사용)**:
- "주문 생성 기능을 수정하려는데 어떤 페이지들이 영향받나?"
- "Variant 재고 관리를 변경하면 어디를 테스트해야 하나?"

**페이지별 접근 (PAGE_FEATURE_MATRIX 사용)**: ← **이 문서**
- "체크아웃 페이지에서 무엇을 할 수 있나?"
- "관리자 주문 상세 페이지의 기능은 뭐가 있나?"
- "홈페이지에서 호출되는 API와 DB 테이블은?"

---

## 🗂️ 전체 페이지 리스트 (36개)

### 📱 사용자 페이지 (11개) → PART1

#### 핵심 페이지
1. `/` - 홈 페이지
2. `/checkout` - 체크아웃
3. `/orders` - 주문 내역
4. `/orders/[id]/complete` - 주문 완료

#### 마이페이지
5. `/mypage` - 마이페이지
6. `/mypage/coupons` - 쿠폰함

#### 인증
7. `/login` - 로그인
8. `/signup` - 회원가입
9. `/auth/callback` - 카카오 OAuth 콜백
10. `/auth/complete-profile` - 프로필 완성

#### 기타
11. `/reset-password` - 비밀번호 재설정 (예정)

---

### 🛡️ 관리자 운영 페이지 (10개) → PART2

#### 주문 운영
1. `/admin` - 대시보드
2. `/admin/orders` - 주문 관리 (목록)
3. `/admin/orders/[id]` - 주문 상세
4. `/admin/deposits` - 입금 관리
5. `/admin/shipping` - 발송 관리

#### 발주 시스템
6. `/admin/purchase-orders` - 발주 관리
7. `/admin/purchase-orders/[supplierId]` - 업체별 발주

#### 고객 관리
8. `/admin/customers` - 고객 목록
9. `/admin/customers/[id]` - 고객 상세

#### 쿠폰 관리
10. `/admin/coupons` - 쿠폰 목록
11. `/admin/coupons/new` - 쿠폰 생성
12. `/admin/coupons/[id]` - 쿠폰 상세/배포

---

### ⚙️ 관리자 시스템 페이지 (13개) → PART3

#### 상품 관리
1. `/admin/products` - 라이브 상품 관리
2. `/admin/products/catalog` - 전체 상품 목록
3. `/admin/products/catalog/new` - 신규 상품 등록
4. `/admin/products/catalog/[id]` - 상품 상세
5. `/admin/products/catalog/[id]/edit` - 상품 수정

#### 방송 관리
6. `/admin/broadcasts` - 라이브 방송 관리

#### 기초 정보
7. `/admin/suppliers` - 공급업체 관리
8. `/admin/categories` - 카테고리 관리

#### 시스템
9. `/admin/admins` - 관리자 계정 관리
10. `/admin/settings` - 시스템 설정
11. `/admin/login` - 관리자 로그인

---

## 📚 PART 파일 가이드

### PART1: 사용자 페이지 상세
- 홈, 체크아웃, 주문 내역, 주문 완료
- 마이페이지, 쿠폰함
- 로그인, 회원가입, 인증 콜백

**주요 기능 영역**:
- 상품 조회 및 구매
- 주문 생성 및 조회
- 프로필 관리
- 쿠폰 사용

---

### PART2: 관리자 운영 페이지 상세
- 대시보드, 주문 관리, 입금/발송 관리
- 발주 관리
- 고객 관리
- 쿠폰 관리

**주요 기능 영역**:
- 주문 상태 변경
- 입금 확인
- 발송 처리
- 발주서 생성
- 쿠폰 발행/배포

---

### PART3: 관리자 시스템 페이지 상세
- 상품 관리 (등록/수정/삭제)
- 라이브 방송 관리
- 공급업체/카테고리 관리
- 관리자 계정/설정

**주요 기능 영역**:
- 상품 CRUD
- Variant 관리
- 라이브 상태 변경
- 시스템 설정

---

## 🔍 빠른 검색 가이드

### 페이지별 주요 기능 요약

| 페이지 | 주요 기능 | PART |
|--------|-----------|------|
| `/` | 상품 조회, BuyBottomSheet | PART1 |
| `/checkout` | 주문 생성, 쿠폰 적용, 배송비 계산 | PART1 |
| `/orders` | 주문 조회, 수량 변경, 일괄결제 | PART1 |
| `/mypage` | 프로필 수정, 주소 관리 | PART1 |
| `/mypage/coupons` | 쿠폰 조회 | PART1 |
| `/admin/orders` | 주문 관리, 상태 변경, Excel | PART2 |
| `/admin/deposits` | 입금 확인 | PART2 |
| `/admin/shipping` | 발송 처리 | PART2 |
| `/admin/purchase-orders` | 발주서 생성, Excel | PART2 |
| `/admin/coupons` | 쿠폰 발행, 배포 | PART2 |
| `/admin/products/new` | 상품 등록, Variant 생성 | PART3 |
| `/admin/products/[id]` | 상품 수정, Variant 관리 | PART3 |

---

## 📖 사용 방법

### Claude용
1. 페이지 수정/디버깅 요청 받음
2. 이 인덱스 파일에서 해당 페이지가 어느 PART에 있는지 확인
3. 해당 PART 파일 읽기
4. 페이지 섹션에서 기능/API/DB 확인
5. 체크리스트 기반 작업 진행

### 개발자용
1. 페이지 작업 전 해당 PART 파일 열기
2. 페이지 섹션 읽기
3. 사용 가능한 기능 확인
4. 호출 함수/API 확인
5. 사용 DB 테이블 확인
6. 체크리스트 검증

---

## 🔗 관련 문서

- **FEATURE_REFERENCE_MAP.md** - 기능 → 페이지 매핑 (기능 중심)
- **DETAILED_DATA_FLOW.md** - 페이지별 데이터 흐름 상세
- **DB_REFERENCE_GUIDE.md** - DB 테이블 스키마
- **CODE_ANALYSIS_COMPLETE.md** - 전체 코드베이스 분석
- **CODEBASE_STRUCTURE_REPORT.md** - 코드베이스 구조 보고서

---

## 📝 문서 정보

**작성자**: Claude Code
**버전**: 1.0
**상태**: 인덱스 파일 (PART1/2/3 생성 예정)
**마지막 업데이트**: 2025-10-08
**기준 코드**: main 브랜치 (36개 페이지, 128개 파일)
