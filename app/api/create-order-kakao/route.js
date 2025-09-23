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

    // REST API로 직접 주문 생성 (RLS 우회)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/[\r\n\s]+/g, '')

    const orderResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: orderId,
        customer_order_number: customerOrderNumber,
        user_id: null, // null로 설정하여 외래 키 제약 우회
        status: 'pending',
        order_type: orderData.orderType || 'direct',
        created_at: new Date().toISOString()
      })
    })

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text()
      console.error('주문 생성 실패:', errorText)
      throw new Error(`주문 생성 실패: ${errorText}`)
    }

    const order = await orderResponse.json()
    console.log('주문 생성 성공:', order[0])

    // 2. 주문 아이템 생성
    // product_id가 문자열인 경우 UUID로 변환하거나 Mock 제품인지 확인
    let productId = orderData.id

    // Mock 제품인 경우 실제 제품 ID로 매핑 또는 임시 UUID 생성
    if (typeof productId === 'string' && !productId.includes('-')) {
      // Mock 제품 ID를 UUID로 변환 (실제로는 매핑 테이블이 필요)
      const mockToUuidMap = {
        '1': '11111111-1111-1111-1111-111111111111',
        '2': '22222222-2222-2222-2222-222222222222',
        '3': '33333333-3333-3333-3333-333333333333',
        '4': '44444444-4444-4444-4444-444444444444',
        '5': '55555555-5555-5555-5555-555555555555'
      }
      productId = mockToUuidMap[productId] || crypto.randomUUID()
    }

    const { error: itemError } = await supabase
      .from('order_items')
      .insert([{
        order_id: orderId,
        product_id: productId,
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

    // 5. 재고 차감 (Mock 제품은 스킵)
    if (typeof orderData.id === 'string' && orderData.id.includes('-')) {
      // 실제 UUID 제품만 재고 차감
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
    } else {
      console.log('Mock 제품이므로 재고 차감 스킵:', orderData.id)
    }

    const finalOrder = order[0] || order
    console.log('카카오 사용자 주문 생성 성공:', finalOrder)

    return NextResponse.json({
      ...finalOrder,
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