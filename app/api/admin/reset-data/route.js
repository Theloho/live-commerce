import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { confirm } = await request.json()

    if (confirm !== 'RESET_ALL_DATA') {
      return NextResponse.json({
        error: '확인 코드가 일치하지 않습니다'
      }, { status: 400 })
    }

    console.log('🗑️ 데이터베이스 초기화 시작...')

    // 1. 주문 관련 테이블 초기화 (순서 중요 - 외래키 때문에)
    const tablesToReset = [
      'order_items',
      'order_shipping',
      'order_payments',
      'orders',
      'cart_items'
    ]

    for (const table of tablesToReset) {
      console.log(`🗑️ ${table} 테이블 초기화 중...`)

      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', 'impossible-id') // 모든 행 삭제

      if (error) {
        console.error(`❌ ${table} 삭제 오류:`, error)
        // 오류가 있어도 계속 진행 (테이블이 비어있을 수 있음)
      } else {
        console.log(`✅ ${table} 테이블 초기화 완료`)
      }
    }

    // 2. 사용자 프로필 초기화 (auth.users는 건드리지 않음)
    console.log('🗑️ profiles 테이블에서 테스트 사용자 제거...')
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .neq('email', 'admin@example.com') // 관리자 계정은 보존

    if (profileError) {
      console.error('❌ profiles 삭제 오류:', profileError)
    } else {
      console.log('✅ profiles 테이블 정리 완료')
    }

    // 3. 상품 재고 초기화
    console.log('🗑️ 상품 재고 초기화...')
    const { error: inventoryError } = await supabase
      .from('products')
      .update({
        inventory: 100,
        sales_count: 0,
        view_count: 0
      })
      .neq('id', 'impossible-id')

    if (inventoryError) {
      console.error('❌ 재고 초기화 오류:', inventoryError)
    } else {
      console.log('✅ 상품 재고 초기화 완료')
    }

    console.log('🎉 데이터베이스 초기화 완료!')

    return NextResponse.json({
      success: true,
      message: '데이터베이스가 성공적으로 초기화되었습니다',
      reset_tables: tablesToReset,
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