/**
 * useOrderActions - 주문 액션 핸들러 Custom Hook
 * @author Claude
 * @since 2025-10-21
 *
 * 역할: 주문 내역 페이지의 액션 핸들러 비즈니스 로직 관리
 * - 주문 클릭 (상세 페이지 이동 또는 그룹 모달)
 * - 주문 취소 (CancelOrderUseCase 사용)
 * - 개별 결제 (체크아웃 이동)
 * - 일괄 결제 (여러 주문 합산 결제)
 * - 주문 상태 정보 조회
 *
 * Clean Architecture:
 * - Presentation Layer (Page) → Application Layer (Hook) → Domain Layer (Use Case)
 * - ✅ Rule #0 준수: CancelOrderUseCase 사용 (직접 supabase 호출 제거)
 */

import { ClockIcon, CheckCircleIcon, TruckIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import logger from '@/lib/logger'

/**
 * useOrderActions Hook
 * @param {Object} params
 * @param {Object} params.user - useAuth().user
 * @param {Object} params.userSession - 세션 사용자 (카카오)
 * @param {Array} params.orders - 주문 목록 (useOrdersInit에서 제공)
 * @param {Object} params.router - Next.js router
 * @param {Function} params.refreshOrders - 주문 목록 새로고침 함수
 * @param {Function} params.setSelectedGroupOrder - 그룹 주문 선택 setState
 * @returns {Object} { handleOrderClick, handleCancelOrder, handlePayOrder, handlePayAllPending, getStatusInfo }
 */
export function useOrderActions({
  user,
  userSession,
  orders,
  router,
  refreshOrders,
  setSelectedGroupOrder
}) {
  /**
   * 주문 상태 정보 조회
   * @param {string} status - 주문 상태
   * @param {string} paymentMethod - 결제 방법 (card, bank_transfer)
   * @returns {Object} { label, color, icon }
   */
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

  /**
   * 주문 클릭 핸들러
   * - 그룹 주문: 모달 표시
   * - 개별 주문: 상세 페이지 이동
   */
  const handleOrderClick = (e, order) => {
    e.preventDefault()
    e.stopPropagation()

    if (order.isGroup) {
      setSelectedGroupOrder(order)
    } else {
      router.push(`/orders/${order.id}/complete`)
    }
  }

  /**
   * ✅ Rule #2 준수: API Route를 통한 Use Case 실행 (Layer 경계)
   * - 주문 취소 비즈니스 로직 실행
   * - 재고 복원 자동 처리
   * - 취소 후 주문 목록 새로고침
   */
  const handleCancelOrder = async (orderId) => {
    const confirmed = window.confirm('주문을 취소하시겠습니까?')
    if (!confirmed) return

    try {
      const currentUser = userSession || user
      if (!currentUser) {
        toast.error('사용자 정보를 찾을 수 없습니다')
        return
      }

      // ✅ API Route를 통한 Use Case 실행 (Presentation → API → Use Case → Repository)
      const response = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          user: {
            id: currentUser.id,
            kakaoId: currentUser.kakao_id || currentUser.kakaoId
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '주문 취소 실패')
      }

      toast.success('주문이 취소되었습니다')

      // 주문 목록 새로고침
      await refreshOrders()
    } catch (error) {
      logger.error('주문 취소 중 오류:', error)
      toast.error(error.message || '주문 취소 중 오류가 발생했습니다')
    }
  }

  /**
   * 개별 결제 핸들러
   * - 결제대기 주문을 체크아웃으로 이동
   * - 기존 주문 업데이트용 플래그 추가
   */
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
    const calculatedTotalPrice = itemPrice * itemQuantity

    const orderItem = {
      id: firstItem.id || order.id,
      title: firstItem.title,
      price: itemPrice,
      thumbnail_url: firstItem?.thumbnail_url || '/placeholder.png',
      quantity: itemQuantity,
      totalPrice: calculatedTotalPrice,
      selectedOptions: firstItem.selectedOptions || {},
      // ✅ 기존 주문 업데이트용 플래그
      isBulkPayment: true,
      originalOrderIds: [order.id], // 단일 주문도 배열로 전달
      itemCount: 1
    }

    sessionStorage.setItem('checkoutItem', JSON.stringify(orderItem))
    router.push('/checkout')
  }

  /**
   * 일괄 결제 핸들러
   * - 모든 결제대기 주문을 합산하여 결제
   * - 재고는 이미 차감되어 있으므로 검증 생략
   */
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
      thumbnail_url: pendingOrders[0]?.items[0]?.thumbnail_url || '/placeholder.png',
      quantity: totalQuantity,
      totalPrice: totalPrice,
      selectedOptions: {},
      // 원본 주문들의 ID만 저장 (결제 완료 후 처리용)
      originalOrderIds: pendingOrders.map(order => order.id),
      // 일괄결제 플래그
      isBulkPayment: true,
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

  return {
    getStatusInfo,
    handleOrderClick,
    handleCancelOrder,
    handlePayOrder,
    handlePayAllPending
  }
}
