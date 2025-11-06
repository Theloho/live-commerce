'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CalendarIcon, ArrowLeftIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'
import toast from 'react-hot-toast'

export default function SalesSummaryPage() {
  const router = useRouter()
  const { adminUser, loading: authLoading } = useAdminAuth()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [salesByDate, setSalesByDate] = useState({})

  useEffect(() => {
    if (adminUser?.email) {
      loadSalesData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser])

  const loadSalesData = async () => {
    try {
      setLoading(true)

      if (!adminUser?.email) {
        console.error('관리자 이메일이 없습니다')
        return
      }

      // verifying 상태의 모든 주문 조회
      const response = await fetch(
        `/api/admin/orders?adminEmail=${encodeURIComponent(adminUser.email)}&limit=10000&offset=0`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '주문 조회 실패')
      }

      const { orders: rawOrders } = await response.json()

      // verifying + paid 상태 필터링
      const verifyingOrders = rawOrders.filter(order =>
        order.status === 'verifying' || order.status === 'paid'
      )

      // 날짜별로 그룹화
      const grouped = {}

      verifyingOrders.forEach(order => {
        const orderDate = new Date(order.created_at).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })

        if (!grouped[orderDate]) {
          grouped[orderDate] = []
        }

        // 각 주문의 아이템을 추가
        order.order_items?.forEach(item => {
          const product = item.products

          // 옵션 조합 키 생성
          let optionKey = ''
          if (item.product_variants?.variant_option_values) {
            const options = item.product_variants.variant_option_values
              .map(vo => vo.product_option_values)
              .filter(Boolean)
              .map(pov => pov.value)
              .join(' / ')
            optionKey = options || '-'
          } else {
            optionKey = '-'
          }

          grouped[orderDate].push({
            product_number: product?.product_number || item.product_id,
            title: item.title || product?.title || '상품명 없음',
            thumbnail_url: item.thumbnail_url || product?.thumbnail_url,
            option: optionKey,
            quantity: item.quantity || 1,
            price: item.price || item.unit_price || 0,
            totalPrice: (item.price || item.unit_price || 0) * (item.quantity || 1),
            created_at: order.created_at,
            customer_order_number: order.customer_order_number,
            shipping_name: order.order_shipping?.[0]?.name || '정보없음'
          })
        })
      })

      // 날짜별로 제품+옵션 기준 집계
      const aggregated = {}

      Object.keys(grouped).forEach(date => {
        const items = grouped[date]
        const summary = {}

        items.forEach(item => {
          const key = `${item.product_number}_${item.option}`

          if (!summary[key]) {
            summary[key] = {
              product_number: item.product_number,
              title: item.title,
              thumbnail_url: item.thumbnail_url,
              option: item.option,
              quantity: 0,
              orderCount: 0,
              totalAmount: 0,
              orders: []
            }
          }

          summary[key].quantity += item.quantity
          summary[key].orderCount += 1
          summary[key].totalAmount += item.totalPrice
          summary[key].orders.push({
            created_at: item.created_at,
            customer_order_number: item.customer_order_number,
            shipping_name: item.shipping_name,
            quantity: item.quantity
          })
        })

        aggregated[date] = Object.values(summary).sort((a, b) => b.quantity - a.quantity)
      })

      setOrders(verifyingOrders)
      setSalesByDate(aggregated)
      setLoading(false)
    } catch (error) {
      console.error('판매 현황 로딩 오류:', error)
      toast.error('판매 현황을 불러오는데 실패했습니다')
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">판매 현황 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!adminUser) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">관리자 권한이 필요합니다</p>
      </div>
    )
  }

  const dateKeys = Object.keys(salesByDate).sort((a, b) => new Date(b) - new Date(a))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/orders')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ChartBarIcon className="h-7 w-7 text-red-600" />
              품목별 판매 현황
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              주문내역(verifying) + 입금완료(paid) 상태 · 총 {orders.length}건
            </p>
          </div>
        </div>
        <button
          onClick={() => loadSalesData()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* 날짜별 판매 현황 */}
      {dateKeys.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">주문내역(verifying) + 입금완료(paid) 상태의 주문이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dateKeys.map((date) => {
            const items = salesByDate[date]
            const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
            const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0)

            return (
              <div key={date} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* 날짜 헤더 */}
                <div className="bg-red-50 border-b border-red-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-5 w-5 text-red-600" />
                      <h2 className="text-lg font-bold text-gray-900">{date}</h2>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {items.length}개 품목 · {totalQuantity}개 주문
                      </div>
                      <div className="text-lg font-bold text-red-600">
                        ₩{totalAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 품목 리스트 */}
                <div className="divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex gap-4">
                        {/* 제품 사진 */}
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          {item.thumbnail_url ? (
                            <Image
                              src={item.thumbnail_url}
                              alt={item.title}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ChartBarIcon className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        {/* 제품 정보 */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-900">
                                  {item.product_number}
                                </span>
                                <span className="text-sm text-gray-600">{item.title}</span>
                              </div>
                              {item.option !== '-' && (
                                <div className="text-sm text-gray-500">
                                  옵션: {item.option}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-red-600">
                                {item.quantity}개
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.orderCount}건 주문
                              </div>
                            </div>
                          </div>

                          {/* 총 금액 */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <span className="text-sm text-gray-600">총 판매금액</span>
                            <span className="text-base font-semibold text-gray-900">
                              ₩{item.totalAmount.toLocaleString()}
                            </span>
                          </div>

                          {/* 주문 내역 상세 (접을 수 있는 형태) */}
                          <details className="mt-3">
                            <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
                              주문 상세 보기 ({item.orderCount}건)
                            </summary>
                            <div className="mt-2 pl-4 space-y-1">
                              {item.orders.map((order, orderIndex) => (
                                <div key={orderIndex} className="text-xs text-gray-600 flex items-center justify-between py-1">
                                  <div>
                                    <span className="font-medium">{order.customer_order_number}</span>
                                    <span className="mx-2">·</span>
                                    <span>{order.shipping_name}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">
                                      {new Date(order.created_at).toLocaleString('ko-KR', {
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                      })}
                                    </span>
                                    <span className="mx-2">·</span>
                                    <span className="font-medium text-red-600">{order.quantity}개</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
