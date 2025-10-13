import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function GET(request, { params }) {
  try {
    const { supplierId } = params
    const { searchParams } = new URL(request.url)
    const adminEmail = searchParams.get('adminEmail')

    console.log('🔍 [발주 상세 API] 요청:', { supplierId, adminEmail })

    // 1. 관리자 인증 확인
    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 발주 상세 조회 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    console.log('✅ 관리자 권한 확인 완료:', adminEmail)

    // 2. 업체 정보 조회
    const { data: supplier, error: supplierError } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single()

    if (supplierError) {
      console.error('❌ 업체 조회 오류:', supplierError)
      return NextResponse.json(
        { error: supplierError.message },
        { status: 500 }
      )
    }

    // 3. 입금확인 완료된 주문 조회
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
            supplier_sku
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
      .eq('status', 'deposited')
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('❌ 주문 조회 오류:', ordersError)
      return NextResponse.json(
        { error: ordersError.message },
        { status: 500 }
      )
    }

    // 4. 발주 완료된 주문 제외
    const { data: completedBatches, error: batchesError } = await supabaseAdmin
      .from('purchase_order_batches')
      .select('order_ids')
      .eq('status', 'completed')
      .eq('supplier_id', supplierId)

    if (batchesError) {
      console.error('❌ 배치 조회 오류:', batchesError)
      return NextResponse.json(
        { error: batchesError.message },
        { status: 500 }
      )
    }

    console.log(`✅ 업체 "${supplier.name}" 데이터 조회 완료`)

    return NextResponse.json({
      success: true,
      supplier,
      orders: orders || [],
      completedBatches: completedBatches || []
    })

  } catch (error) {
    console.error('❌ [발주 상세 API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
