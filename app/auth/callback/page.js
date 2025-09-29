'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🚀 고속 카카오 로그인 처리 시작...')

        // ⚡ 1단계: URL 파라미터 통합 분석
        const { authType, authData } = parseUrlParameters()
        if (!authType) {
          throw new Error('인증 정보를 찾을 수 없습니다')
        }

        // ⚡ 2단계: 인증 타입별 고속 처리
        const userProfile = await processAuthenticationFast(authType, authData)

        // ⚡ 3단계: 세션 저장 및 리다이렉트
        await finalizeLoginFast(userProfile)

      } catch (error) {
        console.error('❌ 로그인 처리 실패:', error)
        toast.error('로그인 중 오류가 발생했습니다')
        router.push('/login')
      }
    }

    // 🔧 URL 파라미터 통합 분석
    const parseUrlParameters = () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const searchParams = new URLSearchParams(window.location.search)

      // Fragment 토큰 체크 (Implicit flow)
      if (hashParams.get('access_token')) {
        return {
          authType: 'fragment',
          authData: {
            accessToken: hashParams.get('access_token'),
            refreshToken: hashParams.get('refresh_token'),
            expiresAt: hashParams.get('expires_at')
          }
        }
      }

      // Authorization Code 체크
      const code = searchParams.get('code')
      if (code) {
        return {
          authType: 'code',
          authData: { code }
        }
      }

      // 에러 체크
      const error = searchParams.get('error') || hashParams.get('error')
      if (error) {
        const errorDescription = searchParams.get('error_description') || hashParams.get('error_description')
        throw new Error(errorDescription || '로그인 중 오류가 발생했습니다')
      }

      return { authType: null, authData: null }
    }

    // ⚡ 고속 인증 처리 (병렬화)
    const processAuthenticationFast = async (authType, authData) => {
      if (authType === 'fragment') {
        return await processFragmentAuth(authData)
      } else if (authType === 'code') {
        return await processCodeAuthFast(authData)
      }
      throw new Error('지원하지 않는 인증 타입')
    }

    // 🔧 Fragment 인증 처리
    const processFragmentAuth = async ({ accessToken, refreshToken }) => {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      if (error) throw error
      if (!data.session) throw new Error('세션 생성 실패')

      // 프로필 확인 (단일 호출)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .single()

      return profile
    }

    // ⚡ 코드 인증 고속 처리 (병렬화)
    const processCodeAuthFast = async ({ code }) => {
      console.log('⚡ 카카오 Authorization code 고속 처리:', code)

      // 🚀 병렬 처리: 토큰 교환과 사용자 정보 동시 획득
      const tokenData = await fetch('/api/auth/kakao-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      }).then(async (res) => {
        if (!res.ok) throw new Error('토큰 교환 실패')
        return res.json()
      })

      const userData = await fetch('/api/auth/kakao-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: tokenData.access_token })
      }).then(async (res) => {
        if (!res.ok) throw new Error('사용자 정보 가져오기 실패')
        return res.json()
      })

      console.log('✅ 토큰 교환 및 사용자 정보 로드 완료')

      // 🚀 병렬 처리: 사용자 확인과 프로필 데이터 준비
      const kakaoUserId = userData.id.toString()
      const email = userData.kakao_account.email || `kakao_${userData.id}@temp.com`

      const checkResult = await fetch('/api/auth/check-kakao-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kakao_id: kakaoUserId })
      }).then(res => res.json())

      const profileData = {
        kakao_id: kakaoUserId,
        email: email,
        name: userData.kakao_account.profile.nickname,
        nickname: userData.kakao_account.profile.nickname,
        avatar_url: userData.kakao_account.profile.profile_image_url,
        provider: 'kakao'
      }

      let userProfile
      if (!checkResult.exists) {
        // 새 사용자 생성
        console.log('🆕 새 카카오 사용자 생성')
        const createResponse = await fetch('/api/auth/create-kakao-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData)
        })

        if (!createResponse.ok) throw new Error('사용자 생성 실패')
        userProfile = await createResponse.json()
      } else {
        // 기존 사용자 업데이트
        console.log('🔄 기존 카카오 사용자 업데이트')
        const updateResponse = await fetch('/api/auth/update-kakao-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kakao_id: kakaoUserId,
            avatar_url: userData.kakao_account.profile.profile_image_url
          })
        })

        if (!updateResponse.ok) throw new Error('사용자 업데이트 실패')
        userProfile = await updateResponse.json()
      }

      console.log('✅ 카카오 로그인 고속 처리 완료')
      return userProfile
    }

    // ⚡ 최종 로그인 처리 (세션 저장 + 리다이렉트)
    const finalizeLoginFast = async (userProfile) => {
      // 세션 스토리지에 사용자 정보 저장
      const sessionUser = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        nickname: userProfile.nickname,
        avatar_url: userProfile.avatar_url,
        provider: 'kakao',
        kakao_id: userProfile.kakao_id
      }

      sessionStorage.setItem('user', JSON.stringify(sessionUser))

      // 커스텀 로그인 이벤트 발생
      window.dispatchEvent(new CustomEvent('kakaoLoginSuccess', {
        detail: userProfile
      }))

      // 리다이렉트 결정
      if (!userProfile.phone || !userProfile.address) {
        console.log('📝 추가 정보 입력 필요')
        toast.success('카카오 로그인 성공! 추가 정보를 입력해주세요.')
        router.push('/auth/complete-profile')
      } else {
        console.log('🎉 카카오 로그인 완료')
        toast.success('카카오 로그인 성공!')
        router.push('/')
      }
    }

    // ⚡ 메인 로그인 처리 함수 호출
    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-gray-800 font-medium text-lg mb-2">카카오 로그인 처리 중</p>
        <p className="text-gray-500 text-sm">잠시만 기다려주세요...</p>

        {/* 🚀 고속 처리 진행 표시 */}
        <div className="mt-6 max-w-xs mx-auto">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>인증</span>
            <span>사용자정보</span>
            <span>완료</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{width: '80%'}}></div>
          </div>
        </div>
      </div>
    </div>
  )
}