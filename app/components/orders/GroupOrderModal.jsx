'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  HomeIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function GroupOrderModal({ selectedGroupOrder, setSelectedGroupOrder }) {
  const router = useRouter()

  if (!selectedGroupOrder) return null

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-white border-b">
          <div className="flex items-center p-4">
            <button
              onClick={() => setSelectedGroupOrder(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="flex-1 text-center font-semibold text-gray-900">주문 상세</h1>
            <div className="w-9" />
          </div>
        </div>

        {/* Success Animation */}
        <div className="text-center py-8 px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${(() => {
              const { status } = selectedGroupOrder
              switch (status) {
                case 'pending':
                case 'verifying':
                  return 'bg-yellow-100'
                case 'paid':
                  return 'bg-green-100'
                case 'delivered':
                  return 'bg-green-100'
                default:
                  return 'bg-yellow-100'
              }
            })()}`}
          >
            {(() => {
              const { status } = selectedGroupOrder
              switch (status) {
                case 'pending':
                case 'verifying':
                  return <ClockIcon className="w-12 h-12 text-yellow-600" />
                case 'paid':
                  return <CheckCircleIcon className="w-12 h-12 text-green-600" />
                case 'delivered':
                  return <TruckIcon className="w-12 h-12 text-green-600" />
                default:
                  return <ClockIcon className="w-12 h-12 text-yellow-600" />
              }
            })()}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {(() => {
                const { status, payment } = selectedGroupOrder
                const isCard = payment?.method === 'card'

                switch (status) {
                  case 'pending':
                    return isCard ? '카드결제 확인중입니다' : '입금확인중입니다'
                  case 'verifying':
                    return isCard ? '카드결제 확인중입니다' : '입금확인중입니다'
                  case 'paid':
                    return '결제가 완료되었습니다'
                  case 'delivered':
                    return '출고가 완료되었습니다'
                  default:
                    return isCard ? '카드결제 확인중입니다' : '입금확인중입니다'
                }
              })()}
            </h1>
            <p className="text-gray-600">
              {(() => {
                const { status, payment } = selectedGroupOrder
                const isCard = payment?.method === 'card'

                switch (status) {
                  case 'pending':
                    return isCard ? '카드결제 확인 후 배송을 시작합니다' : '입금 확인 후 배송을 시작합니다'
                  case 'verifying':
                    return isCard ? '카드결제 확인 후 배송을 시작합니다' : '입금 확인 후 배송을 시작합니다'
                  case 'paid':
                    return '곧 배송 준비를 시작합니다'
                  case 'delivered':
                    return '상품이 안전하게 출고되었습니다'
                  default:
                    return isCard ? '카드결제 확인 후 배송을 시작합니다' : '입금 확인 후 배송을 시작합니다'
                }
              })()}
            </p>
          </motion.div>
        </div>

        <div className="px-4 space-y-4">
          {/* 결제 안내 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">
              {selectedGroupOrder.payment?.method === 'card' ? '카드결제 안내' : '입금 안내'}
            </h2>

            <div className="space-y-3">
              {(() => {
                // ✅ 배송비 계산 (무료배송 조건 확인)
                const shippingFee = selectedGroupOrder.is_free_shipping ? 0 : 4000

                return selectedGroupOrder.payment?.method === 'card' ? (
                // 카드결제 정보
                <>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">상품금액</span>
                        <span className="text-sm text-gray-900">
                          ₩{(selectedGroupOrder.payment.amount - shippingFee).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">부가세 (10%)</span>
                        <span className="text-sm text-gray-900">
                          ₩{Math.floor((selectedGroupOrder.payment.amount - shippingFee) * 0.1).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">배송비</span>
                        <span className="text-sm text-gray-900">
                          {shippingFee === 0 ? (
                            <span className="text-green-600 font-semibold">무료</span>
                          ) : (
                            `₩${shippingFee.toLocaleString()}`
                          )}
                        </span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">카드 결제금액</span>
                          <span className="text-lg font-bold text-gray-900">
                            ₩{(Math.floor((selectedGroupOrder.payment.amount - shippingFee) * 1.1) + shippingFee).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <p className="text-sm font-medium text-amber-800 mb-2">
                      💳 카드결제 링크를 카카오톡으로 전송해드립니다
                    </p>
                    <ul className="space-y-1 text-xs text-amber-700">
                      <li>• 결제 확인 후 2-3일 내 배송됩니다</li>
                      <li>• 카드결제는 부가세 10%가 포함되어 있습니다</li>
                    </ul>
                  </div>
                </>
              ) : (
                // 무통장입금 정보
                <>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">은행</p>
                        <p className="font-medium text-gray-900">카카오뱅크</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">계좌번호</p>
                        <p className="font-mono font-medium text-gray-900">79421940478</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">예금주</p>
                        <p className="font-medium text-gray-900">하상윤</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">입금금액</span>
                      <span className="text-lg font-bold text-gray-900">
                        ₩{(() => {
                          // 상품금액 + 배송비로 올바른 입금금액 계산
                          const totalProductAmount = selectedGroupOrder.items.reduce((sum, item) => {
                            return sum + ((item.price || 0) * (item.quantity || 1))
                          }, 0)
                          const correctDepositAmount = totalProductAmount + shippingFee
                          return correctDepositAmount.toLocaleString()
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">입금자명</span>
                      <span className="text-lg font-bold text-gray-900">
                        {(() => {
                          // 입금자명 우선순위: payment.depositor_name > depositName > shipping.name
                          const depositorName = selectedGroupOrder.payment?.depositor_name ||
                                               selectedGroupOrder.depositName ||
                                               selectedGroupOrder.shipping?.name ||
                                               '입금자명 확인 필요'

                          return depositorName
                        })()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('79421940478').then(() => {
                        toast.success('복사되었습니다')
                      }).catch(() => {
                        toast.error('복사에 실패했습니다')
                      })
                    }}
                    className="w-full bg-gray-900 text-white font-medium py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <ClipboardDocumentIcon className="w-5 h-5" />
                    계좌번호 복사하기
                  </button>

                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <p className="text-sm font-medium text-amber-800 mb-2">
                      💡 입금자명과 금액이 정확해야 입금확인과 배송이 빨라집니다
                    </p>
                    <ul className="space-y-1 text-xs text-amber-700">
                      <li>• 주문 후 24시간 이내 입금해주세요</li>
                      <li>• 입금 확인 후 2-3일 내 배송됩니다</li>
                    </ul>
                  </div>
                </>
                )  // 삼항 연산자 종료
              })()}
            </div>
          </motion.div>

          {/* 주문 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">주문 정보</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">주문번호</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-900">{selectedGroupOrder.customer_order_number}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedGroupOrder.customer_order_number).then(() => {
                        toast.success('복사되었습니다')
                      }).catch(() => {
                        toast.error('복사에 실패했습니다')
                      })
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">주문일시</span>
                <span className="text-gray-900">
                  {new Date(selectedGroupOrder.created_at).toLocaleString('ko-KR')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">결제상태</span>
                <span className={`font-medium ${(() => {
                  const { status } = selectedGroupOrder
                  switch (status) {
                    case 'pending':
                    case 'verifying':
                      return 'text-yellow-600'
                    case 'paid':
                    case 'delivered':
                      return 'text-green-600'
                    default:
                      return 'text-yellow-600'
                  }
                })()}`}>
                  {(() => {
                    const { status, payment } = selectedGroupOrder
                    const isCard = payment?.method === 'card'

                    switch (status) {
                      case 'pending':
                        return isCard ? '카드결제 대기중' : '입금대기'
                      case 'verifying':
                        return isCard ? '카드결제 확인중' : '입금확인중'
                      case 'paid':
                        return '결제완료'
                      case 'delivered':
                        return '결제완료 (출고완료)'
                      default:
                        return isCard ? '카드결제 대기중' : '입금대기'
                    }
                  })()}
                </span>
              </div>
            </div>
          </motion.div>

          {/* 배송지 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">배송지 정보</h2>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{selectedGroupOrder.shipping?.name || '김진태'}</p>
              <p className="text-gray-600">{selectedGroupOrder.shipping?.phone || '010-0000-0000'}</p>
              <p className="text-gray-600">
                {selectedGroupOrder.shipping?.postal_code && <span className="text-gray-500">[{selectedGroupOrder.shipping.postal_code}] </span>}
                {selectedGroupOrder.shipping?.address || '기본주소'}
                {selectedGroupOrder.shipping?.detail_address && ` ${selectedGroupOrder.shipping.detail_address}`}
              </p>
            </div>
          </motion.div>

          {/* 주문 상품 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">
              주문 상품 ({selectedGroupOrder.items.length}개 상품, 총 {selectedGroupOrder.items.reduce((sum, item) => sum + item.quantity, 0)}개)
            </h2>
            <div className="space-y-3">
              {selectedGroupOrder.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex gap-3">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.thumbnail_url || '/placeholder.png'}
                        alt={item.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* 제품번호 + 상품명 (한 줄) */}
                      <h3 className="mb-1 line-clamp-1 text-sm">
                        <span className="font-bold text-gray-900">{item.product_number || item.product_id}</span>
                        {item.title && item.title !== (item.product_number || item.product_id) && (
                          <span className="text-xs text-gray-500"> {item.title}</span>
                        )}
                      </h3>

                      {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                        <div className="mb-1">
                          {Object.entries(item.selectedOptions).map(([optionId, value]) => (
                            <span
                              key={optionId}
                              className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mr-1 mb-1"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          수량: {item.quantity}개
                        </p>
                        <p className="font-semibold text-gray-900 text-sm">
                          ₩{item.totalPrice.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        단가: ₩{item.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* 총 결제 금액 표시 */}
              <div className="border-t pt-3 mt-3">
                {(() => {
                  // ✅ 배송비 계산 (무료배송 조건 확인)
                  const shippingFee = selectedGroupOrder.is_free_shipping ? 0 : 4000

                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">총 상품금액</span>
                        <span className="font-medium text-gray-900">
                          ₩{(() => {
                            // 모든 상품의 총 금액 계산
                            const totalProductAmount = selectedGroupOrder.items.reduce((sum, item) => {
                              const itemTotal = (item.price || 0) * (item.quantity || 1)
                              return sum + itemTotal
                            }, 0)
                            return totalProductAmount.toLocaleString()
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">배송비</span>
                        <span className="font-medium text-gray-900">
                          {shippingFee === 0 ? (
                            <span className="text-green-600 font-semibold">무료</span>
                          ) : (
                            `₩${shippingFee.toLocaleString()}`
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm font-semibold text-gray-900">총 결제금액</span>
                        <span className="font-bold text-lg text-gray-900">
                          ₩{(() => {
                            // 상품금액 + 배송비로 올바른 총 결제금액 계산
                            const totalProductAmount = selectedGroupOrder.items.reduce((sum, item) => {
                              return sum + ((item.price || 0) * (item.quantity || 1))
                            }, 0)
                            const totalPaymentAmount = totalProductAmount + shippingFee
                            return totalPaymentAmount.toLocaleString()
                          })()}
                        </span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </motion.div>
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 mt-8">
          <div className="space-y-3">
            <button
              onClick={() => setSelectedGroupOrder(null)}
              className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              주문 목록으로
            </button>
            <button
              onClick={() => {
                setSelectedGroupOrder(null)
                router.push('/')
              }}
              className="w-full bg-red-500 text-white font-medium py-3 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              <HomeIcon className="w-5 h-5" />
              쇼핑 계속하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
