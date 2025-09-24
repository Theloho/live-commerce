import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 관리자용 Supabase 클라이언트 (서비스 키 사용)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST() {
  try {
    console.log('🔧 order_payments 테이블에 depositor_name 컬럼 추가 시작')

    // depositor_name 컬럼 추가
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE order_payments
        ADD COLUMN IF NOT EXISTS depositor_name VARCHAR(100) DEFAULT NULL;

        CREATE INDEX IF NOT EXISTS idx_order_payments_depositor_name ON order_payments(depositor_name);
      `
    })

    if (error) {
      console.error('❌ SQL 실행 오류:', error)
      throw error
    }

    console.log('✅ depositor_name 컬럼 추가 완료')

    return NextResponse.json({
      success: true,
      message: 'depositor_name 컬럼이 성공적으로 추가되었습니다'
    })

  } catch (error) {
    console.error('컬럼 추가 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: '데이터베이스 컬럼 추가에 실패했습니다'
      },
      { status: 500 }
    )
  }
}