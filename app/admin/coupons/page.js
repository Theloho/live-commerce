'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TicketIcon,
  CalendarIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { getCoupons, toggleCouponStatus, deleteCoupon, getCouponStats } from '@/lib/couponApi'

export default function AdminCouponsPage() {
  const router = useRouter()
  const [coupons, setCoupons] = useState([])
  const [filteredCoupons, setFilteredCoupons] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all, active, inactive
  const [typeFilter, setTypeFilter] = useState('all') // all, fixed_amount, percentage
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})

  useEffect(() => {
    loadCoupons()
  }, [])

  useEffect(() => {
    filterCoupons()
  }, [coupons, searchTerm, statusFilter, typeFilter])

  const loadCoupons = async () => {
    try {
      setLoading(true)
      const data = await getCoupons()

      // 각 쿠폰의 통계 로드
      const couponsWithStats = await Promise.all(
        data.map(async (coupon) => {
          try {
            const couponStats = await getCouponStats(coupon.id)
            return { ...coupon, stats: couponStats }
          } catch (error) {
            console.error(`쿠폰 ${coupon.code} 통계 로드 실패:`, error)
            return { ...coupon, stats: null }
          }
        })
      )

      setCoupons(couponsWithStats)
      setLoading(false)
    } catch (error) {
      console.error('쿠폰 로딩 오류:', error)
      toast.error('쿠폰 목록을 불러오는데 실패했습니다')
      setLoading(false)
    }
  }

  const filterCoupons = () => {
    let filtered = [...coupons]

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(coupon =>
        coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coupon.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 상태 필터
    if (statusFilter !== 'all') {
      filtered = filtered.filter(coupon =>
        statusFilter === 'active' ? coupon.is_active : !coupon.is_active
      )
    }

    // 타입 필터
    if (typeFilter !== 'all') {
      filtered = filtered.filter(coupon => coupon.discount_type === typeFilter)
    }

    setFilteredCoupons(filtered)
  }

  const handleToggleStatus = async (couponId, currentStatus) => {
    try {
      await toggleCouponStatus(couponId, !currentStatus)
      toast.success(`쿠폰이 ${!currentStatus ? '활성화' : '비활성화'}되었습니다`)
      loadCoupons()
    } catch (error) {
      console.error('쿠폰 상태 변경 실패:', error)
      toast.error('쿠폰 상태 변경에 실패했습니다')
    }
  }

  const handleDeleteCoupon = async (couponId, couponCode) => {
    if (!window.confirm(`쿠폰 "${couponCode}"을(를) 완전히 삭제하시겠습니까?\n\n⚠️ 주의:\n- 쿠폰 사용 이력(user_coupons)도 모두 삭제됩니다\n- 이미 완료된 주문 금액은 영향 없습니다\n- 이 작업은 되돌릴 수 없습니다`)) {
      return
    }

    try {
      await deleteCoupon(couponId)
      toast.success('쿠폰이 삭제되었습니다')
      loadCoupons()
    } catch (error) {
      console.error('쿠폰 삭제 실패:', error)
      toast.error('쿠폰 삭제에 실패했습니다')
    }
  }

  const formatDiscount = (coupon) => {
    if (coupon.discount_type === 'fixed_amount') {
      return `₩${coupon.discount_value.toLocaleString()}`
    } else {
      return `${coupon.discount_value}%`
    }
  }

  const isExpired = (validUntil) => {
    return new Date(validUntil) < new Date()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎟️ 쿠폰 관리</h1>
          <p className="text-sm text-gray-600 mt-1">
            총 {coupons.length}개 | 활성 {coupons.filter(c => c.is_active).length}개 | 발급 {coupons.reduce((sum, c) => sum + c.total_issued_count, 0)}회 | 사용 {coupons.reduce((sum, c) => sum + c.total_used_count, 0)}회
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/coupons/new')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          쿠폰 발행
        </button>
      </div>

      {/* 통계 카드 - 컴팩트 버전 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">전체 쿠폰</p>
            <p className="text-xl font-bold text-gray-900">{coupons.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">활성 쿠폰</p>
            <p className="text-xl font-bold text-green-600">
              {coupons.filter(c => c.is_active).length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">총 발급</p>
            <p className="text-xl font-bold text-purple-600">
              {coupons.reduce((sum, c) => sum + c.total_issued_count, 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">총 사용</p>
            <p className="text-xl font-bold text-orange-600">
              {coupons.reduce((sum, c) => sum + c.total_used_count, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 검색 */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="쿠폰 코드 또는 이름 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 상태 필터 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">전체 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>

          {/* 타입 필터 */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">전체 타입</option>
            <option value="fixed_amount">금액 할인</option>
            <option value="percentage">퍼센트 할인</option>
          </select>
        </div>
      </div>

      {/* 쿠폰 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  쿠폰 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  할인
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  유효 기간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용 현황
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                      ? '검색 결과가 없습니다'
                      : '등록된 쿠폰이 없습니다'}
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => (
                  <motion.tr
                    key={coupon.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/admin/coupons/${coupon.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-mono font-bold text-blue-600">
                            {coupon.code}
                          </div>
                          {coupon.is_welcome_coupon && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              🎁 웰컴
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-900">{coupon.name}</div>
                        {coupon.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {coupon.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-lg font-bold text-gray-900">
                          {formatDiscount(coupon)}
                        </span>
                        {coupon.discount_type === 'percentage' && coupon.max_discount_amount && (
                          <span className="ml-2 text-xs text-gray-500">
                            (최대 ₩{coupon.max_discount_amount.toLocaleString()})
                          </span>
                        )}
                      </div>
                      {coupon.min_purchase_amount > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          최소 ₩{coupon.min_purchase_amount.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center text-gray-600">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {new Date(coupon.valid_from).toLocaleDateString('ko-KR')}
                        </div>
                        <div className="flex items-center text-gray-600 mt-1">
                          ~ {new Date(coupon.valid_until).toLocaleDateString('ko-KR')}
                        </div>
                        {isExpired(coupon.valid_until) && (
                          <div className="text-xs text-red-500 mt-1">만료됨</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center">
                          <span className="text-gray-600">발급:</span>
                          <span className="ml-1 font-medium">{coupon.total_issued_count}</span>
                        </div>
                        <div className="flex items-center mt-1">
                          <span className="text-gray-600">사용:</span>
                          <span className="ml-1 font-medium text-blue-600">
                            {coupon.total_used_count}
                          </span>
                          {coupon.stats?.usage_rate && (
                            <span className="ml-1 text-xs text-gray-500">
                              ({coupon.stats.usage_rate}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {coupon.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          활성
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          비활성
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCoupon(coupon.id, coupon.code)
                          }}
                          className="p-1 rounded hover:bg-red-100 text-red-600"
                          title="완전 삭제"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleStatus(coupon.id, coupon.is_active)
                          }}
                          className={`p-1 rounded hover:bg-gray-100 ${
                            coupon.is_active ? 'text-red-600' : 'text-green-600'
                          }`}
                          title={coupon.is_active ? '비활성화' : '활성화'}
                        >
                          {coupon.is_active ? (
                            <XCircleIcon className="h-5 w-5" />
                          ) : (
                            <CheckCircleIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
