import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const adminEmail = searchParams.get('adminEmail')

    console.log('🔍 [고객 관리 API] 요청:', { adminEmail })

    // 1. 관리자 인증 확인
    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 고객 조회 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    // 2. Service Role로 전체 고객 조회 (profiles 테이블)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('❌ 고객 조회 오류:', profilesError)
      return NextResponse.json(
        { error: profilesError.message },
        { status: 500 }
      )
    }

    console.log(`✅ 조회된 고객 수: ${profiles?.length || 0}`)

    // 3. 각 고객의 주문 정보 집계
    const customersWithStats = await Promise.all(profiles.map(async (profile) => {
      // 고객의 주문 수와 총 지출액 계산
      const { data: orders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('id, total_amount, status, order_payments(amount)')
        .or(`user_id.eq.${profile.id},order_type.like.%KAKAO:${profile.kakao_id}%`)
        .neq('status', 'cancelled')

      let orderCount = 0
      let totalSpent = 0

      if (!ordersError && orders) {
        orderCount = orders.length
        totalSpent = orders.reduce((sum, order) => {
          const amount = order.order_payments?.[0]?.amount || order.total_amount || 0
          return sum + amount
        }, 0)
      }

      return {
        id: profile.id,
        name: profile.name || '이름없음',
        nickname: profile.nickname || profile.name || '닉네임없음',
        phone: profile.phone || '',
        email: profile.email || '',
        address: profile.address || '',
        kakao_id: profile.kakao_id || '',
        created_at: profile.created_at,
        orderCount,
        totalSpent
      }
    }))

    return NextResponse.json({
      success: true,
      customers: customersWithStats
    })

  } catch (error) {
    console.error('❌ [고객 관리 API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
