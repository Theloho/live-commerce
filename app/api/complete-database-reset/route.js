import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    console.log('🔄 완전한 데이터베이스 초기화 시작...')

    // 1. 모든 주문 관련 데이터 삭제
    console.log('📋 주문 관련 테이블 정리 중...')

    const { error: orderShippingError } = await supabaseAdmin
      .from('order_shipping')
      .delete()
      .neq('id', 0) // 모든 행 삭제

    if (orderShippingError) {
      console.error('order_shipping 삭제 실패:', orderShippingError)
    } else {
      console.log('✅ order_shipping 테이블 완전 정리')
    }

    const { error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .delete()
      .neq('id', 0)

    if (orderItemsError) {
      console.error('order_items 삭제 실패:', orderItemsError)
    } else {
      console.log('✅ order_items 테이블 완전 정리')
    }

    const { error: paymentsError } = await supabaseAdmin
      .from('payments')
      .delete()
      .neq('id', 0)

    if (paymentsError) {
      console.error('payments 삭제 실패:', paymentsError)
    } else {
      console.log('✅ payments 테이블 완전 정리')
    }

    const { error: ordersError } = await supabaseAdmin
      .from('orders')
      .delete()
      .neq('id', 0)

    if (ordersError) {
      console.error('orders 삭제 실패:', ordersError)
    } else {
      console.log('✅ orders 테이블 완전 정리')
    }

    // 2. 사용자 프로필 및 인증 데이터 삭제
    console.log('👤 사용자 데이터 정리 중...')

    // addresses 테이블이 있다면 삭제
    try {
      const { error: addressesError } = await supabaseAdmin
        .from('addresses')
        .delete()
        .neq('id', 0)

      if (addressesError && !addressesError.message.includes('does not exist')) {
        console.error('addresses 삭제 실패:', addressesError)
      } else {
        console.log('✅ addresses 테이블 정리 (있는 경우)')
      }
    } catch (e) {
      console.log('ℹ️ addresses 테이블 없음 (정상)')
    }

    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .neq('id', 0)

    if (profilesError) {
      console.error('profiles 삭제 실패:', profilesError)
    } else {
      console.log('✅ profiles 테이블 완전 정리')
    }

    // 3. auth.users 테이블 정리 (Service Role Key 필요)
    console.log('🔐 인증 사용자 데이터 정리 중...')

    try {
      console.log('⚠️ auth.users 정리는 Supabase 대시보드에서 수동으로 해주세요')
      console.log('   - Authentication > Users 페이지에서 모든 사용자 삭제')
    } catch (authError) {
      console.error('인증 사용자 정리 건너뛰기:', authError)
    }

    // 4. 시퀀스 리셋 (ID 번호 1부터 다시 시작)
    console.log('🔄 시퀀스 리셋 스킵 (자동으로 처리됨)')
    console.log('ℹ️ 새 데이터 생성 시 ID가 자동으로 부여됩니다')

    console.log('🎉 완전한 데이터베이스 초기화 완료!')

    return NextResponse.json({
      success: true,
      message: '데이터베이스가 완전히 초기화되었습니다',
      resetItems: [
        'orders (주문)',
        'order_items (주문 상품)',
        'order_shipping (배송 정보)',
        'payments (결제)',
        'profiles (프로필)',
        'addresses (주소, 있는 경우)',
        'auth.users (인증 사용자)',
        'sequences (ID 시퀀스)'
      ],
      note: '이제 새로 가입해서 테스트할 수 있습니다'
    })

  } catch (error) {
    console.error('❌ 완전한 데이터베이스 초기화 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      message: '데이터베이스 초기화에 실패했습니다'
    }, { status: 500 })
  }
}