/**
 * AddressSection - 배송지 관리 섹션
 * @author Claude
 * @since 2025-10-24
 *
 * Presentation Layer: UI + AddressManager wrapper
 */

'use client'

import AddressManager from '@/app/components/address/AddressManager'
import toast from 'react-hot-toast'
import useAuthStore from '@/app/stores/authStore'

export default function AddressSection({ userProfile, user, userSession, onProfileUpdate }) {
  if (!userProfile) return null

  const handleAddressesChange = async (newAddresses) => {
    try {
      const currentUser = userSession || user
      if (!currentUser?.id) return

      // API Route로 업데이트
      const response = await fetch('/api/profile/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id,
          profileData: { addresses: newAddresses }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '주소 저장 실패')
      }

      await response.json()

      // 프로필 상태 업데이트 (부모 컴포넌트에 알림)
      if (onProfileUpdate) {
        onProfileUpdate({ addresses: newAddresses })
      }

      // authStore 캐시 업데이트
      useAuthStore.getState().updateProfile({ addresses: newAddresses })

      // ⚡ 이벤트 발생 → useAuth가 sessionStorage 자동 동기화
      window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: { field: 'addresses', value: newAddresses }
      }))

    } catch (error) {
      toast.error(`주소 저장에 실패했습니다: ${error.message}`)
    }
  }

  const addresses = (() => {
    // addresses 배열이 비어있지만 기본 주소가 있는 경우 자동 변환
    if ((!userProfile.addresses || userProfile.addresses.length === 0) && userProfile.address) {
      return [{
        id: Date.now(),
        label: '기본 배송지',
        address: userProfile.address,
        detail_address: userProfile.detail_address || '',
        postal_code: userProfile.postal_code || '',
        is_default: true
      }]
    }
    return userProfile.addresses || []
  })()

  return (
    <div className="bg-white mt-4">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">배송지 관리</h2>
        <p className="text-sm text-gray-500 mt-1">최대 5개까지 배송지를 저장할 수 있습니다</p>
      </div>
      <div className="p-4">
        <AddressManager
          addresses={addresses}
          onAddressesChange={handleAddressesChange}
        />
      </div>
    </div>
  )
}
