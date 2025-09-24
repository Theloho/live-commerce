import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용하여 RLS 우회
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function GET() {
  try {
    console.log('📊 관리자 대시보드 통계 API 호출')

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayStartISO = todayStart.toISOString()

    // 병렬로 모든 통계 데이터 가져오기
    const [
      ordersResult,
      productsResult,
      usersResult
    ] = await Promise.all([
      // 주문 데이터 (결제 정보 포함)
      supabaseAdmin
        .from('orders')
        .select(`
          *,
          order_payments (
            method,
            amount,
            status
          )
        `),

      // 상품 수
      supabaseAdmin
        .from('products')
        .select('id', { count: 'exact', head: true }),

      // 사용자 수 (임시로 카카오 사용자도 포함)
      supabaseAdmin
        .from('orders')
        .select('user_id', { count: 'exact', head: true })
        .not('user_id', 'is', null)
    ])

    if (ordersResult.error) {
      console.error('주문 조회 오류:', ordersResult.error)
      throw ordersResult.error
    }

    if (productsResult.error) {
      console.error('상품 조회 오류:', productsResult.error)
    }

    const orders = ordersResult.data || []

    // 오늘 주문 수
    const todayOrders = orders.filter(order =>
      new Date(order.created_at) >= todayStart
    ).length

    // 오늘 매출 (결제완료 주문만)
    const todaySales = orders
      .filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= todayStart && order.status === 'paid'
      })
      .reduce((total, order) => {
        // 결제 정보에서 가장 적절한 금액 선택
        const payment = order.order_payments?.[0]
        return total + (payment?.amount || order.total_amount || 0)
      }, 0)

    // 입금대기 건수 (verifying 상태 + 계좌이체)
    const pendingPayments = orders.filter(order => {
      const hasBank = order.order_payments?.some(p => p.method === 'bank_transfer')
      return (order.status === 'pending' || order.status === 'verifying') && hasBank
    }).length

    // 배송준비 건수 (결제완료)
    const readyToShip = orders.filter(order => order.status === 'paid').length

    // 총 상품 수
    const totalProducts = productsResult.count || 0

    // 총 사용자 수 (대략적)
    const totalUsers = usersResult.count || 0

    const stats = {
      todayOrders,
      todaySales,
      pendingPayments,
      readyToShip,
      totalUsers,
      totalProducts
    }

    console.log('✅ 관리자 통계 계산 완료:', stats)

    return NextResponse.json(stats)

  } catch (error) {
    console.error('관리자 통계 조회 실패:', error)
    return NextResponse.json(
      {
        todayOrders: 0,
        todaySales: 0,
        pendingPayments: 0,
        readyToShip: 0,
        totalUsers: 0,
        totalProducts: 0
      },
      { status: 200 } // 에러여도 200으로 기본값 반환
    )
  }
}