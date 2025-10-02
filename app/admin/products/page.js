'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline'
import { RadioIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'

export default function AdminProductsPage() {
  const router = useRouter()
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  // 라이브 상품 목록
  const [liveProducts, setLiveProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])

  // 검색 모달
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchSelectedIds, setSearchSelectedIds] = useState([])

  // 검색 필터
  const [searchText, setSearchText] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])

  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
      return
    }

    if (!authLoading && isAdminAuthenticated) {
      loadLiveProducts()
      loadSuppliers()
      loadCategories()
    }
  }, [authLoading, isAdminAuthenticated, router])

  // 라이브 상품 목록 로드
  const loadLiveProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          suppliers (
            id,
            name,
            code
          )
        `)
        .eq('is_live', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('📋 라이브 상품 로드:', data?.length || 0)
      setLiveProducts(data || [])
    } catch (error) {
      console.error('라이브 상품 로딩 오류:', error)
      toast.error('라이브 상품을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 업체 목록 로드
  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('업체 목록 로딩 오류:', error)
    }
  }

  // 카테고리 목록 로드
  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null)
        .eq('status', 'active')

      if (error) throw error

      // 중복 제거
      const uniqueCategories = [...new Set(data.map(p => p.category).filter(Boolean))]
      setCategories(uniqueCategories.sort())
    } catch (error) {
      console.error('카테고리 로딩 오류:', error)
    }
  }

  // 상품 검색
  const handleSearch = async () => {
    try {
      setSearchLoading(true)

      let query = supabase
        .from('products')
        .select(`
          *,
          suppliers (
            id,
            name,
            code
          )
        `)
        .eq('is_live', false)  // 아직 라이브에 없는 것만
        .eq('status', 'active')

      // 업체 필터
      if (selectedSupplier) {
        query = query.eq('supplier_id', selectedSupplier)
      }

      // 카테고리 필터
      if (selectedCategory) {
        query = query.eq('category', selectedCategory)
      }

      // 검색어 필터
      if (searchText.trim()) {
        const keywords = searchText.split(/[,\s]+/).filter(k => k.trim())

        // OR 조건으로 검색
        const orConditions = keywords.map(keyword => {
          const k = keyword.trim()
          return `title.ilike.%${k}%,product_number.ilike.%${k}%,category.ilike.%${k}%,sub_category.ilike.%${k}%,model_number.ilike.%${k}%,sku.ilike.%${k}%`
        }).join(',')

        query = query.or(orConditions)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setSearchResults(data || [])
      setSearchSelectedIds([])
    } catch (error) {
      console.error('검색 오류:', error)
      toast.error('상품 검색에 실패했습니다.')
    } finally {
      setSearchLoading(false)
    }
  }

  // 선택한 상품을 라이브에 추가
  const handleAddToLive = async () => {
    if (searchSelectedIds.length === 0) {
      toast.error('추가할 상품을 선택해주세요')
      return
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({
          is_live: true,
          is_live_active: false  // 기본값은 비활성
        })
        .in('id', searchSelectedIds)

      if (error) throw error

      toast.success(`${searchSelectedIds.length}개 상품이 라이브에 추가되었습니다`)
      setShowSearchModal(false)
      setSearchText('')
      setSelectedSupplier('')
      setSelectedCategory('')
      setSearchResults([])
      setSearchSelectedIds([])
      loadLiveProducts()
    } catch (error) {
      console.error('라이브 추가 오류:', error)
      toast.error('라이브 추가에 실패했습니다')
    }
  }

  // 라이브에서 제거
  const handleRemoveFromLive = async () => {
    if (selectedIds.length === 0) {
      toast.error('제거할 상품을 선택해주세요')
      return
    }

    if (!window.confirm(`${selectedIds.length}개 상품을 라이브에서 제거하시겠습니까?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({
          is_live: false,
          is_live_active: false
        })
        .in('id', selectedIds)

      if (error) throw error

      toast.success(`${selectedIds.length}개 상품이 라이브에서 제거되었습니다`)
      setSelectedIds([])
      loadLiveProducts()
    } catch (error) {
      console.error('라이브 제거 오류:', error)
      toast.error('라이브 제거에 실패했습니다')
    }
  }

  // 개별 상품 노출 토글
  const toggleLiveActive = async (productId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          is_live_active: !currentStatus,
          live_start_time: !currentStatus ? new Date().toISOString() : null,
          live_end_time: !currentStatus ? null : new Date().toISOString()
        })
        .eq('id', productId)

      if (error) throw error

      toast.success(!currentStatus ? '사용자 페이지에 노출됩니다' : '사용자 페이지에서 숨김 처리되었습니다')
      loadLiveProducts()
    } catch (error) {
      console.error('노출 토글 오류:', error)
      toast.error('노출 상태 변경에 실패했습니다')
    }
  }

  // 전체 선택/해제
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(liveProducts.map(p => p.id))
    } else {
      setSelectedIds([])
    }
  }

  // 검색 모달에서 전체 선택/해제
  const handleSearchSelectAll = (checked) => {
    if (checked) {
      setSearchSelectedIds(searchResults.map(p => p.id))
    } else {
      setSearchSelectedIds([])
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">로그인이 필요합니다. 잠시 후 로그인 페이지로 이동합니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <RadioIcon className="w-6 h-6 text-red-600" />
                  실시간 방송 컨트롤
                </h1>
                <p className="text-gray-600">라이브 상품을 관리하고 사용자 페이지 노출을 제어합니다 (총 {liveProducts.length}개)</p>
              </div>
              <button
                onClick={() => router.push('/admin/products/catalog')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Squares2X2Icon className="w-4 h-4" />
                전체 상품 관리
              </button>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSearchModal(true)
                  handleSearch()
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
                검색으로 추가
              </button>
              <button
                onClick={handleRemoveFromLive}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrashIcon className="w-4 h-4" />
                선택 항목 제거 ({selectedIds.length})
              </button>
              <button
                onClick={() => router.push('/admin/products/new')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                빠른 등록
              </button>
            </div>
          </div>
        </div>

        {/* 라이브 상품 목록 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {liveProducts.length === 0 ? (
            <div className="text-center py-12">
              <Squares2X2Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">라이브에 등록된 상품이 없습니다</p>
              <button
                onClick={() => {
                  setShowSearchModal(true)
                  handleSearch()
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                상품 검색하여 추가하기
              </button>
            </div>
          ) : (
            <>
              {/* 전체 선택 */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                <input
                  type="checkbox"
                  checked={selectedIds.length === liveProducts.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">
                  전체 선택 ({selectedIds.length}/{liveProducts.length})
                </span>
              </div>

              {/* 상품 그리드 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {liveProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* 이미지 */}
                    <div className="relative aspect-square">
                      {product.thumbnail_url ? (
                        <Image
                          src={product.thumbnail_url}
                          alt={product.title}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <PhotoIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}

                      {/* 체크박스 */}
                      <div className="absolute top-2 left-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, product.id])
                            } else {
                              setSelectedIds(selectedIds.filter(id => id !== product.id))
                            }
                          }}
                          className="w-5 h-5 text-red-600 border-white rounded focus:ring-red-500"
                        />
                      </div>

                      {/* 노출 상태 배지 */}
                      <div className="absolute top-2 right-2">
                        {product.is_live_active ? (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-600 text-white flex items-center gap-1 animate-pulse">
                            <span className="w-2 h-2 bg-white rounded-full"></span>
                            노출중
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-500 text-white">
                            숨김
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 상품 정보 */}
                    <div className="p-3">
                      <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2 min-h-[2.5rem]">
                        {product.title}
                      </h3>

                      {/* 업체 정보 */}
                      {product.suppliers && (
                        <p className="text-xs text-gray-500 mb-2">
                          {product.suppliers.name}
                        </p>
                      )}

                      {/* 가격 */}
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-sm font-bold text-gray-900">
                          ₩{product.price.toLocaleString()}
                        </span>
                      </div>

                      {/* 노출 토글 버튼 */}
                      <button
                        onClick={() => toggleLiveActive(product.id, product.is_live_active)}
                        className={`w-full px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
                          product.is_live_active
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {product.is_live_active ? (
                          <>
                            <EyeIcon className="w-4 h-4" />
                            노출중
                          </>
                        ) : (
                          <>
                            <EyeSlashIcon className="w-4 h-4" />
                            숨김
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 검색 모달 */}
      <AnimatePresence>
        {showSearchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSearchModal(false)}
              className="absolute inset-0 bg-black/50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">상품 검색 및 추가</h2>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* 검색 필터 */}
              <div className="p-4 bg-gray-50 border-b space-y-3">
                {/* 검색어 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    검색어
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="상품명, 상품번호, 카테고리 등 (쉼표로 구분)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searchLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      검색
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 여러 키워드는 쉼표나 스페이스로 구분하세요
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* 업체 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      업체 선택
                    </label>
                    <select
                      value={selectedSupplier}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">전체 업체</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name} {supplier.code && `(${supplier.code})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 카테고리 필터 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      카테고리
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">전체 카테고리</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 검색 결과 */}
              <div className="p-4 max-h-[50vh] overflow-y-auto">
                {searchLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-gray-600">검색 중...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">검색 결과가 없습니다</p>
                  </div>
                ) : (
                  <>
                    {/* 전체 선택 */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={searchSelectedIds.length === searchResults.length}
                          onChange={(e) => handleSearchSelectAll(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          전체 선택 ({searchSelectedIds.length}/{searchResults.length})
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">검색 결과: {searchResults.length}개</p>
                    </div>

                    {/* 상품 그리드 */}
                    <div className="grid grid-cols-3 gap-3">
                      {searchResults.map((product) => (
                        <div
                          key={product.id}
                          className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            if (searchSelectedIds.includes(product.id)) {
                              setSearchSelectedIds(searchSelectedIds.filter(id => id !== product.id))
                            } else {
                              setSearchSelectedIds([...searchSelectedIds, product.id])
                            }
                          }}
                        >
                          {/* 이미지 */}
                          <div className="relative aspect-square">
                            {product.thumbnail_url ? (
                              <Image
                                src={product.thumbnail_url}
                                alt={product.title}
                                fill
                                sizes="200px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <PhotoIcon className="w-8 h-8 text-gray-400" />
                              </div>
                            )}

                            {/* 체크박스 */}
                            <div className="absolute top-2 left-2">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                searchSelectedIds.includes(product.id)
                                  ? 'bg-blue-600 border-blue-600'
                                  : 'bg-white border-gray-300'
                              }`}>
                                {searchSelectedIds.includes(product.id) && (
                                  <CheckIcon className="w-4 h-4 text-white" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 상품 정보 */}
                          <div className="p-2">
                            <h3 className="text-xs font-medium text-gray-900 line-clamp-2 mb-1">
                              {product.title}
                            </h3>
                            {product.suppliers && (
                              <p className="text-xs text-gray-500 mb-1">
                                {product.suppliers.name}
                              </p>
                            )}
                            <p className="text-xs font-bold text-gray-900">
                              ₩{product.price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                <p className="text-sm text-gray-600">
                  {searchSelectedIds.length}개 선택됨
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSearchModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddToLive}
                    disabled={searchSelectedIds.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    선택 항목 추가 ({searchSelectedIds.length})
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
