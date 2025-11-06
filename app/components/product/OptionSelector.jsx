/**
 * OptionSelector - 순차적 옵션 선택 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * 역할: Variant 상품의 옵션 선택 UI
 * - 순차적 옵션 표시 (이전 옵션 선택 완료 시에만 다음 옵션 표시)
 * - Variant 재고 확인 (마지막 옵션 선택 시)
 * - 품절 옵션 비활성화
 * - 선택된 옵션 하이라이트
 * - 후속 옵션 자동 초기화
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

/**
 * OptionSelector Component
 * @param {Object} props
 * @param {Array} props.options - 옵션 배열 [{ name, values }]
 * @param {Object} props.selectedOptions - 선택된 옵션 { 옵션명: 옵션값 }
 * @param {Function} props.setSelectedOptions - 옵션 선택 setState
 * @param {Array} props.variants - Variant 배열
 * @param {number} props.stock - 기본 재고 (variant 없을 때)
 */
export default function OptionSelector({
  options,
  selectedOptions,
  setSelectedOptions,
  variants,
  stock
}) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">옵션 선택</h4>

      {/* Sequential option selection */}
      <div className="space-y-4">
        {options.map((option, index) => {
          // Show current option only if previous options are selected
          const shouldShow = index === 0 || Object.keys(selectedOptions).length >= index

          if (!shouldShow) return null

          return (
            <div key={index} className="space-y-2">
              {/* Option Label */}
              <label className="block text-sm font-medium text-gray-700">
                {option.name}
                {selectedOptions[option.name] && (
                  <span className="ml-2 text-xs text-red-600">
                    선택됨: {selectedOptions[option.name]}
                  </span>
                )}
              </label>

              {/* Option Values Grid */}
              <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                {option.values.map((value, valueIndex) => {
                  // Handle both string and object values
                  const displayValue = typeof value === 'string'
                    ? value
                    : value?.name || value?.value || String(value)

                  const keyValue = typeof value === 'string'
                    ? value
                    : value?.name || value?.value || valueIndex

                  // 마지막 옵션이면 variant 재고 확인
                  const isLastOption = index === options.length - 1
                  let inventory = stock
                  let isSoldOut = false
                  let isLoading = stock === null // ⚡ 로딩 상태 체크

                  if (isLastOption) {
                    // 이전 옵션들이 모두 선택되었는지 확인
                    const prevOptionsSelected = options
                      .slice(0, index)
                      .every(opt => selectedOptions[opt.name])

                    if (prevOptionsSelected) {
                      // 이 값을 선택했을 때의 조합으로 variant 찾기
                      const testOptions = {
                        ...selectedOptions,
                        [option.name]: displayValue
                      }

                      const variant = variants?.find(v => {
                        if (!v.options || v.options.length !== options.length) {
                          return false
                        }
                        return Object.entries(testOptions).every(([optName, optValue]) => {
                          return v.options.some(
                            opt => opt.optionName === optName && opt.optionValue === optValue
                          )
                        })
                      })

                      if (variant) {
                        inventory = variant.inventory || 0
                        isSoldOut = inventory === 0
                      }
                    }
                  }

                  return (
                    <button
                      key={keyValue}
                      onClick={() => {
                        if (isSoldOut) return // 품절된 옵션은 선택 불가

                        setSelectedOptions(prev => {
                          const newSelected = { ...prev }

                          // If selecting a different value for current option, clear subsequent options
                          if (newSelected[option.name] !== displayValue) {
                            // Clear all options after the current one
                            options.slice(index + 1).forEach(laterOption => {
                              delete newSelected[laterOption.name]
                            })
                          }

                          newSelected[option.name] = displayValue
                          return newSelected
                        })
                      }}
                      disabled={isSoldOut}
                      className={`p-2 text-sm border rounded-lg transition-colors relative ${
                        isSoldOut
                          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                          : selectedOptions[option.name] === displayValue
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className={isSoldOut ? 'line-through' : ''}>
                          {displayValue}
                        </span>
                        {isLastOption && (
                          <span
                            className={`text-xs mt-0.5 ${
                              isLoading
                                ? 'text-gray-400'
                                : isSoldOut
                                ? 'text-red-500 font-medium'
                                : inventory < 5 && inventory > 0
                                ? 'text-orange-500'
                                : 'text-gray-500'
                            }`}
                          >
                            {isLoading ? '' : isSoldOut ? '품절' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Show "다음 단계" indicator */}
              {selectedOptions[option.name] && index < options.length - 1 && (
                <div className="text-xs text-gray-500 mt-2">
                  👇 다음으로 {options[index + 1].name}를 선택해주세요
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
