/**
 * PaymentMethodSelector - 결제 수단 선택 컴포넌트
 * @author Claude
 * @since 2025-10-21
 */

'use client'

import { motion } from 'framer-motion'
import { CreditCardIcon, TruckIcon, InformationCircleIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

/**
 * PaymentMethodSelector 컴포넌트
 * @param {Object} props
 * @param {Function} props.onBankTransfer - 계좌이체 콜백
 * @param {Function} props.onCardPayment - 카드결제 콜백
 * @param {boolean} props.enableCardPayment - 카드결제 활성화 여부
 * @param {boolean} props.processing - 처리 중 여부
 * @returns {JSX.Element}
 */
export default function PaymentMethodSelector({
  onBankTransfer,
  onCardPayment,
  enableCardPayment,
  processing
}) {
  const handleCopyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText('79421940478')
      toast.success('계좌번호가 복사되었습니다')
    } catch (error) {
      toast.error('계좌번호: 79421940478')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-lg border border-gray-200 p-4"
    >
      <h2 className="font-semibold text-gray-900 mb-4">결제 수단</h2>

      {/* 계좌번호 안내 카드 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-2">
          <InformationCircleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-yellow-800">계좌이체</p>
            <div className="flex items-center justify-between">
              <p className="text-sm text-yellow-700">카카오뱅크 79421940478</p>
              <button
                onClick={handleCopyAccountNumber}
                className="ml-2 flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded hover:bg-yellow-200 transition-colors"
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
                복사
              </button>
            </div>
            <p className="text-sm text-yellow-700">예금주: 하상윤</p>
            <p className="text-xs text-yellow-600 mt-2">
              주문 후 24시간 이내 입금해주세요
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={onBankTransfer}
          disabled={processing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <TruckIcon className="h-5 w-5" />
          계좌이체
        </button>

        {enableCardPayment && (
          <button
            onClick={onCardPayment}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CreditCardIcon className="h-5 w-5" />
            카드결제
          </button>
        )}
      </div>
    </motion.div>
  )
}
