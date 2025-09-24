import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/[\r\n\s]+/g, '')
)

export async function GET() {
  try {
    console.log('🔍 테스트 시작: payment_group_id 컬럼 확인')

    // 1. orders 테이블의 모든 컬럼 확인
    const { data: tableInfo, error: infoError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)

    if (infoError) {
      console.error('❌ 테이블 정보 조회 실패:', infoError)
      throw infoError
    }

    const columns = tableInfo.length > 0 ? Object.keys(tableInfo[0]) : []
    const hasPaymentGroupId = columns.includes('payment_group_id')

    console.log('📊 테이블 컬럼 목록:', columns)
    console.log('✅ payment_group_id 컬럼 존재 여부:', hasPaymentGroupId)

    // 2. payment_group_id가 있는 주문 찾기
    const { data: groupedOrders, error: groupError } = await supabase
      .from('orders')
      .select('id, status, payment_group_id, created_at')
      .not('payment_group_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (groupError) {
      console.error('❌ 그룹 주문 조회 실패:', groupError)
    }

    console.log('📊 payment_group_id가 있는 주문:', groupedOrders?.length || 0)

    // 3. 테스트 업데이트 - pending 상태 주문 2개 찾아서 그룹화
    const { data: pendingOrders, error: pendingError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('status', 'pending')
      .limit(2)

    if (pendingError) {
      console.error('❌ pending 주문 조회 실패:', pendingError)
    }

    let testUpdateResult = null
    if (pendingOrders && pendingOrders.length >= 2 && hasPaymentGroupId) {
      const testGroupId = `TEST-GROUP-${Date.now()}`
      const orderIds = pendingOrders.map(o => o.id)

      console.log('🔧 테스트 그룹 생성:', testGroupId)
      console.log('🔧 대상 주문 ID:', orderIds)

      // payment_group_id 업데이트
      const { error: updateError } = await supabase
        .from('orders')
        .update({ payment_group_id: testGroupId })
        .in('id', orderIds)

      if (updateError) {
        console.error('❌ 업데이트 실패:', updateError)
        testUpdateResult = { success: false, error: updateError.message }
      } else {
        console.log('✅ 테스트 그룹 생성 성공')
        testUpdateResult = { success: true, groupId: testGroupId, orderIds }
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        hasPaymentGroupIdColumn: hasPaymentGroupId,
        tableColumns: columns,
        existingGroupedOrders: groupedOrders?.length || 0,
        groupedOrdersSample: groupedOrders || [],
        testUpdate: testUpdateResult,
        message: hasPaymentGroupId
          ? 'payment_group_id 컬럼이 존재합니다!'
          : '⚠️ payment_group_id 컬럼이 없습니다. 스키마 업데이트가 필요합니다.'
      }
    })

  } catch (error) {
    console.error('테스트 실패:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}