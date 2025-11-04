'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import useAuthStore from '@/app/stores/authStore' // ⚡ Zustand store 사용
import toast from 'react-hot-toast'
import { UserProfileManager } from '@/lib/userProfileManager' // ⚡ 프로필 관리 모듈

// 전역 구독 관리 (싱글톤 패턴)
let globalSubscription = null
let subscriberCount = 0

export default function useAuth() {
  // ⚡ authStore에서 state 읽기 (useState 대신)
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  const setUser = useAuthStore((state) => state.setUser)
  const clearUser = useAuthStore((state) => state.clearUser)
  const setLoading = useAuthStore((state) => state.setLoading)

  useEffect(() => {
    // 초기 세션 확인
    const getSession = async () => {
      try {
        // 🚀 1순위: localStorage 확인 (회원가입 직후용 - 299ms 빠름!)
        if (typeof window !== 'undefined') {
          const storedSession = localStorage.getItem('unified_user_session')
          if (storedSession) {
            try {
              const userData = JSON.parse(storedSession)
              // 프로필이 완성된 경우에만 즉시 반환 (DB 조회 스킵)
              if (userData.phone && userData.address && userData.name) {
                console.log('⚡ localStorage에서 세션 복원 (DB 조회 생략)')
                setUser(userData)
                setLoading(false)
                return // DB 조회 스킵! (299ms 절약)
              }
            } catch (e) {
              console.warn('⚠️ localStorage 파싱 실패, DB 조회로 fallback')
            }
          }
        }

        // 2순위: 기존 로직 (DB 조회)
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (session?.user) {
          setUser(session.user)
        } else {
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

    // 전역 구독이 없을 때만 생성 (싱글톤)
    if (!globalSubscription) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          // INITIAL_SESSION은 페이지 로드 시 기존 세션 복원이므로 토스트 표시 안 함
          if (event === 'INITIAL_SESSION') {
            // 조용히 세션만 복원
            if (session?.user) {
              window.dispatchEvent(new CustomEvent('authStateChanged', {
                detail: { user: session.user, event: 'INITIAL_SESSION' }
              }))
            }
          } else if (event === 'SIGNED_IN' && session?.user) {
            // 실제 로그인 시에만 토스트 표시
            window.dispatchEvent(new CustomEvent('authStateChanged', {
              detail: { user: session.user, event: 'SIGNED_IN' }
            }))
            toast.success('로그인되었습니다')
          } else if (event === 'SIGNED_OUT') {
            window.dispatchEvent(new CustomEvent('authStateChanged', {
              detail: { user: null, event: 'SIGNED_OUT' }
            }))
            toast.success('로그아웃되었습니다')
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            window.dispatchEvent(new CustomEvent('authStateChanged', {
              detail: { user: session.user, event: 'TOKEN_REFRESHED' }
            }))
          }
        }
      )
      globalSubscription = subscription
    }

    subscriberCount++

    // 커스텀 이벤트 리스너
    const handleAuthStateChanged = async (event) => {
      const { user: newUser, event: authEvent } = event.detail
      if (authEvent === 'INITIAL_SESSION' || authEvent === 'SIGNED_IN' || authEvent === 'TOKEN_REFRESHED') {
        setUser(newUser)

        // ⚡ sessionStorage 업데이트 (HomeClient 등에서 사용)
        if (newUser && typeof window !== 'undefined') {
          try {
            // ⚡ profiles 테이블에서 최신 정보 조회 (마이페이지에서 수정한 이름 반영)
            let updatedUser = { ...newUser }

            try {
              const dbProfile = await UserProfileManager.loadUserProfile(newUser.id)
              if (dbProfile) {
                // profiles 데이터를 user 객체에 병합
                updatedUser = {
                  ...newUser,
                  name: dbProfile.name || newUser.user_metadata?.name || newUser.name,
                  phone: dbProfile.phone || newUser.user_metadata?.phone || newUser.phone,
                  nickname: dbProfile.nickname || newUser.user_metadata?.nickname || newUser.name,
                  address: dbProfile.address || '',
                  detail_address: dbProfile.detail_address || '',
                  addresses: dbProfile.addresses || [],
                  postal_code: dbProfile.postal_code || ''
                }
              }
            } catch (profileError) {
              // profiles 조회 실패 시 원본 user 사용
              console.warn('프로필 조회 실패, 기본 정보 사용:', profileError)
            }

            sessionStorage.setItem('user', JSON.stringify(updatedUser))
          } catch (error) {
            console.warn('sessionStorage 저장 실패:', error)
          }
        }
      } else if (authEvent === 'SIGNED_OUT') {
        setUser(null)

        // ⚡ sessionStorage 클리어
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem('user')
          } catch (error) {
            console.warn('sessionStorage 삭제 실패:', error)
          }
        }
      }
    }

    window.addEventListener('authStateChanged', handleAuthStateChanged)

    // ⚡ profileUpdated 이벤트 리스너 (마이페이지 프로필 수정 시)
    const handleProfileUpdated = (event) => {
      const { field, value } = event.detail

      // sessionStorage 자동 동기화
      if (typeof window !== 'undefined') {
        try {
          const storedUser = sessionStorage.getItem('user')
          if (storedUser) {
            const user = JSON.parse(storedUser)
            user[field] = value
            sessionStorage.setItem('user', JSON.stringify(user))
          }
        } catch (error) {
          console.warn('profileUpdated sessionStorage 동기화 실패:', error)
        }
      }
    }

    window.addEventListener('profileUpdated', handleProfileUpdated)

    return () => {
      subscriberCount--
      window.removeEventListener('authStateChanged', handleAuthStateChanged)
      window.removeEventListener('profileUpdated', handleProfileUpdated)

      // 모든 구독자가 없어지면 전역 구독 해제
      if (subscriberCount === 0 && globalSubscription) {
        globalSubscription.unsubscribe()
        globalSubscription = null
      }
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

      // ⚡ 세션이 없어도 에러 없이 처리
      const { error } = await supabase.auth.signOut()

      // 로그아웃 관련 에러는 모두 무시 (이미 로그아웃된 상태일 수 있음)
      // - AuthSessionMissingError: 세션이 없음
      // - 403 Forbidden: 토큰이 유효하지 않거나 없음
      if (error) {
        // 403이나 세션 관련 에러가 아닌 경우만 경고 출력
        if (error.status !== 403 && error.message !== 'Auth session missing!') {
          console.warn('로그아웃 경고:', error.message, error.status)
        }
      }

      // ⚡ 에러 여부와 관계없이 항상 클라이언트 상태 클리어
      clearUser() // authStore 클리어 (user + profile)

      return { success: true }
    } catch (error) {
      // 예상치 못한 에러도 클라이언트 상태는 클리어
      console.error('로그아웃 오류:', error)
      clearUser()

      // 사용자에게는 성공으로 표시 (클라이언트 상태는 정리됨)
      return { success: true }
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