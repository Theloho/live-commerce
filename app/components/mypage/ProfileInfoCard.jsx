/**
 * ProfileInfoCard - 사용자 정보 카드
 * @author Claude
 * @since 2025-10-24
 *
 * Presentation Layer: UI만
 */

'use client'

import { UserIcon } from '@heroicons/react/24/outline'

export default function ProfileInfoCard({ userProfile }) {
  if (!userProfile) return null

  return (
    <div className="bg-white mt-2 p-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <UserIcon className="w-8 h-8 text-red-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">
            {userProfile?.name || '사용자'}
          </h2>
          <p className="text-gray-600">
            {userProfile?.nickname || userProfile?.name || '닉네임 없음'}
          </p>
          <p className="text-sm text-gray-500">
            {userProfile?.phone || '전화번호 없음'}
          </p>
        </div>
      </div>
    </div>
  )
}
