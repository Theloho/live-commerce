/**
 * useOrdersInit - 주문 내역 초기화 Custom Hook
 * @author Claude
 * @since 2025-10-21
 *
 * 역할: 주문 내역 페이지의 초기화 및 데이터 로드 로직 관리
 * - 세션 데이터 로드 (user)
 * - URL 파라미터 파싱 (tab)
 * - 인증 검증
 * - 주문 데이터 로드 (페이지네이션)
 * - 필터/페이지 변경 처리
 * - 포커스 새로고침
 *
 * Clean Architecture:
 * - Presentation Layer (Page) → Application Layer (Hook) → Infrastructure (Repository)
 * - ✅ Rule #0 준수: OrderRepository 사용 (직접 supabase 호출 제거)
 */

import { useState, useEffect, useRef } from 'react'
import { getOrders } from '@/lib/supabaseApi' // ⚠️ 임시로 유지, 향후 OrderRepository로 전환 예정
import toast from 'react-hot-toast'
import logger from '@/lib/logger'

/**
 * useOrdersInit Hook
 * @param {Object} params
 * @param {Object} params.user - useAuth().user
 * @param {boolean} params.isAuthenticated - useAuth().isAuthenticated
 * @param {boolean} params.authLoading - useAuth().loading
 * @param {Object} params.router - Next.js router
 * @param {Object} params.searchParams - useSearchParams()
 * @returns {Object} { orders, pageLoading, filterStatus, pagination, statusCounts, currentPage, userSession, handleTabChange, handlePageChange, refreshOrders }
 */
export function useOrdersInit({ user, isAuthenticated, authLoading, router, searchParams }) {
  // 상태 관리
  const [orders, setOrders] = useState([])
  const [pageLoading, setPageLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({ totalPages: 0, totalCount: 0, pageSize: 10 })
  const [statusCounts, setStatusCounts] = useState({})
  const [userSession, setUserSession] = useState(null)

  // 초기화 완료 플래그
  const hasInitialized = useRef(false)

  // 🚀 통합된 고성능 초기화
  useEffect(() => {
    // 이미 초기화되었으면 실행 안 함
    if (hasInitialized.current) {
      return
    }

    const initOrdersPageFast = async () => {
      setPageLoading(true)

      try {
        // ⚡ 1단계: 동기 데이터 로드
        const sessionData = loadSessionDataSync()
        const urlData = parseUrlParameters()

        // ⚡ 2단계: 인증 검증
        const authResult = validateAuthenticationFast(sessionData)

        if (!authResult.success) {
          hasInitialized.current = true
          setPageLoading(false)
          return
        }

        // ⚡ 3단계: 주문 데이터 병렬 로드
        await loadOrdersDataFast(authResult.currentUser)

        logger.info('✅ 주문내역 고속 초기화 완료')
      } catch (error) {
        logger.error('주문내역 초기화 실패:', error)
        toast.error('주문내역을 불러오는 중 오류가 발생했습니다')
        setOrders([])
      } finally {
        hasInitialized.current = true
        setPageLoading(false)
      }
    }

    // 🔧 동기 세션 데이터 로드
    const loadSessionDataSync = () => {
      try {
        if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
          return { sessionUser: null }
        }

        const storedUser = sessionStorage.getItem('user')
        let sessionUser = null
        if (storedUser) {
          sessionUser = JSON.parse(storedUser)
          setUserSession(sessionUser)
        }
        return { sessionUser }
      } catch (error) {
        logger.warn('세션 로드 실패:', error)
        setUserSession(null)
        return { sessionUser: null }
      }
    }

    // 🔧 URL 파라미터 분석
    const parseUrlParameters = () => {
      const tab = searchParams.get('tab')
      if (tab && ['pending', 'verifying', 'paid', 'delivered'].includes(tab)) {
        setFilterStatus(tab)
      }
      return { tab }
    }

    // 🔒 인증 검증
    const validateAuthenticationFast = ({ sessionUser }) => {
      if (sessionUser?.id) {
        return { success: true, currentUser: sessionUser }
      }

      if (user?.id) {
        return { success: true, currentUser: user }
      }

      if (!authLoading) {
        toast.error('로그인이 필요합니다')
        router.push('/login')
        return { success: false }
      }

      return { success: false }
    }

    // ⚡ 주문 데이터 고속 로드
    const loadOrdersDataFast = async (currentUser) => {
      try {
        console.log('🔍 [DEBUG] 주문 로딩 시작:', { userId: currentUser.id, page: currentPage, status: filterStatus })
        const startTime = Date.now()

        // 🚀 통합 API 사용 (페이지네이션 포함)
        // ⚠️ TODO: OrderRepository.findByUser()로 전환 필요
        const result = await getOrders(currentUser.id, {
          page: currentPage,
          pageSize: 10,
          status: filterStatus
        })

        const elapsed = Date.now() - startTime
        console.log('✅ [DEBUG] 주문 로딩 완료:', { count: result.orders?.length, elapsed: `${elapsed}ms` })

        setOrders(result.orders || [])
        setPagination(result.pagination || { currentPage: 1, totalPages: 0, totalCount: 0, pageSize: 10 })
        setStatusCounts(result.statusCounts || {})
        return result.orders
      } catch (error) {
        logger.error('주문 데이터 로드 오류:', error)
        setOrders([])
        setPagination({ currentPage: 1, totalPages: 0, totalCount: 0, pageSize: 10 })
        setStatusCounts({})
        throw error
      }
    }

    // 포커스 이벤트 리스너
    const setupFocusRefresh = () => {
      const handleFocus = () => {
        if (!pageLoading && (userSession || isAuthenticated)) {
          loadOrdersDataFast(userSession || user).catch(err => logger.warn('주문 새로고침 실패:', err))
        }
      }

      window.addEventListener('focus', handleFocus)
      return () => window.removeEventListener('focus', handleFocus)
    }

    const cleanup = setupFocusRefresh()
    initOrdersPageFast()

    return cleanup
  }, [isAuthenticated, user, authLoading, router, searchParams])

  // ⚡ 주문 새로고침 함수
  const refreshOrders = async () => {
    try {
      if (!pageLoading && (userSession || isAuthenticated)) {
        const currentUser = userSession || user
        if (currentUser?.id) {
          setPageLoading(true)

          // ⚠️ TODO: OrderRepository.findByUser()로 전환 필요
          const result = await getOrders(currentUser.id, {
            page: currentPage,
            pageSize: 10,
            status: filterStatus
          })

          setOrders(result.orders || [])
          setPagination(result.pagination || { currentPage: 1, totalPages: 0, totalCount: 0, pageSize: 10 })
          setStatusCounts(result.statusCounts || {})
          setPageLoading(false)
        }
      }
    } catch (error) {
      logger.warn('주문 새로고침 실패:', error)
      setPageLoading(false)
    }
  }

  // 페이지나 필터 변경 시 데이터 다시 로드
  useEffect(() => {
    if (!pageLoading && (userSession || isAuthenticated)) {
      refreshOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filterStatus])

  // 탭 변경 핸들러
  const handleTabChange = (newStatus) => {
    setFilterStatus(newStatus)
    setCurrentPage(1)
    router.replace(`/orders?tab=${newStatus}`, { scroll: false })
  }

  // 페이지 변경 핸들러
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return {
    orders,
    pageLoading,
    filterStatus,
    pagination,
    statusCounts,
    currentPage,
    userSession,
    handleTabChange,
    handlePageChange,
    refreshOrders,
    setOrders // 주문 취소 후 업데이트용
  }
}
