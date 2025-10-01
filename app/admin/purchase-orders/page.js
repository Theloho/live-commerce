'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DocumentTextIcon,
  PrinterIcon,
  CalendarIcon,
  BuildingStorefrontIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getPurchaseOrdersBySupplier } from '@/lib/supabaseApi'
import toast from 'react-hot-toast'

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  const [loading, setLoading] = useState(true)
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('all') // 선택된 업체
  const [allSuppliers, setAllSuppliers] = useState([]) // 전체 업체 목록

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
      loadData()
    }
  }, [isAdminAuthenticated])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getPurchaseOrdersBySupplier(startDate || null, endDate || null)
      setPurchaseOrders(data)

      // 전체 업체 목록 추출 (중복 제거)
      const suppliers = data.map(order => ({
        id: order.supplier.id,
        name: order.supplier.name
      }))
      setAllSuppliers(suppliers)

      console.log('📋 발주 데이터 로드:', data.length, '개 업체')
    } catch (error) {
      console.error('발주 데이터 로딩 오류:', error)
      toast.error('데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 날짜 필터 적용
  const handleDateFilter = () => {
    loadData()
  }

  // 업체별 필터링된 주문 목록
  const filteredOrders = selectedSupplier === 'all'
    ? purchaseOrders
    : purchaseOrders.filter(order => order.supplier.id === selectedSupplier)

  // 발주서 출력
  const handlePrint = (supplierOrder) => {
    const printWindow = window.open('', '_blank')

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>발주서 - ${supplierOrder.supplier.name}</title>
        <style>
          @media print {
            @page { margin: 2cm; }
            body { margin: 0; }
          }
          body {
            font-family: 'Malgun Gothic', sans-serif;
            padding: 20px;
            max-width: 21cm;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #333;
            padding-bottom: 20px;
          }
          .header h1 {
            font-size: 28px;
            margin: 0 0 10px 0;
          }
          .header .date {
            color: #666;
            font-size: 14px;
          }
          .supplier-info {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .supplier-info h2 {
            margin: 0 0 10px 0;
            font-size: 20px;
          }
          .supplier-info p {
            margin: 5px 0;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background: #333;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 13px;
          }
          td {
            padding: 10px 8px;
            border-bottom: 1px solid #ddd;
            font-size: 13px;
          }
          tr:hover {
            background: #f9f9f9;
          }
          .total-row {
            background: #f0f0f0;
            font-weight: bold;
          }
          .total-row td {
            padding: 15px 8px;
            font-size: 15px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #333;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .no-print {
            text-align: center;
            margin: 20px 0;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 발주서 (Purchase Order)</h1>
          <div class="date">발행일: ${new Date().toLocaleDateString('ko-KR')}</div>
        </div>

        <div class="supplier-info">
          <h2>🏢 ${supplierOrder.supplier.name}</h2>
          <p><strong>업체 코드:</strong> ${supplierOrder.supplier.code}</p>
          ${supplierOrder.supplier.contact_person ? `<p><strong>담당자:</strong> ${supplierOrder.supplier.contact_person}</p>` : ''}
          ${supplierOrder.supplier.phone ? `<p><strong>연락처:</strong> ${supplierOrder.supplier.phone}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 8%">No.</th>
              <th style="width: 25%">상품명</th>
              <th style="width: 15%">모델번호</th>
              <th style="width: 15%">업체 SKU</th>
              <th style="width: 15%">옵션</th>
              <th style="width: 10%">수량</th>
              <th style="width: 12%">매입가</th>
            </tr>
          </thead>
          <tbody>
            ${supplierOrder.items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.productTitle}</td>
                <td>${item.modelNumber || '-'}</td>
                <td>${item.supplierSku || item.sku || '-'}</td>
                <td>${Object.values(item.selectedOptions || {}).join(' / ') || '-'}</td>
                <td style="text-align: center">${item.quantity}개</td>
                <td style="text-align: right">${item.purchasePrice ? `₩${item.purchasePrice.toLocaleString()}` : '-'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5" style="text-align: right">합계</td>
              <td style="text-align: center">${supplierOrder.totalQuantity}개</td>
              <td style="text-align: right">₩${supplierOrder.totalAmount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>본 발주서는 자동으로 생성되었습니다.</p>
          <p>문의사항이 있으시면 담당자에게 연락 부탁드립니다.</p>
        </div>

        <div class="no-print">
          <button onclick="window.print()" style="
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 30px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
            margin-right: 10px;
          ">🖨️ 인쇄</button>
          <button onclick="window.close()" style="
            background: #666;
            color: white;
            border: none;
            padding: 12px 30px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
          ">닫기</button>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
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
              <p className="text-gray-600 mt-2">주문 데이터를 기반으로 업체별 발주서를 생성합니다</p>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="max-w-7xl mx-auto py-6 px-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                시작일
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                종료일
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BuildingStorefrontIcon className="w-4 h-4 inline mr-1" />
                업체 선택
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">전체 업체</option>
                {allSuppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleDateFilter}
                className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                조회
              </button>
            </div>
          </div>
        </div>

        {/* 통계 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">전체 업체 수</p>
              <p className="text-3xl font-bold text-gray-900">{allSuppliers.length}개</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">필터링된 업체 수</p>
              <p className="text-3xl font-bold text-blue-600">{filteredOrders.length}개</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">총 발주 금액</p>
              <p className="text-3xl font-bold text-green-600">
                ₩{filteredOrders.reduce((sum, order) => sum + order.totalPurchasePrice, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* 업체별 발주서 목록 */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <ShoppingCartIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">발주 데이터가 없습니다</h3>
            <p className="text-gray-600">선택한 조건에 맞는 주문이 없거나 variant가 설정되지 않은 상품입니다</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((supplierOrder, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* 업체 정보 헤더 */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <BuildingStorefrontIcon className="w-10 h-10" />
                      <div>
                        <h2 className="text-2xl font-bold">{supplierOrder.supplier.name}</h2>
                        <p className="text-blue-100 mt-1">
                          업체 코드: {supplierOrder.supplier.code}
                          {supplierOrder.supplier.contact_person && ` | 담당자: ${supplierOrder.supplier.contact_person}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePrint(supplierOrder)}
                      className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 font-medium"
                    >
                      <PrinterIcon className="w-5 h-5" />
                      발주서 출력
                    </button>
                  </div>
                </div>

                {/* 주문 아이템 테이블 */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No.</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품명</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">모델번호</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">옵션</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">수량</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">매입가</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">소계</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {supplierOrder.items.map((item, itemIndex) => (
                        <tr key={itemIndex} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{itemIndex + 1}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.productTitle}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.modelNumber || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                            {item.supplierSku || item.sku || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {Object.values(item.selectedOptions || {}).join(' / ') || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-center font-medium">
                            {item.quantity}개
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            {item.purchasePrice ? `₩${item.purchasePrice.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                            ₩{item.totalPurchasePrice.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                          합계
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-blue-600">
                          {supplierOrder.totalQuantity}개
                        </td>
                        <td colSpan="2" className="px-6 py-4 text-right text-lg font-bold text-blue-600">
                          ₩{supplierOrder.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
