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

    // Supabase 실시간 구독 설정
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모든 이벤트 감지
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('🔄 상품 데이터 변경 감지:', payload)

          // 데이터 변경 시 전체 상품 목록 새로고침
          loadProducts()

          // 커스텀 이벤트 발생시켜 다른 컴포넌트에 알림
          switch (payload.eventType) {
            case 'INSERT':
              window.dispatchEvent(new CustomEvent('productAdded', { detail: payload.new }))
              break
            case 'UPDATE':
              window.dispatchEvent(new CustomEvent('productUpdated', { detail: payload.new }))
              // 라이브 상태 변경 감지
              if (payload.old?.is_live !== payload.new?.is_live) {
                window.dispatchEvent(new CustomEvent('productLiveStatusChanged', { detail: payload.new }))
              }
              break
            case 'DELETE':
              window.dispatchEvent(new CustomEvent('productDeleted', { detail: payload.old }))
              break
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ 상품 실시간 구독 시작됨')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ 상품 실시간 구독 오류')
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ 상품 실시간 구독 타임아웃')
        }
      })

    // 정리 함수
    return () => {
      console.log('🧹 상품 실시간 구독 해제')
      supabase.removeChannel(channel)
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