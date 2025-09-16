'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import { createMockOrder } from '@/lib/mockAuth'
import toast from 'react-hot-toast'

export default function CardPaymentModal({ isOpen, onClose, totalAmount, productPrice, shippingFee, orderItem, userProfile }) {
  const router = useRouter()
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)

  const cardFinalTotal = Math.floor(productPrice * 1.1) + shippingFee
  const taxAmount = Math.floor(productPrice * 0.1)

  const handleCardPaymentRequest = async () => {
    console.log('카드결제신청 버튼 클릭됨')
    console.log('orderItem:', orderItem)
    console.log('userProfile:', userProfile)

    if (!orderItem || !userProfile) {
      console.error('주문 정보 또는 사용자 정보가 없습니다')
      toast.error('주문 정보가 없습니다')
      return
    }

    try {
      setIsProcessing(true)

      // 주문 생성 (결제 확인중 상태로)
      const order = createMockOrder(orderItem, userProfile, 'card')

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
        console.log('카드결제 일괄결제 완료, 원본 주문들 삭제됨:', orderItem.originalOrderIds)

        // 주문 업데이트 이벤트 발생시켜 주문내역 페이지에 알림
        window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { action: 'bulkPayment', orderIds: orderItem.originalOrderIds } }))
      }

      // 첫 번째 안내 메시지
      toast.success('부가세 10%가 적용됩니다', {
        duration: 2000
      })

      // 2.5초 후 완료 메시지
      setTimeout(() => {
        toast.success('카드결제 링크를 빠른시간내에 카카오 채널로 드리겠습니다. 신청완료 되었습니다. 감사합니다.', {
          duration: 5000
        })

        // 완료 후 모달 닫기 및 주문 완료 페이지로 이동
        setTimeout(() => {
          toast.success('주문이 완료되었습니다.', {
            duration: 3000
          })
          setIsProcessing(false)
          onClose()
          router.push(`/orders/${order.id}/complete`)
        }, 1000)
      }, 2500)
    } catch (error) {
      console.error('카드결제 처리 중 오류:', error)
      toast.error('결제 처리 중 오류가 발생했습니다')
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    setIsProcessing(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md relative"
            >
              {/* Close Button */}
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCardIcon className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">카드결제 신청</h2>
                <p className="text-gray-600 text-sm">
                  카드결제를 신청하시겠습니까?
                </p>
              </div>

              {/* Payment Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">상품금액</span>
                    <span className="text-gray-900">₩{productPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">부가세 (10%)</span>
                    <span className="text-red-500">+₩{taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">배송비</span>
                    <span className="text-gray-900">₩{shippingFee.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-900">총 결제금액</span>
                      <span className="text-green-600 text-lg">₩{cardFinalTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-yellow-800 text-sm">
                  ⚠️ 카드결제는 상품금액에 부가세 10%가 추가됩니다.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
                <button
                  onClick={handleCardPaymentRequest}
                  disabled={isProcessing}
                  className="px-4 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      처리중...
                    </>
                  ) : (
                    '신청하기'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}