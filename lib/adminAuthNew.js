/**
 * 관리자 인증 시스템 (완전 분리)
 * - profiles와 독립적인 admins 테이블 사용
 * - bcrypt 패스워드 해싱
 * - 세션 토큰 기반 인증
 */

import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 (Service Role - RLS 우회)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * 패스워드 해싱
 * @param {string} password - 원본 패스워드
 * @returns {Promise<string>} 해시된 패스워드
 */
export async function hashPassword(password) {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

/**
 * 패스워드 검증
 * @param {string} password - 입력된 패스워드
 * @param {string} hash - 저장된 해시
 * @returns {Promise<boolean>} 일치 여부
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash)
}

/**
 * 세션 토큰 생성
 * @returns {string} UUID v4 토큰
 */
export function generateToken() {
  return uuidv4()
}

/**
 * 관리자 로그인
 * @param {string} email - 이메일
 * @param {string} password - 패스워드
 * @returns {Promise<{success: boolean, token?: string, admin?: object, error?: string}>}
 */
export async function adminLogin(email, password) {
  try {
    console.log('🔐 관리자 로그인 시도:', email)

    // 1. 이메일로 관리자 조회
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (adminError || !admin) {
      console.error('❌ 관리자 조회 실패:', adminError?.message)
      return {
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다'
      }
    }

    // 2. 패스워드 검증
    const isValidPassword = await verifyPassword(password, admin.password_hash)

    if (!isValidPassword) {
      console.error('❌ 패스워드 불일치')
      return {
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다'
      }
    }

    // 3. 세션 토큰 생성
    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7일 후 만료

    // 4. admin_sessions에 저장
    const { error: sessionError } = await supabaseAdmin
      .from('admin_sessions')
      .insert({
        admin_id: admin.id,
        token: token,
        expires_at: expiresAt.toISOString()
      })

    if (sessionError) {
      console.error('❌ 세션 생성 실패:', sessionError)
      return {
        success: false,
        error: '로그인 처리 중 오류가 발생했습니다'
      }
    }

    // 5. last_login_at 업데이트
    await supabaseAdmin
      .from('admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id)

    console.log('✅ 관리자 로그인 성공:', email)

    // 6. 성공 응답 (password_hash 제외)
    return {
      success: true,
      token: token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        is_master: admin.is_master
      }
    }

  } catch (error) {
    console.error('❌ 로그인 에러:', error)
    return {
      success: false,
      error: '로그인 중 오류가 발생했습니다'
    }
  }
}

/**
 * 토큰으로 관리자 정보 조회
 * @param {string} token - 세션 토큰
 * @returns {Promise<{success: boolean, admin?: object, error?: string}>}
 */
export async function getAdminByToken(token) {
  try {
    if (!token) {
      return { success: false, error: '토큰이 없습니다' }
    }

    // 1. 세션 조회 및 만료 확인
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('admin_sessions')
      .select('*')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      console.error('❌ 세션 조회 실패:', sessionError?.message)
      return { success: false, error: '유효하지 않은 토큰입니다' }
    }

    // 2. 만료 확인
    if (new Date(session.expires_at) < new Date()) {
      console.warn('⚠️ 세션 만료:', token)
      // 만료된 세션 삭제
      await supabaseAdmin
        .from('admin_sessions')
        .delete()
        .eq('token', token)

      return { success: false, error: '세션이 만료되었습니다' }
    }

    // 3. 관리자 정보 조회
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, email, name, is_master, is_active')
      .eq('id', session.admin_id)
      .eq('is_active', true)
      .single()

    if (adminError || !admin) {
      console.error('❌ 관리자 조회 실패:', adminError?.message)
      return { success: false, error: '관리자 정보를 찾을 수 없습니다' }
    }

    return {
      success: true,
      admin: admin
    }

  } catch (error) {
    console.error('❌ 토큰 검증 에러:', error)
    return {
      success: false,
      error: '토큰 검증 중 오류가 발생했습니다'
    }
  }
}

/**
 * 관리자 로그아웃
 * @param {string} token - 세션 토큰
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function adminLogout(token) {
  try {
    if (!token) {
      return { success: false, error: '토큰이 없습니다' }
    }

    // 세션 삭제
    const { error } = await supabaseAdmin
      .from('admin_sessions')
      .delete()
      .eq('token', token)

    if (error) {
      console.error('❌ 로그아웃 실패:', error)
      return { success: false, error: '로그아웃 처리 중 오류가 발생했습니다' }
    }

    console.log('✅ 관리자 로그아웃 성공')
    return { success: true }

  } catch (error) {
    console.error('❌ 로그아웃 에러:', error)
    return {
      success: false,
      error: '로그아웃 중 오류가 발생했습니다'
    }
  }
}

/**
 * 관리자 권한 조회
 * @param {string} adminId - 관리자 ID
 * @returns {Promise<string[]>} 권한 목록
 */
export async function getAdminPermissions(adminId) {
  try {
    // 마스터 관리자 확인
    const { data: admin } = await supabaseAdmin
      .from('admins')
      .select('is_master')
      .eq('id', adminId)
      .single()

    if (admin?.is_master) {
      return ['*'] // 모든 권한
    }

    // 일반 관리자 권한 조회
    const { data: permissions, error } = await supabaseAdmin
      .from('admin_permissions')
      .select('permission')
      .eq('admin_id', adminId)

    if (error) {
      console.error('❌ 권한 조회 실패:', error)
      return []
    }

    return permissions.map(p => p.permission)

  } catch (error) {
    console.error('❌ 권한 조회 에러:', error)
    return []
  }
}

/**
 * 만료된 세션 정리 (크론잡 또는 주기적 실행)
 * @returns {Promise<number>} 삭제된 세션 수
 */
export async function cleanupExpiredSessions() {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select()

    if (error) {
      console.error('❌ 세션 정리 실패:', error)
      return 0
    }

    const count = data?.length || 0
    console.log(`🧹 만료된 세션 ${count}개 정리 완료`)
    return count

  } catch (error) {
    console.error('❌ 세션 정리 에러:', error)
    return 0
  }
}
