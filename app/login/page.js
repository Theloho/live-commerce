'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useAuth from '@/app/hooks/useAuth'
import { motion } from 'framer-motion'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import SignupPromptModal from '@/app/components/common/SignupPromptModal'

export default function LoginPage() {
  const router = useRouter()
  const { signInWithPassword } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target

    // 휴대폰 번호 자동 포맷팅
    if (name === 'phone') {
      const numbers = value.replace(/[^\d]/g, '')
      let formatted = numbers

      if (numbers.length >= 3) {
        formatted = numbers.slice(0, 3) + '-' + numbers.slice(3)
      }
      if (numbers.length >= 7) {
        formatted = numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7, 11)
      }

      setFormData(prev => ({ ...prev, [name]: formatted }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.phone || formData.phone.replace(/[^\d]/g, '').length !== 11) {
      toast.error('올바른 휴대폰 번호를 입력해주세요')
      return
    }

    if (formData.password.length < 6) {
      toast.error('비밀번호를 입력해주세요')
      return
    }

    setLoading(true)

    try {
      // 휴대폰 번호를 이메일 형식으로 변환
      const phone = formData.phone.replace(/[^\d]/g, '')
      const email = `user${phone}@allok.app`

      const { data, error } = await signInWithPassword({
        email: email,
        password: formData.password
      })

      if (error) {
        if (error.message && error.message.includes('Invalid login credentials')) {
          // 미가입 사용자일 가능성이 높으므로 회원가입 유도 모달 표시
          setShowSignupPrompt(true)
        } else {
          toast.error('로그인 중 오류가 발생했습니다')
        }
        return
      }

      toast.success('로그인되었습니다!')
      router.push('/')

    } catch (error) {
      console.error('로그인 오류:', error)
      toast.error('로그인 중 오류가 발생했습니다')
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 휴대폰번호 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              휴대폰번호
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="010-0000-0000"
              maxLength={13}
              autoComplete="tel"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              required
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="비밀번호를 입력해주세요"
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-red-500 text-white py-4 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 회원가입 링크 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            아직 계정이 없으신가요?{' '}
            <button
              onClick={() => router.push('/signup')}
              className="text-red-500 font-medium hover:text-red-600"
            >
              회원가입
            </button>
          </p>
        </div>

        {/* 비밀번호 찾기 */}
        <div className="mt-4 text-center">
          <button className="text-sm text-gray-500 hover:text-gray-700">
            비밀번호를 잊으셨나요?
          </button>
        </div>
      </motion.div>

      {/* 회원가입 유도 모달 */}
      <SignupPromptModal
        isOpen={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
        phone={formData.phone}
      />
    </div>
  )
}