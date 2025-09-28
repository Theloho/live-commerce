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
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import useAuth from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import AddressManager from '@/app/components/AddressManager'

export default function MyPage() {
  const router = useRouter()
  const { user, loading, signOut, isAuthenticated } = useAuth()
  const [userSession, setUserSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [editingField, setEditingField] = useState(null)
  const [editValues, setEditValues] = useState({})

  // 직접 세션 확인
  useEffect(() => {
    const checkUserSession = () => {
      try {
        const storedUser = sessionStorage.getItem('user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          console.log('마이페이지에서 세션 복원:', userData)
          setUserSession(userData)
        } else {
          setUserSession(null)
        }
      } catch (error) {
        console.error('마이페이지 세션 확인 오류:', error)
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

      // 카카오 사용자인 경우 데이터베이스에서 최신 정보 가져오기
      if (currentUser.provider === 'kakao') {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

          const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${currentUser.id}`, {
            method: 'GET',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const profiles = await response.json()
            if (profiles && profiles.length > 0) {
              const dbProfile = profiles[0]
              console.log('데이터베이스에서 카카오 사용자 프로필 로드:', dbProfile)

              const profile = {
                name: dbProfile.name || currentUser.name || '',
                phone: dbProfile.phone || currentUser.phone || '',
                nickname: dbProfile.nickname || currentUser.nickname || currentUser.name || ''
              }
              console.log('마이페이지 프로필 로드:', { dbProfile, currentUser, profile })
              setUserProfile(profile)
              setEditValues(profile)

              // sessionStorage도 최신 정보로 업데이트
              const updatedUser = {
                ...currentUser,
                ...profile
              }
              sessionStorage.setItem('user', JSON.stringify(updatedUser))
            } else {
              console.log('데이터베이스에서 프로필을 찾을 수 없음, sessionStorage 사용')
              const profile = {
                name: currentUser.name || '',
                phone: currentUser.phone || '',
                nickname: currentUser.nickname || currentUser.name || ''
              }
              setUserProfile(profile)
              setEditValues(profile)
            }
          } else {
            console.error('데이터베이스 조회 실패, sessionStorage 사용')
            const profile = {
              name: currentUser.name || '',
              phone: currentUser.phone || '',
              nickname: currentUser.nickname || currentUser.name || ''
            }
            setUserProfile(profile)
            setEditValues(profile)
          }
        } catch (error) {
          console.error('카카오 사용자 프로필 로드 오류:', error)
          const profile = {
            name: currentUser.name || '',
            phone: currentUser.phone || '',
            nickname: currentUser.nickname || currentUser.name || ''
          }
          setUserProfile(profile)
          setEditValues(profile)
        }
      } else if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
        // Mock 모드에서는 user 객체에서 정보 가져오기
        const profile = {
          name: currentUser.name || currentUser.user_metadata?.name || '',
          phone: currentUser.phone || currentUser.user_metadata?.phone || '',
          nickname: currentUser.nickname || currentUser.user_metadata?.nickname || currentUser.user_metadata?.name || ''
        }
        setUserProfile(profile)
        setEditValues(profile)
      } else {
        // 실제 Supabase에서 프로필 정보 가져오기
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle() // single() 대신 maybeSingle() 사용 (없어도 오류 안남)

        if (error) {
          console.error('프로필 조회 오류:', error)
          toast.error('프로필 정보를 불러올 수 없습니다')
          return
        }

        // 프로필이 없으면 기본값 설정
        if (!data) {
          const defaultProfile = {
            id: currentUser.id,
            name: currentUser.user_metadata?.name || '',
            phone: currentUser.user_metadata?.phone || '',
            nickname: currentUser.user_metadata?.nickname || currentUser.user_metadata?.name || ''
          }

          // 프로필이 없는 경우 추가 정보 입력 페이지로 리다이렉트
          if (!defaultProfile.phone) {
            toast.error('프로필 정보를 완성해주세요')
            router.push('/auth/complete-profile')
            return
          }

          setUserProfile(defaultProfile)
          setEditValues(defaultProfile)
        } else {
          setUserProfile(data)
          setEditValues(data)
        }
      }
    } catch (error) {
      console.error('프로필 조회 실패:', error)
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

      // 카카오 사용자인 경우 전용 처리
      if (currentUser.provider === 'kakao') {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/\s/g, '')

        const updateData = {
          [field]: editValues[field],
          updated_at: new Date().toISOString()
        }

        console.log('카카오 사용자 프로필 업데이트:', { field, updateData })

        const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${currentUser.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updateData)
        })

        if (!response.ok) {
          const errorData = await response.text()
          throw new Error(`프로필 업데이트 실패: ${response.status} - ${errorData}`)
        }

        const updatedProfile = await response.json()
        console.log('카카오 사용자 프로필 업데이트 성공:', updatedProfile[0])

        // sessionStorage 업데이트
        const updatedUser = {
          ...currentUser,
          [field]: editValues[field]
        }
        sessionStorage.setItem('user', JSON.stringify(updatedUser))
        setUserSession(updatedUser)

        toast.success('정보가 수정되었습니다')
      } else if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
        // Mock 모드에서는 localStorage의 사용자 정보 업데이트
        const mockUser = JSON.parse(localStorage.getItem('mock_current_user'))
        if (mockUser) {
          mockUser[field] = editValues[field]

          // localStorage에 저장
          localStorage.setItem('mock_current_user', JSON.stringify(mockUser))

          // users 배열도 업데이트
          const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
          const userIndex = users.findIndex(u => u.id === mockUser.id)
          if (userIndex !== -1) {
            users[userIndex] = mockUser
            localStorage.setItem('mock_users', JSON.stringify(users))
          }
        }
        toast.success('정보가 수정되었습니다')
      } else {
        // 실제 Supabase 업데이트
        const { error } = await supabase
          .from('profiles')
          .update({ [field]: editValues[field] })
          .eq('id', user.id)

        if (error) {
          console.error('프로필 업데이트 오류:', error)
          toast.error('정보 수정에 실패했습니다')
          return
        }

        toast.success('정보가 수정되었습니다')
      }

      // 로컬 상태 업데이트
      setUserProfile(prev => ({ ...prev, [field]: editValues[field] }))
      setEditingField(null)
    } catch (error) {
      console.error('정보 수정 실패:', error)
      toast.error('정보 수정에 실패했습니다')
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
        console.log('마이페이지에서 로그아웃 시작')

        // sessionStorage 정리
        sessionStorage.removeItem('user')
        setUserSession(null)
        setUserProfile(null)

        // useAuth의 signOut 호출
        const result = await signOut()

        if (result && result.success) {
          console.log('마이페이지에서 로그아웃 성공')
          // 즉시 홈으로 이동
          router.push('/')
        } else {
          console.error('마이페이지에서 로그아웃 실패:', result?.error)
          // 실패해도 홈으로 이동 (클라이언트 상태는 이미 정리됨)
          router.push('/')
        }
      } catch (error) {
        console.error('마이페이지 로그아웃 처리 오류:', error)
        // 오류가 발생해도 홈으로 이동
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
    <>
      {/* 다음 주소 검색 API 스크립트 */}
      <script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        async
      />

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

          {/* 기본 프로필 정보 */}
          <div className="bg-white mt-2 divide-y divide-gray-200">
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

          {/* 배송지 관리 섹션 */}
          <div className="bg-white mt-2 p-4">
            <AddressManager
              userId={currentUserId}
              onAddressChange={() => {
                // 주소 변경 시 필요한 콜백 처리
              }}
            />
          </div>

          {/* 액션 버튼들 */}
          <div className="bg-white mt-2 p-4 space-y-3">
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
                →
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
    </>
  )
}