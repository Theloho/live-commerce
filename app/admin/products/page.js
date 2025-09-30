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
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
  QueueListIcon
} from '@heroicons/react/24/outline'
import { RadioIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'

export default function AdminProductsPage() {
  const router = useRouter()
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [productData, setProductData] = useState({
    title: '',
    description: '',
    price: '',
    inventory: '',
    compare_price: '',
    seller: '',
    badge: '',
    freeShipping: false
  })

  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
      return
    }

    if (!authLoading && isAdminAuthenticated) {
      loadProducts()
    }
  }, [authLoading, isAdminAuthenticated, router])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_options (
            id,
            name,
            values
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const productsWithOptions = data.map(product => ({
        ...product,
        options: product.product_options || []
      }))

      console.log('📦 상품 데이터 로딩 완료:', productsWithOptions.length)
      setProducts(productsWithOptions)
    } catch (error) {
      console.error('상품 로딩 오류:', error)
      toast.error('상품을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    return product && product.title && product.title.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const updateProductStatus = async (productId, newStatus) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', productId)

      if (error) throw error

      loadProducts()
      toast.success('상품 상태가 변경되었습니다')
    } catch (error) {
      console.error('상품 상태 변경 오류:', error)
      toast.error('상품 상태 변경에 실패했습니다')
    }
  }

  const updateInventory = async (productId, newQuantity) => {
    if (newQuantity < 0) return

    try {
      const { error } = await supabase
        .from('products')
        .update({ inventory: newQuantity })
        .eq('id', productId)

      if (error) throw error

      loadProducts()
      toast.success('재고가 업데이트되었습니다')
    } catch (error) {
      console.error('재고 업데이트 오류:', error)
      toast.error('재고 업데이트에 실패했습니다')
    }
  }

  const updateLiveStatus = async (productId, isLive) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          is_live_active: isLive,
          live_start_time: isLive ? new Date().toISOString() : null,
          live_end_time: isLive ? null : new Date().toISOString()
        })
        .eq('id', productId)

      if (error) throw error

      loadProducts()
      toast.success(`라이브 ${isLive ? '활성화' : '비활성화'}되었습니다`)
    } catch (error) {
      console.error('라이브 상태 변경 오류:', error)
      toast.error('라이브 상태 변경에 실패했습니다')
    }
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setProductData({
      title: product.title,
      description: product.description || '',
      price: product.price,
      inventory: product.inventory,
      compare_price: product.compare_price || '',
      seller: product.seller || '',
      badge: product.badge || '',
      freeShipping: product.freeShipping || false
    })
    setImagePreview(product.thumbnail_url || '')
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingProduct(null)
    setProductData({
      title: '',
      description: '',
      price: '',
      inventory: '',
      compare_price: '',
      seller: '',
      badge: '',
      freeShipping: false
    })
    setImagePreview('')
  }

  const handleUpdateProduct = async () => {
    if (!editingProduct) return

    if (!productData.title.trim()) {
      toast.error('상품명을 입력해주세요')
      return
    }

    if (!productData.price || productData.price <= 0) {
      toast.error('올바른 가격을 입력해주세요')
      return
    }

    if (productData.inventory < 0) {
      toast.error('재고는 0개 이상이어야 합니다')
      return
    }

    try {
      const updatedData = {
        title: productData.title.trim(),
        description: productData.description.trim() || '',
        price: parseInt(productData.price),
        inventory: parseInt(productData.inventory) || 0,
        compare_price: productData.compare_price ? parseInt(productData.compare_price) : null,
        seller: productData.seller || editingProduct.seller,
        badge: productData.badge || null,
        free_shipping: productData.freeShipping,
        thumbnail_url: imagePreview || editingProduct.thumbnail_url
      }

      const { error } = await supabase
        .from('products')
        .update(updatedData)
        .eq('id', editingProduct.id)

      if (error) throw error

      loadProducts()
      toast.success('상품이 수정되었습니다')
      closeEditModal()
    } catch (error) {
      console.error('상품 수정 오류:', error)
      toast.error('상품 수정에 실패했습니다')
    }
  }

  const deleteProduct = async (productId) => {
    if (window.confirm('이 상품을 삭제하시겠습니까?')) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId)

        if (error) throw error

        loadProducts()
        toast.success('상품이 삭제되었습니다')
      } catch (error) {
        console.error('상품 삭제 오류:', error)
        toast.error('상품 삭제에 실패했습니다')
      }
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { label: '판매중', color: 'bg-green-100 text-green-800' },
      inactive: { label: '판매중지', color: 'bg-red-100 text-red-800' },
      draft: { label: '임시저장', color: 'bg-gray-100 text-gray-800' }
    }
    const statusInfo = statusMap[status] || statusMap.active
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  const getInventoryStatus = (quantity) => {
    const qty = quantity ?? 0
    if (qty === 0) {
      return <span className="text-red-600 font-medium">품절</span>
    } else if (qty <= 5) {
      return <span className="text-yellow-600 font-medium">품절임박</span>
    } else {
      return <span className="text-green-600 font-medium">충분</span>
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
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4 p-6 pb-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
                <p className="text-gray-600">총 {products.length}개의 상품</p>
              </div>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex gap-2 px-6 pb-4">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium"
            >
              <RadioIcon className="w-4 h-4" />
              실시간 방송 컨트롤
            </button>
            <button
              onClick={() => router.push('/admin/products/catalog')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <QueueListIcon className="w-4 h-4" />
              전체 상품 관리
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 pb-6">
            <div></div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (window.confirm('모든 상품을 완전히 삭제하시겠습니까?')) {
                    try {
                      await supabase
                        .from('product_options')
                        .delete()
                        .neq('id', '00000000-0000-0000-0000-000000000000')

                      const { error } = await supabase
                        .from('products')
                        .delete()
                        .neq('id', '00000000-0000-0000-0000-000000000000')

                      if (error) throw error

                      loadProducts()
                      toast.success('모든 상품이 완전히 삭제되었습니다')
                    } catch (error) {
                      console.error('상품 삭제 오류:', error)
                      toast.error('상품 삭제에 실패했습니다')
                    }
                  }
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                전체 삭제
              </button>
              <button
                onClick={() => {
                  loadProducts()
                  toast.success('상품 목록을 새로고침했습니다')
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                새로고침
              </button>
              <button
                onClick={() => router.push('/admin/products/new')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                빠른 상품 등록
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="relative max-w-md p-6">
            <MagnifyingGlassIcon className="absolute left-9 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="상품명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-2 gap-6">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Product Image */}
                <div className="relative aspect-square">
                  {product.thumbnail_url ? (
                    <Image
                      src={product.thumbnail_url}
                      alt={product.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <PhotoIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    {getStatusBadge(product.status)}
                  </div>

                  {/* Live Badge */}
                  {product.is_live_active && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-600 text-white flex items-center gap-1 animate-pulse">
                        <span className="w-2 h-2 bg-white rounded-full"></span>
                        LIVE
                      </span>
                    </div>
                  )}

                  {/* Featured Badge */}
                  {product.is_featured && !product.is_live_active && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        추천
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                    {product.title}
                  </h3>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-lg font-bold text-gray-900">
                      ₩{product.price.toLocaleString()}
                    </span>
                    {product.compare_price && (
                      <span className="text-sm text-gray-400 line-through">
                        ₩{product.compare_price.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Inventory */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">재고</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateInventory(product.id, (product.inventory ?? 0) - 1)}
                        className="w-6 h-6 bg-gray-200 rounded text-gray-600 hover:bg-gray-300 text-xs"
                      >
                        -
                      </button>
                      <span className="text-sm font-medium w-8 text-center">
                        {product.inventory ?? 0}
                      </span>
                      <button
                        onClick={() => updateInventory(product.id, (product.inventory ?? 0) + 1)}
                        className="w-6 h-6 bg-gray-200 rounded text-gray-600 hover:bg-gray-300 text-xs"
                      >
                        +
                      </button>
                      <span className="text-xs ml-2">
                        {getInventoryStatus(product.inventory)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    {/* 라이브 토글 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateLiveStatus(product.id, !product.is_live_active)}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                          product.is_live_active
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <RadioIcon className="w-4 h-4" />
                        {product.is_live_active ? 'LIVE 중' : 'LIVE 시작'}
                      </button>
                    </div>

                    {/* 판매 상태 토글 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateProductStatus(
                          product.id,
                          product.status === 'active' ? 'inactive' : 'active'
                        )}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          product.status === 'active'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {product.status === 'active' ? '판매중지' : '판매시작'}
                      </button>

                      <button
                        onClick={() => openEditModal(product)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="col-span-2 p-12 text-center">
              <p className="text-gray-500">조건에 맞는 상품이 없습니다.</p>
            </div>
          )}
        </div>

        {/* Edit Product Modal */}
        <AnimatePresence>
          {showEditModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeEditModal}
                className="absolute inset-0 bg-black/50"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-6 max-h-[90vh] overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">상품 수정</h2>
                  <button
                    onClick={closeEditModal}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-8 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-4">
                    {/* 썸네일 이미지 */}
                    {imagePreview && (
                      <div className="relative">
                        <div className="aspect-square w-full bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={imagePreview}
                            alt="상품 미리보기"
                            width={400}
                            height={400}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => setImagePreview('')}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* 상품명 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        상품명 *
                      </label>
                      <input
                        type="text"
                        value={productData.title}
                        onChange={(e) => setProductData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="상품명을 입력해주세요"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    {/* 상품 설명 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        상품 설명 (선택사항)
                      </label>
                      <textarea
                        value={productData.description}
                        onChange={(e) => setProductData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="상품에 대한 간단한 설명을 입력해주세요"
                        rows={3}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                      />
                    </div>

                    {/* 가격 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        판매가격 *
                      </label>
                      <input
                        type="number"
                        value={productData.price}
                        onChange={(e) => setProductData(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="가격을 입력해주세요"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    {/* 정가 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        정가 (할인 표시용)
                      </label>
                      <input
                        type="number"
                        value={productData.compare_price}
                        onChange={(e) => setProductData(prev => ({ ...prev, compare_price: e.target.value }))}
                        placeholder="정가를 입력해주세요 (선택사항)"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    {/* 재고 수량 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        재고 수량
                      </label>
                      <input
                        type="number"
                        value={productData.inventory}
                        onChange={(e) => setProductData(prev => ({ ...prev, inventory: e.target.value }))}
                        placeholder="재고 수량"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    {/* 판매자 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        판매자
                      </label>
                      <input
                        type="text"
                        value={productData.seller}
                        onChange={(e) => setProductData(prev => ({ ...prev, seller: e.target.value }))}
                        placeholder="판매자명"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    {/* 배지 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        상품 배지
                      </label>
                      <select
                        value={productData.badge}
                        onChange={(e) => setProductData(prev => ({ ...prev, badge: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="">배지 없음</option>
                        <option value="BEST">BEST</option>
                        <option value="NEW">NEW</option>
                        <option value="HOT">HOT</option>
                        <option value="SALE">SALE</option>
                      </select>
                    </div>

                    {/* 무료배송 */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="freeShipping"
                        checked={productData.freeShipping}
                        onChange={(e) => setProductData(prev => ({ ...prev, freeShipping: e.target.checked }))}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor="freeShipping" className="ml-2 text-sm text-gray-700">
                        무료배송
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-6">
                    <button
                      onClick={closeEditModal}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleUpdateProduct}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      수정 완료
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
