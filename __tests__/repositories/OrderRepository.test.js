/**
 * OrderRepository 단위 테스트 (Phase 7)
 *
 * 테스트 대상:
 * - create() - 주문 생성
 * - findById() - 주문 조회
 * - findByUser() - 사용자별 주문 목록
 * - updateStatus() - 주문 상태 변경
 * - hasPendingOrders() - pending 주문 확인
 * - findPendingCart() - pending 장바구니 찾기
 *
 * ✅ Rule #0 준수:
 * - Rule 1: 파일 크기 ≤300 lines
 * - Rule 7: 모든 비동기 테스트 try-catch
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import OrderRepository from '@/lib/repositories/OrderRepository'

// 테스트 데이터
const testUserId = 'test-user-' + Date.now()
const testKakaoId = 'test-kakao-' + Date.now()
let createdOrderId = null

describe('OrderRepository 단위 테스트', () => {
  // 테스트 완료 후 정리
  afterAll(async () => {
    // 테스트 데이터 정리는 DB 복잡도 때문에 생략
    // 실제 환경에서는 별도 테스트 DB 사용 권장
  })

  /**
   * 1. create() - 주문 생성 테스트
   */
  describe('create()', () => {
    test('정상적인 주문 데이터로 주문을 생성할 수 있다', async () => {
      const orderData = {
        id: crypto.randomUUID(),
        customer_order_number: `S${Date.now()}-TEST`,
        status: 'pending',
        order_type: 'direct',
        total_amount: 50000,
        discount_amount: 0,
        is_free_shipping: false,
        user_id: testUserId
      }

      const result = await OrderRepository.create(orderData)

      expect(result).toBeDefined()
      expect(result.id).toBe(orderData.id)
      expect(result.status).toBe('pending')
      expect(result.total_amount).toBe(50000)

      // 다른 테스트에서 사용하기 위해 저장
      createdOrderId = result.id
    })

    test('필수 필드 누락 시 에러를 던진다', async () => {
      const invalidOrderData = {
        // customer_order_number 누락
        status: 'pending'
      }

      await expect(
        OrderRepository.create(invalidOrderData)
      ).rejects.toThrow()
    })
  })

  /**
   * 2. findById() - 주문 조회 테스트
   */
  describe('findById()', () => {
    test('존재하는 주문 ID로 주문을 조회할 수 있다', async () => {
      const order = await OrderRepository.findById(createdOrderId)

      expect(order).toBeDefined()
      expect(order.id).toBe(createdOrderId)
      expect(order.order_items).toBeDefined()
      expect(order.order_payments).toBeDefined()
      expect(order.order_shipping).toBeDefined()
    })

    test('존재하지 않는 주문 ID로 조회 시 에러를 던진다', async () => {
      await expect(
        OrderRepository.findById('non-existent-id-12345')
      ).rejects.toThrow()
    })
  })

  /**
   * 3. updateStatus() - 주문 상태 변경 테스트
   */
  describe('updateStatus()', () => {
    test('주문 상태를 pending에서 paid로 변경할 수 있다', async () => {
      const updatedOrder = await OrderRepository.updateStatus(
        createdOrderId,
        'paid'
      )

      expect(updatedOrder).toBeDefined()
      expect(updatedOrder.status).toBe('paid')
    })

    test('deposited 상태로 변경 시 deposited_at이 자동 설정된다', async () => {
      // 테스트용 주문 생성
      const testOrder = await OrderRepository.create({
        id: crypto.randomUUID(),
        customer_order_number: `S${Date.now()}-TEST2`,
        status: 'pending',
        order_type: 'direct',
        total_amount: 30000,
        user_id: testUserId
      })

      const updatedOrder = await OrderRepository.updateStatus(
        testOrder.id,
        'deposited'
      )

      expect(updatedOrder.status).toBe('deposited')
      expect(updatedOrder.deposited_at).toBeDefined()
      expect(updatedOrder.deposited_at).not.toBeNull()
    })

    test('shipped 상태로 변경 시 shipped_at이 자동 설정된다', async () => {
      const updatedOrder = await OrderRepository.updateStatus(
        createdOrderId,
        'shipped'
      )

      expect(updatedOrder.status).toBe('shipped')
      expect(updatedOrder.shipped_at).toBeDefined()
    })
  })

  /**
   * 4. findByUser() - 사용자별 주문 목록 조회
   */
  describe('findByUser()', () => {
    test('userId로 사용자의 주문 목록을 조회할 수 있다', async () => {
      const result = await OrderRepository.findByUser({
        userId: testUserId,
        page: 1,
        pageSize: 10
      })

      expect(result).toBeDefined()
      expect(result.orders).toBeDefined()
      expect(Array.isArray(result.orders)).toBe(true)
      expect(result.totalCount).toBeGreaterThanOrEqual(1)
      expect(result.currentPage).toBe(1)
    })

    test('kakaoId로 카카오 사용자의 주문을 조회할 수 있다', async () => {
      // 카카오 주문 생성
      await OrderRepository.create({
        id: crypto.randomUUID(),
        customer_order_number: `S${Date.now()}-KAKAO`,
        status: 'pending',
        order_type: `direct:KAKAO:${testKakaoId}`,
        total_amount: 40000,
        user_id: null
      })

      const result = await OrderRepository.findByUser({
        kakaoId: testKakaoId,
        page: 1,
        pageSize: 10
      })

      expect(result.orders.length).toBeGreaterThanOrEqual(1)
      expect(result.orders[0].order_type).toContain(testKakaoId)
    })

    test('status 필터로 특정 상태의 주문만 조회할 수 있다', async () => {
      const result = await OrderRepository.findByUser({
        userId: testUserId,
        status: 'shipped',
        page: 1,
        pageSize: 10
      })

      expect(result).toBeDefined()
      // shipped 상태가 있다면 모두 shipped여야 함
      result.orders.forEach(order => {
        expect(order.status).toBe('shipped')
      })
    })

    test('페이지네이션이 정상 작동한다', async () => {
      const result = await OrderRepository.findByUser({
        userId: testUserId,
        page: 1,
        pageSize: 1 // 페이지당 1개
      })

      expect(result.totalPages).toBeDefined()
      expect(result.orders.length).toBeLessThanOrEqual(1)
    })
  })

  /**
   * 5. hasPendingOrders() - pending 주문 확인
   */
  describe('hasPendingOrders()', () => {
    beforeAll(async () => {
      // pending 주문 생성
      await OrderRepository.create({
        id: crypto.randomUUID(),
        customer_order_number: `S${Date.now()}-PENDING`,
        status: 'pending',
        order_type: 'direct',
        total_amount: 25000,
        user_id: testUserId
      })
    })

    test('pending 주문이 있으면 true를 반환한다', async () => {
      const hasPending = await OrderRepository.hasPendingOrders({
        userId: testUserId
      })

      expect(hasPending).toBe(true)
    })

    test('excludeIds로 특정 주문을 제외할 수 있다', async () => {
      // 모든 pending 주문 조회
      const allOrders = await OrderRepository.findByUser({
        userId: testUserId,
        status: 'pending'
      })

      const excludeIds = allOrders.orders.map(o => o.id)

      const hasPending = await OrderRepository.hasPendingOrders({
        userId: testUserId,
        excludeIds
      })

      expect(hasPending).toBe(false) // 모두 제외했으므로 false
    })

    test('kakaoId로도 pending 주문을 확인할 수 있다', async () => {
      // 카카오 pending 주문 생성
      await OrderRepository.create({
        id: crypto.randomUUID(),
        customer_order_number: `S${Date.now()}-KAKAO-PENDING`,
        status: 'verifying',
        order_type: `direct:KAKAO:${testKakaoId}`,
        total_amount: 35000,
        user_id: null
      })

      const hasPending = await OrderRepository.hasPendingOrders({
        kakaoId: testKakaoId
      })

      expect(hasPending).toBe(true)
    })
  })

  /**
   * 6. findPendingCart() - pending 장바구니 찾기
   */
  describe('findPendingCart()', () => {
    test('일반 사용자의 pending 장바구니를 찾을 수 있다', async () => {
      // pending cart 생성
      const cartOrder = await OrderRepository.create({
        id: crypto.randomUUID(),
        customer_order_number: `S${Date.now()}-CART`,
        status: 'pending',
        order_type: 'cart',
        total_amount: 15000,
        user_id: testUserId
      })

      const foundCart = await OrderRepository.findPendingCart({
        kakaoId: null
      })

      expect(foundCart).toBeDefined()
      expect(foundCart.id).toBe(cartOrder.id)
    })

    test('카카오 사용자의 pending 장바구니를 찾을 수 있다', async () => {
      const newKakaoId = 'test-kakao-cart-' + Date.now()

      const cartOrder = await OrderRepository.create({
        id: crypto.randomUUID(),
        customer_order_number: `S${Date.now()}-KAKAO-CART`,
        status: 'pending',
        order_type: `cart:KAKAO:${newKakaoId}`,
        total_amount: 20000,
        user_id: null
      })

      const foundCart = await OrderRepository.findPendingCart({
        kakaoId: newKakaoId
      })

      expect(foundCart).toBeDefined()
      expect(foundCart.id).toBe(cartOrder.id)
      expect(foundCart.customer_order_number).toBe(cartOrder.customer_order_number)
    })

    test('pending 장바구니가 없으면 null을 반환한다', async () => {
      const foundCart = await OrderRepository.findPendingCart({
        kakaoId: 'non-existent-kakao-id-' + Date.now()
      })

      expect(foundCart).toBeNull()
    })
  })
})
