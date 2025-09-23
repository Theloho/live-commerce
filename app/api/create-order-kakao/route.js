import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/[\r\n\s]+/g, '')
)

function generateCustomerOrderNumber() {
  const date = new Date()
  const dateStr = date.getFullYear().toString().slice(-2) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0')
  const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase()
  return `${dateStr}-${randomStr}`
}

export async function POST(request) {
  try {
    const { orderData, userProfile, userId } = await request.json()

    console.log('카카오 사용자 주문 생성:', { userId, orderData })

    // 1. 주문 생성 (user_id를 null로 설정하여 외래 키 제약 우회)
    const orderId = crypto.randomUUID()
    const customerOrderNumber = generateCustomerOrderNumber()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        id: orderId,
        customer_order_number: customerOrderNumber,
        user_id: null, // 외래 키 제약 우회
        status: 'pending',
        order_type: orderData.orderType || 'direct',
        metadata: {
          kakao_user_id: userId,
          kakao_email: userProfile.email || `kakao_${userId}@temp.com`,
          kakao_name: userProfile.name
        } // 메타데이터에 카카오 사용자 정보 저장
      }])
      .select()
      .single()

    if (orderError) {
      console.error('주문 생성 실패:', orderError)
      throw orderError
    }

    // 2. 주문 아이템 생성
    const { error: itemError } = await supabase
      .from('order_items')
      .insert([{
        order_id: orderId,
        product_id: orderData.id,
        quantity: orderData.quantity,
        unit_price: orderData.price,
        total_price: orderData.totalPrice,
        selected_options: orderData.selectedOptions || {}
      }])

    if (itemError) throw itemError

    // 3. 배송 정보 생성
    const { error: shippingError } = await supabase
      .from('order_shipping')
      .insert([{
        order_id: orderId,
        name: userProfile.name,
        phone: userProfile.phone || '010-0000-0000',
        address: userProfile.address || '기본주소',
        detail_address: userProfile.detail_address || ''
      }])

    if (shippingError) throw shippingError

    // 4. 결제 정보 생성
    const shippingFee = 4000
    const totalAmount = orderData.totalPrice + shippingFee

    const { error: paymentError } = await supabase
      .from('order_payments')
      .insert([{
        order_id: orderId,
        method: 'bank_transfer',
        amount: totalAmount,
        status: 'pending'
      }])

    if (paymentError) throw paymentError

    // 5. 재고 차감
    const { data: product } = await supabase
      .from('products')
      .select('inventory_quantity')
      .eq('id', orderData.id)
      .single()

    if (product) {
      await supabase
        .from('products')
        .update({
          inventory_quantity: Math.max(0, (product.inventory_quantity || 0) - orderData.quantity)
        })
        .eq('id', orderData.id)
    }

    console.log('카카오 사용자 주문 생성 성공:', order)

    return NextResponse.json({
      ...order,
      items: [orderData],
      success: true
    })

  } catch (error) {
    console.error('카카오 주문 생성 오류:', error)
    return NextResponse.json(
      {
        error: error.message || '주문 생성에 실패했습니다',
        success: false
      },
      { status: 500 }
    )
  }
}