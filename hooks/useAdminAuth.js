'use client'

import { useState, useEffect, createContext, useContext } from 'react'

const AdminAuthContext = createContext({})

export function AdminAuthProvider({ children }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 관리자 로그인 상태 확인
    const adminSession = localStorage.getItem('admin_session')
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession)
        // 세션 유효성 검사 (24시간)
        const now = Date.now()
        if (now - session.timestamp < 24 * 60 * 60 * 1000) {
          setIsAdminAuthenticated(true)
        } else {
          localStorage.removeItem('admin_session')
        }
      } catch (error) {
        localStorage.removeItem('admin_session')
      }
    }
    setLoading(false)
  }, [])

  const adminLogin = (username, password) => {
    // 하드코딩된 관리자 계정
    if (username === 'master@allok.world' && password === 'yi01buddy!!') {
      const session = {
        username: 'master@allok.world',
        timestamp: Date.now()
      }
      localStorage.setItem('admin_session', JSON.stringify(session))
      setIsAdminAuthenticated(true)
      return true
    }
    return false
  }

  const adminLogout = () => {
    localStorage.removeItem('admin_session')
    setIsAdminAuthenticated(false)
  }

  return (
    <AdminAuthContext.Provider value={{
      isAdminAuthenticated,
      loading,
      adminLogin,
      adminLogout
    }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}