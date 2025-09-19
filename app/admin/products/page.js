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
  CameraIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
// Mock functions removed - transitioning to production Supabase

export default function AdminProductsPage() {
  const router = useRouter()
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [currentStep, setCurrentStep] = useState('photo') // 'photo', 'info', 'options'
  const [productData, setProductData] = useState({
    title: '',
    description: '',
    price: '',
    inventory_quantity: '',
    options: []
  })
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

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
      // Supabase에서 상품 데이터 로드 (관리자는 비활성 상품도 포함)
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

      // 옵션 데이터 형태 변환
      const productsWithOptions = data.map(product => ({
        ...product,
        options: product.product_options || []
      }))

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
        .update({ inventory_quantity: newQuantity })
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
        .update({ is_live: isLive })
        .eq('id', productId)

      if (error) throw error

      loadProducts()
      toast.success(`라이브 라벨이 ${isLive ? '추가' : '제거'}되었습니다`)
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
      inventory_quantity: product.inventory_quantity,
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
      inventory_quantity: '',
      options: []
    })
    setImagePreview('')
    setSelectedImage(null)
    setCurrentStep('photo')
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

    if (productData.inventory_quantity < 0) {
      toast.error('재고는 0개 이상이어야 합니다')
      return
    }

    try {
      // 업데이트할 데이터 준비
      const updatedData = {
        title: productData.title.trim(),
        description: productData.description.trim() || '',
        price: parseInt(productData.price),
        inventory_quantity: parseInt(productData.inventory_quantity) || 0,
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

  const handleAddProduct = () => {
    setShowAddModal(true)
    setSelectedImage(null)
    setImagePreview('')
    setCurrentStep('photo')
    setProductData({
      title: '',
      price: '',
      inventory_quantity: '',
      options: []
    })
  }

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCameraCapture = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const resetImageSelection = () => {
    setSelectedImage(null)
    setImagePreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const closeAddModal = () => {
    setShowAddModal(false)
    resetImageSelection()
    setCurrentStep('photo')
    setProductData({
      title: '',
      description: '',
      price: '',
      inventory_quantity: '',
      options: []
    })
  }

  const goToNextStep = () => {
    if (currentStep === 'photo') {
      setCurrentStep('info')
    } else if (currentStep === 'info') {
      setCurrentStep('options')
    }
  }

  const goToPrevStep = () => {
    if (currentStep === 'options') {
      setCurrentStep('info')
    } else if (currentStep === 'info') {
      setCurrentStep('photo')
    }
  }

  const handleProductDataChange = (field, value) => {
    setProductData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addOption = (type) => {
    // 이미 해당 타입의 옵션이 있는지 확인 (custom 제외)
    if (type !== 'custom') {
      const optionTypeMap = {
        size: '사이즈',
        color: '색상',
        storage: '용량',
        material: '재질'
      }

      const existingOption = productData.options.find(option =>
        option.name === optionTypeMap[type]
      )

      if (existingOption) {
        toast.error(`${optionTypeMap[type]} 옵션이 이미 추가되어 있습니다`)
        return
      }
    }

    const optionTemplates = {
      size: {
        name: '사이즈',
        values: ['S', 'M', 'L', 'XL']
      },
      color: {
        name: '색상',
        values: ['블랙', '화이트', '그레이', '네이비']
      },
      storage: {
        name: '용량',
        values: ['128GB', '256GB', '512GB', '1TB']
      },
      material: {
        name: '재질',
        values: ['면', '폴리에스터', '나일론', '가죽']
      },
      custom: {
        name: '옵션명',
        values: ['옵션1', '옵션2']
      }
    }

    const template = optionTemplates[type]
    const newOption = {
      id: Date.now(),
      ...template
    }

    setProductData(prev => ({
      ...prev,
      options: [...prev.options, newOption]
    }))

    toast.success(`${template.name} 옵션이 추가되었습니다`)
  }

  const updateOption = (optionId, field, value) => {
    setProductData(prev => ({
      ...prev,
      options: prev.options.map(option =>
        option.id === optionId
          ? { ...option, [field]: value }
          : option
      )
    }))
  }

  const removeOption = (optionId) => {
    const optionToRemove = productData.options.find(option => option.id === optionId)

    setProductData(prev => ({
      ...prev,
      options: prev.options.filter(option => option.id !== optionId)
    }))

    toast.success(`${optionToRemove?.name || '옵션'}이 삭제되었습니다`)
  }

  const saveProduct = async () => {
    if (!productData.title || !productData.price) {
      toast.error('제품명과 가격은 필수입니다')
      return
    }

    try {
      const newProduct = {
        title: productData.title,
        description: productData.description || '',
        price: parseInt(productData.price),
        compare_price: null,
        thumbnail_url: imagePreview,
        inventory_quantity: parseInt(productData.inventory_quantity) || 50,
        status: 'active',
        review_rating: 0,
        review_count: 0,
        is_featured: false,
        is_live: false
      }

      const { data, error } = await supabase
        .from('products')
        .insert(newProduct)
        .select()
        .single()

      if (error) throw error

      // 옵션이 있다면 추가
      if (productData.options.length > 0) {
        const optionsToInsert = productData.options.map(option => ({
          product_id: data.id,
          name: option.name,
          values: option.values
        }))

        const { error: optionsError } = await supabase
          .from('product_options')
          .insert(optionsToInsert)

        if (optionsError) {
          console.error('옵션 추가 오류:', optionsError)
        }
      }

      loadProducts()
      toast.success('상품이 추가되었습니다 (홈화면에서도 확인 가능)')
      closeAddModal()
    } catch (error) {
      console.error('상품 추가 오류:', error)
      toast.error('상품 추가에 실패했습니다')
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
    if (quantity === 0) {
      return <span className="text-red-600 font-medium">품절</span>
    } else if (quantity <= 5) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="홈으로 가기"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
              <p className="text-gray-600">총 {products.length}개의 상품</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {typeof window !== 'undefined' ? localStorage.getItem('admin_email') : ''}
              {user?.email || user?.user_metadata?.email || 'master@allok.world'}
            </span>
            <button
              onClick={() => {
                if (window.confirm('로그아웃하시겠습니까?')) {
                  // localStorage 세션 삭제
                  localStorage.removeItem('admin_session')
                  localStorage.removeItem('admin_email')
                  router.push('/admin/login')
                }
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div></div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              // 재고 초기화
              if (window.confirm('모든 상품의 재고를 50개로 초기화하시겠습니까?')) {
                try {
                  const { error } = await supabase
                    .from('products')
                    .update({ inventory_quantity: 50 })
                    .neq('id', '00000000-0000-0000-0000-000000000000')

                  if (error) throw error

                  toast.success('재고가 초기화되었습니다')
                  loadProducts()
                } catch (error) {
                  console.error('재고 초기화 오류:', error)
                  toast.error('재고 초기화에 실패했습니다')
                }
              }
            }}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            재고 초기화
          </button>
          <button
            onClick={async () => {
              // 전체 상품 데이터 완전 삭제
              if (window.confirm('모든 상품을 완전히 삭제하시겠습니까? (홈화면에서도 사라집니다)')) {
                try {
                  // 먼저 옵션 삭제
                  await supabase
                    .from('product_options')
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000')

                  // 상품 삭제
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
            onClick={handleAddProduct}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            상품 추가
          </button>
        </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
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
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-2 gap-6 p-6">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
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

                {/* Featured Badge */}
                {product.is_featured && (
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
                      onClick={() => updateInventory(product.id, product.inventory_quantity - 1)}
                      className="w-6 h-6 bg-gray-200 rounded text-gray-600 hover:bg-gray-300 text-xs"
                    >
                      -
                    </button>
                    <span className="text-sm font-medium w-8 text-center">
                      {product.inventory_quantity}
                    </span>
                    <button
                      onClick={() => updateInventory(product.id, product.inventory_quantity + 1)}
                      className="w-6 h-6 bg-gray-200 rounded text-gray-600 hover:bg-gray-300 text-xs"
                    >
                      +
                    </button>
                    <span className="text-xs ml-2">
                      {getInventoryStatus(product.inventory_quantity)}
                    </span>
                  </div>
                </div>


                {/* Actions */}
                <div className="space-y-2">
                  {/* 라이브 라벨 토글 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateLiveStatus(product.id, !product.is_live)}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                        product.is_live
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${product.is_live ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></div>
                      {product.is_live ? '🔴 LIVE' : 'LIVE 설정'}
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
          <div className="text-center py-12">
            <p className="text-gray-500">조건에 맞는 상품이 없습니다.</p>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-red-50 px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-red-900">
                  {currentStep === 'photo' && '📷 상품 사진 추가'}
                  {currentStep === 'info' && '📝 상품 정보 입력'}
                  {currentStep === 'options' && '⚙️ 상품 옵션 설정'}
                </h2>
                <button
                  onClick={closeAddModal}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {currentStep === 'photo' && !imagePreview && (
                  <div className="space-y-4">
                    <p className="text-center text-gray-600 mb-6">
                      상품 사진을 추가해주세요
                    </p>

                    {/* Upload Options */}
                    <div className="space-y-3">
                      {/* File Upload */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors flex flex-col items-center gap-2"
                      >
                        <DocumentArrowUpIcon className="w-8 h-8 text-gray-400" />
                        <span className="text-gray-700 font-medium">갤러리에서 선택</span>
                        <span className="text-sm text-gray-500">JPG, PNG 파일 업로드</span>
                      </button>

                      {/* Camera Capture */}
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors flex flex-col items-center gap-2"
                      >
                        <CameraIcon className="w-8 h-8 text-gray-400" />
                        <span className="text-gray-700 font-medium">카메라로 촬영</span>
                        <span className="text-sm text-gray-500">직접 사진 촬영하기</span>
                      </button>
                    </div>

                    {/* Hidden File Inputs */}
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
                )}

                {currentStep === 'photo' && imagePreview && (
                  <div className="space-y-4">
                    <p className="text-center text-gray-700 font-medium">
                      선택된 사진
                    </p>

                    {/* Image Preview */}
                    <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={imagePreview}
                        alt="상품 사진 미리보기"
                        fill
                        sizes="400px"
                        className="object-cover"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={resetImageSelection}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        다시 선택
                      </button>
                      <button
                        onClick={goToNextStep}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        다음 단계
                      </button>
                    </div>
                  </div>
                )}

                {currentStep === 'info' && (
                  <div className="space-y-4">
                    {/* Product Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        제품명 *
                      </label>
                      <input
                        type="text"
                        value={productData.title}
                        onChange={(e) => handleProductDataChange('title', e.target.value)}
                        placeholder="제품명을 입력하세요"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    {/* Product Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        상품 설명 (선택사항)
                      </label>
                      <textarea
                        value={productData.description}
                        onChange={(e) => handleProductDataChange('description', e.target.value)}
                        placeholder="상품에 대한 간단한 설명을 입력해주세요"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">상품의 특징이나 주요 기능을 간단히 설명해주세요</p>
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        가격 *
                      </label>
                      <input
                        type="number"
                        value={productData.price}
                        onChange={(e) => handleProductDataChange('price', e.target.value)}
                        placeholder="가격을 입력하세요"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    {/* Inventory */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        수량 (입력 안하면 50개)
                      </label>
                      <input
                        type="number"
                        value={productData.inventory_quantity}
                        onChange={(e) => handleProductDataChange('inventory_quantity', e.target.value)}
                        placeholder="50"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={goToPrevStep}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        이전
                      </button>
                      <button
                        onClick={goToNextStep}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        옵션 설정
                      </button>
                    </div>
                  </div>
                )}

                {currentStep === 'options' && (
                  <div className="space-y-4">
                    <p className="text-center text-gray-600 mb-4">
                      상품 옵션을 설정하세요 (선택사항)
                    </p>

                    {/* Option Templates */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        옵션 추가 {productData.options.length > 0 && `(${productData.options.length}개 추가됨)`}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <button
                          onClick={() => addOption('size')}
                          className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          👕 사이즈
                        </button>
                        <button
                          onClick={() => addOption('color')}
                          className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          🎨 색상
                        </button>
                        <button
                          onClick={() => addOption('storage')}
                          className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          💾 용량
                        </button>
                        <button
                          onClick={() => addOption('material')}
                          className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          🧵 재질
                        </button>
                      </div>
                      <button
                        onClick={() => addOption('custom')}
                        className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-600"
                      >
                        + 직접 설정
                      </button>
                    </div>

                    {/* Added Options */}
                    {productData.options.map((option) => (
                      <div key={option.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <input
                            type="text"
                            value={option.name}
                            onChange={(e) => updateOption(option.id, 'name', e.target.value)}
                            placeholder="옵션명"
                            className="font-medium text-gray-900 bg-transparent border-none p-0 focus:ring-0"
                          />
                          <button
                            onClick={() => removeOption(option.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {option.values.map((value, index) => (
                            <div key={index} className="flex items-center gap-1 bg-gray-50 rounded border">
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => {
                                  const newValues = [...option.values]
                                  newValues[index] = e.target.value
                                  updateOption(option.id, 'values', newValues)
                                }}
                                className="px-2 py-1 text-sm bg-transparent border-none focus:ring-0 focus:outline-none"
                                placeholder={`옵션 ${index + 1}`}
                              />
                              {option.values.length > 1 && (
                                <button
                                  onClick={() => {
                                    const newValues = option.values.filter((_, i) => i !== index)
                                    updateOption(option.id, 'values', newValues)
                                    toast.success('옵션값이 삭제되었습니다')
                                  }}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                >
                                  <XMarkIcon className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => updateOption(option.id, 'values', [...option.values, ''])}
                            className="px-2 py-1 text-sm text-gray-500 border border-dashed border-gray-300 rounded hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={goToPrevStep}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        이전
                      </button>
                      <button
                        onClick={saveProduct}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        상품 저장
                      </button>
                    </div>
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
              className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden"
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
              <div className="p-6 max-h-[70vh] overflow-y-auto">
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
                    <p className="text-xs text-gray-500 mt-1">상품의 특징이나 주요 기능을 간단히 설명해주세요</p>
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
                      value={productData.inventory_quantity}
                      onChange={(e) => setProductData(prev => ({ ...prev, inventory_quantity: e.target.value }))}
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
  )
}