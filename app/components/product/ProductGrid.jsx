'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ProductCard from './ProductCard'

export default function ProductGrid({
  products = [],
  loading = false,
  hasMore = false,
  onLoadMore,
  variant = 'grid',
  className = ''
}) {
  const [displayedProducts, setDisplayedProducts] = useState([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // TODO: Implement virtual scrolling for better performance
  // TODO: Add filter and sort animations
  // TODO: Implement infinite scroll with intersection observer
  // TODO: Add skeleton loading states
  // TODO: Implement masonry layout option

  useEffect(() => {
    setDisplayedProducts(products)
  }, [products])

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      await onLoadMore?.()
    } finally {
      setIsLoadingMore(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  const gridClasses = {
    grid: 'grid grid-cols-2 gap-4',
    list: 'space-y-4',
    compact: 'grid grid-cols-2 gap-3'
  }

  if (loading && displayedProducts.length === 0) {
    return (
      <div className={`${gridClasses[variant]} ${className}`}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={gridClasses[variant]}
      >
        <AnimatePresence>
          {displayedProducts.map((product, index) => (
            <motion.div
              key={product.id}
              variants={itemVariants}
              layout
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <ProductCard
                product={product}
                variant={variant === 'list' ? 'horizontal' : 'default'}
                priority={index < 4}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Load More Button */}
      {hasMore && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mt-8"
        >
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                더보기...
              </div>
            ) : (
              '더보기'
            )}
          </button>
        </motion.div>
      )}

      {/* Empty State */}
      {displayedProducts.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">상품이 없습니다</h3>
          <p className="text-gray-500">다른 조건으로 검색해보세요.</p>
        </motion.div>
      )}
    </div>
  )
}