/**
 * QuickSearchModal - 빠른 검색 모달 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

import { motion } from 'framer-motion'

export default function QuickSearchModal({
  quickSearchResults,
  quickSearchTerm,
  onClose,
  onConfirmPayment
}) {
  if (!quickSearchResults) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-blue-50 px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-900">
            🔍 &quot;{quickSearchTerm}&quot; 검색 결과 ({quickSearchResults.length}건)
          </h2>
          <button
            onClick={onClose}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-1 rounded hover:bg-blue-100 transition-colors"
          >
            닫기 ×
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {quickSearchResults.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {quickSearchResults.map((item, index) => (
                <motion.div
                  key={item.transaction.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-gray-50"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-gray-900">{item.transaction.depositor}</p>
                          {item.confidence && (
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              item.confidence === 'high' ? 'bg-green-100 text-green-800' :
                              item.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {item.confidence === 'high' ? '높은 매칭' :
                               item.confidence === 'medium' ? '보통 매칭' : '낮은 매칭'}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-700">거래 정보</p>
                            <p className="text-sm text-gray-600">
                              입금액: ₩{item.transaction.amount.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              입금일: {item.transaction.date}
                            </p>
                            <p className="text-xs text-gray-400">
                              엑셀 {item.transaction.rowIndex}행
                            </p>
                          </div>

                          {item.relatedOrder && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">매칭된 주문</p>
                              <p className="text-sm text-gray-600">
                                주문금액: ₩{item.relatedOrder.payment?.amount.toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-600">
                                주문일: {new Date(item.relatedOrder.created_at).toLocaleDateString('ko-KR')}
                              </p>
                              <p className="text-xs text-gray-400">
                                주문번호: {item.relatedOrder.customerOrderNumber || item.relatedOrder.id.slice(-8)}
                              </p>
                            </div>
                          )}
                        </div>

                        {item.relatedOrder && (
                          <div className="flex items-center gap-2 pt-2">
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              Math.abs(item.transaction.amount - (item.relatedOrder.payment?.amount || 0)) === 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              금액차이: ₩{Math.abs(item.transaction.amount - (item.relatedOrder.payment?.amount || 0)).toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {!item.relatedOrder ? (
                          <div className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
                            미매칭
                          </div>
                        ) : (
                          <>
                            <div className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                              매칭됨
                            </div>
                            {item.relatedOrder.status === 'pending' && (
                              <button
                                onClick={() => onConfirmPayment(item.transaction, item.relatedOrder)}
                                className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                              >
                                입금확인
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">&quot;{quickSearchTerm}&quot;와 일치하는 거래를 찾을 수 없습니다.</p>
              <p className="text-gray-400 text-sm mt-1">업로드된 엑셀 파일에서 입금자명을 검색합니다.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>엑셀 파일에서 검색된 결과입니다</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
