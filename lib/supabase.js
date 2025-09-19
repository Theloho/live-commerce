import { createClient } from '@supabase/supabase-js'
import { createMockSupabaseClient } from './mockAuth.js'

// 환경 변수 안전하게 읽기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'

// URL과 Key 유효성 검사
const isValidUrl = supabaseUrl && supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co')
const isValidKey = supabaseKey && supabaseKey.length > 0

// Supabase 클라이언트 생성
let supabase

if (useMockData || !isValidUrl || !isValidKey) {
  if (!useMockData) {
    console.warn('Supabase 환경 변수가 올바르지 않습니다. Mock 모드로 전환합니다.')
    console.log('URL valid:', isValidUrl, 'Key valid:', isValidKey)
  } else {
    console.log('🔧 Mock 모드로 실행 중입니다')
  }
  supabase = createMockSupabaseClient()
} else {
  try {
    // 안전한 클라이언트 생성 - 아무 옵션도 사용하지 않음
    supabase = createClient(supabaseUrl, supabaseKey)
    console.log('✅ Supabase 클라이언트 초기화 성공')
    console.log('Supabase URL:', supabaseUrl)
  } catch (error) {
    console.error('Supabase 클라이언트 초기화 실패:', error)
    supabase = createMockSupabaseClient()
  }
}

export { supabase }