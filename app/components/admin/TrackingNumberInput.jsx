'use client'

import { useState } from 'react'
import { XMarkIcon, TruckIcon } from '@heroicons/react/24/outline'
import { updateTrackingNumber, CARRIERS, validateTrackingNumber } from '@/lib/trackingNumberUtils'
import toast from 'react-hot-toast'

/**
 * 송장번호 단일 입력 컴포넌트
 *
 * ✅ 완전히 독립적인 컴포넌트
 * ✅ Props로만 데이터 받음
 * ✅ 어떤 페이지에서든 재사용 가능
 *
 * @param {Object} props
 * @param {string} props.orderId - 주문 ID (UUID)
 * @param {string} props.adminEmail - 관리자 이메일
 * @param {string} [props.currentTracking] - 기존 송장번호 (수정 시)
 * @param {string} [props.currentCompany] - 기존 택배사 (수정 시)
 * @param {Function} props.onSuccess - 성공 콜백 ({ orderId, trackingNumber, trackingCompany })
 * @param {Function} props.onClose - 닫기 콜백
 *
 * @example
 * <TrackingNumberInput
 *   orderId={order.id}
 *   adminEmail={adminUser.email}
 *   currentTracking="1234567890"
 *   onSuccess={({ orderId, trackingNumber }) => {
 *     toast.success('저장 완료')
 *     loadOrders()
 *   }}
 *   onClose={() => setShowModal(false)}
 * />
 */
export default function TrackingNumberInput({
  orderId,
  adminEmail,
  currentTracking = '',
  currentCompany = '',
  onSuccess,
  onClose
}) {
  const [trackingNumber, setTrackingNumber] = useState(currentTracking)
  const [trackingCompany, setTrackingCompany] = useState(currentCompany)
  const [loading, setLoading] = useState(false)

  const isEdit = !!currentTracking

  const handleSubmit = async (e) => {
    e?.preventDefault()

    // 유효성 검사
    if (!trackingNumber.trim()) {
      toast.error('송장번호를 입력해주세요')
      return
    }

    if (!validateTrackingNumber(trackingNumber)) {
      toast.error('올바른 송장번호 형식이 아닙니다 (최소 10자리 이상)')
      return
    }

    try {
      setLoading(true)

      // 독립적인 유틸리티 함수 사용
      const result = await updateTrackingNumber({
        adminEmail,
        orderId,
        trackingNumber: trackingNumber.trim(),
        trackingCompany: trackingCompany || 'hanjin' // 기본값: 한진택배
      })

      toast.success(
        isEdit
          ? '송장번호가 수정되었습니다'
          : '송장번호가 저장되고 발송 중으로 변경되었습니다'
      )

      // 성공 콜백 호출 (부모 컴포넌트에게 후처리 위임)
      onSuccess?.({
        orderId,
        trackingNumber: trackingNumber.trim(),
        trackingCompany: trackingCompany || null
      })

      onClose()
    } catch (error) {
      console.error('송장번호 저장 오류:', error)
      toast.error(error.message || '송장번호 저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <TruckIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEdit ? '송장번호 수정' : '송장번호 입력'}
              </h2>
              <p className="text-xs text-gray-500">
                {isEdit ? '송장번호를 수정합니다' : '송장번호를 입력하고 발송 중으로 변경합니다'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 택배사 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              택배사 <span className="text-gray-400">(선택)</span>
            </label>
            <select
              value={trackingCompany}
              onChange={(e) => setTrackingCompany(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">택배사를 선택하세요</option>
              {CARRIERS.map((carrier) => (
                <option key={carrier.value} value={carrier.value}>
                  {carrier.label}
                </option>
              ))}
            </select>
          </div>

          {/* 송장번호 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              송장번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="1234567890123"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              숫자와 하이픈만 입력 가능 (최소 10자리)
            </p>
          </div>

          {/* 경고 메시지 */}
          {!isEdit && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 text-sm">⚠️</span>
                <p className="text-xs text-yellow-700">
                  저장 시 주문 상태가 <strong>"발송 중"</strong>으로 자동 변경됩니다.
                </p>
              </div>
            </div>
          )}
        </form>

        {/* 푸터 버튼 */}
        <div className="flex items-center gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !trackingNumber.trim()}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                저장 중...
              </span>
            ) : isEdit ? (
              '수정 완료'
            ) : (
              '저장하고 발송 시작'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
