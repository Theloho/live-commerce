/**
 * Supabase Admin Client (Service Role)
 *
 * 목적: RLS를 우회할 수 있는 관리자 전용 Supabase 클라이언트
 * 사용처: 서버 사이드 API Routes에서만 사용
 *
 * ⚠️ 보안 주의사항:
 * - 이 클라이언트는 절대 클라이언트 사이드에서 import하지 마세요
 * - Service Role Key는 모든 RLS를 우회할 수 있습니다
 * - API Route에서만 사용하고 반드시 인증 검증을 거쳐야 합니다
 *
 * 작성일: 2025-10-03
 */

import { createClient } from '@supabase/supabase-js'

// 개발 모드 확인 (파일 상단에 선언)
const isDevelopment = process.env.NODE_ENV === 'development'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 환경변수 검증 (런타임에만 체크)
if (!supabaseUrl) {
  console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL is not defined')
}

if (!supabaseServiceKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is not defined')
}

/**
 * Service Role 클라이언트
 * - RLS 정책 우회 가능
 * - 모든 데이터 접근 가능
 * - 서버 사이드 전용
 */
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

/**
 * 관리자 권한 확인 (DB profiles.is_admin 플래그 확인)
 *
 * @param {string} adminEmail - 검증할 관리자 이메일
 * @returns {Promise<boolean>} 관리자 여부
 */
export async function verifyAdminAuth(adminEmail) {
  console.log('🔍 verifyAdminAuth 시작:', { adminEmail, hasSupabaseAdmin: !!supabaseAdmin })

  if (!adminEmail) {
    console.warn('⚠️ 관리자 이메일이 제공되지 않음')
    return false
  }

  if (!supabaseAdmin) {
    console.error('❌ supabaseAdmin 클라이언트가 초기화되지 않음')
    console.error('환경변수 확인:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20)
    })
    return false
  }

  try {
    console.log('📊 DB 쿼리 시작: profiles 테이블에서', adminEmail, '조회')

    // DB에서 profiles.is_admin 플래그 직접 확인
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, email')
      .eq('email', adminEmail)
      .single()

    if (error) {
      console.error('❌ 관리자 권한 확인 실패:', error)
      console.error('에러 상세:', JSON.stringify(error, null, 2))
      return false
    }

    console.log('✅ DB 쿼리 성공:', profile)

    const isAdmin = profile?.is_admin === true

    console.log(`🔐 관리자 인증 검증: ${adminEmail} → ${isAdmin ? '✅ 허용' : '❌ 거부'}`)
    console.log('프로필 상세:', JSON.stringify(profile, null, 2))

    return isAdmin
  } catch (error) {
    console.error('❌ 관리자 권한 확인 에러:', error)
    console.error('에러 스택:', error.stack)
    return false
  }
}
