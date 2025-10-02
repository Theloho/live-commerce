'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import toast from 'react-hot-toast'

/**
 * Variant 재고 관리 버텀시트
 *
 * @param {boolean} isOpen - 버텀시트 열림 상태
 * @param {function} onClose - 버텀시트 닫기 함수
 * @param {object} product - 상품 정보 (variants 포함)
 * @param {function} onUpdate - 재고 업데이트 후 콜백
 */
export default function VariantBottomSheet({ isOpen, onClose, product, onUpdate }) {
  const [updating, setUpdating] = useState(false)

  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // 바디 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleUpdateInventory = async (variantId, delta) => {
    if (updating) return

    setUpdating(true)
    try {
      const { updateVariantInventory } = await import('@/lib/supabaseApi')
      await updateVariantInventory(variantId, delta)
      toast.success(`재고 ${delta > 0 ? '+' : ''}${delta}`)
      onUpdate?.()
    } catch (error) {
      console.error('재고 업데이트 실패:', error)
      toast.error('재고 업데이트 실패')
    } finally {
      setUpdating(false)
    }
  }

  if (!product) return null

  const variants = product.variants || []
  const hasVariants = variants.length > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* 버텀시트 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 100 || velocity.y > 500) {
                onClose()
              }
            }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[85vh] flex flex-col"
          >
            {/* 드래그 핸들 */}
            <div className="pt-2 pb-3 flex justify-center">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* 헤더 */}
            <div className="flex items-center gap-3 px-4 pb-4 border-b border-gray-200">
              <div className="relative w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {product.thumbnail_url ? (
                  <Image
                    src={product.thumbnail_url}
                    alt={product.title}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
                <p className="text-sm text-gray-600">
                  {hasVariants ? `${variants.length}개 옵션` : '단일 상품'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Variant 목록 */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {hasVariants ? (
                <div className="space-y-3">
                  {variants.map((variant) => {
                    const inventory = variant.inventory ?? 0
                    const optionLabel = variant.options?.map(opt => opt.optionValue).join(' × ') || variant.sku

                    return (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="font-medium text-gray-900 truncate">
                            {optionLabel}
                          </div>
                          {variant.sku && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              SKU: {variant.sku}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleUpdateInventory(variant.id, -1)}
                            disabled={updating || inventory === 0}
                            className="w-8 h-8 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium transition-colors"
                          >
                            -
                          </button>
                          <div
                            className={`min-w-[3rem] text-center font-semibold ${
                              inventory === 0 ? 'text-red-600' : 'text-gray-900'
                            }`}
                          >
                            {inventory}
                          </div>
                          <button
                            onClick={() => handleUpdateInventory(variant.id, 1)}
                            disabled={updating}
                            className="w-8 h-8 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900">기본 재고</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {product.inventory ?? 0}개
                  </div>
                </div>
              )}
            </div>

            {/* 하단 여백 (Safe Area) */}
            <div className="h-6 bg-white" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
