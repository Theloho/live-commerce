'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  HomeIcon,
  MinusIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import useAuth from '@/hooks/useAuth'
import { getOrders, cancelOrder, updateOrderItemQuantity } from '@/lib/supabaseApi'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'

function OrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [userSession, setUserSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending')

  // 직접 세션 확인
  useEffect(() => {
    const checkUserSession = () => {
      try {
        const storedUser = sessionStorage.getItem('user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          console.log('주문내역에서 세션 복원:', userData)
          setUserSession(userData)
        } else {
          setUserSession(null)
        }
      } catch (error) {
        console.error('주문내역 세션 확인 오류:', error)
        setUserSession(null)
      } finally {
        setSessionLoading(false)
      }
    }

    checkUserSession()
  }, [])

  // URL 쿼리 파라미터에서 탭 정보 확인
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['pending', 'verifying', 'paid', 'delivered'].includes(tab)) {
      setFilterStatus(tab)
    }
  }, [searchParams])


  const loadOrders = async () => {
    const currentUser = userSession || user
    const isUserLoggedIn = userSession || isAuthenticated

    // 현재 로그인한 사용자 확인
    if (!isUserLoggedIn || !currentUser?.id) {
      console.log('사용자가 로그인되지 않음')
      setOrders([])
      setLoading(false)
      return
    }

    try {
      console.log('주문 데이터 로드 중...')

      // 카카오 사용자인 경우 별도 API 사용
      if (userSession && !user) {
        console.log('카카오 사용자 주문 조회 API 사용')
        const response = await fetch('/api/get-orders-kakao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        })

        const result = await response.json()

        if (result.success) {
          console.log('카카오 주문 조회 성공:', result.orders.length)
          setOrders(result.orders)
        } else {
          throw new Error(result.error)
        }
      } else {
        // 일반 Supabase 사용자
        const supabaseOrders = await getOrders(currentUser.id)
        console.log('Loaded Supabase orders:', supabaseOrders)
        setOrders(supabaseOrders)
      }
    } catch (error) {
      console.error('주문 데이터 로드 오류:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initOrders = async () => {
      const currentUser = userSession || user
      const isUserLoggedIn = userSession || isAuthenticated

      if (authLoading || sessionLoading) return

      if (!isUserLoggedIn) {
        toast.error('로그인이 필요합니다')
        router.push('/login')
        return
      }

      loadOrders()
    }

    initOrders()
  }, [isAuthenticated, authLoading, sessionLoading, router, user, userSession])

  // 페이지 포커스 시 주문 목록 새로고침
  useEffect(() => {
    const handleFocus = () => {
      const isUserLoggedIn = userSession || isAuthenticated
      if (isUserLoggedIn && !authLoading && !sessionLoading) {
        loadOrders()
      }
    }

    const handleOrderUpdated = (event) => {
      const isUserLoggedIn = userSession || isAuthenticated
      if (isUserLoggedIn && !authLoading && !sessionLoading) {
        console.log('주문 업데이트 이벤트 감지:', event.detail)
        loadOrders()
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('orderUpdated', handleOrderUpdated)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('orderUpdated', handleOrderUpdated)
    }
  }, [isAuthenticated, authLoading, userSession, sessionLoading])

  if (authLoading || sessionLoading || loading) {
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


  const [selectedGroupOrder, setSelectedGroupOrder] = useState(null)

  const handleOrderClick = (e, order) => {
    e.preventDefault()
    e.stopPropagation()

    // 그룹 주문인 경우 모달 표시
    if (order.isGroup) {
      setSelectedGroupOrder(order)
    } else {
      // 개별 주문인 경우 기존 로직
      router.push(`/orders/${order.id}/complete`)
    }
  }

  // 개별 결제 (체크아웃으로 이동)
  const handlePayOrder = (e, order) => {
    e.preventDefault()
    e.stopPropagation()

    console.log('개별 결제 - 주문 데이터:', order)
    console.log('주문 아이템들:', order.items)

    if (!order.items || order.items.length === 0) {
      toast.error('주문 정보를 찾을 수 없습니다')
      return
    }

    // 세션에 주문 정보 저장하고 체크아웃으로 이동
    const firstItem = order.items[0]
    const orderItem = {
      id: firstItem.id || order.id,
      title: firstItem.title,
      price: firstItem.price || firstItem.totalPrice / (firstItem.quantity || 1),
      thumbnail_url: firstItem?.thumbnail_url || '/placeholder.png',
      quantity: firstItem.quantity || 1,
      totalPrice: firstItem.totalPrice,
      selectedOptions: firstItem.selectedOptions || {}
    }

    console.log('체크아웃용 주문 아이템:', orderItem)
    sessionStorage.setItem('checkoutItem', JSON.stringify(orderItem))
    router.push('/checkout')
  }


  // 주문 취소 (Supabase에서 삭제)
  const handleCancelOrder = async (orderId) => {
    const confirmed = window.confirm('주문을 취소하시겠습니까?')
    if (!confirmed) return

    try {
      // Supabase에서 주문 취소
      await cancelOrder(orderId)
      toast.success('주문이 취소되었습니다')
      // 주문 목록 새로고침
      loadOrders()
    } catch (error) {
      console.error('주문 취소 중 오류:', error)
      toast.error('주문 취소 중 오류가 발생했습니다')
    }
  }

  // 수량 조절 (Supabase 연동)
  const handleQuantityChange = async (orderId, itemIndex, change) => {
    console.log('수량 조절:', { orderId, itemIndex, change })

    const order = orders.find(o => o.id === orderId)
    if (!order) return

    const item = order.items[itemIndex]
    if (!item) return

    const newQuantity = (item.quantity || 1) + change

    // 최소 수량 체크
    if (newQuantity < 1) {
      toast.error('최소 수량은 1개입니다')
      return
    }

    try {
      // 1. 로컬 상태 즉시 업데이트 (옵티미스틱 업데이트)
      const updatedOrders = orders.map(o => {
        if (o.id === orderId) {
          const updatedItems = o.items.map((itm, idx) => {
            if (idx === itemIndex) {
              return {
                ...itm,
                quantity: newQuantity,
                totalPrice: (itm.totalPrice / itm.quantity) * newQuantity
              }
            }
            return itm
          })
          return { ...o, items: updatedItems }
        }
        return o
      })
      setOrders(updatedOrders)

      // 2. 서버 업데이트
      await updateOrderItemQuantity(item.id, newQuantity)
      toast.success('수량이 변경되었습니다')

      // 3. 서버에서 최신 데이터 가져와서 동기화
      setTimeout(() => {
        loadOrders()
      }, 500)
    } catch (error) {
      console.error('수량 변경 중 오류:', error)
      toast.error('수량 변경에 실패했습니다')
    }
  }

  // 전체 결제 (결제대기 상품들을 모두 합산하여 결제)
  const handlePayAllPending = () => {
    const pendingOrders = orders.filter(order => order.status === 'pending')
    if (pendingOrders.length === 0) {
      toast.error('결제대기 중인 주문이 없습니다')
      return
    }

    // 결제대기 주문의 경우 재고가 이미 차감되어 있으므로 검증 건너뛰기
    console.log('일괄결제: 결제대기 주문들의 재고는 이미 확보되어 있으므로 검증 생략')

    // 모든 결제대기 주문들을 하나의 주문으로 합침
    const totalPrice = pendingOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0)
    }, 0)

    const totalQuantity = pendingOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
    }, 0)

    // 합산된 주문 정보 생성 (간소화 - sessionStorage 용량 문제 해결)
    const combinedOrderItem = {
      id: 'COMBINED-ORDER',
      title: `${pendingOrders.length}개 상품 일괄결제`,
      price: totalPrice,
      compare_price: null,
      thumbnail_url: pendingOrders[0]?.items[0]?.thumbnail_url || '/placeholder.png', // 첫 번째 상품의 썸네일 사용
      quantity: totalQuantity,
      totalPrice: totalPrice,
      selectedOptions: {},
      // 원본 주문들의 ID만 저장 (결제 완료 후 처리용)
      originalOrderIds: pendingOrders.map(order => order.id),
      // 일괄결제 플래그
      isBulkPayment: true,
      // allItems 제거 - 용량 문제 해결
      itemCount: pendingOrders.length
    }

    try {
      // sessionStorage 저장 시도 (용량 초과 시 오류 처리)
      sessionStorage.setItem('checkoutItem', JSON.stringify(combinedOrderItem))
      toast.success(`${pendingOrders.length}개 주문 (총 ₩${totalPrice.toLocaleString()})을 결제합니다`)
      router.push('/checkout')
    } catch (error) {
      console.error('SessionStorage 저장 실패:', error)
      // 용량 초과 시 sessionStorage 비우고 다시 시도
      sessionStorage.clear()
      try {
        sessionStorage.setItem('checkoutItem', JSON.stringify(combinedOrderItem))
        toast.success(`${pendingOrders.length}개 주문 (총 ₩${totalPrice.toLocaleString()})을 결제합니다`)
        router.push('/checkout')
      } catch (retryError) {
        toast.error('주문 데이터가 너무 큽니다. 개별 결제를 이용해주세요.')
      }
    }
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
                const orderItem = order.items?.[0] || {
                  title: '상품명 없음',
                  thumbnail_url: '/placeholder.png',
                  price: 0,
                  quantity: 1,
                  totalPrice: 0,
                  selectedOptions: {}
                } // 첫 번째 상품만 표시, 없으면 기본값

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={order.status !== 'pending' ? (e) => handleOrderClick(e, order) : undefined}
                    className={`bg-white rounded-lg border border-gray-200 p-4 ${
                      order.status !== 'pending' ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
                    }`}
                  >
                    {/* 주문 헤더 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {order.isGroup ? (
                            <>
                              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full mr-2">
                                일괄결제 {order.groupOrderCount}건
                              </span>
                              주문번호: {order.customer_order_number || order.id.slice(-8)}
                            </>
                          ) : (
                            `주문번호: ${order.customerOrderNumber || order.id.slice(-8)}`
                          )}
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
                          {order.isGroup ? `${order.groupOrderCount}개 상품 일괄결제` : orderItem.title}
                        </h3>

                        {/* 선택된 옵션 표시 */}
                        {orderItem.selectedOptions && Object.keys(orderItem.selectedOptions).length > 0 && (
                          <div className="mb-1">
                            {Object.entries(orderItem.selectedOptions).map(([optionId, value]) => (
                              <span
                                key={optionId}
                                className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mr-1 mb-1"
                              >
                                {value}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 수량 조절 UI - 결제대기 상태에서만 표시 */}
                        {order.status === 'pending' ? (
                          <div className="flex items-center gap-2 mb-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleQuantityChange(order.id, 0, -1)
                              }}
                              className="p-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                              disabled={orderItem.quantity <= 1}
                            >
                              <MinusIcon className="h-3 w-3 text-gray-600" />
                            </button>
                            <span className="text-xs text-gray-700 min-w-[40px] text-center">
                              {orderItem.quantity}개
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleQuantityChange(order.id, 0, 1)
                              }}
                              className="p-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                            >
                              <PlusIcon className="h-3 w-3 text-gray-600" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 mb-1">
                            수량: {orderItem.quantity}개
                          </p>
                        )}
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
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelOrder(order.id)
                            }}
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
                          <span>{order.isGroup ? '상세목록 보기 →' : '상세보기 →'}</span>
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

      {/* 그룹 주문 상세 모달 */}
      {selectedGroupOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                일괄결제 상세내역
              </h3>
              <button
                onClick={() => setSelectedGroupOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* 주문 그룹 정보 */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-blue-900">
                    주문번호: {selectedGroupOrder.customer_order_number}
                  </span>
                  <span className="text-xs text-blue-700">
                    {selectedGroupOrder.groupOrderCount}개 상품
                  </span>
                </div>
                <div className="text-lg font-bold text-blue-900">
                  총 ₩{selectedGroupOrder.items.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString()}
                </div>
              </div>

              {/* 상품 목록 */}
              <div className="space-y-3">
                {selectedGroupOrder.items.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex gap-3 p-3 border border-gray-200 rounded-lg">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.thumbnail_url || '/placeholder.png'}
                        alt={item.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                        {item.title}
                      </h4>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          수량: {item.quantity}개
                        </span>
                        <span className="font-semibold text-gray-900">
                          ₩{item.totalPrice.toLocaleString()}
                        </span>
                      </div>
                      {/* 선택된 옵션 표시 */}
                      {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                        <div className="mt-1">
                          {Object.entries(item.selectedOptions).map(([optionId, value]) => (
                            <span
                              key={optionId}
                              className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mr-1"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedGroupOrder(null)}
                className="w-full bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
    </div>}>
      <OrdersContent />
    </Suspense>
  )
}