import { createClient } from '@supabase/supabase-js'

// 환경 변수에서 Supabase 설정 가져오기 (확실한 값 사용)
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xoinislnaxllijlnjeue.supabase.co').trim()
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvaW5pc2xuYXhsbGlqbG5qZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjM3MjEsImV4cCI6MjA3NDA5OTcyMX0.NnX051NMmeECmVTzPybzl5jF4Mk7RhmekJcnOCzG7lI').replace(/\s/g, '')

// 환경변수 유효성 검사
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다!')
  throw new Error('Supabase configuration missing')
}

// 싱글톤 패턴: 전역에 한 번만 생성
let supabaseInstance = null

const getSupabaseClient = () => {
  if (!supabaseInstance) {
    console.log('📍 Supabase 클라이언트 최초 생성')
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      })
      console.log('✅ Supabase 클라이언트 초기화 성공')
    } catch (error) {
      console.error('❌ Supabase 클라이언트 생성 실패:', error)
      throw error
    }
  }
  return supabaseInstance
}

export const supabase = getSupabaseClient()