'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CreditCardIcon,
  TruckIcon,
  CalendarIcon,
  DocumentTextIcon,
  PrinterIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function AdminOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrderDetail()
  }, [params.id])

  const loadOrderDetail = () => {
    try {
      setLoading(true)

      // 주문 정보 가져오기
      const allOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
      const foundOrder = allOrders.find(o => o.id === params.id)

      if (!foundOrder) {
        toast.error('주문을 찾을 수 없습니다')
        router.push('/admin/orders')
        return
      }

      // 사용자 정보 추가
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
      const user = users.find(u => u.id === foundOrder.userId)

      const orderWithUserInfo = {
        ...foundOrder,
        user: user || {}
      }

      setOrder(orderWithUserInfo)
      console.log('주문 상세 정보:', orderWithUserInfo)
    } catch (error) {
      console.error('주문 상세 정보 로딩 오류:', error)
      toast.error('주문 정보를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return {
          label: '주문접수',
          color: 'bg-gray-100 text-gray-800',
          icon: DocumentTextIcon
        }
      case 'paid':
        return {
          label: '결제완료',
          color: 'bg-blue-100 text-blue-800',
          icon: CreditCardIcon
        }
      case 'shipping':
        return {
          label: '발송중',
          color: 'bg-yellow-100 text-yellow-800',
          icon: TruckIcon
        }
      case 'delivered':
        return {
          label: '발송완료',
          color: 'bg-green-100 text-green-800',
          icon: TruckIcon
        }
      default:
        return {
          label: '알 수 없음',
          color: 'bg-gray-100 text-gray-800',
          icon: DocumentTextIcon
        }
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
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

  const statusInfo = getStatusInfo(order.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">주문 상세</h1>
            <p className="text-gray-600">
              주문번호: {order.customerOrderNumber || order.id.slice(-8)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full ${statusInfo.color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusInfo.label}
          </span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <PrinterIcon className="w-4 h-4" />
            인쇄
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 고객 정보 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            고객 정보
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-500">이름</label>
              <p className="text-gray-900">{order.shipping?.name || order.user?.name || '정보없음'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">연락처</label>
              <p className="text-gray-900 flex items-center gap-1">
                <PhoneIcon className="w-4 h-4 text-gray-400" />
                {order.user?.phone || '정보없음'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">닉네임</label>
              <p className="text-gray-900">{order.user?.nickname || '정보없음'}</p>
            </div>

            {order.user?.tiktokId && (
              <div>
                <label className="block text-sm font-medium text-gray-500">틱톡 ID</label>
                <p className="text-gray-900">{order.user.tiktokId}</p>
              </div>
            )}

            {order.user?.youtubeId && (
              <div>
                <label className="block text-sm font-medium text-gray-500">유튜브 ID</label>
                <p className="text-gray-900">{order.user.youtubeId}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* 배송 정보 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPinIcon className="w-5 h-5" />
            배송 정보
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-500">받는분</label>
              <p className="text-gray-900">{order.shipping?.name || '정보없음'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">연락처</label>
              <p className="text-gray-900">{order.shipping?.phone || '정보없음'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">주소</label>
              <p className="text-gray-900">{order.shipping?.address || '정보없음'}</p>
              {order.shipping?.detailAddress && (
                <p className="text-gray-600 text-sm mt-1">{order.shipping.detailAddress}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">배송 메모</label>
              <p className="text-gray-900">{order.shipping?.memo || '없음'}</p>
            </div>
          </div>
        </motion.div>

        {/* 주문 상품 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">주문 상품</h2>

          <div className="space-y-4">
            {order.items?.map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-600">
                    {item.options && Object.entries(item.options).map(([key, value]) => (
                      <span key={key} className="mr-2">{key}: {value}</span>
                    ))}
                  </p>
                  <p className="text-sm text-gray-500">
                    수량: {item.quantity}개 × ₩{item.price.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    ₩{(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 결제 정보 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-lg border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCardIcon className="w-5 h-5" />
            결제 정보
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">상품 금액</span>
              <span className="text-gray-900">₩{order.payment?.amount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">배송비</span>
              <span className="text-gray-900">₩{order.payment?.shippingFee?.toLocaleString() || '0'}</span>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between font-semibold text-lg">
                <span className="text-gray-900">총 결제 금액</span>
                <span className="text-red-600">₩{order.payment?.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-500">결제 방법</label>
                <p className="text-gray-900">{order.payment?.method || '정보없음'}</p>
              </div>

              {order.payment?.bankInfo && (
                <>
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-500">입금 은행</label>
                    <p className="text-gray-900">{order.payment.bankInfo.bank}</p>
                  </div>
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-500">계좌번호</label>
                    <p className="text-gray-900">{order.payment.bankInfo.account}</p>
                  </div>
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-500">예금주</label>
                    <p className="text-gray-900">{order.payment.bankInfo.holder}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* 주문 히스토리 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-lg border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            주문 히스토리
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900">주문 접수</p>
                <p className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
            </div>

            {order.paid_at && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">결제 완료</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.paid_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
            )}

            {order.shipped_at && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">발송 시작</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.shipped_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
            )}

            {order.delivered_at && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">발송 완료</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.delivered_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}