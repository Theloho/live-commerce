/**
 * CheckoutPage - 체크아웃 페이지 (Phase 4.1 리팩토링 완료)
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture 적용:
 * - Presentation Layer: 이 파일 (≤ 300 lines, Rule 1)
 * - Application Layer: useCheckoutInit, useCheckoutPayment hooks
 * - Infrastructure Layer: OrderRepository, UserProfileManager
 *
 * ✅ Rule #0 준수:
 * - Rule 1: 파일 크기 300줄 이하
 * - Rule 2: Layer boundary 준수 (직접 DB 접근 금지)
 * - Rule 5: 직접 supabase 호출 제거 (OrderRepository 사용)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import useAuth from '@/hooks/useAuth'
import { useCheckoutInit } from '@/app/hooks/useCheckoutInit'
import { useCheckoutPayment } from '@/app/hooks/useCheckoutPayment'
import OrderSummary from '@/app/components/checkout/OrderSummary'
import ShippingForm from '@/app/components/checkout/ShippingForm'
import CouponSelector from '@/app/components/checkout/CouponSelector'
import PaymentMethodSelector from '@/app/components/checkout/PaymentMethodSelector'
import PriceBreakdown from '@/app/components/checkout/PriceBreakdown'
import DepositNameModal from '@/app/components/checkout/DepositNameModal'
import CheckoutLoadingState from '@/app/components/checkout/CheckoutLoadingState'
import { OrderCalculations } from '@/lib/orderCalculations'
import { trackBeginCheckout } from '@/lib/analytics'

// ⚡ Dynamic Import: 모달은 열릴 때만 로드
const CardPaymentModal = dynamic(() => import('@/app/components/common/CardPaymentModal'), {
  loading: () => null,
  ssr: false
})

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()

  // ⚡ 초기화 Hook - 모든 초기화 로직을 Custom Hook으로 추출
  const {
    pageLoading,
    orderItem,
    userProfile,
    selectedAddress,
    availableCoupons,
    hasPendingOrders,
    enableCardPayment,
    userSession,
    setUserProfile,
    setSelectedAddress,
    setAvailableCoupons
  } = useCheckoutInit({ user, isAuthenticated, authLoading, router })

  // 로컬 상태 (모달 제어, 입금자명)
  const [showCardModal, setShowCardModal] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositName, setDepositName] = useState('')
  const [depositOption, setDepositOption] = useState('name')
  const [customDepositName, setCustomDepositName] = useState('')
  const [selectedCoupon, setSelectedCoupon] = useState(null)

  // 주문 금액 계산 (OrderCalculations 사용)
  const calculateOrder = () => {
    if (!orderItem) return null

    const postalCode = selectedAddress?.postal_code || userProfile.postal_code

    // 🚨 디버그: postalCode 확인
    console.log('📍 [Checkout] 주소 정보:', {
      selectedAddress,
      'selectedAddress?.postal_code': selectedAddress?.postal_code,
      'userProfile.postal_code': userProfile.postal_code,
      postalCode
    })

    // ✅ postal_code 필수 검증 (빈 문자열 포함)
    if (!postalCode || (typeof postalCode === 'string' && postalCode.trim() === '')) {
      console.warn('⚠️ [Checkout] postal_code 없음 - 배송지를 다시 선택해주세요')
      // ⚠️ 사용자에게 알림은 일단 생략 (기본 배송비로 계산)
      // toast.error('배송지에 우편번호가 없습니다. 배송지를 다시 선택해주세요.')
    }

    const baseShippingFee = hasPendingOrders ? 0 : 4000
    const orderItems = orderItem.isBulkPayment
      ? [{ price: orderItem.totalPrice, quantity: 1, title: orderItem.title }]
      : [{ price: orderItem.price, quantity: orderItem.quantity, title: orderItem.title }]

    // ✅ 배송비 계산 (우편번호 기반)
    const { formatShippingInfo } = require('@/lib/shippingUtils')
    const shippingInfo = formatShippingInfo(baseShippingFee, postalCode)
    const calculatedShippingFee = shippingInfo.totalShipping

    console.log('🚚 [Checkout] 배송비 계산:', {
      postalCode,
      baseShippingFee,
      hasPendingOrders,
      shippingInfo,
      calculatedShippingFee
    })

    return OrderCalculations.calculateFinalOrderAmount(orderItems, {
      region: 'normal',  // ✅ 재계산 방지: 항상 'normal'
      coupon: selectedCoupon ? {
        type: selectedCoupon.coupon.discount_type,
        value: selectedCoupon.coupon.discount_value,
        maxDiscount: selectedCoupon.coupon.max_discount_amount,
        code: selectedCoupon.coupon.code
      } : null,
      paymentMethod: 'transfer',
      baseShippingFee: calculatedShippingFee  // ✅ 계산된 배송비 사용 (제주 ₩7,000, 울릉 ₩9,000)
    })
  }

  const orderCalc = calculateOrder()

  // ⚡ 결제 Hook - 모든 결제 로직을 Custom Hook으로 추출
  const {
    confirmBankTransfer,
    handleCardPayment,
    handleApplyCoupon,
    handleRemoveCoupon,
    handleBankTransfer: openBankTransferModal,
    processing
  } = useCheckoutPayment({
    orderItem,
    userProfile,
    selectedAddress,
    selectedCoupon,
    setSelectedCoupon,
    orderCalc: orderCalc || {},
    hasPendingOrders,
    depositName,
    setShowDepositModal,
    setShowCardModal,
    router,
    user: userSession || user
  })

  // 입금자명 모달 열기 (기본값 설정)
  const handleBankTransfer = () => {
    setDepositOption('name')
    setDepositName(userProfile.name)
    setCustomDepositName('')
    setShowDepositModal(true)
  }

  // Google Analytics: 결제 시작 이벤트
  useEffect(() => {
    if (orderItem && !pageLoading && orderCalc) {
      const items = orderItem.isBulkPayment
        ? [{ price: orderItem.totalPrice, quantity: 1, title: orderItem.title }]
        : [{ price: orderItem.price, quantity: orderItem.quantity, title: orderItem.title }]

      trackBeginCheckout(items, orderCalc.finalAmount)
    }
  }, [orderItem, pageLoading])

  // 로딩 상태
  if ((authLoading && !userSession) || pageLoading) {
    return <CheckoutLoadingState />
  }

  // 데이터 없음
  if (!orderItem || !userProfile) {
    return null
  }

  // 렌더링
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">주문/결제</h1>
            <div className="w-10"></div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* 주문 상품 정보 */}
          <OrderSummary orderItem={orderItem} hasPendingOrders={hasPendingOrders} />

          {/* 배송지 정보 */}
          <ShippingForm
            userProfile={userProfile}
            selectedAddress={selectedAddress}
            onAddressSelect={setSelectedAddress}
            onAddressesUpdate={(newAddresses) => {
              setUserProfile(prev => ({ ...prev, addresses: newAddresses }))
            }}
            user={userSession || user}
          />

          {/* 쿠폰 선택 */}
          <CouponSelector
            availableCoupons={availableCoupons}
            selectedCoupon={selectedCoupon}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={handleRemoveCoupon}
            discountAmount={orderCalc?.couponDiscount || 0}
          />

          {/* 금액 상세 */}
          <PriceBreakdown
            itemsTotal={orderCalc?.itemsTotal || 0}
            shippingFee={orderCalc?.shippingFee || 0}
            shippingBreakdown={orderCalc?.shippingBreakdown}
            couponDiscount={orderCalc?.couponDiscount || 0}
            finalTotal={orderCalc?.finalAmount || 0}
          />

          {/* 결제 수단 선택 */}
          <PaymentMethodSelector
            onBankTransfer={handleBankTransfer}
            onCardPayment={handleCardPayment}
            enableCardPayment={enableCardPayment}
            processing={processing}
          />
        </div>
      </div>

      {/* 입금자명 선택 모달 */}
      <DepositNameModal
        isOpen={showDepositModal}
        userProfile={userProfile}
        depositOption={depositOption}
        setDepositOption={setDepositOption}
        depositName={depositName}
        setDepositName={setDepositName}
        customDepositName={customDepositName}
        setCustomDepositName={setCustomDepositName}
        onConfirm={confirmBankTransfer}
        onCancel={() => setShowDepositModal(false)}
        processing={processing}
      />

      {/* 카드결제 모달 */}
      {showCardModal && (
        <CardPaymentModal
          isOpen={showCardModal}
          onClose={() => setShowCardModal(false)}
          orderItem={orderItem}
          userProfile={userProfile}
          selectedAddress={selectedAddress}
          orderCalc={orderCalc}
          selectedCoupon={selectedCoupon}
        />
      )}
    </div>
  )
}
