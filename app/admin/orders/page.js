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
import { getAllOrders } from '@/lib/supabaseApi'

export default function AdminOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilter, paymentFilter])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const allOrders = await getAllOrders()
      console.log('Supabase에서 가져온 주문 데이터:', allOrders.map(order => ({
        id: order.id,
        userId: order.userId,
        userName: order.userName,
        userNickname: order.userNickname,
        shipping: order.shipping
      })))
      setOrders(allOrders)
      setLoading(false)
    } catch (error) {
      console.error('주문 로딩 오류:', error)
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = [...orders]

    // 결제 방법 필터
    if (paymentFilter !== 'all') {
      if (paymentFilter === 'paid') {
        filtered = filtered.filter(order => order.status === 'paid')
      } else if (paymentFilter === 'delivered') {
        filtered = filtered.filter(order => order.status === 'delivered')
      } else {
        // 계좌이체/카드결제 탭은 결제확인중 상태만 표시
        filtered = filtered.filter(order =>
          order.payment?.method === paymentFilter &&
          (order.status === 'pending' || order.status === 'verifying')
        )
      }
    }

    // 상태 필터 (기존)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.shipping?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredOrders(filtered)
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // Supabase로 직접 상태 업데이트
      const { updateOrderStatus: updateStatus } = await import('@/lib/supabaseApi')
      await updateStatus(orderId, newStatus)

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
      pending: { label: '결제대기', color: 'bg-yellow-100 text-yellow-800' },
      verifying: { label: '결제확인중', color: 'bg-purple-100 text-purple-800' },
      paid: { label: '결제완료', color: 'bg-blue-100 text-blue-800' },
      delivered: { label: '발송완료', color: 'bg-green-100 text-green-800' },
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
      text: method,
      icon: BanknotesIcon,
      color: 'text-slate-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">주문 관리</h1>
          <p className="text-gray-600">총 {orders.length}건의 주문</p>
        </div>
        <button
          onClick={loadOrders}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* Payment Method Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {[
            { id: 'all', label: '전체', count: orders.length },
            {
              id: 'bank_transfer',
              label: '계좌이체',
              count: orders.filter(o =>
                o.payment?.method === 'bank_transfer' &&
                (o.status === 'pending' || o.status === 'verifying')
              ).length
            },
            {
              id: 'card',
              label: '카드결제',
              count: orders.filter(o =>
                o.payment?.method === 'card' &&
                (o.status === 'pending' || o.status === 'verifying')
              ).length
            },
            { id: 'paid', label: '결제완료', count: orders.filter(o => o.status === 'paid').length },
            { id: 'delivered', label: '발송완료', count: orders.filter(o => o.status === 'delivered').length }
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
              placeholder="주문번호, 고객명, 상품명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
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
              <option value="pending">결제대기</option>
              <option value="verifying">결제확인중</option>
              <option value="paid">결제완료</option>
              <option value="delivered">발송완료</option>
              <option value="cancelled">취소됨</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
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
                  상태
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
                      <div className="text-sm font-medium text-gray-900">
                        {order.id.slice(-8)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString('ko-KR')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(() => {
                          const totalQuantity = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
                          const uniqueProducts = order.items.length

                          if (uniqueProducts === 1) {
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
                        {order.userNickname && order.userNickname !== '정보없음' ? order.userNickname : (order.shipping?.recipient_name || order.userId?.split('-').pop()?.substring(0, 8) || '익명')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.shipping?.phone || ''}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        ₩{order.payment?.amount?.toLocaleString() || '0'}
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
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="상세보기"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>

                      {order.status === 'verifying' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'paid')}
                          className="text-green-600 hover:text-green-900"
                          title="결제 확인"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                      )}

                      {order.status === 'paid' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                          className="text-blue-600 hover:text-blue-900"
                          title="발송 처리"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                      )}

                      {(order.status === 'pending' || order.status === 'verifying') && (
                        <button
                          onClick={() => {
                            if (window.confirm('이 주문을 취소하시겠습니까?')) {
                              updateOrderStatus(order.id, 'cancelled')
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="주문 취소"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">조건에 맞는 주문이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}