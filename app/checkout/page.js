'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  MapPinIcon,
  TruckIcon,
  CreditCardIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import CardPaymentModal from '@/app/components/common/CardPaymentModal'
import { createMockOrder } from '@/lib/mockAuth'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [orderItem, setOrderItem] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)

  useEffect(() => {
    const initCheckout = async () => {
      console.log('Checkout page - isAuthenticated:', isAuthenticated)
      console.log('Checkout page - authLoading:', authLoading)
      console.log('Checkout page - user:', user)

      // 인증 로딩 중이면 대기
      if (authLoading) {
        console.log('Still loading auth state, waiting...')
        return
      }

      if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to login')
        toast.error('로그인이 필요합니다')
        router.push('/login')
        return
      }

      // 세션에서 구매 정보 가져오기
      const checkoutData = sessionStorage.getItem('checkoutItem')
      if (!checkoutData) {
        console.log('No checkout data found')
        toast.error('구매 정보가 없습니다')
        router.push('/')
        return
      }

      console.log('Checkout data found:', checkoutData)
      setOrderItem(JSON.parse(checkoutData))

      // 사용자 정보 가져오기
      if (user) {
        const profile = {
          name: user.user_metadata?.name || '',
          phone: user.user_metadata?.phone || '',
          address: user.user_metadata?.address || '',
          detail_address: user.user_metadata?.detail_address || ''
        }
        console.log('User profile:', profile)
        setUserProfile(profile)
      }

      setPageLoading(false)
    }

    initCheckout()
  }, [isAuthenticated, user, authLoading, router])

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!orderItem || !userProfile) {
    return null
  }

  // 배송비 계산 (기본 4000원)
  const shippingFee = 4000
  const finalTotal = orderItem.totalPrice + shippingFee

  const handleBankTransfer = () => {
    console.log('계좌이체 버튼 클릭됨')
    console.log('orderItem:', orderItem)
    console.log('userProfile:', userProfile)

    if (!orderItem || !userProfile) {
      console.error('주문 정보 또는 사용자 정보가 없습니다')
      toast.error('주문 정보가 없습니다')
      return
    }

    try {
      const bankInfo = '신한은행 110-000-000000 allok'

      // 주문 생성 (결제 확인중 상태로)
      const order = createMockOrder(orderItem, userProfile, 'bank_transfer')

      // 생성된 주문을 결제 확인중 상태로 변경
      if (typeof window !== 'undefined') {
        const existingOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
        const updatedOrders = existingOrders.map(existingOrder =>
          existingOrder.id === order.id
            ? { ...existingOrder, status: 'verifying', payment: { ...existingOrder.payment, status: 'verifying' } }
            : existingOrder
        )
        localStorage.setItem('mock_orders', JSON.stringify(updatedOrders))
      }
      console.log('생성된 주문:', order)

      // 일괄결제인 경우 원본 주문들 삭제
      if (orderItem.originalOrderIds && orderItem.originalOrderIds.length > 0) {
        const existingOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
        const updatedOrders = existingOrders.filter(existingOrder =>
          !orderItem.originalOrderIds.includes(existingOrder.id)
        )
        localStorage.setItem('mock_orders', JSON.stringify(updatedOrders))
        console.log('일괄결제 완료, 원본 주문들 삭제됨:', orderItem.originalOrderIds)

        // 주문 업데이트 이벤트 발생시켜 주문내역 페이지에 알림
        window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { action: 'bulkPayment', orderIds: orderItem.originalOrderIds } }))
      }

      navigator.clipboard.writeText(bankInfo).then(() => {
        toast.success('계좌정보가 복사되었습니다')
        // 주문 완료 페이지로 이동
        setTimeout(() => {
          router.push(`/orders/${order.id}/complete`)
        }, 1500)
      }).catch(() => {
        toast.error('복사에 실패했습니다')
      })
    } catch (error) {
      console.error('계좌이체 처리 중 오류:', error)
      toast.error('주문 처리 중 오류가 발생했습니다')
    }
  }

  const handleCardPayment = () => {
    setShowCardModal(true)
  }

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
          {/* 상품 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">
              {orderItem.isBulkPayment ? `주문 상품 (${orderItem.allItems?.length || 1}개)` : '주문 상품'}
            </h2>

            {orderItem.isBulkPayment && orderItem.allItems ? (
              // 일괄결제 시 모든 상품 리스트 표시
              <div className="space-y-3">
                {orderItem.allItems.map((item, index) => (
                  <div key={`${item.orderId}-${index}`} className="flex gap-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.thumbnail_url || '/placeholder.png'}
                        alt={item.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 text-sm">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-500 mb-1">
                        수량: {item.quantity}개
                      </p>
                      <p className="font-semibold text-gray-900 text-sm">
                        ₩{item.totalPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">총 상품금액</span>
                    <span className="font-bold text-red-500 text-lg">
                      ₩{orderItem.totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // 단일 상품 표시
              <div className="flex gap-3">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={orderItem.thumbnail_url || '/placeholder.png'}
                    alt={orderItem.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                    {orderItem.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-1">
                    수량: {orderItem.quantity}개
                  </p>
                  <p className="font-semibold text-gray-900">
                    ₩{orderItem.totalPrice.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* 배송지 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-gray-600" />
                <h2 className="font-semibold text-gray-900">배송지</h2>
              </div>
              <button
                onClick={() => router.push('/mypage')}
                className="text-sm text-red-500 hover:text-red-600"
              >
                변경
              </button>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{userProfile.name}</p>
              <p className="text-gray-600">{userProfile.phone}</p>
              <p className="text-gray-600">
                {userProfile.address}
                {userProfile.detail_address && ` ${userProfile.detail_address}`}
              </p>
            </div>
          </motion.div>

          {/* 배송 옵션 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <TruckIcon className="h-5 w-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">배송 방법</h2>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">일반 택배</p>
                  <p className="text-sm text-gray-500">2-3일 소요</p>
                </div>
                <p className="font-medium text-gray-900">
                  ₩{shippingFee.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-2 p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 배송비 4,000원이 추가됩니다
              </p>
            </div>
          </motion.div>

          {/* 결제 방법 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <CreditCardIcon className="h-5 w-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">결제 방법</h2>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <InformationCircleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-yellow-800">무통장입금</p>
                  <p className="text-sm text-yellow-700">신한은행 110-000-000000</p>
                  <p className="text-sm text-yellow-700">예금주: allok</p>
                  <p className="text-xs text-yellow-600 mt-2">
                    주문 후 24시간 이내 입금해주세요
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 결제 금액 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">결제 금액</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">상품 금액</span>
                <span className="text-gray-900">₩{orderItem.totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">배송비</span>
                <span className="text-gray-900">₩{shippingFee.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">총 결제금액</span>
                  <span className="text-xl font-bold text-red-500">
                    ₩{finalTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 주의사항 */}
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 space-y-1">
            <p>• 입금자명은 주문자명과 동일하게 입력해주세요</p>
            <p>• 주문 후 24시간 이내 미입금 시 자동 취소됩니다</p>
            <p>• 입금 확인 후 배송이 시작됩니다</p>
          </div>
        </div>

        {/* 하단 결제 버튼들 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <div className="space-y-3">
            {/* 계좌이체 버튼 */}
            <button
              onClick={handleBankTransfer}
              disabled={!userProfile.address}
              className="w-full bg-blue-500 text-white font-semibold py-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              💳 계좌이체 (₩{finalTotal.toLocaleString()})
            </button>

            {/* 카드결제 버튼 */}
            <button
              onClick={handleCardPayment}
              disabled={!userProfile.address}
              className="w-full bg-green-500 text-white font-semibold py-4 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              💳 카드결제신청 (₩{(Math.floor(orderItem.totalPrice * 1.1) + shippingFee).toLocaleString()})
            </button>

            <p className="text-xs text-gray-500 text-center">
              카드결제는 부가세 10%가 추가됩니다
            </p>
          </div>
        </div>
      </div>

      {/* Card Payment Modal */}
      <CardPaymentModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        totalAmount={finalTotal}
        productPrice={orderItem.totalPrice}
        shippingFee={shippingFee}
        orderItem={orderItem}
        userProfile={userProfile}
      />
    </div>
  )
}