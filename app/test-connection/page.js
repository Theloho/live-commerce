'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ServerIcon,
  UserIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline'

export default function TestConnectionPage() {
  const [connectionStatus, setConnectionStatus] = useState({
    supabase: { status: 'testing', message: 'Supabase 연결 테스트 중...', details: null },
    auth: { status: 'testing', message: '인증 서비스 테스트 중...', details: null },
    database: { status: 'testing', message: '데이터베이스 테스트 중...', details: null },
    products: { status: 'testing', message: '상품 데이터 테스트 중...', details: null }
  })

  const [isLoading, setIsLoading] = useState(false)
  const [mockMode, setMockMode] = useState(false)

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    setIsLoading(true)

    // Supabase 클라이언트 기본 연결 테스트
    await testSupabaseClient()

    // 인증 서비스 테스트
    await testAuthService()

    // 데이터베이스 연결 테스트
    await testDatabase()

    // 상품 데이터 테스트
    await testProducts()

    setIsLoading(false)
  }

  const testSupabaseClient = async () => {
    try {
      // Mock 모드 확인
      const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      setMockMode(useMockData || !supabaseUrl || !supabaseKey)

      if (useMockData || !supabaseUrl || !supabaseKey) {
        setConnectionStatus(prev => ({
          ...prev,
          supabase: {
            status: 'warning',
            message: 'Mock 모드로 실행 중',
            details: {
              mode: 'Mock',
              reason: useMockData ? 'Mock 데이터 사용 설정됨' : 'Supabase 환경변수 없음',
              url: supabaseUrl || '설정되지 않음',
              hasKey: !!supabaseKey
            }
          }
        }))
      } else {
        // 실제 Supabase 연결 테스트
        const { data, error } = await supabase.auth.getSession()

        setConnectionStatus(prev => ({
          ...prev,
          supabase: {
            status: error ? 'error' : 'success',
            message: error ? `Supabase 연결 실패: ${error.message}` : 'Supabase 연결 성공',
            details: {
              mode: 'Real',
              url: supabaseUrl,
              hasKey: !!supabaseKey,
              session: !!data.session
            }
          }
        }))
      }
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        supabase: {
          status: 'error',
          message: `연결 오류: ${error.message}`,
          details: { error: error.toString() }
        }
      }))
    }
  }

  const testAuthService = async () => {
    try {
      const { data, error } = await supabase.auth.getSession()

      setConnectionStatus(prev => ({
        ...prev,
        auth: {
          status: error ? 'error' : 'success',
          message: error
            ? `인증 서비스 오류: ${error.message}`
            : mockMode
              ? 'Mock 인증 서비스 정상 작동'
              : '인증 서비스 정상 작동',
          details: {
            hasSession: !!data?.session,
            user: data?.session?.user ? {
              id: data.session.user.id,
              email: data.session.user.email
            } : null,
            mode: mockMode ? 'Mock' : 'Real'
          }
        }
      }))
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        auth: {
          status: 'error',
          message: `인증 테스트 실패: ${error.message}`,
          details: { error: error.toString() }
        }
      }))
    }
  }

  const testDatabase = async () => {
    try {
      // 간단한 테이블 조회 테스트 (존재하지 않아도 됨)
      const { data, error } = await supabase
        .from('products')
        .select('count')
        .limit(1)

      setConnectionStatus(prev => ({
        ...prev,
        database: {
          status: mockMode ? 'warning' : (error && error.code !== 'PGRST116' ? 'error' : 'success'),
          message: mockMode
            ? 'Mock 데이터베이스 사용 중'
            : error && error.code !== 'PGRST116'
              ? `데이터베이스 오류: ${error.message}`
              : '데이터베이스 연결 성공',
          details: {
            mode: mockMode ? 'Mock' : 'Real',
            error: error ? {
              code: error.code,
              message: error.message,
              hint: error.hint
            } : null,
            dataLength: data?.length || 0
          }
        }
      }))
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        database: {
          status: 'error',
          message: `데이터베이스 테스트 실패: ${error.message}`,
          details: { error: error.toString() }
        }
      }))
    }
  }

  const testProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(5)

      const productCount = data?.length || 0

      setConnectionStatus(prev => ({
        ...prev,
        products: {
          status: error && error.code !== 'PGRST116' ? 'error' : productCount > 0 ? 'success' : 'warning',
          message: mockMode
            ? `Mock 상품 데이터 ${productCount}개 로드됨`
            : error && error.code !== 'PGRST116'
              ? `상품 데이터 오류: ${error.message}`
              : productCount > 0
                ? `상품 데이터 ${productCount}개 로드됨`
                : '상품 데이터 없음',
          details: {
            mode: mockMode ? 'Mock' : 'Real',
            count: productCount,
            products: data?.slice(0, 3).map(p => ({
              id: p.id,
              title: p.title,
              price: p.price
            })) || [],
            error: error ? {
              code: error.code,
              message: error.message
            } : null
          }
        }
      }))
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        products: {
          status: 'error',
          message: `상품 데이터 테스트 실패: ${error.message}`,
          details: { error: error.toString() }
        }
      }))
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
      default:
        return <ArrowPathIcon className="h-6 w-6 text-gray-400 animate-spin" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const testItems = [
    { key: 'supabase', title: 'Supabase 클라이언트', icon: ServerIcon },
    { key: 'auth', title: '인증 서비스', icon: UserIcon },
    { key: 'database', title: '데이터베이스', icon: ServerIcon },
    { key: 'products', title: '상품 데이터', icon: ShoppingBagIcon }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">연결 상태 테스트</h1>
          <p className="text-gray-600">Supabase 및 관련 서비스 연결 상태를 확인합니다</p>

          {mockMode && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                <p className="text-yellow-800 text-sm font-medium">
                  현재 Mock 모드로 실행 중입니다
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 테스트 버튼 */}
        <div className="mb-6">
          <button
            onClick={testConnection}
            disabled={isLoading}
            className="px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowPathIcon className="h-5 w-5" />
            )}
            {isLoading ? '테스트 중...' : '연결 테스트 다시 실행'}
          </button>
        </div>

        {/* 테스트 결과 */}
        <div className="space-y-4">
          {testItems.map((item) => {
            const status = connectionStatus[item.key]
            const IconComponent = item.icon

            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className={`border rounded-lg p-4 ${getStatusColor(status.status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <IconComponent className="h-6 w-6 text-gray-600 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                        {getStatusIcon(status.status)}
                      </div>
                      <p className="text-gray-700 mb-3">{status.message}</p>

                      {/* 상세 정보 */}
                      {status.details && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800 mb-2">
                            상세 정보 보기
                          </summary>
                          <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(status.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* 환경 정보 */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">환경 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Mock 데이터 사용:</span>
              <span className="ml-2 text-gray-600">
                {process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' ? '활성화' : '비활성화'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Supabase URL 설정:</span>
              <span className="ml-2 text-gray-600">
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? '설정됨' : '설정되지 않음'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Supabase Key 설정:</span>
              <span className="ml-2 text-gray-600">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '설정됨' : '설정되지 않음'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">개발 모드:</span>
              <span className="ml-2 text-gray-600">
                {process.env.NODE_ENV === 'development' ? '개발' : '운영'}
              </span>
            </div>
          </div>
        </div>

        {/* 홈으로 돌아가기 */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 text-red-600 hover:text-red-700 font-medium"
          >
            ← 홈으로 돌아가기
          </Link>
        </div>
      </motion.div>
    </div>
  )
}