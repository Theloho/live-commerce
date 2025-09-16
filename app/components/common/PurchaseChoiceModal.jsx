'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, ShoppingBagIcon, ListBulletIcon } from '@heroicons/react/24/outline'

export default function PurchaseChoiceModal({ isOpen, onClose, onMoreOrders, onOrderHistoryOnly }) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-sm relative"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBagIcon className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">더 주문 하시겠습니까?</h2>
                <p className="text-gray-600 text-sm">
                  장바구니에 담았습니다
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={onMoreOrders}
                  className="w-full flex items-center justify-center gap-3 bg-red-500 text-white py-4 rounded-lg font-semibold hover:bg-red-600 transition-colors"
                >
                  <ShoppingBagIcon className="w-5 h-5" />
                  더 주문하기
                </button>

                <button
                  onClick={onOrderHistoryOnly}
                  className="w-full flex items-center justify-center gap-3 bg-gray-100 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  <ListBulletIcon className="w-5 h-5" />
                  바로 결제하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}