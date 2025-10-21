/**
 * ShippingForm - 배송지 정보 컴포넌트
 * @author Claude
 * @since 2025-10-21
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { MapPinIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

// Dynamic Import: AddressManager는 모달 열릴 때만 로드
const AddressManager = dynamic(() => import('@/app/components/address/AddressManager'), {
  loading: () => null,
  ssr: false
})

/**
 * ShippingForm 컴포넌트
 * @param {Object} props
 * @param {Object} props.userProfile - 사용자 프로필
 * @param {Object} props.selectedAddress - 선택된 주소
 * @param {Function} props.onAddressSelect - 주소 선택 콜백
 * @param {Function} props.onAddressesUpdate - 주소 목록 업데이트 콜백
 * @param {Object} props.user - 사용자 정보 (API 호출용)
 * @returns {JSX.Element}
 */
export default function ShippingForm({
  userProfile,
  selectedAddress,
  onAddressSelect,
  onAddressesUpdate,
  user
}) {
  const [showAddressModal, setShowAddressModal] = useState(false)

  const handleAddressesChange = async (newAddresses) => {
    try {
      console.log('📱 [배송지] 주소 업데이트 API 호출:', newAddresses)

      const response = await fetch('/api/profile/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          profileData: { addresses: newAddresses }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '주소 저장 실패')
      }

      console.log('✅ [배송지] 주소 업데이트 성공')

      // 부모 컴포넌트에 업데이트 알림
      onAddressesUpdate(newAddresses)

      toast.success('배송지가 저장되었습니다')
    } catch (error) {
      console.error('❌ [배송지] 주소 저장 실패:', error)
      toast.error(error.message || '주소 저장에 실패했습니다')
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg border border-gray-200 p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">배송지</h2>
          </div>
          <button
            onClick={() => setShowAddressModal(true)}
            className="text-sm text-red-500 hover:text-red-600"
          >
            변경
          </button>
        </div>

        {/* 선택된 주소 표시 */}
        {selectedAddress ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium text-gray-900">{userProfile.name}</p>
            <p className="text-gray-600">{userProfile.phone}</p>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 mb-1">{selectedAddress.label}</p>
              <p className="text-gray-600">
                {selectedAddress.postal_code && <span className="text-gray-500">[{selectedAddress.postal_code}] </span>}
                {selectedAddress.address}
                {selectedAddress.detail_address && <><br/>{selectedAddress.detail_address}</>}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm mb-2">배송지가 선택되지 않았습니다</p>
            <button
              onClick={() => setShowAddressModal(true)}
              className="text-red-500 hover:text-red-600 text-sm font-medium"
            >
              배송지 선택하기
            </button>
          </div>
        )}
      </motion.div>

      {/* 주소 선택 모달 */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">배송지 선택</h2>
              <button
                onClick={() => setShowAddressModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <AddressManager
              addresses={userProfile.addresses || []}
              selectMode={true}
              onAddressesChange={handleAddressesChange}
              onSelectAddress={(addr) => {
                onAddressSelect(addr)
                setShowAddressModal(false)
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
