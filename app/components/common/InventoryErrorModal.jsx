'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function InventoryErrorModal({ isOpen, onClose, insufficientItems, title = "재고가 부족한 상품이 있습니다" }) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-25"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600">재고를 확인해 주세요</p>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-3 mb-6">
              {insufficientItems && insufficientItems.map((item, index) => (
                <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900 text-sm">{item.title}</h4>
                      <div className="flex items-center gap-4 mt-1 text-xs text-red-700">
                        <span>현재 재고: <strong>{item.current}개</strong></span>
                        <span>필요 수량: <strong>{item.required}개</strong></span>
                      </div>
                    </div>
                    <div className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">
                      {item.required - item.current}개 부족
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                확인
              </button>
              <button
                onClick={() => {
                  onClose()
                  // 상품 페이지로 이동하거나 재고 확인 액션
                  window.location.href = '/'
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                다른 상품 보기
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}