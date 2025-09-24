'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
// import useAuth from '@/hooks/useAuth'
// import { checkAdminAccess } from '@/lib/adminAuth'
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ClockIcon,
  TruckIcon,
  ChartBarIcon,
  UsersIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    todayOrders: 0,
    todaySales: 0,
    pendingPayments: 0,
    readyToShip: 0,
    totalUsers: 0,
    totalProducts: 0
  })

  useEffect(() => {
    console.log('Admin 페이지 로드됨 - 세션 체크 없음')
    loadStats()
  }, [])

  const loadStats = useCallback(async () => {
    try {
      console.log('📊 관리자 대시보드 통계 로딩 시작')

      // 실제 DB에서 통계 데이터 가져오기
      const response = await fetch('/api/admin/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ DB 통계 데이터:', data)
        setStats(data)
      } else {
        console.warn('⚠️ DB 통계 로딩 실패, 기본값 사용')
        // 기본값 설정
        setStats({
          todayOrders: 0,
          todaySales: 0,
          pendingPayments: 0,
          readyToShip: 0,
          totalUsers: 0,
          totalProducts: 0
        })
      }
    } catch (error) {
      console.error('통계 로딩 오류:', error)
      setStats({
        todayOrders: 0,
        todaySales: 0,
        pendingPayments: 0,
        readyToShip: 0,
        totalUsers: 0,
        totalProducts: 0
      })
    }
  }, [])

  const statCards = [
    {
      title: '오늘 주문 수',
      value: stats.todayOrders,
      icon: ShoppingBagIcon,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: '오늘 매출',
      value: `₩${stats.todaySales.toLocaleString()}`,
      icon: CurrencyDollarIcon,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: '입금대기',
      value: stats.pendingPayments,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600'
    },
    {
      title: '배송준비',
      value: stats.readyToShip,
      icon: TruckIcon,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: '총 사용자',
      value: stats.totalUsers,
      icon: UsersIcon,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    },
    {
      title: '총 상품',
      value: stats.totalProducts,
      icon: ChartBarIcon,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    }
  ]

  // 조건부 렌더링 제거 - localStorage 체크는 useEffect에서만

  return (
    <div className="space-y-6">

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${card.bgColor} rounded-lg p-6 border border-gray-200`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className={`text-2xl font-bold ${card.textColor}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = '/admin/deposits'}
            className="p-4 text-left bg-yellow-50 hover:bg-yellow-100 rounded-lg border border-yellow-200 transition-colors"
          >
            <h3 className="font-medium text-yellow-800 mb-1">💰 입금 확인</h3>
            <p className="text-sm text-yellow-600">{stats.pendingPayments}건 대기중</p>
          </button>

          <button
            onClick={() => window.location.href = '/admin/orders?status=paid'}
            className="p-4 text-left bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
          >
            <h3 className="font-medium text-purple-800 mb-1">배송 처리</h3>
            <p className="text-sm text-purple-600">{stats.readyToShip}건 준비중</p>
          </button>

          <button
            onClick={() => window.location.href = '/admin/products'}
            className="p-4 text-left bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
          >
            <h3 className="font-medium text-blue-800 mb-1">상품 관리</h3>
            <p className="text-sm text-blue-600">재고 및 가격 관리</p>
          </button>

          <button
            onClick={() => window.location.href = '/admin/broadcasts'}
            className="p-4 text-left bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
          >
            <h3 className="font-medium text-red-800 mb-1">방송 관리</h3>
            <p className="text-sm text-red-600">라이브 방송 설정</p>
          </button>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <ShoppingBagIcon className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">새로운 주문이 들어왔습니다</p>
              <p className="text-xs text-gray-500">방금 전</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <CurrencyDollarIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">입금이 확인되었습니다</p>
              <p className="text-xs text-gray-500">5분 전</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <TruckIcon className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">상품이 배송되었습니다</p>
              <p className="text-xs text-gray-500">1시간 전</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={loadStats}
          className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          통계 새로고침
        </button>
      </div>
    </div>
  )
}// Deploy trigger for admin session fix Fri Sep 19 21:06:07 KST 2025
