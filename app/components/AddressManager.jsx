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

          // addresses가 비어있지만 기본 주소 정보가 있으면 마이그레이션 (우편번호 포함)
          if ((!addresses || addresses.length === 0) && profile?.address) {
            console.log('🔄 AddressManager - 기본 주소 마이그레이션:', profile.address)
            const defaultAddress = {
              id: Date.now(),
              label: '기본 배송지',
              address: profile.address,
              detail_address: profile.detail_address || '',
              postal_code: profile.postal_code || '',
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
      toast.error('주소 검색 서비스를 불러올 수 없습니다')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.address.trim()) {
      toast.error('주소를 입력해주세요')
      return
    }

    try {
      const isEdit = !!editingId
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

      // 현재 주소 목록 가져오기
      const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=addresses`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!profileResponse.ok) {
        toast.error('프로필 조회에 실패했습니다')
        return
      }

      const profiles = await profileResponse.json()
      let addresses = profiles[0]?.addresses || []

      if (isEdit) {
        // 주소 수정
        const addressIndex = addresses.findIndex(addr => addr.id === editingId)
        if (addressIndex === -1) {
          toast.error('수정할 주소를 찾을 수 없습니다')
          return
        }

        addresses[addressIndex] = {
          ...addresses[addressIndex],
          label: formData.label || '배송지',
          address: formData.address,
          detail_address: formData.detail_address || '',
          updated_at: new Date().toISOString()
        }
      } else {
        // 주소 추가
        if (addresses.length >= 5) {
          toast.error('최대 5개의 주소만 저장할 수 있습니다')
          return
        }

        const newAddress = {
          id: Date.now(),
          label: formData.label || '배송지',
          address: formData.address,
          detail_address: formData.detail_address || '',
          is_default: addresses.length === 0, // 첫 번째 주소면 기본으로 설정
          created_at: new Date().toISOString()
        }

        addresses.push(newAddress)
      }

      // 주소 목록 업데이트
      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ addresses })
      })

      if (updateResponse.ok) {
        toast.success(isEdit ? '주소가 수정되었습니다' : '주소가 추가되었습니다')
        await fetchAddresses()
        resetForm()
        if (onAddressChange) onAddressChange()
      } else {
        toast.error('주소 저장에 실패했습니다')
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
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

      // 현재 주소 목록 가져오기
      const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=addresses`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!profileResponse.ok) {
        toast.error('프로필 조회에 실패했습니다')
        return
      }

      const profiles = await profileResponse.json()
      let addresses = profiles[0]?.addresses || []

      // 삭제할 주소 찾기
      const addressIndex = addresses.findIndex(addr => addr.id === addressId)
      if (addressIndex === -1) {
        toast.error('삭제할 주소를 찾을 수 없습니다')
        return
      }

      // 삭제할 주소가 기본 주소인지 확인
      const wasDefault = addresses[addressIndex].is_default

      // 주소 삭제
      addresses.splice(addressIndex, 1)

      // 기본 주소를 삭제했고 다른 주소가 있으면 첫 번째 주소를 기본으로 설정
      if (wasDefault && addresses.length > 0) {
        addresses[0].is_default = true
      }

      // 주소 목록 업데이트
      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ addresses })
      })

      if (updateResponse.ok) {
        toast.success('주소가 삭제되었습니다')
        await fetchAddresses()
        if (onAddressChange) onAddressChange()
      } else {
        toast.error('주소 삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('주소 삭제 오류:', error)
      toast.error('주소 삭제에 실패했습니다')
    }
  }

  const handleSetDefault = async (addressId) => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

      // 현재 주소 목록 가져오기
      const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=addresses`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!profileResponse.ok) {
        toast.error('프로필 조회에 실패했습니다')
        return
      }

      const profiles = await profileResponse.json()
      let addresses = profiles[0]?.addresses || []

      // 모든 주소의 기본 설정 해제 후 선택한 주소만 기본으로 설정
      addresses = addresses.map(addr => ({
        ...addr,
        is_default: addr.id === addressId
      }))

      // 주소 목록 업데이트
      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ addresses })
      })

      if (updateResponse.ok) {
        toast.success('기본 배송지가 변경되었습니다')
        await fetchAddresses()
        if (onAddressChange) onAddressChange()
      } else {
        toast.error('기본 배송지 설정에 실패했습니다')
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
    setEditingId(null)
    setShowAddForm(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">주소 정보를 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          배송지 관리 ({addresses.length}/5)
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          주소 추가
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">등록된 배송지가 없습니다</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            첫 번째 배송지 추가하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <motion.div
              key={address.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-medium text-gray-800 bg-gray-100 px-2 py-1 rounded">
                      {address.label}
                    </span>
                    {address.is_default && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center">
                        <StarIconSolid className="w-3 h-3 mr-1" />
                        기본 배송지
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 font-medium">{address.address}</p>
                  {address.detail_address && (
                    <p className="text-gray-600 text-sm mt-1">{address.detail_address}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                      title="기본 배송지로 설정"
                    >
                      <StarIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(address)}
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    title="수정"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="삭제"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg w-full max-w-md"
            >
              <form onSubmit={handleSubmit} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900" style={{ WebkitTextFillColor: '#111827' }}>
                    {editingId ? '주소 수정' : '새 주소 추가'}
                  </h3>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1" style={{ WebkitTextFillColor: '#111827' }}>
                      배송지 이름
                    </label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="예: 집, 회사, 기타"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      style={{
                        WebkitTextFillColor: '#111827',
                        color: '#111827',
                        opacity: 1
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1" style={{ WebkitTextFillColor: '#111827' }}>
                      주소 *
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="주소를 입력하거나 검색하세요"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        style={{
                          WebkitTextFillColor: '#111827',
                          color: '#111827',
                          opacity: 1
                        }}
                        required
                      />
                      <button
                        type="button"
                        onClick={handleAddressSearch}
                        className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                        style={{ WebkitTextFillColor: '#111827' }}
                      >
                        주소 검색
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1" style={{ WebkitTextFillColor: '#111827' }}>
                      상세 주소
                    </label>
                    <input
                      type="text"
                      value={formData.detail_address}
                      onChange={(e) => setFormData({ ...formData, detail_address: e.target.value })}
                      placeholder="상세 주소를 입력하세요 (선택사항)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      style={{
                        WebkitTextFillColor: '#111827',
                        color: '#111827',
                        opacity: 1
                      }}
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
                    style={{ WebkitTextFillColor: '#111827' }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {editingId ? '수정' : '추가'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}