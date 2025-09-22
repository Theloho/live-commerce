/**
 * 관리자 권한 확인 유틸리티
 */

/**
 * 마스터 관리자인지 확인
 * @param {Object} user - 사용자 객체
 * @returns {boolean} 마스터 관리자 여부
 */
export function isMasterAdmin(user) {
  if (!user) return false

  const masterAdminEmails = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAILS || ''
  const allowedEmails = masterAdminEmails.split(',').map(email => email.trim().toLowerCase())

  // 사용자 이메일 확인 (여러 경로에서 이메일 가져오기)
  const userEmail = (
    user.email ||
    user.user_metadata?.email ||
    user.user_metadata?.name
  )?.toLowerCase()

  return userEmail && allowedEmails.includes(userEmail)
}

/**
 * 환경변수 기반 관리자 로그인 체크
 * @param {string} email - 이메일
 * @param {string} password - 비밀번호
 * @returns {boolean} 환경변수 관리자 계정 여부
 */
export function checkMasterAdminCredentials(email, password) {
  const masterEmails = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAILS || ''
  const masterPassword = process.env.NEXT_PUBLIC_MASTER_ADMIN_PASSWORD || ''

  const allowedEmails = masterEmails.split(',').map(e => e.trim().toLowerCase())

  return allowedEmails.includes(email.toLowerCase()) && password === masterPassword
}

/**
 * 관리자 권한이 있는지 확인 (현재는 마스터 관리자와 동일)
 * @param {Object} user - 사용자 객체
 * @returns {boolean} 관리자 권한 여부
 */
export function isAdmin(user) {
  return isMasterAdmin(user)
}

/**
 * 관리자 페이지 접근 권한 체크
 * @param {Object} user - 사용자 객체
 * @param {boolean} isAuthenticated - 인증 상태
 * @returns {Object} { hasAccess: boolean, message: string }
 */
export function checkAdminAccess(user, isAuthenticated) {
  // 환경변수 기반 관리자 세션 체크
  if (typeof window !== 'undefined') {
    const adminSession = localStorage.getItem('admin_session')
    if (adminSession === 'master_admin') {
      return {
        hasAccess: true,
        message: '마스터 관리자 권한이 확인되었습니다.'
      }
    }
  }

  if (!isAuthenticated) {
    return {
      hasAccess: false,
      message: '로그인이 필요합니다.'
    }
  }

  if (!isAdmin(user)) {
    return {
      hasAccess: false,
      message: '관리자 권한이 없습니다. 마스터 관리자에게 문의하세요.'
    }
  }

  return {
    hasAccess: true,
    message: '관리자 권한이 확인되었습니다.'
  }
}