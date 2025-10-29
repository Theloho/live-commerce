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
 * @param {Object} props.bulkPaymentInfo - 일괄결제 정보 (선택)
 * @param {boolean} props.bulkPaymentInfo.isBulkPayment - 일괄결제 여부
 * @param {boolean} props.bulkPaymentInfo.isRepresentativeOrder - 대표 주문 여부
 * @param {number} props.bulkPaymentInfo.groupOrderCount - 그룹 내 총 주문 수
 * @param {string} props.bulkPaymentInfo.representativeOrderNumber - 대표 주문 번호
 * @param {number} props.bulkPaymentInfo.groupTotalAmount - 그룹 총 입금금액
 * @param {boolean} props.isGroup - 그룹 모드 (그룹핑 표시)
 * @param {Array} props.originalOrders - 그룹 내 원본 주문들 (isGroup=true일 때)
 */
export default function OrderCard({
  order,
  index,
  onOrderClick,
  onCancelOrder,
  getStatusInfo,
  bulkPaymentInfo = null,
  isGroup = false,
  originalOrders = []
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

  // ⭐ 그룹 모드: 여러 주문을 1개 카드로 표시 (리팩토링 전 방식)
  if (isGroup && bulkPaymentInfo) {
    // 그룹 총 할인 금액 계산
    const totalDiscount = originalOrders.reduce((sum, o) => sum + (o.discount_amount || 0), 0)

    return (
      <motion.div
        key={order.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        onClick={(e) => onOrderClick(e, order)}
        className="bg-white rounded-lg border-2 border-blue-200 p-4 cursor-pointer hover:shadow-lg transition-all hover:border-blue-400"
      >
        {/* 그룹 헤더 */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
              대표 {bulkPaymentInfo.representativeOrderNumber} 외 {bulkPaymentInfo.groupOrderCount - 1}건 합배
            </span>
            {order.status !== 'pending' && order.status !== 'verifying' && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusInfo.color}`}>
                <StatusIcon className="h-4 w-4" />
                <span className="text-xs font-medium">{statusInfo.label}</span>
              </div>
            )}
          </div>
        </div>

        {/* 그룹 금액 정보 */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">총 입금금액</span>
            <span className="text-xl font-bold text-gray-900">
              ₩{bulkPaymentInfo.groupTotalAmount?.toLocaleString()}
            </span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-600">쿠폰 할인</span>
              <span className="text-base font-semibold text-blue-600">
                -₩{totalDiscount.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* 상태별 정보 */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          {order.status === 'pending' ? (
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusInfo.color}`}>
                <StatusIcon className="h-4 w-4" />
                <span className="text-xs font-medium">{statusInfo.label}</span>
              </div>
              <span className="text-sm text-gray-500">클릭하여 결제하기 →</span>
            </div>
          ) : order.status === 'verifying' ? (
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusInfo.color}`}>
                <StatusIcon className="h-4 w-4" />
                <span className="text-xs font-medium">{statusInfo.label}</span>
              </div>
              <span className="text-xs text-gray-400">처리 대기중</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {formatDistanceToNow(new Date(order.created_at), {
                  addSuffix: true,
                  locale: ko
                })}
              </span>
              <span className="text-blue-600 font-medium">상세목록 보기 →</span>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  // 🧮 배송비 계산 (postal_code 기반) - 2025-10-26 수정
  // ✅ DB 저장된 shipping_fee 대신 postal_code로 재계산
  const { formatShippingInfo } = require('@/lib/shippingUtils')
  const baseShippingFee = order.is_free_shipping ? 0 : 4000
  const shippingInfo = formatShippingInfo(baseShippingFee, order.shipping?.postal_code)
  const calculatedShippingFee = shippingInfo.totalShipping

  const orderCalc = OrderCalculations.calculateFinalOrderAmount(order.items, {
    region: 'normal',
    coupon: order.discount_amount > 0 ? {
      type: 'fixed_amount',
      value: order.discount_amount
    } : null,
    paymentMethod: order.payment?.method || 'transfer',
    baseShippingFee: calculatedShippingFee  // ✅ postal_code 기반 배송비
  })
  // ⭐ 배송비를 따로 표시하므로 상품금액만 표시 (배송비 제외)
  const productAmountOnly = orderCalc.finalAmount - orderCalc.shippingFee

  return (
    <motion.div
      key={order.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={order.status !== 'pending' ? (e) => onOrderClick(e, order) : undefined}
      className={`bg-white rounded-lg border border-gray-200 pt-2 px-3 pb-3 ${
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
          {/* ⭐ 대표 주문 배지 */}
          {bulkPaymentInfo?.isRepresentativeOrder && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              대표 주문
            </span>
          )}
        </div>
        {/* pending/verifying은 하단에 표시하므로 배지 숨김 */}
        {order.status !== 'pending' && order.status !== 'verifying' && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusInfo.color}`}>
            <StatusIcon className="h-4 w-4" />
            <span className="text-xs font-medium">{statusInfo.label}</span>
          </div>
        )}
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

      {/* ⭐ 배송비 정보 (일괄결제 + 단건) - pending 상태는 제외 (배송지 미설정) */}
      {order.status !== 'pending' && (bulkPaymentInfo?.isBulkPayment || calculatedShippingFee > 0) && (
        <div className="mb-2 pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between text-sm">
            {bulkPaymentInfo?.isBulkPayment ? (
              // 일괄결제 케이스
              bulkPaymentInfo.isRepresentativeOrder ? (
                // 대표 주문: 좌측에 배송비+지역+합배, 우측에 금액
                <>
                  <span className="text-gray-600">
                    배송비
                    {shippingInfo.isRemote && (
                      <span className="text-xs text-orange-600">
                        {' '}(+{shippingInfo.region})
                      </span>
                    )}
                    <span className="text-xs text-blue-600 font-semibold">
                      {' '}({bulkPaymentInfo.groupOrderCount}건 합배) ✨
                    </span>
                  </span>
                  <span className="text-gray-900 font-medium">
                    ₩{calculatedShippingFee.toLocaleString()}
                  </span>
                </>
              ) : (
                // 다른 주문: 좌측에 배송비+포함정보, 우측에 ₩0
                <>
                  <span className="text-gray-600">
                    배송비
                    <span className="text-xs text-blue-600">
                      {' '}({bulkPaymentInfo.representativeOrderNumber}에 포함) ✨
                    </span>
                  </span>
                  <span className="text-gray-500 font-medium">₩0</span>
                </>
              )
            ) : (
              // 단건 주문: 좌측에 배송비+지역, 우측에 금액
              <>
                <span className="text-gray-600">
                  배송비
                  {shippingInfo.isRemote && (
                    <span className="text-xs text-orange-600">
                      {' '}(+{shippingInfo.region})
                    </span>
                  )}
                </span>
                <span className="text-gray-900 font-medium">
                  ₩{calculatedShippingFee.toLocaleString()}
                </span>
              </>
            )}
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
          ₩{productAmountOnly.toLocaleString()}
        </div>
      </div>

      {/* 액션 버튼들 */}
      <div className="mt-1.5 pt-1.5 border-t border-gray-100">
        {order.status === 'pending' ? (
          // 입금대기 배지 + 취소 버튼
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusInfo.color}`}>
              <StatusIcon className="h-4 w-4" />
              <span className="text-xs font-medium">{statusInfo.label}</span>
            </div>
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
          // 입금확인중 배지
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusInfo.color}`}>
              <StatusIcon className="h-4 w-4" />
              <span className="text-xs font-medium">{statusInfo.label}</span>
            </div>
            <span className="text-xs text-gray-400">처리 대기중</span>
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
