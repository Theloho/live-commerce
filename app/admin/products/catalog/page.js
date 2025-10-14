'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  TagIcon,
  FolderIcon,
  AdjustmentsHorizontalIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline'
import { PlayIcon, StopIcon } from '@heroicons/react/24/solid'
import { getAllProducts, getCategories, addToLive, removeFromLive, deleteProduct } from '@/lib/supabaseApi'
import toast from 'react-hot-toast'

export default function ProductCatalogPage() {
  const router = useRouter()
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  // 상태 관리
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [viewMode, setViewMode] = useState('grid') // grid | list
  const [showFilters, setShowFilters] = useState(false)

  // 인증 확인
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
      return
    }

    if (!authLoading && isAdminAuthenticated) {
      loadData()
    }
  }, [authLoading, isAdminAuthenticated, router])

  // 데이터 로딩
  const loadData = async () => {
    try {
      setLoading(true)
      const [productsData, categoriesData] = await Promise.all([
        getAllProducts({
          search: searchTerm,
          category_id: selectedCategory,
          status: selectedStatus
        }),
        getCategories()
      ])

      // 각 상품의 variant 정보도 함께 로드
      const productsWithVariants = await Promise.all(
        productsData.map(async (product) => {
          try {
            const { getProductVariants } = await import('@/lib/supabaseApi')
            const variants = await getProductVariants(product.id)
            return { ...product, variants: variants || [] }
          } catch (error) {
            console.error(`Variant 로딩 실패 for product ${product.id}:`, error)
            return { ...product, variants: [] }
          }
        })
      )

      setProducts(productsWithVariants)
      setCategories(categoriesData)
      console.log('🛍️ 전체 상품 관리 데이터 로드 완료:', productsWithVariants.length, '개 상품')
    } catch (error) {
      console.error('데이터 로딩 오류:', error)
      toast.error('데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 검색 및 필터링 적용
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData()
    }, 300) // 300ms 디바운스

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedCategory, selectedStatus])

  // 라이브 방송 추가/제거
  const handleToggleLive = async (product) => {
    try {
      if (product.is_live_active) {
        await removeFromLive(product.id)
        toast.success(`${product.title}을(를) 라이브 방송에서 제거했습니다`)
      } else {
        await addToLive(product.id, 0)
        toast.success(`${product.title}을(를) 라이브 방송에 추가했습니다`)
      }
      loadData() // 데이터 새로고침
    } catch (error) {
      console.error('라이브 상태 변경 오류:', error)
      toast.error('라이브 상태 변경에 실패했습니다')
    }
  }

  // 상품 삭제 (Soft Delete)
  const handleDeleteProduct = async (product, e) => {
    e.stopPropagation() // 카드 클릭 이벤트 전파 방지

    // 확인 다이얼로그
    const confirmed = window.confirm(
      `정말로 "${product.title}" 상품을 삭제하시겠습니까?\n\n` +
      `⚠️ 이 작업은 Soft Delete입니다:\n` +
      `- 상품 목록에서 숨겨집니다\n` +
      `- 기존 주문 내역은 유지됩니다\n` +
      `- SKU는 재사용할 수 없습니다\n` +
      `- 데이터베이스에서는 삭제되지 않습니다`
    )

    if (!confirmed) return

    try {
      await deleteProduct(product.id)
      toast.success(`${product.title}을(를) 삭제했습니다`)
      loadData() // 데이터 새로고침
    } catch (error) {
      console.error('상품 삭제 오류:', error)
      toast.error('상품 삭제에 실패했습니다')
    }
  }

  // 상품 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // 상품 상태 텍스트
  const getStatusText = (status) => {
    switch (status) {
      case 'active': return '활성'
      case 'draft': return '임시저장'
      case 'archived': return '보관'
      default: return '알 수 없음'
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">상품 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🛍️ 전체 상품 관리</h1>
              <p className="text-gray-600 mt-1">상품 마스터 데이터를 관리합니다</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/admin/products/catalog/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                상세 상품 등록
              </button>
            </div>
          </div>

          {/* 빠른 이동 */}
          <div className="flex gap-2 pb-4">
            <button
              onClick={() => router.push('/admin/products')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <PlayIcon className="w-4 h-4" />
              실시간 방송 컨트롤
            </button>
          </div>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* 검색 */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="상품명, 설명, SKU로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* 필터 및 뷰 옵션 */}
            <div className="flex items-center space-x-3">
              {/* 카테고리 필터 */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">모든 카테고리</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              {/* 상태 필터 */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">모든 상태</option>
                <option value="active">활성</option>
                <option value="draft">임시저장</option>
                <option value="archived">보관</option>
              </select>

              {/* 뷰 모드 */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  <Squares2X2Icon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  <ListBulletIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 통계 */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div>
              총 {products.length}개 상품 |
              라이브 중 {products.filter(p => p.is_live_active).length}개 |
              활성 {products.filter(p => p.status === 'active').length}개
            </div>
          </div>
        </div>

        {/* 상품 목록 */}
        {viewMode === 'grid' ? (
          // 그리드 뷰 - 컴팩트한 카드 디자인
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {products.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => router.push(`/admin/products/catalog/${product.id}`)}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all cursor-pointer overflow-hidden group"
              >
                {/* 상품 이미지 */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  {product.thumbnail_url ? (
                    <Image
                      src={product.thumbnail_url}
                      alt={product.title}
                      fill
                      sizes="200px"
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-400 text-xs">NO IMAGE</span>
                    </div>
                  )}

                  {/* 라이브 배지 */}
                  {product.is_live_active && (
                    <div className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></div>
                      LIVE
                    </div>
                  )}

                  {/* 재고 배지 */}
                  {product.variants && product.variants.length > 0 ? (
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      {product.variants.length}옵션
                    </div>
                  ) : (
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      {product.inventory}개
                    </div>
                  )}
                </div>

                {/* 상품 정보 */}
                <div className="p-2">
                  <h3 className="text-xs font-medium text-gray-900 mb-1 line-clamp-2 min-h-[2rem]">
                    {product.title}
                  </h3>

                  {/* 가격 */}
                  <div className="text-sm font-bold text-gray-900 mb-1">
                    ₩{(product.price || 0).toLocaleString()}
                  </div>

                  {/* 카테고리 & 상태 */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span className="truncate">{product.category || '미분류'}</span>
                    <span className={`px-1 py-0.5 rounded text-xs ${getStatusColor(product.status)}`}>
                      {getStatusText(product.status)}
                    </span>
                  </div>

                  {/* 액션 버튼 (그리드 뷰) */}
                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/admin/products/catalog/${product.id}`)
                      }}
                      className="flex-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 border border-blue-300 rounded transition-colors"
                    >
                      상세
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/admin/products/catalog/${product.id}/edit`)
                      }}
                      className="flex-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 border border-gray-300 rounded transition-colors"
                    >
                      편집
                    </button>
                    <button
                      onClick={(e) => handleDeleteProduct(product, e)}
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 border border-red-300 rounded transition-colors"
                      title="삭제"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          // 리스트 뷰
          <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상품
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    가격
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    재고
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    라이브
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12 overflow-hidden rounded-lg">
                          {product.thumbnail_url ? (
                            <Image
                              src={product.thumbnail_url}
                              alt={product.title}
                              width={48}
                              height={48}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">이미지</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 line-clamp-1">
                            {product.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            SKU: {product.sku || '미설정'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.categories?.name || '미분류'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ₩{product.price?.toLocaleString()}
                      </div>
                      {product.compare_price && product.compare_price > product.price && (
                        <div className="text-sm text-gray-500 line-through">
                          ₩{product.compare_price.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.inventory}개
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                        {getStatusText(product.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {product.is_live_active ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></div>
                          LIVE
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/admin/products/catalog/${product.id}`)
                          }}
                          className="px-2.5 py-1 text-xs text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-600 rounded transition-colors whitespace-nowrap"
                        >
                          상세
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/admin/products/catalog/${product.id}/edit`)
                          }}
                          className="px-2.5 py-1 text-xs text-gray-600 hover:text-white hover:bg-gray-600 border border-gray-600 rounded transition-colors whitespace-nowrap"
                        >
                          편집
                        </button>
                        <button
                          onClick={(e) => handleDeleteProduct(product, e)}
                          className="px-2.5 py-1 text-xs text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded transition-colors whitespace-nowrap"
                          title="상품 삭제 (Soft Delete)"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 상품이 없을 때 */}
        {products.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">상품이 없습니다</h3>
            <p className="text-gray-500 mb-6">첫 번째 상품을 추가해보세요</p>
            <button
              onClick={() => router.push('/admin/products/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              상품 추가하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}