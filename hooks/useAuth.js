import { useState, useEffect } from 'react'
import { createMockSupabaseClient, getMockProducts as getMockProductsFromLib } from '@/lib/mockAuth'

// 전역에서 supabase 클라이언트 한 번만 생성
const supabase = createMockSupabaseClient()

// 전역 상태 관리 (useAuth 훅들 간에 공유)
let globalAuthState = {
  user: null,
  loading: true,
  initialized: false
}

// 브라우저에서 즉시 localStorage 확인하여 초기화
if (typeof window !== 'undefined') {
  const savedUser = localStorage.getItem('mock_current_user')
  console.log('전역 상태 초기화 - localStorage 확인:', savedUser)

  if (savedUser && savedUser !== 'null') {
    try {
      const user = JSON.parse(savedUser)
      globalAuthState.user = user
      globalAuthState.loading = false
      globalAuthState.initialized = true
      console.log('전역 상태 초기화 - 사용자 복원 성공:', user)
    } catch (error) {
      console.error('전역 상태 초기화 - 파싱 오류:', error)
      localStorage.removeItem('mock_current_user')
    }
  }
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

    // 이미 초기화되었어도 리스너는 등록해야 함
    if (globalAuthState.initialized) {
      console.log('useAuth - 이미 초기화됨, 현재 상태 사용:', globalAuthState.user)
      setUser(globalAuthState.user)
      setLoading(globalAuthState.loading)
      // 리스너 등록은 계속 진행
    }

    console.log('useAuth 초기화됨')

    // 초기 세션 확인 (이미 초기화된 경우 스킵)
    const getSession = async () => {
      if (globalAuthState.initialized) {
        console.log('getSession 스킵 - 이미 초기화됨')
        return
      }
      try {
        console.log('=== useAuth getSession 시작 ===')

        // localStorage 상태 확인
        const savedUser = localStorage.getItem('mock_current_user')
        console.log('localStorage mock_current_user:', savedUser)

        let currentUser = null

        if (savedUser && savedUser !== 'null') {
          try {
            currentUser = JSON.parse(savedUser)
            console.log('localStorage에서 사용자 복원 성공:', currentUser)
          } catch (parseError) {
            console.error('사용자 정보 파싱 오류:', parseError)
            localStorage.removeItem('mock_current_user')
          }
        } else {
          console.log('localStorage에 저장된 사용자 없음')
        }

        // MockAuth의 getSession도 호출해서 동기화
        const { data: { session } } = await supabase.auth.getSession()
        console.log('MockAuth 세션 확인:', session)

        // localStorage 값이 있으면 우선 사용
        if (!currentUser && session?.user) {
          currentUser = session.user
          console.log('MockAuth에서 사용자 가져옴:', currentUser)
        }

        console.log('최종 currentUser:', currentUser)

        // 전역 상태 업데이트
        globalAuthState.user = currentUser
        globalAuthState.loading = false
        globalAuthState.initialized = true

        console.log('전역 상태 업데이트 완료, globalAuthState:', globalAuthState)

        // 모든 useAuth 인스턴스에 상태 전파
        globalSetters.forEach(setter => setter(currentUser, false))
        console.log('모든 useAuth 인스턴스에 상태 전파 완료')
        console.log('=== useAuth getSession 완료 ===')
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

        console.log('Auth state change - 상태 전파 시작, currentUser:', currentUser)
        console.log('Auth state change - globalSetters 개수:', globalSetters.size)

        // 모든 useAuth 인스턴스에 상태 전파
        globalSetters.forEach((setter, index) => {
          console.log(`Auth state change - setter ${index} 호출`)
          setter(currentUser, false)
        })

        console.log('Auth state change - 상태 전파 완료')
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

// Mock 상품 함수들 re-export
export const getMockProducts = getMockProductsFromLib