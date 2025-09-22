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
  const [orderCounts, setOrderCounts] = useState({
    pending: 0,
    verifying: 0,
    paid: 0,
    delivered: 0
  })

  // 현재 사용자의 주문 상태별 수 조회
  useEffect(() => {
    const loadOrderCounts = () => {
      if (typeof window !== 'undefined' && isAuthenticated && user?.id) {
        const orders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
        // 현재 사용자의 주문만 필터링
        const userOrders = orders.filter(order => order.userId === user.id)
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
  }, [isAuthenticated, user])

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