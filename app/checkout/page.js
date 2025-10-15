'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  MapPinIcon,
  TruckIcon,
  CreditCardIcon,
  InformationCircleIcon,
  TicketIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import useAuth from '@/hooks/useAuth'
import CardPaymentModal from '@/app/components/common/CardPaymentModal'
import { supabase } from '@/lib/supabase'
import AddressManager from '@/app/components/address/AddressManager'
import { createOrder, updateMultipleOrderStatus, updateOrderStatus } from '@/lib/supabaseApi'
import { UserProfileManager } from '@/lib/userProfileManager'
import { formatShippingInfo } from '@/lib/shippingUtils'
import { getUserCoupons, validateCoupon, applyCouponUsage } from '@/lib/couponApi'
import { OrderCalculations } from '@/lib/orderCalculations'
import toast from 'react-hot-toast'
import logger from '@/lib/logger'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()

  // 🔍 RLS 디버그: auth.uid() 확인
  useEffect(() => {
    const checkAuthSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      console.log('🔍 [체크아웃] Auth 세션 상태:', {
        hasSession: !!sessionData?.session,
        authUid: sessionData?.session?.user?.id || 'NULL',
        sessionStorageUser: sessionStorage.getItem('user') ? 'EXISTS' : 'NULL',
        isAuthenticated,
        userFromHook: user?.id || 'NULL'
      })
    }
    checkAuthSession()
  }, [])
  const [orderItem, setOrderItem] = useState(null)
  const [userProfile, setUserProfile] = useState({
    name: '',
    phone: '',
    address: '',
    detail_address: '',
    addresses: []
  })
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [profileErrors, setProfileErrors] = useState({})
  const [pageLoading, setPageLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositName, setDepositName] = useState('')
  const [depositOption, setDepositOption] = useState('name')
  const [customDepositName, setCustomDepositName] = useState('')
  const [userSession, setUserSession] = useState(null)
  const [enableCardPayment, setEnableCardPayment] = useState(false) // 카드결제 활성화 여부

  // 쿠폰 관련 상태
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [selectedCoupon, setSelectedCoupon] = useState(null)
  const [showCouponList, setShowCouponList] = useState(false)

  // 무료배송 관련 상태
  const [hasPendingOrders, setHasPendingOrders] = useState(false)

  // 🔒 마이그레이션 완료 플래그 (리렌더링 없음)
  const migrationDone = useRef(false)

  // 🚀 통합된 초기화 - 모든 useEffect를 하나로 통합하여 성능 최적화
  useEffect(() => {
    const initCheckout = async () => {
      setPageLoading(true)

      try {
        // ⚡ 1단계: 동기 데이터 로드 (빠른 로컬 데이터)
        const sessionData = await loadSessionData()
        if (!sessionData) return // 필수 데이터 없으면 조기 종료

        // ⚡ 2단계: 비동기 데이터 병렬 로드 (API 호출들)
        await loadUserDataParallel(sessionData)

        logger.debug('체크아웃 초기화 완료')
      } catch (error) {
        console.error('❌ 체크아웃 초기화 실패:', error)
        toast.error('페이지 로딩 중 오류가 발생했습니다')
        router.push('/')
      } finally {
        setPageLoading(false)
      }
    }

    // 🔒 안전한 세션 데이터 로드
    const loadSessionData = () => {
      try {
        // 카카오 세션 확인
        const storedUser = sessionStorage.getItem('user')
        let sessionUser = null
        if (storedUser) {
          sessionUser = JSON.parse(storedUser)
          setUserSession(sessionUser)
        }

        // 관리자 설정 로드
        const savedSettings = localStorage.getItem('admin_site_settings')
        if (savedSettings) {
          const settings = JSON.parse(savedSettings)
          setEnableCardPayment(settings.enable_card_payment || false)
        }

        return { sessionUser }
      } catch (error) {
        console.error('세션 데이터 로드 오류:', error)
        setUserSession(null)
        return null
      }
    }

    // ⚡ 병렬 사용자 데이터 로드
    const loadUserDataParallel = async ({ sessionUser }) => {
      const currentUser = userSession || user
      const isUserLoggedIn = userSession || isAuthenticated

      // 인증 로딩 중이면 대기
      if (authLoading && !userSession) {
        return
      }

      if (!isUserLoggedIn) {
        toast.error('로그인이 필요합니다')
        router.push('/login')
        return
      }

      // 세션에서 구매 정보 가져오기
      const checkoutData = sessionStorage.getItem('checkoutItem')
      if (!checkoutData) {
        toast.error('구매 정보가 없습니다')
        router.push('/')
        return
      }

      try {
        const parsedOrderItem = JSON.parse(checkoutData)

        // 필수 필드 검증 (일괄결제의 경우 totalPrice만 있을 수 있음)
        if (!parsedOrderItem.title || (!parsedOrderItem.price && !parsedOrderItem.totalPrice)) {
          console.error('주문 아이템에 필수 필드가 없습니다:', parsedOrderItem)
          toast.error('주문 정보가 올바르지 않습니다')
          router.push('/')
          return
        }

        // price가 없으면 totalPrice를 사용
        if (!parsedOrderItem.price && parsedOrderItem.totalPrice) {
          parsedOrderItem.price = parsedOrderItem.totalPrice
        }

        setOrderItem(parsedOrderItem)
      } catch (error) {
        console.error('주문 데이터 파싱 오류:', error)
        toast.error('주문 정보를 읽을 수 없습니다')
        router.push('/')
        return
      }

      // 사용자 정보 가져오기
      if (currentUser) {
        // 먼저 사용자 프로필 로드
        let loadedProfile = null

        // 카카오 사용자인 경우 데이터베이스에서 최신 정보 가져오기 (중앙화 모듈 사용)
        if (currentUser.provider === 'kakao') {
          try {
            const dbProfile = await UserProfileManager.loadUserProfile(currentUser.id)

            if (dbProfile) {
              console.log('✅ 체크아웃: 카카오 사용자 프로필 로드 성공:', {
                name: dbProfile.name,
                phone: dbProfile.phone,
                hasAddress: !!dbProfile.address
              })

              // ✅ MyPage와 동일한 방식으로 프로필 객체 생성
              loadedProfile = {
                name: dbProfile.name || currentUser.name || '',
                phone: dbProfile.phone || currentUser.phone || '',
                nickname: dbProfile.nickname || currentUser.nickname || currentUser.name || '',
                address: dbProfile.address || '',
                detail_address: dbProfile.detail_address || '',
                addresses: dbProfile.addresses || [],
                postal_code: dbProfile.postal_code || ''
              }
            } else {
              console.warn('⚠️ 데이터베이스에서 프로필을 찾을 수 없음, currentUser 사용')
              loadedProfile = {
                name: currentUser.name || '',
                phone: currentUser.phone || '',
                nickname: currentUser.nickname || currentUser.name || '',
                address: currentUser.address || '',
                detail_address: currentUser.detail_address || '',
                addresses: currentUser.addresses || [],
                postal_code: currentUser.postal_code || ''
              }
            }
          } catch (error) {
            console.error('❌ 카카오 사용자 프로필 로드 실패:', error)
            // 오류 시 기본 프로필 사용
            loadedProfile = {
              name: currentUser.name || '',
              phone: currentUser.phone || '',
              nickname: currentUser.nickname || currentUser.name || '',
              address: currentUser.address || '',
              detail_address: currentUser.detail_address || '',
              addresses: currentUser.addresses || [],
              postal_code: currentUser.postal_code || ''
            }
          }
        } else {
          // 일반 사용자는 기존 로직 사용
          loadedProfile = UserProfileManager.normalizeProfile(currentUser)
        }

        // 프로필 설정
        console.log('🎯 체크아웃: 최종 로드된 프로필:', loadedProfile)
        setUserProfile(loadedProfile)

        // 주소 목록 불러오기 (중앙화 모듈 사용)
        try {
          const profile = await UserProfileManager.loadUserProfile(currentUser.id)

          if (profile) {
            let addresses = profile?.addresses || []

            // 📥 legacy address 마이그레이션 (addresses 배열이 비어있고, legacy 주소가 있을 때만 실행)
            if (!migrationDone.current && addresses.length === 0 && profile?.address) {
              const legacyAddress = {
                id: Date.now(),
                label: '기본 배송지',
                address: profile.address,
                detail_address: profile.detail_address || '',
                postal_code: profile.postal_code || '',
                is_default: true,
                created_at: new Date().toISOString()
              }
              addresses = [legacyAddress]

              // 마이그레이션된 주소를 데이터베이스에 저장 (중앙화 모듈 사용)
              await UserProfileManager.updateProfile(currentUser.id, { addresses })

              migrationDone.current = true // 완료 표시
            }

            if (addresses && addresses.length > 0) {
              // 기본 배송지 자동 선택
              const defaultAddress = addresses.find(addr => addr.is_default)
              if (defaultAddress) {
                setSelectedAddress(defaultAddress)
                // userProfile에도 주소 정보 반영 (우편번호 포함)
                setUserProfile(prev => ({
                  ...prev,
                  address: defaultAddress.address,
                  detail_address: defaultAddress.detail_address || '',
                  postal_code: defaultAddress.postal_code || ''
                }))
              } else if (addresses.length > 0) {
                // 기본 배송지가 없으면 첫 번째 주소 선택
                const firstAddress = addresses[0]
                setSelectedAddress(firstAddress)
                // userProfile에도 주소 정보 반영 (우편번호 포함)
                setUserProfile(prev => ({
                  ...prev,
                  address: firstAddress.address,
                  detail_address: firstAddress.detail_address || '',
                  postal_code: firstAddress.postal_code || ''
                }))
              }
            }
          }
        } catch (error) {
          console.error('주소 목록 로드 오류:', error)
        }
      } else {
        // 빈 프로필 설정
        setUserProfile({
          name: '',
          phone: '',
          address: '',
          detail_address: ''
        })
        setProfileErrors({ name: true, phone: true, address: true })
      }

      setPageLoading(false)
    }

    // 🚀 고성능 체크아웃 초기화 함수 (병렬 처리)
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

        // ⚡ 3단계: 비동기 데이터 병렬 로드 (가장 느린 부분 최적화!)
        await Promise.allSettled([
          loadUserProfileOptimized(validationResult.currentUser),
          loadUserAddressesOptimized(validationResult.currentUser),
          loadUserCouponsOptimized(validationResult.currentUser),
          checkPendingOrders(validationResult.currentUser)
        ]).then(([profileResult, addressResult, couponResult, pendingOrdersResult]) => {
          // 프로필 처리
          if (profileResult.status === 'fulfilled') {
            setUserProfile(profileResult.value)
          } else {
            console.warn('⚠️ 프로필 로드 실패, 기본값 사용')
            setUserProfile(UserProfileManager.normalizeProfile(validationResult.currentUser))
          }

          // 주소 처리
          if (addressResult.status === 'fulfilled' && addressResult.value?.length > 0) {
            const addresses = addressResult.value
            const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0]

            if (defaultAddress) {
              setSelectedAddress(defaultAddress)
              setUserProfile(prev => ({
                ...prev,
                address: defaultAddress.address,
                detail_address: defaultAddress.detail_address,
                addresses: addresses
              }))
            }
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
        console.error('❌ 체크아웃 초기화 실패:', error)
        toast.error('페이지 로딩 중 오류가 발생했습니다')
        router.push('/')
      } finally {
        setPageLoading(false)
      }
    }

    // 🔧 동기 세션 데이터 로드 (즉시 실행)
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
        console.error('세션 데이터 로드 오류:', error)
        return { success: false }
      }
    }

    // 🔒 필수 데이터 검증 (인증 + 주문 데이터)
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
          console.error('주문 아이템에 필수 필드가 없습니다:', parsedOrderItem)
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
        console.error('주문 데이터 파싱 오류:', error)
        toast.error('주문 정보를 읽을 수 없습니다')
        router.push('/')
        return { success: false }
      }
    }

    // ⚡ 최적화된 사용자 프로필 로드
    const loadUserProfileOptimized = async (currentUser) => {
      if (currentUser?.provider === 'kakao') {
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('kakao_id', currentUser.kakao_id)
          .single()

        return UserProfileManager.normalizeProfile(dbProfile || currentUser)
      }
      return UserProfileManager.normalizeProfile(currentUser)
    }

    // ⚡ 최적화된 사용자 주소 로드 (중앙화 모듈 사용)
    const loadUserAddressesOptimized = async (currentUser) => {
      try {
        const profile = await UserProfileManager.loadUserProfile(currentUser.id)
        if (!profile) return []

        let addresses = profile?.addresses || []

        // 주소 마이그레이션 (한 번만 실행)
        if (!addresses.length && profile?.address) {
          const defaultAddress = {
            id: Date.now(),
            label: '기본 배송지',
            address: profile.address,
            detail_address: profile.detail_address || '',
            is_default: true
          }
          addresses = [defaultAddress]

          // 백그라운드에서 마이그레이션 저장 (blocking 하지 않음)
          UserProfileManager.updateProfile(currentUser.id, { addresses })
            .catch(console.warn) // 실패해도 진행
        }

        return addresses
      } catch (error) {
        console.warn('주소 로드 실패:', error)
        return []
      }
    }

    // ⚡ 최적화된 사용자 쿠폰 로드
    const loadUserCouponsOptimized = async (currentUser) => {
      try {
        if (!currentUser?.id) return []

        const coupons = await getUserCoupons(currentUser.id)
        // 미사용 쿠폰만 필터링
        return coupons.filter(c => !c.is_used)
      } catch (error) {
        console.warn('쿠폰 로드 실패:', error)
        return []
      }
    }

    // ⚡ 사용자의 pending/verifying 주문 확인 (무료배송 조건)
    const checkPendingOrders = async (currentUser) => {
      try {
        if (!currentUser?.id) return false

        // 카카오 사용자의 경우 order_type으로 조회
        let query = supabase.from('orders').select('id, status')

        if (currentUser.provider === 'kakao') {
          // 카카오 사용자: order_type으로 조회
          query = query.or(`order_type.like.%KAKAO:${currentUser.kakao_id}%`)
        } else {
          // 일반 사용자: user_id로 조회
          query = query.eq('user_id', currentUser.id)
        }

        const { data, error } = await query.in('status', ['pending', 'verifying'])

        if (error) {
          console.warn('주문 확인 실패:', error)
          return false
        }

        console.log('🔍 무료배송 조건 확인:', {
          userId: currentUser.id,
          provider: currentUser.provider,
          pendingOrders: data?.length || 0,
          hasPendingOrders: (data?.length || 0) > 0
        })

        return (data?.length || 0) > 0
      } catch (error) {
        console.warn('주문 확인 중 오류:', error)
        return false
      }
    }

    // 🚀 새로운 고성능 초기화 함수 호출
    initCheckoutOptimized()
  }, [isAuthenticated, user, authLoading, router])

  // userProfile이 설정되면 프로필 완성도 체크
  useEffect(() => {
    if (userProfile) {
      // 프로필 완성도 체크
      const completeness = UserProfileManager.checkCompleteness(userProfile)
      if (!completeness.isComplete) {
        // 미완성 필드에 대한 에러 표시
        const errors = {}
        completeness.missingFields.forEach(field => {
          if (field === '이름') errors.name = true
          if (field === '연락처') errors.phone = true
          if (field === '배송지 주소') errors.address = true
        })
        setProfileErrors(errors)
      } else {
        setProfileErrors({})
      }
    }
  }, [userProfile])

  if ((authLoading && !userSession) || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-800 font-medium text-lg mb-2">결제 준비 중</p>
          <p className="text-gray-500 text-sm">잠시만 기다려주세요...</p>

          {/* 🚀 진행 단계 표시 */}
          <div className="mt-6 max-w-xs mx-auto">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>인증확인</span>
              <span>주문정보</span>
              <span>사용자정보</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!orderItem || !userProfile) {
    return null
  }

  // 🧮 중앙화된 계산 모듈 사용
  // selectedAddress 우편번호 우선, 없으면 userProfile 우편번호 사용
  const postalCode = selectedAddress?.postal_code || userProfile.postal_code

  // ✅ 무료배송 조건: pending/verifying 주문이 있으면 배송비 무료 (도서산간 포함)
  const baseShippingFee = hasPendingOrders ? 0 : 4000
  const shippingInfo = formatShippingInfo(baseShippingFee, postalCode)  // ✅ 무료배송 조건 적용

  // OrderCalculations를 사용한 완전한 주문 계산
  const orderItems = orderItem.isBulkPayment
    ? [{ price: orderItem.totalPrice, quantity: 1, title: orderItem.title }]
    : [{ price: orderItem.price, quantity: orderItem.quantity, title: orderItem.title }]

  const orderCalc = OrderCalculations.calculateFinalOrderAmount(orderItems, {
    region: postalCode || 'normal',  // ✅ 우편번호 직접 전달 (shippingInfo.region → postalCode)
    coupon: selectedCoupon ? {
      type: selectedCoupon.coupon.discount_type,
      value: selectedCoupon.coupon.discount_value,
      maxDiscount: selectedCoupon.coupon.max_discount_amount,
      code: selectedCoupon.coupon.code
    } : null,
    paymentMethod: 'transfer'
  })

  const shippingFee = orderCalc.shippingFee
  const finalTotal = orderCalc.finalAmount
  // couponDiscount는 이미 state로 선언됨 (line 55)

  console.log('💰 체크아웃 주문 계산 (중앙화 모듈):', {
    postalCode,
    shippingInfo,
    orderCalc: orderCalc.breakdown
  })

  // 쿠폰 적용/해제 핸들러
  const handleApplyCoupon = async (userCoupon) => {
    try {
      // userCoupon 구조: { id, coupon: { code, name, ... } }
      const coupon = userCoupon.coupon

      // 🔒 쿠폰 데이터 검증 (RLS 문제로 JOIN 실패 시 대응)
      if (!coupon || !coupon.code || !coupon.discount_type || coupon.discount_value == null) {
        console.error('❌ 쿠폰 데이터 불완전:', userCoupon)
        toast.error('쿠폰 정보를 불러올 수 없습니다. 페이지를 새로고침해주세요.')
        return
      }

      // ✅ 수정: 쿠폰 목록 조회와 동일한 user_id 사용 (userSession 우선)
      const currentUser = userSession || user

      // DB 함수로 쿠폰 검증 (상품 금액만 전달, 배송비 제외)
      const result = await validateCoupon(coupon.code, currentUser?.id, orderItem.totalPrice)

      console.log('🎟️ validateCoupon 결과:', {
        code: coupon.code,
        userId: currentUser?.id,
        productAmount: orderItem.totalPrice,
        result: {
          is_valid: result.is_valid,
          discount_amount: result.discount_amount,
          error_message: result.error_message
        }
      })

      if (!result.is_valid) {
        toast.error(result.error_message || '쿠폰을 사용할 수 없습니다')
        console.log('❌ 쿠폰 검증 실패 - 주문 진행 중단')
        return
      }

      setSelectedCoupon(userCoupon)
      setShowCouponList(false)
      toast.success(`${coupon.name} 쿠폰이 적용되었습니다 (₩${result.discount_amount.toLocaleString()} 할인)`)

      logger.debug('🎟️ 쿠폰 적용 완료', {
        code: coupon.code,
        type: coupon.discount_type,
        discountAmount: result.discount_amount,
        productAmount: orderItem.totalPrice
      })
    } catch (error) {
      console.error('쿠폰 적용 실패:', error)
      toast.error('쿠폰 적용에 실패했습니다')
    }
  }

  const handleRemoveCoupon = () => {
    setSelectedCoupon(null)
    toast.success('쿠폰이 해제되었습니다')
  }

  const handleBankTransfer = () => {
    // ✨ 모달 열릴 때 기본값으로 고객 이름 설정 (확인 버튼 즉시 활성화)
    setDepositOption('name')
    setDepositName(userProfile.name)
    setCustomDepositName('')
    setShowDepositModal(true)
  }

  const confirmBankTransfer = async () => {
    // 📱 모바일 중복 실행 방지
    if (processing) {
      console.log('⚠️ 이미 처리 중입니다')
      return
    }

    if (!orderItem || !userProfile) {
      console.error('주문 정보 또는 사용자 정보가 없습니다')
      toast.error('주문 정보가 없습니다')
      return
    }

    if (!depositName) {
      toast.error('입금자명을 선택해주세요')
      return
    }

    // 배송지 선택 검증
    if (!selectedAddress) {
      toast.error('배송지를 선택해주세요')
      return
    }

    // ✅ 실제 사용될 데이터로 직접 검증 (selectedAddress 포함)
    const missing = []
    if (!userProfile.name || userProfile.name.trim().length === 0) {
      missing.push('이름')
    }
    if (!userProfile.phone || userProfile.phone.trim().length < 10) {
      missing.push('연락처')
    }
    if (!selectedAddress.address || selectedAddress.address.trim().length === 0) {
      missing.push('배송지 주소')
    }

    if (missing.length > 0) {
      toast.error(`다음 정보를 입력해주세요: ${missing.join(', ')}`)
      console.log('🔍 검증 실패:', {
        userProfile: {
          name: userProfile.name,
          phone: userProfile.phone
        },
        selectedAddress: {
          address: selectedAddress.address
        },
        missing
      })
      return
    }

    // 🔒 처리 시작
    setProcessing(true)

    try {
      const bankInfo = '카카오뱅크 79421940478 하상윤'
      let orderId

      // 일괄결제인 경우
      if (orderItem.isBulkPayment && orderItem.originalOrderIds && orderItem.originalOrderIds.length > 0) {
        logger.debug('일괄결제 처리 시작', { count: orderItem.originalOrderIds.length })

        // ✅ selectedAddress 직접 사용 (React setState 비동기 문제 해결)
        const finalAddress = selectedAddress || {
          address: userProfile.address,
          detail_address: userProfile.detail_address,
          postal_code: userProfile.postal_code
        }

        console.log('🏠 최종 배송지 확인:', {
          selectedAddress_postal_code: selectedAddress?.postal_code,
          userProfile_postal_code: userProfile.postal_code,
          finalAddress_postal_code: finalAddress.postal_code
        })

        // 원본 주문들을 'verifying' 상태로 업데이트 (계좌이체)
        const paymentUpdateData = {
          method: 'bank_transfer',
          depositorName: depositName,
          discountAmount: orderCalc.couponDiscount || 0, // ✅ 쿠폰 할인 추가
          shippingData: {
            shipping_name: userProfile.name,
            shipping_phone: userProfile.phone,
            shipping_address: finalAddress.address,
            shipping_detail_address: finalAddress.detail_address || '',
            shipping_postal_code: finalAddress.postal_code || ''
          }
        }

        console.log('📤 updateMultipleOrderStatus 전달 데이터:', {
          orderIds: orderItem.originalOrderIds,
          status: 'verifying',
          selectedCoupon_code: selectedCoupon?.coupon?.code,
          orderCalc_couponDiscount: orderCalc.couponDiscount,
          depositName: depositName,
          paymentUpdateData
        })

        const updateResult = await updateMultipleOrderStatus(
          orderItem.originalOrderIds,
          'verifying',
          paymentUpdateData
        )

        // 첫 번째 주문 ID를 사용 (일괄결제의 대표 ID)
        orderId = orderItem.originalOrderIds[0]

        // 주문 업데이트 이벤트 발생
        window.dispatchEvent(new CustomEvent('orderUpdated', {
          detail: { action: 'bulkPayment', orderIds: orderItem.originalOrderIds }
        }))
      } else {
        // 단일 주문 생성
        // ✅ selectedAddress 직접 사용 (React setState 비동기 문제 해결)
        const finalAddress = selectedAddress || {
          address: userProfile.address,
          detail_address: userProfile.detail_address,
          postal_code: userProfile.postal_code
        }

        const orderProfile = {
          ...userProfile,
          address: finalAddress.address,
          detail_address: finalAddress.detail_address,
          postal_code: finalAddress.postal_code
        }

        // ✅ DEBUG: 주문 생성 데이터 확인
        console.log('📦 주문 생성 데이터:', {
          selectedAddress: selectedAddress ? {
            postal_code: selectedAddress.postal_code,
            address: selectedAddress.address,
            detail_address: selectedAddress.detail_address
          } : null,
          userProfile: {
            postal_code: userProfile.postal_code,
            address: userProfile.address,
            detail_address: userProfile.detail_address
          },
          finalAddress: {
            postal_code: finalAddress.postal_code,
            address: finalAddress.address,
            detail_address: finalAddress.detail_address
          },
          orderProfile: {
            postal_code: orderProfile.postal_code,
            address: orderProfile.address,
            detail_address: orderProfile.detail_address
          },
          selectedCoupon: selectedCoupon ? {
            code: selectedCoupon.coupon.code,
            coupon_id: selectedCoupon.coupon_id
          } : null,
          couponDiscount: orderCalc.couponDiscount
        })

        // 쿠폰 할인 금액을 orderItem에 포함
        const orderItemWithCoupon = {
          ...orderItem,
          couponDiscount: orderCalc.couponDiscount || 0,
          couponCode: selectedCoupon?.coupon?.code || null
        }

        console.log('💰 주문 생성 데이터:', {
          selectedCoupon: selectedCoupon ? {
            code: selectedCoupon.coupon.code,
            discount_type: selectedCoupon.coupon.discount_type,
            discount_value: selectedCoupon.coupon.discount_value
          } : null,
          orderCalc: {
            itemsTotal: orderCalc.itemsTotal,
            couponDiscount: orderCalc.couponDiscount,
            couponApplied: orderCalc.couponApplied,
            finalAmount: orderCalc.finalAmount
          },
          orderItemWithCoupon: {
            couponDiscount: orderItemWithCoupon.couponDiscount,
            couponCode: orderItemWithCoupon.couponCode
          }
        })

        const newOrder = await createOrder(orderItemWithCoupon, orderProfile, depositName)
        orderId = newOrder.id
      }

      // 🔍 디버깅: 쿠폰 사용 처리 전 상태 확인
      console.log('🔍 [쿠폰 디버깅] 주문 생성 완료, 쿠폰 사용 처리 시작:', {
        selectedCoupon: selectedCoupon,
        hasCoupon: !!selectedCoupon,
        couponDiscount: orderCalc.couponDiscount,
        willProcess: selectedCoupon && orderCalc.couponDiscount > 0,
        couponId: selectedCoupon?.coupon_id,
        userId: selectedCoupon?.user_id,
        orderId: orderId
      })

      // 쿠폰 사용 처리
      if (selectedCoupon && orderCalc.couponDiscount > 0) {
        try {
          const currentUserId = selectedCoupon.user_id  // ✅ 쿠폰 소유자 ID 직접 사용

          console.log('🎟️ [쿠폰 디버깅] applyCouponUsage 호출:', {
            userId: currentUserId,
            couponId: selectedCoupon.coupon_id,
            orderId: orderId,
            discount: orderCalc.couponDiscount
          })

          const couponUsed = await applyCouponUsage(
            currentUserId,
            selectedCoupon.coupon_id,
            orderId,
            orderCalc.couponDiscount
          )

          console.log('🎟️ [쿠폰 디버깅] applyCouponUsage 결과:', couponUsed)

          if (couponUsed) {
            logger.debug('🎟️ 쿠폰 사용 완료', {
              coupon: selectedCoupon.coupon.code,
              discount: orderCalc.couponDiscount,
              orderId
            })
          } else {
            logger.warn('⚠️ 쿠폰 사용 처리 실패 (이미 사용됨)', {
              coupon: selectedCoupon.coupon.code
            })
          }
        } catch (error) {
          console.error('❌ [쿠폰 디버깅] 쿠폰 사용 처리 중 에러:', error)
          logger.error('❌ 쿠폰 사용 처리 중 오류:', error)
          // 쿠폰 사용 실패해도 주문은 진행
        }
      } else {
        console.log('⚠️ [쿠폰 디버깅] 쿠폰 사용 처리 건너뜀 - 조건 불충족')
      }

      // ✅ 주문 상태를 'verifying'으로 변경 (입금 확인중)
      try {
        await updateOrderStatus(orderId, 'verifying')
        logger.debug('🕐 주문 상태 변경: pending → verifying', { orderId })
      } catch (error) {
        logger.error('❌ 주문 상태 변경 실패:', error)
        // 상태 변경 실패해도 주문은 진행
      }

      // 계좌번호 복사 시도
      try {
        await navigator.clipboard.writeText('79421940478')
        toast.success('계좌번호가 복사되었습니다')
      } catch (error) {
        toast.success('계좌번호: 79421940478')
      }

      // 📱 모바일 호환성: 먼저 세션 정리 및 상태 업데이트
      sessionStorage.removeItem('checkoutItem')
      setShowDepositModal(false)

      // 📱 모바일 호환성: 즉시 리다이렉트 (setTimeout 제거)
      // 모바일 브라우저에서 setTimeout은 modal close animation과 충돌하여 실행되지 않을 수 있음
      toast.success('주문이 접수되었습니다', { duration: 2000 })

      // 🚀 즉시 페이지 이동 (모바일 환경에서 안정적)
      router.replace(`/orders/${orderId}/complete`)
    } catch (error) {
      console.error('계좌이체 처리 중 오류:', error)
      toast.error('주문 처리 중 오류가 발생했습니다')
      // 🔓 에러 시 processing 상태 해제
      setProcessing(false)
      setShowDepositModal(false)
    }
  }

  const handleCardPayment = () => {
    setShowCardModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">주문/결제</h1>
            <div className="w-10"></div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* 상품 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">
              {orderItem.isBulkPayment ? `주문 상품 (${orderItem.itemCount || 1}개)` : '주문 상품'}
            </h2>

            {orderItem.isBulkPayment ? (
              // 일괄결제 시 간단한 정보만 표시
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={orderItem.thumbnail_url || '/placeholder.png'}
                      alt={orderItem.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {orderItem.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-1">
                      총 {orderItem.quantity}개 상품
                    </p>
                    <p className="font-semibold text-gray-900">
                      ₩{orderItem.totalPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // 단일 상품 표시
              <div className="flex gap-3">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={orderItem.thumbnail_url || '/placeholder.png'}
                    alt={orderItem.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                    {orderItem.title}
                  </h3>

                  {/* 선택된 옵션 표시 */}
                  {orderItem.selectedOptions && Object.keys(orderItem.selectedOptions).length > 0 && (
                    <div className="mb-1">
                      {Object.entries(orderItem.selectedOptions).map(([optionId, value]) => (
                        <span
                          key={optionId}
                          className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mr-1 mb-1"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-sm text-gray-500 mb-1">
                    수량: {orderItem.quantity}개
                  </p>
                  <p className="font-semibold text-gray-900">
                    ₩{orderItem.totalPrice.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* 배송지 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-gray-600" />
                <h2 className="font-semibold text-gray-900">배송지</h2>
              </div>
              <button
                onClick={() => setShowAddressModal(true)}
                className="text-sm text-red-500 hover:text-red-600"
              >
                변경
              </button>
            </div>

            {/* 선택된 주소 표시 */}
            {selectedAddress ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-900">{userProfile.name}</p>
                <p className="text-gray-600">{userProfile.phone}</p>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900 mb-1">{selectedAddress.label}</p>
                  <p className="text-gray-600">
                    {selectedAddress.postal_code && <span className="text-gray-500">[{selectedAddress.postal_code}] </span>}
                    {selectedAddress.address}
                    {selectedAddress.detail_address && <><br/>{selectedAddress.detail_address}</>}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-2">배송지가 선택되지 않았습니다</p>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="text-red-500 hover:text-red-600 text-sm font-medium"
                >
                  배송지 선택하기
                </button>
              </div>
            )}
          </motion.div>

          {/* 주소 선택 모달 */}
          {showAddressModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">배송지 선택</h2>
                  <button
                    onClick={() => setShowAddressModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <AddressManager
                  addresses={userProfile.addresses || []}
                  selectMode={true}
                  onAddressesChange={async (newAddresses) => {
                    // 💾 중앙화 모듈로 DB 업데이트 + userProfile.addresses 동기화
                    const currentUser = userSession || user
                    const isKakaoUser = currentUser?.provider === 'kakao'

                    try {
                      const updatedData = { addresses: newAddresses }

                      // ✅ atomicProfileUpdate 사용 (addresses 필드 자동 저장)
                      await UserProfileManager.atomicProfileUpdate(
                        currentUser.id,
                        updatedData,
                        isKakaoUser
                      )

                      console.log('✅ 주소 DB 업데이트 성공 (atomicProfileUpdate)')

                      // ✅ userProfile.addresses 동기화 (모달 재오픈 시 새 주소 표시)
                      setUserProfile(prev => ({
                        ...prev,
                        addresses: newAddresses
                      }))

                      toast.success('배송지가 저장되었습니다')
                    } catch (error) {
                      console.error('❌ 주소 업데이트 실패:', error)
                      toast.error('주소 저장 중 오류가 발생했습니다')
                    }
                  }}
                  onSelect={(address) => {
                    // ✅ 동기적으로 즉시 반영 + addresses 보존 (prev 사용)
                    setSelectedAddress(address)
                    setUserProfile(prev => ({
                      ...prev,  // ✅ addresses 보존!
                      address: address.address,
                      detail_address: address.detail_address || '',
                      postal_code: address.postal_code || ''
                    }))
                    setShowAddressModal(false)
                    // ✨ 토스트 제거: 배송지 선택은 시각적으로 이미 확인 가능
                  }}
                />
              </div>
            </div>
          )}

          {/* 배송 옵션 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <TruckIcon className="h-5 w-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">배송 방법</h2>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">일반 택배</p>
                  <p className="text-sm text-gray-500">2-3일 소요</p>
                </div>
                <p className="font-medium text-gray-900">
                  {hasPendingOrders ? (
                    <span className="text-green-600">무료</span>
                  ) : (
                    `₩${shippingFee.toLocaleString()}`
                  )}
                </p>
              </div>
            </div>
            {hasPendingOrders ? (
              <div className="mt-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-1">
                  🎉 무료배송 혜택 적용!
                </p>
                <p className="text-xs text-green-700">
                  입금 대기 중인 주문이 있어 배송비가 무료입니다 (도서산간 포함)
                </p>
              </div>
            ) : shippingInfo.isRemote ? (
              <div className="mt-2 p-2 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-700">
                  🏝️ {shippingInfo.region} 지역은 추가 배송비 ₩{shippingInfo.surcharge.toLocaleString()}이 포함됩니다
                </p>
              </div>
            ) : (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 배송비 ₩{shippingInfo.baseShipping.toLocaleString()}이 추가됩니다
                </p>
              </div>
            )}
          </motion.div>

          {/* 쿠폰 적용 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <TicketIcon className="h-5 w-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">쿠폰</h2>
              {availableCoupons.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {availableCoupons.length}개 보유
                </span>
              )}
            </div>

            {selectedCoupon ? (
              // 적용된 쿠폰 표시
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-blue-600">
                        {selectedCoupon.coupon.code}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {selectedCoupon.coupon.discount_type === 'fixed_amount' ? '금액할인' : '퍼센트할인'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium">
                      {selectedCoupon.coupon.name}
                    </p>
                    <p className="text-lg font-bold text-red-500 mt-2">
                      -₩{orderCalc.couponDiscount.toLocaleString()} 할인
                    </p>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="p-1 hover:bg-white rounded-lg transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
            ) : availableCoupons.length > 0 ? (
              // 쿠폰 선택 버튼
              <button
                onClick={() => setShowCouponList(!showCouponList)}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <p className="text-sm text-gray-600">
                  쿠폰을 선택하면 할인 혜택을 받을 수 있습니다
                </p>
              </button>
            ) : (
              // 보유 쿠폰 없음
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-500">보유한 쿠폰이 없습니다</p>
              </div>
            )}

            {/* 쿠폰 리스트 */}
            {showCouponList && availableCoupons.length > 0 && (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {availableCoupons.map((userCoupon) => {
                  const coupon = userCoupon.coupon
                  const isExpired = new Date(coupon.valid_until) < new Date()

                  return (
                    <button
                      key={userCoupon.id}
                      onClick={() => !isExpired && handleApplyCoupon(userCoupon)}
                      disabled={isExpired}
                      className={`w-full p-3 border rounded-lg text-left transition-colors ${
                        isExpired
                          ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-blue-600 text-sm">
                              {coupon.code}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {coupon.discount_type === 'fixed_amount' ? '금액할인' : '퍼센트할인'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 font-medium">
                            {coupon.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm font-bold text-red-500">
                              {coupon.discount_type === 'fixed_amount'
                                ? `₩${coupon.discount_value.toLocaleString()}`
                                : `${coupon.discount_value}%`}
                            </p>
                            {coupon.min_purchase_amount > 0 && (
                              <span className="text-xs text-gray-500">
                                (최소 ₩{coupon.min_purchase_amount.toLocaleString()})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(coupon.valid_until).toLocaleDateString('ko-KR')}까지
                          </p>
                        </div>
                        {isExpired && (
                          <span className="text-xs text-red-500 font-medium">만료됨</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* 결제 방법 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <CreditCardIcon className="h-5 w-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">결제 방법</h2>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <InformationCircleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-yellow-800">계좌이체</p>
                  <p className="text-sm text-yellow-700">카카오뱅크 79421940478</p>
                  <p className="text-sm text-yellow-700">예금주: 하상윤</p>
                  <p className="text-xs text-yellow-600 mt-2">
                    주문 후 24시간 이내 입금해주세요
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 결제 금액 (중앙화된 계산 결과 표시) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">결제 금액</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">상품 금액</span>
                <span className="text-gray-900">₩{orderCalc.itemsTotal.toLocaleString()}</span>
              </div>
              {hasPendingOrders ? (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">배송비 (무료배송 혜택)</span>
                  <span className="text-green-600 line-through">₩0</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">기본 배송비</span>
                    <span className="text-gray-900">₩{shippingInfo.baseShipping.toLocaleString()}</span>
                  </div>
                  {shippingInfo.isRemote && (
                    <div className="flex justify-between text-sm">
                      <span className="text-orange-600">도서산간 추가비 ({shippingInfo.region})</span>
                      <span className="text-orange-600">+₩{shippingInfo.surcharge.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
              {orderCalc.couponApplied && orderCalc.couponDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">쿠폰 할인 ({selectedCoupon.coupon.code})</span>
                  <span className="text-blue-600">-₩{orderCalc.couponDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">총 결제금액</span>
                  <span className="text-xl font-bold text-red-500">
                    ₩{orderCalc.finalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 주의사항 */}
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 space-y-1">
            <p>• 입금자명은 주문자명과 동일하게 입력해주세요</p>
            <p>• 주문 후 24시간 이내 미입금 시 자동 취소됩니다</p>
            <p>• 입금 확인 후 배송이 시작됩니다</p>
          </div>
        </div>

        {/* 하단 결제 버튼들 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <div className="space-y-3">
            {/* 계좌이체 버튼 */}
            <button
              onClick={handleBankTransfer}
              disabled={!userProfile.name}
              className="w-full bg-blue-500 text-white font-semibold py-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              💳 계좌이체 (₩{finalTotal.toLocaleString()})
            </button>

            {/* 카드결제 버튼 - 관리자 설정에 따라 표시 */}
            {enableCardPayment ? (
              <>
                <button
                  onClick={handleCardPayment}
                  disabled={!userProfile.name}
                  className="w-full bg-green-500 text-white font-semibold py-4 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  💳 카드결제신청 (₩{(() => {
                    // 카드결제용 계산 (부가세 10% 추가)
                    const cardCalc = OrderCalculations.calculateFinalOrderAmount(orderItems, {
                      region: postalCode || 'normal',  // ✅ 우편번호 직접 전달
                      coupon: selectedCoupon ? {
                        type: selectedCoupon.coupon.discount_type,
                        value: selectedCoupon.coupon.discount_value,
                        maxDiscount: selectedCoupon.coupon.max_discount_amount,
                        code: selectedCoupon.coupon.code
                      } : null,
                      paymentMethod: 'card'
                    })
                    return cardCalc.finalAmount.toLocaleString()
                  })()})
                </button>

                <p className="text-xs text-gray-500 text-center">
                  카드결제는 부가세 10%가 추가됩니다
                </p>
              </>
            ) : (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                <p className="text-gray-600 text-sm">
                  💳 카드결제는 현재 서비스 점검 중입니다
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  계좌이체를 이용해 주세요
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Payment Modal */}
      <CardPaymentModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        totalAmount={finalTotal}
        productPrice={orderItem.totalPrice}
        shippingFee={shippingFee}
        orderItem={orderItem}
        userProfile={userProfile}
        selectedAddress={selectedAddress}
      />

      {/* 입금자명 선택 모달 */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg max-w-sm w-full mx-4 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">입금자명을 선택하세요</h3>

            <div className="space-y-3">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deposit"
                  value="name"
                  checked={depositOption === 'name'}
                  onChange={(e) => {
                    setDepositOption(e.target.value)
                    setDepositName(userProfile.name)
                  }}
                  className="mr-3 w-5 h-5 flex-shrink-0"
                  style={{
                    accentColor: '#dc2626',
                    width: '20px',
                    height: '20px',
                    minWidth: '20px',
                    cursor: 'pointer'
                  }}
                />
                <div>
                  <p className="font-medium text-gray-900">고객 이름</p>
                  <p className="text-sm text-gray-500">{userProfile.name}</p>
                </div>
              </label>

              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deposit"
                  value="nickname"
                  checked={depositOption === 'nickname'}
                  onChange={(e) => {
                    setDepositOption(e.target.value)
                    const currentUser = userSession || user
                    setDepositName(currentUser?.nickname || currentUser?.user_metadata?.nickname || userProfile.name)
                  }}
                  className="mr-3 w-5 h-5 flex-shrink-0"
                  style={{
                    accentColor: '#dc2626',
                    width: '20px',
                    height: '20px',
                    minWidth: '20px',
                    cursor: 'pointer'
                  }}
                />
                <div>
                  <p className="font-medium text-gray-900">닉네임</p>
                  <p className="text-sm text-gray-500">{(userSession || user)?.nickname || (userSession || user)?.user_metadata?.nickname || userProfile.name}</p>
                </div>
              </label>

              <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deposit"
                  value="custom"
                  checked={depositOption === 'custom'}
                  onChange={(e) => {
                    setDepositOption(e.target.value)
                    setDepositName(customDepositName)
                  }}
                  className="mr-3 mt-1 w-5 h-5 flex-shrink-0"
                  style={{
                    accentColor: '#dc2626',
                    width: '20px',
                    height: '20px',
                    minWidth: '20px',
                    cursor: 'pointer'
                  }}
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-2">다른 이름으로 입금</p>
                  <input
                    type="text"
                    placeholder="입금자명 입력"
                    value={customDepositName}
                    onChange={(e) => {
                      const value = e.target.value
                      setCustomDepositName(value)
                      // ✨ 입력 시 자동으로 custom 옵션 선택 및 depositName 설정
                      if (value.trim()) {
                        setDepositOption('custom')
                        setDepositName(value)
                      }
                    }}
                    onFocus={() => {
                      // 포커스 시에도 custom 옵션 선택
                      setDepositOption('custom')
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </label>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium">
                💡 입금자명과 금액이 정확해야 입금확인과 배송이 빨라집니다
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDepositModal(false)
                  setDepositOption('name')
                  setDepositName('')
                  setCustomDepositName('')
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmBankTransfer}
                disabled={!depositName || processing}
                className="flex-1 px-4 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>처리 중...</span>
                  </div>
                ) : (
                  '확인'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}