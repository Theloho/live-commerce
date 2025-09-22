'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MagnifyingGlassIcon,
  BellIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import useAuth from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <h1 className="text-xl font-bold text-red-500">allok</h1>
          </Link>

          {/* Right side icons */}
          <div className="flex items-center space-x-2">
            {/* Search Icon */}
            <button
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <MagnifyingGlassIcon className="h-6 w-6" />
            </button>

            {/* Notification Icon - 로그인한 경우에만 표시 */}
            {isAuthenticated && (
              <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors relative">
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
            )}

            {/* User Icon or Login Button */}
            {isAuthenticated ? (
              <button
                onClick={() => router.push('/mypage')}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                <UserCircleIcon className="h-6 w-6" />
              </button>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                로그인
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        <motion.div
          initial={false}
          animate={{
            height: searchOpen ? 'auto' : 0,
            opacity: searchOpen ? 1 : 0
          }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="pb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="상품, 브랜드를 검색해보세요"
                className="w-full px-4 py-3 pl-12 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-base"
                autoFocus={searchOpen}
              />
              <MagnifyingGlassIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </motion.div>
      </div>
    </header>
  )
}