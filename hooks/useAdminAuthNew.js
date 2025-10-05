'use client'

import { useState, useEffect, createContext, useContext } from 'react'

const AdminAuthContext = createContext({})

export function AdminAuthProvider({ children }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [adminUser, setAdminUser] = useState(null)
  const [isMaster, setIsMaster] = useState(false)
  const [permissions, setPermissions] = useState([])

  // localStorage 키 (Supabase와 완전 분리)
  const STORAGE_KEY = 'admin_session'

  useEffect(() => {
    console.log('🔍 AdminAuthNew 초기화 시작')
    checkAdminSession()
  }, [])

  const checkAdminSession = async () => {
    try {
      // localStorage에서 토큰 확인
      const token = localStorage.getItem(STORAGE_KEY)

      if (!token) {
        console.log('❌ 저장된 토큰 없음')
        setIsAdminAuthenticated(false)
        setAdminUser(null)
        setLoading(false)
        return
      }

      // 토큰 검증 API 호출
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.warn('⚠️ 토큰 검증 실패:', data.error)
        // 유효하지 않은 토큰 제거
        localStorage.removeItem(STORAGE_KEY)
        setIsAdminAuthenticated(false)
        setAdminUser(null)
        setLoading(false)
        return
      }

      // 인증 성공
      console.log('✅ 관리자 세션 확인 완료:', data.admin.email)
      setIsAdminAuthenticated(true)
      setIsMaster(data.admin.is_master === true)
      setAdminUser(data.admin)
      setPermissions(data.admin.permissions || [])
      setLoading(false)

    } catch (error) {
      console.error('❌ 세션 체크 에러:', error)
      setIsAdminAuthenticated(false)
      setAdminUser(null)
      setLoading(false)
    }
  }

  const adminLogin = async (email, password) => {
    try {
      console.log('🔐 관리자 로그인 시도:', email)

      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error('❌ 로그인 실패:', data.error)
        return { success: false, error: data.error }
      }

      // 토큰 저장 (localStorage - Supabase와 다른 키 사용)
      localStorage.setItem(STORAGE_KEY, data.token)

      console.log('✅ 관리자 로그인 성공:', data.admin.email)
      setIsAdminAuthenticated(true)
      setIsMaster(data.admin.is_master === true)
      setAdminUser(data.admin)

      // 권한 조회 (토큰으로)
      const verifyResponse = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.token })
      })

      const verifyData = await verifyResponse.json()
      if (verifyData.success) {
        setPermissions(verifyData.admin.permissions || [])
      }

      return { success: true }

    } catch (error) {
      console.error('❌ 로그인 에러:', error)
      return { success: false, error: '로그인 중 오류가 발생했습니다' }
    }
  }

  const adminLogout = async () => {
    try {
      console.log('👋 관리자 로그아웃')

      const token = localStorage.getItem(STORAGE_KEY)

      if (token) {
        // 서버 세션 삭제
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })
      }

      // localStorage 토큰 제거
      localStorage.removeItem(STORAGE_KEY)

      setIsAdminAuthenticated(false)
      setAdminUser(null)
      setIsMaster(false)
      setPermissions([])

    } catch (error) {
      console.error('❌ 로그아웃 에러:', error)
      // 에러가 발생해도 로컬 상태는 초기화
      localStorage.removeItem(STORAGE_KEY)
      setIsAdminAuthenticated(false)
      setAdminUser(null)
      setIsMaster(false)
      setPermissions([])
    }
  }

  // 권한 체크 함수 (와일드카드 지원)
  const hasPermission = (requiredPermission) => {
    // 마스터는 모든 권한
    if (isMaster) return true

    // 모든 권한 보유
    if (permissions.includes('*')) return true

    // 정확한 권한 매칭
    if (permissions.includes(requiredPermission)) return true

    // 와일드카드 체크 (예: 'customers.*' → 'customers.view' 허용)
    const [menu] = requiredPermission.split('.')
    if (permissions.includes(`${menu}.*`)) return true

    return false
  }

  return (
    <AdminAuthContext.Provider value={{
      isAdminAuthenticated,
      loading,
      adminUser,
      isMaster,
      permissions,
      hasPermission,
      adminLogin,
      adminLogout
    }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}
