import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/[\r\n\s]+/g, '')
)

export async function GET() {
  try {
    console.log('🔍 그룹 주문 확인 시작')

    // 1. payment_group_id가 있는 모든 주문 조회
    const { data: groupedOrders, error } = await supabase
      .from('orders')
      .select('id, payment_group_id, status, created_at, user_id')
      .not('payment_group_id', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ 조회 실패:', error)
      throw error
    }

    console.log('📊 payment_group_id가 있는 주문 수:', groupedOrders?.length || 0)

    // 2. 그룹별로 묶기
    const groups = {}
    if (groupedOrders && groupedOrders.length > 0) {
      groupedOrders.forEach(order => {
        if (!groups[order.payment_group_id]) {
          groups[order.payment_group_id] = []
        }
        groups[order.payment_group_id].push(order)
      })
    }

    // 3. 그룹 정보 정리
    const groupInfo = Object.keys(groups).map(groupId => ({
      groupId,
      orderCount: groups[groupId].length,
      orders: groups[groupId].map(o => ({
        id: o.id,
        status: o.status,
        created_at: o.created_at
      }))
    }))

    return NextResponse.json({
      success: true,
      totalGroupedOrders: groupedOrders?.length || 0,
      uniqueGroups: Object.keys(groups).length,
      groupDetails: groupInfo,
      rawData: groupedOrders
    })

  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}