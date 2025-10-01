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
  PlusIcon,
  ClipboardDocumentIcon,
  ExclamationCircleIcon,
  XCircleIcon
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
  const [orders, setOrders] = useState([])
  const [pageLoading, setPageLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [selectedGroupOrder, setSelectedGroupOrder] = useState(null)

  // 🚀 통합된 고성능 초기화 (모든 useEffect 통합)
  useEffect(() => {
    const initOrdersPageFast = async () => {
      console.log('🚀 주문내역 고속 초기화 시작...')
      setPageLoading(true)

      try {
        // ⚡ 1단계: 동기 데이터 로드 (즉시 실행)
        const sessionData = loadSessionDataSync()
        const urlData = parseUrlParameters()

        // ⚡ 2단계: 인증 검증
        const authResult = validateAuthenticationFast(sessionData)
        if (!authResult.success) {
          setPageLoading(false)
          return
        }

        // ⚡ 3단계: 주문 데이터 병렬 로드
        await loadOrdersDataFast(authResult.currentUser)

        console.log('✅ 주문내역 고속 초기화 완료')
      } catch (error) {
        console.error('❌ 주문내역 초기화 실패:', error)
        toast.error('주문내역을 불러오는 중 오류가 발생했습니다')
        setOrders([])
      } finally {
        setPageLoading(false)
      }
    }

    // 🔧 동기 세션 데이터 로드
    const loadSessionDataSync = () => {
      try {
        const storedUser = sessionStorage.getItem('user')
        let sessionUser = null
        if (storedUser) {
          sessionUser = JSON.parse(storedUser)
          setUserSession(sessionUser)
          console.log('✅ 세션 복원:', sessionUser?.name)
        }
        return { sessionUser }
      } catch (error) {
        console.warn('세션 로드 실패:', error)
        setUserSession(null)
        return { sessionUser: null }
      }
    }

    // 🔧 URL 파라미터 분석
    const parseUrlParameters = () => {
      const tab = searchParams.get('tab')
      if (tab && ['pending', 'verifying', 'paid', 'delivered'].includes(tab)) {
        setFilterStatus(tab)
        console.log('✅ URL 탭 설정:', tab)
      }
      return { tab }
    }

    // 🔒 인증 검증 (빠른 검사)
    const validateAuthenticationFast = ({ sessionUser }) => {
      if (authLoading && !sessionUser) {
        console.log('Still loading auth, waiting...')
        return { success: false }
      }

      const currentUser = sessionUser || user
      const isUserLoggedIn = sessionUser || isAuthenticated

      if (!isUserLoggedIn || !currentUser?.id) {
        console.log('Not authenticated, redirecting to login')
        toast.error('로그인이 필요합니다')
        router.push('/login')
        return { success: false }
      }

      return { success: true, currentUser }
    }

    // ⚡ 주문 데이터 고속 로드
    const loadOrdersDataFast = async (currentUser) => {
      console.log('⚡ 주문 데이터 고속 로드:', currentUser?.name)

      try {
        let ordersData = []

        // 🚀 통합 API 사용 (모든 사용자 동일 처리)
        console.log('통합 API 사용 - 사용자:', currentUser.name)
        ordersData = await getOrders(currentUser.id)
        console.log('✅ 통합 주문 로드 성공:', ordersData.length)

        setOrders(ordersData)
        return ordersData
      } catch (error) {
        console.error('주문 데이터 로드 오류:', error)
        setOrders([])
        throw error
      }
    }

    // 포커스 이벤트 리스너 (선택적 새로고침)
    const setupFocusRefresh = () => {
      const handleFocus = () => {
        if (!pageLoading && (userSession || isAuthenticated)) {
          console.log('🔄 페이지 포커스 - 주문 새로고침')
          loadOrdersDataFast(userSession || user).catch(console.warn)
        }
      }

      window.addEventListener('focus', handleFocus)
      return () => window.removeEventListener('focus', handleFocus)
    }

    // 🚀 메인 초기화 실행
    const cleanup = setupFocusRefresh()
    initOrdersPageFast()

    // 정리 함수 반환
    return cleanup
  }, [isAuthenticated, user, authLoading, router, searchParams])

  // ⚡ 주문 새로고침 함수 (외부 호출용)
  const refreshOrders = async () => {
    try {
      if (!pageLoading && (userSession || isAuthenticated)) {
        const currentUser = userSession || user
        if (currentUser?.id) {
          setPageLoading(true)

          // 통합 API 사용 (모든 사용자 동일 처리)
          let ordersData = await getOrders(currentUser.id)

          setOrders(ordersData)
          setPageLoading(false)
        }
      }
    } catch (error) {
      console.warn('주문 새로고침 실패:', error)
      setPageLoading(false)
    }
  }

  // ⚡ 로딩 상태 체크 (통합된 단일 로딩)
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-800 font-medium text-lg mb-2">주문내역 로딩 중</p>
          <p className="text-gray-500 text-sm">잠시만 기다려주세요...</p>

          {/* 🚀 고속 처리 진행 표시 */}
          <div className="mt-6 max-w-xs mx-auto">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>인증</span>
              <span>주문조회</span>
              <span>완료</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 상태별 필터링
  const filteredOrders = orders.filter(order => order.status === filterStatus)

  const getStatusInfo = (status, paymentMethod = null) => {
    const statusMap = {
      'pending': { label: paymentMethod === 'card' ? '카드결제 대기' : '입금대기', color: 'text-yellow-600 bg-yellow-50', icon: ClockIcon },
      'verifying': { label: paymentMethod === 'card' ? '카드결제 확인중' : '입금확인중', color: 'text-purple-600 bg-purple-50', icon: ClockIcon },
      'paid': { label: '결제완료', color: 'text-green-600 bg-green-50', icon: CheckCircleIcon },
      'preparing': { label: '배송준비중', color: 'text-blue-600 bg-blue-50', icon: ClockIcon },
      'shipped': { label: '배송중', color: 'text-blue-600 bg-blue-50', icon: TruckIcon },
      'delivered': { label: '출고완료', color: 'text-green-600 bg-green-50', icon: TruckIcon },
      'cancelled': { label: '주문취소', color: 'text-red-600 bg-red-50', icon: ClockIcon }
    }
    return statusMap[status] || statusMap['pending']
  }

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
    const itemPrice = firstItem.price || firstItem.totalPrice / (firstItem.quantity || 1)
    const itemQuantity = firstItem.quantity || 1
    const calculatedTotalPrice = itemPrice * itemQuantity // 올바른 총 상품가격 계산

    const orderItem = {
      id: firstItem.id || order.id,
      title: firstItem.title,
      price: itemPrice,
      thumbnail_url: firstItem?.thumbnail_url || '/placeholder.png',
      quantity: itemQuantity,
      totalPrice: calculatedTotalPrice, // 수정된 계산
      selectedOptions: firstItem.selectedOptions || {}
    }

    console.log('💰 가격 계산 디버깅:')
    console.log(`   상품 단가: ₩${itemPrice.toLocaleString()}`)
    console.log(`   수량: ${itemQuantity}개`)
    console.log(`   계산된 총액: ₩${calculatedTotalPrice.toLocaleString()}`)
    console.log(`   기존 totalPrice: ₩${firstItem.totalPrice?.toLocaleString()}`)
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

      // 주문 목록 새로고침 - 직접 getOrders 호출
      console.log('🔄 주문 취소 후 목록 새로고침')
      const currentUser = userSession || user
      if (currentUser) {
        const updatedOrders = await getOrders(currentUser.id)
        setOrders(updatedOrders)
        console.log('✅ 주문 목록 새로고침 완료:', updatedOrders.length)
      }
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
              // 🔧 수정: price 기준으로 정확히 계산 (totalPrice 역계산 금지)
              const unitPrice = itm.price || (itm.totalPrice / itm.quantity)
              return {
                ...itm,
                quantity: newQuantity,
                totalPrice: unitPrice * newQuantity
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
      // ✨ 토스트 제거: 수량 변경은 시각적으로 이미 확인 가능

      // 3. 서버에서 최신 데이터 가져와서 동기화
      setTimeout(() => {
        const currentUser = userSession || user
        if (currentUser) {
          loadOrdersDataFast(currentUser)
        }
      }, 500)
    } catch (error) {
      console.error('수량 변경 중 오류:', error)
      toast.error('수량 변경에 실패했습니다')
      // 오류 발생 시 서버에서 다시 가져와서 복구
      const currentUser = userSession || user
      if (currentUser) {
        loadOrdersDataFast(currentUser)
      }
    }
  }

  // 전체 결제 (결제대기 상품들을 모두 합산하여 결제)
  const handlePayAllPending = () => {
    const pendingOrders = orders.filter(order => order.status === 'pending')
    if (pendingOrders.length === 0) {
      toast.error('결제대기 중인 주문이 없습니다')
      return
    }

    console.log('🛍️ 전체결제 시작')
    console.log('🛍️ 결제대기 주문 수:', pendingOrders.length)
    console.log('🛍️ 주문 ID들:', pendingOrders.map(o => o.id))

    // 결제대기 주문의 경우 재고가 이미 차감되어 있으므로 검증 건너뛰기
    console.log('일괄결제: 결제대기 주문들의 재고는 이미 확보되어 있으므로 검증 생략')

    // 모든 결제대기 주문들을 하나의 주문으로 합침
    const totalPrice = pendingOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => {
        // 올바른 totalPrice 계산: price × quantity
        const correctItemTotal = (item.price || (item.totalPrice / (item.quantity || 1))) * (item.quantity || 1)
        return itemSum + correctItemTotal
      }, 0)
    }, 0)

    const totalQuantity = pendingOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0)
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

    console.log('💰 전체결제 가격 계산 디버깅:')
    console.log(`   주문 개수: ${pendingOrders.length}개`)
    console.log(`   총 상품가격: ₩${totalPrice.toLocaleString()}`)
    console.log(`   총 수량: ${totalQuantity}개`)
    console.log('결합된 주문 정보:', combinedOrderItem)

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
              { key: 'delivered', label: '출고완료' }
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
                // payment 정보에서 결제 방법 가져오기
                const paymentMethod = order.payment?.method || null
                const statusInfo = getStatusInfo(order.status, paymentMethod)
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
                          주문번호: {order.customer_order_number || order.id.slice(-8)}
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

                        {/* 단가 표시 */}
                        <p className="text-xs text-gray-500 mb-1">
                          단가: ₩{orderItem.price?.toLocaleString() || '0'}
                        </p>

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
                          order.payment?.method === 'card'
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-orange-50 border border-orange-200'
                        } rounded-lg p-3`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 ${
                              order.payment?.method === 'card' ? 'bg-blue-500' : 'bg-orange-500'
                            } rounded-full animate-pulse`}></div>
                            <span className={`${
                              order.payment?.method === 'card' ? 'text-blue-700' : 'text-orange-700'
                            } text-sm font-medium`}>
                              {order.payment?.method === 'card' ? '카드결제 확인중' : '계좌입금 확인중'}
                            </span>
                          </div>
                          <p className={`${
                            order.payment?.method === 'card' ? 'text-blue-600' : 'text-orange-600'
                          } text-xs mt-1`}>
                            결제 확인이 완료되면 자동으로 처리됩니다
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {(() => {
                              const { status, payment } = order
                              const isCard = payment?.method === 'card'

                              switch (status) {
                                case 'pending':
                                  return isCard ? '카드결제 대기중' : '입금대기'
                                case 'verifying':
                                  return isCard ? '카드결제 확인중' : '입금확인중'
                                case 'paid':
                                  return '결제완료'
                                case 'preparing':
                                  return '결제완료 (배송준비중)'
                                case 'shipped':
                                  return '결제완료 (배송중)'
                                case 'delivered':
                                  return '결제완료 (출고완료)'
                                case 'cancelled':
                                  return '결제취소'
                                default:
                                  return isCard ? '카드결제 대기중' : '입금대기'
                              }
                            })()}
                            {order.order_type?.includes('cart:') && ' (장바구니에서)'}
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

      {/* 일괄결제 주문 상세 모달 - 완전한 디자인 */}
      {selectedGroupOrder && (
        <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
          <div className="max-w-md mx-auto bg-white min-h-screen">
            {/* 헤더 */}
            <div className="sticky top-0 z-10 bg-white border-b">
              <div className="flex items-center p-4">
                <button
                  onClick={() => setSelectedGroupOrder(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5 text-gray-700" />
                </button>
                <h1 className="flex-1 text-center font-semibold text-gray-900">주문 상세</h1>
                <div className="w-9" />
              </div>
            </div>

            {/* Success Animation */}
            <div className="text-center py-8 px-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${(() => {
                  const { status } = selectedGroupOrder
                  switch (status) {
                    case 'pending':
                    case 'verifying':
                      return 'bg-yellow-100'
                    case 'paid':
                      return 'bg-green-100'
                    case 'delivered':
                      return 'bg-green-100'
                    default:
                      return 'bg-yellow-100'
                  }
                })()}`}
              >
                {(() => {
                  const { status } = selectedGroupOrder
                  switch (status) {
                    case 'pending':
                    case 'verifying':
                      return <ClockIcon className="w-12 h-12 text-yellow-600" />
                    case 'paid':
                      return <CheckCircleIcon className="w-12 h-12 text-green-600" />
                    case 'delivered':
                      return <TruckIcon className="w-12 h-12 text-green-600" />
                    default:
                      return <ClockIcon className="w-12 h-12 text-yellow-600" />
                  }
                })()}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {(() => {
                    const { status, payment } = selectedGroupOrder
                    const isCard = payment?.method === 'card'
                    console.log('그룹 주문 모달 상태 확인:', { status, paymentMethod: payment?.method })

                    switch (status) {
                      case 'pending':
                        return isCard ? '카드결제 확인중입니다' : '입금확인중입니다'
                      case 'verifying':
                        return isCard ? '카드결제 확인중입니다' : '입금확인중입니다'
                      case 'paid':
                        return '결제가 완료되었습니다'
                      case 'delivered':
                        return '출고가 완료되었습니다'
                      default:
                        return isCard ? '카드결제 확인중입니다' : '입금확인중입니다'
                    }
                  })()}
                </h1>
                <p className="text-gray-600">
                  {(() => {
                    const { status, payment } = selectedGroupOrder
                    const isCard = payment?.method === 'card'

                    switch (status) {
                      case 'pending':
                        return isCard ? '카드결제 확인 후 배송을 시작합니다' : '입금 확인 후 배송을 시작합니다'
                      case 'verifying':
                        return isCard ? '카드결제 확인 후 배송을 시작합니다' : '입금 확인 후 배송을 시작합니다'
                      case 'paid':
                        return '곧 배송 준비를 시작합니다'
                      case 'delivered':
                        return '상품이 안전하게 출고되었습니다'
                      default:
                        return isCard ? '카드결제 확인 후 배송을 시작합니다' : '입금 확인 후 배송을 시작합니다'
                    }
                  })()}
                </p>
              </motion.div>
            </div>

            <div className="px-4 space-y-4">
              {/* 결제 안내 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <h2 className="font-semibold text-gray-900 mb-3">
                  {selectedGroupOrder.payment?.method === 'card' ? '카드결제 안내' : '입금 안내'}
                </h2>

                <div className="space-y-3">
                  {selectedGroupOrder.payment?.method === 'card' ? (
                    // 카드결제 정보
                    <>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">상품금액</span>
                            <span className="text-sm text-gray-900">
                              ₩{(selectedGroupOrder.payment.amount - 4000).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">부가세 (10%)</span>
                            <span className="text-sm text-gray-900">
                              ₩{Math.floor((selectedGroupOrder.payment.amount - 4000) * 0.1).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">배송비</span>
                            <span className="text-sm text-gray-900">₩4,000</span>
                          </div>
                          <div className="border-t pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">카드 결제금액</span>
                              <span className="text-lg font-bold text-gray-900">
                                ₩{(Math.floor((selectedGroupOrder.payment.amount - 4000) * 1.1) + 4000).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <p className="text-sm font-medium text-amber-800 mb-2">
                          💳 카드결제 링크를 카카오톡으로 전송해드립니다
                        </p>
                        <ul className="space-y-1 text-xs text-amber-700">
                          <li>• 결제 확인 후 2-3일 내 배송됩니다</li>
                          <li>• 카드결제는 부가세 10%가 포함되어 있습니다</li>
                        </ul>
                      </div>
                    </>
                  ) : (
                    // 무통장입금 정보
                    <>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 mb-1">은행</p>
                            <p className="font-medium text-gray-900">카카오뱅크</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">계좌번호</p>
                            <p className="font-mono font-medium text-gray-900">79421940478</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">예금주</p>
                            <p className="font-medium text-gray-900">하상윤</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">입금금액</span>
                          <span className="text-lg font-bold text-gray-900">
                            ₩{(() => {
                              // 상품금액 + 배송비로 올바른 입금금액 계산
                              const totalProductAmount = selectedGroupOrder.items.reduce((sum, item) => {
                                return sum + ((item.price || 0) * (item.quantity || 1))
                              }, 0)
                              const correctDepositAmount = totalProductAmount + 4000
                              console.log(`💰 입금 안내 금액: ${correctDepositAmount}원 (상품: ${totalProductAmount} + 배송비: 4000)`)
                              return correctDepositAmount.toLocaleString()
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">입금자명</span>
                          <span className="text-lg font-bold text-gray-900">
                            {(() => {
                              // 입금자명 우선순위: payment.depositor_name > depositName > shipping.name
                              const depositorName = selectedGroupOrder.payment?.depositor_name ||
                                                   selectedGroupOrder.depositName ||
                                                   selectedGroupOrder.shipping?.name ||
                                                   '입금자명 확인 필요'

                              console.log('🏦 모달 입금자명 정보:', {
                                paymentDepositorName: selectedGroupOrder.payment?.depositor_name,
                                depositName: selectedGroupOrder.depositName,
                                shippingName: selectedGroupOrder.shipping?.name,
                                finalDepositorName: depositorName
                              })

                              return depositorName
                            })()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('79421940478').then(() => {
                            toast.success('복사되었습니다')
                          }).catch(() => {
                            toast.error('복사에 실패했습니다')
                          })
                        }}
                        className="w-full bg-gray-900 text-white font-medium py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <ClipboardDocumentIcon className="w-5 h-5" />
                        계좌번호 복사하기
                      </button>

                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <p className="text-sm font-medium text-amber-800 mb-2">
                          💡 입금자명과 금액이 정확해야 입금확인과 배송이 빨라집니다
                        </p>
                        <ul className="space-y-1 text-xs text-amber-700">
                          <li>• 주문 후 24시간 이내 입금해주세요</li>
                          <li>• 입금 확인 후 2-3일 내 배송됩니다</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>

              {/* 주문 정보 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <h2 className="font-semibold text-gray-900 mb-3">주문 정보</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">주문번호</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-900">{selectedGroupOrder.customer_order_number}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedGroupOrder.customer_order_number).then(() => {
                            toast.success('복사되었습니다')
                          }).catch(() => {
                            toast.error('복사에 실패했습니다')
                          })
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">주문일시</span>
                    <span className="text-gray-900">
                      {new Date(selectedGroupOrder.created_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">결제상태</span>
                    <span className={`font-medium ${(() => {
                      const { status } = selectedGroupOrder
                      switch (status) {
                        case 'pending':
                        case 'verifying':
                          return 'text-yellow-600'
                        case 'paid':
                        case 'delivered':
                          return 'text-green-600'
                        default:
                          return 'text-yellow-600'
                      }
                    })()}`}>
                      {(() => {
                        const { status, payment } = selectedGroupOrder
                        const isCard = payment?.method === 'card'

                        switch (status) {
                          case 'pending':
                            return isCard ? '카드결제 대기중' : '입금대기'
                          case 'verifying':
                            return isCard ? '카드결제 확인중' : '입금확인중'
                          case 'paid':
                            return '결제완료'
                          case 'delivered':
                            return '결제완료 (출고완료)'
                          default:
                            return isCard ? '카드결제 대기중' : '입금대기'
                        }
                      })()}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* 배송지 정보 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <h2 className="font-semibold text-gray-900 mb-3">배송지 정보</h2>
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-gray-900">{selectedGroupOrder.shipping?.name || '김진태'}</p>
                  <p className="text-gray-600">{selectedGroupOrder.shipping?.phone || '010-0000-0000'}</p>
                  <p className="text-gray-600">
                    {selectedGroupOrder.shipping?.address || '기본주소'}
                    {selectedGroupOrder.shipping?.detail_address && ` ${selectedGroupOrder.shipping.detail_address}`}
                  </p>
                </div>
              </motion.div>

              {/* 주문 상품 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <h2 className="font-semibold text-gray-900 mb-3">
                  주문 상품 ({selectedGroupOrder.items.length}개 상품, 총 {selectedGroupOrder.items.reduce((sum, item) => sum + item.quantity, 0)}개)
                </h2>
                <div className="space-y-3">
                  {selectedGroupOrder.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex gap-3">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={item.thumbnail_url || '/placeholder.png'}
                            alt={item.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 text-sm">
                            {item.title}
                          </h3>

                          {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                            <div className="mb-1">
                              {Object.entries(item.selectedOptions).map(([optionId, value]) => (
                                <span
                                  key={optionId}
                                  className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mr-1 mb-1"
                                >
                                  {value}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                              수량: {item.quantity}개
                            </p>
                            <p className="font-semibold text-gray-900 text-sm">
                              ₩{item.totalPrice.toLocaleString()}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            단가: ₩{item.price.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 총 결제 금액 표시 */}
                  <div className="border-t pt-3 mt-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">총 상품금액</span>
                        <span className="font-medium text-gray-900">
                          ₩{(() => {
                            // 모든 상품의 총 금액 계산
                            const totalProductAmount = selectedGroupOrder.items.reduce((sum, item) => {
                              const itemTotal = (item.price || 0) * (item.quantity || 1)
                              console.log(`💰 모달 상품 ${item.title}: ${itemTotal}원 (price: ${item.price}, quantity: ${item.quantity})`)
                              return sum + itemTotal
                            }, 0)
                            console.log(`💰 모달 총 상품금액: ${totalProductAmount}원`)
                            return totalProductAmount.toLocaleString()
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">배송비</span>
                        <span className="font-medium text-gray-900">₩4,000</span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm font-semibold text-gray-900">총 결제금액</span>
                        <span className="font-bold text-lg text-gray-900">
                          ₩{(() => {
                            // 상품금액 + 배송비로 올바른 총 결제금액 계산
                            const totalProductAmount = selectedGroupOrder.items.reduce((sum, item) => {
                              return sum + ((item.price || 0) * (item.quantity || 1))
                            }, 0)
                            const totalPaymentAmount = totalProductAmount + 4000
                            console.log(`💰 모달 총 결제금액: ${totalPaymentAmount}원 (상품: ${totalProductAmount} + 배송비: 4000)`)
                            return totalPaymentAmount.toLocaleString()
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* 하단 버튼 */}
            <div className="p-4 mt-8">
              <div className="space-y-3">
                <button
                  onClick={() => setSelectedGroupOrder(null)}
                  className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  주문 목록으로
                </button>
                <button
                  onClick={() => {
                    setSelectedGroupOrder(null)
                    router.push('/')
                  }}
                  className="w-full bg-red-500 text-white font-medium py-3 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <HomeIcon className="w-5 h-5" />
                  쇼핑 계속하기
                </button>
              </div>
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