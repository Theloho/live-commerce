import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용하여 DDL 권한 확보
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.replace(/[\r\n\s]+/g, '')
)

export async function POST() {
  try {
    console.log('🔧 profiles 테이블에 detail_address 컬럼 추가 시작')

    // detail_address 컬럼 추가
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS detail_address TEXT DEFAULT '';
      `
    })

    if (error) {
      console.error('❌ 컬럼 추가 실패:', error)
      throw error
    }

    console.log('✅ detail_address 컬럼 추가 완료')

    return NextResponse.json({
      success: true,
      message: 'detail_address 컬럼이 성공적으로 추가되었습니다'
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