'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MagnifyingGlassIcon,
  BellIcon,
  UserIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const router = useRouter()
  const { user, loading, signOut, isAuthenticated } = useAuth()

  const handleAuthAction = async () => {
    if (isAuthenticated) {
      // 로그아웃 확인 대화상자
      const confirmed = window.confirm('로그아웃하시겠습니까?')
      if (confirmed) {
        await signOut()
        toast.success('로그아웃되었습니다')
        router.push('/')
      }
    } else {
      router.push('/login')
    }
  }

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

            {/* Notification Icon */}
            <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors relative">
              <BellIcon className="h-6 w-6" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Auth Icon */}
            {!loading && (
              <button
                onClick={handleAuthAction}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                title={isAuthenticated ? '로그아웃' : '로그인'}
              >
                {isAuthenticated ? (
                  <ArrowRightOnRectangleIcon className="h-6 w-6" />
                ) : (
                  <UserIcon className="h-6 w-6" />
                )}
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