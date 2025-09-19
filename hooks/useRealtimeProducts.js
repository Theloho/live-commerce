'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getProducts } from '@/lib/supabaseApi'

export default function useRealtimeProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // 초기 데이터 로드
    loadProducts()

    // 폴링 방식으로 주기적 업데이트 (10초마다)
    const pollingInterval = setInterval(() => {
      console.log('🔄 폴링으로 상품 데이터 업데이트 체크')
      loadProducts()
    }, 10000) // 10초마다 체크

    // 정리 함수
    return () => {
      console.log('🧹 폴링 인터벌 해제')
      clearInterval(pollingInterval)
    }
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await getProducts()
      setProducts(data)

      console.log('📦 상품 데이터 로드 완료:', data.length, '개')
    } catch (err) {
      console.error('상품 데이터 로드 오류:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const refreshProducts = () => {
    loadProducts()
  }

  return {
    products,
    loading,
    error,
    refreshProducts
  }
}