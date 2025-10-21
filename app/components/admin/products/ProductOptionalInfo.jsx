/**
 * ProductOptionalInfo - 상품 선택 정보 컴포넌트 (Phase 4.4 리팩토링)
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import SupplierManageSheet from '@/app/components/SupplierManageSheet'
import { useState } from 'react'
import { getSuppliers } from '@/lib/supabaseApi'

export default function ProductOptionalInfo({
  productData,
  setProductData,
  suppliers,
  setSuppliers,
  categories,
  subCategories,
  loadSubCategories,
  productNumber
}) {
  const [showSupplierSheet, setShowSupplierSheet] = useState(false)

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-medium mb-6">선택 정보</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 업체 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            업체 (선택사항)
          </label>
          <div className="flex gap-2">
            <select
              value={productData.supplier_id || ''}
              onChange={(e) => setProductData(prev => ({ ...prev, supplier_id: e.target.value || null }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">선택 안 함</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowSupplierSheet(true)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="업체 관리"
            >
              <Cog6ToothIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            대분류 (선택사항)
          </label>
          <select
            value={productData.category}
            onChange={(e) => {
              const newCategory = e.target.value
              setProductData(prev => ({
                ...prev,
                category: newCategory,
                sub_category: ''
              }))
              if (newCategory) {
                loadSubCategories(newCategory)
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">선택 안 함</option>
            {categories.filter(c => c.parent_id === null).map(category => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* 소분류 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            소분류 (선택사항)
          </label>
          <select
            value={productData.sub_category}
            onChange={(e) => setProductData(prev => ({ ...prev, sub_category: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            disabled={!productData.category}
          >
            <option value="">선택 안 함</option>
            {subCategories.map(category => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* 업체 상품 코드 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            업체 상품 코드 (선택사항)
          </label>
          <input
            type="text"
            value={productData.supplier_product_code}
            onChange={(e) => setProductData(prev => ({ ...prev, supplier_product_code: e.target.value }))}
            placeholder="업체에서 사용하는 상품 코드"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {/* 제품명 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            제품명 (선택사항)
          </label>
          <input
            type="text"
            value={productData.title}
            onChange={(e) => setProductData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="예: 밍크자켓"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            maxLength={20}
          />
          <p className="text-xs text-gray-500 mt-1">
            입력 시: {productNumber}/밍크자켓, 미입력 시: {productNumber}
          </p>
        </div>

        {/* 상세 설명 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            상세 설명 (선택사항)
          </label>
          <textarea
            value={productData.description}
            onChange={(e) => setProductData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="제품에 대한 간단한 설명을 입력하세요"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>

      {/* 업체 관리 시트 */}
      {showSupplierSheet && (
        <SupplierManageSheet
          isOpen={showSupplierSheet}
          onClose={() => setShowSupplierSheet(false)}
          onSuppliersUpdate={async () => {
            const data = await getSuppliers()
            setSuppliers(data || [])
          }}
        />
      )}
    </div>
  )
}
