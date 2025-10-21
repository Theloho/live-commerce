# 🚀 마이그레이션 가이드 (MIGRATION_GUIDE)

**버전**: 1.0
**작성일**: 2025-10-21
**목적**: Clean Architecture로의 안전하고 체계적인 마이그레이션 실행 가이드

---

## 📖 이 문서의 사용법

### 마이그레이션 전

1. ✅ **REFACTORING_MASTER_CHECKLIST.md** - 전체 체크리스트 확인
2. ✅ **DEVELOPMENT_PRINCIPLES.md** - Rule 1-11 숙지
3. ✅ **FUNCTION_QUERY_REFERENCE.md** - 마이그레이션 대상 함수 확인
4. ✅ **ARCHITECTURE_DECISION_RECORD.md** - 아키텍처 결정 이유 이해

### 마이그레이션 중

- 각 Phase의 이 문서 섹션 참조
- 코드 예제대로 정확히 작성
- 체크리스트 항목 하나씩 완료 후 다음 진행

### 마이그레이션 후

- Git 커밋 필수
- 테스트 실행 확인
- 문서 업데이트

---

## 🎯 Phase 0: 문서 및 아키텍처 설계

### ✅ 완료 조건

- [x] 모든 핵심 문서 생성 (5개)
- [x] 폴더 구조 생성 (16개)
- [x] Base 클래스 생성 (6개)
- [x] 의존성 설치 (6개)
- [x] FUNCTION_QUERY_REFERENCE.md 작성
- [x] 레거시 파일 관리 (7개)

**→ Phase 0 완료 후 바로 Phase 1 시작**

---

## 🏗️ Phase 1: Infrastructure Layer (Repository)

### 목표

- `lib/supabaseApi.js`의 DB 접근 로직을 Repository로 이동
- Service Role 클라이언트 사용 (RLS 우회)
- FOR UPDATE NOWAIT 적용 (동시성 제어)

---

### Step 1.1: OrderRepository 생성 (40분)

#### 📋 마이그레이션 대상 함수 (FUNCTION_QUERY_REFERENCE.md 참조)

| 함수명 | 현재 위치 | 목표 위치 |
|--------|----------|----------|
| `createOrder` | lib/supabaseApi.js:637 | OrderRepository.create() |
| `updateOrderStatus` | lib/supabaseApi.js:1050 | OrderRepository.updateStatus() |
| `updateOrder` | lib/supabaseApi.js:1111 | OrderRepository.update() |
| `deleteOrder` | lib/supabaseApi.js:1145 | OrderRepository.delete() |
| `findByUser` | 신규 | OrderRepository.findByUser() |
| `findById` | 신규 | OrderRepository.findById() |

#### 1. Service Role 클라이언트 생성

**파일**: `lib/supabaseAdmin.js` (기존 파일 확인)

```javascript
import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

**⚠️ 중요**: `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 추가 필요

#### 2. OrderRepository 생성

**파일**: `lib/repositories/OrderRepository.js`

```javascript
import { BaseRepository } from './BaseRepository'
import { supabaseAdmin } from '../supabaseAdmin'
import { DatabaseError } from '../errors'

export class OrderRepository extends BaseRepository {
  tableName = 'orders'

  /**
   * 사용자의 주문 목록 조회
   * @param {string} userId - Supabase UUID 또는 null (카카오 사용자)
   * @param {string} orderType - 주문 타입 (카카오: 'direct:KAKAO:123456')
   */
  async findByUser(userId, orderType = null) {
    return this.executeQuery(async () => {
      let query = supabaseAdmin
        .from(this.tableName)
        .select(`
          *,
          order_items (*),
          order_payments (*),
          order_shipping (*)
        `)
        .order('created_at', { ascending: false })

      // Supabase 사용자
      if (userId) {
        query = query.eq('user_id', userId)
      }
      // 카카오 사용자
      else if (orderType) {
        query = query.like('order_type', `%${orderType}%`)
      }

      const { data, error } = await query
      return { data, error }
    })
  }

  /**
   * 주문 ID로 조회
   * @param {string} orderId
   */
  async findById(orderId) {
    return this.executeQuery(async () => {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select(`
          *,
          order_items (*),
          order_payments (*),
          order_shipping (*)
        `)
        .eq('id', orderId)
        .single()

      return { data, error }
    })
  }

  /**
   * 주문 생성 (트랜잭션)
   * @param {object} orderData - 주문 데이터
   * @param {array} orderItems - 주문 아이템
   * @param {object} payment - 결제 정보
   * @param {object} shipping - 배송 정보
   */
  async create({ orderData, orderItems, payment, shipping }) {
    try {
      // 1. 주문 생성
      const { data: order, error: orderError } = await supabaseAdmin
        .from(this.tableName)
        .insert(orderData)
        .select()
        .single()

      if (orderError) throw new DatabaseError(orderError.message, { table: 'orders', operation: 'INSERT', code: orderError.code })

      // 2. 주문 아이템 생성
      const itemsWithOrderId = orderItems.map(item => ({
        ...item,
        order_id: order.id
      }))

      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(itemsWithOrderId)

      if (itemsError) throw new DatabaseError(itemsError.message, { table: 'order_items', operation: 'INSERT', code: itemsError.code })

      // 3. 결제 정보 생성
      const { error: paymentError } = await supabaseAdmin
        .from('order_payments')
        .insert({ ...payment, order_id: order.id })

      if (paymentError) throw new DatabaseError(paymentError.message, { table: 'order_payments', operation: 'INSERT', code: paymentError.code })

      // 4. 배송 정보 생성
      const { error: shippingError } = await supabaseAdmin
        .from('order_shipping')
        .insert({ ...shipping, order_id: order.id })

      if (shippingError) throw new DatabaseError(shippingError.message, { table: 'order_shipping', operation: 'INSERT', code: shippingError.code })

      return order
    } catch (error) {
      console.error('[OrderRepository] 주문 생성 실패:', error)
      throw error
    }
  }

  /**
   * 주문 상태 변경
   * @param {string} orderId
   * @param {string} status - pending | verifying | deposited | shipped | delivered | cancelled
   */
  async updateStatus(orderId, status) {
    const validStatuses = ['pending', 'verifying', 'deposited', 'shipped', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) {
      throw new DatabaseError(`Invalid status: ${status}`, { table: 'orders', operation: 'UPDATE' })
    }

    return this.executeQuery(async () => {
      const updateData = { status }

      // 타임스탬프 자동 기록
      if (status === 'deposited') updateData.deposited_at = new Date().toISOString()
      if (status === 'shipped') updateData.shipped_at = new Date().toISOString()
      if (status === 'delivered') updateData.delivered_at = new Date().toISOString()

      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single()

      return { data, error }
    })
  }

  /**
   * 주문 수량 조정
   * @param {string} orderItemId
   * @param {number} newQuantity
   */
  async updateQuantity(orderItemId, newQuantity) {
    return this.executeQuery(async () => {
      const { data, error } = await supabaseAdmin
        .from('order_items')
        .update({
          quantity: newQuantity,
          total: supabaseAdmin.raw(`unit_price * ${newQuantity}`)
        })
        .eq('id', orderItemId)
        .select()
        .single()

      return { data, error }
    })
  }
}
```

#### 3. 사용 예제

**Before (app/checkout/page.js):**
```javascript
// ❌ Bad: UI에서 DB 직접 접근
const { data: order, error } = await supabase
  .from('orders')
  .insert(orderData)
  .select()
  .single()
```

**After (app/checkout/page.js):**
```javascript
// ✅ Good: Repository 사용
import { OrderRepository } from '@/lib/repositories/OrderRepository'

const orderRepo = new OrderRepository()
const order = await orderRepo.create({
  orderData,
  orderItems,
  payment,
  shipping
})
```

#### 4. 테스트 (선택)

```javascript
// tests/repositories/OrderRepository.test.js
import { OrderRepository } from '@/lib/repositories/OrderRepository'

describe('OrderRepository', () => {
  it('사용자 주문 목록 조회', async () => {
    const repo = new OrderRepository()
    const orders = await repo.findByUser('user-id-123')
    expect(orders).toBeArray()
  })
})
```

---

### Step 1.2: ProductRepository 생성 (30분)

#### 📋 마이그레이션 대상 함수

| 함수명 | 현재 위치 | 목표 위치 |
|--------|----------|----------|
| `getProducts` | lib/supabaseApi.js:47 | ProductRepository.findAll() |
| `getProductById` | lib/supabaseApi.js:101 | ProductRepository.findById() |
| `addProduct` | lib/supabaseApi.js:167 | ProductRepository.create() |
| `updateProduct` | lib/supabaseApi.js:211 | ProductRepository.update() |
| `deleteProduct` | lib/supabaseApi.js:247 | ProductRepository.delete() |

#### 코드 예제

**파일**: `lib/repositories/ProductRepository.js`

```javascript
import { BaseRepository } from './BaseRepository'
import { supabaseAdmin } from '../supabaseAdmin'

export class ProductRepository extends BaseRepository {
  tableName = 'products'

  /**
   * 활성 상품 목록 조회 (모바일 최적화)
   */
  async findAll(filters = {}) {
    return this.executeQuery(async () => {
      let query = supabaseAdmin
        .from(this.tableName)
        .select(`
          id, title, product_number, price, compare_price,
          thumbnail_url, inventory, status, is_featured,
          is_live_active, created_at
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50)

      if (filters.is_featured) {
        query = query.eq('is_featured', true)
      }

      const { data, error } = await query
      return { data, error }
    })
  }

  /**
   * 재고 차감 (FOR UPDATE NOWAIT)
   * @param {string} productId
   * @param {number} quantity
   */
  async decreaseInventory(productId, quantity) {
    return this.executeQuery(async () => {
      // 1. FOR UPDATE NOWAIT 락 획득
      const { data: product, error: lockError } = await supabaseAdmin
        .rpc('lock_product_for_update', { p_product_id: productId })

      if (lockError) {
        if (lockError.code === '55P03') {
          // NOWAIT 타임아웃: 다른 트랜잭션이 락 보유 중
          throw new DatabaseError('상품이 다른 주문에서 처리 중입니다. 잠시 후 다시 시도해주세요.', {
            table: 'products',
            operation: 'UPDATE',
            code: '55P03'
          })
        }
        throw lockError
      }

      // 2. 재고 확인
      if (product.inventory < quantity) {
        throw new InsufficientInventoryError(productId, quantity, product.inventory)
      }

      // 3. 재고 차감
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .update({ inventory: product.inventory - quantity })
        .eq('id', productId)
        .select()
        .single()

      return { data, error }
    })
  }
}
```

**DB Function 생성 필요**:

```sql
-- supabase/migrations/YYYYMMDD_lock_product_for_update.sql
CREATE OR REPLACE FUNCTION lock_product_for_update(p_product_id UUID)
RETURNS TABLE(id UUID, inventory INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.inventory
  FROM products p
  WHERE p.id = p_product_id
  FOR UPDATE NOWAIT;
END;
$$ LANGUAGE plpgsql;
```

---

### Step 1.7: FOR UPDATE NOWAIT 적용 (30분)

#### 적용 대상

1. `products.inventory` 재고 차감
2. `product_variants.inventory` Variant 재고 차감
3. `coupons.total_usage_limit` 쿠폰 사용 제한

#### 마이그레이션 파일 생성

```sql
-- supabase/migrations/YYYYMMDD_add_for_update_locks.sql

-- 1. 상품 재고 락 함수
CREATE OR REPLACE FUNCTION lock_product_for_update(p_product_id UUID)
RETURNS TABLE(id UUID, inventory INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.inventory
  FROM products p
  WHERE p.id = p_product_id
  FOR UPDATE NOWAIT;
END;
$$ LANGUAGE plpgsql;

-- 2. Variant 재고 락 함수
CREATE OR REPLACE FUNCTION lock_variant_for_update(p_variant_id UUID)
RETURNS TABLE(id UUID, inventory INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT pv.id, pv.inventory
  FROM product_variants pv
  WHERE pv.id = p_variant_id
  FOR UPDATE NOWAIT;
END;
$$ LANGUAGE plpgsql;

-- 3. 쿠폰 사용 락 함수
CREATE OR REPLACE FUNCTION lock_coupon_for_update(p_coupon_id UUID)
RETURNS TABLE(id UUID, total_usage_limit INTEGER, current_usage INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.total_usage_limit,
         (SELECT COUNT(*) FROM user_coupons WHERE coupon_id = c.id AND is_used = true)::INTEGER
  FROM coupons c
  WHERE c.id = p_coupon_id
  FOR UPDATE NOWAIT;
END;
$$ LANGUAGE plpgsql;
```

---

## 🧠 Phase 2: Domain Layer

### 목표

- 비즈니스 로직을 순수 JavaScript 클래스로 분리
- 계산 로직 중앙화
- 검증 로직 중앙화

---

### Step 2.1: Order 도메인 모델 (40분)

#### 📋 마이그레이션 대상 함수

| 함수명 | 현재 위치 | 목표 위치 |
|--------|----------|----------|
| `OrderCalculations.calculateFinalOrderAmount` | lib/orderCalculations.js | Order.calculateTotal() |
| `formatShippingInfo` | lib/shippingUtils.js | ShippingCalculator.calculate() |

#### 코드 예제

**파일**: `lib/domain/order/Order.js`

```javascript
import { Entity } from '../Entity'
import { InvalidOrderStatusError } from '../../errors'

export class Order extends Entity {
  constructor({
    id,
    customer_order_number,
    user_id,
    order_type,
    status,
    items = [],
    payment = null,
    shipping = null,
    discount_amount = 0,
    created_at
  }) {
    super(id)
    this.customer_order_number = customer_order_number
    this.user_id = user_id
    this.order_type = order_type
    this.status = status
    this.items = items
    this.payment = payment
    this.shipping = shipping
    this.discount_amount = discount_amount
    this.created_at = created_at
  }

  /**
   * 주문 총액 계산
   */
  calculateTotal() {
    const itemsTotal = this.items.reduce((sum, item) => {
      return sum + (item.unit_price * item.quantity)
    }, 0)

    const shippingFee = this.shipping?.total_shipping || 0
    const discount = this.discount_amount || 0

    return itemsTotal + shippingFee - discount
  }

  /**
   * 상태 전환 검증
   */
  canTransitionTo(newStatus) {
    const validTransitions = {
      pending: ['verifying', 'cancelled'],
      verifying: ['deposited', 'cancelled'],
      deposited: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: []
    }

    return validTransitions[this.status]?.includes(newStatus) || false
  }

  /**
   * 상태 변경
   */
  changeStatus(newStatus) {
    if (!this.canTransitionTo(newStatus)) {
      throw new InvalidOrderStatusError(this.id, this.status, newStatus)
    }

    this.status = newStatus
  }

  /**
   * 주문 완료 여부
   */
  isCompleted() {
    return this.status === 'delivered'
  }

  /**
   * 취소 가능 여부
   */
  isCancellable() {
    return ['pending', 'verifying', 'deposited'].includes(this.status)
  }
}
```

---

## 🎨 Phase 3: Application Layer (Use Cases)

### 목표

- UI와 Domain/Infrastructure 연결
- 트랜잭션 관리
- 비즈니스 플로우 구현

---

### Step 3.1: CreateOrderUseCase (50분)

#### 코드 예제

**파일**: `lib/use-cases/order/CreateOrderUseCase.js`

```javascript
import { BaseUseCase } from '../BaseUseCase'
import { OrderRepository } from '../../repositories/OrderRepository'
import { ProductRepository } from '../../repositories/ProductRepository'
import { Order } from '../../domain/order/Order'
import { InsufficientInventoryError, ValidationError } from '../../errors'

export class CreateOrderUseCase extends BaseUseCase {
  constructor() {
    super()
    this.orderRepo = new OrderRepository()
    this.productRepo = new ProductRepository()
  }

  /**
   * 주문 생성
   * @param {object} params - { items, userProfile, payment, shipping, discountAmount }
   */
  async execute({ items, userProfile, payment, shipping, discountAmount = 0 }) {
    try {
      // 1. 재고 검증 (FOR UPDATE NOWAIT)
      for (const item of items) {
        await this.productRepo.decreaseInventory(item.product_id, item.quantity)
      }

      // 2. 주문 데이터 생성
      const orderData = {
        customer_order_number: this.generateOrderNumber(),
        user_id: userProfile.id || null,
        order_type: userProfile.kakao_id ? `direct:KAKAO:${userProfile.kakao_id}` : 'direct',
        status: 'pending',
        discount_amount: discountAmount
      }

      // 3. Repository를 통해 저장
      const order = await this.orderRepo.create({
        orderData,
        orderItems: items,
        payment,
        shipping
      })

      // 4. Domain 모델로 변환
      return new Order(order)
    } catch (error) {
      console.error('[CreateOrderUseCase] 실행 실패:', error)
      throw error
    }
  }

  generateOrderNumber() {
    const date = new Date()
    const dateStr = date.getFullYear().toString().slice(-2) +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0')
    const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase()
    return `S${dateStr}-${randomStr}`
  }
}
```

---

## 🎭 Phase 4: Presentation Layer (UI)

### 목표

- UI 컴포넌트에서 Use Case 호출
- Supabase 클라이언트 제거
- 상태 관리 최적화

---

### Step 4.1: Checkout 페이지 리팩토링 (60분)

#### Before (app/checkout/page.js)

```javascript
// ❌ Bad: 직접 DB 접근 + 비즈니스 로직 혼재
const handleCreateOrder = async () => {
  // 1. 재고 차감
  const { error: invError } = await supabase
    .from('products')
    .update({ inventory: product.inventory - quantity })
    .eq('id', product.id)

  // 2. 주문 생성
  const { data: order } = await supabase
    .from('orders')
    .insert({ ... })

  // 3. 주문 아이템 생성
  // ...
}
```

#### After (app/checkout/page.js)

```javascript
// ✅ Good: Use Case 사용
import { CreateOrderUseCase } from '@/lib/use-cases/order/CreateOrderUseCase'

const handleCreateOrder = async () => {
  try {
    const createOrderUseCase = new CreateOrderUseCase()

    const order = await createOrderUseCase.execute({
      items: cartItems,
      userProfile: user,
      payment: paymentInfo,
      shipping: shippingInfo,
      discountAmount: appliedCoupon?.discount || 0
    })

    router.push(`/orders/${order.id}/complete`)
  } catch (error) {
    if (error instanceof InsufficientInventoryError) {
      toast.error(error.getUserMessage())
    } else {
      toast.error('주문 생성에 실패했습니다.')
    }
  }
}
```

---

## ⚡ Phase 5: 성능 + 동시성 최적화

### Step 5.3: BullMQ Queue 적용 (40분)

#### 1. Queue 설정

**파일**: `lib/queue/orderQueue.js`

```javascript
import { Queue } from 'bullmq'
import { Redis } from '@upstash/redis'

if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error('Missing UPSTASH_REDIS_REST_URL')
}

const connection = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

export const orderQueue = new Queue('orders', { connection })
```

#### 2. Worker 생성

**파일**: `lib/queue/workers/orderWorker.js`

```javascript
import { Worker } from 'bullmq'
import { CreateOrderUseCase } from '../../use-cases/order/CreateOrderUseCase'

export const orderWorker = new Worker('orders', async (job) => {
  console.log(`[OrderWorker] 처리 시작: ${job.id}`)

  const createOrderUseCase = new CreateOrderUseCase()
  const order = await createOrderUseCase.execute(job.data)

  return order
}, {
  connection: upstashRedis
})
```

#### 3. UI에서 Queue 사용

```javascript
// app/checkout/page.js
import { orderQueue } from '@/lib/queue/orderQueue'

const handleCreateOrder = async () => {
  const job = await orderQueue.add('create-order', {
    items: cartItems,
    userProfile: user,
    payment: paymentInfo,
    shipping: shippingInfo
  })

  // Job 완료 대기
  const order = await job.waitUntilFinished()
  router.push(`/orders/${order.id}/complete`)
}
```

---

## 🧪 Phase 6: 테스트 + 검증

### Step 6.1: Repository 단위 테스트 (30분)

```javascript
// tests/repositories/OrderRepository.test.js
import { OrderRepository } from '@/lib/repositories/OrderRepository'

describe('OrderRepository', () => {
  let repo

  beforeEach(() => {
    repo = new OrderRepository()
  })

  it('주문 생성 성공', async () => {
    const order = await repo.create({
      orderData: { ... },
      orderItems: [ ... ],
      payment: { ... },
      shipping: { ... }
    })

    expect(order).toHaveProperty('id')
    expect(order.status).toBe('pending')
  })
})
```

---

## 📝 체크리스트

### 마이그레이션 전

- [ ] Git branch 생성: `feature/clean-architecture`
- [ ] 모든 문서 읽기 (DEVELOPMENT_PRINCIPLES.md 등)
- [ ] Phase 0 완료 확인

### 각 Phase 완료 시

- [ ] 체크리스트 항목 모두 완료
- [ ] 테스트 실행 (`npm test`)
- [ ] ESLint 검증 (`npm run lint`)
- [ ] Git 커밋 (커밋 메시지는 체크리스트 참조)

### 전체 마이그레이션 완료 시

- [ ] Phase 0-7 모든 체크리스트 완료
- [ ] 레거시 코드 제거 (lib/supabaseApi.js 삭제)
- [ ] Playwright E2E 테스트 통과
- [ ] 배포 전 검증 (Vercel Preview)

---

## 🚨 트러블슈팅

### "Missing SUPABASE_SERVICE_ROLE_KEY" 에러

```bash
# .env.local에 추가
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

### ESLint 레이어 경계 위반 에러

```
Error: 'app/checkout/page.js' cannot import from 'lib/repositories/OrderRepository'
```

**해결**: Use Case를 통해서만 접근
```javascript
// ❌ app/checkout/page.js
import { OrderRepository } from '@/lib/repositories/OrderRepository'

// ✅ app/checkout/page.js
import { CreateOrderUseCase } from '@/lib/use-cases/order/CreateOrderUseCase'
```

### FOR UPDATE NOWAIT 타임아웃 에러

```
DatabaseError: 상품이 다른 주문에서 처리 중입니다
```

**해결**: 사용자에게 재시도 안내
```javascript
try {
  await productRepo.decreaseInventory(productId, quantity)
} catch (error) {
  if (error.code === '55P03') {
    toast.error('다른 사용자가 주문 중입니다. 잠시 후 다시 시도해주세요.')
  }
}
```

---

**마지막 업데이트**: 2025-10-21
**다음 Phase**: Phase 1 - Infrastructure Layer
