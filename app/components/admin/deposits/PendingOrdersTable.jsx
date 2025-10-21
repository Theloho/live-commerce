/**
 * PendingOrdersTable - 입금 대기 주문 테이블 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { EyeIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

export default function PendingOrdersTable({
  pendingOrders,
  totalCount,
  currentPage,
  hasMore,
  ITEMS_PER_PAGE,
  onLoadPage,
  onQuickSearch
}) {
  const router = useRouter()

  if (pendingOrders.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-yellow-50 px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-yellow-900">
          ⏳ 입금 대기 주문 (전체 {totalCount}건 / 현재 페이지 {pendingOrders.length}건)
        </h2>
      </div>

      <div className="divide-y divide-gray-200">
        {pendingOrders.map((order, index) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="p-6 hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {(() => {
                  const orderUser = order.user || {}

                  return (
                    <div>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="text-gray-500">이름:</span>
                          <button
                            onClick={() => onQuickSearch(orderUser?.name || order.order_shipping?.[0]?.name || order.shipping?.name)}
                            className="text-blue-600 ml-1 font-medium hover:text-blue-800 hover:underline transition-colors"
                            disabled={!orderUser?.name && !order.order_shipping?.[0]?.name && !order.shipping?.name}
                          >
                            {orderUser?.name || order.order_shipping?.[0]?.name || order.shipping?.name || '정보없음'}
                          </button>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-500">닉네임:</span>
                          <button
                            onClick={() => onQuickSearch(order.userNickname || orderUser?.profile?.nickname || orderUser?.nickname || orderUser?.name || order.order_shipping?.[0]?.name)}
                            className="text-purple-600 ml-1 font-medium hover:text-purple-800 hover:underline transition-colors"
                            disabled={!order.userNickname && !orderUser?.profile?.nickname && !orderUser?.nickname && !orderUser?.name && !order.order_shipping?.[0]?.name}
                          >
                            {order.userNickname || orderUser?.profile?.nickname || orderUser?.nickname || orderUser?.name || order.order_shipping?.[0]?.name || '정보없음'}
                          </button>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-500">입금자명:</span>
                          <button
                            onClick={() => onQuickSearch(order.depositName)}
                            className={`ml-1 font-medium hover:underline transition-colors ${
                              order.depositName
                                ? "text-green-600 hover:text-green-800"
                                : "text-red-500 cursor-not-allowed"
                            }`}
                            disabled={!order.depositName}
                          >
                            {order.depositName || '미설정'}
                          </button>
                        </p>
                      </div>
                    </div>
                  )
                })()}
                <p className="text-sm text-gray-500">
                  주문번호: {order.customer_order_number || order.customerOrderNumber || order.id.slice(-8)} • ₩{(order.payment?.amount || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(order.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const orderUser = order.user || {}

                  if (orderUser?.kakaoLink) {
                    return (
                      <button
                        onClick={() => window.open(orderUser.kakaoLink, '_blank')}
                        className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors"
                        title="카카오톡 채팅"
                      >
                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                      </button>
                    )
                  }
                  return null
                })()}
                <button
                  onClick={() => {
                    if (order.userId) {
                      router.push(`/admin/customers/${order.userId}`)
                    } else {
                      const orderIdToUse = order.isGroup && order.originalOrders?.[0]?.id
                        ? order.originalOrders[0].id
                        : order.id
                      router.push(`/admin/orders/${orderIdToUse}`)
                    }
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title={order.userId ? "고객 상세보기" : "주문 상세보기"}
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {/* 페이지네이션 컨트롤 */}
        {totalCount > ITEMS_PER_PAGE && (
          <div className="p-4 bg-gray-50 border-t">
            {/* 데스크톱 페이지네이션 */}
            <div className="hidden md:flex items-center justify-between">
              <div className="text-sm text-gray-600">
                전체 {totalCount}건 중 {((currentPage - 1) * ITEMS_PER_PAGE) + 1} ~ {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}건 표시
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onLoadPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  이전
                </button>

                {(() => {
                  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
                  const pageNumbers = []
                  const maxVisible = 5

                  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1)

                  if (endPage - startPage < maxVisible - 1) {
                    startPage = Math.max(1, endPage - maxVisible + 1)
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pageNumbers.push(i)
                  }

                  return (
                    <>
                      {startPage > 1 && (
                        <>
                          <button
                            onClick={() => onLoadPage(1)}
                            className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            1
                          </button>
                          {startPage > 2 && <span className="text-gray-400">...</span>}
                        </>
                      )}

                      {pageNumbers.map(page => (
                        <button
                          key={page}
                          onClick={() => onLoadPage(page)}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            page === currentPage
                              ? 'bg-yellow-500 text-white font-medium'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      {endPage < totalPages && (
                        <>
                          {endPage < totalPages - 1 && <span className="text-gray-400">...</span>}
                          <button
                            onClick={() => onLoadPage(totalPages)}
                            className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </>
                  )
                })()}

                <button
                  onClick={() => onLoadPage(currentPage + 1)}
                  disabled={!hasMore}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  다음
                </button>
              </div>

              <div className="w-32"></div>
            </div>

            {/* 모바일 페이지네이션 */}
            <div className="flex md:hidden items-center justify-between gap-2">
              <button
                onClick={() => onLoadPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                ← 이전
              </button>

              <div className="px-4 py-3 bg-yellow-500 text-white rounded-lg font-bold whitespace-nowrap">
                {currentPage} / {Math.ceil(totalCount / ITEMS_PER_PAGE)}
              </div>

              <button
                onClick={() => onLoadPage(currentPage + 1)}
                disabled={!hasMore}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                다음 →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
