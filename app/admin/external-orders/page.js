'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  CalendarIcon,
  CubeIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'
import toast from 'react-hot-toast'

export default function ExternalOrdersPage() {
  const router = useRouter()
  const { adminUser, loading: authLoading } = useAdminAuth()
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [selectedOrders, setSelectedOrders] = useState([])
  const [loading, setLoading] = useState(false)

  // 필터 상태
  const [dateRange, setDateRange] = useState('week')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('verifying')

  useEffect(() => {
    if (!authLoading && adminUser?.email) {
      loadOrders()
    } else if (!authLoading && !adminUser) {
      toast.error('관리자 권한이 필요합니다')
      router.push('/admin/login')
    }
  }, [authLoading, adminUser])

  const loadOrders = async () => {
    try {
      setLoading(true)

      if (!adminUser?.email) return

      // API 호출 (날짜 + 상태 필터)
      let url = `/api/admin/orders?adminEmail=${encodeURIComponent(adminUser.email)}&status=${statusFilter}&dateRange=${dateRange}`

      if (dateRange === 'custom') {
        if (startDate) url += `&startDate=${startDate}`
        if (endDate) url += `&endDate=${endDate}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('주문 조회 실패')
      }

      const { orders: rawOrders } = await response.json()

      // 데이터 포맷팅
      const formattedOrders = rawOrders.map(order => ({
        id: order.id,
        customer_order_number: order.customer_order_number,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
        userName: order.userProfile?.name || order.order_shipping?.[0]?.name || '정보없음',
        userPhone: order.userProfile?.phone || order.order_shipping?.[0]?.phone || '',
        shipping: order.order_shipping?.[0] || {},
        payment: order.order_payments?.[0] || {},
        items: order.order_items?.map(item => ({
          product_number: item.products?.product_number || '',
          supplier_product_code: item.products?.supplier_product_code || '',
          title: item.title || item.products?.title || '상품명 없음',
          quantity: item.quantity || 1,
          price: item.price || item.unit_price || 0,
          options: item.product_variants?.variant_option_values?.map(v =>
            v.product_option_values?.value
          ).filter(Boolean).join(', ') || ''
        })) || []
      }))

      setOrders(formattedOrders)
      setFilteredOrders(formattedOrders)
      setLoading(false)
    } catch (error) {
      console.error('주문 조회 오류:', error)
      toast.error('주문 데이터를 불러오는데 실패했습니다')
      setLoading(false)
    }
  }

  // 제품 필터링
  useEffect(() => {
    if (!productFilter) {
      setFilteredOrders(orders)
      return
    }

    const filtered = orders.filter(order =>
      order.items.some(item =>
        item.product_number?.toLowerCase().includes(productFilter.toLowerCase()) ||
        item.title?.toLowerCase().includes(productFilter.toLowerCase())
      )
    )

    setFilteredOrders(filtered)
  }, [productFilter, orders])

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id))
    }
  }

  // 개별 선택/해제
  const toggleSelectOrder = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId))
    } else {
      setSelectedOrders([...selectedOrders, orderId])
    }
  }

  // 엑셀 다운로드
  const downloadExcel = () => {
    if (selectedOrders.length === 0) {
      toast.error('다운로드할 주문을 선택해주세요')
      return
    }

    const selectedData = filteredOrders.filter(o => selectedOrders.includes(o.id))

    // CSV 생성
    let csv = '\uFEFF' // UTF-8 BOM
    csv += '주문번호,주문일자,고객명,전화번호,우편번호,주소,상세주소,제품번호,업체제품코드,제품명,옵션,수량,단가,금액,배송메모\n'

    selectedData.forEach(order => {
      order.items.forEach(item => {
        const row = [
          order.customer_order_number,
          new Date(order.created_at).toLocaleDateString('ko-KR'),
          order.userName,
          order.userPhone,
          order.shipping?.postal_code || '',
          order.shipping?.address || '',
          order.shipping?.detail_address || '',
          item.product_number,
          item.supplier_product_code,
          item.title,
          item.options,
          item.quantity,
          item.price,
          item.price * item.quantity,
          order.shipping?.memo || ''
        ].map(field => `"${field}"`).join(',')

        csv += row + '\n'
      })
    })

    // 다운로드
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `외부업체_주문_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`${selectedOrders.length}건의 주문을 다운로드했습니다`)
  }

  // 배송완료 처리
  const markAsDelivered = async () => {
    if (selectedOrders.length === 0) {
      toast.error('처리할 주문을 선택해주세요')
      return
    }

    if (!confirm(`선택된 ${selectedOrders.length}건의 주문을 배송완료 처리하시겠습니까?`)) {
      return
    }

    try {
      const { updateOrderStatus } = await import('@/lib/supabaseApi')

      await Promise.all(
        selectedOrders.map(orderId => updateOrderStatus(orderId, 'delivered'))
      )

      toast.success(`${selectedOrders.length}건의 주문이 배송완료 처리되었습니다`)

      // 선택 초기화 및 재로드
      setSelectedOrders([])
      loadOrders()
    } catch (error) {
      console.error('배송완료 처리 오류:', error)
      toast.error('배송완료 처리에 실패했습니다')
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { label: '결제대기', color: 'bg-yellow-100 text-yellow-800' },
      'verifying': { label: '입금확인', color: 'bg-blue-100 text-blue-800' },
      'paid': { label: '구매확정', color: 'bg-green-100 text-green-800' },
      'delivered': { label: '배송완료', color: 'bg-purple-100 text-purple-800' },
      'cancelled': { label: '취소', color: 'bg-red-100 text-red-800' }
    }
    const badge = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  if (authLoading || !adminUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/orders')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">외부업체 주문 추출</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            외부업체로 전달할 주문을 선택하고 엑셀로 다운로드하세요
          </p>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">필터</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 날짜 범위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="w-4 h-4 inline mr-1" />
              날짜 범위
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="today">오늘</option>
              <option value="yesterday">어제</option>
              <option value="week">1주일</option>
              <option value="month">1개월</option>
              <option value="custom">기간 선택</option>
            </select>
          </div>

          {/* 커스텀 날짜 */}
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">시작일</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">종료일</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* 제품 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CubeIcon className="w-4 h-4 inline mr-1" />
              제품 검색
            </label>
            <input
              type="text"
              placeholder="제품번호 또는 제품명"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* 주문 상태 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">주문 상태</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="verifying">입금확인</option>
              <option value="paid">구매확정</option>
              <option value="pending">결제대기</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={loadOrders}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
            {loading ? '검색 중...' : '검색'}
          </button>
        </div>
      </div>

      {/* 결과 및 액션 버튼 */}
      {!loading && filteredOrders.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedOrders.length === filteredOrders.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  전체 선택 ({selectedOrders.length}/{filteredOrders.length})
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={downloadExcel}
                disabled={selectedOrders.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                엑셀 다운로드 ({selectedOrders.length}건)
              </button>

              <button
                onClick={markAsDelivered}
                disabled={selectedOrders.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircleIcon className="w-5 h-5" />
                배송완료 처리 ({selectedOrders.length}건)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 주문 리스트 */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">주문 조회 중...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">조건에 맞는 주문이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* 체크박스 */}
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(order.id)}
                    onChange={() => toggleSelectOrder(order.id)}
                    className="mt-1 w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />

                  {/* 주문 정보 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-900">{order.customer_order_number}</span>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <div>👤 {order.userName} / 📞 {order.userPhone}</div>
                      <div>📍 {order.shipping?.address}</div>

                      {/* 상품 목록 */}
                      <div className="mt-2 space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs bg-gray-50 p-2 rounded">
                            <span className="font-medium text-blue-600">{item.product_number}</span>
                            {item.supplier_product_code && (
                              <span className="font-mono text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                                {item.supplier_product_code}
                              </span>
                            )}
                            <span>{item.title}</span>
                            {item.options && <span className="text-gray-500">({item.options})</span>}
                            <span className="text-gray-500">x {item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-500">
                      주문일: {new Date(order.created_at).toLocaleString('ko-KR')}
                    </div>
                  </div>

                  {/* 금액 */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      ₩{order.total_amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
