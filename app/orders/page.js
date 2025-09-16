'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  HomeIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function OrdersPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending')

  // 테스트용 샘플 데이터 생성 함수
  const createSampleOrders = () => {
    if (typeof window === 'undefined') return

    const sampleOrders = [
      {
        id: 'ORD-SAMPLE-001',
        status: 'pending',
        created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10분 전
        items: [{
          title: '장바구니에서 온 상품',
          thumbnail_url: 'https://picsum.photos/400/500?random=1',
          quantity: 1,
          totalPrice: 89000
        }],
        shipping: { name: '홍길동', phone: '010-1234-5678', address: '서울시 강남구' },
        payment: { method: 'cart', amount: 93000, status: 'pending' },
        orderType: 'cart'
      },
      {
        id: 'ORD-SAMPLE-002',
        status: 'pending',
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30분 전
        items: [{
          title: '바로구매 상품',
          thumbnail_url: 'https://picsum.photos/400/500?random=2',
          quantity: 1,
          totalPrice: 120000
        }],
        shipping: { name: '홍길동', phone: '010-1234-5678', address: '서울시 강남구' },
        payment: { method: 'bank_transfer', amount: 124000, status: 'pending' },
        orderType: 'direct'
      },
      {
        id: 'ORD-SAMPLE-003',
        status: 'paid',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2시간 전
        items: [{
          title: '결제완료 상품',
          thumbnail_url: 'https://picsum.photos/400/500?random=3',
          quantity: 2,
          totalPrice: 150000
        }],
        shipping: { name: '홍길동', phone: '010-1234-5678', address: '서울시 강남구' },
        payment: { method: 'card', amount: 169000, status: 'completed' },
        orderType: 'direct'
      }
    ]

    localStorage.setItem('mock_orders', JSON.stringify(sampleOrders))
    console.log('Sample orders created:', sampleOrders)
  }

  const loadOrders = () => {
    // Mock 주문 데이터 가져오기
    const mockOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
    console.log('Loaded orders:', mockOrders) // 디버깅용

    // 취소된 주문들(status가 'cancelled'인 것들) 제거
    const activeOrders = mockOrders.filter(order => order.status !== 'cancelled')

    // 기존에 취소된 주문이 있었다면 정리
    if (activeOrders.length !== mockOrders.length) {
      console.log('기존 취소된 주문들 정리:', mockOrders.length - activeOrders.length, '개')
      localStorage.setItem('mock_orders', JSON.stringify(activeOrders))
    }

    // 샘플 데이터는 생성하지 않음 (실제 주문만 표시)
    setOrders(activeOrders)
    setLoading(false)
  }

  useEffect(() => {
    const initOrders = async () => {
      if (authLoading) return

      if (!isAuthenticated) {
        toast.error('로그인이 필요합니다')
        router.push('/login')
        return
      }

      loadOrders()
    }

    initOrders()
  }, [isAuthenticated, authLoading, router])

  // 페이지 포커스 시 주문 목록 새로고침
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && !authLoading) {
        loadOrders()
      }
    }

    const handleStorage = () => {
      if (isAuthenticated && !authLoading) {
        console.log('Storage 이벤트 감지, 주문 목록 새로고침')
        loadOrders()
      }
    }

    const handleOrderUpdated = (event) => {
      if (isAuthenticated && !authLoading) {
        console.log('주문 업데이트 이벤트 감지:', event.detail)
        loadOrders()
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('orderUpdated', handleOrderUpdated)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('orderUpdated', handleOrderUpdated)
    }
  }, [isAuthenticated, authLoading])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 상태별 필터링
  const filteredOrders = orders.filter(order => order.status === filterStatus)

  const getStatusInfo = (status) => {
    const statusMap = {
      'pending': { label: '결제대기', color: 'text-yellow-600 bg-yellow-50', icon: ClockIcon },
      'verifying': { label: '결제 확인중', color: 'text-purple-600 bg-purple-50', icon: ClockIcon },
      'paid': { label: '결제완료', color: 'text-blue-600 bg-blue-50', icon: CheckCircleIcon },
      'delivered': { label: '발송완료', color: 'text-green-600 bg-green-50', icon: TruckIcon }
    }
    return statusMap[status] || statusMap['pending']
  }

  const handleOrderClick = (e, orderId) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/orders/${orderId}/complete`)
  }

  // 주문 취소 (완전 삭제)
  const handleCancelOrder = (e, orderId) => {
    e.preventDefault()
    e.stopPropagation()

    console.log('취소 버튼 클릭됨, orderId:', orderId)
    console.log('현재 orders:', orders)

    const confirmed = window.confirm('이 주문을 취소하시겠습니까? 주문 목록에서 완전히 삭제됩니다.')
    if (!confirmed) {
      console.log('취소 확인 거부됨')
      return
    }

    console.log('취소 확인됨, 주문 삭제 진행')

    // 취소된 주문을 완전히 제거
    const updatedOrders = orders.filter(order => order.id !== orderId)
    console.log('삭제 후 orders:', updatedOrders)

    setOrders(updatedOrders)
    localStorage.setItem('mock_orders', JSON.stringify(updatedOrders))
    console.log('localStorage 업데이트 완료')

    toast.success('주문이 취소되어 목록에서 삭제되었습니다')

    // 주문 업데이트 이벤트 발생
    window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { action: 'cancel', orderId } }))
    console.log('storage 이벤트 발생 완료')
  }

  // 개별 결제 (체크아웃으로 이동)
  const handlePayOrder = (e, order) => {
    e.preventDefault()
    e.stopPropagation()

    // 세션에 주문 정보 저장하고 체크아웃으로 이동
    const orderItem = {
      ...order.items[0],
      totalPrice: order.items[0].totalPrice
    }
    sessionStorage.setItem('checkoutItem', JSON.stringify(orderItem))
    router.push('/checkout')
  }


  // 전체 결제 (결제대기 상품들을 모두 합산하여 결제)
  const handlePayAllPending = () => {
    const pendingOrders = orders.filter(order => order.status === 'pending')
    if (pendingOrders.length === 0) {
      toast.error('결제대기 중인 주문이 없습니다')
      return
    }

    // 모든 결제대기 주문들을 하나의 주문으로 합침
    const totalPrice = pendingOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0)
    }, 0)

    const totalQuantity = pendingOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
    }, 0)

    // 모든 상품들의 상세 정보 수집
    const allItems = pendingOrders.flatMap(order =>
      order.items.map(item => ({
        ...item,
        orderId: order.id // 어느 주문에서 왔는지 추적
      }))
    )

    // 합산된 주문 정보 생성
    const combinedOrderItem = {
      id: 'COMBINED-ORDER',
      title: `${pendingOrders.length}개 상품 일괄결제`,
      price: totalPrice,
      compare_price: null,
      thumbnail_url: pendingOrders[0].items[0].thumbnail_url, // 첫 번째 상품의 썸네일 사용
      quantity: totalQuantity,
      totalPrice: totalPrice,
      selectedOptions: {},
      // 원본 주문들의 ID 저장 (결제 완료 후 삭제용)
      originalOrderIds: pendingOrders.map(order => order.id),
      // 일괄결제 플래그 및 모든 상품 정보
      isBulkPayment: true,
      allItems: allItems
    }

    sessionStorage.setItem('checkoutItem', JSON.stringify(combinedOrderItem))
    toast.success(`${pendingOrders.length}개 주문 (총 ₩${totalPrice.toLocaleString()})을 결제합니다`)
    router.push('/checkout')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">주문 내역</h1>
            <div className="w-10"></div>
          </div>
        </div>

        {/* 필터 */}
        <div className="px-4 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2 overflow-x-auto">
            <FunnelIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
            {[
              { key: 'pending', label: '결제대기' },
              { key: 'verifying', label: '결제 확인중' },
              { key: 'paid', label: '결제완료' },
              { key: 'delivered', label: '발송완료' }
            ].map(filter => {
              const count = orders.filter(order => order.status === filter.key).length
              return (
              <button
                key={filter.key}
                onClick={() => setFilterStatus(filter.key)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                  ${filterStatus === filter.key
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {filter.label}
                {count > 0 && (
                  <span className="ml-1 text-xs">
                    ({count})
                  </span>
                )}
              </button>
              )
            })}
          </div>
        </div>

        {/* 결제대기 총계 정보 */}
        {filterStatus === 'pending' && filteredOrders.length > 0 && (
          <div className="px-4 py-4 bg-white border-b border-gray-200">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">결제 정보</h3>

              {(() => {
                const pendingOrders = filteredOrders.filter(order => order.status === 'pending')
                // 주문 항목의 상품금액을 직접 계산 (결제 전이므로 순수 상품가격)
                const totalProductPrice = pendingOrders.reduce((sum, order) => {
                  return sum + order.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0)
                }, 0)
                const shippingFee = 4000
                const finalTotal = totalProductPrice + shippingFee

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">상품금액 ({pendingOrders.length}개)</span>
                      <span className="text-gray-900">₩{totalProductPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">배송비</span>
                      <span className="text-gray-900">₩{shippingFee.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-red-200 pt-2">
                      <div className="flex justify-between font-semibold">
                        <span className="text-gray-900">총 결제금액</span>
                        <span className="text-red-600 text-lg">₩{finalTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <button
                onClick={handlePayAllPending}
                className="w-full mt-4 bg-red-500 text-white font-semibold py-3 rounded-lg hover:bg-red-600 transition-colors"
              >
                전체 결제하기
              </button>
            </div>
          </div>
        )}

        {/* 주문 목록 */}
        <div className="px-4 py-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClockIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">주문 내역이 없습니다</h3>
              <p className="text-gray-500 text-sm mb-6">
                {filterStatus === 'pending'
                  ? '결제대기 중인 상품이 없습니다.'
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
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order, index) => {
                const statusInfo = getStatusInfo(order.status)
                const StatusIcon = statusInfo.icon
                const orderItem = order.items[0] // 첫 번째 상품만 표시

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={(e) => handleOrderClick(e, order.id)}
                    className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    {/* 주문 헤더 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          주문번호: {order.id.slice(-8)}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusInfo.color}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-xs font-medium">{statusInfo.label}</span>
                      </div>
                    </div>

                    {/* 상품 정보 */}
                    <div className="flex gap-3 mb-3">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={orderItem.thumbnail_url || '/placeholder.png'}
                          alt={orderItem.title}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 text-sm">
                          {orderItem.title}
                        </h3>
                        <p className="text-xs text-gray-500 mb-1">
                          수량: {orderItem.quantity}개
                        </p>
                        {order.items.length > 1 && (
                          <p className="text-xs text-gray-500">
                            외 {order.items.length - 1}개 상품
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 주문 정보 */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-500">
                        {formatDistanceToNow(new Date(order.created_at), {
                          addSuffix: true,
                          locale: ko
                        })}
                      </div>
                      <div className="font-semibold text-gray-900">
                        ₩{order.items.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString()}
                      </div>
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      {order.status === 'pending' ? (
                        // 결제대기 상품에는 취소 버튼만 표시
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => handleCancelOrder(e, order.id)}
                            className="bg-gray-100 text-gray-600 text-xs font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      ) : order.status === 'verifying' ? (
                        // 결제 확인중 상태일 때 메시지 표시 (결제 방법별 색상 구분)
                        <div className={`${
                          order.payment.method === 'card'
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-orange-50 border border-orange-200'
                        } rounded-lg p-3`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 ${
                              order.payment.method === 'card' ? 'bg-blue-500' : 'bg-orange-500'
                            } rounded-full animate-pulse`}></div>
                            <span className={`${
                              order.payment.method === 'card' ? 'text-blue-700' : 'text-orange-700'
                            } text-sm font-medium`}>
                              {order.payment.method === 'card' ? '카드결제 확인중' : '계좌입금 확인중'}
                            </span>
                          </div>
                          <p className={`${
                            order.payment.method === 'card' ? 'text-blue-600' : 'text-orange-600'
                          } text-xs mt-1`}>
                            결제 확인이 완료되면 자동으로 처리됩니다
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {order.payment.method === 'cart' ? '장바구니' :
                             order.payment.method === 'bank_transfer' ? '계좌이체' : '카드결제'}
                            {order.orderType === 'cart' && ' (장바구니에서)'}
                          </span>
                          <span>상세보기 →</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}