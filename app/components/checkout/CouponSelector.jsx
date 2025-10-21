/**
 * CouponSelector - 쿠폰 선택 컴포넌트
 * @author Claude
 * @since 2025-10-21
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { TicketIcon, XMarkIcon } from '@heroicons/react/24/outline'

/**
 * CouponSelector 컴포넌트
 * @param {Object} props
 * @param {Array} props.availableCoupons - 사용 가능한 쿠폰 목록
 * @param {Object} props.selectedCoupon - 선택된 쿠폰
 * @param {Function} props.onApplyCoupon - 쿠폰 적용 콜백
 * @param {Function} props.onRemoveCoupon - 쿠폰 해제 콜백
 * @param {number} props.discountAmount - 할인 금액
 * @returns {JSX.Element}
 */
export default function CouponSelector({
  availableCoupons,
  selectedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  discountAmount
}) {
  const [showCouponList, setShowCouponList] = useState(false)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg border border-gray-200 p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TicketIcon className="h-5 w-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">쿠폰</h2>
          </div>
          {selectedCoupon ? (
            <button
              onClick={onRemoveCoupon}
              className="text-sm text-red-500 hover:text-red-600"
            >
              해제
            </button>
          ) : (
            <button
              onClick={() => setShowCouponList(true)}
              className="text-sm text-red-500 hover:text-red-600"
            >
              선택
            </button>
          )}
        </div>

        {selectedCoupon ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="font-medium text-green-800 mb-1">
              {selectedCoupon.coupon?.name || '쿠폰'}
            </p>
            <p className="text-sm text-green-600">
              ₩{discountAmount.toLocaleString()} 할인
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            사용 가능한 쿠폰: {availableCoupons.length}개
          </p>
        )}
      </motion.div>

      {/* 쿠폰 목록 모달 */}
      {showCouponList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">쿠폰 선택</h2>
              <button
                onClick={() => setShowCouponList(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {availableCoupons.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                사용 가능한 쿠폰이 없습니다
              </p>
            ) : (
              <div className="space-y-3">
                {availableCoupons.map((userCoupon) => (
                  <button
                    key={userCoupon.id}
                    onClick={() => {
                      onApplyCoupon(userCoupon)
                      setShowCouponList(false)
                    }}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors text-left"
                  >
                    <p className="font-medium text-gray-900 mb-1">
                      {userCoupon.coupon?.name || '쿠폰'}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      {userCoupon.coupon?.description || ''}
                    </p>
                    <p className="text-sm text-red-600 font-medium">
                      {userCoupon.coupon?.discount_type === 'percentage'
                        ? `${userCoupon.coupon.discount_value}% 할인`
                        : `₩${userCoupon.coupon.discount_value.toLocaleString()} 할인`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
