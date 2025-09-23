import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용하여 RLS 우회
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다' }, { status: 400 })
    }

    console.log('카카오 사용자 주문 조회:', userId)

    // 카카오 사용자 주문 조회 - 배송 정보의 이름으로 조회
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            title,
            thumbnail_url,
            price,
            description
          )
        ),
        order_shipping (*),
        order_payments (*)
      `)
      .is('user_id', null) // user_id가 null인 주문만
      .order('created_at', { ascending: false })

    if (error) {
      console.error('주문 조회 오류:', error)
      throw error
    }

    // 주문 데이터 형태 변환
    const ordersWithItems = data.map(order => ({
      ...order,
      items: order.order_items.map(item => ({
        id: item.id, // order_items 테이블의 실제 id
        product_id: item.product_id, // 별도로 product_id도 포함
        title: item.products?.title || '상품명 없음',
        description: item.products?.description || '',
        thumbnail_url: item.products?.thumbnail_url || '/placeholder-product.png',
        price: item.products?.price || item.unit_price,
        quantity: item.quantity,
        totalPrice: item.total_price,
        selectedOptions: item.selected_options || {},
        unit_price: item.unit_price
      })),
      shipping: order.order_shipping[0] || {},
      payment: order.order_payments[0] || {}
    }))

    console.log(`${ordersWithItems.length}개의 주문 조회 성공`)

    return NextResponse.json({
      success: true,
      orders: ordersWithItems
    })

  } catch (error) {
    console.error('카카오 사용자 주문 조회 실패:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '주문 조회에 실패했습니다',
        orders: []
      },
      { status: 500 }
    )
  }
}