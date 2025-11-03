'use client'

import { useState, useEffect, useRef } from 'react'
import {
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  HomeIcon,
  BuildingOfficeIcon,
  HeartIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'

export default function AddressManager({ addresses = [], currentSelectedId = null, onAddressesChange, onSelect, selectMode = false }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [formData, setFormData] = useState({
    label: '',
    address: '',
    detail_address: '',
    postal_code: '' // 우편번호 추가
  })
  const [showAddressSearch, setShowAddressSearch] = useState(false)

  // 주소 자동 선택 (초기화 시)
  // 우선순위: currentSelectedId > 기본 주소
  useEffect(() => {
    if (addresses.length > 0) {
      // 1순위: 현재 선택된 주소가 있으면 그것을 사용
      if (currentSelectedId) {
        const currentAddr = addresses.find(a => a.id === currentSelectedId)
        if (currentAddr) {
          console.log('🎯 [AddressManager] 현재 선택된 주소로 초기화:', currentAddr.label)
          setSelectedAddressId(currentSelectedId)
          return
        }
      }

      // 2순위: 기본 주소 자동 선택
      const defaultAddr = addresses.find(a => a.is_default)
      if (defaultAddr && !selectedAddressId) {
        console.log('📍 [AddressManager] 기본 주소로 초기화:', defaultAddr.label)
        setSelectedAddressId(defaultAddr.id)
      }
    }
  }, [addresses, currentSelectedId])

  // 아이콘 선택 함수
  const getIcon = (label) => {
    if (label?.includes('집') || label?.includes('홈')) return HomeIcon
    if (label?.includes('회사') || label?.includes('직장')) return BuildingOfficeIcon
    if (label?.includes('부모') || label?.includes('가족')) return HeartIcon
    return MapPinIcon
  }

  // 새 주소 추가
  const handleAddAddress = async () => {
    if (!formData.label || !formData.address) {
      toast.error('배송지명과 주소는 필수입니다')
      return
    }

    if (addresses.length >= 5) {
      toast.error('최대 5개까지만 저장 가능합니다')
      return
    }

    const newAddress = {
      id: Date.now(),
      ...formData,
      is_default: addresses.length === 0,
      created_at: new Date().toISOString()
    }

    const updatedAddresses = [...addresses, newAddress]

    // 부모 컴포넌트에 업데이트 알림
    console.log('🔵 [AddressManager] onAddressesChange 호출:', {
      exists: !!onAddressesChange,
      updatedAddresses
    })

    if (onAddressesChange) {
      try {
        await onAddressesChange(updatedAddresses)
        console.log('✅ [AddressManager] onAddressesChange 완료')
      } catch (error) {
        console.error('❌ [AddressManager] onAddressesChange 실패:', error)
        toast.error('주소 저장에 실패했습니다')
        return // 실패 시 폼 초기화 안 함
      }
    } else {
      console.warn('⚠️ [AddressManager] onAddressesChange prop 없음!')
    }

    // 폼 초기화 및 성공 메시지
    setFormData({ label: '', address: '', detail_address: '', postal_code: '' })
    setShowAddForm(false)
    toast.success('배송지가 추가되었습니다')

    // 선택 모드에서는 새로 추가된 주소를 자동으로 선택 (약간 지연하여 toast 확인 가능)
    if (selectMode && onSelect) {
      // 사용자가 추가 완료 메시지를 볼 수 있도록 짧은 지연
      setTimeout(() => {
        onSelect(newAddress)
      }, 300)
    }
  }

  // 주소 수정
  const handleUpdateAddress = async (id) => {
    if (!formData.label || !formData.address) {
      toast.error('배송지명과 주소는 필수입니다')
      return
    }

    const updatedAddresses = addresses.map(addr =>
      addr.id === id
        ? { ...addr, ...formData, updated_at: new Date().toISOString() }
        : addr
    )

    if (onAddressesChange) {
      await onAddressesChange(updatedAddresses)
    }

    setEditingId(null)
    setFormData({ label: '', address: '', detail_address: '', postal_code: '' })
    toast.success('배송지가 수정되었습니다')
  }

  // 주소 삭제
  const handleDeleteAddress = async (id) => {
    const addressToDelete = addresses.find(a => a.id === id)

    if (addressToDelete.is_default) {
      toast.error('기본 배송지는 삭제할 수 없습니다')
      return
    }

    if (!confirm(`'${addressToDelete.label}' 배송지를 삭제하시겠습니까?`)) {
      return
    }

    const updatedAddresses = addresses.filter(a => a.id !== id)

    if (onAddressesChange) {
      await onAddressesChange(updatedAddresses)
    }

    toast.success('배송지가 삭제되었습니다')
  }

  // 기본 배송지 설정
  const handleSetDefault = async (id) => {
    const updatedAddresses = addresses.map(addr => ({
      ...addr,
      is_default: addr.id === id
    }))

    if (onAddressesChange) {
      await onAddressesChange(updatedAddresses)
    }

    toast.success('기본 배송지가 변경되었습니다')
  }

  // 수정 시작
  const startEdit = (address) => {
    setEditingId(address.id)
    setFormData({
      label: address.label,
      address: address.address,
      detail_address: address.detail_address || '',
      postal_code: address.postal_code || ''
    })
  }

  // 주소 선택 (주문 시)
  const handleSelectAddress = (address) => {
    setSelectedAddressId(address.id)
    if (onSelect) {
      onSelect(address)
    }
  }

  // 주소 검색 함수
  const openAddressSearch = () => {
    if (typeof window !== 'undefined' && window.daum && window.daum.Postcode) {
      setShowAddressSearch(true)

      // 약간의 지연 후 embed 실행 (div가 렌더링된 후)
      setTimeout(() => {
        const container = document.getElementById('address-search-container')
        if (container) {
          new window.daum.Postcode({
            oncomplete: function(data) {
              // 선택한 주소와 우편번호를 폼에 설정
              // roadAddress: 전체 도로명 주소 (건물번호 포함, 예: "제주특별자치도 서귀포시 가마가흥로13")
              // jibunAddress: 지번 주소
              const fullAddress = data.roadAddress || data.jibunAddress
              setFormData(prev => ({
                ...prev,
                address: fullAddress,
                postal_code: data.zonecode // 우편번호 저장
              }))
              setShowAddressSearch(false)
            },
            width: '100%',
            height: '100%'
          }).embed(container)
        }
      }, 100)
    } else {
      // 카카오맵 API가 로드되지 않은 경우
      toast.error('주소 검색 서비스를 불러올 수 없습니다')
    }
  }

  // 컴포넌트 마운트 시 카카오맵 API 로드
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.daum) {
      const script = document.createElement('script')
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
      script.async = true
      document.head.appendChild(script)

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script)
        }
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      {!selectMode && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">내 배송지 관리</h3>
          {addresses.length < 5 && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
            >
              <PlusIcon className="w-4 h-4" />
              새 배송지 추가 ({addresses.length}/5)
            </button>
          )}
        </div>
      )}

      {/* 선택 모드에서도 주소 추가 버튼 */}
      {selectMode && addresses.length < 5 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
          >
            <PlusIcon className="w-4 h-4" />
            새 배송지 추가 ({addresses.length}/5)
          </button>
        </div>
      )}

      {/* 주소 목록 */}
      <div className="space-y-3">
        {addresses.map((address) => {
          const Icon = getIcon(address.label)
          const isEditing = editingId === address.id
          const isSelected = selectedAddressId === address.id

          return (
            <div
              key={address.id}
              className={`border rounded-lg p-4 transition-all ${
                selectMode
                  ? isSelected
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                  : 'border-gray-200'
              }`}
              onClick={() => selectMode && handleSelectAddress(address)}
            >
              {isEditing ? (
                // 수정 폼
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="배송지명 (예: 집, 회사)"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="주소를 검색해주세요"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 pr-20 border rounded-lg text-sm"
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={openAddressSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                    >
                      검색
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="상세주소 (선택)"
                    value={formData.detail_address}
                    onChange={(e) => setFormData({ ...formData, detail_address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateAddress(address.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null)
                        setFormData({ label: '', address: '', detail_address: '', postal_code: '' })
                      }}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg text-sm"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                // 주소 표시
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{address.label}</span>
                          {address.is_default && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                              기본
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {address.postal_code && <span className="text-gray-500">({address.postal_code}) </span>}
                          {address.address}
                        </p>
                        {address.detail_address && (
                          <p className="text-sm text-gray-500">{address.detail_address}</p>
                        )}
                      </div>
                    </div>

                    {selectMode ? (
                      isSelected && <CheckCircleSolidIcon className="w-5 h-5 text-red-500" />
                    ) : (
                      // 관리 버튼들
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(address)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        {!address.is_default && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(address.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetDefault(address.id)}
                              className="p-1 text-gray-400 hover:text-green-600"
                              title="기본으로 설정"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 새 주소 추가 폼 */}
      {showAddForm && (
        <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50">
          <input
            type="text"
            placeholder="배송지명 (예: 집, 회사)"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          <div className="relative">
            <input
              type="text"
              placeholder="주소를 검색해주세요"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 pr-20 border rounded-lg text-sm"
              readOnly
            />
            <button
              type="button"
              onClick={openAddressSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
            >
              검색
            </button>
          </div>
          <input
            type="text"
            placeholder="상세주소 (선택)"
            value={formData.detail_address}
            onChange={(e) => setFormData({ ...formData, detail_address: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddAddress}
              className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setFormData({ label: '', address: '', detail_address: '', postal_code: '' })
              }}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg text-sm"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {addresses.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-gray-500">
          <MapPinIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">등록된 배송지가 없습니다</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-2 text-red-500 text-sm hover:text-red-600"
          >
            첫 배송지 추가하기
          </button>
        </div>
      )}

      {/* 주소 검색 모달 */}
      {showAddressSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white w-full h-full md:max-w-[500px] md:h-[600px] rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">주소 검색</h3>
              <button
                onClick={() => setShowAddressSearch(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div id="address-search-container" className="flex-1"></div>
          </div>
        </div>
      )}
    </div>
  )
}