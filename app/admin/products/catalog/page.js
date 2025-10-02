'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useAdminAuth } from '@/hooks/useAdminAuth'
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
import { getAllProducts, getCategories, addToLive, removeFromLive } from '@/lib/supabaseApi'
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

          {/* 탭 네비게이션 */}
          <div className="flex gap-2 pb-4">
            <button
              onClick={() => router.push('/admin/products')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <PlayIcon className="w-4 h-4" />
              실시간 방송 컨트롤
            </button>
            <button
              onClick={() => router.push('/admin/live-products')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Squares2X2Icon className="w-4 h-4" />
              라이브 상품 관리
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
            >
              <ListBulletIcon className="w-4 h-4" />
              전체 상품 관리
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
          // 그리드 뷰
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                {/* 상품 이미지 */}
                <div className="relative aspect-square">
                  {product.thumbnail_url ? (
                    <Image
                      src={product.thumbnail_url}
                      alt={product.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded-t-lg flex items-center justify-center">
                      <span className="text-gray-400">이미지 없음</span>
                    </div>
                  )}

                  {/* 라이브 배지 */}
                  {product.is_live_active && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                      <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                      LIVE
                    </div>
                  )}

                  {/* 상태 배지 */}
                  <div className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full ${getStatusColor(product.status)}`}>
                    {getStatusText(product.status)}
                  </div>
                </div>

                {/* 상품 정보 */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {product.title}
                  </h3>

                  {/* 가격 */}
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-lg font-bold text-gray-900">
                      ₩{product.price?.toLocaleString()}
                    </span>
                    {product.compare_price && product.compare_price > product.price && (
                      <span className="text-sm text-gray-500 line-through">
                        ₩{product.compare_price.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* 재고 및 카테고리 */}
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <span>재고: {product.inventory}개</span>
                    <span>{product.categories?.name || '미분류'}</span>
                  </div>

                  {/* Variant 정보 */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-xs font-medium text-blue-800 mb-1">
                        Variant: {product.variants.length}개
                      </div>
                      <div className="space-y-1">
                        {product.variants.slice(0, 3).map((variant, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-blue-700">
                            <span className="truncate">
                              {variant.options?.map(opt => opt.optionValue).join(' / ') || variant.sku}
                            </span>
                            <span className="font-medium">{variant.inventory}개</span>
                          </div>
                        ))}
                        {product.variants.length > 3 && (
                          <div className="text-xs text-blue-600 text-center">
                            +{product.variants.length - 3}개 더보기
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 액션 버튼들 */}
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/admin/products/catalog/${product.id}`)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="상세보기 / Variant 관리"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleLive(product)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        product.is_live_active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {product.is_live_active ? (
                        <>
                          <StopIcon className="w-3 h-3 inline mr-1" />
                          라이브 중단
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-3 h-3 inline mr-1" />
                          라이브 추가
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          // 리스트 뷰
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                        <div className="flex-shrink-0 h-12 w-12">
                          {product.thumbnail_url ? (
                            <Image
                              src={product.thumbnail_url}
                              alt={product.title}
                              width={48}
                              height={48}
                              className="rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                        {getStatusText(product.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.is_live_active ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></div>
                          라이브 중
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                          대기
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => router.push(`/admin/products/${product.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        상세
                      </button>
                      <button
                        onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                        className="text-green-600 hover:text-green-900"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleToggleLive(product)}
                        className={`${
                          product.is_live_active
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-purple-600 hover:text-purple-900'
                        }`}
                      >
                        {product.is_live_active ? '라이브 중단' : '라이브 추가'}
                      </button>
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