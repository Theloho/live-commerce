/**
 * DepositStats - 입금 확인 통계 카드 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline'

export default function DepositStats({
  pendingOrders,
  matchedTransactions,
  unmatchedTransactions,
  bankTransactions
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200">
        <div className="p-3 text-center bg-yellow-50">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-yellow-600 font-medium">입금 대기</span>
          </div>
          <p className="text-lg font-bold text-yellow-700">{pendingOrders.length}</p>
        </div>

        <div className="p-3 text-center bg-green-50">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            <span className="text-xs text-green-600 font-medium">매칭 완료</span>
          </div>
          <p className="text-lg font-bold text-green-700">{matchedTransactions.length}</p>
        </div>

        <div className="p-3 text-center bg-red-50">
          <div className="flex items-center justify-center gap-2 mb-1">
            <XCircleIcon className="w-4 h-4 text-red-500" />
            <span className="text-xs text-red-600 font-medium">매칭 실패</span>
          </div>
          <p className="text-lg font-bold text-red-700">{unmatchedTransactions.length}</p>
        </div>

        <div className="p-3 text-center bg-blue-50">
          <div className="flex items-center justify-center gap-2 mb-1">
            <DocumentArrowUpIcon className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-blue-600 font-medium">총 거래건</span>
          </div>
          <p className="text-lg font-bold text-blue-700">{bankTransactions.length}</p>
        </div>
      </div>
    </div>
  )
}
