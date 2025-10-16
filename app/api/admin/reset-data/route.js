import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// SERVICE_ROLE_KEY 사용 (RLS 우회)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { confirm } = await request.json()

    if (confirm !== 'RESET_ALL_DATA') {
      return NextResponse.json({
        error: '확인 코드가 일치하지 않습니다'
      }, { status: 400 })
    }

    console.log('🗑️ 완전 데이터베이스 초기화 시작...')
    console.log('⚠️ 관리자 계정만 보존됩니다')

    const results = {
      deleted: [],
      preserved: [],
      errors: []
    }

    // ====================================
    // Phase 1: 테스트 데이터 삭제 (외래키 순서 고려)
    // ====================================

    // 1-1. 리뷰 삭제 (order_items FK)
    console.log('🗑️ 1. reviews 삭제...')
    const { error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (reviewsError) {
      results.errors.push({ table: 'reviews', error: reviewsError.message })
    } else {
      results.deleted.push('reviews')
    }

    // 1-2. 알림 삭제
    console.log('🗑️ 2. notifications 삭제...')
    const { error: notiError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (notiError) {
      results.errors.push({ table: 'notifications', error: notiError.message })
    } else {
      results.deleted.push('notifications')
    }

    // 1-3. 발주 이력 삭제
    console.log('🗑️ 3. purchase_order_batches 삭제...')
    const { error: batchError } = await supabaseAdmin
      .from('purchase_order_batches')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (batchError) {
      results.errors.push({ table: 'purchase_order_batches', error: batchError.message })
    } else {
      results.deleted.push('purchase_order_batches')
    }

    // 1-4. 사용자 쿠폰 사용 내역 삭제
    console.log('🗑️ 4. user_coupons 삭제...')
    const { error: userCouponsError } = await supabaseAdmin
      .from('user_coupons')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (userCouponsError) {
      results.errors.push({ table: 'user_coupons', error: userCouponsError.message })
    } else {
      results.deleted.push('user_coupons')
    }

    // 1-5. 주문 관련 테이블 삭제 (외래키 순서)
    const orderTables = [
      'order_items',
      'order_shipping',
      'order_payments',
      'orders'
    ]

    for (const table of orderTables) {
      console.log(`🗑️ 5. ${table} 삭제...`)
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) {
        results.errors.push({ table, error: error.message })
      } else {
        results.deleted.push(table)
      }
    }

    // 1-6. 장바구니, 찜 목록 삭제
    const userDataTables = ['cart_items', 'wishlist']

    for (const table of userDataTables) {
      console.log(`🗑️ 6. ${table} 삭제...`)
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) {
        results.errors.push({ table, error: error.message })
      } else {
        results.deleted.push(table)
      }
    }

    // ====================================
    // Phase 2: 사용자 프로필 정리 (관리자 제외)
    // ====================================

    console.log('🗑️ 7. profiles 정리 (관리자 제외)...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('is_admin', false)  // ⭐ 관리자가 아닌 사용자만 삭제

    if (profileError) {
      results.errors.push({ table: 'profiles', error: profileError.message })
    } else {
      results.deleted.push('profiles (일반 사용자)')
      results.preserved.push('profiles (관리자)')
    }

    // ====================================
    // Phase 3: 라이브 방송 데이터 삭제 (products FK)
    // ====================================

    console.log('🗑️ 8. live_products, live_broadcasts 삭제...')

    const { error: liveProductsError } = await supabaseAdmin
      .from('live_products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (liveProductsError) {
      results.errors.push({ table: 'live_products', error: liveProductsError.message })
    } else {
      results.deleted.push('live_products')
    }

    const { error: liveBroadcastsError } = await supabaseAdmin
      .from('live_broadcasts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (liveBroadcastsError) {
      results.errors.push({ table: 'live_broadcasts', error: liveBroadcastsError.message })
    } else {
      results.deleted.push('live_broadcasts')
    }

    // ====================================
    // Phase 4: 상품 데이터 완전 삭제 (외래키 순서)
    // ====================================

    console.log('🗑️ 9. variant_option_values 삭제...')
    const { error: variantOptionValuesError } = await supabaseAdmin
      .from('variant_option_values')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (variantOptionValuesError) {
      results.errors.push({ table: 'variant_option_values', error: variantOptionValuesError.message })
    } else {
      results.deleted.push('variant_option_values')
    }

    console.log('🗑️ 10. product_variants 삭제...')
    const { error: variantsError } = await supabaseAdmin
      .from('product_variants')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (variantsError) {
      results.errors.push({ table: 'product_variants', error: variantsError.message })
    } else {
      results.deleted.push('product_variants')
    }

    console.log('🗑️ 11. product_option_values 삭제...')
    const { error: optionValuesError } = await supabaseAdmin
      .from('product_option_values')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (optionValuesError) {
      results.errors.push({ table: 'product_option_values', error: optionValuesError.message })
    } else {
      results.deleted.push('product_option_values')
    }

    console.log('🗑️ 12. product_options 삭제...')
    const { error: optionsError } = await supabaseAdmin
      .from('product_options')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (optionsError) {
      results.errors.push({ table: 'product_options', error: optionsError.message })
    } else {
      results.deleted.push('product_options')
    }

    console.log('🗑️ 13. products 삭제...')
    const { error: productsError } = await supabaseAdmin
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (productsError) {
      results.errors.push({ table: 'products', error: productsError.message })
    } else {
      results.deleted.push('products')
    }

    // ====================================
    // Phase 5: 쿠폰, 업체 삭제
    // ====================================

    console.log('🗑️ 14. coupons 삭제...')
    const { error: couponsError } = await supabaseAdmin
      .from('coupons')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (couponsError) {
      results.errors.push({ table: 'coupons', error: couponsError.message })
    } else {
      results.deleted.push('coupons')
    }

    console.log('🗑️ 15. suppliers 삭제...')
    const { error: suppliersError } = await supabaseAdmin
      .from('suppliers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (suppliersError) {
      results.errors.push({ table: 'suppliers', error: suppliersError.message })
    } else {
      results.deleted.push('suppliers')
    }

    // ====================================
    // Phase 6: 보존된 데이터 확인
    // ====================================

    results.preserved.push('admins (모든 관리자 계정)')
    results.preserved.push('admin_sessions')
    results.preserved.push('categories (카테고리 마스터) ⭐')
    results.preserved.push('profiles (관리자만)')

    console.log('🎉 데이터베이스 초기화 완료!')
    console.log('✅ 삭제된 테이블:', results.deleted)
    console.log('🔒 보존된 데이터:', results.preserved)

    if (results.errors.length > 0) {
      console.warn('⚠️ 일부 오류 발생:', results.errors)
    }

    return NextResponse.json({
      success: true,
      message: '데이터베이스가 성공적으로 초기화되었습니다',
      deleted: results.deleted,
      preserved: results.preserved,
      errors: results.errors,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ 데이터베이스 초기화 오류:', error)
    return NextResponse.json({
      error: '데이터베이스 초기화 실패',
      details: error.message
    }, { status: 500 })
  }
}
