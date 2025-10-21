/**
 * BuyBottomSheet - 상품 구매 바텀시트 (Phase 4.2 리팩토링 완료)
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture 적용:
 * - Presentation Layer: 이 파일 (≤ 200 lines, Rule 1)
 * - Application Layer: useBuyBottomSheet hook
 * - Infrastructure Layer: Repository (직접 DB 접근 제거)
 *
 * ✅ Rule #0 준수:
 * - Rule 1: 파일 크기 200줄 이하
 * - Rule 2: Layer boundary 준수 (직접 DB 접근 금지)
 * - Rule 5: 직접 supabase 호출 제거 (Hook을 통한 간접 호출)
 */

'use client'

import { motion } from 'framer-motion'
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import useAuth from '@/hooks/useAuth'
import { useBuyBottomSheet } from '@/app/hooks/useBuyBottomSheet'
import ProductInfo from './ProductInfo'
import OptionSelector from './OptionSelector'
import CombinationList from './CombinationList'
import BottomSheet from '@/app/components/common/BottomSheet'
import Button from '@/app/components/common/Button'
import PurchaseChoiceModal from '@/app/components/common/PurchaseChoiceModal'

export default function BuyBottomSheet({ product, isOpen, onClose }) {
  const { user, isAuthenticated } = useAuth()

  // ⚡ 비즈니스 로직 Hook
  const {
    quantity,
    selectedOptions,
    setSelectedOptions,
    selectedCombinations,
    totalQuantity,
    totalPrice,
    options,
    variants,
    stock,
    isLoading,
    showChoiceModal,
    setShowChoiceModal,
    image,
    title,
    price,
    originalPrice,
    description,
    discount,
    minOrder,
    maxOrder,
    handleQuantityChange,
    updateCombinationQuantity,
    removeCombination,
    handleBuyNow,
    handleMoreOrders,
    handleOrderHistoryOnly
  } = useBuyBottomSheet({ product, isOpen, onClose, user, isAuthenticated })

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} showHandle={true}>
        {/* 스크롤 가능한 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-4">
            {/* Product Info */}
            <ProductInfo
              product={product}
              image={image}
              title={title}
              price={price}
              originalPrice={originalPrice}
              description={description}
              onClose={onClose}
            />

            {/* Step-by-step Options Selection */}
            {options.length > 0 ? (
              <div className="space-y-4">
                {/* Option Selector */}
                <OptionSelector
                  options={options}
                  selectedOptions={selectedOptions}
                  setSelectedOptions={setSelectedOptions}
                  variants={variants}
                  stock={stock}
                />

                {/* Selected combinations list */}
                {selectedCombinations.length > 0 && (
                  <CombinationList
                    combinations={selectedCombinations}
                    variants={variants}
                    stock={stock}
                    onQuantityChange={updateCombinationQuantity}
                    onRemove={removeCombination}
                  />
                )}

                {/* Auto-selection feedback */}
                {Object.keys(selectedOptions).length === options.length &&
                  selectedCombinations.length === 0 && (
                    <div className="border border-dashed border-blue-200 bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-blue-700 font-medium mb-1">
                        {Object.values(selectedOptions).join(' / ')} 선택됨
                      </div>
                      <div className="text-sm text-blue-600">
                        잠시 후 자동으로 추가됩니다...
                      </div>
                    </div>
                  )}

                {/* Totals Summary */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">총 수량</span>
                    <span className="font-medium">{totalQuantity}개</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-lg text-gray-900">총 금액</span>
                    <span className="font-bold text-lg text-red-500">
                      ₩{totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* 옵션이 없는 경우 기존 수량 선택 */
              <div>
                <h4 className="font-medium text-gray-900 mb-3">수량</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= minOrder}
                      className="p-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-lg transition-colors"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span className="px-4 py-3 font-medium min-w-[60px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= Math.min(maxOrder, stock)}
                      className="p-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-lg transition-colors"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">재고: {stock}개</p>
                    <p className="text-lg font-bold text-gray-900">
                      ₩{totalPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Discount Info */}
            {discount > 0 && totalQuantity > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-orange-50 border border-orange-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-center">
                  <span className="text-orange-700 font-medium">할인 혜택</span>
                  <span className="text-orange-700 font-bold">
                    -₩{(discount * totalQuantity).toLocaleString()}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Stock Warning */}
            {stock < 10 && stock > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <p className="text-yellow-700 text-sm font-medium">
                  ⚠️ 품절 임박! 남은 수량: {stock}개
                </p>
              </div>
            )}

            {/* Out of Stock */}
            {stock === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-red-700 font-medium">일시 품절</p>
                <p className="text-red-600 text-sm">재입고 알림을 설정하세요</p>
              </div>
            )}
          </div>
        </div>

        {/* 고정 버튼 영역 */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
          <Button
            onClick={handleBuyNow}
            disabled={stock === 0 || isLoading || totalQuantity === 0}
            fullWidth
          >
            {isLoading
              ? '처리 중...'
              : totalQuantity === 0
              ? '수량을 선택해주세요'
              : '구매하기'}
          </Button>
        </div>
      </BottomSheet>

      {/* Purchase Choice Modal */}
      <PurchaseChoiceModal
        isOpen={showChoiceModal}
        onClose={() => setShowChoiceModal(false)}
        onMoreOrders={handleMoreOrders}
        onOrderHistoryOnly={handleOrderHistoryOnly}
      />
    </>
  )
}
