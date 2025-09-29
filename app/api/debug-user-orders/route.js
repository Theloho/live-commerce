import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용한 관리자 클라이언트 생성
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    console.log('🔍 김진태 사용자 주문 디버깅 시작...')

    const targetUserId = '9fa1fc4e-842f-4072-b88e-486e81490460'

    // 1. 전체 주문 중에서 김진태와 연관될 수 있는 모든 주문 찾기
    const { data: allOrders, error: allOrdersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        user_id,
        order_type,
        customer_order_number,
        created_at,
        order_shipping (
          name, phone, address
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (allOrdersError) {
      console.error('전체 주문 조회 실패:', allOrdersError)
      throw allOrdersError
    }

    console.log('📊 최근 20개 주문 현황:')
    allOrders.forEach((order, index) => {
      console.log(`${index + 1}. 주문 ${order.id}:`)
      console.log(`   - user_id: ${order.user_id}`)
      console.log(`   - order_type: ${order.order_type}`)
      console.log(`   - 배송지명: ${order.order_shipping[0]?.name || 'N/A'}`)
      console.log(`   - 생성일: ${order.created_at}`)
    })

    // 2. 김진태 user_id로 직접 매치되는 주문
    const directMatches = allOrders.filter(order => order.user_id === targetUserId)
    console.log(`\n📊 직접 매치 (user_id=${targetUserId}): ${directMatches.length}개`)

    // 3. order_type에 카카오 ID가 포함된 주문
    const kakaoMatches = allOrders.filter(order =>
      order.order_type && order.order_type.includes('KAKAO:9fa1fc4e-842f-4072-b88e-486e81490460')
    )
    console.log(`📊 카카오 매치 (order_type에 사용자 ID 포함): ${kakaoMatches.length}개`)

    // 4. 배송지명이 "김진태"인 주문
    const nameMatches = allOrders.filter(order =>
      order.order_shipping && order.order_shipping[0]?.name === '김진태'
    )
    console.log(`📊 이름 매치 (배송지명=김진태): ${nameMatches.length}개`)

    return NextResponse.json({
      success: true,
      targetUserId,
      totalOrders: allOrders.length,
      directMatches: directMatches.length,
      kakaoMatches: kakaoMatches.length,
      nameMatches: nameMatches.length,
      allOrders: allOrders.map(order => ({
        id: order.id,
        user_id: order.user_id,
        order_type: order.order_type,
        shippingName: order.order_shipping[0]?.name,
        created_at: order.created_at
      })),
      analysis: {
        directMatches,
        kakaoMatches,
        nameMatches
      }
    })

  } catch (error) {
    console.error('❌ 주문 디버깅 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}