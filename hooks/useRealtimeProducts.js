'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getProducts } from '@/lib/supabaseApi'

// 캐시 객체 (5분 캐시)
let productsCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5분
}

export default function useRealtimeProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // 초기 데이터 로드
    loadProducts()

    // 주문 업데이트 이벤트 리스너 추가 (강제 새로고침)
    const handleOrderUpdated = (event) => {
      console.log('🔄 주문 업데이트 감지 - 강제 새로고침', event.detail)
      loadProducts(true) // 주문이 생성/취소/수정되면 캐시 무시하고 강제 새로고침
    }

    window.addEventListener('orderUpdated', handleOrderUpdated)

    // 정리 함수
    return () => {
      console.log('🧹 이벤트 리스너 해제')
      window.removeEventListener('orderUpdated', handleOrderUpdated)
    }
  }, [])

  const loadProducts = async (forceRefresh = false) => {
    try {
      setError(null)

      // 캐시 체크 (강제 새로고침이 아닐 때만)
      if (!forceRefresh && productsCache.data && productsCache.timestamp) {
        const now = Date.now()
        const isValid = (now - productsCache.timestamp) < productsCache.ttl

        if (isValid) {
          console.log('🎯 캐시된 상품 데이터 사용 (', Math.round((productsCache.ttl - (now - productsCache.timestamp)) / 1000), '초 남음)')
          setProducts(productsCache.data)
          setLoading(false)
          return
        }
      }

      console.log('🔄 새로운 상품 데이터 로드 중...')
      setLoading(true)

      const data = await getProducts()

      // 캐시 업데이트
      productsCache = {
        data: data,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000
      }

      setProducts(data)
      console.log('📦 상품 데이터 로드 완료:', data.length, '개 (캐시 업데이트)')
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