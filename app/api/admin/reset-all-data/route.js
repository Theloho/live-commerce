import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

/**
 * 모든 제품 + 주문 데이터 완전 삭제 API
 * ⚠️ 위험: 되돌릴 수 없음!
 */
export async function POST(request) {
  try {
    const { adminEmail, confirmCode } = await request.json()

    console.log('🗑️ 데이터 완전 삭제 요청:', { adminEmail })

    // 1. 필수 파라미터 검증
    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    // 2. 확인 코드 검증 (실수 방지)
    if (confirmCode !== 'DELETE_ALL_DATA') {
      return NextResponse.json(
        { error: '확인 코드가 일치하지 않습니다. confirmCode: "DELETE_ALL_DATA"를 입력하세요.' },
        { status: 400 }
      )
    }

    // 3. 관리자 권한 확인
    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      console.warn(`⚠️ 권한 없는 데이터 삭제 시도: ${adminEmail}`)
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    console.log('🚨 데이터 완전 삭제 시작...')

    // 4. 삭제 순서 (외래키 제약 조건 고려)
    const deletionSteps = []

    // 4.1. order_items 삭제 (order_id, product_id 외래키)
    const { error: itemsError, count: itemsCount } = await supabaseAdmin
      .from('order_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 모든 행 삭제

    if (itemsError) {
      console.error('❌ order_items 삭제 실패:', itemsError)
      deletionSteps.push({ table: 'order_items', status: 'failed', error: itemsError.message })
    } else {
      console.log(`✅ order_items 삭제 완료: ${itemsCount}개`)
      deletionSteps.push({ table: 'order_items', status: 'success', count: itemsCount })
    }

    // 4.2. order_payments 삭제
    const { error: paymentsError, count: paymentsCount } = await supabaseAdmin
      .from('order_payments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (paymentsError) {
      console.error('❌ order_payments 삭제 실패:', paymentsError)
      deletionSteps.push({ table: 'order_payments', status: 'failed', error: paymentsError.message })
    } else {
      console.log(`✅ order_payments 삭제 완료: ${paymentsCount}개`)
      deletionSteps.push({ table: 'order_payments', status: 'success', count: paymentsCount })
    }

    // 4.3. order_shipping 삭제
    const { error: shippingError, count: shippingCount } = await supabaseAdmin
      .from('order_shipping')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (shippingError) {
      console.error('❌ order_shipping 삭제 실패:', shippingError)
      deletionSteps.push({ table: 'order_shipping', status: 'failed', error: shippingError.message })
    } else {
      console.log(`✅ order_shipping 삭제 완료: ${shippingCount}개`)
      deletionSteps.push({ table: 'order_shipping', status: 'success', count: shippingCount })
    }

    // 4.4. orders 삭제
    const { error: ordersError, count: ordersCount } = await supabaseAdmin
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (ordersError) {
      console.error('❌ orders 삭제 실패:', ordersError)
      deletionSteps.push({ table: 'orders', status: 'failed', error: ordersError.message })
    } else {
      console.log(`✅ orders 삭제 완료: ${ordersCount}개`)
      deletionSteps.push({ table: 'orders', status: 'success', count: ordersCount })
    }

    // 4.5. product_variants 삭제
    const { error: variantsError, count: variantsCount } = await supabaseAdmin
      .from('product_variants')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (variantsError) {
      console.error('❌ product_variants 삭제 실패:', variantsError)
      deletionSteps.push({ table: 'product_variants', status: 'failed', error: variantsError.message })
    } else {
      console.log(`✅ product_variants 삭제 완료: ${variantsCount}개`)
      deletionSteps.push({ table: 'product_variants', status: 'success', count: variantsCount })
    }

    // 4.6. product_option_values 삭제
    const { error: optionValuesError, count: optionValuesCount } = await supabaseAdmin
      .from('product_option_values')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (optionValuesError) {
      console.error('❌ product_option_values 삭제 실패:', optionValuesError)
      deletionSteps.push({ table: 'product_option_values', status: 'failed', error: optionValuesError.message })
    } else {
      console.log(`✅ product_option_values 삭제 완료: ${optionValuesCount}개`)
      deletionSteps.push({ table: 'product_option_values', status: 'success', count: optionValuesCount })
    }

    // 4.7. product_options 삭제
    const { error: optionsError, count: optionsCount } = await supabaseAdmin
      .from('product_options')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (optionsError) {
      console.error('❌ product_options 삭제 실패:', optionsError)
      deletionSteps.push({ table: 'product_options', status: 'failed', error: optionsError.message })
    } else {
      console.log(`✅ product_options 삭제 완료: ${optionsCount}개`)
      deletionSteps.push({ table: 'product_options', status: 'success', count: optionsCount })
    }

    // 4.8. products 삭제 (마지막)
    const { error: productsError, count: productsCount } = await supabaseAdmin
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (productsError) {
      console.error('❌ products 삭제 실패:', productsError)
      deletionSteps.push({ table: 'products', status: 'failed', error: productsError.message })
    } else {
      console.log(`✅ products 삭제 완료: ${productsCount}개`)
      deletionSteps.push({ table: 'products', status: 'success', count: productsCount })
    }

    console.log('🎉 데이터 완전 삭제 완료!')

    return NextResponse.json({
      success: true,
      message: '모든 제품 + 주문 데이터 삭제 완료',
      deletionSteps
    })
  } catch (error) {
    console.error('❌ API 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
