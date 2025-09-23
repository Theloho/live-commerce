import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용하여 RLS 우회
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    console.log('🔧 기존 결제대기 주문들의 재고 차감 시작...')

    // 1. 모든 pending 상태 주문들 조회
    const { data: pendingOrders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        status,
        order_items (
          product_id,
          quantity
        )
      `)
      .eq('status', 'pending')

    if (ordersError) throw ordersError

    console.log(`📦 발견된 결제대기 주문: ${pendingOrders.length}개`)

    // 2. 각 주문의 아이템들에 대해 재고 차감
    let totalProcessed = 0
    const results = []

    for (const order of pendingOrders) {
      console.log(`🔄 주문 ${order.id} 처리 중...`)

      for (const item of order.order_items) {
        try {
          // 현재 제품 재고 조회
          const { data: product, error: productError } = await supabaseAdmin
            .from('products')
            .select('id, stock_quantity, inventory, inventory_quantity, title')
            .eq('id', item.product_id)
            .single()

          if (productError) {
            console.error(`❌ 제품 ${item.product_id} 조회 실패:`, productError)
            continue
          }

          // 현재 재고 확인 (stock_quantity 우선, 없으면 다른 필드 사용)
          const currentStock = product.stock_quantity ?? product.inventory ?? product.inventory_quantity ?? 100

          // 재고가 충분한지 확인
          if (currentStock >= item.quantity) {
            const newStock = currentStock - item.quantity

            // stock_quantity 필드로 업데이트
            const { error: updateError } = await supabaseAdmin
              .from('products')
              .update({
                stock_quantity: newStock,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.product_id)

            if (updateError) {
              console.error(`❌ 제품 ${item.product_id} 재고 업데이트 실패:`, updateError)
            } else {
              console.log(`✅ ${product.title?.slice(0, 20)}... 재고 차감: ${currentStock} → ${newStock}`)
              totalProcessed++
              results.push({
                productId: item.product_id,
                productTitle: product.title,
                oldStock: currentStock,
                newStock: newStock,
                quantity: item.quantity
              })
            }
          } else {
            console.warn(`⚠️ ${product.title?.slice(0, 20)}... 재고 부족: 현재 ${currentStock}, 필요 ${item.quantity}`)
          }

        } catch (itemError) {
          console.error(`❌ 주문 아이템 처리 실패:`, itemError)
        }
      }
    }

    console.log(`🎉 재고 차감 완료: ${totalProcessed}개 아이템 처리`)

    return NextResponse.json({
      success: true,
      message: `${totalProcessed}개 아이템의 재고가 차감되었습니다`,
      processedOrders: pendingOrders.length,
      processedItems: totalProcessed,
      results: results
    })

  } catch (error) {
    console.error('재고 차감 처리 실패:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '재고 차감 처리에 실패했습니다'
      },
      { status: 500 }
    )
  }
}