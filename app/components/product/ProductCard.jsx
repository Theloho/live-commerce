'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBagIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import useCartStore from '@/app/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'
import { createMockOrder } from '@/lib/mockAuth'
import BuyBottomSheet from '@/app/components/product/BuyBottomSheet'
import PurchaseChoiceModal from '@/app/components/common/PurchaseChoiceModal'
import toast from 'react-hot-toast'

export default function ProductCard({ product, variant = 'default', priority = false }) {
  const [imageError, setImageError] = useState(false)
  const [showBuySheet, setShowBuySheet] = useState(false)
  const [showChoiceModal, setShowChoiceModal] = useState(false)
  const { addItem } = useCartStore()
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  const {
    id,
    title,
    price,
    compare_price: originalPrice,
    thumbnail_url: image,
    review_rating: rating,
    review_count: reviewCount,
    is_featured: isLive,
    badge,
    freeShipping,
    seller
  } = product

  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0

  // TODO: Implement lazy loading for images
  // TODO: Add skeleton loading state
  // TODO: Implement quick view modal
  // TODO: Add swipe gestures for mobile image gallery

  const handleAddToCart = (e) => {
    e.preventDefault()

    console.log('장바구니 버튼 클릭됨') // 디버깅

    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다')
      router.push('/login')
      return
    }

    console.log('사용자 인증됨, user:', user) // 디버깅

    // 사용자 정보 확인 - 기본값으로 처리
    const userProfile = {
      name: user?.user_metadata?.name || '사용자',
      phone: user?.user_metadata?.phone || '010-0000-0000',
      address: user?.user_metadata?.address || '기본주소',
      detail_address: user?.user_metadata?.detail_address || ''
    }

    console.log('사용자 프로필:', userProfile) // 디버깅

    // 기본 수량 1개로 주문 항목 생성
    const orderItem = {
      ...product,
      quantity: 1,
      selectedOptions: {},
      totalPrice: product.price
    }

    console.log('주문 항목:', orderItem) // 디버깅

    try {
      // pending 상태로 주문 생성 (장바구니 역할)
      const newOrder = createMockOrder(orderItem, userProfile, 'cart')
      console.log('생성된 주문:', newOrder) // 디버깅

      // localStorage 확인
      const savedOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
      console.log('localStorage에 저장된 주문들:', savedOrders)

      // 선택 모달에서 호출될 때는 토스트 표시 안함
      if (!showChoiceModal) {
        toast.success('장바구니에 추가되었습니다')
      }

      // 주문 내역 페이지가 열려있다면 새로고침을 위해 커스텀 이벤트 발생
      console.log('주문 목록 업데이트 이벤트 발생')
      window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { action: 'add', order: newOrder } }))
    } catch (error) {
      console.error('주문 생성 실패:', error)
      toast.error('주문 생성에 실패했습니다')
    }
  }

  const handleDirectPurchase = (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다')
      router.push('/login')
      return
    }

    // 먼저 장바구니에 추가
    handleAddToCart(e)

    // 그 다음 선택 모달 표시
    setShowChoiceModal(true)
  }

  const handleBuyClick = (e) => {
    e.preventDefault()

    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다')
      router.push('/login')
      return
    }

    setShowBuySheet(true)
  }

  // 더 주문하기 - 홈으로 이동
  const handleMoreOrders = () => {
    setShowChoiceModal(false)
    router.push('/')
  }

  // 이것만 주문하기 - 주문내역으로 이동
  const handleOrderHistoryOnly = () => {
    setShowChoiceModal(false)
    router.push('/orders')
  }

  const variants = {
    default: 'group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow',
    compact: 'group relative bg-white rounded-lg overflow-hidden',
    horizontal: 'group relative bg-white rounded-lg overflow-hidden flex'
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        onClick={handleBuyClick}
        className="cursor-pointer"
      >
        <div className={variants[variant]}>
          {/* Image Section */}
          <div className={variant === 'horizontal' ? 'w-1/3' : 'relative aspect-[3/4]'}>
            <div className="relative w-full h-full">
              {!imageError && image ? (
                <Image
                  src={image}
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  priority={priority}
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <ShoppingBagIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {isLive && (
                  <span className="inline-flex items-center px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                    LIVE
                  </span>
                )}
                {badge && (
                  <span className="inline-flex items-center px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">
                    {badge}
                  </span>
                )}
                {/* 품절임박 배지 - 재고가 5개 이하일 때 */}
                {product.inventory_quantity && product.inventory_quantity <= 5 && (
                  <span className="inline-flex items-center px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded">
                    품절임박
                  </span>
                )}
                {discount > 0 && (
                  <span className="inline-flex items-center px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded">
                    {discount}%
                  </span>
                )}
              </div>

            </div>
          </div>

          {/* Content Section */}
          <div className={variant === 'horizontal' ? 'flex-1 p-4' : 'p-4'}>
            {/* Title */}
            <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
              {title}
            </h3>


            {/* Price */}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-lg font-bold text-gray-900">
                ₩{price.toLocaleString()}
              </span>
              {originalPrice && (
                <span className="text-sm text-gray-400 line-through">
                  ₩{originalPrice.toLocaleString()}
                </span>
              )}
            </div>


            {/* Quick Actions - Desktop only */}
            <div className="hidden sm:flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleDirectPurchase}
                className="w-full px-3 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
              >
                구매하기
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Buy Bottom Sheet */}
      <BuyBottomSheet
        isOpen={showBuySheet}
        onClose={() => setShowBuySheet(false)}
        product={product}
      />

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