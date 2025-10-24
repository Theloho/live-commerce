/**
 * GetOrdersUseCase - 주문 목록 조회 Use Case
 * @author Claude
 * @since 2025-10-23 (Updated)
 */

import { BaseUseCase } from '../BaseUseCase'
import { Order } from '@/lib/domain/order/Order'

/**
 * GetOrdersUseCase - 주문 목록 조회 비즈니스 로직
 * - 성능 최적화: DB COUNT, 페이지네이션, 필터링
 * - 카카오 사용자 패턴 지원
 * - statusCounts 계산
 * - 데이터 정규화
 */
export class GetOrdersUseCase extends BaseUseCase {
  /**
   * @param {OrderRepository} orderRepository
   */
  constructor(orderRepository) {
    super()
    this.orderRepository = orderRepository
  }

  /**
   * 주문 목록 조회 실행
   * @param {Object} params
   * @param {Object} params.user - 사용자 정보 { id, kakao_id? }
   * @param {string} params.orderId - 단일 주문 ID (선택)
   * @param {number} params.page - 페이지 번호 (기본 1)
   * @param {number} params.pageSize - 페이지 크기 (기본 10)
   * @param {string} params.status - 상태 필터 (선택)
   * @returns {Promise<{orders, pagination, statusCounts}>}
   */
  async execute({ user, orderId = null, page = 1, pageSize = 10, status = null }) {
    try {
      const startTime = Date.now()
      this.log('주문 목록 조회 시작', {
        userId: user?.id?.substring(0, 8),
        orderId,
        page,
        status,
      })

      if (!user || !user.id) {
        throw new Error('사용자 정보가 필요합니다')
      }

      // 1. statusCounts 계산 (DB COUNT 쿼리)
      const statusCounts = await this._fetchStatusCounts(user)

      // 2. 주문 목록 조회 (페이지네이션 + 필터링)
      const orders = await this._fetchOrders(user, orderId, status, page, pageSize)

      // 3. 일괄결제 그룹 정보 계산 (페이지네이션 무관하게 전체 그룹 조회)
      const ordersWithGroupInfo = await this._enrichBulkPaymentInfo(orders, user)

      // 4. 데이터 정규화
      const normalized = this._normalizeOrders(ordersWithGroupInfo)

      // 5. 필터링된 총 개수 (DB COUNT 쿼리)
      const totalCount = await this._fetchFilteredCount(user, status)
      const totalPages = Math.ceil(totalCount / pageSize)

      const elapsed = Date.now() - startTime
      this.log('주문 목록 조회 완료', {
        count: normalized.length,
        total: totalCount,
        ms: elapsed,
      })

      return {
        success: true,
        orders: normalized,
        pagination: { currentPage: page, pageSize, totalCount, totalPages },
        statusCounts,
      }
    } catch (error) {
      this.handleError(error, '주문 목록 조회 실패')
    }
  }

  /**
   * 주문 목록 조회 @private
   */
  async _fetchOrders(user, orderId, status, page, pageSize) {
    const filters = {
      orderId,
      status,
      page,
      pageSize,
      userId: user.kakao_id ? null : user.id, // 카카오 사용자는 userId 사용 안 함
      kakaoId: user.kakao_id || null, // Repository에서 LIKE 패턴 생성
    }

    const result = await this.orderRepository.findByUser(filters)
    return result.orders // 배열만 반환 (result는 { orders: [...], totalCount, ... } 객체)
  }

  /**
   * 데이터 정규화 @private
   */
  _normalizeOrders(orders) {
    return orders.map((o) => {
      const shipping =
        Array.isArray(o.order_shipping) && o.order_shipping.length > 0
          ? o.order_shipping[0]
          : o.order_shipping
      const payment =
        Array.isArray(o.order_payments) && o.order_payments.length > 0
          ? o.order_payments[0]
          : o.order_payments

      return {
        id: o.id,
        customer_order_number: o.customer_order_number,
        order_type: o.order_type,
        status: o.status,
        payment_group_id: o.payment_group_id || null, // ⭐ 일괄결제 그룹 ID
        bulkPaymentInfo: o.bulkPaymentInfo || null, // ⭐ 일괄결제 정보 (서버에서 계산됨)
        total_amount: o.total_amount,
        depositor_name: payment?.depositor_name || null,
        shipping_fee: shipping?.shipping_fee || 0,
        product_total: o.total_amount - (shipping?.shipping_fee || 0),
        coupon_discount: o.discount_amount || 0,
        final_amount: o.total_amount || 0,
        created_at: o.created_at,
        updated_at: o.updated_at,
        deposited_at: o.paid_at,
        shipped_at: shipping?.shipped_at || null,
        delivered_at: o.delivered_at,
        cancelled_at: o.cancelled_at,
        tracking_number: shipping?.tracking_number || null,
        tracking_company: shipping?.tracking_company || null,

        items: (o.order_items || []).map((i) => ({
          id: i.id,
          order_id: i.order_id,
          product_id: i.product_id,
          variant_id: i.variant_id,
          title: i.title || '상품명 없음',
          price: i.price || i.unit_price || 0,
          unit_price: i.unit_price,
          quantity: i.quantity,
          total: i.total,
          total_price: i.total_price || i.total || 0,
          totalPrice: i.total_price || i.total || 0, // 호환성
          thumbnail_url: i.thumbnail_url || '/placeholder.png',
          product_number: i.product_number || i.product_id,
          selected_options: i.selected_options || {},
          selectedOptions: i.selected_options || {}, // 호환성
        })),

        shipping: shipping
          ? {
              id: shipping.id,
              order_id: shipping.order_id,
              name: shipping.name,
              phone: shipping.phone,
              address: shipping.address,
              detail_address: shipping.detail_address,
              postal_code: shipping.postal_code,
              shipping_fee: shipping.shipping_fee,
              shipping_message: shipping.shipping_message || shipping.memo,
              tracking_number: shipping.tracking_number,
              tracking_company: shipping.tracking_company,
              shipped_at: shipping.shipped_at,
            }
          : null,

        payment: payment
          ? {
              id: payment.id,
              order_id: payment.order_id,
              payment_method: payment.method,
              amount: payment.amount,
              status: payment.status,
              paid_at: payment.paid_at,
              depositor_name: payment.depositor_name,
            }
          : null,
      }
    })
  }

  /**
   * statusCounts 계산 @private
   */
  async _fetchStatusCounts(user) {
    try {
      const filters = {
        userId: user.kakao_id ? null : user.id,
        kakaoId: user.kakao_id || null, // Repository에서 LIKE 패턴 생성
        excludeCancelled: true, // cancelled 제외
      }

      const counts = await this.orderRepository.countByStatus(filters)
      return counts
    } catch (error) {
      this.log('statusCounts 조회 실패', { error: error.message })
      return {}
    }
  }

  /**
   * 일괄결제 그룹 정보 계산 @private
   * - 각 주문의 payment_group_id로 전체 그룹 조회
   * - 대표 주문 (배송비 포함) 찾기
   * - bulkPaymentInfo 객체 추가
   */
  async _enrichBulkPaymentInfo(orders, user) {
    try {
      // payment_group_id가 있는 주문만 추출
      const groupIds = [...new Set(orders.filter(o => o.payment_group_id).map(o => o.payment_group_id))]

      if (groupIds.length === 0) {
        // 일괄결제 주문 없음
        return orders
      }

      // 각 그룹의 모든 주문 조회 (페이지네이션 무관)
      const groupOrdersMap = {}
      for (const groupId of groupIds) {
        const filters = {
          userId: user.kakao_id ? null : user.id,
          kakaoId: user.kakao_id || null,
          paymentGroupId: groupId
        }
        const result = await this.orderRepository.findByPaymentGroup(filters)
        groupOrdersMap[groupId] = result.orders || []
      }

      // 각 주문에 bulkPaymentInfo 추가
      return orders.map(order => {
        if (!order.payment_group_id) {
          return order
        }

        const groupOrders = groupOrdersMap[order.payment_group_id] || []
        const representativeOrder = groupOrders.find(o => {
          const shipping = Array.isArray(o.order_shipping) && o.order_shipping.length > 0
            ? o.order_shipping[0]
            : o.order_shipping
          return (shipping?.shipping_fee || 0) > 0
        })

        return {
          ...order,
          bulkPaymentInfo: {
            isBulkPayment: true,
            isRepresentativeOrder: representativeOrder?.id === order.id,
            groupOrderCount: groupOrders.length,
            representativeOrderNumber: representativeOrder?.customer_order_number || null
          }
        }
      })
    } catch (error) {
      this.log('일괄결제 그룹 정보 계산 실패 (무시)', { error: error.message })
      // 에러가 나도 원본 orders 반환 (그룹 정보 없이)
      return orders
    }
  }

  /**
   * 필터링된 총 개수 @private
   */
  async _fetchFilteredCount(user, status) {
    try {
      const filters = {
        userId: user.kakao_id ? null : user.id,
        kakaoId: user.kakao_id || null, // Repository에서 LIKE 패턴 생성
        status: status,
        excludeCancelled: !status, // status 없으면 cancelled 제외
      }

      return await this.orderRepository.count(filters)
    } catch (error) {
      this.log('filteredCount 조회 실패', { error: error.message })
      return 0
    }
  }

  /**
   * 단일 주문 조회
   * @param {Object} params
   * @param {string} params.orderId - 주문 ID
   * @param {Object} params.user - 사용자 정보 (선택, 권한 검증 시 필요)
   * @returns {Promise<Object>} 정규화된 주문 객체
   */
  async getById({ orderId, user = null }) {
    try {
      this.log('단일 주문 조회 시작', { orderId, userId: user?.id?.substring(0, 8) })

      if (!orderId) {
        throw new Error('주문 ID가 필요합니다')
      }

      // Repository에서 단일 주문 조회
      const order = await this.orderRepository.findById(orderId)

      if (!order) {
        throw new Error('주문을 찾을 수 없습니다')
      }

      // 사용자 권한 검증 (선택적)
      if (user) {
        const isOwner = user.kakao_id
          ? order.order_type?.includes(`KAKAO:${user.kakao_id}`)
          : order.user_id === user.id

        if (!isOwner) {
          throw new Error('주문에 대한 권한이 없습니다')
        }
      }

      // 데이터 정규화
      const normalized = this._normalizeOrders([order])[0]

      this.log('단일 주문 조회 완료', { orderId })

      return {
        success: true,
        order: normalized,
      }
    } catch (error) {
      this.handleError(error, '단일 주문 조회 실패')
    }
  }
}
