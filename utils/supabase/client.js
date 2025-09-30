import { createBrowserClient } from '@supabase/ssr'

// 싱글톤 패턴: 전역에 한 번만 생성
let supabaseInstance = null

export function createClient() {
  if (!supabaseInstance) {
    // 실제 Supabase 클라이언트 반환 (한 번만 생성)
    supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return supabaseInstance
}