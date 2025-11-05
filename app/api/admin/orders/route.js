import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function GET(request) {
  try {
    // URL에서 파라미터 추출
    const { searchParams } = new URL(request.url)
    const adminEmail = searchParams.get('adminEmail')
    const limit = parseInt(searchParams.get('limit') || '100') // ⚡ 성능: 기본값 100 (1000→100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // ✅ 필터 파라미터 추가
    const statusFilter = searchParams.get('status') // 예: "pending,verifying"
    const paymentMethodFilter = searchParams.get('paymentMethod') // 예: "bank_transfer"
    const orderId = searchParams.get('orderId') // ✅ 단일 주문 조회용
    const paymentGroupId = searchParams.get('paymentGroupId') // ✅ 일괄결제 그룹 조회용

    console.log('🔍 [관리자 주문 API] 전체 주문 조회 시작:', {
      adminEmail,
      limit,
      offset,
      statusFilter,
      paymentMethodFilter,
      orderId: orderId || 'ALL',
      paymentGroupId: paymentGroupId || 'NONE'
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

    // 2. Service Role로 전체 주문 조회 (RLS 우회) + 필터 + 페이지네이션
    // ⚠️ paymentMethodFilter가 있을 때만 !inner 사용 (없으면 order_payments 없는 주문도 조회)
    const useInnerJoin = !!paymentMethodFilter

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
        order_payments${useInnerJoin ? '!inner' : ''} (*)
      `, { count: 'exact' })

    // ✅ 단일 주문 조회 (orderId가 있으면 다른 필터 무시)
    if (orderId) {
      // UUID 형식이면 id로 조회, 아니면 customer_order_number로 조회
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)

      if (isUUID) {
        query = query.eq('id', orderId)
        console.log('🔍 단일 주문 조회 (UUID):', orderId)
      } else {
        query = query.eq('customer_order_number', orderId)
        console.log('🔍 단일 주문 조회 (주문번호):', orderId)
      }
    } else if (paymentGroupId) {
      // ✅ 일괄결제 그룹 조회 (paymentGroupId로 조회)
      query = query.eq('payment_group_id', paymentGroupId)
      console.log('🔍 일괄결제 그룹 조회:', paymentGroupId)
    } else {
      // 전체 조회 시에만 cancelled 제외
      query = query.neq('status', 'cancelled')

      // ✅ 상태 필터 적용
      if (statusFilter) {
        const statuses = statusFilter.split(',').map(s => s.trim())
        query = query.in('status', statuses)
      }

      // ✅ 결제 방법 필터 적용 (!inner 사용으로 order_payments 테이블 필터링)
      if (paymentMethodFilter) {
        query = query.eq('order_payments.method', paymentMethodFilter)
      }

      // 정렬
      query = query.order('created_at', { ascending: false })

      // ⚠️ 페이지네이션: limit이 명시적으로 전달된 경우에만 적용
      // 주문관리 페이지에서는 전체 조회 (limit 없음)
      // 입금확인 페이지에서는 페이지네이션 사용 (limit 있음)
      if (searchParams.has('limit')) {
        query = query.range(offset, offset + limit - 1)
      }
    }

    const { data, error, count } = await query

    if (error) {
      console.error('❌ 주문 조회 쿼리 오류:', error)
      console.error('❌ 에러 상세:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        {
          error: error.message,
          errorDetails: error,
          hint: error.hint,
          details: error.details,
          code: error.code
        },
        { status: 500 }
      )
    }

    console.log(`✅ 조회된 주문 수: ${data?.length || 0} / 전체: ${count || 0} (필터: status=${statusFilter}, method=${paymentMethodFilter})`)

    // 3. ⚡ 성능 최적화: N+1 쿼리 제거 - 프로필 일괄 조회
    // 3-1. 모든 user_id와 kakao_id 수집
    const userIds = [...new Set(data.filter(o => o.user_id).map(o => o.user_id))]
    const kakaoIds = [...new Set(
      data
        .filter(o => !o.user_id && o.order_type?.includes(':KAKAO:'))
        .map(o => o.order_type.split(':KAKAO:')[1])
        .filter(id => id)
    )]

    console.log(`🔍 [관리자 API] 일괄 조회: ${userIds.length}개 이메일 사용자, ${kakaoIds.length}개 카카오 사용자`)

    // 3-2. 프로필 일괄 조회 (2개 쿼리만)
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

    // 3-3. Map으로 빠른 조회
    const profileMap = new Map()
    emailProfiles?.forEach(p => profileMap.set(`email:${p.id}`, p))
    kakaoProfiles?.forEach(p => profileMap.set(`kakao:${p.kakao_id}`, p))

    console.log(`✅ [관리자 API] 프로필 매핑 완료: ${profileMap.size}개`)

    // 3-4. 데이터 포맷팅 (메모리 매칭만, DB 쿼리 없음)
    const ordersWithUserInfo = data.map((order, index) => {
      try {
        const shipping = order.order_shipping?.[0] || {}
        const payment = order.order_payments?.[0] || {}

        // 프로필 조회 (Map에서)
        let profileInfo = null
        if (order.user_id) {
          profileInfo = profileMap.get(`email:${order.user_id}`)
        } else if (order.order_type?.includes(':KAKAO:')) {
          const kakaoId = order.order_type.split(':KAKAO:')[1]
          profileInfo = profileMap.get(`kakao:${kakaoId}`)

          // 프로필 없으면 배송 정보 사용
          if (!profileInfo) {
            profileInfo = {
              name: shipping?.name || '카카오 사용자',
              nickname: shipping?.name || '카카오 사용자'
            }
          }
        }

        return {
          ...order,
          profiles: profileInfo,  // fulfillmentGrouping.js에서 사용
          userProfile: profileInfo  // 관리자 주문 상세, 입금확인, 발송관리에서 사용
        }
      } catch (error) {
        console.error(`주문 처리 중 에러 (index: ${index}, order_id: ${order.id}):`, error)
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
    console.error('❌ [관리자 주문 API] 에러:', error)
    console.error('❌ 에러 스택:', error.stack)
    console.error('❌ 에러 전체:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
        name: error.name,
        errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error))
      },
      { status: 500 }
    )
  }
}
