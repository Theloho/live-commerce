'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeftIcon, PlusIcon, MinusIcon, PencilIcon } from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'
import {
  getProductVariants,
  updateVariantInventory,
  getSuppliers,
  getCategories
} from '@/lib/supabaseApi'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState(null)
  const [variants, setVariants] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])

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

      // 상품 정보, Variant, 업체, 카테고리 로드
      const [productData, variantsData, suppliersData, categoriesData] = await Promise.all([
        supabase
          .from('products')
          .select('*, suppliers(*), categories(*)')
          .eq('id', productId)
          .single(),
        getProductVariants(productId),
        getSuppliers(),
        getCategories()
      ])

      if (productData.error) throw productData.error

      setProduct(productData.data)
      setVariants(variantsData || [])
      setSuppliers(suppliersData)
      setCategories(categoriesData)

      console.log('📦 상품 상세 로드:', productData.data)
      console.log('🎯 Variant 개수:', variantsData?.length || 0)
    } catch (error) {
      console.error('데이터 로딩 오류:', error)
      toast.error('데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // Variant 재고 변경
  const handleVariantInventoryChange = async (variantId, change) => {
    try {
      await updateVariantInventory(variantId, change)
      toast.success('재고가 업데이트되었습니다')
      loadData() // 데이터 새로고침
    } catch (error) {
      console.error('재고 업데이트 오류:', error)
      toast.error('재고 업데이트에 실패했습니다: ' + error.message)
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

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">상품을 찾을 수 없습니다</p>
          <button
            onClick={() => router.push('/admin/products/catalog')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/products/catalog')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">{product.title}</h1>
              <p className="text-sm text-gray-600">
                {product.model_number && `모델: ${product.model_number} | `}
                SKU: {variants.length}개
              </p>
            </div>
          </div>

          {/* 편집 버튼 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/admin/products/catalog/${productId}/edit`)}
              className="px-4 py-2 text-white bg-gray-800 rounded-lg hover:bg-gray-900 flex items-center gap-2"
            >
              <PencilIcon className="w-4 h-4" />
              편집
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-6xl mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4">

          {/* 왼쪽: 상품 기본 정보 */}
          <div className="lg:col-span-1 space-y-6">

            {/* 상품 이미지 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium mb-4">상품 이미지</h2>
              {product.thumbnail_url ? (
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={product.thumbnail_url}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">이미지 없음</span>
                </div>
              )}
            </div>

            {/* 기본 정보 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium mb-4">기본 정보</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">판매가격</span>
                  <span className="font-medium">₩{product.price?.toLocaleString()}</span>
                </div>
                {product.compare_price && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">정가</span>
                    <span className="text-gray-400 line-through">
                      ₩{product.compare_price.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">총 재고</span>
                  <span className="font-medium">{product.inventory}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">카테고리</span>
                  <span>{product.categories?.name || '미분류'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">상태</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    product.status === 'active' ? 'bg-green-100 text-green-800' :
                    product.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {product.status === 'active' ? '활성' :
                     product.status === 'draft' ? '임시저장' : '보관'}
                  </span>
                </div>
              </div>
            </div>

            {/* 업체 및 구매 정보 */}
            {(product.suppliers || product.purchase_price || product.purchase_date) && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-medium mb-4">업체 및 구매 정보</h2>
                <div className="space-y-3 text-sm">
                  {product.suppliers && (
                    <div>
                      <div className="text-gray-600 mb-1">업체</div>
                      <div className="font-medium">
                        {product.suppliers.name} ({product.suppliers.code})
                      </div>
                      {product.suppliers.contact_person && (
                        <div className="text-gray-500 text-xs mt-1">
                          담당: {product.suppliers.contact_person}
                        </div>
                      )}
                    </div>
                  )}
                  {product.model_number && (
                    <div>
                      <div className="text-gray-600 mb-1">모델번호</div>
                      <div className="font-medium">{product.model_number}</div>
                    </div>
                  )}
                  {product.purchase_price && (
                    <div>
                      <div className="text-gray-600 mb-1">매입가</div>
                      <div className="font-medium">
                        ₩{parseFloat(product.purchase_price).toLocaleString()}
                      </div>
                      {product.price && (
                        <div className="text-xs text-gray-500 mt-1">
                          마진: ₩{(product.price - product.purchase_price).toLocaleString()}
                          ({((product.price - product.purchase_price) / product.price * 100).toFixed(1)}%)
                        </div>
                      )}
                    </div>
                  )}
                  {product.purchase_date && (
                    <div>
                      <div className="text-gray-600 mb-1">매입일</div>
                      <div className="font-medium">{product.purchase_date}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {product.detailed_description && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-medium mb-4">상세 설명</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {product.detailed_description}
                </p>
              </div>
            )}
          </div>

          {/* 오른쪽: Variant 재고 관리 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-medium">Variant 재고 관리</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    각 옵션 조합별로 재고를 관리할 수 있습니다
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {variants.reduce((sum, v) => sum + v.inventory, 0)}개
                  </div>
                  <div className="text-xs text-gray-500">총 재고</div>
                </div>
              </div>

              {variants.length > 0 ? (
                <div className="space-y-3">
                  {variants.map((variant, index) => (
                    <div
                      key={variant.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {variant.options?.map(opt => opt.optionValue).join(' / ')}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            SKU: {variant.sku}
                            {variant.supplier_sku && ` | 업체 SKU: ${variant.supplier_sku}`}
                          </div>
                        </div>

                        {/* 재고 조절 버튼 */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleVariantInventoryChange(variant.id, -1)}
                            disabled={variant.inventory <= 0}
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <MinusIcon className="w-4 h-4" />
                          </button>

                          <div className="text-center min-w-[60px]">
                            <div className={`text-2xl font-bold ${
                              variant.inventory === 0 ? 'text-red-600' :
                              variant.inventory <= 5 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {variant.inventory}
                            </div>
                            <div className="text-xs text-gray-500">재고</div>
                          </div>

                          <button
                            onClick={() => handleVariantInventoryChange(variant.id, 1)}
                            className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* 재고 상태 바 */}
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            variant.inventory === 0 ? 'bg-red-500' :
                            variant.inventory <= 5 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min((variant.inventory / 20) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-4xl mb-4">📦</div>
                  <p className="text-gray-600 mb-4">등록된 Variant가 없습니다</p>
                  <p className="text-sm text-gray-500">
                    상세 상품 등록 페이지에서 Variant를 생성할 수 있습니다
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
