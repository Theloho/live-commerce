/**
 * ProductInfo - 상품 정보 표시 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * 역할: BuyBottomSheet 상단의 상품 정보 표시
 * - 상품 이미지
 * - 제품번호 + 상품명
 * - 가격 (할인가 + 정가)
 * - 상품 설명 (optional)
 * - 닫기 버튼
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

import Image from 'next/image'

/**
 * ProductInfo Component
 * @param {Object} props
 * @param {Object} props.product - 상품 데이터
 * @param {string} props.image - 상품 이미지 URL
 * @param {string} props.title - 상품명
 * @param {number} props.price - 판매가
 * @param {number} props.originalPrice - 정가 (할인 전)
 * @param {string} props.description - 상품 설명
 * @param {Function} props.onClose - 닫기 핸들러
 */
export default function ProductInfo({
  product,
  image,
  title,
  price,
  originalPrice,
  description,
  onClose
}) {
  return (
    <>
      {/* Product Header */}
      <div className="flex gap-4">
        {/* 상품 이미지 */}
        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={image}
            alt={title}
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>

        {/* 제품번호 + 상품명 + 가격 */}
        <div className="flex-1 min-w-0">
          {/* 제품번호 + 상품명 (한 줄) */}
          <h3 className="mb-1 line-clamp-1">
            <span className="font-bold text-gray-900">
              {product.product_number || product.id}
            </span>
            {title && title !== (product.product_number || product.id) && (
              <span className="text-sm text-gray-500"> {title}</span>
            )}
          </h3>

          {/* 가격 */}
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

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Product Description */}
      {description && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            {description}
          </p>
        </div>
      )}
    </>
  )
}
