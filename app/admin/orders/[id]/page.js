'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  UserIcon,
  MapPinIcon,
  CreditCardIcon,
  CheckIcon,
  XMarkIcon,
  PhoneIcon,
  AtSymbolIcon,
  ClockIcon,
  TruckIcon,
  BanknotesIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import { formatShippingInfo } from '@/lib/shippingUtils'
import { OrderCalculations } from '@/lib/orderCalculations'
import { getTrackingUrl, getCarrierName } from '@/lib/trackingNumberUtils'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'
import toast from 'react-hot-toast'

export default function AdminOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { adminUser, loading: authLoading } = useAdminAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && adminUser) {
      loadOrderDetail()
    } else if (!authLoading && !adminUser) {
      toast.error('관리자 권한이 필요합니다')
      router.push('/admin/login')
    }
  }, [params.id, authLoading, adminUser])

  const loadOrderDetail = async () => {
    try {
      setLoading(true)

      console.log('🔍 [관리자 주문 상세] API 호출 시작:', {
        orderId: params.id,
        adminEmail: adminUser?.email
      })

      const response = await fetch(
        `/api/admin/orders?adminEmail=${adminUser.email}&orderId=${params.id}`
      )

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ [관리자 주문 상세] API 오류:', error)
        throw new Error(error.error || '주문 조회에 실패했습니다')
      }

      const data = await response.json()
      console.log('✅ [관리자 주문 상세] API 응답:', {
        success: data.success,
        ordersCount: data.orders?.length
      })

      if (data.success && data.orders && data.orders.length > 0) {
        const foundOrder = data.orders[0]

        // 데이터 포맷팅 (기존 getOrderById와 동일한 형식으로)
        // ✅ order_shipping과 order_payments는 배열로 반환되므로 첫 번째 요소 추출
        const shippingData = Array.isArray(foundOrder.order_shipping)
          ? foundOrder.order_shipping[0]
          : foundOrder.order_shipping
        const paymentData = Array.isArray(foundOrder.order_payments)
          ? foundOrder.order_payments[0]
          : foundOrder.order_payments

        const formattedOrder = {
          ...foundOrder,
          userName: foundOrder.userProfile?.name || shippingData?.name || '정보없음',
          userNickname: foundOrder.userProfile?.nickname || '정보없음',
          depositName: paymentData?.depositor_name || foundOrder.depositName,
          discount_amount: foundOrder.discount_amount || 0,
          is_free_shipping: foundOrder.is_free_shipping || false,  // ✅ 무료배송 플래그
          items: (foundOrder.order_items || []).map(item => ({
            ...item,
            image: item.thumbnail_url || item.products?.thumbnail_url || '/placeholder.png',
            title: item.title || item.products?.title || '상품명 없음',
            price: item.price || item.unit_price || item.products?.price || 0,
            quantity: item.quantity || 1
          })),
          shipping: shippingData,
          payment: paymentData
        }

        setOrder(formattedOrder)
        console.log('✅ [관리자 주문 상세] 주문 데이터 로드 완료:', formattedOrder.customer_order_number || formattedOrder.id)
      } else {
        toast.error('주문을 찾을 수 없습니다')
        router.push('/admin/orders')
      }
    } catch (error) {
      console.error('❌ [관리자 주문 상세] 로딩 오류:', error)
      toast.error('주문 정보를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (newStatus) => {
    try {
      const { updateOrderStatus: updateStatus } = await import('@/lib/supabaseApi')
      await updateStatus(order.id, newStatus)
      setOrder({ ...order, status: newStatus })
      toast.success('주문 상태가 변경되었습니다')
    } catch (error) {
      console.error('주문 상태 변경 오류:', error)
      toast.error('상태 변경에 실패했습니다')
      // 실패 시 데이터 다시 로드
      loadOrderDetail()
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: '결제대기', color: 'bg-yellow-100 text-yellow-800' },
      verifying: { label: '결제확인중', color: 'bg-purple-100 text-purple-800' },
      deposited: { label: '입금확인', color: 'bg-emerald-100 text-emerald-800' },
      paid: { label: '결제완료', color: 'bg-blue-100 text-blue-800' },
      shipping: { label: '발송 중', color: 'bg-orange-100 text-orange-800' },
      delivered: { label: '발송완료', color: 'bg-green-100 text-green-800' },
      cancelled: { label: '취소됨', color: 'bg-red-100 text-red-800' }
    }
    const statusInfo = statusMap[status] || statusMap.pending
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  const getPaymentMethodDisplay = (method) => {
    const methodMap = {
      cart: {
        text: '장바구니',
        icon: BanknotesIcon,
        color: 'text-indigo-700' // 진한 남색
      },
      bank_transfer: {
        text: '계좌이체',
        icon: BanknotesIcon,
        color: 'text-cyan-700' // 진한 시안
      },
      card: {
        text: '카드결제',
        icon: CreditCardIcon,
        color: 'text-emerald-700' // 진한 에메랄드
      }
    }
    return methodMap[method] || {
      text: method,
      icon: BanknotesIcon,
      color: 'text-slate-600'
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        <p className="text-sm text-gray-500">
          {authLoading ? '관리자 인증 확인 중...' : '주문 정보 로딩 중...'}
        </p>
      </div>
    )
  }

  if (!adminUser) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">관리자 권한이 필요합니다.</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">주문을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              주문 상세 (관리자)
            </h1>
            {getStatusBadge(order.status)}
          </div>
          <div className="mt-1 space-y-1">
            <p className="text-gray-600">
              주문번호: {order.customer_order_number || order.id}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <p className="text-gray-500">
                생성: {new Date(order.created_at).toLocaleString('ko-KR', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </p>
              {order.verifying_at && (
                <p className="text-purple-600 font-medium">
                  결제확인: {new Date(order.verifying_at).toLocaleString('ko-KR', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </p>
              )}
              {order.paid_at && (
                <p className="text-green-600 font-medium">
                  결제완료: {new Date(order.paid_at).toLocaleString('ko-KR', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </p>
              )}
              {order.delivered_at && (
                <p className="text-blue-600 font-medium">
                  발송완료: {new Date(order.delivered_at).toLocaleString('ko-KR', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </p>
              )}
              {order.cancelled_at && (
                <p className="text-red-600 font-medium">
                  취소: {new Date(order.cancelled_at).toLocaleString('ko-KR', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Customer Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <UserIcon className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">고객 정보</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{order.userName || order.shipping?.name || '정보없음'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <AtSymbolIcon className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{order.userNickname && order.userNickname !== '정보없음' ? order.userNickname : '익명'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <PhoneIcon className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{order.shipping?.phone || '정보없음'}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Shipping Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPinIcon className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">배송 정보</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 mb-1">받는 분</p>
                <p className="font-medium text-gray-900">{order.shipping?.name || '정보없음'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">연락처</p>
                <p className="font-medium text-gray-900">{order.shipping?.phone || '정보없음'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">배송지</p>
                <p className="font-medium text-gray-900">
                  [{order.shipping?.postal_code || order.shipping?.zipcode || '우편번호 미입력'}] {order.shipping?.address || '주소 정보 없음'}
                </p>
                {order.shipping?.detail_address && (
                  <p className="text-gray-700 mt-1">{order.shipping.detail_address}</p>
                )}
              </div>
              {order.shipping?.delivery_memo && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">배송 메모</p>
                  <p className="text-gray-900 bg-gray-50 p-2 rounded text-sm">
                    {order.shipping.delivery_memo}
                  </p>
                </div>
              )}
              {/* 송장번호 표시 (발송완료/발송중 상태인 경우) */}
              {(order.status === 'delivered' || order.status === 'shipping') && order.shipping?.tracking_number && (
                <div className="pt-3 border-t space-y-2">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">택배사</p>
                    <p className="font-medium text-gray-900">
                      {getCarrierName(order.shipping?.tracking_company)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">송장번호</p>
                    <a
                      href={getTrackingUrl(order.shipping?.tracking_company, order.shipping?.tracking_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-mono font-medium"
                    >
                      {order.shipping.tracking_number}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Payment Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <CreditCardIcon className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">결제 정보</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">결제 방법</span>
                {(() => {
                  const paymentInfo = getPaymentMethodDisplay(order.payment?.method)
                  const Icon = paymentInfo.icon
                  return (
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${paymentInfo.color}`} />
                      <span className={`text-sm font-medium ${paymentInfo.color}`}>
                        {paymentInfo.text}
                      </span>
                    </div>
                  )
                })()}
              </div>
              {/* 결제 금액 상세 (중앙화된 계산 모듈 사용) */}
              {(() => {
                // ✅ DB 저장된 무료배송 조건 사용 (결제대기는 결제 전이므로 0원 표시)
                const baseShippingFee = order.status === 'pending' ? 0 : (order.is_free_shipping ? 0 : 4000)
                const shippingInfo = formatShippingInfo(
                  baseShippingFee,
                  order.shipping?.postal_code
                )

                // 🧮 중앙화된 계산 모듈 사용
                const orderCalc = OrderCalculations.calculateFinalOrderAmount(order.items, {
                  region: shippingInfo.region,
                  coupon: order.discount_amount > 0 ? {
                    type: 'fixed_amount',  // DB에서 discount_amount만 저장됨
                    value: order.discount_amount
                  } : null,
                  paymentMethod: order.payment?.method === 'card' ? 'card' : 'transfer',
                  baseShippingFee: baseShippingFee  // ✅ 무료배송 플래그 전달
                })

                console.log('💰 관리자 주문 상세 금액 계산 (중앙화 모듈):', {
                  ...orderCalc.breakdown,
                  postalCode: order.shipping?.postal_code,
                  shippingInfo
                })

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">상품 금액</span>
                      <span className="font-medium">₩{orderCalc.itemsTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">배송비</span>
                      <div className="text-right">
                        <span className="font-medium">₩{orderCalc.shippingFee.toLocaleString()}</span>
                        {shippingInfo.isRemote && (
                          <p className="text-xs text-orange-600">
                            ({shippingInfo.region} +₩{shippingInfo.surcharge.toLocaleString()})
                          </p>
                        )}
                      </div>
                    </div>
                    {orderCalc.couponApplied && orderCalc.couponDiscount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-blue-600">쿠폰 할인</span>
                        <span className="font-medium text-blue-600">-₩{orderCalc.couponDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    {order.payment?.method === 'card' && orderCalc.vat > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">부가세 (10%)</span>
                        <span className="font-medium">₩{orderCalc.vat.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-gray-900 font-semibold">최종 결제 금액</span>
                      <span className="font-bold text-lg text-red-600">₩{orderCalc.finalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })()}
              {order.payment?.method === 'bank_transfer' && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">입금 계좌</span>
                    <span className="font-medium">카카오뱅크 79421940478</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">예금주</span>
                    <span className="font-medium">하상윤</span>
                  </div>
                  {order.depositName && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">입금자명</span>
                      <span className="font-medium">{order.depositName}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* Order Status Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <ClockIcon className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">주문 진행 상황</h2>
            </div>
            <div className="space-y-3">
              {/* 주문 생성 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">주문 생성</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </p>
                </div>
              </div>

              {/* 결제 확인중 */}
              {['verifying', 'paid', 'delivered'].includes(order.status) && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-purple-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">결제 확인중</p>
                    <p className="text-xs text-gray-500">
                      {order.verifying_at
                        ? new Date(order.verifying_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        : order.status === 'verifying' && order.updated_at && order.updated_at !== order.created_at
                        ? new Date(order.updated_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        : '처리 대기중'}
                    </p>
                  </div>
                </div>
              )}

              {/* 결제 완료 */}
              {['paid', 'shipping', 'delivered'].includes(order.status) && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-green-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">결제 완료</p>
                    <p className="text-xs text-gray-500">
                      {order.paid_at
                        ? new Date(order.paid_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        : order.payment?.paid_at
                        ? new Date(order.payment.paid_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        : order.status === 'paid' && order.updated_at
                        ? new Date(order.updated_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        : '처리 대기중'}
                    </p>
                  </div>
                </div>
              )}

              {/* 발송 중 */}
              {['shipping', 'delivered'].includes(order.status) && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-orange-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">발송 중</p>
                    <p className="text-xs text-gray-500">
                      {order.shipping?.shipped_at
                        ? new Date(order.shipping.shipped_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        : order.status === 'shipping' && order.updated_at
                        ? new Date(order.updated_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        : '처리 대기중'}
                    </p>
                  </div>
                </div>
              )}

              {/* 발송 완료 */}
              {order.status === 'delivered' && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-600"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">발송 완료</p>
                    <p className="text-xs text-gray-500">
                      {order.delivered_at
                        ? new Date(order.delivered_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        : order.shipping?.delivered_at
                        ? new Date(order.shipping.delivered_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        : order.updated_at
                        ? new Date(order.updated_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        : '배송 대기중'}
                    </p>
                  </div>
                </div>
              )}

              {/* 취소됨 */}
              {order.status === 'cancelled' && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-red-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-600">주문 취소</p>
                    <p className="text-xs text-gray-500">
                      {order.cancelled_at
                        ? new Date(order.cancelled_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        : order.updated_at
                        ? new Date(order.updated_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        : '-'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Order Status Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">주문 상태 관리</h2>

            {/* 버튼 그룹 - 좌우 배치 (취소 버튼 최좌측) */}
            <div className="flex items-center gap-3">
              {/* 취소 버튼 - 최좌측 (실수 클릭 방지) */}
              {(order.status === 'pending' || order.status === 'verifying') && (
                <button
                  onClick={() => {
                    if (window.confirm('이 주문을 취소하시겠습니까?')) {
                      updateOrderStatus('cancelled')
                    }
                  }}
                  className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <XMarkIcon className="w-5 h-5" />
                  주문 취소
                </button>
              )}

              {/* 주문 상태별 액션 버튼 */}
              {order.status === 'pending' && (
                <button
                  onClick={() => updateOrderStatus('verifying')}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <CheckIcon className="w-5 h-5" />
                  입금 확인
                </button>
              )}

              {order.status === 'verifying' && (
                <button
                  onClick={() => updateOrderStatus('paid')}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <CheckIcon className="w-5 h-5" />
                  결제 확인 완료
                </button>
              )}

              {order.status === 'paid' && (
                <button
                  onClick={() => updateOrderStatus('delivered')}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <TruckIcon className="w-5 h-5" />
                  발송 완료 처리
                </button>
              )}

              {order.status === 'shipping' && (
                <button
                  onClick={() => updateOrderStatus('delivered')}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <CheckIcon className="w-5 h-5" />
                  발송 완료 처리
                </button>
              )}

              {/* 완료/취소 상태 표시 */}
              {order.status === 'delivered' && (
                <div className="flex-1 text-center py-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <TruckIcon className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="font-medium text-green-600">배송 완료된 주문입니다</p>
                </div>
              )}

              {order.status === 'cancelled' && (
                <div className="flex-1 text-center py-4 bg-red-50 rounded-lg border-2 border-red-200">
                  <XMarkIcon className="w-8 h-8 mx-auto mb-2 text-red-600" />
                  <p className="font-medium text-red-600">취소된 주문입니다</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Order Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">주문 상품</h2>
        <div className="space-y-4">
          {order.items.map((item, index) => (
            <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <PhotoIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500">수량: {item.quantity || 1}개</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">
                  ₩{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  ₩{(item.price || 0).toLocaleString()} × {item.quantity || 1}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="space-y-2">
            {/* 결제 금액 상세 (중앙화된 계산 모듈 사용) */}
            {(() => {
              // ✅ DB 저장된 무료배송 조건 사용 (결제대기는 결제 전이므로 0원 표시)
              const baseShippingFee = order.status === 'pending' ? 0 : (order.is_free_shipping ? 0 : 4000)
              const shippingInfo = formatShippingInfo(
                baseShippingFee,
                order.shipping?.postal_code
              )

              // 🧮 중앙화된 계산 모듈 사용
              const orderCalc = OrderCalculations.calculateFinalOrderAmount(order.items, {
                region: shippingInfo.region,
                coupon: order.discount_amount > 0 ? {
                  type: 'fixed_amount',  // DB에서 discount_amount만 저장됨
                  value: order.discount_amount
                } : null,
                paymentMethod: order.payment?.method === 'card' ? 'card' : 'transfer',
                baseShippingFee: baseShippingFee  // ✅ 무료배송 플래그 전달
              })

              console.log('💰 관리자 주문 상세 하단 금액 계산 (중앙화 모듈):', {
                ...orderCalc.breakdown,
                'order.status': order.status,
                'postalCode': order.shipping?.postal_code,
                'shippingInfo': shippingInfo,
                'order.payment?.amount (DB값)': order.payment?.amount
              })

              return (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">상품 금액</span>
                    <span>₩{orderCalc.itemsTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      배송비
                      {shippingInfo.isRemote && (
                        <span className="text-orange-600 text-xs ml-1">
                          (+{shippingInfo.region})
                        </span>
                      )}
                    </span>
                    <span>{orderCalc.shippingFee > 0 ? `₩${orderCalc.shippingFee.toLocaleString()}` : '무료'}</span>
                  </div>
                  {orderCalc.couponApplied && orderCalc.couponDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600">쿠폰 할인</span>
                      <span className="text-blue-600">-₩{orderCalc.couponDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {order.payment?.method === 'card' && orderCalc.vat > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">부가세 (10%)</span>
                      <span>₩{orderCalc.vat.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>총 결제 금액</span>
                    <span className="text-red-600">₩{orderCalc.finalAmount.toLocaleString()}</span>
                  </div>
                  {order.payment?.amount && Math.abs(order.payment.amount - orderCalc.finalAmount) > 1 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      ⚠️ DB 저장값(₩{order.payment?.amount?.toLocaleString()})과 계산값(₩{orderCalc.finalAmount.toLocaleString()})이 다릅니다
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      </motion.div>
    </div>
  )
}