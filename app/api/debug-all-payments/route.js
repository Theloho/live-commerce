import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function GET() {
  try {
    console.log('🔍 모든 결제 방법 디버깅')

    // 모든 결제 레코드 조회
    const { data: payments, error } = await supabaseAdmin
      .from('order_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      throw error
    }

    // 결제 방법별 통계
    const methodStats = {}
    payments?.forEach(payment => {
      const method = payment.method || 'null'
      methodStats[method] = (methodStats[method] || 0) + 1
    })

    // 카드 결제만 필터링
    const cardPayments = payments?.filter(p => p.method === 'card') || []

    // 최근 생성/업데이트 시간으로 정렬
    const recentUpdates = payments?.sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at)
      const bTime = new Date(b.updated_at || b.created_at)
      return bTime - aTime
    }).slice(0, 10) || []

    return NextResponse.json({
      success: true,
      data: {
        totalPayments: payments?.length || 0,
        methodStatistics: methodStats,
        cardPayments: {
          count: cardPayments.length,
          payments: cardPayments
        },
        recentUpdates: recentUpdates.map(p => ({
          id: p.id,
          order_id: p.order_id,
          method: p.method,
          status: p.status,
          created_at: p.created_at,
          updated_at: p.updated_at,
          wasUpdated: p.updated_at !== p.created_at
        }))
      }
    })

  } catch (error) {
    console.error('결제 디버깅 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}