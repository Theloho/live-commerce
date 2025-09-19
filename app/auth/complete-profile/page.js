'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
    detailAddress: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('로그인이 필요합니다')
      router.push('/login')
      return
    }

    if (user) {
      // 카카오에서 받은 정보 자동 입력
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
      // profiles 테이블에 정보 저장 또는 업데이트
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: formData.name,
          phone: formData.phone,
          nickname: formData.nickname || formData.name,
          address: formData.address,
          detail_address: formData.detailAddress
        }, {
          onConflict: 'id'
        })

      if (profileError) {
        console.error('프로필 업데이트 오류:', profileError)
        toast.error('프로필 저장에 실패했습니다')
        return
      }

      // user_metadata 업데이트
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: formData.name,
          phone: formData.phone,
          nickname: formData.nickname || formData.name,
          address: formData.address,
          detail_address: formData.detailAddress,
          profile_completed: true
        }
      })

      if (updateError) {
        console.error('메타데이터 업데이트 오류:', updateError)
      }

      toast.success('프로필이 완성되었습니다!')
      router.push('/')

    } catch (error) {
      console.error('프로필 완성 오류:', error)
      toast.error('프로필 저장 중 오류가 발생했습니다')
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