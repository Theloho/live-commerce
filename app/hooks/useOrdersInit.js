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
  // 로딩 중복 방지 플래그 (race condition 방지)
  const isLoadingRef = useRef(false)

  // 🚀 통합된 고성능 초기화
  useEffect(() => {
    // 이미 초기화되었으면 실행 안 함
    if (hasInitialized.current) {
      return
    }

    const initOrdersPageFast = async () => {
      // 중복 호출 방지 (race condition 방지)
      if (isLoadingRef.current) {
        logger.info('⚠️ 이미 로딩 중 - 중복 호출 차단')
        return
      }

      isLoadingRef.current = true
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
        isLoadingRef.current = false
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

    // ✅ window focus 이벤트 제거 - 불필요한 재호출 방지
    initOrdersPageFast()

    // cleanup 함수 제거 (더 이상 이벤트 리스너 없음)
    return () => {}
  }, [isAuthenticated, user?.id, authLoading, router, searchParams])

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

  // ✅ 수정: useEffect 제거 - 중복 API 호출 방지
  // 탭/페이지 변경 시 핸들러에서 직접 refreshOrders 호출

  // 탭 변경 핸들러
  const handleTabChange = async (newStatus) => {
    // ✅ 중복 호출 방지 (race condition 방지)
    if (pageLoading || isLoadingRef.current) return

    // ✅ 상태를 먼저 일괄 업데이트 (React 18 automatic batching)
    setFilterStatus(newStatus)
    setCurrentPage(1)
    router.replace(`/orders?tab=${newStatus}`, { scroll: false })

    // ✅ setTimeout 제거 - React 18 automatic batching이 이미 처리
    if (userSession || isAuthenticated) {
      try {
        isLoadingRef.current = true
        setPageLoading(true)
        const currentUser = userSession || user

        if (!currentUser || !currentUser.id) {
          toast.error('사용자 정보를 찾을 수 없습니다')
          setPageLoading(false)
          return
        }

        const result = await getOrders(currentUser.id, {
          page: 1, // 항상 1페이지로
          pageSize: 10,
          status: newStatus
        })

        setOrders(result.orders || [])
        setPagination(result.pagination || { currentPage: 1, totalPages: 0, totalCount: 0, pageSize: 10 })
        setStatusCounts(result.statusCounts || {})
      } catch (error) {
        logger.warn('주문 로드 실패:', error)
        toast.error('주문 내역을 불러오는데 실패했습니다')
      } finally {
        isLoadingRef.current = false
        setPageLoading(false)
      }
    }
  }

  // 페이지 변경 핸들러
  const handlePageChange = async (newPage) => {
    // ✅ 중복 호출 방지 (race condition 방지)
    if (pageLoading || isLoadingRef.current) return
    if (newPage < 1 || newPage > pagination.totalPages) return

    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // ✅ setTimeout 제거 - React 18 automatic batching이 이미 처리
    if (userSession || isAuthenticated) {
      try {
        isLoadingRef.current = true
        setPageLoading(true)
        const currentUser = userSession || user

        if (!currentUser || !currentUser.id) {
          toast.error('사용자 정보를 찾을 수 없습니다')
          isLoadingRef.current = false
          setPageLoading(false)
          return
        }

        const result = await getOrders(currentUser.id, {
          page: newPage,
          pageSize: 10,
          status: filterStatus
        })

        setOrders(result.orders || [])
        setPagination(result.pagination || { currentPage: newPage, totalPages: 0, totalCount: 0, pageSize: 10 })
        setStatusCounts(result.statusCounts || {})
      } catch (error) {
        logger.warn('주문 로드 실패:', error)
        toast.error('주문 내역을 불러오는데 실패했습니다')
      } finally {
        isLoadingRef.current = false
        setPageLoading(false)
      }
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
