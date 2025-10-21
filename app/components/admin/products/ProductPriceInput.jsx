/**
 * ProductPriceInput - 상품 가격 입력 컴포넌트 (Phase 4.4 리팩토링)
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline'

export default function ProductPriceInput({
  productNumber,
  price,
  displayPrice,
  onPriceChange,
  useThousandUnit,
  onThousandUnitChange,
  inventory,
  onInventoryChange,
  optionType
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <h2 className="text-lg font-medium mb-4 p-6 pb-4">필수 정보</h2>

      <div className="space-y-6 px-6 pb-6">
        {/* 제품번호 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            제품번호 *
          </label>
          <input
            type="text"
            value={productNumber}
            disabled
            className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
          />
          <p className="text-xs text-gray-500 mt-1">자동으로 생성됩니다</p>
        </div>

        {/* 판매가격 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            판매가격 *
          </label>
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={displayPrice}
                onChange={(e) => onPriceChange(e.target.value)}
                placeholder={useThousandUnit ? "19.5" : "19500"}
                className="w-full pl-8 pr-16 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <span className="absolute left-3 top-2.5 text-gray-500">₩</span>
              <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                {useThousandUnit ? '천원' : '원'}
              </span>
            </div>

            {/* 천원단위 입력 체크박스 */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useThousandUnit}
                onChange={(e) => onThousandUnitChange(e.target.checked)}
                className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
              />
              <span className="text-sm text-gray-700">천원 단위로 입력하기</span>
              <span className="text-xs text-gray-500">
                (예: 19.5 → 19,500원)
              </span>
            </label>

            {/* 실시간 가격 미리보기 */}
            {price > 0 && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  <span className="font-medium">최종 가격: </span>
                  <span className="font-bold">₩{price.toLocaleString()}원</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 재고 수량 (옵션 없을 때만) */}
        {optionType === 'none' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              재고 수량 *
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onInventoryChange(Math.max(0, inventory - 1))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <MinusIcon className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={inventory}
                onChange={(e) => onInventoryChange(parseInt(e.target.value) || 0)}
                className="flex-1 px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                min="0"
              />
              <button
                onClick={() => onInventoryChange(inventory + 1)}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
