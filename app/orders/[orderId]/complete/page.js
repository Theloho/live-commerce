'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  CheckCircleIcon,
  ClipboardDocumentIcon,
  HomeIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export default function OrderCompletePage() {
  const router = useRouter()
  const params = useParams()
  const { isAuthenticated } = useAuth()
  const [orderData, setOrderData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다')
      router.push('/login')
      return
    }

    // 세션에서 최근 주문 정보 가져오기
    const recentOrder = sessionStorage.getItem('recentOrder')
    if (recentOrder) {
      const orderInfo = JSON.parse(recentOrder)
      if (orderInfo.id === params.orderId) {
        setOrderData(orderInfo)
        // 한 번 확인 후 세션에서 제거
        sessionStorage.removeItem('recentOrder')
      }
    }

    // 세션에 없다면 localStorage에서 주문 찾기
    if (!recentOrder) {
      const orders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
      const order = orders.find(o => o.id === params.orderId)
      if (order) {
        setOrderData(order)
      } else {
        toast.error('주문 정보를 찾을 수 없습니다')
        router.push('/')
        return
      }
    }

    setLoading(false)
  }, [isAuthenticated, params.orderId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!orderData) {
    return null
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('복사되었습니다')
    }).catch(() => {
      toast.error('복사에 실패했습니다')
    })
  }

  const orderItem = orderData.items[0]
  const bankInfo = {
    bank: '신한은행',
    account: '110-000-000000',
    holder: 'allok'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Success Animation */}
        <div className="text-center py-12 px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6"
          >
            <CheckCircleIcon className="w-12 h-12 text-green-500" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-2">주문이 완료되었습니다!</h1>
            <p className="text-gray-600">입금 확인 후 배송을 시작합니다</p>
          </motion.div>
        </div>

        <div className="px-4 space-y-4">
          {/* 주문 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">주문 정보</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">주문번호</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-900">{orderData.id}</span>
                  <button
                    onClick={() => copyToClipboard(orderData.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">주문일시</span>
                <span className="text-gray-900">
                  {new Date(orderData.created_at).toLocaleString('ko-KR')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">결제상태</span>
                <span className="text-yellow-600 font-medium">입금대기</span>
              </div>
            </div>
          </motion.div>

          {/* 주문 상품 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">주문 상품</h2>
            <div className="flex gap-3">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={orderItem.thumbnail_url || '/placeholder.png'}
                  alt={orderItem.title}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 text-sm">
                  {orderItem.title}
                </h3>
                <p className="text-xs text-gray-500 mb-1">
                  수량: {orderItem.quantity}개
                </p>
                <p className="font-semibold text-gray-900 text-sm">
                  ₩{orderItem.totalPrice.toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>

          {/* 입금 안내 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold text-yellow-800 mb-3">입금 안내</h2>

                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 mb-1">은행</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{bankInfo.bank}</p>
                          <button
                            onClick={() => copyToClipboard(bankInfo.bank)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <ClipboardDocumentIcon className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">계좌번호</p>
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-medium text-gray-900">{bankInfo.account}</p>
                          <button
                            onClick={() => copyToClipboard(bankInfo.account)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <ClipboardDocumentIcon className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">예금주</p>
                        <p className="font-medium text-gray-900">{bankInfo.holder}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-lg font-bold text-red-700 text-center">
                      입금금액: ₩{orderData.payment.amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-yellow-700">
                  <p>• 입금자명은 주문자명과 동일하게 입력해주세요</p>
                  <p>• 주문 후 24시간 이내 입금해주세요</p>
                  <p>• 입금 확인 후 2-3일 내 배송됩니다</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 배송지 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">배송지 정보</h2>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{orderData.shipping.name}</p>
              <p className="text-gray-600">{orderData.shipping.phone}</p>
              <p className="text-gray-600">
                {orderData.shipping.address}
                {orderData.shipping.detail_address && ` ${orderData.shipping.detail_address}`}
              </p>
            </div>
          </motion.div>
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 mt-8">
          <div className="space-y-3">
            <button
              onClick={() => router.push('/orders')}
              className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              주문 내역 보기
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-red-500 text-white font-medium py-3 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              <HomeIcon className="w-5 h-5" />
              쇼핑 계속하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}