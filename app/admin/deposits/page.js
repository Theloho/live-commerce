/**
 * Admin Deposits Page - 입금 확인 페이지 (Phase 4.3 리팩토링 완료)
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture 적용:
 * - Presentation Layer: 이 파일 (Composition Layer, ≤ 200 lines, Rule 1)
 * - Application Layer: useDepositMatching hook
 * - Infrastructure Layer: Repository (직접 DB 접근 제거)
 *
 * ✅ Rule #0 준수:
 * - Rule 1: 파일 크기 ≤200줄
 * - Rule 2: Layer boundary 준수 (직접 DB 접근 금지)
 * - Rule 4: 함수 개수 ≤10개 (컴포넌트로 분리)
 * - Rule 5: 직접 supabase 호출 제거 (Hook을 통한 간접 호출)
 */

'use client'

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'
import { useDepositMatching } from '@/app/hooks/useDepositMatching'
import DepositHeader from '@/app/components/admin/deposits/DepositHeader'
import DepositStats from '@/app/components/admin/deposits/DepositStats'
import FileUploadSection from '@/app/components/admin/deposits/FileUploadSection'
import QuickSearchModal from '@/app/components/admin/deposits/QuickSearchModal'
import MatchedTransactionsTable from '@/app/components/admin/deposits/MatchedTransactionsTable'
import PendingOrdersTable from '@/app/components/admin/deposits/PendingOrdersTable'

export default function AdminDepositsPage() {
  const { adminUser, loading: authLoading } = useAdminAuth()

  // ⚡ 비즈니스 로직 Hook
  const {
    // State
    pendingOrders,
    bankTransactions,
    matchedTransactions,
    unmatchedTransactions,
    loading,
    searchTerm,
    setSearchTerm,
    quickSearchResults,
    setQuickSearchResults,
    quickSearchTerm,
    setQuickSearchTerm,
    currentPage,
    totalCount,
    hasMore,
    ITEMS_PER_PAGE,
    // Functions
    loadPendingOrders,
    handleFileUpload,
    confirmPayment,
    handleQuickSearch,
    handleConfirmPayment,
    // Computed
    filteredMatched,
    filteredUnmatched
  } = useDepositMatching({ adminUser })

  return (
    <div className="space-y-6">
      {/* Header */}
      <DepositHeader
        pendingOrders={pendingOrders}
        matchedTransactions={matchedTransactions}
        unmatchedTransactions={unmatchedTransactions}
        bankTransactions={bankTransactions}
        onRefresh={loadPendingOrders}
      />

      {/* Compact Stats */}
      <DepositStats
        pendingOrders={pendingOrders}
        matchedTransactions={matchedTransactions}
        unmatchedTransactions={unmatchedTransactions}
        bankTransactions={bankTransactions}
      />

      {/* File Upload */}
      <FileUploadSection
        onFileUpload={handleFileUpload}
        loading={loading}
      />

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">거래내역을 분석하고 매칭하는 중...</p>
        </div>
      )}

      {/* Search */}
      {(matchedTransactions.length > 0 || unmatchedTransactions.length > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="입금자명, 주문번호로 검색 (매칭 실패한 거래 포함)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            {searchTerm && filteredUnmatched.length > 0 && (
              <div className="text-sm text-gray-600">
                매칭 실패: {filteredUnmatched.length}건
              </div>
            )}
          </div>

          {/* 검색 시 매칭 실패한 거래 표시 */}
          {searchTerm && filteredUnmatched.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <h3 className="text-sm font-medium text-red-800 mb-2">🔍 검색된 매칭 실패 거래</h3>
              <div className="space-y-2">
                {filteredUnmatched.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="text-sm">
                    <span className="font-medium text-red-700">{transaction.depositor}</span>
                    <span className="text-gray-600 ml-2">₩{transaction.amount.toLocaleString()}</span>
                    <span className="text-gray-500 ml-2">{transaction.date}</span>
                  </div>
                ))}
                {filteredUnmatched.length > 5 && (
                  <div className="text-xs text-gray-500">외 {filteredUnmatched.length - 5}건 더...</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Search Modal */}
      <QuickSearchModal
        quickSearchResults={quickSearchResults}
        quickSearchTerm={quickSearchTerm}
        onClose={() => {
          setQuickSearchResults(null)
          setQuickSearchTerm('')
        }}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* Matched Transactions */}
      <MatchedTransactionsTable
        filteredMatched={filteredMatched}
        onConfirmPayment={confirmPayment}
      />

      {/* Pending Orders */}
      <PendingOrdersTable
        pendingOrders={pendingOrders}
        totalCount={totalCount}
        currentPage={currentPage}
        hasMore={hasMore}
        ITEMS_PER_PAGE={ITEMS_PER_PAGE}
        onLoadPage={loadPendingOrders}
        onQuickSearch={handleQuickSearch}
        onConfirmGroupPayment={confirmPayment}
      />
    </div>
  )
}
