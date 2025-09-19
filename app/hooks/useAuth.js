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

      console.log('Supabase signUpWithPassword 요청:', { phone, password: '***', name, nickname })

      // 휴대폰 번호로 직접 회원가입 (이메일 대신)
      const { data, error } = await supabase.auth.signUp({
        phone: phone.replace(/[^0-9]/g, ''), // 숫자만 추출
        password,
        options: {
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
        console.log('사용자 이메일 확인 상태:', data.user.email_confirmed_at)
        console.log('사용자 상태:', data.user)
      } else {
        console.warn('회원가입 응답에 사용자 정보가 없음')
      }

      return { success: true, user: data.user }
    } catch (error) {
      console.error('회원가입 오류:', error)
      toast.error(error.message || '회원가입에 실패했습니다')
      return { success: false, error: error.message }
    } finally {
      setAuthLoading(false)
    }
  }

  const signInWithPassword = async ({ email, password, phone }) => {
    try {
      setAuthLoading(true)

      // 이메일이 제공되면 이메일로, 휴대폰이 제공되면 휴대폰으로 로그인
      const loginData = phone ?
        { phone: phone.replace(/[^0-9]/g, ''), password } :
        { email, password }

      console.log('Supabase signInWithPassword 요청:', { ...loginData, password: '***' })

      const { data, error } = await supabase.auth.signInWithPassword(loginData)

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