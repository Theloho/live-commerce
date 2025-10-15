'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  TicketIcon,
  CheckCircleIcon,
  CalendarIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import useAuth from '@/hooks/useAuth'
import { getUserCoupons } from '@/lib/couponApi'
import toast from 'react-hot-toast'

export default function MyCouponsPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [userSession, setUserSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('unused') // unused, used, expired

  // 세션 확인 (카카오 로그인 사용자 지원)
  useEffect(() => {
    const checkUserSession = () => {
      try {
        const storedUser = sessionStorage.getItem('user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          console.log('쿠폰 페이지에서 세션 복원:', userData)
          setUserSession(userData)
        } else {
          setUserSession(null)
        }
      } catch (error) {
        console.error('쿠폰 페이지 세션 확인 오류:', error)
        setUserSession(null)
      } finally {
        setSessionLoading(false)
      }
    }

    checkUserSession()
  }, [])

  // 로그인 확인 및 쿠폰 로드
  useEffect(() => {
    const currentUser = userSession || user
    const isUserLoggedIn = userSession || isAuthenticated

    if (!sessionLoading && !authLoading && !isUserLoggedIn) {
      toast.error('로그인이 필요합니다')
      router.push('/login')
      return
    }

    if (currentUser) {
      loadCoupons(currentUser)
    }
  }, [user, userSession, authLoading, sessionLoading, isAuthenticated, router])

  const loadCoupons = async (currentUser) => {
    try {
      setLoading(true)
      const data = await getUserCoupons(currentUser.id)

      // 🔍 디버깅: 로드된 쿠폰 데이터 확인
      console.log('🎫 로드된 전체 쿠폰 데이터:', data)
      console.log('🎫 쿠폰 개수:', data?.length || 0)

      if (data && data.length > 0) {
        console.log('🎫 첫 번째 쿠폰 상세:', {
          id: data[0].id,
          coupon_id: data[0].coupon_id,
          is_used: data[0].is_used,
          used_at: data[0].used_at,
          order_id: data[0].order_id,
          discount_amount: data[0].discount_amount,
          coupon: data[0].coupon
        })

        const usedCoupons = data.filter(c => c.is_used)
        console.log('🎫 사용된 쿠폰 개수:', usedCoupons.length)
        if (usedCoupons.length > 0) {
          console.log('🎫 사용된 쿠폰 목록:', usedCoupons.map(c => ({
            code: c.coupon?.code,
            is_used: c.is_used,
            used_at: c.used_at
          })))
        }
      }

      setCoupons(data)
    } catch (error) {
      console.error('쿠폰 로딩 오류:', error)
      toast.error('쿠폰 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const getFilteredCoupons = () => {
    const now = new Date()

    switch (filter) {
      case 'unused':
        return coupons.filter(c => !c.is_used && new Date(c.coupon.valid_until) >= now)
      case 'used':
        return coupons.filter(c => c.is_used)
      case 'expired':
        return coupons.filter(c => !c.is_used && new Date(c.coupon.valid_until) < now)
      default:
        return coupons
    }
  }

  const formatDiscount = (coupon) => {
    if (coupon.discount_type === 'fixed_amount') {
      return `₩${coupon.discount_value.toLocaleString()}`
    } else {
      return `${coupon.discount_value}%`
    }
  }

  const getStats = () => {
    const now = new Date()
    const unused = coupons.filter(c => !c.is_used && new Date(c.coupon.valid_until) >= now).length
    const used = coupons.filter(c => c.is_used).length
    const expired = coupons.filter(c => !c.is_used && new Date(c.coupon.valid_until) < now).length

    return { unused, used, expired }
  }

  if (authLoading || sessionLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const stats = getStats()
  const filteredCoupons = getFilteredCoupons()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">내 쿠폰</h1>
            <div className="w-10"></div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* 통계 카드 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">
              <p className="text-xs text-blue-600 mb-1">사용 가능</p>
              <p className="text-2xl font-bold text-blue-700">{stats.unused}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">
              <p className="text-xs text-green-600 mb-1">사용 완료</p>
              <p className="text-2xl font-bold text-green-700">{stats.used}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600 mb-1">기간 만료</p>
              <p className="text-2xl font-bold text-gray-700">{stats.expired}</p>
            </div>
          </div>

          {/* 필터 */}
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter('unused')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                filter === 'unused'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              사용 가능 ({stats.unused})
            </button>
            <button
              onClick={() => setFilter('used')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                filter === 'used'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              사용 완료 ({stats.used})
            </button>
            <button
              onClick={() => setFilter('expired')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                filter === 'expired'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              기간 만료 ({stats.expired})
            </button>
          </div>

          {/* 쿠폰 리스트 */}
          <div className="space-y-3">
            {filteredCoupons.length === 0 ? (
              <div className="text-center py-16">
                <TicketIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {filter === 'unused' && '사용 가능한 쿠폰이 없습니다'}
                  {filter === 'used' && '사용한 쿠폰이 없습니다'}
                  {filter === 'expired' && '만료된 쿠폰이 없습니다'}
                </p>
              </div>
            ) : (
              filteredCoupons.map((userCoupon) => {
                const coupon = userCoupon.coupon
                const isExpired = new Date(coupon.valid_until) < new Date()
                const isUsed = userCoupon.is_used

                return (
                  <motion.div
                    key={userCoupon.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative overflow-hidden rounded-lg border-2 ${
                      isUsed
                        ? 'border-green-200 bg-green-50'
                        : isExpired
                        ? 'border-gray-200 bg-gray-50 opacity-60'
                        : 'border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50'
                    }`}
                  >
                    {/* 쿠폰 디자인 */}
                    <div className="flex">
                      {/* 왼쪽: 할인 금액 */}
                      <div className={`w-32 flex flex-col items-center justify-center p-4 ${
                        isUsed ? 'bg-green-100' : isExpired ? 'bg-gray-100' : 'bg-blue-100'
                      }`}>
                        <TicketIcon className={`h-8 w-8 mb-2 ${
                          isUsed ? 'text-green-600' : isExpired ? 'text-gray-400' : 'text-blue-600'
                        }`} />
                        <p className={`text-2xl font-bold ${
                          isUsed ? 'text-green-700' : isExpired ? 'text-gray-500' : 'text-blue-700'
                        }`}>
                          {formatDiscount(coupon)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {coupon.discount_type === 'fixed_amount' ? '금액할인' : '퍼센트할인'}
                        </p>
                      </div>

                      {/* 중간: 점선 구분 */}
                      <div className="w-px bg-dashed relative">
                        <div className="absolute -top-3 -left-3 w-6 h-6 bg-white rounded-full"></div>
                        <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-white rounded-full"></div>
                      </div>

                      {/* 오른쪽: 쿠폰 정보 */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-mono font-bold text-sm ${
                                isUsed ? 'text-green-600' : isExpired ? 'text-gray-500' : 'text-blue-600'
                              }`}>
                                {coupon.code}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">
                              {coupon.name}
                            </p>
                          </div>
                          {isUsed && (
                            <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
                          )}
                        </div>

                        {coupon.description && (
                          <p className="text-xs text-gray-600 mb-2">
                            {coupon.description}
                          </p>
                        )}

                        {/* 쿠폰 조건 */}
                        <div className="space-y-1 mb-3">
                          {coupon.min_purchase_amount > 0 && (
                            <div className="flex items-center text-xs text-gray-600">
                              <TagIcon className="h-3 w-3 mr-1" />
                              최소 구매금액 ₩{coupon.min_purchase_amount.toLocaleString()}
                            </div>
                          )}
                          {coupon.discount_type === 'percentage' && coupon.max_discount_amount && (
                            <div className="flex items-center text-xs text-gray-600">
                              <TagIcon className="h-3 w-3 mr-1" />
                              최대 할인 ₩{coupon.max_discount_amount.toLocaleString()}
                            </div>
                          )}
                        </div>

                        {/* 유효기간 및 사용정보 */}
                        <div className="space-y-1">
                          <div className="flex items-center text-xs text-gray-500">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {new Date(coupon.valid_from).toLocaleDateString('ko-KR')} ~ {new Date(coupon.valid_until).toLocaleDateString('ko-KR')}
                          </div>
                          {isUsed && userCoupon.used_at && (
                            <p className="text-xs text-green-600">
                              ✓ {new Date(userCoupon.used_at).toLocaleDateString('ko-KR')} 사용됨
                              {userCoupon.discount_amount && ` (₩${userCoupon.discount_amount.toLocaleString()} 할인)`}
                            </p>
                          )}
                          {isExpired && !isUsed && (
                            <p className="text-xs text-red-500">✗ 기간 만료</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
