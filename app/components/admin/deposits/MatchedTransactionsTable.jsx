/**
 * MatchedTransactionsTable - 매칭된 거래 테이블 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 *
 * Note: 이 컴포넌트는 복잡한 매칭 비교 UI를 가지고 있어 ~300줄입니다.
 */

'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { EyeIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

export default function MatchedTransactionsTable({ filteredMatched, onConfirmPayment }) {
  const router = useRouter()

  if (filteredMatched.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-green-50 px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-green-900">🎯 매칭된 거래 ({filteredMatched.length}건)</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {filteredMatched.map((item, index) => (
          <motion.div
            key={`${item.transaction.id}-${item.order.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="p-6 hover:bg-gray-50"
          >
            <div className="space-y-4">
              {/* 매칭 상태 및 액션 */}
              <div className="flex items-center justify-between">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  item.confidence === 'high'
                    ? 'bg-green-100 text-green-800'
                    : item.confidence === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {item.confidence === 'high' ? '✅ 이름+금액 일치' :
                   item.confidence === 'medium' ? '⚠️ 이름만 일치' :
                   '🔶 금액만 일치'}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onConfirmPayment(item)}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    입금 확인
                  </button>
                  <button
                    onClick={() => {
                      if (item.order.userId) {
                        router.push(`/admin/customers/${item.order.userId}`)
                      } else {
                        const orderIdToUse = item.order.isGroup && item.order.originalOrders?.[0]?.id
                          ? item.order.originalOrders[0].id
                          : item.order.id
                        router.push(`/admin/orders/${orderIdToUse}`)
                      }
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title={item.order.userId ? "고객 상세보기" : "주문 상세보기"}
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 스마트 매칭 비교 레이아웃 */}
              <div className="grid grid-cols-12 gap-2 md:gap-4">
                {/* 좌측: 주문 정보 (5칸) */}
                <div className="col-span-5 rounded-lg p-3 md:p-4 border-l-4 border-blue-500">
                  <h3 className="font-semibold text-gray-900 mb-2 md:mb-3 flex items-center gap-1 md:gap-2 text-sm md:text-base">
                    📦 <span className="hidden sm:inline">주문 정보</span><span className="sm:hidden">주문</span>
                    <span className="text-xs bg-gray-200 text-gray-700 px-1 md:px-2 py-1 rounded">ORDER</span>
                  </h3>
                  <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
                    {(() => {
                      const orderUser = item.order.user || {}
                      const depositorName = item.transaction.depositor
                      const orderNames = [
                        { label: '입금자명', value: item.order.depositName || '', key: 'depositName' },
                        { label: '주문자', value: item.order.shipping?.name || '', key: 'orderName' },
                        { label: '닉네임', value: item.order.userNickname || orderUser?.profile?.nickname || orderUser?.nickname || '', key: 'nickname' }
                      ].filter(name => name.value)

                      const matchedName = orderNames.find(name =>
                        name.value.replace(/\s/g, '') === depositorName.replace(/\s/g, '')
                      )

                      const orderDate = new Date(item.order.created_at)
                      const depositDate = new Date(item.transaction.date)
                      const dateDiff = Math.ceil((depositDate - orderDate) / (1000 * 60 * 60 * 24))
                      const amountDiff = item.transaction.amount - item.order.payment?.amount

                      return (
                        <>
                          {matchedName && (
                            <div className="flex justify-between border-l-2 border-green-500 pl-2 py-1">
                              <span className="text-gray-900 font-medium">{matchedName.label}:</span>
                              <span className="font-bold text-gray-900 text-right">✓ {matchedName.value}</span>
                            </div>
                          )}

                          {orderNames.filter(name => !matchedName || name.key !== matchedName.key).map(name => (
                            <div key={name.key} className="flex justify-between py-1 opacity-50">
                              <span className="text-gray-900 font-medium">{name.label}:</span>
                              <span className="font-bold text-gray-900 text-right">{name.value}</span>
                            </div>
                          ))}

                          <div className="flex justify-between py-1">
                            <span className="text-gray-900 font-medium">주문금액:</span>
                            <span className="font-bold text-gray-900 text-right">₩{item.order.payment?.amount.toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between py-1">
                            <span className="text-gray-900 font-medium">주문날짜:</span>
                            <span className="text-gray-900 text-right">{orderDate.toLocaleDateString('ko-KR')}</span>
                          </div>

                          <div className="flex justify-between py-1">
                            <span className="text-gray-900 font-medium">주문번호:</span>
                            <span className="font-mono text-xs text-gray-600 text-right">{item.order.customerOrderNumber || item.order.id.slice(-8)}</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* 중간: 매칭 정보 (2칸) */}
                <div className="col-span-2 flex flex-col justify-center">
                  {(() => {
                    const orderUser = item.order.user || {}
                    const depositorName = item.transaction.depositor
                    const orderNames = [
                      { label: '입금자명', value: item.order.depositName || '', key: 'depositName' },
                      { label: '주문자', value: item.order.shipping?.name || '', key: 'orderName' },
                      { label: '닉네임', value: item.order.userNickname || orderUser?.profile?.nickname || orderUser?.nickname || '', key: 'nickname' }
                    ].filter(name => name.value)

                    const matchedName = orderNames.find(name =>
                      name.value.replace(/\s/g, '') === depositorName.replace(/\s/g, '')
                    )

                    const orderDate = new Date(item.order.created_at)
                    const depositDate = new Date(item.transaction.date)
                    const dateDiff = Math.ceil((depositDate - orderDate) / (1000 * 60 * 60 * 24))
                    const amountDiff = item.transaction.amount - item.order.payment?.amount

                    return (
                      <div className="space-y-1 md:space-y-2 text-xs text-center">
                        {matchedName && (
                          <div className="bg-green-100 rounded px-1 py-1">
                            <span className="text-green-700 font-bold">✓</span>
                          </div>
                        )}
                        {orderNames.filter(name => !matchedName || name.key !== matchedName.key).map(name => (
                          <div key={name.key} className="bg-red-100 rounded px-1 py-1">
                            <span className="text-red-700 font-bold">✗</span>
                          </div>
                        ))}

                        <div className={`rounded px-1 py-1 ${amountDiff === 0 ? 'bg-green-100' : 'bg-orange-100'}`}>
                          {amountDiff === 0 ? (
                            <span className="text-green-700 font-bold">✓</span>
                          ) : (
                            <span className={`font-bold text-xs ${amountDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {amountDiff > 0 ? '+' : ''}₩{Math.abs(amountDiff).toLocaleString()}
                            </span>
                          )}
                        </div>

                        <div className={`rounded px-1 py-1 ${
                          dateDiff === 0 ? 'bg-green-100' :
                          dateDiff > 0 ? 'bg-blue-100' :
                          'bg-red-100'
                        }`}>
                          {dateDiff === 0 ? (
                            <span className="text-green-700 font-bold">✓</span>
                          ) : dateDiff > 0 ? (
                            <span className="text-blue-600 font-bold text-xs">+{dateDiff}일</span>
                          ) : (
                            <span className="text-red-600 font-bold text-xs">⚠️</span>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* 우측: 입금 정보 (5칸) */}
                <div className="col-span-5 rounded-lg p-3 md:p-4 border-r-4 border-green-500">
                  <h3 className="font-semibold text-gray-900 mb-2 md:mb-3 flex items-center justify-end gap-1 md:gap-2 text-sm md:text-base">
                    <span className="text-xs bg-gray-200 text-gray-700 px-1 md:px-2 py-1 rounded">BANK</span>
                    <span className="hidden sm:inline">입금 정보</span><span className="sm:hidden">입금</span> 💰
                  </h3>
                  <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
                    {(() => {
                      const orderUser = item.order.user || {}
                      const depositorName = item.transaction.depositor
                      const orderNames = [
                        { label: '입금자명', value: item.order.depositName || '', key: 'depositName' },
                        { label: '주문자', value: item.order.shipping?.name || '', key: 'orderName' },
                        { label: '닉네임', value: item.order.userNickname || orderUser?.profile?.nickname || orderUser?.nickname || '', key: 'nickname' }
                      ].filter(name => name.value)

                      const matchedName = orderNames.find(name =>
                        name.value.replace(/\s/g, '') === depositorName.replace(/\s/g, '')
                      )

                      const depositDate = new Date(item.transaction.date)

                      return (
                        <>
                          {matchedName && (
                            <div className="flex justify-between border-r-2 border-green-500 pr-2 py-1">
                              <span className="font-bold text-gray-900">✓ {depositorName}</span>
                              <span className="text-gray-900 font-medium">:입금자명</span>
                            </div>
                          )}

                          {orderNames.filter(name => !matchedName || name.key !== matchedName.key).map(name => (
                            <div key={name.key} className="flex justify-between py-1 opacity-50">
                              <span className="font-bold text-gray-900">{depositorName}</span>
                              <span className="text-gray-900 font-medium">:입금자명</span>
                            </div>
                          ))}

                          <div className="flex justify-between py-1">
                            <span className="font-bold text-gray-900">₩{item.transaction.amount.toLocaleString()}</span>
                            <span className="text-gray-900 font-medium">:입금금액</span>
                          </div>

                          <div className="flex justify-between py-1">
                            <span className="text-gray-900">{depositDate.toLocaleDateString('ko-KR')}</span>
                            <span className="text-gray-900 font-medium">:입금날짜</span>
                          </div>

                          <div className="flex justify-between py-1">
                            {orderUser?.kakaoLink ? (
                              <>
                                <button
                                  onClick={() => window.open(orderUser.kakaoLink, '_blank')}
                                  className="text-yellow-600 hover:text-yellow-700 font-medium text-xs px-2 py-1 bg-yellow-50 rounded hover:bg-yellow-100 transition-colors"
                                >
                                  💬 카카오 문의
                                </button>
                                <span className="text-gray-900 font-medium">:고객문의</span>
                              </>
                            ) : (
                              <>
                                <span className="text-gray-400 text-xs">링크 미설정</span>
                                <span className="text-gray-900 font-medium">:고객문의</span>
                              </>
                            )}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
