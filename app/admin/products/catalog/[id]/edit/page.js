'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeftIcon, CheckIcon, XMarkIcon, PlusIcon, MinusIcon, Cog6ToothIcon, CameraIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'
import { getSuppliers } from '@/lib/supabaseApi'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import SupplierManageSheet from '@/app/components/SupplierManageSheet'
import CategoryManageSheet from '@/app/components/CategoryManageSheet'

export default function ProductEditPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [product, setProduct] = useState(null) // 상품 원본 데이터 (variant_count 등)
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  const [showSupplierSheet, setShowSupplierSheet] = useState(false)
  const [showMainCategorySheet, setShowMainCategorySheet] = useState(false)
  const [showSubCategorySheet, setShowSubCategorySheet] = useState(false)

  // 이미지 관련 state
  const cameraInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const [imagePreview, setImagePreview] = useState('')
  const [imageFile, setImageFile] = useState(null)

  // 옵션 관련 constants
  const SIZE_TEMPLATES = {
    number: ['55', '66', '77', '88', '99'],
    alpha: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    free: ['FREE']
  }

  const COLOR_PRESETS = [
    '블랙', '화이트', '그레이', '베이지', '네이비',
    '브라운', '카키', '핑크', '레드', '블루'
  ]

  // 옵션 관련 state
  const [sizeOptions, setSizeOptions] = useState([])
  const [colorOptions, setColorOptions] = useState([])
  const [optionInventories, setOptionInventories] = useState({})

  const [formData, setFormData] = useState({
    title: '',
    product_number: '',
    price: 0,
    compare_price: 0,
    description: '',
    category: '',
    sub_category: '',
    model_number: '',
    sku: '',
    barcode: '',
    supplier_id: '',
    supplier_product_code: '',
    inventory: 0
  })

  // 이미지 업로드 핸들러
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // 옵션 관리 함수들
  const applySizeTemplate = (templateKey) => {
    setSizeOptions([...SIZE_TEMPLATES[templateKey]])
    toast.success(`${SIZE_TEMPLATES[templateKey].length}개의 사이즈가 추가되었습니다`)
  }

  const addSizeOption = () => {
    setSizeOptions([...sizeOptions, ''])
  }

  const removeSizeOption = (index) => {
    setSizeOptions(sizeOptions.filter((_, i) => i !== index))
  }

  const updateSizeOption = (index, value) => {
    const newSizeOptions = [...sizeOptions]
    newSizeOptions[index] = value
    setSizeOptions(newSizeOptions)
  }

  const removeAllSizeOptions = () => {
    setSizeOptions([])
    toast.success('모든 사이즈 옵션이 제거되었습니다')
  }

  const applyColorPresets = () => {
    setColorOptions([...COLOR_PRESETS])
    toast.success(`${COLOR_PRESETS.length}개의 색상이 추가되었습니다`)
  }

  const addColorOption = () => {
    setColorOptions([...colorOptions, ''])
  }

  const removeColorOption = (index) => {
    setColorOptions(colorOptions.filter((_, i) => i !== index))
  }

  const updateColorOption = (index, value) => {
    const newColorOptions = [...colorOptions]
    newColorOptions[index] = value
    setColorOptions(newColorOptions)
  }

  const removeAllColorOptions = () => {
    setColorOptions([])
    toast.success('모든 색상 옵션이 제거되었습니다')
  }

  const generateOptionCombinations = () => {
    if (sizeOptions.length === 0 && colorOptions.length === 0) {
      return []
    }

    const combinations = []

    if (sizeOptions.length > 0 && colorOptions.length > 0) {
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
      sizeOptions.forEach(size => {
        combinations.push({
          key: `size:${size}`,
          label: size,
          type: 'size',
          size
        })
      })
    } else if (colorOptions.length > 0) {
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

  const handleOptionInventoryChange = (comboKey, inventory) => {
    setOptionInventories({
      ...optionInventories,
      [comboKey]: parseInt(inventory) || 0
    })
  }

  const combinations = generateOptionCombinations()

  // 권한 체크
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
    }
  }, [authLoading, isAdminAuthenticated, router])

  // 데이터 로드
  useEffect(() => {
    if (isAdminAuthenticated && productId) {
      loadData()
    }
  }, [isAdminAuthenticated, productId])

  const loadData = async () => {
    try {
      setLoading(true)

      const [productData, suppliersData, categoriesData] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single(),
        getSuppliers(),
        supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('name')
      ])

      if (productData.error) throw productData.error
      if (categoriesData.error) throw categoriesData.error

      setProduct(productData.data) // 원본 데이터 저장 (variant_count 등)
      setFormData({
        title: productData.data.title || '',
        product_number: productData.data.product_number || '',
        price: productData.data.price || 0,
        compare_price: productData.data.compare_price || 0,
        description: productData.data.description || '',
        category: productData.data.category || '',
        sub_category: productData.data.sub_category || '',
        model_number: productData.data.model_number || '',
        sku: productData.data.sku || '',
        barcode: productData.data.barcode || '',
        supplier_id: productData.data.supplier_id || '',
        supplier_product_code: productData.data.supplier_product_code || '',
        inventory: productData.data.inventory || 0
      })
      setSuppliers(suppliersData)
      setCategories(categoriesData.data)

      // 기존 이미지 로드
      if (productData.data.thumbnail_url) {
        setImagePreview(productData.data.thumbnail_url)
      }

      // 현재 카테고리가 설정되어 있으면 서브 카테고리 로드
      if (productData.data.category) {
        loadSubCategories(productData.data.category)
      }

      console.log('📦 상품 정보 로드 완료')
    } catch (error) {
      console.error('데이터 로딩 오류:', error)
      toast.error('데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 서브 카테고리 로드
  const loadSubCategories = async (categoryName) => {
    try {
      // DB에서 직접 대분류 찾기 (state 의존 제거)
      const { data: mainCategoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .is('parent_id', null)
        .single()

      if (!mainCategoryData) return

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', mainCategoryData.id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setSubCategories(data || [])
    } catch (error) {
      console.error('서브 카테고리 로딩 오류:', error)
    }
  }

  // 입력 변경 핸들러
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // 대분류 카테고리 변경 시 서브 카테고리 로드
    if (field === 'category') {
      loadSubCategories(value)
      // 서브 카테고리 초기화
      setFormData(prev => ({
        ...prev,
        category: value,
        sub_category: ''
      }))
    }
  }

  // 공급업체 선택 핸들러
  const handleSupplierSelect = async (supplierId, supplierName) => {
    setFormData(prev => ({
      ...prev,
      supplier_id: supplierId
    }))

    // 목록 새로고침
    const updatedSuppliers = await getSuppliers()
    setSuppliers(updatedSuppliers)
  }

  // 카테고리 선택 핸들러
  const handleCategorySelect = async (mainCategory, subCategory) => {
    setFormData(prev => ({
      ...prev,
      category: mainCategory,
      sub_category: subCategory
    }))

    // 카테고리 목록 새로고침
    const { data: updatedCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    setCategories(updatedCategories || [])

    // 서브 카테고리 로드
    if (mainCategory) {
      loadSubCategories(mainCategory)
    }
  }

  // 저장
  const handleSave = async () => {
    // 유효성 검사
    if (!formData.title) {
      toast.error('상품명을 입력해주세요')
      return
    }
    if (formData.price <= 0) {
      toast.error('가격을 입력해주세요')
      return
    }

    try {
      setSaving(true)

      let thumbnailUrl = imagePreview

      // 새로운 이미지 파일이 있으면 업로드
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `products/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile)

        if (uploadError) {
          throw new Error('이미지 업로드에 실패했습니다')
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)

        thumbnailUrl = publicUrl
      }

      console.log('🔍 저장할 데이터:', { ...formData, thumbnail_url: thumbnailUrl })

      // Service Role API 사용 (RLS 우회)
      const response = await fetch('/api/admin/products/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          updateData: {
            ...formData,
            thumbnail_url: thumbnailUrl
          }
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || '상품 수정에 실패했습니다')
      }

      console.log('✅ 저장 성공:', result.data)

      toast.success('상품 정보가 수정되었습니다')
      router.push(`/admin/products/catalog/${productId}`)
    } catch (error) {
      console.error('상품 수정 오류:', error)
      toast.error(error.message || '상품 수정에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">상품 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/admin/products/catalog/${productId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">상품 편집</h1>
              <p className="text-sm text-gray-600">빠른 등록 후 상세 정보 입력</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/admin/products/catalog/${productId}`)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={saving}
            >
              <XMarkIcon className="w-4 h-4 inline mr-1" />
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              <CheckIcon className="w-4 h-4 inline mr-1" />
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-4xl mx-auto py-6 space-y-6">

        {/* 상품 이미지 */}
        <div className="bg-white rounded-lg shadow-sm py-6 px-4">
          <h2 className="text-lg font-semibold mb-4">상품 이미지</h2>
          <div className="space-y-4">
            {imagePreview ? (
              <div className="space-y-4">
                {/* 이미지 미리보기 */}
                <div className="relative aspect-square w-full max-w-md mx-auto rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={imagePreview}
                    alt="상품 이미지"
                    fill
                    className="object-cover"
                  />
                </div>

                {/* 이미지 변경 버튼 */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <PhotoIcon className="w-8 h-8 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">사진보관함</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <CameraIcon className="w-8 h-8 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">사진촬영</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 이미지 없을 때 업로드 버튼 */}
                <div className="relative aspect-square w-full max-w-md mx-auto rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                    <p className="text-sm">상품 이미지를 업로드하세요</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <PhotoIcon className="w-8 h-8 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">사진보관함</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <CameraIcon className="w-8 h-8 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">사진촬영</span>
                  </button>
                </div>
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <p className="text-xs text-gray-500 text-center">
              권장 크기: 1:1 비율 (정사각형), 최소 800x800px
            </p>
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="bg-white rounded-lg shadow-sm py-6 px-4">
          <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상품명 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="상품명을 입력하세요"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품번호 (수정 불가)
                </label>
                <input
                  type="text"
                  value={formData.product_number}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  placeholder="P-0001"
                />
                <p className="mt-1 text-xs text-gray-500">
                  상품번호는 등록 후 변경할 수 없습니다
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  모델명
                </label>
                <input
                  type="text"
                  value={formData.model_number}
                  onChange={(e) => handleChange('model_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="MODEL-001"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="상품 설명을 입력하세요"
              />
            </div>
          </div>
        </div>

        {/* 가격 정보 */}
        <div className="bg-white rounded-lg shadow-sm py-6 px-4">
          <h2 className="text-lg font-semibold mb-4">가격 정보</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                판매가격 *
              </label>
              <input
                type="number"
                value={formData.price || ''}
                onChange={(e) => handleChange('price', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="10000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                정가 (비교 가격)
              </label>
              <input
                type="number"
                value={formData.compare_price || ''}
                onChange={(e) => handleChange('compare_price', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="15000"
              />
              <p className="mt-1 text-xs text-gray-500">
                정가보다 낮은 판매가격을 설정하면 할인율이 표시됩니다
              </p>
            </div>
          </div>
        </div>

        {/* 카테고리 */}
        <div className="bg-white rounded-lg shadow-sm py-6 px-4">
          <h2 className="text-lg font-semibold mb-4">카테고리</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                대분류
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">선택하세요</option>
                  {categories.filter(c => c.parent_id === null).map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowMainCategorySheet(true)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                  title="카테고리 관리"
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                소분류
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.sub_category}
                  onChange={(e) => handleChange('sub_category', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!formData.category}
                >
                  <option value="">선택하세요</option>
                  {subCategories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.category) {
                      toast.error('먼저 대분류를 선택해주세요')
                      return
                    }
                    setShowSubCategorySheet(true)
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!formData.category}
                  title="소분류 관리"
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 업체 정보 */}
        <div className="bg-white rounded-lg shadow-sm py-6 px-4">
          <h2 className="text-lg font-semibold mb-4">업체 정보</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                공급업체
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.supplier_id}
                  onChange={(e) => handleChange('supplier_id', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">선택하세요</option>
                  {suppliers.filter(s => s.is_active).map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowSupplierSheet(true)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                  title="업체 관리"
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                업체 상품 코드
              </label>
              <input
                type="text"
                value={formData.supplier_product_code}
                onChange={(e) => handleChange('supplier_product_code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="업체에서 사용하는 상품 코드"
              />
            </div>
          </div>
        </div>

        {/* 옵션 관리 섹션 (Variant가 없는 경우에만 표시) */}
        {(!product?.variant_count || product.variant_count === 0) && (
          <>
            {/* 사이즈 옵션 */}
            <div className="bg-white rounded-lg shadow-sm py-6 px-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">사이즈 옵션</h2>
                {sizeOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={removeAllSizeOptions}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    전체 삭제
                  </button>
                )}
              </div>

              {sizeOptions.length === 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => applySizeTemplate('number')}
                      className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-sm">숫자(55-99)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => applySizeTemplate('alpha')}
                      className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-sm">영문(S-XXL)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => applySizeTemplate('free')}
                      className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-sm">FREE</div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sizeOptions.map((size, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={size}
                        onChange={(e) => updateSizeOption(index, e.target.value)}
                        placeholder="사이즈명"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeSizeOption(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
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
                <h2 className="text-lg font-semibold">색상 옵션</h2>
                {colorOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={removeAllColorOptions}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    전체 삭제
                  </button>
                )}
              </div>

              {colorOptions.length === 0 ? (
                <button
                  type="button"
                  onClick={applyColorPresets}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  + 색상 프리셋 (10색)
                </button>
              ) : (
                <div className="space-y-3">
                  {colorOptions.map((color, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => updateColorOption(index, e.target.value)}
                        placeholder="색상명"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeColorOption(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addColorOption}
                    className="w-full p-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600"
                  >
                    + 색상 추가
                  </button>
                </div>
              )}
            </div>

            {/* 옵션별 재고 설정 */}
            {combinations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm py-6 px-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">옵션별 재고 설정</h2>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      id="bulkInventory"
                      placeholder="일괄 입력"
                      min="0"
                      className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const bulkValue = document.getElementById('bulkInventory').value
                        if (bulkValue) {
                          const newInventories = {}
                          combinations.forEach(combo => {
                            newInventories[combo.key] = parseInt(bulkValue) || 0
                          })
                          setOptionInventories(newInventories)
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
                          value={optionInventories[combo.key] || 0}
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
                    💡 총 재고: {Object.values(optionInventories).reduce((sum, qty) => sum + (qty || 0), 0)}개
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* 추가 정보 */}
        <div className="bg-white rounded-lg shadow-sm py-6 px-4">
          <h2 className="text-lg font-semibold mb-4">추가 정보</h2>
          <div className="grid grid-cols-1 gap-4">
            {/* SKU 필드 - Variant 유무에 따라 조건부 표시 */}
            {product?.variant_count > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>Variant별로 관리됨 (총 {product.variant_count}개)</span>
                    <button
                      onClick={() => router.push(`/admin/products/catalog/${productId}`)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      재고 관리 →
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  각 Variant는 자동 생성된 SKU를 가지고 있습니다 (예: P-0001-66-블랙-a3f27b8c)
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU (자동 생성)
                </label>
                <input
                  type="text"
                  value={formData.product_number || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  placeholder="상품번호가 SKU로 사용됩니다"
                />
                <p className="mt-1 text-xs text-gray-500">
                  옵션이 없는 상품은 상품번호가 SKU로 사용됩니다
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                바코드
              </label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => handleChange('barcode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="바코드"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                기본 재고
              </label>
              <input
                type="number"
                value={formData.inventory}
                onChange={(e) => handleChange('inventory', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            * Variant가 있는 상품은 Variant별 재고가 우선 적용됩니다
          </p>
        </div>

      </div>

      {/* 공급업체 관리 버텀시트 */}
      <SupplierManageSheet
        isOpen={showSupplierSheet}
        onClose={() => setShowSupplierSheet(false)}
        onSelect={handleSupplierSelect}
        currentSupplierId={formData.supplier_id}
      />

      {/* 대분류 카테고리 관리 버텀시트 */}
      <CategoryManageSheet
        isOpen={showMainCategorySheet}
        onClose={() => setShowMainCategorySheet(false)}
        onSelect={handleCategorySelect}
        currentCategory={formData.category}
        currentSubCategory=""
        mode="main"
      />

      {/* 소분류 카테고리 관리 버텀시트 */}
      <CategoryManageSheet
        isOpen={showSubCategorySheet}
        onClose={() => setShowSubCategorySheet(false)}
        onSelect={handleCategorySelect}
        currentCategory={formData.category}
        currentSubCategory={formData.sub_category}
        mode="sub"
      />
    </div>
  )
}
