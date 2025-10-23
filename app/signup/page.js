'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import useAuth from '@/app/hooks/useAuth'

export default function SignupPage() {
  const router = useRouter()
  const { signInWithKakao } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleKakaoLogin = async () => {
    try {
      setLoading(true)
      const result = await signInWithKakao()
      if (!result.success) {
        console.error('카카오 로그인 실패:', result.error)
        toast.error('카카오 로그인에 실패했습니다')
        setLoading(false)
      }
    } catch (error) {
      console.error('카카오 로그인 오류:', error)
      toast.error('카카오 로그인 중 오류가 발생했습니다')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          {/* 헤더 */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">회원가입</h1>
            <p className="text-gray-600">allok에 오신 것을 환영합니다</p>
          </div>

          {/* 카카오 로그인으로 간편가입 안내 */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm font-medium text-center mb-2">
              🚀 간편하게 카카오로 가입하세요!
            </p>
            <p className="text-yellow-700 text-xs text-center">
              카카오 계정으로 3초 만에 회원가입이 완료됩니다
            </p>
          </div>

          {/* 카카오 로그인 버튼 */}
          <button
            onClick={handleKakaoLogin}
            disabled={loading}
            className="w-full bg-yellow-400 text-gray-900 py-4 rounded-lg font-semibold hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mb-6"
          >
            {loading ? '로그인 중...' : '카카오로 3초 만에 가입하기'}
          </button>


          {/* 로그인 링크 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              기존 사용자이시라면{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                카카오 로그인하기
              </button>
            </p>
          </div>
        </motion.div>
      </div>
  )
}