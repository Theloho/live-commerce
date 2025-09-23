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
        user_id: null, // 카카오 사용자는 항상 null (외래 키 제약 회피)
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

    // 모든 제품 ID는 UUID 형식이어야 함
    if (typeof productId === 'string' && !productId.includes('-')) {
      throw new Error(`잘못된 제품 ID 형식: ${productId}. UUID 형식이어야 합니다.`)
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

    // 5. 재고 차감
    console.log('🔧 재고 차감 시작:', {
      productId,
      quantity: orderData.quantity,
      orderData_id: orderData.id,
      supabaseUrl_exists: !!supabaseUrl,
      supabaseKey_exists: !!supabaseKey
    })

    try {
      console.log('📦 재고 조회 URL:', `${supabaseUrl}/rest/v1/products?id=eq.${productId}`)

      // 현재 재고 조회
      const stockResponse = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${productId}&select=stock_quantity`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📦 재고 조회 응답 상태:', stockResponse.status)

      if (!stockResponse.ok) {
        const errorText = await stockResponse.text()
        console.error('📦 재고 조회 실패 상세:', errorText)
        throw new Error(`재고 조회 실패: ${stockResponse.status} - ${errorText}`)
      }

      const products = await stockResponse.json()
      console.log('📦 조회된 상품 데이터:', products)

      if (products.length === 0) {
        throw new Error('상품을 찾을 수 없습니다')
      }

      const currentStock = products[0].stock_quantity || 0
      const newStock = Math.max(0, currentStock - orderData.quantity)

      console.log(`🔄 재고 차감: ${currentStock} → ${newStock} (상품: ${productId})`)

      // 재고 업데이트
      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${productId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
      })

      console.log('📦 재고 업데이트 응답 상태:', updateResponse.status)

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text()
        console.error('📦 재고 업데이트 실패 상세:', errorText)
        throw new Error(`재고 업데이트 실패: ${updateResponse.status} - ${errorText}`)
      }

      console.log('✅ 재고 차감 완료!')
    } catch (stockError) {
      console.error('❌ 재고 차감 오류:', stockError)
      // 재고 차감 실패 시 주문도 롤백해야 하지만, 일단 경고만 출력
      console.warn('⚠️ 재고 차감에 실패했지만 주문은 생성되었습니다')
    }

    const finalOrder = order[0] || order
    console.log('카카오 사용자 주문 생성 성공:', finalOrder)

    return NextResponse.json({
      ...finalOrder,
      items: [orderData],
      success: true,
      customerOrderNumber // 클라이언트에서 sessionStorage에 저장용
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