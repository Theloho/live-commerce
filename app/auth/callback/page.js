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
          // Supabase가 자동으로 처리하므로 세션 확인
          const { data, error } = await supabase.auth.getSession()

          if (data.session) {
            console.log('OAuth 로그인 성공 (Implicit):', data.session.user)
            toast.success('카카오 로그인 성공!')
            router.push('/')
            return
          }
        }

        // Query string에서 code 처리 (Authorization Code flow)
        const code = searchParams.get('code')
        if (code) {
          console.log('Authorization code found:', code)
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            console.error('Code exchange 오류:', error)
            toast.error('로그인 중 오류가 발생했습니다')
            router.push('/login')
            return
          }

          if (data.session) {
            console.log('OAuth 로그인 성공 (Code):', data.session.user)
            toast.success('카카오 로그인 성공!')
            router.push('/')
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
          toast.success('카카오 로그인 성공!')
          router.push('/')
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