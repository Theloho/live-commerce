import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function GET(request) {
  try {
    // URL에서 파라미터 추출
    const { searchParams } = new URL(request.url)
    const adminEmail = searchParams.get('adminEmail')
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = parseInt(searchParams.get('limit') || '1000')
    const statusFilter = searchParams.get('status') // 예: "paid"

    console.log('🚚 [배송 취합 API] 전체 주문 조회 시작:', {
      adminEmail,
      limit,
      offset,
      statusFilter
    })

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

    // 2. Service Role로 전체 주문 조회 (날짜 필터 없이, 기존 방식)
    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            title,
            product_number,
            thumbnail_url,
            price,
            sku,
            supplier_id,
            supplier_product_code,
            suppliers (
              id,
              name,
              code,
              contact_person,
              phone
            )
          ),
          product_variants (
            id,
            sku,
            variant_option_values (
              product_option_values (
                value,
                product_options (
                  name
                )
              )
            )
          )
        ),
        order_shipping (*),
        order_payments (*)
      `, { count: 'exact' })
      .neq('status', 'cancelled')

    // status 필터 적용 (예: paid)
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('❌ 주문 조회 쿼리 오류:', error)
      return NextResponse.json(
        {
          error: error.message,
          errorDetails: error
        },
        { status: 500 }
      )
    }

    console.log(`✅ 조회된 주문 수: ${data?.length || 0} / 전체: ${count || 0}`)

    // 3. 프로필 일괄 조회 (기존 로직과 동일)
    const userIds = [...new Set(data.filter(o => o.user_id).map(o => o.user_id))]
    const kakaoIds = [...new Set(
      data
        .filter(o => !o.user_id && o.order_type?.includes(':KAKAO:'))
        .map(o => o.order_type.split(':KAKAO:')[1])
        .filter(id => id)
    )]

    const { data: emailProfiles } = userIds.length > 0
      ? await supabaseAdmin
          .from('profiles')
          .select('id, nickname, name, phone, email, address, postal_code')
          .in('id', userIds)
      : { data: [] }

    const { data: kakaoProfiles } = kakaoIds.length > 0
      ? await supabaseAdmin
          .from('profiles')
          .select('kakao_id, nickname, name, phone, email, address, postal_code')
          .in('kakao_id', kakaoIds)
      : { data: [] }

    const profileMap = new Map()
    emailProfiles?.forEach(p => profileMap.set(`email:${p.id}`, p))
    kakaoProfiles?.forEach(p => profileMap.set(`kakao:${p.kakao_id}`, p))

    // 4. 데이터 포맷팅
    const ordersWithUserInfo = data.map((order) => {
      try {
        const shipping = order.order_shipping?.[0] || {}
        const payment = order.order_payments?.[0] || {}

        let profileInfo = null
        if (order.user_id) {
          profileInfo = profileMap.get(`email:${order.user_id}`)
        } else if (order.order_type?.includes(':KAKAO:')) {
          const kakaoId = order.order_type.split(':KAKAO:')[1]
          profileInfo = profileMap.get(`kakao:${kakaoId}`)

          if (!profileInfo) {
            profileInfo = {
              name: shipping?.name || '카카오 사용자',
              nickname: shipping?.name || '카카오 사용자'
            }
          }
        }

        return {
          ...order,
          profiles: profileInfo,
          userProfile: profileInfo
        }
      } catch (error) {
        console.error(`주문 처리 중 에러 (order_id: ${order.id}):`, error)
        return {
          ...order,
          profiles: null,
          userProfile: null
        }
      }
    })

    return NextResponse.json({
      success: true,
      orders: ordersWithUserInfo,
      count: ordersWithUserInfo.length,
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0)
    })
  } catch (error) {
    console.error('❌ [배송 취합 API] 에러:', error)
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}
