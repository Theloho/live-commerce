'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  EyeIcon,
  EyeSlashIcon,
  FireIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'
import toast from 'react-hot-toast'

function SellerLoginContent() {
  const router = useRouter()
  const { adminLogin } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleEmailLogin = async () => {
    if (!email || !password) {
      toast.error('이메일과 비밀번호를 입력하세요')
      return
    }

    setIsLoading(true)

    try {
      const result = await adminLogin(email, password)

      if (result.success) {
        console.log('✅ 셀러 로그인 성공!')
        toast.success('로그인 성공!')
        router.push('/seller/live-dashboard')
      } else {
        console.error('❌ 로그인 실패:', result.error)
        toast.error(result.error || '로그인에 실패했습니다')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('❌ 로그인 에러:', error)
      toast.error('로그인 중 오류가 발생했습니다')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-6"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            홈으로 돌아가기
          </button>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <div className="bg-red-500 p-3 rounded-full">
              <FireIcon className="h-8 w-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white">셀러 로그인</h1>
              <p className="text-gray-300">🔴 LIVE 판매 대시보드</p>
            </div>
          </motion.div>

          <div className="bg-red-900 bg-opacity-50 border border-red-700 rounded-lg p-3 mb-6">
            <p className="text-red-200 text-sm">
              🔴 라이브 방송 중 실시간 판매 현황을 확인하세요
            </p>
          </div>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700"
        >
          <div className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-500"
                placeholder="master@allok.world"
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-500"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={handleEmailLogin}
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isLoading ? '로그인 중...' : '🔴 LIVE 대시보드 접속'}
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-center text-sm text-gray-400">
              관리자 계정으로 로그인하세요
            </p>
            <p className="text-center text-xs text-gray-500 mt-2">
              로그인 후 자동으로 대시보드로 이동합니다
            </p>
          </div>
        </motion.div>

        {/* Quick Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center space-y-2"
        >
          <p className="text-gray-400 text-sm">
            📱 모바일/태블릿에서도 사용 가능
          </p>
          <p className="text-gray-500 text-xs">
            15초마다 자동 업데이트 | 재고 알림 | 인기 상품 TOP 5
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function SellerLogin() {
  return <SellerLoginContent />
}
