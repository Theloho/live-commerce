import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // addresses JSONB 컬럼 추가
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]'::jsonb;
      `
    })

    if (error) {
      console.error('SQL 실행 오류:', error)

      // RPC가 없는 경우 직접 시도
      const { error: alterError } = await supabase
        .from('profiles')
        .select('addresses')
        .limit(1)

      if (alterError && alterError.message.includes('column')) {
        return NextResponse.json({
          error: 'addresses 컬럼 추가 실패. Supabase 대시보드에서 직접 추가해주세요.',
          details: alterError.message
        }, { status: 500 })
      }
    }

    // 기존 데이터를 addresses 형식으로 마이그레이션
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, address, detail_address, addresses')

    if (fetchError) {
      console.error('프로필 조회 오류:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // addresses가 빈 프로필들 업데이트
    const updates = []
    for (const profile of profiles || []) {
      if ((!profile.addresses || profile.addresses.length === 0) && profile.address) {
        // 기존 주소를 기본 주소로 변환
        const defaultAddress = {
          id: 1,
          label: '기본 배송지',
          address: profile.address || '',
          detail_address: profile.detail_address || '',
          is_default: true,
          created_at: new Date().toISOString()
        }

        updates.push(
          supabase
            .from('profiles')
            .update({ addresses: [defaultAddress] })
            .eq('id', profile.id)
        )
      }
    }

    // 모든 업데이트 실행
    if (updates.length > 0) {
      await Promise.all(updates)
      console.log(`✅ ${updates.length}개 프로필 마이그레이션 완료`)
    }

    return NextResponse.json({
      success: true,
      message: 'addresses 컬럼 추가 및 마이그레이션 완료',
      migrated: updates.length
    })

  } catch (error) {
    console.error('addresses 컬럼 추가 오류:', error)
    return NextResponse.json({
      error: error.message,
      suggestion: 'Supabase 대시보드에서 profiles 테이블에 addresses (JSONB) 컬럼을 직접 추가해주세요.'
    }, { status: 500 })
  }
}