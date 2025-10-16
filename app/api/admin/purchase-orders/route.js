import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const adminEmail = searchParams.get('adminEmail')
    const showCompleted = searchParams.get('showCompleted') === 'true'

    console.log('🔍 [발주 관리 API] 요청:', { adminEmail, showCompleted })

    // 1. 관리자 인증 확인
    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 발주 조회 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    // 2. 입금확인 완료된 주문 조회 (Service Role로 RLS 우회)
    // paid: 결제 완료 (카드), deposited: 입금 확인 완료 (계좌이체)
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        customer_order_number,
        created_at,
        order_items (
          id,
          product_id,
          variant_id,
          title,
          quantity,
          price,
          selected_options,
          products (
            id,
            title,
            model_number,
            supplier_id,
            purchase_price,
            thumbnail_url,
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
        )
      `)
      .in('status', ['paid', 'deposited'])
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('❌ 주문 조회 오류:', ordersError)
      return NextResponse.json(
        { error: ordersError.message },
        { status: 500 }
      )
    }

    console.log(`✅ 입금확인 완료 주문: ${orders?.length || 0}개`)

    // 3. 발주 완료된 주문 ID 조회
    const { data: completedBatches, error: batchesError } = await supabaseAdmin
      .from('purchase_order_batches')
      .select('order_ids, supplier_id, download_date, total_items, total_amount')
      .eq('status', 'completed')

    if (batchesError) {
      console.error('❌ 발주 배치 조회 오류:', batchesError)
      return NextResponse.json(
        { error: batchesError.message },
        { status: 500 }
      )
    }

    console.log(`✅ 발주 완료 배치: ${completedBatches?.length || 0}개`)

    return NextResponse.json({
      success: true,
      orders: orders || [],
      completedBatches: completedBatches || []
    })

  } catch (error) {
    console.error('❌ [발주 관리 API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
