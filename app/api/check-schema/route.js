import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    // PostgreSQL 시스템 카탈로그에서 테이블 구조 조회
    const tables = ['orders', 'order_items', 'order_payments', 'order_shipping', 'products', 'profiles']
    const schemaInfo = {}

    for (const table of tables) {
      // 컬럼 정보 조회
      const { data: columns, error } = await supabaseAdmin
        .rpc('exec_sql', {
          sql: `
            SELECT
              column_name,
              data_type,
              is_nullable,
              column_default,
              character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = '${table}'
            ORDER BY ordinal_position;
          `
        })

      if (error) {
        // RPC 함수가 없으면 직접 샘플 데이터로 구조 파악
        const { data: sample } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(1)

        if (sample && sample.length > 0) {
          const sampleRow = sample[0]
          schemaInfo[table] = {
            columns: Object.keys(sampleRow).map(key => ({
              column_name: key,
              data_type: typeof sampleRow[key],
              sample_value: sampleRow[key]
            }))
          }
        }
      } else {
        schemaInfo[table] = { columns }
      }
    }

    return NextResponse.json({
      success: true,
      schema: schemaInfo,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('스키마 조회 오류:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
