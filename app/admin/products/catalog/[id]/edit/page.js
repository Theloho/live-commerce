'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeftIcon, CheckIcon, XMarkIcon, PlusIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
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
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  const [showSupplierSheet, setShowSupplierSheet] = useState(false)
  const [showMainCategorySheet, setShowMainCategorySheet] = useState(false)
  const [showSubCategorySheet, setShowSubCategorySheet] = useState(false)
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

      const { error } = await supabase
        .from('products')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)

      if (error) throw error

      toast.success('상품 정보가 수정되었습니다')
      router.push(`/admin/products/catalog/${productId}`)
    } catch (error) {
      console.error('상품 수정 오류:', error)
      toast.error('상품 수정에 실패했습니다')
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
      <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">

        {/* 기본 정보 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품번호
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.product_number}
                    onChange={(e) => handleChange('product_number', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="P-0001"
                  />
                  {!formData.product_number && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { data: products, error } = await supabase
                            .from('products')
                            .select('product_number')
                            .not('product_number', 'is', null)

                          if (error) {
                            console.error('상품번호 조회 오류:', error)
                            toast.error('상품번호 조회 실패')
                            return
                          }

                          const usedNumbers = (products || [])
                            .map(p => {
                              const match = p.product_number?.match(/^P-(\d{4})$/)
                              return match ? parseInt(match[1]) : null
                            })
                            .filter(num => num !== null)

                          for (let i = 1; i <= 9999; i++) {
                            if (!usedNumbers.includes(i)) {
                              handleChange('product_number', `P-${String(i).padStart(4, '0')}`)
                              toast.success(`상품번호 P-${String(i).padStart(4, '0')} 생성됨`)
                              return
                            }
                          }
                          handleChange('product_number', `P-${String(Math.max(...usedNumbers, 0) + 1).padStart(4, '0')}`)
                          toast.success('상품번호 생성됨')
                        } catch (err) {
                          console.error('상품번호 생성 오류:', err)
                          toast.error('상품번호 생성 실패')
                        }
                      }}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm whitespace-nowrap"
                    >
                      자동생성
                    </button>
                  )}
                </div>
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
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">가격 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                판매가격 *
              </label>
              <input
                type="number"
                value={formData.price}
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
                value={formData.compare_price}
                onChange={(e) => handleChange('compare_price', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="15000"
              />
            </div>
          </div>
        </div>

        {/* 카테고리 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">카테고리</h2>
          <div className="grid grid-cols-2 gap-4">
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
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">업체 정보</h2>
          <div className="grid grid-cols-2 gap-4">
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

        {/* 추가 정보 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">추가 정보</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => handleChange('sku', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="SKU"
              />
            </div>

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
