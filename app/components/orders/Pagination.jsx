/**
 * Pagination - 페이지네이션 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * 역할: 주문 목록 페이지네이션 UI
 * - 이전/다음 버튼
 * - 현재 페이지 / 전체 페이지 표시
 * - 총 주문 개수 표시
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

/**
 * Pagination Component
 * @param {Object} props
 * @param {number} props.currentPage - 현재 페이지 번호
 * @param {number} props.totalPages - 전체 페이지 수
 * @param {number} props.totalCount - 전체 주문 개수
 * @param {Function} props.onPageChange - 페이지 변경 핸들러
 * @param {boolean} props.hasOrders - 주문이 있는지 여부 (조건부 렌더링)
 */
export default function Pagination({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  hasOrders
}) {
  // 조건부 렌더링: 주문이 없거나 페이지가 1개면 표시 안 함
  if (!hasOrders || totalPages <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-between px-4 py-6 mt-4">
      {/* 이전 버튼 */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
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
          <span className="text-gray-600">{totalPages}</span>
        </div>
        <div className="text-xs text-gray-500">
          총 {totalCount}건
        </div>
      </div>

      {/* 다음 버튼 */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
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
  )
}
