'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import useAuth from '@/hooks/useAuth'
import useRealtimeProducts from '@/hooks/useRealtimeProducts'
import Header from './components/layout/Header'
import LiveBanner from './components/layout/LiveBanner'
import ProductGrid from './components/product/ProductGrid'
import MobileNav from './components/layout/MobileNav'

export default function Home() {
  const [liveBroadcast, setLiveBroadcast] = useState(null)
  const [userSession, setUserSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const { isAuthenticated } = useAuth()
  const { products, loading, error, refreshProducts } = useRealtimeProducts()
  const router = useRouter()

  useEffect(() => {
    loadLiveBroadcastData()
    checkUserSession()
  }, [])

  // 직접 세션 확인 (DB 조회 포함)
  const checkUserSession = async () => {
    try {
      const storedUser = sessionStorage.getItem('user')

      if (storedUser) {
        const userData = JSON.parse(storedUser)

        // ⚠️ 이름이 없으면 DB에서 재조회
        if (!userData.name || userData.name === '사용자') {
          // Supabase Auth 세션 확인
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user?.id) {
            // DB에서 프로필 조회
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (profile && !error) {
              // sessionStorage 업데이트
              const updatedUser = {
                ...userData,
                name: profile.name,
                nickname: profile.nickname,
                phone: profile.phone || '',
                address: profile.address || '',
                detail_address: profile.detail_address || '',
                postal_code: profile.postal_code || '',
                avatar_url: profile.avatar_url
              }

              sessionStorage.setItem('user', JSON.stringify(updatedUser))
              setUserSession(updatedUser)
              return
            } else {
              console.error('❌ DB 프로필 조회 실패:', error)
            }
          }
        }

        setUserSession(userData)
      } else {
        setUserSession(null)
      }
    } catch (error) {
      console.error('홈페이지 세션 확인 오류:', error)
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

  async function loadLiveBroadcastData() {
    try {
      // Mock 라이브 방송 데이터 (테스트용)
      const mockBroadcast = {
        id: 'live-broadcast-1',
        title: '🔥 특가 세일 라이브!',
        status: 'live',
        viewer_count: 1247,
        thumbnail_url: '/images/live-thumbnail.jpg',
        broadcaster_name: 'allok 라이브',
        created_at: new Date().toISOString()
      }

      // 라이브 방송이 있는 것처럼 설정 (원하면 null로 설정 가능)
      setLiveBroadcast(mockBroadcast)
    } catch (err) {
      console.error('라이브 방송 데이터 로딩 오류:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
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

        {/* 라이브 방송 섹션 */}
        {liveBroadcast ? (
          <>
            <LiveBanner broadcast={liveBroadcast} />
            <div className="mt-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">🔥 라이브 중인 상품</h2>
              <ProductGrid products={products} />
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-lg p-6 mb-6 text-center">
              <div className="text-gray-400 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">현재 진행중인 방송이 없습니다</h3>
              <p className="text-sm text-gray-600">곧 새로운 라이브 방송이 시작됩니다!</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">🛍️ 인기 상품</h2>
              <ProductGrid products={products} />
            </div>
          </>
        )}
      </main>

      {/* 하단 네비게이션 */}
      <MobileNav />
    </div>
  )
}
