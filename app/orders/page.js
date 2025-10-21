'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  HomeIcon,
  ClipboardDocumentIcon,
  ExclamationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import useAuth from '@/hooks/useAuth'
import { getOrders, cancelOrder } from '@/lib/supabaseApi'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'
import logger from '@/lib/logger'
import OrderCalculations from '@/lib/orderCalculations'
import { formatShippingInfo } from '@/lib/shippingUtils'
import { getTrackingUrl, getCarrierName } from '@/lib/trackingNumberUtils'

// ⚡ Dynamic Import: 모달은 열릴 때만 로드 (번들 크기 20-30KB 감소)
const GroupOrderModal = dynamic(() => import('@/app/components/orders/GroupOrderModal'), {
  loading: () => null,
  ssr: false
})

function OrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [userSession, setUserSession] = useState(null)
  const [orders, setOrders] = useState([])
  const [pageLoading, setPageLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [selectedGroupOrder, setSelectedGroupOrder] = useState(null)

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({ totalPages: 0, totalCount: 0, pageSize: 10 })
  const [statusCounts, setStatusCounts] = useState({})

  // ✅ 초기화 완료 플래그 (useRef)
  const hasInitialized = useRef(false)

  // RLS 디버그 제거 (프로덕션 성능 최적화)

  // 🚀 통합된 고성능 초기화 (모든 useEffect 통합)
  useEffect(() => {
    // ✅ 이미 초기화되었으면 실행 안 함 (authLoading 변경 시 재실행 방지)
    if (hasInitialized.current) {
      return
    }

    const initOrdersPageFast = async () => {
      setPageLoading(true)

      try {
        // ⚡ 1단계: 동기 데이터 로드 (즉시 실행)
        const sessionData = loadSessionDataSync()
        const urlData = parseUrlParameters()

        // ⚡ 2단계: 인증 검증
        const authResult = validateAuthenticationFast(sessionData)

        if (!authResult.success) {
          hasInitialized.current = true  // ✅ 실패해도 플래그 설정 (무한 루프 방지)
          setPageLoading(false)
          return
        }

        // ⚡ 3단계: 주문 데이터 병렬 로드
        await loadOrdersDataFast(authResult.currentUser)

        logger.info('✅ 주문내역 고속 초기화 완료')
      } catch (error) {
        logger.error('주문내역 초기화 실패:', error)
        toast.error('주문내역을 불러오는 중 오류가 발생했습니다')
        setOrders([])
      } finally {
        // ✅ 성공/실패 관계없이 항상 플래그 설정 (무한 루프 방지)
        hasInitialized.current = true
        setPageLoading(false)
      }
    }

    // 🔧 동기 세션 데이터 로드
    const loadSessionDataSync = () => {
      try {
        // 📱 모바일 환경: sessionStorage 접근 가능 여부 확인
        if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
          return { sessionUser: null }
        }

        const storedUser = sessionStorage.getItem('user')
        let sessionUser = null
        if (storedUser) {
          sessionUser = JSON.parse(storedUser)
          setUserSession(sessionUser)
        }
        return { sessionUser }
      } catch (error) {
        logger.warn('세션 로드 실패:', error)
        setUserSession(null)
        return { sessionUser: null }
      }
    }

    // 🔧 URL 파라미터 분석
    const parseUrlParameters = () => {
      const tab = searchParams.get('tab')
      if (tab && ['pending', 'verifying', 'paid', 'delivered'].includes(tab)) {
        setFilterStatus(tab)
      }
      return { tab }
    }

    // 🔒 인증 검증 (빠른 검사)
    const validateAuthenticationFast = ({ sessionUser }) => {
      // ✅ sessionUser가 있으면 authLoading과 관계없이 즉시 진행 (카카오 사용자 우선)
      if (sessionUser?.id) {
        return { success: true, currentUser: sessionUser }
      }

      // ✅ useAuth의 user가 있으면 진행 (일반 사용자)
      if (user?.id) {
        return { success: true, currentUser: user }
      }

      // 🚫 둘 다 없으면 로그인 필요
      // 📱 모바일: authLoading이 false가 되면 즉시 로그인 페이지로
      if (!authLoading) {
        toast.error('로그인이 필요합니다')
        router.push('/login')
        return { success: false }
      }

      // authLoading 중이면 대기 (단, 한 번만 대기하고 hasInitialized로 차단됨)
      return { success: false }
    }

    // ⚡ 주문 데이터 고속 로드
    const loadOrdersDataFast = async (currentUser) => {
      try {
        console.log('🔍 [DEBUG] 주문 로딩 시작:', { userId: currentUser.id, page: currentPage, status: filterStatus })
        const startTime = Date.now()

        // 🚀 통합 API 사용 (페이지네이션 포함)
        const result = await getOrders(currentUser.id, {
          page: currentPage,
          pageSize: 10,
          status: filterStatus
        })

        const elapsed = Date.now() - startTime
        console.log('✅ [DEBUG] 주문 로딩 완료:', { count: result.orders?.length, elapsed: `${elapsed}ms` })

        setOrders(result.orders || [])
        setPagination(result.pagination || { currentPage: 1, totalPages: 0, totalCount: 0, pageSize: 10 })
        setStatusCounts(result.statusCounts || {})
        return result.orders
      } catch (error) {
        logger.error('주문 데이터 로드 오류:', error)
        setOrders([])
        setPagination({ currentPage: 1, totalPages: 0, totalCount: 0, pageSize: 10 })
        setStatusCounts({})
        throw error
      }
    }

    // 포커스 이벤트 리스너 (선택적 새로고침)
    const setupFocusRefresh = () => {
      const handleFocus = () => {
        if (!pageLoading && (userSession || isAuthenticated)) {
          loadOrdersDataFast(userSession || user).catch(err => logger.warn('주문 새로고침 실패:', err))
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

          // 통합 API 사용 (페이지네이션 포함)
          const result = await getOrders(currentUser.id, {
            page: currentPage,
            pageSize: 10,
            status: filterStatus
          })

          setOrders(result.orders || [])
          setPagination(result.pagination || { currentPage: 1, totalPages: 0, totalCount: 0, pageSize: 10 })
          setStatusCounts(result.statusCounts || {})
          setPageLoading(false)
        }
      }
    } catch (error) {
      logger.warn('주문 새로고침 실패:', error)
      setPageLoading(false)
    }
  }

  // 페이지나 필터 변경 시 데이터 다시 로드 (⚡ 즉시 반응)
  useEffect(() => {
    // ✅ 초기 로딩이 완료된 후에만 페이지/필터 변경에 반응
    if (!pageLoading && (userSession || isAuthenticated)) {
      refreshOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filterStatus])

  // ⚡ 로딩 상태 체크 (통합된 단일 로딩)
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-800 font-medium text-lg mb-2">주문내역 로딩 중</p>
          <p className="text-gray-500 text-sm">잠시만 기다려주세요...</p>
        </div>
      </div>
    )
  }

  // 탭 변경 핸들러 (페이지 리셋 + URL 업데이트)
  const handleTabChange = (newStatus) => {
    setFilterStatus(newStatus)
    setCurrentPage(1) // 페이지 1로 리셋
    // ⚡ URL 업데이트 (리로드 없이, 스크롤 유지)
    router.replace(`/orders?tab=${newStatus}`, { scroll: false })
  }

  // 페이지 변경 핸들러
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage)
      // 페이지 상단으로 스크롤
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // 상태별 필터링 (이미 API에서 필터링됨)
  const filteredOrders = orders

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
      selectedOptions: firstItem.selectedOptions || {},
      // ✅ 기존 주문 업데이트용 플래그 추가
      isBulkPayment: true,
      originalOrderIds: [order.id], // 단일 주문도 배열로 전달
      itemCount: 1
    }

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
      const currentUser = userSession || user
      if (currentUser) {
        const updatedOrders = await getOrders(currentUser.id)
        setOrders(updatedOrders)
      }
    } catch (error) {
      logger.error('주문 취소 중 오류:', error)
      toast.error('주문 취소 중 오류가 발생했습니다')
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
    logger.debug('일괄결제: 결제대기 주문들의 재고는 이미 확보되어 있으므로 검증 생략')

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

    try {
      // sessionStorage 저장 시도 (용량 초과 시 오류 처리)
      sessionStorage.setItem('checkoutItem', JSON.stringify(combinedOrderItem))
      toast.success(`${pendingOrders.length}개 주문 (총 ₩${totalPrice.toLocaleString()})을 결제합니다`)
      router.push('/checkout')
    } catch (error) {
      logger.error('SessionStorage 저장 실패:', error)
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
              const count = statusCounts[filter.key] || 0
              return (
              <button
                key={filter.key}
                onClick={() => handleTabChange(filter.key)}
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
                // ✅ 전체 상품 수량 계산 (주문 개수가 아닌 아이템 수량 합계)
                const totalItemCount = pendingOrders.reduce((sum, order) => {
                  return sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0)
                }, 0)

                // ✅ 무료배송 조건 체크: pending 주문들 중 하나라도 is_free_shipping = true이면 무료
                const hasFreeShipping = pendingOrders.some(order => order.is_free_shipping === true)
                const shippingFee = hasFreeShipping ? 0 : 4000
                const finalTotal = totalProductPrice + shippingFee

                return (
                  <div className="space-y-2">
                    {hasFreeShipping && (
                      <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs font-medium text-green-800">
                          🎉 무료배송 혜택 적용!
                        </p>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">상품금액 ({totalItemCount}개)</span>
                      <span className="text-gray-900">₩{totalProductPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">배송비</span>
                      <span className="text-gray-900">
                        {shippingFee === 0 ? (
                          <span className="text-green-600 font-semibold">무료</span>
                        ) : (
                          `₩${shippingFee.toLocaleString()}`
                        )}
                      </span>
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

                // 🔀 상품 그룹핑 로직 (제품번호 + 옵션 조합으로 그룹화)
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
                        originalIndices: [],  // 원본 아이템 인덱스 추적
                        originalItems: []     // 원본 아이템 저장
                      }
                    }

                    groups[groupKey].quantity += item.quantity || 1
                    groups[groupKey].totalPrice += ((item.price || 0) * (item.quantity || 1))
                    groups[groupKey].originalIndices.push(originalIndex)
                    groups[groupKey].originalItems.push(item)
                  })

                  return Object.values(groups)
                }

                const groupedItems = groupOrderItems(order.items || [])

                // 🧮 배송비 포함 총 결제금액 계산 (OrderCalculations 사용)
                // ✅ DB 저장된 무료배송 조건 사용
                const baseShippingFee = order.is_free_shipping ? 0 : 4000
                const shippingInfo = formatShippingInfo(baseShippingFee, order.shipping?.postal_code)
                const orderCalc = OrderCalculations.calculateFinalOrderAmount(order.items, {
                  region: shippingInfo.region,
                  coupon: order.discount_amount > 0 ? {
                    type: 'fixed_amount',
                    value: order.discount_amount
                  } : null,
                  paymentMethod: order.payment?.method || 'transfer',
                  baseShippingFee: baseShippingFee  // ✅ 무료배송 조건 전달
                })
                const finalAmount = orderCalc.finalAmount

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

                    {/* 상품 정보 - 그룹화된 아이템들을 모두 표시 */}
                    <div className="space-y-3 mb-3">
                      {groupedItems.map((groupedItem, itemIndex) => (
                        <div key={itemIndex} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={groupedItem.thumbnail_url || '/placeholder.png'}
                              alt={groupedItem.title}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* 제품번호 + 상품명 (한 줄) */}
                            <h3 className="mb-1 line-clamp-1 text-sm">
                              <span className="font-bold text-gray-900">{groupedItem.product_number || groupedItem.product_id}</span>
                              {groupedItem.title && groupedItem.title !== (groupedItem.product_number || groupedItem.product_id) && (
                                <span className="text-xs text-gray-500"> {groupedItem.title}</span>
                              )}
                            </h3>

                            {/* 선택된 옵션 표시 */}
                            {groupedItem.selectedOptions && Object.keys(groupedItem.selectedOptions).length > 0 && (
                              <div className="mb-1">
                                {Object.entries(groupedItem.selectedOptions).map(([optionId, value]) => (
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
                              단가: ₩{groupedItem.price?.toLocaleString() || '0'}
                            </p>

                            {/* 수량 표시 - 읽기 전용 */}
                            <p className="text-xs text-gray-700 font-medium mb-1">
                              수량: {groupedItem.quantity}개
                            </p>

                            {/* 소계 표시 */}
                            <p className="text-xs text-gray-900 font-semibold mt-1">
                              소계: ₩{groupedItem.totalPrice?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 송장번호 표시 (출고완료 상태인 경우) */}
                    {(order.status === 'delivered' || order.status === 'shipping') && order.shipping?.tracking_number && (
                      <div className="mb-2 pb-2 border-b border-gray-100">
                        <div className="flex items-center justify-between text-sm gap-2">
                          <span className="text-gray-600">배송조회</span>
                          <a
                            href={getTrackingUrl(order.shipping?.tracking_company, order.shipping?.tracking_number)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="font-medium">{getCarrierName(order.shipping?.tracking_company)}</span>
                            <span className="font-mono">{order.shipping.tracking_number}</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {/* 주문 정보 */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-500">
                        {formatDistanceToNow(new Date(order.created_at), {
                          addSuffix: true,
                          locale: ko
                        })}
                      </div>
                      <div className="font-semibold text-gray-900">
                        ₩{finalAmount.toLocaleString()}
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

          {/* 페이지네이션 (주문이 있을 때만 표시) */}
          {filteredOrders.length > 0 && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-6 mt-4">
              {/* 이전 버튼 */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-3 rounded-lg
                           bg-white border border-gray-300 font-medium text-sm
                           disabled:opacity-40 disabled:cursor-not-allowed
                           active:bg-gray-100 transition-all
                           min-w-[80px] justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>이전</span>
              </button>

              {/* 페이지 정보 */}
              <div className="flex flex-col items-center gap-1">
                <div className="text-base font-semibold">
                  <span className="text-red-500 text-lg">{currentPage}</span>
                  <span className="text-gray-400 mx-2">/</span>
                  <span className="text-gray-600">{pagination.totalPages}</span>
                </div>
                <div className="text-xs text-gray-500">
                  총 {pagination.totalCount}건
                </div>
              </div>

              {/* 다음 버튼 */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="flex items-center gap-2 px-4 py-3 rounded-lg
                           bg-white border border-gray-300 font-medium text-sm
                           disabled:opacity-40 disabled:cursor-not-allowed
                           active:bg-gray-100 transition-all
                           min-w-[80px] justify-center"
              >
                <span>다음</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ⚡ 일괄결제 주문 상세 모달 - Dynamic Import */}
      <GroupOrderModal
        selectedGroupOrder={selectedGroupOrder}
        setSelectedGroupOrder={setSelectedGroupOrder}
      />
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