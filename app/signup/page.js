'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { validateSignupForm } from '@/lib/validation'
import toast from 'react-hot-toast'
import useAuth from '@/app/hooks/useAuth'

export default function SignupPage() {
  const router = useRouter()
  const { signUp, signInWithPassword, signInWithKakao } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    nickname: '',
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
    </>
  )
}