'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  UserIcon,
  PhoneIcon,
  TagIcon,
  PencilIcon,
  ShoppingBagIcon,
  ArrowRightOnRectangleIcon,
  CheckIcon,
  XMarkIcon,
  ArrowLeftIcon,
  TicketIcon
} from '@heroicons/react/24/outline'
import useAuth from '@/hooks/useAuth'
import useAuthStore from '@/app/stores/authStore' // ⚡ Zustand store
import toast from 'react-hot-toast'
import AddressManager from '@/app/components/address/AddressManager'
import { UserProfileManager } from '@/lib/userProfileManager' // ⚡ 중앙화 모듈

export default function MyPage() {
  const router = useRouter()
  const { user, loading, signOut, isAuthenticated } = useAuth()
  const [userSession, setUserSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [editingField, setEditingField] = useState(null)
  const [editValues, setEditValues] = useState({})

  // 다음 주소 API 스크립트 로드
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.async = true
    document.head.appendChild(script)

    return () => {
      // 컴포넌트 언마운트 시 스크립트 제거
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  // 직접 세션 확인
  useEffect(() => {
    const checkUserSession = () => {
      try {
        const storedUser = sessionStorage.getItem('user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          setUserSession(userData)
        } else {
          setUserSession(null)
        }
      } catch (error) {
        setUserSession(null)
      } finally {
        setSessionLoading(false)
      }
    }

    checkUserSession()
  }, [])

  useEffect(() => {
    const currentUser = userSession || user
    const isUserLoggedIn = userSession || isAuthenticated

    if (!sessionLoading && !loading && !isUserLoggedIn) {
      toast.error('로그인이 필요합니다')
      router.push('/login')
      return
    }

    if (currentUser) {
      fetchUserProfile(currentUser)
    }
  }, [user, userSession, loading, sessionLoading, isAuthenticated, router])

  const fetchUserProfile = async (currentUser) => {
    try {
      setProfileLoading(true)

      // 카카오 사용자인 경우 데이터베이스에서 최신 정보 가져오기 (중앙화 모듈 사용)
      if (currentUser.provider === 'kakao') {
        try {
          const dbProfile = await UserProfileManager.loadUserProfile(currentUser.id)

          if (dbProfile) {
            const profile = {
              name: dbProfile.name || currentUser.name || '',
              phone: dbProfile.phone || currentUser.phone || '',
              nickname: dbProfile.nickname || currentUser.nickname || currentUser.name || '',
              address: dbProfile.address || '',
              detail_address: dbProfile.detail_address || '',
              addresses: dbProfile.addresses || [],
              postal_code: dbProfile.postal_code || ''
            }
            setUserProfile(profile)
            setEditValues(profile)

            // sessionStorage도 최신 정보로 업데이트
            const updatedUser = {
              ...currentUser,
              ...profile
            }
            sessionStorage.setItem('user', JSON.stringify(updatedUser))
          } else {
            const profile = {
              name: currentUser.name || '',
              phone: currentUser.phone || '',
              nickname: currentUser.nickname || currentUser.name || '',
              address: currentUser.address || '',
              detail_address: currentUser.detail_address || '',
              addresses: currentUser.addresses || [],
              postal_code: currentUser.postal_code || ''
            }
            setUserProfile(profile)
            setEditValues(profile)
          }
        } catch (error) {
          const profile = {
            name: currentUser.name || '',
            phone: currentUser.phone || '',
            nickname: currentUser.nickname || currentUser.name || '',
            address: currentUser.address || '',
            detail_address: currentUser.detail_address || '',
            addresses: currentUser.addresses || [],
            postal_code: currentUser.postal_code || ''
          }
          setUserProfile(profile)
          setEditValues(profile)
        }
      } else if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
        // Mock 모드에서는 user 객체에서 정보 가져오기
        const profile = {
          name: currentUser.name || currentUser.user_metadata?.name || '',
          phone: currentUser.phone || currentUser.user_metadata?.phone || '',
          nickname: currentUser.nickname || currentUser.user_metadata?.nickname || currentUser.user_metadata?.name || '',
          address: currentUser.address || '',
          detail_address: currentUser.detail_address || '',
          addresses: currentUser.addresses || [],
          postal_code: currentUser.postal_code || ''
        }
        setUserProfile(profile)
        setEditValues(profile)
      } else {
        // ⚡ 실제 Supabase에서 프로필 정보 가져오기 (중앙화 모듈 사용)
        try {
          const dbProfile = await UserProfileManager.loadUserProfile(currentUser.id)

          if (dbProfile) {
            setUserProfile(dbProfile)
            setEditValues(dbProfile)
          } else {
            // 프로필이 없으면 기본값 설정
            const defaultProfile = {
              id: currentUser.id,
              name: currentUser.user_metadata?.name || '',
              phone: currentUser.user_metadata?.phone || '',
              nickname: currentUser.user_metadata?.nickname || currentUser.user_metadata?.name || '',
              address: '',
              detail_address: '',
              addresses: [],
              postal_code: ''
            }

            // 프로필이 없는 경우 추가 정보 입력 페이지로 리다이렉트
            if (!defaultProfile.phone) {
              toast.error('프로필 정보를 완성해주세요')
              router.push('/auth/complete-profile')
              return
            }

            setUserProfile(defaultProfile)
            setEditValues(defaultProfile)
          }
        } catch (error) {
          toast.error('프로필 정보를 불러올 수 없습니다')
          return
        }
      }
    } catch (error) {
      toast.error('프로필 정보를 불러올 수 없습니다')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleEdit = (field) => {
    setEditingField(field)
  }

  const handleSave = async (field) => {
    try {
      const currentUser = userSession || user

      if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
        // Mock 모드 처리
        const mockUser = JSON.parse(localStorage.getItem('mock_current_user'))
        if (mockUser) {
          mockUser[field] = editValues[field]
          localStorage.setItem('mock_current_user', JSON.stringify(mockUser))

          const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
          const userIndex = users.findIndex(u => u.id === mockUser.id)
          if (userIndex !== -1) {
            users[userIndex] = mockUser
            localStorage.setItem('mock_users', JSON.stringify(users))
          }
        }
      } else {
        // ⚡ 모바일 최적화: API Route로 업데이트
        const response = await fetch('/api/profile/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: currentUser.id,
            profileData: { [field]: editValues[field] }
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '정보 수정 실패')
        }

        await response.json()

        // UI 상태 업데이트
        const isKakaoUser = currentUser?.provider === 'kakao'
        if (isKakaoUser) {
          // sessionStorage 업데이트 (카카오 사용자만)
          const updatedUser = {
            ...currentUser,
            [field]: editValues[field]
          }
          sessionStorage.setItem('user', JSON.stringify(updatedUser))
          setUserSession(updatedUser)
        }
      }

      // 로컬 상태 업데이트
      setUserProfile(prev => ({ ...prev, [field]: editValues[field] }))

      // ⚡ authStore 캐시 업데이트
      useAuthStore.getState().updateProfile({ [field]: editValues[field] })

      setEditingField(null)
      toast.success('정보가 수정되었습니다')

    } catch (error) {
      toast.error(`정보 수정에 실패했습니다: ${error.message}`)
    }
  }

  const handleCancel = (field) => {
    setEditValues(prev => ({ ...prev, [field]: userProfile[field] }))
    setEditingField(null)
  }

  const handleLogout = async () => {
    const confirmed = window.confirm('로그아웃하시겠습니까?')
    if (confirmed) {
      try {
        // 1. sessionStorage 정리
        sessionStorage.removeItem('user')

        // 2. localStorage 정리 (카카오 인증 흔적 제거)
        localStorage.removeItem('unified_user_session')

        // 3. 로컬 상태 정리
        setUserSession(null)
        setUserProfile(null)

        // 4. 다른 컴포넌트에 로그아웃 알림 (이벤트 발생)
        window.dispatchEvent(new CustomEvent('userLoggedOut'))

        // 5. Supabase Auth 로그아웃 (자동으로 localStorage의 인증 토큰 정리)
        await signOut()

        // 6. 성공 메시지 및 리다이렉트
        toast.success('로그아웃되었습니다')
        router.push('/')

      } catch (error) {
        // 오류가 발생해도 클라이언트 상태는 정리되었으므로 홈으로 이동
        toast.info('로그아웃되었습니다')
        router.push('/')
      }
    }
  }

  if (loading || sessionLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">프로필 정보를 불러올 수 없습니다</p>
        </div>
      </div>
    )
  }

  const profileFields = [
    {
      key: 'name',
      label: '이름',
      icon: UserIcon,
      type: 'text',
      required: true
    },
    {
      key: 'phone',
      label: '휴대폰번호',
      icon: PhoneIcon,
      type: 'tel',
      required: true,
      readonly: true
    },
    {
      key: 'nickname',
      label: '닉네임',
      icon: TagIcon,
      type: 'text',
      required: false
    }
  ]

  const currentUserId = userSession?.id || user?.id

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="bg-white px-4 py-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="뒤로가기"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>
            <div className="w-10"></div> {/* 균형을 위한 빈 공간 */}
          </div>
        </div>

        {/* 사용자 정보 카드 */}
        <div className="bg-white mt-2 p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {userProfile?.name || '사용자'}
              </h2>
              <p className="text-gray-600">
                {userProfile?.nickname || userProfile?.name || '닉네임 없음'}
              </p>
              <p className="text-sm text-gray-500">
                {userProfile?.phone || '전화번호 없음'}
              </p>
            </div>
          </div>
        </div>

        {/* 기본 프로필 정보 */}
        <div className="bg-white mt-2">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
          </div>
          <div className="divide-y divide-gray-200">
          {profileFields.map((field) => {
            const IconComponent = field.icon
            const isEditing = editingField === field.key
            const value = userProfile[field.key] || ''

            return (
              <motion.div
                key={field.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <IconComponent className="h-5 w-5 text-gray-500 mt-1" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type={field.type}
                            value={editValues[field.key] || ''}
                            onChange={(e) => setEditValues(prev => ({
                              ...prev,
                              [field.key]: e.target.value
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                            placeholder={field.label}
                          />

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave(field.key)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                            >
                              <CheckIcon className="h-4 w-4" />
                              저장
                            </button>
                            <button
                              onClick={() => handleCancel(field.key)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
                            >
                              <XMarkIcon className="h-4 w-4" />
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-gray-900 text-sm">
                            {value || '설정되지 않음'}
                          </p>
                          {!field.readonly && (
                            <button
                              onClick={() => handleEdit(field.key)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                              title="수정"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          {field.readonly && (
                            <p className="text-xs text-gray-500">수정불가</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
          </div>
        </div>

        {/* 배송지 관리 섹션 */}
        <div className="bg-white mt-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">배송지 관리</h2>
            <p className="text-sm text-gray-500 mt-1">최대 5개까지 배송지를 저장할 수 있습니다</p>
          </div>
          <div className="p-4">
            <AddressManager
              addresses={(() => {
                // addresses 배열이 비어있지만 기본 주소가 있는 경우 자동 변환
                if ((!userProfile.addresses || userProfile.addresses.length === 0) && userProfile.address) {
                  return [{
                    id: Date.now(),
                    label: '기본 배송지',
                    address: userProfile.address,
                    detail_address: userProfile.detail_address || '',
                    postal_code: userProfile.postal_code || '',
                    is_default: true
                  }]
                }
                return userProfile.addresses || []
              })()}
              onAddressesChange={async (newAddresses) => {
                // 💾 DB 업데이트 + userProfile state 동기화 (모바일 최적화 - API Route 사용)
                try {
                  const currentUser = userSession || user
                  if (!currentUser?.id) return

                  // ⚡ API Route로 업데이트 (모바일 안전)
                  const response = await fetch('/api/profile/complete', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      userId: currentUser.id,
                      profileData: { addresses: newAddresses }
                    })
                  })

                  if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || '주소 저장 실패')
                  }

                  await response.json()

                  // userProfile state 동기화 (새로고침 없이 최신 상태 유지)
                  setUserProfile(prev => ({
                    ...prev,
                    addresses: newAddresses
                  }))

                  // ⚡ authStore 캐시 업데이트
                  useAuthStore.getState().updateProfile({ addresses: newAddresses })

                  // sessionStorage 업데이트 (카카오 사용자만)
                  const isKakaoUser = currentUser?.provider === 'kakao'
                  if (isKakaoUser) {
                    const updatedUser = {
                      ...currentUser,
                      addresses: newAddresses
                    }
                    sessionStorage.setItem('user', JSON.stringify(updatedUser))
                  }
                } catch (error) {
                  toast.error(`주소 저장에 실패했습니다: ${error.message}`)
                }
              }}
            />
          </div>
        </div>

        {/* 메뉴 */}
        <div className="bg-white mt-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">메뉴</h2>
          </div>
          <div className="p-4 space-y-3">
          {/* 주문 내역 */}
          <button
            onClick={() => router.push('/orders')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBagIcon className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">주문 내역</span>
            </div>
            <div className="text-gray-400">
              &rarr;
            </div>
          </button>

          {/* 내 쿠폰 */}
          <button
            onClick={() => router.push('/mypage/coupons')}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:from-blue-100 hover:to-purple-100 transition-colors border border-blue-200"
          >
            <div className="flex items-center gap-3">
              <TicketIcon className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900">내 쿠폰</span>
            </div>
            <div className="text-blue-600 font-semibold">
              &rarr;
            </div>
          </button>

          {/* 로그아웃 */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span className="font-medium">로그아웃</span>
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}