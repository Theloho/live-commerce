'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeftIcon, CameraIcon, PlusIcon, MinusIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import toast from 'react-hot-toast'

export default function NewProductPage() {
  const router = useRouter()
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [productNumber, setProductNumber] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)

  const [productData, setProductData] = useState({
    title: '', // 선택적 제품명
    price: '',
    inventory: 10,
    description: '',
    optionType: 'none', // 'none', 'size', 'color', 'both'
    sizeOptions: [],
    colorOptions: [],
    optionInventories: {}
  })

  const [showSizeTemplateSelector, setShowSizeTemplateSelector] = useState(false)
  const [useThousandUnit, setUseThousandUnit] = useState(true) // 천원단위 입력 기본값 true

  // 필수값 검증 함수
  const validateRequiredFields = () => {
    const errors = []

    if (!imagePreview) {
      errors.push('제품 이미지')
    }
    if (!productData.price || productData.price <= 0) {
      errors.push('판매가격')
    }
    if (productData.optionType !== 'none') {
      const totalOptionInventory = Object.values(productData.optionInventories).reduce((sum, qty) => sum + (qty || 0), 0)
      if (totalOptionInventory === 0) {
        errors.push('옵션별 재고')
      }
    }

    return errors
  }

  // 등록 가능 여부 확인
  const canSubmit = validateRequiredFields().length === 0

  // 필수값 누락 알림
  const showMissingFieldsAlert = () => {
    const missingFields = validateRequiredFields()
    if (missingFields.length > 0) {
      toast.error(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`)
      return false
    }
    return true
  }

  // 미리 정의된 옵션 템플릿
  const SIZE_TEMPLATES = {
    number: ['55', '66', '77', '88', '99'],
    alpha: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    free: ['FREE']
  }

  const COLOR_PRESETS = ['블랙', '화이트', '그레이', '베이지', '네이비', '브라운', '카키', '핑크', '레드', '블루']

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

  // 권한 체크
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
    }
  }, [authLoading, isAdminAuthenticated, router])

  // 페이지 로드 시 제품번호 자동 생성
  useEffect(() => {
    if (isAdminAuthenticated) {
      generateProductNumber()
    }
  }, [isAdminAuthenticated])

  // 제품번호 자동 생성 (가장 낮은 빈 번호 찾기)
  const generateProductNumber = async () => {
    try {
      // 기존 제품들의 title에서 번호 패턴 추출
      const { data: products, error } = await supabase
        .from('products')
        .select('title')
        .not('title', 'is', null)

      if (error) throw error

      // title에서 숫자 패턴 추출 (0001, 0042/제품명 등)
      const usedNumbers = products
        .map(p => {
          const match = p.title.match(/^(\d{4})/)
          return match ? parseInt(match[1]) : null
        })
        .filter(num => num !== null)

      // 1부터 9999까지 중 가장 작은 미사용 번호 찾기
      for (let i = 1; i <= 9999; i++) {
        if (!usedNumbers.includes(i)) {
          setProductNumber(String(i).padStart(4, '0'))
          return
        }
      }

      // 모든 번호가 사용 중이면 마지막 번호 + 1
      setProductNumber(String(Math.max(...usedNumbers, 0) + 1).padStart(4, '0'))
    } catch (error) {
      console.error('제품번호 생성 오류:', error)
      setProductNumber('0001')
    }
  }

  // 이미지 업로드 (갤러리)
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // 카메라 촬영
  const handleCameraCapture = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // 가격 입력 처리
  const handlePriceChange = (value) => {
    if (!value) {
      setProductData(prev => ({ ...prev, price: '' }))
      return
    }

    if (useThousandUnit) {
      // 천원 단위 모드: 소수점 1자리까지 허용
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        const actualPrice = Math.floor(numValue * 1000)
        setProductData(prev => ({ ...prev, price: actualPrice }))
      }
    } else {
      // 일반 모드: 숫자만 허용
      const numValue = parseInt(value)
      if (!isNaN(numValue)) {
        setProductData(prev => ({ ...prev, price: numValue }))
      }
    }
  }

  // 가격 표시 값 계산
  const getDisplayPrice = () => {
    if (!productData.price) return ''

    if (useThousandUnit) {
      // 천원 단위로 표시 (19000 → 19)
      return (productData.price / 1000).toString()
    } else {
      // 실제 금액 표시
      return productData.price.toString()
    }
  }

  // 옵션 타입 변경
  const handleOptionTypeChange = (type) => {
    setProductData(prev => ({
      ...prev,
      optionType: type,
      sizeOptions: type === 'size' || type === 'both' ? SIZE_TEMPLATES.alpha : [],
      colorOptions: type === 'color' || type === 'both' ? COLOR_PRESETS.slice(0, 5) : [],
      optionInventories: {}
    }))
  }

  // 옵션 조합 생성
  const generateOptionCombinations = () => {
    const { optionType, sizeOptions, colorOptions } = productData

    if (optionType === 'none') {
      return []
    }

    const combinations = []

    if (optionType === 'size') {
      sizeOptions.forEach(size => {
        combinations.push({
          key: `size:${size}`,
          label: size,
          type: 'size',
          value: size
        })
      })
    } else if (optionType === 'color') {
      colorOptions.forEach(color => {
        combinations.push({
          key: `color:${color}`,
          label: color,
          type: 'color',
          value: color
        })
      })
    } else if (optionType === 'both') {
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

  // 제품 저장 (새 Variant 시스템)
  const handleSaveProduct = async () => {
    // 필수값 검증
    if (!canSubmit) {
      showMissingFieldsAlert()
      return
    }

    setLoading(true)

    try {
      console.log('🚀 [빠른등록] 상품 저장 시작')

      // 표시용 제품명 생성
      const displayName = productData.title.trim()
        ? `${productNumber}/${productData.title.trim()}`
        : productNumber

      // 총 재고 계산
      let totalInventory = productData.inventory
      if (productData.optionType !== 'none') {
        totalInventory = Object.values(productData.optionInventories).reduce((sum, qty) => sum + (qty || 0), 0)
      }

      // 1. 제품 생성
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          title: displayName,
          price: parseInt(productData.price),
          inventory: totalInventory,
          thumbnail_url: imagePreview,
          description: productData.description || '',
          status: 'active',
          is_featured: false,
          tags: ['NEW']
        })
        .select()
        .single()

      if (productError) throw productError
      console.log('✅ [빠른등록] 상품 생성 완료:', product.id)

      // 2. 옵션이 있는 경우 Variant 시스템으로 저장
      if (productData.optionType !== 'none' && combinations.length > 0) {
        console.log('📦 [빠른등록] 옵션 저장 시작')

        // 2-1. product_options 생성
        const optionsToCreate = []

        if (productData.optionType === 'size' || productData.optionType === 'both') {
          optionsToCreate.push({ name: '사이즈', values: productData.sizeOptions })
        }
        if (productData.optionType === 'color' || productData.optionType === 'both') {
          optionsToCreate.push({ name: '색상', values: productData.colorOptions })
        }

        const createdOptionValues = {} // { '사이즈': { '55': 'uuid', '66': 'uuid' }, '색상': { '블랙': 'uuid' } }

        for (const option of optionsToCreate) {
          // product_options INSERT
          const { data: createdOption, error: optionError } = await supabase
            .from('product_options')
            .insert({
              product_id: product.id,
              name: option.name,
              display_order: 0,
              is_required: false
            })
            .select()
            .single()

          if (optionError) throw optionError
          console.log(`  ✅ 옵션 생성: ${option.name}`)

          // product_option_values INSERT
          const valuesToInsert = option.values.map((value, index) => ({
            option_id: createdOption.id,
            value: value,
            display_order: index
          }))

          const { data: createdValues, error: valuesError } = await supabase
            .from('product_option_values')
            .insert(valuesToInsert)
            .select()

          if (valuesError) throw valuesError

          // 매핑 저장
          createdOptionValues[option.name] = {}
          createdValues.forEach(val => {
            createdOptionValues[option.name][val.value] = val.id
          })
          console.log(`  ✅ 옵션값 ${createdValues.length}개 생성`)
        }

        // 2-2. product_variants 생성 (조합별로)
        console.log('🔀 [빠른등록] Variant 생성 시작')

        for (const combo of combinations) {
          // SKU 생성
          let sku = productNumber
          if (combo.type === 'size') {
            sku = `${productNumber}-${combo.size}`
          } else if (combo.type === 'color') {
            sku = `${productNumber}-${combo.color}`
          } else if (combo.type === 'both') {
            sku = `${productNumber}-${combo.size}-${combo.color}`
          }

          // 재고
          const inventory = productData.optionInventories[combo.key] || 0

          // product_variants INSERT
          const { data: variant, error: variantError } = await supabase
            .from('product_variants')
            .insert({
              product_id: product.id,
              sku: sku,
              inventory: inventory,
              price_adjustment: 0,
              is_active: true
            })
            .select()
            .single()

          if (variantError) throw variantError

          // 2-3. variant_option_values 매핑
          const mappings = []
          if (combo.type === 'size') {
            mappings.push({
              variant_id: variant.id,
              option_value_id: createdOptionValues['사이즈'][combo.size]
            })
          } else if (combo.type === 'color') {
            mappings.push({
              variant_id: variant.id,
              option_value_id: createdOptionValues['색상'][combo.color]
            })
          } else if (combo.type === 'both') {
            mappings.push({
              variant_id: variant.id,
              option_value_id: createdOptionValues['사이즈'][combo.size]
            })
            mappings.push({
              variant_id: variant.id,
              option_value_id: createdOptionValues['색상'][combo.color]
            })
          }

          const { error: mappingError } = await supabase
            .from('variant_option_values')
            .insert(mappings)

          if (mappingError) throw mappingError

          console.log(`  ✅ Variant 생성: ${sku} (재고: ${inventory})`)
        }

        console.log(`✅ [빠른등록] 총 ${combinations.length}개 Variant 생성 완료`)
      }

      toast.success(`제품 ${productNumber}이 등록되었습니다!`)
      router.push('/admin/products')

    } catch (error) {
      console.error('❌ [빠른등록] 제품 저장 오류:', error)
      toast.error(`제품 등록 실패: ${error.message}`)
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

          {/* 왼쪽: 기본 정보 */}
          <div className="space-y-6">

            {/* 제품 이미지 */}
            <div className="bg-white rounded-lg shadow-sm">
              <h2 className="text-lg font-medium mb-4 p-6 pb-4">제품 이미지</h2>

              {imagePreview ? (
                <div className="space-y-6 px-6 pb-6">
                  {/* 이미지 미리보기 */}
                  <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={imagePreview}
                      alt="제품 이미지"
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* 이미지 변경 버튼들 */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <CameraIcon className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">다시 촬영</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <PhotoIcon className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">갤러리에서</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 px-6 pb-6">
                  {/* 이미지 업로드 안내 */}
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                    <PhotoIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">제품 이미지를 선택하세요</p>
                  </div>

                  {/* 업로드 옵션 버튼들 - 사진보관함 좌측, 사진촬영 우측 */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                    >
                      <PhotoIcon className="w-8 h-8 text-green-600" />
                      <span className="font-medium text-green-700">사진 보관함</span>
                      <span className="text-xs text-green-600">갤러리에서 선택</span>
                    </button>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <CameraIcon className="w-8 h-8 text-blue-600" />
                      <span className="font-medium text-blue-700">사진 촬영</span>
                      <span className="text-xs text-blue-600">카메라로 찍기</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 숨겨진 input 요소들 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
              />
            </div>

            {/* 기본 정보 */}
            <div className="bg-white rounded-lg shadow-sm">
              <h2 className="text-lg font-medium mb-4 p-6 pb-4">기본 정보</h2>

              <div className="space-y-6 px-6 pb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제품번호
                  </label>
                  <input
                    type="text"
                    value={productNumber}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">자동으로 생성됩니다</p>
                </div>

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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    판매가격 *
                  </label>
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="number"
                        step={useThousandUnit ? "0.1" : "1"}
                        value={getDisplayPrice()}
                        onChange={(e) => handlePriceChange(e.target.value)}
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
                        onChange={(e) => setUseThousandUnit(e.target.checked)}
                        className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-700">천원 단위로 입력하기</span>
                      <span className="text-xs text-gray-500">
                        (예: 19.5 → 19,500원)
                      </span>
                    </label>

                    {/* 실시간 가격 미리보기 */}
                    {productData.price > 0 && (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm text-blue-800">
                          <span className="font-medium">최종 가격: </span>
                          <span className="font-bold">₩{productData.price.toLocaleString()}원</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {productData.optionType === 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      재고 수량
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setProductData(prev => ({
                          ...prev,
                          inventory: Math.max(0, prev.inventory - 1)
                        }))}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={productData.inventory}
                        onChange={(e) => setProductData(prev => ({ ...prev, inventory: parseInt(e.target.value) || 0 }))}
                        className="flex-1 px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        min="0"
                      />
                      <button
                        onClick={() => setProductData(prev => ({
                          ...prev,
                          inventory: prev.inventory + 1
                        }))}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

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
            </div>
          </div>

          {/* 오른쪽: 옵션 설정 */}
          <div className="space-y-6">

            {/* 사이즈 옵션 */}
            <div className="bg-white rounded-lg shadow-sm">
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
            <div className="bg-white rounded-lg shadow-sm">
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
              <div className="bg-white rounded-lg shadow-sm">
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