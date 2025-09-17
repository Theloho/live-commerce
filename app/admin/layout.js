'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon,
  CubeIcon,
  VideoCameraIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  UsersIcon,
  TruckIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { AdminAuthProvider, useAdminAuth } from '@/hooks/useAdminAuth'
import toast from 'react-hot-toast'

function AdminLayoutContent({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAdminAuthenticated, loading, adminLogout } = useAdminAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !isAdminAuthenticated && pathname !== '/admin/login') {
      router.push('/admin/login')
    }
  }, [isAdminAuthenticated, loading, pathname, router])

  const handleLogout = () => {
    if (window.confirm('로그아웃하시겠습니까?')) {
      adminLogout()
      toast.success('로그아웃되었습니다')
      router.push('/admin/login')
    }
  }

  const menuItems = [
    { href: '/admin', label: '대시보드', icon: HomeIcon },
    { href: '/admin/products', label: '상품관리', icon: CubeIcon },
    { href: '/admin/broadcasts', label: '방송관리', icon: VideoCameraIcon },
    { href: '/admin/orders', label: '주문관리', icon: ClipboardDocumentListIcon },
    { href: '/admin/customers', label: '고객관리', icon: UsersIcon },
    { href: '/admin/deposits', label: '입금확인', icon: BanknotesIcon },
    { href: '/admin/shipping', label: '발송관리', icon: TruckIcon },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isAdminAuthenticated && pathname !== '/admin/login') {
    return null
  }

  if (pathname === '/admin/login') {
    return children
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          x: sidebarOpen ? 0 : -280
        }}
        className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50 md:translate-x-0 md:static md:z-auto"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h1 className="text-xl font-bold text-red-600">allok 관리자</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Menu */}
          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              로그아웃
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="md:ml-64">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Bars3Icon className="w-6 h-6 text-gray-600" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {menuItems.find(item => item.href === pathname)?.label || '관리자 대시보드'}
              </h2>
            </div>
            <div className="hidden md:block">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  )
}