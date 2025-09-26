'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CogIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  BellIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    enable_card_payment: false,
    enable_bank_transfer: true,
    enable_live_orders: true,
    enable_notifications: true
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)

      // localStorage에서 설정 로드
      const savedSettings = localStorage.getItem('admin_site_settings')

      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsedSettings }))
        console.log('설정 로드 완료 (localStorage):', parsedSettings)
      } else {
        console.log('기본 설정 사용')
      }

    } catch (err) {
      console.error('설정 로드 중 오류:', err)
      toast.error('설정을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const saveSetting = async (key, value) => {
    try {
      setSaving(true)

      // localStorage에 설정 저장
      const newSettings = { ...settings, [key]: value }
      localStorage.setItem('admin_site_settings', JSON.stringify(newSettings))

      setSettings(newSettings)
      toast.success(`${getSettingLabel(key)} 설정이 저장되었습니다`)

      console.log('설정 저장 완료:', newSettings)

    } catch (err) {
      console.error('설정 저장 중 오류:', err)
      toast.error('설정 저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const getSettingLabel = (key) => {
    const labels = {
      enable_card_payment: '카드결제',
      enable_bank_transfer: '계좌이체',
      enable_live_orders: '라이브 주문',
      enable_notifications: '알림'
    }
    return labels[key] || key
  }

  const handleToggle = (key) => {
    const newValue = !settings[key]
    saveSetting(key, newValue)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">설정을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <CogIcon className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">시스템 설정</h1>
            <p className="text-gray-600">사이트 기능을 실시간으로 제어할 수 있습니다</p>
          </div>
        </div>
      </div>

      {/* 결제 설정 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <CreditCardIcon className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">결제 설정</h2>
        </div>

        <div className="space-y-4">
          {/* 카드결제 토글 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">💳 카드결제 신청</h3>
              <p className="text-sm text-gray-600">사용자가 카드결제를 신청할 수 있습니다</p>
            </div>
            <button
              onClick={() => handleToggle('enable_card_payment')}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                settings.enable_card_payment ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enable_card_payment ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 계좌이체 토글 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">🏦 계좌이체</h3>
              <p className="text-sm text-gray-600">사용자가 계좌이체로 결제할 수 있습니다</p>
            </div>
            <button
              onClick={() => handleToggle('enable_bank_transfer')}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                settings.enable_bank_transfer ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enable_bank_transfer ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 주문 설정 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingCartIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">주문 설정</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">📺 라이브 주문</h3>
              <p className="text-sm text-gray-600">라이브 방송 중 즉시 주문 기능</p>
            </div>
            <button
              onClick={() => handleToggle('enable_live_orders')}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                settings.enable_live_orders ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enable_live_orders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 현재 설정 상태 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">현재 활성화된 기능</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(settings).map(([key, value]) =>
            value && (
              <span
                key={key}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                {getSettingLabel(key)}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  )
}