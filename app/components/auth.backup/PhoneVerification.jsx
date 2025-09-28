'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

export default function PhoneVerification({ onVerified, onCancel }) {
  const [step, setStep] = useState('phone') // 'phone' | 'code'
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  // 휴대폰 번호 형식 자동 변환
  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/[^0-9]/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  // 카운트다운 타이머
  const startTimer = () => {
    setTimeLeft(300) // 5분
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // SMS 발송
  const sendVerificationCode = async () => {
    if (!phoneNumber || phoneNumber.replace(/[^0-9]/g, '').length !== 11) {
      toast.error('올바른 휴대폰 번호를 입력해주세요')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/sms/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('인증번호가 발송되었습니다')
        setStep('code')
        startTimer()
      } else {
        toast.error(data.error || 'SMS 발송에 실패했습니다')
      }
    } catch (error) {
      console.error('SMS 발송 오류:', error)
      toast.error('SMS 발송 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 인증번호 확인
  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('6자리 인증번호를 입력해주세요')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/sms/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, verificationCode })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('휴대폰 인증이 완료되었습니다')
        onVerified(data.verifiedPhone)
      } else {
        toast.error(data.error || '인증번호가 올바르지 않습니다')
        if (data.remainingAttempts !== undefined) {
          toast.error(`남은 시도 횟수: ${data.remainingAttempts}회`)
        }
      }
    } catch (error) {
      console.error('인증 확인 오류:', error)
      toast.error('인증 확인 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 시간 표시 형식
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (step === 'phone') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">휴대폰 인증</h3>
          <p className="text-sm text-gray-600 mt-2">
            휴대폰 번호로 인증번호를 받아주세요
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              휴대폰 번호
            </label>
            <input
              type="tel"
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
              placeholder="010-0000-0000"
              maxLength={13}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={sendVerificationCode}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '발송 중...' : '인증번호 받기'}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'code') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">인증번호 입력</h3>
          <p className="text-sm text-gray-600 mt-2">
            {phoneNumber}로 발송된 인증번호를 입력해주세요
          </p>
          {timeLeft > 0 && (
            <p className="text-sm text-blue-600 mt-1">
              남은 시간: {formatTime(timeLeft)}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              인증번호
            </label>
            <input
              type="text"
              id="code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={verifyCode}
              disabled={loading || timeLeft === 0}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '확인 중...' : '인증 확인'}
            </button>
            <button
              onClick={() => setStep('phone')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              다시 입력
            </button>
          </div>

          {timeLeft === 0 && (
            <div className="text-center">
              <button
                onClick={() => {
                  setStep('phone')
                  setVerificationCode('')
                }}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                인증번호 재발송
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }
}