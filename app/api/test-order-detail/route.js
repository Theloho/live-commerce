import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId') || 'GROUP-GROUP-1758697876292'

    // 카카오 주문 API에서 주문 정보 가져오기
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/get-orders-kakao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'kakao-test' })
    })

    if (!response.ok) {
      throw new Error('주문 조회 실패')
    }

    const result = await response.json()
    const order = result.orders?.find(o => o.id === orderId)

    if (!order) {
      return NextResponse.json({
        success: false,
        error: '주문을 찾을 수 없습니다'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        payment_method: order.payment?.method,
        payment_amount: order.payment?.amount,
        isGroup: order.isGroup,
        status: order.status,
        created_at: order.created_at,
        items_count: order.items?.length || 0,
        card_display_check: {
          title: order.payment?.method === 'card' ? '카드결제 확인중입니다' : '입금확인중입니다',
          guide: order.payment?.method === 'card' ? '카드결제 안내' : '입금 안내',
          ui_color: order.payment?.method === 'card' ? 'blue' : 'orange'
        }
      }
    })

  } catch (error) {
    console.error('주문 상세 테스트 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}