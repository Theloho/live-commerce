'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DocumentTextIcon,
  BuildingStorefrontIcon,
  ShoppingCartIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  const [loading, setLoading] = useState(true)
  const [supplierSummaries, setSupplierSummaries] = useState([])
  const [showCompleted, setShowCompleted] = useState(false)

  // 권한 체크
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
    }
  }, [authLoading, isAdminAuthenticated, router])

  // 데이터 로드
  useEffect(() => {
    if (isAdminAuthenticated) {
      loadSupplierSummaries()
    }
  }, [isAdminAuthenticated, showCompleted])

  const loadSupplierSummaries = async () => {
    try {
      setLoading(true)

      // 1. 입금확인 완료된 주문 조회
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          order_items (
            id,
            product_id,
            variant_id,
            title,
            quantity,
            price,
            selected_options,
            products (
              id,
              title,
              model_number,
              supplier_id,
              purchase_price,
              suppliers (
                id,
                name,
                code,
                contact_person,
                phone
              )
            ),
            product_variants (
              id,
              sku,
              variant_option_values (
                product_option_values (
                  value,
                  product_options (
                    name
                  )
                )
              )
            )
          )
        `)
        .eq('status', 'deposited')
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      console.log('📋 입금확인 완료 주문:', orders?.length || 0)

      // 2. 이미 발주 완료된 주문 ID 조회
      const { data: completedBatches, error: batchesError } = await supabase
        .from('purchase_order_batches')
        .select('order_ids, supplier_id, download_date, total_items, total_amount')
        .eq('status', 'completed')

      if (batchesError) throw batchesError

      // 완료된 주문 ID 세트 생성
      const completedOrderIds = new Set()
      completedBatches?.forEach(batch => {
        batch.order_ids?.forEach(id => completedOrderIds.add(id))
      })

      console.log('✅ 발주 완료된 주문:', completedOrderIds.size, '개')

      // 3. 업체별로 그룹핑
      const supplierMap = new Map()

      orders?.forEach(order => {
        // 완료된 주문 필터링
        const isCompleted = completedOrderIds.has(order.id)
        if (!showCompleted && isCompleted) return
        if (showCompleted && !isCompleted) return

        order.order_items?.forEach(item => {
          if (!item.products?.supplier_id) return

          const supplierId = item.products.supplier_id
          const supplier = item.products.suppliers

          if (!supplierMap.has(supplierId)) {
            supplierMap.set(supplierId, {
              supplier: {
                id: supplier.id,
                name: supplier.name,
                code: supplier.code,
                contact_person: supplier.contact_person,
                phone: supplier.phone
              },
              orderCount: new Set(),
              totalItems: 0,
              totalQuantity: 0,
              totalAmount: 0,
              items: []
            })
          }

          const summary = supplierMap.get(supplierId)
          summary.orderCount.add(order.id)
          summary.totalItems += 1
          summary.totalQuantity += item.quantity || 0
          summary.totalAmount += (item.products.purchase_price || 0) * (item.quantity || 0)
        })
      })

      // Map을 Array로 변환
      const summaries = Array.from(supplierMap.values()).map(summary => ({
        ...summary,
        orderCount: summary.orderCount.size
      }))

      // 금액 기준 내림차순 정렬
      summaries.sort((a, b) => b.totalAmount - a.totalAmount)

      setSupplierSummaries(summaries)
      console.log('📊 업체별 집계:', summaries.length, '개 업체')

    } catch (error) {
      console.error('데이터 로딩 오류:', error)
      toast.error('데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto py-6 px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <DocumentTextIcon className="w-8 h-8 text-blue-600" />
                업체별 발주 관리
              </h1>
              <p className="text-gray-600 mt-2">입금확인 완료된 주문을 업체별로 자동 집계합니다</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-6">
        {/* 필터 토글 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCompleted(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                !showCompleted
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ClockIcon className="w-5 h-5" />
              대기 중 발주
            </button>
            <button
              onClick={() => setShowCompleted(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                showCompleted
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <CheckCircleIcon className="w-5 h-5" />
              완료된 발주
            </button>
          </div>
          <div className="text-sm text-gray-600">
            총 <span className="font-bold text-blue-600">{supplierSummaries.length}</span>개 업체
          </div>
        </div>

        {/* 통계 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center py-2">
              <p className="text-xs text-gray-500 mb-1">업체 수</p>
              <p className="text-xl font-bold text-gray-900">{supplierSummaries.length}개</p>
            </div>
            <div className="text-center py-2">
              <p className="text-xs text-gray-500 mb-1">총 주문 건수</p>
              <p className="text-xl font-bold text-blue-600">
                {supplierSummaries.reduce((sum, s) => sum + s.orderCount, 0)}건
              </p>
            </div>
            <div className="text-center py-2">
              <p className="text-xs text-gray-500 mb-1">총 수량</p>
              <p className="text-xl font-bold text-purple-600">
                {supplierSummaries.reduce((sum, s) => sum + s.totalQuantity, 0)}개
              </p>
            </div>
            <div className="text-center py-2">
              <p className="text-xs text-gray-500 mb-1">총 발주 금액</p>
              <p className="text-xl font-bold text-green-600">
                ₩{supplierSummaries.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* 업체별 요약 리스트 */}
        {supplierSummaries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <ShoppingCartIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showCompleted ? '완료된 발주가 없습니다' : '대기 중인 발주가 없습니다'}
            </h3>
            <p className="text-gray-600">
              {showCompleted
                ? '아직 다운로드한 발주서가 없습니다'
                : '입금확인 완료된 주문이 없거나 이미 모두 발주되었습니다'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {supplierSummaries.map((summary, index) => (
              <Link
                key={summary.supplier.id}
                href={`/admin/purchase-orders/${summary.supplier.id}`}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200 hover:border-blue-400"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <BuildingStorefrontIcon className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {summary.supplier.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          업체 코드: {summary.supplier.code}
                          {summary.supplier.contact_person && ` | 담당자: ${summary.supplier.contact_person}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">주문 건수</p>
                        <p className="text-2xl font-bold text-blue-600">{summary.orderCount}건</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">발주 수량</p>
                        <p className="text-2xl font-bold text-purple-600">{summary.totalQuantity}개</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">발주 금액</p>
                        <p className="text-2xl font-bold text-green-600">
                          ₩{summary.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
