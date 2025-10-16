import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function GET(request) {
  try {
    // URL에서 파라미터 추출
    const { searchParams } = new URL(request.url)
    const adminEmail = searchParams.get('adminEmail')
    const limit = parseInt(searchParams.get('limit') || '1000') // 기본값: 전체
    const offset = parseInt(searchParams.get('offset') || '0')

    // ✅ 필터 파라미터 추가
    const statusFilter = searchParams.get('status') // 예: "pending,verifying"
    const paymentMethodFilter = searchParams.get('paymentMethod') // 예: "bank_transfer"
    const orderId = searchParams.get('orderId') // ✅ 단일 주문 조회용

    console.log('🔍 [관리자 주문 API] 전체 주문 조회 시작:', {
      adminEmail,
      limit,
      offset,
      statusFilter,
      paymentMethodFilter,
      orderId: orderId || 'ALL'
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
            image_url,
            thumbnail_url,
            price,
            sku
          ),
          product_variants (
            id,
            sku,
            image_url,
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
      query = query.eq('id', orderId)
      console.log('🔍 단일 주문 조회:', orderId)
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

      // 정렬 및 페이지네이션
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
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

    // 3. 사용자 정보 조회 및 데이터 포맷팅
    const ordersWithUserInfo = await Promise.all(data.map(async (order, index) => {
      try {
        // order_shipping과 order_payments는 이미 배열로 반환됨
        const shipping = order.order_shipping?.[0] || {}
        const payment = order.order_payments?.[0] || {}

        // 사용자 정보 조회
        let profileInfo = null

        if (order.user_id) {
          // 이메일 사용자: user_id로 profiles 조회
          try {
            const { data: profileData, error: profileError } = await supabaseAdmin
              .from('profiles')
              .select('nickname, name, phone, email, address, postal_code')
              .eq('id', order.user_id)
              .maybeSingle()  // single() 대신 maybeSingle() 사용

            if (profileError) {
              console.error(`프로필 조회 에러 (user_id: ${order.user_id}):`, profileError)
            } else if (profileData) {
              profileInfo = profileData
            }
          } catch (error) {
            console.error(`사용자 정보 조회 실패 (user_id: ${order.user_id}):`, error)
          }
        } else if (order.order_type?.includes(':KAKAO:')) {
          // 카카오 사용자: kakao_id로 조회
          const kakaoId = order.order_type.split(':KAKAO:')[1]

          try {
            const { data: kakaoProfile, error: kakaoError } = await supabaseAdmin
              .from('profiles')
              .select('nickname, name, phone, email, kakao_id, address, postal_code')
              .eq('kakao_id', kakaoId)
              .maybeSingle()  // single() 대신 maybeSingle() 사용

            if (kakaoError) {
              console.error(`카카오 프로필 조회 에러 (kakao_id: ${kakaoId}):`, kakaoError)
            } else if (kakaoProfile) {
              profileInfo = kakaoProfile
            } else {
              // 프로필 없으면 배송 정보 사용
              profileInfo = {
                name: shipping?.name || '카카오 사용자',
                nickname: shipping?.name || '카카오 사용자'
              }
            }
          } catch (error) {
            console.error(`카카오 프로필 조회 실패 (kakao_id: ${kakaoId}):`, error)
            // 프로필 조회 실패 시 배송 정보 사용
            profileInfo = {
              name: shipping?.name || '카카오 사용자',
              nickname: shipping?.name || '카카오 사용자'
            }
          }
        }

        return {
          ...order,
          profiles: profileInfo  // fulfillmentGrouping.js에서 사용
        }
      } catch (error) {
        console.error(`주문 처리 중 에러 (index: ${index}, order_id: ${order.id}):`, error)
        // 에러가 발생해도 기본 주문 데이터는 반환
        return {
          ...order,
          profiles: null
        }
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
