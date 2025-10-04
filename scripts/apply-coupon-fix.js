#!/usr/bin/env node

/**
 * validate_coupon 함수 수정 적용 스크립트
 *
 * 문제: column reference "coupon_id" is ambiguous
 * 해결: user_coupons 테이블 prefix 추가
 *
 * 실행: node scripts/apply-coupon-fix.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyFix() {
  console.log('🔧 validate_coupon 함수 수정 시작...\n')

  // SQL 파일 읽기
  const sqlPath = join(__dirname, '..', 'supabase', 'migrations', 'fix_validate_coupon.sql')
  const sql = readFileSync(sqlPath, 'utf-8')

  console.log('📄 SQL 쿼리:')
  console.log('─'.repeat(50))
  console.log(sql.substring(0, 200) + '...')
  console.log('─'.repeat(50))
  console.log('')

  try {
    // SQL 실행
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // exec_sql 함수가 없으면 직접 실행 시도
      console.log('⚠️  exec_sql 함수가 없습니다. 직접 실행을 시도합니다...\n')

      // PostgreSQL 함수는 rpc로 실행할 수 없으므로
      // Supabase Dashboard SQL Editor에서 직접 실행 필요
      console.log('❌ Supabase 클라이언트로는 CREATE FUNCTION을 실행할 수 없습니다.')
      console.log('')
      console.log('📌 다음 방법 중 하나를 선택하세요:')
      console.log('')
      console.log('방법 1: Supabase Dashboard (권장)')
      console.log('  1. https://supabase.com/dashboard 접속')
      console.log('  2. 프로젝트 선택')
      console.log('  3. SQL Editor 메뉴 클릭')
      console.log('  4. 아래 파일 내용 복사/붙여넣기:')
      console.log(`     ${sqlPath}`)
      console.log('  5. Run 클릭')
      console.log('')
      console.log('방법 2: psql (터미널)')
      console.log(`  psql <DATABASE_URL> < ${sqlPath}`)
      console.log('')

      process.exit(1)
    }

    console.log('✅ 함수 수정 완료!\n')
    console.log('🎉 validate_coupon 함수가 업데이트되었습니다.')
    console.log('   이제 쿠폰 적용이 정상 작동합니다.')

  } catch (error) {
    console.error('❌ 오류 발생:', error.message)
    console.log('')
    console.log('📌 Supabase Dashboard에서 직접 실행하세요:')
    console.log(`   파일: ${sqlPath}`)
    process.exit(1)
  }
}

applyFix()
