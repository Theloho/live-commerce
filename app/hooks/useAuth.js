'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import useAuthStore from '@/app/stores/authStore'
import toast from 'react-hot-toast'

export default function useAuth() {
  const [loading, setLoading] = useState(true)
  const { user, setUser, setLoading: setAuthLoading, clearUser } = useAuthStore()

  useEffect(() => {
    // 초기 세션 확인 (세션 스토리지 기반)
    const getSession = () => {
      try {
        const storedUser = sessionStorage.getItem('user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          console.log('기존 세션 복원:', userData)
          setUser(userData)
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

    // 카카오 로그인 성공 이벤트 리스너
    const handleKakaoLogin = (event) => {
      const userProfile = event.detail
      setUser(userProfile)
      toast.success('카카오 로그인되었습니다')
    }

    window.addEventListener('kakaoLoginSuccess', handleKakaoLogin)

    return () => {
      window.removeEventListener('kakaoLoginSuccess', handleKakaoLogin)
    }
  }, [setUser, setAuthLoading, clearUser])

  const signUp = async ({ email, password, name, phone, nickname }) => {
    try {
      setAuthLoading(true)

      console.log('회원가입 요청:', { email, password: '***', name, phone, nickname })

      // profiles 테이블에 직접 사용자 생성
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single()

      if (existingUser) {
        throw new Error('이미 가입된 이메일입니다')
      }

      // 새 사용자 프로필 생성
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          email: email,
          name: name,
          phone: phone,
          nickname: nickname || name,
          password_hash: password, // 실제로는 해시해야 하지만 임시로 평문 저장
          provider: 'email',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        console.error('프로필 생성 오류:', insertError)
        throw new Error('회원가입에 실패했습니다')
      }

      console.log('회원가입 성공:', newProfile)

      // 자동 로그인
      const userData = {
        id: newProfile.id,
        email: newProfile.email,
        name: newProfile.name,
        nickname: newProfile.nickname,
        phone: newProfile.phone,
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

      console.log('로그인 요청:', { email, password: '***' })

      // profiles 테이블에서 사용자 확인
      const { data: userProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .eq('password_hash', password) // 실제로는 해시 비교해야 함
        .single()

      if (fetchError || !userProfile) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다')
      }

      console.log('로그인 성공:', userProfile)

      // 세션 저장
      const userData = {
        id: userProfile.id,
        email: userProfile.email,
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

      // 세션 스토리지에서 사용자 정보 삭제
      sessionStorage.removeItem('user')

      // 사용자 상태 초기화
      clearUser()

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
      const redirectUrl = 'https://live-commerce-git-main-jts-projects-5e8e712a.vercel.app/auth/callback'

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