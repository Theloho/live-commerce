import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const {
      adminEmail,
      name,
      phone,
      postal_code,
      address,
      detail_address,
      memo
    } = body

    console.log('🔍 [배송지 수정 API] 요청:', { orderId: id, adminEmail })

    // 1. 관리자 인증 확인
    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 배송지 수정 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    // 2. order_shipping 테이블 업데이트
    const { data, error } = await supabaseAdmin
      .from('order_shipping')
      .update({
        name,
        phone,
        postal_code,
        address,
        detail_address,
        memo
      })
      .eq('order_id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ 배송지 업데이트 오류:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ 배송지 업데이트 성공:', id)

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('❌ [배송지 수정 API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
