'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'

export default function AddressManager({ userId, onAddressChange }) {
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    label: '',
    address: '',
    detail_address: ''
  })

  useEffect(() => {
    if (userId) {
      fetchAddresses()
    }
  }, [userId])

  const fetchAddresses = async () => {
    try {
      setLoading(true)

      // 마이페이지와 동일한 방식으로 직접 Supabase API 호출
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=addresses,address,detail_address`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const profiles = await response.json()
        if (profiles && profiles.length > 0) {
          const profile = profiles[0]

          console.log('🏠 AddressManager - 프로필 데이터:', profile)

          let addresses = profile?.addresses || []

          // addresses가 비어있지만 기본 주소 정보가 있으면 마이그레이션
          if ((!addresses || addresses.length === 0) && profile?.address) {
            console.log('🔄 AddressManager - 기본 주소 마이그레이션:', profile.address)
            const defaultAddress = {
              id: Date.now(),
              label: '기본 배송지',
              address: profile.address,
              detail_address: profile.detail_address || '',
              is_default: true,
              created_at: new Date().toISOString()
            }
            addresses = [defaultAddress]

            // 마이그레이션된 주소를 데이터베이스에 저장
            await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ addresses })
            })
          }

          setAddresses(addresses || [])
          console.log('✅ AddressManager - 주소 로드 완료:', addresses)
        } else {
          setAddresses([])
        }
      } else {
        console.error('주소 조회 실패:', response.status)
        toast.error('주소 정보를 불러올 수 없습니다')
        setAddresses([])
      }
    } catch (error) {
      console.error('주소 조회 오류:', error)
      toast.error('주소 정보를 불러올 수 없습니다')
      setAddresses([])
    } finally {
      setLoading(false)
    }
  }

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

  const handleSave = async () => {
    if (!formData.address.trim()) {
      toast.error('주소를 입력해주세요')
      return
    }
    if (!formData.label.trim()) {
      toast.error('배송지 이름을 입력해주세요')
      return
    }

    try {
      const isEdit = editingId !== null
      const url = isEdit ? '/api/addresses' : '/api/addresses'
      const method = isEdit ? 'PUT' : 'POST'

      const requestData = {
        user_id: userId,
        label: formData.label,
        address: formData.address,
        detail_address: formData.detail_address,
        is_default: addresses.length === 0 // 첫 번째 주소는 자동으로 기본 배송지
      }

      if (isEdit) {
        requestData.id = editingId
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(isEdit ? '주소가 수정되었습니다' : '주소가 추가되었습니다')
        await fetchAddresses()
        resetForm()
        if (onAddressChange) onAddressChange()
      } else {
        toast.error(data.error || '주소 저장에 실패했습니다')
      }
    } catch (error) {
      console.error('주소 저장 오류:', error)
      toast.error('주소 저장에 실패했습니다')
    }
  }

  const handleEdit = (address) => {
    setEditingId(address.id)
    setFormData({
      label: address.label,
      address: address.address,
      detail_address: address.detail_address || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (addressId) => {
    if (!window.confirm('이 주소를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/addresses?id=${addressId}&user_id=${userId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('주소가 삭제되었습니다')
        await fetchAddresses()
        if (onAddressChange) onAddressChange()
      } else {
        toast.error(data.error || '주소 삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('주소 삭제 오류:', error)
      toast.error('주소 삭제에 실패했습니다')
    }
  }

  const handleSetDefault = async (addressId) => {
    try {
      const response = await fetch('/api/addresses/set-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address_id: addressId,
          user_id: userId
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('기본 배송지가 변경되었습니다')
        await fetchAddresses()
        if (onAddressChange) onAddressChange()
      } else {
        toast.error(data.error || '기본 배송지 설정에 실패했습니다')
      }
    } catch (error) {
      console.error('기본 배송지 설정 오류:', error)
      toast.error('기본 배송지 설정에 실패했습니다')
    }
  }

  const resetForm = () => {
    setFormData({
      label: '',
      address: '',
      detail_address: ''
    })
    setShowAddForm(false)
    setEditingId(null)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="p-4 border border-gray-200 rounded-lg">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          배송지 관리 ({addresses.length}/5)
        </h3>
        {addresses.length < 5 && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            <PlusIcon className="h-4 w-4" />
            주소 추가
          </button>
        )}
      </div>

      {/* 주소 목록 */}
      <div className="space-y-3">
        <AnimatePresence>
          {addresses.map((address) => (
            <motion.div
              key={address.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 border rounded-lg ${
                address.is_default
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {address.label}
                    </span>
                    {address.is_default && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                        <StarIconSolid className="h-3 w-3" />
                        기본배송지
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    {address.address}
                  </p>
                  {address.detail_address && (
                    <p className="text-sm text-gray-500">
                      {address.detail_address}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 ml-4">
                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
                      title="기본 배송지로 설정"
                    >
                      <StarIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(address)}
                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                    title="수정"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  {addresses.length > 1 && (
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="삭제"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {addresses.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MapPinIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="mb-4">등록된 배송지가 없습니다</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              첫 번째 배송지 추가하기
            </button>
          </div>
        )}
      </div>

      {/* 주소 추가/수정 폼 */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h4 className="text-lg font-semibold mb-4">
                {editingId ? '주소 수정' : '새 주소 추가'}
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    배송지 이름
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      label: e.target.value
                    }))}
                    placeholder="예: 집, 회사, 부모님댁"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주소
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: e.target.value
                      }))}
                      placeholder="주소 검색을 눌러주세요"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={handleAddressSearch}
                      className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors whitespace-nowrap"
                    >
                      주소검색
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상세주소
                  </label>
                  <input
                    type="text"
                    value={formData.detail_address}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      detail_address: e.target.value
                    }))}
                    placeholder="동, 호수 등"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                  <CheckIcon className="h-4 w-4" />
                  {editingId ? '수정' : '추가'}
                </button>
                <button
                  onClick={resetForm}
                  className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                  취소
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}