'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, TicketIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { createCoupon } from '@/lib/couponApi'

export default function NewCouponPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'fixed_amount',
    discount_value: '',
    min_purchase_amount: '0',
    max_discount_amount: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    usage_limit_per_user: '1',
    total_usage_limit: '',
    is_active: true,
    is_welcome_coupon: false
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // 유효성 검사
    if (!formData.code.trim()) {
      toast.error('쿠폰 코드를 입력해주세요')
      return
    }

    if (!formData.name.trim()) {
      toast.error('쿠폰 이름을 입력해주세요')
      return
    }

    if (!formData.discount_value || parseFloat(formData.discount_value) <= 0) {
      toast.error('할인 금액/비율을 입력해주세요')
      return
    }

    if (!formData.valid_until) {
      toast.error('유효 기간 종료일을 선택해주세요')
      return
    }

    // 날짜 검증
    const validFrom = new Date(formData.valid_from)
    const validUntil = new Date(formData.valid_until)

    if (validUntil <= validFrom) {
      toast.error('종료일은 시작일보다 이후여야 합니다')
      return
    }

    // 퍼센트 할인인 경우 최대 할인 금액 필수
    if (formData.discount_type === 'percentage' && !formData.max_discount_amount) {
      toast.error('퍼센트 할인은 최대 할인 금액을 입력해야 합니다')
      return
    }

    try {
      setLoading(true)

      const couponData = {
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_purchase_amount: parseFloat(formData.min_purchase_amount) || 0,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: new Date(formData.valid_until + 'T23:59:59').toISOString(),
        usage_limit_per_user: parseInt(formData.usage_limit_per_user) || 1,
        total_usage_limit: formData.total_usage_limit ? parseInt(formData.total_usage_limit) : null,
        is_active: formData.is_active,
        is_welcome_coupon: formData.is_welcome_coupon
      }

      console.log('쿠폰 생성 데이터:', couponData)

      const result = await createCoupon(couponData)

      toast.success('쿠폰이 발행되었습니다')
      router.push(`/admin/coupons/${result.id}`)
    } catch (error) {
      console.error('쿠폰 생성 실패:', error)

      if (error.message?.includes('duplicate') || error.code === '23505') {
        toast.error('이미 존재하는 쿠폰 코드입니다')
      } else {
        toast.error('쿠폰 발행에 실패했습니다')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/admin/coupons')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          쿠폰 목록으로
        </button>
        <div className="flex items-center">
          <TicketIcon className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">쿠폰 발행</h1>
            <p className="mt-1 text-sm text-gray-500">
              새로운 할인 쿠폰을 생성합니다
            </p>
          </div>
        </div>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                쿠폰 코드 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="예: WELCOME2024"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                required
              />
              <p className="mt-1 text-xs text-gray-500">영문, 숫자만 사용 (자동 대문자 변환)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                쿠폰 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="예: 신규 가입 환영 쿠폰"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="쿠폰에 대한 설명을 입력하세요"
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 할인 설정 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">할인 설정</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                할인 타입 <span className="text-red-500">*</span>
              </label>
              <select
                name="discount_type"
                value={formData.discount_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="fixed_amount">금액 할인</option>
                <option value="percentage">퍼센트 할인</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                할인 {formData.discount_type === 'fixed_amount' ? '금액' : '비율'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="discount_value"
                  value={formData.discount_value}
                  onChange={handleChange}
                  placeholder={formData.discount_type === 'fixed_amount' ? '10000' : '10'}
                  min="0"
                  step={formData.discount_type === 'fixed_amount' ? '1000' : '1'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                  {formData.discount_type === 'fixed_amount' ? '원' : '%'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                최소 구매 금액
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="min_purchase_amount"
                  value={formData.min_purchase_amount}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  step="1000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">원</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">0원 = 제한 없음</p>
            </div>

            {formData.discount_type === 'percentage' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  최대 할인 금액 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="max_discount_amount"
                    value={formData.max_discount_amount}
                    onChange={handleChange}
                    placeholder="50000"
                    min="0"
                    step="1000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={formData.discount_type === 'percentage'}
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">원</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 유효 기간 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">유효 기간</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="valid_from"
                value={formData.valid_from}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="valid_until"
                value={formData.valid_until}
                onChange={handleChange}
                min={formData.valid_from}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* 사용 제한 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">사용 제한</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사용자당 사용 가능 횟수
              </label>
              <input
                type="number"
                name="usage_limit_per_user"
                value={formData.usage_limit_per_user}
                onChange={handleChange}
                placeholder="1"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전체 사용 가능 횟수
              </label>
              <input
                type="number"
                name="total_usage_limit"
                value={formData.total_usage_limit}
                onChange={handleChange}
                placeholder="제한 없음"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">비워두면 제한 없음 (선착순 제한용)</p>
            </div>
          </div>
        </div>

        {/* 활성화 상태 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              쿠폰 즉시 활성화
            </span>
          </label>
          <p className="mt-1 ml-6 text-xs text-gray-500">
            비활성화 시 배포는 가능하지만 사용자가 사용할 수 없습니다
          </p>
        </div>

        {/* 웰컴 쿠폰 설정 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_welcome_coupon"
              checked={formData.is_welcome_coupon}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              회원가입 시 자동 지급 (웰컴 쿠폰)
            </span>
          </label>
          <p className="mt-1 ml-6 text-xs text-gray-500">
            활성화하면 신규 회원가입 시 이 쿠폰이 자동으로 발급됩니다
          </p>
          {formData.is_welcome_coupon && (
            <div className="mt-3 ml-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                💡 <strong>웰컴 쿠폰 안내</strong><br />
                • 회원가입 완료 시 자동으로 쿠폰이 지급됩니다<br />
                • 여러 웰컴 쿠폰이 있는 경우 최신 생성된 쿠폰이 지급됩니다<br />
                • 발급 제한(전체 사용 가능 횟수)이 있으면 선착순으로 적용됩니다
              </p>
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/admin/coupons')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '발행 중...' : '쿠폰 발행'}
          </button>
        </div>
      </form>
    </div>
  )
}
