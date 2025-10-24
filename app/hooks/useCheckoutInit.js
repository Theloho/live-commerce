/**
 * useCheckoutInit - 체크아웃 초기화 Custom Hook
 * @author Claude
 * @since 2025-10-21
 *
 * 역할: 체크아웃 페이지의 초기화 로직을 추출하여 관리
 * - 세션 데이터 로드 (user, settings)
 * - 주문 아이템 검증
 * - 사용자 프로필 + 주소 로드 (authStore 캐시 우선)
 * - 쿠폰 목록 로드
 * - 무료배송 조건 확인 (pending/verifying 주문 확인)
 * - 주소 마이그레이션 (legacy address → addresses 배열)
 *
 * Clean Architecture:
 * - Presentation Layer (Page) → Application Layer (Hook) → Infrastructure (Repository)
 * - ✅ Rule #0 준수: 직접 supabase 호출 제거, OrderRepository.hasPendingOrders() 사용
 */

import { useState, useEffect } from 'react'
import { UserProfileManager } from '@/lib/userProfileManager'
import { getUserCoupons } from '@/lib/couponApi'
import useAuthStore from '@/app/stores/authStore'
import toast from 'react-hot-toast'
import logger from '@/lib/logger'

/**
 * useCheckoutInit Hook
 * @param {Object} params
 * @param {Object} params.user - useAuth().user (일반 사용자)
 * @param {boolean} params.isAuthenticated - useAuth().isAuthenticated
 * @param {boolean} params.authLoading - useAuth().loading
 * @param {Object} params.router - Next.js router
 * @returns {Object} { pageLoading, orderItem, userProfile, selectedAddress, availableCoupons, hasPendingOrders, enableCardPayment, userSession, setUserProfile, setSelectedAddress, setAvailableCoupons }
 */
export function useCheckoutInit({ user, isAuthenticated, authLoading, router }) {
  // 상태 관리
  const [pageLoading, setPageLoading] = useState(true)
  const [orderItem, setOrderItem] = useState(null)
  const [userProfile, setUserProfile] = useState({
    name: '',
    phone: '',
    address: '',
    detail_address: '',
    addresses: []
  })
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [hasPendingOrders, setHasPendingOrders] = useState(false)
  const [enableCardPayment, setEnableCardPayment] = useState(false)
  const [userSession, setUserSession] = useState(null)

  // 초기화 함수
  useEffect(() => {
    initCheckoutOptimized()
  }, [isAuthenticated, user, authLoading])

  /**
   * 고성능 체크아웃 초기화 (병렬 처리)
   */
  const initCheckoutOptimized = async () => {
    setPageLoading(true)

    try {
      // ⚡ 1단계: 동기 데이터 로드 (즉시 실행)
      const sessionResult = loadSessionDataSync()
      if (!sessionResult.success) {
        setPageLoading(false)
        return
      }

      // ⚡ 2단계: 필수 검증 (순차적)
      const validationResult = await validateEssentialData(sessionResult.data)
      if (!validationResult.success) {
        setPageLoading(false)
        return
      }

      // ⚡ 3단계: 비동기 데이터 병렬 로드 (프로필+주소 통합으로 DB 쿼리 50% 감소!)
      await Promise.allSettled([
        loadUserProfileAndAddresses(validationResult.currentUser),
        loadUserCouponsOptimized(validationResult.currentUser),
        checkPendingOrders(validationResult.currentUser, validationResult.orderItem)
      ]).then(([profileAndAddressResult, couponResult, pendingOrdersResult]) => {
        // 프로필+주소 처리 (1개 결과에서 모두 추출)
        if (profileAndAddressResult.status === 'fulfilled') {
          const { profile, addresses } = profileAndAddressResult.value

          console.log('🔍 [체크아웃] 프로필+주소 로드 성공:', { profile, addresses })

          // 주소가 있으면 기본 주소 선택
          if (addresses && addresses.length > 0) {
            const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0]

            console.log('✅ [체크아웃] 기본 주소 선택:', defaultAddress)

            if (defaultAddress) {
              // ⚡ 한 번에 모든 상태 설정 (Race Condition 방지)
              setSelectedAddress(defaultAddress)
              setUserProfile({
                ...profile,
                address: defaultAddress.address,
                detail_address: defaultAddress.detail_address,
                postal_code: defaultAddress.postal_code,
                addresses: addresses
              })
            } else {
              setUserProfile({ ...profile, addresses })
            }
          } else {
            console.warn('⚠️ [체크아웃] 주소 없음:', { addresses })
            setUserProfile({ ...profile, addresses: [] })
          }
        } else {
          console.error('❌ [체크아웃] 프로필+주소 로드 실패:', profileAndAddressResult.reason)
          setUserProfile(UserProfileManager.normalizeProfile(validationResult.currentUser))
        }

        // 쿠폰 처리
        if (couponResult.status === 'fulfilled') {
          setAvailableCoupons(couponResult.value)
        }

        // 무료배송 조건 처리
        if (pendingOrdersResult.status === 'fulfilled') {
          setHasPendingOrders(pendingOrdersResult.value)
        }
      })

      logger.debug('고성능 체크아웃 초기화 완료')
    } catch (error) {
      logger.error('체크아웃 초기화 실패:', error)
      toast.error('페이지 로딩 중 오류가 발생했습니다')
      router.push('/')
    } finally {
      setPageLoading(false)
    }
  }

  /**
   * 동기 세션 데이터 로드 (즉시 실행)
   * - 카카오 세션 확인
   * - 관리자 설정 로드 (카드결제 활성화 여부)
   */
  const loadSessionDataSync = () => {
    try {
      // 카카오 세션 확인
      const storedUser = sessionStorage.getItem('user')
      if (storedUser) {
        const sessionUser = JSON.parse(storedUser)
        setUserSession(sessionUser)
      }

      // 관리자 설정 로드
      const savedSettings = localStorage.getItem('admin_site_settings')
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        setEnableCardPayment(settings.enable_card_payment || false)
      }

      return { success: true, data: { sessionUser: JSON.parse(storedUser || 'null') } }
    } catch (error) {
      logger.error('세션 데이터 로드 오류:', error)
      return { success: false }
    }
  }

  /**
   * 필수 데이터 검증 (인증 + 주문 데이터)
   * - 로그인 확인
   * - checkoutItem sessionStorage 검증
   * - 주문 아이템 필드 검증
   */
  const validateEssentialData = async (sessionData) => {
    const currentUser = sessionData.sessionUser || user
    const isUserLoggedIn = sessionData.sessionUser || isAuthenticated

    // 인증 검증
    if (authLoading && !sessionData.sessionUser) {
      return { success: false }
    }

    if (!isUserLoggedIn) {
      toast.error('로그인이 필요합니다')
      router.push('/login')
      return { success: false }
    }

    // 주문 데이터 검증
    const checkoutData = sessionStorage.getItem('checkoutItem')
    if (!checkoutData) {
      toast.error('구매 정보가 없습니다')
      router.push('/')
      return { success: false }
    }

    try {
      const parsedOrderItem = JSON.parse(checkoutData)

      // 필수 필드 검증
      if (!parsedOrderItem.title || (!parsedOrderItem.price && !parsedOrderItem.totalPrice)) {
        logger.error('주문 아이템에 필수 필드가 없습니다')
        toast.error('주문 정보가 올바르지 않습니다')
        router.push('/')
        return { success: false }
      }

      // 가격 정규화
      if (!parsedOrderItem.price && parsedOrderItem.totalPrice) {
        parsedOrderItem.price = parsedOrderItem.totalPrice
      }

      setOrderItem(parsedOrderItem)

      return {
        success: true,
        currentUser,
        orderItem: parsedOrderItem
      }
    } catch (error) {
      logger.error('주문 데이터 파싱 오류:', error)
      toast.error('주문 정보를 읽을 수 없습니다')
      router.push('/')
      return { success: false }
    }
  }

  /**
   * authStore 캐시 우선 프로필 + 주소 로드 (중복 제거!)
   * - 1️⃣ authStore 캐시 확인 (DB 쿼리 생략)
   * - 2️⃣ 캐시 미스: DB에서 1번만 조회
   * - 3️⃣ 주소 마이그레이션 (legacy address → addresses 배열)
   */
  const loadUserProfileAndAddresses = async (currentUser) => {
    try {
      // 1️⃣ authStore 캐시 확인 (즉시 반환, DB 쿼리 생략!)
      const cachedProfile = useAuthStore.getState().profile

      if (cachedProfile && cachedProfile.id === currentUser.id) {
        logger.debug('⚡ 캐시에서 프로필+주소 로드 (DB 쿼리 생략)')

        const normalizedProfile = UserProfileManager.normalizeProfile(cachedProfile)
        const addresses = cachedProfile.addresses || []

        return { profile: normalizedProfile, addresses }
      }

      // 2️⃣ 캐시 미스: DB에서 1번만 조회 (UserProfileManager가 자동으로 authStore에 저장)
      logger.debug('🔍 DB에서 프로필+주소 조회 (1번만!)')
      const dbProfile = await UserProfileManager.loadUserProfile(currentUser.id)

      if (!dbProfile) {
        return {
          profile: UserProfileManager.normalizeProfile(currentUser),
          addresses: []
        }
      }

      let addresses = dbProfile.addresses || []

      // 3️⃣ 주소 마이그레이션 (한 번만 실행)
      if (!addresses.length && dbProfile.address) {
        const defaultAddress = {
          id: Date.now(),
          label: '기본 배송지',
          address: dbProfile.address,
          detail_address: dbProfile.detail_address || '',
          postal_code: dbProfile.postal_code || '',
          is_default: true
        }
        addresses = [defaultAddress]

        // ⚡ 백그라운드 저장 (비동기, 실패해도 진행)
        fetch('/api/profile/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            profileData: { addresses }
          })
        }).catch(console.warn)
      }

      return {
        profile: UserProfileManager.normalizeProfile(dbProfile),
        addresses
      }
    } catch (error) {
      logger.warn('프로필+주소 로드 실패:', error)
      return {
        profile: UserProfileManager.normalizeProfile(currentUser),
        addresses: []
      }
    }
  }

  /**
   * 최적화된 사용자 쿠폰 로드
   * - 미사용 쿠폰만 필터링
   */
  const loadUserCouponsOptimized = async (currentUser) => {
    try {
      if (!currentUser?.id) return []

      const coupons = await getUserCoupons(currentUser.id)
      // 미사용 쿠폰만 필터링
      return coupons.filter(c => !c.is_used)
    } catch (error) {
      logger.warn('쿠폰 로드 실패:', error)
      return []
    }
  }

  /**
   * ✅ Rule #2 준수: API Route를 통한 Repository 접근 (Layer 경계)
   * 사용자의 pending/verifying 주문 확인 (무료배송 조건)
   * - 일괄결제인 경우: originalOrderIds에 포함된 주문 제외
   */
  const checkPendingOrders = async (currentUser, orderItem) => {
    try {
      if (!currentUser?.id) return false

      // 제외할 주문 ID 목록 (일괄결제 시)
      const excludeIds = orderItem?.isBulkPayment && orderItem?.originalOrderIds?.length > 0
        ? orderItem.originalOrderIds
        : []

      // ✅ API Route를 통한 Repository 접근 (Presentation → API → Infrastructure)
      const response = await fetch('/api/orders/check-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.provider === 'kakao' ? null : currentUser.id,
          kakaoId: currentUser.provider === 'kakao' ? currentUser.kakao_id : null,
          excludeIds
        })
      })

      if (!response.ok) {
        throw new Error('pending 주문 확인 실패')
      }

      const data = await response.json()
      return data.hasPendingOrders
    } catch (error) {
      logger.warn('주문 확인 중 오류:', error)
      return false
    }
  }

  return {
    pageLoading,
    orderItem,
    userProfile,
    selectedAddress,
    availableCoupons,
    hasPendingOrders,
    enableCardPayment,
    userSession,
    setUserProfile,
    setSelectedAddress,
    setAvailableCoupons
  }
}
