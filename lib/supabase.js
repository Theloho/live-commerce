import { createClient } from '@supabase/supabase-js'

// 환경 변수 강제 오버라이드 - Vercel 환경변수 문제 해결
const supabaseUrl = 'https://sjmbqfcbnsnqlsmblmfu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqbWJxZmNibnNucWxzbWJsbWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTQ2NzgsImV4cCI6MjA3MzU5MDY3OH0.nsKn_m6dnHabkbRMk7xWkdxbzB0_0B1fO_0AhWli0GM'

console.log('📍 Supabase 설정:', { url: supabaseUrl.substring(0, 30) + '...' })

// Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('✅ Supabase 클라이언트 초기화 성공')

export { supabase }