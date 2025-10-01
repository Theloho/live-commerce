'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { MinusIcon, PlusIcon, HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import BottomSheet from '@/app/components/common/BottomSheet'
import Button from '@/app/components/common/Button'
import PurchaseChoiceModal from '@/app/components/common/PurchaseChoiceModal'
import { motion } from 'framer-motion'
import useAuth from '@/hooks/useAuth'
import { createOrder, createOrderWithOptions, checkOptionInventory } from '@/lib/supabaseApi'
import toast from 'react-hot-toast'

export default function BuyBottomSheet({ isOpen, onClose, product }) {
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState({})
  const [selectedCombinations, setSelectedCombinations] = useState([]) // 선택된 조합들
  const [isLiked, setIsLiked] = useState(false)
  const [showChoiceModal, setShowChoiceModal] = useState(false)
  const [userSession, setUserSession] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  // 직접 세션 확인 (카카오 로그인 지원)
  useEffect(() => {
    const checkUserSession = () => {
      try {
        const storedUser = sessionStorage.getItem('user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          setUserSession(userData)
        } else {
          setUserSession(null)
        }
      } catch (error) {
        console.error('BuyBottomSheet 세션 확인 오류:', error)
        setUserSession(null)
      }
    }

    checkUserSession()

    // 카카오 로그인 이벤트 리스너
    const handleKakaoLogin = (event) => {
      setUserSession(event.detail)
    }

    const handleProfileCompleted = (event) => {
      setUserSession(event.detail)
    }

    const handleLogout = () => {
      setUserSession(null)
    }

    window.addEventListener('kakaoLoginSuccess', handleKakaoLogin)
    window.addEventListener('profileCompleted', handleProfileCompleted)
    window.addEventListener('userLoggedOut', handleLogout)

    return () => {
      window.removeEventListener('kakaoLoginSuccess', handleKakaoLogin)
      window.removeEventListener('profileCompleted', handleProfileCompleted)
      window.removeEventListener('userLoggedOut', handleLogout)
    }
  }, [])

  // Auto-add combination when all options are selected
  useEffect(() => {
    if (Object.keys(selectedOptions).length === options.length && Object.keys(selectedOptions).length > 0) {
      // Small delay to allow user to see the selection
      const timer = setTimeout(() => {
        addCombination()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [selectedOptions])

  if (!product) return null

  const {
    id,
    title,
    description,
    price,
    compare_price,
    thumbnail_url,
    stock_quantity,
    inventory, // 호환성을 위해 유지
    inventory_quantity, // 호환성을 위해 유지
    options: rawOptions = [],
    minOrder = 1,
    maxOrder = (stock_quantity || inventory || inventory_quantity || 50)
  } = product

  // Process options to handle combination format
  const options = rawOptions.map(option => {
    // If option name is "조합" (combination), split into individual options
    if (option.name === '조합') {
      // Parse combination values like "xs × 블랙" into separate size and color options
      const sizeValues = []
      const colorValues = []

      option.values.forEach(value => {
        const name = typeof value === 'string' ? value : value.name
        if (name.includes('×')) {
          const [size, color] = name.split('×').map(s => s.trim())
          if (size && !sizeValues.includes(size)) sizeValues.push(size)
          if (color && !colorValues.includes(color)) colorValues.push(color)
        }
      })

      // Return both size and color as separate options
      return [
        {
          name: '사이즈',
          values: sizeValues
        },
        {
          name: '색상',
          values: colorValues
        }
      ]
    }
    return option
  }).flat() // Flatten in case we split combination into multiple options

  const stock = stock_quantity || inventory || inventory_quantity || 0
  const originalPrice = compare_price
  const image = thumbnail_url

  // 옵션 조합 생성 함수
  // Get inventory for current selected options
  const getSelectedOptionInventory = () => {
    if (!options || options.length === 0) {
      return stock
    }

    // If not all options are selected, return 0
    if (Object.keys(selectedOptions).length !== options.length) {
      return 0
    }

    let minInventory = Infinity

    // Find minimum inventory from selected options
    for (const option of options) {
      const selectedValue = selectedOptions[option.name]
      if (!selectedValue) continue

      const valueObj = option.values.find(val => {
        const displayValue = typeof val === 'string' ? val : val?.name || val?.value || String(val)
        return displayValue === selectedValue
      })

      if (valueObj && typeof valueObj === 'object' && valueObj.inventory !== undefined) {
        minInventory = Math.min(minInventory, valueObj.inventory)
      } else {
        minInventory = Math.min(minInventory, stock)
      }
    }

    return minInventory === Infinity ? stock : minInventory
  }

  // variant_id 찾기 함수
  const findVariantId = (selectedOptions) => {
    if (!product.variants || product.variants.length === 0) {
      return null
    }

    // 선택된 옵션과 일치하는 variant 찾기
    const matchedVariant = product.variants.find(variant => {
      if (!variant.options || variant.options.length === 0) return false

      // 모든 옵션이 일치하는지 확인
      return Object.entries(selectedOptions).every(([optionName, optionValue]) => {
        return variant.options.some(
          opt => opt.optionName === optionName && opt.optionValue === optionValue
        )
      })
    })

    return matchedVariant ? matchedVariant.id : null
  }

  // 총 수량과 총 가격 계산
  // Add current selection to combinations
  const addCombination = () => {
    if (Object.keys(selectedOptions).length === options.length) {
      const combinationKey = Object.values(selectedOptions).join(' / ')
      const variantId = findVariantId(selectedOptions) // variant_id 찾기
      const existingIndex = selectedCombinations.findIndex(combo => combo.key === combinationKey)

      if (existingIndex >= 0) {
        // Update existing combination
        const updated = [...selectedCombinations]
        updated[existingIndex].quantity += quantity
        setSelectedCombinations(updated)
      } else {
        // Add new combination
        setSelectedCombinations(prev => [...prev, {
          key: combinationKey,
          options: { ...selectedOptions },
          quantity: quantity,
          price: price,
          variantId: variantId // variant_id 저장
        }])
      }

      // Reset for next selection
      setSelectedOptions({})
      setQuantity(1)
    }
  }

  // Remove combination
  const removeCombination = (index) => {
    setSelectedCombinations(prev => prev.filter((_, i) => i !== index))
  }

  // Update combination quantity
  const updateCombinationQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      removeCombination(index)
      return
    }

    setSelectedCombinations(prev => {
      const updated = [...prev]
      updated[index].quantity = newQuantity
      return updated
    })
  }

  // Calculate totals based on combinations or single selection
  const totalQuantity = selectedCombinations.length > 0
    ? selectedCombinations.reduce((sum, combo) => sum + combo.quantity, 0)
    : (options.length > 0
        ? (Object.keys(selectedOptions).length === options.length ? quantity : 0)
        : quantity)
  const totalPrice = selectedCombinations.length > 0
    ? selectedCombinations.reduce((sum, combo) => sum + (combo.price * combo.quantity), 0)
    : (price * totalQuantity)
  const discount = originalPrice ? originalPrice - price : 0

  // TODO: Connect to real wishlist API
  // TODO: Add option validation before purchase
  // TODO: Implement quantity input with keyboard
  // TODO: Add shipping calculator
  // TODO: Show related products section

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < minOrder || newQuantity > maxOrder || newQuantity > stock) {
      return
    }
    setQuantity(newQuantity)
  }

  const handleOptionQuantityChange = (optionKey, newQuantity) => {
    const combo = optionCombinations.find(c => c.key === optionKey)
    const maxQuantity = combo ? combo.inventory : stock

    if (newQuantity < 0 || newQuantity > maxQuantity) {
      return
    }
    setOptionQuantities(prev => ({
      ...prev,
      [optionKey]: newQuantity
    }))
  }

  const handleOptionSelect = (optionId, value) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionId]: value
    }))
  }

  const handleAddToCart = async (shouldClose = true) => {
    // 이미 처리 중이면 중복 실행 방지
    if (isLoading) {
      console.log('이미 처리 중입니다')
      return
    }

    const currentUser = userSession || user
    const isUserLoggedIn = userSession || isAuthenticated

    if (!isUserLoggedIn) {
      toast.error('로그인이 필요합니다')
      router.push('/login')
      onClose()
      return
    }

    console.log('BuyBottomSheet 장바구니 담기 클릭됨') // 디버깅

    // 사용자 정보 확인
    const userProfile = {
      name: currentUser?.name || '사용자',
      phone: currentUser?.phone || '',
      address: currentUser?.address || '',
      detail_address: currentUser?.detail_address || ''
    }

    // Handle multiple combinations or single selection
    let cartItems = []

    if (selectedCombinations.length > 0) {
      // Multiple combinations selected
      selectedCombinations.forEach(combo => {
        cartItems.push({
          ...product,
          quantity: combo.quantity,
          selectedOptions: combo.options,
          totalPrice: combo.price * combo.quantity,
          optionLabel: combo.key,
          variantId: combo.variantId // variant_id 전달
        })
      })
    } else if (options.length > 0 && Object.keys(selectedOptions).length === options.length) {
      // Single option combination
      const optionLabel = Object.values(selectedOptions).join(' / ')
      const variantId = findVariantId(selectedOptions) // variant_id 찾기
      cartItems.push({
        ...product,
        quantity,
        selectedOptions,
        totalPrice,
        optionLabel,
        variantId // variant_id 전달
      })
    } else if (options.length === 0) {
      // No options
      cartItems.push({
        ...product,
        quantity,
        selectedOptions: {},
        totalPrice
      })
    }

    console.log('장바구니 항목들:', cartItems) // 디버깅
    console.log('사용자 프로필:', userProfile) // 디버깅

    setIsLoading(true) // 로딩 시작

    try {
      // 각 아이템에 대해 재고 검증 및 주문 생성
      const createdOrders = []

      for (const cartItem of cartItems) {
        // 옵션별 재고 검증 (프론트엔드 1차 검증)
        if (cartItem.selectedOptions && Object.keys(cartItem.selectedOptions).length > 0) {
          const inventoryCheck = await checkOptionInventory(cartItem.id, cartItem.selectedOptions)

          if (!inventoryCheck.available) {
            toast.error(`"${cartItem.optionLabel}" 옵션이 품절되었습니다`)
            setIsLoading(false)
            return false
          }

          if (inventoryCheck.inventory < cartItem.quantity) {
            toast.error(`"${cartItem.optionLabel}" 옵션 재고가 부족합니다. (재고: ${inventoryCheck.inventory}개)`)
            setIsLoading(false)
            return false
          }
        }

        const orderData = {
          ...cartItem,
          orderType: 'cart'
        }

        console.log(`주문 생성 중: ${cartItem.optionLabel || '기본'} - ${cartItem.quantity}개`)

        // 옵션이 있으면 createOrderWithOptions 사용, 없으면 createOrder 사용
        const newOrder = cartItem.selectedOptions && Object.keys(cartItem.selectedOptions).length > 0
          ? await createOrderWithOptions(orderData, userProfile)
          : await createOrder(orderData, userProfile)

        createdOrders.push(newOrder)
      }

      console.log('생성된 주문들:', createdOrders) // 디버깅

      // 재고 차감은 서버에서 처리되어야 함

      // 주문 업데이트 이벤트 발생 (재고 업데이트용)
      console.log('주문 목록 업데이트 이벤트 발생 (BuyBottomSheet)')
      createdOrders.forEach(order => {
        window.dispatchEvent(new CustomEvent('orderUpdated', {
          detail: {
            action: 'add',
            order: {
              ...order,
              items: [{
                id: product.id,
                product_id: product.id,
                quantity: totalQuantity
              }]
            }
          }
        }))
      })

      if (shouldClose) {
        onClose()
      }
      return true // 성공 시 true 반환
    } catch (error) {
      console.error('주문 생성 실패:', error)
      toast.error('장바구니 추가에 실패했습니다')
      throw error // 에러를 다시 throw
    } finally {
      setIsLoading(false) // 로딩 종료
    }
  }

  const handleBuyNow = async () => {
    const currentUser = userSession || user
    const isUserLoggedIn = userSession || isAuthenticated

    console.log('🛒 구매하기 버튼 클릭됨')
    console.log('🔐 인증 상태:', isUserLoggedIn)

    if (!isUserLoggedIn) {
      console.log('❌ 로그인 필요')
      toast.error('로그인이 필요합니다')
      router.push('/login')
      onClose()
      return
    }

    console.log('✅ 인증 완료, 장바구니 추가 시작')

    try {
      // 장바구니에 추가
      const success = await handleAddToCart(false)

      if (success) {
        console.log('🎯 장바구니 추가 성공, BottomSheet 닫고 모달 표시')

        // BottomSheet 먼저 닫기
        onClose()

        // 잠깐 딜레이 후 모달 표시 (애니메이션 완료 후)
        setTimeout(() => {
          setShowChoiceModal(true)
        }, 300)
      }
    } catch (error) {
      console.error('장바구니 추가 실패:', error)
      // 에러가 발생해도 BottomSheet는 닫기
      onClose()
    }
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
    // ✨ 토스트 제거: 찜 상태 변경은 하트 아이콘 색상 변경으로 이미 확인 가능
  }

  // 더 주문하기 - 홈으로 이동
  const handleMoreOrders = () => {
    setShowChoiceModal(false)
    onClose()
    router.push('/')
  }

  // 이것만 주문하기 - 주문내역으로 이동
  const handleOrderHistoryOnly = () => {
    setShowChoiceModal(false)
    onClose()
    router.push('/orders')
  }

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        showHandle={true}
      >
        {/* 스크롤 가능한 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-4">
            {/* Product Info */}
            <div className="flex gap-4">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={image}
                  alt={title}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                  {title}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-red-500">
                    ₩{price.toLocaleString()}
                  </span>
                  {originalPrice && (
                    <span className="text-sm text-gray-400 line-through">
                      ₩{originalPrice.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Product Description */}
            {description && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
              </div>
            )}

            {/* Step-by-step Options Selection */}
            {options.length > 0 ? (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">옵션 선택</h4>

                {/* Sequential option selection */}
                <div className="space-y-4">
                  {options.map((option, index) => {
                    // Show current option only if previous options are selected
                    const shouldShow = index === 0 || Object.keys(selectedOptions).length >= index

                    if (!shouldShow) return null

                    return (
                      <div key={index} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {option.name}
                          {selectedOptions[option.name] && (
                            <span className="ml-2 text-xs text-red-600">
                              선택됨: {selectedOptions[option.name]}
                            </span>
                          )}
                        </label>
                        <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                          {option.values.map((value, valueIndex) => {
                            // Handle both string and object values
                            const displayValue = typeof value === 'string' ? value : value?.name || value?.value || String(value)
                            const keyValue = typeof value === 'string' ? value : value?.name || value?.value || valueIndex
                            const inventory = typeof value === 'object' ? (value?.inventory ?? stock) : stock
                            const isSoldOut = inventory === 0

                            return (
                              <button
                                key={keyValue}
                                onClick={() => {
                                  if (isSoldOut) return // 품절된 옵션은 선택 불가

                                  setSelectedOptions(prev => {
                                    const newSelected = { ...prev }

                                    // If selecting a different value for current option, clear subsequent options
                                    if (newSelected[option.name] !== displayValue) {
                                      // Clear all options after the current one
                                      options.slice(index + 1).forEach(laterOption => {
                                        delete newSelected[laterOption.name]
                                      })
                                    }

                                    newSelected[option.name] = displayValue
                                    return newSelected
                                  })
                                }}
                                disabled={isSoldOut}
                                className={`p-2 text-sm border rounded-lg transition-colors relative ${
                                  isSoldOut
                                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : selectedOptions[option.name] === displayValue
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                }`}
                              >
                                <div className="flex flex-col items-center">
                                  <span className={isSoldOut ? 'line-through' : ''}>{displayValue}</span>
                                  {typeof value === 'object' && value?.inventory !== undefined && (
                                    <span className={`text-xs mt-0.5 ${
                                      isSoldOut
                                        ? 'text-red-500 font-medium'
                                        : inventory < 5
                                        ? 'text-orange-500'
                                        : 'text-gray-500'
                                    }`}>
                                      {isSoldOut ? '품절' : `${inventory}개`}
                                    </span>
                                  )}
                                </div>
                              </button>
                            )
                          })}
                        </div>

                        {/* Show "다음 단계" indicator */}
                        {selectedOptions[option.name] && index < options.length - 1 && (
                          <div className="text-xs text-gray-500 mt-2">
                            👇 다음으로 {options[index + 1].name}를 선택해주세요
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Selected combinations list */}
                {selectedCombinations.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-medium text-gray-900">선택된 옵션들</h5>
                    {selectedCombinations.map((combo, index) => (
                      <div key={combo.key} className="border border-gray-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">{combo.key}</span>
                          <span className="text-sm text-gray-500">
                            ₩{(combo.price * combo.quantity).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center border border-gray-300 rounded-lg">
                            <button
                              onClick={() => updateCombinationQuantity(index, combo.quantity - 1)}
                              className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors"
                            >
                              <MinusIcon className="h-4 w-4" />
                            </button>
                            <span className="px-4 py-2 font-medium min-w-[60px] text-center">
                              {combo.quantity}
                            </span>
                            <button
                              onClick={() => updateCombinationQuantity(index, combo.quantity + 1)}
                              className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeCombination(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            제거
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Auto-selection feedback */}
                {Object.keys(selectedOptions).length === options.length && selectedCombinations.length === 0 && (
                  <div className="border border-dashed border-blue-200 bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-blue-700 font-medium mb-1">
                      {Object.values(selectedOptions).join(' / ')} 선택됨
                    </div>
                    <div className="text-sm text-blue-600">
                      잠시 후 자동으로 추가됩니다...
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">총 수량</span>
                    <span className="font-medium">{totalQuantity}개</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-lg text-gray-900">총 금액</span>
                    <span className="font-bold text-lg text-red-500">
                      ₩{totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* 옵션이 없는 경우 기존 수량 선택 */
              <div>
                <h4 className="font-medium text-gray-900 mb-3">수량</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= minOrder}
                      className="p-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-lg transition-colors"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span className="px-4 py-3 font-medium min-w-[60px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= Math.min(maxOrder, stock)}
                      className="p-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-lg transition-colors"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">재고: {stock}개</p>
                    <p className="text-lg font-bold text-gray-900">
                      ₩{totalPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Discount Info */}
            {discount > 0 && totalQuantity > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-orange-50 border border-orange-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-center">
                  <span className="text-orange-700 font-medium">할인 혜택</span>
                  <span className="text-orange-700 font-bold">
                    -₩{(discount * totalQuantity).toLocaleString()}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Stock Warning */}
            {stock < 10 && stock > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <p className="text-yellow-700 text-sm font-medium">
                  ⚠️ 품절 임박! 남은 수량: {stock}개
                </p>
              </div>
            )}

            {/* Out of Stock */}
            {stock === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-red-700 font-medium">일시 품절</p>
                <p className="text-red-600 text-sm">재입고 알림을 설정하세요</p>
              </div>
            )}
          </div>
        </div>

        {/* 고정 버튼 영역 */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
          <Button
            onClick={handleBuyNow}
            disabled={stock === 0 || isLoading || totalQuantity === 0}
            fullWidth
          >
            {isLoading ? '처리 중...' : totalQuantity === 0 ? '수량을 선택해주세요' : '구매하기'}
          </Button>
        </div>
      </BottomSheet>

      {/* Purchase Choice Modal */}
      <PurchaseChoiceModal
        isOpen={showChoiceModal}
        onClose={() => setShowChoiceModal(false)}
        onMoreOrders={handleMoreOrders}
        onOrderHistoryOnly={handleOrderHistoryOnly}
      />
    </>
  )
}