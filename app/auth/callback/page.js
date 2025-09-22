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
        console.log('OAuth 콜백 처리 시작')

        // URL에서 code 파라미터 추출
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const searchParams = new URLSearchParams(window.location.search)

        // Fragment에서 토큰 처리 (Implicit flow)
        if (hashParams.get('access_token')) {
          console.log('Access token found in URL fragment')

          // URL fragment에서 토큰 정보 추출
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          const expiresAt = hashParams.get('expires_at')

          console.log('토큰 정보:', { accessToken: accessToken?.substring(0, 20) + '...', refreshToken, expiresAt })

          // 토큰으로 세션 설정
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            console.error('세션 설정 오류:', error)
            toast.error('로그인 중 오류가 발생했습니다')
            router.push('/login')
            return
          }

          if (data.session) {
            console.log('OAuth 로그인 성공 (Fragment):', data.session.user)

            // 프로필 정보 확인
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single()

            if (!profile || !profile.phone || !profile.address) {
              console.log('추가 정보 입력 필요')
              router.push('/auth/complete-profile')
            } else {
              toast.success('카카오 로그인 성공!')
              router.push('/')
            }
            return
          }
        }

        // Query string에서 code 처리 (카카오 Authorization Code flow)
        const code = searchParams.get('code')
        if (code) {
          console.log('카카오 Authorization code found:', code)

          try {
            // 카카오 토큰 교환
            const tokenResponse = await fetch('/api/auth/kakao-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code })
            })

            if (!tokenResponse.ok) {
              throw new Error('토큰 교환 실패')
            }

            const tokenData = await tokenResponse.json()
            console.log('카카오 토큰 교환 성공:', tokenData)

            // 카카오 사용자 정보 가져오기
            const userResponse = await fetch('/api/auth/kakao-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ access_token: tokenData.access_token })
            })

            if (!userResponse.ok) {
              throw new Error('사용자 정보 가져오기 실패')
            }

            const userData = await userResponse.json()
            console.log('카카오 사용자 정보:', userData)

            // 직접 profiles 테이블에 사용자 정보 저장/업데이트
            const email = userData.kakao_account.email || `kakao_${userData.id}@temp.com`
            const kakaoUserId = userData.id.toString()

            // REST API로 기존 사용자 확인
            console.log('REST API로 기존 사용자 확인 중...')
            const checkResponse = await fetch(`${window.location.origin}/api/auth/check-kakao-user`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ kakao_id: kakaoUserId })
            })

            let userProfile
            if (!checkResponse.ok) {
              throw new Error('사용자 확인 중 오류가 발생했습니다')
            }

            const checkResult = await checkResponse.json()

            if (!checkResult.exists) {
              // 새 사용자 생성
              console.log('새 카카오 사용자 생성 중...')
              const createResponse = await fetch(`${window.location.origin}/api/auth/create-kakao-user`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  kakao_id: kakaoUserId,
                  email: email,
                  name: userData.kakao_account.profile.nickname, // 초기에는 카카오 닉네임을 이름으로 사용
                  nickname: userData.kakao_account.profile.nickname, // 카카오 닉네임을 별도 필드로 저장
                  avatar_url: userData.kakao_account.profile.profile_image_url,
                  provider: 'kakao'
                })
              })

              if (!createResponse.ok) {
                throw new Error('사용자 프로필 생성에 실패했습니다')
              }

              userProfile = await createResponse.json()
              console.log('새 카카오 사용자 생성:', userProfile)
            } else {
              // 기존 사용자 정보 업데이트
              console.log('기존 카카오 사용자 정보 업데이트 중...')
              const updateResponse = await fetch(`${window.location.origin}/api/auth/update-kakao-user`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  kakao_id: kakaoUserId,
                  avatar_url: userData.kakao_account.profile.profile_image_url
                  // name과 nickname은 사용자가 수정했을 수 있으므로 업데이트하지 않음
                })
              })

              if (!updateResponse.ok) {
                throw new Error('사용자 프로필 업데이트에 실패했습니다')
              }

              userProfile = await updateResponse.json()
              console.log('기존 카카오 사용자 로그인:', userProfile)
            }

            // 세션 스토리지에 사용자 정보 저장 (Supabase auth 대신)
            sessionStorage.setItem('user', JSON.stringify({
              id: userProfile.id,
              email: userProfile.email,
              name: userProfile.name,
              nickname: userProfile.nickname,
              avatar_url: userProfile.avatar_url,
              provider: 'kakao',
              kakao_id: userProfile.kakao_id
            }))

            // 커스텀 로그인 이벤트 발생
            window.dispatchEvent(new CustomEvent('kakaoLoginSuccess', {
              detail: userProfile
            }))

            // 추가 정보가 필요한지 확인
            if (!userProfile.phone || !userProfile.address) {
              console.log('추가 정보 입력 필요')
              toast.success('카카오 로그인 성공! 추가 정보를 입력해주세요.')
              router.push('/auth/complete-profile')
            } else {
              console.log('카카오 로그인 성공')
              toast.success('카카오 로그인 성공!')
              router.push('/')
            }
            return

          } catch (error) {
            console.error('카카오 로그인 처리 오류:', error)
            toast.error('카카오 로그인 중 오류가 발생했습니다')
            router.push('/login')
            return
          }
        }

        // 에러 처리
        const error = searchParams.get('error') || hashParams.get('error')
        if (error) {
          const errorDescription = searchParams.get('error_description') || hashParams.get('error_description')
          console.error('OAuth 에러:', error, errorDescription)
          toast.error(errorDescription || '로그인 중 오류가 발생했습니다')
          router.push('/login')
          return
        }

        // 세션 재확인
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (data.session) {
          console.log('기존 세션 확인:', data.session.user)

          // 프로필 정보 확인
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single()

          // 필수 정보가 없으면 추가 정보 입력 페이지로
          if (!profile || !profile.phone || !profile.address) {
            console.log('추가 정보 입력 필요')
            router.push('/auth/complete-profile')
          } else {
            toast.success('카카오 로그인 성공!')
            router.push('/')
          }
        } else {
          console.log('세션이 없음 - 로그인 페이지로 이동')
          router.push('/login')
        }
      } catch (error) {
        console.error('OAuth 콜백 처리 실패:', error)
        toast.error('로그인 중 오류가 발생했습니다')
        router.push('/login')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-gray-600">로그인 처리 중...</p>
      </div>
    </div>
  )
}