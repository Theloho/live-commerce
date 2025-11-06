/**
 * OrderFilter - 주문 필터 및 결제 요약 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * 역할: 주문 상태 필터 탭 및 결제 요약 정보 표시
 * - 필터 탭 (결제대기, 결제확인중, 결제완료, 출고완료)
 * - 상태별 주문 개수 표시
 * - 결제대기 주문 요약 (상품금액, 배송비, 총액)
 * - 일괄 결제 버튼
 * - 빈 상태 UI
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

import { ClockIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'

/**
 * OrderFilter Component
 * @param {Object} props
 * @param {string} props.filterStatus - 현재 선택된 필터 상태
 * @param {Object} props.statusCounts - 상태별 주문 개수 { pending: 5, verifying: 2, ... }
 * @param {Array} props.orders - 필터링된 주문 목록
 * @param {Function} props.onTabChange - 탭 변경 핸들러
 * @param {Function} props.onPayAllPending - 일괄 결제 핸들러
 * @param {Function} props.getStatusInfo - 상태 정보 조회 함수
 * @param {Object} props.router - Next.js router
 */
export default function OrderFilter({
  filterStatus,
  statusCounts,
  orders,
  onTabChange,
  onPayAllPending,
  getStatusInfo,
  router
}) {
  // 필터 탭 정의
  const filters = [
    { key: 'pending', label: '장바구니' },
    { key: 'verifying', label: '주문내역' },
    { key: 'paid', label: '구매확정' },
    { key: 'delivered', label: '출고정보' }
  ]

  // 결제대기 주문 요약 계산 (배송비는 체크아웃에서 계산)
  const calculatePendingSummary = () => {
    const pendingOrders = orders.filter(order => order.status === 'pending')

    // 상품 금액 합계
    const totalProductPrice = pendingOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0)
    }, 0)

    // 전체 상품 수량
    const totalItemCount = pendingOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0)
    }, 0)

    // ✅ 무료배송 조건 확인 (pending/verifying 주문이 있으면 무료배송)
    const hasFreeShipping = pendingOrders.some(order => order.is_free_shipping === true)

    // ✅ 배송비 제거: 체크아웃 페이지에서 계산
    // finalTotal = 상품금액만 (배송비는 "전체 결제하기" 후 계산)
    const finalTotal = totalProductPrice

    return {
      totalProductPrice,
      totalItemCount,
      finalTotal,
      hasFreeShipping
    }
  }

  const summary = filterStatus === 'pending' && orders.length > 0 ? calculatePendingSummary() : null

  return (
    <>
      {/* 필터 탭 */}
      <div className="px-4 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 overflow-x-auto py-2">
          {filters.map(filter => {
            // ⭐ 그룹핑 후 카드 개수 (탭 숫자 = 실제 카드 개수)
            const count = statusCounts?.[filter.key] || 0

            return (
              <button
                key={filter.key}
                onClick={() => onTabChange(filter.key)}
                className={`
                  relative px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                  ${filterStatus === filter.key
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {filter.label}
                {count > 0 && (
                  <span className={`absolute -top-1 -right-1 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
                    filterStatus === filter.key ? 'bg-white text-red-500' : 'bg-red-500'
                  }`}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 결제대기 요약 카드 */}
      {summary && (
        <div className="px-4 py-4 bg-white border-b border-gray-200">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">결제 정보</h3>
              {summary.hasFreeShipping && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  🎁 무료배송 혜택 적용!
                </span>
              )}
            </div>

            <div className="space-y-2">
              {/* 상품금액 */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">상품금액 ({summary.totalItemCount}개)</span>
                <span className="text-gray-900">₩{summary.totalProductPrice.toLocaleString()}</span>
              </div>

              {/* ✅ 배송비 제거: 체크아웃 페이지에서 계산 */}

              {/* 총 결제금액 (배송비는 체크아웃에서 추가) */}
              <div className="border-t border-red-200 pt-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-900">총 결제금액</span>
                  <span className="text-red-600 text-lg">₩{summary.finalTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 일괄 결제 버튼 */}
            <button
              onClick={onPayAllPending}
              className="w-full mt-4 bg-red-500 text-white font-semibold py-3 rounded-lg hover:bg-red-600 transition-colors"
            >
              전체 결제하기
            </button>
          </div>
        </div>
      )}

      {/* 빈 상태 UI */}
      {orders.length === 0 && (
        <div className="px-4 py-4">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {filterStatus === 'pending' ? (
                <ShoppingCartIcon className="h-8 w-8 text-gray-400" />
              ) : (
                <ClockIcon className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filterStatus === 'pending' ? '장바구니가 비어있습니다' : '주문 내역이 없습니다'}
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {filterStatus === 'pending'
                ? '마음에 드는 상품을 장바구니에 담아보세요.'
                : `${getStatusInfo(filterStatus).label} 상태의 주문이 없습니다.`
              }
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              쇼핑하러 가기
            </button>
          </div>
        </div>
      )}
    </>
  )
}
