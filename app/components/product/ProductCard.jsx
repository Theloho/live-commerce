'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBagIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import useCartStore from '@/app/stores/cartStore'
import useAuth from '@/hooks/useAuth'
// Mock functions removed - will implement real Supabase functions
import BuyBottomSheet from '@/app/components/product/BuyBottomSheet'
import PurchaseChoiceModal from '@/app/components/common/PurchaseChoiceModal'
import toast from 'react-hot-toast'

export default function ProductCard({ product, variant = 'default', priority = false }) {
  const [imageError, setImageError] = useState(false)
  const [showBuySheet, setShowBuySheet] = useState(false)
  const [showChoiceModal, setShowChoiceModal] = useState(false)
  const [currentInventory, setCurrentInventory] = useState(product.inventory_quantity || 0)
  const { addItem } = useCartStore()
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  // 재고 정보 - 상품 데이터에서 직접 사용
  useEffect(() => {
    setCurrentInventory(product.inventory_quantity || 0)
  }, [product.inventory_quantity])

  const {
    id,
    title,
    price,
    compare_price: originalPrice,
    thumbnail_url: image,
    review_rating: rating,
    review_count: reviewCount,
    is_featured,
    badge,
    freeShipping,
    seller,
    isLive
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

    // 품절 체크
    if (currentInventory <= 0) {
      toast.error('죄송합니다. 해당 상품이 품절되었습니다')
      return
    }

    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다')
      router.push('/login')
      return
    }

    // 장바구니에 추가
    addItem(product)
    toast.success('장바구니에 추가되었습니다')
  }

  const handleDirectPurchase = (e) => {
    e.preventDefault()
    e.stopPropagation()

    // 품절 체크
    if (currentInventory <= 0) {
      toast.error('죄송합니다. 해당 상품이 품절되었습니다')
      return
    }

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

    // 품절 체크
    if (currentInventory <= 0) {
      toast.error('죄송합니다. 해당 상품이 품절되었습니다')
      return
    }

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
        whileHover={currentInventory > 0 ? { y: -4 } : {}}
        transition={{ duration: 0.2 }}
        onClick={currentInventory > 0 ? handleBuyClick : undefined}
        className={currentInventory > 0 ? "cursor-pointer" : "cursor-not-allowed"}
      >
        <div className={`${variants[variant]} ${currentInventory <= 0 ? 'opacity-60 grayscale' : ''}`}>
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

              {/* 좌측 배지 - 재고 관련 */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {/* 품절 배지 */}
                {currentInventory <= 0 && (
                  <span className="inline-flex items-center px-2 py-1 bg-gray-500 text-white text-xs font-bold rounded">
                    품절
                  </span>
                )}
                {/* 품절임박 배지 */}
                {currentInventory > 0 && currentInventory <= 5 && (
                  <span className="inline-flex items-center px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                    품절임박
                  </span>
                )}
              </div>

              {/* 우측 배지 - 마케팅/프로모션 관련 */}
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                {isLive && (
                  <div className="relative">
                    <span className="inline-flex items-center px-2 py-1 bg-red-500 text-white text-xs font-bold rounded shadow-lg animate-pulse">
                      <div className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-ping"></div>
                      🔴 LIVE
                    </span>
                    {/* 라이브 글로우 효과 */}
                    <div className="absolute inset-0 bg-red-500 rounded blur-sm opacity-30 animate-pulse"></div>
                  </div>
                )}
                {badge && (
                  <span className="inline-flex items-center px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">
                    {badge}
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


            {/* Quick Actions */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={currentInventory > 0 ? handleDirectPurchase : undefined}
                disabled={currentInventory <= 0}
                className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentInventory <= 0
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {currentInventory <= 0 ? '품절' : '구매하기'}
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