/**
 * useProductForm - 상품 등록 폼 비즈니스 로직 (Phase 4.4 리팩토링)
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture:
 * - Application Layer Hook (비즈니스 로직만 담당)
 * - State management, validation, data loading, save logic
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSuppliers } from '@/lib/supabaseApi'
import { generateProductNumber } from '@/lib/productNumberGenerator'
import toast from 'react-hot-toast'

// 옵션 템플릿
export const SIZE_TEMPLATES = {
  number: ['55', '66', '77', '88', '99'],
  alpha: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  free: ['FREE']
}

export const COLOR_PRESETS = ['블랙', '화이트', '그레이', '베이지', '네이비', '브라운', '카키', '핑크', '레드', '블루']

export function useProductForm({ isAdminAuthenticated }) {
  const router = useRouter()

  // State
  const [loading, setLoading] = useState(false)
  const [productNumber, setProductNumber] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)

  const [productData, setProductData] = useState({
    title: '',
    price: '',
    inventory: 10,
    description: '',
    supplier_id: null,
    supplier_product_code: '',
    category: '',
    sub_category: '',
    optionType: 'none',
    sizeOptions: [],
    colorOptions: [],
    optionInventories: {}
  })

  const [useThousandUnit, setUseThousandUnit] = useState(true)
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])

  // 필수값 검증
  const validateRequiredFields = () => {
    const errors = []

    if (!imagePreview) errors.push('제품 이미지')
    if (!productData.price || productData.price <= 0) errors.push('판매가격')
    if (productData.optionType !== 'none') {
      const totalOptionInventory = Object.values(productData.optionInventories).reduce((sum, qty) => sum + (qty || 0), 0)
      if (totalOptionInventory === 0) errors.push('옵션별 재고')
    }

    return errors
  }

  const canSubmit = validateRequiredFields().length === 0

  const showMissingFieldsAlert = () => {
    const missingFields = validateRequiredFields()
    if (missingFields.length > 0) {
      toast.error(`다음 항목을 입력해주세요: ${missingFields.join(', ')}`)
      return false
    }
    return true
  }

  // 이미지 업로드
  const handleImageUpload = (file) => {
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // 가격 처리
  const handlePriceChange = (value) => {
    if (!value || value === '') {
      setProductData(prev => ({ ...prev, price: '' }))
      return
    }

    if (useThousandUnit) {
      const filtered = value.replace(/[^\d.]/g, '')
      const numValue = parseFloat(filtered)
      if (!isNaN(numValue)) {
        const actualPrice = Math.floor(numValue * 1000)
        setProductData(prev => ({ ...prev, price: actualPrice }))
      } else {
        setProductData(prev => ({ ...prev, price: '' }))
      }
    } else {
      const filtered = value.replace(/[^\d]/g, '')
      const numValue = parseInt(filtered)
      if (!isNaN(numValue)) {
        setProductData(prev => ({ ...prev, price: numValue }))
      } else {
        setProductData(prev => ({ ...prev, price: '' }))
      }
    }
  }

  const getDisplayPrice = () => {
    if (!productData.price) return ''
    if (useThousandUnit) {
      return (productData.price / 1000).toString()
    } else {
      return productData.price.toString()
    }
  }

  // 옵션 조합 생성
  const generateOptionCombinations = () => {
    const { optionType, sizeOptions, colorOptions } = productData

    if (optionType === 'none') return []

    const combinations = []

    if (optionType === 'size') {
      sizeOptions.forEach(size => {
        combinations.push({
          key: `size:${size}`,
          label: size,
          type: 'size',
          size: size
        })
      })
    } else if (optionType === 'color') {
      colorOptions.forEach(color => {
        combinations.push({
          key: `color:${color}`,
          label: color,
          type: 'color',
          color: color
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

  // 서브 카테고리 로드
  const loadSubCategories = async (categoryName) => {
    try {
      const { data: mainCategoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .is('parent_id', null)
        .single()

      if (!mainCategoryData) return

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', mainCategoryData.id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setSubCategories(data || [])
    } catch (error) {
      console.error('서브 카테고리 로딩 오류:', error)
    }
  }

  // 초기화
  useEffect(() => {
    if (isAdminAuthenticated) {
      const autoGenerate = async () => {
        try {
          const number = await generateProductNumber()
          setProductNumber(number)
        } catch (error) {
          console.error('제품번호 생성 오류:', error)
          toast.error('상품번호 생성 실패')
          setProductNumber('0001')
        }
      }

      const loadSuppliersData = async () => {
        try {
          const data = await getSuppliers()
          setSuppliers(data || [])
        } catch (error) {
          console.error('업체 로드 오류:', error)
        }
      }

      const loadCategories = async () => {
        try {
          const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('is_active', true)
            .order('name')

          if (error) throw error
          setCategories(data || [])
        } catch (error) {
          console.error('카테고리 로드 오류:', error)
        }
      }

      autoGenerate()
      loadSuppliersData()
      loadCategories()
    }
  }, [isAdminAuthenticated])

  // 제품 저장
  const handleSaveProduct = async () => {
    if (!canSubmit) {
      showMissingFieldsAlert()
      return
    }

    setLoading(true)

    try {
      console.log('🚀 [빠른등록] 상품 저장 시작 (Service Role API)')

      let totalInventory = productData.inventory
      if (productData.optionType !== 'none') {
        totalInventory = Object.values(productData.optionInventories).reduce((sum, qty) => sum + (qty || 0), 0)
      }

      const combinations = generateOptionCombinations()

      const response = await fetch('/api/admin/products/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: productData.title,
          product_number: productNumber,
          price: productData.price,
          inventory: totalInventory,
          thumbnail_url: imagePreview,
          description: productData.description,
          supplier_id: productData.supplier_id || null,
          supplier_product_code: productData.supplier_product_code || null,
          category: productData.category || null,
          sub_category: productData.sub_category || null,
          optionType: productData.optionType,
          sizeOptions: productData.sizeOptions,
          colorOptions: productData.colorOptions,
          optionInventories: productData.optionInventories,
          combinations: combinations,
          adminEmail: 'master@allok.world'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '상품 등록 실패')
      }

      const { product } = await response.json()
      console.log('✅ [빠른등록] 상품 등록 완료:', product.id)

      toast.success(`제품 ${productNumber}이 등록되었습니다!`)
      router.push('/admin/products')

    } catch (error) {
      console.error('❌ [빠른등록] 제품 저장 오류:', error)
      toast.error(`제품 등록 실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return {
    // State
    loading,
    productNumber,
    imagePreview,
    selectedImage,
    productData,
    setProductData,
    useThousandUnit,
    setUseThousandUnit,
    suppliers,
    setSuppliers,
    categories,
    subCategories,
    // Validation
    canSubmit,
    showMissingFieldsAlert,
    // Functions
    handleImageUpload,
    handlePriceChange,
    getDisplayPrice,
    generateOptionCombinations,
    loadSubCategories,
    handleSaveProduct
  }
}
