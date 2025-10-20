# SYSTEM_DEPENDENCY_COMPLETE_PART5_4 - 페이지 수정 시나리오

**작성일**: 2025-10-20
**버전**: 1.0
**목적**: 페이지 수정 시 영향받는 모든 요소를 체크리스트로 관리

---

## 📋 목차

### Section 1: 체크아웃 페이지 수정 시나리오
- 1.1 UI 컴포넌트 추가
- 1.2 결제 로직 변경
- 1.3 쿠폰 시스템 수정

### Section 2: 주문 목록/상세 페이지 수정 시나리오
- 2.1 필터링/정렬 추가
- 2.2 주문 상세 정보 추가

### Section 3: 관리자 주문 관리 페이지 수정 시나리오
- 3.1 대량 작업 기능 추가
- 3.2 통계 차트 추가

### Section 4: 상품 관리 페이지 수정 시나리오
- 4.1 Variant 관리 기능 추가
- 4.2 재고 관리 개선

### Section 5: 새로운 페이지 추가 시나리오
- 5.1 페이지 설계
- 5.2 라우팅 설정
- 5.3 인증 설정

### Section 6: 공통 컴포넌트 수정 시나리오
- 6.1 재사용 컴포넌트 수정
- 6.2 컴포넌트 API 변경

### Section 7: 전역 상태 관리 변경 시나리오
- 7.1 sessionStorage 변경
- 7.2 Context API 추가

---

## Section 1: 체크아웃 페이지 수정 시나리오

### 📌 개요
- **페이지**: /checkout
- **현재 상태**: Part 4 Section 2 참조
- **호출 함수**: 8개 (OrderCalculations, formatShippingInfo 등)
- **호출 API**: 5개 (주문 생성, 쿠폰 검증 등)
- **DB 테이블**: 6개 (orders, order_items, order_payments, order_shipping, profiles, coupons)

### 🔍 현재 상태 (Part 4에서 확인)
```javascript
// Part 4 Section 2 참조

호출하는 중앙 함수:
- OrderCalculations.calculateFinalOrderAmount() (3곳)
- formatShippingInfo()
- atomicProfileUpdate()
- validateCoupon()
- loadUserCouponsOptimized()

호출하는 API:
- POST /api/orders/create
- POST /api/orders/list (일괄결제 시)
- ... (Part 4 Section 2 참조)
```

---

### 1.1 UI 컴포넌트 추가 시나리오

#### 📋 UI 컴포넌트 추가 전 체크리스트

- [ ] **1. 추가하려는 컴포넌트 정의**
  - 예: 포인트 사용 입력란
  - 예: 배송 메시지 입력란
  - 예: 선물하기 옵션

- [ ] **2. 컴포넌트 위치 확인**
  - 어디에 배치?
  - 기존 레이아웃에 영향?

- [ ] **3. 상태 관리 확인**
  - useState 추가 필요?
  - 상위 컴포넌트로 전달 필요?

- [ ] **4. 의존 함수 확인** (Part 1 참조)
  - 새로운 계산 로직 필요?
  - 기존 함수 수정 필요?

#### 🔧 UI 컴포넌트 추가 작업 체크리스트

- [ ] **5. 상태 추가**
  ```jsx
  // /app/checkout/page.js
  const [pointToUse, setPointToUse] = useState(0)
  const [availablePoints, setAvailablePoints] = useState(0)
  ```

- [ ] **6. UI 컴포넌트 추가**
  ```jsx
  <div className="포인트-사용">
    <label>포인트 사용</label>
    <input
      type="number"
      value={pointToUse}
      onChange={(e) => setPointToUse(Number(e.target.value))}
      max={availablePoints}
    />
    <span>보유: {availablePoints.toLocaleString()}P</span>
    <button onClick={() => setPointToUse(availablePoints)}>전액 사용</button>
  </div>
  ```

- [ ] **7. 계산 로직 수정**
  ```jsx
  useEffect(() => {
    const calculation = OrderCalculations.calculateFinalOrderAmount(items, {
      region: userProfile.postal_code,
      coupon: appliedCoupon,
      point: pointToUse,  // ✅ 추가
      paymentMethod: 'bank_transfer',
      baseShippingFee: isFreeShipping
    })

    setTotalAmount(calculation.finalTotal)
  }, [items, appliedCoupon, pointToUse, isFreeShipping])
  ```

- [ ] **8. API 호출 파라미터 추가**
  ```jsx
  const handleCreateOrder = async () => {
    const response = await fetch('/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        orderData,
        userProfile,
        user,
        depositName,
        coupon: appliedCoupon,
        point: pointToUse  // ✅ 추가
      })
    })
  }
  ```

#### ✅ UI 컴포넌트 추가 후 검증 체크리스트

- [ ] **9. UI 표시 확인**
  - 포인트 입력란 정상 표시?
  - 보유 포인트 정확히 표시?

- [ ] **10. 계산 정확도 확인**
  - 포인트 입력 → 총액 즉시 변경?
  - 포인트 + 쿠폰 동시 사용 가능?

- [ ] **11. 주문 생성 확인**
  - 포인트 사용 → DB 저장 확인
  - 포인트 잔액 감소 확인

- [ ] **12. 에러 처리 확인**
  - 포인트 부족 → 에러 메시지
  - 마이너스 값 → 검증

- [ ] **13. 반응형 확인**
  - 모바일에서 정상 표시?
  - 레이아웃 깨지지 않음?

- [ ] **14. 문서 업데이트**
  - Part 4 Section 2 - 새 컴포넌트 추가

---

### 1.2 결제 로직 변경 시나리오

#### 📋 결제 로직 변경 전 체크리스트

- [ ] **1. 현재 결제 로직 확인** (Part 4 Section 2)
  - 무료배송 조건 확인
  - 쿠폰 할인 계산
  - 도서산간 배송비 계산
  - OrderCalculations 사용

- [ ] **2. 변경하려는 로직 정의**
  - 예: 포인트 할인 추가
  - 예: 결제 수단별 수수료 추가
  - 예: 할부 옵션 추가

- [ ] **3. 의존 함수 확인** (Part 1 참조)
  - OrderCalculations.calculateFinalOrderAmount() 수정 필요? (Part 5-1 Section 1.1 참조)

- [ ] **4. API 영향 확인** (Part 3 참조)
  - POST /api/orders/create 수정 필요? (Part 5-3 Section 1 참조)

#### 🔧 결제 로직 변경 작업 체크리스트

- [ ] **5. OrderCalculations 수정** (필요 시)
  - Part 5-1 Section 1.1 체크리스트 따르기

- [ ] **6. 체크아웃 페이지 계산 로직 수정**
  ```jsx
  const calculation = OrderCalculations.calculateFinalOrderAmount(items, {
    region: userProfile.postal_code,
    coupon: appliedCoupon,
    point: pointToUse,  // ✅ 추가
    paymentMethod: selectedPaymentMethod,  // ✅ 수정
    baseShippingFee: isFreeShipping
  })
  ```

- [ ] **7. breakdown 객체 표시 수정**
  ```jsx
  <div className="주문-요약">
    <div>
      <span>상품 합계</span>
      <span>₩{calculation.breakdown.productSubtotal.toLocaleString()}</span>
    </div>
    <div>
      <span>배송비</span>
      <span>₩{calculation.breakdown.shippingFee.toLocaleString()}</span>
    </div>
    {calculation.breakdown.couponDiscount > 0 && (
      <div>
        <span>쿠폰 할인</span>
        <span>-₩{calculation.breakdown.couponDiscount.toLocaleString()}</span>
      </div>
    )}
    {calculation.breakdown.pointDiscount > 0 && (  // ✅ 추가
      <div>
        <span>포인트 할인</span>
        <span>-₩{calculation.breakdown.pointDiscount.toLocaleString()}</span>
      </div>
    )}
    <div className="총액">
      <span>최종 결제 금액</span>
      <span>₩{calculation.finalTotal.toLocaleString()}</span>
    </div>
  </div>
  ```

#### ✅ 결제 로직 변경 후 검증 체크리스트

- [ ] **8. 계산 정확도 테스트**
  - 상품 합계 정확?
  - 배송비 정확?
  - 쿠폰 할인 정확? (배송비 제외 확인!)
  - 포인트 할인 정확?
  - 최종 금액 정확?

- [ ] **9. 조합 테스트**
  - 쿠폰 + 포인트 동시 사용
  - 무료배송 + 쿠폰
  - 도서산간 + 쿠폰 + 포인트

- [ ] **10. 주문 생성 후 DB 확인**
  - orders.total_amount = finalTotal?
  - orders.discount_amount = couponDiscount?
  - orders.point_discount = pointDiscount?

- [ ] **11. 문서 업데이트**
  - Part 4 Section 2 - 결제 로직 업데이트

---

### 1.3 쿠폰 시스템 수정 시나리오

#### 📋 쿠폰 시스템 수정 전 체크리스트

- [ ] **1. 현재 쿠폰 로직 확인** (Part 4 Section 2)
  - loadUserCouponsOptimized() - 쿠폰 목록 조회
  - validateCoupon() - 쿠폰 검증
  - applyCouponUsage() - 쿠폰 사용 처리

- [ ] **2. 변경하려는 쿠폰 타입 정의**
  - 예: 무료배송 쿠폰 추가
  - 예: 특정 상품 전용 쿠폰

- [ ] **3. 의존 함수 확인** (Part 1 참조)
  - validateCoupon() 수정 필요? (Part 5-1 Section 4.1 참조)
  - applyCouponDiscount() 수정 필요? (Part 5-1 Section 1.3 참조)

#### 🔧 쿠폰 시스템 수정 작업 체크리스트

- [ ] **4. validateCoupon() 수정** (필요 시)
  - Part 5-1 Section 4.1 체크리스트 따르기

- [ ] **5. 체크아웃 페이지 쿠폰 적용 로직 수정**
  ```jsx
  const handleApplyCoupon = async () => {
    const validation = await validateCoupon(
      couponCode,
      productSubtotal,  // ⚠️ 배송비 제외!
      currentUser.id
    )

    if (!validation.valid) {
      setError(validation.error)
      return
    }

    // 무료배송 쿠폰 처리
    if (validation.coupon.type === 'free_shipping') {
      setIsFreeShipping(true)
    }

    setAppliedCoupon(validation.coupon)
  }
  ```

#### ✅ 쿠폰 시스템 수정 후 검증 체크리스트

- [ ] **6. 쿠폰 적용 테스트**
  - 유효한 쿠폰 → 할인 적용
  - 유효하지 않은 쿠폰 → 에러 메시지

- [ ] **7. 쿠폰 타입별 테스트**
  - percentage → 퍼센트 할인
  - fixed_amount → 고정 금액 할인
  - free_shipping → 무료배송 적용

- [ ] **8. 주문 생성 후 쿠폰 사용 확인**
  - user_coupons.is_used = true?
  - used_at 저장?
  - order_id 저장?

- [ ] **9. 문서 업데이트**
  - Part 4 Section 2 - 쿠폰 시스템 업데이트

#### 📚 크로스 레퍼런스

- **Part 4 Section 2**: /checkout 페이지 정의
- **Part 1 Section 1.1**: OrderCalculations.calculateFinalOrderAmount()
- **Part 1 Section 4.1**: validateCoupon()
- **Part 3 Section 1.1**: POST /api/orders/create
- **Part 5-1 Section 1.1**: calculateFinalOrderAmount() 수정 시나리오
- **Part 5-1 Section 4.1**: validateCoupon() 수정 시나리오
- **Part 5-3 Section 1**: 주문 생성 API 수정 시나리오

---

## Section 2: 주문 목록/상세 페이지 수정 시나리오

### 📌 개요
- **페이지**: /orders, /orders/[id]/complete
- **현재 상태**: Part 4 Section 5, 6 참조
- **호출 함수**: 5개 (formatShippingInfo, calculateFinalOrderAmount 등)
- **호출 API**: 3개 (주문 조회, 주문 취소 등)

---

### 2.1 필터링/정렬 추가 시나리오

#### 📋 필터링/정렬 추가 전 체크리스트

- [ ] **1. 현재 필터링 확인** (Part 4 Section 5)
  - 상태별 탭 (pending, verifying, deposited, shipped, delivered)

- [ ] **2. 추가하려는 필터링 정의**
  - 예: 날짜 범위 필터
  - 예: 금액 범위 필터
  - 예: 결제 수단 필터
  - 예: 정렬 (최신순, 금액 높은 순)

- [ ] **3. API 영향 확인** (Part 3 Section 2)
  - POST /api/orders/list에 필터 파라미터 추가 필요?
  - Part 5-3 Section 2.1 참조

#### 🔧 필터링/정렬 추가 작업 체크리스트

- [ ] **4. API 수정** (필요 시)
  - Part 5-3 Section 2.1 체크리스트 따르기

- [ ] **5. 페이지 UI 수정**
  ```jsx
  // /app/orders/page.js
  const [sortBy, setSortBy] = useState('latest')  // 'latest', 'amount_high', 'amount_low'
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  <div className="필터-영역">
    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
      <option value="latest">최신순</option>
      <option value="amount_high">금액 높은 순</option>
      <option value="amount_low">금액 낮은 순</option>
    </select>

    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
    <span>~</span>
    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

    <button onClick={handleSearch}>검색</button>
  </div>
  ```

- [ ] **6. API 호출 코드 수정**
  ```jsx
  const fetchOrders = async () => {
    const response = await fetch('/api/orders/list', {
      method: 'POST',
      body: JSON.stringify({
        user: currentUser,
        page,
        pageSize,
        status: currentTab,
        sortBy,  // ✅ 추가
        dateRange: { from: dateFrom, to: dateTo }  // ✅ 추가
      })
    })
  }
  ```

#### ✅ 필터링/정렬 추가 후 검증 체크리스트

- [ ] **7. 필터링 테스트**
  - 날짜 범위 → 해당 기간 주문만 표시
  - 정렬 → 올바른 순서로 표시

- [ ] **8. 성능 테스트**
  - 필터링 후 로딩 속도?

- [ ] **9. 문서 업데이트**
  - Part 4 Section 5 - 필터링 기능 추가

---

### 2.2 주문 상세 정보 추가 시나리오

#### 📋 주문 상세 정보 추가 전 체크리스트

- [ ] **1. 현재 표시 정보 확인** (Part 4 Section 6)
  - 주문 번호, 상태, 상품 목록, 배송 정보, 결제 정보

- [ ] **2. 추가하려는 정보 정의**
  - 예: 포인트 할인 표시
  - 예: 쿠폰 할인 상세
  - 예: 배송 추적 정보

- [ ] **3. DB 컬럼 확인** (Part 2 참조)
  - 필요한 정보가 DB에 저장되어 있는가?

#### 🔧 주문 상세 정보 추가 작업 체크리스트

- [ ] **4. API 응답에 필드 추가** (필요 시)
  - Part 5-3 Section 1.2 참조

- [ ] **5. 페이지 UI 수정**
  ```jsx
  // /app/orders/[id]/complete/page.js

  {orderData.point_discount > 0 && (
    <div className="할인-항목">
      <span>포인트 할인</span>
      <span>-₩{orderData.point_discount.toLocaleString()}</span>
    </div>
  )}

  {orderData.tracking_number && (
    <div className="배송-추적">
      <span>송장 번호</span>
      <span>{orderData.tracking_number}</span>
      <button onClick={() => window.open(`https://tracker.com?t=${orderData.tracking_number}`)}>
        배송 조회
      </button>
    </div>
  )}
  ```

#### ✅ 주문 상세 정보 추가 후 검증 체크리스트

- [ ] **6. 정보 표시 확인**
  - 새로 추가한 정보 정확히 표시?

- [ ] **7. 조건부 표시 확인**
  - 포인트 할인 0원 → 표시 안 함
  - 송장 번호 없음 → 표시 안 함

- [ ] **8. 문서 업데이트**
  - Part 4 Section 6 - 표시 정보 업데이트

#### 📚 크로스 레퍼런스

- **Part 4 Section 5**: /orders 페이지
- **Part 4 Section 6**: /orders/[id]/complete 페이지
- **Part 3 Section 2**: POST /api/orders/list
- **Part 5-3 Section 2**: 주문 조회 API 수정 시나리오

---

## Section 3: 관리자 주문 관리 페이지 수정 시나리오

### 📌 개요
- **페이지**: /admin/orders, /admin/orders/[id]
- **현재 상태**: Part 4 Section 12, 13 참조
- **특징**: 관리자 전용, 대량 작업 기능

---

### 3.1 대량 작업 기능 추가 시나리오

#### 📋 대량 작업 기능 추가 전 체크리스트

- [ ] **1. 대량 작업 정의**
  - 예: 선택한 주문 일괄 상태 변경
  - 예: 선택한 주문 Excel 다운로드
  - 예: 선택한 주문 송장 번호 일괄 입력

- [ ] **2. API 필요성 확인**
  - 새로운 대량 작업 API 필요? (Part 5-3 Section 4.2 참조)

- [ ] **3. 성능 영향 확인**
  - 100개 주문 일괄 처리 → 타임아웃 가능성?

#### 🔧 대량 작업 기능 추가 작업 체크리스트

- [ ] **4. API 생성** (필요 시)
  - Part 5-3 Section 4.2 체크리스트 따르기

- [ ] **5. 페이지 UI 수정**
  ```jsx
  // /app/admin/orders/page.js
  const [selectedOrders, setSelectedOrders] = useState([])

  <div className="대량-작업-영역">
    <button
      disabled={selectedOrders.length === 0}
      onClick={handleBulkUpdateStatus}
    >
      선택한 {selectedOrders.length}개 주문 상태 변경
    </button>
  </div>

  <table>
    <thead>
      <tr>
        <th>
          <input
            type="checkbox"
            checked={selectedOrders.length === filteredOrders.length}
            onChange={handleSelectAll}
          />
        </th>
        <th>주문 번호</th>
        ...
      </tr>
    </thead>
    <tbody>
      {filteredOrders.map(order => (
        <tr key={order.id}>
          <td>
            <input
              type="checkbox"
              checked={selectedOrders.includes(order.id)}
              onChange={() => handleSelectOrder(order.id)}
            />
          </td>
          <td>{order.customer_order_number}</td>
          ...
        </tr>
      ))}
    </tbody>
  </table>
  ```

- [ ] **6. 대량 작업 로직 구현**
  ```jsx
  const handleBulkUpdateStatus = async () => {
    const response = await fetch('/api/admin/orders/bulk-update', {
      method: 'POST',
      body: JSON.stringify({
        adminEmail: adminUser.email,
        orderIds: selectedOrders,
        newStatus: 'shipped'
      })
    })

    const result = await response.json()
    if (result.success) {
      alert(`${result.successCount}개 주문 상태 변경 완료`)
      fetchOrders()  // 목록 새로고침
    }
  }
  ```

#### ✅ 대량 작업 기능 추가 후 검증 체크리스트

- [ ] **7. 대량 작업 테스트**
  - 10개 선택 → 정상 처리?
  - 100개 선택 → 타임아웃 없음?

- [ ] **8. 부분 실패 처리 확인**
  - 일부 실패 시 성공/실패 리스트 표시?

- [ ] **9. UI 업데이트 확인**
  - 작업 완료 후 목록 새로고침?

- [ ] **10. 문서 업데이트**
  - Part 4 Section 12 - 대량 작업 기능 추가

---

### 3.2 통계 차트 추가 시나리오

#### 📋 통계 차트 추가 전 체크리스트

- [ ] **1. 통계 데이터 정의**
  - 예: 일별 주문 건수
  - 예: 상태별 주문 비율
  - 예: 금액별 주문 분포

- [ ] **2. 차트 라이브러리 선택**
  - Chart.js
  - Recharts
  - Victory

- [ ] **3. API 필요성 확인**
  - 통계 데이터 API 필요?

#### 🔧 통계 차트 추가 작업 체크리스트

- [ ] **4. 차트 라이브러리 설치**
  ```bash
  npm install recharts
  ```

- [ ] **5. 통계 컴포넌트 생성**
  ```jsx
  // /app/admin/orders/components/OrderStats.jsx
  import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

  export default function OrderStats({ orders }) {
    const data = orders.reduce((acc, order) => {
      const date = order.created_at.split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    const chartData = Object.entries(data).map(([date, count]) => ({
      date,
      count
    }))

    return (
      <BarChart width={600} height={300} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#8884d8" />
      </BarChart>
    )
  }
  ```

- [ ] **6. 페이지에 통계 추가**
  ```jsx
  // /app/admin/orders/page.js
  import OrderStats from './components/OrderStats'

  <div className="통계-영역">
    <h2>주문 통계</h2>
    <OrderStats orders={orders} />
  </div>
  ```

#### ✅ 통계 차트 추가 후 검증 체크리스트

- [ ] **7. 차트 표시 확인**
  - 데이터 정확히 표시?
  - 반응형으로 작동?

- [ ] **8. 성능 확인**
  - 대량 데이터 (1000개+) 처리 가능?

- [ ] **9. 문서 업데이트**
  - Part 4 Section 12 - 통계 차트 추가

#### 📚 크로스 레퍼런스

- **Part 4 Section 12**: /admin/orders 페이지
- **Part 4 Section 13**: /admin/orders/[id] 페이지
- **Part 3 Section 4**: 관리자 API
- **Part 5-3 Section 4**: 관리자 API 수정 시나리오

---

## Section 4: 상품 관리 페이지 수정 시나리오

### 📌 개요
- **페이지**: /admin/products, /admin/products/new, /admin/products/[id]
- **현재 상태**: Part 4 Section 10, 11 참조
- **특징**: Variant 시스템, 재고 관리

---

### 4.1 Variant 관리 기능 추가 시나리오

#### 📋 Variant 관리 기능 추가 전 체크리스트

- [ ] **1. Variant 시스템 이해** (Part 2 Section 6)
  - product_options (옵션: 색상, 사이즈)
  - product_option_values (옵션값: 빨강, S)
  - product_variants (SKU별 재고)

- [ ] **2. 추가하려는 기능 정의**
  - 예: 옵션별 가격 차등
  - 예: 옵션 이미지 추가
  - 예: 옵션 조합 자동 생성

#### 🔧 Variant 관리 기능 추가 작업 체크리스트

- [ ] **3. DB 스키마 수정** (필요 시)
  - Part 5-2 Section 6 참조

- [ ] **4. UI 컴포넌트 추가**
  ```jsx
  // /app/admin/products/[id]/page.js

  <div className="옵션-관리">
    <h3>옵션 관리</h3>
    {variants.map(variant => (
      <div key={variant.id} className="variant-row">
        <span>{variant.sku}</span>
        <input
          type="number"
          value={variant.price}
          onChange={(e) => handleVariantPriceChange(variant.id, e.target.value)}
        />
        <input
          type="number"
          value={variant.inventory}
          onChange={(e) => handleVariantInventoryChange(variant.id, e.target.value)}
        />
      </div>
    ))}
  </div>
  ```

#### ✅ Variant 관리 기능 추가 후 검증 체크리스트

- [ ] **5. Variant 생성 테스트**
  - 옵션 조합 자동 생성?
  - SKU 자동 생성?

- [ ] **6. Variant 수정 테스트**
  - 가격 수정 → DB 저장?
  - 재고 수정 → DB 저장?

- [ ] **7. 문서 업데이트**
  - Part 4 Section 11 - Variant 관리 기능 추가

---

### 4.2 재고 관리 개선 시나리오

#### 📋 재고 관리 개선 전 체크리스트

- [ ] **1. 현재 재고 관리 확인**
  - update_variant_inventory RPC 사용
  - FOR UPDATE 락

- [ ] **2. 개선하려는 기능 정의**
  - 예: 재고 부족 알림
  - 예: 재고 이력 추적
  - 예: 자동 발주 기능

#### 🔧 재고 관리 개선 작업 체크리스트

- [ ] **3. 재고 이력 테이블 생성** (필요 시)
  ```sql
  CREATE TABLE inventory_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES product_variants(id),
    change_type TEXT,  -- 'order', 'cancel', 'manual'
    quantity_change INTEGER,
    old_inventory INTEGER,
    new_inventory INTEGER,
    order_id UUID REFERENCES orders(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- [ ] **4. RPC 함수 수정**
  ```sql
  CREATE OR REPLACE FUNCTION update_variant_inventory(...)
  RETURNS JSONB AS $$
  BEGIN
    -- 재고 업데이트
    -- ...

    -- 이력 기록
    INSERT INTO inventory_history (
      variant_id,
      change_type,
      quantity_change,
      old_inventory,
      new_inventory,
      order_id
    ) VALUES (...);

    RETURN ...;
  END;
  $$ LANGUAGE plpgsql;
  ```

#### ✅ 재고 관리 개선 후 검증 체크리스트

- [ ] **5. 재고 이력 기록 확인**
  - 주문 생성 시 이력 기록?
  - 주문 취소 시 이력 기록?

- [ ] **6. 재고 부족 알림 확인**
  - 재고 10개 이하 → 알림?

- [ ] **7. 문서 업데이트**
  - Part 4 Section 11 - 재고 관리 개선

#### 📚 크로스 레퍼런스

- **Part 4 Section 10**: /admin/products 페이지
- **Part 4 Section 11**: /admin/products/[id] 페이지
- **Part 2 Section 6**: product_variants 테이블
- **Part 5-2 Section 6**: product_variants 테이블 수정 시나리오

---

## Section 5: 새로운 페이지 추가 시나리오

### 5.1 페이지 설계 시나리오

#### 📋 페이지 설계 전 체크리스트

- [ ] **1. 페이지 목적 정의**
  - 예: 포인트 내역 페이지
  - 예: 리뷰 작성 페이지
  - 예: 위시리스트 페이지

- [ ] **2. 페이지 구조 설계**
  - 레이아웃 (헤더, 사이드바, 푸터)
  - 주요 컴포넌트
  - 데이터 흐름

- [ ] **3. 의존성 확인**
  - 필요한 중앙 함수? (Part 1 참조)
  - 필요한 API? (Part 3 참조)
  - 필요한 DB 테이블? (Part 2 참조)

#### 🔧 페이지 설계 작업 체크리스트

- [ ] **4. 페이지 파일 생성**
  ```
  /app/mypage/points/page.js  -- 포인트 내역 페이지
  /app/mypage/points/layout.js  -- 레이아웃 (필요 시)
  /app/mypage/points/components/PointHistory.jsx  -- 컴포넌트
  ```

- [ ] **5. 페이지 컴포넌트 작성**
  ```jsx
  // /app/mypage/points/page.js
  'use client'

  import { useState, useEffect } from 'react'
  import { getUserPoints, getPointHistory } from '@/lib/pointApi'

  export default function PointsPage() {
    const [points, setPoints] = useState(0)
    const [history, setHistory] = useState([])

    useEffect(() => {
      async function fetchData() {
        const currentPoints = await getUserPoints()
        const pointHistory = await getPointHistory()
        setPoints(currentPoints)
        setHistory(pointHistory)
      }
      fetchData()
    }, [])

    return (
      <div className="points-page">
        <h1>포인트 내역</h1>
        <div className="point-balance">
          <span>보유 포인트</span>
          <span>{points.toLocaleString()}P</span>
        </div>
        <div className="point-history">
          {history.map(item => (
            <div key={item.id} className="history-item">
              <span>{item.created_at}</span>
              <span>{item.description}</span>
              <span>{item.amount > 0 ? '+' : ''}{item.amount}P</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  ```

#### ✅ 페이지 설계 후 검증 체크리스트

- [ ] **6. 페이지 접근 확인**
  - URL로 접근 가능?
  - 네비게이션 링크 추가?

- [ ] **7. 데이터 로딩 확인**
  - 데이터 정상 로드?
  - 로딩 상태 표시?

- [ ] **8. 반응형 확인**
  - 모바일에서 정상 표시?

---

### 5.2 라우팅 설정 시나리오

#### 📋 라우팅 설정 체크리스트

- [ ] **1. Next.js App Router 구조 확인**
  - `/app` 폴더 구조
  - 동적 라우트 (`[id]`)
  - 그룹 라우트 (`(group)`)

- [ ] **2. 라우팅 경로 정의**
  - 예: `/mypage/points` - 포인트 내역
  - 예: `/mypage/reviews` - 리뷰 목록
  - 예: `/mypage/reviews/[id]` - 리뷰 상세

#### 🔧 라우팅 설정 작업 체크리스트

- [ ] **3. 페이지 파일 생성**
  ```
  /app/mypage/points/page.js
  /app/mypage/reviews/page.js
  /app/mypage/reviews/[id]/page.js
  ```

- [ ] **4. 네비게이션 링크 추가**
  ```jsx
  // /app/mypage/layout.js
  <nav>
    <Link href="/mypage">내 정보</Link>
    <Link href="/mypage/coupons">쿠폰</Link>
    <Link href="/mypage/points">포인트</Link>  {/* ✅ 추가 */}
    <Link href="/mypage/reviews">리뷰</Link>  {/* ✅ 추가 */}
  </nav>
  ```

#### ✅ 라우팅 설정 후 검증 체크리스트

- [ ] **5. 라우팅 테스트**
  - 각 페이지 접근 가능?
  - 동적 라우트 작동?

- [ ] **6. 네비게이션 확인**
  - 링크 클릭 시 이동?
  - 현재 페이지 활성화 표시?

---

### 5.3 인증 설정 시나리오

#### 📋 인증 설정 체크리스트

- [ ] **1. 인증 필요성 확인**
  - 로그인 필요한 페이지?
  - 관리자 전용 페이지?

- [ ] **2. 인증 방식 확인**
  - Supabase Auth
  - Kakao OAuth
  - 관리자 인증 (JWT)

#### 🔧 인증 설정 작업 체크리스트

- [ ] **3. 인증 체크 추가**
  ```jsx
  // /app/mypage/points/page.js
  'use client'

  import { useEffect, useState } from 'react'
  import { useRouter } from 'next/navigation'
  import { UserProfileManager } from '@/lib/UserProfileManager'

  export default function PointsPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState(null)

    useEffect(() => {
      async function checkAuth() {
        const user = await UserProfileManager.getCurrentUser()
        if (!user) {
          router.push('/login?redirect=/mypage/points')
          return
        }
        setCurrentUser(user)
      }
      checkAuth()
    }, [router])

    if (!currentUser) {
      return <div>로딩 중...</div>
    }

    return (
      // 페이지 내용
    )
  }
  ```

- [ ] **4. 관리자 인증 체크** (관리자 페이지)
  ```jsx
  // /app/admin/points/page.js
  import { useAdminAuthNew } from '@/hooks/useAdminAuthNew'

  export default function AdminPointsPage() {
    const { adminUser, loading } = useAdminAuthNew()

    if (loading) return <div>로딩 중...</div>
    if (!adminUser) return <div>권한이 없습니다</div>

    return (
      // 페이지 내용
    )
  }
  ```

#### ✅ 인증 설정 후 검증 체크리스트

- [ ] **5. 인증 체크 테스트**
  - 비로그인 사용자 → 로그인 페이지로 리다이렉트?
  - 로그인 사용자 → 정상 접근?

- [ ] **6. 관리자 인증 테스트** (관리자 페이지)
  - 일반 사용자 → 접근 차단?
  - 관리자 → 정상 접근?

- [ ] **7. 문서 업데이트**
  - Part 4에 새 페이지 추가

#### 📚 크로스 레퍼런스

- **Part 4**: 모든 페이지 정의
- **Part 1 Section 4.6**: getCurrentUser() 함수
- **Part 3**: API 엔드포인트

---

## Section 6: 공통 컴포넌트 수정 시나리오

### 6.1 재사용 컴포넌트 수정 시나리오

#### 📋 재사용 컴포넌트 수정 전 체크리스트

- [ ] **1. 컴포넌트 사용처 파악**
  - 예: ProductCard - 홈, 상품 목록, 검색 결과
  - 예: OrderCard - 주문 목록, 일괄결제
  - 예: Header - 모든 페이지

- [ ] **2. 수정 영향 범위 확인**
  - 몇 개 페이지에서 사용?
  - 모든 페이지 영향?

- [ ] **3. 하위 호환성 확인**
  - 기존 사용처 깨지지 않도록

#### 🔧 재사용 컴포넌트 수정 작업 체크리스트

- [ ] **4. 컴포넌트 props 변경** (필요 시)
  ```jsx
  // /app/components/ProductCard.jsx

  // BEFORE
  export default function ProductCard({ product }) {
    return <div>...</div>
  }

  // AFTER (새 prop 추가)
  export default function ProductCard({
    product,
    showDiscount = false,  // ✅ 추가 (기본값 false)
    onAddToCart = null  // ✅ 추가 (선택적)
  }) {
    return (
      <div>
        {showDiscount && product.compare_price && (
          <span className="discount">
            {Math.round((1 - product.price / product.compare_price) * 100)}% 할인
          </span>
        )}
        {onAddToCart && (
          <button onClick={() => onAddToCart(product)}>장바구니</button>
        )}
      </div>
    )
  }
  ```

- [ ] **5. 모든 사용처 확인**
  - 기존 사용처: props 변경 없이 정상 작동? (하위 호환성)
  - 새 기능 필요한 곳: 새 props 전달

#### ✅ 재사용 컴포넌트 수정 후 검증 체크리스트

- [ ] **6. 모든 사용처 테스트**
  - 홈 페이지: ProductCard 정상 표시?
  - 상품 목록: ProductCard 정상 표시?
  - 새 기능 (할인 표시): showDiscount={true} 전달 시 표시?

- [ ] **7. 하위 호환성 확인**
  - props 전달 안 한 곳도 정상 작동?

- [ ] **8. 문서 업데이트**
  - 컴포넌트 문서 업데이트 (props 설명)

---

### 6.2 컴포넌트 API 변경 시나리오

#### 📋 컴포넌트 API 변경 전 체크리스트

- [ ] **1. API 변경 이유 확인**
  - 예: 함수 시그니처 변경
  - 예: 이벤트 핸들러 변경

- [ ] **2. Breaking Change 확인**
  - 기존 사용처 모두 수정 필요?
  - 점진적 마이그레이션 가능?

#### 🔧 컴포넌트 API 변경 작업 체크리스트

- [ ] **3. Deprecated 경고 추가** (점진적 마이그레이션 시)
  ```jsx
  export default function ProductCard({ product, onClick, onSelect }) {
    // onClick은 deprecated, onSelect 사용 권장
    if (onClick) {
      console.warn('ProductCard: onClick is deprecated, use onSelect instead')
    }

    const handleClick = () => {
      if (onSelect) {
        onSelect(product)
      } else if (onClick) {
        onClick(product)  // 하위 호환성 유지
      }
    }

    return <div onClick={handleClick}>...</div>
  }
  ```

- [ ] **4. 모든 사용처 점진적 수정**
  - Step 1: 새 API와 구 API 둘 다 지원
  - Step 2: 각 페이지 하나씩 새 API로 변경
  - Step 3: 모든 페이지 변경 완료 후 구 API 제거

#### ✅ 컴포넌트 API 변경 후 검증 체크리스트

- [ ] **5. 모든 사용처 테스트**
  - 새 API 사용처 정상 작동?
  - 구 API 사용처 여전히 작동? (하위 호환성)

- [ ] **6. Deprecated 경고 확인**
  - 콘솔에 경고 표시?

- [ ] **7. 구 API 제거 계획**
  - 모든 사용처 새 API로 변경 완료?
  - 구 API 제거 가능?

- [ ] **8. 문서 업데이트**
  - 컴포넌트 API 문서 업데이트

#### 📚 크로스 레퍼런스

- **Part 4**: 모든 페이지에서 컴포넌트 사용
- 공통 컴포넌트 파일: `/app/components/*.jsx`

---

## Section 7: 전역 상태 관리 변경 시나리오

### 7.1 sessionStorage 변경 시나리오

#### 📋 sessionStorage 변경 전 체크리스트

- [ ] **1. 현재 sessionStorage 사용 확인**
  - Kakao 사용자 정보 저장 (`'user'` 키)
  - 장바구니 데이터 저장 (있다면)

- [ ] **2. 변경하려는 데이터 구조 정의**
  - 예: 포인트 잔액 추가
  - 예: 최근 본 상품 추가

- [ ] **3. 영향받는 페이지 확인**
  - sessionStorage 읽는 모든 페이지
  - UserProfileManager 사용하는 모든 페이지

#### 🔧 sessionStorage 변경 작업 체크리스트

- [ ] **4. 데이터 구조 변경**
  ```javascript
  // BEFORE
  sessionStorage.setItem('user', JSON.stringify({
    id: 'kakao_3782927171',
    name: '김진태',
    kakao_id: '3782927171',
    phone: '010-1234-5678'
  }))

  // AFTER (포인트 추가)
  sessionStorage.setItem('user', JSON.stringify({
    id: 'kakao_3782927171',
    name: '김진태',
    kakao_id: '3782927171',
    phone: '010-1234-5678',
    point: 10000  // ✅ 추가
  }))
  ```

- [ ] **5. 모든 읽기/쓰기 코드 수정**
  - UserProfileManager.getCurrentUser()
  - UserProfileManager.atomicProfileUpdate()
  - Kakao 로그인 콜백

- [ ] **6. 마이그레이션 코드 추가** (기존 사용자 대응)
  ```javascript
  const storedUser = sessionStorage.getItem('user')
  if (storedUser) {
    const user = JSON.parse(storedUser)
    if (!user.point) {
      // 기존 사용자는 point 필드 없음 → DB에서 조회하여 추가
      const { data: profile } = await supabase
        .from('profiles')
        .select('point')
        .eq('id', user.id)
        .single()

      user.point = profile.point || 0
      sessionStorage.setItem('user', JSON.stringify(user))
    }
  }
  ```

#### ✅ sessionStorage 변경 후 검증 체크리스트

- [ ] **7. 모든 읽기 코드 테스트**
  - getCurrentUser() - point 필드 포함?
  - 페이지에서 사용자 정보 표시 정상?

- [ ] **8. 모든 쓰기 코드 테스트**
  - Kakao 로그인 - point 필드 저장?
  - atomicProfileUpdate() - point 필드 동기화?

- [ ] **9. 마이그레이션 테스트**
  - 기존 사용자 (point 필드 없음) → 자동 추가?

- [ ] **10. 문서 업데이트**
  - Part 1 Section 4.6 - sessionStorage 구조 업데이트

---

### 7.2 Context API 추가 시나리오

#### 📋 Context API 추가 전 체크리스트

- [ ] **1. Context 필요성 확인**
  - 전역으로 공유할 데이터?
  - 예: 사용자 정보, 장바구니, 테마

- [ ] **2. Context 구조 설계**
  - UserContext
  - CartContext
  - ThemeContext

#### 🔧 Context API 추가 작업 체크리스트

- [ ] **3. Context 생성**
  ```jsx
  // /app/contexts/UserContext.jsx
  'use client'

  import { createContext, useContext, useState, useEffect } from 'react'
  import { UserProfileManager } from '@/lib/UserProfileManager'

  const UserContext = createContext(null)

  export function UserProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      async function loadUser() {
        const user = await UserProfileManager.getCurrentUser()
        setCurrentUser(user)
        setLoading(false)
      }
      loadUser()
    }, [])

    return (
      <UserContext.Provider value={{ currentUser, setCurrentUser, loading }}>
        {children}
      </UserContext.Provider>
    )
  }

  export function useUser() {
    const context = useContext(UserContext)
    if (!context) {
      throw new Error('useUser must be used within UserProvider')
    }
    return context
  }
  ```

- [ ] **4. Provider 추가**
  ```jsx
  // /app/layout.js
  import { UserProvider } from './contexts/UserContext'

  export default function RootLayout({ children }) {
    return (
      <html>
        <body>
          <UserProvider>
            {children}
          </UserProvider>
        </body>
      </html>
    )
  }
  ```

- [ ] **5. 페이지에서 Context 사용**
  ```jsx
  // /app/checkout/page.js
  'use client'

  import { useUser } from '@/app/contexts/UserContext'

  export default function CheckoutPage() {
    const { currentUser, loading } = useUser()

    if (loading) return <div>로딩 중...</div>
    if (!currentUser) return <div>로그인이 필요합니다</div>

    return (
      // 체크아웃 페이지
    )
  }
  ```

#### ✅ Context API 추가 후 검증 체크리스트

- [ ] **6. Context 로딩 확인**
  - Provider에서 데이터 정상 로드?

- [ ] **7. 페이지에서 사용 확인**
  - useUser() hook 정상 작동?
  - currentUser 정확히 표시?

- [ ] **8. 성능 확인**
  - 불필요한 리렌더링 없음?

- [ ] **9. 문서 업데이트**
  - Context API 사용 가이드 추가

#### 📚 크로스 레퍼런스

- **Part 1 Section 4.6**: getCurrentUser() 함수
- **Part 4**: 모든 페이지에서 사용자 정보 필요

---

## 📊 전체 요약

### 페이지 수정 시 반드시 확인할 것

1. **Part 4에서 페이지 정의 확인** (호출 함수, 호출 API, DB 테이블)
2. **Part 1에서 의존 함수 확인** (수정 필요한 중앙 함수?)
3. **Part 3에서 API 확인** (수정 필요한 API?)
4. **Part 2에서 DB 테이블 확인** (새 컬럼 필요?)
5. **Part 5-4 체크리스트 따라가기** (빠짐없이 모든 항목 확인)

### 페이지 수정 후 반드시 할 것

1. **모든 기능 테스트** (UI, 계산, API 호출, DB 저장)
2. **반응형 확인** (모바일, 태블릿, 데스크톱)
3. **에러 처리 확인** (네트워크 에러, 검증 에러)
4. **성능 확인** (로딩 속도, 불필요한 리렌더링)
5. **문서 업데이트** (Part 4, Part 5-4)

---

**전체 완료**: Part 5 (수정 영향도 매트릭스) 완료 ✅

**다음 단계**: 최종 검증 및 문서 통합

**작성 완료**: 2025-10-20
