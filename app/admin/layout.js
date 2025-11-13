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
  XMarkIcon,
  CogIcon,
  DocumentTextIcon,
  TicketIcon,
  BuildingOfficeIcon,
  TagIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  CubeTransparentIcon
} from '@heroicons/react/24/outline'
import { AdminAuthProvider, useAdminAuth } from '@/hooks/useAdminAuthNew'
import toast from 'react-hot-toast'

function AdminLayoutContent({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAdminAuthenticated, loading, adminLogout, adminUser } = useAdminAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    console.log('🏠 AdminLayout useEffect:', {
      loading,
      isAdminAuthenticated,
      pathname
    })

    if (!loading && !isAdminAuthenticated && pathname !== '/admin/login') {
      console.log('❌ Layout에서 로그인으로 리다이렉트!')
      router.push('/admin/login')
    } else if (!loading && isAdminAuthenticated) {
      console.log('✅ Layout에서 인증 확인됨')
    }
  }, [isAdminAuthenticated, loading, pathname, router])

  const handleLogout = () => {
    if (window.confirm('로그아웃하시겠습니까?')) {
      adminLogout()
      toast.success('로그아웃되었습니다')
      router.push('/admin/login')
    }
  }

  const menuGroups = [
    {
      title: '운영 관리',
      items: [
        { href: '/admin', label: '대시보드', icon: HomeIcon },
        { href: '/admin/orders', label: '주문관리', icon: ClipboardDocumentListIcon },
        { href: '/admin/sales-summary', label: '품목별 판매', icon: ChartBarIcon },
        { href: '/admin/deposits', label: '입금확인', icon: BanknotesIcon },
        { href: '/admin/fulfillment', label: '배송팀 취합', icon: ClipboardDocumentCheckIcon },
        { href: '/admin/logistics', label: '물류팀 집계', icon: ArchiveBoxIcon },
        { href: '/admin/outbound', label: '출고 정보', icon: CubeTransparentIcon },
        { href: '/admin/shipping', label: '발송관리', icon: TruckIcon },
      ]
    },
    {
      title: '상품 관리',
      items: [
        { href: '/admin/products/catalog', label: '전체 상품 관리', icon: CubeIcon },
        { href: '/admin/products', label: '라이브 상품 관리', icon: VideoCameraIcon },
        { href: '/admin/broadcasts', label: '방송관리', icon: VideoCameraIcon },
      ]
    },
    {
      title: '기초 정보',
      items: [
        { href: '/admin/suppliers', label: '업체 관리', icon: BuildingOfficeIcon },
        { href: '/admin/categories', label: '카테고리 관리', icon: TagIcon },
        { href: '/admin/purchase-orders', label: '업체별 발주서', icon: DocumentTextIcon },
      ]
    },
    {
      title: '고객 관리',
      items: [
        { href: '/admin/customers', label: '고객관리', icon: UsersIcon },
        { href: '/admin/coupons', label: '쿠폰관리', icon: TicketIcon },
      ]
    },
    {
      title: '시스템',
      items: [
        { href: '/admin/admins', label: '관리자 관리', icon: ShieldCheckIcon },
        { href: '/admin/settings', label: '시스템설정', icon: CogIcon },
      ]
    },
  ]

  // 사이드바 메뉴 컴포넌트 (중복 제거)
  const SidebarContent = ({ onLinkClick }) => (
    <>
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
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="space-y-6">
          {menuGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <h3 className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {group.title}
              </h3>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href ||
                    (item.href === '/admin/products/catalog' && pathname.startsWith('/admin/products/catalog')) ||
                    (item.href === '/admin/coupons' && pathname.startsWith('/admin/coupons')) ||
                    (item.href === '/admin/suppliers' && pathname.startsWith('/admin/suppliers')) ||
                    (item.href === '/admin/categories' && pathname.startsWith('/admin/categories')) ||
                    (item.href === '/admin/admins' && pathname.startsWith('/admin/admins')) ||
                    (item.href === '/admin/fulfillment' && pathname.startsWith('/admin/fulfillment')) ||
                    (item.href === '/admin/logistics' && pathname.startsWith('/admin/logistics')) ||
                    (item.href === '/admin/sales-summary' && pathname.startsWith('/admin/sales-summary')) ||
                    (item.href === '/admin/outbound' && pathname.startsWith('/admin/outbound'))
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onLinkClick}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
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
    </>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isAdminAuthenticated && pathname !== '/admin/login') {
    console.log('🚫 Layout 렌더링 차단:', { isAdminAuthenticated, pathname })
    return null
  }

  if (pathname === '/admin/login') {
    return children
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      {/* Mobile Sidebar */}
      <motion.div
        initial={false}
        animate={{
          x: sidebarOpen ? 0 : -280
        }}
        className="md:hidden fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50"
      >
        <div className="flex flex-col h-full">
          <SidebarContent onLinkClick={() => setSidebarOpen(false)} />
        </div>
      </motion.div>

      {/* Desktop Sidebar - 항상 고정 */}
      <div className="hidden md:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-30">
        <div className="flex flex-col h-full">
          <SidebarContent onLinkClick={() => {}} />
        </div>
      </div>

      {/* Main content */}
      <div className="md:ml-64">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Bars3Icon className="w-6 h-6 text-gray-600" />
              </button>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                {menuGroups.flatMap(group => group.items).find(item => item.href === pathname)?.label || '관리자 대시보드'}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs md:text-sm text-gray-600 hidden sm:inline">
                {adminUser?.email || 'master@allok.world'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 md:p-4">
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
