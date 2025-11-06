import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function GET(request, { params }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const adminEmail = searchParams.get('adminEmail')

    console.log('🔍 [고객별 주문 조회 API] 요청:', { customerId: id, adminEmail })

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

    // 2. 고객 정보 조회 (kakao_id 확인용)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, kakao_id')
      .eq('id', id)
      .single()

    if (profileError || !profile) {
      console.error('❌ 고객 정보 조회 실패:', profileError)
      return NextResponse.json(
        { error: '고객을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    console.log('✅ 고객 정보 조회 완료:', { id: profile.id, kakao_id: profile.kakao_id })

    // 3. 해당 고객의 모든 주문 조회 (user_id 또는 kakao_id로)
    // ⚠️ limit 없이 모든 주문 조회
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
      `)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    // user_id 또는 order_type으로 필터링
    if (profile.kakao_id) {
      query = query.or(`user_id.eq.${profile.id},order_type.like.%KAKAO:${profile.kakao_id}%`)
    } else {
      query = query.eq('user_id', profile.id)
    }

    const { data: orders, error: ordersError } = await query

    if (ordersError) {
      console.error('❌ 주문 조회 오류:', ordersError)
      return NextResponse.json(
        { error: ordersError.message },
        { status: 500 }
      )
    }

    console.log(`✅ 조회된 주문 수: ${orders?.length || 0}`)

    return NextResponse.json({
      success: true,
      orders: orders || [],
      count: orders?.length || 0
    })

  } catch (error) {
    console.error('❌ [고객별 주문 조회 API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
