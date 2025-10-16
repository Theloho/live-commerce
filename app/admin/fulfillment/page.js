'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'
import toast from 'react-hot-toast'
import { groupOrdersByShipping, generateGroupCSV, generateOrderCSV } from '@/lib/fulfillmentGrouping'
import TrackingNumberInput from '@/app/components/admin/TrackingNumberInput'
import TrackingNumberBulkUpload from '@/app/components/admin/TrackingNumberBulkUpload'

export default function FulfillmentPage() {
  const router = useRouter()
  const { adminUser, isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [groupedData, setGroupedData] = useState({ merged: [], singles: [], total: 0, totalOrders: 0 })
  const [activeTab, setActiveTab] = useState('pending') // pending, completed
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set())
  const [selectedGroupIds, setSelectedGroupIds] = useState(new Set())
  const [showTrackingInput, setShowTrackingInput] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState([])

  // 권한 체크
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
    }
  }, [authLoading, isAdminAuthenticated, router])

  // 데이터 로드
  useEffect(() => {
    if (isAdminAuthenticated && adminUser?.email) {
      loadOrders()
    }
  }, [isAdminAuthenticated, adminUser])

  // 그룹핑 실행 (orders 변경 시)
  useEffect(() => {
    if (orders.length > 0) {
      const grouped = groupOrdersByShipping(orders)
      setGroupedData(grouped)
      console.log('🚚 배송 그룹핑 완료:', grouped)
    }
  }, [orders])

  const loadOrders = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/admin/orders?adminEmail=${encodeURIComponent(adminUser.email)}`)

      if (!response.ok) {
        throw new Error('주문 조회 실패')
      }

      const { orders: allOrders } = await response.json()

      // 입금확인 완료 주문만 (paid)
      const paidOrders = allOrders.filter(o => o.status === 'paid')

      setOrders(paidOrders)
      console.log('✅ 입금확인 완료 주문:', paidOrders.length, '건')

    } catch (error) {
      console.error('주문 로딩 오류:', error)
      toast.error('주문 정보를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  // 전체 선택
  const handleSelectAll = () => {
    const allGroups = [...groupedData.merged, ...groupedData.singles]
    const allOrderIds = new Set()
    const allGroupIds = new Set()

    allGroups.forEach(group => {
      allGroupIds.add(group.groupId)
      group.orders.forEach(order => allOrderIds.add(order.id))
    })

    if (selectedOrderIds.size === allOrderIds.size) {
      // 전체 해제
      setSelectedOrderIds(new Set())
      setSelectedGroupIds(new Set())
    } else {
      // 전체 선택
      setSelectedOrderIds(allOrderIds)
      setSelectedGroupIds(allGroupIds)
    }
  }

  // 그룹 선택 토글
  const handleGroupToggle = (group) => {
    const groupOrderIds = group.orders.map(o => o.id)
    const newSelectedOrderIds = new Set(selectedOrderIds)
    const newSelectedGroupIds = new Set(selectedGroupIds)

    if (selectedGroupIds.has(group.groupId)) {
      // 그룹 해제
      groupOrderIds.forEach(id => newSelectedOrderIds.delete(id))
      newSelectedGroupIds.delete(group.groupId)
    } else {
      // 그룹 선택
      groupOrderIds.forEach(id => newSelectedOrderIds.add(id))
      newSelectedGroupIds.add(group.groupId)
    }

    setSelectedOrderIds(newSelectedOrderIds)
    setSelectedGroupIds(newSelectedGroupIds)
  }

  // 개별 주문 선택 토글
  const handleOrderToggle = (orderId, group) => {
    const newSelectedOrderIds = new Set(selectedOrderIds)
    const newSelectedGroupIds = new Set(selectedGroupIds)

    if (newSelectedOrderIds.has(orderId)) {
      newSelectedOrderIds.delete(orderId)
    } else {
      newSelectedOrderIds.add(orderId)
    }

    // 그룹 내 모든 주문이 선택되었는지 확인
    const groupOrderIds = group.orders.map(o => o.id)
    const allSelected = groupOrderIds.every(id => newSelectedOrderIds.has(id))

    if (allSelected) {
      newSelectedGroupIds.add(group.groupId)
    } else {
      newSelectedGroupIds.delete(group.groupId)
    }

    setSelectedOrderIds(newSelectedOrderIds)
    setSelectedGroupIds(newSelectedGroupIds)
  }

  // CSV 다운로드
  const handleDownloadCSV = (mode = 'group') => {
    if (selectedOrderIds.size === 0) {
      toast.error('다운로드할 주문을 선택해주세요')
      return
    }

    const allGroups = [...groupedData.merged, ...groupedData.singles]
    const csvContent = mode === 'group'
      ? generateGroupCSV(allGroups, selectedOrderIds)
      : generateOrderCSV(allGroups, selectedOrderIds)

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `배송취합_${new Date().toISOString().split('T')[0]}_${mode}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`${selectedOrderIds.size}개 주문을 다운로드했습니다`)
  }

  // 송장번호 입력 모달 열기
  const openTrackingInput = (orderIds) => {
    const orders = []
    groupedData.merged.concat(groupedData.singles).forEach(group => {
      group.orders.forEach(order => {
        if (orderIds.includes(order.id)) {
          orders.push(order)
        }
      })
    })
    setSelectedOrders(orders)
    setShowTrackingInput(true)
  }

  // 송장번호 저장 성공
  const handleTrackingSuccess = async () => {
    await loadOrders()
    setShowTrackingInput(false)
    setSelectedOrders([])
    setSelectedOrderIds(new Set())
    setSelectedGroupIds(new Set())
  }

  // 대량 업로드 성공
  const handleBulkUploadSuccess = async () => {
    await loadOrders()
    setShowBulkUpload(false)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const allGroups = [...groupedData.merged, ...groupedData.singles]
  const totalOrders = groupedData.totalOrders
  const totalGroups = groupedData.total

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🚚 배송 취합 관리</h1>
          <p className="text-sm text-gray-600 mt-1">
            총 {totalGroups}개 그룹 | {totalOrders}개 주문 | 합배송 {groupedData.merged.length}건
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            Excel 업로드
          </button>
          <button
            onClick={loadOrders}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            새로고침
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-gray-200"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">총 그룹</p>
            <p className="text-2xl font-bold text-indigo-600">{totalGroups}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">총 주문</p>
            <p className="text-2xl font-bold text-blue-600">{totalOrders}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">합배송</p>
            <p className="text-2xl font-bold text-purple-600">{groupedData.merged.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">선택됨</p>
            <p className="text-2xl font-bold text-green-600">{selectedOrderIds.size}</p>
          </div>
        </div>
      </motion.div>

      {/* 검색 및 버튼 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="고객명, 주소, 주문번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {selectedOrderIds.size === totalOrders ? '전체 해제' : '전체 선택'}
            </button>
            <button
              onClick={() => handleDownloadCSV('group')}
              disabled={selectedOrderIds.size === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              그룹 다운로드
            </button>
            <button
              onClick={() => handleDownloadCSV('order')}
              disabled={selectedOrderIds.size === 0}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              개별 다운로드
            </button>
            <button
              onClick={() => openTrackingInput(Array.from(selectedOrderIds))}
              disabled={selectedOrderIds.size === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              송장입력
            </button>
          </div>
        </div>
      </div>

      {/* 그룹 리스트 */}
      <div className="space-y-4">
        {allGroups.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <TruckIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">입금확인 완료 주문이 없습니다</h3>
            <p className="text-gray-600">입금 확인이 완료된 주문이 여기에 표시됩니다</p>
          </div>
        ) : (
          allGroups.map((group, index) => {
            const isGroupSelected = selectedGroupIds.has(group.groupId)
            const groupOrderIds = group.orders.map(o => o.id)
            const selectedCount = groupOrderIds.filter(id => selectedOrderIds.has(id)).length
            const isIndeterminate = selectedCount > 0 && selectedCount < groupOrderIds.length

            return (
              <motion.div
                key={group.groupId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-lg border-2 p-4 ${
                  group.type === 'merged'
                    ? 'border-purple-300 bg-purple-50/30'
                    : 'border-gray-200'
                }`}
              >
                {/* 그룹 헤더 */}
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={isGroupSelected}
                    ref={el => {
                      if (el) el.indeterminate = isIndeterminate
                    }}
                    onChange={() => handleGroupToggle(group)}
                    className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900">
                        {group.type === 'merged' ? '🔗 합배송' : '📦 단일'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {group.orderCount}개 주문 | {group.uniqueProducts}개 제품
                      </span>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      👤 {group.shippingInfo.name} | 📞 {group.shippingInfo.phone}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      📍 [{group.shippingInfo.postalCode}] {group.shippingInfo.address} {group.shippingInfo.detailAddress}
                    </div>
                    {group.trackingNumber && (
                      <div className="text-xs text-blue-600 font-mono mt-1">
                        🚚 송장: {group.trackingNumber}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      ₩{group.totalAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 제품 리스트 */}
                <div className="space-y-2 pl-8">
                  {group.orders.map(order => {
                    const orderItems = group.allItems.filter(item => item.orderId === order.id)
                    const isOrderSelected = selectedOrderIds.has(order.id)

                    return (
                      <div key={order.id} className="border-l-2 border-gray-200 pl-3">
                        <div className="flex items-start gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={isOrderSelected}
                            onChange={() => handleOrderToggle(order.id, group)}
                            className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="text-xs font-medium text-gray-700">
                            주문: {order.customer_order_number || order.id.slice(-8)}
                          </div>
                        </div>

                        {/* 제품들 */}
                        <div className="space-y-1 ml-6">
                          {orderItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 py-1">
                              {/* 제품 이미지 */}
                              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                {item.productImage ? (
                                  <img
                                    src={item.productImage}
                                    alt={item.productName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                      e.target.nextSibling.style.display = 'flex'
                                    }}
                                  />
                                ) : null}
                                <div className={`w-full h-full ${item.productImage ? 'hidden' : 'flex'} items-center justify-center bg-gray-200 text-gray-500 text-[10px] font-bold text-center p-1`}>
                                  {item.productName.substring(0, 6)}
                                </div>
                              </div>

                              {/* 제품 정보 */}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-900 truncate">
                                  {item.productName}
                                </div>
                                {item.optionDisplay !== '옵션 없음' && (
                                  <div className="text-[10px] text-gray-600">
                                    옵션: {item.optionDisplay}
                                  </div>
                                )}
                                {item.sku && (
                                  <div className="text-[10px] text-gray-400 font-mono">
                                    SKU: {item.sku}
                                  </div>
                                )}
                              </div>

                              {/* 수량 및 가격 */}
                              <div className="text-right flex-shrink-0">
                                <div className="text-xs font-medium text-gray-900">
                                  {item.quantity}개
                                </div>
                                <div className="text-[10px] text-gray-600">
                                  ₩{item.totalPrice.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* 송장번호 입력 모달 */}
      {showTrackingInput && selectedOrders.length > 0 && (
        <TrackingNumberInput
          orderId={selectedOrders[0].id}
          adminEmail={adminUser.email}
          currentTracking={selectedOrders[0].shipping?.tracking_number}
          currentCompany={selectedOrders[0].shipping?.tracking_company}
          onSuccess={handleTrackingSuccess}
          onClose={() => {
            setShowTrackingInput(false)
            setSelectedOrders([])
          }}
        />
      )}

      {/* Excel 대량 업로드 모달 */}
      {showBulkUpload && (
        <TrackingNumberBulkUpload
          adminEmail={adminUser.email}
          onSuccess={handleBulkUploadSuccess}
          onClose={() => setShowBulkUpload(false)}
        />
      )}
    </div>
  )
}
