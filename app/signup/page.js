'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { validateSignupForm } from '@/lib/validation'
import toast from 'react-hot-toast'
import useAuth from '@/app/hooks/useAuth'

export default function SignupPage() {
  const router = useRouter()
  const { signUp, signInWithPassword, signInWithKakao } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    nickname: '',
    tiktokId: '',
    youtubeId: '',
    address: '',
    detailAddress: ''
  })

  // 다음 주소 검색 API
  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && window.daum && window.daum.Postcode) {
      new window.daum.Postcode({
        oncomplete: function(data) {
          setFormData(prev => ({
            ...prev,
            address: data.address
          }))
        }
      }).open()
    } else {
      toast.error('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
    }
  }

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

  const validateForm = () => {
    // 새로운 검증 시스템 사용
    const validationResult = validateSignupForm(formData)

    if (!validationResult.isValid) {
      // 첫 번째 에러만 표시
      const firstError = Object.values(validationResult.errors)[0]
      toast.error(firstError)
      console.log('전체 검증 에러:', validationResult.errors)
      return false
    }

    console.log('검증 성공 - 정리된 데이터:', validationResult.sanitizedData)
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log('Form submitted!')
    console.log('Form data:', formData)

    if (!validateForm()) {
      console.log('Form validation failed')
      return
    }

    console.log('Form validation passed')
    setLoading(true)

    try {
      // 휴대폰 번호를 이메일 형식으로 변환 (Supabase auth용)
      const phone = formData.phone.replace(/[^\d]/g, '')
      const email = `user${phone}@allok.app`

      // useAuth 훅을 통한 Supabase 회원가입
      console.log('Attempting signup with:', { email, name: formData.name, phone: formData.phone })

      const result = await signUp({
        email: email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        nickname: formData.nickname || formData.name
      })

      if (!result.success) {
        if (result.error && result.error.includes('already registered')) {
          toast.error('이미 가입된 휴대폰 번호입니다')
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        }
        return
      }

      // 회원가입 성공 시 프로필 정보 저장 시도 (선택적)
      if (result.user) {
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: result.user.id,
              name: formData.name,
              phone: formData.phone,
              nickname: formData.nickname || formData.name
            }, {
              onConflict: 'id'
            })

          if (profileError) {
            console.warn('프로필 생성 실패 (RLS 정책):', profileError)
          } else {
            console.log('프로필 생성 성공')
          }
        } catch (error) {
          console.warn('프로필 생성 중 오류:', error)
        }
      }

      // 이메일 확인이 비활성화되어 회원가입 즉시 로그인됨
      if (result.session) {
        toast.success('회원가입이 완료되었습니다!')
        setTimeout(() => {
          router.push('/')
        }, 1000)
      } else {
        toast.success('회원가입이 완료되었습니다!')
        setTimeout(() => {
          router.push('/login')
        }, 1000)
      }

    } catch (error) {
      console.error('회원가입 오류:', error)
      toast.error('회원가입 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

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
    <>
      {/* 다음 주소 검색 API 스크립트 */}
      <script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        async
      />

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

          {/* 안내 문구 */}
          <div className="mb-6 p-3 bg-red-50 rounded-lg">
            <p className="text-red-600 text-sm font-medium text-center">
              * 입금자명은 닉네임 또는 이름으로 입금해주세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="홍길동"
                autoComplete="name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                required
              />
            </div>

            {/* 휴대폰번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                휴대폰번호 <span className="text-red-500">*</span>
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
                비밀번호 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="6자 이상 입력해주세요"
                  autoComplete="new-password"
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

            {/* 주소 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                주소 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="주소 검색을 눌러주세요"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  readOnly
                  required
                />
                <button
                  type="button"
                  onClick={handleAddressSearch}
                  className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors whitespace-nowrap"
                >
                  주소검색
                </button>
              </div>
            </div>

            {/* 상세주소 */}
            {formData.address && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상세주소 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="detailAddress"
                  value={formData.detailAddress}
                  onChange={handleInputChange}
                  placeholder="상세주소를 입력해주세요 (동, 호수 등)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  required
                />
              </div>
            )}

            {/* 닉네임 - 필수 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                닉네임 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                placeholder="닉네임을 입력해주세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                required
              />
            </div>

            {/* 가입 버튼 */}
            <button
              type="submit"
              disabled={loading}
              onClick={(e) => {
                console.log('Button clicked!')
                // handleSubmit은 onSubmit에서 자동으로 처리됨
              }}
              className="w-full mt-6 bg-red-500 text-white py-4 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          {/* 소셜 로그인 구분선 */}
          <div className="mt-6 mb-4 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">또는</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* 카카오 로그인 버튼 */}
          <button
            onClick={handleKakaoLogin}
            disabled={loading}
            className="w-full bg-yellow-400 text-gray-900 py-4 rounded-lg font-semibold hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C7.03 3 3 6.28 3 10.32c0 2.74 1.89 5.13 4.62 6.37l-1.24 4.56c-.11.4.36.7.67.49l5.24-3.63c.23.02.46.03.71.03 4.97 0 9-3.28 9-7.32S16.97 3 12 3z"/>
            </svg>
            {loading ? '처리 중...' : '카카오로 간편 가입'}
          </button>

          {/* 로그인 링크 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-red-500 font-medium hover:text-red-600"
              >
                로그인
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  )
}