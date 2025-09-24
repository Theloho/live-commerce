import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/[\r\n\s]+/g, '')
)

export async function POST() {
  try {
    console.log('🧪 테스트 그룹 생성 시작')

    // 1. verifying 상태의 주문 2개 이상 찾기
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, payment_group_id')
      .eq('status', 'verifying')
      .is('payment_group_id', null)  // 아직 그룹화되지 않은 것만
      .limit(3)  // 최대 3개

    if (fetchError) {
      throw fetchError
    }

    if (!orders || orders.length < 2) {
      return NextResponse.json({
        success: false,
        message: 'verifying 상태의 주문이 2개 이상 필요합니다',
        foundOrders: orders?.length || 0
      })
    }

    // 2. 테스트 그룹 ID 생성
    const testGroupId = `TEST-GROUP-${Date.now()}`
    const orderIds = orders.map(o => o.id)

    console.log('🧪 그룹화할 주문 ID들:', orderIds)
    console.log('🧪 테스트 그룹 ID:', testGroupId)

    // 3. payment_group_id 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_group_id: testGroupId,
        updated_at: new Date().toISOString()
      })
      .in('id', orderIds)

    if (updateError) {
      throw updateError
    }

    // 4. 업데이트 확인
    const { data: updatedOrders, error: checkError } = await supabase
      .from('orders')
      .select('id, payment_group_id, status')
      .eq('payment_group_id', testGroupId)

    if (checkError) {
      throw checkError
    }

    console.log('✅ 테스트 그룹 생성 성공')
    console.log('📊 그룹화된 주문:', updatedOrders)

    return NextResponse.json({
      success: true,
      message: '테스트 그룹이 생성되었습니다',
      groupId: testGroupId,
      orderIds: orderIds,
      orderCount: orderIds.length,
      updatedOrders: updatedOrders
    })

  } catch (error) {
    console.error('❌ 테스트 그룹 생성 실패:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}