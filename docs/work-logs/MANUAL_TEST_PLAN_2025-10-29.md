# Manual Test Plan - 주문 내역 페이지 버그 수정
**Date**: 2025-10-29
**Author**: Claude
**Changes**: 4개 버그 수정 (URL 라우팅, 상세 페이지, 합배 표시, 탭 숫자)

---

## Test Scenarios

### 🧪 Test #1: URL 라우팅 (Bug #1 Fix)

**목적**: 모든 주문 카드 클릭 시 상세 페이지로 이동 확인

**Steps**:
1. `/orders?tab=verifying` 접속
2. 임의의 주문 카드 클릭
3. URL이 `/orders/{orderId}/complete`로 변경되는지 확인
4. 브라우저 뒤로가기 후 다른 탭(pending, paid, delivered)에서도 동일하게 테스트

**Expected Result**:
- ✅ 모든 탭에서 카드 클릭 시 URL이 `/orders/{orderId}/complete`로 변경
- ✅ 모달 대신 전체 페이지로 표시
- ✅ 브라우저 뒤로가기가 정상 작동

**Test Data**:
- 일괄결제 주문 (payment_group_id 있음)
- 개별 주문 (payment_group_id 없음)

---

### 🧪 Test #2: 주문 상세 페이지 - 모든 주문 표시 (Bug #2 Fix)

**목적**: 일괄결제 그룹의 모든 주문이 상세 페이지에 표시되는지 확인

**Pre-condition**:
- 장바구니에 상품 3개 추가
- "전체 결제하기" 클릭하여 일괄결제
- 체크아웃 완료 (verifying 상태)

**Steps**:
1. `/orders?tab=verifying` 접속
2. 일괄결제 카드 클릭
3. 상세 페이지에서 "그룹 주문 내역" 섹션 확인
4. 3개 주문이 모두 표시되는지 확인

**Expected Result**:
- ✅ "그룹 주문 내역 (3건)" 섹션 표시
- ✅ 각 주문의 상품명, 수량, 금액 정확히 표시
- ✅ 총 입금금액 = 3개 주문 합계

**Edge Cases**:
- ✅ 1개 주문도 그룹 UI로 표시 (length > 0 조건)
- ✅ 2개 주문 그룹
- ✅ 10개 이상 주문 그룹

---

### 🧪 Test #3: 합배 표시 로직 (Bug #3 Fix)

**목적**: 그룹 카드 헤더에 "대표 {orderNumber} 외 N건 합배" 형식 표시 확인

**Pre-condition**:
- 2개 이상 주문의 일괄결제 그룹 존재

**Steps**:
1. `/orders?tab=verifying` 접속
2. 일괄결제 그룹 카드의 헤더 텍스트 확인
3. 대표 주문번호가 정확한지 확인
4. "외 N건" 개수가 정확한지 확인 (전체 - 1)

**Expected Result**:
- ✅ "대표 A-20251029-001 외 2건 합배" 형식 표시
- ✅ 대표 주문번호 = `bulkPaymentInfo.representativeOrderNumber`
- ✅ "외 N건" = `groupOrderCount - 1`

**Examples**:
- 3개 주문 → "대표 A-20251029-001 외 2건 합배"
- 2개 주문 → "대표 A-20251029-001 외 1건 합배"
- 10개 주문 → "대표 A-20251029-001 외 9건 합배"

---

### 🧪 Test #4: 탭 숫자 = 카드 개수 (Bug #4 Fix)

**목적**: 그룹핑 후 탭 숫자가 실제 카드 개수와 일치하는지 확인

**Pre-condition**:
- 일괄결제 3건 (payment_group_id 동일)
- 개별 주문 2건 (payment_group_id null)

**Steps**:
1. `/orders?tab=verifying` 접속
2. "결제 확인중 (N)" 탭 숫자 확인
3. 화면에 표시된 카드 개수 세기
4. 탭 숫자 = 카드 개수인지 확인

**Expected Result**:
- ✅ 탭 숫자 = 카드 개수 (3건 그룹 + 2건 개별 = 3개 카드 → "결제 확인중 (3)")
- ✅ 이전 문제 해결: "1개 (총 13건)" 같은 불일치 없음
- ✅ 단순한 형식: "(N)" 또는 숫자 없음

**Edge Cases**:
- ✅ 모든 주문이 그룹핑된 경우
- ✅ 그룹핑이 없는 경우 (개별 주문만)
- ✅ 탭 변경 후에도 숫자 정확

---

## Integration Test Scenarios

### 🔄 Scenario #1: 장바구니 → 일괄결제 → 주문 내역 전체 플로우

**Steps**:
1. 홈에서 상품 3개 장바구니 추가
2. `/orders?tab=pending` 이동
3. "전체 결제하기" 클릭
4. 체크아웃 페이지에서 입금자명 선택, 주소 입력
5. "계좌이체하기" 클릭
6. 주문 완료 페이지 확인
7. 주문 내역 페이지 (`/orders?tab=verifying`) 이동
8. 카드 개수 = 1개 (3건 그룹핑)
9. 탭 숫자 = (1)
10. 카드 클릭 → 상세 페이지 이동
11. URL = `/orders/{orderId}/complete`
12. 그룹 주문 3건 모두 표시
13. 카드 헤더 = "대표 A-xxx 외 2건 합배"

**Expected Result**: ✅ 모든 단계 정상 작동

---

### 🔄 Scenario #2: 개별 주문 + 그룹 주문 혼합

**Steps**:
1. 상품 A 장바구니 추가 → 개별 결제 (주문 #1)
2. 상품 B, C 장바구니 추가 → 일괄 결제 (주문 #2, #3)
3. 상품 D 장바구니 추가 → 개별 결제 (주문 #4)
4. `/orders?tab=verifying` 이동
5. 카드 개수 = 3개 (개별 2개 + 그룹 1개)
6. 탭 숫자 = (3)
7. 각 카드 클릭하여 상세 확인

**Expected Result**:
- ✅ 개별 주문 카드: 그룹 UI 없음
- ✅ 그룹 주문 카드: "대표 A-xxx 외 1건 합배"
- ✅ 탭 숫자 = 3

---

## Regression Test Checklist

### ✅ 기존 기능 정상 작동 확인

- [ ] 주문 취소 기능 (pending 상태)
- [ ] 페이지네이션 (10개 이상 카드 시)
- [ ] 탭 변경 (pending, verifying, paid, delivered)
- [ ] 배송비 계산 및 표시
- [ ] 쿠폰 할인 표시
- [ ] 송장번호 추적 링크 (delivered 상태)
- [ ] 상품 이미지 표시
- [ ] 옵션 표시 (selectedOptions)
- [ ] 주문 시각 표시 (formatDistanceToNow)

---

## Performance Test

### 📊 페이지 로딩 성능

**Baseline**: 이전 버전 (그룹핑 없음)
**Target**: 그룹핑 추가 후 성능 저하 < 10%

**Metrics**:
- API 응답 시간: < 1초
- 페이지 렌더링: < 500ms
- 그룹핑 로직 실행: < 100ms

**Test Cases**:
- 10개 주문 (그룹 없음)
- 100개 주문 (10개 그룹)
- 1000개 주문 (100개 그룹) - 페이지네이션으로 10개씩

---

## Test Execution Record

**Tester**: [Your Name]
**Date**: 2025-10-29
**Environment**: Production / Development

| Test ID | Status | Notes | Bugs Found |
|---------|--------|-------|------------|
| Test #1 | ⬜ Pending | URL 라우팅 | |
| Test #2 | ⬜ Pending | 주문 상세 페이지 | |
| Test #3 | ⬜ Pending | 합배 표시 | |
| Test #4 | ⬜ Pending | 탭 숫자 | |
| Scenario #1 | ⬜ Pending | 전체 플로우 | |
| Scenario #2 | ⬜ Pending | 혼합 주문 | |
| Regression | ⬜ Pending | 기존 기능 | |

---

## Notes

- 이 버그 수정은 주로 UI/Presentation Layer 변경이므로 e2e 테스트가 가장 효과적
- React hooks 단위 테스트는 @testing-library/react-hooks 설정 필요 (추후 검토)
- Playwright 테스트 스크립트 추가 권장: `tests/orders-grouping.spec.js`

---

## Automated Test Coverage (추후 작성 권장)

### Unit Tests (Jest)
```javascript
// tests/hooks/useOrdersInit.test.js
describe('recalculateStatusCounts', () => {
  test('should return correct counts after grouping', () => {
    const groupedOrders = [
      { status: 'pending' },
      { status: 'pending' },
      { status: 'verifying' }
    ]
    const result = recalculateStatusCounts(groupedOrders)
    expect(result).toEqual({
      pending: 2,
      verifying: 1,
      paid: 0,
      delivered: 0
    })
  })
})
```

### E2E Tests (Playwright)
```javascript
// tests/orders-grouping.spec.js
test('should group orders by payment_group_id', async ({ page }) => {
  // Test implementation
})
```

---

## Approval

- [ ] Manual tests completed
- [ ] Regression tests passed
- [ ] Performance acceptable
- [ ] Ready for deployment

**Approved by**: _______________
**Date**: _______________
