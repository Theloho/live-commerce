'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '@/lib/supabase'

const AdminAuthContext = createContext({})

export function AdminAuthProvider({ children }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [adminUser, setAdminUser] = useState(null)

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

  const checkIsAdmin = async (user) => {
    try {
      // profiles 테이블에서 is_admin 확인
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin, email, name')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('❌ 프로필 조회 실패:', error)
        setIsAdminAuthenticated(false)
        setAdminUser(null)
        setLoading(false)
        return
      }

      if (profile?.is_admin === true) {
        console.log('✅ 관리자 인증 성공:', profile.email)
        setIsAdminAuthenticated(true)
        setAdminUser({
          id: user.id,
          email: user.email,
          name: profile.name
        })
      } else {
        console.warn('⚠️ 관리자 권한 없음:', profile?.email)
        setIsAdminAuthenticated(false)
        setAdminUser(null)
        // 관리자 아닌 경우 로그아웃
        await supabase.auth.signOut()
      }

      setLoading(false)
    } catch (error) {
      console.error('❌ 관리자 확인 에러:', error)
      setIsAdminAuthenticated(false)
      setAdminUser(null)
      setLoading(false)
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
        // is_admin 확인
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin, email, name')
          .eq('id', data.user.id)
          .single()

        if (profileError) {
          console.error('❌ 프로필 조회 실패:', profileError)
          await supabase.auth.signOut()
          return { success: false, error: '프로필 조회 실패' }
        }

        if (profile?.is_admin !== true) {
          console.warn('⚠️ 관리자 권한 없음:', profile?.email)
          await supabase.auth.signOut()
          return { success: false, error: '관리자 권한이 없습니다' }
        }

        console.log('✅ 관리자 로그인 성공:', profile.email)
        setIsAdminAuthenticated(true)
        setAdminUser({
          id: data.user.id,
          email: data.user.email,
          name: profile.name
        })
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
    } catch (error) {
      console.error('❌ 로그아웃 에러:', error)
    }
  }

  return (
    <AdminAuthContext.Provider value={{
      isAdminAuthenticated,
      loading,
      adminUser,
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
