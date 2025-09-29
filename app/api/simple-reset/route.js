import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST(request) {
  try {
    console.log('🔄 간단한 데이터베이스 정리 시작...')

    // 1. 주문 관련 테이블 정리
    const tables = ['order_shipping', 'order_items', 'payments', 'orders', 'profiles']

    for (const table of tables) {
      try {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .neq('id', 0)

        if (error) {
          console.error(`${table} 정리 실패:`, error.message)
        } else {
          console.log(`✅ ${table} 테이블 정리 완료`)
        }
      } catch (e) {
        console.log(`ℹ️ ${table} 테이블 없거나 건너뛰기`)
      }
    }

    console.log('🎉 데이터베이스 정리 완료!')
    console.log('⚠️ auth.users는 Supabase 대시보드에서 수동으로 정리해주세요')

    return NextResponse.json({
      success: true,
      message: '데이터베이스 정리 완료',
      note: 'auth.users는 Supabase 대시보드에서 수동 정리 필요'
    })

  } catch (error) {
    console.error('❌ 데이터베이스 정리 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}