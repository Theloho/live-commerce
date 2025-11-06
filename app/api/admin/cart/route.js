import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const adminEmail = searchParams.get('adminEmail')

    console.log('🔍 [관리자 장바구니 조회 API] 요청:', { adminEmail })

    // 1. 관리자 인증 확인
    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 장바구니 조회 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    // 2. 모든 장바구니 아이템 조회 (상품 정보만 포함)
    const { data: cartItems, error } = await supabaseAdmin
      .from('cart_items')
      .select(`
        *,
        products (
          id,
          title,
          product_number,
          thumbnail_url,
          price
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ 장바구니 조회 오류:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // 3. 사용자 정보 별도 조회 (user_id로 profiles 조회)
    const userIds = [...new Set(cartItems.map(item => item.user_id))]
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, nickname')
      .in('id', userIds)

    if (profileError) {
      console.warn('⚠️ 사용자 정보 조회 오류:', profileError)
    }

    // 4. 장바구니 아이템에 사용자 정보 병합
    const profileMap = (profiles || []).reduce((acc, profile) => {
      acc[profile.id] = profile
      return acc
    }, {})

    const enrichedCartItems = cartItems.map(item => ({
      ...item,
      profiles: profileMap[item.user_id] || null
    }))

    console.log(`✅ 조회된 장바구니 아이템 수: ${enrichedCartItems?.length || 0}`)

    return NextResponse.json({
      success: true,
      cartItems: enrichedCartItems || [],
      count: enrichedCartItems?.length || 0
    })

  } catch (error) {
    console.error('❌ [관리자 장바구니 조회 API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
