/**
 * GetOrdersUseCase 테스트
 * @author Claude
 * @since 2025-10-28
 *
 * 테스트 범위:
 * - groupTotalAmount 계산 (일괄결제 총 입금금액)
 * - bulkPaymentInfo 객체 생성
 */

import { GetOrdersUseCase } from '@/lib/use-cases/order/GetOrdersUseCase'

describe('GetOrdersUseCase - groupTotalAmount 계산', () => {
  let useCase
  let mockRepository

  beforeEach(() => {
    // Mock Repository
    mockRepository = {
      findByUser: jest.fn(),
      findByPaymentGroup: jest.fn(),
      countByStatus: jest.fn(),
      count: jest.fn(),
    }

    useCase = new GetOrdersUseCase(mockRepository)
  })

  describe('일괄결제 groupTotalAmount 계산', () => {
    it('3건 일괄결제 시 총 금액이 정확히 합산되어야 함', async () => {
      // Given: 3건의 주문 (₩50,000 + ₩60,000 + ₩40,000 = ₩150,000)
      const paymentGroupId = 'GROUP-123'
      const mockOrders = [
        {
          id: 'order-1',
          customer_order_number: 'ORDER-001',
          total_amount: 50000,
          payment_group_id: paymentGroupId,
          created_at: '2025-10-28T10:00:00Z',
          order_items: [],
          order_shipping: [],
          order_payments: [],
        },
        {
          id: 'order-2',
          customer_order_number: 'ORDER-002',
          total_amount: 60000,
          payment_group_id: paymentGroupId,
          created_at: '2025-10-28T10:01:00Z',
          order_items: [],
          order_shipping: [],
          order_payments: [],
        },
        {
          id: 'order-3',
          customer_order_number: 'ORDER-003',
          total_amount: 40000,
          payment_group_id: paymentGroupId,
          created_at: '2025-10-28T10:02:00Z',
          order_items: [],
          order_shipping: [],
          order_payments: [],
        },
      ]

      const user = { id: 'user-123' }

      // Mock Repository 응답 설정
      mockRepository.findByUser.mockResolvedValue({ orders: mockOrders })
      mockRepository.findByPaymentGroup.mockResolvedValue({ orders: mockOrders })
      mockRepository.countByStatus.mockResolvedValue({})
      mockRepository.count.mockResolvedValue(3)

      // When: execute() 호출
      const result = await useCase.execute({ user, page: 1, pageSize: 10 })

      // Then: groupTotalAmount가 정확히 계산되어야 함
      expect(result.success).toBe(true)
      expect(result.orders).toHaveLength(3)

      // 모든 주문에 bulkPaymentInfo가 있어야 함
      result.orders.forEach((order) => {
        expect(order.bulkPaymentInfo).toBeDefined()
        expect(order.bulkPaymentInfo.isBulkPayment).toBe(true)
        expect(order.bulkPaymentInfo.groupOrderCount).toBe(3)
        expect(order.bulkPaymentInfo.groupTotalAmount).toBe(150000) // ⭐ 핵심 검증
      })

      // 대표 주문 (가장 오래된 주문 = order-1) 확인
      const representativeOrder = result.orders.find(
        (o) => o.bulkPaymentInfo.isRepresentativeOrder
      )
      expect(representativeOrder).toBeDefined()
      expect(representativeOrder.id).toBe('order-1') // 가장 먼저 생성된 주문
    })

    it('단일 주문 시 bulkPaymentInfo가 없어야 함', async () => {
      // Given: 1건의 주문 (일괄결제 아님)
      const mockOrders = [
        {
          id: 'order-1',
          customer_order_number: 'ORDER-001',
          total_amount: 50000,
          payment_group_id: null, // ⭐ 일괄결제 아님
          created_at: '2025-10-28T10:00:00Z',
          order_items: [],
          order_shipping: [],
          order_payments: [],
        },
      ]

      const user = { id: 'user-123' }

      mockRepository.findByUser.mockResolvedValue({ orders: mockOrders })
      mockRepository.countByStatus.mockResolvedValue({})
      mockRepository.count.mockResolvedValue(1)

      // When
      const result = await useCase.execute({ user, page: 1, pageSize: 10 })

      // Then: bulkPaymentInfo가 없어야 함 (backward compatible)
      expect(result.success).toBe(true)
      expect(result.orders).toHaveLength(1)
      expect(result.orders[0].bulkPaymentInfo).toBeNull()
    })

    it('groupTotalAmount 계산 시 null/undefined 안전하게 처리', async () => {
      // Given: total_amount가 null인 주문 포함
      const paymentGroupId = 'GROUP-123'
      const mockOrders = [
        {
          id: 'order-1',
          total_amount: 50000,
          payment_group_id: paymentGroupId,
          created_at: '2025-10-28T10:00:00Z',
          order_items: [],
          order_shipping: [],
          order_payments: [],
        },
        {
          id: 'order-2',
          total_amount: null, // ⭐ null 처리
          payment_group_id: paymentGroupId,
          created_at: '2025-10-28T10:01:00Z',
          order_items: [],
          order_shipping: [],
          order_payments: [],
        },
        {
          id: 'order-3',
          total_amount: undefined, // ⭐ undefined 처리
          payment_group_id: paymentGroupId,
          created_at: '2025-10-28T10:02:00Z',
          order_items: [],
          order_shipping: [],
          order_payments: [],
        },
      ]

      const user = { id: 'user-123' }

      mockRepository.findByUser.mockResolvedValue({ orders: mockOrders })
      mockRepository.findByPaymentGroup.mockResolvedValue({ orders: mockOrders })
      mockRepository.countByStatus.mockResolvedValue({})
      mockRepository.count.mockResolvedValue(3)

      // When
      const result = await useCase.execute({ user, page: 1, pageSize: 10 })

      // Then: null/undefined는 0으로 처리
      expect(result.success).toBe(true)
      result.orders.forEach((order) => {
        expect(order.bulkPaymentInfo.groupTotalAmount).toBe(50000) // 50000 + 0 + 0
      })
    })
  })
})
