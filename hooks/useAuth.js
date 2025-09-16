import { useState, useEffect } from 'react'
import { createMockSupabaseClient } from '@/lib/mockAuth'

// 전역에서 supabase 클라이언트 한 번만 생성
const supabase = createMockSupabaseClient()

// 전역 상태 관리 (useAuth 훅들 간에 공유)
let globalAuthState = {
  user: null,
  loading: true,
  initialized: false
}

let globalSetters = new Set()

export function useAuth() {
  const [user, setUser] = useState(globalAuthState.user)
  const [loading, setLoading] = useState(globalAuthState.loading)

  useEffect(() => {
    // 이 useAuth 인스턴스의 setter를 전역 set에 추가
    const updateState = (newUser, newLoading) => {
      setUser(newUser)
      setLoading(newLoading)
    }
    globalSetters.add(updateState)

    // 이미 초기화되었으면 현재 상태 사용
    if (globalAuthState.initialized) {
      console.log('useAuth - 이미 초기화됨, 현재 상태 사용:', globalAuthState.user)
      setUser(globalAuthState.user)
      setLoading(globalAuthState.loading)
      return () => globalSetters.delete(updateState)
    }

    console.log('useAuth 초기화됨')

    // 초기 세션 확인
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('초기 세션 확인:', session)
        const currentUser = session?.user ?? null

        // 전역 상태 업데이트
        globalAuthState.user = currentUser
        globalAuthState.loading = false
        globalAuthState.initialized = true

        // 모든 useAuth 인스턴스에 상태 전파
        globalSetters.forEach(setter => setter(currentUser, false))
      } catch (error) {
        console.error('Session check error:', error)
        globalAuthState.loading = false
        globalAuthState.initialized = true
        globalSetters.forEach(setter => setter(null, false))
      }
    }

    getSession()

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session)
        const currentUser = session?.user ?? null

        // 전역 상태 업데이트
        globalAuthState.user = currentUser
        globalAuthState.loading = false

        // 모든 useAuth 인스턴스에 상태 전파
        globalSetters.forEach(setter => setter(currentUser, false))
      }
    )

    return () => {
      globalSetters.delete(updateState)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      console.log('로그아웃 시도')
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const signUp = async (credentials) => {
    try {
      console.log('회원가입 시도:', credentials)
      const result = await supabase.auth.signUp(credentials)
      console.log('회원가입 결과:', result)
      return result
    } catch (error) {
      console.error('Sign up error:', error)
      return { data: null, error }
    }
  }

  const signInWithPassword = async (credentials) => {
    try {
      console.log('로그인 시도:', credentials)
      const result = await supabase.auth.signInWithPassword(credentials)
      console.log('로그인 결과:', result)
      return result
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error }
    }
  }

  return {
    user,
    loading,
    signOut,
    signUp,
    signInWithPassword,
    isAuthenticated: !!user
  }
}