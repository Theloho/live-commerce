/**
 * PriceBreakdown - 금액 상세 내역 컴포넌트
 * @author Claude
 * @since 2025-10-21
 */

'use client'

import { motion } from 'framer-motion'

/**
 * PriceBreakdown 컴포넌트
 * @param {Object} props
 * @param {number} props.itemsTotal - 상품 금액
 * @param {number} props.shippingFee - 배송비
 * @param {number} props.couponDiscount - 쿠폰 할인
 * @param {number} props.finalTotal - 최종 금액
 * @returns {JSX.Element}
 */
export default function PriceBreakdown({
  itemsTotal,
  shippingFee,
  couponDiscount,
  finalTotal
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-white rounded-lg border border-gray-200 p-4"
    >
      <h2 className="font-semibold text-gray-900 mb-3">결제 금액</h2>

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

      <div className="flex justify-between items-center">
        <span className="font-semibold text-gray-900">최종 결제 금액</span>
        <span className="text-xl font-bold text-red-600">
          ₩{finalTotal.toLocaleString()}
        </span>
      </div>
    </motion.div>
  )
}
