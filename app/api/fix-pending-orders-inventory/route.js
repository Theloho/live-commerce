import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용하여 RLS 우회
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    // 무한 호출 방지를 위해 임시로 비활성화
    return NextResponse.json({
      success: false,
      message: 'API가 임시로 비활성화되었습니다',
      processedOrders: 0,
      processedItems: 0,
      results: []
    })

    const requestBody = await request.json().catch(() => ({}))

    // 🔧 개별 상품 재고 차감 모드
    if (requestBody.forceProductUpdate) {
      console.log('🔧 개별 상품 재고 차감 시작:', requestBody)

      const { productId, quantity } = requestBody

      try {
        // 현재 제품 재고 조회
        const { data: product, error: productError } = await supabaseAdmin
          .from('products')
          .select('id, stock_quantity, inventory, inventory_quantity, title')
          .eq('id', productId)
          .single()

        if (productError) {
          throw new Error(`제품 조회 실패: ${productError.message}`)
        }

        // 현재 재고 확인
        const currentStock = product.stock_quantity ?? product.inventory ?? product.inventory_quantity ?? 100
        const newStock = Math.max(0, currentStock + quantity) // quantity가 음수이므로 + 사용

        console.log(`🔧 개별 재고 차감: ${product.title} - ${currentStock} → ${newStock}`)

        // 재고 업데이트
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', productId)

        if (updateError) {
          throw new Error(`재고 업데이트 실패: ${updateError.message}`)
        }

        return NextResponse.json({
          success: true,
          message: `${product.title} 재고가 ${currentStock}에서 ${newStock}으로 변경되었습니다`,
          productId,
          oldStock: currentStock,
          newStock,
          quantity
        })

      } catch (error) {
        console.error('🔧 개별 재고 차감 실패:', error)
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 })
      }
    }

    console.log('🔧 기존 결제대기 주문들의 재고 차감 시작...')

    // 1. 모든 pending 상태 주문들 조회 (디버깅 포함)
    const { data: pendingOrders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        status,
        customer_order_number,
        order_items (
          id,
          product_id,
          quantity
        )
      `)
      .eq('status', 'pending')

    if (ordersError) {
      console.error('주문 조회 오류:', ordersError)
      throw ordersError
    }

    console.log(`📦 발견된 결제대기 주문: ${pendingOrders.length}개`)
    console.log('🔍 주문 상세:', pendingOrders.map(o => ({
      id: o.id,
      customer_order_number: o.customer_order_number,
      order_items_count: o.order_items?.length || 0,
      order_items: o.order_items
    })))

    // 혹시 order_items 테이블이 아닌 다른 구조일 수 있으니 확인
    console.log('🔍 전체 orders 테이블 구조 확인...')
    const { data: allOrders, error: allOrdersError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .limit(2)

    if (!allOrdersError) {
      console.log('📋 주문 테이블 샘플 데이터:', allOrders)
    }

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