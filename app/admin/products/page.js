'use client'

import { useState, useEffect, useRef } from 'react'
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
  ArrowUpIcon,
  ArrowDownIcon,
  PlayIcon,
  PauseIcon,
  ChartBarIcon,
  QueueListIcon,
  RadioIcon
} from '@heroicons/react/24/outline'
import { getLiveProducts, addToLive, removeFromLive, updateLivePriority } from '@/lib/supabaseApi'
import toast from 'react-hot-toast'

export default function AdminProductsPage() {
  const router = useRouter()
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()
  const [liveProducts, setLiveProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [liveStats, setLiveStats] = useState({
    totalViews: 0,
    totalOrders: 0,
    totalRevenue: 0
  })
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
      loadLiveProducts()
      loadAllProducts()
    }
  }, [authLoading, isAdminAuthenticated, router])

  const loadLiveProducts = async () => {
    try {
      const liveProductsData = await getLiveProducts()
      console.log('📺 라이브 상품 로딩 완료:', liveProductsData)
      setLiveProducts(liveProductsData)
    } catch (error) {
      console.error('라이브 상품 로딩 오류:', error)
      toast.error('라이브 상품을 불러오는데 실패했습니다.')
    }
  }

  const loadAllProducts = async () => {
    try {
      setLoading(true)
      // 라이브 중이 아닌 상품들만 로드 (라이브 추가용)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .neq('is_live_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('🛍️ 전체 상품 데이터 로딩 완료:', data.length)
      setAllProducts(data || [])
    } catch (error) {
      console.error('상품 로딩 오류:', error)
      toast.error('상품을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const filteredAddProducts = allProducts.filter(product => {
    return product && product.title && product.title.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const updateProductStatus = async (productId, newStatus) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', productId)

      if (error) throw error

      await loadLiveProducts()
      await loadAllProducts()
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
        .update({
          inventory: newQuantity
        })
        .eq('id', productId)

      if (error) throw error

      await loadLiveProducts()
      toast.success('재고가 업데이트되었습니다')
    } catch (error) {
      console.error('재고 업데이트 오류:', error)
      toast.error('재고 업데이트에 실패했습니다')
    }
  }

  const handleAddToLive = async (productId, priority = 0) => {
    try {
      await addToLive(productId, priority)
      await loadLiveProducts()
      await loadAllProducts()
      toast.success('라이브 방송에 상품이 추가되었습니다')
    } catch (error) {
      console.error('라이브 추가 오류:', error)
      toast.error('라이브 추가에 실패했습니다')
    }
  }

  const handleRemoveFromLive = async (productId) => {
    try {
      await removeFromLive(productId)
      await loadLiveProducts()
      await loadAllProducts()
      toast.success('라이브 방송에서 상품이 제거되었습니다')
    } catch (error) {
      console.error('라이브 제거 오류:', error)
      toast.error('라이브 제거에 실패했습니다')
    }
  }

  const handleUpdatePriority = async (productId, direction) => {
    try {
      const currentProduct = liveProducts.find(p => p.id === productId)
      if (!currentProduct) return

      const newPriority = direction === 'up' ? currentProduct.live_priority - 1 : currentProduct.live_priority + 1
      await updateLivePriority(productId, newPriority)
      await loadLiveProducts()
      toast.success('순서가 변경되었습니다')
    } catch (error) {
      console.error('순서 변경 오류:', error)
      toast.error('순서 변경에 실패했습니다')
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
      freeShipping: product.freeShipping || false,
      options: []
    })
    setImagePreview(product.thumbnail_url || '')
    setShowEditModal(true)
    setCurrentStep('info') // 수정할 때는 정보 수정부터 시작
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

    // 필수 필드 검증
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
      // 업데이트할 데이터 준비
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

      await loadLiveProducts()
      await loadAllProducts()
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

        await loadLiveProducts()
        await loadAllProducts()
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

  // 관리자 권한 체크는 이미 useAdminAuth로 처리됨

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button
              className="flex-1 px-6 py-4 text-center font-medium transition-colors border-b-2 border-red-500 text-red-600 bg-red-50"
            >
              <div className="flex items-center justify-center gap-2">
                <RadioIcon className="w-5 h-5" />
                실시간 방송 컨트롤
              </div>
            </button>
            <button
              onClick={() => router.push('/admin/products/catalog')}
              className="flex-1 px-6 py-4 text-center font-medium transition-colors border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            >
              <div className="flex items-center justify-center gap-2">
                <QueueListIcon className="w-5 h-5" />
                전체 상품 관리
              </div>
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4 p-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📺 실시간 방송 컨트롤</h1>
                <p className="text-gray-600">라이브 상품 {liveProducts.length}개 • 대기 상품 {allProducts.length}개</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{liveStats.totalOrders}</div>
              <div className="text-xs text-gray-500">주문</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">₩{liveStats.totalRevenue.toLocaleString()}</div>
              <div className="text-xs text-gray-500">매출</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 pb-6">
          <div></div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              loadLiveProducts()
              loadAllProducts()
              toast.success('라이브 상품 목록을 새로고침했습니다')
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            새로고침
          </button>
          <button
            onClick={() => setShowAddProductModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            라이브 상품 추가
          </button>
        </div>
        </div>
      </div>

        {/* Live Products Control */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                라이브 중인 상품
              </h2>
              <div className="text-sm text-gray-500">
                순서대로 방송됩니다
              </div>
            </div>

            {liveProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <PlayIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>라이브 중인 상품이 없습니다</p>
                <p className="text-sm">아래에서 상품을 추가해보세요</p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-lg"
                  >
                    {/* Priority Number */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleUpdatePriority(product.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ArrowUpIcon className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleUpdatePriority(product.id, 'down')}
                          disabled={index === liveProducts.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ArrowDownIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Product Image */}
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {product.thumbnail_url ? (
                        <Image
                          src={product.thumbnail_url}
                          alt={product.title}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <PhotoIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{product.title}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-lg font-bold text-red-600">₩{product.price.toLocaleString()}</span>
                        <span className="text-sm text-gray-500">재고 {product.inventory}개</span>
                      </div>
                    </div>

                    {/* Inventory Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateInventory(product.id, (product.inventory ?? 0) - 1)}
                        className="w-8 h-8 bg-gray-200 rounded text-gray-600 hover:bg-gray-300 text-sm font-bold"
                      >
                        -
                      </button>
                      <span className="text-lg font-bold w-12 text-center">
                        {product.inventory ?? 0}
                      </span>
                      <button
                        onClick={() => updateInventory(product.id, (product.inventory ?? 0) + 1)}
                        className="w-8 h-8 bg-gray-200 rounded text-gray-600 hover:bg-gray-300 text-sm font-bold"
                      >
                        +
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(product)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveFromLive(product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>


        {/* Add Product Modal */}
        <AnimatePresence>
          {showAddProductModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddProductModal(false)}
                className="absolute inset-0 bg-black/50"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-6 max-h-[90vh] overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" />
                    라이브에 상품 추가
                  </h2>
                  <button
                    onClick={() => setShowAddProductModal(false)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  {/* Search */}
                  <div className="relative mb-4">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="추가할 상품을 검색하세요..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  {/* Products List */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredAddProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        {/* Product Image */}
                        <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          {product.thumbnail_url ? (
                            <Image
                              src={product.thumbnail_url}
                              alt={product.title}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <PhotoIcon className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{product.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold text-gray-700">₩{product.price.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">재고 {product.inventory}개</span>
                          </div>
                        </div>

                        {/* Add Button */}
                        <button
                          onClick={() => {
                            handleAddToLive(product.id, liveProducts.length)
                            setShowAddProductModal(false)
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          추가
                        </button>
                      </div>
                    ))}
                  </div>

                  {filteredAddProducts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>추가할 수 있는 상품이 없습니다</p>
                      <p className="text-sm mt-1">전체 상품 관리에서 상품을 먼저 등록해주세요</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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