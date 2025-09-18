import { createBrowserClient } from '@supabase/ssr'
import { createMockSupabaseClient } from '@/lib/mockAuth'

export function createClient() {
  // Mock 모드 체크
  const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'

  if (useMockAuth) {
    // Mock 클라이언트 반환
    return createMockSupabaseClient()
  }

  // 실제 Supabase 클라이언트 반환
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}