'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import useAuth from '@/app/hooks/useAuth'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import SignupPromptModal from '@/app/components/common/SignupPromptModal'

export default function LoginPage() {
  const router = useRouter()
  const { signInWithKakao } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const modalTimerRef = useRef(null)



  const handleKakaoLogin = async () => {
    try {
      setLoading(true)
      const result = await signInWithKakao()
      if (!result.success) {
        console.error('카카오 로그인 실패:', result.error)
      }
    } catch (error) {
      console.error('카카오 로그인 오류:', error)
      toast.error('카카오 로그인 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white rounded-lg shadow-sm p-6"
      >
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-500 mb-2">allok</h1>
          <p className="text-gray-600">로그인하여 라이브 쇼핑을 즐겨보세요</p>
        </div>

        {/* 카카오 로그인 안내 */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm font-medium text-center mb-2">
            🚀 간편하게 카카오로 로그인하세요!
          </p>
          <p className="text-yellow-700 text-xs text-center">
            카카오 계정으로 빠르고 안전하게 로그인할 수 있습니다
          </p>
        </div>

        {/* 카카오 로그인 버튼 */}
        <button
          onClick={handleKakaoLogin}
          disabled={loading}
          className="w-full bg-yellow-400 text-gray-900 py-4 rounded-lg font-semibold hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mb-6"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C7.03 3 3 6.28 3 10.32c0 2.74 1.89 5.13 4.62 6.37l-1.24 4.56c-.11.4.36.7.67.49l5.24-3.63c.23.02.46.03.71.03 4.97 0 9-3.28 9-7.32S16.97 3 12 3z"/>
          </svg>
          {loading ? '로그인 중...' : '카카오 로그인'}
        </button>


        {/* 안내 메시지 */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            계정이 없으시면 카카오 로그인 시 자동으로 가입됩니다
          </p>
        </div>

        {/* 휴대폰 인증 회원가입 - 임시 비활성화 (2025-09-28)
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            아직 계정이 없으신가요?
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => router.push('/signup')}
              className="text-red-500 font-medium hover:text-red-600 text-sm"
            >
              이메일 회원가입
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={() => router.push('/phone-signup')}
              className="text-blue-600 font-medium hover:text-blue-700 text-sm"
            >
              휴대폰 인증 회원가입
            </button>
          </div>
        </div>
        */}

      </motion.div>

      {/* 회원가입 유도 모달 */}
      <SignupPromptModal
        isOpen={showSignupPrompt}
        onClose={() => {
          console.log('모달 닫기 요청됨')
          setShowSignupPrompt(false)
        }}
        phone=""
      />
    </div>
  )
}