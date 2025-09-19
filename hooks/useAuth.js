'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 초기 세션 확인
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (session?.user) {
          console.log('기존 세션 복원:', session.user)
          setUser(session.user)
        } else {
          console.log('세션 없음')
          setUser(null)
        }
      } catch (error) {
        console.error('세션 확인 오류:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          toast.success('로그인되었습니다')
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          toast.success('로그아웃되었습니다')
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async ({ email, password, name, phone, nickname }) => {
    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            nickname: nickname || name
          }
        }
      })

      if (error) throw error

      return { success: true, user: data.user }
    } catch (error) {
      console.error('회원가입 오류:', error)
      toast.error(error.message || '회원가입에 실패했습니다')
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const signInWithPassword = async ({ email, password }) => {
    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      return { success: true, user: data.user }
    } catch (error) {
      console.error('로그인 오류:', error)
      toast.error(error.message || '로그인에 실패했습니다')
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('로그아웃 오류:', error)
      toast.error(error.message || '로그아웃에 실패했습니다')
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error

      toast.success('비밀번호 재설정 이메일을 보냈습니다')
      return { success: true }
    } catch (error) {
      toast.error(error.message || '비밀번호 재설정에 실패했습니다')
      return { success: false, error: error.message }
    }
  }

  return {
    user,
    loading,
    signUp,
    signInWithPassword,
    signOut,
    resetPassword,
    isAuthenticated: !!user
  }
}