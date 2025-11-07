'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FireIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'
import toast from 'react-hot-toast'

export default function SellerLiveDashboard() {
  const router = useRouter()
  const { adminUser, isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0
  })
  const [topProducts, setTopProducts] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // 권한 체크
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
    }
  }, [authLoading, isAdminAuthenticated, router])

  // 데이터 로드
  useEffect(() => {
    if (isAdminAuthenticated && adminUser?.email) {
      loadDashboardData()
    }
  }, [isAdminAuthenticated, adminUser])

  // 15초마다 자동 새로고침 (백그라운드)
  useEffect(() => {
    if (!isAdminAuthenticated) return

    const interval = setInterval(() => {
      loadDashboardData(true) // 백그라운드 새로고침
    }, 15000) // 15초

    return () => clearInterval(interval)
  }, [isAdminAuthenticated, adminUser])

  const loadDashboardData = async (isBackgroundRefresh = false) => {
    try {
      // 백그라운드 새로고침이 아닐 때만 로딩 표시
      if (!isBackgroundRefresh) {
        setLoading(true)
      }

      // 오늘 주문 조회
      const response = await fetch(
        `/api/admin/orders?adminEmail=${encodeURIComponent(adminUser.email)}&dateRange=today`
      )

      if (!response.ok) {
        throw new Error('데이터 조회 실패')
      }

      const { orders } = await response.json()

      // 통계 계산
      const totalOrders = orders.length
      const totalRevenue = orders.reduce((sum, order) => sum + (order.final_amount || order.total_amount || 0), 0)
      const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

      setStats({
        totalOrders,
        totalRevenue,
        avgOrderValue
      })

      // 상품별 판매량 집계
      const productSales = {}
      orders.forEach(order => {
        order.order_items?.forEach(item => {
          const productId = item.product_id
          const productTitle = item.products?.title || item.title || '상품명 없음'
          const productInventory = item.products?.inventory || 0
          const quantity = item.quantity || 1

          if (!productSales[productId]) {
            productSales[productId] = {
              id: productId,
              title: productTitle,
              quantity: 0,
              inventory: productInventory,
              thumbnailUrl: item.products?.thumbnail_url
            }
          }
          productSales[productId].quantity += quantity
        })
      })

      // TOP 5 인기 상품
      const sortedProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
      setTopProducts(sortedProducts)

      // 재고 부족 상품 (재고 10개 이하)
      const lowStock = Object.values(productSales)
        .filter(p => p.inventory <= 10)
        .sort((a, b) => a.inventory - b.inventory)
      setLowStockProducts(lowStock)

      // 최근 활동 (pending, verifying만)
      const activities = orders
        .filter(order => order.status === 'pending' || order.status === 'verifying')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map(order => {
          const customerName = order.userProfile?.name || order.order_shipping?.[0]?.name || '고객'
          const productNames = order.order_items?.map(item => item.products?.title || item.title).filter(Boolean).join(', ') || '상품'
          const totalAmount = order.final_amount || order.total_amount || 0

          return {
            id: order.id,
            status: order.status,
            customerName: customerName,
            productNames,
            totalAmount,
            createdAt: new Date(order.created_at)
          }
        })
      setRecentActivity(activities)

      setLastUpdated(new Date())
    } catch (error) {
      console.error('데이터 로딩 오류:', error)
      // 백그라운드 새로고침 중 에러는 조용히 무시
      if (!isBackgroundRefresh) {
        toast.error('데이터를 불러오는데 실패했습니다')
      }
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false)
      }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-300">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              🔴 LIVE 판매 대시보드
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowPathIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 📊 오늘 판매 통계 */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-6 h-6" />
            오늘 판매 통계
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-gray-200 text-sm mb-1">주문 건수</p>
              <p className="text-4xl font-bold">{stats.totalOrders}</p>
              <p className="text-xs text-gray-300">건</p>
            </div>
            <div className="text-center">
              <p className="text-gray-200 text-sm mb-1">총 매출</p>
              <p className="text-3xl font-bold">₩{(stats.totalRevenue / 10000).toFixed(0)}만</p>
              <p className="text-xs text-gray-300">₩{stats.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-200 text-sm mb-1">평균 객단가</p>
              <p className="text-3xl font-bold">₩{Math.round(stats.avgOrderValue / 1000)}K</p>
              <p className="text-xs text-gray-300">₩{stats.avgOrderValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* 🔴 실시간 활동 피드 */}
        {recentActivity.length > 0 && (
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              ⚡ 실시간 활동 피드
            </h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentActivity.map((activity) => {
                const timeAgo = Math.floor((new Date() - activity.createdAt) / 1000 / 60)
                const timeDisplay = timeAgo < 1 ? '방금 전' : `${timeAgo}분 전`

                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 bg-purple-700 bg-opacity-50 rounded-lg"
                  >
                    <div className="text-2xl flex-shrink-0">
                      {activity.status === 'pending' ? '🛒' : '💰'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{activity.customerName}</span>
                          <span className="text-sm text-purple-200">
                            {activity.status === 'pending' ? '장바구니' : '결제완료'}
                          </span>
                          <span className="text-xs text-purple-300">{timeDisplay}</span>
                        </div>
                        <span className="text-sm font-bold text-yellow-300">
                          ₩{activity.totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-200 truncate mt-1">
                        {activity.productNames}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 🔥 실시간 인기 상품 TOP 5 */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FireIcon className="w-6 h-6 text-orange-500" />
            실시간 인기 상품 TOP 5
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-gray-400 text-center py-4">주문 내역이 없습니다</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-3 bg-gray-700 rounded-lg"
                >
                  <div className="text-2xl font-bold text-orange-500 w-8">
                    #{index + 1}
                  </div>
                  {product.thumbnailUrl && (
                    <img
                      src={product.thumbnailUrl}
                      alt={product.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.title}</p>
                    <p className="text-sm text-gray-400">
                      판매: {product.quantity}개 | 재고: {product.inventory}개
                    </p>
                  </div>
                  {product.inventory === 0 && (
                    <span className="px-2 py-1 bg-red-600 text-xs rounded">품절</span>
                  )}
                  {product.inventory > 0 && product.inventory <= 5 && (
                    <span className="px-2 py-1 bg-yellow-600 text-xs rounded">부족</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ⚠️ 재고 알림 */}
        {lowStockProducts.length > 0 && (
          <div className="bg-yellow-900 border-2 border-yellow-600 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400" />
              재고 부족 알림
            </h2>
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-yellow-800 bg-opacity-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {product.thumbnailUrl && (
                      <img
                        src={product.thumbnailUrl}
                        alt={product.title}
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium">{product.title}</p>
                      <p className="text-sm text-gray-300">오늘 판매: {product.quantity}개</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {product.inventory === 0 ? (
                      <span className="px-3 py-1 bg-red-600 text-sm font-bold rounded">
                        품절
                      </span>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-yellow-300">
                          {product.inventory}
                        </p>
                        <p className="text-xs text-gray-300">개 남음</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 자동 새로고침 안내 */}
        <div className="text-center text-gray-500 text-sm">
          <p>🔄 15초마다 자동 업데이트됩니다</p>
        </div>
      </div>
    </div>
  )
}
