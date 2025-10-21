/**
 * ProductOptions - 상품 옵션 관리 컴포넌트 (Phase 4.4 리팩토링)
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

import { useState } from 'react'
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { SIZE_TEMPLATES, COLOR_PRESETS } from '@/app/hooks/useProductForm'

export default function ProductOptions({
  productData,
  setProductData,
  combinations
}) {
  const [showSizeTemplateSelector, setShowSizeTemplateSelector] = useState(false)

  // 사이즈 옵션 추가
  const handleSizeOptionAdd = (templateType) => {
    const selectedOptions = [...SIZE_TEMPLATES[templateType]]
    setProductData(prev => ({
      ...prev,
      sizeOptions: selectedOptions,
      optionType: prev.optionType === 'color' ? 'both' : 'size'
    }))
    setShowSizeTemplateSelector(false)
    toast.success(`${templateType} 사이즈 템플릿이 적용되었습니다`)
  }

  // 컬러 옵션 추가
  const handleColorOptionAdd = () => {
    setProductData(prev => ({
      ...prev,
      colorOptions: [...COLOR_PRESETS],
      optionType: prev.optionType === 'size' ? 'both' : 'color'
    }))
    toast.success('컬러 옵션이 추가되었습니다')
  }

  // 개별 사이즈 옵션 수정
  const updateSizeOption = (index, value) => {
    const newSizeOptions = [...productData.sizeOptions]
    newSizeOptions[index] = value
    setProductData(prev => ({
      ...prev,
      sizeOptions: newSizeOptions
    }))
  }

  // 개별 사이즈 옵션 삭제
  const removeSizeOption = (index) => {
    const newSizeOptions = productData.sizeOptions.filter((_, i) => i !== index)
    setProductData(prev => ({
      ...prev,
      sizeOptions: newSizeOptions,
      optionType: newSizeOptions.length === 0 ? (prev.colorOptions.length > 0 ? 'color' : 'none') : prev.optionType
    }))
    toast.success('사이즈 옵션이 삭제되었습니다')
  }

  // 새 사이즈 옵션 추가
  const addNewSizeOption = () => {
    setProductData(prev => ({
      ...prev,
      sizeOptions: [...prev.sizeOptions, '']
    }))
  }

  // 개별 컬러 옵션 수정
  const updateColorOption = (index, value) => {
    const newColorOptions = [...productData.colorOptions]
    newColorOptions[index] = value
    setProductData(prev => ({
      ...prev,
      colorOptions: newColorOptions
    }))
  }

  // 개별 컬러 옵션 삭제
  const removeColorOption = (index) => {
    const newColorOptions = productData.colorOptions.filter((_, i) => i !== index)
    setProductData(prev => ({
      ...prev,
      colorOptions: newColorOptions,
      optionType: newColorOptions.length === 0 ? (prev.sizeOptions.length > 0 ? 'size' : 'none') : prev.optionType
    }))
    toast.success('컬러 옵션이 삭제되었습니다')
  }

  // 새 컬러 옵션 추가
  const addNewColorOption = () => {
    setProductData(prev => ({
      ...prev,
      colorOptions: [...prev.colorOptions, '']
    }))
  }

  // 옵션 완전 제거
  const removeAllSizeOptions = () => {
    setProductData(prev => ({
      ...prev,
      sizeOptions: [],
      optionType: prev.colorOptions.length > 0 ? 'color' : 'none'
    }))
    toast.success('모든 사이즈 옵션이 제거되었습니다')
  }

  const removeAllColorOptions = () => {
    setProductData(prev => ({
      ...prev,
      colorOptions: [],
      optionType: prev.sizeOptions.length > 0 ? 'size' : 'none'
    }))
    toast.success('모든 컬러 옵션이 제거되었습니다')
  }

  // 옵션별 재고 변경
  const handleOptionInventoryChange = (comboKey, inventory) => {
    setProductData(prev => ({
      ...prev,
      optionInventories: {
        ...prev.optionInventories,
        [comboKey]: parseInt(inventory) || 0
      }
    }))
  }

  return (
    <div className="space-y-6">
      {/* 사이즈 옵션 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">사이즈 옵션</h2>
          {productData.sizeOptions.length > 0 && (
            <button
              onClick={removeAllSizeOptions}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              전체 삭제
            </button>
          )}
        </div>

        {productData.sizeOptions.length === 0 ? (
          <div className="space-y-3">
            <button
              onClick={() => setShowSizeTemplateSelector(true)}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors"
            >
              + 사이즈 템플릿 선택
            </button>

            {/* 사이즈 템플릿 선택 모달 */}
            {showSizeTemplateSelector && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                  <h3 className="text-lg font-medium mb-4">사이즈 템플릿 선택</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleSizeOptionAdd('number')}
                      className="w-full p-3 border rounded-lg hover:bg-gray-50 text-left"
                    >
                      <div className="font-medium">숫자 사이즈</div>
                      <div className="text-sm text-gray-500">55, 66, 77, 88, 99</div>
                    </button>
                    <button
                      onClick={() => handleSizeOptionAdd('alpha')}
                      className="w-full p-3 border rounded-lg hover:bg-gray-50 text-left"
                    >
                      <div className="font-medium">알파벳 사이즈</div>
                      <div className="text-sm text-gray-500">XS, S, M, L, XL, XXL</div>
                    </button>
                    <button
                      onClick={() => handleSizeOptionAdd('free')}
                      className="w-full p-3 border rounded-lg hover:bg-gray-50 text-left"
                    >
                      <div className="font-medium">프리 사이즈</div>
                      <div className="text-sm text-gray-500">FREE</div>
                    </button>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowSizeTemplateSelector(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {productData.sizeOptions.map((size, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={size}
                  onChange={(e) => updateSizeOption(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="사이즈명"
                />
                <button
                  onClick={() => removeSizeOption(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addNewSizeOption}
              className="w-full p-2 border border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 text-gray-600 hover:text-red-600"
            >
              + 사이즈 추가
            </button>
          </div>
        )}
      </div>

      {/* 컬러 옵션 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">컬러 옵션</h2>
          {productData.colorOptions.length > 0 && (
            <button
              onClick={removeAllColorOptions}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              전체 삭제
            </button>
          )}
        </div>

        {productData.colorOptions.length === 0 ? (
          <button
            onClick={handleColorOptionAdd}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors"
          >
            + 컬러 옵션 추가
          </button>
        ) : (
          <div className="space-y-3">
            {productData.colorOptions.map((color, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={color}
                  onChange={(e) => updateColorOption(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="컬러명"
                />
                <button
                  onClick={() => removeColorOption(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addNewColorOption}
              className="w-full p-2 border border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 text-gray-600 hover:text-red-600"
            >
              + 컬러 추가
            </button>
          </div>
        )}
      </div>

      {/* 옵션별 재고 설정 */}
      {combinations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">옵션별 재고 설정</h2>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="bulkInventory"
                placeholder="일괄 입력"
                min="0"
                className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <button
                onClick={() => {
                  const bulkValue = document.getElementById('bulkInventory').value
                  if (bulkValue) {
                    const newInventories = {}
                    combinations.forEach(combo => {
                      newInventories[combo.key] = parseInt(bulkValue) || 0
                    })
                    setProductData(prev => ({
                      ...prev,
                      optionInventories: newInventories
                    }))
                    document.getElementById('bulkInventory').value = ''
                  }
                }}
                className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                일괄 적용
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {combinations.map((combo) => (
              <div key={combo.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{combo.label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={productData.optionInventories[combo.key] || 0}
                    onChange={(e) => handleOptionInventoryChange(combo.key, e.target.value)}
                    min="0"
                    className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <span className="text-sm text-gray-500">개</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 총 재고: {Object.values(productData.optionInventories).reduce((sum, qty) => sum + (qty || 0), 0)}개
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
