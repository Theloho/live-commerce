import { NextResponse } from 'next/server'
import OrderRepository from '@/lib/repositories/OrderRepository'

/**
 * pending/verifying 주문 확인 API (배송지 비교 포함)
 * - Clean Architecture: Presentation Layer (Routing Only)
 * - Repository: OrderRepository.findPendingOrdersWithGroup()
 * - ✅ Rule #2 준수: 클라이언트 → API Route → Repository
 *
 * 용도: 체크아웃 페이지에서 배송지 변경 시 합배 여부 재확인
 *
 * @author Claude
 * @since 2025-10-27
 *
 * 기존 API와의 차이:
 * - /api/orders/check-pending: 배송지 무관, 단순히 verifying 주문 존재 여부만 확인
 * - /api/orders/check-pending-with-address: 배송지 일치 여부까지 확인 (postal_code + detail_address)
 */
export async function POST(request) {
  try {
    const { userId, kakaoId, postal_code, detail_address, excludeIds = [] } = await request.json()

    // 파라미터 검증
    if (!userId && !kakaoId) {
      return NextResponse.json(
        { error: 'userId 또는 kakaoId가 필요합니다' },
        { status: 400 }
      )
    }

    if (!postal_code || !detail_address) {
      return NextResponse.json(
        { error: 'postal_code와 detail_address가 필요합니다' },
        { status: 400 }
      )
    }

    // Repository를 통한 verifying 주문 조회 (배송지 정보 포함)
    const existingOrders = await OrderRepository.findPendingOrdersWithGroup({
      userId,
      kakaoId,
      excludeIds
    })

    // verifying 주문이 없으면 무료배송 조건 불만족
    if (!existingOrders || existingOrders.length === 0) {
      return NextResponse.json({
        success: true,
        hasPendingOrders: false,
        message: 'verifying 주문 없음'
      })
    }

    // 배송지 비교 (postal_code + detail_address)
    const matchedOrder = existingOrders.find(order => {
      const shipping = order.order_shipping?.[0] || {}
      const isMatch = (
        shipping.postal_code === postal_code &&
        shipping.detail_address === detail_address
      )
      return isMatch
    })

    // 배송지 일치하는 주문이 있으면 무료배송 조건 만족
    const hasPendingOrders = !!matchedOrder

    return NextResponse.json({
      success: true,
      hasPendingOrders,
      message: hasPendingOrders
        ? `배송지 일치하는 verifying 주문 있음 (주문 ID: ${matchedOrder.id})`
        : '배송지 일치하는 verifying 주문 없음'
    })
  } catch (error) {
    console.error('❌ [check-pending-with-address] 에러:', error)
    return NextResponse.json(
      {
        error: error.message || 'pending 주문 확인에 실패했습니다',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
