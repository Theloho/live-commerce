import { createClient } from '@supabase/supabase-js'
import { createMockSupabaseClient } from './mockAuth.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'

// Supabase 클라이언트 생성 - 단순화된 버전
let supabase

if (useMockData || !supabaseUrl || !supabaseKey) {
  console.log('🔧 Mock 모드로 실행 중입니다')
  supabase = createMockSupabaseClient()
} else {
  // Vercel Edge Runtime과 호환되도록 최소한의 옵션만 사용
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}

export { supabase }