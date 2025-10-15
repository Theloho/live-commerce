'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import useAuth from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function Header() {
  const [userSession, setUserSession] = useState(null)
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  // 직접 세션 확인
  useEffect(() => {
    const checkUserSession = () => {
      try {
        const storedUser = sessionStorage.getItem('user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          setUserSession(userData)
        } else {
          setUserSession(null)
        }
      } catch (error) {
        console.error('헤더 세션 확인 오류:', error)
        setUserSession(null)
      }
    }

    checkUserSession()

    // 이벤트 리스너 추가
    const handleKakaoLogin = (event) => {
      const userProfile = event.detail
      setUserSession(userProfile)
      console.log('헤더에서 카카오 로그인 이벤트 수신:', userProfile)
    }

    const handleProfileCompleted = (event) => {
      const userProfile = event.detail
      setUserSession(userProfile)
      console.log('헤더에서 프로필 완성 이벤트 수신:', userProfile)
    }

    const handleLogout = () => {
      setUserSession(null)
      console.log('헤더에서 로그아웃 이벤트 수신')
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
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="px-4">
        <div className="flex items-center justify-center h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <h1 className="text-xl font-bold text-red-500">allok</h1>
          </Link>
        </div>
      </div>
    </header>
  )
}