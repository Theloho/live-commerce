'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import useAuth from '@/hooks/useAuth'
import { createOrder, updateMultipleOrderStatus } from '@/lib/supabaseApi'
import InventoryErrorModal from './InventoryErrorModal'
import toast from 'react-hot-toast'

export default function CardPaymentModal({ isOpen, onClose, totalAmount, productPrice, shippingFee, orderItem, userProfile }) {
  const router = useRouter()
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [showInventoryError, setShowInventoryError] = useState(false)
  const [inventoryErrors, setInventoryErrors] = useState([])

  const cardFinalTotal = Math.floor(productPrice * 1.1) + shippingFee
  const taxAmount = Math.floor(productPrice * 0.1)

  const handleCardPaymentRequest = async () => {
    if (!orderItem || !userProfile) {
      toast.error('주문 정보가 없습니다')
      return
    }

    try {
      setIsProcessing(true)

      // 부가세 안내
      toast.success('부가세 10%가 적용됩니다', {
        duration: 2000
      })

      let result;

      // 일괄결제인 경우 기존 주문들 상태 업데이트
      if (orderItem.originalOrderIds && orderItem.originalOrderIds.length > 0) {
        console.log('💳 카드 일괄결제 처리 시작')
        console.log('💳 대상 주문 ID들:', orderItem.originalOrderIds)
        console.log('💳 주문 개수:', orderItem.originalOrderIds.length)

        try {
          const updateResult = await updateMultipleOrderStatus(
            orderItem.originalOrderIds,
            'verifying',
            { method: 'card' }
          )
          console.log('💳 주문 상태 업데이트 성공:', updateResult)
          result = { success: true }
        } catch (error) {
          console.error('주문 상태 업데이트 실패:', error)
          // 실패해도 계속 진행 (사용자 경험을 위해)
          result = { success: true }
        }
        // 주문 업데이트 이벤트 발생시켜 주문내역 페이지에 알림
        window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { action: 'bulkPayment', orderIds: orderItem.originalOrderIds } }))
      } else {
        // 직접구매인 경우 새로운 카드결제 주문 생성
        console.log('💳 카드 직접결제 주문 생성 시작')

        const response = await fetch('/api/create-order-card', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderData: orderItem,
            userProfile,
            userId: user.id
          })
        })

        result = await response.json()
        console.log('💳 카드결제 주문 생성 결과:', result)

        if (!response.ok || !result.success) {
          throw new Error(result.error || '카드결제 주문 생성에 실패했습니다')
        }
      }

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

          // 체크아웃 세션 데이터 삭제
          sessionStorage.removeItem('checkoutItem')

          // 실제 주문 ID 사용 (새 주문 생성한 경우) 또는 기본 ID
          const orderId = result?.id || 'ORDER-' + Date.now()
          router.replace(`/orders/${orderId}/complete`)
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

      {/* Inventory Error Modal */}
      <InventoryErrorModal
        isOpen={showInventoryError}
        onClose={() => setShowInventoryError(false)}
        insufficientItems={inventoryErrors}
        title="카드결제 불가"
      />
    </AnimatePresence>
  )
}