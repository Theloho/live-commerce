/**
 * OrdersPage - 주문 내역 페이지 (Phase 4.2 리팩토링 완료)
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture 적용:
 * - Presentation Layer: 이 파일 (≤ 200 lines, Rule 1)
 * - Application Layer: useOrdersInit, useOrderActions hooks
 * - Infrastructure Layer: OrderRepository (직접 DB 접근 제거)
 *
 * ✅ Rule #0 준수:
 * - Rule 1: 파일 크기 200줄 이하
 * - Rule 2: Layer boundary 준수 (직접 DB 접근 금지)
 * - Rule 5: 직접 supabase 호출 제거 (Hook을 통한 간접 호출)
 */

'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import useAuth from '@/hooks/useAuth'
import { useOrdersInit } from '@/app/hooks/useOrdersInit'
import { useOrderActions } from '@/app/hooks/useOrderActions'
import OrderCard from '@/app/components/orders/OrderCard'
import OrderFilter from '@/app/components/orders/OrderFilter'
import Pagination from '@/app/components/orders/Pagination'

// ⚡ Dynamic Import: 모달은 열릴 때만 로드 (번들 크기 20-30KB 감소)
const GroupOrderModal = dynamic(() => import('@/app/components/orders/GroupOrderModal'), {
  loading: () => null,
  ssr: false
})

function OrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, loading: authLoading } = useAuth()

  // 그룹 주문 모달 상태
  const [selectedGroupOrder, setSelectedGroupOrder] = useState(null)

  // ⚡ 초기화 Hook - 모든 초기화 로직을 Custom Hook으로 추출
  const {
    orders,
    pageLoading,
    filterStatus,
    pagination,
    statusCounts,
    currentPage,
    userSession,
    handleTabChange,
    handlePageChange,
    refreshOrders,
    setOrders
  } = useOrdersInit({ user, isAuthenticated, authLoading, router, searchParams })

  // ⚡ 액션 Hook - 모든 액션 핸들러를 Custom Hook으로 추출
  const {
    getStatusInfo,
    handleOrderClick,
    handleCancelOrder,
    handlePayOrder,
    handlePayAllPending
  } = useOrderActions({
    user,
    userSession,
    orders,
    router,
    refreshOrders,
    setSelectedGroupOrder
  })

  // 로딩 상태
  if ((authLoading && !userSession) || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-800 font-medium text-lg mb-2">주문 내역 불러오는 중</p>
          <p className="text-gray-500 text-sm">잠시만 기다려주세요...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">주문 내역</h1>
            <div className="w-10"></div>
          </div>
        </div>

        {/* 필터 + 결제 요약 + 빈 상태 */}
        <OrderFilter
          filterStatus={filterStatus}
          statusCounts={statusCounts}
          orders={orders}
          onTabChange={handleTabChange}
          onPayAllPending={handlePayAllPending}
          getStatusInfo={getStatusInfo}
          router={router}
        />

        {/* 주문 목록 */}
        {orders.length > 0 && (
          <div className="px-4 py-4">
            <div className="space-y-4">
              {orders.map((order, index) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={index}
                  onOrderClick={handleOrderClick}
                  onCancelOrder={handleCancelOrder}
                  getStatusInfo={getStatusInfo}
                  bulkPaymentInfo={order.bulkPaymentInfo || null}
                />
              ))}
            </div>

            {/* 페이지네이션 */}
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              onPageChange={handlePageChange}
              hasOrders={orders.length > 0}
            />
          </div>
        )}
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
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  )
}
