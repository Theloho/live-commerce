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

      // 1.5. 무료배송 확인 (체크아웃에서 계산된 값 사용 - 2025-10-27)
      const t2 = Date.now()
      // ✅ 체크아웃 페이지에서 이미 recheckPendingOrders()로 배송지 비교 완료
      // ✅ orderData.isFreeShipping 값이 정확하므로 그대로 사용
      const isFreeShipping = orderData.isFreeShipping || false
      timings.freeShippingCheck = Date.now() - t2

      // 1.6. ⭐ 합배 원칙: 기존 pending/verifying 주문의 payment_group_id 조회 (2025-10-25)
      const t2_5 = Date.now()
      const paymentGroupId = await this._findExistingPaymentGroup(user, shipping)
      timings.paymentGroupCheck = Date.now() - t2_5
      this.log('🔵 [CreateOrderUseCase] 합배 원칙 적용:', {
        paymentGroupId: paymentGroupId || 'none',
        ms: timings.paymentGroupCheck
      })

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
      // ✅ 체크아웃에서 계산된 배송비 우선 사용 (재계산 방지!)
      const shippingFee = orderData.shippingFee !== undefined
        ? orderData.shippingFee
        : (isFreeShipping ? 0 : 4000)  // fallback (레거시 호환)

      const amount = OrderCalculator.calculateFinalAmount(orderData.items, {
        region: 'normal',  // ✅ 재계산 방지: 항상 'normal' (배송비는 baseShippingFee만 사용)
        coupon,
        paymentMethod: payment.paymentMethod,
        baseShippingFee: shippingFee,  // ✅ 체크아웃에서 계산된 배송비 사용
      })
      timings.calculation = Date.now() - t4

      // 4. 재고 확인
      const t5 = Date.now()
      this.log('🔵 [CreateOrderUseCase] _checkInventory 시작')
      await this._checkInventory(orderData.items)
      timings.inventoryCheck = Date.now() - t5
      this.log('✅ [CreateOrderUseCase] _checkInventory 완료:', `${timings.inventoryCheck}ms`)

      // 4.5. 재고 차감 (주문 생성 직전) ⭐ NEW!
      const t5_5 = Date.now()
      this.log('🔵 [CreateOrderUseCase] 재고 차감 시작')
      await this._deductInventory(orderData.items)
      timings.inventoryDeduction = Date.now() - t5_5
      this.log('✅ [CreateOrderUseCase] 재고 차감 완료:', `${timings.inventoryDeduction}ms`)

      // 5. 카카오 사용자 패턴 (Legacy 호환)
      let orderType = orderData.orderType || 'direct'
      if (user.kakao_id) {
        orderType = `${orderType}:KAKAO:${user.kakao_id}`
      }

      // 6. 상품 정보 조회 (product_number, thumbnail_url)
      const t6 = Date.now()
      this.log('🔵 [CreateOrderUseCase] 상품 정보 조회 시작')
      const productIds = orderData.items.map(item => item.product_id)
      const products = await this.productRepository.findByIds(productIds)

      // product_id -> product 매핑
      const productMap = new Map(products.map(p => [p.id, p]))
      timings.productLookup = Date.now() - t6
      this.log('✅ [CreateOrderUseCase] 상품 정보 조회 완료:', `${timings.productLookup}ms`)

      // 7. DB 저장 (기존 주문 업데이트 또는 신규 생성)
      const t7 = Date.now()
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
            customer_order_number: null, // ✅ pending 주문은 번호 없음 (전체 결제 시 부여)
            status: 'pending',
            total_amount: amount.finalAmount,
            discount_amount: amount.couponDiscount || 0,
            is_free_shipping: isFreeShipping, // 무료배송 플래그
            payment_group_id: paymentGroupId || null, // ⭐ 합배 원칙 (2025-10-25)
          },
          orderItems: orderData.items.map((item) => {
            const product = productMap.get(item.product_id)
            return {
              product_id: item.product_id,
              variant_id: item.variant_id || null,
              title: item.title,
              // ✅ products 테이블에서 자동 조회
              product_number: product?.product_number || null,
              thumbnail_url: product?.thumbnail_url || null,
              quantity: item.quantity,
              price: item.price,
              unit_price: item.unit_price || item.price,
              total: item.total || item.price * item.quantity,
              total_price: item.total_price || item.price * item.quantity,
              // ✅ Variant 옵션 정보 스냅샷 저장 (2025-10-24)
              selected_options: item.selectedOptions || item.selected_options || {},
            }
          }),
          shipping: {
            name: shipping.name,
            phone: shipping.phone,
            address: shipping.address,
            detail_address: shipping.detailAddress || shipping.detail_address || '', // ✅ 상세주소 추가 (2025-10-27)
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
      timings.dbSave = Date.now() - t7
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

  /** 재고 차감 @private
   * @description Queue Worker 제거 후 누락된 재고 차감 로직 복원 (2025-10-24)
   * @param {Array} items - 주문 아이템 배열
   */
  async _deductInventory(items) {
    if (!items || items.length === 0) {
      this.log('재고 차감 대상 없음')
      return
    }

    for (const item of items) {
      if (!item.product_id) {
        this.log('⚠️ product_id 없음, 재고 차감 건너뜀:', item)
        continue
      }

      try {
        // Variant 상품인 경우 (variant_id가 있으면)
        if (item.variant_id) {
          await this.productRepository.updateVariantInventory(item.variant_id, -item.quantity)
          this.log('✅ Variant 재고 차감 완료', {
            variant_id: item.variant_id,
            quantity: -item.quantity
          })
        } else {
          // 일반 상품인 경우
          await this.productRepository.updateInventory(item.product_id, -item.quantity)
          this.log('✅ 재고 차감 완료', {
            product_id: item.product_id,
            quantity: -item.quantity
          })
        }
      } catch (error) {
        // 재고 차감 실패 시 에러 던지기 (주문 생성 중단)
        this.log('❌ 재고 차감 실패:', {
          product_id: item.product_id,
          variant_id: item.variant_id,
          error: error.message
        })
        throw new InsufficientInventoryError(
          `재고 차감 실패: ${item.title} (${error.message})`
        )
      }
    }
  }

  /** 합배 원칙: 기존 pending/verifying 주문의 payment_group_id 조회 @private
   * @description 결제확인중에 있는 선주문건이 있으면 다음주문건에 배송비를 부과하지 않는다
   * @param {Object} user - 사용자 정보 { id, kakao_id }
   * @param {Object} shipping - 배송지 정보 { postalCode, detail_address }
   * @returns {Promise<string|null>} payment_group_id 또는 null
   */
  async _findExistingPaymentGroup(user, shipping) {
    try {
      this.log('🔍 [합배 원칙] 기존 pending/verifying 주문 조회 시작')

      const filter = user.kakao_id
        ? { kakaoId: user.kakao_id }
        : { userId: user.id }

      // ⭐ 배열 반환 (배송지 정보 포함) - 2025-10-27
      const existingOrders = await this.orderRepository.findPendingOrdersWithGroup(filter)

      if (!existingOrders || existingOrders.length === 0) {
        this.log('✅ [합배 원칙] 기존 주문 없음 → 신규 주문 (payment_group_id 없음)')
        return null
      }

      // ⭐ 배송지 비교 (postal_code + detail_address) - 2025-10-27
      const currentPostalCode = shipping.postalCode || shipping.postal_code
      const currentDetailAddress = shipping.detailAddress || shipping.detail_address

      // ✅ 현재 주문 배송지 정보 검증 (2025-10-27)
      if (!currentPostalCode || !currentDetailAddress ||
          currentPostalCode.trim() === '' || currentDetailAddress.trim() === '') {
        this.log('⚠️ [합배 원칙] 현재 주문 배송지 정보 불완전 → payment_group_id = null', {
          postal: currentPostalCode,
          detail: currentDetailAddress
        })
        return null
      }

      this.log('🔍 [합배 원칙] 배송지 비교 시작:', {
        current: { postal: currentPostalCode, detail: currentDetailAddress },
        existingCount: existingOrders.length
      })

      // 배송지 일치하는 주문 찾기
      const matchedOrder = existingOrders.find(order => {
        const shipping = order.order_shipping?.[0] || {}

        // ✅ 기존 주문 배송지 정보 검증 (2025-10-27)
        const hasValidShipping = (
          shipping.postal_code &&
          shipping.detail_address &&
          shipping.postal_code.trim() !== '' &&
          shipping.detail_address.trim() !== ''
        )

        if (!hasValidShipping) {
          return false // 기존 주문 배송지 정보 불완전 → 비교 안 함
        }

        const isMatch = (
          shipping.postal_code === currentPostalCode &&
          shipping.detail_address === currentDetailAddress
        )

        if (isMatch) {
          this.log('✅ [합배 원칙] 배송지 일치:', {
            orderId: order.id,
            postal: shipping.postal_code,
            detail: shipping.detail_address
          })
        }

        return isMatch
      })

      if (!matchedOrder) {
        // 배송지 일치하는 주문 없음 → 합배 안 함
        this.log('⚠️ [합배 원칙] 배송지 일치하는 주문 없음 → payment_group_id = null')
        return null
      }

      // ⭐ 배송지 일치하는 주문 발견!
      if (matchedOrder.payment_group_id) {
        // 이미 그룹 ID 있으면 재사용
        this.log('✅ [합배 원칙] 배송지 같음 + 기존 그룹 재사용:', matchedOrder.payment_group_id)
        return matchedOrder.payment_group_id
      } else {
        // 그룹 ID 없으면 신규 생성 (기존 주문 + 현재 주문 = 2건 이상)
        const newGroupId = crypto.randomUUID()
        this.log('🔵 [합배 원칙] 배송지 같음 + 신규 그룹 생성:', newGroupId)

        // ⭐ 기존 주문에도 적용
        await this.orderRepository.update(matchedOrder.id, {
          payment_group_id: newGroupId
        })
        this.log('✅ [합배 원칙] 기존 주문에 payment_group_id 적용 완료')

        return newGroupId
      }
    } catch (error) {
      this.log('⚠️ [합배 원칙] payment_group_id 조회 실패 (기본값 null):', error.message)
      return null // 실패 시 null 반환 (신규 주문은 정상 생성)
    }
  }
}

