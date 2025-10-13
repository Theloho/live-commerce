import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      adminEmail,
      supplierId,
      orderIds,
      adjustedQuantities,
      totalItems,
      totalAmount
    } = body

    console.log('🔍 [발주 배치 생성 API] 요청:', {
      adminEmail,
      supplierId,
      orderCount: orderIds?.length
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
      console.warn(`⚠️ 권한 없는 발주 배치 생성 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    // 2. 발주 배치 생성
    const { data, error } = await supabaseAdmin
      .from('purchase_order_batches')
      .insert({
        supplier_id: supplierId,
        order_ids: orderIds,
        adjusted_quantities: adjustedQuantities,
        total_items: totalItems,
        total_amount: totalAmount,
        status: 'completed',
        created_by: adminEmail
      })
      .select()
      .single()

    if (error) {
      console.error('❌ 발주 배치 생성 오류:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ 발주 배치 생성 완료:', data.id)

    return NextResponse.json({
      success: true,
      batch: data
    })

  } catch (error) {
    console.error('❌ [발주 배치 생성 API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
