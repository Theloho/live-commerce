'use client'

import { useState, useEffect, createContext, useContext } from 'react'

const AdminAuthContext = createContext({})

export function AdminAuthProvider({ children }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔍 AdminAuth 초기화 시작')
    // 관리자 로그인 상태 확인
    const adminSession = localStorage.getItem('admin_session')
    console.log('📦 localStorage 세션:', adminSession)

    if (adminSession) {
      try {
        const session = JSON.parse(adminSession)
        console.log('✅ 세션 파싱 성공:', session)
        // 세션 유효성 검사 (24시간)
        const now = Date.now()
        const timeDiff = now - session.timestamp
        console.log(`⏰ 시간 검사: ${timeDiff}ms / ${24 * 60 * 60 * 1000}ms`)

        if (timeDiff < 24 * 60 * 60 * 1000) {
          console.log('✅ 세션 유효 - 인증 성공')
          setIsAdminAuthenticated(true)
        } else {
          console.log('❌ 세션 만료 - 삭제')
          localStorage.removeItem('admin_session')
          setIsAdminAuthenticated(false)
        }
      } catch (error) {
        console.log('❌ 세션 파싱 실패:', error)
        localStorage.removeItem('admin_session')
        setIsAdminAuthenticated(false)
      }
    } else {
      console.log('❌ 세션 없음')
      setIsAdminAuthenticated(false)
    }
    setLoading(false)
    console.log('🏁 AdminAuth 초기화 완료')
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