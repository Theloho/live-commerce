'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  UserIcon,
  PhoneIcon,
  AtSymbolIcon,
  MapPinIcon,
  ShoppingBagIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'

export default function AdminCustomersPage() {
  const router = useRouter()
  const { adminUser, loading: authLoading } = useAdminAuth()
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (adminUser?.email) {
      loadCustomers()
    }
  }, [adminUser])

  useEffect(() => {
    filterCustomers()
  }, [customers, searchTerm, sortBy])

  const loadCustomers = async () => {
    try {
      console.log('📋 고객 데이터 로딩 시작')
      setLoading(true)

      if (!adminUser?.email) return

      // Service Role API로 고객 데이터 조회
      const response = await fetch(`/api/admin/customers?adminEmail=${encodeURIComponent(adminUser.email)}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '고객 데이터 조회 실패')
      }

      const { customers: customersData } = await response.json()
      console.log('✅ DB 고객 데이터:', customersData)

      setCustomers(customersData)
      setLoading(false)
    } catch (error) {
      console.error('고객 데이터 로딩 오류:', error)
      setLoading(false)
      toast.error('고객 데이터를 불러오는데 실패했습니다')
    }
  }

  const filterCustomers = () => {
    let filtered = [...customers]

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm)
      )
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'orders':
          return b.orderCount - a.orderCount
        case 'spending':
          return b.totalSpent - a.totalSpent
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    setFilteredCustomers(filtered)
  }



  const getCustomerGrade = (totalSpent) => {
    if (totalSpent >= 1000000) {
      return { label: 'VIP', color: 'bg-yellow-100 text-yellow-800', icon: '👑' }
    } else if (totalSpent >= 500000) {
      return { label: 'GOLD', color: 'bg-amber-100 text-amber-800', icon: '🥇' }
    } else if (totalSpent >= 200000) {
      return { label: 'SILVER', color: 'bg-gray-100 text-gray-800', icon: '🥈' }
    } else if (totalSpent > 0) {
      return { label: 'BRONZE', color: 'bg-orange-100 text-orange-800', icon: '🥉' }
    } else {
      return { label: 'NEW', color: 'bg-blue-100 text-blue-800', icon: '🆕' }
    }
  }

  const formatLastOrder = (dateString) => {
    if (!dateString) return '주문없음'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return '1일 전'
    if (diffDays < 30) return `${diffDays}일 전`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`
    return `${Math.floor(diffDays / 365)}년 전`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">고객 관리</h1>
          <p className="text-gray-600">총 {customers.length}명의 고객</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadCustomers}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* Compact Stats */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200">
          <div className="p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <UserIcon className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-600">전체 고객</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{customers.length}</p>
          </div>

          <div className="p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <ShoppingBagIcon className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-600">활성 고객</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {customers.filter(c => c.status === 'active').length}
            </p>
          </div>

          <div className="p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-sm">👑</span>
              <span className="text-xs text-gray-600">VIP 고객</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {customers.filter(c => c.totalSpent >= 1000000).length}
            </p>
          </div>

          <div className="p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CalendarIcon className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-600">신규 고객</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {customers.filter(c => c.orderCount === 0).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="이름, 닉네임, 전화번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="recent">가입순</option>
              <option value="name">이름순</option>
              <option value="orders">주문수순</option>
              <option value="spending">구매금액순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers - 데스크톱 테이블 + 모바일 카드 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* 데스크톱 테이블 뷰 */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  연락처
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주문통계
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  등급
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer, index) => (
                <motion.tr
                  key={`${customer.id}-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {customer.avatar_url ? (
                          <img
                            src={customer.avatar_url}
                            alt={customer.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500">
                          {customer.nickname}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(customer.created_at).toLocaleDateString('ko-KR')} 가입
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <PhoneIcon className="w-3 h-3 text-gray-400" />
                        {customer.phone}
                      </div>
                      {customer.address !== '정보없음' && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MapPinIcon className="w-3 h-3 text-gray-400" />
                          <div className="flex flex-col">
                            <div>{customer.address.length > 20 ? customer.address.substring(0, 20) + '...' : customer.address}</div>
                            {customer.detailAddress && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                {customer.detailAddress.length > 15 ? customer.detailAddress.substring(0, 15) + '...' : customer.detailAddress}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.orderCount}건 주문
                      </div>
                      <div className="text-sm text-gray-600">
                        ₩{customer.totalSpent.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        최근: {formatLastOrder(customer.lastOrderDate)}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const grade = getCustomerGrade(customer.totalSpent)
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${grade.color}`}>
                          <span>{grade.icon}</span>
                          {grade.label}
                        </span>
                      )
                    })()}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/admin/customers/${customer.id}`)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="상세보기"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      {customer.kakaoLink && (
                        <button
                          onClick={() => window.open(customer.kakaoLink, '_blank')}
                          className="text-yellow-600 hover:text-yellow-700"
                          title="카카오톡 채팅"
                        >
                          <ChatBubbleLeftRightIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 뷰 */}
        <div className="lg:hidden divide-y divide-gray-200">
          {filteredCustomers.map((customer, index) => {
            const grade = getCustomerGrade(customer.totalSpent)

            return (
              <motion.div
                key={`${customer.id}-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-gray-50"
              >
                {/* 상단: 프로필 + 등급 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {customer.avatar_url ? (
                        <img
                          src={customer.avatar_url}
                          alt={customer.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{customer.name}</div>
                      <div className="text-xs text-gray-500">{customer.nickname}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(customer.created_at).toLocaleDateString('ko-KR')} 가입
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${grade.color}`}>
                    <span>{grade.icon}</span>
                    {grade.label}
                  </span>
                </div>

                {/* 중단: 연락처 + 주문통계 */}
                <div className="mb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <PhoneIcon className="w-3 h-3 text-gray-400" />
                      {customer.phone}
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      ₩{customer.totalSpent.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{customer.orderCount}건 주문</span>
                    <span>최근: {formatLastOrder(customer.lastOrderDate)}</span>
                  </div>
                </div>

                {/* 하단: 버튼들 */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => router.push(`/admin/customers/${customer.id}`)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium"
                  >
                    <EyeIcon className="w-4 h-4" />
                    상세보기
                  </button>
                  {customer.kakaoLink && (
                    <button
                      onClick={() => window.open(customer.kakaoLink, '_blank')}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 text-sm font-medium"
                    >
                      <ChatBubbleLeftRightIcon className="w-4 h-4" />
                      카카오톡
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">조건에 맞는 고객이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}