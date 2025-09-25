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
import { createOrder } from '@/lib/supabaseApi'
import toast from 'react-hot-toast'

export default function BuyBottomSheet({ isOpen, onClose, product }) {
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState({})
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
    options = [],
    minOrder = 1,
    maxOrder = (stock_quantity || inventory || inventory_quantity || 50)
  } = product

  const stock = stock_quantity || inventory || inventory_quantity || 0
  const originalPrice = compare_price
  const image = thumbnail_url

  const totalPrice = price * quantity
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
      phone: currentUser?.phone || '010-0000-0000',
      address: currentUser?.address || '기본주소',
      detail_address: currentUser?.detail_address || ''
    }

    const cartItem = {
      ...product,
      quantity,
      selectedOptions,
      totalPrice
    }

    console.log('장바구니 항목:', cartItem) // 디버깅
    console.log('사용자 프로필:', userProfile) // 디버깅

    setIsLoading(true) // 로딩 시작

    try {
      // 모든 사용자 (카카오/일반) 통합 처리
      const orderData = {
        ...cartItem,
        orderType: 'cart'
      }
      const newOrder = await createOrder(orderData, userProfile)
      console.log('생성된 주문:', newOrder) // 디버깅

      // 재고 차감은 서버에서 처리되어야 함

      // 주문 업데이트 이벤트 발생 (재고 업데이트용)
      console.log('주문 목록 업데이트 이벤트 발생 (BuyBottomSheet)')
      window.dispatchEvent(new CustomEvent('orderUpdated', {
        detail: {
          action: 'add',
          order: {
            ...newOrder,
            items: [{
              id: product.id,
              product_id: product.id,
              quantity: quantity
            }]
          }
        }
      }))

      if (shouldClose) {
        onClose()
      }
    } catch (error) {
      console.error('주문 생성 실패:', error)
      toast.error('장바구니 추가에 실패했습니다')
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
      await handleAddToCart(false)
      console.log('🎯 장바구니 추가 성공, BottomSheet 닫고 모달 표시')

      // BottomSheet 먼저 닫기
      onClose()

      // 잠깐 딜레이 후 모달 표시 (애니메이션 완료 후)
      setTimeout(() => {
        setShowChoiceModal(true)
      }, 300)
    } catch (error) {
      console.error('장바구니 추가 실패:', error)
      // 오류가 발생해도 모달은 표시
      onClose()
      setTimeout(() => {
        setShowChoiceModal(true)
      }, 300)
    }
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
    toast.success(isLiked ? '찜 목록에서 삭제되었습니다' : '찜 목록에 추가되었습니다')
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

            {/* Options */}
            {options.length > 0 && (
              <div className="space-y-4">
                {options.map((option) => (
                  <div key={option.id}>
                    <h4 className="font-medium text-gray-900 mb-2">{option.name}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {option.values.map((value) => (
                        <button
                          key={value}
                          onClick={() => handleOptionSelect(option.id, value)}
                          className={`
                            px-4 py-2 border rounded-lg text-sm font-medium transition-colors
                            ${selectedOptions[option.id] === value
                              ? 'border-red-500 text-red-500 bg-red-50'
                              : 'border-gray-300 text-gray-700 hover:border-gray-400'
                            }
                          `}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity */}
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

            {/* Discount Info */}
            {discount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-orange-50 border border-orange-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-center">
                  <span className="text-orange-700 font-medium">할인 혜택</span>
                  <span className="text-orange-700 font-bold">
                    -₩{(discount * quantity).toLocaleString()}
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
            disabled={stock === 0 || isLoading}
            fullWidth
          >
            {isLoading ? '처리 중...' : '구매하기'}
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