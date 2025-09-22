import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // 실제 Supabase 클라이언트 반환
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}