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
import { getAllCustomers } from '@/lib/supabaseApi'

export default function AdminCustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    filterCustomers()
  }, [customers, searchTerm, sortBy])

  const removeDuplicateUsers = () => {
    try {
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
      console.log('=== 안전한 중복 제거 로직 시작 ===')
      console.log('원본 사용자 수:', users.length)
      console.log('원본 사용자 데이터:', users.map(u => ({ id: u.id, name: u.name, nickname: u.nickname, email: u.email })))

      // 더 안전한 중복 제거: ID가 같은 경우에만 제거
      const uniqueUsers = []
      const seenIds = new Set()

      users.forEach(user => {
        if (!seenIds.has(user.id)) {
          seenIds.add(user.id)
          uniqueUsers.push(user)
        } else {
          console.log('ID 중복 제거된 사용자:', user.name, 'ID:', user.id)
        }
      })

      if (uniqueUsers.length !== users.length) {
        console.log(`ID 중복 사용자 ${users.length - uniqueUsers.length}명 제거됨`)
        localStorage.setItem('mock_users', JSON.stringify(uniqueUsers))
      } else {
        console.log('중복된 사용자 없음 - 모든 데이터 유지')
      }

      console.log('최종 사용자 수:', uniqueUsers.length)
      return uniqueUsers
    } catch (error) {
      console.error('중복 사용자 제거 중 오류:', error)
      return JSON.parse(localStorage.getItem('mock_users') || '[]')
    }
  }

  const loadCustomers = () => {
    try {
      // 중복 사용자 먼저 제거
      const users = removeDuplicateUsers()
      const orders = JSON.parse(localStorage.getItem('mock_orders') || '[]')

      console.log('=== 고객 데이터 디버그 ===')
      console.log('로드된 사용자 수:', users.length)
      console.log('로드된 사용자 데이터:', users)
      console.log('로드된 주문 수:', orders.length)

      // 사용자별 주문 통계 계산
      const customerData = users.map(user => {
        const userOrders = orders.filter(order => order.userId === user.id)
        const totalSpent = userOrders.reduce((sum, order) => sum + (order.payment?.amount || 0), 0)
        const lastOrderDate = userOrders.length > 0
          ? Math.max(...userOrders.map(order => new Date(order.created_at).getTime()))
          : null

        return {
          id: user.id,
          name: user.name || user.user_metadata?.name || '정보없음',
          nickname: user.nickname || user.user_metadata?.nickname || 'Unknown',
          phone: user.phone || user.user_metadata?.phone || '정보없음',
          address: user.address || user.user_metadata?.address || '정보없음',
          tiktokId: user.tiktokId || user.user_metadata?.tiktokId || '',
          youtubeId: user.youtubeId || user.user_metadata?.youtubeId || '',
          kakaoLink: user.kakaoLink || '',
          created_at: user.created_at,
          orderCount: userOrders.length,
          totalSpent: totalSpent,
          lastOrderDate: lastOrderDate ? new Date(lastOrderDate).toISOString() : null,
          status: userOrders.length > 0 ? 'active' : 'inactive'
        }
      })

      console.log('고객 데이터:', customerData)
      setCustomers(customerData)
      setLoading(false)
    } catch (error) {
      console.error('고객 데이터 로딩 오류:', error)
      setLoading(false)
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

  const cleanupDuplicates = () => {
    try {
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
      console.log('=== 휴대폰 번호 기준 중복 고객 정리 시작 ===')
      console.log('현재 고객 수:', users.length)
      console.log('모든 고객:', users.map(u => ({ id: u.id, name: u.name, phone: u.phone || u.user_metadata?.phone })))

      // 휴대폰 번호별로 그룹화하여 중복 찾기
      const phoneGroups = {}
      const noPhoneUsers = []

      users.forEach(user => {
        const phone = user.phone || user.user_metadata?.phone
        if (phone && phone.trim() && phone !== '정보없음') {
          if (!phoneGroups[phone]) {
            phoneGroups[phone] = []
          }
          phoneGroups[phone].push(user)
        } else {
          // 휴대폰 번호가 없는 고객은 별도로 보관 (삭제하지 않음)
          noPhoneUsers.push(user)
        }
      })

      console.log('휴대폰 번호별 그룹:', Object.keys(phoneGroups).map(phone => ({ phone, count: phoneGroups[phone].length })))

      const uniqueUsers = [...noPhoneUsers] // 휴대폰 번호 없는 고객들은 그대로 유지
      let removedCount = 0

      Object.entries(phoneGroups).forEach(([phone, usersWithSamePhone]) => {
        if (usersWithSamePhone.length > 1) {
          console.log(`휴대폰 번호 중복 발견: "${phone}" - ${usersWithSamePhone.length}명`)
          // 가장 최근에 생성된 것만 유지 (created_at 기준)
          const sortedUsers = usersWithSamePhone.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          const keepUser = sortedUsers[0]
          const removeUsers = sortedUsers.slice(1)

          console.log(`유지할 고객:`, { id: keepUser.id, name: keepUser.name, phone: keepUser.phone, created_at: keepUser.created_at })
          console.log(`삭제할 고객들:`, removeUsers.map(u => ({ id: u.id, name: u.name, phone: u.phone, created_at: u.created_at })))

          uniqueUsers.push(keepUser)
          removedCount += removeUsers.length
        } else {
          // 중복되지 않은 고객은 그대로 유지
          uniqueUsers.push(usersWithSamePhone[0])
        }
      })

      if (removedCount > 0) {
        localStorage.setItem('mock_users', JSON.stringify(uniqueUsers))
        toast.success(`휴대폰 번호 중복 고객 ${removedCount}명이 정리되었습니다`)
        console.log(`총 ${removedCount}명의 중복 고객 제거됨`)
        loadCustomers()
      } else {
        toast.info('휴대폰 번호 중복 고객이 없습니다')
        console.log('휴대폰 번호 중복 고객 없음')
      }

      console.log('=== 휴대폰 번호 기준 중복 정리 완료 ===')
    } catch (error) {
      console.error('중복 고객 정리 오류:', error)
      toast.error('중복 고객 정리에 실패했습니다')
    }
  }

  const createTestCustomer = () => {
    try {
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]')

      // 기존에 같은 이름의 고객이 있는지 확인
      const existingKimuchin = users.find(user => user.name === '기무친')
      const existingHolgildong = users.find(user => user.name === '홀길동')

      const newCustomers = []

      // 기무친 고객이 없으면 생성
      if (!existingKimuchin) {
        const testCustomer1 = {
          id: 'test-customer-kimuchin-' + Date.now(),
          name: '기무친',
          nickname: '기무친',
          phone: '010-1234-5678',
          address: '서울시 강남구 테스트동 123-45',
          created_at: new Date().toISOString(),
          kakaoLink: ''
        }
        newCustomers.push(testCustomer1)
        users.push(testCustomer1)
      }

      // 홀길동 고객이 없으면 생성
      if (!existingHolgildong) {
        const testCustomer2 = {
          id: 'test-customer-holgildong-' + Date.now(),
          name: '홀길동',
          nickname: '홀길동',
          phone: '010-9876-5432',
          address: '서울시 강서구 홀길동 987-65',
          created_at: new Date().toISOString(),
          kakaoLink: ''
        }
        newCustomers.push(testCustomer2)
        users.push(testCustomer2)
      }

      if (newCustomers.length === 0) {
        toast.info('기무친, 홀길동 고객이 이미 존재합니다')
        return
      }

      localStorage.setItem('mock_users', JSON.stringify(users))

      // 새로 생성된 고객에 대해서만 테스트 주문 추가
      const orders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
      const newOrders = []

      newCustomers.forEach(customer => {
        const testOrder = {
          id: 'test-order-' + customer.name + '-' + Date.now(),
          userId: customer.id,
          customerOrderNumber: 'ORD-' + Date.now() + Math.random().toString(36).substr(2, 4),
          status: 'paid',
          payment: {
            method: 'bank_transfer',
            amount: customer.name === '기무친' ? 50000 : 30000
          },
          shipping: {
            name: customer.name,
            phone: customer.phone,
            address: customer.address
          },
          items: [{
            name: customer.name === '기무친' ? '테스트 상품' : '테스트 상품2',
            quantity: 1,
            price: customer.name === '기무친' ? 50000 : 30000,
            title: customer.name === '기무친' ? '테스트 상품' : '테스트 상품2'
          }],
          created_at: new Date().toISOString(),
          depositName: customer.name
        }
        newOrders.push(testOrder)
        orders.push(testOrder)
      })

      localStorage.setItem('mock_orders', JSON.stringify(orders))

      const customerNames = newCustomers.map(c => c.name).join(', ')
      toast.success(`테스트 고객 "${customerNames}"이 생성되었습니다`)
      loadCustomers()
    } catch (error) {
      console.error('테스트 고객 생성 오류:', error)
      toast.error('테스트 고객 생성에 실패했습니다')
    }
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
            onClick={createTestCustomer}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            테스트 고객 생성
          </button>
          <button
            onClick={cleanupDuplicates}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            중복 정리
          </button>
          <button
            onClick={loadCustomers}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">전체 고객</p>
              <p className="text-xl font-bold text-gray-900">{customers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <ShoppingBagIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">활성 고객</p>
              <p className="text-xl font-bold text-gray-900">
                {customers.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">👑</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">VIP 고객</p>
              <p className="text-xl font-bold text-gray-900">
                {customers.filter(c => c.totalSpent >= 1000000).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">신규 고객</p>
              <p className="text-xl font-bold text-gray-900">
                {customers.filter(c => c.orderCount === 0).length}
              </p>
            </div>
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

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
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
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <AtSymbolIcon className="w-3 h-3" />
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
                          {customer.address.length > 20 ? customer.address.substring(0, 20) + '...' : customer.address}
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