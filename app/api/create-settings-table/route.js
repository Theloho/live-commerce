import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🏗️ site_settings 테이블 생성 시작...')

    // 1. 테이블 생성
    const { error: createError } = await supabase.rpc('create_site_settings_table')

    if (createError) {
      // 테이블이 이미 존재하는 경우 무시
      if (!createError.message.includes('already exists')) {
        console.error('테이블 생성 오류:', createError)
        throw createError
      }
      console.log('✅ 테이블이 이미 존재합니다')
    } else {
      console.log('✅ site_settings 테이블 생성 완료')
    }

    // 2. 기본 설정 데이터 삽입
    const defaultSettings = [
      {
        key: 'enable_card_payment',
        value: false,
        description: '카드결제 신청 기능 활성화 여부'
      },
      {
        key: 'enable_bank_transfer',
        value: true,
        description: '계좌이체 결제 기능 활성화 여부'
      },
      {
        key: 'enable_live_orders',
        value: true,
        description: '라이브 주문 기능 활성화 여부'
      },
      {
        key: 'enable_notifications',
        value: true,
        description: '알림 기능 활성화 여부'
      }
    ]

    // upsert로 기본값 설정 (이미 존재하면 무시)
    const { error: insertError } = await supabase
      .from('site_settings')
      .upsert(defaultSettings, {
        onConflict: 'key',
        ignoreDuplicates: true
      })

    if (insertError) {
      console.error('기본 설정 삽입 오류:', insertError)
      throw insertError
    }

    console.log('✅ 기본 설정 데이터 삽입 완료')

    return Response.json({
      success: true,
      message: 'site_settings 테이블과 기본 데이터가 생성되었습니다',
      settings: defaultSettings
    })

  } catch (error) {
    console.error('❌ 테이블 생성 중 오류:', error)

    return Response.json({
      success: false,
      error: error.message,
      message: 'site_settings 테이블 생성에 실패했습니다'
    }, { status: 500 })
  }
}

// SQL 함수를 먼저 실행해야 하므로 직접 테이블 생성
export async function POST() {
  try {
    console.log('🏗️ SQL로 직접 site_settings 테이블 생성...')

    // 직접 SQL로 테이블 생성
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS site_settings (
          id SERIAL PRIMARY KEY,
          key VARCHAR(100) UNIQUE NOT NULL,
          value BOOLEAN NOT NULL DEFAULT false,
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';

        DROP TRIGGER IF EXISTS update_site_settings_updated_at ON site_settings;
        CREATE TRIGGER update_site_settings_updated_at
          BEFORE UPDATE ON site_settings
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `
    })

    if (error) {
      console.error('SQL 실행 오류:', error)
      throw error
    }

    return Response.json({
      success: true,
      message: 'site_settings 테이블이 생성되었습니다'
    })

  } catch (error) {
    console.error('❌ SQL 테이블 생성 오류:', error)

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}