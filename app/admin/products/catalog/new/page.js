'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeftIcon, PlusIcon, MinusIcon, XMarkIcon, Cog6ToothIcon, CameraIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'
import {
  getSuppliers,
  getCategories,
  createProductWithOptions,
  createVariant,
  getProductOptions
} from '@/lib/supabaseApi'
import { supabase } from '@/lib/supabase'
import { generateProductNumber } from '@/lib/productNumberGenerator'
import toast from 'react-hot-toast'
import SupplierManageSheet from '@/app/components/SupplierManageSheet'
import CategoryManageSheet from '@/app/components/CategoryManageSheet'

export default function DetailedProductNewPage() {
  const router = useRouter()
  const { isAdminAuthenticated, loading: authLoading, adminUser } = useAdminAuth()

  // ⭐ 이미지 입력 refs
  const cameraInputRef = useRef(null)
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])
  const [imagePreview, setImagePreview] = useState('')
  const [showSupplierSheet, setShowSupplierSheet] = useState(false)
  const [showCategorySheet, setShowCategorySheet] = useState(false)

  // ⭐ 천 단위 가격 입력
  const [useThousandUnit, setUseThousandUnit] = useState(true)

  // 상품 기본 정보
  const [productData, setProductData] = useState({
    title: '',
    product_number: '',
    description: '',
    detailed_description: '',
    price: '',
    compare_price: '',
    supplier_id: '',
    model_number: '',
    purchase_price: '',
    purchase_date: '',
    category: '',
    sub_category: '',
    status: 'active',
    tags: [],
    // ⭐ 빠른등록 방식: 옵션 데이터
    sizeOptions: [],
    colorOptions: [],
    optionInventories: {}
  })

  // ⚠️ 더 이상 사용하지 않음 (빠른등록 방식으로 통일)
  // const [options, setOptions] = useState([...])
  // const [variants, setVariants] = useState([])

  // ⭐ 사이즈/색상 템플릿
  const SIZE_TEMPLATES = {
    number: ['55', '66', '77', '88', '99'],
    alpha: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    free: ['FREE']
  }

  const COLOR_PRESETS = [
    '블랙', '화이트', '그레이', '베이지', '네이비',
    '브라운', '카키', '핑크', '레드', '블루'
  ]

  // 권한 체크
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
    }
  }, [authLoading, isAdminAuthenticated, router])

  // 데이터 로드 및 상품번호 자동 생성
  useEffect(() => {
    if (isAdminAuthenticated) {
      loadInitialData()
      autoGenerateProductNumber()
    }
  }, [isAdminAuthenticated])

  const autoGenerateProductNumber = async () => {
    try {
      const number = await generateProductNumber()
      setProductData(prev => ({ ...prev, product_number: number }))
    } catch (error) {
      console.error('상품번호 생성 오류:', error)
      toast.error('상품번호 생성 실패')
    }
  }

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

  // ⭐ 천 단위 가격 입력 핸들러
  const handlePriceChange = (value) => {
    if (useThousandUnit) {
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        const actualPrice = Math.floor(numValue * 1000)
        setProductData(prev => ({ ...prev, price: actualPrice }))
      } else {
        setProductData(prev => ({ ...prev, price: '' }))
      }
    } else {
      setProductData(prev => ({ ...prev, price: value }))
    }
  }

  // ⭐ 사이즈 템플릿 적용 (빠른등록 방식)
  const applySizeTemplate = (templateKey) => {
    setProductData(prev => ({
      ...prev,
      sizeOptions: [...SIZE_TEMPLATES[templateKey]]
    }))
    toast.success(`${SIZE_TEMPLATES[templateKey].length}개의 사이즈가 추가되었습니다`)
  }

  // ⭐ 색상 프리셋 적용 (빠른등록 방식)
  const applyColorPresets = () => {
    setProductData(prev => ({
      ...prev,
      colorOptions: [...COLOR_PRESETS]
    }))
    toast.success(`${COLOR_PRESETS.length}개의 색상이 추가되었습니다`)
  }

  // 사이즈 옵션 추가
  const addSizeOption = () => {
    setProductData(prev => ({
      ...prev,
      sizeOptions: [...prev.sizeOptions, '']
    }))
  }

  // 사이즈 옵션 제거
  const removeSizeOption = (index) => {
    setProductData(prev => ({
      ...prev,
      sizeOptions: prev.sizeOptions.filter((_, i) => i !== index)
    }))
  }

  // 사이즈 옵션 수정
  const updateSizeOption = (index, value) => {
    const newSizeOptions = [...productData.sizeOptions]
    newSizeOptions[index] = value
    setProductData(prev => ({
      ...prev,
      sizeOptions: newSizeOptions
    }))
  }

  // 색상 옵션 추가
  const addColorOption = () => {
    setProductData(prev => ({
      ...prev,
      colorOptions: [...prev.colorOptions, '']
    }))
  }

  // 색상 옵션 제거
  const removeColorOption = (index) => {
    setProductData(prev => ({
      ...prev,
      colorOptions: prev.colorOptions.filter((_, i) => i !== index)
    }))
  }

  // 색상 옵션 수정
  const updateColorOption = (index, value) => {
    const newColorOptions = [...productData.colorOptions]
    newColorOptions[index] = value
    setProductData(prev => ({
      ...prev,
      colorOptions: newColorOptions
    }))
  }

  // 모든 사이즈 제거
  const removeAllSizeOptions = () => {
    setProductData(prev => ({
      ...prev,
      sizeOptions: []
    }))
    toast.success('모든 사이즈 옵션이 제거되었습니다')
  }

  // 모든 색상 제거
  const removeAllColorOptions = () => {
    setProductData(prev => ({
      ...prev,
      colorOptions: []
    }))
    toast.success('모든 색상 옵션이 제거되었습니다')
  }

  // ⭐ 옵션 조합 자동 생성 (빠른등록 방식)
  const generateOptionCombinations = () => {
    const { sizeOptions, colorOptions } = productData

    if (sizeOptions.length === 0 && colorOptions.length === 0) {
      return []
    }

    const combinations = []

    if (sizeOptions.length > 0 && colorOptions.length > 0) {
      // 사이즈 × 색상 조합
      sizeOptions.forEach(size => {
        colorOptions.forEach(color => {
          combinations.push({
            key: `size:${size}|color:${color}`,
            label: `${size} × ${color}`,
            type: 'both',
            size,
            color
          })
        })
      })
    } else if (sizeOptions.length > 0) {
      // 사이즈만
      sizeOptions.forEach(size => {
        combinations.push({
          key: `size:${size}`,
          label: size,
          type: 'size',
          size
        })
      })
    } else if (colorOptions.length > 0) {
      // 색상만
      colorOptions.forEach(color => {
        combinations.push({
          key: `color:${color}`,
          label: color,
          type: 'color',
          color
        })
      })
    }

    return combinations
  }

  const combinations = generateOptionCombinations()

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

  // ⭐ 상품 저장 (Service Role API 사용 - 빠른등록 방식)
  const handleSaveProduct = async () => {
    // 유효성 검증
    if (!productData.price || productData.price <= 0) {
      toast.error('판매가격을 입력해주세요')
      return
    }

    if (!imagePreview) {
      toast.error('상품 이미지를 업로드해주세요')
      return
    }

    if (combinations.length > 0) {
      const totalInventory = Object.values(productData.optionInventories).reduce((sum, qty) => sum + (qty || 0), 0)
      if (totalInventory === 0) {
        toast.error('옵션별 재고를 입력해주세요')
        return
      }
    }

    if (!adminUser?.email) {
      toast.error('관리자 인증 정보가 없습니다')
      return
    }

    setLoading(true)

    try {
      console.log('🚀 [상세등록] 상품 저장 시작 (빠른등록 방식)')

      // 총 재고 계산
      let totalInventory = 0
      if (combinations.length > 0) {
        totalInventory = Object.values(productData.optionInventories).reduce((sum, qty) => sum + (qty || 0), 0)
      }

      // 옵션 타입 결정
      let optionType = 'none'
      if (productData.sizeOptions.length > 0 && productData.colorOptions.length > 0) {
        optionType = 'both'
      } else if (productData.sizeOptions.length > 0) {
        optionType = 'size'
      } else if (productData.colorOptions.length > 0) {
        optionType = 'color'
      }

      // API 호출 (Service Role API)
      const requestData = {
        // 기본 필드
        title: productData.title.trim() || productData.product_number,
        product_number: productData.product_number,
        price: parseInt(productData.price),
        inventory: totalInventory,
        thumbnail_url: imagePreview,
        description: productData.description.trim(),

        // 옵션 필드
        optionType,
        sizeOptions: productData.sizeOptions,
        colorOptions: productData.colorOptions,
        optionInventories: productData.optionInventories,
        combinations: combinations,

        // ⭐ 상세등록 추가 필드
        supplier_id: productData.supplier_id || null,
        category_id: productData.category_id || null,
        model_number: productData.model_number.trim() || null,
        purchase_price: productData.purchase_price ? parseFloat(productData.purchase_price) : null,
        purchase_date: productData.purchase_date || null,
        compare_price: productData.compare_price ? parseInt(productData.compare_price) : null,
        detailed_description: productData.detailed_description.trim(),
        status: productData.status,
        is_live: false, // ⭐ 상세등록은 라이브 상품이 아님

        // 관리자 인증
        adminEmail: adminUser.email
      }

      console.log('🚀 [상세등록] API 호출:', requestData)

      const response = await fetch('/api/admin/products/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '상품 등록 실패')
      }

      const result = await response.json()
      console.log('✅ [상세등록] 상품 생성 완료:', result.product.id)

      toast.success('상품이 등록되었습니다!')
      router.push('/admin/products/catalog')

    } catch (error) {
      console.error('❌ [상세등록] 상품 저장 오류:', error)
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
      <div className="max-w-6xl mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 왼쪽: 기본 정보 */}
          <div className="space-y-6">

            {/* ⭐ 상품 이미지 (카메라 + 갤러리) */}
            <div className="bg-white rounded-lg shadow-sm py-6 px-4">
              <h2 className="text-lg font-medium mb-4">상품 이미지</h2>
              {imagePreview ? (
                <div className="space-y-4">
                  {/* 이미지 미리보기 - 작게 */}
                  <div className="relative aspect-[4/3] max-w-xs mx-auto bg-gray-100 rounded-lg overflow-hidden">
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
                  {/* 이미지 변경 버튼들 - 가로 배치 */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <PhotoIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">사진보관함</span>
                    </button>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <CameraIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">사진촬영</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Camera input */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {/* File input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {/* 업로드 버튼들 - 가로 배치, 작게 */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 py-4 px-3 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                    >
                      <PhotoIcon className="w-6 h-6 text-green-600" />
                      <span className="text-sm font-medium text-green-700">사진보관함</span>
                    </button>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 py-4 px-3 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <CameraIcon className="w-6 h-6 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">사진촬영</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 기본 정보 */}
            <div className="bg-white rounded-lg shadow-sm py-6 px-4">
              <h2 className="text-lg font-medium mb-4">기본 정보</h2>
              <div className="space-y-4">
                {/* ⭐ 상품명 (선택사항) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상품명 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={productData.title}
                    onChange={(e) => setProductData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="입력 시: 0001/밍크자켓, 미입력 시: 0001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-600">
                    입력하지 않으면 상품번호가 자동으로 제품명이 됩니다
                  </p>
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

                {/* ⭐ 판매가격 (천 단위 토글) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      판매가격 *
                    </label>
                    <button
                      onClick={() => setUseThousandUnit(!useThousandUnit)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        useThousandUnit
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-300'
                      }`}
                    >
                      {useThousandUnit ? '천 단위 입력' : '일반 입력'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={useThousandUnit ? "0.5" : "1"}
                      value={useThousandUnit && productData.price ? (productData.price / 1000).toFixed(1) : productData.price}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      placeholder={useThousandUnit ? "19.5" : "19000"}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {useThousandUnit && (
                      <span className="text-sm text-gray-600">천원</span>
                    )}
                  </div>
                  {useThousandUnit && productData.price && (
                    <p className="mt-1 text-xs text-blue-600">
                      실제 가격: ₩{parseInt(productData.price).toLocaleString()}
                    </p>
                  )}
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
            <div className="bg-white rounded-lg shadow-sm py-6 px-4">
              <h2 className="text-lg font-medium mb-4">업체 및 구매 정보</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상품번호
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={productData.product_number}
                      readOnly
                      placeholder="0001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    업체 (Supplier)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={productData.supplier_id}
                      onChange={(e) => setProductData(prev => ({ ...prev, supplier_id: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">업체 선택</option>
                      {suppliers.filter(s => s.is_active).map(sup => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowSupplierSheet(true)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200"
                      title="업체 관리"
                    >
                      <Cog6ToothIcon className="w-5 h-5" />
                    </button>
                  </div>
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

          {/* 오른쪽: 옵션 설정 (빠른등록 방식) */}
          <div className="space-y-6">

            {/* 사이즈 옵션 */}
            <div className="bg-white rounded-lg shadow-sm py-6 px-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">사이즈 옵션</h2>
                {productData.sizeOptions.length > 0 && (
                  <button
                    onClick={removeAllSizeOptions}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    전체 삭제
                  </button>
                )}
              </div>

              {productData.sizeOptions.length === 0 ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => applySizeTemplate('number')}
                      className="flex-1 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-sm">숫자(55-99)</div>
                    </button>
                    <button
                      onClick={() => applySizeTemplate('alpha')}
                      className="flex-1 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-sm">영문(S-XXL)</div>
                    </button>
                    <button
                      onClick={() => applySizeTemplate('free')}
                      className="flex-1 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-sm">FREE</div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {productData.sizeOptions.map((size, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={size}
                        onChange={(e) => updateSizeOption(index, e.target.value)}
                        placeholder="사이즈명"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    onClick={addSizeOption}
                    className="w-full p-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600"
                  >
                    + 사이즈 추가
                  </button>
                </div>
              )}
            </div>

            {/* 색상 옵션 */}
            <div className="bg-white rounded-lg shadow-sm py-6 px-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">색상 옵션</h2>
                {productData.colorOptions.length > 0 && (
                  <button
                    onClick={removeAllColorOptions}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    전체 삭제
                  </button>
                )}
              </div>

              {productData.colorOptions.length === 0 ? (
                <button
                  onClick={applyColorPresets}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  + 색상 프리셋 (10색)
                </button>
              ) : (
                <div className="space-y-3">
                  {productData.colorOptions.map((color, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => updateColorOption(index, e.target.value)}
                        placeholder="색상명"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    onClick={addColorOption}
                    className="w-full p-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600"
                  >
                    + 색상 추가
                  </button>
                </div>
              )}
            </div>

            {/* ⭐ 옵션별 재고 설정 (자동 생성) */}
            {combinations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm py-6 px-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium">옵션별 재고 설정</h2>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      id="bulkInventory"
                      placeholder="일괄 입력"
                      min="0"
                      className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          toast.success(`모든 옵션에 재고 ${bulkValue}개가 적용되었습니다`)
                        }
                      }}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        </div>
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

      {/* 공급업체 관리 버텀시트 */}
      <SupplierManageSheet
        isOpen={showSupplierSheet}
        onClose={() => setShowSupplierSheet(false)}
        onSelect={async (supplierId) => {
          setProductData(prev => ({ ...prev, supplier_id: supplierId }))
          const updatedSuppliers = await getSuppliers()
          setSuppliers(updatedSuppliers)
        }}
        currentSupplierId={productData.supplier_id}
      />
    </div>
  )
}
