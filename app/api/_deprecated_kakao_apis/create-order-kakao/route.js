import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { UserProfileManager } from '@/lib/userProfileManager'

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
  const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase()
  return `S${dateStr}-${randomStr}`
}

export async function POST(request) {
  try {
    console.log('🔄 카카오 주문 API 호출됨')

    const { orderData, userProfile, userId, depositName } = await request.json()

    console.log('🔄 카카오 사용자 주문 생성:', { userId, orderData, depositName })
    console.log('🔄 재고 차감 대상 상품:', { productId: orderData.id, quantity: orderData.quantity })

    // 0. 사용자 존재 여부 확인 및 생성
    let validUserId = userId
    if (userId) {
      console.log('👤 사용자 존재 여부 확인:', userId)

      // 사용자 조회
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single()

      if (userCheckError && userCheckError.code === 'PGRST116') {
        console.log('👤 사용자가 존재하지 않음, 생성 시도')
        // 사용자가 존재하지 않으면 생성 시도
        try {
          const { error: userInsertError } = await supabase
            .from('users')
            .insert([{
              id: userId,
              name: userProfile.name || '카카오사용자',
              nickname: userProfile.nickname || userProfile.name || '사용자',
              phone: userProfile.phone || '',
              address: userProfile.address || '',
              detail_address: userProfile.detail_address || '',
              created_at: new Date().toISOString()
            }])

          if (userInsertError) {
            console.error('❌ 사용자 생성 실패:', userInsertError)
            console.log('🔄 user_id를 null로 설정하여 계속 진행')
            validUserId = null
          } else {
            console.log('✅ 사용자 생성 성공')
          }
        } catch (error) {
          console.error('❌ 사용자 생성 중 오류:', error)
          validUserId = null
        }
      } else if (userCheckError) {
        console.error('❌ 사용자 조회 오류:', userCheckError)
        validUserId = null
      } else {
        console.log('✅ 기존 사용자 확인됨')
      }
    }

    // 1. 주문 생성
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
        user_id: null, // 카카오 사용자는 auth.users에 없으므로 null로 저장
        status: 'pending',
        order_type: `${orderData.orderType || 'direct'}:KAKAO:${userId}`, // 카카오 사용자 ID를 order_type에 저장
        total_amount: totalPrice, // 상품금액 + 배송비 총액
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

    // total_price 계산 (null 방지)
    const totalPrice = orderData.totalPrice || (orderData.price * orderData.quantity)

    const { error: itemError } = await supabase
      .from('order_items')
      .insert([{
        order_id: orderId,
        product_id: productId,
        quantity: orderData.quantity,
        price: orderData.price,
        total: totalPrice,
        selected_options: orderData.selectedOptions || {}
      }])

    if (itemError) {
      console.error('카카오 주문 생성 오류:', itemError)
      // Foreign key 제약 조건 오류의 경우 더 구체적인 에러 메시지 제공
      if (itemError.code === '23503') {
        throw new Error(`존재하지 않는 상품입니다: ${productId}`)
      }
      throw itemError
    }

    // 3. 배송 정보 생성 - selectedAddress가 이미 반영된 userProfile 사용
    const shippingData = {
      name: userProfile.name || '미입력',
      phone: userProfile.phone || '미입력',
      address: userProfile.address || '배송지 미입력', // 이미 selectedAddress가 반영됨
      detail_address: userProfile.detail_address || ''
    }
    console.log('📦 배송 정보 생성:', shippingData)

    const { error: shippingError } = await supabase
      .from('order_shipping')
      .insert([{
        order_id: orderId,
        ...shippingData
      }])

    if (shippingError) throw shippingError

    // 4. 결제 정보 생성
    const shippingFee = 4000
    const totalAmount = totalPrice + shippingFee

    const { error: paymentError } = await supabase
      .from('order_payments')
      .insert([{
        order_id: orderId,
        method: 'bank_transfer',
        amount: totalAmount,
        status: 'pending',
        depositor_name: depositName || userProfile.name || '' // 입금자명 저장
      }])

    if (paymentError) throw paymentError

    console.log('✅ 주문/아이템/배송/결제 정보 생성 완료')

    // 5. 재고 차감 - 단순화된 버전
    console.log('🔧 재고 차감 시작:', productId, '수량:', orderData.quantity)

    // Supabase 클라이언트를 사용한 직접 재고 차감
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('inventory, title')
      .eq('id', productId)
      .single()

    if (!fetchError && currentProduct) {
      const currentStock = currentProduct.inventory || 0
      const newStock = Math.max(0, currentStock - orderData.quantity)

      console.log(`📦 ${currentProduct.title} 재고 차감: ${currentStock} → ${newStock}`)

      const { error: updateError } = await supabase
        .from('products')
        .update({
          inventory: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)

      if (updateError) {
        console.error('❌ 재고 업데이트 실패:', updateError)
      } else {
        console.log('✅ 재고 차감 완료!')
      }
    } else {
      console.error('❌ 상품 조회 실패:', fetchError)
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