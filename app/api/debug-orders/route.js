import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/[\r\n\s]+/g, '')
)

export async function GET() {
  try {
    console.log('🔍 주문 데이터 디버깅 시작')

    // 1. 최근 주문 10개 조회 (payment 정보 포함)
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        payment_group_id,
        created_at,
        order_payments (
          method,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (orderError) {
      throw orderError
    }

    console.log('📊 조회된 주문:', orders?.length || 0)

    // 2. payment_group_id가 있는 주문 확인
    const groupedOrders = orders?.filter(o => o.payment_group_id) || []

    // 3. verifying 상태 주문 확인
    const verifyingOrders = orders?.filter(o => o.status === 'verifying') || []

    // 4. 결제 방법별 분류
    const paymentMethods = {}
    orders?.forEach(order => {
      const method = order.order_payments?.[0]?.method || 'none'
      if (!paymentMethods[method]) {
        paymentMethods[method] = []
      }
      paymentMethods[method].push({
        id: order.id,
        status: order.status,
        payment_group_id: order.payment_group_id
      })
    })

    return NextResponse.json({
      success: true,
      summary: {
        totalOrders: orders?.length || 0,
        ordersWithGroup: groupedOrders.length,
        verifyingOrders: verifyingOrders.length,
        paymentMethods: Object.keys(paymentMethods).map(method => ({
          method,
          count: paymentMethods[method].length
        }))
      },
      sampleData: {
        firstOrder: orders?.[0],
        groupedOrder: groupedOrders[0] || null,
        verifyingOrder: verifyingOrders[0] || null
      },
      allOrders: orders
    })

  } catch (error) {
    console.error('디버그 실패:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}