'use client'

import { useState, useEffect } from 'react'

export default function SimpleAdminTest() {
  const [sessionCheck, setSessionCheck] = useState('checking...')

  useEffect(() => {
    console.log('Simple test - checking localStorage')

    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('admin_session')
      console.log('Simple test - session value:', session)

      if (session === 'master_admin') {
        setSessionCheck('✅ localStorage 세션 인식됨!')
      } else {
        setSessionCheck(`❌ localStorage 세션 없음: ${session}`)
      }
    } else {
      setSessionCheck('❌ window 객체 없음')
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
        <h1 className="text-2xl font-bold mb-4">Admin 테스트 페이지</h1>
        <p className="text-lg mb-4">{sessionCheck}</p>

        <div className="space-y-2 text-sm">
          <p><strong>localStorage.getItem(&apos;admin_session&apos;):</strong></p>
          <p className="bg-gray-100 p-2 rounded">
            {typeof window !== 'undefined' ? localStorage.getItem('admin_session') || 'null' : 'window 없음'}
          </p>

          <p><strong>localStorage.getItem(&apos;admin_email&apos;):</strong></p>
          <p className="bg-gray-100 p-2 rounded">
            {typeof window !== 'undefined' ? localStorage.getItem('admin_email') || 'null' : 'window 없음'}
          </p>
        </div>

        <button
          onClick={() => {
            localStorage.setItem('admin_session', 'master_admin')
            window.location.reload()
          }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          세션 수동 설정 후 새로고침
        </button>
      </div>
    </div>
  )
}