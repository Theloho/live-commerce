'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import PhoneVerification from '@/app/components/auth/PhoneVerification'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export default function PhoneSignupPage() {
  const router = useRouter()
  const [step, setStep] = useState('phone') // 'phone' | 'form'
  const [verifiedPhone, setVerifiedPhone] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    password: '',
    confirmPassword: '',
    address: '',
    detailAddress: ''
  })
  const [loading, setLoading] = useState(false)

  // 휴대폰 인증 완료 시
  const handlePhoneVerified = (phone) => {
    setVerifiedPhone(phone)
    setStep('form')
    toast.success('휴대폰 인증이 완료되었습니다')
  }

  // 입력값 변경
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // 회원가입 처리
  const handleSignup = async (e) => {
    e.preventDefault()

    // 유효성 검사
    if (!formData.name.trim()) {
      toast.error('이름을 입력해주세요')
      return
    }

    if (!formData.nickname.trim()) {
      toast.error('닉네임을 입력해주세요')
      return
    }

    if (formData.password.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다')
      return
    }

    setLoading(true)

    try {
      // 중복 확인
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', verifiedPhone)
        .single()

      if (existingUser) {
        toast.error('이미 가입된 휴대폰 번호입니다')
        return
      }

      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(formData.password, 12)

      // 임시 이메일 생성 (휴대폰 번호 기반)
      const tempEmail = `user${verifiedPhone}@allok.app`

      // Supabase 회원가입
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tempEmail,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            nickname: formData.nickname,
            phone: verifiedPhone,
            signup_type: 'phone'
          }
        }
      })

      if (authError) {
        console.error('Auth 회원가입 오류:', authError)
        toast.error('회원가입에 실패했습니다')
        return
      }

      // 프로필 정보 저장
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: tempEmail,
          name: formData.name,
          nickname: formData.nickname,
          phone: verifiedPhone,
          address: formData.address || '',
          detail_address: formData.detailAddress || '',
          password_hash: hashedPassword,
          signup_type: 'phone',
          email_verified: false,
          phone_verified: true,
          created_at: new Date().toISOString()
        })

      if (profileError) {
        console.error('프로필 저장 오류:', profileError)
        toast.error('회원가입에 실패했습니다')
        return
      }

      toast.success('회원가입이 완료되었습니다!')
      router.push('/login?message=signup_success')

    } catch (error) {
      console.error('회원가입 오류:', error)
      toast.error('회원가입 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            휴대폰 번호로 회원가입
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            휴대폰 인증을 통해 간편하게 가입하세요
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === 'phone' && (
            <PhoneVerification
              onVerified={handlePhoneVerified}
              onCancel={() => router.push('/login')}
            />
          )}

          {step === 'form' && (
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  ✓ {verifiedPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')} 인증완료
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    이름 *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">
                    닉네임 *
                  </label>
                  <input
                    type="text"
                    id="nickname"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  비밀번호 *
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={8}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">8자 이상 입력해주세요</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  비밀번호 확인 *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  주소 (선택)
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="기본 주소"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  id="detailAddress"
                  name="detailAddress"
                  value={formData.detailAddress}
                  onChange={handleInputChange}
                  placeholder="상세 주소"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '가입 중...' : '회원가입 완료'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  이전
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <button
              onClick={() => router.push('/login')}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              로그인하기
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}