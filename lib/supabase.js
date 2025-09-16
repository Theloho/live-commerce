import { createClient } from '@supabase/supabase-js'
import { createMockSupabaseClient } from './mockAuth.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'

// Supabase 싱글톤 클라이언트
let supabase

if (!supabase) {
  // Mock 모드이거나 환경 변수가 없으면 Mock 클라이언트 사용
  if (useMockData || !supabaseUrl || !supabaseKey) {
    console.log('🔧 Mock 모드로 실행 중입니다')
    supabase = createMockSupabaseClient()
  } else {
    supabase = createClient(supabaseUrl, supabaseKey)
  }
}

export { supabase }