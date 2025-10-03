'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '@/lib/supabase'

const AdminAuthContext = createContext({})

export function AdminAuthProvider({ children }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [adminUser, setAdminUser] = useState(null)
  const [isMaster, setIsMaster] = useState(false)
  const [permissions, setPermissions] = useState([])

  useEffect(() => {
    console.log('🔍 AdminAuth 초기화 시작 (Supabase Auth)')

    // 초기 세션 확인
    checkAdminSession()

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth 상태 변경:', event, session?.user?.email)

      if (session?.user) {
        await checkIsAdmin(session.user)
      } else {
        setIsAdminAuthenticated(false)
        setAdminUser(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkAdminSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('❌ 세션 확인 실패:', error)
        setIsAdminAuthenticated(false)
        setAdminUser(null)
        setLoading(false)
        return
      }

      if (session?.user) {
        console.log('✅ 기존 세션 발견:', session.user.email)
        await checkIsAdmin(session.user)
      } else {
        console.log('❌ 세션 없음')
        setIsAdminAuthenticated(false)
        setAdminUser(null)
        setLoading(false)
      }
    } catch (error) {
      console.error('❌ 세션 체크 에러:', error)
      setIsAdminAuthenticated(false)
      setAdminUser(null)
      setLoading(false)
    }
  }

  const checkIsAdmin = async (user, retryCount = 0) => {
    try {
      console.log('🔍 checkIsAdmin 시작:', user.email, 'user.id:', user.id, 'retry:', retryCount)

      // Service Role API로 프로필 조회 (RLS 우회)
      console.log('🔍 API로 profiles 조회 시작...')
      const response = await fetch('/api/admin/check-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'API 호출 실패')
      }

      const { profile } = await response.json()
      console.log('✅ profiles 쿼리 완료:', profile)


      if (profile?.is_admin === true) {
        console.log('✅ 관리자 인증 성공:', profile.email, profile.is_master ? '(마스터)' : '')
        setIsAdminAuthenticated(true)
        setIsMaster(profile.is_master === true)
        setAdminUser({
          id: user.id,
          email: user.email,
          name: profile.name
        })

        // 권한 로드 (마스터가 아닌 경우만)
        if (profile.is_master !== true) {
          await loadPermissions(user.id)
        } else {
          // 마스터는 모든 권한
          setPermissions(['*'])
        }
      } else {
        console.warn('⚠️ 관리자 권한 없음:', profile?.email)
        setIsAdminAuthenticated(false)
        setAdminUser(null)
        setIsMaster(false)
        setPermissions([])
        // 관리자 아닌 경우 로그아웃
        await supabase.auth.signOut()
      }

      setLoading(false)
    } catch (error) {
      console.error('❌ 관리자 확인 에러:', error)
      setIsAdminAuthenticated(false)
      setAdminUser(null)
      setIsMaster(false)
      setPermissions([])
      setLoading(false)
    }
  }

  const loadPermissions = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('permission')
        .eq('admin_id', userId)

      if (error) {
        console.error('❌ 권한 조회 실패:', error)
        setPermissions([])
        return
      }

      const perms = data.map(p => p.permission)
      console.log('🔐 관리자 권한 로드:', perms)
      setPermissions(perms)
    } catch (error) {
      console.error('❌ 권한 로드 에러:', error)
      setPermissions([])
    }
  }

  const adminLogin = async (email, password) => {
    try {
      console.log('🔐 관리자 로그인 시도:', email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('❌ 로그인 실패:', error.message)
        return { success: false, error: error.message }
      }

      if (data.user) {
        // Service Role API로 프로필 조회 (RLS 우회)
        const response = await fetch('/api/admin/check-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id })
        })

        if (!response.ok) {
          console.error('❌ 프로필 조회 실패')
          await supabase.auth.signOut()
          return { success: false, error: '프로필 조회 실패' }
        }

        const { profile } = await response.json()

        if (profile?.is_admin !== true) {
          console.warn('⚠️ 관리자 권한 없음:', profile?.email)
          await supabase.auth.signOut()
          return { success: false, error: '관리자 권한이 없습니다' }
        }

        console.log('✅ 관리자 로그인 성공:', profile.email, profile.is_master ? '(마스터)' : '')
        setIsAdminAuthenticated(true)
        setIsMaster(profile.is_master === true)
        setAdminUser({
          id: data.user.id,
          email: data.user.email,
          name: profile.name
        })

        // 권한 로드
        if (profile.is_master !== true) {
          await loadPermissions(data.user.id)
        } else {
          setPermissions(['*'])
        }

        return { success: true }
      }

      return { success: false, error: '로그인 실패' }
    } catch (error) {
      console.error('❌ 로그인 에러:', error)
      return { success: false, error: error.message }
    }
  }

  const adminLogout = async () => {
    try {
      console.log('👋 관리자 로그아웃')
      await supabase.auth.signOut()
      setIsAdminAuthenticated(false)
      setAdminUser(null)
      setIsMaster(false)
      setPermissions([])
    } catch (error) {
      console.error('❌ 로그아웃 에러:', error)
    }
  }

  // 권한 체크 함수 (와일드카드 지원)
  const hasPermission = (requiredPermission) => {
    // 마스터는 모든 권한
    if (isMaster) return true

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
