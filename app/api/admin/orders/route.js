import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function GET(request) {
  try {
    // URL에서 파라미터 추출
    const { searchParams } = new URL(request.url)
    const adminEmail = searchParams.get('adminEmail')
    const limit = parseInt(searchParams.get('limit') || '1000') // 기본값: 전체
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('🔍 [관리자 주문 API] 전체 주문 조회 시작:', { adminEmail, limit, offset })

    // 1. 관리자 인증 확인
    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 주문 조회 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    // 2. Service Role로 전체 주문 조회 (RLS 우회) + 페이지네이션
    const { data, error, count } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            title,
            thumbnail_url,
            price
          )
        ),
        order_shipping (*),
        order_payments (*)
      `, { count: 'exact' })
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ 주문 조회 쿼리 오류:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ 조회된 주문 수: ${data?.length || 0} / 전체: ${count || 0}`)

    // 3. 사용자 정보 조회 및 데이터 포맷팅
    const ordersWithUserInfo = await Promise.all(data.map(async order => {
      const shipping = order.order_shipping[0] || {}
      const payment = order.order_payments?.[0] || {}

      // 사용자 정보 조회
      let profileInfo = null

      if (order.user_id) {
        // 이메일 사용자: user_id로 profiles 조회
        try {
          const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('nickname, name, phone, email')
            .eq('id', order.user_id)
            .single()

          if (profileData) {
            profileInfo = profileData
          }
        } catch (error) {
          console.debug('사용자 정보 조회 실패:', order.user_id)
        }
      } else if (order.order_type?.includes(':KAKAO:')) {
        // 카카오 사용자: kakao_id로 조회
        const kakaoId = order.order_type.split(':KAKAO:')[1]

        try {
          const { data: kakaoProfile } = await supabaseAdmin
            .from('profiles')
            .select('nickname, name, phone, email, kakao_id')
            .eq('kakao_id', kakaoId)
            .single()

          if (kakaoProfile) {
            profileInfo = kakaoProfile
          } else {
            // 프로필 없으면 배송 정보 사용
            profileInfo = {
              name: shipping?.name || '카카오 사용자',
              nickname: shipping?.name || '카카오 사용자'
            }
          }
        } catch (error) {
          // 프로필 조회 실패 시 배송 정보 사용
          profileInfo = {
            name: shipping?.name || '카카오 사용자',
            nickname: shipping?.name || '카카오 사용자'
          }
        }
      }

      return {
        ...order,
        userProfile: profileInfo,
        order_shipping: shipping,
        order_payments: payment
      }
    }))

    return NextResponse.json({
      success: true,
      orders: ordersWithUserInfo,
      count: ordersWithUserInfo.length,
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0)
    })
  } catch (error) {
    console.error('❌ [관리자 주문 API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
