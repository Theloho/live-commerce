# 주소 저장 버그 수정 (React State 비동기 문제)

**작업일**: 2025-10-04
**상태**: ✅ 완료
**작업 타입**: 버그 수정 (React State Race Condition)

---

## 📋 문제 요약

### 증상
- 체크아웃에서 제주 주소 선택
- "입금하기" 클릭
- 주문 상세에서 서울 주소 표시 (잘못된 우편번호)

### 로그 분석
```javascript
// 체크아웃 UI 계산
💰 체크아웃 주문 계산: { postalCode: '63625' } // ✓ 제주

// 주문 상세 DB 조회
💰 주문 상세 금액 계산: { postalCode: '05794' } // ✗ 서울
```

---

## 🔍 근본 원인 분석

### 1. FEATURE_REFERENCE_MAP.md 체계적 분석

**§ 1.1 주문 생성 플로우:**
```
AddressManager (배송지 선택)
  ↓ onSelect(address)
  ↓ setSelectedAddress(address)
  ↓ setUserProfile({...postal_code})
  ↓
createOrder(orderProfile)
  ↓
order_shipping INSERT (postal_code)
```

**체크리스트:**
- ✅ postal_code 저장 및 배송비 계산 (formatShippingInfo)

### 2. React State 비동기 Race Condition 발견

**문제 코드 (checkout/page.js:710-713):**
```javascript
// ❌ selectedAddress와 userProfile 병합
const orderProfile = {
  ...userProfile,
  address: selectedAddress?.address || userProfile.address,
  postal_code: selectedAddress?.postal_code || userProfile.postal_code
}
```

**실행 순서:**
1. 사용자가 제주 주소 클릭
2. `onSelect(address)` 호출
3. `setSelectedAddress(address)` 실행 (비동기!)
4. `setUserProfile({...postal_code})` 실행 (비동기!)
5. 모달 닫힘 (UI에는 제주 표시됨)
6. 사용자가 **즉시** "입금하기" 클릭
7. `handlePayment()` 실행 시 state 아직 업데이트 안 됨
8. `selectedAddress?.postal_code` → undefined
9. fallback: `userProfile.postal_code` (서울) 사용
10. DB에 서울 저장 ❌

**핵심:**
- React state 업데이트는 **비동기**
- 빠르게 클릭 시 이전 state 사용
- Race condition 발생

---

## 🔧 해결 방법

### userProfile만 사용 (onSelect에서 이미 업데이트됨)

**수정 코드 (checkout/page.js):**
```javascript
// ✅ userProfile 직접 사용
const orderProfile = userProfile
```

**이유:**
1. `onSelect`에서 `setUserProfile({...postal_code})` 실행
2. userProfile 업데이트 → re-render 발생
3. re-render 시점에 handlePayment 실행
4. 최신 userProfile 사용 보장

**동작 흐름:**
```javascript
// onSelect 핸들러 (checkout/page.js:1001-1014)
onSelect={(address) => {
  const updatedProfile = {
    ...userProfile,
    postal_code: address.postal_code  // ← 즉시 반영
  }

  setSelectedAddress(address)
  setUserProfile(updatedProfile)
  setShowAddressModal(false)
}}

// handlePayment (checkout/page.js:708)
const orderProfile = userProfile  // ← 이미 업데이트됨
```

---

## 📝 변경 파일 목록

### 코드 수정
1. ✅ `app/checkout/page.js`
   - Line 673-674: 일괄결제 - selectedAddress 병합 제거
   - Line 707-708: 단일 주문 - selectedAddress 병합 제거
   - userProfile 직접 사용

### 문서 업데이트
1. ✅ `FEATURE_REFERENCE_MAP.md`
   - § 1.1 특이사항 추가: React State 주의사항
   - § 1.1 체크리스트 추가: userProfile 사용 필수
   - § 1.1 최근 수정 이력 추가 (2025-10-04)

2. ✅ `docs/archive/work-logs/WORK_LOG_2025-10-04_ADDRESS_FIX.md`
   - 작업 로그 상세 기록

---

## ✅ 테스트 결과

### 테스트 환경
- **브라우저**: 프로덕션 환경
- **페이지**: `/checkout`

### 테스트 시나리오
1. ✅ 제주 주소 선택
2. ✅ 모달 닫힘
3. ✅ **즉시** "입금하기" 클릭 (빠르게)
4. ✅ 주문 상세에서 제주 주소 확인
5. ✅ 우편번호 '63625' 정상 저장
6. ✅ 도서산간 배송비 +3,000원 정상 계산

**결과**: 주소 저장 정상 작동 확인 ✅

---

## 🎓 배운 점

### 1. FEATURE_REFERENCE_MAP.md 중요성

**워크플로우 준수:**
```
1. 작업 전: FEATURE_REFERENCE_MAP.md 읽기
2. 작업 중: 체크리스트 기반 코드 작성
3. 작업 후: 문서 업데이트
```

**효과:**
- 디버깅 없이 근본 원인 파악 가능
- 체계적 분석으로 임시방편 방지
- 문서로 지식 축적

### 2. React State 비동기 이해

**React setState는 비동기:**
```javascript
// ❌ 즉시 반영 안 됨
setState(newValue)
console.log(state)  // 여전히 이전 값

// ✅ 콜백 또는 useEffect 사용
setState(newValue)
// 다음 렌더링에서 반영됨
```

**Race Condition 방지:**
- 의존성 최소화 (userProfile만 사용)
- 동기적 계산 (const updatedProfile = {...})
- 불필요한 state 병합 제거

### 3. 개발의 논리적 구조

**체계적 접근:**
1. DB 구조 이해 (order_shipping.postal_code)
2. 데이터 흐름 파악 (AddressManager → createOrder)
3. 코드 동작 원리 (React state 비동기)
→ 문제 발견 및 근본 해결

**vs 임시방편:**
- 로그만 보고 증상 치료 ✗
- 체계적 분석 후 근본 수정 ✓

---

## 🔗 관련 문서

- **FEATURE_REFERENCE_MAP.md** - § 1.1 주문 생성
- **DETAILED_DATA_FLOW.md** - § 체크아웃 페이지
- **DB_REFERENCE_GUIDE.md** - § order_shipping 테이블

---

## 📊 영향도

### 영향받는 기능 (모두 해결)
1. ✅ **단일 주문 생성** - 주소 정상 저장
2. ✅ **일괄결제** - 주소 정상 저장
3. ✅ **배송비 계산** - 우편번호 기반 정상 계산

### 영향받지 않는 기능
- ✅ 주문 조회
- ✅ 주문 상태 변경
- ✅ 발주 시스템

---

**작업 완료**: 2025-10-04
**작업자**: Claude Code
**승인**: 사용자 피드백 반영 (체계적 분석 요청)

**핵심 교훈**: "개발은 논리적 구조. 문서 읽고 체계적으로 분석하면 디버깅 없이도 문제 해결 가능."
