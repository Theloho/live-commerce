import { supabase } from '@/lib/supabase'

export async function GET(request) {
  try {
    console.log('🔍 order_shipping 데이터 디버깅 API 호출됨')

    // G250926-0827 주문 조회
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        customer_order_number,
        user_id,
        status,
        created_at,
        order_shipping (
          id,
          order_id,
          name,
          phone,
          address,
          detail_address,
          created_at
        )
      `)
      .eq('customer_order_number', 'G250926-0827')

    if (orderError) {
      console.error('주문 조회 오류:', orderError)
      return Response.json({ error: orderError.message }, { status: 500 })
    }

    console.log('📋 G250926-0827 주문 조회 결과:', orders)

    // 모든 order_shipping 데이터도 조회
    const { data: allShipping, error: shippingError } = await supabase
      .from('order_shipping')
      .select('*')
      .limit(10)
      .order('created_at', { ascending: false })

    if (shippingError) {
      console.error('배송 정보 조회 오류:', shippingError)
      return Response.json({ error: shippingError.message }, { status: 500 })
    }

    console.log('🚚 최근 order_shipping 데이터 10개:', allShipping)

    return Response.json({
      success: true,
      targetOrder: orders,
      recentShipping: allShipping,
      message: 'order_shipping 데이터 조회 완료'
    })

  } catch (error) {
    console.error('API 오류:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}