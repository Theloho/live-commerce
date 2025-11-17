import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

// GET: 개별 고객 조회
export async function GET(request, { params }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const adminEmail = searchParams.get('adminEmail')

    console.log('🔍 [고객 상세 조회 API] 요청:', { id, adminEmail })

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

    // 2. Service Role로 개별 고객 조회
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (profileError) {
      console.error('❌ 고객 조회 오류:', profileError)
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      )
    }

    if (!profile) {
      return NextResponse.json(
        { error: '고객을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 3. 고객의 주문 통계 계산
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

    const customer = {
      id: profile.id,
      name: profile.name || '이름없음',
      nickname: profile.nickname || profile.name || '닉네임없음',
      phone: profile.phone || '',
      email: profile.email || '',
      address: profile.address || '',
      avatar_url: profile.avatar_url || '',
      kakao_id: profile.kakao_id || '',
      kakao_link: profile.kakao_link || '',
      created_at: profile.created_at,
      orderCount,
      totalSpent
    }

    console.log('✅ 고객 조회 성공:', id)

    return NextResponse.json({
      success: true,
      customer
    })

  } catch (error) {
    console.error('❌ [고객 상세 조회 API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// PATCH: 고객 정보 수정
export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const { adminEmail, kakao_link } = body

    console.log('🔍 [고객 정보 수정 API] 요청:', { id, adminEmail, kakao_link })

    // 1. 관리자 인증 확인
    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 고객 정보 수정 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    // 2. Service Role로 profiles 테이블 업데이트
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ kakao_link })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ 고객 정보 업데이트 오류:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ 고객 정보 업데이트 성공:', id)

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('❌ [고객 정보 수정 API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
