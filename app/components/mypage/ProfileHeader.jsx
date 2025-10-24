/**
 * ProfileHeader - 마이페이지 헤더
 * @author Claude
 * @since 2025-10-24
 *
 * Presentation Layer: UI만
 */

'use client'

import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function ProfileHeader({ onBack }) {
  return (
    <div className="bg-white px-4 py-6 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="뒤로가기"
        >
          <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>
        <div className="w-10"></div> {/* 균형을 위한 빈 공간 */}
      </div>
    </div>
  )
}
