import { supabase } from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('id') || 'f5a993cd-2eb0-44ef-a5f0-4decaf4d7ecf'

    console.log('🔍 고객 주문 디버깅 시작, ID:', customerId)

    // 1. 고객 정보 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', customerId)
      .single()

    console.log('👤 고객 정보:', profile)

    // 2. 해당 고객의 모든 주문 확인 (조인 없이)
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false })

    console.log('📦 기본 주문 조회 결과:', {
      orderCount: orders?.length || 0,
      orders: orders || []
    })

    // 3. 전체 orders 테이블에서 user_id 패턴 확인
    const { data: allOrders, error: allOrdersError } = await supabase
      .from('orders')
      .select('user_id, id, created_at')
      .limit(10)

    console.log('📋 전체 주문 샘플 (user_id 패턴 확인):', allOrders)

    // 4. 조인된 주문 정보 확인
    const { data: joinedOrders, error: joinError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            title,
            thumbnail_url
          )
        ),
        order_shipping (
          name,
          phone,
          address,
          detail_address
        ),
        order_payments (
          amount,
          method,
          status
        )
      `)
      .eq('user_id', customerId)
      .order('created_at', { ascending: false })

    console.log('🔗 조인된 주문 조회 결과:', {
      joinedOrderCount: joinedOrders?.length || 0,
      joinError: joinError?.message
    })

    return Response.json({
      success: true,
      customerId,
      profile,
      basicOrders: {
        count: orders?.length || 0,
        data: orders,
        error: orderError?.message
      },
      joinedOrders: {
        count: joinedOrders?.length || 0,
        error: joinError?.message
      },
      allOrdersSample: allOrders
    })

  } catch (error) {
    console.error('❌ 고객 주문 디버깅 오류:', error)
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}