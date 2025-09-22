'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'

export default function LiveBanner({ broadcast }) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible || !broadcast) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -10, opacity: 0 }}
        className="mx-4 mt-2 mb-6 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white overflow-hidden shadow-lg"
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            {/* Left side - Live indicator and content */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {/* Live indicator */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                <span className="text-xs font-bold">LIVE</span>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/live/${broadcast.id}`}
                  className="block hover:opacity-90 transition-opacity"
                >
                  <p className="text-sm font-semibold truncate mb-1">
                    {broadcast.title}
                  </p>
                  <p className="text-xs opacity-90">
                    {broadcast.current_viewers?.toLocaleString()}명 시청중
                  </p>
                </Link>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
              <Link
                href={`/live/${broadcast.id}`}
                className="px-4 py-2 bg-white text-red-500 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                시청하기
              </Link>
              <button
                onClick={() => setIsVisible(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bottom ticker */}
          <div className="mt-3 pt-3 border-t border-white/20 overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap">
              <span className="text-xs opacity-90 pr-8">
                🎁 라이브 한정 특가 • 💳 무이자 할부 • 🚚 당일 배송
              </span>
              <span className="text-xs opacity-90 pr-8">
                🎁 라이브 한정 특가 • 💳 무이자 할부 • 🚚 당일 배송
              </span>
              <span className="text-xs opacity-90 pr-8">
                🎁 라이브 한정 특가 • 💳 무이자 할부 • 🚚 당일 배송
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}