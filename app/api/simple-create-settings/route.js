import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🏗️ 간단한 방식으로 설정 테이블 체크/생성...')

    // 1. 테이블 존재 확인
    const { data: existingData, error: selectError } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1)

    if (selectError) {
      console.log('테이블이 없어서 오류:', selectError.message)

      // 테이블이 없다면 수동으로 기본 설정만 반환
      return Response.json({
        success: false,
        needsTableCreation: true,
        message: 'site_settings 테이블을 Supabase 콘솔에서 수동으로 생성해주세요',
        sql: `
CREATE TABLE site_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_settings (key, value, description) VALUES
('enable_card_payment', false, '카드결제 신청 기능 활성화 여부'),
('enable_bank_transfer', true, '계좌이체 결제 기능 활성화 여부'),
('enable_live_orders', true, '라이브 주문 기능 활성화 여부'),
('enable_notifications', true, '알림 기능 활성화 여부');
        `
      })
    }

    // 2. 테이블이 존재한다면 기본 데이터 확인/삽입
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

    // 각 설정을 개별적으로 upsert
    for (const setting of defaultSettings) {
      const { error: upsertError } = await supabase
        .from('site_settings')
        .upsert(setting, {
          onConflict: 'key',
          ignoreDuplicates: true
        })

      if (upsertError) {
        console.error(`설정 ${setting.key} 삽입 오류:`, upsertError)
      }
    }

    // 3. 현재 설정 조회
    const { data: currentSettings, error: finalError } = await supabase
      .from('site_settings')
      .select('*')

    if (finalError) {
      throw finalError
    }

    return Response.json({
      success: true,
      message: '설정이 정상적으로 로드되었습니다',
      settings: currentSettings
    })

  } catch (error) {
    console.error('❌ 설정 처리 오류:', error)

    return Response.json({
      success: false,
      error: error.message,
      message: '설정 처리에 실패했습니다'
    }, { status: 500 })
  }
}