'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  AtSymbolIcon,
  BanknotesIcon,
  CreditCardIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'

/**
 * ⭐ 상품 그룹핑 함수: 제품번호 + 옵션 조합으로 그룹화
 * - 사용자 화면(OrderCard.jsx)과 동일한 로직
 * @param {Array} items - 주문 아이템 배열
 * @returns {Array} - 그룹핑된 아이템 배열
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
 * @param {Array} orders - 원본 주문 배열
 * @returns {Array} - 그룹핑된 주문 배열 (isGroup, originalOrders 포함)
 */
const groupOrdersByPaymentGroupId = (orders) => {
  const groups = {}
  const result = []

  // 1. payment_group_id로 그룹 분류
  orders.forEach(order => {
    if (order.payment_group_id) {
      if (!groups[order.payment_group_id]) {
        groups[order.payment_group_id] = []
      }
      groups[order.payment_group_id].push(order)
    } else {
      // 일괄결제 아닌 개별 주문
      result.push(order)
    }
  })

  // 2. 그룹을 대표 주문으로 변환
  Object.entries(groups).forEach(([groupId, groupOrders]) => {
    // 대표 주문: 가장 먼저 생성된 주문
    const representativeOrder = groupOrders[0]

    // ⭐ 그룹 내 모든 주문의 아이템을 하나로 합치기
    const allItems = groupOrders.flatMap(order => order.items || [])

    // ⭐ DB에 저장된 total_amount 합계 (재계산 불필요!)
    const totalAmountSum = groupOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0)

    // ⭐ 대표 주문의 쿠폰 할인 (일괄결제는 쿠폰 1개만 적용)
    const groupTotalDiscount = representativeOrder.discount_amount || 0

    // ⭐ 대표 주문의 배송비 추가 (사용자 화면과 동일한 로직)
    const groupShippingFee = representativeOrder.shipping?.shipping_fee || 0

    // ⭐ 총 입금금액 = total_amount 합계 - 쿠폰할인 + 배송비 (GetOrdersUseCase.js:306과 동일)
    const groupTotalAmount = totalAmountSum - groupTotalDiscount + groupShippingFee

    // 그룹 카드 생성
    const groupCard = {
      ...representativeOrder,
      items: allItems, // ⭐ 모든 주문의 아이템 통합
      isGroup: true, // ⭐ 그룹 모드 활성화
      originalOrders: groupOrders, // ⭐ 그룹 내 원본 주문들
      groupOrderCount: groupOrders.length,
      totalPrice: groupTotalAmount // ⭐ DB 저장된 금액 합계 + 배송비 (사용자 화면과 동일)
    }

    result.push(groupCard)
  })

  return result
}

export default function AdminCartPage() {
  const router = useRouter()
  const { adminUser, loading: authLoading } = useAdminAuth()
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('all') // ⭐ 날짜 필터
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [sortOption, setSortOption] = useState('date_desc') // ⭐ 정렬 옵션
  const [selectedOrders, setSelectedOrders] = useState([]) // ⭐ 체크박스 선택 상태

  const filterOrders = () => {
    let filtered = [...orders]

    // ⚡ 검색어 필터
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()

      filtered = filtered.filter(order => {
        // 서버 검색 결과를 그대로 포함 (주문번호, ID, 카카오ID)
        const serverSearchMatched =
          order.customer_order_number?.toLowerCase().includes(searchLower) ||
          order.id?.toLowerCase().includes(searchLower) ||
          order.order_type?.toLowerCase().includes(searchLower)

        if (serverSearchMatched) return true

        // 프론트 추가 검색 (고객명, 입금자명, 상품명, 전화번호)
        const clientSearchMatched =
          order.shipping?.name?.toLowerCase().includes(searchLower) ||
          order.userName?.toLowerCase().includes(searchLower) ||
          order.userNickname?.toLowerCase().includes(searchLower) ||
          order.payment?.depositor_name?.toLowerCase().includes(searchLower) ||
          order.items?.some(item => item.title?.toLowerCase().includes(searchLower)) ||
          order.shipping?.phone?.replace(/-/g, '').includes(searchLower.replace(/-/g, ''))

        return clientSearchMatched
      })
    }

    // ⭐ 정렬 로직
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'date_desc': // 날짜순 (최신순)
          return new Date(b.created_at) - new Date(a.created_at)
        case 'date_asc': // 날짜순 (오래된순)
          return new Date(a.created_at) - new Date(b.created_at)
        case 'amount_desc': // 금액순 (높은순)
          return (b.totalPrice || 0) - (a.totalPrice || 0)
        case 'amount_asc': // 금액순 (낮은순)
          return (a.totalPrice || 0) - (b.totalPrice || 0)
        case 'customer_asc': // 고객명순 (가나다)
          return (a.userName || '').localeCompare(b.userName || '', 'ko-KR')
        case 'customer_desc': // 고객명순 (역순)
          return (b.userName || '').localeCompare(a.userName || '', 'ko-KR')
        default:
          return 0
      }
    })

    setFilteredOrders(filtered)
  }

  // ⭐ 전체 선택/해제
  const handleSelectAll = () => {
    const allOrderIds = filteredOrders.flatMap(order =>
      order.isGroup ? order.originalOrders.map(o => o.id) : [order.id]
    )
    const allSelected = allOrderIds.every(id => selectedOrders.includes(id))
    if (allSelected) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(allOrderIds)
    }
  }

  // ⭐ 일괄 취소
  const handleBulkCancel = async () => {
    if (selectedOrders.length === 0) {
      toast.error('선택된 주문이 없습니다')
      return
    }

    const confirmMessage = `선택한 ${selectedOrders.length}개 주문을 취소하시겠습니까?`
    if (!window.confirm(confirmMessage)) return

    try {
      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: selectedOrders,
          status: 'cancelled'
        })
      })

      if (!response.ok) {
        throw new Error('주문 상태 변경 실패')
      }

      toast.success(`${selectedOrders.length}개 주문이 취소되었습니다`)
      setSelectedOrders([])
      loadOrders()
    } catch (error) {
      console.error('일괄 취소 실패:', error)
      toast.error('일괄 취소에 실패했습니다')
    }
  }

  useEffect(() => {
    if (adminUser?.email) {
      loadOrders() // 초기 로딩
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser])

  useEffect(() => {
    filterOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, searchTerm, sortOption])

  // 날짜 필터 변경 시 데이터 재로드
  useEffect(() => {
    // ⭐ 'custom' 모드: 날짜 입력 UI만 표시, 데이터 로드 X
    if (dateRange === 'custom') {
      return
    }

    // ✅ 다른 모드: 즉시 데이터 로드
    if (adminUser?.email) {
      loadOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

  const loadOrders = async () => {
    try {
      setLoading(true)

      if (!adminUser?.email) {
        console.error('관리자 이메일이 없습니다')
        setLoading(false)
        return
      }

      // ⚡ Service Role API 호출 (날짜 필터 + 장바구니 상태만)
      let url = `/api/admin/orders?adminEmail=${encodeURIComponent(adminUser.email)}&dateRange=${dateRange}&status=pending`
      if (dateRange === 'custom') {
        if (customStartDate) url += `&startDate=${customStartDate}`
        if (customEndDate) url += `&endDate=${customEndDate}`
      }

      console.log('🛒 장바구니 주문 전체 로드:', { dateRange })

      const response = await fetch(url)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '주문 조회 실패')
      }

      const { orders: rawOrders } = await response.json()

      // 기존 포맷으로 변환
      const allOrders = rawOrders.map(order => {
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

      console.log('✅ API에서 가져온 장바구니 주문:', allOrders.length, '개')

      // ⭐ 그룹핑 적용
      const groupedOrders = groupOrdersByPaymentGroupId(allOrders)
      console.log('✅ 그룹핑 완료:', { original: allOrders.length, grouped: groupedOrders.length })

      setOrders(groupedOrders)
      setSelectedOrders([]) // 체크박스 초기화
      setLoading(false)
    } catch (error) {
      console.error('주문 로딩 오류:', error)
      toast.error('주문 목록을 불러오는데 실패했습니다')
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
        장바구니
      </span>
    )
  }

  const getPaymentMethodDisplay = (method) => {
    const methodMap = {
      cart: {
        text: '장바구니',
        icon: BanknotesIcon,
        color: 'text-indigo-700'
      },
      bank_transfer: {
        text: '계좌이체',
        icon: BanknotesIcon,
        color: 'text-cyan-700'
      },
      card: {
        text: '카드결제',
        icon: CreditCardIcon,
        color: 'text-emerald-700'
      }
    }
    return methodMap[method] || {
      text: method || '결제방법 미정',
      icon: BanknotesIcon,
      color: 'text-slate-600'
    }
  }

  if (authLoading || loading) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🛒 장바구니</h1>
          <p className="text-sm text-gray-600 mt-1">
            총 {filteredOrders.length}건의 장바구니 주문
            {dateRange !== 'all' && (
              <span className="ml-2 text-xs text-blue-600">
                💡 {dateRange === 'today' ? '오늘' : dateRange === 'yesterday' ? '어제' : dateRange === 'week' ? '1주일' : dateRange === 'month' ? '1개월' : '선택한 기간'}
              </span>
            )}
            {selectedOrders.length > 0 && (
              <span className="ml-2 text-sm font-medium text-blue-600">
                | 선택됨 {selectedOrders.length}개
              </span>
            )}
          </p>
        </div>

        {/* 일괄 작업 버튼 */}
        <div className="flex items-center gap-2">
          {selectedOrders.length > 0 && (
            <button
              onClick={handleBulkCancel}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <XMarkIcon className="w-4 h-4" />
              일괄 취소 ({selectedOrders.length})
            </button>
          )}
          {/* 새로고침 버튼 */}
          <button
            onClick={() => loadOrders()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 📅 Date Range Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">📅 조회 기간:</span>
          {[
            { id: 'today', label: '오늘', desc: '가장 빠름' },
            { id: 'yesterday', label: '어제', desc: '어제 주문' },
            { id: 'week', label: '1주일', desc: '최근 7일' },
            { id: 'month', label: '1개월', desc: '최근 30일' },
            { id: 'all', label: '전체', desc: '최근 2만건' }
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setDateRange(range.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === range.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={range.desc}
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
            title="기간 직접 선택"
          >
            📆 기간 선택
          </button>
        </div>

        {/* 📆 Custom Date Range Picker */}
        {dateRange === 'custom' && (
          <div className="mt-3 pt-3 border-t border-gray-200">
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
              <button
                onClick={() => loadOrders()}
                disabled={!customStartDate}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  customStartDate
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                조회
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="주문번호, 고객명, 닉네임, 입금자명, 상품명으로 실시간 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="date_desc">📅 날짜순 (최신순)</option>
              <option value="date_asc">📅 날짜순 (오래된순)</option>
              <option value="amount_desc">💰 금액순 (높은순)</option>
              <option value="amount_asc">💰 금액순 (낮은순)</option>
              <option value="customer_asc">👤 고객명순 (가나다)</option>
              <option value="customer_desc">👤 고객명순 (역순)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders - 데스크톱 테이블 + 모바일 카드 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* 데스크톱 테이블 뷰 */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length > 0 && selectedOrders.length === filteredOrders.flatMap(o => o.isGroup ? o.originalOrders.map(oo => oo.id) : [o.id]).length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주문정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  결제정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order, index) => {
                const orderIds = order.isGroup ? order.originalOrders.map(o => o.id) : [order.id]
                const isSelected = orderIds.every(id => selectedOrders.includes(id))

                return (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const allSelected = orderIds.every(id => selectedOrders.includes(id))
                        if (allSelected) {
                          setSelectedOrders(prev => prev.filter(id => !orderIds.includes(id)))
                        } else {
                          setSelectedOrders(prev => [...new Set([...prev, ...orderIds])])
                        }
                      }}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {order.customer_order_number || order.id.slice(-8)}
                        {order.isGroup && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                            그룹결제
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(() => {
                          const groupedItems = groupOrderItems(order.items)
                          const totalQuantity = groupedItems.reduce((sum, item) => sum + item.quantity, 0)
                          const uniqueProducts = groupedItems.length

                          if (order.isGroup) {
                            return `${order.groupOrderCount}개 주문 일괄결제 (총 ${uniqueProducts}종 ${totalQuantity}개)`
                          } else if (uniqueProducts === 1) {
                            return `${totalQuantity}개`
                          } else {
                            return `${uniqueProducts}종 ${totalQuantity}개`
                          }
                        })()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {order.userName || order.shipping?.name || '정보없음'}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <AtSymbolIcon className="w-3 h-3" />
                        {order.userNickname && order.userNickname !== '정보없음' ? order.userNickname : (order.shipping?.name || '익명')}
                      </div>
                      {order.payment?.depositor_name && (
                        <div className="text-xs font-semibold text-blue-600">
                          💳 {order.payment.depositor_name}
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        {order.shipping?.phone || ''}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        <div>
                          <div>₩{order.totalPrice.toLocaleString()}</div>
                          {order.discount_amount > 0 && (
                            <div className="text-xs text-blue-600 mt-0.5">
                              (쿠폰 -₩{order.discount_amount.toLocaleString()})
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
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
                      <div className="mt-1">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        const targetId = order.isGroup ? order.originalOrders[0]?.id : order.id
                        router.push(`/admin/orders/${targetId}`)
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                      title={order.isGroup ? "그룹 주문 상세보기" : "상세보기"}
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 뷰 */}
        <div className="lg:hidden">
          {/* 모바일 전체 선택 헤더 */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedOrders.length > 0 && selectedOrders.length === filteredOrders.flatMap(o => o.isGroup ? o.originalOrders.map(oo => oo.id) : [o.id]).length}
              onChange={handleSelectAll}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="text-sm font-medium text-gray-700">전체 선택</span>
            {selectedOrders.length > 0 && (
              <span className="text-sm text-blue-600">
                ({selectedOrders.length}개 선택됨)
              </span>
            )}
          </div>

          {/* 카드 목록 */}
          <div className="divide-y divide-gray-200">
          {filteredOrders.map((order, index) => {
            const groupedItems = groupOrderItems(order.items)
            const totalQuantity = groupedItems.reduce((sum, item) => sum + item.quantity, 0)
            const uniqueProducts = groupedItems.length
            const orderIds = order.isGroup ? order.originalOrders.map(o => o.id) : [order.id]
            const isSelected = orderIds.every(id => selectedOrders.includes(id))

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-gray-50"
              >
                {/* 상단: 체크박스 + 주문번호 + 상태 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    {/* 체크박스 */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const allSelected = orderIds.every(id => selectedOrders.includes(id))
                        if (allSelected) {
                          setSelectedOrders(prev => prev.filter(id => !orderIds.includes(id)))
                        } else {
                          setSelectedOrders(prev => [...new Set([...prev, ...orderIds])])
                        }
                      }}
                      className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                  <div>
                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      {order.customer_order_number || order.id.slice(-8)}
                      {order.isGroup && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          그룹결제
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* 중단: 고객정보 + 금액 */}
                <div className="mb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {order.userName || order.shipping?.name || '정보없음'}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">
                        ₩{order.totalPrice.toLocaleString()}
                      </div>
                      {order.discount_amount > 0 && (
                        <div className="text-xs text-blue-600">
                          (쿠폰 -₩{order.discount_amount.toLocaleString()})
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {order.userNickname && order.userNickname !== '정보없음' ? order.userNickname : (order.shipping?.name || '익명')}
                  </div>
                  {order.payment?.depositor_name && (
                    <div className="text-xs font-semibold text-blue-600">
                      💳 {order.payment.depositor_name}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {order.isGroup
                      ? `${order.groupOrderCount}개 주문 일괄결제 (총 ${uniqueProducts}종 ${totalQuantity}개)`
                      : uniqueProducts === 1
                        ? `${totalQuantity}개`
                        : `${uniqueProducts}종 ${totalQuantity}개`
                    }
                  </div>
                </div>

                {/* 하단: 상세보기 버튼 */}
                <div className="pt-3 border-t border-gray-100">
                  <button
                    onClick={() => {
                      const targetId = order.isGroup ? order.originalOrders[0]?.id : order.id
                      router.push(`/admin/orders/${targetId}`)
                    }}
                    className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium"
                  >
                    <EyeIcon className="w-4 h-4" />
                    상세보기
                  </button>
                </div>
              </motion.div>
            )
          })}
          </div>
        </div>

        {filteredOrders.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">조건에 맞는 장바구니 주문이 없습니다.</p>
          </div>
        )}
      </div>

    </div>
  )
}
