# 🎉 최근 주요 업데이트

**📦 과거 업데이트 (2025-10-23 이전)**: `docs/archive/CLAUDE_UPDATES_ARCHIVE_2025-10-23.md` 참조

**📝 상세 로그**: 각 날짜별 `docs/work-logs/WORK_LOG_YYYY-MM-DD.md` 참조

---

## 2025-10-31: 🐛 Bug #14 - 체크아웃 초기 로드 시 배송지 비교 누락 수정 ⭐⭐⭐

**문제**: 체크아웃 초기 로드 시 합배 배송비가 잘못 적용됨 (울릉군 verifying 주문 있을 때 다른 주소로 주문 시 무료배송 적용)
**원인**: checkPendingOrders()가 배송지 비교 없이 주문 존재 여부만 확인, 주소 변경 시에만 배송지 비교 포함 API 호출
**해결**: 초기 로드 시에도 배송지 비교 포함 API 사용 + 프로필+주소 로드 후 합배 확인 (순차 실행)
**영향**: app/hooks/useCheckoutInit.js (93줄 추가, 56줄 삭제)
**테스트**: 제주 verifying → 울릉군: ₩9,000 ✅, 울릉 verifying → 서울: ₩4,000 ✅
**커밋**: `f6fcc7f`

**📝 상세 로그**: [WORK_LOG_2025-10-31.md#bug-14](work-logs/WORK_LOG_2025-10-31.md#-bug-14-체크아웃-초기-로드-시-배송지-비교-누락-)

---

## 2025-10-31: 📝 CLAUDE.md 파일 분산 완료 (1704줄 → 428줄, 75%↓) ⭐⭐⭐

**문제**: CLAUDE.md 파일 크기 42.4k characters (40k 권장 초과)
**해결**: 주요 섹션을 별도 파일로 분산 + 목차 중심 재구성
**분산된 문서**:
1. `docs/guidelines/BUG_FIX_WORKFLOW.md` - Rule #0 버그 수정 워크플로우 (8-Stage)
2. `docs/guidelines/AUTO_WORKFLOW.md` - 자동 실행 워크플로우 (Phase 0-4)
3. `docs/guidelines/DOCUMENT_MANAGEMENT.md` - 문서 관리 규칙
4. `docs/quick-reference/QUICK_CHECKLISTS.md` - 빠른 참조 체크리스트
5. `docs/RECENT_UPDATES.md` - 최근 주요 업데이트 (이 파일)

**결과**: 파일 크기 75% 감소, 성능 개선, 유지보수성 향상
**커밋**: `[예정]`

---

## 2025-10-30: 🔄 실시간 재고 업데이트 완료 (15초 Polling) ⭐⭐⭐

**문제**: 라이브 상품 노출 ON/OFF, 재고 변경이 사용자 홈에 즉시 반영 안 됨
**원인**: HomeClient가 initialProducts만 사용, Polling 없음
**해결**: 15초 Polling + Page Visibility API (다른 탭 보면 중단)
**API**: `/api/products/live` (50KB, GetProductsUseCase 재사용)
**성능**: 96GB/월 (38% 사용, 방송 2시간×8회 기준) ✅
**결과**: 관리자 노출 ON/OFF → 15초 내 자동 반영, 재고 변경 즉시 동기화
**커밋**: `[예정]`

**📝 상세 로그**: [WORK_LOG_2025-10-30.md#세션-5](work-logs/WORK_LOG_2025-10-30.md#-세션-5-실시간-재고-업데이트-구현-15초-polling-)

---

## 2025-10-30: 🔒 동시성 제어 완료 (Race Condition 방지) ⭐⭐⭐

**문제**: 500명 동시 구매 시 재고 초과 판매 위험
**원인**: SELECT → UPDATE 사이에 Race Condition 발생
**해결**: PostgreSQL Row-Level Lock (FOR UPDATE NOWAIT)
**테스트**: 10명 동시 요청 → 2명 성공, 8명 실패 (재고 2개) ✅
**UX**: 마케팅 메시지 ("⏳ 많은 고객이 주문 중" → "🔥 주문 폭주로 완판!")
**성능**: 0.5초 → 0.5-0.7초 (+0.2초, 무시 가능)
**커밋**: `34bcee5`

**📝 상세 로그**: [WORK_LOG_2025-10-30.md#세션-4](work-logs/WORK_LOG_2025-10-30.md#-세션-4-동시성-제어-구현-race-condition-방지-)

---

## 2025-10-30: 🔧 Bug #10 + #11 + #12 완전 해결 (배송비 + 쿠폰) ⭐⭐⭐

### Bug #10: 컴플릿 페이지 배송비 재계산 제거
- **문제**: DB에 shipping_fee = 0.00인데 화면에 ₩9,000 표시
- **근본 원인**: Mobile/Desktop/Print 3개 섹션에서 formatShippingInfo() 재계산 (6곳)
- **해결**: 모든 섹션에서 DB 값 직접 사용 (재계산 완전 제거)
- **커밋**: `b49b5e4` (partial), `5b54aa9` (complete)

### Bug #11: 단일 주문 배송비 계산 누락
- **문제**: 제주도 주문이 shipping_fee = 0.00으로 저장됨 (₩7,000이어야 함)
- **근본 원인**: 단일 주문 경로에서 paymentData에 shippingData 누락
- **해결**: useCheckoutPayment.js에 shippingData 추가
- **커밋**: `3a28568`

### Bug #12: 쿠폰 사용해도 개수가 줄지 않는 문제
- **문제**: 쿠폰 사용 후 total_used_count 증가 안 됨
- **근본 원인**: BaseRepository가 global `supabase` 사용 (DI 무시) → RLS 차단
- **해결**: BaseRepository + CouponRepository + useCheckoutPayment 수정
- **커밋**: `923e70d`, `bc66349`

**결과**: 배송비 정확히 표시 + 쿠폰 개수 정확히 차감 ✅

**📝 상세 로그**: [WORK_LOG_2025-10-30.md](work-logs/WORK_LOG_2025-10-30.md)

---

## 2025-10-29: 🎨 일괄결제 주문 UI 그룹핑 구현 ⭐⭐⭐

**완료된 작업**: 4개
1. 관리자 버그 수정 - payment_group_id 그룹 전체 업데이트 (입금 확인 시)
2. 주문 목록 그룹핑 UI - OrderCard + useOrdersInit 그룹핑 로직 (일괄결제 N건 표시)
3. 주문 상세 모든 상품 표시 - 일괄결제 12건 클릭 시 모든 주문의 상품 리스팅
4. 페이지네이션 수정 - 그룹핑 후 카드 ≤ 10개 시 숨김

**발견된 문제**: statusCounts 구조 변경으로 하위 호환성 문제
**커밋**: `f36734f`, `73bc748`, `969d530`, `6643c8d`, `aa9a8b8`

**📝 상세 로그**: [WORK_LOG_2025-10-29.md](work-logs/WORK_LOG_2025-10-29.md)

---

## 2025-10-28: 💰 주문 완료 페이지 일괄결제 총 입금금액 표시 ⭐⭐⭐

**문제**: 체크아웃에서 총 ₩150,000 표시 OK, 주문 완료 페이지에서 총 입금금액 확인 불가
**원인**: bulkPaymentInfo에 groupTotalAmount 필드 없음
**해결**: GetOrdersUseCase - groupTotalAmount 계산 추가 + complete/page - 상단 배너 UI 추가
**결과**: 일괄결제 3건 시 "💰 총 입금금액: ₩150,000 (3건 일괄결제)" 즉시 표시 ✅
**소요 시간**: 22분 (Rule #0-A 8-Stage 100% 준수, 재작업 0분)
**커밋**: `[해시]`

**📝 상세 로그**: [WORK_LOG_2025-10-28.md#일괄결제-총-입금금액](work-logs/WORK_LOG_2025-10-28.md#-주문-완료-페이지-일괄결제-총-입금금액-표시-rule-0-a-완벽-준수)

---

## 2025-10-28: 🎟️ 주문 완료 페이지 쿠폰 할인 표시 수정 ⭐⭐⭐

**문제**: 체크아웃에서 쿠폰 적용 OK, 주문 완료 페이지에서 쿠폰 미표시
**1차 원인**: API Route가 `coupon: null` 하드코딩
**2차 원인**: GetOrdersUseCase가 `discount_amount` 필드 누락
**해결**: API Route + GetOrdersUseCase 수정
**총 소요**: 2시간 15분 (1차 15분 + 2차 2시간)
**커밋**: `6787c42`, `fcc1438`

**📝 상세 로그**: [WORK_LOG_2025-10-28.md](work-logs/WORK_LOG_2025-10-28.md)

---

## 2025-10-27: 🛒 체크아웃 배송지 변경 시 배송비 즉시 재계산 ⭐⭐⭐

**문제**: 배송지 변경 후에도 이전 배송비가 그대로 표시됨
**원인**: hasPendingOrders 상태가 초기 로드 시 한 번만 설정됨
**해결**: recheckPendingOrders() 함수 추가 + 배송지 변경 시 합배 여부 재확인
**결과**: 배송지 변경 시 orderCalc useMemo 자동 재계산 → 배송비 즉시 업데이트
**커밋**: `9d0548f`

**📝 상세 로그**: [WORK_LOG_2025-10-27.md#2](work-logs/WORK_LOG_2025-10-27.md#-2-체크아웃-배송지-변경-시-배송비-즉시-재계산-)

---

## 2025-10-27: 🚚 합배 원칙 개선 - 배송지 비교 로직 추가 ⭐⭐⭐

**문제**: 같은 사용자의 verifying 주문이 있으면 배송지가 달라도 무조건 합배
**원인**: findPendingOrdersWithGroup()가 배송지 정보 미포함
**해결**: postal_code + detail_address 비교 (완전 일치 시만 합배)
**성능**: JOIN 1개 추가 (< 0.1초, 무시 가능)
**커밋**: `3ccd515`

**📝 상세 로그**: [WORK_LOG_2025-10-27.md#1](work-logs/WORK_LOG_2025-10-27.md#-1-합배-원칙-개선---배송지-비교-로직-추가-)

---

## 2025-10-26: 🐛 Bug #9-7: pending 주문 배송비 섹션 숨김 처리 ⭐⭐

**문제**: 결제대기(장바구니) 페이지에서 배송비 표시됨
**원인**: 배송지는 체크아웃 페이지에서 설정되는데 pending 상태에서 표시
**해결**: order.status !== 'pending' 조건 추가
**결과**: verifying/paid 상태부터만 배송비 섹션 표시
**커밋**: `b735194`

**📝 상세 로그**: [WORK_LOG_2025-10-24.md#18](work-logs/WORK_LOG_2025-10-24.md#-18-bug-9-7-pending-주문에서-배송비-섹션-표시-문제-)

---

## 2025-10-25: 🐛 주문 내역 페이지 4가지 버그 완전 해결 ⭐⭐⭐

**문제**: 간헐적 로딩 실패 + 새로고침 시 데이터 사라짐 + 잘못된 탭 데이터 + 뒤로가기 무한 반복
**원인**: hasInitialized 플래그 + cleanup 미리셋 + setState 비동기성 + router.back() 히스토리 의존
**해결**: 4단계 디버깅
**결과**: 100% 정상 작동 + 명확한 네비게이션
**커밋**: `9fd87bf`, `2648a35`, `50e7626`, `a5875fb`

**📝 상세 로그**: [WORK_LOG_2025-10-25.md](work-logs/WORK_LOG_2025-10-25.md)

---

## 2025-10-25: 💳 입금자명 선택 완전 해결 (닉네임 + API 500 + 일괄결제) ⭐⭐⭐

**Bug #5-7**: 닉네임 옵션 누락 + API 500 에러 + 입금자명 저장 안 됨
**Bug #8**: 일괄결제 2건 중 1건만 닉네임 저장
**해결**: nickname 필드 추가 + orderIds 배열 + 일괄처리와 단일처리 명확히 분리
**결과**: 닉네임 정확히 표시 + 일괄결제 모든 주문 동일한 depositorName
**커밋**: `93812d1`, `a764508`, `f146fa4`, `c137fe8`, `a45a3af`, `0110a26`

**📝 상세 로그**: [WORK_LOG_2025-10-25.md#bug-8](work-logs/WORK_LOG_2025-10-25.md#-8-일괄결제-시-depositorname-불일치-버그--rule-0-a-완벽-준수)

---

## 2025-10-26: 🎉 Bug #9-6: 합배 원칙 완전 해결 (3차 수정) ⭐⭐⭐

**문제**: 1건 주문에 불필요한 GROUP-ID 생성
**원인**: findPendingOrdersWithGroup()가 pending + verifying 둘 다 검색
**해결**: verifying만 검색 (pending 제외)
**결과**: 1건 = null, 2건 이상 = 같은 GROUP-ID ✅
**커밋**: `dd70683`, `25d685c`, `789196f`

**📝 상세 로그**: [WORK_LOG_2025-10-25.md#bug-9-6](work-logs/WORK_LOG_2025-10-25.md#-bug-9-6-합배-원칙-완전-해결-3차-수정-)

---

## 2025-10-24: 💰 입금 확인 페이지 일괄결제 그룹핑 UI 구현 ⭐⭐⭐

**문제**: 관리자가 일괄결제 주문 3건을 구분 못함
**해결**: payment_group_id 기반 자동 그룹핑 + 접기/펼치기 UI
**기능**: [일괄결제 3건] 표시, 개별 주문 상세, 전체 입금 확인 버튼
**커밋**: `3156e6d`

**📝 상세 로그**: [WORK_LOG_2025-10-24.md#17](work-logs/WORK_LOG_2025-10-24.md#-17-입금-확인-페이지-일괄결제-그룹핑-ui-구현)

---

## 2025-10-24: 🐛 주문 카드 옵션 표시 + 배송비 제외 ⭐⭐

**문제**: 주문 카드 옵션 미표시 + 배송비 포함 금액
**원인**: CreateOrderUseCase - selected_options 저장 안 함
**해결**: selected_options 저장 추가 + baseShippingFee: 0
**영향**: 신규 주문 옵션 표시 + 상품금액만 표시
**커밋**: `318a59a`

**📝 상세 로그**: [WORK_LOG_2025-10-24.md#15](work-logs/WORK_LOG_2025-10-24.md#-15-주문-카드-옵션-표시--배송비-제외-rule-0-a-8-stage-완료-)

---

## 2025-10-24: 🔧 RPC 제거 - OrderRepository 직접 INSERT 방식으로 변경 ⭐⭐⭐

**문제**: 새 주문 생성 시 product_number, thumbnail_url NULL
**근본 원인**: RPC 함수가 새 컬럼을 INSERT에 포함하지 않음
**해결**: RPC 제거 + Repository에서 4개 테이블 직접 INSERT
**성능**: 1초 (RPC) → 1.5초 예상 (+0.5초, 허용 범위)
**유지보수**: 컬럼 추가 시 자동 반영 (spread operator)
**커밋**: `ec4c109`

**📝 상세 로그**: [WORK_LOG_2025-10-24.md#11](work-logs/WORK_LOG_2025-10-24.md#-11-rpc-제거---orderrepository-직접-insert-방식으로-변경-)

---

## 2025-10-24: ⚡ BuyBottomSheet 로딩 UI 개선 (품절 flash 제거) ⭐⭐

**문제**: 바텀시트 열릴 때 "품절" 표시 flash 후 데이터 로드
**원인**: `setStock(0)` 초기화 + DB 인덱스 없음
**해결**: DB 인덱스 4개 추가 + `setStock(null)` + 로딩 UI
**성능**: 쿼리 2-5배 빠름 + UX 개선
**커밋**: `a174e55`

**📝 상세 로그**: [WORK_LOG_2025-10-24.md#3](work-logs/WORK_LOG_2025-10-24.md#3-buybottomsheet-성능-최적화-db-인덱스--로딩-ui)

---

## 2025-10-24: 🔧 로그아웃 403 Forbidden 완전 해결 ⭐⭐

**문제**: 로그아웃 시 `403 Forbidden` 에러 반복 발생
**원인**: localStorage 먼저 삭제 → 토큰 없이 logout API 호출
**해결**: signOut() 먼저 호출 → 커스텀 데이터 삭제로 순서 변경
**결과**: 403 에러 제거 + 모든 탭 자동 로그아웃
**커밋**: `f1f7a74`

**📝 상세 로그**: [WORK_LOG_2025-10-24.md#5](work-logs/WORK_LOG_2025-10-24.md#-5-로그아웃-403-forbidden-에러-완전-해결-rule-0-a-재적용)

---

## 2025-10-23: 🚀 타임아웃 해결 + BuyBottomSheet 최적화 ⭐⭐⭐

**문제**: 주문 생성 504 타임아웃 (30초+) + 옵션 선택 UX 문제
**원인**: Queue Worker (Serverless 불가) + 여러 UX 버그 + 순차 실행
**해결**: Queue 제거 (동기 처리) + 옵션 선택 개선 + Promise.all() 병렬 처리
**성능**: 타임아웃 → 1초 (97%↓), 옵션 추가 3.68초 → 1.12초 (70%↓)
**커밋**: `27c89c2`, `4d9e43b`, `7638e0d`, `825ddbb`, `460708e`, `3128386`

**📝 상세 로그**: [WORK_LOG_2025-10-23.md#session-7](work-logs/WORK_LOG_2025-10-23.md#session-7-타임아웃-해결--buybottomsheet-최적화)

---

## 2025-10-23: ⚡ BuyBottomSheet 성능 최적화 (5.88초 → 0.5초) ⭐⭐⭐

**문제**: 구매하기 버튼 5.88초 지연
**원인**: LIKE 쿼리 인덱스 없음 + 순차 실행 + 불필요한 쿼리
**해결**: DB 인덱스 (GIN + Composite) + Promise.all() + Option C 구현
**성능**: 5.88초 → 0.5-0.7초 (88-91%↓)

**📝 상세 로그**: [WORK_LOG_2025-10-23.md](work-logs/WORK_LOG_2025-10-23.md)

---

## 2025-10-23: 🏗️ Clean Architecture 마이그레이션 완성 ⭐⭐⭐

**작업**: CreateOrderUseCase Clean Architecture 전환
**완료**: 비즈니스 로직 3개 + API Route + Repository + 테스트 5개
**결과**: Layer 경계 위반 0건, 테스트 100% 통과, Build 성공
**소요 시간**: 1시간 (예상 6.5시간 → Redis/Queue 이미 구축)

**📝 상세 로그**: [WORK_LOG_2025-10-23_CLEAN_MIGRATION.md](work-logs/WORK_LOG_2025-10-23_CLEAN_MIGRATION.md)

---

## 2025-10-24: 🚨 재고 관리 시스템 완전 정상화 ⭐⭐⭐

**문제 1**: 주문 생성 시 재고가 전혀 차감되지 않음
**문제 2**: 주문 취소 시 Variant 재고가 복원되지 않음
**해결**: CreateOrderUseCase + CancelOrderUseCase 재고 로직 추가
**결과**: 재고 초과 판매 방지 + Variant 재고 정확히 복원
**커밋**: `558009c`, `ecf3530`

**📝 상세 로그**:
- [WORK_LOG_2025-10-24.md#13 (재고 차감)](work-logs/WORK_LOG_2025-10-24.md#-13-재고-차감-로직-복원-queue-worker-제거-시-누락-)
- [WORK_LOG_2025-10-24.md#14 (재고 복원)](work-logs/WORK_LOG_2025-10-24.md#-14-cancelorderusecase-variant-재고-복원-지원-추가-)

---

**📌 더 많은 업데이트**: [docs/work-logs/](work-logs/) 참조
