'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  CreditCardIcon,
  BanknotesIcon,
  AtSymbolIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { formatShippingInfo } from '@/lib/shippingUtils'
import { OrderCalculations } from '@/lib/orderCalculations'
import { getTrackingUrl, getCarrierName } from '@/lib/trackingNumberUtils'
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

export default function AdminOrdersPage() {
  const router = useRouter()
  const { adminUser, loading: authLoading } = useAdminAuth()
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    verifying: 0,
    paid: 0,
    delivered: 0
  })
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState(null)
  const ITEMS_PER_PAGE = 200 // 100 → 200 (2배 증가)
  const SEARCH_ITEMS_PER_PAGE = 5000 // 검색 시 충분한 데이터 확보 (500 → 5000)

  const filterOrders = () => {
    let filtered = [...orders]

    // 결제 방법 필터
    if (paymentFilter === 'all') {
      // '장바구니' 탭 - pending 상태만 표시
      filtered = filtered.filter(order =>
        order.status === 'pending'
      )
    } else if (paymentFilter === 'verifying') {
      // '주문내역' 탭 - verifying 상태 모두 표시 (결제 방법 구분 없음)
      filtered = filtered.filter(order => order.status === 'verifying')
    } else if (paymentFilter === 'paid') {
      filtered = filtered.filter(order => order.status === 'paid')
    } else if (paymentFilter === 'delivered') {
      filtered = filtered.filter(order => order.status === 'delivered')
    }

    // 상태 필터 (기존)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    // ⚡ 검색어 필터 (서버: 주문번호/ID/카카오ID, 프론트: 고객명/입금자명/상품명/전화번호)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()

      // ✅ 성능 최적화: 서버에서 이미 주문번호/ID/카카오ID로 필터링됨
      // 프론트에서는 추가 필드만 체크 (고객명, 입금자명, 상품명, 전화번호)
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

    setFilteredOrders(filtered)
  }

  useEffect(() => {
    if (adminUser?.email) {
      loadOrders(true) // 초기 로딩
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser])

  useEffect(() => {
    filterOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, searchTerm, statusFilter, paymentFilter])

  // 필터 변경 시 초기화
  useEffect(() => {
    setOrders([])
    setOffset(0)
    setHasMore(true)
    if (adminUser?.email) {
      loadOrders(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, paymentFilter])

  // 스크롤 이벤트 핸들러 (검색 모드에서는 비활성화)
  useEffect(() => {
    if (isSearchMode) return // 검색 중에는 자동 스크롤 비활성화

    const handleScroll = () => {
      if (loading || loadingMore || !hasMore) return

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = document.documentElement.clientHeight

      // 페이지 하단에 도달 (200px 여유)
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadOrders(false, searchTerm)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadingMore, hasMore, offset, isSearchMode])

  const loadOrders = async (isInitial = false, search = '') => {
    try {
      if (isInitial) {
        setLoading(true)
        setOffset(0)
      } else {
        setLoadingMore(true)
      }

      if (!adminUser?.email) {
        console.error('관리자 이메일이 없습니다')
        setLoading(false)
        return
      }

      const currentOffset = isInitial ? 0 : offset
      const currentLimit = search ? SEARCH_ITEMS_PER_PAGE : ITEMS_PER_PAGE

      // Service Role API 호출 (페이지네이션 + 검색)
      let url = `/api/admin/orders?adminEmail=${encodeURIComponent(adminUser.email)}&limit=${currentLimit}&offset=${currentOffset}`
      if (search) {
        url += `&search=${encodeURIComponent(search)}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '주문 조회 실패')
      }

      const { orders: rawOrders, hasMore: moreData, statusCounts: counts } = await response.json()

      // ✅ 상태별 전체 카운트 저장 (처음 로딩 시에만)
      if (isInitial && counts) {
        setStatusCounts(counts)
      }

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
          totalPrice: order.total_amount || 0,  // ⭐ total_price → total_amount (DB 실제 컬럼명)
          customer_order_number: order.customer_order_number,
          created_at: order.created_at,
          deposited_at: order.deposited_at,
          shipped_at: order.shipped_at,
          delivered_at: order.delivered_at,
          order_type: order.order_type,
          payment_group_id: order.payment_group_id || null,  // ⭐ 일괄결제 그룹 ID
          discount_amount: order.discount_amount || 0,
          is_free_shipping: order.is_free_shipping || false,  // ✅ 무료배송 플래그
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
            shipping_fee: shipping.shipping_fee || 0  // ⭐ 배송비 추가
          },
          payment: {
            method: payment.method,
            depositor_name: payment.depositor_name,
            amount: payment.amount
          }
        }
      })

      console.log('API에서 가져온 주문 데이터:', allOrders.length, '개')

      // ⭐ 그룹핑 적용
      const groupedOrders = groupOrdersByPaymentGroupId(allOrders)
      console.log('✅ 그룹핑 완료:', { original: allOrders.length, grouped: groupedOrders.length })

      if (isInitial) {
        setOrders(groupedOrders)
      } else {
        setOrders(prev => [...prev, ...groupedOrders])
      }

      setHasMore(moreData)
      setOffset(currentOffset + ITEMS_PER_PAGE)
      setLoading(false)
      setLoadingMore(false)
    } catch (error) {
      console.error('주문 로딩 오류:', error)
      toast.error('주문 목록을 불러오는데 실패했습니다')
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // API Route 호출 (Clean Architecture)
      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: [orderId],
          status: newStatus
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '주문 상태 변경 실패')
      }

      // UI 업데이트
      const updatedOrders = orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
      setOrders(updatedOrders)

      toast.success('주문 상태가 변경되었습니다')
    } catch (error) {
      console.error('주문 상태 변경 오류:', error)
      toast.error('상태 변경에 실패했습니다')
      // 실패 시 데이터 다시 로드
      loadOrders()
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: '장바구니', color: 'bg-yellow-100 text-yellow-800' },
      verifying: { label: '주문내역', color: 'bg-purple-100 text-purple-800' },
      paid: { label: '구매확정', color: 'bg-blue-100 text-blue-800' },
      delivered: { label: '출고정보', color: 'bg-green-100 text-green-800' },
      cancelled: { label: '취소됨', color: 'bg-red-100 text-red-800' }
    }
    const statusInfo = statusMap[status] || statusMap.pending
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  const getPaymentMethodDisplay = (method) => {
    const methodMap = {
      cart: {
        text: '장바구니',
        icon: BanknotesIcon,
        color: 'text-indigo-700' // 진한 남색
      },
      bank_transfer: {
        text: '계좌이체',
        icon: BanknotesIcon,
        color: 'text-cyan-700' // 진한 시안
      },
      card: {
        text: '카드결제',
        icon: CreditCardIcon,
        color: 'text-emerald-700' // 진한 에메랄드
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
          <h1 className="text-2xl font-bold text-gray-900">📦 주문 관리</h1>
          <p className="text-sm text-gray-600 mt-1">
            총 {statusCounts.pending + statusCounts.verifying + statusCounts.paid + statusCounts.delivered}건 | 장바구니 {statusCounts.pending}건 | 주문내역 {statusCounts.verifying}건 | 구매확정 {statusCounts.paid}건 | 출고정보 {statusCounts.delivered}건
          </p>
        </div>
        <button
          onClick={() => {
            setOrders([])
            setOffset(0)
            setHasMore(true)
            loadOrders(true)
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* Payment Method Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {[
            {
              id: 'all',
              label: '장바구니',
              count: statusCounts.pending
            },
            {
              id: 'verifying',
              label: '주문내역',
              count: statusCounts.verifying
            },
            { id: 'paid', label: '구매확정', count: statusCounts.paid },
            { id: 'delivered', label: '출고정보', count: statusCounts.delivered }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPaymentFilter(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                paymentFilter === tab.id
                  ? 'border-red-500 text-red-600 bg-red-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                paymentFilter === tab.id
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="주문번호, 고객명, 닉네임, 입금자명, 상품명으로 검색..."
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value
                setSearchTerm(value)

                // 이전 타이머 취소
                if (searchTimeout) {
                  clearTimeout(searchTimeout)
                }

                // 500ms 후에 검색 실행 (debounce)
                const timeout = setTimeout(() => {
                  // 검색어가 있으면 검색 모드, 없으면 일반 모드
                  if (value.trim()) {
                    setIsSearchMode(true)
                    setOrders([])
                    setOffset(0)
                    setHasMore(true)
                    loadOrders(true, value)
                  } else {
                    setIsSearchMode(false)
                    setOrders([])
                    setOffset(0)
                    setHasMore(true)
                    loadOrders(true, '')
                  }
                }, 500)

                setSearchTimeout(timeout)
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {/* 검색 결과 표시 */}
            {isSearchMode && searchTerm && (
              <div className="absolute left-0 top-full mt-2 text-sm">
                <span className="text-gray-600">
                  검색 결과: <span className="font-semibold text-red-600">{filteredOrders.length}건</span>
                  {orders.length > 0 && (
                    <span className="text-gray-500 ml-2">
                      (전체 {orders.length}건 중 필터링)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">모든 상태</option>
              <option value="pending">장바구니</option>
              <option value="verifying">주문내역</option>
              <option value="paid">구매확정</option>
              <option value="delivered">출고정보</option>
              <option value="cancelled">취소됨</option>
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
              {filteredOrders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
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
                        {order.updated_at && order.updated_at !== order.created_at ? (
                          <span className="text-blue-600 font-medium">
                            {new Date(order.updated_at).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </span>
                        ) : (
                          new Date(order.created_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(() => {
                          // ⭐ 사용자 화면과 동일: 그룹핑 후 수량 계산
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
                      {/* 송장번호 표시 (발송완료 상태) */}
                      {order.status === 'delivered' && order.shipping?.tracking_number && (
                        <div className="text-xs text-gray-500 mt-1">
                          <a
                            href={getTrackingUrl(order.shipping?.tracking_company, order.shipping?.tracking_number)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {getCarrierName(order.shipping?.tracking_company)} {order.shipping.tracking_number}
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {order.userName || order.shipping?.name || '정보없음'}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <AtSymbolIcon className="w-3 h-3" />
                        {order.userNickname && order.userNickname !== '정보없음' ? order.userNickname : (order.shipping?.name || order.userId?.split('-').pop()?.substring(0, 8) || '익명')}
                      </div>
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
                          // 결제대기 상태에서는 아직 결제방법이 정해지지 않았음을 명시
                          if (order.status === 'pending') {
                            return (
                              <>
                                <BanknotesIcon className="w-3 h-3 text-orange-600" />
                                <span className="text-xs font-medium text-orange-600">
                                  결제 대기중
                                </span>
                              </>
                            )
                          }

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
                    <div className="flex items-center gap-2">
                      {/* 취소 버튼 - 맨 왼쪽 (실수 방지) */}
                      {(order.status === 'pending' || order.status === 'verifying' || order.status === 'paid') && (
                        <button
                          onClick={() => {
                            const confirmMessage = order.isGroup
                              ? `이 그룹 주문(${order.groupOrderCount}개)을 취소하시겠습니까?`
                              : '이 주문을 취소하시겠습니까?'

                            if (window.confirm(confirmMessage)) {
                              if (order.isGroup) {
                                // 그룹 주문인 경우 모든 원본 주문 취소
                                const orderIds = order.originalOrders.map(o => o.id)
                                Promise.all(orderIds.map(id => updateOrderStatus(id, 'cancelled')))
                                  .then(() => loadOrders(true))
                                  .catch(error => console.error('그룹 주문 취소 실패:', error))
                              } else {
                                updateOrderStatus(order.id, 'cancelled')
                              }
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title={order.isGroup ? "그룹 주문 취소" : "주문 취소"}
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          // 그룹 주문인 경우 첫 번째 원본 주문으로 이동
                          const targetId = order.isGroup ? order.originalOrders[0]?.id : order.id
                          router.push(`/admin/orders/${targetId}`)
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                        title={order.isGroup ? "그룹 주문 상세보기" : "상세보기"}
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>

                      {order.status === 'verifying' && (
                        <button
                          onClick={() => {
                            if (order.isGroup) {
                              // 그룹 주문인 경우 모든 원본 주문 상태 변경
                              const orderIds = order.originalOrders.map(o => o.id)
                              Promise.all(orderIds.map(id => updateOrderStatus(id, 'paid')))
                                .then(() => loadOrders(true))
                                .catch(error => console.error('그룹 주문 상태 변경 실패:', error))
                            } else {
                              updateOrderStatus(order.id, 'paid')
                            }
                          }}
                          className="text-green-600 hover:text-green-900"
                          title={order.isGroup ? "그룹 결제 확인" : "결제 확인"}
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                      )}

                      {order.status === 'paid' && (
                        <button
                          onClick={() => {
                            if (order.isGroup) {
                              // 그룹 주문인 경우 모든 원본 주문 상태 변경
                              const orderIds = order.originalOrders.map(o => o.id)
                              Promise.all(orderIds.map(id => updateOrderStatus(id, 'delivered')))
                                .then(() => loadOrders(true))
                                .catch(error => console.error('그룹 주문 발송 처리 실패:', error))
                            } else {
                              updateOrderStatus(order.id, 'delivered')
                            }
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title={order.isGroup ? "그룹 발송 처리" : "발송 처리"}
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 뷰 */}
        <div className="lg:hidden divide-y divide-gray-200">
          {filteredOrders.map((order, index) => {
            // ⭐ 그룹핑 후 수량 계산
            const groupedItems = groupOrderItems(order.items)
            const totalQuantity = groupedItems.reduce((sum, item) => sum + item.quantity, 0)
            const uniqueProducts = groupedItems.length

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-gray-50"
              >
                {/* 상단: 주문번호 + 상태 */}
                <div className="flex items-center justify-between mb-3">
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
                  <div className="text-xs text-gray-500">
                    {order.isGroup
                      ? `${order.groupOrderCount}개 주문 일괄결제 (총 ${uniqueProducts}종 ${totalQuantity}개)`
                      : uniqueProducts === 1
                        ? `${totalQuantity}개`
                        : `${uniqueProducts}종 ${totalQuantity}개`
                    }
                  </div>
                </div>

                {/* 송장번호 표시 (발송완료 상태인 경우) */}
                {order.status === 'delivered' && order.shipping?.tracking_number && (
                  <div className="mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <div className="text-gray-600 mb-0.5">배송조회</div>
                        <div className="font-medium text-gray-900">
                          {getCarrierName(order.shipping?.tracking_company)}
                        </div>
                      </div>
                      <a
                        href={getTrackingUrl(order.shipping?.tracking_company, order.shipping?.tracking_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono"
                      >
                        {order.shipping.tracking_number}
                      </a>
                    </div>
                  </div>
                )}

                {/* 하단: 버튼들 (취소 버튼 최좌측 배치) */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  {/* 취소 버튼 - 맨 왼쪽 (실수 클릭 방지) */}
                  {(order.status === 'pending' || order.status === 'verifying' || order.status === 'paid') && (
                    <button
                      onClick={() => {
                        const confirmMessage = order.isGroup
                          ? `이 그룹 주문(${order.groupOrderCount}개)을 취소하시겠습니까?`
                          : '이 주문을 취소하시겠습니까?'

                        if (window.confirm(confirmMessage)) {
                          if (order.isGroup) {
                            const orderIds = order.originalOrders.map(o => o.id)
                            Promise.all(orderIds.map(id => updateOrderStatus(id, 'cancelled')))
                              .then(() => loadOrders(true))
                              .catch(error => console.error('그룹 주문 취소 실패:', error))
                          } else {
                            updateOrderStatus(order.id, 'cancelled')
                          }
                        }
                      }}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      취소
                    </button>
                  )}

                  {/* 상세보기 버튼 */}
                  <button
                    onClick={() => {
                      const targetId = order.isGroup ? order.originalOrders[0]?.id : order.id
                      router.push(`/admin/orders/${targetId}`)
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium"
                  >
                    <EyeIcon className="w-4 h-4" />
                    상세보기
                  </button>

                  {/* 결제확인 버튼 */}
                  {order.status === 'verifying' && (
                    <button
                      onClick={() => {
                        if (order.isGroup) {
                          const orderIds = order.originalOrders.map(o => o.id)
                          Promise.all(orderIds.map(id => updateOrderStatus(id, 'paid')))
                            .then(() => loadOrders(true))
                            .catch(error => console.error('그룹 주문 상태 변경 실패:', error))
                        } else {
                          updateOrderStatus(order.id, 'paid')
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm font-medium"
                    >
                      <CheckIcon className="w-4 h-4" />
                      결제확인
                    </button>
                  )}

                  {/* 발송처리 버튼 */}
                  {order.status === 'paid' && (
                    <button
                      onClick={() => {
                        if (order.isGroup) {
                          const orderIds = order.originalOrders.map(o => o.id)
                          Promise.all(orderIds.map(id => updateOrderStatus(id, 'delivered')))
                            .then(() => loadOrders(true))
                            .catch(error => console.error('그룹 주문 발송 처리 실패:', error))
                        } else {
                          updateOrderStatus(order.id, 'delivered')
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
                    >
                      <CheckIcon className="w-4 h-4" />
                      발송처리
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {filteredOrders.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">조건에 맞는 주문이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 로딩 인디케이터 */}
      {loadingMore && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          <span className="ml-3 text-gray-600">추가 주문 불러오는 중...</span>
        </div>
      )}

      {/* 더보기 버튼 (모바일 UX) */}
      {!loading && !loadingMore && hasMore && filteredOrders.length > 0 && (
        <div className="flex justify-center py-6">
          <button
            onClick={() => loadOrders(false, searchTerm)}
            className="px-6 py-3 bg-white border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
          >
            더 보기 ({orders.length}건 로드됨)
            {isSearchMode && <span className="ml-2 text-xs">(검색 중)</span>}
          </button>
        </div>
      )}

      {/* 모든 데이터 로드 완료 */}
      {!loading && !hasMore && filteredOrders.length > 0 && (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">모든 주문을 불러왔습니다.</p>
        </div>
      )}
    </div>
  )
}