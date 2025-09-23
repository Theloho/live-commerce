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

    // 주문 업데이트 이벤트 리스너 추가
    const handleOrderUpdated = (event) => {
      console.log('🔄 주문 업데이트 감지 - 제품 목록 새로고침', event.detail)
      loadProducts() // 주문이 생성/취소/수정되면 제품 목록 새로고침
    }

    const handleWindowFocus = () => {
      console.log('🔄 창 포커스 감지 - 제품 목록 새로고침')
      loadProducts() // 창이 포커스되면 최신 데이터로 새로고침
    }

    window.addEventListener('orderUpdated', handleOrderUpdated)
    window.addEventListener('focus', handleWindowFocus)

    // 정리 함수
    return () => {
      console.log('🧹 이벤트 리스너 해제')
      window.removeEventListener('orderUpdated', handleOrderUpdated)
      window.removeEventListener('focus', handleWindowFocus)
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