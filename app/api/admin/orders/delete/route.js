import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * 주문 완전 삭제 API (취소된 주문만)
 *
 * ⚠️ 보안:
 * - 관리자만 접근 가능
 * - 취소된 주문(status = 'cancelled')만 삭제 가능
 *
 * 삭제 대상:
 * - orders 테이블
 * - order_items 테이블 (자동 CASCADE)
 * - order_shipping 테이블 (자동 CASCADE)
 * - order_payments 테이블 (자동 CASCADE)
 *
 * @method POST
 * @body {string} adminEmail - 관리자 이메일
 * @body {string[]} orderIds - 삭제할 주문 ID 배열
 * @returns {Object} 삭제 결과
 */
export async function POST(request) {
  try {
    const { adminEmail, orderIds } = await request.json()

    // 1. 필수 파라미터 검증
    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 이메일이 필요합니다' },
        { status: 400 }
      )
    }

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: '삭제할 주문 ID가 필요합니다' },
        { status: 400 }
      )
    }

    console.log('🗑️ [주문 삭제] 요청:', {
      adminEmail,
      orderCount: orderIds.length,
      orderIds: orderIds.slice(0, 5) // 처음 5개만 로그
    })

    // 2. Service Role 클라이언트 생성 (RLS 우회)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 3. 관리자 권한 확인
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('email', adminEmail)
      .single()

    if (profileError || !profile?.is_admin) {
      console.error('❌ [주문 삭제] 권한 없음:', adminEmail)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 4. 삭제 전 주문 상태 확인 (취소된 주문만 삭제 가능)
    const { data: ordersToDelete, error: checkError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_order_number, status')
      .in('id', orderIds)

    if (checkError) {
      console.error('❌ [주문 삭제] 주문 조회 실패:', checkError)
      return NextResponse.json(
        { error: '주문 조회에 실패했습니다' },
        { status: 500 }
      )
    }

    // 취소되지 않은 주문 필터링
    const notCancelledOrders = ordersToDelete.filter(o => o.status !== 'cancelled')
    if (notCancelledOrders.length > 0) {
      console.error('❌ [주문 삭제] 취소되지 않은 주문 포함:', notCancelledOrders.map(o => o.customer_order_number))
      return NextResponse.json(
        {
          error: '취소된 주문만 삭제할 수 있습니다',
          notCancelledOrders: notCancelledOrders.map(o => ({
            id: o.id,
            orderNumber: o.customer_order_number,
            status: o.status
          }))
        },
        { status: 400 }
      )
    }

    // 5. 주문 삭제 (CASCADE로 연관 데이터 자동 삭제)
    const { error: deleteError } = await supabaseAdmin
      .from('orders')
      .delete()
      .in('id', orderIds)

    if (deleteError) {
      console.error('❌ [주문 삭제] 실패:', deleteError)
      return NextResponse.json(
        { error: '주문 삭제에 실패했습니다', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log('✅ [주문 삭제] 성공:', {
      deletedCount: orderIds.length,
      orderNumbers: ordersToDelete.map(o => o.customer_order_number)
    })

    return NextResponse.json({
      success: true,
      deletedCount: orderIds.length,
      message: `${orderIds.length}개 주문이 완전히 삭제되었습니다`
    })

  } catch (error) {
    console.error('❌ [주문 삭제] 서버 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    )
  }
}
