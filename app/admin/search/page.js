'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  AtSymbolIcon,
  BanknotesIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'

/**
 * ⭐ 상품 그룹핑 함수: 제품번호 + 옵션 조합으로 그룹화
 */
const groupOrderItems = (items) => {
  const groups = {}

  items.forEach((item, originalIndex) => {
    const optionsKey = JSON.stringify(item.selectedOptions || {})
    const groupKey = `${item.product_number || item.product_id || item.title}_${optionsKey}`

    if (!groups[groupKey]) {
      groups[groupKey] = {
        ...item,
        quantity: 0,
        totalPrice: 0,
        originalIndices: [],
        originalItems: []
      }
    }

    groups[groupKey].quantity += item.quantity || 1
    groups[groupKey].totalPrice += ((item.price || 0) * (item.quantity || 1))
    groups[groupKey].originalIndices.push(originalIndex)
    groups[groupKey].originalItems.push(item)
  })

  return Object.values(groups)
}

/**
 * ⭐ 그룹핑 함수: payment_group_id로 주문 그룹핑
 */
const groupOrdersByPaymentGroupId = (orders) => {
  const groups = {}
  const result = []

  orders.forEach(order => {
    if (order.payment_group_id) {
      if (!groups[order.payment_group_id]) {
        groups[order.payment_group_id] = []
      }
      groups[order.payment_group_id].push(order)
    } else {
      result.push(order)
    }
  })

  Object.entries(groups).forEach(([groupId, groupOrders]) => {
    const representativeOrder = groupOrders[0]
    const allItems = groupOrders.flatMap(order => order.items || [])
    const totalAmountSum = groupOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0)
    const groupTotalDiscount = representativeOrder.discount_amount || 0
    const groupShippingFee = representativeOrder.shipping?.shipping_fee || 0
    const groupTotalAmount = totalAmountSum - groupTotalDiscount + groupShippingFee

    const groupCard = {
      ...representativeOrder,
      items: allItems,
      isGroup: true,
      originalOrders: groupOrders,
      groupOrderCount: groupOrders.length,
      totalPrice: groupTotalAmount
    }

    result.push(groupCard)
  })

  return result
}

export default function AdminSearchPage() {
  const router = useRouter()
  const { adminUser, loading: authLoading } = useAdminAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [allOrders, setAllOrders] = useState([])
  const [dateRange, setDateRange] = useState('today') // ⭐ 기본: 오늘
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // ⭐ 상태별로 그룹핑된 결과
  const [groupedResults, setGroupedResults] = useState({
    pending: [],
    verifying: [],
    paid: [],
    delivered: [],
    cancelled: []
  })

  // ⭐ 상태 라벨
  const statusLabels = {
    pending: '🛒 장바구니',
    verifying: '📋 주문내역',
    paid: '✅ 구매확정',
    delivered: '📦 출고정보',
    cancelled: '❌ 취소내역'
  }

  // 주문 검색
  const searchOrders = async () => {
    if (!adminUser?.email) {
      console.error('관리자 이메일이 없습니다')
      return
    }

    if (!searchTerm.trim()) {
      toast.error('검색어를 입력해주세요')
      return
    }

    // ⚠️ "전체" 기간 선택 시 경고
    if (dateRange === 'all') {
      toast('⚠️ "전체" 기간은 최신 10만건만 조회됩니다.\n오래된 주문은 "1개월" 또는 "기간 선택"을 이용하세요.', {
        duration: 4000,
        icon: '⚠️'
      })
    }

    try {
      setLoading(true)

      // ⭐ 모든 상태 검색 (status 파라미터 없이)
      let url = `/api/admin/orders?adminEmail=${encodeURIComponent(adminUser.email)}&dateRange=${dateRange}`

      if (dateRange === 'custom') {
        if (customStartDate) url += `&startDate=${customStartDate}`
        if (customEndDate) url += `&endDate=${customEndDate}`
      }

      // 🚀 캐시 무효화: 매번 실시간 조회
      url += `&_t=${Date.now()}`

      console.log('🔍 [통합검색] 검색 시작:', { searchTerm, dateRange })

      const response = await fetch(url, {
        cache: 'no-store', // 캐시 완전 비활성화
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '주문 조회 실패')
      }

      const { orders: rawOrders } = await response.json()

      // 기존 포맷으로 변환
      const formattedOrders = rawOrders.map(order => {
        const profileInfo = order.userProfile || {}
        const shipping = order.order_shipping?.[0] || {}
        const payment = order.order_payments?.[0] || {}

        return {
          id: order.id,
          userId: order.user_id || null,
          userName: profileInfo.name || shipping.name || '알 수 없음',
          userNickname: profileInfo.nickname || profileInfo.name || '알 수 없음',
          userEmail: profileInfo.email || null,
          userPhone: profileInfo.phone || shipping.phone || null,
          status: order.status,
          totalPrice: order.total_amount || 0,
          customer_order_number: order.customer_order_number,
          created_at: order.created_at,
          deposited_at: order.deposited_at,
          shipped_at: order.shipped_at,
          delivered_at: order.delivered_at,
          order_type: order.order_type,
          payment_group_id: order.payment_group_id || null,
          discount_amount: order.discount_amount || 0,
          is_free_shipping: order.is_free_shipping || false,
          items: order.order_items || [],
          shipping: {
            name: shipping.name,
            phone: shipping.phone,
            address: shipping.address,
            detail_address: shipping.detail_address,
            postal_code: shipping.postal_code,
            shipping_request: shipping.shipping_request,
            tracking_number: shipping.tracking_number,
            tracking_company: shipping.tracking_company,
            shipping_fee: shipping.shipping_fee || 0
          },
          payment: {
            method: payment.method,
            depositor_name: payment.depositor_name,
            amount: payment.amount
          }
        }
      })

      console.log('✅ [통합검색] 전체 주문 로드:', formattedOrders.length, '개')

      // 🔍 디버깅: 처음 5개 주문의 주문번호와 닉네임 출력
      console.log('🔍 [디버깅] 처음 5개 주문:', formattedOrders.slice(0, 5).map(o => ({
        customer_order_number: o.customer_order_number,
        userNickname: o.userNickname,
        userName: o.userName,
        created_at: o.created_at
      })))

      // ⭐ 검색어 필터링
      const searchLower = searchTerm.toLowerCase()
      console.log('🔍 [검색어]:', searchTerm, '→', searchLower)

      const filteredOrders = formattedOrders.filter(order => {
        const serverSearchMatched =
          order.customer_order_number?.toLowerCase().includes(searchLower) ||
          order.id?.toLowerCase().includes(searchLower) ||
          order.order_type?.toLowerCase().includes(searchLower)

        if (serverSearchMatched) {
          console.log('✅ [서버 매칭]:', order.customer_order_number, '|', order.id)
          return true
        }

        const clientSearchMatched =
          order.shipping?.name?.toLowerCase().includes(searchLower) ||
          order.userName?.toLowerCase().includes(searchLower) ||
          order.userNickname?.toLowerCase().includes(searchLower) ||
          order.payment?.depositor_name?.toLowerCase().includes(searchLower) ||
          order.items?.some(item => item.title?.toLowerCase().includes(searchLower)) ||
          order.shipping?.phone?.replace(/-/g, '').includes(searchLower.replace(/-/g, ''))

        if (clientSearchMatched) {
          console.log('✅ [클라이언트 매칭]:', order.customer_order_number, '|', order.userNickname)
        }

        return clientSearchMatched
      })

      console.log('✅ [통합검색] 필터링 완료:', filteredOrders.length, '개')

      setAllOrders(filteredOrders)

      // ⭐ 상태별로 그룹핑
      const grouped = {
        pending: groupOrdersByPaymentGroupId(filteredOrders.filter(o => o.status === 'pending')),
        verifying: groupOrdersByPaymentGroupId(filteredOrders.filter(o => o.status === 'verifying')),
        paid: groupOrdersByPaymentGroupId(filteredOrders.filter(o => o.status === 'paid')),
        delivered: groupOrdersByPaymentGroupId(filteredOrders.filter(o => o.status === 'delivered')),
        cancelled: groupOrdersByPaymentGroupId(filteredOrders.filter(o => o.status === 'cancelled'))
      }

      setGroupedResults(grouped)

      const totalCount = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0)
      if (totalCount === 0) {
        toast.error('검색 결과가 없습니다')
      } else {
        toast.success(`${totalCount}건의 주문을 찾았습니다`)
      }

      setLoading(false)
    } catch (error) {
      console.error('검색 오류:', error)
      toast.error('검색에 실패했습니다')
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">장바구니</span>,
      verifying: <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">입금대기</span>,
      paid: <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">입금완료</span>,
      delivered: <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">발송완료</span>,
      cancelled: <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">취소</span>
    }
    return badges[status] || badges.pending
  }

  const getPaymentMethodDisplay = (method) => {
    const methodMap = {
      cart: { text: '장바구니', icon: BanknotesIcon, color: 'text-indigo-700' },
      bank_transfer: { text: '계좌이체', icon: BanknotesIcon, color: 'text-cyan-700' },
      card: { text: '카드결제', icon: CreditCardIcon, color: 'text-emerald-700' }
    }
    return methodMap[method] || { text: method || '결제방법 미정', icon: BanknotesIcon, color: 'text-slate-600' }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (!adminUser) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">관리자 권한이 필요합니다</p>
      </div>
    )
  }

  const totalResults = Object.values(groupedResults).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🔍 통합 검색</h1>
        <p className="text-sm text-gray-600 mt-1">
          모든 주문 상태에서 검색합니다
          {totalResults > 0 && (
            <span className="ml-2 text-sm font-medium text-blue-600">
              | 검색 결과: {totalResults}건
            </span>
          )}
        </p>
      </div>

      {/* 검색 영역 */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
        {/* 검색창 */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="주문번호, 고객명, 닉네임, 입금자명, 상품명, 전화번호로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchOrders()}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-base"
          />
        </div>

        {/* 날짜 필터 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">📅 조회 기간:</span>
          {[
            { id: 'today', label: '오늘' },
            { id: 'yesterday', label: '어제' },
            { id: 'week', label: '1주일' },
            { id: 'month', label: '1개월' },
            { id: 'all', label: '전체' }
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setDateRange(range.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === range.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.label}
            </button>
          ))}
          <button
            onClick={() => setDateRange('custom')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateRange === 'custom'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📆 기간 선택
          </button>
        </div>

        {/* Custom Date Range Picker */}
        {dateRange === 'custom' && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">시작일:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">종료일:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* 검색 버튼 */}
        <button
          onClick={searchOrders}
          disabled={loading || !searchTerm.trim()}
          className={`w-full px-6 py-3 rounded-lg text-white font-medium transition-colors ${
            loading || !searchTerm.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {loading ? '검색 중...' : '🔍 검색'}
        </button>
      </div>

      {/* 검색 결과 */}
      {totalResults > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedResults).map(([status, orders]) => (
            orders.length > 0 && (
              <motion.div
                key={status}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* 상태 헤더 */}
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">
                    {statusLabels[status]} <span className="text-blue-600">({orders.length}건)</span>
                  </h2>
                </div>

                {/* 주문 리스트 */}
                <div className="divide-y divide-gray-200">
                  {orders.map((order, index) => {
                    const groupedItems = groupOrderItems(order.items)
                    const totalQuantity = groupedItems.reduce((sum, item) => sum + item.quantity, 0)
                    const uniqueProducts = groupedItems.length

                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          {/* 왼쪽: 주문 정보 */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-bold text-gray-900">
                                {order.customer_order_number || order.id.slice(-8)}
                              </span>
                              {order.isGroup && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                  그룹결제
                                </span>
                              )}
                              {getStatusBadge(order.status)}
                            </div>

                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{order.userName || order.shipping?.name || '정보없음'}</span>
                                {order.payment?.depositor_name && (
                                  <span className="text-xs font-semibold text-blue-600">
                                    💳 {order.payment.depositor_name}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <AtSymbolIcon className="w-3 h-3" />
                                {order.userNickname && order.userNickname !== '정보없음' ? order.userNickname : (order.shipping?.name || '익명')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(order.created_at).toLocaleString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {order.isGroup
                                  ? `${order.groupOrderCount}개 주문 일괄결제 (총 ${uniqueProducts}종 ${totalQuantity}개)`
                                  : uniqueProducts === 1
                                    ? `${totalQuantity}개`
                                    : `${uniqueProducts}종 ${totalQuantity}개`
                                }
                              </div>
                            </div>
                          </div>

                          {/* 오른쪽: 금액 정보 */}
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              ₩{order.totalPrice.toLocaleString()}
                            </div>
                            {order.discount_amount > 0 && (
                              <div className="text-xs text-blue-600">
                                (쿠폰 -₩{order.discount_amount.toLocaleString()})
                              </div>
                            )}
                            <div className="flex items-center justify-end gap-1 mt-1">
                              {(() => {
                                const paymentInfo = getPaymentMethodDisplay(order.payment?.method)
                                const Icon = paymentInfo.icon
                                return (
                                  <>
                                    <Icon className={`w-3 h-3 ${paymentInfo.color}`} />
                                    <span className={`text-xs font-medium ${paymentInfo.color}`}>
                                      {paymentInfo.text}
                                    </span>
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )
          ))}
        </div>
      )}

      {/* 검색 결과 없음 */}
      {!loading && totalResults === 0 && allOrders.length === 0 && searchTerm && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">검색을 시작하려면 검색어를 입력하고 검색 버튼을 클릭하세요</p>
        </div>
      )}
    </div>
  )
}
