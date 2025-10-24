/**
 * PendingOrdersTable - 입금 대기 주문 테이블 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { EyeIcon, ChatBubbleLeftRightIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export default function PendingOrdersTable({
  pendingOrders,
  totalCount,
  currentPage,
  hasMore,
  ITEMS_PER_PAGE,
  onLoadPage,
  onQuickSearch,
  onConfirmGroupPayment
}) {
  const router = useRouter()
  const [expandedGroups, setExpandedGroups] = useState({})

  const toggleGroup = (orderId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }

  if (pendingOrders.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-yellow-50 px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-yellow-900">
          ⏳ 입금 대기 주문 (전체 {totalCount}건 / 현재 페이지 {pendingOrders.length}건)
        </h2>
      </div>

      <div className="divide-y divide-gray-200">
        {pendingOrders.map((order, index) => {
          const isExpanded = expandedGroups[order.id]

          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`${order.isGroup ? 'bg-blue-50/30' : ''}`}
            >
              {/* 그룹 헤더 또는 개별 주문 */}
              <div className={`p-6 hover:bg-gray-50 ${order.isGroup ? 'cursor-pointer' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-1">
                    {/* ⭐ 일괄결제 그룹 표시 */}
                    {order.isGroup && (
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => toggleGroup(order.id)}
                          className="flex items-center gap-1 text-blue-600 font-semibold hover:text-blue-800 transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDownIcon className="w-5 h-5" />
                          ) : (
                            <ChevronRightIcon className="w-5 h-5" />
                          )}
                          <span>[일괄결제 {order.groupOrderCount}건]</span>
                        </button>
                        <span className="text-sm text-gray-600">
                          총 ₩{order.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    )}

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
                      주문번호: {order.customer_order_number || order.customerOrderNumber || order.id.slice(-8)}
                      {!order.isGroup && ` • ₩${(order.payment?.amount || 0).toLocaleString()}`}
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
              </div>

              {/* ⭐ 그룹 주문 상세 (접힌 상태일 때만) */}
              {order.isGroup && isExpanded && order.originalOrders && (
                <div className="bg-white border-t border-gray-200 pb-4">
                  {order.originalOrders.map((individualOrder, idx) => {
                    const shipping = individualOrder.order_shipping?.[0] || individualOrder.shipping
                    const isRepresentative = (shipping?.shipping_fee || 0) > 0

                    return (
                      <div
                        key={individualOrder.id}
                        className="px-6 py-3 border-l-4 border-blue-300 ml-6 my-2 bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">
                                {individualOrder.customer_order_number || individualOrder.id.slice(-8)}
                              </p>
                              {isRepresentative && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                  대표 주문 (배송비 포함)
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              ₩{(individualOrder.payment?.amount || 0).toLocaleString()}
                            </p>
                            {shipping?.shipping_fee > 0 && (
                              <p className="text-xs text-blue-600">
                                배송비: ₩{shipping.shipping_fee.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => router.push(`/admin/orders/${individualOrder.id}`)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="주문 상세보기"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {/* ⭐ 그룹 전체 확인 버튼 */}
                  <div className="px-6 mt-3">
                    <button
                      onClick={() => {
                        if (window.confirm(`[일괄결제 ${order.groupOrderCount}건] 전체 입금을 확인하시겠습니까?\n\n총액: ₩${order.totalAmount.toLocaleString()}`)) {
                          onConfirmGroupPayment?.(order)
                        }
                      }}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      💰 전체 입금 확인 (₩{order.totalAmount.toLocaleString()})
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}

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
