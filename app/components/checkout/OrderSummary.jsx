/**
 * OrderSummary - 주문 상품 정보 컴포넌트
 * @author Claude
 * @since 2025-10-21
 */

'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

/**
 * OrderSummary 컴포넌트
 * @param {Object} props
 * @param {Object} props.orderItem - 주문 아이템 정보
 * @param {boolean} props.hasPendingOrders - 무료배송 조건
 * @returns {JSX.Element}
 */
export default function OrderSummary({ orderItem, hasPendingOrders }) {
  if (!orderItem) return null

  return (
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
                src={orderItem.product?.thumbnail_url || '/placeholder-product.png'}
                alt={orderItem.title || '상품 이미지'}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 mb-1">{orderItem.title || '일괄결제 주문'}</p>
              <p className="text-sm text-gray-500 mb-1">
                총 {orderItem.itemCount || 1}개 주문
              </p>
              <p className="font-semibold text-gray-900">
                ₩{orderItem.totalPrice.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 무료배송 프로모션 배지 */}
          {hasPendingOrders && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                <span className="text-green-600">🎁</span>
                무료배송 혜택 적용! (기존 주문이 있어요)
              </p>
            </div>
          )}
        </div>
      ) : (
        // 일반 주문 시 상세 정보 표시
        <div className="flex gap-3">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={orderItem.product?.thumbnail_url || '/placeholder-product.png'}
              alt={orderItem.title || '상품 이미지'}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 mb-1">{orderItem.title}</p>
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
  )
}
