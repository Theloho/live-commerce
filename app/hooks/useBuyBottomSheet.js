/**
 * useBuyBottomSheet - BuyBottomSheet 비즈니스 로직 Custom Hook
 * @author Claude
 * @since 2025-10-21
 * @updated 2025-10-23 - Clean Architecture API Routes 완전 연동
 *
 * 역할: BuyBottomSheet의 모든 상태 관리 및 비즈니스 로직
 * - 사용자 세션 로드 (UserProfileManager)
 * - Variant 데이터 로드
 * - 옵션 선택 및 조합 관리
 * - 재고 확인 및 검증
 * - 장바구니 추가 / 바로구매
 * - 수량 조절
 *
 * Clean Architecture:
 * - Presentation Layer (BuyBottomSheet) → API Routes → UseCases → Repository
 * - ✅ Legacy API 제거 완료:
 *   - getProductVariants → /api/products/variants (GetProductVariantsUseCase)
 *   - checkOptionInventory → /api/inventory/check (CheckInventoryUseCase)
 *   - createOrderWithOptions → /api/orders/create (CreateOrderUseCase)
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import logger from '@/lib/logger'
import { UserProfileManager } from '@/lib/userProfileManager'

/**
 * useBuyBottomSheet Hook
 * @param {Object} params
 * @param {Object} params.product - 상품 데이터
 * @param {boolean} params.isOpen - 바텀시트 열림 상태
 * @param {Function} params.onClose - 바텀시트 닫기 핸들러
 * @param {Object} params.user - useAuth().user
 * @param {boolean} params.isAuthenticated - useAuth().isAuthenticated
 * @returns {Object}
 */
export function useBuyBottomSheet({ product, isOpen, onClose, user, isAuthenticated }) {
  const router = useRouter()

  // ===== State =====
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState({})
  const [selectedCombinations, setSelectedCombinations] = useState([])
  const [totalQuantity, setTotalQuantity] = useState(0)
  const [totalPrice, setTotalPrice] = useState(0)
  const [options, setOptions] = useState([])
  const [variants, setVariants] = useState([])
  const [stock, setStock] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [userSession, setUserSession] = useState(null)
  const [showChoiceModal, setShowChoiceModal] = useState(false)

  // ===== Product 속성 추출 =====
  const image = product?.thumbnail_url || product?.image_url || '/placeholder.png'
  const title = product?.title || ''
  const price = product?.price || 0
  const originalPrice = product?.compare_price || null
  const description = product?.description || ''
  const discount = originalPrice ? originalPrice - price : 0
  const minOrder = product?.minimum_order_quantity || 1
  const maxOrder = product?.maximum_order_quantity || 999

  // ===== useEffect 1: 사용자 세션 로드 (UserProfileManager) =====
  useEffect(() => {
    if (!isOpen) return

    async function loadUserSession() {
      try {
        const currentUser = user || null
        if (currentUser && currentUser.id) {
          // ✅ Static 메서드 직접 호출 (Rule #0 준수)
          const sessionData = await UserProfileManager.loadUserProfile(currentUser.id)
          if (sessionData) {
            setUserSession(sessionData)
            logger.debug('BuyBottomSheet: 사용자 세션 로드 완료', {
              id: sessionData.id,
              name: sessionData.name,
              phone: sessionData.phone
            })
          }
        } else {
          // 세션 스토리지에서 카카오 사용자 확인
          const kakaoUserStr = typeof window !== 'undefined'
            ? sessionStorage.getItem('kakaoUser')
            : null
          if (kakaoUserStr) {
            const kakaoUser = JSON.parse(kakaoUserStr)
            setUserSession(kakaoUser)
          }
        }
      } catch (error) {
        logger.error('BuyBottomSheet: 사용자 세션 로드 실패', error)
      }
    }

    loadUserSession()
  }, [isOpen, user])

  // ===== useEffect 2: Variant 로드 =====
  useEffect(() => {
    if (!isOpen || !product?.id) return

    async function loadVariants() {
      try {
        // ✅ Clean Architecture API Route 사용
        const response = await fetch('/api/products/variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Variant 조회 실패')
        }

        const result = await response.json()
        const variantData = result.variants

        if (variantData && variantData.length > 0) {
          // Dynamic variant 변환 (옵션 구조 통일)
          const processedVariants = variantData.map(variant => {
            if (variant.variant_option_values && Array.isArray(variant.variant_option_values)) {
              return {
                ...variant,
                options: variant.variant_option_values.map(vov => ({
                  optionName: vov.product_option_values?.product_options?.name || '',
                  optionValue: vov.product_option_values?.value || ''
                }))
              }
            }
            return variant
          })

          setVariants(processedVariants)

          // 옵션 구조 생성
          if (processedVariants.length > 0 && processedVariants[0].options) {
            const optionMap = new Map()

            processedVariants.forEach(variant => {
              variant.options.forEach(opt => {
                if (!optionMap.has(opt.optionName)) {
                  optionMap.set(opt.optionName, new Set())
                }
                optionMap.get(opt.optionName).add(opt.optionValue)
              })
            })

            const optionsArray = Array.from(optionMap.entries()).map(([name, values]) => ({
              name,
              values: Array.from(values)
            }))

            setOptions(optionsArray)
          }

          // ✅ 옵션 상품: 초기 stock은 0 (옵션 선택 후 업데이트)
          setStock(0)
        } else {
          // 옵션 없는 상품: 기본 재고 설정
          setOptions([])
          setVariants([])
          setStock(product.inventory || product.stock_quantity || 0)
        }
      } catch (error) {
        logger.error('BuyBottomSheet: Variant 로드 실패', error)
        setOptions([])
        setVariants([])
        setStock(product.inventory || product.stock_quantity || 0)
      }
    }

    loadVariants()
  }, [isOpen, product])

  // ===== useEffect 3: 옵션 완전 선택 시 자동 조합 추가 =====
  useEffect(() => {
    if (options.length === 0) return

    const allOptionsSelected = options.every(opt => selectedOptions[opt.name])

    if (allOptionsSelected && selectedCombinations.length === 0) {
      // 모든 옵션이 선택되었고 아직 조합이 추가되지 않았을 때
      setTimeout(() => {
        const optionKey = Object.values(selectedOptions).join(' / ')

        // Variant ID 찾기
        const variant = variants?.find(v => {
          if (!v.options || v.options.length !== options.length) return false
          return Object.entries(selectedOptions).every(([optName, optValue]) => {
            return v.options.some(opt => opt.optionName === optName && opt.optionValue === optValue)
          })
        })

        const variantInventory = variant ? variant.inventory : stock
        const variantId = variant ? variant.id : null

        if (variantInventory === 0) {
          toast.error('선택하신 옵션의 재고가 없습니다')
          return
        }

        setSelectedCombinations([{
          key: optionKey,
          options: { ...selectedOptions },
          quantity: 1,
          price: price,
          variantId: variantId
        }])

        // 선택 초기화 (다음 조합 선택 가능하도록)
        setSelectedOptions({})

        toast.success(`${optionKey} 추가됨`)
      }, 500)
    }
  }, [selectedOptions, options, selectedCombinations, variants, stock, price])

  // ===== useEffect 4: 선택된 Variant의 재고 업데이트 =====
  useEffect(() => {
    if (options.length === 0 || !variants || variants.length === 0) return

    // 모든 옵션이 선택되었는지 확인
    const allOptionsSelected = options.every(opt => selectedOptions[opt.name])

    if (allOptionsSelected) {
      // 선택된 Variant 찾기
      const variant = variants.find(v => {
        if (!v.options || v.options.length !== options.length) return false
        return Object.entries(selectedOptions).every(([optName, optValue]) => {
          return v.options.some(opt => opt.optionName === optName && opt.optionValue === optValue)
        })
      })

      if (variant) {
        // ✅ 선택된 Variant의 재고로 업데이트
        setStock(variant.inventory || 0)
      } else {
        // Variant를 찾지 못한 경우 0
        setStock(0)
      }
    } else {
      // 옵션 미선택 시 0 (재고 표시하지 않음)
      setStock(0)
    }
  }, [selectedOptions, options, variants])

  // ===== 합계 계산 useEffect =====
  useEffect(() => {
    if (options.length > 0) {
      // 옵션 상품: 선택된 조합들의 합계
      const total = selectedCombinations.reduce((sum, combo) => sum + combo.quantity, 0)
      const totalAmount = selectedCombinations.reduce((sum, combo) => sum + (combo.price * combo.quantity), 0)
      setTotalQuantity(total)
      setTotalPrice(totalAmount)
    } else {
      // 옵션 없는 상품: 직접 수량
      setTotalQuantity(quantity)
      setTotalPrice(price * quantity)
    }
  }, [selectedCombinations, quantity, price, options])

  // ===== 유틸리티: Variant ID 찾기 =====
  const findVariantId = useCallback((optionsObj) => {
    if (!variants || variants.length === 0) return null

    const variant = variants.find(v => {
      if (!v.options || v.options.length !== Object.keys(optionsObj).length) return false
      return Object.entries(optionsObj).every(([optName, optValue]) => {
        return v.options.some(opt => opt.optionName === optName && opt.optionValue === optValue)
      })
    })

    return variant ? variant.id : null
  }, [variants])

  // ===== 핸들러: 수량 변경 (옵션 없는 상품) =====
  const handleQuantityChange = useCallback((newQuantity) => {
    const maxAvailable = Math.min(maxOrder, stock)
    const validQuantity = Math.max(minOrder, Math.min(newQuantity, maxAvailable))
    setQuantity(validQuantity)
  }, [minOrder, maxOrder, stock])

  // ===== 핸들러: 조합 수량 변경 =====
  const updateCombinationQuantity = useCallback((index, newQuantity) => {
    if (newQuantity < 1) return

    setSelectedCombinations(prev => {
      const updated = [...prev]
      const combo = updated[index]

      // Variant 재고 확인
      const variant = combo.variantId ? variants?.find(v => v.id === combo.variantId) : null
      const maxInventory = variant ? variant.inventory : stock

      if (newQuantity > maxInventory) {
        toast.error(`재고가 부족합니다 (최대 ${maxInventory}개)`)
        return prev
      }

      updated[index] = { ...combo, quantity: newQuantity }
      return updated
    })
  }, [variants, stock])

  // ===== 핸들러: 조합 제거 =====
  const removeCombination = useCallback((index) => {
    setSelectedCombinations(prev => prev.filter((_, i) => i !== index))
  }, [])

  // ===== 핸들러: 장바구니 추가 (146 lines - 원본 로직) =====
  const handleAddToCart = useCallback(async (shouldClose = true) => {
    if (isLoading) return

    const currentUser = userSession || user
    const isUserLoggedIn = userSession || isAuthenticated

    if (!isUserLoggedIn) {
      toast.error('로그인이 필요합니다')
      router.push('/login')
      onClose()
      return
    }

    setIsLoading(true)

    try {
      // 사용자 프로필 준비 - ✅ Static 메서드 직접 호출 (Rule #0 준수)
      const profile = await UserProfileManager.loadUserProfile(currentUser.id)

      if (!profile || !profile.name || !profile.phone) {
        toast.error('프로필 정보를 먼저 입력해주세요')
        setIsLoading(false)
        onClose()
        router.push('/mypage')
        return
      }

      // 장바구니 아이템 구성
      let cartItems = []

      if (options.length > 0) {
        // 옵션 상품: 선택된 조합들
        if (selectedCombinations.length === 0) {
          toast.error('옵션을 선택해주세요')
          setIsLoading(false)
          return
        }

        // ✅ 성능 최적화: thumbnail_url 제거 (3.6MB → 1KB)
        // - CreateOrderUseCase가 DB에서 자동으로 조회
        cartItems = selectedCombinations.map(combo => ({
          product_id: product.id,
          product_number: product.product_number,
          title: product.title,
          price: combo.price,
          quantity: combo.quantity,
          totalPrice: combo.price * combo.quantity,
          // thumbnail_url: image,  // ← 제거 (3.6MB base64 이미지)
          selectedOptions: combo.options,
          variant_id: combo.variantId
        }))
      } else {
        // 옵션 없는 상품
        if (quantity === 0) {
          toast.error('수량을 선택해주세요')
          setIsLoading(false)
          return
        }

        // ✅ 성능 최적화: thumbnail_url 제거 (3.6MB → 1KB)
        // - CreateOrderUseCase가 DB에서 자동으로 조회
        cartItems = [{
          product_id: product.id,
          product_number: product.product_number,
          title: product.title,
          price: price,
          quantity: quantity,
          totalPrice: price * quantity,
          // thumbnail_url: image,  // ← 제거 (3.6MB base64 이미지)
          selectedOptions: {},
          variant_id: null
        }]
      }

      // 재고 확인
      for (const item of cartItems) {
        // ✅ Clean Architecture API Route 사용
        const response = await fetch('/api/inventory/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            selectedOptions: item.selectedOptions
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '재고 확인 실패')
        }

        const inventoryCheck = await response.json()

        // ✅ API는 { available, inventory, variantId? } 반환
        if (!inventoryCheck.available) {
          toast.error('선택하신 옵션의 재고가 없습니다')
          setIsLoading(false)
          return
        }

        // ✅ 수량 검증 추가
        if (inventoryCheck.inventory < item.quantity) {
          toast.error(`재고가 부족합니다 (재고: ${inventoryCheck.inventory}개, 요청: ${item.quantity}개)`)
          setIsLoading(false)
          return
        }
      }

      // 주문 생성 (장바구니 대신 pending 주문 생성)
      for (const item of cartItems) {
        // ✅ CreateOrderUseCase는 orderData가 직접 상품 정보를 가져야 함
        const orderData = {
          // 상품 정보 (item의 모든 필드)
          id: item.product_id,  // ✅ CreateOrderUseCase는 'id' 사용
          ...item,
          // 주문 타입 (CreateOrderUseCase가 order_type 자동 생성에 사용)
          orderType: 'direct'
        }

        // ✅ Clean Architecture API Route 사용
        const response = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderData,
            userProfile: profile,
            depositName: profile.name,
            user: userSession || user
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '주문 생성 실패')
        }

        const result = await response.json()

        // ✅ API는 { order: {...} } 반환
        if (!result.order) {
          throw new Error('주문 생성 실패')
        }
      }

      // 이벤트 발송 (장바구니 갱신)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cartUpdated'))
      }

      toast.success(`장바구니에 ${cartItems.length}개 상품이 추가되었습니다`)

      // 상태 초기화
      setQuantity(1)
      setSelectedOptions({})
      setSelectedCombinations([])

      if (shouldClose) {
        onClose()
      }

      setIsLoading(false)
      return true
    } catch (error) {
      logger.error('BuyBottomSheet: 장바구니 추가 실패', error)
      toast.error(error.message || '장바구니 추가 중 오류가 발생했습니다')
      setIsLoading(false)
      return false
    }
  }, [
    isLoading, userSession, user, isAuthenticated, options, selectedCombinations,
    quantity, product, price, image, router, onClose, variants, stock
  ])

  // ===== 핸들러: 바로구매 =====
  const handleBuyNow = useCallback(async () => {
    const currentUser = userSession || user
    const isUserLoggedIn = userSession || isAuthenticated

    if (!isUserLoggedIn) {
      toast.error('로그인이 필요합니다')
      router.push('/login')
      onClose()
      return
    }

    try {
      const success = await handleAddToCart(false)
      if (success) {
        onClose()
        setTimeout(() => {
          setShowChoiceModal(true)
        }, 300)
      }
    } catch (error) {
      logger.error('BuyBottomSheet: 바로구매 실패', error)
      onClose()
    }
  }, [userSession, user, isAuthenticated, handleAddToCart, onClose, router])

  // ===== 핸들러: 찜하기 =====
  const handleLike = useCallback(async () => {
    toast.success('찜 목록에 추가되었습니다')
  }, [])

  // ===== 핸들러: 추가 주문하기 =====
  const handleMoreOrders = useCallback(() => {
    setShowChoiceModal(false)
    router.push('/')
  }, [router])

  // ===== 핸들러: 주문 내역만 보기 =====
  const handleOrderHistoryOnly = useCallback(() => {
    setShowChoiceModal(false)
    router.push('/orders')
  }, [router])

  return {
    // State
    quantity,
    selectedOptions,
    setSelectedOptions,
    selectedCombinations,
    totalQuantity,
    totalPrice,
    options,
    variants,
    stock,
    isLoading,
    userSession,
    showChoiceModal,
    setShowChoiceModal,

    // Product 속성
    image,
    title,
    price,
    originalPrice,
    description,
    discount,
    minOrder,
    maxOrder,

    // Handlers
    handleQuantityChange,
    updateCombinationQuantity,
    removeCombination,
    handleAddToCart,
    handleBuyNow,
    handleLike,
    handleMoreOrders,
    handleOrderHistoryOnly,
    findVariantId
  }
}
