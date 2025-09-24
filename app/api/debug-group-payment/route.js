import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function GET() {
  try {
    console.log('🔍 그룹 주문 결제 방법 디버깅')

    // payment_group_id가 있는 주문들과 해당 결제 정보 조회
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        payment_group_id,
        status,
        created_at,
        order_payments (
          id,
          method,
          status,
          amount
        )
      `)
      .not('payment_group_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      throw error
    }

    // 그룹별로 분석
    const groupAnalysis = {}
    orders?.forEach(order => {
      const groupId = order.payment_group_id
      if (!groupAnalysis[groupId]) {
        groupAnalysis[groupId] = {
          groupId,
          orders: [],
          paymentMethods: new Set(),
          hasPayments: false
        }
      }

      groupAnalysis[groupId].orders.push({
        orderId: order.id,
        status: order.status,
        paymentCount: order.order_payments?.length || 0,
        paymentMethod: order.order_payments?.[0]?.method || 'none',
        paymentStatus: order.order_payments?.[0]?.status || 'none'
      })

      if (order.order_payments?.[0]?.method) {
        groupAnalysis[groupId].paymentMethods.add(order.order_payments[0].method)
        groupAnalysis[groupId].hasPayments = true
      }
    })

    // Set을 Array로 변환
    Object.keys(groupAnalysis).forEach(groupId => {
      groupAnalysis[groupId].paymentMethods = Array.from(groupAnalysis[groupId].paymentMethods)
    })

    return NextResponse.json({
      success: true,
      data: {
        totalOrdersWithGroups: orders?.length || 0,
        uniqueGroups: Object.keys(groupAnalysis).length,
        groupDetails: groupAnalysis,
        sampleOrder: orders?.[0] || null
      }
    })

  } catch (error) {
    console.error('그룹 주문 디버깅 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}