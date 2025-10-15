'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ClockIcon,
  ClipboardDocumentIcon,
  HomeIcon,
  InformationCircleIcon,
  ArrowLeftIcon,
  PencilIcon,
  CheckCircleIcon,
  TruckIcon,
  ExclamationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import useAuth from '@/hooks/useAuth'
import { formatShippingInfo } from '@/lib/shippingUtils'
import { OrderCalculations } from '@/lib/orderCalculations'
import { getTrackingUrl, getCarrierName } from '@/lib/trackingNumberUtils'
import toast from 'react-hot-toast'

export default function OrderCompletePage() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated } = useAuth()
  const [orderData, setOrderData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [userSession, setUserSession] = useState(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [shippingForm, setShippingForm] = useState({
    name: '',
    phone: '',
    address: '',
    detail_address: ''
  })

  // 카카오 세션 확인
  useEffect(() => {
    const checkKakaoSession = () => {
      try {
        const storedUser = sessionStorage.getItem('user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          setUserSession(userData)
          console.log('주문완료 페이지 - 카카오 세션 복원:', userData)
        } else {
          setUserSession(null)
        }
      } catch (error) {
        console.error('주문완료 페이지 - 세션 확인 오류:', error)
        setUserSession(null)
      }
    }

    checkKakaoSession()
    setSessionLoaded(true)
  }, [])

  useEffect(() => {
    // 세션이 완전히 로드될 때까지 기다림
    if (!sessionLoaded) {
      console.log('세션 로딩 중, 대기...')
      return
    }

    const currentUser = userSession || user
    const isUserLoggedIn = userSession || isAuthenticated

    console.log('주문완료 페이지 인증 확인:', { isAuthenticated, userSession, isUserLoggedIn, sessionLoaded })

    if (!isUserLoggedIn) {
      console.log('인증되지 않은 사용자, 로그인 페이지로 리다이렉트')
      toast.error('로그인이 필요합니다')
      router.push('/login')
      return
    }

    // 세션에서 최근 주문 정보 가져오기
    const recentOrder = sessionStorage.getItem('recentOrder')
    if (recentOrder) {
      const orderInfo = JSON.parse(recentOrder)
      if (orderInfo.id === params.id) {
        setOrderData(orderInfo)
        setShippingForm({
          name: orderInfo.shipping.name,
          phone: orderInfo.shipping.phone,
          address: orderInfo.shipping.address,
          detail_address: orderInfo.shipping.detail_address || ''
        })
        // 한 번 확인 후 세션에서 제거
        sessionStorage.removeItem('recentOrder')
        setLoading(false)
        return
      }
    }

    // 세션에 없다면 API에서 주문 찾기 (카카오 사용자 지원)
    const fetchOrderData = async () => {
      try {
        let order = null

        // 통합된 주문 조회 방식 - supabaseApi.getOrderById 사용
        try {
          const { getOrderById } = await import('@/lib/supabaseApi')
          order = await getOrderById(params.id)
          console.log('📋 NEW CODE: 주문 상세 데이터 조회 완료:', order)
        } catch (error) {
          console.error('📋 supabaseApi 주문 조회 실패:', error)

          // 폴백: sessionStorage에서 최근 주문 확인 (디버깅용으로 일시 비활성화)
          console.log('📋 sessionStorage 폴백 건너뛰기 - getOrderById 우선 사용')
          // const recentOrder = sessionStorage.getItem('recentOrder')
          // if (recentOrder) {
          //   const orderInfo = JSON.parse(recentOrder)
          //   if (orderInfo.id === params.id) {
          //     order = orderInfo
          //     console.log('📋 sessionStorage에서 주문 데이터 복원:', order)
          //   }
          // }
        }

        if (order) {
          setOrderData(order)
          setShippingForm({
            name: order.shipping?.name || '',
            phone: order.shipping?.phone || '',
            address: order.shipping?.address || '',
            detail_address: order.shipping?.detail_address || ''
          })
        } else {
          toast.error('주문 정보를 찾을 수 없습니다')
          router.push('/orders')
          return
        }
      } catch (error) {
        console.error('주문 정보 조회 실패:', error)
        toast.error('주문 정보를 불러오는데 실패했습니다')
        router.push('/orders')
        return
      }
      setLoading(false)
    }

    fetchOrderData()
  }, [isAuthenticated, userSession, sessionLoaded, params.id, router, user])

  if (loading) {
    console.log('주문 상세 페이지 로딩 중...')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!orderData) {
    console.log('주문 데이터 없음')
    return null
  }

  console.log('주문 상세 페이지 렌더링:', { status: orderData.status, payment: orderData.payment })

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('복사되었습니다')
    }).catch(() => {
      toast.error('복사에 실패했습니다')
    })
  }

  const handleSaveShipping = () => {
    if (!shippingForm.name || !shippingForm.phone || !shippingForm.address) {
      toast.error('필수 정보를 입력해주세요')
      return
    }

    const updatedOrder = {
      ...orderData,
      shipping: {
        ...orderData.shipping,
        ...shippingForm
      }
    }

    // localStorage 업데이트
    const orders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
    const orderIndex = orders.findIndex(o => o.id === orderData.id)
    if (orderIndex !== -1) {
      orders[orderIndex] = updatedOrder
      localStorage.setItem('mock_orders', JSON.stringify(orders))
    }

    setOrderData(updatedOrder)
    setIsEditingAddress(false)
    toast.success('배송지가 변경되었습니다')
  }

  const bankInfo = {
    bank: '카카오뱅크',
    account: '79421940478',
    holder: '하상윤'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-white border-b">
          <div className="flex items-center p-4">
            <button
              onClick={() => {
                // 주문 상태에 따라 해당하는 탭으로 이동
                const statusToTab = {
                  'pending': 'pending',
                  'verifying': 'verifying',
                  'paid': 'paid',
                  'preparing': 'paid',
                  'shipped': 'delivered',
                  'delivered': 'delivered',
                  'cancelled': 'pending'
                }
                const tab = statusToTab[orderData?.status] || 'pending'
                router.push(`/orders?tab=${tab}`)
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="flex-1 text-center font-semibold text-gray-900">주문 상세</h1>
            <div className="w-9" />
          </div>
        </div>

        {/* Success Animation */}
        <div className="text-center py-8 px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${(() => {
              const { status } = orderData
              switch (status) {
                case 'pending':
                case 'verifying':
                  return 'bg-yellow-100'
                case 'paid':
                case 'delivered':
                  return 'bg-green-100'
                default:
                  return 'bg-yellow-100'
              }
            })()}`}
          >
            {(() => {
              const { status } = orderData
              switch (status) {
                case 'pending':
                case 'verifying':
                  return <ClockIcon className="w-12 h-12 text-yellow-600" />
                case 'paid':
                  return <CheckCircleIcon className="w-12 h-12 text-green-600" />
                case 'delivered':
                  return <TruckIcon className="w-12 h-12 text-green-600" />
                default:
                  return <ClockIcon className="w-12 h-12 text-yellow-600" />
              }
            })()}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {(() => {
                const { status, payment } = orderData
                const isCard = payment?.method === 'card'
                console.log('주문 상세 페이지 상태 확인:', { status, paymentMethod: payment?.method, orderData })

                switch (status) {
                  case 'pending':
                    return isCard ? '카드결제 확인중입니다' : '입금확인중입니다'
                  case 'verifying':
                    return isCard ? '카드결제 확인중입니다' : '입금확인중입니다'
                  case 'paid':
                    return '결제가 완료되었습니다'
                  case 'preparing':
                    return '배송 준비중입니다'
                  case 'shipped':
                    return '배송이 시작되었습니다'
                  case 'delivered':
                    return '출고가 완료되었습니다'
                  case 'cancelled':
                    return '주문이 취소되었습니다'
                  default:
                    return isCard ? '카드결제 확인중입니다' : '입금확인중입니다'
                }
              })()}
            </h1>
            <p className="text-gray-600">
              {(() => {
                const { status, payment } = orderData
                const isCard = payment?.method === 'card'

                switch (status) {
                  case 'pending':
                    return isCard ? '카드결제 확인 후 배송을 시작합니다' : '입금 확인 후 배송을 시작합니다'
                  case 'verifying':
                    return isCard ? '카드결제 확인 후 배송을 시작합니다' : '입금 확인 후 배송을 시작합니다'
                  case 'paid':
                    return '곧 배송 준비를 시작합니다'
                  case 'preparing':
                    return '상품을 포장하고 있습니다'
                  case 'shipped':
                    return '배송 정보를 확인해보세요'
                  case 'delivered':
                    return '상품이 안전하게 출고되었습니다'
                  case 'cancelled':
                    return '주문 취소가 완료되었습니다'
                  default:
                    return isCard ? '카드결제 확인 후 배송을 시작합니다' : '입금 확인 후 배송을 시작합니다'
                }
              })()}
            </p>
          </motion.div>
        </div>

        <div className="px-4 space-y-4">
          {/* 결제 안내 - 최상단으로 이동 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">
              {orderData.payment?.method === 'card' ? '카드결제 안내' : '입금 안내'}
            </h2>

            <div className="space-y-3">
              {orderData.payment?.method === 'card' ? (
                // 카드결제 정보
                <>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {/* 결제 금액 상세 (중앙화된 계산 모듈 사용) */}
                    {(() => {
                      const shippingInfo = formatShippingInfo(4000, orderData.shipping?.postal_code)

                      // 🧮 중앙화된 계산 모듈 사용
                      const orderCalc = OrderCalculations.calculateFinalOrderAmount(orderData.items, {
                        region: shippingInfo.region,
                        coupon: orderData.discount_amount > 0 ? {
                          type: 'fixed_amount',  // DB에서 discount_amount만 저장됨
                          value: orderData.discount_amount
                        } : null,
                        paymentMethod: 'card'
                      })

                      console.log('💳 카드결제 금액 계산 (중앙화 모듈):', orderCalc.breakdown)
                      console.log('🎟️ 쿠폰 정보 (DB에서 조회):', {
                        db_discount_amount: orderData.discount_amount,
                        coupon_applied: orderCalc.couponApplied,
                        coupon_discount: orderCalc.couponDiscount
                      })

                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">상품금액</span>
                            <span className="text-sm text-gray-900">
                              ₩{orderCalc.itemsTotal.toLocaleString()}
                            </span>
                          </div>
                          {orderCalc.couponApplied && orderCalc.couponDiscount > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-blue-600">쿠폰 할인</span>
                              <span className="text-sm text-blue-600">
                                -₩{orderCalc.couponDiscount.toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              배송비
                              {shippingInfo.isRemote && <span className="text-orange-600"> (+{shippingInfo.region})</span>}
                            </span>
                            <span className="text-sm text-gray-900">
                              ₩{orderCalc.shippingFee.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">부가세 (10%)</span>
                            <span className="text-sm text-gray-900">
                              ₩{orderCalc.vat.toLocaleString()}
                            </span>
                          </div>
                          <div className="border-t pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">카드 결제금액</span>
                              <span className="text-lg font-bold text-gray-900">
                                ₩{orderCalc.finalAmount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* 안내 메시지 */}
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <p className="text-sm font-medium text-amber-800 mb-2">
                      💳 카드결제 링크를 카카오톡으로 전송해드립니다
                    </p>
                    <ul className="space-y-1 text-xs text-amber-700">
                      <li>• 결제 확인 후 2-3일 내 배송됩니다</li>
                      <li>• 카드결제는 부가세 10%가 포함되어 있습니다</li>
                    </ul>
                  </div>
                </>
              ) : (
                // 무통장입금 정보
                <>
                  {/* 계좌 정보 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">은행</p>
                        <p className="font-medium text-gray-900">{bankInfo.bank}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">계좌번호</p>
                        <p className="font-mono font-medium text-gray-900">{bankInfo.account}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">예금주</p>
                        <p className="font-medium text-gray-900">{bankInfo.holder}</p>
                      </div>
                    </div>
                  </div>

                  {/* 입금 정보 (중앙화된 계산 모듈 사용) */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {(() => {
                      const shippingInfo = formatShippingInfo(4000, orderData.shipping?.postal_code)

                      // 🧮 중앙화된 계산 모듈 사용
                      const orderCalc = OrderCalculations.calculateFinalOrderAmount(orderData.items, {
                        region: shippingInfo.region,
                        coupon: orderData.discount_amount > 0 ? {
                          type: 'fixed_amount',  // DB에서 discount_amount만 저장됨
                          value: orderData.discount_amount
                        } : null,
                        paymentMethod: 'transfer'
                      })

                      // 입금자명 우선순위 (DB 저장된 순서대로)
                      // 1. payment.depositor_name (order_payments 테이블의 depositor_name)
                      // 2. depositName (supabaseApi에서 추가한 최적화된 입금자명)
                      // 3. shipping.name (배송자명)
                      const depositorName = orderData.payment?.depositor_name ||
                                          orderData.depositName ||
                                          orderData.shipping?.name ||
                                          '입금자명 확인 필요'

                      console.log('🎟️ 쿠폰 정보 (DB에서 조회):', {
                        db_discount_amount: orderData.discount_amount,
                        coupon_applied: orderCalc.couponApplied,
                        coupon_discount: orderCalc.couponDiscount
                      })

                      console.log('🏦 입금 안내 정보 (중앙화 모듈):', {
                        ...orderCalc.breakdown,
                        depositorName
                      })

                      return (
                        <>
                          <div className="space-y-2 border-b pb-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">상품 금액</span>
                              <span className="text-gray-900">
                                ₩{orderCalc.itemsTotal.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                배송비
                                {shippingInfo.isRemote && <span className="text-orange-600"> (+{shippingInfo.region})</span>}
                              </span>
                              <span className="text-gray-900">
                                ₩{orderCalc.shippingFee.toLocaleString()}
                              </span>
                            </div>
                            {orderCalc.couponApplied && orderCalc.couponDiscount > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-blue-600">쿠폰 할인</span>
                                <span className="text-blue-600">
                                  -₩{orderCalc.couponDiscount.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">입금금액</span>
                            <span className="text-lg font-bold text-red-600">
                              ₩{orderCalc.finalAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">입금자명</span>
                            <span className="text-lg font-bold text-gray-900">
                              {depositorName}
                            </span>
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {/* 계좌번호 복사 버튼 */}
                  <button
                    onClick={() => copyToClipboard(bankInfo.account)}
                    className="w-full bg-gray-900 text-white font-medium py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <ClipboardDocumentIcon className="w-5 h-5" />
                    계좌번호 복사하기
                  </button>

                  {/* 안내 메시지 */}
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <p className="text-sm font-medium text-amber-800 mb-2">
                      💡 입금자명과 금액이 정확해야 입금확인과 배송이 빨라집니다
                    </p>
                    <ul className="space-y-1 text-xs text-amber-700">
                      <li>• 주문 후 24시간 이내 입금해주세요</li>
                      <li>• 입금 확인 후 2-3일 내 배송됩니다</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* 주문 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">주문 정보</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">주문번호</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-900">{orderData.customer_order_number || orderData.id}</span>
                  <button
                    onClick={() => copyToClipboard(orderData.customer_order_number || orderData.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">주문일시</span>
                <span className="text-gray-900">
                  {new Date(orderData.created_at).toLocaleString('ko-KR')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">결제상태</span>
                <span className={`font-medium ${(() => {
                  const { status } = orderData
                  switch (status) {
                    case 'pending':
                    case 'verifying':
                      return 'text-yellow-600'
                    case 'paid':
                      return 'text-green-600'
                    case 'preparing':
                    case 'shipped':
                      return 'text-blue-600'
                    case 'delivered':
                      return 'text-green-600'
                    case 'cancelled':
                      return 'text-red-600'
                    default:
                      return 'text-yellow-600'
                  }
                })()}`}>
                  {(() => {
                    const { status, payment } = orderData
                    const isCard = payment?.method === 'card'

                    switch (status) {
                      case 'pending':
                        return isCard ? '카드결제 대기중' : '입금대기'
                      case 'verifying':
                        return isCard ? '카드결제 확인중' : '입금확인중'
                      case 'paid':
                        return '결제완료'
                      case 'preparing':
                        return '결제완료 (배송준비중)'
                      case 'shipped':
                        return '결제완료 (배송중)'
                      case 'delivered':
                        return '결제완료 (출고완료)'
                      case 'cancelled':
                        return '결제취소'
                      default:
                        return isCard ? '카드결제 대기중' : '입금대기'
                    }
                  })()}
                </span>
              </div>
              {/* 송장번호 표시 (출고완료/배송중 상태인 경우) */}
              {(orderData.status === 'delivered' || orderData.status === 'shipping') && orderData.shipping?.tracking_number && (
                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">택배사</span>
                    <span className="font-medium text-gray-900">
                      {getCarrierName(orderData.shipping?.tracking_company)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">송장번호</span>
                    <a
                      href={getTrackingUrl(orderData.shipping?.tracking_company, orderData.shipping?.tracking_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-mono"
                    >
                      {orderData.shipping.tracking_number}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* 배송지 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">배송지 정보</h2>
              {/* 결제 확인중(verifying) 이상부터는 주소 변경 불가 */}
              {orderData.status === 'pending' && (
                <button
                  onClick={() => setIsEditingAddress(!isEditingAddress)}
                  className="text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 text-sm"
                >
                  <PencilIcon className="w-4 h-4" />
                  변경
                </button>
              )}
            </div>

            {isEditingAddress ? (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="받는 분"
                  value={shippingForm.name}
                  onChange={(e) => setShippingForm({...shippingForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  placeholder="연락처"
                  value={shippingForm.phone}
                  onChange={(e) => setShippingForm({...shippingForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="주소"
                  value={shippingForm.address}
                  onChange={(e) => setShippingForm({...shippingForm, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="상세주소 (선택)"
                  value={shippingForm.detail_address}
                  onChange={(e) => setShippingForm({...shippingForm, detail_address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsEditingAddress(false)
                      setShippingForm({
                        name: orderData.shipping.name,
                        phone: orderData.shipping.phone,
                        address: orderData.shipping.address,
                        detail_address: orderData.shipping.detail_address || ''
                      })
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveShipping}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-gray-900">{orderData.shipping.name}</p>
                <p className="text-gray-600">{orderData.shipping.phone}</p>
                <p className="text-gray-600">
                  {orderData.shipping.postal_code && `[${orderData.shipping.postal_code}] `}
                  {orderData.shipping.address}
                  {orderData.shipping.detail_address && ` ${orderData.shipping.detail_address}`}
                </p>
              </div>
            )}
          </motion.div>

          {/* 주문 상품 (개별 리스팅) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            {(() => {
              // 일괄결제인 경우 allItems 사용, 아니면 기본 items 사용
              const displayItems = orderData.items[0]?.allItems || orderData.items
              const totalItemCount = displayItems.reduce((sum, item) => sum + item.quantity, 0)

              return (
                <div>
                  <h2 className="font-semibold text-gray-900 mb-3">
                    주문 상품 ({displayItems.length}개 상품, 총 {totalItemCount}개)
                  </h2>
                  <div className="space-y-3">
                    {displayItems.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex gap-3">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={item.thumbnail_url || '/placeholder.png'}
                              alt={item.title}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 text-sm">
                              {item.title}
                            </h3>

                            {/* 선택된 옵션 표시 */}
                            {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                              <div className="mb-1">
                                {Object.entries(item.selectedOptions).map(([optionId, value]) => (
                                  <span
                                    key={optionId}
                                    className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mr-1 mb-1"
                                  >
                                    {value}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-500">
                                수량: {item.quantity}개
                              </p>
                              <p className="font-semibold text-gray-900 text-sm">
                                ₩{item.totalPrice.toLocaleString()}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              단가: ₩{item.price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* 총 결제 금액 표시 (OrderCalculations 사용) */}
                    <div className="border-t pt-3 mt-3">
                      <div className="space-y-2">
                        {(() => {
                          const shippingInfo = formatShippingInfo(4000, orderData.shipping?.postal_code)

                          // 🧮 중앙화된 계산 모듈 사용 (정확한 금액 계산)
                          const orderCalc = OrderCalculations.calculateFinalOrderAmount(orderData.items, {
                            region: shippingInfo.region,
                            coupon: orderData.discount_amount > 0 ? {
                              type: 'fixed_amount',  // DB에서 discount_amount만 저장됨
                              value: orderData.discount_amount
                            } : null,
                            paymentMethod: orderData.payment?.method || 'transfer'
                          })

                          console.log('💰 주문 상세 금액 계산 (OrderCalculations):', {
                            itemsTotal: orderCalc.itemsTotal,
                            shippingFee: orderCalc.shippingFee,
                            couponDiscount: orderCalc.couponDiscount,
                            finalAmount: orderCalc.finalAmount,
                            postalCode: orderData.shipping?.postal_code,
                            shippingInfo,
                            breakdown: orderCalc.breakdown
                          })

                          return (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">총 상품금액</span>
                                <span className="font-medium text-gray-900">
                                  ₩{orderCalc.itemsTotal.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">
                                  배송비
                                  {shippingInfo.isRemote && <span className="text-orange-600"> (+{shippingInfo.region})</span>}
                                </span>
                                <span className="font-medium text-gray-900">
                                  ₩{orderCalc.shippingFee.toLocaleString()}
                                </span>
                              </div>
                              {orderCalc.couponApplied && orderCalc.couponDiscount > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-blue-600">쿠폰 할인</span>
                                  <span className="font-medium text-blue-600">
                                    -₩{orderCalc.couponDiscount.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center border-t pt-2">
                                <span className="text-sm font-semibold text-gray-900">총 결제금액</span>
                                <span className="font-bold text-lg text-gray-900">
                                  ₩{orderCalc.finalAmount.toLocaleString()}
                                </span>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </motion.div>
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 mt-8">
          <div className="space-y-3">
            <button
              onClick={() => router.push('/orders')}
              className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              주문 내역 보기
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-red-500 text-white font-medium py-3 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              <HomeIcon className="w-5 h-5" />
              쇼핑 계속하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}