'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import useAuth from '@/app/hooks/useAuth'

export default function CompleteProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    nickname: '',
    address: '',
    detailAddress: '',
    postalCode: ''
  })

  useEffect(() => {
    // 카카오 사용자 확인
    const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}')

    if (sessionUser.provider === 'kakao' && sessionUser.id) {
      // 카카오 로그인 사용자 정보 자동 입력
      setFormData(prev => ({
        ...prev,
        name: sessionUser.name || '',
        nickname: sessionUser.nickname || sessionUser.name || ''
      }))
    } else if (!authLoading && !user && !sessionUser.id) {
      // ✅ 카카오 사용자도 sessionUser.id가 있으면 리다이렉트 안 함
      toast.error('로그인이 필요합니다')
      router.push('/login')
      return
    } else if (user) {
      // Supabase 사용자 정보 자동 입력
      setFormData(prev => ({
        ...prev,
        name: user.user_metadata?.name || '',
        nickname: user.user_metadata?.nickname || user.user_metadata?.name || ''
      }))
    }
  }, [user, authLoading, router])

  // 다음 주소 검색 API
  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && window.daum && window.daum.Postcode) {
      new window.daum.Postcode({
        oncomplete: function(data) {
          console.log('📍 주소 검색 완료:', {
            address: data.address,
            zonecode: data.zonecode
          })
          setFormData(prev => ({
            ...prev,
            address: data.address,
            postalCode: data.zonecode // ✅ 우편번호 저장
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
    if (!formData.name.trim()) {
      toast.error('이름을 입력해주세요')
      return false
    }

    if (!formData.phone || formData.phone.replace(/[^\d]/g, '').length !== 11) {
      toast.error('올바른 휴대폰 번호를 입력해주세요')
      return false
    }

    if (!formData.address.trim()) {
      toast.error('주소를 입력해주세요')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      console.log('📱 [모바일] 프로필 완성 시작:', formData)

      // 카카오 로그인 사용자인지 확인
      const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}')
      console.log('📱 [모바일] sessionUser:', sessionUser)

      if (sessionUser.provider === 'kakao' && sessionUser.id) {
        // 🚀 새로운 통합 프로필 업데이트 사용
        console.log('📱 [모바일] 카카오 사용자 통합 프로필 업데이트 시작')

        const updateData = {
          name: formData.name,
          phone: formData.phone,
          nickname: formData.nickname || formData.name,
          address: formData.address,
          detail_address: formData.detailAddress || '',
          postal_code: formData.postalCode || '' // ✅ 우편번호 추가
        }
        console.log('📱 [모바일] updateData:', updateData)

        // ⚡ 모바일 최적화: API Route로 서버사이드 처리
        console.log('📱 [모바일] API 호출 시작...')

        const response = await fetch('/api/profile/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: sessionUser.id,
            profileData: updateData
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('📱 [모바일] API 오류:', errorData)
          throw new Error(errorData.error || '프로필 저장 실패')
        }

        const result = await response.json()
        console.log('📱 [모바일] API 응답 성공:', result)

        // sessionStorage 업데이트
        const updatedUser = {
          ...sessionUser,
          ...updateData,
          profile_completed: true
        }
        sessionStorage.setItem('user', JSON.stringify(updatedUser))
        console.log('📱 [모바일] sessionStorage 업데이트 완료')

        // 프로필 완성 이벤트 발생
        window.dispatchEvent(new CustomEvent('profileCompleted', {
          detail: updatedUser
        }))

        console.log('✅ [모바일] 카카오 사용자 프로필 완성 완료')

      } else {
        // 🚀 일반 Supabase 사용자도 API Route 사용
        console.log('📱 [모바일] 일반 사용자 프로필 업데이트 시작')

        const updateData = {
          name: formData.name,
          phone: formData.phone,
          nickname: formData.nickname || formData.name,
          address: formData.address,
          detail_address: formData.detailAddress || '',
          postal_code: formData.postalCode || '' // ✅ 우편번호 추가
        }

        const response = await fetch('/api/profile/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: user.id,
            profileData: updateData
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('📱 [모바일] API 오류:', errorData)
          throw new Error(errorData.error || '프로필 저장 실패')
        }

        const result = await response.json()
        console.log('📱 [모바일] API 응답 성공:', result)
        console.log('✅ [모바일] 일반 사용자 프로필 완성 완료')
      }

      console.log('📱 [모바일] 홈으로 리다이렉트')
      toast.success('프로필이 완성되었습니다!')
      router.push('/')

    } catch (error) {
      console.error('❌ [모바일] 프로필 완성 오류:', error)
      console.error('❌ [모바일] 에러 상세:', error.message, error.stack)
      // 모바일에서 에러를 명확히 보기 위해
      alert(`프로필 저장 실패: ${error.message}`)
      toast.error(`프로필 저장 중 오류: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">추가 정보 입력</h1>
            <p className="text-gray-600">서비스 이용을 위해 추가 정보가 필요합니다</p>
          </div>

          {/* 카카오 계정 정보 */}
          {user?.email && (
            <div className="mb-6 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-700">
                카카오 계정으로 가입되었습니다
              </p>
              <p className="text-xs text-gray-500 mt-1">{user.email}</p>
            </div>
          )}

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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                required
              />
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
                <input
                  type="text"
                  name="detailAddress"
                  value={formData.detailAddress}
                  onChange={handleInputChange}
                  placeholder="상세주소 (동, 호수 등)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                />
              </div>
            )}

            {/* 닉네임 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                닉네임 <span className="text-xs text-gray-500">(선택)</span>
              </label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                placeholder="닉네임 (미입력시 이름 사용)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
            </div>

            {/* 완료 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-red-500 text-white py-4 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '저장 중...' : '프로필 완성하기'}
            </button>
          </form>
        </motion.div>
      </div>
    </>
  )
}