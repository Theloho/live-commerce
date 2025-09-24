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
import useAuth from '@/hooks/useAuth'
import CardPaymentModal from '@/app/components/common/CardPaymentModal'
import { createOrder, updateMultipleOrderStatus } from '@/lib/supabaseApi'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [orderItem, setOrderItem] = useState(null)
  const [userProfile, setUserProfile] = useState({
    name: '로딩 중...',
    phone: '로딩 중...',
    address: '로딩 중...',
    detail_address: ''
  })
  const [pageLoading, setPageLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositName, setDepositName] = useState('')
  const [depositOption, setDepositOption] = useState('name')
  const [customDepositName, setCustomDepositName] = useState('')
  const [userSession, setUserSession] = useState(null)

  // 카카오 세션 확인
  useEffect(() => {
    const checkKakaoSession = () => {
      try {
        const storedUser = sessionStorage.getItem('user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          setUserSession(userData)
          console.log('Checkout - 카카오 세션 복원:', userData)
        } else {
          setUserSession(null)
        }
      } catch (error) {
        console.error('Checkout - 세션 확인 오류:', error)
        setUserSession(null)
      }
    }

    checkKakaoSession()
  }, [])

  useEffect(() => {
    const initCheckout = async () => {
      const currentUser = userSession || user
      const isUserLoggedIn = userSession || isAuthenticated

      console.log('Checkout page - isAuthenticated:', isAuthenticated)
      console.log('Checkout page - authLoading:', authLoading)
      console.log('Checkout page - user:', user)
      console.log('Checkout page - userSession:', userSession)
      console.log('Checkout page - isUserLoggedIn:', isUserLoggedIn)

      // 인증 로딩 중이면 대기
      if (authLoading && !userSession) {
        console.log('Still loading auth state, waiting...')
        return
      }

      if (!isUserLoggedIn) {
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

      try {
        const parsedOrderItem = JSON.parse(checkoutData)
        console.log('파싱된 주문 아이템:', parsedOrderItem)

        // 필수 필드 검증 (일괄결제의 경우 totalPrice만 있을 수 있음)
        if (!parsedOrderItem.title || (!parsedOrderItem.price && !parsedOrderItem.totalPrice)) {
          console.error('주문 아이템에 필수 필드가 없습니다:', parsedOrderItem)
          toast.error('주문 정보가 올바르지 않습니다')
          router.push('/')
          return
        }

        // price가 없으면 totalPrice를 사용
        if (!parsedOrderItem.price && parsedOrderItem.totalPrice) {
          parsedOrderItem.price = parsedOrderItem.totalPrice
        }

        setOrderItem(parsedOrderItem)
      } catch (error) {
        console.error('주문 데이터 파싱 오류:', error)
        toast.error('주문 정보를 읽을 수 없습니다')
        router.push('/')
        return
      }

      // 사용자 정보 가져오기
      if (currentUser) {
        // 카카오 사용자인 경우 프로필 정보가 직접 저장되어 있음
        const profile = {
          name: currentUser.name || currentUser.user_metadata?.name || '사용자',
          phone: currentUser.phone || currentUser.user_metadata?.phone || '010-0000-0000',
          address: currentUser.address || currentUser.user_metadata?.address || '기본주소',
          detail_address: currentUser.detail_address || currentUser.user_metadata?.detail_address || ''
        }
        console.log('User profile (카카오/일반 통합):', profile)
        console.log('Current user data:', currentUser)
        setUserProfile(profile)
        // 기본 입금자명을 사용자 이름으로 설정
        setDepositName(profile.name)
      } else {
        console.log('currentUser가 없음')
        // 기본값 설정
        setUserProfile({
          name: '사용자 정보 없음',
          phone: '전화번호를 입력해주세요',
          address: '주소를 입력해주세요',
          detail_address: ''
        })
      }

      setPageLoading(false)
    }

    initCheckout()
  }, [isAuthenticated, user, authLoading, userSession, router])

  if ((authLoading && !userSession) || pageLoading) {
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

  const confirmBankTransfer = async () => {
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

    try {
      const bankInfo = '카카오뱅크 79421940478 하상윤'
      let orderId

      // 일괄결제인 경우
      if (orderItem.isBulkPayment && orderItem.originalOrderIds && orderItem.originalOrderIds.length > 0) {
        console.log('💳 일괄결제 처리 시작')
        console.log('💳 대상 주문 ID들:', orderItem.originalOrderIds)
        console.log('💳 주문 개수:', orderItem.originalOrderIds.length)

        // 원본 주문들을 'verifying' 상태로 업데이트 (계좌이체)
        console.log('🔍 체크아웃에서 updateMultipleOrderStatus 호출:', {
          orderIds: orderItem.originalOrderIds,
          status: 'verifying',
          paymentData: { method: 'bank_transfer', depositorName: depositName }
        })
        const updateResult = await updateMultipleOrderStatus(
          orderItem.originalOrderIds,
          'verifying',
          { method: 'bank_transfer', depositorName: depositName }
        )
        console.log('💳 업데이트 결과:', updateResult)

        // 첫 번째 주문 ID를 사용 (일괄결제의 대표 ID)
        orderId = orderItem.originalOrderIds[0]

        // 주문 업데이트 이벤트 발생
        window.dispatchEvent(new CustomEvent('orderUpdated', {
          detail: { action: 'bulkPayment', orderIds: orderItem.originalOrderIds }
        }))
      } else {
        // 단일 주문 생성
        console.log('새 주문 생성 중...')
        const newOrder = await createOrder(orderItem, userProfile)
        orderId = newOrder.id
      }

      // 계좌번호 복사 시도
      try {
        await navigator.clipboard.writeText('79421940478')
        toast.success('계좌번호가 복사되었습니다')
      } catch (error) {
        console.log('클립보드 복사 실패, 대체 방법 사용')
        toast.success('계좌번호: 79421940478')
      }

      setShowDepositModal(false)

      // 체크아웃 세션 데이터 삭제
      sessionStorage.removeItem('checkoutItem')

      toast.success('주문이 접수되었습니다')

      // 주문 완료 페이지로 이동
      setTimeout(() => {
        router.replace(`/orders/${orderId}/complete`)
      }, 1500)
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
              {orderItem.isBulkPayment ? `주문 상품 (${orderItem.itemCount || 1}개)` : '주문 상품'}
            </h2>

            {orderItem.isBulkPayment ? (
              // 일괄결제 시 간단한 정보만 표시
              <div className="space-y-3">
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
                    <h3 className="font-medium text-gray-900 mb-1">
                      {orderItem.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-1">
                      총 {orderItem.quantity}개 상품
                    </p>
                    <p className="font-semibold text-gray-900">
                      ₩{orderItem.totalPrice.toLocaleString()}
                    </p>
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

                  {/* 선택된 옵션 표시 */}
                  {orderItem.selectedOptions && Object.keys(orderItem.selectedOptions).length > 0 && (
                    <div className="mb-1">
                      {Object.entries(orderItem.selectedOptions).map(([optionId, value]) => (
                        <span
                          key={optionId}
                          className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mr-1 mb-1"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  )}

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
              <p className="font-medium text-gray-900">{userProfile?.name || '이름 없음'}</p>
              <p className="text-gray-600">{userProfile?.phone || '전화번호 없음'}</p>
              <p className="text-gray-600">
                {userProfile?.address || '주소를 입력해주세요'}
                {userProfile?.detail_address && ` ${userProfile.detail_address}`}
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
                    const currentUser = userSession || user
                    setDepositName(currentUser?.nickname || currentUser?.user_metadata?.nickname || userProfile.name)
                  }}
                  className="mr-3"
                />
                <div>
                  <p className="font-medium text-gray-900">닉네임</p>
                  <p className="text-sm text-gray-500">{(userSession || user)?.nickname || (userSession || user)?.user_metadata?.nickname || userProfile.name}</p>
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