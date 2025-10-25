/**
 * useCheckoutPayment - 체크아웃 결제 처리 Custom Hook
 * @author Claude
 * @since 2025-10-21
 *
 * 역할: 체크아웃 페이지의 결제 관련 비즈니스 로직을 추출하여 관리
 * - 무통장입금 처리 (일반/일괄결제)
 * - 카드결제 모달 표시
 * - 쿠폰 적용/해제
 * - 주문 생성 및 상태 업데이트
 *
 * Clean Architecture:
 * - Presentation Layer (Page) → Application Layer (Hook) → Infrastructure (Repository)
 * - CreateOrderUseCase 활용 (향후 통합)
 */

import { useState } from 'react'
import { OrderCalculations } from '@/lib/orderCalculations'
import toast from 'react-hot-toast'
import logger from '@/lib/logger'
import { trackCouponUse } from '@/lib/analytics'

/**
 * useCheckoutPayment Hook
 * @param {Object} params
 * @param {Object} params.orderItem - 주문 아이템 정보
 * @param {Object} params.userProfile - 사용자 프로필
 * @param {Object} params.selectedAddress - 선택된 배송지
 * @param {Object} params.selectedCoupon - 선택된 쿠폰
 * @param {Function} params.setSelectedCoupon - 쿠폰 선택 setState
 * @param {Object} params.orderCalc - OrderCalculations 계산 결과
 * @param {boolean} params.hasPendingOrders - 무료배송 조건 (pending/verifying 주문 존재)
 * @param {string} params.depositName - 입금자명
 * @param {Function} params.setShowDepositModal - 입금자명 모달 setState
 * @param {Function} params.setShowCardModal - 카드결제 모달 setState
 * @param {Object} params.router - Next.js router
 * @param {Object} params.user - 사용자 정보 (userSession 우선, 없으면 user)
 * @returns {Object} { confirmBankTransfer, handleCardPayment, handleApplyCoupon, handleRemoveCoupon, handleBankTransfer, processing }
 */
export function useCheckoutPayment({
  orderItem,
  userProfile,
  selectedAddress,
  selectedCoupon,
  setSelectedCoupon,
  orderCalc,
  hasPendingOrders,
  depositName,
  setShowDepositModal,
  setShowCardModal,
  router,
  user
}) {
  const [processing, setProcessing] = useState(false)

  /**
   * 무통장입금 처리
   * - 일반 주문: createOrder → applyCouponUsage → updateOrderStatus → 페이지 이동
   * - 일괄결제: updateMultipleOrderStatus → applyCouponUsage → 페이지 이동
   * @param {string} finalDepositName - 최종 입금자명 (모달에서 직접 전달, React setState 비동기 문제 회피)
   */
  const confirmBankTransfer = async (finalDepositName) => {
    // ✅ React setState 비동기 문제 해결: 파라미터로 전달된 값 우선 사용
    const depositorName = finalDepositName || depositName

    // 모바일 중복 실행 방지
    if (processing) {
      return
    }

    // 필수 정보 검증
    if (!orderItem || !userProfile) {
      logger.error('주문 정보 또는 사용자 정보가 없습니다')
      toast.error('주문 정보가 없습니다')
      return
    }

    if (!depositorName) {
      toast.error('입금자명을 선택해주세요')
      return
    }

    // 배송지 선택 검증
    if (!selectedAddress) {
      toast.error('배송지를 선택해주세요')
      return
    }

    // 실제 사용될 데이터로 직접 검증 (selectedAddress 포함)
    const missing = []
    if (!userProfile.name || userProfile.name.trim().length === 0) {
      missing.push('이름')
    }
    if (!userProfile.phone || userProfile.phone.trim().length < 10) {
      missing.push('연락처')
    }
    if (!selectedAddress.address || selectedAddress.address.trim().length === 0) {
      missing.push('배송지 주소')
    }

    if (missing.length > 0) {
      toast.error(`다음 정보를 입력해주세요: ${missing.join(', ')}`)
      return
    }

    // 🔒 처리 시작
    setProcessing(true)

    try {
      const bankInfo = '카카오뱅크 79421940478 하상윤'
      let orderId

      // 일괄결제인 경우
      if (orderItem.isBulkPayment && orderItem.originalOrderIds && orderItem.originalOrderIds.length > 0) {
        logger.debug('일괄결제 처리 시작', { count: orderItem.originalOrderIds.length })

        // selectedAddress 직접 사용 (React setState 비동기 문제 해결)
        const finalAddress = selectedAddress || {
          address: userProfile.address,
          detail_address: userProfile.detail_address,
          postal_code: userProfile.postal_code
        }

        // 원본 주문들을 'verifying' 상태로 업데이트 (계좌이체)
        const paymentUpdateData = {
          method: 'bank_transfer',
          depositorName: depositorName,
          discountAmount: orderCalc.couponDiscount || 0,
          shippingData: {
            shipping_name: userProfile.name,
            shipping_phone: userProfile.phone,
            shipping_address: finalAddress.address,
            shipping_detail_address: finalAddress.detail_address || '',
            shipping_postal_code: finalAddress.postal_code || ''
          }
        }

        // API Route 호출 (Clean Architecture)
        const response = await fetch('/api/orders/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderIds: orderItem.originalOrderIds,
            status: 'verifying',
            paymentData: paymentUpdateData
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '주문 상태 업데이트 실패')
        }

        const updateResult = await response.json()

        // 첫 번째 주문 ID를 사용 (일괄결제의 대표 ID)
        orderId = orderItem.originalOrderIds[0]

        // 주문 업데이트 이벤트 발생
        window.dispatchEvent(new CustomEvent('orderUpdated', {
          detail: { action: 'bulkPayment', orderIds: orderItem.originalOrderIds }
        }))
      } else {
        // 단일 주문 생성
        // selectedAddress 직접 사용 (React setState 비동기 문제 해결)
        const finalAddress = selectedAddress || {
          address: userProfile.address,
          detail_address: userProfile.detail_address,
          postal_code: userProfile.postal_code
        }

        const orderProfile = {
          ...userProfile,
          address: finalAddress.address,
          detail_address: finalAddress.detail_address,
          postal_code: finalAddress.postal_code
        }

        // ✅ 주문 생성 직전에 배송비 다시 계산 (클로저 문제 방지!)
        const postalCode = finalAddress.postal_code || userProfile.postal_code
        console.log('🔍 [주문생성] postal_code 확인:', { postalCode, finalAddress, userProfile })

        const { formatShippingInfo } = require('@/lib/shippingUtils')
        const baseShippingFee = hasPendingOrders ? 0 : 4000
        const shippingInfo = formatShippingInfo(baseShippingFee, postalCode)
        const finalShippingFee = shippingInfo.totalShipping

        console.log('🚚 [주문생성] 최종 배송비 계산:', {
          postalCode,
          baseShippingFee,
          shippingInfo,
          finalShippingFee
        })

        // 쿠폰 할인 금액 + 재계산된 배송비를 orderItem에 포함
        const orderItemWithCoupon = {
          ...orderItem,
          couponDiscount: orderCalc.couponDiscount || 0,
          couponCode: selectedCoupon?.coupon?.code || null,
          isFreeShipping: hasPendingOrders,
          shippingFee: finalShippingFee  // ✅ 주문생성 직전 재계산한 배송비 (클로저 문제 해결!)
        }

        // API Route 호출 (Clean Architecture)
        const response = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderData: orderItemWithCoupon,
            userProfile: orderProfile,
            depositName: depositorName,
            user
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '주문 생성 실패')
        }

        const { order: newOrder } = await response.json()
        orderId = newOrder.id

        // 단일 주문: 주문 상태를 'verifying'으로 변경 (입금 확인중)
        try {
          // API Route 호출 (Clean Architecture)
          const response = await fetch('/api/orders/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderIds: [orderId],  // ✅ 배열로 변경
              status: 'verifying',
              paymentData: {  // ✅ depositorName 포함
                method: 'bank_transfer',
                depositorName: depositorName
              }
            })
          })

          if (response.ok) {
            logger.debug('주문 상태 변경: pending → verifying', { orderId, depositorName })
          } else {
            throw new Error('Status update failed')
          }
        } catch (error) {
          logger.error('주문 상태 변경 실패:', error)
          // 상태 변경 실패해도 주문은 진행
        }
      }

      // 쿠폰 사용 처리 (Clean Architecture API Route)
      if (selectedCoupon && orderCalc.couponDiscount > 0) {
        try {
          const currentUserId = selectedCoupon.user_id

          const response = await fetch('/api/coupons/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              couponCode: selectedCoupon.coupon.code,
              userId: currentUserId,
              orderId: orderId,
              orderAmount: orderCalc.totalPrice // 배송비 포함 총액
            })
          })

          if (response.ok) {
            const result = await response.json()
            logger.debug('🎟️ 쿠폰 사용 완료', {
              coupon: selectedCoupon.coupon.code,
              discount: result.discount,
              orderId
            })
          } else {
            const errorData = await response.json()
            logger.warn('⚠️ 쿠폰 사용 처리 실패:', errorData.error)
          }
        } catch (error) {
          logger.error('쿠폰 사용 처리 중 오류:', error)
          // 쿠폰 사용 실패해도 주문은 진행
        }
      }

      // 계좌번호 복사 시도
      try {
        await navigator.clipboard.writeText('79421940478')
        toast.success('계좌번호가 복사되었습니다')
      } catch (error) {
        toast.success('계좌번호: 79421940478')
      }

      // 모바일 호환성: 먼저 세션 정리 및 상태 업데이트
      sessionStorage.removeItem('checkoutItem')
      setShowDepositModal(false)

      // 모바일 호환성: 즉시 리다이렉트 (setTimeout 제거)
      toast.success('주문이 접수되었습니다', { duration: 2000 })

      // 즉시 페이지 이동 (모바일 환경에서 안정적)
      router.replace(`/orders/${orderId}/complete`)
    } catch (error) {
      logger.error('계좌이체 처리 중 오류:', error)
      toast.error('주문 처리 중 오류가 발생했습니다')
      // 에러 시 processing 상태 해제
      setProcessing(false)
      setShowDepositModal(false)
    }
  }

  /**
   * 카드결제 모달 표시
   */
  const handleCardPayment = () => {
    setShowCardModal(true)
  }

  /**
   * 쿠폰 적용
   * - DB 함수로 쿠폰 검증 (validateCoupon)
   * - 상품 금액만 전달 (배송비 제외)
   * - Google Analytics 이벤트 트래킹
   */
  const handleApplyCoupon = async (userCoupon) => {
    try {
      // userCoupon 구조: { id, coupon: { code, name, ... } }
      const coupon = userCoupon.coupon

      // 쿠폰 데이터 검증 (RLS 문제로 JOIN 실패 시 대응)
      if (!coupon || !coupon.code || !coupon.discount_type || coupon.discount_value == null) {
        logger.error('쿠폰 데이터 불완전')
        toast.error('쿠폰 정보를 불러올 수 없습니다. 페이지를 새로고침해주세요.')
        return
      }

      // Clean Architecture API Route로 쿠폰 검증 (상품 금액만 전달, 배송비 제외)
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: coupon.code,
          userId: user?.id,
          orderAmount: orderItem.totalPrice
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast.error(errorData.error || '쿠폰 검증에 실패했습니다')
        return
      }

      const result = await response.json()

      if (!result.valid) {
        toast.error(result.error || '쿠폰을 사용할 수 없습니다')
        return
      }

      setSelectedCoupon(userCoupon)
      toast.success(`${coupon.name} 쿠폰이 적용되었습니다 (₩${result.discount.toLocaleString()} 할인)`)

      // Google Analytics: 쿠폰 사용 이벤트
      trackCouponUse(coupon, result.discount)

      logger.debug('🎟️ 쿠폰 적용 완료', {
        code: coupon.code,
        type: coupon.discount_type,
        discountAmount: result.discount,
        productAmount: orderItem.totalPrice
      })
    } catch (error) {
      console.error('쿠폰 적용 실패:', error)
      toast.error('쿠폰 적용에 실패했습니다')
    }
  }

  /**
   * 쿠폰 해제
   */
  const handleRemoveCoupon = () => {
    setSelectedCoupon(null)
    toast.success('쿠폰이 해제되었습니다')
  }

  /**
   * 무통장입금 모달 열기
   * - 기본값으로 고객 이름 설정 (확인 버튼 즉시 활성화)
   */
  const handleBankTransfer = () => {
    setShowDepositModal(true)
  }

  return {
    confirmBankTransfer,
    handleCardPayment,
    handleApplyCoupon,
    handleRemoveCoupon,
    handleBankTransfer,
    processing
  }
}
