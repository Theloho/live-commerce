'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import useAuthStore from '@/app/stores/authStore'
import toast from 'react-hot-toast'

export default function useAuth() {
  const [loading, setLoading] = useState(true)
  const { user, setUser, setLoading: setAuthLoading, clearUser } = useAuthStore()

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
          clearUser()
        }
      } catch (error) {
        console.error('세션 확인 오류:', error)
        clearUser()
      } finally {
        setLoading(false)
        setAuthLoading(false)
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
  }, [setUser, setAuthLoading, clearUser])

  const signUp = async ({ email, password, name, phone, nickname }) => {
    try {
      setAuthLoading(true)

      console.log('Supabase signUp 요청:', { email, password: '***', name, phone, nickname })

      // 이메일 기반 회원가입 (이메일 확인 비활성화됨)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          data: {
            name,
            phone,
            nickname: nickname || name
          }
        }
      })

      console.log('Supabase signUp 응답:', { data, error })

      if (error) {
        console.error('Supabase signUp 오류:', error)
        throw error
      }

      if (data.user) {
        console.log('회원가입 성공 - 사용자 생성됨:', data.user.id)
        console.log('사용자 세션 상태:', data.session ? '로그인됨' : '로그인 안됨')
      }

      return { success: true, user: data.user, session: data.session }
    } catch (error) {
      console.error('회원가입 오류:', error)
      toast.error(error.message || '회원가입에 실패했습니다')
      return { success: false, error: error.message }
    } finally {
      setAuthLoading(false)
    }
  }

  const signInWithPassword = async ({ email, password }) => {
    try {
      setAuthLoading(true)

      console.log('Supabase signInWithPassword 요청:', { email, password: '***' })

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
      console.error('로그아웃 오류:', error)
      toast.error(error.message || '로그아웃에 실패했습니다')
      return { success: false, error: error.message }
    } finally {
      setAuthLoading(false)
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
    resetPassword
  }
}