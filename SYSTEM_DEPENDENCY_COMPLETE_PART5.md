# SYSTEM_DEPENDENCY_COMPLETE_PART5 - 수정 영향도 매트릭스 (INDEX)

**작성일**: 2025-10-20
**버전**: 1.0
**목적**: 코드 수정 시 영향받는 모든 요소를 빠르게 파악하고 체계적으로 수정하기 위한 가이드

---

## 📋 목차 (Index)

이 문서는 **4개의 Part**로 나뉘어 있습니다:

### Part 5-1: 중앙 함수 수정 시나리오
**파일**: `SYSTEM_DEPENDENCY_COMPLETE_PART5_1.md`
**내용**:
- Section 1: OrderCalculations 수정 시나리오 (8개 함수)
- Section 2: formatShippingInfo 수정 시나리오
- Section 3: UserProfileManager 수정 시나리오 (4개 함수)
- Section 4: Coupon API 수정 시나리오 (5개 함수)
- Section 5: 중앙 함수 추가 시나리오

**언제 읽어야 하는가?**
- `/lib/orderCalculations.js` 수정 시
- `/lib/shippingUtils.js` 수정 시
- `/lib/UserProfileManager.js` 수정 시
- `/lib/couponApi.js` 수정 시
- 새로운 중앙 함수를 추가할 때

---

### Part 5-2: DB 테이블 수정 시나리오
**파일**: `SYSTEM_DEPENDENCY_COMPLETE_PART5_2.md`
**내용**:
- Section 1: orders 테이블 수정 시나리오 (컬럼 추가/삭제/변경)
- Section 2: order_items 테이블 수정 시나리오
- Section 3: order_payments 테이블 수정 시나리오
- Section 4: order_shipping 테이블 수정 시나리오
- Section 5: products 테이블 수정 시나리오
- Section 6: product_variants 테이블 수정 시나리오
- Section 7: profiles 테이블 수정 시나리오
- Section 8: coupons / user_coupons 테이블 수정 시나리오
- Section 9: RLS 정책 수정 시나리오
- Section 10: DB 인덱스 수정 시나리오

**언제 읽어야 하는가?**
- DB 마이그레이션 생성 시
- 테이블 컬럼 추가/삭제 시
- RLS 정책 수정 시
- 성능 최적화 (인덱스) 시

---

### Part 5-3: API 엔드포인트 수정 시나리오
**파일**: `SYSTEM_DEPENDENCY_COMPLETE_PART5_3.md`
**내용**:
- Section 1: 주문 생성 API 수정 시나리오
- Section 2: 주문 조회 API 수정 시나리오
- Section 3: 주문 상태 변경 API 수정 시나리오
- Section 4: 관리자 API 수정 시나리오
- Section 5: Service Role API 추가 시나리오
- Section 6: API 인증 방식 변경 시나리오
- Section 7: API 응답 형식 변경 시나리오

**언제 읽어야 하는가?**
- `/app/api/` 폴더 수정 시
- API 요청/응답 형식 변경 시
- 새로운 API 추가 시
- Service Role 전환 시

---

### Part 5-4: 페이지 수정 시나리오
**파일**: `SYSTEM_DEPENDENCY_COMPLETE_PART5_4.md`
**내용**:
- Section 1: 체크아웃 페이지 수정 시나리오
- Section 2: 주문 목록/상세 페이지 수정 시나리오
- Section 3: 관리자 주문 관리 페이지 수정 시나리오
- Section 4: 상품 관리 페이지 수정 시나리오
- Section 5: 새로운 페이지 추가 시나리오
- Section 6: 공통 컴포넌트 수정 시나리오
- Section 7: 전역 상태 관리 변경 시나리오

**언제 읽어야 하는가?**
- `/app/` 폴더 페이지 수정 시
- UI/UX 변경 시
- 새로운 기능 추가 시
- 공통 컴포넌트 수정 시

---

## 🎯 사용 방법 (How to Use)

### 1️⃣ 수정하려는 요소 파악
```
질문: 무엇을 수정하려고 하는가?

A. 중앙 함수 (lib/*.js)
   → Part 5-1 읽기

B. DB 테이블 (마이그레이션)
   → Part 5-2 읽기

C. API 엔드포인트 (app/api/*.js)
   → Part 5-3 읽기

D. 페이지 (app/**/page.js)
   → Part 5-4 읽기
```

### 2️⃣ 해당 Part에서 시나리오 찾기
각 Part는 **Section 단위**로 구성되어 있습니다.
- Section 제목으로 빠르게 찾기 (Ctrl+F)
- 예: "OrderCalculations 수정", "orders 테이블 컬럼 추가"

### 3️⃣ 체크리스트 따라가기
각 시나리오마다 **7-15개 체크리스트** 제공:
```markdown
## 시나리오 예시: calculateFinalOrderAmount() 수정

### 📋 수정 전 체크리스트
- [ ] 1. 현재 사용처 7곳 확인 (Part 1 참조)
- [ ] 2. 각 사용처에서 전달하는 파라미터 확인
- [ ] 3. 반환값 형식 변경 여부 확인
...

### 🔧 수정 작업
- [ ] 8. 함수 수정 완료
- [ ] 9. 타입 검증 추가 (JSDoc)
...

### ✅ 수정 후 검증
- [ ] 13. 7개 사용처 모두 테스트
- [ ] 14. 체크아웃 → 주문 생성 E2E 테스트
- [ ] 15. 문서 업데이트 (Part 1, Part 5-1)
```

### 4️⃣ 크로스 레퍼런스 확인
각 시나리오는 **Part 1-4와 연결**되어 있습니다:
```
Part 5-1 (중앙 함수 수정)
  ↓ "Part 1 Section 1.1 참조"
Part 1 (중앙 함수 정의)
  ↓ "사용처: /app/checkout/page.js line 583"
Part 4 (페이지별 종속성)
  ↓ "/checkout 페이지 Section 2"
```

**→ 영향받는 모든 곳을 빠짐없이 확인 가능!**

---

## 🚨 필독! 수정 작업 4대 원칙

### 원칙 1: 임기응변 금지 ❌
```
❌ 나쁜 예:
"이 페이지만 고치면 되겠지?"
→ 다른 페이지에서도 같은 함수 사용 중 → 버그 발생

✅ 좋은 예:
"Part 1에서 사용처 7곳 확인 → Part 5-1에서 영향도 분석 → 체크리스트 완료"
```

### 원칙 2: 문서 먼저, 코드 나중 📚
```
수정 순서:
1. Part 1-4에서 현재 상태 확인
2. Part 5에서 수정 시나리오 찾기
3. 체크리스트 작성 (복사해서 사용)
4. 체크리스트 따라 코드 수정
5. 체크리스트 완료 후 문서 업데이트
```

### 원칙 3: 크로스 레퍼런스 필수 🔗
```
수정 시 반드시 확인:
- Part 1: 중앙 함수 정의 + 사용처
- Part 2: DB 테이블 스키마 + 작업 위치
- Part 3: API 정의 + 요청/응답 형식
- Part 4: 페이지별 종속성
- Part 5: 수정 영향도 매트릭스 (현재 문서)
```

### 원칙 4: 과거 버그 사례 학습 🐛
```
각 Part에는 "🐛 과거 버그 사례" 섹션 포함:
- 어떤 수정이 어떤 버그를 일으켰는가?
- 어떻게 해결했는가?
- 다시는 같은 실수를 하지 않으려면?

예: Part 2 - orders 테이블
"2025-10-04: discount_amount 컬럼 추가 누락 → RLS UPDATE 실패"
→ DB 컬럼 추가 시 반드시 RLS 정책도 함께 수정!
```

---

## 📊 수정 영향도 매트릭스 (Quick Reference)

### 중앙 함수 → 영향 범위 (상위 5개)

| 함수 | 사용처 | 영향받는 페이지 | Part 5-1 Section |
|------|--------|----------------|------------------|
| **calculateFinalOrderAmount()** | 7곳 | 체크아웃, 주문목록, 주문상세, 관리자 3곳 | Section 1.1 |
| **formatShippingInfo()** | 6곳 | 체크아웃, 주문상세, 관리자 주문상세, 배송관리 | Section 2 |
| **atomicProfileUpdate()** | 3곳 | 체크아웃, 마이페이지, BuyBottomSheet | Section 3.2 |
| **validateCoupon()** | 2곳 | 체크아웃, 쿠폰 관리 | Section 4.1 |
| **loadUserCouponsOptimized()** | 2곳 | 체크아웃, 마이페이지 | Section 4.2 |

### DB 테이블 → 영향 범위 (상위 5개)

| 테이블 | INSERT 위치 | SELECT 위치 | UPDATE 위치 | Part 5-2 Section |
|--------|-------------|-------------|-------------|------------------|
| **orders** | 3곳 | 8곳 | 4곳 | Section 1 |
| **order_items** | 2곳 | 8곳 | 2곳 | Section 2 |
| **order_payments** | 2곳 | 8곳 | 2곳 | Section 3 |
| **order_shipping** | 2곳 | 8곳 | 2곳 | Section 4 |
| **products** | 4곳 | 12곳 | 5곳 | Section 5 |

### API → 영향 범위 (상위 5개)

| API | 호출 위치 | 의존 함수 | 의존 테이블 | Part 5-3 Section |
|-----|-----------|-----------|-------------|------------------|
| **POST /api/orders/create** | 2곳 | 5개 | 4개 | Section 1 |
| **POST /api/orders/list** | 3곳 | 1개 | 4개 | Section 2 |
| **PATCH /api/orders/update-status** | 2곳 | 3개 | 4개 | Section 3 |
| **GET /api/admin/orders** | 2곳 | 0개 | 4개 | Section 4 |
| **POST /api/admin/coupons/distribute** | 1곳 | 2개 | 2개 | Section 4 |

### 페이지 → 영향 범위 (상위 5개)

| 페이지 | 사용 함수 | 호출 API | 접근 테이블 | Part 5-4 Section |
|--------|-----------|----------|-------------|------------------|
| **/checkout** | 8개 | 5개 | 6개 | Section 1 |
| **/orders** | 5개 | 3개 | 4개 | Section 2.1 |
| **/admin/orders** | 2개 | 2개 | 4개 | Section 3.1 |
| **/admin/orders/[id]** | 3개 | 3개 | 5개 | Section 3.2 |
| **/mypage** | 4개 | 2개 | 2개 | Section 2.2 |

---

## 🎓 실전 예시: 체크리스트 사용 방법

### 예시 1: "주문 금액 계산에 포인트 할인 추가하기"

#### Step 1: 어떤 Part를 읽어야 하는가?
```
수정 대상: OrderCalculations.calculateFinalOrderAmount()
→ Part 5-1 (중앙 함수 수정 시나리오) 읽기
```

#### Step 2: Part 5-1 Section 1.1 체크리스트 복사
```markdown
## 📋 수정 전 체크리스트 (Part 5-1에서 복사)
- [ ] 1. Part 1 Section 1.1에서 사용처 7곳 확인
- [ ] 2. 각 사용처 파라미터 전달 방식 확인
- [ ] 3. 반환값 구조 확인 (breakdown 객체)
- [ ] 4. 쿠폰 할인 로직 이해 (배송비 제외)
- [ ] 5. Part 2 Section 1에서 orders 테이블 확인
- [ ] 6. 포인트 저장할 컬럼 필요? (신규 추가?)
- [ ] 7. Part 4에서 영향받는 페이지 확인

## 🔧 수정 작업
- [ ] 8. DB 마이그레이션: orders.point_discount 추가
- [ ] 9. calculateFinalOrderAmount()에 point 파라미터 추가
- [ ] 10. breakdown에 pointDiscount 필드 추가
- [ ] 11. finalTotal 계산식 수정
- [ ] 12. 7개 사용처 모두 point 파라미터 전달

## ✅ 수정 후 검증
- [ ] 13. /app/checkout/page.js 테스트
- [ ] 14. /app/orders/page.js 테스트
- [ ] 15. /app/orders/[id]/complete/page.js 테스트
- [ ] 16. 관리자 페이지 3곳 테스트
- [ ] 17. Part 1, Part 2, Part 5-1 문서 업데이트
```

#### Step 3: 체크리스트 실행
```
✅ 1-7번 확인 완료
✅ 8번 마이그레이션 생성
✅ 9-12번 코드 수정
✅ 13-17번 테스트 및 문서 업데이트
→ 완료! 버그 없이 한 번에 성공 ✅
```

### 예시 2: "관리자 주문 목록 페이지 느려짐 (성능 최적화)"

#### Step 1: 어떤 Part를 읽어야 하는가?
```
증상: 페이지 로딩 느림
→ Part 5-4 (페이지 수정 시나리오) + Part 5-3 (API 수정)
```

#### Step 2: Part 5-4 Section 3.1 확인
```markdown
## Section 3.1: 관리자 주문 목록 성능 최적화

### 📋 분석 체크리스트
- [ ] 1. Part 4 Section 12에서 현재 구조 확인
- [ ] 2. 어떤 API 호출? (Part 3 참조)
- [ ] 3. API는 어떤 쿼리 실행? (소스 확인)
- [ ] 4. 불필요한 JOIN 있는가?
- [ ] 5. 인덱스 부족한가? (Part 2 Section 9 참조)
- [ ] 6. SELECT * 사용? (필요한 컬럼만 조회)
- [ ] 7. RLS 서브쿼리 중복? (헬퍼 함수 필요?)

### 🔧 최적화 작업
- [ ] 8. Part 5-3에서 API 수정 시나리오 확인
- [ ] 9. JOIN 제거 또는 간소화
- [ ] 10. SELECT 필요한 컬럼만 명시
- [ ] 11. 인덱스 추가 (필요 시)
- [ ] 12. Part 5-2에서 DB 수정 시나리오 확인

### ✅ 검증
- [ ] 13. 쿼리 시간 측정 (Before/After)
- [ ] 14. 데이터 전송량 확인 (Before/After)
- [ ] 15. 다른 페이지 영향 확인
```

#### Step 3: 실제 최적화 사례 참조
```
Part 3 Section 4.1 → GET /api/admin/orders
과거 버그 사례:
"2025-10-18: product_variants JOIN 4단계 → 200KB
→ JOIN 제거 + 11개 컬럼만 SELECT → 20KB (90% 감소)"

→ 동일한 방법 적용!
```

---

## 🔍 크로스 레퍼런스 흐름도

```
사용자 요청: "calculateFinalOrderAmount()에 포인트 할인 추가"
    ↓
Part 5 (INDEX) - 수정 영향도 매트릭스
    ↓ "중앙 함수 수정"
Part 5-1 Section 1.1 - calculateFinalOrderAmount() 수정 시나리오
    ↓ "사용처 확인: Part 1 Section 1.1 참조"
Part 1 Section 1.1 - calculateFinalOrderAmount() 정의
    ↓ "사용처: /app/checkout/page.js line 583"
Part 4 Section 2 - /checkout 페이지 종속성
    ↓ "접근 테이블: orders, order_items, order_payments, order_shipping"
Part 2 Section 1 - orders 테이블 스키마
    ↓ "INSERT: /app/api/orders/create/route.js line 190-194"
Part 3 Section 1.1 - POST /api/orders/create
    ↓ "호출 함수: calculateFinalOrderAmount()"
Part 5-1 Section 1.1 - 다시 돌아옴
    ↓
체크리스트 완료 → 수정 완료 ✅
```

**→ 5개 Part가 상호 연결되어 완벽한 영향도 분석!**

---

## 📚 Part 5 구조 요약

```
PART 5 (INDEX) ──┬── PART 5-1: 중앙 함수 수정 시나리오
                 │     └─ Section 1-5 (18개 시나리오)
                 │
                 ├── PART 5-2: DB 테이블 수정 시나리오
                 │     └─ Section 1-10 (26개 시나리오)
                 │
                 ├── PART 5-3: API 엔드포인트 수정 시나리오
                 │     └─ Section 1-7 (15개 시나리오)
                 │
                 └── PART 5-4: 페이지 수정 시나리오
                       └─ Section 1-7 (20개 시나리오)

총 79개 수정 시나리오 + 체크리스트
```

---

## 🎯 문서 활용 팁

### Tip 1: 북마크 활용
```
자주 수정하는 요소를 북마크:
- Part 5-1 Section 1.1 (calculateFinalOrderAmount)
- Part 5-2 Section 1 (orders 테이블)
- Part 5-3 Section 1 (주문 생성 API)
- Part 5-4 Section 1 (체크아웃 페이지)
```

### Tip 2: Ctrl+F 검색 키워드
```
검색 키워드 예시:
- "calculateFinalOrderAmount" → Part 1, Part 5-1
- "orders 테이블 컬럼 추가" → Part 5-2 Section 1
- "체크아웃 페이지 수정" → Part 5-4 Section 1
- "RLS 정책" → Part 5-2 Section 9
- "Service Role" → Part 5-3 Section 5
```

### Tip 3: 체크리스트 템플릿화
```
각 시나리오의 체크리스트를 복사해서:
1. 새로운 이슈/PR에 붙여넣기
2. 체크리스트 완료하며 진행
3. 완료 후 커밋 메시지에 "Part 5-X 체크리스트 완료" 명시
```

### Tip 4: 과거 버그 사례 학습
```
매주 금요일 30분:
- Part 1-5의 "🐛 과거 버그 사례" 섹션 읽기
- 같은 실수 반복 방지
- 패턴 학습
```

---

## 🚀 다음 단계

1. **Part 5-1 읽기**: 중앙 함수 수정 시나리오
2. **Part 5-2 읽기**: DB 테이블 수정 시나리오
3. **Part 5-3 읽기**: API 수정 시나리오
4. **Part 5-4 읽기**: 페이지 수정 시나리오

**모든 Part를 읽을 필요는 없습니다!**
**수정하려는 요소에 해당하는 Part만 읽으면 됩니다.**

---

## 📞 문서 관련 질문

- **Part 1-4 위치**: `/Users/jt/live-commerce/SYSTEM_DEPENDENCY_COMPLETE_PARTX.md`
- **최신 업데이트**: 2025-10-20
- **문서 관리자**: Claude (이 시스템을 통해 관리)

---

**이제 Part 5-1부터 순서대로 읽어보세요! 🎉**
