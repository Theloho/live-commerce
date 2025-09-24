import { NextResponse } from 'next/server'
import { getOrders } from '@/lib/supabaseApi'

export async function POST(request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId가 필요합니다'
      }, { status: 400 })
    }

    console.log('🧪 getOrders 테스트 - 사용자 ID:', userId)

    // getOrders 함수 실행
    const orders = await getOrders(userId)

    console.log('📊 getOrders 결과:', {
      totalCount: orders.length,
      groupOrders: orders.filter(o => o.isGroup).length,
      regularOrders: orders.filter(o => !o.isGroup).length
    })

    // 각 주문의 구조 확인
    const orderAnalysis = orders.map(order => ({
      id: order.id,
      isGroup: order.isGroup || false,
      payment_group_id: order.payment_group_id,
      status: order.status,
      paymentMethod: order.payment?.method,
      hasPayment: !!order.payment,
      itemCount: order.items?.length || 0
    }))

    return NextResponse.json({
      success: true,
      data: {
        totalOrders: orders.length,
        orderAnalysis,
        sampleOrder: orders[0] || null,
        groupedOrders: orders.filter(o => o.isGroup),
        regularOrders: orders.filter(o => !o.isGroup)
      }
    })

  } catch (error) {
    console.error('getOrders 테스트 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}