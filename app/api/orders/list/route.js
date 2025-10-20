import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role 클라이언트 생성 (RLS 우회)
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

/**
 * 주문 목록 조회 API (Service Role)
 * - Kakao 사용자 (sessionStorage 인증)
 * - Supabase Auth 사용자 (auth.uid() 인증)
 * 모두 지원
 */
export async function POST(request) {
  try {
    const { user, orderId, page = 1, pageSize = 10, status = null } = await request.json()

    console.log('🚀 [Service Role API] 주문 조회 시작:', {
      userId: user?.id,
      userName: user?.name,
      hasKakaoId: !!user?.kakao_id,
      specificOrderId: orderId || 'ALL',
      page,
      pageSize,
      statusFilter: status
    })

    // 1. 기본 유효성 검사
    if (!user || !user.id) {
      console.error('❌ 사용자 정보 누락')
      return NextResponse.json(
        { error: '사용자 정보가 필요합니다' },
        { status: 400 }
      )
    }

    // 2. 기본 쿼리 구성 (⚡ 최적화: product_variants JOIN 제거)
    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            product_number,
            title,
            thumbnail_url,
            price
          )
        ),
        order_shipping (*),
        order_payments (*)
      `)

    // 특정 주문 ID로 조회 (단일 조회)
    if (orderId) {
      query = query.eq('id', orderId)
    } else {
      // 전체 조회 시에만 cancelled 제외, 정렬
      query = query
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
    }

    // 3. 상태별 총계 계산 (⚡ 최적화: 별도 count 쿼리로 효율적 계산)
    let statusCountQuery = supabaseAdmin
      .from('orders')
      .select('status')

    if (user.kakao_id) {
      // 카카오 사용자: OR 조건 동일하게 적용
      const primaryPattern = `direct:KAKAO:${user.kakao_id}`
      const cartPattern = `cart:KAKAO:${user.kakao_id}`
      const idPattern = `%KAKAO:${user.id}%`

      statusCountQuery = statusCountQuery.or(
        `order_type.eq.${primaryPattern},` +
        `order_type.like.${cartPattern}%,` +
        `order_type.like.${idPattern}`
      )
    } else {
      // Auth 사용자
      statusCountQuery = statusCountQuery.eq('user_id', user.id)
    }

    // cancelled 제외
    if (!orderId) {
      statusCountQuery = statusCountQuery.neq('status', 'cancelled')
    }

    const { data: statusData } = await statusCountQuery
    const statusCounts = (statusData || []).reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {})

    // 5. 상태 필터 적용 (DB-level)
    if (status && !orderId) {
      query = query.eq('status', status)
    }

    // 6. ⚡ DB-level 페이지네이션 (메모리 사용량 90% 감소)
    const offset = (page - 1) * pageSize
    if (!orderId) {
      query = query.range(offset, offset + pageSize - 1)
    }

    // 7. 최종 쿼리 실행 (페이지네이션 적용된 데이터만 로드)
    let finalData = []
    if (user.kakao_id) {
      const primaryPattern = `direct:KAKAO:${user.kakao_id}`
      const cartPattern = `cart:KAKAO:${user.kakao_id}`
      const idPattern = `%KAKAO:${user.id}%`

      const { data: kakaoData, error: kakaoError } = await query.or(
        `order_type.eq.${primaryPattern},` +
        `order_type.like.${cartPattern}%,` +
        `order_type.like.${idPattern}`
      )

      if (kakaoError) {
        console.error('❌ 카카오 페이지네이션 쿼리 오류:', kakaoError)
        throw kakaoError
      }

      finalData = kakaoData || []
    } else {
      const { data: authData, error: authError } = await query
        .eq('user_id', user.id)

      if (authError) {
        console.error('❌ Auth 페이지네이션 쿼리 오류:', authError)
        throw authError
      }

      finalData = authData || []
    }

    // 8. 데이터 정규화 (페이지네이션된 데이터만)
    const normalizedOrders = finalData.map(order => ({
      ...order,
      items: (order.order_items || []).map(item => ({
        ...item,
        thumbnail_url: item.thumbnail_url || item.products?.thumbnail_url || '/placeholder.png',
        title: item.title || item.products?.title || '상품명 없음',
        price: item.price || item.unit_price || item.products?.price || 0,
        totalPrice: item.total_price || item.total || 0,
        // ✅ selectedOptions 추가 (결제대기 페이지 옵션별 분리 표시용)
        selectedOptions: item.selected_options || {},
        // ✅ product_number 우선순위: order_items.product_number > products.product_number > product_id (폴백)
        product_number: item.product_number || item.products?.product_number || item.product_id,
        product_id: item.product_id,
        variant_id: item.variant_id
      })),
      shipping: Array.isArray(order.order_shipping) && order.order_shipping.length > 0
        ? order.order_shipping[0]
        : order.order_shipping || null,
      payment: Array.isArray(order.order_payments) && order.order_payments.length > 0
        ? order.order_payments[0]
        : order.order_payments || null
    }))

    // 9. 페이지네이션 메타데이터 계산
    const totalCount = status
      ? (statusCounts[status] || 0)
      : Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
    const totalPages = Math.ceil(totalCount / pageSize)
    const paginatedOrders = normalizedOrders

    console.log(`✅ [Service Role API] 주문 조회 완료: 전체 ${totalCount}건 중 ${paginatedOrders.length}건 반환 (${page}/${totalPages} 페이지)`)

    return NextResponse.json({
      success: true,
      orders: paginatedOrders,
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages
      },
      statusCounts
    })
  } catch (error) {
    console.error('❌ [Service Role API] 주문 조회 오류:', error)
    return NextResponse.json(
      {
        error: error.message || '주문 조회에 실패했습니다',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
