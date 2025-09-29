import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    console.log('🔧 김진태 사용자 주문 연결 수정 시작...')

    const targetUserId = '9fa1fc4e-842f-4072-b88e-486e81490460'

    // 1. 배송지명이 "김진태"이고 user_id가 null인 주문들 찾기
    const { data: ordersToFix, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        user_id,
        order_type,
        created_at,
        order_shipping (
          name, phone, address
        )
      `)
      .is('user_id', null)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('주문 조회 실패:', ordersError)
      throw ordersError
    }

    console.log(`📊 user_id가 null인 주문 수: ${ordersToFix.length}개`)

    // 김진태 이름으로 된 주문 필터링
    const jinTaeOrders = ordersToFix.filter(order =>
      order.order_shipping && order.order_shipping[0]?.name === '김진태'
    )

    console.log(`📊 김진태 배송지 주문: ${jinTaeOrders.length}개`)

    if (jinTaeOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: '수정할 김진태 주문이 없습니다',
        updatedCount: 0
      })
    }

    // 2. 김진태 주문들을 올바른 user_id로 업데이트
    let successCount = 0
    const results = []

    for (const order of jinTaeOrders) {
      try {
        console.log(`🔄 주문 ${order.id} 수정 중...`)

        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            user_id: targetUserId,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)

        if (updateError) {
          console.error(`❌ 주문 ${order.id} 수정 실패:`, updateError)
          results.push({
            orderId: order.id,
            status: 'error',
            error: updateError.message
          })
        } else {
          console.log(`✅ 주문 ${order.id} 수정 성공`)
          successCount++
          results.push({
            orderId: order.id,
            status: 'success',
            before: 'user_id: null',
            after: `user_id: ${targetUserId}`
          })
        }
      } catch (error) {
        console.error(`❌ 주문 ${order.id} 처리 중 오류:`, error)
        results.push({
          orderId: order.id,
          status: 'error',
          error: error.message
        })
      }
    }

    console.log(`🎉 김진태 주문 수정 완료 - 성공: ${successCount}개`)

    return NextResponse.json({
      success: true,
      message: `김진태 주문 ${successCount}개를 올바른 사용자와 연결했습니다`,
      targetUserId,
      totalFoundOrders: jinTaeOrders.length,
      successCount,
      errorCount: jinTaeOrders.length - successCount,
      results
    })

  } catch (error) {
    console.error('❌ 김진태 주문 수정 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      message: '김진태 주문 수정에 실패했습니다'
    }, { status: 500 })
  }
}