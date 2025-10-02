'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeftIcon, CheckIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getSuppliers } from '@/lib/supabaseApi'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function ProductEditPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [suppliers, setSuppliers] = useState([])
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
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

      const [productData, suppliersData] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single(),
        getSuppliers()
      ])

      if (productData.error) throw productData.error

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

      console.log('📦 상품 정보 로드 완료')
    } catch (error) {
      console.error('데이터 로딩 오류:', error)
      toast.error('데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 입력 변경 핸들러
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 공급업체 빠른 추가
  const handleQuickAddSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error('업체명을 입력해주세요')
      return
    }

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          name: newSupplierName.trim(),
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      toast.success('업체가 추가되었습니다')

      // 목록 새로고침
      const updatedSuppliers = await getSuppliers()
      setSuppliers(updatedSuppliers)

      // 새로 추가된 업체를 선택
      setFormData(prev => ({
        ...prev,
        supplier_id: data.id
      }))

      setShowSupplierModal(false)
      setNewSupplierName('')
    } catch (error) {
      console.error('업체 추가 오류:', error)
      toast.error('업체 추가에 실패했습니다')
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
      <div className="max-w-4xl mx-auto py-6 px-6 space-y-6">

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
                <input
                  type="text"
                  value={formData.product_number}
                  onChange={(e) => handleChange('product_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="P-0001"
                />
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
              <input
                type="text"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="예: 아동화"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                소분류
              </label>
              <input
                type="text"
                value={formData.sub_category}
                onChange={(e) => handleChange('sub_category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="예: 운동화"
              />
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
                  onClick={() => setShowSupplierModal(true)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                  title="업체 추가"
                >
                  <PlusIcon className="w-4 h-4" />
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

      {/* 업체 빠른 추가 모달 */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">업체 빠른 추가</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                업체명 *
              </label>
              <input
                type="text"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleQuickAddSupplier()
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="업체명을 입력하세요"
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">
                상세 정보는 나중에 "공급업체 관리" 메뉴에서 추가할 수 있습니다
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSupplierModal(false)
                  setNewSupplierName('')
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleQuickAddSupplier}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
