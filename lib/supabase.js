import { createClient } from '@supabase/supabase-js'
import { createMockSupabaseClient } from './mockAuth.js'

// 환경 변수 안전하게 읽기 - Vercel 환경변수 문제로 임시 하드코딩
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkyuabphpgijmagybjlcw.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRreXVhYnBocGdpam1hZ3lqbGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3NTc0OTgsImV4cCI6MjA1MjMzMzQ5OH0.nRlRa9kWoLh8vnT7jzCbOe6dDBzYnmKJVF6UgNmFoGM'
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