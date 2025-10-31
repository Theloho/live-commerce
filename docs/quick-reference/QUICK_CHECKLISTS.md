# 🎯 빠른 참조 - 자주 하는 작업

## 주문 생성 시
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
- [ ] 🎟️ applyCouponUsage() 호출하여 쿠폰 사용 처리했는가?
```

## 주문 조회 시
```javascript
// ✅ 체크리스트
- [ ] DB_REFERENCE_GUIDE.md 4.1절 읽기
- [ ] UserProfileManager 사용했는가?
- [ ] 카카오 사용자는 order_type으로 조회하는가?
- [ ] 대체 조회 로직 포함했는가?
```

## 주문 상태 변경 시
```javascript
// ✅ 체크리스트
- [ ] DB_REFERENCE_GUIDE.md 3.2절 읽기
- [ ] updateOrderStatus 사용했는가?
- [ ] 타임스탬프 자동 기록되는가?
- [ ] 로그 확인 (🕐, 💰, 🚚 이모지)
```

## Variant 상품 등록 시 ⭐
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

## 발주서 생성 시 ⭐
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

## 🚨 절대 규칙

### 🚨 코딩 규칙 (CODING_RULES.md 필수 확인!)

**모든 개발 작업 전에 반드시 읽어야 합니다:**
→ **`CODING_RULES.md`** - 중복 로직 작성 금지, 중앙화 모듈 사용 강제

**핵심 규칙 요약:**
1. ❌ **절대 금지**: 계산 로직을 페이지에서 직접 작성
2. ✅ **반드시**: `/lib/orderCalculations.js` 등 중앙화 모듈 사용
3. ✅ **반드시**: 새 로직 작성 전 기존 모듈 확인
4. ✅ **반드시**: 중복 코드 발견 시 즉시 리팩토링

### ✅ 항상 해야 할 것 (Phase 0-4 워크플로우)
1. ✅ **종속성 문서 먼저 확인**: `SYSTEM_DEPENDENCY_MASTER_GUIDE.md` → 해당 Part → Part 5 체크리스트
2. ✅ **소스코드 확인**: 문서에서 파악한 파일들 직접 읽기
3. ✅ **수정 계획 수립**: TodoWrite로 작업 계획 기록
4. ✅ **체크리스트 따라 작업**: 영향받는 모든 곳 수정
5. ✅ **문서 업데이트**: SYSTEM_DEPENDENCY_COMPLETE_PARTX.md 업데이트
6. ✅ **코딩 규칙 확인**: `CODING_RULES.md` (중복 로직 금지)
7. ✅ **중앙화 모듈 확인**: `/lib/` 폴더에서 기존 함수 찾기
8. ✅ **DB 작업 전**: `DB_REFERENCE_GUIDE.md` + RLS 정책 확인

### ❌ 절대 하지 말 것
1. ❌ **문서 확인 없이 수정** → 영향받는 곳 놓침 → 버그 발생
2. ❌ **소스코드 확인 없이 수정** → 현재 상태 모름 → 잘못된 수정
3. ❌ **수정 계획 없이 즉시 작업** → 놓친 파일 발생
4. ❌ **문서 업데이트 생략** → 다음 작업 시 잘못된 정보
5. ❌ **중복 계산 로직 작성** (페이지에서 직접 계산 금지!)
6. ❌ **중복 DB 쿼리 작성** (supabaseApi.js 사용!)
7. ❌ **임시방편 수정** (항상 근본적인 해결책)
8. ❌ **RLS 정책 확인 생략** (DB 변경 시 필수!)

---

**📌 참고**: 이 체크리스트는 [CLAUDE.md](../../CLAUDE.md)의 빠른 참조입니다.
