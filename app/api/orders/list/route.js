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
  const startTime = Date.now()  // ⚡ 성능 측정 시작

  try {
    const { user, orderId, page = 1, pageSize = 10, status = null } = await request.json()

    console.log(`🚀 주문 조회 시작: user=${user?.id?.substring(0, 8)}... ${orderId ? `order=${orderId}` : `page=${page}`}`)

    // 1. 기본 유효성 검사
    if (!user || !user.id) {
      console.error('❌ 사용자 정보 누락')
      return NextResponse.json(
        { error: '사용자 정보가 필요합니다' },
        { status: 400 }
      )
    }

    // 2. 기본 쿼리 구성
    // ⚠️ products JOIN 필요: order_items에 데이터 누락된 레거시 주문 존재
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

    // 3. 사용자 타입별 필터링
    let data = []

    if (user.kakao_id) {
      // ⚡ 카카오 사용자: 3개 패턴을 1개 쿼리로 통합 (성능 최적화)
      console.log('📱 카카오 사용자 주문 조회:', user.kakao_id)

      // 3가지 패턴 정의
      const directPattern = `direct:KAKAO:${user.kakao_id}`
      const cartPattern = `cart:KAKAO:${user.kakao_id}`
      const idPattern = `KAKAO:${user.id}`

      // ✅ 1개 쿼리로 3개 패턴 모두 조회 (OR 조건)
      const { data: kakaoData, error: kakaoError } = await query
        .or(`order_type.eq.${directPattern},order_type.like.${cartPattern}%,order_type.like.%${idPattern}%`)

      if (kakaoError) {
        console.error('❌ 카카오 사용자 조회 오류:', kakaoError)
        throw kakaoError
      }

      data = kakaoData || []
      console.log(`✅ 카카오 주문 조회 완료: ${data.length}건`)

    } else {
      // Supabase Auth 사용자: user_id로 조회
      console.log('🔐 Auth 사용자 주문 조회:', user.id)

      const { data: authData, error: authError } = await query
        .eq('user_id', user.id)

      if (authError) {
        console.error('❌ Auth 조회 오류:', authError)
        throw authError
      }

      data = authData || []
    }

    // 4. 데이터 정규화
    const normalizedOrders = data.map(order => ({
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

    // 5. 상태별 총계 계산 (탭 숫자용)
    const statusCounts = normalizedOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {})

    // 6. 상태 필터 적용
    let filteredOrders = normalizedOrders
    if (status) {
      filteredOrders = normalizedOrders.filter(order => order.status === status)
    }

    // 7. 페이지네이션 적용
    const totalCount = filteredOrders.length
    const totalPages = Math.ceil(totalCount / pageSize)
    const offset = (page - 1) * pageSize
    const paginatedOrders = filteredOrders.slice(offset, offset + pageSize)

    // ⚡ 성능 측정 완료
    const elapsed = Date.now() - startTime
    console.log(`✅ 주문 조회 완료: ${paginatedOrders.length}건 반환 (${elapsed}ms)`)

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
