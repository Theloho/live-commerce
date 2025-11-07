'use client'

import { AdminAuthProvider } from '@/hooks/useAdminAuthNew'

export function Providers({ children }) {
  return (
    <AdminAuthProvider>
      {children}
    </AdminAuthProvider>
  )
}
