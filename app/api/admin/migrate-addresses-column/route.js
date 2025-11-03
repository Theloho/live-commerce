import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * profiles 테이블에 addresses JSONB 컬럼 추가
 * migration-add-addresses-jsonb.sql 실행
 */
export async function POST(request) {
  try {
    const { adminEmail } = await request.json()

    if (adminEmail !== 'master@allok.world') {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    console.log('🔄 addresses JSONB 컬럼 마이그레이션 시작...')

    // Step 1: addresses 컬럼 추가
    const { error: alterError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]'::jsonb;
      `
    })

    if (alterError) {
      // RPC 함수가 없으면 직접 SQL 실행 (Service Role Key 필요)
      console.log('⚠️ RPC 함수 없음, 대체 방법 시도...')

      // Supabase REST API로 직접 SQL 실행은 불가능
      // 대신 profiles 테이블을 업데이트하여 컬럼이 생성되도록 유도
      return NextResponse.json({
        success: false,
        message: 'Supabase 대시보드에서 수동 실행 필요',
        sql: `
-- Supabase SQL Editor에서 실행하세요:

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN profiles.addresses IS 'Array of address objects: [{id, label, address, detail_address, postal_code, is_default, created_at}]';

CREATE INDEX IF NOT EXISTS idx_profiles_addresses ON profiles USING GIN (addresses);
        `,
        instructions: [
          '1. Supabase 대시보드 → SQL Editor 접속',
          '2. 위 SQL 복사하여 실행',
          '3. 완료 후 다시 주소 저장 시도'
        ]
      })
    }

    console.log('✅ addresses 컬럼 추가 완료')

    // Step 2: 인덱스 생성
    const { error: indexError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_profiles_addresses ON profiles USING GIN (addresses);
      `
    })

    if (indexError) {
      console.warn('⚠️ 인덱스 생성 실패:', indexError)
    } else {
      console.log('✅ 인덱스 생성 완료')
    }

    // Step 3: 기존 address 데이터를 addresses 배열로 마이그레이션
    const { data: profiles, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, address, detail_address, postal_code')
      .not('address', 'is', null)
      .is('addresses', null)

    if (fetchError) {
      console.error('❌ 프로필 조회 실패:', fetchError)
    } else if (profiles && profiles.length > 0) {
      console.log(`🔄 ${profiles.length}명의 기본 주소 마이그레이션 시작...`)

      let successCount = 0
      for (const profile of profiles) {
        const defaultAddress = {
          id: Date.now() + Math.random(),
          label: '기본 배송지',
          address: profile.address,
          detail_address: profile.detail_address || '',
          postal_code: profile.postal_code || '',
          is_default: true,
          created_at: new Date().toISOString()
        }

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ addresses: [defaultAddress] })
          .eq('id', profile.id)

        if (updateError) {
          console.error(`❌ ${profile.id} 마이그레이션 실패:`, updateError)
        } else {
          successCount++
        }
      }

      console.log(`✅ ${successCount}/${profiles.length}명 마이그레이션 완료`)
    }

    return NextResponse.json({
      success: true,
      message: 'addresses 컬럼 마이그레이션 완료',
      migratedUsers: profiles?.length || 0
    })
  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
