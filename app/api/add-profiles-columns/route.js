import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔧 profiles 테이블 컬럼 확인 및 추가...')

    // 1. 현재 테이블 구조 확인
    const { data: currentData, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (selectError) {
      console.error('테이블 조회 오류:', selectError)
      return Response.json({
        success: false,
        error: selectError.message
      }, { status: 500 })
    }

    console.log('현재 profiles 테이블 샘플:', currentData)

    // 필요한 컬럼들이 있는지 확인
    const sampleRow = currentData[0] || {}
    const missingColumns = []

    const requiredColumns = [
      'kakao_link',
      'address',
      'detail_address',
      'tiktok_id',
      'youtube_id'
    ]

    requiredColumns.forEach(column => {
      if (!(column in sampleRow)) {
        missingColumns.push(column)
      }
    })

    console.log('누락된 컬럼들:', missingColumns)

    if (missingColumns.length === 0) {
      return Response.json({
        success: true,
        message: '모든 필요한 컬럼이 이미 존재합니다',
        columns: Object.keys(sampleRow)
      })
    }

    // Supabase에서는 ALTER TABLE을 직접 실행할 수 없으므로
    // 수동으로 추가해야 할 SQL 제공
    const alterStatements = missingColumns.map(column => {
      switch (column) {
        case 'kakao_link':
          return `ALTER TABLE profiles ADD COLUMN kakao_link TEXT;`
        case 'address':
          return `ALTER TABLE profiles ADD COLUMN address TEXT;`
        case 'detail_address':
          return `ALTER TABLE profiles ADD COLUMN detail_address TEXT;`
        case 'tiktok_id':
          return `ALTER TABLE profiles ADD COLUMN tiktok_id TEXT;`
        case 'youtube_id':
          return `ALTER TABLE profiles ADD COLUMN youtube_id TEXT;`
        default:
          return `ALTER TABLE profiles ADD COLUMN ${column} TEXT;`
      }
    }).join('\n')

    return Response.json({
      success: false,
      needsManualUpdate: true,
      message: `profiles 테이블에 다음 컬럼들을 Supabase SQL Editor에서 추가해주세요`,
      missingColumns,
      sql: alterStatements
    })

  } catch (error) {
    console.error('❌ profiles 테이블 처리 오류:', error)

    return Response.json({
      success: false,
      error: error.message,
      message: 'profiles 테이블 처리에 실패했습니다'
    }, { status: 500 })
  }
}