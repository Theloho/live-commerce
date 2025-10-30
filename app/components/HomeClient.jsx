'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useAuth from '@/hooks/useAuth'
import Header from './layout/Header'
import ProductGrid from './product/ProductGrid'
import MobileNav from './layout/MobileNav'

export default function HomeClient({ initialProducts }) {
  const [products, setProducts] = useState(initialProducts)
  const [userSession, setUserSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    checkUserSession()
  }, [])

  // ⚡ 실시간 재고 업데이트: 15초마다 라이브 상품 Polling
  useEffect(() => {
    let interval

    const updateLiveProducts = async () => {
      // Page Visibility API: 다른 탭 보면 생략
      if (document.hidden) return

      try {
        const res = await fetch('/api/products/live')
        const data = await res.json()

        if (data.success && data.products) {
          setProducts(data.products)
        }
      } catch (error) {
        console.error('❌ 라이브 상품 업데이트 실패:', error)
        // 에러 발생해도 기존 데이터 유지 (안정성)
      }
    }

    // 15초마다 업데이트 (페이지 보고 있을 때만 실행)
    interval = setInterval(updateLiveProducts, 15000)

    // cleanup
    return () => clearInterval(interval)
  }, [])

  // 직접 세션 확인 (모바일 최적화)
  const checkUserSession = async () => {
    try {
      // 📱 모바일: sessionStorage 접근 가능 여부 확인
      if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
        setUserSession(null)
        setSessionLoading(false)
        return
      }

      const storedUser = sessionStorage.getItem('user')

      if (storedUser) {
        const userData = JSON.parse(storedUser)
        setUserSession(userData)
      } else {
        setUserSession(null)
      }
    } catch (error) {
      setUserSession(null)
    } finally {
      setSessionLoading(false)
    }
  }

  // 카카오 로그인 성공 이벤트 리스너
  useEffect(() => {
    const handleKakaoLogin = (event) => {
      const userProfile = event.detail
      setUserSession(userProfile)
    }

    const handleProfileCompleted = (event) => {
      const userProfile = event.detail
      setUserSession(userProfile)
    }

    const handleLogout = () => {
      setUserSession(null)
    }

    window.addEventListener('kakaoLoginSuccess', handleKakaoLogin)
    window.addEventListener('profileCompleted', handleProfileCompleted)
    window.addEventListener('userLoggedOut', handleLogout)

    return () => {
      window.removeEventListener('kakaoLoginSuccess', handleKakaoLogin)
      window.removeEventListener('profileCompleted', handleProfileCompleted)
      window.removeEventListener('userLoggedOut', handleLogout)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 pb-24 max-w-md mx-auto relative">
      {/* 헤더 */}
      <Header />

      {/* 메인 콘텐츠 */}
      <main className="px-4 pt-4">
        {/* 세션 로딩 중 작은 메시지 */}
        {sessionLoading && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
              <p className="text-gray-600 text-sm">세션 확인 중...</p>
            </div>
          </div>
        )}

        {/* 로그인/회원가입 배너 (비로그인 사용자만) */}
        {!sessionLoading && !userSession && !isAuthenticated && (
          <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-lg p-6 mb-6 text-white text-center">
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">allok에 오신 것을 환영합니다!</h3>
              <p className="text-red-100">로그인하고 특별한 혜택을 받아보세요</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/login')}
                className="flex-1 bg-white text-red-500 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors"
              >
                로그인
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="flex-1 bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors border border-red-400"
              >
                회원가입
              </button>
            </div>
          </div>
        )}

        {/* 로그인된 사용자 환영 메시지 */}
        {(userSession || isAuthenticated) && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-green-200">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <p className="text-gray-800">
                <span className="font-semibold text-green-600">
                  {userSession?.name || userSession?.user_metadata?.name || '사용자'}
                </span>님 환영합니다! 🎉
              </p>
            </div>
          </div>
        )}

        {/* 상품 그리드 - 15초마다 자동 업데이트 */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">🛍️ 인기 상품</h2>
          <ProductGrid products={products} />
        </div>
      </main>

      {/* 하단 네비게이션 */}
      <MobileNav />
    </div>
  )
}
