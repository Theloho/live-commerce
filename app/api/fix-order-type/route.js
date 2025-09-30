import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용한 관리자 클라이언트 생성
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    console.log('🔧 기존 주문 order_type 수정 시작...')

    // 1. 잘못된 order_type을 가진 주문들 찾기
    const { data: problemOrders, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, order_type, created_at')
      .like('order_type', '%:KAKAO:7f3094fc-0212-40f8-a7af-d126898a3ea8')

    if (fetchError) {
      console.error('주문 조회 실패:', fetchError)
      throw fetchError
    }

    console.log(`📊 수정할 주문 수: ${problemOrders.length}개`)

    if (problemOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: '수정할 주문이 없습니다.',
        updatedCount: 0
      })
    }

    // 2. 각 주문의 order_type 수정
    const updatePromises = problemOrders.map(order => {
      // cart:KAKAO:7f3094fc-0212-40f8-a7af-d126898a3ea8 → cart:KAKAO:4454444603
      // direct:KAKAO:7f3094fc-0212-40f8-a7af-d126898a3ea8 → direct:KAKAO:4454444603
      const newOrderType = order.order_type.replace(
        ':KAKAO:7f3094fc-0212-40f8-a7af-d126898a3ea8',
        ':KAKAO:4454444603'
      )

      console.log(`🔄 주문 ${order.id}: ${order.order_type} → ${newOrderType}`)

      return supabaseAdmin
        .from('orders')
        .update({ order_type: newOrderType })
        .eq('id', order.id)
    })

    // 3. 모든 업데이트 실행
    const results = await Promise.all(updatePromises)

    // 4. 실패한 업데이트 확인
    const failures = results.filter(result => result.error)
    if (failures.length > 0) {
      console.error('일부 업데이트 실패:', failures)
      throw new Error(`${failures.length}개 주문 업데이트 실패`)
    }

    console.log('✅ 모든 주문 order_type 수정 완료')

    // 5. 결과 검증
    const { data: verifyOrders, error: verifyError } = await supabaseAdmin
      .from('orders')
      .select('id, order_type')
      .like('order_type', '%:KAKAO:4454444603')

    if (verifyError) {
      console.error('검증 조회 실패:', verifyError)
    } else {
      console.log(`✅ 검증 결과: ${verifyOrders.length}개 주문이 올바른 format으로 변경됨`)
    }

    return NextResponse.json({
      success: true,
      message: `${problemOrders.length}개 주문의 order_type을 성공적으로 수정했습니다.`,
      updatedCount: problemOrders.length,
      verifiedCount: verifyOrders?.length || 0
    })

  } catch (error) {
    console.error('❌ order_type 수정 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      updatedCount: 0
    }, { status: 500 })
  }
}