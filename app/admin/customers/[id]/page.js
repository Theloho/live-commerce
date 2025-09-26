'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  AtSymbolIcon,
  CalendarIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ClockIcon,
  StarIcon,
  TrophyIcon,
  ChatBubbleLeftRightIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export default function AdminCustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState(null)
  const [customerOrders, setCustomerOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditingKakao, setIsEditingKakao] = useState(false)
  const [kakaoLink, setKakaoLink] = useState('')

  useEffect(() => {
    loadCustomerDetail()
  }, [params.id])

  const loadCustomerDetail = async () => {
    try {
      setLoading(true)

      // profiles 테이블에서 고객 정보 가져오기
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.id)
        .single()

      if (profileError || !profile) {
        console.error('고객을 찾을 수 없습니다:', profileError)
        toast.error('고객을 찾을 수 없습니다')
        setLoading(false)
        return
      }

      // 해당 고객의 주문 정보 가져오기 (고객명으로 매칭)
      const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              title,
              thumbnail_url
            )
          ),
          order_shipping!inner (
            name,
            phone,
            address,
            detail_address
          ),
          order_payments (
            amount,
            method,
            status
          )
        `)
        .eq('order_shipping.name', profile.name)
        .order('created_at', { ascending: false })

      if (orderError) {
        console.warn('주문 조회 오류:', orderError)
      }

      // 주문 통계 계산
      const userOrders = orders || []
      let totalSpent = 0
      let lastOrderDate = null

      console.log('📊 주문 통계 계산 시작:', {
        총주문수: userOrders.length,
        주문목록: userOrders.map(order => ({
          id: order.id,
          status: order.status,
          payments: order.order_payments?.length || 0,
          total_amount: order.total_amount
        }))
      })

      userOrders.forEach(order => {
        // 모든 상태의 주문에서 결제 금액 계산 (pending 제외)
        if (order.status !== 'pending' && order.status !== 'cancelled') {
          const payment = order.order_payments?.[0]
          const orderAmount = payment?.amount || order.total_amount || 0
          totalSpent += orderAmount
          console.log(`💰 주문 ${order.id}: ${orderAmount}원 추가 (상태: ${order.status})`)
        }
      })

      if (userOrders.length > 0) {
        lastOrderDate = userOrders[0].created_at
      }

      console.log('📊 주문 통계 완료:', {
        총구매금액: totalSpent,
        주문수: userOrders.length,
        최근주문일: lastOrderDate
      })

      // 고객 정보 구성
      const customerData = {
        id: profile.id,
        name: profile.name || '정보없음',
        nickname: profile.nickname || profile.name || '사용자',
        phone: profile.phone || '정보없음',
        address: profile.address || '정보없음',
        detailAddress: profile.detail_address || '',
        avatarUrl: profile.avatar_url || '',
        tiktokId: profile.tiktok_id || '',
        youtubeId: profile.youtube_id || '',
        kakaoLink: profile.kakao_link || profile.kakao_id || '',
        created_at: profile.created_at,
        orderCount: userOrders.length,
        totalSpent: totalSpent,
        lastOrderDate: lastOrderDate,
        status: userOrders.length > 0 ? 'active' : 'inactive'
      }

      console.log('✅ 고객 데이터 구성 완료:', {
        name: customerData.name,
        orderCount: customerData.orderCount,
        totalSpent: customerData.totalSpent,
        ordersData: userOrders.length
      })

      setCustomer(customerData)
      setKakaoLink(customerData.kakaoLink)
      setCustomerOrders(userOrders)
      setLoading(false)
    } catch (error) {
      console.error('고객 상세 정보 로드 실패:', error)
      toast.error('고객 정보를 불러오는데 실패했습니다')
      setLoading(false)
    }
  }

  const saveKakaoLink = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ kakao_link: kakaoLink })
        .eq('id', params.id)

      if (error) throw error

      // 현재 customer 상태 업데이트
      setCustomer(prev => ({ ...prev, kakaoLink }))
      setIsEditingKakao(false)
      toast.success('카카오톡 링크가 저장되었습니다')
    } catch (error) {
      console.error('카카오톡 링크 저장 실패:', error)
      toast.error('저장에 실패했습니다')
    }
  }

  const getCustomerGrade = (totalSpent) => {
    if (totalSpent >= 1000000) return { label: 'VIP', color: 'bg-yellow-100 text-yellow-800', icon: '👑' }
    else if (totalSpent >= 500000) return { label: 'GOLD', color: 'bg-amber-100 text-amber-800', icon: '🥇' }
    else if (totalSpent >= 200000) return { label: 'SILVER', color: 'bg-gray-100 text-gray-800', icon: '🥈' }
    else if (totalSpent >= 50000) return { label: 'BRONZE', color: 'bg-orange-100 text-orange-800', icon: '🥉' }
    else return { label: 'NEW', color: 'bg-green-100 text-green-800', icon: '🌱' }
  }

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { text: '결제대기', color: 'bg-yellow-100 text-yellow-800' },
      verifying: { text: '결제확인중', color: 'bg-blue-100 text-blue-800' },
      paid: { text: '결제완료', color: 'bg-green-100 text-green-800' },
      delivered: { text: '배송완료', color: 'bg-purple-100 text-purple-800' },
      cancelled: { text: '취소됨', color: 'bg-red-100 text-red-800' }
    }
    return statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">고객을 찾을 수 없습니다</h1>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  const grade = getCustomerGrade(customer.totalSpent)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  고객 상세 정보
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 고객 기본 정보 */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-6"
            >
              {/* 프로필 헤더 */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                  {customer.avatarUrl ? (
                    <img
                      src={customer.avatarUrl}
                      alt={customer.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-10 h-10 text-red-600" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <AtSymbolIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{customer.nickname}</span>
                </div>
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${grade.color}`}>
                    <span>{grade.icon}</span>
                    {grade.label}
                  </span>
                </div>
              </div>

              {/* 연락처 정보 */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <PhoneIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">전화번호</p>
                    <p className="font-medium text-gray-900">{customer.phone}</p>
                  </div>
                </div>

                {customer.address !== '정보없음' && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <MapPinIcon className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">주소</p>
                      <p className="font-medium text-gray-900">{customer.address}</p>
                      {customer.detailAddress && (
                        <p className="text-xs text-gray-600 mt-1">{customer.detailAddress}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">가입일</p>
                    <p className="font-medium text-gray-900">
                      {new Date(customer.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* 카카오톡 채팅 링크 섹션 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">카카오톡 채팅</h3>
                  {!isEditingKakao && (
                    <button
                      onClick={() => setIsEditingKakao(true)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isEditingKakao ? (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={kakaoLink}
                      onChange={(e) => setKakaoLink(e.target.value)}
                      placeholder="https://open.kakao.com/..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveKakaoLink}
                        className="flex-1 px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <CheckIcon className="w-3 h-3 inline mr-1" />
                        저장
                      </button>
                      <button
                        onClick={() => {
                          setKakaoLink(customer.kakaoLink)
                          setIsEditingKakao(false)
                        }}
                        className="flex-1 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        <XMarkIcon className="w-3 h-3 inline mr-1" />
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {customer.kakaoLink ? (
                      <button
                        onClick={() => window.open(customer.kakaoLink, '_blank')}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
                      >
                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">채팅 열기</span>
                      </button>
                    ) : (
                      <p className="text-sm text-gray-400">링크가 등록되지 않았습니다</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* 통계 카드들 */}
            <div className="grid grid-cols-1 gap-4 mt-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg shadow p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">총 구매금액</p>
                    <p className="text-lg font-bold text-gray-900">₩{customer.totalSpent.toLocaleString()}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <ShoppingBagIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">총 주문수</p>
                    <p className="text-lg font-bold text-gray-900">{customer.orderCount}건</p>
                  </div>
                </div>
              </motion.div>

              {customer.lastOrderDate && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-lg shadow p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <ClockIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">최근 주문일</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(customer.lastOrderDate).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* 주문 내역 */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-lg shadow"
            >
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">주문 내역</h3>
                <p className="text-sm text-gray-500 mt-1">총 {customerOrders.length}건의 주문</p>
              </div>

              <div className="divide-y divide-gray-200">
                {customerOrders.length === 0 ? (
                  <div className="p-8 text-center">
                    <ShoppingBagIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">아직 주문 내역이 없습니다.</p>
                  </div>
                ) : (
                  customerOrders.map((order, index) => {
                    const statusInfo = getStatusInfo(order.status)
                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="p-6 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-900">
                              {order.customer_order_number || order.id.slice(-8)}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                              {statusInfo.text}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {order.order_items?.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                {item.products?.thumbnail_url ? (
                                  <img
                                    src={item.products.thumbnail_url}
                                    alt={item.products?.title || '상품'}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <ShoppingBagIcon className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{item.products?.title || '상품명 없음'}</p>
                                <p className="text-xs text-gray-500">수량: {item.quantity || 1}개</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  ₩{(item.price * item.quantity || 0).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          )) || []}
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">총 결제금액</span>
                            <span className="text-sm font-bold text-gray-900">
                              ₩{(order.order_payments?.[0]?.amount || order.total_amount || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}