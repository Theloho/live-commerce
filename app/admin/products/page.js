'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  CameraIcon,
  DocumentArrowUpIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { addMockProduct, clearMockProducts, reloadMockProducts, getMockProducts, deleteAllMockProducts } from '@/lib/mockAuth'

export default function AdminProductsPage() {
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [currentStep, setCurrentStep] = useState('photo') // 'photo', 'info', 'options'
  const [productData, setProductData] = useState({
    title: '',
    price: '',
    inventory_quantity: '',
    options: []
  })
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      // Mock 데이터베이스에서 상품 데이터 로드
      const mockProducts = getMockProducts()
      setProducts(mockProducts)
      setLoading(false)
    } catch (error) {
      console.error('상품 로딩 오류:', error)
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    return product && product.title && product.title.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const updateProductStatus = (productId, newStatus) => {
    const updatedProducts = products.map(product =>
      product.id === productId ? { ...product, status: newStatus } : product
    )
    setProducts(updatedProducts)
    toast.success('상품 상태가 변경되었습니다')
  }

  const updateInventory = (productId, newQuantity) => {
    if (newQuantity < 0) return

    const updatedProducts = products.map(product =>
      product.id === productId ? { ...product, inventory_quantity: newQuantity } : product
    )
    setProducts(updatedProducts)
    toast.success('재고가 업데이트되었습니다')
  }

  const deleteProduct = (productId) => {
    if (window.confirm('이 상품을 삭제하시겠습니까?')) {
      const updatedProducts = products.filter(product => product.id !== productId)
      setProducts(updatedProducts)
      toast.success('상품이 삭제되었습니다')
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
        name: '',
        values: ['']
      }
    }

    const newOption = {
      id: Date.now(),
      ...optionTemplates[type]
    }

    setProductData(prev => ({
      ...prev,
      options: [...prev.options, newOption]
    }))
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
    setProductData(prev => ({
      ...prev,
      options: prev.options.filter(option => option.id !== optionId)
    }))
  }

  const saveProduct = () => {
    if (!productData.title || !productData.price) {
      toast.error('제품명과 가격은 필수입니다')
      return
    }

    const newProduct = {
      id: Date.now(), // 유니크한 ID 생성
      title: productData.title,
      price: parseInt(productData.price),
      compare_price: null,
      thumbnail_url: imagePreview,
      inventory_quantity: parseInt(productData.inventory_quantity) || 50,
      status: 'active',
      review_rating: 0,
      review_count: 0,
      is_featured: false,
      created_at: new Date().toISOString(),
      options: productData.options
    }

    // Mock 데이터베이스에 추가
    const success = addMockProduct(newProduct)
    if (success) {
      // 관리자 페이지 상품 목록 새로고침
      loadProducts()
    } else {
      console.error('상품 추가 실패')
    }

    toast.success('상품이 추가되었습니다 (홈화면에서도 확인 가능)')
    closeAddModal()
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
          <p className="text-gray-600">총 {products.length}개의 상품</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              // 재고 초기화
              if (window.confirm('모든 상품의 재고를 초기 상태로 복원하시겠습니까?')) {
                localStorage.removeItem('mock_products')
                toast.success('재고가 초기화되었습니다')
                loadProducts()
              }
            }}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            재고 초기화
          </button>
          <button
            onClick={() => {
              // 전체 상품 데이터 완전 삭제
              if (window.confirm('모든 상품을 완전히 삭제하시겠습니까? (홈화면에서도 사라집니다)')) {
                const success = deleteAllMockProducts()
                if (success) {
                  loadProducts() // 상품 목록 새로고침
                  toast.success('모든 상품이 완전히 삭제되었습니다')
                } else {
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
              const success = reloadMockProducts()
              if (success) {
                console.log('홈화면 상품 데이터 확인 완료 - 콘솔에서 Mock 상품 목록을 확인하세요')
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            홈화면 확인
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

                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
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
                    {productData.options.length === 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-3">기본 옵션 템플릿</p>
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
                    )}

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
                            <input
                              key={index}
                              type="text"
                              value={value}
                              onChange={(e) => {
                                const newValues = [...option.values]
                                newValues[index] = e.target.value
                                updateOption(option.id, 'values', newValues)
                              }}
                              className="px-2 py-1 text-sm border border-gray-300 rounded"
                              placeholder={`옵션 ${index + 1}`}
                            />
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
    </div>
  )
}