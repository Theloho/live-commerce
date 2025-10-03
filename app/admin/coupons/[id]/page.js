'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  TicketIcon,
  CalendarIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import {
  getCoupon,
  getCouponHolders,
  distributeCoupon,
  distributeToAllCustomers,
  getCouponStats
} from '@/lib/couponApi'
import { getAllCustomers } from '@/lib/supabaseApi'

export default function AdminCouponDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [coupon, setCoupon] = useState(null)
  const [stats, setStats] = useState(null)
  const [holders, setHolders] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('unused') // unused, used
  const [loading, setLoading] = useState(true)
  const [distributing, setDistributing] = useState(false)

  useEffect(() => {
    loadCouponDetail()
    loadCustomers()
  }, [params.id])

  const loadCouponDetail = async () => {
    try {
      setLoading(true)
      const [couponData, statsData, holdersData] = await Promise.all([
        getCoupon(params.id),
        getCouponStats(params.id),
        getCouponHolders(params.id)
      ])

      setCoupon(couponData)
      setStats(statsData)
      setHolders(holdersData)
    } catch (error) {
      console.error('쿠폰 상세 로딩 오류:', error)
      toast.error('쿠폰 정보를 불러오는데 실패했습니다')
      router.push('/admin/coupons')
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const customersData = await getAllCustomers()
      // 관리자가 아닌 고객만 필터링
      const filteredCustomers = customersData.filter(c => !c.is_admin)
      setCustomers(filteredCustomers)
    } catch (error) {
      console.error('고객 목록 로딩 오류:', error)
      toast.error('고객 목록을 불러오는데 실패했습니다')
    }
  }

  const handleDistribute = async () => {
    if (selectedCustomers.length === 0) {
      toast.error('배포할 고객을 선택해주세요')
      return
    }

    try {
      setDistributing(true)
      const result = await distributeCoupon(params.id, selectedCustomers)

      if (result.duplicates > 0) {
        toast.success(
          `${result.distributedCount}명에게 배포 완료 (${result.duplicates}명은 이미 보유중)`
        )
      } else {
        toast.success(`${result.distributedCount}명에게 쿠폰을 배포했습니다`)
      }

      setSelectedCustomers([])
      loadCouponDetail()
    } catch (error) {
      console.error('쿠폰 배포 실패:', error)
      toast.error('쿠폰 배포에 실패했습니다')
    } finally {
      setDistributing(false)
    }
  }

  const handleDistributeToAll = async () => {
    if (!window.confirm('모든 고객에게 쿠폰을 배포하시겠습니까?')) {
      return
    }

    try {
      setDistributing(true)
      const result = await distributeToAllCustomers(params.id)

      toast.success(
        `${result.distributedCount}명에게 배포 완료 (${result.duplicates}명은 이미 보유중)`
      )

      setSelectedCustomers([])
      loadCouponDetail()
    } catch (error) {
      console.error('전체 배포 실패:', error)
      toast.error('쿠폰 배포에 실패했습니다')
    } finally {
      setDistributing(false)
    }
  }

  const toggleCustomerSelection = (customerId) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId)
      } else {
        return [...prev, customerId]
      }
    })
  }

  const formatDiscount = () => {
    if (!coupon) return ''
    if (coupon.discount_type === 'fixed_amount') {
      return `₩${coupon.discount_value.toLocaleString()}`
    } else {
      return `${coupon.discount_value}%`
    }
  }

  const isExpired = () => {
    if (!coupon) return false
    return new Date(coupon.valid_until) < new Date()
  }

  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      customer.name?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search) ||
      customer.phone?.includes(search)
    )
  })

  // 배포 가능한 고객 (아직 쿠폰을 받지 않은 고객)
  const holderIds = new Set(holders.map(h => h.user_id))
  const availableCustomers = filteredCustomers.filter(c => !holderIds.has(c.id))

  // 탭별 필터링
  const unusedHolders = holders.filter(h => !h.is_used)
  const usedHolders = holders.filter(h => h.is_used)

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!coupon) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">쿠폰을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">쿠폰 상세</h1>
              {coupon.is_active ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  활성
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  <XCircleIcon className="h-4 w-4 mr-1" />
                  비활성
                </span>
              )}
              {isExpired() && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  만료됨
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              쿠폰 배포 및 사용 현황을 관리합니다
            </p>
          </div>
        </div>
      </div>

      {/* 쿠폰 정보 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg p-6 mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 좌측: 기본 정보 */}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">쿠폰 코드</label>
              <p className="text-2xl font-mono font-bold text-blue-600">{coupon.code}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">쿠폰 이름</label>
              <p className="text-lg font-medium text-gray-900">{coupon.name}</p>
            </div>
            {coupon.description && (
              <div>
                <label className="text-sm text-gray-500">설명</label>
                <p className="text-gray-700">{coupon.description}</p>
              </div>
            )}
          </div>

          {/* 우측: 할인 정보 */}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">할인 금액</label>
              <p className="text-2xl font-bold text-gray-900">{formatDiscount()}</p>
              {coupon.discount_type === 'percentage' && coupon.max_discount_amount && (
                <p className="text-sm text-gray-500 mt-1">
                  최대 할인: ₩{coupon.max_discount_amount.toLocaleString()}
                </p>
              )}
            </div>
            {coupon.min_purchase_amount > 0 && (
              <div>
                <label className="text-sm text-gray-500">최소 구매 금액</label>
                <p className="text-lg font-medium text-gray-900">
                  ₩{coupon.min_purchase_amount.toLocaleString()}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-500">유효 기간</label>
              <div className="flex items-center gap-2 text-gray-700">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {new Date(coupon.valid_from).toLocaleDateString('ko-KR')} ~{' '}
                  {new Date(coupon.valid_until).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 통계 카드 - 컴팩트 버전 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow mb-6 p-4"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">총 발급</p>
            <p className="text-xl font-bold text-purple-600">{stats?.total_issued || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">총 사용</p>
            <p className="text-xl font-bold text-green-600">{stats?.total_used || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">사용률</p>
            <p className="text-xl font-bold text-blue-600">{stats?.usage_rate || 0}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">미사용</p>
            <p className="text-xl font-bold text-orange-600">{stats?.unused_count || 0}</p>
          </div>
        </div>
      </motion.div>

      {/* 쿠폰 배포 섹션 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-lg shadow mb-8"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PaperAirplaneIcon className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">쿠폰 배포</h2>
            </div>
            <div className="flex gap-3">
              {selectedCustomers.length > 0 && (
                <button
                  onClick={handleDistribute}
                  disabled={distributing}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                  선택한 {selectedCustomers.length}명에게 배포
                </button>
              )}
              <button
                onClick={handleDistributeToAll}
                disabled={distributing}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <UserGroupIcon className="h-5 w-5 mr-2" />
                전체 고객에게 배포
              </button>
            </div>
          </div>
        </div>

        {/* 고객 검색 */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="이름, 이메일, 전화번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {availableCustomers.length > 0 && (
            <p className="mt-2 text-sm text-gray-500">
              배포 가능한 고객: {availableCustomers.length}명
            </p>
          )}
        </div>

        {/* 고객 목록 */}
        {availableCustomers.length > 0 ? (
          <div className="p-6">
            <div className="max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.length === availableCustomers.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCustomers(availableCustomers.map(c => c.id))
                          } else {
                            setSelectedCustomers([])
                          }
                        }}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      고객 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이메일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      전화번호
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {availableCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleCustomerSelection(customer.id)}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={() => toggleCustomerSelection(customer.id)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.name || '이름 없음'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{customer.phone || '-'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            {searchTerm
              ? '검색 결과가 없습니다'
              : '모든 고객이 이미 이 쿠폰을 보유하고 있습니다'}
          </div>
        )}
      </motion.div>

      {/* 보유/사용 고객 목록 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg shadow"
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">보유 고객 현황</h2>
        </div>

        {/* 탭 */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('unused')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'unused'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              미사용 ({unusedHolders.length})
            </button>
            <button
              onClick={() => setActiveTab('used')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'used'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              사용 완료 ({usedHolders.length})
            </button>
          </nav>
        </div>

        {/* 고객 목록 */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  이메일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  발급일
                </th>
                {activeTab === 'used' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사용일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      주문번호
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      할인금액
                    </th>
                  </>
                )}
                {activeTab === 'unused' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(activeTab === 'unused' ? unusedHolders : usedHolders).length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'used' ? 6 : 4} className="px-6 py-12 text-center text-gray-500">
                    {activeTab === 'unused' ? '미사용 쿠폰이 없습니다' : '사용 완료된 쿠폰이 없습니다'}
                  </td>
                </tr>
              ) : (
                (activeTab === 'unused' ? unusedHolders : usedHolders).map((holder) => (
                  <tr key={holder.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {holder.user?.name || '이름 없음'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">{holder.user?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {new Date(holder.issued_at).toLocaleDateString('ko-KR')}
                      </div>
                    </td>
                    {activeTab === 'used' && (
                      <>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">
                            {holder.used_at
                              ? new Date(holder.used_at).toLocaleDateString('ko-KR')
                              : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-blue-600 font-medium">
                            {holder.order?.customer_order_number || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-green-600">
                            {holder.discount_amount
                              ? `₩${holder.discount_amount.toLocaleString()}`
                              : '-'}
                          </div>
                        </td>
                      </>
                    )}
                    {activeTab === 'unused' && (
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          미사용
                        </span>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
