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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 대시보드</h1>
          <p className="text-sm text-gray-600 mt-1">
            오늘 주문 {stats.todayOrders}건 | 매출 ₩{stats.todaySales.toLocaleString()} | 입금대기 {stats.pendingPayments}건 | 배송준비 {stats.readyToShip}건
          </p>
        </div>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* Compact Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-gray-200"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-gray-200">
          {statCards.map((card, index) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 text-center ${card.bgColor}`}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${card.textColor}`} />
                  <span className="text-xs text-gray-600 font-medium">{card.title}</span>
                </div>
                <p className={`text-lg font-bold ${card.textColor}`}>
                  {typeof card.value === 'string' && card.value.includes('₩')
                    ? card.value.replace('₩', '₩')
                    : card.value}
                </p>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Compact Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-lg border border-gray-200 p-4"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-3">빠른 작업</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => window.location.href = '/admin/deposits'}
            className="p-3 text-left bg-yellow-50 hover:bg-yellow-100 rounded-lg border border-yellow-200 transition-colors"
          >
            <h3 className="font-medium text-yellow-800 text-sm mb-1">💰 입금 확인</h3>
            <p className="text-xs text-yellow-600">{stats.pendingPayments}건 대기</p>
          </button>

          <button
            onClick={() => window.location.href = '/admin/shipping'}
            className="p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
          >
            <h3 className="font-medium text-purple-800 text-sm mb-1">🚚 발송 관리</h3>
            <p className="text-xs text-purple-600">{stats.readyToShip}건 준비</p>
          </button>

          <button
            onClick={() => window.location.href = '/admin/products'}
            className="p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
          >
            <h3 className="font-medium text-blue-800 text-sm mb-1">📦 상품 관리</h3>
            <p className="text-xs text-blue-600">재고 및 가격</p>
          </button>

          <button
            onClick={() => window.location.href = '/admin/customers'}
            className="p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
          >
            <h3 className="font-medium text-green-800 text-sm mb-1">👥 고객 관리</h3>
            <p className="text-xs text-green-600">{stats.totalUsers}명 등록</p>
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

      {/* Database Reset Button */}
      <div className="text-center">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <button
            onClick={async () => {
              if (confirm('⚠️ 정말로 모든 주문/결제 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!')) {
                try {
                  const response = await fetch('/api/admin/reset-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ confirm: 'RESET_ALL_DATA' })
                  })

                  if (response.ok) {
                    const result = await response.json()
                    toast.success('✅ 데이터베이스가 초기화되었습니다')
                    console.log('🎉 초기화 완료:', result)
                    loadStats() // 통계 새로고침
                  } else {
                    const error = await response.json()
                    toast.error(`❌ 초기화 실패: ${error.error}`)
                  }
                } catch (error) {
                  toast.error('❌ 초기화 요청 실패')
                  console.error('초기화 오류:', error)
                }
              }
            }}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            🗑️ 데이터베이스 초기화
          </button>
          <p className="text-xs text-gray-500 mt-2">모든 주문/결제 데이터 삭제</p>
        </div>
      </div>
    </div>
  )
}// Deploy trigger for admin session fix Fri Sep 19 21:06:07 KST 2025
