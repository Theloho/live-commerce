'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  BuildingStorefrontIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export default function SupplierPurchaseOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const supplierId = params.supplierId
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  const [loading, setLoading] = useState(true)
  const [supplier, setSupplier] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [adjustedQuantities, setAdjustedQuantities] = useState({}) // { orderItemId: adjustedQty }

  // 권한 체크
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
    }
  }, [authLoading, isAdminAuthenticated, router])

  // 데이터 로드
  useEffect(() => {
    if (isAdminAuthenticated && supplierId) {
      loadSupplierOrderDetails()
    }
  }, [isAdminAuthenticated, supplierId])

  const loadSupplierOrderDetails = async () => {
    try {
      setLoading(true)

      // 1. 업체 정보 조회
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .single()

      if (supplierError) throw supplierError

      setSupplier(supplierData)

      // 2. 입금확인 완료된 주문의 order_items 조회
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          customer_order_number,
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
              supplier_sku
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

      // 3. 발주 완료된 주문 제외
      const { data: completedBatches, error: batchesError } = await supabase
        .from('purchase_order_batches')
        .select('order_ids')
        .eq('status', 'completed')
        .eq('supplier_id', supplierId)

      if (batchesError) throw batchesError

      const completedOrderIds = new Set()
      completedBatches?.forEach(batch => {
        batch.order_ids?.forEach(id => completedOrderIds.add(id))
      })

      // 4. 해당 업체의 order_items만 필터링
      const items = []
      orders?.forEach(order => {
        // 완료된 주문 제외
        if (completedOrderIds.has(order.id)) return

        order.order_items?.forEach(item => {
          if (item.products?.supplier_id === supplierId) {
            // Variant 옵션 정보 파싱
            let variantOptions = []
            if (item.product_variants?.variant_option_values) {
              variantOptions = item.product_variants.variant_option_values.map(vov => ({
                name: vov.product_option_values.product_options.name,
                value: vov.product_option_values.value
              }))
            }

            items.push({
              id: item.id,
              orderId: order.id,
              orderNumber: order.customer_order_number,
              orderDate: order.created_at,
              productId: item.product_id,
              productTitle: item.title || item.products?.title,
              modelNumber: item.products?.model_number,
              supplierSku: item.products?.supplier_sku,
              sku: item.product_variants?.sku,
              variantOptions,
              selectedOptions: item.selected_options,
              quantity: item.quantity,
              purchasePrice: item.products?.purchase_price || 0,
              totalPrice: (item.products?.purchase_price || 0) * item.quantity
            })
          }
        })
      })

      setOrderItems(items)
      console.log('📋 발주 상세:', items.length, '개 아이템')

    } catch (error) {
      console.error('데이터 로딩 오류:', error)
      toast.error('데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 수량 조정
  const adjustQuantity = (itemId, delta) => {
    const item = orderItems.find(i => i.id === itemId)
    if (!item) return

    const currentAdjusted = adjustedQuantities[itemId] ?? item.quantity
    const newQuantity = Math.max(0, currentAdjusted + delta)

    setAdjustedQuantities(prev => ({
      ...prev,
      [itemId]: newQuantity
    }))
  }

  // 최종 수량 계산 (조정된 값 또는 원래 값)
  const getFinalQuantity = (item) => {
    return adjustedQuantities[item.id] ?? item.quantity
  }

  // 총계 계산
  const getTotals = () => {
    let totalQuantity = 0
    let totalAmount = 0

    orderItems.forEach(item => {
      const qty = getFinalQuantity(item)
      totalQuantity += qty
      totalAmount += item.purchasePrice * qty
    })

    return { totalQuantity, totalAmount }
  }

  const totals = getTotals()

  // 엑셀 다운로드 + 발주 완료 처리
  const handleExcelDownload = async () => {
    try {
      // 1. 엑셀 데이터 준비
      const excelData = orderItems.map((item, index) => {
        const finalQty = getFinalQuantity(item)
        const options = item.variantOptions?.map(opt => `${opt.name}: ${opt.value}`).join(', ') ||
                       Object.entries(item.selectedOptions || {}).map(([k, v]) => `${k}: ${v}`).join(', ') ||
                       '-'

        return {
          'No.': index + 1,
          '주문번호': item.orderNumber,
          '주문일': new Date(item.orderDate).toLocaleDateString('ko-KR'),
          '상품명': item.productTitle,
          '모델번호': item.modelNumber || '-',
          'SKU': item.sku || item.supplierSku || '-',
          '옵션': options,
          '원래 수량': item.quantity,
          '발주 수량': finalQty,
          '매입가': item.purchasePrice,
          '소계': item.purchasePrice * finalQty
        }
      })

      // 합계 행 추가
      excelData.push({
        'No.': '',
        '주문번호': '',
        '주문일': '',
        '상품명': '',
        '모델번호': '',
        'SKU': '',
        '옵션': '합계',
        '원래 수량': orderItems.reduce((sum, item) => sum + item.quantity, 0),
        '발주 수량': totals.totalQuantity,
        '매입가': '',
        '소계': totals.totalAmount
      })

      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(excelData)

      // 컬럼 너비 설정
      worksheet['!cols'] = [
        { wch: 5 },   // No.
        { wch: 15 },  // 주문번호
        { wch: 12 },  // 주문일
        { wch: 30 },  // 상품명
        { wch: 15 },  // 모델번호
        { wch: 20 },  // SKU
        { wch: 30 },  // 옵션
        { wch: 10 },  // 원래 수량
        { wch: 10 },  // 발주 수량
        { wch: 12 },  // 매입가
        { wch: 12 }   // 소계
      ]

      // 워크북 생성
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '발주서')

      // 파일명 생성
      const today = new Date().toISOString().split('T')[0]
      const fileName = `발주서_${supplier.name}_${today}.xlsx`

      // 다운로드
      XLSX.writeFile(workbook, fileName)

      // 2. 발주 완료 처리 (DB에 기록)
      const orderIds = [...new Set(orderItems.map(item => item.orderId))]
      const adminEmail = localStorage.getItem('admin_email') || 'unknown'

      const { error: batchError } = await supabase
        .from('purchase_order_batches')
        .insert({
          supplier_id: supplierId,
          order_ids: orderIds,
          adjusted_quantities: adjustedQuantities,
          total_items: orderItems.length,
          total_amount: totals.totalAmount,
          status: 'completed',
          created_by: adminEmail
        })

      if (batchError) throw batchError

      toast.success('발주서가 다운로드되고 발주 완료 처리되었습니다')

      // 3. 메인 페이지로 이동
      setTimeout(() => {
        router.push('/admin/purchase-orders')
      }, 1000)

    } catch (error) {
      console.error('엑셀 다운로드 오류:', error)
      toast.error('엑셀 파일 생성에 실패했습니다')
    }
  }

  // 출력
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>발주서 - ${supplier.name}</title>
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
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 12px;
          }
          th {
            background: #333;
            color: white;
            padding: 10px 6px;
            text-align: left;
            font-weight: bold;
          }
          td {
            padding: 8px 6px;
            border-bottom: 1px solid #ddd;
          }
          .total-row {
            background: #f0f0f0;
            font-weight: bold;
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
          <div>발행일: ${new Date().toLocaleDateString('ko-KR')}</div>
        </div>

        <div class="supplier-info">
          <h2>🏢 ${supplier.name}</h2>
          <p><strong>업체 코드:</strong> ${supplier.code}</p>
          ${supplier.contact_person ? `<p><strong>담당자:</strong> ${supplier.contact_person}</p>` : ''}
          ${supplier.phone ? `<p><strong>연락처:</strong> ${supplier.phone}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 5%">No.</th>
              <th style="width: 12%">주문번호</th>
              <th style="width: 25%">상품명</th>
              <th style="width: 20%">옵션</th>
              <th style="width: 8%">원래</th>
              <th style="width: 8%">발주</th>
              <th style="width: 10%">매입가</th>
              <th style="width: 12%">소계</th>
            </tr>
          </thead>
          <tbody>
            ${orderItems.map((item, index) => {
              const finalQty = getFinalQuantity(item)
              const options = item.variantOptions?.map(opt => `${opt.name}: ${opt.value}`).join(' / ') ||
                             Object.entries(item.selectedOptions || {}).map(([k, v]) => `${k}: ${v}`).join(' / ') ||
                             '-'
              return `
              <tr>
                <td>${index + 1}</td>
                <td>${item.orderNumber}</td>
                <td>${item.productTitle}</td>
                <td>${options}</td>
                <td style="text-align: center">${item.quantity}</td>
                <td style="text-align: center; font-weight: bold">${finalQty}</td>
                <td style="text-align: right">₩${item.purchasePrice.toLocaleString()}</td>
                <td style="text-align: right">₩${(item.purchasePrice * finalQty).toLocaleString()}</td>
              </tr>
              `
            }).join('')}
            <tr class="total-row">
              <td colspan="5" style="text-align: right">합계</td>
              <td style="text-align: center">${totals.totalQuantity}개</td>
              <td></td>
              <td style="text-align: right">₩${totals.totalAmount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

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

  if (!supplier) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">업체 정보를 찾을 수 없습니다</p>
          <Link href="/admin/purchase-orders" className="text-blue-600 hover:underline mt-4">
            목록으로 돌아가기
          </Link>
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
            <div className="flex items-center gap-4">
              <Link
                href="/admin/purchase-orders"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <BuildingStorefrontIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{supplier.name} 발주서</h1>
                  <p className="text-sm text-gray-600">
                    업체 코드: {supplier.code}
                    {supplier.contact_person && ` | 담당자: ${supplier.contact_person}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 font-medium"
              >
                <PrinterIcon className="w-5 h-5" />
                인쇄
              </button>
              <button
                onClick={handleExcelDownload}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                발주서 다운로드
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-6">
        {/* 통계 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">발주 요약</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">총 아이템 수</p>
              <p className="text-3xl font-bold text-gray-900">{orderItems.length}개</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">총 발주 수량</p>
              <p className="text-3xl font-bold text-purple-600">{totals.totalQuantity}개</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">총 발주 금액</p>
              <p className="text-3xl font-bold text-green-600">₩{totals.totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* 주문 아이템 테이블 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">주문번호</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">옵션</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">원래 수량</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">발주 수량</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">매입가</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">소계</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orderItems.map((item, index) => {
                  const finalQty = getFinalQuantity(item)
                  const options = item.variantOptions?.map(opt => `${opt.name}: ${opt.value}`).join(' / ') ||
                                 Object.entries(item.selectedOptions || {}).map(([k, v]) => `${k}: ${v}`).join(' / ') ||
                                 '-'

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{item.orderNumber}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div>{item.productTitle}</div>
                        {item.modelNumber && (
                          <div className="text-xs text-gray-500">모델: {item.modelNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{options}</td>
                      <td className="px-4 py-4 text-sm text-gray-500 text-center">{item.quantity}</td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => adjustQuantity(item.id, -1)}
                            className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                          >
                            <MinusIcon className="w-4 h-4" />
                          </button>
                          <span className={`text-sm font-bold min-w-[40px] text-center ${
                            finalQty !== item.quantity ? 'text-blue-600' : 'text-gray-900'
                          }`}>
                            {finalQty}
                          </span>
                          <button
                            onClick={() => adjustQuantity(item.id, 1)}
                            className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 text-right">
                        ₩{item.purchasePrice.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 text-right font-medium">
                        ₩{(item.purchasePrice * finalQty).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td colSpan="5" className="px-4 py-4 text-right text-sm font-bold text-gray-900">
                    합계
                  </td>
                  <td className="px-4 py-4 text-center text-sm font-bold text-blue-600">
                    {totals.totalQuantity}개
                  </td>
                  <td></td>
                  <td className="px-4 py-4 text-right text-lg font-bold text-blue-600">
                    ₩{totals.totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>수량 조정:</strong> +/- 버튼으로 실제 발주할 수량을 조정할 수 있습니다.
            조정된 수량은 파란색으로 표시됩니다.
          </p>
          <p className="text-sm text-blue-800 mt-2">
            📥 <strong>발주서 다운로드:</strong> 다운로드 시 자동으로 발주 완료 처리되어 다음 조회 시 표시되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
