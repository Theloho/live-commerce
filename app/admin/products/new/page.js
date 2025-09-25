'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeftIcon, CameraIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import toast from 'react-hot-toast'

export default function NewProductPage() {
  const router = useRouter()
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [productNumber, setProductNumber] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)

  const [productData, setProductData] = useState({
    title: '', // 선택적 제품명
    price: '',
    inventory: 10,
    description: '',
    optionType: 'none', // 'none', 'size', 'color', 'both'
    sizeOptions: [],
    colorOptions: [],
    optionInventories: {}
  })

  // 미리 정의된 옵션 템플릿
  const SIZE_TEMPLATES = {
    number: ['55', '66', '77', '88', '99'],
    alpha: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    free: ['FREE']
  }

  const COLOR_PRESETS = ['블랙', '화이트', '그레이', '베이지', '네이비', '브라운', '카키', '핑크', '레드', '블루']

  // 권한 체크
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
    }
  }, [authLoading, isAdminAuthenticated, router])

  // 페이지 로드 시 제품번호 자동 생성
  useEffect(() => {
    if (isAdminAuthenticated) {
      generateProductNumber()
    }
  }, [isAdminAuthenticated])

  // 제품번호 자동 생성 (title 필드에서 추출)
  const generateProductNumber = async () => {
    try {
      // 기존 제품들의 title에서 번호 패턴 추출
      const { data: products, error } = await supabase
        .from('products')
        .select('title')
        .not('title', 'is', null)

      if (error) throw error

      // title에서 숫자 패턴 추출 (0001, 0042/제품명 등)
      const usedNumbers = products
        .map(p => {
          const match = p.title.match(/^(\d{4})/)
          return match ? parseInt(match[1]) : null
        })
        .filter(num => num !== null)

      // 1부터 9999까지 중 가장 작은 미사용 번호 찾기
      for (let i = 1; i <= 9999; i++) {
        if (!usedNumbers.includes(i)) {
          setProductNumber(String(i).padStart(4, '0'))
          return
        }
      }

      // 모든 번호가 사용 중이면 랜덤 번호
      setProductNumber(String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0'))
    } catch (error) {
      console.error('제품번호 생성 오류:', error)
      // 실패 시 랜덤 번호
      setProductNumber(String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0'))
    }
  }

  // 이미지 업로드
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // 옵션 타입 변경
  const handleOptionTypeChange = (type) => {
    setProductData(prev => ({
      ...prev,
      optionType: type,
      sizeOptions: type === 'size' || type === 'both' ? SIZE_TEMPLATES.alpha : [],
      colorOptions: type === 'color' || type === 'both' ? COLOR_PRESETS.slice(0, 5) : [],
      optionInventories: {}
    }))
  }

  // 옵션 조합 생성
  const generateOptionCombinations = () => {
    const { optionType, sizeOptions, colorOptions } = productData

    if (optionType === 'none') {
      return []
    }

    const combinations = []

    if (optionType === 'size') {
      sizeOptions.forEach(size => {
        combinations.push({
          key: `size:${size}`,
          label: size,
          type: 'size',
          value: size
        })
      })
    } else if (optionType === 'color') {
      colorOptions.forEach(color => {
        combinations.push({
          key: `color:${color}`,
          label: color,
          type: 'color',
          value: color
        })
      })
    } else if (optionType === 'both') {
      sizeOptions.forEach(size => {
        colorOptions.forEach(color => {
          combinations.push({
            key: `size:${size}|color:${color}`,
            label: `${size} × ${color}`,
            type: 'both',
            size,
            color
          })
        })
      })
    }

    return combinations
  }

  const combinations = generateOptionCombinations()

  // 옵션별 재고 변경
  const handleOptionInventoryChange = (comboKey, inventory) => {
    setProductData(prev => ({
      ...prev,
      optionInventories: {
        ...prev.optionInventories,
        [comboKey]: parseInt(inventory) || 0
      }
    }))
  }

  // 제품 저장
  const handleSaveProduct = async () => {
    // 유효성 검사
    if (!imagePreview) {
      toast.error('제품 사진을 추가해주세요')
      return
    }
    if (!productData.price || productData.price <= 0) {
      toast.error('판매가격을 입력해주세요')
      return
    }

    // 옵션이 있는 경우 재고 확인
    if (productData.optionType !== 'none') {
      const totalOptionInventory = Object.values(productData.optionInventories).reduce((sum, qty) => sum + (qty || 0), 0)
      if (totalOptionInventory === 0) {
        toast.error('옵션별 재고를 설정해주세요')
        return
      }
    }

    setLoading(true)

    try {
      // 표시용 제품명 생성
      const displayName = productData.title.trim()
        ? `${productNumber}/${productData.title.trim()}`
        : productNumber

      // 총 재고 계산
      let totalInventory = productData.inventory
      if (productData.optionType !== 'none') {
        totalInventory = Object.values(productData.optionInventories).reduce((sum, qty) => sum + (qty || 0), 0)
      }

      // 제품 저장 (product_number 제거, title에 번호 포함)
      const { data: product, error } = await supabase
        .from('products')
        .insert({
          title: displayName,
          price: parseInt(productData.price),
          inventory: totalInventory,
          thumbnail_url: imagePreview,
          description: productData.description || '',
          status: 'active',
          is_featured: false,
          tags: ['NEW']
        })
        .select()
        .single()

      if (error) throw error

      // 옵션이 있는 경우 옵션 저장
      if (productData.optionType !== 'none' && combinations.length > 0) {
        const optionInserts = []

        if (productData.optionType === 'size') {
          optionInserts.push({
            product_id: product.id,
            name: '사이즈',
            values: productData.sizeOptions.map(size => ({
              name: size,
              inventory: productData.optionInventories[`size:${size}`] || 0
            }))
          })
        } else if (productData.optionType === 'color') {
          optionInserts.push({
            product_id: product.id,
            name: '색상',
            values: productData.colorOptions.map(color => ({
              name: color,
              inventory: productData.optionInventories[`color:${color}`] || 0
            }))
          })
        } else if (productData.optionType === 'both') {
          // 사이즈와 색상 모두 있는 경우 - 조합별 재고를 어떻게 저장할지 고민 필요
          // 일단 간단하게 조합 정보를 JSON으로 저장
          optionInserts.push({
            product_id: product.id,
            name: '조합',
            values: combinations.map(combo => ({
              name: combo.label,
              inventory: productData.optionInventories[combo.key] || 0,
              combination: combo.type === 'both' ? { size: combo.size, color: combo.color } : null
            }))
          })
        }

        if (optionInserts.length > 0) {
          const { error: optionError } = await supabase
            .from('product_options')
            .insert(optionInserts)

          if (optionError) {
            console.error('옵션 저장 오류:', optionError)
          }
        }
      }

      toast.success(`제품 ${productNumber}이 등록되었습니다!`)

      // 목록 페이지로 이동
      router.push('/admin/products')

    } catch (error) {
      console.error('제품 저장 오류:', error)
      toast.error('제품 등록에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isAdminAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/products')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">새 제품 등록</h1>
              {productNumber && (
                <p className="text-sm text-gray-600">제품번호: {productNumber}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleSaveProduct}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '저장 중...' : '등록하기'}
          </button>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 왼쪽: 기본 정보 */}
          <div className="space-y-6">

            {/* 제품 이미지 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium mb-4">제품 이미지</h2>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors border-2 border-dashed border-gray-300"
              >
                {imagePreview ? (
                  <>
                    <Image
                      src={imagePreview}
                      alt="제품 이미지"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="bg-white/90 px-3 py-1 rounded-lg text-sm opacity-0 hover:opacity-100 transition-opacity">
                        변경하기
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <CameraIcon className="w-12 h-12 mb-3" />
                    <p className="font-medium">이미지 업로드</p>
                    <p className="text-sm">클릭하여 이미지를 선택하세요</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* 기본 정보 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium mb-4">기본 정보</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제품번호
                  </label>
                  <input
                    type="text"
                    value={productNumber}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">자동으로 생성됩니다</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제품명 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={productData.title}
                    onChange={(e) => setProductData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="예: 밍크자켓"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    입력 시: {productNumber}/밍크자켓, 미입력 시: {productNumber}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    판매가격 *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={productData.price}
                      onChange={(e) => setProductData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <span className="absolute left-3 top-2.5 text-gray-500">₩</span>
                  </div>
                </div>

                {productData.optionType === 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      재고 수량
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setProductData(prev => ({
                          ...prev,
                          inventory: Math.max(0, prev.inventory - 1)
                        }))}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={productData.inventory}
                        onChange={(e) => setProductData(prev => ({ ...prev, inventory: parseInt(e.target.value) || 0 }))}
                        className="flex-1 px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        min="0"
                      />
                      <button
                        onClick={() => setProductData(prev => ({
                          ...prev,
                          inventory: prev.inventory + 1
                        }))}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상세 설명 (선택사항)
                  </label>
                  <textarea
                    value={productData.description}
                    onChange={(e) => setProductData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="제품에 대한 간단한 설명을 입력하세요"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 옵션 설정 */}
          <div className="space-y-6">

            {/* 옵션 타입 선택 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium mb-4">옵션 설정</h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="optionType"
                    value="none"
                    checked={productData.optionType === 'none'}
                    onChange={(e) => handleOptionTypeChange(e.target.value)}
                    className="text-red-600"
                  />
                  <span className="font-medium">옵션 없음</span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="optionType"
                    value="size"
                    checked={productData.optionType === 'size'}
                    onChange={(e) => handleOptionTypeChange(e.target.value)}
                    className="text-red-600"
                  />
                  <span className="font-medium">사이즈 옵션</span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="optionType"
                    value="color"
                    checked={productData.optionType === 'color'}
                    onChange={(e) => handleOptionTypeChange(e.target.value)}
                    className="text-red-600"
                  />
                  <span className="font-medium">색상 옵션</span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="optionType"
                    value="both"
                    checked={productData.optionType === 'both'}
                    onChange={(e) => handleOptionTypeChange(e.target.value)}
                    className="text-red-600"
                  />
                  <span className="font-medium">사이즈 + 색상 옵션</span>
                </label>
              </div>
            </div>

            {/* 옵션별 재고 설정 */}
            {combinations.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-medium mb-4">옵션별 재고 설정</h2>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {combinations.map((combo) => (
                    <div key={combo.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{combo.label}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={productData.optionInventories[combo.key] || 0}
                          onChange={(e) => handleOptionInventoryChange(combo.key, e.target.value)}
                          min="0"
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                        <span className="text-sm text-gray-500">개</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 총 재고: {Object.values(productData.optionInventories).reduce((sum, qty) => sum + (qty || 0), 0)}개
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}