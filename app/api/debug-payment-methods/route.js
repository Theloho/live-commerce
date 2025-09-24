import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function GET() {
  try {
    console.log('🔍 결제 방법 디버깅 시작')

    // 최근 10개 주문의 결제 방법 확인
    const { data: payments, error } = await supabaseAdmin
      .from('order_payments')
      .select('id, order_id, method, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      throw error
    }

    // 결제 방법별 통계
    const methodStats = {}
    payments?.forEach(payment => {
      const method = payment.method || 'null'
      methodStats[method] = (methodStats[method] || 0) + 1
    })

    // 주문과 함께 조회
    const { data: ordersWithPayments, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        status,
        payment_group_id,
        order_payments (
          method,
          status
        )
      `)
      .eq('status', 'verifying')
      .order('created_at', { ascending: false })
      .limit(5)

    if (orderError) {
      throw orderError
    }

    return NextResponse.json({
      success: true,
      data: {
        recentPayments: payments,
        methodStatistics: methodStats,
        verifyingOrdersWithPayments: ordersWithPayments,
        analysis: {
          totalPayments: payments?.length || 0,
          uniqueMethods: Object.keys(methodStats),
          mostCommonMethod: Object.keys(methodStats).reduce((a, b) => methodStats[a] > methodStats[b] ? a : b, 'none')
        }
      }
    })

  } catch (error) {
    console.error('결제 방법 디버깅 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}