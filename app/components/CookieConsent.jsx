'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * 쿠키 동의 팝업 컴포넌트
 *
 * 법적 요구사항:
 * - 개인정보보호법 (한국)
 * - GDPR (유럽)
 *
 * 동작:
 * 1. 첫 방문 시 팝업 표시
 * 2. "동의" 클릭 시 localStorage에 저장
 * 3. 이후 방문 시 팝업 표시 안 함
 * 4. GA consent mode 활성화
 */
export default function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // 쿠키 동의 여부 확인
    const consent = localStorage.getItem('cookie_consent')

    if (!consent) {
      // 첫 방문이면 팝업 표시
      setShow(true)
    } else {
      // 이미 동의했으면 GA 활성화
      activateAnalytics()
    }
  }, [])

  const activateAnalytics = () => {
    // GA4 consent mode 활성화
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      })
    }
  }

  const handleAccept = () => {
    // localStorage에 동의 저장
    localStorage.setItem('cookie_consent', 'accepted')
    localStorage.setItem('cookie_consent_date', new Date().toISOString())

    // 팝업 숨김
    setShow(false)

    // GA 활성화
    activateAnalytics()
  }

  const handleReject = () => {
    // 거부 시에도 저장 (다시 안 물어봄)
    localStorage.setItem('cookie_consent', 'rejected')
    localStorage.setItem('cookie_consent_date', new Date().toISOString())

    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm text-white shadow-2xl"
        >
          <div className="max-w-7xl mx-auto p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* 텍스트 */}
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">🍪 쿠키 사용 안내</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  올록은 웹사이트 기능 개선과 사용자 경험 향상을 위해 쿠키와 유사 기술을 사용합니다.{' '}
                  계속 이용하시면 쿠키 사용에 동의하는 것으로 간주됩니다.{' '}
                  <Link href="/privacy" className="underline hover:text-blue-400 transition-colors">
                    개인정보 처리방침
                  </Link>
                  에서 자세한 내용을 확인하세요.
                </p>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={handleReject}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  거부
                </button>
                <button
                  onClick={handleAccept}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  동의
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
