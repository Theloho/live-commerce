'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import useAuthStore from '@/app/stores/authStore'
import toast from 'react-hot-toast'

export default function useAuth() {
  const [loading, setLoading] = useState(true)
  const { user, setUser, setLoading: setAuthLoading, clearUser } = useAuthStore()

  // Mock 모드 체크
  const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'

  // Mock 모드일 때는 localStorage에서 직접 사용자 정보 가져오기
  useEffect(() => {
    if (useMockAuth && typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('mock_current_user')
      if (savedUser && savedUser !== 'null') {
        try {
          const userData = JSON.parse(savedUser)
          console.log('useAuth - Mock 모드에서 사용자 복원:', userData)
          setUser(userData)
        } catch (error) {
          console.error('Mock 사용자 정보 파싱 오류:', error)
        }
      }
      setLoading(false)
      setAuthLoading(false)
    }
  }, [useMockAuth, setUser, setAuthLoading])

  const supabase = createClient()

  // TODO: Add automatic token refresh
  // TODO: Implement social login (Google, Kakao, Naver)
  // TODO: Add password reset functionality
  // TODO: Implement role-based access control
  // TODO: Add login attempt tracking and throttling

  useEffect(() => {
    // Mock 모드가 아닐 때만 Supabase 세션 체크
    if (!useMockAuth) {
      // Get initial session
      const getSession = async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          if (error) throw error

          if (session?.user) {
            console.log('useAuth - 세션에서 사용자 복원:', session.user)
            setUser(session.user)
          } else {
            console.log('useAuth - 세션 없음')
          }
        } catch (error) {
          console.error('Error getting session:', error)
        } finally {
          setLoading(false)
          setAuthLoading(false)
        }
      }

      getSession()
    }

    // Listen for auth changes (Mock 모드가 아닐 때만)
    if (!useMockAuth) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event)

          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user)
            toast.success('로그인되었습니다')
          } else if (event === 'SIGNED_OUT') {
            clearUser()
            toast.success('로그아웃되었습니다')
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            setUser(session.user)
          }
        }
      )

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [supabase.auth, setUser, setAuthLoading, clearUser, useMockAuth])

  const signUp = async ({ email, password, name }) => {
    try {
      setAuthLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      })

      if (error) throw error

      if (data?.user && !data.user.email_confirmed_at) {
        toast.success('인증 메일을 확인해주세요')
        return { success: true, needsEmailConfirmation: true }
      }

      return { success: true }
    } catch (error) {
      toast.error(error.message || '회원가입에 실패했습니다')
      return { success: false, error: error.message }
    } finally {
      setAuthLoading(false)
    }
  }

  const signIn = async ({ email, password }) => {
    try {
      setAuthLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      return { success: true, user: data.user }
    } catch (error) {
      toast.error(error.message || '로그인에 실패했습니다')
      return { success: false, error: error.message }
    } finally {
      setAuthLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setAuthLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      return { success: true }
    } catch (error) {
      toast.error(error.message || '로그아웃에 실패했습니다')
      return { success: false, error: error.message }
    } finally {
      setAuthLoading(false)
    }
  }

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      toast.success('비밀번호 재설정 메일을 보냈습니다')
      return { success: true }
    } catch (error) {
      toast.error(error.message || '비밀번호 재설정에 실패했습니다')
      return { success: false, error: error.message }
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      toast.success('비밀번호가 변경되었습니다')
      return { success: true }
    } catch (error) {
      toast.error(error.message || '비밀번호 변경에 실패했습니다')
      return { success: false, error: error.message }
    }
  }

  const updateProfile = async (updates) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: updates
      })

      if (error) throw error

      toast.success('프로필이 업데이트되었습니다')
      return { success: true }
    } catch (error) {
      toast.error(error.message || '프로필 업데이트에 실패했습니다')
      return { success: false, error: error.message }
    }
  }

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    isAuthenticated: !!user
  }
}