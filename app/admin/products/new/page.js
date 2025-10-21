/**
 * NewProductPage - 새 제품 등록 페이지 (Phase 4.4 리팩토링 완료)
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture 적용:
 * - Presentation Layer: 이 파일 (Composition Layer, ≤ 300 lines, Rule 1)
 * - Application Layer: useProductForm hook
 * - Components: ProductImageUploader, ProductPriceInput, ProductOptions, ProductOptionalInfo
 *
 * ✅ Rule #0 준수:
 * - Rule 1: 파일 크기 ≤300줄
 * - Rule 2: Layer boundary 준수 (직접 DB 접근 금지)
 * - Rule 4: 함수 개수 ≤10개 (컴포넌트로 분리)
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'
import { useProductForm } from '@/app/hooks/useProductForm'
import ProductImageUploader from '@/app/components/admin/products/ProductImageUploader'
import ProductPriceInput from '@/app/components/admin/products/ProductPriceInput'
import ProductOptions from '@/app/components/admin/products/ProductOptions'
import ProductOptionalInfo from '@/app/components/admin/products/ProductOptionalInfo'
import toast from 'react-hot-toast'

export default function NewProductPage() {
  const router = useRouter()
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  // ⚡ 비즈니스 로직 Hook
  const {
    loading,
    productNumber,
    imagePreview,
    productData,
    setProductData,
    useThousandUnit,
    setUseThousandUnit,
    suppliers,
    setSuppliers,
    categories,
    subCategories,
    canSubmit,
    showMissingFieldsAlert,
    handleImageUpload,
    handlePriceChange,
    getDisplayPrice,
    generateOptionCombinations,
    loadSubCategories,
    handleSaveProduct
  } = useProductForm({ isAdminAuthenticated })

  const combinations = generateOptionCombinations()

  // 권한 체크
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
    }
  }, [authLoading, isAdminAuthenticated, router])

  // 로딩 상태
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isAdminAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/products')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">새 제품 등록</h1>
              {productNumber && (
                <p className="text-sm text-gray-600">제품번호: {productNumber}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-4xl mx-auto py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 왼쪽: 필수 정보 */}
          <div className="space-y-6">
            {/* 제품 이미지 */}
            <ProductImageUploader
              imagePreview={imagePreview}
              onImageUpload={handleImageUpload}
            />

            {/* 필수 정보 */}
            <ProductPriceInput
              productNumber={productNumber}
              price={productData.price}
              displayPrice={getDisplayPrice()}
              onPriceChange={handlePriceChange}
              useThousandUnit={useThousandUnit}
              onThousandUnitChange={setUseThousandUnit}
              inventory={productData.inventory}
              onInventoryChange={(value) => setProductData(prev => ({ ...prev, inventory: value }))}
              optionType={productData.optionType}
            />
          </div>

          {/* 오른쪽: 옵션 설정 */}
          <ProductOptions
            productData={productData}
            setProductData={setProductData}
            combinations={combinations}
          />
        </div>

        {/* 선택 정보 (전체 폭) */}
        <div className="mt-6">
          <ProductOptionalInfo
            productData={productData}
            setProductData={setProductData}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            categories={categories}
            subCategories={subCategories}
            loadSubCategories={loadSubCategories}
            productNumber={productNumber}
          />
        </div>

        {/* 하단 여백 (고정 네비바 공간 확보) */}
        <div className="pb-20"></div>
      </div>

      {/* 하단 고정 네비게이션 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              if (canSubmit || showMissingFieldsAlert()) {
                handleSaveProduct()
              }
            }}
            disabled={loading}
            className={`w-full py-3 px-6 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-all duration-200 ${
              canSubmit
                ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
                : 'bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                등록 중...
              </>
            ) : (
              <>
                <PlusIcon className="w-5 h-5" />
                {canSubmit ? '제품 등록하기' : '필수 정보를 입력하세요'}
              </>
            )}
          </button>

          {/* 필수값 상태 표시 */}
          <div className="mt-2 flex justify-center">
            <div className="flex items-center gap-4 text-xs">
              <div className={`flex items-center gap-1 ${imagePreview ? 'text-green-600' : 'text-red-500'}`}>
                <div className={`w-2 h-2 rounded-full ${imagePreview ? 'bg-green-500' : 'bg-red-500'}`}></div>
                이미지
              </div>
              <div className={`flex items-center gap-1 ${productData.price > 0 ? 'text-green-600' : 'text-red-500'}`}>
                <div className={`w-2 h-2 rounded-full ${productData.price > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                가격
              </div>
              {(productData.sizeOptions.length > 0 || productData.colorOptions.length > 0) && (
                <div className={`flex items-center gap-1 ${Object.values(productData.optionInventories).reduce((sum, qty) => sum + (qty || 0), 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${Object.values(productData.optionInventories).reduce((sum, qty) => sum + (qty || 0), 0) > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  옵션재고
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
