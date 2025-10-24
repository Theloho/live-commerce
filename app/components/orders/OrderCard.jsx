/**
 * OrderCard - 주문 카드 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * 역할: 개별 주문 정보를 카드 형태로 표시
 * - 주문 헤더 (주문번호, 상태 배지)
 * - 상품 그룹핑 (제품번호 + 옵션 조합)
 * - 가격 계산 (OrderCalculations)
 * - 상품 목록 렌더링
 * - 송장번호 추적 링크
 * - 액션 버튼 (취소/상세보기)
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 * - 비즈니스 로직은 props로 전달받음
 */

import Image from 'next/image'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import OrderCalculations from '@/lib/orderCalculations'
import { getTrackingUrl, getCarrierName } from '@/lib/trackingNumberUtils'

/**
 * OrderCard Component
 * @param {Object} props
 * @param {Object} props.order - 주문 데이터
 * @param {number} props.index - 인덱스 (애니메이션용)
 * @param {Function} props.onOrderClick - 주문 클릭 핸들러
 * @param {Function} props.onCancelOrder - 주문 취소 핸들러
 * @param {Function} props.getStatusInfo - 상태 정보 조회 함수
 */
export default function OrderCard({
  order,
  index,
  onOrderClick,
  onCancelOrder,
  getStatusInfo
}) {
  // 결제 방법 및 상태 정보
  const paymentMethod = order.payment?.method || null
  const statusInfo = getStatusInfo(order.status, paymentMethod)
  const StatusIcon = statusInfo.icon

  /**
   * 상품 그룹핑 로직
   * - 제품번호 + 옵션 조합으로 그룹화
   * - 동일 상품+옵션은 수량 합산
   */
  const groupOrderItems = (items) => {
    const groups = {}

    items.forEach((item, originalIndex) => {
      // 키 생성: product_number + 옵션 조합
      const optionsKey = JSON.stringify(item.selectedOptions || {})
      const groupKey = `${item.product_number || item.product_id || item.title}_${optionsKey}`

      if (!groups[groupKey]) {
        groups[groupKey] = {
          ...item,
          quantity: 0,
          totalPrice: 0,
          originalIndices: [],  // 원본 아이템 인덱스 추적
          originalItems: []     // 원본 아이템 저장
        }
      }

      groups[groupKey].quantity += item.quantity || 1
      groups[groupKey].totalPrice += ((item.price || 0) * (item.quantity || 1))
      groups[groupKey].originalIndices.push(originalIndex)
      groups[groupKey].originalItems.push(item)
    })

    return Object.values(groups)
  }

  const groupedItems = groupOrderItems(order.items || [])

  // 🧮 상품금액만 계산 (배송비 제외) - 2025-10-24 수정
  // ✅ 배송비는 체크아웃 페이지에서 계산 (OrderFilter와 동일)
  const orderCalc = OrderCalculations.calculateFinalOrderAmount(order.items, {
    region: 'normal', // 배송비 0원 계산용
    coupon: order.discount_amount > 0 ? {
      type: 'fixed_amount',
      value: order.discount_amount
    } : null,
    paymentMethod: order.payment?.method || 'transfer',
    baseShippingFee: 0  // ✅ 배송비 제외
  })
  const finalAmount = orderCalc.finalAmount

  return (
    <motion.div
      key={order.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={order.status !== 'pending' ? (e) => onOrderClick(e, order) : undefined}
      className={`bg-white rounded-lg border border-gray-200 p-3 ${
        order.status !== 'pending' ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
    >
      {/* 주문 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {order.status !== 'pending' && order.customer_order_number && (
            <span className="text-sm font-medium text-gray-900">
              주문번호: {order.customer_order_number}
            </span>
          )}
        </div>
        {/* 모든 상태 배지 표시 (우측 상단) */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusInfo.color}`}>
          <StatusIcon className="h-4 w-4" />
          <span className="text-xs font-medium">{statusInfo.label}</span>
        </div>
      </div>

      {/* 상품 정보 - 그룹화된 아이템들을 모두 표시 */}
      <div className="space-y-2 mb-2">
        {groupedItems.map((groupedItem, itemIndex) => (
          <div key={itemIndex} className="flex gap-2 pb-2 border-b border-gray-100 last:border-0 last:pb-0">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={groupedItem.thumbnail_url || '/placeholder.png'}
                alt={groupedItem.title}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              {/* 제품번호 + 상품명 (한 줄) */}
              <h3 className="line-clamp-1 text-sm">
                <span className="font-bold text-gray-900">{groupedItem.product_number || groupedItem.product_id}</span>
                {groupedItem.title && groupedItem.title !== (groupedItem.product_number || groupedItem.product_id) && (
                  <span className="text-xs text-gray-500"> {groupedItem.title}</span>
                )}
              </h3>

              {/* 선택된 옵션 표시 */}
              {groupedItem.selectedOptions && Object.keys(groupedItem.selectedOptions).length > 0 && (
                <div className="mt-0.5">
                  {Object.entries(groupedItem.selectedOptions).map(([optionId, value]) => (
                    <span
                      key={optionId}
                      className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mr-1 mb-1"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              )}

              {/* 단가 + 수량 한 줄로 */}
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-500">
                  단가: ₩{groupedItem.price?.toLocaleString() || '0'}
                </p>
                <span className="text-gray-300">|</span>
                <p className="text-xs text-gray-700 font-medium">
                  수량: {groupedItem.quantity}개
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 송장번호 표시 (출고완료 상태인 경우) */}
      {(order.status === 'delivered' || order.status === 'shipping') && order.shipping?.tracking_number && (
        <div className="mb-2 pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between text-sm gap-2">
            <span className="text-gray-600">배송조회</span>
            <a
              href={getTrackingUrl(order.shipping?.tracking_company, order.shipping?.tracking_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-xs flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-medium">{getCarrierName(order.shipping?.tracking_company)}</span>
              <span className="font-mono">{order.shipping.tracking_number}</span>
            </a>
          </div>
        </div>
      )}

      {/* 주문 정보 */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-500">
          {formatDistanceToNow(new Date(order.created_at), {
            addSuffix: true,
            locale: ko
          })}
        </div>
        <div className="font-semibold text-gray-900">
          ₩{finalAmount.toLocaleString()}
        </div>
      </div>

      {/* 액션 버튼들 */}
      <div className="mt-1.5 pt-1.5 border-t border-gray-100">
        {order.status === 'pending' ? (
          // 결제대기 상품에는 취소 버튼만 표시
          <div className="flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCancelOrder(order.id)
              }}
              className="bg-gray-100 text-gray-600 text-xs font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
          </div>
        ) : order.status === 'verifying' ? (
          // 결제 확인중 상태일 때 "처리 대기중" 표시
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>결제 확인이 완료되면 자동으로 처리됩니다</span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {(() => {
                const { status, payment } = order
                const isCard = payment?.method === 'card'

                switch (status) {
                  case 'pending':
                    return isCard ? '카드결제 대기중' : '입금대기'
                  case 'verifying':
                    return isCard ? '카드결제 확인중' : '입금확인중'
                  case 'paid':
                    return '결제완료'
                  case 'preparing':
                    return '결제완료 (배송준비중)'
                  case 'shipped':
                    return '결제완료 (배송중)'
                  case 'delivered':
                    return '결제완료 (출고완료)'
                  case 'cancelled':
                    return '결제취소'
                  default:
                    return isCard ? '카드결제 대기중' : '입금대기'
                }
              })()}
            </span>
            <span>{order.isGroup ? '상세목록 보기 →' : '상세보기 →'}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
