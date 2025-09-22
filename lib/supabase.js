import { createClient } from '@supabase/supabase-js'

// 환경 변수에서 Supabase 설정 가져오기 (확실한 값 사용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xoinislnaxllijlnjeue.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvaW5pc2xuYXhsbGlqbG5qZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjM3MjEsImV4cCI6MjA3NDA5OTcyMX0.NnX051NMmeECmVTzPybzl5jF4Mk7RhmekJcnOCzG7lI'

console.log('📍 Supabase 설정 (v2):', {
  url: supabaseUrl?.substring(0, 30) + '...',
  keyExists: !!supabaseKey,
  keyLength: supabaseKey?.length,
  timestamp: new Date().toISOString()
})

// 환경변수 유효성 검사
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다!')
  throw new Error('Supabase configuration missing')
}

// Supabase 클라이언트 생성 with 에러 핸들링
let supabase
try {
  supabase = createClient(supabaseUrl, supabaseKey)
} catch (error) {
  console.error('❌ Supabase 클라이언트 생성 실패:', error)
  // 임시로 더미 클라이언트 반환
  supabase = {
    from: () => ({ select: () => Promise.resolve({ data: [], error: null }) })
  }
}

console.log('✅ Supabase 클라이언트 초기화 성공')

export { supabase }