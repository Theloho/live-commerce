/**
 * PaymentMethodSelector - 결제 수단 선택 컴포넌트
 * @author Claude
 * @since 2025-10-21
 */

'use client'

import { motion } from 'framer-motion'
import { CreditCardIcon, TruckIcon } from '@heroicons/react/24/outline'

/**
 * PaymentMethodSelector 컴포넌트
 * @param {Object} props
 * @param {number} props.itemsTotal - 상품 금액
 * @param {number} props.shippingFee - 배송비
 * @param {number} props.couponDiscount - 쿠폰 할인
 * @param {number} props.finalTotal - 최종 결제 금액
 * @param {Function} props.onBankTransfer - 무통장입금 콜백
 * @param {Function} props.onCardPayment - 카드결제 콜백
 * @param {boolean} props.enableCardPayment - 카드결제 활성화 여부
 * @param {boolean} props.processing - 처리 중 여부
 * @returns {JSX.Element}
 */
export default function PaymentMethodSelector({
  itemsTotal,
  shippingFee,
  couponDiscount,
  finalTotal,
  onBankTransfer,
  onCardPayment,
  enableCardPayment,
  processing
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-lg border border-gray-200 p-4"
    >
      <h2 className="font-semibold text-gray-900 mb-4">결제 금액</h2>

      <div className="space-y-2 text-sm mb-4 pb-4 border-b border-gray-200">
        <div className="flex justify-between text-gray-600">
          <span>상품 금액</span>
          <span>₩{itemsTotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>배송비</span>
          <span>₩{shippingFee.toLocaleString()}</span>
        </div>
        {couponDiscount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>쿠폰 할인</span>
            <span>-₩{couponDiscount.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <span className="font-semibold text-gray-900">최종 결제 금액</span>
        <span className="text-xl font-bold text-red-600">
          ₩{finalTotal.toLocaleString()}
        </span>
      </div>

      <div className="space-y-2">
        <button
          onClick={onBankTransfer}
          disabled={processing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <TruckIcon className="h-5 w-5" />
          무통장입금
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
