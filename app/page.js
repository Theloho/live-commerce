'use client'

import { useState, useEffect } from 'react'
import HomeClient from './components/HomeClient'

// ⚡ Clean Architecture: API Route를 통한 상품 데이터 fetch
async function getProducts() {
  try {
    console.log('🏠 클라이언트: 상품 데이터 로드 중...')

    const response = await fetch('/api/products/list?status=active&isLive=true&page=1&pageSize=50')

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '상품 조회 실패')
    }

    const result = await response.json()

    if (!result.success || !result.products || result.products.length === 0) {
      console.log('📦 클라이언트: 상품 데이터 없음')
      return []
    }

    console.log('✅ 클라이언트: 상품 로딩 완료:', result.products.length, '개')

    const productsFormatted = result.products.map(product => ({
      ...product,
      stock_quantity: product.inventory,
      isLive: product.is_live_active || false
    }))

    return productsFormatted
  } catch (error) {
    console.error('클라이언트: 상품 데이터 로드 오류:', error)
    return []
  }
}

// ⚡ Client Component (ISR 제거 - Vercel 빌드 성공 위해)
export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProducts = async () => {
      const data = await getProducts()
      setProducts(data)
      setLoading(false)
    }

    loadProducts()
  }, [])

  if (loading) {
    return <HomeClient initialProducts={[]} />
  }

  return <HomeClient initialProducts={products} />
}
