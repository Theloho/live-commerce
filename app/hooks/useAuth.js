'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import useAuthStore from '@/app/stores/authStore'
import bcrypt from 'bcryptjs'
import toast from 'react-hot-toast'

export default function useAuth() {
  const [loading, setLoading] = useState(true)
  const { user, setUser, setLoading: setAuthLoading, clearUser } = useAuthStore()

  useEffect(() => {
    // ✅ 초기 세션 확인 (Supabase Auth 우선, sessionStorage 동기화)
    const getSession = async () => {
      try {
        // 1️⃣ Supabase Auth 세션 확인 (최우선)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Supabase Auth 세션 확인 오류:', sessionError)
          // 세션 에러 시 sessionStorage 클리어
          sessionStorage.removeItem('user')
          clearUser()
          setLoading(false)
          setAuthLoading(false)
          return
        }

        if (session?.user) {
          // 2️⃣ Supabase Auth 세션이 있으면 profiles에서 최신 정보 가져오기
          console.log('✅ Supabase Auth 세션 존재:', session.user.id)

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profile && !profileError) {
            // 3️⃣ sessionStorage 동기화
            const userData = {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              nickname: profile.nickname,
              phone: profile.phone || '',
              address: profile.address || '',
              detail_address: profile.detail_address || '',
              postal_code: profile.postal_code || '',
              avatar_url: profile.avatar_url || '',
              provider: profile.provider || 'email',
              kakao_id: profile.kakao_id || ''
            }

            sessionStorage.setItem('user', JSON.stringify(userData))
            setUser(userData)
            console.log('✅ 세션 복원 성공:', userData.email)
          } else {
            console.warn('⚠️ profiles 테이블에서 사용자 정보를 찾을 수 없음')
            sessionStorage.removeItem('user')
            clearUser()
          }
        } else {
          // 4️⃣ Supabase Auth 세션이 없으면 sessionStorage도 클리어
          console.log('❌ Supabase Auth 세션 없음 - sessionStorage 클리어')
          sessionStorage.removeItem('user')
          clearUser()
        }
      } catch (error) {
        console.error('세션 확인 오류:', error)
        sessionStorage.removeItem('user')
        clearUser()
      } finally {
        setLoading(false)
        setAuthLoading(false)
      }
    }

    getSession()

    // ✅ Supabase Auth 상태 변화 실시간 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth 상태 변화:', event, session?.user?.id || 'NO_SESSION')

      if (event === 'SIGNED_OUT') {
        // 로그아웃 시 sessionStorage 클리어
        console.log('🚪 로그아웃 감지 - sessionStorage 클리어')
        sessionStorage.removeItem('user')
        clearUser()
      } else if (event === 'SIGNED_IN' && session) {
        // 로그인 시 profiles에서 정보 가져와 동기화
        console.log('🔐 로그인 감지 - profiles 동기화')

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          const userData = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            nickname: profile.nickname,
            phone: profile.phone || '',
            address: profile.address || '',
            detail_address: profile.detail_address || '',
            postal_code: profile.postal_code || '',
            avatar_url: profile.avatar_url || '',
            provider: profile.provider || 'email',
            kakao_id: profile.kakao_id || ''
          }
          sessionStorage.setItem('user', JSON.stringify(userData))
          setUser(userData)
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // 토큰 갱신 시 (자동 처리)
        console.log('🔄 토큰 갱신 완료')
      }
    })

    // 카카오 로그인 성공 이벤트 리스너
    const handleKakaoLogin = (event) => {
      const userProfile = event.detail
      // ✅ sessionStorage에도 저장 (페이지 새로고침 시 세션 유지)
      sessionStorage.setItem('user', JSON.stringify(userProfile))
      setUser(userProfile)
      toast.success('카카오 로그인되었습니다')
    }

    // 프로필 완성 이벤트 리스너
    const handleProfileCompleted = (event) => {
      const userProfile = event.detail
      // ✅ sessionStorage에도 저장
      sessionStorage.setItem('user', JSON.stringify(userProfile))
      setUser(userProfile)
      console.log('프로필 완성 이벤트 수신:', userProfile)
    }

    // 세션 스토리지 변경 감지
    const handleStorageChange = (event) => {
      if (event.key === 'user') {
        if (event.newValue) {
          const userData = JSON.parse(event.newValue)
          setUser(userData)
        } else {
          clearUser()
        }
      }
    }

    window.addEventListener('kakaoLoginSuccess', handleKakaoLogin)
    window.addEventListener('profileCompleted', handleProfileCompleted)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      // ✅ Supabase Auth 구독 해제
      subscription?.unsubscribe()

      window.removeEventListener('kakaoLoginSuccess', handleKakaoLogin)
      window.removeEventListener('profileCompleted', handleProfileCompleted)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [setUser, setAuthLoading, clearUser])

  const signUp = async ({ email, password, name, phone, nickname }) => {
    try {
      setAuthLoading(true)

      console.log('🔄 통합 회원가입 시작:', { email, password: '***', name, phone, nickname })

      // 1. 기존 사용자 확인
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single()

      if (existingUser) {
        throw new Error('이미 가입된 이메일입니다')
      }

      // 2. Supabase Auth에 사용자 생성 (통합 인증 시스템)
      console.log('🔐 auth.users에 사용자 생성 중...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: name,
            phone: phone,
            nickname: nickname || name
          }
        }
      })

      if (authError) {
        console.error('Auth 사용자 생성 실패:', authError)
        throw new Error(`회원가입 실패: ${authError.message}`)
      }

      console.log('✅ auth.users 생성 성공:', authData.user?.id)

      // 3. profiles 테이블에 추가 정보 저장
      console.log('📝 profiles 테이블에 추가 정보 저장 중...')
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id, // auth.users의 ID 사용
          email: email,
          name: name,
          phone: phone,
          nickname: nickname || name,
          provider: 'email',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        console.error('프로필 생성 오류:', insertError)
        // auth.users에서 생성된 사용자 정리
        await supabase.auth.signOut()
        throw new Error('회원가입에 실패했습니다')
      }

      console.log('✅ 통합 회원가입 성공:', newProfile)

      // 4. 자동 로그인 (세션 기반)
      const userData = {
        id: authData.user.id, // auth.users ID 사용
        email: email,
        name: name,
        nickname: nickname || name,
        phone: phone,
        provider: 'email'
      }

      sessionStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)

      toast.success('회원가입이 완료되었습니다!')
      return { success: true, user: userData }
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

      console.log('🔄 통합 로그인 시작:', { email, password: '***' })

      // 1. Supabase Auth로 로그인 (통합 인증 시스템)
      console.log('🔐 auth.users 로그인 중...')
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      })

      if (authError) {
        console.error('Auth 로그인 실패:', authError)
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다')
      }

      console.log('✅ auth.users 로그인 성공:', authData.user?.id)

      // 2. profiles 테이블에서 추가 정보 조회
      console.log('📝 profiles 정보 조회 중...')
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !userProfile) {
        console.error('프로필 조회 실패:', profileError)
        // profiles 테이블에 정보가 없다면 기본 정보로 생성
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: authData.user.email,
            name: authData.user.user_metadata?.name || '사용자',
            phone: authData.user.user_metadata?.phone || '',
            nickname: authData.user.user_metadata?.nickname || authData.user.user_metadata?.name || '사용자',
            provider: 'email',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        console.log('📝 프로필 자동 생성:', newProfile)
        userProfile = newProfile
      }

      console.log('✅ 통합 로그인 성공:', userProfile)

      // 3. 세션 저장 (auth.users ID 사용)
      const userData = {
        id: authData.user.id, // auth.users ID 사용
        email: authData.user.email,
        name: userProfile.name,
        nickname: userProfile.nickname,
        phone: userProfile.phone,
        provider: 'email'
      }

      sessionStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)

      toast.success('로그인되었습니다!')
      return { success: true, user: userData }
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

      console.log('🔄 통합 로그아웃 시작')

      // 1. Supabase Auth 로그아웃 (통합 인증 시스템)
      console.log('🔐 auth.users 로그아웃 중...')
      const { error: authError } = await supabase.auth.signOut()

      if (authError) {
        console.warn('Auth 로그아웃 경고:', authError)
        // 경고만 하고 계속 진행
      }

      // 2. 세션 스토리지에서 사용자 정보 삭제
      sessionStorage.removeItem('user')
      console.log('✅ sessionStorage 사용자 정보 삭제 완료')

      // 3. 사용자 상태 초기화
      clearUser()
      console.log('✅ 사용자 상태 초기화 완료')

      // 4. 로그아웃 이벤트 발생 (다른 컴포넌트들이 감지할 수 있도록)
      window.dispatchEvent(new CustomEvent('userLoggedOut'))
      console.log('✅ 로그아웃 이벤트 발생 완료')

      toast.success('로그아웃되었습니다')
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

  const signInWithKakao = async () => {
    try {
      setAuthLoading(true)

      console.log('카카오 로그인 시작')

      // 카카오 REST API 키와 리디렉트 URL
      const kakaoClientId = '25369ebb145320aed6a888a721f088a9'
      const redirectUrl = 'https://allok.shop/auth/callback'

      // 직접 카카오 OAuth URL로 리디렉션
      const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoClientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&scope=profile_nickname,profile_image,account_email`

      console.log('카카오 로그인 리디렉션 URL:', redirectUrl)
      console.log('카카오 OAuth URL:', kakaoAuthUrl)

      // 직접 리디렉션
      window.location.href = kakaoAuthUrl

      return { success: true }
    } catch (error) {
      console.error('카카오 로그인 오류:', error)
      toast.error(error.message || '카카오 로그인에 실패했습니다')
      return { success: false, error: error.message }
    } finally {
      setAuthLoading(false)
    }
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signUp,
    signInWithPassword,
    signInWithKakao,
    signOut,
    resetPassword
  }
}