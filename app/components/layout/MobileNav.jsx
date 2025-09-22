'use client'

import { useState, useEffect } from 'react'
import { HomeIcon, ClipboardDocumentListIcon, UserIcon } from '@heroicons/react/24/outline'
import { HomeIcon as HomeIconSolid, ClipboardDocumentListIcon as ClipboardDocumentListIconSolid, UserIcon as UserIconSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import useAuth from '@/hooks/useAuth'

export default function MobileNav() {
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuth()
  const [userSession, setUserSession] = useState(null)
  const [orderCounts, setOrderCounts] = useState({
    pending: 0,
    verifying: 0,
    paid: 0,
    delivered: 0
  })

  // 직접 세션 확인
  useEffect(() => {
    const checkUserSession = () => {
      try {
        const storedUser = sessionStorage.getItem('user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          console.log('네비게이션에서 세션 복원:', userData)
          setUserSession(userData)
        } else {
          setUserSession(null)
        }
      } catch (error) {
        console.error('네비게이션 세션 확인 오류:', error)
        setUserSession(null)
      }
    }

    checkUserSession()

    // 이벤트 리스너 추가
    const handleKakaoLogin = (event) => {
      const userProfile = event.detail
      setUserSession(userProfile)
      console.log('네비게이션에서 카카오 로그인 이벤트 수신:', userProfile)
    }

    const handleProfileCompleted = (event) => {
      const userProfile = event.detail
      setUserSession(userProfile)
      console.log('네비게이션에서 프로필 완성 이벤트 수신:', userProfile)
    }

    const handleLogout = () => {
      setUserSession(null)
      console.log('네비게이션에서 로그아웃 이벤트 수신')
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

  // 현재 사용자의 주문 상태별 수 조회
  useEffect(() => {
    const loadOrderCounts = () => {
      const currentUser = userSession || user
      const isUserLoggedIn = userSession || isAuthenticated

      if (typeof window !== 'undefined' && isUserLoggedIn && currentUser?.id) {
        const orders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
        // 현재 사용자의 주문만 필터링
        const userOrders = orders.filter(order => order.userId === currentUser.id)
        const counts = {
          pending: userOrders.filter(order => order.status === 'pending').length,
          verifying: userOrders.filter(order => order.status === 'verifying').length,
          paid: userOrders.filter(order => order.status === 'paid').length,
          delivered: userOrders.filter(order => order.status === 'delivered').length
        }
        setOrderCounts(counts)
      } else {
        // 로그아웃 상태면 모든 카운트를 0으로 설정
        setOrderCounts({
          pending: 0,
          verifying: 0,
          paid: 0,
          delivered: 0
        })
      }
    }

    loadOrderCounts()

    // 주문 업데이트 이벤트 리스너
    const handleOrderUpdate = () => {
      loadOrderCounts()
    }

    window.addEventListener('orderUpdated', handleOrderUpdate)
    return () => window.removeEventListener('orderUpdated', handleOrderUpdate)
  }, [isAuthenticated, user, userSession])

  const menuItems = [
    {
      href: '/',
      label: '홈',
      icon: HomeIcon,
      iconSolid: HomeIconSolid
    },
    {
      href: '/orders',
      label: '주문내역',
      icon: ClipboardDocumentListIcon,
      iconSolid: ClipboardDocumentListIconSolid
    },
    {
      href: '/mypage',
      label: 'MY',
      icon: UserIcon,
      iconSolid: UserIconSolid
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 max-w-md mx-auto shadow-lg">
      <div className="flex">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          const IconComponent = isActive ? item.iconSolid : item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center py-3 px-2 min-h-[64px] transition-colors relative ${
                isActive
                  ? 'text-red-500 bg-red-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <IconComponent className="h-7 w-7 mb-1" />
              <span className="text-xs font-medium leading-tight">{item.label}</span>

              {/* 주문내역 탭에 뱃지 표시 */}
              {item.href === '/orders' && (() => {
                const totalOrders = orderCounts.pending + orderCounts.verifying + orderCounts.paid + orderCounts.delivered
                return totalOrders > 0 && (
                  <span className="absolute top-1 right-1/4 transform translate-x-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {totalOrders > 99 ? '99+' : totalOrders}
                  </span>
                )
              })()}
            </Link>
          )
        })}
      </div>
      {/* 홈 인디케이터 공간 (iOS) */}
      <div className="h-safe-area-inset-bottom bg-white"></div>
    </nav>
  )
}