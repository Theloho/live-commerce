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
import { motion } from 'framer-motion'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import useAuth from '@/hooks/useAuth'
import { useCheckoutInit } from '@/app/hooks/useCheckoutInit'
import { useCheckoutPayment } from '@/app/hooks/useCheckoutPayment'
import OrderSummary from '@/app/components/checkout/OrderSummary'
import ShippingForm from '@/app/components/checkout/ShippingForm'
import CouponSelector from '@/app/components/checkout/CouponSelector'
import PaymentMethodSelector from '@/app/components/checkout/PaymentMethodSelector'
import PriceBreakdown from '@/app/components/checkout/PriceBreakdown'
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
    const baseShippingFee = hasPendingOrders ? 0 : 4000
    const orderItems = orderItem.isBulkPayment
      ? [{ price: orderItem.totalPrice, quantity: 1, title: orderItem.title }]
      : [{ price: orderItem.price, quantity: orderItem.quantity, title: orderItem.title }]

    return OrderCalculations.calculateFinalOrderAmount(orderItems, {
      region: postalCode || 'normal',
      coupon: selectedCoupon ? {
        type: selectedCoupon.coupon.discount_type,
        value: selectedCoupon.coupon.discount_value,
        maxDiscount: selectedCoupon.coupon.max_discount_amount,
        code: selectedCoupon.coupon.code
      } : null,
      paymentMethod: 'transfer',
      baseShippingFee: baseShippingFee
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-800 font-medium text-lg mb-2">결제 준비 중</p>
          <p className="text-gray-500 text-sm">잠시만 기다려주세요...</p>

          {/* 진행 단계 표시 */}
          <div className="mt-6 max-w-xs mx-auto">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>인증확인</span>
              <span>주문정보</span>
              <span>사용자정보</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
          </div>
        </div>
      </div>
    )
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
            couponDiscount={orderCalc?.couponDiscount || 0}
            finalTotal={orderCalc?.finalAmount || 0}
          />

          {/* 결제 수단 선택 */}
          <PaymentMethodSelector
            itemsTotal={orderCalc?.itemsTotal || 0}
            shippingFee={orderCalc?.shippingFee || 0}
            couponDiscount={orderCalc?.couponDiscount || 0}
            finalTotal={orderCalc?.finalAmount || 0}
            onBankTransfer={handleBankTransfer}
            onCardPayment={handleCardPayment}
            enableCardPayment={enableCardPayment}
            processing={processing}
          />
        </div>
      </div>

      {/* 입금자명 선택 모달 */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg max-w-md w-full p-6"
          >
            <h2 className="text-lg font-semibold mb-4">입금자명 선택</h2>

            <div className="space-y-3 mb-6">
              {/* 고객 이름으로 입금 (기본값) */}
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: depositOption === 'name' ? '#ef4444' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="depositOption"
                  value="name"
                  checked={depositOption === 'name'}
                  onChange={() => {
                    setDepositOption('name')
                    setDepositName(userProfile.name)
                  }}
                  className="w-4 h-4 text-red-500 mr-3"
                />
                <div>
                  <p className="font-medium text-gray-900">{userProfile.name}</p>
                  <p className="text-sm text-gray-500">고객 이름으로 입금</p>
                </div>
              </label>

              {/* 직접 입력 */}
              <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: depositOption === 'custom' ? '#ef4444' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="depositOption"
                  value="custom"
                  checked={depositOption === 'custom'}
                  onChange={() => {
                    setDepositOption('custom')
                    setDepositName('')
                  }}
                  className="w-4 h-4 text-red-500 mr-3 mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-2">직접 입력</p>
                  {depositOption === 'custom' && (
                    <input
                      type="text"
                      value={customDepositName}
                      onChange={(e) => {
                        setCustomDepositName(e.target.value)
                        setDepositName(e.target.value)
                      }}
                      placeholder="입금자명 입력"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      autoFocus
                    />
                  )}
                </div>
              </label>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmBankTransfer}
                disabled={!depositName || processing}
                className="flex-1 px-4 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? '처리 중...' : '확인'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
