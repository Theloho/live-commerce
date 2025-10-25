/**
 * DepositNameModal - 입금자명 선택 모달 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

import { motion } from 'framer-motion'

export default function DepositNameModal({
  isOpen,
  userProfile,
  depositOption,
  setDepositOption,
  depositName,
  setDepositName,
  customDepositName,
  setCustomDepositName,
  onConfirm,
  onCancel,
  processing
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg max-w-md w-full p-6"
      >
        <h2 className="text-lg font-semibold mb-4">입금자명 선택</h2>

        <div className="space-y-3 mb-6">
          {/* 고객 이름으로 입금 (기본값) */}
          <label
            className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            style={{ borderColor: depositOption === 'name' ? '#ef4444' : '#e5e7eb' }}
          >
            <input
              type="radio"
              name="depositOption"
              value="name"
              checked={depositOption === 'name'}
              onChange={() => {
                setDepositOption('name')
                setDepositName(userProfile.name)
              }}
              className="w-4 h-4 text-red-500 mr-3"
            />
            <div>
              <p className="font-medium text-gray-900">{userProfile.name}</p>
              <p className="text-sm text-gray-500">고객 이름으로 입금</p>
            </div>
          </label>

          {/* 닉네임으로 입금 - nickname이 없으면 name 사용 (항상 표시) */}
          <label
            className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            style={{ borderColor: depositOption === 'nickname' ? '#ef4444' : '#e5e7eb' }}
          >
            <input
              type="radio"
              name="depositOption"
              value="nickname"
              checked={depositOption === 'nickname'}
              onChange={() => {
                setDepositOption('nickname')
                setDepositName(userProfile.nickname || userProfile.name)
              }}
              className="w-4 h-4 text-red-500 mr-3"
            />
            <div>
              <p className="font-medium text-gray-900">{userProfile.nickname || userProfile.name}</p>
              <p className="text-sm text-gray-500">닉네임으로 입금</p>
            </div>
          </label>

          {/* 직접 입력 */}
          <label
            className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            style={{ borderColor: depositOption === 'custom' ? '#ef4444' : '#e5e7eb' }}
          >
            <input
              type="radio"
              name="depositOption"
              value="custom"
              checked={depositOption === 'custom'}
              onChange={() => {
                setDepositOption('custom')
                setDepositName('')
              }}
              className="w-4 h-4 text-red-500 mr-3 mt-1"
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900 mb-2">직접 입력</p>
              {depositOption === 'custom' && (
                <input
                  type="text"
                  value={customDepositName}
                  onChange={(e) => {
                    setCustomDepositName(e.target.value)
                    setDepositName(e.target.value)
                  }}
                  placeholder="입금자명 입력"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  autoFocus
                />
              )}
            </div>
          </label>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => {
              // ✅ React setState 비동기 문제 해결: 최종 값을 직접 계산하여 전달
              const finalDepositName =
                depositOption === 'name' ? userProfile.name :
                depositOption === 'nickname' ? userProfile.nickname :
                customDepositName

              onConfirm(finalDepositName)
            }}
            disabled={!depositName || processing}
            className="flex-1 px-4 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? '처리 중...' : '확인'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
