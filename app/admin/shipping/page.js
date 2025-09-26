'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  TruckIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChatBubbleLeftRightIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function AdminShippingPage() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('pending') // pending, completed
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState([])

  useEffect(() => {
    loadPaidOrders()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, activeTab])

  const loadPaidOrders = async () => {
    try {
      setLoading(true)

      // DB에서 결제 완료된 주문들 가져오기
      const { getAllOrders } = await import('@/lib/supabaseApi')
      const allOrders = await getAllOrders()

      // 결제완료, 배송중, 배송완료 주문만 필터링
      const paidOrders = allOrders.filter(order =>
        order.status === 'paid' || order.status === 'shipping' || order.status === 'delivered'
      )

      const ordersWithUserInfo = paidOrders.map(order => {
        const shipping = order.order_shipping?.[0] || order.order_shipping || {}
        return {
          ...order,
          user: {
            name: shipping?.name || order.userName || '정보없음',
            phone: shipping?.phone || '정보없음'
          }
        }
      })

      // 최신 주문부터 정렬
      ordersWithUserInfo.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setOrders(ordersWithUserInfo)
      console.log('결제 완료 주문:', ordersWithUserInfo)

      // G250926-0827 주문 디버깅
      const targetOrder = ordersWithUserInfo.find(order =>
        order.customer_order_number === 'G250926-0827'
      )
      if (targetOrder) {
        console.log('🔍 G250926-0827 주문 상세 분석:', {
          id: targetOrder.id,
          customer_order_number: targetOrder.customer_order_number,
          user: targetOrder.user,
          order_shipping: targetOrder.order_shipping,
          order_items: targetOrder.order_items,
          order_payments: targetOrder.order_payments,
          total_amount: targetOrder.total_amount
        })
      }
    } catch (error) {
      console.error('주문 로딩 오류:', error)
      toast.error('주문 정보를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = [...orders]

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.customer_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user?.phone?.includes(searchTerm)
      )
    }

    // 탭 필터
    if (activeTab === 'pending') {
      filtered = filtered.filter(order => order.status === 'paid' || order.status === 'shipping')
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(order => order.status === 'delivered')
    }

    setFilteredOrders(filtered)
  }

  const updateShippingStatus = (orderId, newStatus) => {
    try {
      const allOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
      const updatedOrders = allOrders.map(order =>
        order.id === orderId
          ? {
              ...order,
              status: newStatus,
              ...(newStatus === 'shipping' && { shipped_at: new Date().toISOString() }),
              ...(newStatus === 'delivered' && { delivered_at: new Date().toISOString() })
            }
          : order
      )

      localStorage.setItem('mock_orders', JSON.stringify(updatedOrders))
      loadPaidOrders() // 목록 새로고침

      const statusText = newStatus === 'shipping' ? '발송 시작' :
                        newStatus === 'delivered' ? '발송 완료' : '상태 변경'
      toast.success(`${statusText} 처리되었습니다`)
    } catch (error) {
      console.error('발송 상태 업데이트 오류:', error)
      toast.error('상태 변경에 실패했습니다')
    }
  }

  const getStatusInfo = (status) => {
    switch (status) {
      case 'paid':
        return {
          label: '발송 대기',
          color: 'bg-blue-100 text-blue-800',
          icon: ClockIcon
        }
      case 'shipping':
        return {
          label: '발송 중',
          color: 'bg-yellow-100 text-yellow-800',
          icon: TruckIcon
        }
      case 'delivered':
        return {
          label: '발송 완료',
          color: 'bg-green-100 text-green-800',
          icon: CheckCircleIcon
        }
      default:
        return {
          label: '알 수 없음',
          color: 'bg-gray-100 text-gray-800',
          icon: ExclamationTriangleIcon
        }
    }
  }

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(filteredOrders.map(order => order.id))
    }
  }

  const downloadInvoices = () => {
    if (selectedOrders.length === 0) {
      toast.error('다운로드할 주문을 선택해주세요')
      return
    }

    // 송장 파일 다운로드 로직 (실제로는 서버에서 처리)
    const selectedOrderData = filteredOrders.filter(order => selectedOrders.includes(order.id))

    // CSV 형태로 송장 데이터 생성
    const csvHeader = '주문번호,고객명,연락처,주소,상품명,수량,금액,상태\n'
    const csvData = selectedOrderData.map(order => {
      // 디버깅을 위한 로그
      if (order.customer_order_number === 'G250926-0827') {
        console.log('🔥 CSV 생성 시 G250926-0827 데이터:', order)
      }

      // 상품 정보 - 다양한 구조 대응
      let items = '정보없음'
      if (order.order_items && order.order_items.length > 0) {
        items = order.order_items.map(item => {
          const title = item.products?.title || item.product?.title || item.title || '상품'
          const quantity = item.quantity || 1
          return `${title}(${quantity}개)`
        }).join(';')
      }

      // 배송 정보 - 다양한 구조 대응
      const shipping = order.order_shipping?.[0] || order.order_shipping || order.shipping || {}
      let address = '정보없음'
      let fullAddress = '정보없음'

      if (shipping.address) {
        address = shipping.address
        const detailAddress = shipping.detail_address || shipping.detailAddress || ''
        fullAddress = detailAddress ? `${address} ${detailAddress}` : address
      }

      // 고객명 - 다양한 소스에서 확인
      const customerName = order.user?.name || shipping?.name || order.shipping?.name || order.userName || '정보없음'

      // 연락처 - 다양한 소스에서 확인
      const phone = order.user?.phone || shipping?.phone || order.shipping?.phone || order.userPhone || '정보없음'

      // 수량 계산
      const totalQuantity = order.order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0

      // 금액 - 다양한 소스에서 확인
      const amount = order.order_payments?.[0]?.amount || order.payment?.amount || order.total_amount || order.amount || 0

      return [
        order.customer_order_number || order.id?.slice(-8) || 'NO-ID',
        customerName,
        phone,
        `"${fullAddress}"`,
        `"${items}"`,
        totalQuantity,
        amount,
        getStatusInfo(order.status).label
      ].join(',')
    }).join('\n')

    const csvContent = csvHeader + csvData
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `송장_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`${selectedOrders.length}개 주문의 송장 파일을 다운로드했습니다`)
    setSelectedOrders([])
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
          <h1 className="text-2xl font-bold text-gray-900">발송 관리</h1>
          <p className="text-gray-600">결제 완료된 주문의 발송 상태를 관리하세요</p>
        </div>
        <button
          onClick={loadPaidOrders}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          새로고침
        </button>
      </div>


      {/* Tabs */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col gap-4">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              발송대기 ({orders.filter(o => o.status === 'paid' || o.status === 'shipping').length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'completed'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              발송완료 ({orders.filter(o => o.status === 'delivered').length})
            </button>
          </div>

          {/* Search and Download */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="주문번호, 고객명, 전화번호로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={downloadInvoices}
              disabled={selectedOrders.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              송장 다운로드 ({selectedOrders.length})
            </button>
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
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주문정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주소
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  송장
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order, index) => {
                const statusInfo = getStatusInfo(order.status)
                const StatusIcon = statusInfo.icon

                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => handleSelectOrder(order.id)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {/* 주문 상세보기 */}
                          <button
                            onClick={() => router.push(`/admin/orders/${order.id}`)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="주문 상세보기"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-500">
                          ₩{order.payment?.amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {order.user?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.user?.phone}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {(() => {
                          const shipping = order.order_shipping?.[0] || order.order_shipping || {}
                          const address = shipping?.address || '정보없음'
                          const detailAddress = shipping?.detail_address || ''
                          return detailAddress ? `${address} ${detailAddress}` : address
                        })()}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            // 개별 송장 다운로드
                            const csvHeader = '주문번호,고객명,연락처,주소,상품명,수량,금액,상태\n'

                            // 상품 정보 - 다양한 구조 대응
                            let items = '정보없음'
                            if (order.order_items && order.order_items.length > 0) {
                              items = order.order_items.map(item => {
                                const title = item.products?.title || item.product?.title || item.title || '상품'
                                const quantity = item.quantity || 1
                                return `${title}(${quantity}개)`
                              }).join(';')
                            }

                            // 배송 정보 - 다양한 구조 대응
                            const shipping = order.order_shipping?.[0] || order.order_shipping || order.shipping || {}
                            let fullAddress = '정보없음'
                            if (shipping.address) {
                              const address = shipping.address
                              const detailAddress = shipping.detail_address || shipping.detailAddress || ''
                              fullAddress = detailAddress ? `${address} ${detailAddress}` : address
                            }

                            // 고객명과 연락처 - 다양한 소스에서 확인
                            const customerName = order.user?.name || shipping?.name || order.shipping?.name || order.userName || '정보없음'
                            const phone = order.user?.phone || shipping?.phone || order.shipping?.phone || order.userPhone || '정보없음'

                            // 수량과 금액
                            const totalQuantity = order.order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
                            const amount = order.order_payments?.[0]?.amount || order.payment?.amount || order.total_amount || order.amount || 0

                            const csvData = [
                              order.customer_order_number || order.id?.slice(-8) || 'NO-ID',
                              customerName,
                              phone,
                              `"${fullAddress}"`,
                              `"${items}"`,
                              totalQuantity,
                              amount,
                              getStatusInfo(order.status).label
                            ].join(',')

                            const csvContent = csvHeader + csvData
                            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
                            const link = document.createElement('a')
                            const url = URL.createObjectURL(blob)
                            link.setAttribute('href', url)
                            link.setAttribute('download', `송장_${order.customerOrderNumber || order.id.slice(-8)}.csv`)
                            link.style.visibility = 'hidden'
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)

                            toast.success('송장 파일을 다운로드했습니다')
                          }}
                          className="text-purple-600 hover:text-purple-700 px-2 py-1 bg-purple-50 rounded text-xs"
                          title="송장 다운로드"
                        >
                          송장
                        </button>

                        {order.status === 'shipping' && (
                          <button
                            onClick={() => updateShippingStatus(order.id, 'delivered')}
                            className="text-green-600 hover:text-green-700 px-2 py-1 bg-green-50 rounded text-xs"
                            title="발송 완료"
                          >
                            발송완료
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <TruckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">조건에 맞는 주문이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}