/**
 * FileUploadSection - 엑셀 파일 업로드 섹션 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

import { DocumentArrowUpIcon } from '@heroicons/react/24/outline'

export default function FileUploadSection({ onFileUpload, loading }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">은행 거래내역 업로드</h2>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">엑셀 파일을 업로드하세요</p>
          <p className="text-sm text-gray-600">
            .xlsx, .xls 형식의 은행 거래내역 파일을 지원합니다
          </p>
        </div>

        <div className="mt-6">
          <label className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 cursor-pointer transition-colors">
            <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
            파일 선택
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={onFileUpload}
              className="hidden"
              disabled={loading}
            />
          </label>
        </div>
      </div>

      {/* Upload Instructions */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">📋 업로드 가이드</h3>
        <div className="bg-white rounded-lg p-3 mb-3">
          <h4 className="font-semibold text-blue-900 mb-2">✅ 엑셀 형식 (고정 열 위치)</h4>
          <div className="grid grid-cols-6 gap-1 text-xs">
            <div className="bg-green-100 p-2 rounded text-center font-medium">A열<br/>날짜</div>
            <div className="bg-gray-100 p-2 rounded text-center">B열</div>
            <div className="bg-green-100 p-2 rounded text-center font-medium">C열<br/>금액</div>
            <div className="bg-gray-100 p-2 rounded text-center">D열</div>
            <div className="bg-gray-100 p-2 rounded text-center">E열</div>
            <div className="bg-green-100 p-2 rounded text-center font-medium">F열<br/>입금자명</div>
          </div>
          <div className="text-center mt-2 text-xs text-gray-600">
            녹색 열만 사용됩니다 (A열: 날짜, C열: 금액, F열: 입금자명)
          </div>
        </div>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>A열:</strong> 거래일 (예: 2024-01-15)</li>
          <li>• <strong>C열:</strong> 금액 (예: 50000)</li>
          <li>• <strong>F열:</strong> 입금자명 (예: 홍길동)</li>
          <li>• 첫 번째 행이 헤더여도 자동으로 처리됩니다</li>
          <li>• 시스템이 자동으로 주문과 매칭을 시도합니다</li>
        </ul>
      </div>
    </div>
  )
}
