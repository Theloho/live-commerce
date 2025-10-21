/**
 * DepositHeader - 입금 확인 페이지 헤더 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

export default function DepositHeader({
  pendingOrders,
  matchedTransactions,
  unmatchedTransactions,
  bankTransactions,
  onRefresh
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">💰 입금 확인</h1>
        <p className="text-sm text-gray-600 mt-1">
          입금 대기 {pendingOrders.length}건 | 매칭 완료 {matchedTransactions.length}건 | 매칭 실패 {unmatchedTransactions.length}건 | 총 거래 {bankTransactions.length}건
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          새로고침
        </button>
      </div>
    </div>
  )
}
