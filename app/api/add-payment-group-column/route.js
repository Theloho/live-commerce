import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용하여 DDL 권한 확보
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST() {
  try {
    console.log('🔧 orders 테이블에 payment_group_id 컬럼 추가 시작')

    // payment_group_id 컬럼 추가
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS payment_group_id VARCHAR(50) DEFAULT NULL;

        CREATE INDEX IF NOT EXISTS idx_orders_payment_group_id ON orders(payment_group_id);
      `
    })

    if (error) {
      console.error('❌ 컬럼 추가 실패:', error)
      throw error
    }

    console.log('✅ payment_group_id 컬럼 추가 완료')

    return NextResponse.json({
      success: true,
      message: 'payment_group_id 컬럼이 성공적으로 추가되었습니다'
    })

  } catch (error) {
    console.error('스키마 수정 실패:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}