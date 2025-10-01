'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeftIcon, PlusIcon, MinusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import {
  getSuppliers,
  getCategories,
  createProductWithOptions,
  createVariant,
  getProductOptions
} from '@/lib/supabaseApi'
import toast from 'react-hot-toast'

export default function DetailedProductNewPage() {
  const router = useRouter()
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])
  const [imagePreview, setImagePreview] = useState('')

  // 상품 기본 정보
  const [productData, setProductData] = useState({
    title: '',
    description: '',
    detailed_description: '',
    price: '',
    compare_price: '',
    supplier_id: '',
    model_number: '',
    purchase_price: '',
    purchase_date: '',
    category_id: '',
    status: 'active',
    tags: []
  })

  // 옵션 관리
  const [options, setOptions] = useState([
    { name: '사이즈', values: [] },
    { name: '색상', values: [] }
  ])

  // Variant 관리 (옵션 조합)
  const [variants, setVariants] = useState([])
  const [showVariantGenerator, setShowVariantGenerator] = useState(false)

  // 권한 체크
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
    }
  }, [authLoading, isAdminAuthenticated, router])

  // 데이터 로드
  useEffect(() => {
    if (isAdminAuthenticated) {
      loadInitialData()
    }
  }, [isAdminAuthenticated])

  const loadInitialData = async () => {
    try {
      const [suppliersData, categoriesData] = await Promise.all([
        getSuppliers(),
        getCategories()
      ])
      setSuppliers(suppliersData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('초기 데이터 로딩 오류:', error)
      toast.error('데이터를 불러오는데 실패했습니다')
    }
  }

  // 이미지 업로드
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // 옵션값 추가
  const addOptionValue = (optionIndex) => {
    const newOptions = [...options]
    newOptions[optionIndex].values.push({ value: '', color_code: '', image_url: '' })
    setOptions(newOptions)
  }

  // 옵션값 제거
  const removeOptionValue = (optionIndex, valueIndex) => {
    const newOptions = [...options]
    newOptions[optionIndex].values.splice(valueIndex, 1)
    setOptions(newOptions)
  }

  // 옵션값 업데이트
  const updateOptionValue = (optionIndex, valueIndex, field, value) => {
    const newOptions = [...options]
    newOptions[optionIndex].values[valueIndex][field] = value
    setOptions(newOptions)
  }

  // Variant 자동 생성 (옵션 조합)
  const generateVariants = () => {
    const sizeOptions = options[0].values.filter(v => v.value.trim())
    const colorOptions = options[1].values.filter(v => v.value.trim())

    if (sizeOptions.length === 0 && colorOptions.length === 0) {
      toast.error('최소 하나 이상의 옵션값을 입력해주세요')
      return
    }

    const newVariants = []

    if (sizeOptions.length > 0 && colorOptions.length > 0) {
      // 사이즈와 색상 조합
      sizeOptions.forEach(size => {
        colorOptions.forEach(color => {
          const sku = `${productData.model_number || 'PROD'}-${size.value}-${color.value}`.toUpperCase()
          newVariants.push({
            sku,
            options: [
              { name: '사이즈', value: size.value },
              { name: '색상', value: color.value }
            ],
            inventory: 0,
            supplier_sku: ''
          })
        })
      })
    } else if (sizeOptions.length > 0) {
      // 사이즈만
      sizeOptions.forEach(size => {
        const sku = `${productData.model_number || 'PROD'}-${size.value}`.toUpperCase()
        newVariants.push({
          sku,
          options: [{ name: '사이즈', value: size.value }],
          inventory: 0,
          supplier_sku: ''
        })
      })
    } else {
      // 색상만
      colorOptions.forEach(color => {
        const sku = `${productData.model_number || 'PROD'}-${color.value}`.toUpperCase()
        newVariants.push({
          sku,
          options: [{ name: '색상', value: color.value }],
          inventory: 0,
          supplier_sku: ''
        })
      })
    }

    setVariants(newVariants)
    setShowVariantGenerator(false)
    toast.success(`${newVariants.length}개의 Variant가 생성되었습니다`)
  }

  // Variant 재고 업데이트
  const updateVariantInventory = (index, inventory) => {
    const newVariants = [...variants]
    newVariants[index].inventory = parseInt(inventory) || 0
    setVariants(newVariants)
  }

  // Variant SKU 업데이트
  const updateVariantSKU = (index, sku) => {
    const newVariants = [...variants]
    newVariants[index].sku = sku
    setVariants(newVariants)
  }

  // 상품 저장
  const handleSaveProduct = async () => {
    // 유효성 검증
    if (!productData.title.trim()) {
      toast.error('상품명을 입력해주세요')
      return
    }

    if (!productData.price || productData.price <= 0) {
      toast.error('판매가격을 입력해주세요')
      return
    }

    if (!imagePreview) {
      toast.error('상품 이미지를 업로드해주세요')
      return
    }

    if (variants.length === 0) {
      toast.error('최소 하나 이상의 Variant를 생성해주세요')
      return
    }

    setLoading(true)

    try {
      // 1. 상품 생성
      const newProductData = {
        title: productData.title.trim(),
        description: productData.description.trim(),
        detailed_description: productData.detailed_description.trim(),
        price: parseInt(productData.price),
        compare_price: productData.compare_price ? parseInt(productData.compare_price) : null,
        inventory: variants.reduce((sum, v) => sum + v.inventory, 0), // 총 재고
        thumbnail_url: imagePreview,
        supplier_id: productData.supplier_id || null,
        model_number: productData.model_number.trim() || null,
        purchase_price: productData.purchase_price ? parseFloat(productData.purchase_price) : null,
        purchase_date: productData.purchase_date || null,
        category_id: productData.category_id || null,
        status: productData.status,
        tags: productData.tags
      }

      // 2. 옵션 데이터 준비
      console.log('🔍 [디버깅] 원본 options:', JSON.stringify(options, null, 2))

      const optionsData = options
        .filter(opt => {
          const hasValues = opt.values.length > 0
          const hasValidValues = opt.values.some(v => v.value && v.value.trim())
          console.log(`🔍 [필터] 옵션 "${opt.name}": values=${opt.values.length}, hasValidValues=${hasValidValues}`)
          return hasValues && hasValidValues
        })
        .map((opt, index) => ({
          name: opt.name,
          display_order: index,
          values: opt.values
            .filter(v => v.value && v.value.trim())
            .map((v, vIndex) => ({
              value: v.value.trim(),
              display_order: vIndex,
              color_code: v.color_code || null,
              image_url: v.image_url || null
            }))
        }))

      console.log('🔍 [디버깅] 필터링된 optionsData:', JSON.stringify(optionsData, null, 2))
      console.log('🔍 [디버깅] 전달할 옵션 개수:', optionsData.length)

      if (optionsData.length === 0) {
        console.warn('⚠️ [경고] 옵션 데이터가 비어있습니다!')
      }

      // 3. 상품과 옵션 생성
      const product = await createProductWithOptions(newProductData, optionsData)
      console.log('✅ [디버깅] 상품 생성 완료:', product.id)

      // 4. Variant 생성
      const createdOptions = await getProductOptions(product.id)

      for (const variant of variants) {
        // 각 variant의 옵션값 ID 찾기
        const optionValueIds = []

        for (const variantOption of variant.options) {
          const matchedOption = createdOptions.find(opt => opt.name === variantOption.name)
          if (matchedOption) {
            const matchedValue = matchedOption.product_option_values.find(
              val => val.value === variantOption.value
            )
            if (matchedValue) {
              optionValueIds.push(matchedValue.id)
            }
          }
        }

        // Variant 생성
        await createVariant({
          product_id: product.id,
          sku: variant.sku,
          inventory: variant.inventory,
          supplier_sku: variant.supplier_sku || null,
          is_active: true
        }, optionValueIds)
      }

      toast.success('상품이 등록되었습니다!')
      router.push('/admin/products/catalog')

    } catch (error) {
      console.error('상품 저장 오류:', error)
      toast.error('상품 등록에 실패했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/products/catalog')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">상세 상품 등록</h1>
              <p className="text-sm text-gray-600">업체, 모델번호, 매입가 등 상세 정보 입력</p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-6xl mx-auto py-6 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 왼쪽: 기본 정보 */}
          <div className="space-y-6">

            {/* 상품 이미지 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium mb-4">상품 이미지</h2>
              {imagePreview ? (
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={imagePreview}
                    alt="상품 이미지"
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={() => setImagePreview('')}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer text-gray-600 hover:text-gray-800"
                  >
                    이미지를 선택하거나 드래그하세요
                  </label>
                </div>
              )}
            </div>

            {/* 기본 정보 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium mb-4">기본 정보</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상품명 *
                  </label>
                  <input
                    type="text"
                    value={productData.title}
                    onChange={(e) => setProductData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="상품명을 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    간단한 설명
                  </label>
                  <textarea
                    value={productData.description}
                    onChange={(e) => setProductData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="상품 요약 설명"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상세 설명
                  </label>
                  <textarea
                    value={productData.detailed_description}
                    onChange={(e) => setProductData(prev => ({ ...prev, detailed_description: e.target.value }))}
                    placeholder="상품 상세 설명"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      판매가격 *
                    </label>
                    <input
                      type="number"
                      value={productData.price}
                      onChange={(e) => setProductData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="19000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      정가 (할인 표시용)
                    </label>
                    <input
                      type="number"
                      value={productData.compare_price}
                      onChange={(e) => setProductData(prev => ({ ...prev, compare_price: e.target.value }))}
                      placeholder="29000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리
                  </label>
                  <select
                    value={productData.category_id}
                    onChange={(e) => setProductData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">카테고리 선택</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상태
                  </label>
                  <select
                    value={productData.status}
                    onChange={(e) => setProductData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">활성</option>
                    <option value="draft">임시저장</option>
                    <option value="archived">보관</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 업체 및 구매 정보 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium mb-4">업체 및 구매 정보</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    업체 (Supplier)
                  </label>
                  <select
                    value={productData.supplier_id}
                    onChange={(e) => setProductData(prev => ({ ...prev, supplier_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">업체 선택</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name} ({sup.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    모델번호
                  </label>
                  <input
                    type="text"
                    value={productData.model_number}
                    onChange={(e) => setProductData(prev => ({ ...prev, model_number: e.target.value }))}
                    placeholder="ABC-123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      매입가
                    </label>
                    <input
                      type="number"
                      value={productData.purchase_price}
                      onChange={(e) => setProductData(prev => ({ ...prev, purchase_price: e.target.value }))}
                      placeholder="15000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      매입일
                    </label>
                    <input
                      type="date"
                      value={productData.purchase_date}
                      onChange={(e) => setProductData(prev => ({ ...prev, purchase_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 옵션 및 Variant */}
          <div className="space-y-6">

            {/* 옵션 설정 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium mb-4">옵션 설정</h2>

              {options.map((option, optionIndex) => (
                <div key={optionIndex} className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {option.name}
                  </label>

                  <div className="space-y-2">
                    {option.values.map((value, valueIndex) => (
                      <div key={valueIndex} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={value.value}
                          onChange={(e) => updateOptionValue(optionIndex, valueIndex, 'value', e.target.value)}
                          placeholder={option.name === '사이즈' ? '예: 66' : '예: 핑크'}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={() => removeOptionValue(optionIndex, valueIndex)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <MinusIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => addOptionValue(optionIndex)}
                      className="w-full p-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600"
                    >
                      + {option.name} 추가
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setShowVariantGenerator(true)}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Variant 자동 생성
              </button>
            </div>

            {/* Variant 관리 */}
            {variants.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-medium mb-4">
                  Variant 재고 관리 ({variants.length}개)
                </h2>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {variants.map((variant, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {variant.options.map(opt => opt.value).join(' / ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">SKU</label>
                          <input
                            type="text"
                            value={variant.sku}
                            onChange={(e) => updateVariantSKU(index, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">재고</label>
                          <input
                            type="number"
                            value={variant.inventory}
                            onChange={(e) => updateVariantInventory(index, e.target.value)}
                            min="0"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 총 재고: {variants.reduce((sum, v) => sum + v.inventory, 0)}개
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Variant 생성 확인 모달 */}
        {showVariantGenerator && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">Variant 자동 생성</h3>
              <p className="text-gray-600 mb-6">
                입력한 옵션값을 조합하여 Variant를 자동으로 생성합니다.
                <br />
                기존 Variant는 삭제됩니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowVariantGenerator(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  취소
                </button>
                <button
                  onClick={generateVariants}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  생성
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 하단 고정 네비게이션 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={handleSaveProduct}
            disabled={loading}
            className={`w-full py-3 px-6 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-all duration-200 ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                등록 중...
              </>
            ) : (
              <>
                <PlusIcon className="w-5 h-5" />
                상품 등록하기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
