/**
 * ProfileMenu - 마이페이지 메뉴 (주문 내역, 쿠폰, 로그아웃)
 * @author Claude
 * @since 2025-10-24
 *
 * Presentation Layer: UI만
 */

'use client'

import { ShoppingBagIcon, TicketIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

export default function ProfileMenu({ onLogout, router }) {
  return (
    <div className="bg-white mt-4">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">메뉴</h2>
      </div>
      <div className="p-4 space-y-3">
        {/* 주문 내역 */}
        <button
          onClick={() => router.push('/orders')}
          className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ShoppingBagIcon className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">주문 내역</span>
          </div>
          <div className="text-gray-400">
            &rarr;
          </div>
        </button>

        {/* 내 쿠폰 */}
        <button
          onClick={() => router.push('/mypage/coupons')}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:from-blue-100 hover:to-purple-100 transition-colors border border-blue-200"
        >
          <div className="flex items-center gap-3">
            <TicketIcon className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-900">내 쿠폰</span>
          </div>
          <div className="text-blue-600 font-semibold">
            &rarr;
          </div>
        </button>

        {/* 로그아웃 */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          <span className="font-medium">로그아웃</span>
        </button>
      </div>
    </div>
  )
}
