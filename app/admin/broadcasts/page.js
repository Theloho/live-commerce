'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  VideoCameraIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  PlusIcon,
  CalendarIcon,
  UsersIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function AdminBroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBroadcasts()
  }, [])

  const loadBroadcasts = () => {
    try {
      // Mock 방송 데이터
      const mockBroadcasts = [
        {
          id: 1,
          title: "🔥 신상품 라이브 쇼핑 🔥",
          description: "새로 출시된 무선 이어폰과 스마트 워치를 특가로 만나보세요!",
          status: "live",
          scheduled_at: new Date().toISOString(),
          started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30분 전 시작
          viewer_count: 1247,
          products: [
            { id: 1, title: "프리미엄 무선 이어폰", price: 89000 },
            { id: 2, title: "스마트 워치 시리즈 X", price: 299000 }
          ],
          thumbnail_url: "https://picsum.photos/400/300?random=1"
        },
        {
          id: 2,
          title: "주말 특가 방송",
          description: "주말 한정 특가 상품들을 소개합니다",
          status: "scheduled",
          scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2시간 후
          started_at: null,
          viewer_count: 0,
          products: [
            { id: 3, title: "울트라 슬림 노트북", price: 1290000 },
            { id: 4, title: "블루투스 스피커", price: 79000 }
          ],
          thumbnail_url: "https://picsum.photos/400/300?random=2"
        },
        {
          id: 3,
          title: "어제의 베스트 상품 리뷰",
          description: "어제 가장 인기 있었던 상품들을 다시 한번 소개합니다",
          status: "ended",
          scheduled_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 어제
          started_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(), // 2시간 방송
          viewer_count: 892,
          products: [
            { id: 1, title: "프리미엄 무선 이어폰", price: 89000 }
          ],
          thumbnail_url: "https://picsum.photos/400/300?random=3"
        }
      ]

      setBroadcasts(mockBroadcasts)
      setLoading(false)
    } catch (error) {
      console.error('방송 로딩 오류:', error)
      setLoading(false)
    }
  }

  const updateBroadcastStatus = (broadcastId, newStatus) => {
    const updatedBroadcasts = broadcasts.map(broadcast => {
      if (broadcast.id === broadcastId) {
        const updates = { ...broadcast, status: newStatus }

        if (newStatus === 'live' && broadcast.status === 'scheduled') {
          updates.started_at = new Date().toISOString()
          updates.viewer_count = Math.floor(Math.random() * 500) + 100
        } else if (newStatus === 'ended') {
          updates.ended_at = new Date().toISOString()
        }

        return updates
      }
      return broadcast
    })

    setBroadcasts(updatedBroadcasts)

    const statusMessages = {
      live: '방송이 시작되었습니다',
      paused: '방송이 일시정지되었습니다',
      ended: '방송이 종료되었습니다'
    }

    toast.success(statusMessages[newStatus] || '방송 상태가 변경되었습니다')
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      live: { label: '라이브 중', color: 'bg-red-100 text-red-800', icon: '🔴' },
      scheduled: { label: '예정됨', color: 'bg-blue-100 text-blue-800', icon: '📅' },
      paused: { label: '일시정지', color: 'bg-yellow-100 text-yellow-800', icon: '⏸️' },
      ended: { label: '종료됨', color: 'bg-gray-100 text-gray-800', icon: '⏹️' }
    }
    const statusInfo = statusMap[status] || statusMap.scheduled
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
        <span>{statusInfo.icon}</span>
        {statusInfo.label}
      </span>
    )
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getBroadcastDuration = (broadcast) => {
    if (!broadcast.started_at) return '-'

    const start = new Date(broadcast.started_at)
    const end = broadcast.ended_at ? new Date(broadcast.ended_at) : new Date()
    const durationMs = end - start
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}시간 ${minutes}분`
    } else {
      return `${minutes}분`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">방송 관리</h1>
          <p className="text-gray-600">라이브 방송을 관리하고 모니터링하세요</p>
        </div>
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
          <PlusIcon className="w-4 h-4" />
          방송 생성
        </button>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <VideoCameraIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-600">라이브 방송</p>
              <p className="text-2xl font-bold text-red-700">
                {broadcasts.filter(b => b.status === 'live').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-600">예정된 방송</p>
              <p className="text-2xl font-bold text-blue-700">
                {broadcasts.filter(b => b.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-600">총 시청자</p>
              <p className="text-2xl font-bold text-green-700">
                {broadcasts.reduce((total, b) => total + (b.viewer_count || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcasts List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {broadcasts.map((broadcast, index) => (
            <motion.div
              key={broadcast.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-200">
                {broadcast.thumbnail_url ? (
                  <img
                    src={broadcast.thumbnail_url}
                    alt={broadcast.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoCameraIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}

                {/* Status Overlay */}
                <div className="absolute top-2 left-2">
                  {getStatusBadge(broadcast.status)}
                </div>

                {/* Viewer Count for Live */}
                {broadcast.status === 'live' && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <EyeIcon className="w-3 h-3" />
                    {broadcast.viewer_count?.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                  {broadcast.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {broadcast.description}
                </p>

                {/* Schedule Info */}
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span>📅 {formatDateTime(broadcast.scheduled_at)}</span>
                  {broadcast.started_at && (
                    <span>⏱️ {getBroadcastDuration(broadcast)}</span>
                  )}
                </div>

                {/* Products */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">방송 상품 ({broadcast.products.length}개)</p>
                  <div className="flex flex-wrap gap-1">
                    {broadcast.products.slice(0, 2).map(product => (
                      <span key={product.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {product.title}
                      </span>
                    ))}
                    {broadcast.products.length > 2 && (
                      <span className="text-xs text-gray-500">
                        +{broadcast.products.length - 2}개 더
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {broadcast.status === 'scheduled' && (
                    <button
                      onClick={() => updateBroadcastStatus(broadcast.id, 'live')}
                      className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <PlayIcon className="w-4 h-4" />
                      방송 시작
                    </button>
                  )}

                  {broadcast.status === 'live' && (
                    <>
                      <button
                        onClick={() => updateBroadcastStatus(broadcast.id, 'paused')}
                        className="flex-1 px-3 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <PauseIcon className="w-4 h-4" />
                        일시정지
                      </button>
                      <button
                        onClick={() => updateBroadcastStatus(broadcast.id, 'ended')}
                        className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <StopIcon className="w-4 h-4" />
                        종료
                      </button>
                    </>
                  )}

                  {broadcast.status === 'paused' && (
                    <>
                      <button
                        onClick={() => updateBroadcastStatus(broadcast.id, 'live')}
                        className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <PlayIcon className="w-4 h-4" />
                        재개
                      </button>
                      <button
                        onClick={() => updateBroadcastStatus(broadcast.id, 'ended')}
                        className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <StopIcon className="w-4 h-4" />
                        종료
                      </button>
                    </>
                  )}

                  {broadcast.status === 'ended' && (
                    <button className="flex-1 px-3 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg cursor-not-allowed">
                      방송 종료됨
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {broadcasts.length === 0 && (
          <div className="text-center py-12">
            <VideoCameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">등록된 방송이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}