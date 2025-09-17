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
import { createMockOrder, updateOrderStatus, validateInventoryBeforePayment } from '@/lib/mockAuth'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [orderItem, setOrderItem] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositName, setDepositName] = useState('')
  const [depositOption, setDepositOption] = useState('name')
  const [customDepositName, setCustomDepositName] = useState('')

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
          name: user.name || user.user_metadata?.name || '',
          phone: user.phone || user.user_metadata?.phone || '',
          address: user.address || user.user_metadata?.address || '',
          detail_address: user.detailAddress || user.user_metadata?.detail_address || ''
        }
        console.log('User profile:', profile)
        setUserProfile(profile)
        // 기본 입금자명을 사용자 이름으로 설정
        setDepositName(profile.name)
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
    setShowDepositModal(true)
  }

  const confirmBankTransfer = () => {
    console.log('계좌이체 처리 시작')
    console.log('orderItem:', orderItem)
    console.log('userProfile:', userProfile)
    console.log('입금자명:', depositName)

    if (!orderItem || !userProfile) {
      console.error('주문 정보 또는 사용자 정보가 없습니다')
      toast.error('주문 정보가 없습니다')
      return
    }

    if (!depositName) {
      toast.error('입금자명을 선택해주세요')
      return
    }

    // 결제 전 재고 검증
    // 일괄결제(결제대기 주문들)인지 확인
    const isFromPendingOrder = orderItem.originalOrderIds && orderItem.originalOrderIds.length > 0
    const validation = validateInventoryBeforePayment(orderItem, isFromPendingOrder)
    if (!validation.success) {
      if (validation.insufficientItems) {
        const itemList = validation.insufficientItems.map(item =>
          `${item.title} (현재: ${item.current}개, 필요: ${item.required}개)`
        ).join('\n')

        toast.error(`재고가 부족한 상품이 있습니다:\n${itemList}`, {
          duration: 5000
        })
      } else {
        toast.error(validation.error || '재고 확인 중 오류가 발생했습니다')
      }
      return
    }

    try {
      const bankInfo = '카카오뱅크 79421940478 하상윤'

      // 주문 생성 (결제 확인중 상태로, 입금자명 포함)
      // 일괄결제인 경우 재고 차감 건너뛰기 (이미 개별 주문에서 차감됨)
      const order = createMockOrder(orderItem, userProfile, 'bank_transfer', isFromPendingOrder)
      order.depositName = depositName

      // 생성된 주문을 결제 확인중 상태로 변경 (입금자명 포함)
      if (typeof window !== 'undefined') {
        // 주문 상태를 verifying으로 변경 (재고 차감 포함)
        const success = updateOrderStatus(order.id, 'verifying')
        if (!success) {
          console.error('주문 상태 업데이트 실패')
          toast.error('주문 처리 중 오류가 발생했습니다')
          return
        }

        // 입금자명 추가 저장
        const existingOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
        const updatedOrders = existingOrders.map(existingOrder =>
          existingOrder.id === order.id
            ? { ...existingOrder, payment: { ...existingOrder.payment, status: 'verifying' }, depositName: depositName }
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

      navigator.clipboard.writeText('79421940478').then(() => {
        toast.success('계좌번호가 복사되었습니다')
        setShowDepositModal(false)

        // 체크아웃 세션 데이터 삭제
        sessionStorage.removeItem('checkoutItem')

        // 주문 완료 페이지로 이동
        setTimeout(() => {
          router.replace(`/orders/${order.id}/complete`)
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
                  <p className="text-sm text-yellow-700">카카오뱅크 79421940478</p>
                  <p className="text-sm text-yellow-700">예금주: 하상윤</p>
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
              disabled={!userProfile.name}
              className="w-full bg-blue-500 text-white font-semibold py-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              💳 계좌이체 (₩{finalTotal.toLocaleString()})
            </button>

            {/* 카드결제 버튼 */}
            <button
              onClick={handleCardPayment}
              disabled={!userProfile.name}
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

      {/* 입금자명 선택 모달 */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg max-w-sm w-full mx-4 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">입금자명을 선택하세요</h3>

            <div className="space-y-3">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deposit"
                  value="name"
                  checked={depositOption === 'name'}
                  onChange={(e) => {
                    setDepositOption(e.target.value)
                    setDepositName(userProfile.name)
                  }}
                  className="mr-3"
                />
                <div>
                  <p className="font-medium text-gray-900">고객 이름</p>
                  <p className="text-sm text-gray-500">{userProfile.name}</p>
                </div>
              </label>

              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deposit"
                  value="nickname"
                  checked={depositOption === 'nickname'}
                  onChange={(e) => {
                    setDepositOption(e.target.value)
                    setDepositName(user?.nickname || user?.user_metadata?.nickname || userProfile.name)
                  }}
                  className="mr-3"
                />
                <div>
                  <p className="font-medium text-gray-900">닉네임</p>
                  <p className="text-sm text-gray-500">{user?.nickname || user?.user_metadata?.nickname || userProfile.name}</p>
                </div>
              </label>

              <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deposit"
                  value="custom"
                  checked={depositOption === 'custom'}
                  onChange={(e) => {
                    setDepositOption(e.target.value)
                    setDepositName(customDepositName)
                  }}
                  className="mr-3 mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-2">다른 이름으로 입금</p>
                  <input
                    type="text"
                    placeholder="입금자명 입력"
                    value={customDepositName}
                    onChange={(e) => {
                      setCustomDepositName(e.target.value)
                      if (depositOption === 'custom') {
                        setDepositName(e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </label>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium">
                💡 입금자명과 금액이 정확해야 입금확인과 배송이 빨라집니다
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDepositModal(false)
                  setDepositOption('name')
                  setDepositName('')
                  setCustomDepositName('')
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmBankTransfer}
                disabled={!depositName}
                className="flex-1 px-4 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                확인
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}