'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CubeIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'
import { aggregateProductsForLogistics, generateLogisticsCSV, getSupplierSummary } from '@/lib/logisticsAggregation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function LogisticsPage() {
  const router = useRouter()
  const { adminUser, isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  const [loading, setLoading] = useState(true)
  const [aggregatedData, setAggregatedData] = useState({
    products: [],
    totalProducts: 0,
    totalQuantity: 0,
    totalSuppliers: 0
  })
  const [supplierSummaries, setSupplierSummaries] = useState([])

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
      loadLogisticsData()
    }
  }, [isAdminAuthenticated])

  const loadLogisticsData = async () => {
    try {
      setLoading(true)

      if (!adminUser?.email) return

      // Service Role API로 입금확인 완료 주문 조회
      const response = await fetch(
        `/api/admin/orders?adminEmail=${encodeURIComponent(adminUser.email)}&status=paid`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '데이터 조회 실패')
      }

      const { orders } = await response.json()

      console.log('📦 입금확인 완료 주문:', orders?.length || 0)

      // 제품 집계
      const aggregated = aggregateProductsForLogistics(orders || [])
      setAggregatedData(aggregated)

      // 업체별 요약
      const summaries = getSupplierSummary(aggregated.products)
      setSupplierSummaries(summaries)

      console.log('📊 제품 집계:', aggregated.totalProducts, '개 제품')
      console.log('📊 업체 집계:', summaries.length, '개 업체')

    } catch (error) {
      console.error('데이터 로딩 오류:', error)
      toast.error('데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCSV = () => {
    if (aggregatedData.products.length === 0) {
      toast.error('다운로드할 데이터가 없습니다')
      return
    }

    const csv = generateLogisticsCSV(aggregatedData.products)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `물류팀_제품집계_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast.success('CSV 다운로드 완료')
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📦 물류팀 - 제품 집계</h1>
          <p className="text-sm text-gray-600 mt-1">
            총 {aggregatedData.totalProducts}개 제품 | {aggregatedData.totalQuantity}개 수량 | {aggregatedData.totalSuppliers}개 업체
          </p>
        </div>
        <button
          onClick={handleDownloadCSV}
          disabled={aggregatedData.products.length === 0}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          CSV 다운로드
        </button>
      </div>

      {/* 통계 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center py-2">
            <p className="text-xs text-gray-500 mb-1">총 제품 종류</p>
            <p className="text-xl font-bold text-cyan-600">{aggregatedData.totalProducts}개</p>
          </div>
          <div className="text-center py-2">
            <p className="text-xs text-gray-500 mb-1">총 필요 수량</p>
            <p className="text-xl font-bold text-teal-600">{aggregatedData.totalQuantity}개</p>
          </div>
          <div className="text-center py-2">
            <p className="text-xs text-gray-500 mb-1">관련 업체 수</p>
            <p className="text-xl font-bold text-blue-600">{aggregatedData.totalSuppliers}개</p>
          </div>
          <div className="text-center py-2">
            <p className="text-xs text-gray-500 mb-1">평균 수량/제품</p>
            <p className="text-xl font-bold text-green-600">
              {aggregatedData.totalProducts > 0
                ? Math.round(aggregatedData.totalQuantity / aggregatedData.totalProducts)
                : 0}개
            </p>
          </div>
        </div>
      </div>

      {/* 업체별 요약 */}
      {supplierSummaries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🏢 업체별 요약</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {supplierSummaries.map((summary, index) => (
              <Link
                key={summary.supplierId}
                href={`/admin/purchase-orders/${summary.supplierId}`}
                className="p-3 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <BuildingStorefrontIcon className="w-5 h-5 text-teal-600" />
                  <h3 className="font-medium text-gray-900 text-sm">{summary.supplierName}</h3>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">필요 수량</span>
                  <span className="font-bold text-teal-600">{summary.totalQuantity}개</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-600">제품 종류</span>
                  <span className="text-gray-700">{summary.variantCount}개</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* 제품별 상세 */}
      {aggregatedData.products.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <CubeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            발주할 제품이 없습니다
          </h3>
          <p className="text-gray-600">
            입금확인 완료된 주문이 없거나 이미 모두 발주되었습니다
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">📋 제품별 상세</h2>
          {aggregatedData.products.map((product, index) => (
            <motion.div
              key={product.productId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-lg border-2 border-cyan-200 p-4"
            >
              {/* 제품 헤더 */}
              <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-200">
                {/* 제품 이미지 16x16 (64px) */}
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {product.productImage ? (
                    <img
                      src={product.productImage}
                      alt={product.productName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full ${product.productImage ? 'hidden' : 'flex'} items-center justify-center bg-cyan-100 text-xs text-cyan-700`}>
                    {product.productName.substring(0, 8)}
                  </div>
                </div>

                {/* 제품 정보 */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{product.productName}</h3>
                    {/* 업체 정보 - 우측 상단 */}
                    {product.variants[0]?.suppliers[0] && (
                      <Link
                        href={`/admin/purchase-orders/${product.variants[0].suppliers[0].supplierId}`}
                        className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-800 rounded-lg border border-teal-200 hover:border-teal-300 transition-colors"
                      >
                        <BuildingStorefrontIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{product.variants[0].suppliers[0].supplierName}</span>
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>총 수량: <strong className="text-teal-600">{product.totalQuantity}개</strong></span>
                    <span>옵션: <strong>{product.variantCount}개</strong></span>
                  </div>
                </div>
              </div>

              {/* Variant별 상세 */}
              <div className="space-y-3">
                {product.variants.map((variant, vIdx) => (
                  <div key={vIdx} className="bg-gray-50 rounded-lg p-3">
                    {/* Variant 헤더 - 간소화 */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {variant.optionDisplay}
                        </div>
                        {variant.sku && (
                          <div className="text-xs text-gray-500 font-mono mt-0.5">SKU: {variant.sku}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-teal-600">{variant.totalQuantity}개</div>
                        <div className="text-xs text-gray-500">{variant.suppliers.reduce((sum, s) => sum + s.orders.length, 0)}건 주문</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
