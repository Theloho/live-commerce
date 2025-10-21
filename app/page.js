'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import HomeClient from './components/HomeClient'

// ⚡ 클라이언트에서 상품 데이터 fetch (Vercel 빌드 timeout 방지)
async function getProducts() {
  try {
    console.log('🏠 클라이언트: 상품 데이터 로드 중...')

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        title,
        product_number,
        price,
        compare_price,
        thumbnail_url,
        inventory,
        status,
        is_featured,
        is_live_active,
        created_at
      `)
      .eq('status', 'active')
      .eq('is_live_active', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('클라이언트: 상품 조회 오류:', error)
      return []
    }

    if (!data || data.length === 0) {
      console.log('📦 클라이언트: 상품 데이터 없음')
      return []
    }

    console.log('✅ 클라이언트: 상품 로딩 완료:', data.length, '개')

    const productsFormatted = data.map(product => ({
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
