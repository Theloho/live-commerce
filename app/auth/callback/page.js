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
        // 🚀 통합 인증 시스템: 새 사용자 생성

        // 1. Supabase Auth에 사용자 생성 (고정 패턴 임시 패스워드)
        const tempPassword = `kakao_temp_${kakaoUserId}`  // ✅ 고정 패턴 (타임스탬프 제거)


        let authData = null
        let authError = null

        // ✅ DB 초기화 후 auth.users는 남아있는 경우 처리
        const signUpResult = await supabase.auth.signUp({
          email: email,
          password: tempPassword,
          options: {
            data: {
              name: profileData.name,
              nickname: profileData.nickname,
              kakao_id: kakaoUserId,
              provider: 'kakao'
            }
          }
        })

        authData = signUpResult.data
        authError = signUpResult.error

        // ✅ "User already registered" 에러 처리 (DB 초기화 후 auth.users는 남아있는 경우)
        if (authError && authError.message?.includes('already registered')) {

          const signInResult = await supabase.auth.signInWithPassword({
            email: email,
            password: tempPassword
          })

          if (signInResult.error) {

            // 패스워드 재설정 시도
            try {
              const resetResult = await fetch('/api/auth/reset-kakao-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  kakao_id: kakaoUserId,
                  new_password: tempPassword
                })
              }).then(res => res.json())

              if (!resetResult.success) {
                throw new Error(resetResult.error || '패스워드 재설정 실패')
              }


              const retrySignIn = await supabase.auth.signInWithPassword({
                email: email,
                password: tempPassword
              })

              if (retrySignIn.error) {
                throw new Error('재로그인 실패: ' + retrySignIn.error.message)
              }

              authData = retrySignIn.data
              authError = null
            } catch (resetError) {
              throw new Error('기존 사용자 인증 실패 - 관리자에게 문의하세요')
            }
          } else {
            authData = signInResult.data
            authError = null
          }
        } else if (authError) {
          throw new Error(`카카오 사용자 생성 실패: ${authError.message}`)
        }


        // 1.5. 세션 확인 및 대기 (localStorage 저장 보장)
        let sessionVerified = false
        for (let i = 0; i < 10; i++) {
          const { data: sessionData } = await supabase.auth.getSession()
          if (sessionData?.session?.user?.id) {
            sessionVerified = true
            break
          }
          await new Promise(resolve => setTimeout(resolve, 100)) // 100ms 대기
        }

        if (!sessionVerified) {
          throw new Error('세션 생성 실패 - 다시 로그인해주세요')
        }

        // 2. profiles 테이블에 추가 정보 저장 (UPSERT - DB 초기화 대비)

        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id, // auth.users의 ID 사용
            kakao_id: kakaoUserId,
            email: email,
            name: profileData.name,
            nickname: profileData.nickname,
            avatar_url: profileData.avatar_url,
            provider: 'kakao',
            // ✅ 연락처 및 주소 필드 초기화 (빈값으로라도 저장하여 NULL 방지)
            phone: '',
            address: '',
            detail_address: '',
            postal_code: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id' // id가 이미 존재하면 업데이트
          })
          .select('*')  // ⭐ 명시적으로 모든 필드 조회
          .single()

        if (profileError) {
          throw new Error('카카오 프로필 생성 실패')
        }

        userProfile = newProfile
      } else {
        // 기존 사용자 업데이트 (통합 시스템)

        // ✅ 1. 기존 사용자 Supabase Auth 로그인
        const tempPassword = `kakao_temp_${kakaoUserId}`


        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: tempPassword
        })

        if (signInError) {

          // ✅ Service Role API로 패스워드 재설정
          try {
            const resetResult = await fetch('/api/auth/reset-kakao-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                kakao_id: kakaoUserId,
                new_password: tempPassword
              })
            }).then(res => res.json())

            if (!resetResult.success) {
              throw new Error(resetResult.error || '패스워드 재설정 실패')
            }


            // 재로그인 시도
            const { data: retrySignIn, error: retryError } = await supabase.auth.signInWithPassword({
              email: email,
              password: tempPassword
            })

            if (retryError) {
              throw new Error('재로그인 실패: ' + retryError.message)
            }

          } catch (resetError) {
            throw new Error('기존 사용자 인증 실패 - 관리자에게 문의하세요')
          }
        }


        // ✅ 1.5. 세션 확인 및 대기 (localStorage 저장 보장)
        let sessionVerified = false
        for (let i = 0; i < 10; i++) {
          const { data: sessionData } = await supabase.auth.getSession()

          if (sessionData?.session?.user?.id) {
            sessionVerified = true
            break
          }
          await new Promise(resolve => setTimeout(resolve, 100)) // 100ms 대기
        }

        if (!sessionVerified) {
          throw new Error('세션 생성 실패 - 다시 로그인해주세요')
        }

        // ✅ 2. profiles 테이블 업데이트 (기존 사용자 로그인 시)
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            avatar_url: userData.kakao_account.profile.profile_image_url,
            updated_at: new Date().toISOString()
          })
          .eq('kakao_id', kakaoUserId)
          .select('*')  // ⭐ 명시적으로 모든 필드 조회 (phone, address 포함)
          .single()

        if (updateError) {
          throw new Error('카카오 프로필 업데이트 실패')
        }

        userProfile = updatedProfile
      }

      return userProfile
    }

    // ⚡ 최종 로그인 처리 (세션 저장 + 리다이렉트) - 통합 시스템
    const finalizeLoginFast = async (userProfile) => {

      // ✅ localStorage + sessionStorage에 사용자 정보 저장 (모든 필드 포함)
      const sessionUser = {
        id: userProfile.id, // auth.users ID (통합 시스템)
        email: userProfile.email,
        name: userProfile.name,
        nickname: userProfile.nickname,
        phone: userProfile.phone || '', // ✅ phone 필드 추가
        address: userProfile.address || '', // ✅ address 필드 추가
        detail_address: userProfile.detail_address || '', // ✅ detail_address 필드 추가
        postal_code: userProfile.postal_code || '', // ✅ postal_code 필드 추가
        avatar_url: userProfile.avatar_url,
        provider: 'kakao',
        kakao_id: userProfile.kakao_id
      }

      // ✅ sessionStorage 먼저 저장 (즉시 완료)
      sessionStorage.setItem('user', JSON.stringify(sessionUser))

      // ⚡ localStorage 쓰기 완료 대기 (모바일 브라우저 디스크 I/O)
      await new Promise(resolve => {
        localStorage.setItem('unified_user_session', JSON.stringify(sessionUser))
        // requestIdleCallback 사용 가능하면 사용, 아니면 150ms 대기
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(resolve)
        } else {
          setTimeout(resolve, 150)
        }
      })

      // 커스텀 로그인 이벤트 발생
      window.dispatchEvent(new CustomEvent('kakaoLoginSuccess', {
        detail: userProfile
      }))

      // 리다이렉트 결정 (빈 문자열도 체크)
      const hasPhone = userProfile.phone && userProfile.phone.trim().length > 0
      const hasAddress = userProfile.address && userProfile.address.trim().length > 0

      if (!hasPhone || !hasAddress) {
        toast.success('카카오 로그인 성공! 추가 정보를 입력해주세요.')
        // ✅ router.replace() 사용 (뒤로가기 시 callback 재실행 방지)
        router.replace('/auth/complete-profile')
      } else {
        toast.success('카카오 로그인 성공!')
        // ✅ router.replace() 사용 (뒤로가기 시 callback 재실행 방지)
        router.replace('/')
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