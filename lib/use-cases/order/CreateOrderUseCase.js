/**
 * CreateOrderUseCase - 주문 생성 Use Case
 * @author Claude
 * @since 2025-10-21
 */

import { BaseUseCase } from '../BaseUseCase'
import { Order } from '@/lib/domain/order/Order'
import { OrderCalculator } from '@/lib/domain/order/OrderCalculator'
import { OrderValidator } from '@/lib/domain/order/OrderValidator'
import { ValidationError, InsufficientInventoryError } from '@/lib/errors'

/**
 * CreateOrderUseCase - 주문 생성 비즈니스 로직
 * - 검증 (OrderValidator), 금액 계산 (OrderCalculator)
 * - Order Entity 생성, Repository 저장
 * - Queue 제거: Serverless 환경에서 Worker 실행 불가
 */
export class CreateOrderUseCase extends BaseUseCase {
  /**
   * @param {OrderRepository} orderRepository
   * @param {ProductRepository} productRepository
   */
  constructor(orderRepository, productRepository) {
    super()
    this.orderRepository = orderRepository
    this.productRepository = productRepository
  }

  /**
   * 주문 생성 실행
   * @param {Object} params - { orderData, shipping, payment, coupon?, user }
   * @returns {Promise<Order>} 생성된 Order Entity
   * @throws {ValidationError} 검증 실패 시
   * @throws {InsufficientInventoryError} 재고 부족 시
   */
  async execute({ orderData, shipping, payment, coupon = null, user }) {
    const timings = {}
    const startTime = Date.now()

    try {
      // 1. 검증
      const t1 = Date.now()
      this._validateInput({ orderData, shipping, payment })
      timings.validation = Date.now() - t1

      // 1.5. 무료배송 확인 (hasPendingOrders 사용)
      const t2 = Date.now()
      // ⚠️ 임시: hasPendingOrders 건너뛰기 (타임아웃 디버깅)
      let isFreeShipping = false
      // try {
      //   const filter = user.kakao_id
      //     ? { kakaoId: user.kakao_id }
      //     : { userId: user.id }
      //   isFreeShipping = await this.orderRepository.hasPendingOrders(filter)
      // } catch (e) {
      //   // 무료배송 확인 실패 시 기본값 유지
      // }
      timings.freeShippingCheck = Date.now() - t2

      // 2. 장바구니 병합 체크 (Legacy 호환)
      const t3 = Date.now()
      const { orderId, existingOrder } = await this._findOrCreateOrder(
        user,
        orderData.orderType || 'direct'
      )
      const customerOrderNumber = existingOrder?.customer_order_number || this._generateOrderNumber()
      timings.findOrCreateOrder = Date.now() - t3

      // 3. 금액 계산
      const t4 = Date.now()
      const amount = OrderCalculator.calculateFinalAmount(orderData.items, {
        region: shipping.postalCode || 'normal',
        coupon,
        paymentMethod: payment.paymentMethod,
        baseShippingFee: isFreeShipping ? 0 : 4000, // 무료배송 적용 (다른 주문 있으면 0원)
      })
      timings.calculation = Date.now() - t4

      // 4. 재고 확인
      const t5 = Date.now()
      this.log('🔵 [CreateOrderUseCase] _checkInventory 시작')
      await this._checkInventory(orderData.items)
      timings.inventoryCheck = Date.now() - t5
      this.log('✅ [CreateOrderUseCase] _checkInventory 완료:', `${timings.inventoryCheck}ms`)

      // 5. 카카오 사용자 패턴 (Legacy 호환)
      let orderType = orderData.orderType || 'direct'
      if (user.kakao_id) {
        orderType = `${orderType}:KAKAO:${user.kakao_id}`
      }

      // 6. DB 저장 (기존 주문 업데이트 또는 신규 생성)
      const t6 = Date.now()
      this.log('🔵 [CreateOrderUseCase] DB 저장 시작')
      let created
      if (existingOrder) {
        // 장바구니 병합: total_amount 누적
        const newTotalAmount = (existingOrder.total_amount || 0) + amount.finalAmount
        created = await this.orderRepository.update(orderId, {
          total_amount: newTotalAmount,
        })
      } else {
        // 신규 주문 생성
        this.log('🔵 [CreateOrderUseCase] orderRepository.create() 호출')
        created = await this.orderRepository.create({
          orderData: {
            id: orderId, // UUID 명시적 지정
            user_id: user.id || null, // kakao 사용자는 null 가능
            order_type: orderType, // 카카오 패턴 포함
            customer_order_number: customerOrderNumber,
            status: 'pending',
            total_amount: amount.finalAmount,
            discount_amount: amount.couponDiscount || 0,
            is_free_shipping: isFreeShipping, // 무료배송 플래그
          },
          orderItems: orderData.items.map((item) => ({
            product_id: item.product_id,
            variant_id: item.variant_id || null,
            title: item.title,
            quantity: item.quantity,
            price: item.price,
            unit_price: item.unit_price || item.price,
            total: item.total || item.price * item.quantity,
            total_price: item.total_price || item.price * item.quantity,
          })),
          shipping: {
            name: shipping.name,
            phone: shipping.phone,
            address: shipping.address,
            postal_code: shipping.postalCode || shipping.postal_code,
            shipping_fee: amount.shippingFee,
          },
          payment: {
            method: payment.paymentMethod,
            amount: amount.finalAmount,
            depositor_name: payment.depositorName || payment.depositor_name || null,
          },
        })
        this.log('✅ [CreateOrderUseCase] orderRepository.create() 완료')
      }
      timings.dbSave = Date.now() - t6
      this.log('✅ [CreateOrderUseCase] DB 저장 완료:', `${timings.dbSave}ms`)

      const totalElapsed = Date.now() - startTime
      timings.total = totalElapsed

      // 📊 성능 로그 출력
      this.log('🔵 [CreateOrderUseCase] 단계별 시간:', timings)
      this.log('주문 생성 완료', { orderId: created.id, isCartMerge: !!existingOrder })

      // Order Entity + timings 반환 (디버깅용)
      const order = Order.fromJSON(created)
      return {
        ...order,
        _timings: timings // 디버깅 정보 추가
      }
    } catch (error) {
      const totalElapsed = Date.now() - startTime
      this.log('❌ [CreateOrderUseCase] 실패:', { elapsed: `${totalElapsed}ms`, timings })
      this.handleError(error, '주문 생성 실패')
    }
  }

  /** 입력 검증 @private */
  _validateInput({ orderData, shipping, payment }) {
    const v = OrderValidator.validateOrder({ orderData, shipping, payment })
    if (!v.isValid) {
      throw new ValidationError('주문 데이터 검증 실패', {
        errors: [...v.errors.orderData, ...v.errors.shipping, ...v.errors.payment],
      })
    }
  }

  /** 재고 확인 @private */
  async _checkInventory(items) {
    const ids = items.map((item) => item.product_id)
    const products = await this.productRepository.findByIds(ids)

    for (const item of items) {
      const product = products.find((p) => p.id === item.product_id)
      if (!product) throw new InsufficientInventoryError(`상품 없음: ${item.product_id}`)
      if (product.inventory < item.quantity) {
        throw new InsufficientInventoryError(
          `재고 부족: ${product.title} (${product.inventory}/${item.quantity})`
        )
      }
    }
  }

  /** 주문번호 생성 @private */
  _generateOrderNumber() {
    const d = new Date()
    const date = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const rand = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')
    return `S${date}-${rand}`
  }

  /** 장바구니 병합 체크 @private (Legacy 호환) */
  async _findOrCreateOrder(user, orderType) {
    // ⚠️ 임시: findPendingCart 건너뛰기 (타임아웃 디버깅)
    // 항상 신규 주문 생성
    return { orderId: crypto.randomUUID(), existingOrder: null }

    // // cart 타입이 아니면 항상 신규 주문
    // if (orderType !== 'cart') {
    //   return { orderId: crypto.randomUUID(), existingOrder: null }
    // }

    // // cart 타입: 기존 pending cart 찾기
    // const filter = {
    //   status: 'pending',
    //   orderType: user.kakao_id ? `cart:KAKAO:${user.kakao_id}` : 'cart',
    // }

    // try {
    //   const existing = await this.orderRepository.findPendingCart(filter)
    //   if (existing) {
    //     return { orderId: existing.id, existingOrder: existing }
    //   }
    // } catch (e) {
    //   // 조회 실패 시 신규 주문 생성
    //   this.log('장바구니 조회 실패, 신규 주문 생성', { error: e.message })
    // }

    // return { orderId: crypto.randomUUID(), existingOrder: null }
  }
}

