'use client'

import { useState, useEffect, createContext, useContext } from 'react'

const AdminAuthContext = createContext({})

export function AdminAuthProvider({ children }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('AdminAuth useEffect 실행')
    // 관리자 로그인 상태 확인
    const adminSession = localStorage.getItem('admin_session')
    console.log('저장된 세션:', adminSession)

    if (adminSession) {
      try {
        const session = JSON.parse(adminSession)
        console.log('파싱된 세션:', session)
        // 세션 유효성 검사 (24시간)
        const now = Date.now()
        const timeDiff = now - session.timestamp
        console.log('시간 차이:', timeDiff, '24시간:', 24 * 60 * 60 * 1000)

        if (timeDiff < 24 * 60 * 60 * 1000) {
          console.log('세션 유효 - 인증됨')
          setIsAdminAuthenticated(true)
        } else {
          console.log('세션 만료 - 제거')
          localStorage.removeItem('admin_session')
        }
      } catch (error) {
        console.log('세션 파싱 오류:', error)
        localStorage.removeItem('admin_session')
      }
    } else {
      console.log('세션 없음')
    }
    setLoading(false)
  }, [])

  const adminLogin = (username, password) => {
    console.log('adminLogin 호출:', username, password)
    // 하드코딩된 관리자 계정
    if (username === 'master@allok.world' && password === 'yi01buddy!!') {
      const session = {
        username: 'master@allok.world',
        timestamp: Date.now()
      }
      console.log('세션 생성:', session)
      localStorage.setItem('admin_session', JSON.stringify(session))
      console.log('localStorage에 저장됨:', localStorage.getItem('admin_session'))
      setIsAdminAuthenticated(true)
      console.log('인증 상태를 true로 설정')
      return true
    }
    console.log('로그인 실패')
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