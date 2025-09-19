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

        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('OAuth 콜백 오류:', error)
          toast.error('로그인 중 오류가 발생했습니다')
          router.push('/login')
          return
        }

        if (data.session) {
          console.log('OAuth 로그인 성공:', data.session.user)
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