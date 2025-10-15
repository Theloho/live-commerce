'use client'

import { useState, useRef } from 'react'
import {
  XMarkIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { bulkUpdateTrackingNumbers, parseTrackingExcel } from '@/lib/trackingNumberUtils'
import toast from 'react-hot-toast'

/**
 * 송장번호 대량 업로드 컴포넌트
 *
 * ✅ 완전히 독립적인 컴포넌트
 * ✅ Props로만 데이터 받음
 * ✅ Excel/CSV 파일 파싱 및 일괄 업데이트
 *
 * @param {Object} props
 * @param {string} props.adminEmail - 관리자 이메일
 * @param {Function} props.onSuccess - 성공 콜백 ({ matched, failed, results })
 * @param {Function} props.onClose - 닫기 콜백
 *
 * @example
 * <TrackingNumberBulkUpload
 *   adminEmail={adminUser.email}
 *   onSuccess={({ matched, failed }) => {
 *     toast.success(`${matched}개 성공`)
 *     loadOrders()
 *   }}
 *   onClose={() => setShowModal(false)}
 * />
 */
export default function TrackingNumberBulkUpload({
  adminEmail,
  onSuccess,
  onClose
}) {
  const [file, setFile] = useState(null)
  const [trackingData, setTrackingData] = useState([])
  const [parsing, setParsing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const fileInputRef = useRef(null)

  // Step 1: 파일 선택
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setTrackingData([])
    setUploadResult(null)

    try {
      setParsing(true)
      const parsedData = await parseTrackingExcel(selectedFile)
      setTrackingData(parsedData)
      toast.success(`${parsedData.length}개 주문이 인식되었습니다`)
    } catch (error) {
      console.error('파일 파싱 오류:', error)
      toast.error(error.message || '파일 파싱에 실패했습니다')
      setFile(null)
    } finally {
      setParsing(false)
    }
  }

  // Step 2: 일괄 업로드
  const handleBulkUpload = async () => {
    if (trackingData.length === 0) {
      toast.error('업로드할 데이터가 없습니다')
      return
    }

    try {
      setUploading(true)

      const result = await bulkUpdateTrackingNumbers({
        adminEmail,
        trackingData
      })

      setUploadResult(result)

      toast.success(
        `${result.matched}개 주문의 송장번호가 저장되었습니다`
      )

      // 성공 콜백 호출
      onSuccess?.({
        matched: result.matched,
        failed: result.failed,
        results: result.results
      })
    } catch (error) {
      console.error('대량 업로드 오류:', error)
      toast.error(error.message || '대량 업로드에 실패했습니다')
    } finally {
      setUploading(false)
    }
  }

  // 샘플 Excel 다운로드
  const downloadSample = () => {
    const csvContent = `주문번호,송장번호,택배사
G251015-1234,1234567890123,cj
S251015-5678,9876543210987,hanjin
G251015-9999,1111222233334,lotte`

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', '송장번호_업로드_샘플.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('샘플 파일이 다운로드되었습니다')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <DocumentArrowUpIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">송장번호 대량 업로드</h2>
              <p className="text-xs text-gray-500">Excel 파일로 여러 주문의 송장번호를 한 번에 등록</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: 파일 업로드 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">1. Excel 파일 업로드</h3>
              <button
                onClick={downloadSample}
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                샘플 다운로드
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 hover:bg-purple-50 transition-colors cursor-pointer"
            >
              <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {parsing ? '파싱 중...' : `${trackingData.length}개 주문 인식됨`}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                      setTrackingData([])
                      setUploadResult(null)
                    }}
                    className="text-xs text-red-600 hover:text-red-700 mt-2"
                  >
                    파일 제거
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600">클릭하여 파일 선택</p>
                  <p className="text-xs text-gray-500 mt-1">Excel (.xlsx, .xls) 또는 CSV 파일</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <strong>필수 컬럼:</strong> 주문번호, 송장번호 | <strong>선택 컬럼:</strong> 택배사
              </p>
            </div>
          </div>

          {/* Step 2: 매칭 결과 미리보기 */}
          {trackingData.length > 0 && !uploadResult && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                2. 매칭 결과 ({trackingData.length}개)
              </h3>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">번호</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">주문번호</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">송장번호</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">택배사</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {trackingData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-600">{index + 1}</td>
                          <td className="px-4 py-2 font-medium text-gray-900">
                            {item.customerOrderNumber}
                          </td>
                          <td className="px-4 py-2 text-gray-700 font-mono">
                            {item.trackingNumber}
                          </td>
                          <td className="px-4 py-2 text-gray-600">
                            {item.trackingCompany || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-700">
                  ⚠️ 매칭된 <strong>{trackingData.length}개</strong> 주문이 <strong>"발송 중"</strong>으로 변경됩니다
                </p>
              </div>
            </div>
          )}

          {/* Step 3: 업로드 결과 */}
          {uploadResult && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">3. 업로드 결과</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">성공</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{uploadResult.matched}개</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircleIcon className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-900">실패</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{uploadResult.failed}개</p>
                </div>
              </div>

              {uploadResult.failed > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2">
                    <h4 className="text-xs font-medium text-gray-700">실패한 주문 목록</h4>
                  </div>
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">주문번호</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">오류 원인</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {uploadResult.results
                          .filter(r => r.status !== 'success')
                          .map((result, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 font-medium text-gray-900">
                                {result.customerOrderNumber}
                              </td>
                              <td className="px-4 py-2 text-red-600 text-xs">
                                {result.error}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 버튼 */}
        <div className="flex items-center gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {uploadResult ? '닫기' : '취소'}
          </button>

          {!uploadResult && (
            <button
              type="button"
              onClick={handleBulkUpload}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={trackingData.length === 0 || uploading}
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  업로드 중...
                </span>
              ) : (
                `${trackingData.length}개 주문 일괄 처리`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
