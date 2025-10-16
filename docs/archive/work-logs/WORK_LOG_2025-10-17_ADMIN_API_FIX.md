# 작업 로그 - 2025-10-17: 관리자 페이지 API 에러 대량 수정 + 발주 시스템 완전 개선

**날짜**: 2025-10-17
**작업 시간**: 약 2시간
**작업자**: Claude (AI Assistant)

---

## 📋 작업 개요

**작업 배경**:
- 관리자 페이지 여러 곳에서 500 에러 발생
- 에러 메시지: `column products_2.image_url does not exist`
- 발주 관리 페이지 데이터 0개 표시
- UI가 구버전 스타일로 일관성 부족

**최종 결과**:
- ✅ 7개 API 에러 완전 수정
- ✅ 발주 시스템 데이터 정상 표시 (19개 주문)
- ✅ UI 일관성 확보 (suppliers 페이지 스타일 통일)
- ✅ 모바일 최적화 (2x2 그리드, K 단위)

---

## 🔧 수정된 문제 목록

### 1. 관리자 주문 API image_url 제거 (커밋: 37c57e1)

**문제**:
```
GET /api/admin/orders 500 (Internal Server Error)
column products_2.image_url does not exist
```

**원인**:
- `/app/api/admin/orders/route.js`에서 존재하지 않는 `image_url` 컬럼 쿼리
- `products` 테이블에는 `thumbnail_url` 컬럼만 존재
- `DB_REFERENCE_GUIDE.md`와 불일치

**해결**:
```javascript
// Before
products (
  id,
  title,
  product_number,
  image_url,        // ❌ 존재하지 않음
  thumbnail_url,
  price,
  sku
)

// After
products (
  id,
  title,
  product_number,
  thumbnail_url,    // ✅ 올바른 컬럼
  price,
  sku
)
```

**영향**:
- `/app/api/admin/orders/route.js` (lines 59, 67)
- 관리자 주문 목록/상세 페이지 정상화

---

### 2. fulfillmentGrouping 이미지 수정 (커밋: 4cf8ef2)

**문제**:
- 배송 취합 관리 페이지에서 제품 이미지 안 나옴
- `image_url` 속성 사용 중

**해결**:
```javascript
// Before
const productImage = product.image_url || null

// After
const productImage = product.thumbnail_url || null
```

**영향**:
- `/lib/fulfillmentGrouping.js` (line 127)
- 배송 취합 관리 페이지 이미지 정상 표시

---

### 3. 관리자 주문 페이지 배열 인덱스 수정 (커밋: e8428f3)

**문제**:
- "입금확인중(verifying)" 상태 주문이 필터 탭에 안 나옴
- 콘솔 에러: `Cannot read properties of undefined (reading 'method')`

**원인**:
- Supabase PostgREST JOIN 결과는 **항상 배열로 반환**됨
- `order.order_shipping` → `[{...}]` 형태
- `[0]` 인덱스 없이 직접 접근 시 undefined

**해결**:
```javascript
// Before
const shipping = order.order_shipping || {}
const payment = order.order_payments || {}
// payment.method → undefined (배열이므로)

// After
const shipping = order.order_shipping?.[0] || {}
const payment = order.order_payments?.[0] || {}
// payment.method → 정상 접근
```

**영향**:
- `/app/admin/orders/page.js` (lines 102-103)
- "계좌이체" / "카드결제" 필터 탭 정상 작동
- "verifying" 상태 주문 정상 표시

**교훈**:
> Supabase JOIN 결과는 **무조건 배열**이므로 `[0]` 인덱스 필수!

---

### 4. 물류팀 + 관리자 주문 API 업체 정보 추가 (커밋: 050ae79)

**문제**:
- 물류팀 집계 페이지: "업체 정보를 못 가져오고 있는듯"
- 제품 이미지도 안 나옴

**원인**:
- API 쿼리에 `supplier_id`와 `suppliers` JOIN 누락
- `image_url` 사용 중

**해결**:
```javascript
// Before
products (
  id,
  title,
  model_number,
  supplier_id,      // ❌ 이것만으로는 업체 정보 없음
  purchase_price,
  image_url         // ❌ 존재하지 않음
)

// After
products (
  id,
  title,
  model_number,
  supplier_id,
  purchase_price,
  thumbnail_url,    // ✅ 올바른 컬럼
  suppliers (       // ✅ JOIN 추가
    id,
    name,
    code,
    contact_person,
    phone
  )
)
```

**영향**:
- `/app/api/admin/orders/route.js` (lines 55-70)
- `/lib/logisticsAggregation.js` (line 28)
- 물류팀 집계 페이지 정상 작동 (19개 주문 표시)

---

### 5. 발주 상세 API supplier_sku 제거 (커밋: c5abc20)

**문제**:
```
GET /api/admin/purchase-orders/b8bea9d2-aff4-41d3-badc-52b8b8ed21d3 500
column products_2.supplier_sku does not exist
```

**원인**:
- `supplier_sku` 컬럼이 DB에 존재하지 않음
- `DB_REFERENCE_GUIDE.md`에도 없는 컬럼

**해결**:
```javascript
// Before
products (
  id,
  title,
  model_number,
  supplier_id,
  purchase_price,
  supplier_sku    // ❌ 존재하지 않음
)

// After
products (
  id,
  title,
  model_number,
  supplier_id,
  purchase_price,
  thumbnail_url,  // ✅ 이미지 추가
  suppliers (     // ✅ JOIN 추가
    id,
    name,
    code
  )
)
```

**영향**:
- `/app/api/admin/purchase-orders/[supplierId]/route.js` (lines 61-73)
- 발주 상세 페이지 500 에러 제거

---

### 6. 발주 관리 데이터 연결 및 UI 개선 (커밋: 6c6b870) ⭐

**문제**:
- 발주 메인 페이지: 데이터 0개
- 발주 상세 페이지: 데이터 0개
- 콘솔 로그: `📋 발주 상세: 0 개 아이템`

**근본 원인**:
```
발주 API:     status = 'deposited'만 조회
물류팀 API:   status = 'paid' 조회
→ 데이터 불일치!
```

**해결 1: status 필터 통일**
```javascript
// Before (발주 API)
.eq('status', 'deposited')

// After (발주 API + 물류팀 통일)
.in('status', ['paid', 'deposited'])
```

**해결 2: UI 모던화 (suppliers 페이지 스타일 참고)**

**변경 사항**:
1. **framer-motion 애니메이션 추가**:
   ```javascript
   import { motion } from 'framer-motion'

   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
   >
   ```

2. **제품 이미지 표시**:
   ```javascript
   // 12x12 썸네일
   <img src={item.productImage} className="w-12 h-12 object-cover" />
   ```

3. **헤더 카드 레이아웃 개선**:
   ```javascript
   <div className="p-3 bg-blue-100 rounded-lg">
     <BuildingStorefrontIcon className="w-8 h-8 text-blue-600" />
   </div>
   ```

4. **통계 카드 색상 조화**:
   - 아이템 수: `bg-gray-50` → `text-blue-600`
   - 발주 수량: `bg-purple-50` → `text-purple-600`
   - 발주 금액: `bg-green-50` → `text-green-600`

5. **테이블 hover 효과**:
   ```javascript
   <motion.tr className="hover:bg-gray-50">
   ```

6. **빈 상태 UI 개선**:
   ```javascript
   <CubeIcon className="w-16 h-16 text-gray-400" />
   <h3>발주할 제품이 없습니다</h3>
   ```

7. **푸터 그라데이션**:
   ```javascript
   <tfoot className="bg-gradient-to-r from-blue-50 to-green-50">
   ```

**영향**:
- `/app/api/admin/purchase-orders/route.js` (lines 31-77)
- `/app/api/admin/purchase-orders/[supplierId]/route.js` (lines 46-90)
- `/app/admin/purchase-orders/[supplierId]/page.js` (전면 개선)

**결과**:
- ✅ 발주 메인 페이지: 3개 업체 표시
- ✅ 발주 상세 페이지: 19개 주문 아이템 표시
- ✅ suppliers 페이지와 일관된 UI

---

### 7. 발주 상세 모바일 최적화 (커밋: acf2447) ⭐

**문제**:
- 헤더가 너무 큼 (큰 카드 스타일)
- 통계가 모바일에서 비효율적 (3열 레이아웃)

**해결 1: 헤더를 배송 취합 관리 스타일로 변경**

```javascript
// Before
<motion.div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
  <div className="flex items-center gap-3">
    <div className="p-3 bg-blue-100 rounded-lg">
      <BuildingStorefrontIcon className="w-8 h-8 text-blue-600" />
    </div>
    <div>
      <h1 className="text-2xl font-bold">{supplier.name} 발주서</h1>
      <p>업체 코드: {supplier.code}</p>
    </div>
  </div>
</motion.div>

// After (배송 취합 관리 스타일)
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div className="flex items-center gap-3">
    <Link href="/admin/purchase-orders">
      <ArrowLeftIcon className="w-6 h-6" />
    </Link>
    <div>
      <h1 className="text-2xl font-bold">🏢 {supplier.name} 발주서</h1>
      <p className="text-sm text-gray-600 mt-1">
        업체 코드: {supplier.code} | 담당자: {supplier.contact_person} | 연락처: {supplier.phone}
      </p>
    </div>
  </div>
  <div className="flex gap-2">
    <button>인쇄</button>
    <button>Excel 업로드</button>
  </div>
</div>
```

**변경 사항**:
- 큰 카드 → 간단한 텍스트 헤더
- 🏢 이모지 추가
- 연락처 정보 추가
- 버튼 아이콘 크기 축소 (w-5 → w-4)

**해결 2: 통계 카드 모바일 최적화**

```javascript
// Before
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div className="text-center p-4 bg-gray-50 rounded-lg">
    <p className="text-sm text-gray-600 mb-2">총 아이템 수</p>
    <p className="text-3xl font-bold text-blue-600">{orderItems.length}개</p>
  </div>
  ...
</div>

// After
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
  <div className="text-center">
    <p className="text-xs text-gray-500 mb-1">총 아이템</p>
    <p className="text-2xl font-bold text-blue-600">{orderItems.length}</p>
  </div>
  <div className="text-center">
    <p className="text-xs text-gray-500 mb-1">발주 수량</p>
    <p className="text-2xl font-bold text-purple-600">{totals.totalQuantity}</p>
  </div>
  <div className="text-center">
    <p className="text-xs text-gray-500 mb-1">발주 금액</p>
    <p className="text-2xl font-bold text-green-600">₩{(totals.totalAmount / 1000).toFixed(0)}K</p>
  </div>
  <div className="text-center">
    <p className="text-xs text-gray-500 mb-1">평균 단가</p>
    <p className="text-2xl font-bold text-orange-600">₩{(totals.totalAmount / totals.totalQuantity / 1000).toFixed(0)}K</p>
  </div>
</div>
```

**변경 사항**:
- 3열 → 2x2 그리드 (모바일), 4열 (데스크톱)
- 라벨 폰트: `text-sm` → `text-xs`
- 값 폰트: `text-3xl` → `text-2xl`
- K 단위 표시 (예: ₩1,485K)
- **평균 단가 추가** (4번째 통계, 주황색)

**해결 3: 매입가 디버깅 로그 추가**

```javascript
// 매입가 디버깅
if (items.length > 0) {
  console.log('💰 매입가 샘플 데이터:', {
    첫번째아이템: items[0],
    매입가: items[0].purchasePrice,
    수량: items[0].quantity,
    총액: items[0].totalPrice
  })
  const 총매입가 = items.reduce((sum, item) => sum + item.totalPrice, 0)
  console.log('💰 전체 매입가 합계:', 총매입가.toLocaleString(), '원')
}
```

**영향**:
- `/app/admin/purchase-orders/[supplierId]/page.js`

**결과**:
- ✅ 모바일 화면 효율적 사용
- ✅ 배송 취합 관리와 일관된 UI
- ✅ 매입가 문제 디버깅 준비

---

## 📊 문제 해결 패턴 분석

### 근본 원인

모든 문제가 **동일한 근본 원인**에서 발생:

1. **DB 스키마와 코드 불일치**:
   - ❌ `image_url` 컬럼이 DB에 없음
   - ✅ `thumbnail_url` 컬럼을 사용해야 함
   - ❌ `supplier_sku` 컬럼이 DB에 없음

2. **Supabase PostgREST JOIN 이해 부족**:
   - JOIN 결과는 **항상 배열로 반환**
   - `order.order_shipping` → `[{...}]` (배열)
   - `[0]` 인덱스 없이 접근 시 undefined

3. **API 필터 불일치**:
   - 발주 API: `status = 'deposited'`
   - 물류팀 API: `status = 'paid'`
   - → 데이터 불일치

### 해결 전략

1. **DB_REFERENCE_GUIDE.md 확인**:
   - 모든 DB 작업 전 필수 확인
   - 존재하는 컬럼만 쿼리

2. **JOIN 결과 처리**:
   - Supabase JOIN은 **무조건 배열**
   - `?.[0]` 패턴 사용

3. **API 일관성 유지**:
   - 같은 데이터를 다루는 API는 필터 통일
   - `.in('status', ['paid', 'deposited'])`

4. **UI 일관성 유지**:
   - 같은 기능은 같은 스타일 (suppliers 참고)
   - framer-motion + 색상 조화

---

## 🎯 최종 결과

### 수정된 문제
- ✅ 관리자 주문 API 500 에러 제거
- ✅ 배송 취합 관리 이미지 정상 표시
- ✅ 입금확인중 주문 필터 탭 정상 작동
- ✅ 물류팀 집계 업체 정보 정상 표시
- ✅ 발주 상세 500 에러 제거
- ✅ 발주 메인/상세 데이터 연결
- ✅ 발주 UI 모바일 최적화

### 개선된 UI
- ✅ suppliers 페이지와 일관된 스타일
- ✅ framer-motion 애니메이션
- ✅ 제품 이미지 표시
- ✅ 모바일 최적화 (2x2 그리드)
- ✅ K 단위 금액 표시
- ✅ 평균 단가 통계 추가

### 배포 내역
```
37c57e1: admin orders image_url 제거
4cf8ef2: fulfillmentGrouping image_url → thumbnail_url
e8428f3: admin orders 배열 인덱스 수정
050ae79: logistics + orders API supplier 정보 추가
c5abc20: purchase orders API 수정
6c6b870: purchase orders 데이터 연결 + UI 개선
acf2447: purchase orders 모바일 최적화
```

### 다음 작업
- ⚠️ 매입가 데이터 확인 필요
  - 콘솔 로그로 디버깅 준비 완료
  - products 테이블 purchase_price 확인 필요

---

## 📚 교훈 및 가이드라인

### 1. DB 작업 체크리스트
```
□ DB_REFERENCE_GUIDE.md 확인
□ 존재하는 컬럼만 쿼리
□ JOIN 결과는 배열로 처리 ([0] 인덱스)
□ 모든 관련 API 동시에 수정
```

### 2. API 설계 원칙
```
□ 같은 데이터는 필터 통일
□ JOIN은 무조건 배열 반환
□ thumbnail_url (O) / image_url (X)
□ supplier 정보는 JOIN으로
```

### 3. UI 일관성 원칙
```
□ 같은 기능은 같은 스타일
□ 모바일 우선 고려 (2x2 그리드)
□ K 단위로 간결하게
□ framer-motion 애니메이션
□ 색상 조화 (blue-purple-green-orange)
```

### 4. 디버깅 전략
```
□ 콘솔 로그 먼저 추가
□ 샘플 데이터 출력
□ 전체 합계 확인
□ 배포 후 확인
```

---

**작성 완료**: 2025-10-17
**문서 버전**: 1.0
**다음 업데이트**: 매입가 문제 해결 후
