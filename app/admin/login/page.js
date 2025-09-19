'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
// import useAuth from '@/hooks/useAuth'
import { checkAdminAccess, checkMasterAdminCredentials } from '@/lib/adminAuth'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const router = useRouter()
  // const { signIn, signInWithKakao, user, loading, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)


  const handleEmailLogin = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('이메일과 비밀번호를 입력해주세요')
      return
    }

    setIsLoading(true)
    try {
      // 먼저 환경변수 기반 관리자 계정 체크
      if (checkMasterAdminCredentials(email, password)) {
        // localStorage에 관리자 세션 저장
        localStorage.setItem('admin_session', 'master_admin')
        localStorage.setItem('admin_email', email)

        toast.success('마스터 관리자 로그인 성공!')
        window.location.replace('/admin')
        return
      }

      // 환경변수 관리자 계정이 아닌 경우 오류
      toast.error('잘못된 관리자 계정입니다')
    } catch (error) {
      console.error('로그인 오류:', error)
      toast.error('로그인 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-6"
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
              <ShieldCheckIcon className="h-8 w-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900">관리자 로그인</h1>
              <p className="text-gray-600">allok 관리 시스템</p>
            </div>
          </motion.div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
            <p className="text-amber-800 text-sm">
              🔒 관리자 권한이 필요합니다. 마스터 관리자가 승인한 계정으로만 로그인 가능합니다.
            </p>
          </div>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >

          <form onSubmit={handleEmailLogin} className="space-y-6">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                관리자 이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                placeholder="admin@example.com"
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="비밀번호를 입력하세요"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
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
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  로그인 중...
                </div>
              ) : (
                '관리자 로그인'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">또는</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>


          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              <span className="font-medium">기본 관리자 계정</span><br />
              이메일: master@allok.world<br />
              비밀번호: yi01buddy!!
            </p>
          </div>

          {/* Info */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              관리자 계정이 없으신가요?{' '}
              <span className="text-red-600 font-medium">
                마스터 관리자에게 문의하세요
              </span>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-gray-500">
            © 2024 allok. 관리자 시스템
          </p>
        </motion.div>
      </div>
    </div>
  )
}// Deploy trigger Fri Sep 19 20:58:44 KST 2025
