import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // addresses 컬럼이 존재하는지 먼저 확인
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('addresses')
      .limit(1)

    if (testError && testError.message.includes('column "addresses" does not exist')) {
      // 컬럼이 존재하지 않으면 사용자에게 수동 추가 요청
      return NextResponse.json({
        error: 'addresses 컬럼이 존재하지 않습니다.',
        instruction: 'Supabase 대시보드에서 다음 SQL을 실행해주세요:',
        sql: `
ALTER TABLE profiles
ADD COLUMN addresses JSONB DEFAULT '[]'::jsonb;

-- 인덱스 추가 (옵션)
CREATE INDEX idx_profiles_addresses ON profiles USING GIN (addresses);
        `,
        dashboardUrl: 'https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql'
      }, { status: 400 })
    }

    if (testError) {
      console.error('테스트 쿼리 오류:', testError)
      return NextResponse.json({
        error: '데이터베이스 연결 오류',
        details: testError.message
      }, { status: 500 })
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
      // addresses가 비어있거나 없는 경우 기존 주소를 변환
      if (!profile.addresses || profile.addresses.length === 0) {
        if (profile.address) {
          // 기존 주소가 있으면 기본 주소로 변환
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
        } else {
          // 주소가 아예 없으면 빈 배열로 초기화
          updates.push(
            supabase
              .from('profiles')
              .update({ addresses: [] })
              .eq('id', profile.id)
          )
        }
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