import { NextResponse } from 'next/server'
import { updateMultipleOrderStatus } from '@/lib/supabaseApi'

export async function POST(request) {
  try {
    const { orderIds } = await request.json()

    if (!orderIds || !Array.isArray(orderIds)) {
      return NextResponse.json({
        success: false,
        error: 'orderIds 배열이 필요합니다'
      }, { status: 400 })
    }

    console.log('🧪 카드 결제 업데이트 테스트:', orderIds)

    // CardPaymentModal과 동일한 방식으로 호출
    const result = await updateMultipleOrderStatus(
      orderIds,
      'verifying',
      { method: 'card' }
    )

    console.log('✅ 업데이트 결과:', result)

    return NextResponse.json({
      success: true,
      result,
      message: '카드 결제 방법으로 업데이트 완료'
    })

  } catch (error) {
    console.error('카드 업데이트 테스트 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}