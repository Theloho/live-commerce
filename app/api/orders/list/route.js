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
    const { user, orderId } = await request.json()

    console.log('🚀 [Service Role API] 주문 조회 시작:', {
      userId: user?.id,
      userName: user?.name,
      hasKakaoId: !!user?.kakao_id,
      specificOrderId: orderId || 'ALL'
    })

    // 1. 기본 유효성 검사
    if (!user || !user.id) {
      console.error('❌ 사용자 정보 누락')
      return NextResponse.json(
        { error: '사용자 정보가 필요합니다' },
        { status: 400 }
      )
    }

    // 2. 기본 쿼리 구성
    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            title,
            thumbnail_url,
            price
          ),
          product_variants (
            id,
            sku,
            inventory,
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
      // 카카오 사용자: order_type으로 조회
      console.log('📱 카카오 사용자 주문 조회:', user.kakao_id)

      // 기본 조회 (direct:KAKAO:kakao_id)
      const primaryPattern = `direct:KAKAO:${user.kakao_id}`
      const { data: primaryData, error: primaryError } = await query
        .eq('order_type', primaryPattern)

      if (primaryError) {
        console.error('❌ 기본 조회 오류:', primaryError)
        throw primaryError
      }

      data = primaryData || []

      // 대체 조회 (cart:KAKAO:kakao_id)
      const cartPattern = `cart:KAKAO:${user.kakao_id}`
      const { data: cartData, error: cartError } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              title,
              thumbnail_url,
              price
            ),
            product_variants (
              id,
              sku,
              inventory,
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
        .like('order_type', `${cartPattern}%`)
        .order('created_at', { ascending: false })

      if (cartError) {
        console.warn('⚠️ 장바구니 조회 오류:', cartError)
      } else if (cartData && cartData.length > 0) {
        // 중복 제거 후 병합
        const existingIds = new Set(data.map(o => o.id))
        const newCartOrders = cartData.filter(o => !existingIds.has(o.id))
        data = [...data, ...newCartOrders]
        console.log(`✅ 장바구니 주문 ${newCartOrders.length}개 추가`)
      }

      // 추가 대체 조회 (user.id 기반)
      const idPattern = `%KAKAO:${user.id}%`
      const { data: idData, error: idError } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              title,
              thumbnail_url,
              price
            ),
            product_variants (
              id,
              sku,
              inventory,
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
        .like('order_type', idPattern)
        .order('created_at', { ascending: false })

      if (idError) {
        console.warn('⚠️ ID 기반 조회 오류:', idError)
      } else if (idData && idData.length > 0) {
        const existingIds = new Set(data.map(o => o.id))
        const newIdOrders = idData.filter(o => !existingIds.has(o.id))
        data = [...data, ...newIdOrders]
        console.log(`✅ ID 기반 주문 ${newIdOrders.length}개 추가`)
      }

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
        product_number: item.product_id,
        variant_id: item.variant_id
      })),
      shipping: Array.isArray(order.order_shipping) && order.order_shipping.length > 0
        ? order.order_shipping[0]
        : order.order_shipping || null,
      payment: Array.isArray(order.order_payments) && order.order_payments.length > 0
        ? order.order_payments[0]
        : order.order_payments || null
    }))

    console.log(`✅ [Service Role API] 주문 조회 완료: ${normalizedOrders.length}건`)

    return NextResponse.json({
      success: true,
      orders: normalizedOrders
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
