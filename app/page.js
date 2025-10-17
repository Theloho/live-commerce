'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import useAuth from '@/hooks/useAuth'
import useRealtimeProducts from '@/hooks/useRealtimeProducts'
import Header from './components/layout/Header'
import ProductGrid from './components/product/ProductGrid'
import MobileNav from './components/layout/MobileNav'

export default function Home() {
  const [userSession, setUserSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const { isAuthenticated } = useAuth()
  const { products, loading, error, refreshProducts } = useRealtimeProducts()
  const router = useRouter()

  useEffect(() => {
    checkUserSession()
  }, [])

  // 직접 세션 확인 (모바일 최적화)
  const checkUserSession = async () => {
    console.log('🏠 [홈] 세션 확인 시작')
    try {
      // 📱 모바일: sessionStorage 접근 가능 여부 확인
      if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
        console.warn('⚠️ [홈] sessionStorage 사용 불가')
        setUserSession(null)
        setSessionLoading(false)
        return
      }

      const storedUser = sessionStorage.getItem('user')
      console.log('🔍 [홈] sessionStorage.getItem("user"):', storedUser ? '있음' : '없음')

      if (storedUser) {
        const userData = JSON.parse(storedUser)
        console.log('✅ [홈] sessionStorage 사용자:', userData?.id)
        setUserSession(userData)
      } else {
        console.log('⚠️ [홈] sessionStorage에 user 없음')
        setUserSession(null)
      }
    } catch (error) {
      console.error('❌ [홈] 세션 확인 오류:', error)
      setUserSession(null)
    } finally {
      console.log('✅ [홈] 세션 로딩 완료')
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

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">세션 확인 중...</p>

          {/* 🔍 모바일 디버깅 정보 */}
          <div className="mt-6 bg-white border border-gray-300 rounded-lg p-4 text-left text-xs">
            <p className="font-bold mb-2 text-blue-600">🏠 홈 로딩 디버깅:</p>
            <div className="space-y-1 text-gray-700">
              <p>🔐 sessionLoading: {sessionLoading ? '🔄 로딩중' : '✅ 완료'}</p>
              <p>👤 userSession: {userSession?.id ? '✅ 있음 (' + userSession.id + ')' : '❌ 없음'}</p>
              <p>🔄 isAuthenticated: {isAuthenticated ? '✅ 인증됨' : '❌ 미인증'}</p>
              <p className="mt-2 text-blue-600">
                🕐 {new Date().toLocaleTimeString('ko-KR')}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="px-4 pt-4">
          <div className="text-center py-12 max-w-md mx-auto">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-600 mb-4">상품을 불러오는 중...</p>

            {/* 🔍 모바일 디버깅 정보 */}
            <div className="mt-6 bg-white border border-gray-300 rounded-lg p-4 text-left text-xs">
              <p className="font-bold mb-2 text-green-600">🛍️ 상품 로딩 디버깅:</p>
              <div className="space-y-1 text-gray-700">
                <p>📦 products loading: {loading ? '🔄 로딩중' : '✅ 완료'}</p>
                <p>👤 userSession: {userSession?.id ? '✅ 있음' : '❌ 없음'}</p>
                <p>🔄 isAuthenticated: {isAuthenticated ? '✅ 인증됨' : '❌ 미인증'}</p>
                <p className="mt-2 text-green-600">
                  🕐 {new Date().toLocaleTimeString('ko-KR')}
                </p>
              </div>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refreshProducts}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 max-w-md mx-auto relative">
      {/* 헤더 */}
      <Header />

      {/* 메인 콘텐츠 */}
      <main className="px-4 pt-4">
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
                  {userSession?.name || '사용자'}
                </span>님 환영합니다! 🎉
              </p>
            </div>
          </div>
        )}

        {/* 상품 그리드 */}
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
