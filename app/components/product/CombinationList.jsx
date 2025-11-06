/**
 * CombinationList - 선택된 옵션 조합 리스트 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * 역할: 선택된 옵션 조합들의 목록 표시 및 수량 조절
 * - 조합별 옵션 표시
 * - 수량 조절 (+/-)
 * - 재고 확인
 * - 조합 제거 버튼
 * - 소계 계산 표시
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline'

/**
 * CombinationList Component
 * @param {Object} props
 * @param {Array} props.combinations - 선택된 조합 배열
 * @param {Array} props.variants - Variant 배열
 * @param {number} props.stock - 기본 재고
 * @param {Function} props.onQuantityChange - 수량 변경 핸들러 (index, newQuantity)
 * @param {Function} props.onRemove - 조합 제거 핸들러 (index)
 */
export default function CombinationList({
  combinations,
  variants,
  stock,
  onQuantityChange,
  onRemove
}) {
  if (!combinations || combinations.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <h5 className="font-medium text-gray-900">선택된 옵션들</h5>

      {combinations.map((combo, index) => {
        // 해당 조합의 재고 확인
        const variant = combo.variantId
          ? variants?.find(v => v.id === combo.variantId)
          : null
        const maxInventory = variant ? variant.inventory : stock

        return (
          <div
            key={combo.key}
            className="border border-gray-200 rounded-lg p-4 space-y-3"
          >
            {/* 조합 이름 + 소계 */}
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">{combo.key}</span>
              <span className="text-sm text-gray-500">
                ₩{(combo.price * combo.quantity).toLocaleString()}
              </span>
            </div>

            {/* 수량 조절 + 재고 + 제거 버튼 */}
            <div className="flex items-center justify-between">
              {/* 수량 조절 버튼 */}
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => onQuantityChange(index, combo.quantity - 1)}
                  className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 font-medium min-w-[60px] text-center">
                  {combo.quantity}
                </span>
                <button
                  onClick={() => onQuantityChange(index, combo.quantity + 1)}
                  disabled={combo.quantity >= maxInventory}
                  className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-lg transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>

              {/* 제거 버튼 */}
              <div className="flex flex-col items-end">
                <button
                  onClick={() => onRemove(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  제거
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
